"use client";

import { formatMoney } from "@settlemint/shared";
import { useMemo } from "react";
import { useLocale } from "use-intl";
import { cn } from "./cn";

export type MoneyTone = "auto" | "positive" | "negative" | "muted" | "plain";

export interface MoneyProps {
  /** Integer minor units. */
  minor: number;
  currency: string;
  /** "auto": teal when > 0, ember when < 0, muted at 0. */
  tone?: MoneyTone;
  /** Show "+" for positive amounts (balances). */
  signed?: boolean;
  /** Show the absolute value (when the sign is said in words: "you owe"). */
  absolute?: boolean;
  compact?: boolean;
  /** Roll the digits to new values (hero figures only; rows stay plain text). */
  animated?: boolean;
  className?: string;
}

const toneClass: Record<Exclude<MoneyTone, "auto">, string> = {
  positive: "text-positive",
  negative: "text-negative",
  muted: "text-fg-muted",
  plain: "",
};

/**
 * The only way the app shows money: locale-aware, tabular figures, with
 * colour that always has a sign or words alongside it (never colour alone).
 */
export function Money({
  minor,
  currency,
  tone = "plain",
  signed = false,
  absolute = false,
  compact = false,
  animated = false,
  className,
}: MoneyProps) {
  const locale = useLocale();
  const value = absolute ? Math.abs(minor) : minor;
  const text = formatMoney(value, currency, { locale, compact, signDisplay: signed ? "exceptZero" : "auto" });
  const resolvedTone = tone === "auto" ? (minor > 0 ? "positive" : minor < 0 ? "negative" : "muted") : tone;
  const cls = cn("tabular whitespace-nowrap", toneClass[resolvedTone], className);

  if (!animated) return <span className={cls}>{text}</span>;
  return (
    <span className={cn(cls, "relative inline-flex")}>
      <span className="sr-only">{text}</span>
      <RollingText text={text} locale={locale} />
    </span>
  );
}

/** The locale's own digit glyphs, 0–9 (Latin, Arabic-Indic, Devanagari…). */
function useDigits(locale: string) {
  return useMemo(() => {
    const nf = new Intl.NumberFormat(locale, { useGrouping: false });
    return Array.from({ length: 10 }, (_, d) => nf.format(d));
  }, [locale]);
}

/**
 * Each digit sits in its own fixed-width column holding a 0–9 strip that slides
 * to the new digit (transform only, interruptible, on the compositor). Columns
 * are keyed from the end so units stay units as the number grows or shrinks.
 * The first render doesn't roll; reduced motion makes the change instant.
 */
function RollingText({ text, locale }: { text: string; locale: string }) {
  const digits = useDigits(locale);
  const chars = Array.from(text);
  return (
    <span aria-hidden className="inline-flex leading-none">
      {chars.map((ch, i) => {
        const key = chars.length - i;
        const d = digits.indexOf(ch);
        if (d < 0) {
          return (
            <span key={`c${key}`} className="whitespace-pre">
              {ch}
            </span>
          );
        }
        return (
          <span key={`d${key}`} className="relative inline-block h-[1em] overflow-hidden">
            {/* Sizer: keeps the column exactly one digit wide. */}
            <span className="invisible">{digits[8]}</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col items-center transition-transform duration-[var(--dur-focal)] ease-[var(--ease-focal)]"
              style={{ transform: `translateY(${-d}em)` }}
            >
              {digits.map((g) => (
                <span key={g} className="block h-[1em]">
                  {g}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
