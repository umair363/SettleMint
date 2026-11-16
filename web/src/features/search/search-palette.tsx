"use client";

import { getCategoryMeta } from "@settlemint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "use-intl";
import { GroupIcon } from "@/features/groups/group-row";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { IconButton } from "@/ui/button";
import { Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";
import { Money } from "@/ui/money";
import { Sheet } from "@/ui/sheet";

const OPEN_EVENT = "settlemint:open-search";

/** Open the search palette from anywhere. */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function SearchButton() {
  const t = useTranslations("search");
  return (
    <IconButton label={t("button")} variant="solid" onClick={openSearch}>
      <Search className="size-5" />
    </IconButton>
  );
}

/** Search every expense and group you're in. ⌘K / Ctrl+K on desktop. */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("search");

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen} title={t("title")} tall>
      {open && <SearchBody onPick={() => setOpen(false)} />}
    </Sheet>
  );
}

function SearchBody({ onPick }: { onPick: () => void }) {
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const t = useTranslations("search");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(timer);
  }, [q]);

  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.search(debounced),
    enabled: debounced.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const data = debounced ? results.data : undefined;
  const empty = data && data.groups.length === 0 && data.expenses.length === 0;

  return (
    <div className="space-y-5 pb-4">
      <div className="sticky top-0 z-10 -mx-5 bg-[color-mix(in_oklab,var(--bg-elevated)_95%,transparent)] px-5 pb-1">
        <TextField
          autoFocus
          aria-label={t("label")}
          placeholder={t("placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leading={<Search className="size-4" />}
          trailing={results.isFetching ? <span className="me-2 inline-flex"><Spinner /></span> : undefined}
          enterKeyHint="search"
        />
      </div>

      {!debounced && <p className="px-1 text-sm text-fg-muted">{t("hint")}</p>}
      {empty && <p className="px-1 text-sm text-fg-muted">{t("noMatch", { query: debounced })}</p>}

      {data && data.groups.length > 0 && (
        <section>
          <h3 className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{t("groups")}</h3>
          <ul>
            {data.groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/group?id=${g.id}`}
                  onClick={onPick}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-surface-2"
                >
                  <GroupIcon type={g.type} emoji={g.emoji} />
                  <span className="font-medium">{g.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.expenses.length > 0 && (
        <section>
          <h3 className="px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{t("expenses")}</h3>
          <ul>
            {data.expenses.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/group?id=${e.groupId}`}
                  onClick={onPick}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-surface-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-xl" aria-hidden>
                    {getCategoryMeta(e.category).emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.description}</span>
                    <span className="block truncate text-[13px] text-fg-muted">
                      {e.groupName} · {dayLabel(e.date, locale)}
                    </span>
                  </span>
                  <Money minor={e.amount} currency={e.currency} className="text-[15px] font-medium" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
