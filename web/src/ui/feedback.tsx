"use client";

import { CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { springSoft } from "./motion";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <LoaderCircle className={cn("size-5 animate-spin text-fg-subtle", className)} aria-hidden />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-[var(--radius-sm)] bg-[linear-gradient(90deg,var(--surface-2)_0%,var(--surface-3)_50%,var(--surface-2)_100%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}

/** A list-row-shaped placeholder, so loading looks like the content it becomes. */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * What a screen says before there's anything in it. No icon tile stacked
 * above the heading: the icon sits beside the title, and an optional
 * `preview` shows a faint example of what will appear, which explains the
 * screen better than an illustration would.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  preview,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  preview?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn("px-5 py-8 sm:px-6", className)}
    >
      {preview && (
        <div aria-hidden className="pointer-events-none mb-6 select-none opacity-60 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]">
          {preview}
        </div>
      )}
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-fg">
        {icon && <span className="text-positive [&_svg]:size-5">{icon}</span>}
        {title}
      </h3>
      {body && <p className="mt-1.5 max-w-sm text-[15px] text-fg-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/** A faint example row for empty-state previews. */
export function PreviewRow({ emoji, title, subtitle, amount, tone }: { emoji: string; title: string; subtitle: string; amount: string; tone?: "positive" | "negative" }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line-strong px-3 py-2.5">
      <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-lg">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-fg-muted">{subtitle}</span>
      </span>
      <span className={cn("tabular text-sm font-semibold", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>
        {amount}
      </span>
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  body,
  offline,
  onRetry,
  className,
}: {
  title?: ReactNode;
  body?: ReactNode;
  offline?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div
        className={cn(
          "mb-4 flex size-14 items-center justify-center rounded-full [&_svg]:size-6",
          offline ? "bg-info-soft text-info" : "bg-warning-soft text-warning",
        )}
      >
        {offline ? <CloudOff aria-hidden /> : <TriangleAlert aria-hidden />}
      </div>
      <h3 className="font-display text-base font-semibold text-fg">
        {offline ? "You're offline" : title}
      </h3>
      {(body || offline) && (
        <p className="mt-1 max-w-xs text-sm text-fg-muted">
          {offline ? "Showing what's saved on this device. Changes sync when you're back online." : body}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
