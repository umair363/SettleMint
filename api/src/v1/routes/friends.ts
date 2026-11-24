import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { addFriendBody, zUsername, type AddFriendResultDto, type FriendRequestsDto } from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { friendRequests, groups, members, reminderMutes, user } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import { recordActivity } from "../services/activity";
import { friendCopy, friendMail, oneLine } from "../services/friend-mail";
import { muteUrl } from "../services/reminders";

/** Requests and invitations one person can send in a day, so nobody can be used to spam. */
const DAILY_CAP = 10;
const idParams = z.object({ id: z.uuid() });
const emailSchema = z.email().max(254);

/** The live one-to-one group two people share, if any. */
async function directGroupBetween(db: DbOrTx, a: string, b: string): Promise<string | null> {
  const m1 = alias(members, "m1");
  const m2 = alias(members, "m2");
  const [row] = await db
    .select({ id: groups.id })
    .from(groups)
    .innerJoin(m1, and(eq(m1.groupId, groups.id), eq(m1.userId, a), isNull(m1.leftAt)))
    .innerJoin(m2, and(eq(m2.groupId, groups.id), eq(m2.userId, b), isNull(m2.leftAt)))
    .where(and(eq(groups.type, "direct"), isNull(groups.deletedAt)))
    .limit(1);
  return row?.id ?? null;
}

/** "sam.k" -> "Sam K": a placeholder name for someone invited by email, which they can change. */
const nameFromEmail = (email: string) => {
  const local = email.split("@")[0].replace(/[._+-]+/g, " ").replace(/\d+/g, " ").trim() || "Friend";
  return oneLine(local.replace(/\b\p{L}/gu, (c) => c.toUpperCase()));
};

