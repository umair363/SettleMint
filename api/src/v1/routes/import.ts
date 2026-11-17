import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import { parseSplitwiseExport, reconstructExpense, type SplitSpec } from "@settlemint/shared";
import { requireUser } from "../app";
import { expenseLines, expenses, groups, members, settlements } from "../db/schema";
import { AppError } from "../errors";
import { recordActivity } from "../services/activity";
import { computeLines, type ExpenseInput } from "../services/expense-lines";
import { guessImportCategory } from "../services/import-categories";

const importBody = z.object({
  csv: z.string().min(1).max(900_000),
  groupName: z.string().trim().min(1).max(100),
  /** Which person column in the export is the person importing. */
  meIndex: z.number().int().min(0).max(199),
});

export interface ImportResult {
  groupId: string;
  expenses: number;
  payments: number;
  skipped: { line: number; reason: string }[];
}

export const importRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * Import a Splitwise group export into a new group, in one transaction.
   * Balances come out exactly as in Splitwise.
   */
  app.post("/import/splitwise", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } }, schema: { body: importBody } }, async (req, reply): Promise<ImportResult> => {
    const user = requireUser(req);
    const parsed = parseSplitwiseExport(req.body.csv);
    if (parsed.people.length === 0) {
      throw new AppError(422, "VALIDATION_ERROR", parsed.problems[0]?.reason ?? "No people found in this file");
    }
    if (req.body.meIndex >= parsed.people.length) {
      throw new AppError(422, "VALIDATION_ERROR", "Pick which person in the file is you");
    }
    if (parsed.rows.length > 5000) throw new AppError(422, "VALIDATION_ERROR", "That file is too big (over 5,000 rows)");

    // The group uses the export's most common currency.
    const counts = new Map<string, number>();
    for (const r of parsed.rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
    const currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";

    const result = await app.db.transaction(async (tx) => {
      const groupId = uuidv7();
      const [group] = await tx
        .insert(groups)
        .values({ id: groupId, name: req.body.groupName, currency, type: "other", emoji: "📥", createdBy: user.id })
        .returning();
      const memberIds = parsed.people.map(() => uuidv7());
      await tx.insert(members).values(
        parsed.people.map((name, i) => ({
          id: memberIds[i],
          groupId,
          displayName: name.slice(0, 60),
          ...(i === req.body.meIndex ? { userId: user.id, role: "owner" as const } : {}),
        })),
      );

      const skipped = [...parsed.problems];
      let expenseCount = 0;
      let paymentCount = 0;

      for (const row of parsed.rows) {
        if (row.currency !== currency) {
          skipped.push({ line: row.line, reason: `In ${row.currency}; the group uses ${currency} and the export has no exchange rate` });
          continue;
        }
        const positive = row.nets.map((n, i) => ({ n, i })).filter((x) => x.n > 0);
        const negative = row.nets.map((n, i) => ({ n, i })).filter((x) => x.n < 0);

        if (row.isPayment && positive.length === 1 && negative.length === 1) {
          // In the export the payer's balance goes up by what they paid.
          await tx.insert(settlements).values({
            id: uuidv7(),
            groupId,
            fromMemberId: memberIds[positive[0].i],
            toMemberId: memberIds[negative[0].i],
            amount: positive[0].n,
            currency,
            groupAmount: positive[0].n,
            method: "other",
            note: "Imported from Splitwise",
            date: row.date,
            createdByUserId: user.id,
          });
          paymentCount++;
          continue;
        }

        const r = reconstructExpense(row.cost, row.nets);
        const split: SplitSpec = {
          method: "exact",
          entries: r.owed.map((o) => ({ memberId: memberIds[o.index], amount: o.amount })),
        };
        const body = {
          description: row.description.slice(0, 140),
          amount: r.total,
          currency,
          date: row.date,
          category: guessImportCategory(row.category, row.description),
          notes: "Imported from Splitwise",
          payers: r.payers.map((p) => ({ memberId: memberIds[p.index], amount: p.amount })),
          split,
        } as ExpenseInput;
        const { fxRate, groupAmount, rows } = await computeLines(tx, group, body);
        const id = uuidv7();
        await tx.insert(expenses).values({
          id,
          groupId,
          description: body.description,
          amount: body.amount,
          currency,
          fxRate,
          groupAmount,
          category: body.category,
          date: body.date,
          notes: body.notes,
          split,
          createdByUserId: user.id,
          updatedByUserId: user.id,
        });
        await tx.insert(expenseLines).values(rows.map((l) => ({ ...l, expenseId: id })));
        expenseCount++;
      }

      await recordActivity(tx, {
        groupId,
        type: "group.imported",
        actorUserId: user.id,
        actorMemberId: memberIds[req.body.meIndex],
        entityId: groupId,
        data: { source: "splitwise", expenses: expenseCount, payments: paymentCount },
      });
      return { groupId, expenses: expenseCount, payments: paymentCount, skipped };
    });
    return reply.status(201).send(result);
  });
};
