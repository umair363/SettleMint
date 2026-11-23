"use client";

import {
  ApiError,
  normalizePaymentHandle,
  PAYMENT_KIND_VALUES,
  type PaymentKind,
} from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "@/ui/icons";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button, IconButton } from "@/ui/button";
import { Skeleton } from "@/ui/feedback";
import { Card } from "@/ui/surface";
import { useTranslations } from "use-intl";
import { usePaymentKindText } from "./payment-kind";

interface Row {
  key: string;
  kind: PaymentKind;
  value: string;
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** "How people pay you": the methods shown to your groups when they settle up. */
export function PaymentHandlesCard({ bare = false }: { bare?: boolean } = {}) {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["payment-handles"], queryFn: api.me.paymentHandles });
  const [draft, setDraft] = useState<Row[] | null>(null);
  const rows: Row[] = draft ?? (saved.data ?? []).map((h) => ({ key: h.id, kind: h.kind, value: h.value }));
  const dirty = draft !== null;
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const kindText = usePaymentKindText();
  const Wrap = bare ? "div" : Card;

  const save = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () =>
      api.me.setPaymentHandles(rows.filter((r) => r.value.trim()).map((r) => ({ kind: r.kind, value: r.value }))),
    onSuccess: (handles) => {
      qc.setQueryData(["payment-handles"], handles);
      void qc.invalidateQueries({ queryKey: ["group"] });
      setDraft(null);
      toast.success(t("saved"));
    },
    onError: (err) => toast.error(err instanceof ApiError && err.code === "VALIDATION_ERROR" ? t("invalidSave") : t("saveFailed")),
  });

  const update = (key: string, patch: Partial<Row>) =>
    setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const invalid = (r: Row) => r.value.trim() !== "" && normalizePaymentHandle(r.kind, r.value) === null;
  const anyInvalid = rows.some(invalid);

  return (
    <Wrap className="space-y-4 p-5">
      <div>
        <p className="font-semibold">{t("title")}</p>
        <p className="text-sm text-fg-muted">{t("body")}</p>
      </div>

      {saved.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex gap-2">
              <select
                aria-label={t("method")}
                value={r.kind}
                onChange={(e) => update(r.key, { kind: e.target.value as PaymentKind })}
                className="h-12 w-32 shrink-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              >
                {PAYMENT_KIND_VALUES.map((k) => (
                  <option key={k} value={k}>
                    {kindText.label(k)}
                  </option>
                ))}
              </select>
              <div className="min-w-0 flex-1">
                <input
                  aria-label={t("details", { method: kindText.label(r.kind) })}
                  aria-invalid={invalid(r) || undefined}
                  value={r.value}
                  placeholder={kindText.placeholder(r.kind)}
                  onChange={(e) => update(r.key, { value: e.target.value })}
                  className="h-12 w-full rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 text-[15px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none aria-[invalid=true]:border-negative"
                />
                {invalid(r) && <p className="mt-1 text-[13px] text-negative">{t("invalid", { method: kindText.label(r.kind) })}</p>}
              </div>
              <IconButton label={t("remove")} onClick={() => setDraft(rows.filter((x) => x.key !== r.key))} className="mt-0.5">
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
          {t("add")}
        </Button>
        {dirty && (
          <Button size="sm" loading={save.isPending} disabled={anyInvalid} onClick={() => save.mutate()}>
            {tc("save")}
          </Button>
        )}
      </div>
    </Wrap>
  );
}
