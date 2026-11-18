"use client";

import { ChevronRight } from "@/ui/icons";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * A grouped surface on the canvas. Content never floats: a hairline edge and
 * the faintest contact shadow in light, a lighter surface in dark. Never nest one.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Rows and states inside carry their own inset (grouped-list layout),
      // which the detector's wrapper heuristic reads as cramped.
      data-impeccable-ignore="cramped-padding"
      className={cn("rounded-[var(--radius-lg)] bg-surface shadow-[0_0_0_1px_var(--line),var(--shadow-soft)] dark:shadow-none", className)}
      {...props}
    />
  );
}

/** A section title in sentence case: the heading carries its own weight, no label above it. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 px-1 pb-3", className)}>
      <h2 className="font-wide text-[20px] font-[620] leading-tight tracking-[-0.012em] text-fg">{title}</h2>
      {action}
    </div>
  );
}

export interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}

/** One row of an inset list. Renders a link, a button, or plain content. */
export function ListRow({ leading, title, subtitle, trailing, href, onClick, chevron, className }: ListRowProps) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-[540] leading-snug text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[14px] leading-snug text-fg-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-end">{trailing}</span>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />}
    </>
  );
  const rowClass = cn("flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start", className);
  const interactive = "transition-colors duration-[var(--dur-feedback)] hover:bg-surface-2/70 active:bg-surface-2";
  if (href) {
    return (
      <Link href={href} className={cn(rowClass, interactive)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(rowClass, interactive)}>
        {body}
      </button>
    );
  }
  return <div className={rowClass}>{body}</div>;
}

/**
 * An inset grouped list: rows separated by hairlines that start where the text
 * starts (after a 40px leading tile), like the system's own lists.
 */
export function List({
  children,
  className,
  inset = "leading",
}: {
  children: ReactNode;
  className?: string;
  /** "leading": rows have a 40px icon or avatar; "text": rows start with text. */
  inset?: "leading" | "text";
}) {
  return (
    <Card className={cn("inset-list overflow-hidden", inset === "leading" ? "[--inset:4.25rem]" : "[--inset:1rem]", className)}>
      {children}
    </Card>
  );
}

const badgeTones = {
  neutral: "bg-surface-2 text-fg-muted",
  accent: "bg-accent-soft text-positive",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-[560]",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
