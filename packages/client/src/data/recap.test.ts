import { describe, expect, it } from "vitest";
import type { ExpenseDto, GroupDetailDto } from "@settlemint/shared";
import { buildRecap } from "./recap";

const group = { members: [{ id: "a", displayName: "Ana" }, { id: "b", displayName: "Ben" }] } as unknown as GroupDetailDto;
const exp = (over: Partial<ExpenseDto> & { payer: string }): ExpenseDto =>
  ({
    description: "x", category: "food", date: "2026-01-02", deleted: false, groupAmount: 1000,
    lines: [{ memberId: over.payer, paidGroup: over.groupAmount ?? 1000, owedGroup: 0, paid: 0, owed: 0 }],
    ...over,
  }) as unknown as ExpenseDto;

describe("buildRecap", () => {
  it("adds up spending by category and by who paid, biggest first", () => {
    const r = buildRecap(group, [
      exp({ payer: "a", groupAmount: 3000, category: "food", description: "Dinner", date: "2026-01-03" }),
      exp({ payer: "b", groupAmount: 500, category: "transport", date: "2026-01-01" }),
      exp({ payer: "a", groupAmount: 1500, category: "food" }),
    ]);
    expect(r.total).toBe(5000);
    expect(r.count).toBe(3);
    expect(r.byCategory).toEqual([{ category: "food", amount: 4500 }, { category: "transport", amount: 500 }]);
    expect(r.byPayer).toEqual([{ memberId: "a", name: "Ana", amount: 4500 }, { memberId: "b", name: "Ben", amount: 500 }]);
    expect(r.biggest).toEqual({ description: "Dinner", amount: 3000, date: "2026-01-03" });
    expect([r.firstDate, r.lastDate]).toEqual(["2026-01-01", "2026-01-03"]);
  });
  it("ignores deleted expenses and copes with none", () => {
    expect(buildRecap(group, [exp({ payer: "a", deleted: true })]).total).toBe(0);
    expect(buildRecap(group, []).biggest).toBeNull();
  });
});