export const friendRoutes: FastifyPluginAsyncZod = async (app) => {
  const webUrl = app.config.webUrl;

  /** Creates (or reuses) the one-to-one group for two people who agreed to be friends. */
  async function connect(tx: DbOrTx, from: typeof user.$inferSelect, to: typeof user.$inferSelect): Promise<string> {
    const existing = await directGroupBetween(tx, from.id, to.id);
    if (existing) return existing;
    const id = uuidv7();
    await tx.insert(groups).values({
      id,
      name: oneLine(`${from.name} & ${to.name}`),
      currency: from.defaultCurrency ?? to.defaultCurrency ?? "USD",
      type: "direct",
      createdBy: from.id,
    });
    const [owner] = await tx
      .insert(members)
      .values({ id: uuidv7(), groupId: id, userId: from.id, displayName: oneLine(from.name), role: "owner" })
      .returning();
    await tx.insert(members).values({ id: uuidv7(), groupId: id, userId: to.id, displayName: oneLine(to.name), role: "member" });
    await recordActivity(tx, { groupId: id, type: "group.created", actorUserId: from.id, actorMemberId: owner.id, entityId: id, data: { name: "friends" } });
    return id;
  }

  async function mutedEmail(email: string) {
    const [m] = await app.db.select().from(reminderMutes).where(eq(reminderMutes.email, email.toLowerCase())).limit(1);
    return Boolean(m);
  }

  /** Tells a person who has an account: a notification and an email. Failures never undo the request. */
  async function notifyRequest(from: typeof user.$inferSelect, to: typeof user.$inferSelect, log: { error: (o: object, m: string) => void }) {
    const copy = friendCopy(to.locale);
    try {
      await app.notifier?.pushTo(to.id, { title: "SettleMint", body: copy.push(oneLine(from.name)), url: `${webUrl}/groups`, tag: "friends" }, log as never);
    } catch (err) {
      log.error({ err }, "friend request push failed");
    }
    if (to.isAnonymous || (await mutedEmail(to.email))) return;
    try {
      await app.mailer.send(
        friendMail({
          to: to.email,
          locale: to.locale,
          fromName: from.name,
          kind: "request",
          url: `${webUrl}/groups`,
          stopUrl: muteUrl(app.config.apiUrl, app.config.authSecret, to.email, to.locale),
        }),
      );
    } catch (err) {
      log.error({ err }, "friend request email failed");
    }
  }

  async function sentToday(userId: string) {
    const rows = await app.db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromUserId, userId), gt(friendRequests.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
    return rows.length;
  }

  app.post(
    "/friends/requests",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } }, schema: { body: addFriendBody } },
    async (req): Promise<AddFriendResultDto> => {
      const auth = requireUser(req);
      if (auth.isGuest) throw forbidden("Create an account to add friends");
      const [me] = await app.db.select().from(user).where(eq(user.id, auth.id));
      if (await sentToday(me.id) >= DAILY_CAP) throw new AppError(429, "RATE_LIMITED", "That's enough friend requests for today. Try again tomorrow.");

      const typed = req.body.to.trim();
      const sent: AddFriendResultDto = { state: "sent" };
      let target: typeof user.$inferSelect | undefined;
      let email: string | null = null;

      if (typed.includes("@") && !typed.startsWith("@")) {
        const parsed = emailSchema.safeParse(typed.toLowerCase());
        if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "That doesn't look like an email address");
        email = parsed.data;
        [target] = await app.db
          .select()
          .from(user)
          .where(and(sql`lower(${user.email}) = ${email}`, eq(user.isAnonymous, false)))
          .limit(1);
      } else {
        const parsed = zUsername.safeParse(typed.replace(/^@/, ""));
        if (!parsed.success) throw new AppError(400, "VALIDATION_ERROR", "That doesn't look like a username or an email");
        [target] = await app.db.select().from(user).where(eq(user.username, parsed.data)).limit(1);
        if (!target) throw notFound("No one has that username");
      }
      if (target?.id === me.id) throw new AppError(400, "VALIDATION_ERROR", "That's you");

      // ── Someone with an account: a request they can accept.
      if (target) {
        const t = target;
        if (await directGroupBetween(app.db, me.id, t.id)) return sent; // already friends
        const [reverse] = await app.db
          .select()
          .from(friendRequests)
          .where(and(eq(friendRequests.fromUserId, t.id), eq(friendRequests.toUserId, me.id), eq(friendRequests.status, "pending")));
        if (reverse) {
          // They already asked me: asking back is a yes.
          await app.db.transaction(async (tx) => {
            const groupId = await connect(tx, t, me);
            await tx.update(friendRequests).set({ status: "accepted", groupId, respondedAt: new Date() }).where(eq(friendRequests.id, reverse.id));
          });
          return sent;
        }
        const [mine] = await app.db
          .select()
          .from(friendRequests)
          .where(and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.toUserId, t.id)));
        if (mine && mine.status !== "accepted") return sent; // pending, or declined (never revealed)
        if (mine) {
          // They were friends once and the one-to-one group is gone: ask again.
          await app.db.update(friendRequests).set({ status: "pending", groupId: null, respondedAt: null, createdAt: new Date() }).where(eq(friendRequests.id, mine.id));
        } else {
          await app.db.insert(friendRequests).values({ id: uuidv7(), fromUserId: me.id, toUserId: t.id, label: typed.slice(0, 254) });
        }
        await notifyRequest(me, t, req.log);
        return sent;
      }

      // ── An email with no account: an invitation, through a one-to-one group they can claim.
      if (!email || (await mutedEmail(email))) return sent;
      const [already] = await app.db
        .select({ id: friendRequests.id })
        .from(friendRequests)
        .where(and(eq(friendRequests.fromUserId, me.id), eq(friendRequests.label, email), eq(friendRequests.status, "invited")))
        .limit(1);
      if (already) return sent;

      const token = randomBytes(18).toString("base64url");
      const groupId = uuidv7();
      await app.db.transaction(async (tx) => {
        await tx.insert(groups).values({
          id: groupId,
          name: oneLine(`${me.name} & ${nameFromEmail(email)}`),
          currency: me.defaultCurrency ?? "USD",
          type: "direct",
          inviteToken: token,
          createdBy: me.id,
        });
        const [owner] = await tx.insert(members).values({ id: uuidv7(), groupId, userId: me.id, displayName: oneLine(me.name), role: "owner" }).returning();
        await tx.insert(members).values({ id: uuidv7(), groupId, displayName: nameFromEmail(email), contactEmail: email });
        await recordActivity(tx, { groupId, type: "group.created", actorUserId: me.id, actorMemberId: owner.id, entityId: groupId, data: { name: "friends" } });
        await tx.insert(friendRequests).values({ id: uuidv7(), fromUserId: me.id, toUserId: null, label: email, status: "invited", groupId });
      });
      try {
        await app.mailer.send(
          friendMail({
            to: email,
            locale: me.locale,
            fromName: me.name,
            kind: "invite",
            url: `${webUrl}/join?t=${token}`,
            stopUrl: muteUrl(app.config.apiUrl, app.config.authSecret, email, me.locale),
          }),
        );
      } catch (err) {
        req.log.error({ err }, "friend invitation email failed");
      }
      return sent;
    },
  );

  app.get("/friends/requests", async (req): Promise<FriendRequestsDto> => {
    const me = requireUser(req);
    const incoming = await app.db
      .select({ id: friendRequests.id, name: user.name, username: user.username, image: user.image, createdAt: friendRequests.createdAt })
      .from(friendRequests)
      .innerJoin(user, eq(user.id, friendRequests.fromUserId))
      .where(and(eq(friendRequests.toUserId, me.id), eq(friendRequests.status, "pending")))
      .orderBy(desc(friendRequests.createdAt));
    const outgoing = await app.db
      .select({ id: friendRequests.id, label: friendRequests.label, createdAt: friendRequests.createdAt })
      .from(friendRequests)
      // Declined ones still show as waiting: the sender is never told.
      .where(and(eq(friendRequests.fromUserId, me.id), inArray(friendRequests.status, ["pending", "declined", "invited"])))
      .orderBy(desc(friendRequests.createdAt));
    return {
      incoming: incoming.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      outgoing: outgoing.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
  });

  const incomingRow = async (id: string, userId: string) => {
    const [row] = await app.db
      .select()
      .from(friendRequests)
      .where(and(eq(friendRequests.id, id), eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending")));
    if (!row) throw notFound("Request not found");
    return row;
  };

  app.post("/friends/requests/:id/accept", { schema: { params: idParams } }, async (req) => {
    const me = requireUser(req);
    const row = await incomingRow(req.params.id, me.id);
    const [from] = await app.db.select().from(user).where(eq(user.id, row.fromUserId));
    const [to] = await app.db.select().from(user).where(eq(user.id, me.id));
    const groupId = await app.db.transaction(async (tx) => {
      const id = await connect(tx, from, to);
      await tx.update(friendRequests).set({ status: "accepted", groupId: id, respondedAt: new Date() }).where(eq(friendRequests.id, row.id));
      return id;
    });
    return { groupId };
  });

  app.post("/friends/requests/:id/decline", { schema: { params: idParams } }, async (req, reply) => {
    const me = requireUser(req);
    const row = await incomingRow(req.params.id, me.id);
    await app.db.update(friendRequests).set({ status: "declined", respondedAt: new Date() }).where(eq(friendRequests.id, row.id));
    return reply.status(204).send();
  });

  /** Take back a request I sent. */
  app.delete("/friends/requests/:id", { schema: { params: idParams } }, async (req, reply) => {
    const me = requireUser(req);
    await app.db.delete(friendRequests).where(and(eq(friendRequests.id, req.params.id), eq(friendRequests.fromUserId, me.id)));
    return reply.status(204).send();
  });
};
