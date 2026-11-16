import { AsyncLocalStorage } from "node:async_hooks";
import { EventEmitter } from "node:events";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { requireUser } from "./app";
import { groups, members } from "./db/schema";
import type { ActivityNotice } from "./services/push";

/**
 * Live updates. Every write records an activity event; the groups it touched
 * are collected per request and announced only after the response is sent,
 * i.e. after the transaction has committed, so clients never refetch early.
 *
 * In-process bus: right for one API instance (the free-tier setup). With
 * several instances this becomes Postgres LISTEN/NOTIFY.
 */
const bus = new EventEmitter();
bus.setMaxListeners(0);

const changed = new AsyncLocalStorage<{ groups: Set<string>; notices: ActivityNotice[] }>();

/** For background work (no request): tell watchers a group changed. */
export function announceGroupChanged(groupId: string) {
  bus.emit("group", { groupId, actorUserId: null });
}

/** Called by recordActivity: remember that this request changed a group. */
export function markGroupChanged(notice: ActivityNotice) {
  const store = changed.getStore();
  store?.groups.add(notice.groupId);
  store?.notices.push(notice);
}

export function registerLiveUpdates(app: FastifyInstance) {
  app.addHook("onRequest", (_req, _reply, done) => {
    changed.run({ groups: new Set(), notices: [] }, done);
  });
  app.addHook("onResponse", async (req, reply) => {
    const store = changed.getStore();
    if (!store?.groups.size || reply.statusCode >= 400) return;
    for (const groupId of store.groups) bus.emit("group", { groupId, actorUserId: req.authUser?.id ?? null });
    // Push notifications go out after the commit too, without delaying anyone.
    if (app.notifier && store.notices.length) {
      void app.notifier.dispatch(store.notices, req.log);
    }
  });
}

/** Registered inside /v1 so the session is known. */
export const liveRoutes: FastifyPluginAsyncZod = async (app) => {

  /** Server-sent events: "this group changed" for groups the viewer is in. */
  app.get("/events", async (req, reply) => {
    const user = requireUser(req);
    const isMember = async (groupId: string) => {
      const [row] = await app.db
        .select({ id: members.id })
        .from(members)
        .innerJoin(groups, eq(groups.id, members.groupId))
        .where(and(eq(members.groupId, groupId), eq(members.userId, user.id), isNull(members.leftAt)))
        .limit(1);
      return Boolean(row);
    };

    // Keep CORS and other headers set by plugins, then take over the socket.
    const headers = {
      ...reply.getHeaders(),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    } as Record<string, string>;
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, headers);
    res.write("retry: 5000\n: connected\n\n");

    const onGroup = async (e: { groupId: string; actorUserId: string | null }) => {
      if (!(await isMember(e.groupId).catch(() => false))) return;
      res.write(`event: group\ndata: ${JSON.stringify({ groupId: e.groupId, byMe: e.actorUserId === user.id })}\n\n`);
    };
    bus.on("group", onGroup);
    // Comments keep proxies from closing an idle stream.
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
    heartbeat.unref();

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      bus.off("group", onGroup);
    });
  });
};
