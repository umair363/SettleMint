import { describe, it, expect } from "vitest";
import { calculateSplits } from "./splitCalculator";

function sumOwed(results: { amountOwed: number }[]) {
  return Math.round(results.reduce((s, r) => s + r.amountOwed, 0) * 100) / 100;
}

describe("calculateSplits — EQUAL", () => {
  it("splits evenly when the amount divides cleanly", () => {
    const result = calculateSplits(30, "EQUAL", [
      { userId: "a" }, { userId: "b" }, { userId: "c" },
    ]);
    expect(result).toEqual([
      { userId: "a", amountOwed: 10 },
      { userId: "b", amountOwed: 10 },
      { userId: "c", amountOwed: 10 },
    ]);
    expect(sumOwed(result)).toBe(30);
  });

  it("distributes leftover pennies round-robin when the split doesn't divide evenly", () => {
    // $10 / 3 = 3.33 recurring — someone has to eat the extra cent.
    const result = calculateSplits(10, "EQUAL", [
      { userId: "a" }, { userId: "b" }, { userId: "c" },
    ]);
    expect(sumOwed(result)).toBe(10);
    // Floor gives everyone 3.33, one extra cent goes to the first participant.
    expect(result[0].amountOwed).toBe(3.34);
    expect(result[1].amountOwed).toBe(3.33);
    expect(result[2].amountOwed).toBe(3.33);
  });

  it("gives the whole amount to a single participant", () => {
    const result = calculateSplits(19.99, "EQUAL", [{ userId: "a" }]);
    expect(result).toEqual([{ userId: "a", amountOwed: 19.99 }]);
  });

  it("throws when there are no participants", () => {
    expect(() => calculateSplits(10, "EQUAL", [])).toThrow(
      "Cannot split an expense with 0 participants."
    );
  });
});

describe("calculateSplits — EXACT", () => {
  it("accepts exact amounts that sum to the total", () => {
    const result = calculateSplits(100, "EXACT", [
      { userId: "a", value: 60 },
      { userId: "b", value: 40 },
    ]);
    expect(result).toEqual([
      { userId: "a", amountOwed: 60 },
      { userId: "b", amountOwed: 40 },
    ]);
  });

  it("rejects exact amounts that don't sum to the total", () => {
    expect(() =>
      calculateSplits(100, "EXACT", [
        { userId: "a", value: 60 },
        { userId: "b", value: 30 },
      ])
    ).toThrow("Exact split amounts must sum up to the total expense amount.");
  });

  it("treats a missing value as zero", () => {
    const result = calculateSplits(50, "EXACT", [
      { userId: "a", value: 50 },
      { userId: "b" },
    ]);
    expect(result).toEqual([
      { userId: "a", amountOwed: 50 },
      { userId: "b", amountOwed: 0 },
    ]);
  });
});

describe("calculateSplits — PERCENTAGE", () => {
  it("splits by percentage and sums to the total", () => {
    const result = calculateSplits(100, "PERCENTAGE", [
      { userId: "a", value: 50 },
      { userId: "b", value: 50 },
    ]);
    expect(sumOwed(result)).toBe(100);
    expect(result).toEqual([
      { userId: "a", amountOwed: 50 },
      { userId: "b", amountOwed: 50 },
    ]);
  });

  it("distributes rounding remainder when percentages don't divide evenly", () => {
    // 33.33% of $10 three times only accounts for 9.99, not 10.00
    const result = calculateSplits(10, "PERCENTAGE", [
      { userId: "a", value: 33.34 },
      { userId: "b", value: 33.33 },
      { userId: "c", value: 33.33 },
    ]);
    expect(sumOwed(result)).toBe(10);
  });

  it("rejects percentages that don't sum to 100", () => {
    expect(() =>
      calculateSplits(100, "PERCENTAGE", [
        { userId: "a", value: 50 },
        { userId: "b", value: 40 },
      ])
    ).toThrow("Percentages must sum up to 100%.");
  });

  it("tolerates floating point drift within 0.01", () => {
    const result = calculateSplits(100, "PERCENTAGE", [
      { userId: "a", value: 33.33 },
      { userId: "b", value: 33.33 },
      { userId: "c", value: 33.34 },
    ]);
    expect(sumOwed(result)).toBe(100);
  });
});

describe("calculateSplits — SHARES", () => {
  it("splits proportionally to shares", () => {
    const result = calculateSplits(90, "SHARES", [
      { userId: "a", value: 2 },
      { userId: "b", value: 1 },
    ]);
    expect(sumOwed(result)).toBe(90);
    expect(result).toEqual([
      { userId: "a", amountOwed: 60 },
      { userId: "b", amountOwed: 30 },
    ]);
  });

  it("distributes leftover pennies when shares don't divide evenly", () => {
    const result = calculateSplits(10, "SHARES", [
      { userId: "a", value: 1 },
      { userId: "b", value: 1 },
      { userId: "c", value: 1 },
    ]);
    expect(sumOwed(result)).toBe(10);
  });

  it("rejects zero total shares", () => {
    expect(() =>
      calculateSplits(100, "SHARES", [
        { userId: "a", value: 0 },
        { userId: "b", value: 0 },
      ])
    ).toThrow("Total shares cannot be zero.");
  });
});

describe("calculateSplits — unsupported type", () => {
  it("throws for an unrecognized split type", () => {
    expect(() =>
      // @ts-expect-error — intentionally passing an invalid split type
      calculateSplits(100, "BOGUS", [{ userId: "a" }])
    ).toThrow("Unsupported split type: BOGUS");
  });
});
