import { describe, expect, it } from "vitest";
import { forAll } from "../testing/random";
import { parseCsv, parseSplitwiseExport, reconstructExpense } from "./splitwise";

const SAMPLE = `Date,Description,Category,Cost,Currency,Ana Souza,Bilal Khan,Chen
2024-03-01,Hotel,Hotels,300.00,EUR,200.00,-100.00,-100.00
2024-03-02,"Dinner, with wine",Dining out,90.00,EUR,-30.00,60.00,-30.00
2024-03-03,Taxi,Taxi,10.00,EUR,-3.33,-3.33,6.66
2024-03-05,Bilal K. paid Ana S.,Payment,40.00,EUR,-40.00,40.00,0.00

2024-03-06,Total balance, , ,EUR,126.67,-3.33,-123.34
`;

describe("parseCsv", () => {
  it("handles quotes, commas and newlines inside fields", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,"two\nlines",3\n')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "two\nlines", "3"],
    ]);
  });
});

describe("parseSplitwiseExport", () => {
  it("reads people, expenses and payments, and skips the total row", () => {
    const out = parseSplitwiseExport(SAMPLE);
    expect(out.people).toEqual(["Ana Souza", "Bilal Khan", "Chen"]);
    expect(out.problems).toEqual([]);
    expect(out.rows.map((r) => [r.description, r.isPayment, r.cost, r.nets])).toEqual([
      ["Hotel", false, 30000, [20000, -10000, -10000]],
      ["Dinner, with wine", false, 9000, [-3000, 6000, -3000]],
      // 6.66 - 3.33 - 3.33 = 0.00, already balanced
      ["Taxi", false, 1000, [-333, -333, 666]],
      ["Bilal K. paid Ana S.", true, 4000, [-4000, 4000, 0]],
    ]);
  });

  it("fixes a one-cent rounding drift so each row balances", () => {
    const out = parseSplitwiseExport("Date,Description,Category,Cost,Currency,A,B,C\n2024-01-01,Pizza,General,10.00,USD,6.67,-3.33,-3.33\n");
    expect(out.rows[0].nets.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("explains files it can't read", () => {
    expect(parseSplitwiseExport("hello,world\n").problems[0].reason).toMatch(/Splitwise export/);
    const out = parseSplitwiseExport("Date,Description,Category,Cost,Currency,A,B\nnot-a-date,X,General,1,USD,1,-1\n2024-01-01,Y,General,1,ZZZ,1,-1\n");
    expect(out.problems.map((p) => p.reason)).toEqual(['Unreadable date "not-a-date"', 'Unknown currency "ZZZ"']);
  });
});

describe("reconstructExpense", () => {
  it("rebuilds paid/owed so every balance is exact", () => {
    // Ana paid 300, split three ways: nets +200 / -100 / -100.
    const r = reconstructExpense(30000, [20000, -10000, -10000]);
    expect(r.total).toBe(30000);
    expect(r.payers.reduce((s, p) => s + p.amount, 0)).toBe(30000);
    expect(r.owed.reduce((s, p) => s + p.amount, 0)).toBe(30000);
  });

  it("reproduces a single-payer expense exactly", () => {
    expect(reconstructExpense(30000, [20000, -10000, -10000])).toEqual({
      total: 30000,
      payers: [{ index: 0, amount: 30000 }],
      owed: [
        { index: 0, amount: 10000 },
        { index: 1, amount: 10000 },
        { index: 2, amount: 10000 },
      ],
    });
  });

  it("keeps paid - owed equal to each person's net for any row", () => {
    forAll(1000, (rnd) => {
      const people = rnd.int(2, 8);
      const nets = Array.from({ length: people }, () => rnd.int(-50000, 50000));
      nets[0] -= nets.reduce((a, b) => a + b, 0);
      const cost = rnd.int(0, 200000);
      const r = reconstructExpense(cost, nets);
      const paid = new Map(r.payers.map((p) => [p.index, p.amount]));
      const owed = new Map(r.owed.map((o) => [o.index, o.amount]));
      nets.forEach((n, i) => expect((paid.get(i) ?? 0) - (owed.get(i) ?? 0)).toBe(n));
      expect([...paid.values()].reduce((a, b) => a + b, 0)).toBe(r.total);
      expect([...owed.values()].reduce((a, b) => a + b, 0)).toBe(r.total);
    });
  });
});
