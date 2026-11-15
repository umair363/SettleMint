"use client";

import { getCategoryMeta, type GroupDetailDto, type RecurringRuleDto } from "@settlemint/shared";
import { Repeat } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "use-intl";
import { dayLabel } from "@/lib/dates";
import { useRecurring, useStopRecurring } from "@/lib/queries";
import { Money } from "@/ui/money";
import { List, SectionHeader } from "@/ui/surface";

function cadence(r: RecurringRuleDto) {
  if (r.interval === 1) return { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[r.frequency];
  const unit = { weekly: "weeks", monthly: "months", yearly: "years" }[r.frequency];
  return `Every ${r.interval} ${unit}`;
}

/** Bills that add themselves: rent, subscriptions, anything that repeats. */
export function RepeatingSection({ group }: { group: GroupDetailDto }) {
  const locale = useLocale();
  const rules = useRecurring(group.id);
  const stop = useStopRecurring(group.id);
  const visible = (rules.data ?? []).filter((r) => r.active || r.pausedReason);
  if (visible.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Repeating" />
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
                    {cadence(r)} · next {dayLabel(r.nextDate, locale)}
                  </>
                ) : (
                  <span className="text-warning">Paused: {r.pausedReason}</span>
                )}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <Money minor={r.amount} currency={r.currency} className="text-[15px] font-medium" />
              {r.active && (
                <button
                  type="button"
                  aria-label={`Stop repeating ${r.description}`}
                  className="rounded-md px-1 text-[13px] font-medium text-fg-muted hover:text-negative"
                  onClick={() =>
                    stop.mutate(r.id, { onSuccess: () => toast.success(`Stopped “${r.description}”`, { description: "Past expenses stay." }) })
                  }
                >
                  Stop
                </button>
              )}
            </span>
          </div>
        ))}
      </List>
    </section>
  );
}
