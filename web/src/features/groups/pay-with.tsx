"use client";

import { buildPayAction, type MemberDto } from "@settlemint/shared";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/ui/cn";

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
  if (payee.paymentHandles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-fg-muted">Pay {payee.displayName} with</p>
      <div className="grid grid-cols-2 gap-2">
        {payee.paymentHandles.map((h) => {
          const action = buildPayAction(h, { amount, currency, note, payeeName: payee.displayName });
          const base =
            "flex min-h-12 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-start transition-[transform,background-color] duration-150 ease-out hover:bg-surface-3 active:scale-[0.98]";
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {action.url ? (action.amountIncluded ? "amount filled in" : h.value) : h.value}
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
                aria-label={`Pay with ${action.label}${action.amountIncluded ? ", amount filled in" : ""}`}
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
              aria-label={`Copy ${action.label} details`}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(action.copy ?? h.value);
                  setCopied(h.id);
                  setTimeout(() => setCopied(null), 2000);
                  onUsed?.();
                } catch {
                  toast.error("Couldn't copy. Select the details and copy them manually.");
                }
              }}
            >
              {body}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] text-fg-subtle">After paying, come back and record it below.</p>
    </div>
  );
}
