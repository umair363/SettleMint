"use client";

import {
  ApiError,
  normalizePaymentHandle,
  PAYMENT_KIND_VALUES,
  type PaymentKind,
} from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ScanLine, Trash2 } from "@/ui/icons";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button, IconButton } from "@/ui/button";
import { Skeleton } from "@/ui/feedback";
import { PayQr } from "@/ui/pay-qr";
import { Card } from "@/ui/surface";
import { readQrFromFile } from "@/features/payments/qr-read";
import { useTranslations } from "use-intl";
import { usePaymentKindText } from "./payment-kind";

interface Row {
  key: string;
  kind: PaymentKind;
  value: string;
  /** A name for the method; only QR codes are named in the app. */
  label: string;
}

const MAX_QR = 3;

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** "How people pay you": the methods shown to your groups when they settle up. */
export function PaymentHandlesCard({ bare = false }: { bare?: boolean } = {}) {
  const qc = useQueryClient();
  const saved = useQuery({ queryKey: ["payment-handles"], queryFn: api.me.paymentHandles });
  const [draft, setDraft] = useState<Row[] | null>(null);
  const rows: Row[] = draft ?? (saved.data ?? []).map((h) => ({ key: h.id, kind: h.kind, value: h.value, label: h.label ?? "" }));
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = draft !== null;
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const kindText = usePaymentKindText();
  const Wrap = bare ? "div" : Card;

  const save = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () =>
      api.me.setPaymentHandles(
        rows.filter((r) => r.value.trim()).map((r) => ({ kind: r.kind, value: r.value, label: r.label.trim() || null })),
      ),
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
  const qrCount = rows.filter((r) => r.kind === "qr").length;

  const addQr = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    try {
      const text = await readQrFromFile(file);
      if (!text) return void toast.error(t("qrUnreadable"));
      if (rows.some((r) => r.kind === "qr" && r.value === text)) return;
      setDraft([...rows, { key: newKey(), kind: "qr", value: text, label: "" }]);
    } catch {
      toast.error(t("qrUnreadable"));
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Wrap className="space-y-4 p-5">
      {!bare && (
        <div>
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm text-fg-muted">{t("body")}</p>
        </div>
      )}

      {saved.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <ul className="space-y-2">
          {rows.map((r) =>
            r.kind === "qr" ? (
              <li key={r.key} className="flex items-center gap-3">
                <PayQr value={r.value} label={t("qrPreview")} size={64} className="shrink-0 shadow-[0_0_0_1px_var(--line)]" />
                <input
                  aria-label={t("qrLabel")}
                  value={r.label}
                  maxLength={40}
                  placeholder={t("qrLabelPlaceholder")}
                  onChange={(e) => update(r.key, { label: e.target.value })}
                  className="h-12 min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 text-[15px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
                <IconButton label={t("remove")} onClick={() => setDraft(rows.filter((x) => x.key !== r.key))}>
                  <Trash2 className="size-4" />
                </IconButton>
              </li>
            ) : (
            <li key={r.key} className="flex gap-2">
              <select
                aria-label={t("method")}
                value={r.kind}
                onChange={(e) => update(r.key, { kind: e.target.value as PaymentKind })}
                className="h-12 w-32 shrink-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 text-sm font-medium text-fg focus:border-accent focus:outline-none"
              >
                {PAYMENT_KIND_VALUES.filter((k) => k !== "qr").map((k) => (
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
            ),
          )}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          leading={<Plus className="size-4" />}
          disabled={rows.length >= 10}
          onClick={() => setDraft([...rows, { key: newKey(), kind: "paypal", value: "", label: "" }])}
        >
          {t("add")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leading={<ScanLine className="size-4" />}
          loading={reading}
          disabled={rows.length >= 10 || qrCount >= MAX_QR}
          onClick={() => fileInput.current?.click()}
        >
          {t("addQr")}
        </Button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void addQr(e.target.files?.[0])} />
        {dirty && (
          <Button size="sm" loading={save.isPending} disabled={anyInvalid} onClick={() => save.mutate()}>
            {tc("save")}
          </Button>
        )}
      </div>
      <p className="text-[13px] text-fg-subtle">{qrCount >= MAX_QR ? t("qrTooMany") : t("qrHint")}</p>
    </Wrap>
  );
}
