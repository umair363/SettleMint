"use client";

import { currencyExponent, formatMoney, MAX_AMOUNT_MINOR } from "@settlemint/shared";
import { Delete } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";
import { cn } from "./cn";
import { haptic, springSnappy } from "./motion";

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

function useDecimalSeparator(locale: string) {
  return useMemo(
    () => new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".",
    [locale],
  );
}

export function AmountDisplay({
  expr,
  currency,
  onCurrencyClick,
  className,
}: {
  expr: string;
  currency: string;
  onCurrencyClick?: () => void;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("ui");
  const dec = useDecimalSeparator(locale);
  const value = evaluateAmount(expr, currency);
  const hasMath = /[+-]/.test(expr.slice(1));
  const symbol = useMemo(() => {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  }, [locale, currency]);

  const shown = expr === "" ? "0" : expr.replace(/\./g, dec).replace(/([+-])/g, " $1 ");
  const size = shown.length > 14 ? "text-3xl" : shown.length > 9 ? "text-4xl" : "text-6xl";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-baseline gap-2" aria-live="polite">
        <button
          type="button"
          onClick={onCurrencyClick}
          disabled={!onCurrencyClick}
          className="rounded-full bg-surface-2 px-2.5 py-1 text-sm font-semibold text-fg-muted transition-colors enabled:hover:bg-surface-3 enabled:hover:text-fg"
          aria-label={t("currencyLabel", { currency })}
        >
          {symbol !== currency ? `${symbol} ${currency}` : currency}
        </button>
        <span
          className={cn(
            "tabular font-display font-semibold tracking-tight transition-[font-size] duration-200",
            size,
            expr === "" ? "text-fg-subtle" : "text-fg",
          )}
        >
          {shown}
        </span>
      </div>
      <AnimatePresence>
        {hasMath && value !== null && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="tabular mt-1 text-sm text-fg-muted"
          >
            = {formatMoney(value, currency, { locale })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Layout with quick maths: a fourth column of +, − and a tall clear key. */
const MATH_LAYOUT = ["1", "2", "3", "+", "4", "5", "6", "-", "7", "8", "9", "clear", ".", "0", "back"] as const;
const PLAIN_LAYOUT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

export function AmountPad({
  expr,
  onChange,
  currency,
  withMath = true,
  className,
  captureKeyboard = true,
}: {
  expr: string;
  onChange: (expr: string) => void;
  currency: string;
  withMath?: boolean;
  className?: string;
  /** Also accept a physical keyboard while mounted (desktop). */
  captureKeyboard?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("ui");
  const dec = useDecimalSeparator(locale);
  const exp = currencyExponent(currency);

  const press = useCallback(
    (key: string) => {
      const next = pressKey(expr, key, currency);
      if (next !== expr) haptic(5);
      onChange(next);
    },
    [expr, currency, onChange],
  );

  useEffect(() => {
    if (!captureKeyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      let key: string | null = null;
      if (/^\d$/.test(e.key)) key = e.key;
      else if (e.key === "." || e.key === ",") key = ".";
      else if (e.key === "Backspace") key = "back";
      else if (e.key === "Escape" && expr) key = "clear";
      else if (withMath && (e.key === "+" || e.key === "-")) key = e.key;
      if (key) {
        e.preventDefault();
        press(key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureKeyboard, press, withMath, expr]);

  const layout = withMath ? MATH_LAYOUT : PLAIN_LAYOUT;
  return (
    <div className={cn("grid select-none auto-rows-[3.5rem] gap-2", withMath ? "grid-cols-4" : "grid-cols-3", className)}>
      {layout.map((k) => {
        const isOp = k === "+" || k === "-";
        const label =
          k === "back"
            ? t("keyDelete")
            : k === "clear"
              ? t("keyClear")
              : k === "."
                ? t("keyDecimal", { separator: dec })
                : k === "+"
                  ? t("keyAdd")
                  : k === "-"
                    ? t("keySubtract")
                    : k;
        return (
          <motion.button
            key={k}
            type="button"
            disabled={k === "." && exp === 0}
            aria-label={label}
            onClick={() => press(k)}
            onContextMenu={(e) => {
              if (k === "back") {
                e.preventDefault();
                onChange("");
              }
            }}
            whileTap={{ scale: 0.92 }}
            transition={springSnappy}
            className={cn(
              "tabular flex items-center justify-center rounded-[var(--radius-md)] font-display text-2xl font-medium transition-colors disabled:opacity-0",
              isOp
                ? "bg-accent-soft text-positive"
                : k === "clear"
                  ? "row-span-2 border border-line bg-surface-2 text-base font-semibold text-fg-muted"
                  : "bg-surface-2 text-fg active:bg-surface-3",
            )}
          >
            {k === "back" ? (
              <Delete className="size-6" aria-hidden />
            ) : k === "." ? (
              dec
            ) : k === "-" ? (
              "−"
            ) : k === "clear" ? (
              "C"
            ) : (
              k
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
