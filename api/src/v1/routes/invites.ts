import { randomBytes } from "node:crypto";
import { and, count, eq, isNull } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { joinInviteBody, type InvitePreviewDto } from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { groups, members } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import { recordActivity } from "../services/activity";
import { canManageGroup, requireMembership } from "../services/access";
import { groupDetail } from "./groups";

const groupParams = z.object({ id: z.uuid() });
const tokenParams = z.object({ token: z.string().min(16).max(64) });

const newToken = () => randomBytes(18).toString("base64url");

async function groupByToken(db: DbOrTx, token: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.inviteToken, token), isNull(groups.deletedAt)));
  if (!group) throw notFound("This invite link isn't valid any more");
  return group;
}

export const inviteRoutes: FastifyPluginAsyncZod = async (app) => {
  const linkFor = (token: string) => ({ token, url: `${app.config.webUrl}/join?t=${token}` });

  /** Any member can share the link. `rotate` (admins only) invalidates the old one. */
  app.post(
    "/groups/:id/invite",
    { schema: { params: groupParams, querystring: z.object({ rotate: z.stringbool().default(false) }) } },
    async (req) => {
      const user = requireUser(req);
      const { group, me } = await requireMembership(app.db, req.params.id, user.id);
      if (group.inviteToken && !req.query.rotate) return linkFor(group.inviteToken);
      if (group.inviteToken && !canManageGroup(me)) throw forbidden("Only admins can reset the invite link");
      const token = newToken();
      await app.db.update(groups).set({ inviteToken: token }).where(eq(groups.id, group.id));
      return linkFor(token);
    },
  );

  /** Public preview so the join page can show the group before signing in. */
  app.get("/invites/:token", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } }, schema: { params: tokenParams } }, async (req): Promise<InvitePreviewDto> => {
    const group = await groupByToken(app.db, req.params.token);
    const people = await app.db
      .select({ id: members.id, displayName: members.displayName, userId: members.userId })
      .from(members)
      .where(and(eq(members.groupId, group.id), isNull(members.leftAt)));
    return {
      group: {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        currency: group.currency,
        memberCount: people.length,
      },
      openSpots: people.filter((p) => p.userId === null).map((p) => ({ id: p.id, displayName: p.displayName })),
      alreadyMember: req.authUser ? people.some((p) => p.userId === req.authUser!.id) : false,
    };
  });

  /**
   * Join with an account or as a guest (guests sign in anonymously first).
   * Either claim a spot someone added by name, inheriting its history, or
   * join as a new person.
   */
  app.post("/invites/:token/join", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } }, schema: { params: tokenParams, body: joinInviteBody } }, async (req) => {
    const user = requireUser(req);
    return app.db.transaction(async (tx) => {
      const group = await groupByToken(tx, req.params.token);

      const [current] = await tx
        .select()
        .from(members)
        .where(and(eq(members.groupId, group.id), eq(members.userId, user.id)));
      if (current && !current.leftAt) {
        return groupDetail(tx, group, current, user.id);
      }

      let memberId: string;
      if (req.body.memberId) {
        // A returning member's old (left) row must let go of the user first,
        // or the one-person-per-group unique index rejects the claim.
        if (current) await tx.update(members).set({ userId: null }).where(eq(members.id, current.id));
        const [spot] = await tx
          .update(members)
          .set({ userId: user.id, contactEmail: null })
          .where(
            and(
              eq(members.id, req.body.memberId),
              eq(members.groupId, group.id),
              isNull(members.userId),
              isNull(members.leftAt),
            ),
          )
          .returning();
        if (!spot) throw new AppError(409, "ALREADY_CLAIMED", "Someone already joined as that person");
        memberId = spot.id;
      } else if (current) {
        await tx.update(members).set({ leftAt: null }).where(eq(members.id, current.id));
        memberId = current.id;
      } else {
        const [{ n }] = await tx
          .select({ n: count() })
          .from(members)
          .where(and(eq(members.groupId, group.id), isNull(members.leftAt)));
        if (n >= 200) throw new AppError(409, "CONFLICT", "This group is full");
        memberId = uuidv7();
        await tx
          .insert(members)
          .values({ id: memberId, groupId: group.id, userId: user.id, displayName: req.body.displayName ?? user.name });
      }

      const [me] = await tx.select().from(members).where(eq(members.id, memberId));
      await recordActivity(tx, {
        groupId: group.id,
        type: "member.joined",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: me.id,
        data: { displayName: me.displayName, claimed: Boolean(req.body.memberId) },
      });
      return groupDetail(tx, group, me, user.id);
    });
  });
};
