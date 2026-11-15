import { allocate } from "./allocate";
import { assertMinor } from "./amount";
import { currencyExponent } from "./currencies";
import { MoneyError } from "./errors";

/**
 * Exchange rates are passed as decimal strings ("278.4512", "0.0067"),
 * meaning "units of the target currency per one unit of the source currency".
 * Strings keep the rate exact from the database through to the maths.
 */
export function parseRate(rate: string): { num: bigint; den: bigint } {
  const match = /^(\d+)(?:\.(\d{1,18}))?$/.exec(rate.trim());
  if (!match) {
    throw new MoneyError("INVALID_RATE", `Invalid exchange rate: "${rate}"`);
  }
  const [, whole, frac = ""] = match;
  const num = BigInt(whole + frac);
  if (num === 0n) {
    throw new MoneyError("INVALID_RATE", "Exchange rate must be greater than zero");
  }
  return { num, den: 10n ** BigInt(frac.length) };
}

export function isValidRate(rate: unknown): rate is string {
  if (typeof rate !== "string") return false;
  try {
    parseRate(rate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert minor units between currencies, rounding half away from zero.
 * Accounts for different minor-unit sizes (USD cents -> JPY yen).
 */
export function convertMinor(amount: number, from: string, to: string, rate: string): number {
  assertMinor(amount);
  if (from === to) return amount;
  const { num, den } = parseRate(rate);
  const expFrom = BigInt(currencyExponent(from));
  const expTo = BigInt(currencyExponent(to));

  const negative = amount < 0;
  const N = BigInt(Math.abs(amount)) * num * 10n ** expTo;
  const D = den * 10n ** expFrom;
  let q = N / D;
  if ((N % D) * 2n >= D) q += 1n;

  const result = Number(q);
  assertMinor(result, "converted amount");
  return negative ? (result === 0 ? 0 : -result) : result;
}

/**
 * Convert a set of amounts that belong together (an expense's shares) so the
 * converted parts still add up to the converted total. Converting each part
 * separately would let rounding drift by a cent or two.
 */
export function convertAllocation(
  amounts: readonly number[],
  from: string,
  to: string,
  rate: string,
): number[] {
  if (from === to) return [...amounts];
  const total = amounts.reduce((a, b) => a + b, 0);
  const convertedTotal = convertMinor(total, from, to, rate);
  if (total === 0) return amounts.map(() => 0);
  if (amounts.some((a) => a < 0)) {
    throw new MoneyError("INVALID_AMOUNT", "Cannot convert an allocation with negative parts");
  }
  return allocate(convertedTotal, amounts);
}
