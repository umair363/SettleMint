import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import {
  convertExpenseLines,
  convertMinor,
  createExpenseBody,
  pageQuery,
  resolveExpense,
  updateExpenseBody,
  type ExpenseDto,
  type Page,
  type SplitSpec,
} from "@settlemint/shared";
import { requireUser } from "../app";
import type { DbOrTx } from "../db/client";
import { expenseLines, expenses, members } from "../db/schema";
import { AppError, notFound, versionConflict } from "../errors";
import { recordActivity } from "../services/activity";
import { assertActiveMembers, requireMembership, type GroupRow } from "../services/access";
import { decodeCursor, encodeCursor, expensesToDto } from "../services/dto";
import { resolveRate } from "../services/fx";

const groupParams = z.object({ id: z.uuid() });
const idParams = z.object({ id: z.uuid() });

type ExpenseInput = z.output<typeof createExpenseBody>;

function splitMemberIds(split: SplitSpec): string[] {
  switch (split.method) {
    case "equal":
      return split.memberIds;
    case "itemized":
      return split.items.flatMap((i) => i.memberIds);
    default:
      return split.entries.map((e) => e.memberId);
  }
}

/**
 * Validate an expense and work out every person's line, in the expense
 * currency and in the group currency. All money maths is the shared engine.
 */
async function computeLines(tx: DbOrTx, group: GroupRow, body: ExpenseInput, alreadyInvolved: string[] = []) {
  const involved = [...new Set([...body.payers.map((p) => p.memberId), ...splitMemberIds(body.split)])];
  // People who already were on this expense may stay on it even if they have
  // since left the group; anyone new must be a current member.
  const allowed = new Set(alreadyInvolved);
  await assertActiveMembers(
    tx,
    group.id,
    involved.filter((id) => !allowed.has(id)),
  );

  const lines = resolveExpense(body.amount, body.payers, body.split);
  const fxRate = await resolveRate(tx, body.currency, group.currency, body.date, body.fxRate);
  const groupLines = convertExpenseLines(lines, body.currency, group.currency, fxRate);
  const groupAmount = convertMinor(body.amount, body.currency, group.currency, fxRate);
  return {
    fxRate,
    groupAmount,
    rows: lines.map((l, i) => ({
      memberId: l.memberId,
      paid: l.paid,
      owed: l.owed,
      paidGroup: groupLines[i].paid,
      owedGroup: groupLines[i].owed,
    })),
  };
}

const summary = (e: { description: string; amount: number; currency: string }) => ({
  description: e.description,
  amount: e.amount,
  currency: e.currency,
});

