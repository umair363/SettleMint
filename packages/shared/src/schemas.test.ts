import { describe, expect, it } from "vitest";
import { money } from "./schemas";

describe("money schema (current API)", () => {
  it("accepts amounts that are inexact in floating point", () => {
    for (const v of [19.99, 4.35, 1.13, 0.07, 0.29, 1.15, 0.01, 99999.99]) {
      expect(money.safeParse(v).success).toBe(true);
    }
  });

  it("still rejects more than two decimals", () => {
    for (const v of [1.001, 19.999, 0.005]) {
      expect(money.safeParse(v).success).toBe(false);
    }
  });
});
