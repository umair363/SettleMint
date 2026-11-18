"use client";

import { X } from "@/ui/icons";
import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { IconButton } from "./button";
import { cn } from "./cn";
import { useTranslations } from "use-intl";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Read by screen readers; shown under the title when `showDescription`. */
  description?: ReactNode;
  showDescription?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /** Let the sheet grow to nearly full height (forms, pickers). */
  tall?: boolean;
  className?: string;
}

/**
 * Bottom sheet with real drag-to-dismiss physics on phones; on wide screens
 * the same component floats as a centred panel. Glass only on the sheet
 * itself (floating chrome), never on the content inside.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  showDescription,
  children,
  footer,
  tall,
  className,
}: SheetProps) {
  const t = useTranslations("ui");
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
        <Drawer.Content
          className={cn(
            // Sheets hold forms, so they stay nearly opaque: just enough blur to
            // feel layered without the page's colours bleeding through.
            "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[var(--radius-xl)] border border-b-0 border-glass-line shadow-float outline-none",
            "bg-[color-mix(in_oklab,var(--bg-elevated)_95%,transparent)] backdrop-blur-2xl",
            "max-h-[92dvh]",
            tall && "h-[92dvh]",
            // vaul extends bottom sheets below the screen (for overscroll); not when floating.
            "sm:after:hidden!",
            "sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)] sm:border-b rtl:sm:translate-x-1/2",
            tall && "sm:h-[min(44rem,88dvh)]",
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <div className="flex items-start gap-3 px-5 pb-2 pt-3 sm:pt-5">
            <div className="min-w-0 flex-1">
              <Drawer.Title className="font-display text-lg font-semibold text-fg">{title}</Drawer.Title>
              <Drawer.Description className={cn(showDescription ? "mt-0.5 text-sm text-fg-muted" : "sr-only")}>
                {description ?? title}
              </Drawer.Description>
            </div>
            <IconButton label={t("close")} size="sm" variant="solid" onClick={() => onOpenChange(false)} className="-me-1">
              <X className="size-4" />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer && <div className="safe-bottom border-t border-line px-5 pt-3">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
