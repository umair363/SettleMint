"use client";

import type { GroupSummaryDto } from "@settlemint/shared";
import { useLocale, useTranslations } from "use-intl";
import { timeAgo } from "@settlemint/client/text/dates";
import { GroupMark } from "@/ui/glyph-tile";
import { Money } from "@/ui/money";
import { ListRow } from "@/ui/surface";

/** A group's mark; `id` gives it its own quiet colour. (`emoji` is ignored: groups are drawn, not emoji.) */
export function GroupIcon({ id, type, size = "md" }: { id?: string; type: string; emoji?: string | null; size?: "md" | "lg" }) {
  return <GroupMark id={id ?? type} type={type} size={size} />;
}

/** "you are owed €12.00" stacked at the end of a row; "settled up" when even. */
export function BalanceLabel({ minor, currency }: { minor: number; currency: string }) {
  const t = useTranslations("groups");
  if (minor === 0) return <span className="text-[14px] text-fg-subtle">{t("settledUp")}</span>;
  return (
    <span className="block leading-tight">
      <span className="block text-[12px] text-fg-muted">{minor > 0 ? t("youAreOwed") : t("youOwe")}</span>
      <Money minor={minor} currency={currency} tone="auto" absolute className="font-wide text-[16px] font-[620]" />
    </span>
  );
}

export function GroupRow({ group }: { group: GroupSummaryDto }) {
  const locale = useLocale();
  const t = useTranslations("groups");
  return (
    <ListRow
      href={`/group?id=${group.id}`}
      leading={<GroupIcon id={group.id} type={group.type} />}
      title={group.name}
      subtitle={group.type === "direct" ? timeAgo(group.lastActivityAt, locale) : `${t("people", { count: group.memberCount })} · ${timeAgo(group.lastActivityAt, locale)}`}
      trailing={<BalanceLabel minor={group.myBalance} currency={group.currency} />}
    />
  );
}
