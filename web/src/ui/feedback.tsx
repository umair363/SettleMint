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

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn("flex flex-col items-center px-6 py-12 text-center", className)}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-accent-soft text-positive [&_svg]:size-7">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-[15px] text-fg-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
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
