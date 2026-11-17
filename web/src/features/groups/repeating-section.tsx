"use client";

import { getCategoryMeta, type GroupDetailDto } from "@settlemint/shared";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";
import { dayLabel } from "@settlemint/client/text/dates";
import { useRecurring, useStopRecurring } from "@settlemint/client/data/queries";
import { Money } from "@/ui/money";
import { List, SectionHeader } from "@/ui/surface";


/** Bills that add themselves: rent, subscriptions, anything that repeats. */
export function RepeatingSection({ group }: { group: GroupDetailDto }) {
  const locale = useLocale();
  const rules = useRecurring(group.id);
  const stop = useStopRecurring(group.id);
  const visible = (rules.data ?? []).filter((r) => r.active || r.pausedReason);
  const t = useTranslations("repeating");
  if (visible.length === 0) return null;

  return (
    <section>
      <SectionHeader title={t("title")} />
      <List>
        {visible.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-xl" aria-hidden>
              {getCategoryMeta(r.category).emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{r.description}</span>
              <span className="flex items-center gap-1 truncate text-[13px] text-fg-muted">
                <Repeat className="size-3.5 shrink-0" aria-hidden />
                {r.active ? (
                  <>
                    {t("cadence", { frequency: r.frequency, count: r.interval })} · {t("next", { date: dayLabel(r.nextDate, locale) })}
                  </>
                ) : (
                  <span className="text-warning">{t("paused", { reason: r.pausedReason ?? "" })}</span>
                )}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <Money minor={r.amount} currency={r.currency} className="text-[15px] font-medium" />
              {r.active && (
                <button
                  type="button"
                  aria-label={t("stopLabel", { item: r.description })}
                  className="rounded-md px-1 text-[13px] font-medium text-fg-muted hover:text-negative"
                  onClick={() =>
                    stop.mutate(r.id, { onSuccess: () => toast.success(t("stopped", { item: r.description }), { description: t("pastStay") }) })
                  }
                >
                  {t("stop")}
                </button>
              )}
            </span>
          </div>
        ))}
      </List>
    </section>
  );
}
