import type { ExpenseDto, GroupDetailDto } from "@settlemint/shared";

export interface Recap {
  /** Everything spent, in the group's currency (minor units). */
  total: number;
  count: number;
  firstDate: string | null;
  lastDate: string | null;
  /** Biggest first. */
  byCategory: { category: string; amount: number }[];
  /** Who paid, biggest first. */
  byPayer: { memberId: string; name: string; amount: number }[];
  biggest: { description: string; amount: number; date: string } | null;
}

/** Numbers for a group's story: where the money went and who fronted it. Deleted expenses are left out. */
export function buildRecap(group: GroupDetailDto, expenses: ExpenseDto[]): Recap {
  const live = expenses.filter((e) => !e.deleted);
  const cats = new Map<string, number>();
  const payers = new Map<string, number>();
  let total = 0;
  let biggest: Recap["biggest"] = null;
  const dates: string[] = [];
  for (const e of live) {
    total += e.groupAmount;
    dates.push(e.date);
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.groupAmount);
    for (const line of e.lines) if (line.paidGroup > 0) payers.set(line.memberId, (payers.get(line.memberId) ?? 0) + line.paidGroup);
    if (!biggest || e.groupAmount > biggest.amount) biggest = { description: e.description, amount: e.groupAmount, date: e.date };
  }
  dates.sort();
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.displayName ?? "";
  return {
    total,
    count: live.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    byCategory: [...cats].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    byPayer: [...payers].map(([memberId, amount]) => ({ memberId, name: nameOf(memberId), amount })).sort((a, b) => b.amount - a.amount),
    biggest,
  };
}
