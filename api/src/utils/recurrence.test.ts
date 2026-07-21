import { describe, it, expect } from "vitest";
import { computeNextRunDate } from "./recurrence";

describe("computeNextRunDate", () => {
  it("advances daily by one day", () => {
    const result = computeNextRunDate(new Date("2026-01-15T00:00:00Z"), "daily");
    expect(result.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });

  it("advances weekly by seven days", () => {
    const result = computeNextRunDate(new Date("2026-01-15T00:00:00Z"), "weekly");
    expect(result.toISOString()).toBe("2026-01-22T00:00:00.000Z");
  });

  it("advances monthly to the same day next month", () => {
    const result = computeNextRunDate(new Date("2026-01-15T00:00:00Z"), "monthly");
    expect(result.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("advances yearly to the same date next year", () => {
    const result = computeNextRunDate(new Date("2026-01-15T00:00:00Z"), "yearly");
    expect(result.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("rolls a Jan 31 monthly recurrence into March (JS Date overflow behavior)", () => {
    // Feb has no 31st — JS Date.setMonth overflows into the next month.
    // Documented here as the actual behavior rather than asserted as
    // "correct", since there's no single right answer for month-end recurrence.
    const result = computeNextRunDate(new Date("2026-01-31T00:00:00Z"), "monthly");
    expect(result.toISOString()).toBe("2026-03-03T00:00:00.000Z");
  });

  it("handles a leap-year Feb 29 yearly recurrence by overflowing into March in a non-leap year", () => {
    const result = computeNextRunDate(new Date("2024-02-29T00:00:00Z"), "yearly");
    expect(result.toISOString()).toBe("2025-03-01T00:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const original = new Date("2026-01-15T00:00:00Z");
    const originalTime = original.getTime();
    computeNextRunDate(original, "monthly");
    expect(original.getTime()).toBe(originalTime);
  });
});
