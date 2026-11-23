"use client";

import { ArrowRight, Link2, Plus, UserPlus } from "@/ui/icons";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { ActivityRow } from "@/features/activity/activity-row";
import { GroupRow } from "@/features/groups/group-row";
import { listablePeople, PersonRow } from "@/features/people/people";
import { NewFriendSheet, NewGroupSheet } from "@/features/groups/new-group-sheet";
import { SearchButton } from "@/features/search/search-palette";
import { PageBody } from "@/features/shell/page-header";
import { totalsByCurrency, useActivity, useGroups, useMe, usePeople } from "@settlemint/client/data/queries";
import { Avatar } from "@/ui/avatar";
import { BalanceStatement, LedgerLine } from "@/ui/balance-statement";
import { Button } from "@/ui/button";
import { EmptyState, ErrorState, PreviewRow, Skeleton, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { Card, List, SectionHeader } from "@/ui/surface";

function partOfDay() {
  const h = new Date().getHours();
  return h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

/**
 * Where you stand, in one statement. With several currencies, the one you use
 * most leads and the rest follow as quiet ledger lines; they are never added up.
 */
function Standing({ defaultCurrency }: { defaultCurrency: string | null }) {
  const groups = useGroups();
  const t = useTranslations("home");
  const tg = useTranslations("group");
  const tgs = useTranslations("groups");
  const totals = totalsByCurrency(groups.data);

  if (groups.isPending) {
    return (
      <div className="space-y-3 py-1" aria-busy>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>
    );
  }
  if (totals.length === 0) {
    return <BalanceStatement label={t("yourBalance")} minor={0} currency={defaultCurrency ?? "USD"} settledText={t("allSettled")} context={t("nobodyOwes")} />;
  }

  const lead = totals.find((x) => x.currency === defaultCurrency) ?? [...totals].sort((a, b) => Math.abs(b.net) - Math.abs(a.net))[0];
  const rest = totals.filter((x) => x !== lead);
  const count = (groups.data ?? []).filter((g) => !g.archived && g.currency === lead.currency && g.myBalance !== 0).length;
  const state = lead.net > 0 ? "owed" : lead.net < 0 ? "owe" : "settled";

  return (
    <BalanceStatement
      label={tg("myBalance", { state })}
      minor={lead.net}
      currency={lead.currency}
      context={
        lead.owed > 0 && lead.owe > 0
          ? t.rich("owedAndOwe", {
              owed: () => <Money minor={lead.owed} currency={lead.currency} tone="positive" />,
              owe: () => <Money minor={lead.owe} currency={lead.currency} tone="negative" />,
            })
          : t("acrossGroups", { count })
      }
    >
      {rest.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-line pt-4">
          {rest.map((b) => (
            <LedgerLine key={b.currency}>
              <Money minor={b.net} currency={b.currency} tone="auto" absolute className="font-wide text-[17px] font-[620]" />
              <span>{b.net > 0 ? tgs("youAreOwed") : b.net < 0 ? tgs("youOwe") : tgs("settledUp")}</span>
            </LedgerLine>
          ))}
        </div>
      )}
    </BalanceStatement>
  );
}

export default function HomePage() {
  const me = useMe();
  const groups = useGroups();
  const activity = useActivity();
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const tg = useTranslations("groups");
  const tp = useTranslations("people");
  const people = listablePeople(usePeople().data);
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const firstName = me.data?.name.split(" ")[0] ?? "";
  const everyone = (groups.data ?? []).filter((g) => !g.archived);
  const active = everyone.filter((g) => g.type !== "direct");
  const friends = everyone.filter((g) => g.type === "direct");
  const recent = activity.data?.pages[0]?.items.slice(0, 5) ?? [];
  const isNew = groups.isSuccess && everyone.length === 0;

  const seeAll = (href: string) => (
    <Link href={href} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-[560] text-positive hover:bg-surface-2">
      {tc("all")} <ArrowRight className="size-3.5 rtl:rotate-180" />
    </Link>
  );

  return (
    <>
      <header className="safe-top mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-5 sm:px-6 lg:pt-10">
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-[540] text-fg-muted">
          {t("greeting", { part: partOfDay(), name: firstName || "none" })}
        </h1>
        <SearchButton />
        {me.data && (
          <Link href="/account" aria-label={me.data.name} className="rounded-full lg:hidden">
            <Avatar id={me.data.id} name={me.data.name} image={me.data.image} size="sm" />
          </Link>
        )}
      </header>
      <PageBody className="pt-6">
        {isNew ? (
          <Card>
            <EmptyState
              preview={
                <>
                  <PreviewRow glyph={{ group: "trip" }} title={t("sampleTrip")} subtitle={t("sampleTripLine")} amount="€128.50" tone="positive" />
                  <PreviewRow glyph={{ group: "home" }} title={t("sampleHome")} subtitle={t("sampleHomeLine")} amount="£42.00" tone="negative" />
                </>
              }
              title={t("firstBillTitle")}
              body={t("firstBillBody")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button size="lg" leading={<UserPlus className="size-[18px]" />} onClick={() => setFriendOpen(true)}>
                    {tg("addFriend")}
                  </Button>
                  <Button size="lg" variant="secondary" leading={<Plus className="size-[18px]" />} onClick={() => setNewGroupOpen(true)}>
                    {t("createGroup")}
                  </Button>
                </div>
              }
            />
            <div className="space-y-2 border-t border-line px-5 py-5 text-[15px] sm:px-6">
              <p className="flex items-center gap-2 text-fg-muted">
                <Link2 className="size-[18px]" /> {t("haveInvite")}
              </p>
              <Link href="/groups" className="inline-block font-[560] text-positive">
                {t("fromSplitwise")}
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Standing defaultCurrency={me.data?.defaultCurrency ?? null} />

            {friends.length > 0 && (
              <section>
                <SectionHeader
                  title={tg("friends")}
                  action={
                    <button
                      type="button"
                      onClick={() => setFriendOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-[560] text-positive hover:bg-surface-2"
                    >
                      <UserPlus className="size-4" /> {tg("addFriend")}
                    </button>
                  }
                />
                <List>
                  {friends.slice(0, 5).map((g) => (
                    <GroupRow key={g.id} group={g} />
                  ))}
                </List>
              </section>
            )}

            {people.length > 0 && (
              <section>
                <SectionHeader title={tp("title")} />
                <List>
                  {people.slice(0, 5).map((p) => (
                    <PersonRow key={p.key} person={p} />
                  ))}
                </List>
              </section>
            )}

            <section>
              <SectionHeader
                title={t("groups")}
                action={
                  <div className="flex items-center gap-1">
                    {friends.length === 0 && (
                      <button
                        type="button"
                        onClick={() => setFriendOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-[560] text-positive hover:bg-surface-2"
                      >
                        <UserPlus className="size-4" /> {tg("addFriend")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewGroupOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[15px] font-[560] text-positive hover:bg-surface-2"
                    >
                      <Plus className="size-4" /> {t("newGroup")}
                    </button>
                  </div>
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
              ) : active.length === 0 ? null : (
                <List>
                  {active.slice(0, 5).map((g) => (
                    <GroupRow key={g.id} group={g} />
                  ))}
                </List>
              )}
              {active.length > 5 && <div className="mt-2 flex justify-end">{seeAll("/groups")}</div>}
            </section>

            <section>
              <SectionHeader title={t("recentActivity")} action={recent.length > 0 ? seeAll("/activity") : undefined} />
              {activity.isPending ? (
                <Card>
                  <SkeletonRows count={3} />
                </Card>
              ) : recent.length === 0 ? (
                <Card>
                  <EmptyState title={t("nothingYet")} body={t("activityEmpty")} />
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
      <NewFriendSheet open={friendOpen} onOpenChange={setFriendOpen} />
    </>
  );
}
