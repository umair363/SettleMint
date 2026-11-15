"use client";

import type { GroupSummaryDto } from "@settlemint/shared";
import { useLocale } from "use-intl";
import { timeAgo } from "@/lib/dates";
import { Money } from "@/ui/money";
import { ListRow } from "@/ui/surface";

export const GROUP_TYPE_STYLE: Record<string, { emoji: string; tint: string }> = {
  trip: { emoji: "✈️", tint: "bg-info-soft" },
  home: { emoji: "🏠", tint: "bg-warning-soft" },
  couple: { emoji: "💞", tint: "bg-negative-soft" },
  event: { emoji: "🎉", tint: "bg-accent-soft" },
  other: { emoji: "👥", tint: "bg-surface-3" },
  direct: { emoji: "🤝", tint: "bg-surface-3" },
};

export function GroupIcon({ type, emoji, size = "md" }: { type: string; emoji: string | null; size?: "md" | "lg" }) {
  const style = GROUP_TYPE_STYLE[type] ?? GROUP_TYPE_STYLE.other;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[var(--radius-md)] ${style.tint} ${
        size === "lg" ? "size-14 text-3xl" : "size-10 text-xl"
      }`}
      aria-hidden
    >
      {emoji ?? style.emoji}
    </span>
  );
}

export function BalanceLabel({ minor, currency }: { minor: number; currency: string }) {
  if (minor === 0) return <span className="text-sm text-fg-subtle">settled up</span>;
  return (
    <span className="text-sm leading-tight">
      <span className="block text-xs text-fg-muted">{minor > 0 ? "you are owed" : "you owe"}</span>
      <Money minor={minor} currency={currency} tone="auto" absolute className="font-semibold" />
    </span>
  );
}

export function GroupRow({ group }: { group: GroupSummaryDto }) {
  const locale = useLocale();
  return (
    <ListRow
      href={`/group?id=${group.id}`}
      chevron
      leading={<GroupIcon type={group.type} emoji={group.emoji} />}
      title={group.name}
      subtitle={`${group.memberCount} ${group.memberCount === 1 ? "person" : "people"} · ${timeAgo(group.lastActivityAt, locale)}`}
      trailing={<BalanceLabel minor={group.myBalance} currency={group.currency} />}
    />
  );
}
