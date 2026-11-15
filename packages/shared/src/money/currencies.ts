import { MoneyError } from "./errors";

/**
 * Active ISO 4217 currencies that people actually spend, and how many minor
 * units each has. Amounts are always stored as integers in minor units
 * (cents for USD, yen for JPY, fils for KWD).
 *
 * The exponent is fixed here rather than read from Intl, because Intl's
 * display digits vary by locale and ICU version, and stored data must not.
 * Fund codes and precious metals are left out on purpose.
 */
const EXPONENT_0 = [
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
] as const;

const EXPONENT_3 = ["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"] as const;

const EXPONENT_2 = [
  "AED", "AFN", "ALL", "AMD", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM",
  "BBD", "BDT", "BGN", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP",
  "BYN", "BZD", "CAD", "CDF", "CHF", "CNY", "COP", "CRC", "CUP", "CVE",
  "CZK", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP",
  "GBP", "GEL", "GHS", "GIP", "GMD", "GTQ", "GYD", "HKD", "HNL", "HTG",
  "HUF", "IDR", "ILS", "INR", "IRR", "JMD", "KES", "KGS", "KHR", "KPW",
  "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "MAD", "MDL", "MGA",
  "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR",
  "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "PAB", "PEN", "PGK",
  "PHP", "PKR", "PLN", "QAR", "RON", "RSD", "RUB", "SAR", "SBD", "SCR",
  "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SVC",
  "SYP", "SZL", "THB", "TJS", "TMT", "TOP", "TRY", "TTD", "TWD", "TZS",
  "UAH", "USD", "UYU", "UZS", "VED", "VES", "WST", "XCD", "XCG", "YER",
  "ZAR", "ZMW", "ZWG",
] as const;

const EXPONENTS: ReadonlyMap<string, number> = new Map<string, number>([
  ...EXPONENT_0.map((c) => [c, 0] as const),
  ...EXPONENT_2.map((c) => [c, 2] as const),
  ...EXPONENT_3.map((c) => [c, 3] as const),
]);

/** Every supported currency code, sorted alphabetically. */
export const CURRENCY_CODES: readonly string[] = [...EXPONENTS.keys()].sort();

export function isCurrencyCode(code: unknown): code is string {
  return typeof code === "string" && EXPONENTS.has(code);
}

/** Number of minor-unit digits for a currency (2 for USD, 0 for JPY, 3 for KWD). */
export function currencyExponent(code: string): number {
  const exp = EXPONENTS.get(code);
  if (exp === undefined) {
    throw new MoneyError("UNKNOWN_CURRENCY", `Unknown currency: ${code}`);
  }
  return exp;
}

/** 10^exponent as a regular number, for display maths only. */
export function minorPerMajor(code: string): number {
  return 10 ** currencyExponent(code);
}
