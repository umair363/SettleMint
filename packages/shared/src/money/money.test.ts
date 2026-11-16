import { describe, expect, it } from "vitest";
import { allocate, allocateEqually } from "./allocate";
import {
  decimalStringToMinor,
  formatMoney,
  minorToDecimalString,
  parseMoneyInput,
} from "./amount";
import { CURRENCY_CODES, currencyExponent, isCurrencyCode } from "./currencies";
import { MoneyError } from "./errors";
import { convertAllocation, convertMinor } from "./fx";
import { forAll } from "../testing/random";

describe("currencies", () => {
  it("knows minor units for awkward currencies", () => {
    expect(currencyExponent("USD")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("KWD")).toBe(3);
    expect(currencyExponent("PKR")).toBe(2);
  });

  it("rejects unknown codes", () => {
    expect(isCurrencyCode("XYZ")).toBe(false);
    expect(() => currencyExponent("usd")).toThrow(MoneyError);
  });

  it("every listed code is accepted by Intl", () => {
    for (const code of CURRENCY_CODES) {
      expect(() => new Intl.NumberFormat("en", { style: "currency", currency: code })).not.toThrow();
    }
  });
});

describe("decimal strings", () => {
  it("round-trips amounts that break floating point", () => {
    for (const [text, minor] of [["19.99", 1999], ["4.35", 435], ["1.13", 113], ["0.07", 7], ["0.29", 29]] as const) {
      expect(decimalStringToMinor(text, "USD")).toBe(minor);
      expect(minorToDecimalString(minor, "USD")).toBe(text);
    }
  });

  it("handles 0 and 3 decimal currencies", () => {
    expect(decimalStringToMinor("1500", "JPY")).toBe(1500);
    expect(minorToDecimalString(1500, "JPY")).toBe("1500");
    expect(decimalStringToMinor("1.234", "KWD")).toBe(1234);
    expect(minorToDecimalString(-5, "KWD")).toBe("-0.005");
  });

  it("rejects too many decimals instead of rounding", () => {
    expect(() => decimalStringToMinor("1.999", "USD")).toThrow(MoneyError);
    expect(() => decimalStringToMinor("10.5", "JPY")).toThrow(MoneyError);
  });

  it("round-trips any amount", () => {
    forAll(2000, (r) => {
      const currency = r.pick(["USD", "JPY", "KWD", "PKR"]);
      const minor = r.int(-1e12, 1e12);
      expect(decimalStringToMinor(minorToDecimalString(minor, currency), currency)).toBe(minor);
    });
  });
});

describe("parseMoneyInput", () => {
  it("reads what people type", () => {
    expect(parseMoneyInput("19.99", "USD", "en")).toBe(1999);
    expect(parseMoneyInput("19,99", "EUR", "de")).toBe(1999);
    expect(parseMoneyInput("12,5", "USD", "en")).toBe(1250);
    expect(parseMoneyInput("1,234.56", "USD", "en")).toBe(123456);
    expect(parseMoneyInput("1.234,56", "EUR", "de")).toBe(123456);
    expect(parseMoneyInput("1,234", "USD", "en")).toBe(123400);
    expect(parseMoneyInput("1.234", "EUR", "de")).toBe(123400);
    expect(parseMoneyInput("1 234,56", "EUR", "fr")).toBe(123456);
    // Arabic-Indic, Persian/Urdu and Devanagari digits, Arabic separators, bidi marks
    expect(parseMoneyInput("١٢٫٥٠", "USD", "ar-EG")).toBe(1250);
    expect(parseMoneyInput("١٬٢٣٤٫٥٠", "USD", "ar-SA")).toBe(123450);
    expect(parseMoneyInput("۱۲۳٫۴", "PKR", "ur")).toBe(12340);
    expect(parseMoneyInput("१,२३४.५०", "INR", "hi")).toBe(123450);
    expect(parseMoneyInput("‏12.50", "USD", "ar")).toBe(1250);
    expect(parseMoneyInput("1,50,000", "INR", "en-IN")).toBe(15000000);
    expect(parseMoneyInput("12.", "USD", "en")).toBe(1200);
    expect(parseMoneyInput(".5", "USD", "en")).toBe(50);
    expect(parseMoneyInput("1500", "JPY", "ja")).toBe(1500);
  });

  it("returns null for junk", () => {
    for (const bad of ["", "abc", "1.2.3,4", "12.345", "--5", "1e5"]) {
      expect(parseMoneyInput(bad, "USD", "en")).toBeNull();
    }
  });
});

