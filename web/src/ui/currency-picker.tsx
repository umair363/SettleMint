"use client";

import { CURRENCY_CODES, currencyName, currencySymbol } from "@settlemint/shared";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "use-intl";
import { cn } from "./cn";
import { TextField } from "./field";
import { Sheet } from "./sheet";

const POPULAR = ["USD", "EUR", "GBP", "INR", "PKR", "AED", "SAR", "CAD", "AUD", "JPY", "SGD", "TRY"];

export function CurrencyPicker({
  open,
  onOpenChange,
  value,
  onChange,
  recent = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (code: string) => void;
  recent?: string[];
}) {
  const locale = useLocale();
  const [q, setQ] = useState("");

  const all = useMemo(
    () =>
      CURRENCY_CODES.map((code) => ({
        code,
        name: currencyName(code, locale),
        symbol: currencySymbol(code, locale),
      })),
    [locale],
  );

  const query = q.trim().toLowerCase();
  const filtered = query
    ? all.filter(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.symbol.toLowerCase() === query,
      )
    : null;
  const top = [...new Set([...recent, ...POPULAR])].map((code) => all.find((c) => c.code === code)!).filter(Boolean);

  const row = (c: (typeof all)[number]) => (
    <li key={c.code}>
      <button
        type="button"
        onClick={() => {
          onChange(c.code);
          onOpenChange(false);
          setQ("");
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-start hover:bg-surface-2",
          c.code === value && "bg-accent-soft",
        )}
      >
        <span className="tabular flex h-9 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-surface-2 text-sm font-semibold text-fg">
          {c.symbol.length <= 3 ? c.symbol : c.code.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-fg">{c.name}</span>
          <span className="block text-xs text-fg-subtle">{c.code}</span>
        </span>
        {c.code === value && <Check className="size-4 text-positive" aria-label="Selected" />}
      </button>
    </li>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Currency" tall>
      <div className="sticky top-0 z-10 -mx-5 bg-transparent px-5 pb-3">
        <TextField
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 150+ currencies"
          aria-label="Search currencies"
          leading={<Search className="size-4" />}
        />
      </div>
      {filtered ? (
        filtered.length ? (
          <ul>{filtered.map(row)}</ul>
        ) : (
          <p className="py-10 text-center text-sm text-fg-muted">No currency matches “{q}”.</p>
        )
      ) : (
        <>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Common</p>
          <ul>{top.map(row)}</ul>
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-fg-subtle">All currencies</p>
          <ul>{all.map(row)}</ul>
        </>
      )}
    </Sheet>
  );
}
