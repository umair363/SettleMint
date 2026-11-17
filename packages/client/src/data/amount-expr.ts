import { currencyExponent, MAX_AMOUNT_MINOR } from "@settlemint/shared";

// The amount keypad's arithmetic: "12.5+3" in exact minor units. Shared by the web and phone keypads.

/**
 * The amount is kept as a small expression string using "." as decimal
 * separator internally ("12.5+8"), so people can add up a bill on the spot.
 * The display uses the viewer's own decimal separator.
 */
export function evaluateAmount(expr: string, currency: string): number | null {
  const exp = currencyExponent(currency);
  if (!expr) return 0;
  const tokens = expr.match(/[+-]?[^+-]+/g);
  if (!tokens) return null;
  let total = 0;
  for (const raw of tokens) {
    const sign = raw.startsWith("-") ? -1 : 1;
    const num = raw.replace(/^[+-]/, "");
    const m = /^(\d*)(?:\.(\d*))?$/.exec(num);
    if (!m || (m[1] === "" && (m[2] ?? "") === "")) return null;
    const frac = (m[2] ?? "").padEnd(exp, "0").slice(0, exp);
    total += sign * Number((m[1] || "0") + frac);
  }
  return total;
}

export function pressKey(expr: string, key: string, currency: string): string {
  const exp = currencyExponent(currency);
  const current = expr.split(/[+-]/).pop() ?? "";
  if (key === "back") return expr.slice(0, -1);
  if (key === "clear") return "";
  if (key === "+" || key === "-") {
    if (expr === "" || /[+-.]$/.test(expr)) return expr;
    return expr + key;
  }
  if (key === ".") {
    if (exp === 0 || current.includes(".")) return expr;
    return expr + (current === "" ? "0." : ".");
  }
  if (/^\d$/.test(key)) {
    const [, frac] = current.split(".");
    if (frac !== undefined && frac.length >= exp) return expr; // no more decimals than the currency has
    if (current === "0") return expr.slice(0, -1) + key; // no leading zeros
    const next = expr + key;
    const value = evaluateAmount(next, currency);
    if (value === null || Math.abs(value) > MAX_AMOUNT_MINOR) return expr;
    return next;
  }
  return expr;
}

/** Turn minor units back into an editable expression ("19.99"). */
export function amountToExpr(minor: number, currency: string): string {
  if (!minor) return "";
  const exp = currencyExponent(currency);
  const s = String(Math.abs(minor)).padStart(exp + 1, "0");
  const whole = exp ? s.slice(0, -exp) : s;
  const frac = exp ? s.slice(-exp).replace(/0+$/, "") : "";
  return (minor < 0 ? "-" : "") + whole + (frac ? `.${frac}` : "");
}
