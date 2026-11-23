"use client";

import type { TrashItemDto } from "@settlemint/shared";
import { Trash2 } from "@/ui/icons";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { useRestoreTrashItem, useTrash } from "@settlemint/client/data/queries";
import { timeAgo } from "@settlemint/client/text/dates";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { Card, List } from "@/ui/surface";

function TrashRow({ item }: { item: TrashItemDto }) {
  const t = useTranslations("trash");
  const locale = useLocale();
  const restore = useRestoreTrashItem();
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-[600] text-fg">{item.title}</span>
        <span className="mt-0.5 block truncate text-[14px] text-fg-muted">
          {t(item.kind)} · {item.kind === "group" ? "" : `${item.groupName} · `}
          {timeAgo(item.deletedAt, locale)}
        </span>
      </span>
      {item.amount !== null && item.currency && (
        <Money minor={item.amount} currency={item.currency} tone="muted" className="font-wide text-[16px] font-[600]" />
      )}
      <Button
        size="sm"
        variant="secondary"
        loading={restore.isPending}
        disabled={!item.canRestore}
        title={item.canRestore ? undefined : t("ownerOnly")}
        onClick={() =>
          restore.mutate({ kind: item.kind, id: item.id }, { onSuccess: () => toast.success(t("restored", { title: item.title })) })
        }
      >
        {t("restore")}
      </Button>
    </li>
  );
}

export default function TrashPage() {
  const trash = useTrash();
  const t = useTranslations("trash");
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PageBody>
        {trash.isPending ? (
          <Card>
            <SkeletonRows count={4} />
          </Card>
        ) : trash.error ? (
          <Card>
            <ErrorState onRetry={() => trash.refetch()} />
          </Card>
        ) : trash.data.length === 0 ? (
          <Card>
            <EmptyState icon={<Trash2 />} title={t("emptyTitle")} body={t("emptyBody")} />
          </Card>
        ) : (
          <List>
            {trash.data.map((item) => (
              <TrashRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </List>
        )}
      </PageBody>
    </>
  );
}
