"use client";

import { formatMoney } from "@settlemint/shared";
import { Share2 } from "@/ui/icons";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";
import { drawRecapImage } from "@/features/recap/recap-image";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { buildRecap } from "@settlemint/client/data/recap";
import { useExpenses, useGroup } from "@settlemint/client/data/queries";
import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, SkeletonRows } from "@/ui/feedback";
import { CategoryTile } from "@/ui/glyph-tile";
import { Money } from "@/ui/money";
import { BalanceStatement } from "@/ui/balance-statement";
import { Card, SectionHeader } from "@/ui/surface";

function Bar({ share }: { share: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, Math.round(share * 100))}%` }} />
    </div>
  );
}

function Recap() {
  const id = useSearchParams().get("id");
  const group = useGroup(id);
  const expenses = useExpenses(id);
  const locale = useLocale();
  const t = useTranslations("recap");
  const tc = useTranslations("common");
  const tcat = useTranslations("categories");
  const [sharing, setSharing] = useState(false);

  // The recap needs every expense, so keep loading pages until there are none left.
  useEffect(() => {
    if (expenses.hasNextPage && !expenses.isFetchingNextPage) void expenses.fetchNextPage();
  }, [expenses]);

  const recap = useMemo(
    () => (group.data && expenses.data ? buildRecap(group.data, expenses.data.pages.flatMap((p) => p.items)) : null),
    [group.data, expenses.data],
  );
  const loading = group.isPending || expenses.isPending || Boolean(expenses.hasNextPage);

  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));
  const period =
    recap?.firstDate && recap.lastDate
      ? recap.firstDate === recap.lastDate
        ? date(recap.firstDate)
        : `${date(recap.firstDate)} – ${date(recap.lastDate)}`
      : "";

  const share = async () => {
    if (!group.data || !recap) return;
    setSharing(true);
    try {
      const cur = group.data.currency;
      const money = (minor: number) => formatMoney(minor, cur, { locale });
      const top = recap.byCategory[0]?.amount || 1;
      const topPaid = recap.byPayer[0]?.amount || 1;
      const blob = await drawRecapImage({
        title: `${group.data.name} · ${t("title")}`,
        total: money(recap.total),
        count: [t("count", { count: recap.count }), period].filter(Boolean).join(" · "),
        where: t("where"),
        whoPaid: t("whoPaid"),
        rows: recap.byCategory.map((c) => ({ label: tcat(c.category as CategoryKey), value: money(c.amount), share: c.amount / top })),
        payers: recap.byPayer.map((p) => ({ label: p.name, value: money(p.amount), share: p.amount / topPaid })),
      });
      const file = new File([blob], "recap.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }).catch((err) => {
          if (!(err instanceof DOMException && err.name === "AbortError")) throw err;
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "recap.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast.error(t("failed"));
    } finally {
      setSharing(false);
    }
  };

  const back = id ? { href: `/group?id=${id}`, label: group.data?.name ?? tc("back") } : undefined;
  return (
    <>
      <PageHeader title={t("title")} subtitle={group.data?.name} back={back} />
      <PageBody>
        {group.error || expenses.error ? (
          <Card>
            <ErrorState onRetry={() => (group.error ? group.refetch() : expenses.refetch())} />
          </Card>
        ) : loading || !group.data || !recap ? (
          <Card>
            <SkeletonRows count={5} />
          </Card>
        ) : recap.count === 0 ? (
          <Card>
            <EmptyState title={t("title")} body={t("empty")} />
          </Card>
        ) : (
          <>
            <BalanceStatement
              label={t("spent")}
              minor={recap.total}
              currency={group.data.currency}
              context={[t("count", { count: recap.count }), period].filter(Boolean).join(" · ")}
            />

            <section>
              <SectionHeader title={t("where")} />
              <Card className="divide-y divide-line">
                {recap.byCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-3 px-4 py-3.5">
                    <CategoryTile category={c.category} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[16px] font-[560]">{tcat(c.category as CategoryKey)}</span>
                        <Money minor={c.amount} currency={group.data.currency} className="font-wide text-[16px] font-[620]" />
                      </div>
                      <Bar share={c.amount / recap.byCategory[0].amount} />
                    </div>
                  </div>
                ))}
              </Card>
            </section>

            <section>
              <SectionHeader title={t("whoPaid")} />
              <Card className="divide-y divide-line">
                {recap.byPayer.map((p) => {
                  const member = group.data.members.find((m) => m.id === p.memberId);
                  return (
                    <div key={p.memberId} className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar id={p.memberId} name={p.name} image={member?.image ?? null} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[16px] font-[650]">{p.name}</span>
                          <Money minor={p.amount} currency={group.data.currency} className="font-wide text-[16px] font-[620]" />
                        </div>
                        <Bar share={p.amount / recap.byPayer[0].amount} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>

            {recap.biggest && (
              <section>
                <SectionHeader title={t("biggest")} />
                <Card className="flex items-center justify-between gap-3 px-4 py-4">
                  <span className="min-w-0">
                    <span className="block truncate text-[17px] font-[620]">{recap.biggest.description}</span>
                    <span className="block text-[14px] text-fg-muted">{date(recap.biggest.date)}</span>
                  </span>
                  <Money minor={recap.biggest.amount} currency={group.data.currency} className="font-wide text-[20px] font-[650]" />
                </Card>
              </section>
            )}

            <Button size="lg" block loading={sharing} leading={<Share2 className="size-[18px]" />} onClick={share}>
              {t("share")}
            </Button>
          </>
        )}
      </PageBody>
    </>
  );
}

export default function RecapPage() {
  return (
    <Suspense>
      <Recap />
    </Suspense>
  );
}
