"use client";

import {
  ApiError,
  normalizePaymentHandle,
  PAYMENT_KIND_VALUES,
  PAYMENT_KINDS,
  type PaymentKind,
} from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button, IconButton } from "@/ui/button";
import { Skeleton } from "@/ui/feedback";
import { Card } from "@/ui/surface";

interface Row {
  key: string;
  kind: PaymentKind;
  value: string;
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** "How people pay you": the methods shown to your groups when they settle up. */
export function PaymentHandlesCard() {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["payment-handles"], queryFn: api.me.paymentHandles });
  const [draft, setDraft] = useState<Row[] | null>(null);
  const rows: Row[] = draft ?? (saved.data ?? []).map((h) => ({ key: h.id, kind: h.kind, value: h.value }));
  const dirty = draft !== null;

  const save = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () =>
      api.me.setPaymentHandles(rows.filter((r) => r.value.trim()).map((r) => ({ kind: r.kind, value: r.value }))),
    onSuccess: (handles) => {
      qc.setQueryData(["payment-handles"], handles);
      void qc.invalidateQueries({ queryKey: ["group"] });
      setDraft(null);
      toast.success("Payment methods saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Couldn't save"),
  });

  const update = (key: string, patch: Partial<Row>) =>
    setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const invalid = (r: Row) => r.value.trim() !== "" && normalizePaymentHandle(r.kind, r.value) === null;
  const anyInvalid = rows.some(invalid);

  return (
    <Card className="space-y-4 p-5">
      <div>
        <p className="font-semibold">How people pay you</p>
        <p className="text-sm text-fg-muted">
          Shown only to people in your groups. When they settle up, SettleMint opens your app with the amount filled in.
        </p>
      </div>

      {saved.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex gap-2">
              <select
                aria-label="Payment method"
                value={r.kind}
                onChange={(e) => update(r.key, { kind: e.target.value as PaymentKind })}
                className="h-12 w-32 shrink-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              >
                {PAYMENT_KIND_VALUES.map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_KINDS[k].label}
                  </option>
                ))}
              </select>
              <div className="min-w-0 flex-1">
                <input
                  aria-label={`${PAYMENT_KINDS[r.kind].label} details`}
                  aria-invalid={invalid(r) || undefined}
                  value={r.value}
                  placeholder={PAYMENT_KINDS[r.kind].placeholder}
                  onChange={(e) => update(r.key, { value: e.target.value })}
                  className="h-12 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 text-[15px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none aria-[invalid=true]:border-negative"
                />
                {invalid(r) && <p className="mt-1 text-[13px] text-negative">That doesn&apos;t look like a valid {PAYMENT_KINDS[r.kind].label}.</p>}
              </div>
              <IconButton label="Remove" onClick={() => setDraft(rows.filter((x) => x.key !== r.key))} className="mt-0.5">
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          leading={<Plus className="size-4" />}
          disabled={rows.length >= 10}
          onClick={() => setDraft([...rows, { key: newKey(), kind: "paypal", value: "" }])}
        >
          Add a method
        </Button>
        {dirty && (
          <Button size="sm" loading={save.isPending} disabled={anyInvalid} onClick={() => save.mutate()}>
            Save
          </Button>
        )}
      </div>
    </Card>
  );
}
