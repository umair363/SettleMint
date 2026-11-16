"use client";

import { Activity, ArrowRight, Link2, Plus, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { ActivityRow } from "@/features/activity/activity-row";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import { GroupRow } from "@/features/groups/group-row";
import { NewGroupSheet } from "@/features/groups/new-group-sheet";
import { SearchButton } from "@/features/search/search-palette";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { totalsByCurrency, useActivity, useGroups, useMe } from "@/lib/queries";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, PreviewRow, Skeleton, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { listContainer, listItem } from "@/ui/motion";
import { BalanceCard } from "@/ui/balance-card";
import { Card, List, SectionHeader } from "@/ui/surface";

function partOfDay() {
  const h = new Date().getHours();
  return h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function BalanceHero() {
  const groups = useGroups();
  const totals = totalsByCurrency(groups.data);
  const t = useTranslations("home");

  if (groups.isPending) {
    return (
      <Card className="space-y-3 p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-48" />
      </Card>
    );
  }
  if (totals.length === 0) {
    return (
      <BalanceCard balance={0}>
        <p className="text-sm text-fg-muted">{t("yourBalance")}</p>
        <p className="mt-1 font-display text-3xl font-semibold">{t("allSettled")}</p>
        <p className="mt-1 text-sm text-fg-muted">{t("nobodyOwes")}</p>
      </BalanceCard>
    );
  }
  return (
    <BalanceCard balance={totals.reduce((s, t) => s + Math.sign(t.net), 0)}>
      <div className="space-y-4">
        {totals.map((b) => (
          <div key={b.currency}>
            <p className="text-sm text-fg-muted">
              {t("overall", { state: b.net > 0 ? "owed" : b.net < 0 ? "owe" : "even" })}
            </p>
            <p className="mt-0.5 font-display text-4xl font-semibold tracking-tight">
              <Money minor={b.net} currency={b.currency} tone="auto" absolute animated />
            </p>
            {b.owed > 0 && b.owe > 0 && (
              <p className="mt-1 text-sm text-fg-muted">
                {t.rich("owedAndOwe", {
                  owed: () => <Money minor={b.owed} currency={b.currency} tone="positive" />,
                  owe: () => <Money minor={b.owe} currency={b.currency} tone="negative" />,
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </BalanceCard>
  );
}

export default function HomePage() {
  const me = useMe();
  const groups = useGroups();
  const activity = useActivity();
  const { openAddExpense } = useAddExpense();
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const firstName = me.data?.name.split(" ")[0] ?? "";
  const active = (groups.data ?? []).filter((g) => !g.archived);
  const recent = activity.data?.pages[0]?.items.slice(0, 5) ?? [];
  const isNew = groups.isSuccess && active.length === 0;

  return (
    <>
      <PageHeader title={t("greeting", { part: partOfDay(), name: firstName || "none" })} actions={<SearchButton />} />
      <PageBody>
        {isNew ? (
          <Card>
            <EmptyState
              icon={<Sparkles />}
              preview={
                <div className="space-y-2">
                  <PreviewRow emoji="✈️" title={t("sampleTrip")} subtitle={t("sampleTripLine")} amount="€128.50" tone="positive" />
                  <PreviewRow emoji="🏠" title={t("sampleHome")} subtitle={t("sampleHomeLine")} amount="£42.00" tone="negative" />
                </div>
              }
              title={t("firstBillTitle")}
              body={t("firstBillBody")}
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button leading={<Plus className="size-4" />} onClick={() => setNewGroupOpen(true)}>
                    {t("createGroup")}
                  </Button>
                </div>
              }
            />
            <p className="flex items-center justify-center gap-1.5 pb-6 text-sm text-fg-muted">
              <Link2 className="size-4" /> {t("haveInvite")}
            </p>
            <p className="pb-6 text-center text-sm">
              <Link href="/groups" className="font-medium text-positive">
                {t("fromSplitwise")}
              </Link>
            </p>
          </Card>
        ) : (
          <>
            <BalanceHero />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" leading={<Plus className="size-5" />} onClick={() => openAddExpense()}>
                {tc("addExpense")}
              </Button>
              <Button variant="secondary" size="lg" leading={<Users className="size-5" />} onClick={() => setNewGroupOpen(true)}>
                {t("newGroup")}
              </Button>
            </div>

            <section>
              <SectionHeader
                title={t("groups")}
                action={
                  <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-medium text-positive">
                    {tc("all")} <ArrowRight className="size-3.5 rtl:rotate-180" />
                  </Link>
                }
              />
              {groups.isPending ? (
                <Card>
                  <SkeletonRows count={3} />
                </Card>
              ) : groups.error ? (
                <Card>
                  <ErrorState onRetry={() => groups.refetch()} />
                </Card>
              ) : (
                <List>
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="divide-y divide-line">
                    {active.slice(0, 5).map((g) => (
                      <motion.div key={g.id} variants={listItem}>
                        <GroupRow group={g} />
                      </motion.div>
                    ))}
                  </motion.div>
                </List>
              )}
            </section>

            <section>
              <SectionHeader
                title={t("recentActivity")}
                action={
                  <Link href="/activity" className="inline-flex items-center gap-1 text-sm font-medium text-positive">
                    {tc("all")} <ArrowRight className="size-3.5 rtl:rotate-180" />
                  </Link>
                }
              />
              {activity.isPending ? (
                <Card>
                  <SkeletonRows count={3} />
                </Card>
              ) : recent.length === 0 ? (
                <Card>
                  <EmptyState icon={<Activity />} title={t("nothingYet")} body={t("activityEmpty")} />
                </Card>
              ) : (
                <List>
                  {recent.map((e) => (
                    <ActivityRow key={e.id} event={e} myUserId={me.data?.id} />
                  ))}
                </List>
              )}
            </section>
          </>
        )}
      </PageBody>
      <NewGroupSheet open={newGroupOpen} onOpenChange={setNewGroupOpen} />
    </>
  );
}
