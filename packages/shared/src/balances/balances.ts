import { allocate } from "../money/allocate";
import { convertAllocation } from "../money/fx";
import type { ExpenseLine } from "../splits/split";

/**
 * An expense as the balance engine sees it: per-person paid/owed lines in a
 * single currency (normally already converted to the group currency).
 */
export interface LedgerExpense {
  id: string;
  lines: readonly ExpenseLine[];
}

/** A repayment: `from` paid `to`. */
export interface LedgerSettlement {
  id: string;
  from: string;
  to: string;
  amount: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/**
 * Convert an expense's lines into the group currency, keeping paid and owed
 * each adding up to the same converted total.
 */
export function convertExpenseLines(
  lines: readonly ExpenseLine[],
  from: string,
  to: string,
  rate: string,
): ExpenseLine[] {
  if (from === to) return lines.map((l) => ({ ...l }));
  const paid = convertAllocation(lines.map((l) => l.paid), from, to, rate);
  const owed = convertAllocation(lines.map((l) => l.owed), from, to, rate);
  return lines.map((l, i) => ({ memberId: l.memberId, paid: paid[i], owed: owed[i] }));
}

/**
 * Net balance per member. Positive: the group owes them. Negative: they owe
 * the group. The values always add up to exactly zero.
 */
export function computeNetBalances(
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[] = [],
): Map<string, number> {
  const net = new Map<string, number>();
  const add = (id: string, delta: number) => net.set(id, (net.get(id) ?? 0) + delta);

  for (const e of expenses) {
    for (const l of e.lines) add(l.memberId, l.paid - l.owed);
  }
  for (const s of settlements) {
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }
  return net;
}

/**
 * For one expense, who owes whom. Each person who is short owes the people
 * who are over, in proportion to how much each of them is over. With a
 * single payer this is simply "everyone owes the payer their share".
 */
export function expensePairwiseDebts(lines: readonly ExpenseLine[]): Transfer[] {
  const debtors = lines.filter((l) => l.owed > l.paid);
  const creditors = lines.filter((l) => l.paid > l.owed);
  if (debtors.length === 0 || creditors.length === 0) return [];

  // Allocate each debtor against what creditors are still owed. Rounding each
  // debtor independently could leave a creditor a cent over or under; working
  // from remaining capacity keeps every creditor's total exact, and the last
  // debtor simply covers exactly what is left.
  const remaining = creditors.map((c) => c.paid - c.owed);
  const out: Transfer[] = [];
  for (const d of debtors) {
    const parts = allocate(d.owed - d.paid, remaining);
    parts.forEach((amount, i) => {
      remaining[i] -= amount;
      if (amount > 0) out.push({ from: d.memberId, to: creditors[i].memberId, amount });
    });
  }
  return out;
}

function pairKey(a: string, b: string): [string, string, 1 | -1] {
  return a < b ? [a, b, 1] : [b, a, -1];
}

/**
 * Debts between each pair of people without moving debt to third parties:
 * if A paid for B, B owes A, even if B is owed by C. Settlements between the
 * pair reduce it. Used when a group turns simplification off, and for the
 * "why do I owe this" breakdown.
 */
export function computePairwiseDebts(
  expenses: readonly LedgerExpense[],
  settlements: readonly LedgerSettlement[] = [],
): Transfer[] {
  // pairs[a|b] > 0 means a owes b; < 0 means b owes a (with a < b).
  const pairs = new Map<string, { a: string; b: string; value: number }>();
  const addDebt = (from: string, to: string, amount: number) => {
    if (from === to || amount === 0) return;
    const [a, b, sign] = pairKey(from, to);
    const key = `${a}\u0000${b}`;
    const entry = pairs.get(key) ?? { a, b, value: 0 };
    entry.value += sign * amount;
    pairs.set(key, entry);
  };

  for (const e of expenses) {
    for (const t of expensePairwiseDebts(e.lines)) addDebt(t.from, t.to, t.amount);
  }
  for (const s of settlements) addDebt(s.from, s.to, -s.amount);

  const out: Transfer[] = [];
  for (const { a, b, value } of pairs.values()) {
    if (value > 0) out.push({ from: a, to: b, amount: value });
    else if (value < 0) out.push({ from: b, to: a, amount: -value });
  }
  return out.sort((x, y) => y.amount - x.amount || x.from.localeCompare(y.from) || x.to.localeCompare(y.to));
}
