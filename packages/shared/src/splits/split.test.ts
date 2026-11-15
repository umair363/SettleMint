import { describe, expect, it } from "vitest";
import { MoneyError } from "../money/errors";
import { forAll } from "../testing/random";
import { computeShares, resolveExpense, type SplitSpec } from "./split";

const amounts = (rows: { memberId: string; amount: number }[]) =>
  Object.fromEntries(rows.map((r) => [r.memberId, r.amount]));

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(MoneyError);
    expect((err as MoneyError).code).toBe(code);
    return;
  }
  throw new Error(`Expected MoneyError ${code}`);
}

describe("computeShares", () => {
  it("equal", () => {
    expect(amounts(computeShares(1000, { method: "equal", memberIds: ["a", "b", "c"] }))).toEqual({
      a: 334,
      b: 333,
      c: 333,
    });
  });

  it("exact must add up", () => {
    const spec: SplitSpec = {
      method: "exact",
      entries: [
        { memberId: "a", amount: 700 },
        { memberId: "b", amount: 300 },
      ],
    };
    expect(amounts(computeShares(1000, spec))).toEqual({ a: 700, b: 300 });
    expectCode(() => computeShares(1001, spec), "EXACT_SUM_MISMATCH");
  });

  it("percent allows decimals and must reach 100", () => {
    const spec: SplitSpec = {
      method: "percent",
      entries: [
        { memberId: "a", percent: 33.33 },
        { memberId: "b", percent: 33.33 },
        { memberId: "c", percent: 33.34 },
      ],
    };
    const r = computeShares(10000, spec);
    expect(r.reduce((s, x) => s + x.amount, 0)).toBe(10000);
    expectCode(
      () => computeShares(100, { method: "percent", entries: [{ memberId: "a", percent: 99 }] }),
      "PERCENT_SUM_MISMATCH",
    );
  });

  it("shares", () => {
    expect(
      amounts(
        computeShares(9000, {
          method: "shares",
          entries: [
            { memberId: "a", shares: 2 },
            { memberId: "b", shares: 1 },
          ],
        }),
      ),
    ).toEqual({ a: 6000, b: 3000 });
  });

  it("adjustment: equal split of the rest, then each person's extra", () => {
    // $100 dinner, Ana had a $10 extra drink: 90 split three ways, Ana +10.
    expect(
      amounts(
        computeShares(10000, {
          method: "adjustment",
          entries: [
            { memberId: "ana", adjustment: 1000 },
            { memberId: "ben", adjustment: 0 },
            { memberId: "cy", adjustment: 0 },
          ],
        }),
      ),
    ).toEqual({ ana: 4000, ben: 3000, cy: 3000 });
  });

  it("itemized spreads tax and tip by what each person ordered", () => {
    const result = computeShares(13000, {
      method: "itemized",
      items: [
        { amount: 6000, memberIds: ["a"] }, // a's steak
        { amount: 2000, memberIds: ["b"] }, // b's salad
        { amount: 2000, memberIds: ["a", "b"] }, // shared starter
      ],
      extras: 3000, // tax + tip, 30% of 100
    });
    // a ordered 70, b ordered 30 -> a pays 70 + 21, b pays 30 + 9
    expect(amounts(result)).toEqual({ a: 9100, b: 3900 });
  });

  it("itemized with weights and a discount", () => {
    const result = computeShares(800, {
      method: "itemized",
      items: [{ amount: 900, memberIds: ["a", "b"], weights: [2, 1] }],
      extras: -100,
    });
    expect(amounts(result)).toEqual({ a: 533, b: 267 });
    expectCode(
      () =>
        computeShares(1000, {
          method: "itemized",
          items: [{ amount: 900, memberIds: ["a"] }],
        }),
      "ITEMS_SUM_MISMATCH",
    );
  });

  it("rejects duplicates, empty splits and non-positive totals", () => {
    expectCode(() => computeShares(100, { method: "equal", memberIds: ["a", "a"] }), "DUPLICATE_MEMBER");
    expectCode(() => computeShares(100, { method: "equal", memberIds: [] }), "NO_PARTICIPANTS");
    expectCode(() => computeShares(0, { method: "equal", memberIds: ["a"] }), "INVALID_AMOUNT");
    expectCode(() => computeShares(1.5, { method: "equal", memberIds: ["a"] }), "INVALID_AMOUNT");
  });

  it("any valid split adds up to the total with no negative shares", () => {
    forAll(3000, (r) => {
      const total = r.int(1, 5e8);
      const ids = r.ids(r.int(1, 15));
      let spec: SplitSpec;
      switch (r.int(0, 3)) {
        case 0:
          spec = { method: "equal", memberIds: ids };
          break;
        case 1:
          spec = { method: "shares", entries: ids.map((memberId, i) => ({ memberId, shares: i === 0 ? 1 : r.int(0, 5) })) };
          break;
        case 2: {
          const base = Math.floor(10000 / ids.length) / 100;
          const percents = ids.map(() => base);
          percents[0] = Math.round((100 - base * (ids.length - 1)) * 100) / 100;
          spec = { method: "percent", entries: ids.map((memberId, i) => ({ memberId, percent: percents[i] })) };
          break;
        }
        default: {
          const items = Array.from({ length: r.int(1, 6) }, () => ({
            amount: r.int(1, 1e6),
            memberIds: ids.filter((_, i) => i === 0 || r.next() < 0.5),
          }));
          const itemSum = items.reduce((s, i) => s + i.amount, 0);
          spec = { method: "itemized", items, extras: r.int(0, itemSum) };
          const t = itemSum + (spec.extras ?? 0);
          const shares = computeShares(t, spec);
          expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(t);
          expect(shares.every((x) => x.amount >= 0)).toBe(true);
          return;
        }
      }
      const shares = computeShares(total, spec);
      expect(shares.reduce((s, x) => s + x.amount, 0)).toBe(total);
      expect(shares.every((x) => x.amount >= 0 && Number.isInteger(x.amount))).toBe(true);
    });
  });
});

describe("resolveExpense", () => {
  it("combines multiple payers with the split", () => {
    const lines = resolveExpense(
      9000,
      [
        { memberId: "a", amount: 6000 },
        { memberId: "b", amount: 3000 },
      ],
      { method: "equal", memberIds: ["a", "b", "c"] },
    );
    expect(lines).toEqual([
      { memberId: "a", paid: 6000, owed: 3000 },
      { memberId: "b", paid: 3000, owed: 3000 },
      { memberId: "c", paid: 0, owed: 3000 },
    ]);
  });

  it("payers must add up", () => {
    expectCode(
      () => resolveExpense(100, [{ memberId: "a", amount: 90 }], { method: "equal", memberIds: ["a"] }),
      "PAYERS_SUM_MISMATCH",
    );
  });
});
