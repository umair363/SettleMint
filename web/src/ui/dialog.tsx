"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";
import { useTranslations } from "use-intl";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

/** For the few actions that deserve a pause. Most deletes use undo instead. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("ui");
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]" />
        <AlertDialog.Content className="fixed start-1/2 top-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] border border-line bg-bg-elevated -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] p-6 shadow-float rtl:translate-x-1/2">
          <AlertDialog.Title className="font-display text-lg font-semibold text-fg">{title}</AlertDialog.Title>
          {body ? (
            <AlertDialog.Description className="mt-2 text-[15px] text-fg-muted">{body}</AlertDialog.Description>
          ) : (
            <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">{cancelLabel ?? t("cancel")}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? "danger" : "primary"}
              loading={loading}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