export const expenseRoutes: FastifyPluginAsyncZod = async (app) => {
  async function loadExpense(db: DbOrTx, id: string, userId: string) {
    const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!row) throw notFound("Expense not found");
    const access = await requireMembership(db, row.groupId, userId);
    return { row, ...access };
  }

  app.get(
    "/groups/:id/expenses",
    {
      schema: {
        params: groupParams,
        querystring: pageQuery.extend({ includeDeleted: z.stringbool().default(false) }),
      },
    },
    async (req): Promise<Page<ExpenseDto>> => {
      const user = requireUser(req);
      const { group } = await requireMembership(app.db, req.params.id, user.id);
      const { limit, includeDeleted } = req.query;
      const cursor = decodeCursor(req.query.cursor);

      const conditions = [eq(expenses.groupId, group.id)];
      if (!includeDeleted) conditions.push(isNull(expenses.deletedAt));
      if (cursor && cursor.length === 3) {
        const [d, c, id] = cursor.map(String);
        conditions.push(sql`(${expenses.date}, ${expenses.createdAt}, ${expenses.id}) < (${d}::date, ${c}::timestamptz, ${id}::uuid)`);
      }
      const rows = await app.db
        .select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.date), desc(expenses.createdAt), desc(expenses.id))
        .limit(limit + 1);

      const pageRows = rows.slice(0, limit);
      const last = pageRows[pageRows.length - 1];
      return {
        items: await expensesToDto(app.db, pageRows),
        nextCursor: rows.length > limit && last ? encodeCursor([last.date, last.createdAt.toISOString(), last.id]) : null,
      };
    },
  );

  app.post("/groups/:id/expenses", { schema: { params: groupParams, body: createExpenseBody } }, async (req, reply) => {
    const user = requireUser(req);
    const body = req.body;
    const id = body.id ?? uuidv7();

    const result = await app.db.transaction(async (tx) => {
      const { group, me } = await requireMembership(tx, req.params.id, user.id);

      const [existing] = await tx.select().from(expenses).where(eq(expenses.id, id));
      if (existing) {
        // A retry from the offline queue: same id, same group, same author.
        if (existing.groupId !== group.id || existing.createdByUserId !== user.id) {
          throw new AppError(409, "CONFLICT", "That id is already in use");
        }
        return { status: 200, dto: (await expensesToDto(tx, [existing]))[0] };
      }

      const { fxRate, groupAmount, rows } = await computeLines(tx, group, body);
      const [row] = await tx
        .insert(expenses)
        .values({
          id,
          groupId: group.id,
          description: body.description,
          amount: body.amount,
          currency: body.currency,
          fxRate,
          groupAmount,
          category: body.category,
          date: body.date,
          notes: body.notes ?? null,
          split: body.split,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        })
        .returning();
      await tx.insert(expenseLines).values(rows.map((r) => ({ ...r, expenseId: id })));
      await recordActivity(tx, {
        groupId: group.id,
        type: "expense.created",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: id,
        data: summary(body),
      });
      return { status: 201, dto: (await expensesToDto(tx, [row]))[0] };
    });
    return reply.status(result.status).send(result.dto);
  });

  app.get("/expenses/:id", { schema: { params: idParams } }, async (req) => {
    const user = requireUser(req);
    const { row } = await loadExpense(app.db, req.params.id, user.id);
    return (await expensesToDto(app.db, [row]))[0];
  });

  app.patch("/expenses/:id", { schema: { params: idParams, body: updateExpenseBody } }, async (req) => {
    const user = requireUser(req);
    const body = req.body;
    return app.db.transaction(async (tx) => {
      const { row, group, me } = await loadExpense(tx, req.params.id, user.id);
      if (row.deletedAt) throw notFound("Expense was deleted");
      if (body.version !== row.version) throw versionConflict((await expensesToDto(tx, [row]))[0]);

      const previous = await tx
        .select({ memberId: expenseLines.memberId })
        .from(expenseLines)
        .where(eq(expenseLines.expenseId, row.id));
      const { fxRate, groupAmount, rows } = await computeLines(
        tx,
        group,
        body,
        previous.map((p) => p.memberId),
      );

      const [updated] = await tx
        .update(expenses)
        .set({
          description: body.description,
          amount: body.amount,
          currency: body.currency,
          fxRate,
          groupAmount,
          category: body.category,
          date: body.date,
          notes: body.notes ?? null,
          split: body.split,
          updatedByUserId: user.id,
          version: sql`${expenses.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, row.id), eq(expenses.version, body.version)))
        .returning();
      if (!updated) throw versionConflict((await expensesToDto(tx, [row]))[0]);

      await tx.delete(expenseLines).where(eq(expenseLines.expenseId, row.id));
      await tx.insert(expenseLines).values(rows.map((r) => ({ ...r, expenseId: row.id })));
      await recordActivity(tx, {
        groupId: group.id,
        type: "expense.updated",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: row.id,
        data: { before: summary(row), after: summary(body) },
      });
      return (await expensesToDto(tx, [updated]))[0];
    });
  });

  const setDeleted = async (userId: string, expenseId: string, deleted: boolean) =>
    app.db.transaction(async (tx) => {
      const user = { id: userId };
      const req = { params: { id: expenseId } };
      const { row, group, me } = await loadExpense(tx, req.params.id, user.id);
      if (Boolean(row.deletedAt) === deleted) {
        return (await expensesToDto(tx, [row]))[0];
      }
      if (!deleted) {
        // Restoring must not bring back a split with people who left since.
        const lines = await tx
          .select({ memberId: expenseLines.memberId, leftAt: members.leftAt })
          .from(expenseLines)
          .innerJoin(members, eq(members.id, expenseLines.memberId))
          .where(eq(expenseLines.expenseId, row.id));
        if (lines.some((l) => l.leftAt)) {
          throw new AppError(409, "CONFLICT", "Someone on this expense has left the group");
        }
      }
      const [updated] = await tx
        .update(expenses)
        .set({
          deletedAt: deleted ? new Date() : null,
          version: sql`${expenses.version} + 1`,
          updatedAt: new Date(),
          updatedByUserId: user.id,
        })
        .where(eq(expenses.id, row.id))
        .returning();
      await recordActivity(tx, {
        groupId: group.id,
        type: deleted ? "expense.deleted" : "expense.restored",
        actorUserId: user.id,
        actorMemberId: me.id,
        entityId: row.id,
        data: summary(row),
      });
      return (await expensesToDto(tx, [updated]))[0];
    });

  app.delete("/expenses/:id", { schema: { params: idParams } }, (req) =>
    setDeleted(requireUser(req).id, req.params.id, true),
  );
  app.post("/expenses/:id/restore", { schema: { params: idParams } }, (req) =>
    setDeleted(requireUser(req).id, req.params.id, false),
  );
};