describe("formatMoney", () => {
  it("formats per currency and locale", () => {
    expect(formatMoney(1999, "USD", { locale: "en-US" })).toBe("$19.99");
    expect(formatMoney(1500, "JPY", { locale: "en-US" })).toBe("¥1,500");
    expect(formatMoney(1234, "KWD", { locale: "en-US" })).toContain("1.234");
    expect(formatMoney(-250, "EUR", { locale: "en-US", signDisplay: "always" })).toBe("-€2.50");
  });
});

describe("allocate", () => {
  it("splits evenly and gives leftover cents to the first people", () => {
    expect(allocateEqually(1000, 3)).toEqual([334, 333, 333]);
    expect(allocateEqually(-1000, 3)).toEqual([-334, -333, -333]);
  });

  it("gives leftovers to the largest remainders", () => {
    // 100 * [1,1,1.5] / 3.5 = 28.57, 28.57, 42.86 -> 28, 28, 42 + 2 leftover
    expect(allocate(100, [1, 1, 1.5])).toEqual([29, 28, 43]);
  });

  it("never gives anything to a zero weight", () => {
    expect(allocate(1, [0, 1, 1])).toEqual([0, 1, 0]);
  });

  it("always adds up exactly and stays proportional", () => {
    forAll(3000, (r) => {
      const total = r.int(-1e9, 1e9);
      const weights = Array.from({ length: r.int(1, 12) }, () => r.int(0, 50) / r.pick([1, 4, 100]));
      if (weights.every((w) => w === 0)) weights[0] = 1;
      const parts = allocate(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      const sumW = weights.reduce((a, b) => a + b, 0);
      parts.forEach((p, i) => {
        // Each part is within one minor unit of its exact share.
        expect(Math.abs(p - (total * weights[i]) / sumW)).toBeLessThan(1 + 1e-6);
        if (weights[i] === 0) expect(p).toBe(0);
      });
    });
  });
});

describe("fx", () => {
  it("converts across different minor-unit sizes", () => {
    expect(convertMinor(10000, "USD", "PKR", "278.5")).toBe(2785000); // $100 -> Rs 27,850.00
    expect(convertMinor(100000, "JPY", "USD", "0.0067")).toBe(67000); // ¥100,000 -> $670.00
    expect(convertMinor(1000, "USD", "JPY", "151.234")).toBe(1512); // $10 -> ¥1,512.34 -> ¥1,512
    expect(convertMinor(1000, "KWD", "USD", "3.25")).toBe(325); // 1.000 KWD -> $3.25
  });

  it("rounds half away from zero", () => {
    expect(convertMinor(1, "USD", "EUR", "0.5")).toBe(1);
    expect(convertMinor(-1, "USD", "EUR", "0.5")).toBe(-1);
  });

  it("rejects bad rates", () => {
    expect(() => convertMinor(100, "USD", "EUR", "0")).toThrow(MoneyError);
    expect(() => convertMinor(100, "USD", "EUR", "-1.2")).toThrow(MoneyError);
    expect(() => convertMinor(100, "USD", "EUR", "1e3")).toThrow(MoneyError);
  });

  it("converted parts add up to the converted total", () => {
    forAll(2000, (r) => {
      const parts = Array.from({ length: r.int(1, 10) }, () => r.int(0, 1e7));
      const rate = `${r.int(0, 300)}.${r.int(1, 9999)}`;
      const converted = convertAllocation(parts, "USD", "PKR", rate);
      const total = parts.reduce((a, b) => a + b, 0);
      expect(converted.reduce((a, b) => a + b, 0)).toBe(convertMinor(total, "USD", "PKR", rate));
    });
  });
});
