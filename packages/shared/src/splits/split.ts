import { allocate, allocateEqually } from "../money/allocate";
import { assertMinor } from "../money/amount";
import { MoneyError } from "../money/errors";

/**
 * How an expense is divided among group members. All amounts are integer
 * minor units in the expense's currency. Entries are arrays (not objects) so
 * the order is stable, which makes rounding deterministic.
 */
export type SplitSpec =
  | { method: "equal"; memberIds: string[] }
  | { method: "exact"; entries: { memberId: string; amount: number }[] }
  | { method: "percent"; entries: { memberId: string; percent: number }[] }
  | { method: "shares"; entries: { memberId: string; shares: number }[] }
  /** Equal split of what is left after each person's +/- adjustment. */
  | { method: "adjustment"; entries: { memberId: string; adjustment: number }[] }
  /**
   * Receipt-style split. Each item is shared by its members (optionally
   * weighted, e.g. one person had two of three drinks). `extras` is tax + tip
   * + service charge - discounts, spread in proportion to what each person
   * ordered.
   */
  | {
      method: "itemized";
      items: { amount: number; memberIds: string[]; weights?: number[]; label?: string }[];
      extras?: number;
    };

export type SplitMethod = SplitSpec["method"];

export const SPLIT_METHODS: readonly SplitMethod[] = [
  "equal",
  "exact",
  "percent",
  "shares",
  "adjustment",
  "itemized",
];

export interface MemberAmount {
  memberId: string;
  amount: number;
}

function assertUnique(ids: readonly string[]): void {
  if (ids.length === 0) {
    throw new MoneyError("NO_PARTICIPANTS", "Add at least one person to split with");
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) {
      throw new MoneyError("NO_PARTICIPANTS", "Every participant needs an id");
    }
    if (seen.has(id)) {
      throw new MoneyError("DUPLICATE_MEMBER", "The same person appears twice in this split");
    }
    seen.add(id);
  }
}

function zip(ids: readonly string[], amounts: readonly number[]): MemberAmount[] {
  return ids.map((memberId, i) => ({ memberId, amount: amounts[i] }));
}

function assertPositiveTotal(total: number): void {
  assertMinor(total, "total");
  if (total <= 0) {
    throw new MoneyError("INVALID_AMOUNT", "The amount must be greater than zero");
  }
}

/**
 * Work out how much each person owes for an expense of `total` minor units.
 * The result always adds up to exactly `total`, and nobody owes a negative
 * amount. Throws MoneyError with a stable code when the input is invalid.
 */
