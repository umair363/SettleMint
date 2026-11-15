"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Rows and states inside cards carry their own inset (grouped-list layout),
      // which the detector's wrapper heuristic reads as cramped.
      data-impeccable-ignore="cramped-padding"
      className={cn("rounded-[var(--radius-lg)] border border-line bg-surface shadow-soft", className)}
      {...props}
    />
  );
}

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
    <div className={cn("flex items-end justify-between gap-3 px-1 pb-2", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{title}</h2>
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

/** One tappable row. Renders a link, a button, or plain content. */
export function ListRow({ leading, title, subtitle, trailing, href, onClick, chevron, className }: ListRowProps) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-end">{trailing}</span>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />}
    </>
  );
  const rowClass = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-start",
    (href || onClick) && "transition-colors hover:bg-surface-2 active:bg-surface-3",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cn(rowClass, "transition-[transform,background-color] duration-150 ease-out active:scale-[0.985]")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(rowClass, "transition-[transform,background-color] duration-150 ease-out active:scale-[0.985]")}>
        {body}
      </button>
    );
  }
  return <div className={rowClass}>{body}</div>;
}

/** A card holding rows separated by hairlines. */
export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("divide-y divide-line overflow-hidden", className)}>{children}</Card>;
}

const badgeTones = {
  neutral: "bg-surface-3 text-fg-muted",
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
