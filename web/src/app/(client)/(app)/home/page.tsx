"use client";

import { Activity, ArrowRight, Link2, Plus, Sparkles, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ActivityRow } from "@/features/activity/activity-row";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import { GroupRow } from "@/features/groups/group-row";
import { NewGroupSheet } from "@/features/groups/new-group-sheet";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { totalsByCurrency, useActivity, useGroups, useMe } from "@/lib/queries";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, PreviewRow, Skeleton, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { listContainer, listItem } from "@/ui/motion";
import { BalanceCard } from "@/ui/balance-card";
import { Card, List, SectionHeader } from "@/ui/surface";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function BalanceHero() {
  const groups = useGroups();
  const totals = totalsByCurrency(groups.data);

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
        <p className="text-sm text-fg-muted">Your balance</p>
        <p className="mt-1 font-display text-3xl font-semibold">All settled up</p>
        <p className="mt-1 text-sm text-fg-muted">Nobody owes anybody. Nice.</p>
      </BalanceCard>
    );
  }
  return (
    <BalanceCard balance={totals.reduce((s, t) => s + Math.sign(t.net), 0)}>
      <div className="space-y-4">
        {totals.map((t) => (
          <div key={t.currency}>
            <p className="text-sm text-fg-muted">
              {t.net > 0 ? "Overall, you are owed" : t.net < 0 ? "Overall, you owe" : "Overall, you're even"}
            </p>
            <p className="mt-0.5 font-display text-4xl font-semibold tracking-tight">
              <Money minor={t.net} currency={t.currency} tone="auto" absolute animated />
            </p>
            {t.owed > 0 && t.owe > 0 && (
              <p className="mt-1 text-sm text-fg-muted">
                <Money minor={t.owed} currency={t.currency} tone="positive" /> owed to you ·{" "}
                <Money minor={t.owe} currency={t.currency} tone="negative" /> you owe
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
  const firstName = me.data?.name.split(" ")[0] ?? "";
  const active = (groups.data ?? []).filter((g) => !g.archived);
  const recent = activity.data?.pages[0]?.items.slice(0, 5) ?? [];
  const isNew = groups.isSuccess && active.length === 0;

  return (
    <>
      <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} />
      <PageBody>
        {isNew ? (
          <Card>
            <EmptyState
              icon={<Sparkles />}
              preview={
                <div className="space-y-2">
                  <PreviewRow emoji="✈️" title="Lisbon trip" subtitle="4 people · you are owed" amount="€128.50" tone="positive" />
                  <PreviewRow emoji="🏠" title="Flat 4B" subtitle="3 people · you owe" amount="£42.00" tone="negative" />
                </div>
              }
              title="Let's split your first bill"
              body="Make a group for a trip, your home, or just you and a friend. People you add don't need the app."
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button leading={<Plus className="size-4" />} onClick={() => setNewGroupOpen(true)}>
                    Create a group
                  </Button>
                </div>
              }
            />
            <p className="flex items-center justify-center gap-1.5 pb-6 text-sm text-fg-muted">
              <Link2 className="size-4" /> Got an invite link? Just open it.
            </p>
          </Card>
        ) : (
          <>
            <BalanceHero />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="lg" leading={<Plus className="size-5" />} onClick={() => openAddExpense()}>
                Add expense
              </Button>
              <Button variant="secondary" size="lg" leading={<Users className="size-5" />} onClick={() => setNewGroupOpen(true)}>
                New group
              </Button>
            </div>

            <section>
              <SectionHeader
                title="Groups"
                action={
                  <Link href="/groups" className="inline-flex items-center gap-1 text-sm font-medium text-positive">
                    All <ArrowRight className="size-3.5 rtl:rotate-180" />
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
                title="Recent activity"
                action={
                  <Link href="/activity" className="inline-flex items-center gap-1 text-sm font-medium text-positive">
                    All <ArrowRight className="size-3.5 rtl:rotate-180" />
                  </Link>
                }
              />
              {activity.isPending ? (
                <Card>
                  <SkeletonRows count={3} />
                </Card>
              ) : recent.length === 0 ? (
                <Card>
                  <EmptyState icon={<Activity />} title="Nothing yet" body="Expenses and payments in your groups show up here." />
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
