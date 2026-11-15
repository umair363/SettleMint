import { describe, expect, it } from "vitest";
import { dueOccurrences, occurrenceDate } from "./recurrence";

describe("occurrenceDate", () => {
  it("never drifts for monthly bills on the 31st", () => {
    const dates = [0, 1, 2, 3, 4].map((n) => occurrenceDate("2026-01-31", "monthly", 1, n));
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("handles leap years for yearly bills on Feb 29", () => {
    expect([0, 1, 2, 3, 4].map((n) => occurrenceDate("2028-02-29", "yearly", 1, n))).toEqual([
      "2028-02-29",
      "2029-02-28",
      "2030-02-28",
      "2031-02-28",
      "2032-02-29",
    ]);
  });

  it("supports weekly and every-N intervals across month and year ends", () => {
    expect([0, 1, 2].map((n) => occurrenceDate("2026-12-24", "weekly", 1, n))).toEqual(["2026-12-24", "2026-12-31", "2027-01-07"]);
    expect([0, 1, 2].map((n) => occurrenceDate("2026-11-15", "monthly", 3, n))).toEqual(["2026-11-15", "2027-02-15", "2027-05-15"]);
    expect(occurrenceDate("2026-03-01", "weekly", 2, 1)).toBe("2026-03-15");
  });
});

describe("dueOccurrences", () => {
  it("lists what is due up to today, respecting the end date and a cap", () => {
    expect(dueOccurrences("2026-08-15", "monthly", 1, 0, "2026-11-16")).toEqual([
      { n: 0, date: "2026-08-15" },
      { n: 1, date: "2026-09-15" },
      { n: 2, date: "2026-10-15" },
      { n: 3, date: "2026-11-15" },
    ]);
    expect(dueOccurrences("2026-08-15", "monthly", 1, 2, "2026-11-16", { endIso: "2026-10-31" })).toEqual([
      { n: 2, date: "2026-10-15" },
    ]);
    expect(dueOccurrences("2020-01-01", "weekly", 1, 0, "2026-11-16", { limit: 5 })).toHaveLength(5);
    expect(dueOccurrences("2026-12-01", "monthly", 1, 0, "2026-11-16")).toEqual([]);
  });
});
