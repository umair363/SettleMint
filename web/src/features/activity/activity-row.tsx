"use client";

import type { ActivityDto } from "@settlemint/shared";
import { ArrowRightLeft, Receipt, Settings2, UserPlus } from "@/ui/icons";
import { CategoryTile } from "@/ui/glyph-tile";
import Link from "next/link";
import { useLocale, useTranslations } from "use-intl";
import { describeActivity } from "@settlemint/client/text/activity-text";
import { timeAgo } from "@settlemint/client/text/dates";
import { cn } from "@/ui/cn";
import { Money } from "@/ui/money";

const ICONS = {
  expense: { Icon: Receipt, className: "bg-surface-2 text-fg-muted" },
  payment: { Icon: ArrowRightLeft, className: "bg-positive-soft text-positive" },
  member: { Icon: UserPlus, className: "bg-surface-2 text-fg-muted" },
  group: { Icon: Settings2, className: "bg-surface-2 text-fg-muted" },
} as const;

export function ActivityRow({ event, myUserId, showGroup = true }: { event: ActivityDto; myUserId?: string; showGroup?: boolean }) {
  const locale = useLocale();
  const t = useTranslations("activity");
  const line = describeActivity(event, myUserId, t);
  const { Icon, className } = ICONS[line.kind];
  return (
    <Link href={`/group?id=${event.groupId}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-[var(--dur-feedback)] hover:bg-surface-2/70">
      {line.kind === "expense" && typeof event.data.category === "string" ? (
        <CategoryTile category={event.data.category} />
      ) : (
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)]", className)}>
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[16px] leading-snug text-fg", line.deleted && "text-fg-muted line-through decoration-fg-subtle")}>
          {line.text}
        </span>
        <span className="mt-0.5 block truncate text-[14px] text-fg-muted">
          {showGroup && <>{event.groupName} · </>}
          {timeAgo(event.createdAt, locale)}
        </span>
      </span>
      {line.amount && (
        <Money
          minor={line.amount.minor}
          currency={line.amount.currency}
          tone={line.deleted ? "muted" : "plain"}
          className="font-wide text-[16px] font-[600]"
        />
      )}
    </Link>
  );
}
