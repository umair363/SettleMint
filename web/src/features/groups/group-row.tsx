"use client";

import type { GroupSummaryDto } from "@settlemint/shared";
import { useLocale, useTranslations } from "use-intl";
import { timeAgo } from "@settlemint/client/text/dates";
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
  const t = useTranslations("groups");
  if (minor === 0) return <span className="text-sm text-fg-subtle">{t("settledUp")}</span>;
  return (
    <span className="text-sm leading-tight">
      <span className="block text-xs text-fg-muted">{minor > 0 ? t("youAreOwed") : t("youOwe")}</span>
      <Money minor={minor} currency={currency} tone="auto" absolute className="font-semibold" />
    </span>
  );
}

export function GroupRow({ group }: { group: GroupSummaryDto }) {
  const locale = useLocale();
  const t = useTranslations("groups");
  return (
    <ListRow
      href={`/group?id=${group.id}`}
      chevron
      leading={<GroupIcon type={group.type} emoji={group.emoji} />}
      title={group.name}
      subtitle={`${t("people", { count: group.memberCount })} · ${timeAgo(group.lastActivityAt, locale)}`}
      trailing={<BalanceLabel minor={group.myBalance} currency={group.currency} />}
    />
  );
}
