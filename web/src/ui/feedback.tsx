"use client";

import { CloudOff, LoaderCircle, TriangleAlert } from "@/ui/icons";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { CategoryTile, GroupMark } from "./glyph-tile";
import { springSoft } from "./motion";
import { useTranslations } from "use-intl";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("ui");
  return (
    <span role="status" aria-label={label ?? t("loading")} className="inline-flex">
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
        <div
          aria-hidden
          className="inset-list pointer-events-none mb-7 select-none overflow-hidden rounded-[var(--radius-md)] bg-surface-2/60 [--inset:4.25rem] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
        >
          {preview}
        </div>
      )}
      <h2 className="flex items-center gap-2 font-wide text-[22px] font-[640] leading-tight tracking-[-0.015em] text-fg">
        {icon && <span className="text-positive [&_svg]:size-[22px]">{icon}</span>}
        {title}
      </h2>
      {body && <p className="mt-2 max-w-sm text-[16px] leading-snug text-fg-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/** A faint example row for empty-state previews. */
export function PreviewRow({
  glyph,
  title,
  subtitle,
  amount,
  tone,
}: {
  /** A group type (trip, home…) or category id (food, transport…). */
  glyph: { group: string } | { category: string };
  title: string;
  subtitle: string;
  amount: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {"group" in glyph ? <GroupMark id={glyph.group} type={glyph.group} /> : <CategoryTile category={glyph.category} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-[540]">{title}</span>
        <span className="block truncate text-[14px] text-fg-muted">{subtitle}</span>
      </span>
      <span className={cn("tabular font-wide text-[16px] font-[620]", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>
        {amount}
      </span>
    </div>
  );
}

export function ErrorState({
  title,
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
  const t = useTranslations("ui");
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
      <h3 className="font-wide text-[17px] font-[620] text-fg">
        {offline ? t("offlineTitle") : (title ?? t("loadFailed"))}
      </h3>
      {(body || offline) && (
        <p className="mt-1 max-w-xs text-sm text-fg-muted">
          {offline ? t("offlineBody") : body}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
