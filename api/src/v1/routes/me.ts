import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { uuidv7 } from "uuidv7";
import {
  deleteAccountBody,
  normalizePaymentHandle,
  putPaymentHandlesBody,
  searchQuery,
  updateMeBody,
  type Me,
  type PaymentHandleDto,
  type SearchResultDto,
} from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { activityEvents, expenses, groups, members, paymentHandles, settlements, user } from "../db/schema";
import { activityToDto, expensesToDto, loadMembers, settlementToDto } from "../services/dto";

async function listHandles(db: DbOrTx, userId: string): Promise<PaymentHandleDto[]> {
  const rows = await db
    .select()
    .from(paymentHandles)
    .where(eq(paymentHandles.userId, userId))
    .orderBy(asc(paymentHandles.position));
  return rows.map((h) => ({ id: h.id, kind: h.kind, value: h.value, label: h.label }));
}

/** Escape LIKE wildcards so a search for "50%" means the text "50%". */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  const load = async (id: string): Promise<Me> => {
    const [u] = await app.db.select().from(user).where(eq(user.id, id));
    return {
      id: u.id,
      name: u.name,
      email: u.isAnonymous ? null : u.email,
      image: u.image,
      isGuest: Boolean(u.isAnonymous),
      defaultCurrency: u.defaultCurrency,
      locale: u.locale,
    };
  };

  app.get("/me", async (req) => load(requireUser(req).id));

  app.patch("/me", { schema: { body: updateMeBody } }, async (req) => {
    const me = requireUser(req);
    const { name, defaultCurrency, locale } = req.body;
    await app.db
      .update(user)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(defaultCurrency !== undefined ? { defaultCurrency } : {}),
        ...(locale !== undefined ? { locale } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, me.id));
    return load(me.id);
  });

  // ─── How I get paid ──────────────────────────────────────────────────────

  app.get("/me/payment-handles", async (req) => listHandles(app.db, requireUser(req).id));

  app.put("/me/payment-handles", { schema: { body: putPaymentHandlesBody } }, async (req) => {
    const me = requireUser(req);
    return app.db.transaction(async (tx) => {
      await tx.delete(paymentHandles).where(eq(paymentHandles.userId, me.id));
      if (req.body.handles.length) {
        await tx.insert(paymentHandles).values(
          req.body.handles.map((h, position) => ({
            id: uuidv7(),
            userId: me.id,
            kind: h.kind,
            // Validated by the schema, so normalisation can't fail here.
            value: normalizePaymentHandle(h.kind, h.value)!,
            label: h.label?.trim() || null,
            position,
          })),
        );
      }
      return listHandles(tx, me.id);
    });
  });

  // ─── Search (only inside my groups) ──────────────────────────────────────

  app.get("/search", { schema: { querystring: searchQuery } }, async (req): Promise<SearchResultDto> => {
    const me = requireUser(req);
    const mine = await app.db
      .select({ id: groups.id })
      .from(members)
      .innerJoin(groups, eq(groups.id, members.groupId))
      .where(and(eq(members.userId, me.id), isNull(members.leftAt), isNull(groups.deletedAt)));
    const ids = mine.map((g) => g.id);
    if (!ids.length) return { groups: [], expenses: [] };
    const pattern = `%${likeEscape(req.query.q)}%`;

    const [groupHits, expenseHits] = await Promise.all([
      app.db
        .select({ id: groups.id, name: groups.name, emoji: groups.emoji, type: groups.type })
        .from(groups)
        .where(and(inArray(groups.id, ids), ilike(groups.name, pattern)))
        .limit(8),
      app.db
        .select({
          id: expenses.id,
          groupId: expenses.groupId,
          groupName: groups.name,
          description: expenses.description,
          amount: expenses.amount,
          currency: expenses.currency,
          category: expenses.category,
          date: expenses.date,
        })
        .from(expenses)
        .innerJoin(groups, eq(groups.id, expenses.groupId))
        .where(and(inArray(expenses.groupId, ids), isNull(expenses.deletedAt), ilike(expenses.description, pattern)))
        .orderBy(desc(expenses.date), desc(expenses.createdAt))
        .limit(30),
    ]);
    return { groups: groupHits, expenses: expenseHits };
  });

  // ─── My data ─────────────────────────────────────────────────────────────

  /** Everything SettleMint holds that involves me, as one JSON document. */
  app.get("/me/export", async (req, reply) => {
    const me = requireUser(req);
    const memberships = await app.db
      .select({ group: groups, memberId: members.id })
      .from(members)
      .innerJoin(groups, eq(groups.id, members.groupId))
      .where(eq(members.userId, me.id));

    const groupData = [];
    for (const { group, memberId } of memberships) {
      const expenseRows = await app.db.select().from(expenses).where(eq(expenses.groupId, group.id)).orderBy(asc(expenses.date));
      const settlementRows = await app.db.select().from(settlements).where(eq(settlements.groupId, group.id));
      const activityRows = await app.db
        .select()
        .from(activityEvents)
        .where(eq(activityEvents.groupId, group.id))
        .orderBy(asc(activityEvents.createdAt));
      groupData.push({
        id: group.id,
        name: group.name,
        currency: group.currency,
        type: group.type,
        createdAt: group.createdAt.toISOString(),
        deleted: group.deletedAt !== null,
        myMemberId: memberId,
        members: (await loadMembers(app.db, group.id, me.id)).map(({ paymentHandles: _p, ...m }) => m),
        expenses: await expensesToDto(app.db, expenseRows),
        settlements: settlementRows.map(settlementToDto),
        activity: activityRows.map((a) =>
          activityToDto(a, { actorName: null, groupName: group.name, groupEmoji: group.emoji, viewerMemberId: memberId }),
        ),
      });
    }

    reply.header("content-disposition", `attachment; filename="settlemint-export-${new Date().toISOString().slice(0, 10)}.json"`);
    return {
      exportedAt: new Date().toISOString(),
      format: "settlemint-export-v1",
      note: "Amounts are integer minor units (cents) of the given currency.",
      profile: await load(me.id),
      paymentHandles: await listHandles(app.db, me.id),
      groups: groupData,
    };
  });

  /**
   * Delete my account. My past expenses stay in each group under my name as
   * a placeholder (so friends' balances stay right), but nothing links back
   * to me. Group ownership passes to the longest-standing member.
   */
  app.delete("/me", { schema: { body: deleteAccountBody } }, async (req, reply) => {
    const me = requireUser(req);
    await app.db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: members.id, groupId: members.groupId })
        .from(members)
        .where(and(eq(members.userId, me.id), eq(members.role, "owner")));
      for (const o of owned) {
        const [next] = await tx
          .select({ id: members.id })
          .from(members)
          .where(
            and(eq(members.groupId, o.groupId), ne(members.id, o.id), isNotNull(members.userId), isNull(members.leftAt)),
          )
          .orderBy(asc(members.createdAt))
          .limit(1);
        if (next) await tx.update(members).set({ role: "owner" }).where(eq(members.id, next.id));
        await tx.update(members).set({ role: "member" }).where(eq(members.id, o.id));
      }
      // Cascades remove sessions, sign-in methods and payment handles; member
      // rows keep their display name with the link to the user cleared.
      await tx.delete(user).where(eq(user.id, me.id));
    });
    return reply.status(204).send();
  });
};
