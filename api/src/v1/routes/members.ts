import { and, asc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { addMemberBody, updateMemberBody } from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { expenseLines, members, settlements } from "../db/schema";
import { AppError, forbidden, notFound } from "../errors";
import { recordActivity } from "../services/activity";
import { canManageGroup, requireMembership, type MemberRow } from "../services/access";
import { loadMembers } from "../services/dto";
import { memberBalances } from "../services/ledger";

const groupParams = z.object({ id: z.uuid() });
const memberParams = z.object({ id: z.uuid(), memberId: z.uuid() });

async function findMember(db: DbOrTx, groupId: string, memberId: string): Promise<MemberRow> {
  const [m] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId)));
  if (!m) throw notFound("Member not found");
  return m;
}

async function assertSettled(db: DbOrTx, memberId: string, who: string) {
  const balance = (await memberBalances(db, [memberId])).get(memberId) ?? 0;
  if (balance !== 0) {
    throw new AppError(409, "MEMBER_HAS_BALANCE", `${who} need${who === "You" ? "" : "s"} to settle up first`, {
      balance,
    });
  }
}

async function hasHistory(db: DbOrTx, memberId: string) {
  const [line] = await db.select({ id: expenseLines.expenseId }).from(expenseLines).where(eq(expenseLines.memberId, memberId)).limit(1);
  if (line) return true;
  const [s] = await db
    .select({ id: settlements.id })
    .from(settlements)
    .where(or(eq(settlements.fromMemberId, memberId), eq(settlements.toMemberId, memberId)))
    .limit(1);
  return Boolean(s);
}

/** Leave or remove: keep the row (marked as left) when it has history, else delete it. */
async function departMember(db: DbOrTx, m: MemberRow) {
  if (await hasHistory(db, m.id)) {
    await db.update(members).set({ leftAt: new Date() }).where(eq(members.id, m.id));
  } else {
    await db.delete(members).where(eq(members.id, m.id));
  }
}

export const memberRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post("/groups/:id/members", { schema: { params: groupParams, body: addMemberBody } }, async (req, reply) => {
    const user = requireUser(req);
    const result = await app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      const id = req.body.id ?? uuidv7();
      const [existing] = await tx.select().from(members).where(eq(members.id, id));
      if (existing && existing.groupId !== group.id) throw new AppError(409, "CONFLICT", "That id is already in use");
      if (!existing) {
        await tx.insert(members).values({ id, groupId: group.id, displayName: req.body.displayName, contactEmail: req.body.email ?? null });
        await recordActivity(tx, {
          groupId: group.id,
          type: "member.added",
          actorUserId: user.id,
          actorMemberId: me.id,
          entityId: id,
          data: { displayName: req.body.displayName },
        });
      }
      return loadMembers(tx, group.id, user.id);
    });
    return reply.status(201).send(result);
  });

  app.patch(
    "/groups/:id/members/:memberId",
    { schema: { params: memberParams, body: updateMemberBody } },
    async (req) => {
      const user = requireUser(req);
      return app.db.transaction(async (tx) => {
        const { group, me } = await requireMembership(tx, req.params.id, user.id);
        const target = await findMember(tx, group.id, req.params.memberId);
        // Anyone can fix the name of someone added by name; a joined person's
        // name is theirs (or a group admin's) to change.
        if (req.body.displayName !== undefined && target.userId && target.userId !== user.id && !canManageGroup(me)) throw forbidden();
        const { displayName, email } = req.body;
        if (email !== undefined && target.userId) {
          throw new AppError(422, "VALIDATION_ERROR", "Their own account already has an email");
        }
        await tx
          .update(members)
          .set({
            ...(displayName !== undefined ? { displayName } : {}),
            ...(email !== undefined ? { contactEmail: email } : {}),
          })
          .where(eq(members.id, target.id));
        if (displayName !== undefined && displayName !== target.displayName) {
          await recordActivity(tx, {
            groupId: group.id,
            type: "member.renamed",
            actorUserId: user.id,
            actorMemberId: me.id,
            entityId: target.id,
            data: { from: target.displayName, to: displayName },
          });
        }
        return loadMembers(tx, group.id, user.id);
      });
    },
  );

  app.delete("/groups/:id/members/:memberId", { schema: { params: memberParams } }, async (req) => {
    const user = requireUser(req);
    return app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      const target = await findMember(tx, group.id, req.params.memberId);
      if (target.leftAt) throw notFound("Member not found");
      if (target.role === "owner") throw forbidden("The owner can't be removed");
      // Admins remove anyone; others can only remove people added by name.
      if (!canManageGroup(me) && target.userId !== null) throw forbidden();
      await assertSettled(tx, target.id, target.displayName);
      await departMember(tx, target);
      await recordActivity(tx, {
        groupId: group.id,
        type: "member.removed",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: target.id,
        data: { displayName: target.displayName },
      });
      return loadMembers(tx, group.id, user.id);
    });
  });

  app.post("/groups/:id/leave", { schema: { params: groupParams } }, async (req, reply) => {
    const user = requireUser(req);
    await app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);
      await assertSettled(tx, me.id, "You");

      if (me.role === "owner") {
        // Hand ownership to the longest-standing person who has joined.
        const [next] = await tx
          .select()
          .from(members)
          .where(
            and(
              eq(members.groupId, group.id),
              ne(members.id, me.id),
              isNotNull(members.userId),
              isNull(members.leftAt),
            ),
          )
          .orderBy(asc(members.createdAt))
          .limit(1);
        if (next) await tx.update(members).set({ role: "owner" }).where(eq(members.id, next.id));
      }
      await recordActivity(tx, {
        groupId: group.id,
        type: "member.left",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: me.id,
        data: { displayName: me.displayName },
      });
      await departMember(tx, me);
    });
    return reply.status(204).send();
  });
};