export function computeShares(total: number, spec: SplitSpec): MemberAmount[] {
  assertPositiveTotal(total);

  switch (spec.method) {
    case "equal": {
      assertUnique(spec.memberIds);
      return zip(spec.memberIds, allocateEqually(total, spec.memberIds.length));
    }

    case "exact": {
      const ids = spec.entries.map((e) => e.memberId);
      assertUnique(ids);
      let sum = 0;
      for (const e of spec.entries) {
        assertMinor(e.amount);
        if (e.amount < 0) {
          throw new MoneyError("NEGATIVE_SHARE", "Amounts can't be negative");
        }
        sum += e.amount;
      }
      if (sum !== total) {
        throw new MoneyError(
          "EXACT_SUM_MISMATCH",
          `Amounts add up to ${sum} but the total is ${total}`,
        );
      }
      return spec.entries.map((e) => ({ memberId: e.memberId, amount: e.amount }));
    }

    case "percent": {
      const ids = spec.entries.map((e) => e.memberId);
      assertUnique(ids);
      const percents = spec.entries.map((e) => e.percent);
      const sum = percents.reduce((a, b) => a + b, 0);
      if (!Number.isFinite(sum) || Math.abs(sum - 100) > 1e-6) {
        throw new MoneyError("PERCENT_SUM_MISMATCH", "Percentages must add up to 100%");
      }
      return zip(ids, allocate(total, percents));
    }

    case "shares": {
      const ids = spec.entries.map((e) => e.memberId);
      assertUnique(ids);
      return zip(ids, allocate(total, spec.entries.map((e) => e.shares)));
    }

    case "adjustment": {
      const ids = spec.entries.map((e) => e.memberId);
      assertUnique(ids);
      let adjSum = 0;
      for (const e of spec.entries) {
        assertMinor(e.adjustment, "adjustment");
        adjSum += e.adjustment;
      }
      const rest = allocateEqually(total - adjSum, ids.length);
      const result = spec.entries.map((e, i) => ({
        memberId: e.memberId,
        amount: rest[i] + e.adjustment,
      }));
      if (result.some((r) => r.amount < 0)) {
        throw new MoneyError("NEGATIVE_SHARE", "Adjustments leave someone owing less than zero");
      }
      return result;
    }

    case "itemized": {
      if (spec.items.length === 0) {
        throw new MoneyError("NO_PARTICIPANTS", "Add at least one item");
      }
      const extras = spec.extras ?? 0;
      assertMinor(extras, "extras");

      const subtotals = new Map<string, number>();
      let itemsSum = 0;
      for (const item of spec.items) {
        assertPositiveTotal(item.amount);
        assertUnique(item.memberIds);
        const weights = item.weights ?? item.memberIds.map(() => 1);
        if (weights.length !== item.memberIds.length) {
          throw new MoneyError("INVALID_WEIGHT", "Each item needs one weight per person");
        }
        const parts = allocate(item.amount, weights);
        item.memberIds.forEach((id, i) => {
          subtotals.set(id, (subtotals.get(id) ?? 0) + parts[i]);
        });
        itemsSum += item.amount;
      }

      if (itemsSum + extras !== total) {
        throw new MoneyError(
          "ITEMS_SUM_MISMATCH",
          `Items plus tax and tip add up to ${itemsSum + extras} but the total is ${total}`,
        );
      }

      const ids = [...subtotals.keys()];
      const subs = ids.map((id) => subtotals.get(id) ?? 0);
      const extraParts = extras === 0 ? subs.map(() => 0) : allocate(extras, subs);
      const result = ids.map((memberId, i) => ({ memberId, amount: subs[i] + extraParts[i] }));
      if (result.some((r) => r.amount < 0)) {
        throw new MoneyError("NEGATIVE_SHARE", "The discount is larger than someone's items");
      }
      return result;
    }

    default: {
      const never: never = spec;
      throw new MoneyError("INVALID_AMOUNT", `Unknown split method: ${JSON.stringify(never)}`);
    }
  }
}

/** Validate who paid. Payers' amounts must add up to the total. */
export function computePayers(total: number, payers: readonly MemberAmount[]): MemberAmount[] {
  assertPositiveTotal(total);
  assertUnique(payers.map((p) => p.memberId));
  let sum = 0;
  for (const p of payers) {
    assertMinor(p.amount);
    if (p.amount < 0) {
      throw new MoneyError("NEGATIVE_SHARE", "A payer can't pay a negative amount");
    }
    sum += p.amount;
  }
  if (sum !== total) {
    throw new MoneyError("PAYERS_SUM_MISMATCH", `Payments add up to ${sum} but the total is ${total}`);
  }
  return payers.filter((p) => p.amount > 0).map((p) => ({ ...p }));
}

/** One person's position in a single expense. */
export interface ExpenseLine {
  memberId: string;
  paid: number;
  owed: number;
}

/**
 * Combine payers and split into one line per person. Lines always satisfy
 * sum(paid) == sum(owed) == total.
 */
export function resolveExpense(
  total: number,
  payers: readonly MemberAmount[],
  split: SplitSpec,
): ExpenseLine[] {
  const paid = computePayers(total, payers);
  const owed = computeShares(total, split);
  const lines = new Map<string, ExpenseLine>();
  for (const p of paid) {
    lines.set(p.memberId, { memberId: p.memberId, paid: p.amount, owed: 0 });
  }
  for (const o of owed) {
    const line = lines.get(o.memberId) ?? { memberId: o.memberId, paid: 0, owed: 0 };
    line.owed += o.amount;
    lines.set(o.memberId, line);
  }
  return [...lines.values()];
}
