import { describe, it, expect } from "vitest";
import {
  calculateBalances,
  calculateStrictSettlements,
  calculateSuggestedSettlements,
  type Expense,
  type ExpenseSplit,
  type Settlement,
} from "./settlementEngine";

describe("calculateBalances", () => {
  it("credits the payer and debits each split participant", () => {
    const expenses: Expense[] = [{ id: "e1", amount: 30, paidBy: "a" }];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "a", amountOwed: 10, isSettled: true },
      { expenseId: "e1", userId: "b", amountOwed: 10, isSettled: false },
      { expenseId: "e1", userId: "c", amountOwed: 10, isSettled: false },
    ];

    const balances = calculateBalances(expenses, splits, []);

    // a paid 30, owes 10 back to the pot -> net +20
    expect(balances.a).toBe(20);
    expect(balances.b).toBe(-10);
    expect(balances.c).toBe(-10);
  });

  it("applies settlements to reduce debt and credit", () => {
    const expenses: Expense[] = [{ id: "e1", amount: 20, paidBy: "a" }];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "a", amountOwed: 10, isSettled: true },
      { expenseId: "e1", userId: "b", amountOwed: 10, isSettled: false },
    ];
    const settlements: Settlement[] = [{ paidBy: "b", paidTo: "a", amount: 10 }];

    const balances = calculateBalances(expenses, splits, settlements);

    expect(balances.a).toBe(0);
    expect(balances.b).toBe(0);
  });

  it("rounds away floating point drift", () => {
    const expenses: Expense[] = [{ id: "e1", amount: 0.1, paidBy: "a" }];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "a", amountOwed: 0.1, isSettled: true },
    ];
    const balances = calculateBalances(expenses, splits, []);
    expect(balances.a).toBe(0);
  });
});

describe("calculateStrictSettlements", () => {
  it("nets out reciprocal debts between two people without touching a third party", () => {
    // A paid $30 for B (B owes A $30); B paid $10 for A (A owes B $10).
    // Net: B owes A $20. This must NOT get redirected through C.
    const expenses: Expense[] = [
      { id: "e1", amount: 30, paidBy: "a" },
      { id: "e2", amount: 10, paidBy: "b" },
    ];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "b", amountOwed: 30, isSettled: false },
      { expenseId: "e2", userId: "a", amountOwed: 10, isSettled: false },
    ];

    const result = calculateStrictSettlements(expenses, splits, []);

    expect(result).toEqual([{ from: "b", to: "a", amount: 20 }]);
  });

  it("does not simplify transitive debts across three people", () => {
    // A owes B $10, B owes C $10 — strict settlement keeps both legs,
    // it must not collapse to "A owes C $10" (that's the simplified engine's job).
    const expenses: Expense[] = [
      { id: "e1", amount: 10, paidBy: "b" },
      { id: "e2", amount: 10, paidBy: "c" },
    ];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "a", amountOwed: 10, isSettled: false },
      { expenseId: "e2", userId: "b", amountOwed: 10, isSettled: false },
    ];

    const result = calculateStrictSettlements(expenses, splits, []);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { from: "a", to: "b", amount: 10 },
        { from: "b", to: "c", amount: 10 },
      ])
    );
  });

  it("ignores a user's own split on their own expense", () => {
    const expenses: Expense[] = [{ id: "e1", amount: 10, paidBy: "a" }];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "a", amountOwed: 10, isSettled: true },
    ];
    const result = calculateStrictSettlements(expenses, splits, []);
    expect(result).toEqual([]);
  });

  it("reduces debt via a settlement payment", () => {
    const expenses: Expense[] = [{ id: "e1", amount: 20, paidBy: "a" }];
    const splits: ExpenseSplit[] = [
      { expenseId: "e1", userId: "b", amountOwed: 20, isSettled: false },
    ];
    const settlements: Settlement[] = [{ paidBy: "b", paidTo: "a", amount: 5 }];

    const result = calculateStrictSettlements(expenses, splits, settlements);

    expect(result).toEqual([{ from: "b", to: "a", amount: 15 }]);
  });
});

describe("calculateSuggestedSettlements", () => {
  it("matches the largest debtor with the largest creditor first (greedy min-transaction)", () => {
    // a owes 30, b owes 10; c is owed 25, d is owed 15
    const balances = { a: -30, b: -10, c: 25, d: 15 };

    const result = calculateSuggestedSettlements(balances);

    // Largest debtor (a, 30) pairs with largest creditor (c, 25) first: a->c 25
    // a still owes 5, matched against next creditor d: a->d 5
    // b still owes 10, matched against remaining d balance (10): b->d 10
    expect(result).toEqual([
      { from: "a", to: "c", amount: 25 },
      { from: "a", to: "d", amount: 5 },
      { from: "b", to: "d", amount: 10 },
    ]);
  });

  it("produces zero transactions when everyone is already settled", () => {
    const result = calculateSuggestedSettlements({ a: 0, b: 0 });
    expect(result).toEqual([]);
  });

  it("ignores balances within the 1-cent rounding threshold", () => {
    const result = calculateSuggestedSettlements({ a: 0.005, b: -0.005 });
    expect(result).toEqual([]);
  });

  it("settles a simple two-person debt in one transaction", () => {
    const result = calculateSuggestedSettlements({ a: -50, b: 50 });
    expect(result).toEqual([{ from: "a", to: "b", amount: 50 }]);
  });
});
