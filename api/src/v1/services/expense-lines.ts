import type { z } from "zod";
import {
  convertExpenseLines,
  convertMinor,
  resolveExpense,
  type createExpenseBody,
  type SplitSpec,
} from "@settlemint/shared";
import type { DbOrTx } from "../db/client";
import { assertActiveMembers, type GroupRow } from "./access";
import { resolveRate } from "./fx";

// Shared by the expenses route and the recurring-bill generator, so both
// validate and compute exactly the same way.

export type ExpenseInput = z.output<typeof createExpenseBody>;

export function splitMemberIds(split: SplitSpec): string[] {
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
export async function computeLines(tx: DbOrTx, group: GroupRow, body: ExpenseInput, alreadyInvolved: string[] = []) {
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

export const expenseSummary = (e: { description: string; amount: number; currency: string; category?: string | null }) => ({
  description: e.description,
  amount: e.amount,
  currency: e.currency,
  ...(e.category ? { category: e.category } : {}),
});
