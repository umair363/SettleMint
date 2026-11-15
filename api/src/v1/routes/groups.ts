import { and, count, eq, inArray, isNull, max, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import {
  createGroupBody,
  updateGroupBody,
  type GroupDetailDto,
  type GroupSummaryDto,
} from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { activityEvents, expenses, groups, members } from "../db/schema";
import { AppError, forbidden, notFound, versionConflict } from "../errors";
import { recordActivity } from "../services/activity";
import { requireMembership, type GroupRow, type MemberRow } from "../services/access";
import { loadMembers } from "../services/dto";
import { groupLedger, memberBalances } from "../services/ledger";
import { materializeRecurring } from "../services/recurring";

const idParams = z.object({ id: z.uuid() });

export async function groupDetail(db: DbOrTx, group: GroupRow, me: MemberRow, userId: string): Promise<GroupDetailDto> {
  const [memberList, ledger, last] = await Promise.all([
    loadMembers(db, group.id, userId),
    groupLedger(db, group.id, group.simplifyDebts),
    db.select({ at: max(activityEvents.createdAt) }).from(activityEvents).where(eq(activityEvents.groupId, group.id)),
  ]);
  // A one-to-one group is shown as the other person, from each side.
  const counterpart = group.type === "direct" ? memberList.find((m) => m.id !== me.id && !m.left) : undefined;
  return {
    id: group.id,
    name: counterpart?.displayName ?? group.name,
    currency: group.currency,
    type: group.type,
    emoji: group.emoji,
    color: group.color,
    simplifyDebts: group.simplifyDebts,
    archived: group.archivedAt !== null,
    version: group.version,
    myMemberId: me.id,
    myBalance: ledger.balances.get(me.id) ?? 0,
    members: memberList,
    balances: Object.fromEntries(memberList.map((m) => [m.id, ledger.balances.get(m.id) ?? 0])),
    transfers: ledger.transfers,
    totalSpent: ledger.totalSpent,
    lastActivityAt: (last[0]?.at ?? group.updatedAt).toISOString(),
  };
}

export const groupRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/groups", async (req): Promise<GroupSummaryDto[]> => {
    const me = requireUser(req);
    const rows = await app.db
      .select({ group: groups, memberId: members.id })
      .from(members)
      .innerJoin(groups, eq(groups.id, members.groupId))
      .where(and(eq(members.userId, me.id), isNull(members.leftAt), isNull(groups.deletedAt)));
    if (rows.length === 0) return [];

    const groupIds = rows.map((r) => r.group.id);
    const [counts, lastActivity, balances] = await Promise.all([
      app.db
        .select({ groupId: members.groupId, n: count() })
        .from(members)
        .where(and(inArray(members.groupId, groupIds), isNull(members.leftAt)))
        .groupBy(members.groupId),
      app.db
        .select({ groupId: activityEvents.groupId, at: max(activityEvents.createdAt) })
        .from(activityEvents)
        .where(inArray(activityEvents.groupId, groupIds))
        .groupBy(activityEvents.groupId),
      memberBalances(
        app.db,
        rows.map((r) => r.memberId),
      ),
    ]);
    const countBy = new Map(counts.map((c) => [c.groupId, c.n]));

    // One-to-one groups are listed under the other person's name.
    const directIds = rows.filter((r) => r.group.type === "direct").map((r) => r.group.id);
    const myMemberIds = new Set(rows.map((r) => r.memberId));
    const others = directIds.length
      ? await app.db
          .select({ groupId: members.groupId, id: members.id, name: members.displayName })
          .from(members)
          .where(and(inArray(members.groupId, directIds), isNull(members.leftAt)))
      : [];
    const counterpartBy = new Map(others.filter((o) => !myMemberIds.has(o.id)).map((o) => [o.groupId, o.name]));
    const lastBy = new Map(lastActivity.map((a) => [a.groupId, a.at]));

    return rows
      .map(({ group, memberId }) => ({
        id: group.id,
        name: counterpartBy.get(group.id) ?? group.name,
        currency: group.currency,
        type: group.type,
        emoji: group.emoji,
        color: group.color,
        memberCount: countBy.get(group.id) ?? 1,
        myBalance: balances.get(memberId) ?? 0,
        archived: group.archivedAt !== null,
        lastActivityAt: (lastBy.get(group.id) ?? group.updatedAt).toISOString(),
        version: group.version,
      }))
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  });

  app.post("/groups", { schema: { body: createGroupBody } }, async (req, reply) => {
    const me = requireUser(req);
    const body = req.body;
    const id = body.id ?? uuidv7();

    // Retried create (same client id): return what was created the first time.
    const [existing] = await app.db.select().from(groups).where(eq(groups.id, id));
    if (existing) {
      const { group, me: member } = await requireMembership(app.db, id, me.id).catch(() => {
        throw new AppError(409, "CONFLICT", "That id is already in use");
      });
      return reply.status(200).send(await groupDetail(app.db, group, member, me.id));
    }

    const detail = await app.db.transaction(async (tx) => {
      const [group] = await tx
        .insert(groups)
        .values({
          id,
          name: body.name,
          currency: body.currency,
          type: body.type,
          emoji: body.emoji ?? null,
          color: body.color ?? null,
          simplifyDebts: body.simplifyDebts,
          createdBy: me.id,
        })
        .returning();
      const [owner] = await tx
        .insert(members)
        .values({ id: uuidv7(), groupId: id, userId: me.id, displayName: body.myDisplayName ?? me.name, role: "owner" })
        .returning();
      if (body.people.length) {
        await tx
          .insert(members)
          .values(body.people.map((p) => ({ id: uuidv7(), groupId: id, displayName: p.displayName })));
      }
      await recordActivity(tx, {
        groupId: id,
        type: "group.created",
        actorUserId: me.id,
        actorMemberId: owner.id,
        entityId: id,
        data: { name: body.name },
      });
      return groupDetail(tx, group, owner, me.id);
    });
    return reply.status(201).send(detail);
  });

  app.get("/groups/:id", { schema: { params: idParams } }, async (req) => {
    const user = requireUser(req);
    const { group, me } = await requireMembership(app.db, req.params.id, user.id);
    // Catch up on due recurring bills (the server may have been asleep).
    await materializeRecurring(app.db, { groupId: group.id });
    return groupDetail(app.db, group, me, user.id);
  });

  app.patch("/groups/:id", { schema: { params: idParams, body: updateGroupBody } }, async (req) => {
    const user = requireUser(req);
    const body = req.body;
    return app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      if (body.version !== group.version) throw versionConflict(await groupDetail(tx, group, me, user.id));

      if (body.currency && body.currency !== group.currency) {
        const [{ n }] = await tx
          .select({ n: count() })
          .from(expenses)
          .where(eq(expenses.groupId, group.id));
        if (n > 0) {
          throw new AppError(409, "CONFLICT", "The group currency can't change once it has expenses");
        }
      }

      const changes = {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.currency !== undefined ? { currency: body.currency } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.emoji !== undefined ? { emoji: body.emoji } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.simplifyDebts !== undefined ? { simplifyDebts: body.simplifyDebts } : {}),
        ...(body.archived !== undefined ? { archivedAt: body.archived ? new Date() : null } : {}),
      };
      const [updated] = await tx
        .update(groups)
        .set({ ...changes, version: sql`${groups.version} + 1`, updatedAt: new Date() })
        .where(and(eq(groups.id, group.id), eq(groups.version, body.version)))
        .returning();
      if (!updated) throw versionConflict(await groupDetail(tx, group, me, user.id));

      const { archivedAt: _a, ...logged } = changes;
      await recordActivity(tx, {
        groupId: group.id,
        type: "group.updated",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: group.id,
        data: { changes: { ...logged, ...(body.archived !== undefined ? { archived: body.archived } : {}) } },
      });
      return groupDetail(tx, updated, me, user.id);
    });
  });

  app.delete("/groups/:id", { schema: { params: idParams } }, async (req, reply) => {
    const user = requireUser(req);
    await app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      if (me.role !== "owner") throw forbidden("Only the group owner can delete it");
      await tx.update(groups).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(groups.id, group.id));
      await recordActivity(tx, {
        groupId: group.id,
        type: "group.deleted",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: group.id,
      });
    });
    return reply.status(204).send();
  });

  app.post("/groups/:id/restore", { schema: { params: idParams } }, async (req) => {
    const user = requireUser(req);
    return app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id, { includeDeleted: true });
      if (me.role !== "owner") throw forbidden("Only the group owner can restore it");
      if (!group.deletedAt) throw notFound("Group isn't deleted");
      const [restored] = await tx
        .update(groups)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(groups.id, group.id))
        .returning();
      await recordActivity(tx, {
        groupId: group.id,
        type: "group.restored",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: group.id,
      });
      return groupDetail(tx, restored, me, user.id);
    });
  });
};
