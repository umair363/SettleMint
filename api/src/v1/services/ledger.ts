import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  computeNetBalances,
  computePairwiseDebts,
  simplifyDebts,
  type LedgerExpense,
  type LedgerSettlement,
  type TransferDto,
} from "@settlemint/shared";
import type { DbOrTx } from "../db/client";
import { expenseLines, expenses, settlements } from "../db/schema";

export interface GroupLedger {
  balances: Map<string, number>;
  transfers: TransferDto[];
  totalSpent: number;
}

/** Balances and suggested payments for one group, in the group currency. */
export async function groupLedger(db: DbOrTx, groupId: string, simplify: boolean): Promise<GroupLedger> {
  const lineRows = await db
    .select({
      expenseId: expenseLines.expenseId,
      memberId: expenseLines.memberId,
      paid: expenseLines.paidGroup,
      owed: expenseLines.owedGroup,
    })
    .from(expenseLines)
    .innerJoin(expenses, eq(expenses.id, expenseLines.expenseId))
    .where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)));

  const byExpense = new Map<string, LedgerExpense & { lines: { memberId: string; paid: number; owed: number }[] }>();
  let totalSpent = 0;
  for (const r of lineRows) {
    let e = byExpense.get(r.expenseId);
    if (!e) {
      e = { id: r.expenseId, lines: [] };
      byExpense.set(r.expenseId, e);
    }
    e.lines.push({ memberId: r.memberId, paid: r.paid, owed: r.owed });
    totalSpent += r.paid;
  }

  const settlementRows: LedgerSettlement[] = (
    await db
      .select({
        id: settlements.id,
        from: settlements.fromMemberId,
        to: settlements.toMemberId,
        amount: settlements.groupAmount,
      })
      .from(settlements)
      .where(and(eq(settlements.groupId, groupId), isNull(settlements.deletedAt)))
  ).map((s) => ({ ...s }));

  const ledgerExpenses = [...byExpense.values()];
  const balances = computeNetBalances(ledgerExpenses, settlementRows);
  const raw = simplify ? simplifyDebts(balances) : computePairwiseDebts(ledgerExpenses, settlementRows);
  return {
    balances,
    transfers: raw.map((t) => ({ fromMemberId: t.from, toMemberId: t.to, amount: t.amount })),
    totalSpent,
  };
}

/** Net balance per member id across many groups, in one query per table. */
export async function memberBalances(db: DbOrTx, memberIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>(memberIds.map((id) => [id, 0]));
  if (memberIds.length === 0) return result;

  const lineSums = await db
    .select({
      memberId: expenseLines.memberId,
      net: sql<string>`sum(${expenseLines.paidGroup} - ${expenseLines.owedGroup})`,
    })
    .from(expenseLines)
    .innerJoin(expenses, eq(expenses.id, expenseLines.expenseId))
    .where(and(inArray(expenseLines.memberId, memberIds), isNull(expenses.deletedAt)))
    .groupBy(expenseLines.memberId);
  for (const r of lineSums) result.set(r.memberId, (result.get(r.memberId) ?? 0) + Number(r.net));

  const paidOut = await db
    .select({ memberId: settlements.fromMemberId, total: sql<string>`sum(${settlements.groupAmount})` })
    .from(settlements)
    .where(and(inArray(settlements.fromMemberId, memberIds), isNull(settlements.deletedAt)))
    .groupBy(settlements.fromMemberId);
  for (const r of paidOut) result.set(r.memberId, (result.get(r.memberId) ?? 0) + Number(r.total));

  const received = await db
    .select({ memberId: settlements.toMemberId, total: sql<string>`sum(${settlements.groupAmount})` })
    .from(settlements)
    .where(and(inArray(settlements.toMemberId, memberIds), isNull(settlements.deletedAt)))
    .groupBy(settlements.toMemberId);
  for (const r of received) result.set(r.memberId, (result.get(r.memberId) ?? 0) - Number(r.total));

  return result;
}
