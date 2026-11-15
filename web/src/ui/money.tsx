"use client";

import { formatMoney } from "@settlemint/shared";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useLocale } from "use-intl";
import { cn } from "./cn";

export type MoneyTone = "auto" | "positive" | "negative" | "muted" | "plain";

export interface MoneyProps {
  /** Integer minor units. */
  minor: number;
  currency: string;
  /** "auto": mint when > 0, coral when < 0, muted at 0. */
  tone?: MoneyTone;
  /** Show "+" for positive amounts (balances). */
  signed?: boolean;
  /** Show the absolute value (when the sign is said in words: "you owe"). */
  absolute?: boolean;
  compact?: boolean;
  /** Count smoothly to new values. */
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
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(minor);

  const value = absolute ? Math.abs(minor) : minor;
  const fmt = (n: number) =>
    formatMoney(Math.round(n), currency, {
      locale,
      compact,
      signDisplay: signed ? "exceptZero" : "auto",
    });

  useEffect(() => {
    if (!animated || reduced || !ref.current) {
      shown.current = value;
      return;
    }
    const from = shown.current;
    shown.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = fmt(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fmt is derived from the listed values
  }, [value, animated, reduced, currency, locale, compact, signed]);

  const resolvedTone =
    tone === "auto" ? (minor > 0 ? "positive" : minor < 0 ? "negative" : "muted") : tone;

  return (
    <span ref={ref} className={cn("tabular whitespace-nowrap", toneClass[resolvedTone], className)}>
      {fmt(value)}
    </span>
  );
}
