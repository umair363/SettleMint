import { describe, expect, it } from "vitest";
import { forAll } from "../testing/random";
import { resolveExpense } from "../splits/split";
import {
  computeNetBalances,
  computePairwiseDebts,
  convertExpenseLines,
  type LedgerExpense,
  type LedgerSettlement,
  type Transfer,
} from "./balances";
import { simplifyDebts } from "./simplify";

const obj = (m: Map<string, number>) => Object.fromEntries([...m].filter(([, v]) => v !== 0));

function applyTransfers(balances: Map<string, number>, transfers: Transfer[]) {
  const after = new Map(balances);
  for (const t of transfers) {
    after.set(t.from, (after.get(t.from) ?? 0) + t.amount);
    after.set(t.to, (after.get(t.to) ?? 0) - t.amount);
  }
  return after;
}

const expense = (id: string, total: number, payer: string, ids: string[]): LedgerExpense => ({
  id,
  lines: resolveExpense(total, [{ memberId: payer, amount: total }], { method: "equal", memberIds: ids }),
});

describe("computeNetBalances", () => {
  it("adds up paid minus owed, then applies settlements", () => {
    const expenses = [expense("e1", 3000, "a", ["a", "b", "c"]), expense("e2", 600, "b", ["a", "b"])];
    // Before settling: a +1700, b -700, c -1000. Then c pays a 10.00.
    expect(obj(computeNetBalances(expenses))).toEqual({ a: 1700, b: -700, c: -1000 });
    const settlements: LedgerSettlement[] = [{ id: "s1", from: "c", to: "a", amount: 1000 }];
    expect(obj(computeNetBalances(expenses, settlements))).toEqual({ a: 700, b: -700 });
  });
});

describe("computePairwiseDebts", () => {
  it("keeps debts between the original people and nets each pair", () => {
    const expenses = [expense("e1", 3000, "a", ["a", "b", "c"]), expense("e2", 600, "b", ["a", "b"])];
    expect(computePairwiseDebts(expenses)).toEqual([
      { from: "c", to: "a", amount: 1000 },
      { from: "b", to: "a", amount: 700 },
    ]);
  });

  it("matches net balances for every person", () => {
    forAll(500, (r) => {
      const ids = r.ids(r.int(2, 8));
      const expenses: LedgerExpense[] = Array.from({ length: r.int(1, 15) }, (_, i) => {
        const total = r.int(1, 1e6);
        const payerA = r.pick(ids);
        const payerB = r.pick(ids);
        const payers =
          payerA === payerB
            ? [{ memberId: payerA, amount: total }]
            : [
                { memberId: payerA, amount: Math.floor(total / 2) },
                { memberId: payerB, amount: total - Math.floor(total / 2) },
              ];
        const members = ids.filter((_, j) => j === 0 || r.next() < 0.6);
        return { id: `e${i}`, lines: resolveExpense(total, payers, { method: "equal", memberIds: members }) };
      });
      const net = computeNetBalances(expenses);
      const fromPairs = applyTransfers(new Map(), computePairwiseDebts(expenses).map((t) => ({ ...t, amount: -t.amount })));
      for (const id of ids) expect(fromPairs.get(id) ?? 0).toBe(net.get(id) ?? 0);
    });
  });
});

describe("convertExpenseLines", () => {
  it("keeps paid and owed equal after conversion", () => {
    const lines = resolveExpense(10000, [{ memberId: "a", amount: 10000 }], {
      method: "equal",
      memberIds: ["a", "b", "c"],
    });
    const converted = convertExpenseLines(lines, "USD", "PKR", "278.37");
    const paid = converted.reduce((s, l) => s + l.paid, 0);
    const owed = converted.reduce((s, l) => s + l.owed, 0);
    expect(paid).toBe(2783700);
    expect(owed).toBe(paid);
  });
});

describe("simplifyDebts", () => {
  it("finds the fewest payments when groups cancel out", () => {
    // {a,b} and {c,d,e} each net to zero: 1 + 2 = 3 payments, not 4.
    const balances = new Map([
      ["a", 500],
      ["b", -500],
      ["c", 300],
      ["d", 200],
      ["e", -500],
    ]);
    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(3);
    expect(obj(applyTransfers(balances, transfers))).toEqual({});
  });

  it("returns nothing when everyone is even", () => {
    expect(simplifyDebts(new Map([["a", 0]]))).toEqual([]);
  });

  it("refuses balances that do not add up to zero", () => {
    expect(() => simplifyDebts(new Map([["a", 1]]))).toThrow();
  });

  function randomBalances(r: { int: (a: number, b: number) => number; ids: (n: number) => string[] }, n: number) {
    const ids = r.ids(n);
    const values = ids.map(() => r.int(-1e5, 1e5));
    values[values.length - 1] -= values.reduce((a, b) => a + b, 0);
    return new Map(ids.map((id, i) => [id, values[i]]));
  }

  it("always settles everyone exactly, with at most n-1 payments", () => {
    forAll(1500, (r) => {
      const balances = randomBalances(r, r.int(1, 24));
      const transfers = simplifyDebts(balances);
      expect(obj(applyTransfers(balances, transfers))).toEqual({});
      const nonZero = [...balances.values()].filter((v) => v !== 0).length;
      expect(transfers.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
      for (const t of transfers) {
        expect(t.amount).toBeGreaterThan(0);
        expect(Number.isInteger(t.amount)).toBe(true);
        expect(t.from).not.toBe(t.to);
      }
    });
  });

  it("is fast at the exact-search limit", () => {
    const balances = new Map<string, number>(
      Array.from({ length: 16 }, (_, i) => [`m${i}`, (i % 2 === 0 ? 1 : -1) * (100 + i * 37)]),
    );
    const fix = [...balances.values()].reduce((a, b) => a + b, 0);
    balances.set("m15", (balances.get("m15") ?? 0) - fix);
    const start = performance.now();
    simplifyDebts(balances);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
