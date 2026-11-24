"use client";

import { buildPayAction, formatMoney, type MemberDto } from "@settlemint/shared";
import { Check, Copy, ExternalLink, ScanLine } from "@/ui/icons";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { toast } from "sonner";
import { cn } from "@/ui/cn";
import { usePaymentKindText } from "@/features/account/payment-kind";
import { QrSheet } from "@/features/payments/qr-sheet";

/**
 * One-tap ways to actually pay someone: their payment app opens with the
 * amount filled in where it supports the currency, or their details are
 * copied. SettleMint never touches the money.
 */
export function PayWith({
  payee,
  amount,
  currency,
  note,
  onUsed,
}: {
  payee: MemberDto;
  amount: number;
  currency: string;
  note?: string;
  /** Called after a method is used, so the payment can be recorded as "app". */
  onUsed?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations("payWith");
  const kindText = usePaymentKindText();
  if (payee.paymentHandles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-fg-muted">{t("title", { name: payee.displayName })}</p>
      <div className="grid grid-cols-2 gap-2">
        {payee.paymentHandles.map((h) => {
          const built = buildPayAction(h, { amount, currency, note, payeeName: payee.displayName });
          if (built.qr !== undefined) {
            return (
              <div key={h.id} className="contents">
                <button
                  type="button"
                  onClick={() => setQrOpen(h.id)}
                  className="flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-start transition-[transform,background-color] duration-150 ease-out hover:bg-surface-3 active:scale-[0.98]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{built.label}</span>
                    <span className="block truncate text-xs text-fg-muted">{t("showQr")}</span>
                  </span>
                  <ScanLine className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </button>
                <QrSheet
                  open={qrOpen === h.id}
                  onOpenChange={(o) => setQrOpen(o ? h.id : null)}
                  value={built.qr}
                  label={built.label}
                  payeeName={payee.displayName}
                  amountText={formatMoney(amount, currency, { locale })}
                  onUsed={onUsed}
                />
              </div>
            );
          }
          const action = { ...built, label: kindText.label(h.kind) };
          const base =
            "flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-start transition-[transform,background-color] duration-150 ease-out hover:bg-surface-3 active:scale-[0.98]";
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {action.url ? (action.amountIncluded ? t("amountFilled") : h.value) : h.value}
                </span>
              </span>
              {action.url ? (
                <ExternalLink className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              ) : copied === h.id ? (
                <Check className="size-4 shrink-0 text-positive" aria-hidden />
              ) : (
                <Copy className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              )}
            </>
          );
          if (action.url) {
            return (
              <a
                key={h.id}
                href={action.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onUsed?.()}
                className={base}
                aria-label={t("payWithLabel", { method: action.label, filled: action.amountIncluded ? "yes" : "no" })}
              >
                {body}
              </a>
            );
          }
          return (
            <button
              key={h.id}
              type="button"
              className={cn(base)}
              aria-label={t("copyLabel", { method: action.label })}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(action.copy ?? h.value);
                  setCopied(h.id);
                  setTimeout(() => setCopied(null), 2000);
                  onUsed?.();
                } catch {
                  toast.error(t("copyFailed"));
                }
              }}
            >
              {body}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-fg-subtle">{t("after")}</p>
    </div>
  );
}
