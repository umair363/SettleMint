import { eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { requireUser } from "../app";
import { pushSubscriptions } from "../db/schema";
import { AppError } from "../errors";
import type { Notifier } from "../services/push";

declare module "fastify" {
  interface FastifyInstance {
    notifier: Notifier | null;
  }
}

const subscribeBody = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), { message: "Push endpoints are https" }),
  keys: z.object({ p256dh: z.string().min(16).max(200), auth: z.string().min(8).max(100) }),
});

/** Expo push tokens look like ExponentPushToken[xxxxxxxx]. */
const expoToken = z
  .string()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/, { message: "Not an Expo push token" });

export const pushRoutes: FastifyPluginAsyncZod = async (app) => {
  /** The public key browsers need to subscribe, or null when push is off. */
  app.get("/push/key", async () => ({ publicKey: app.config.vapid?.publicKey ?? null }));

  /** Remember this browser for the signed-in person (re-subscribing moves it to them). */
  app.post("/push/subscribe", { schema: { body: subscribeBody } }, async (req, reply) => {
    const me = requireUser(req);
    if (!app.config.vapid) throw new AppError(503, "PUSH_UNAVAILABLE", "Notifications aren't switched on yet");
    const { endpoint, keys } = req.body;
    await app.db
      .insert(pushSubscriptions)
      .values({ id: uuidv7(), userId: me.id, kind: "web", endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: me.id, p256dh: keys.p256dh, auth: keys.auth } });
    return reply.status(204).send();
  });

  app.delete("/push/subscribe", { schema: { body: z.object({ endpoint: z.string().max(1000) }) } }, async (req, reply) => {
    const me = requireUser(req);
    const [sub] = await app.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, req.body.endpoint));
    if (sub && sub.userId === me.id) await app.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    return reply.status(204).send();
  });

  /** Remember this phone for the signed-in person (the app sends its token on every launch). */
  app.post("/push/expo", { schema: { body: z.object({ token: expoToken }) } }, async (req, reply) => {
    const me = requireUser(req);
    if (!app.notifier) throw new AppError(503, "PUSH_UNAVAILABLE", "Notifications aren't switched on yet");
    await app.db
      .insert(pushSubscriptions)
      .values({ id: uuidv7(), userId: me.id, kind: "expo", endpoint: req.body.token })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: me.id, kind: "expo" } });
    return reply.status(204).send();
  });

  app.delete("/push/expo", { schema: { body: z.object({ token: z.string().max(200) }) } }, async (req, reply) => {
    const me = requireUser(req);
    const [sub] = await app.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, req.body.token));
    if (sub && sub.userId === me.id) await app.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    return reply.status(204).send();
  });
};
