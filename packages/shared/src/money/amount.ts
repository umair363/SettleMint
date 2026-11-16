import { currencyExponent } from "./currencies";
import { MoneyError } from "./errors";

/**
 * Largest amount accepted anywhere, in minor units: 10^14 (one trillion
 * dollars). Keeps every intermediate sum far inside Number.MAX_SAFE_INTEGER.
 */
export const MAX_AMOUNT_MINOR = 100_000_000_000_000;

export function isValidMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    Math.abs(value) <= MAX_AMOUNT_MINOR
  );
}

export function assertMinor(value: unknown, label = "amount"): asserts value is number {
  if (!isValidMinor(value)) {
    throw new MoneyError("INVALID_AMOUNT", `${label} must be a whole number of minor units`);
  }
}

/**
 * Exact decimal string for a minor-unit amount: 1999 USD -> "19.99",
 * 1500 JPY -> "1500", -5 KWD -> "-0.005". No floating point involved.
 */
export function minorToDecimalString(minor: number, currency: string): string {
  assertMinor(minor);
  const exp = currencyExponent(currency);
  const sign = minor < 0 ? "-" : "";
  const digits = String(Math.abs(minor));
  if (exp === 0) return sign + digits;
  const padded = digits.padStart(exp + 1, "0");
  return `${sign}${padded.slice(0, -exp)}.${padded.slice(-exp)}`;
}

/**
 * Parse a plain decimal string ("19.99", "-0.5", "1500") into minor units.
 * Rejects more decimals than the currency allows instead of rounding them away.
 */
export function decimalStringToMinor(value: string, currency: string): number {
  const exp = currencyExponent(currency);
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) {
    throw new MoneyError("INVALID_AMOUNT", `Not a decimal amount: "${value}"`);
  }
  const [, neg, whole, frac = ""] = match;
  if (frac.length > exp) {
    throw new MoneyError(
      "INVALID_AMOUNT",
      `${currency} allows at most ${exp} decimal place${exp === 1 ? "" : "s"}`,
    );
  }
  const minor = Number(whole + frac.padEnd(exp, "0"));
  const result = neg ? -minor : minor;
  assertMinor(result);
  return result === 0 ? 0 : result; // normalise -0
}

/** Minor units to a major-unit number. For display and charts only, never for maths. */
export function minorToMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

/**
 * Digits and separators from other scripts as ASCII: Arabic-Indic (Egypt,
 * Saudi Arabia), Extended Arabic-Indic (Persian/Urdu keyboards), Devanagari,
 * and the Arabic decimal and thousands marks.
 */
export function toAsciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

function localeSeparators(locale?: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    group: toAsciiDigits(parts.find((p) => p.type === "group")?.value ?? ","),
    decimal: toAsciiDigits(parts.find((p) => p.type === "decimal")?.value ?? "."),
  };
}

/**
 * Parse what a person typed ("1,234.50", "12,5", "1.234", "1 234,56") into
 * minor units. Returns null when the text is not a usable amount.
 *
 * Rules, chosen so that both "12,50" and "12.50" work for everyone:
 * - With both "," and "." present, the last one is the decimal separator.
 * - With one kind present once and few enough digits after it to be a decimal
 *   part, it is the decimal separator, unless it is this locale's grouping
 *   separator followed by exactly three digits ("1,234" in English, "1.234"
 *   in German).
 * - A single separator that can be neither ("12.345" in English) is rejected
 *   rather than guessed, since a wrong guess is off by a factor of 1000.
 * - Grouping must form real digit groups: threes, or twos for Indian lakh
 *   style ("1,50,000").
 */
export function parseMoneyInput(input: string, currency: string, locale?: string): number | null {
  const exp = currencyExponent(currency);
  // Bidi marks come along when copying numbers out of right-to-left text.
  let text = toAsciiDigits(input.normalize("NFKC")).replace(/[\s\u00a0\u202f'\u2019_\u200e\u200f\u061c]/g, "");
  let negative = false;
  if (/^[-−]/.test(text)) {
    negative = true;
    text = text.slice(1);
  }
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  let decimalSep: string | null = null;

  if (lastDot !== -1 && lastComma !== -1) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? "." : ",";
    const occurrences = text.split(sep).length - 1;
    const after = text.length - text.lastIndexOf(sep) - 1;
    if (occurrences === 1) {
      const { group } = localeSeparators(locale);
      const isLocaleGrouping = sep === group && after === 3;
      if (after === 0) {
        decimalSep = sep; // "12." while typing
      } else if (after <= exp && !isLocaleGrouping) {
        decimalSep = sep;
      } else if (!isLocaleGrouping) {
        return null;
      }
    }
  }

  let whole = text;
  let frac = "";
  if (decimalSep) {
    const idx = text.lastIndexOf(decimalSep);
    whole = text.slice(0, idx);
    frac = text.slice(idx + 1);
    if (/[.,]/.test(frac)) return null;
  }
  if (/[.,]/.test(whole)) {
    const groups = whole.split(/[.,]/);
    const [first, ...rest] = groups;
    const validGroups =
      /^\d{1,3}$/.test(first) &&
      rest.every((g, i) => (i === rest.length - 1 ? /^\d{3}$/.test(g) : /^\d{2,3}$/.test(g)));
    if (!validGroups) return null;
    whole = groups.join("");
  }
  if (frac.length > exp) return null;
  if (whole === "") whole = "0";

  const minor = Number(whole + frac.padEnd(exp, "0"));
  const result = negative ? -minor : minor;
  if (!isValidMinor(result)) return null;
  return result === 0 ? 0 : result;
}

export interface FormatMoneyOptions {
  locale?: string;
  /** "always" shows +/- (useful for balances); default "auto". */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
  /** "1.2K" style for tight spaces like charts. */
  compact?: boolean;
  /** Hide the currency symbol, e.g. inside an amount field that shows it separately. */
  hideCurrency?: boolean;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, opts: FormatMoneyOptions): Intl.NumberFormat {
  const key = [currency, opts.locale ?? "", opts.signDisplay ?? "", opts.compact ? 1 : 0, opts.hideCurrency ? 1 : 0].join("|");
  let fmt = formatterCache.get(key);
  if (!fmt) {
    const exp = currencyExponent(currency);
    fmt = new Intl.NumberFormat(opts.locale, {
      ...(opts.hideCurrency
        ? { style: "decimal" as const }
        : { style: "currency" as const, currency, currencyDisplay: "narrowSymbol" as const }),
      signDisplay: opts.signDisplay ?? "auto",
      ...(opts.compact
        ? { notation: "compact" as const, maximumFractionDigits: 1 }
        : { minimumFractionDigits: exp, maximumFractionDigits: exp }),
    });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

/** Format minor units for display in the viewer's locale: 1999 USD -> "$19.99". */
export function formatMoney(minor: number, currency: string, opts: FormatMoneyOptions = {}): string {
  return getFormatter(currency, opts).format(minorToMajor(minor, currency));
}

/** The symbol a locale uses for a currency ("$", "€", "Rs", "¥"). */
export function currencySymbol(currency: string, locale?: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/** Localised currency name ("US Dollar", "Pakistani Rupee"). */
export function currencyName(currency: string, locale?: string): string {
  try {
    return new Intl.DisplayNames(locale ? [locale] : undefined, { type: "currency" }).of(currency) ?? currency;
  } catch {
    return currency;
  }
}
