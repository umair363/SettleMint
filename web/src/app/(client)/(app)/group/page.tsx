"use client";

import {
  ApiError,
  getCategoryMeta,
  type ExpenseDto,
  type GroupDetailDto,
  type SettlementDto,
} from "@settlemint/shared";
import { ArrowRightLeft, Inbox, Plus, Repeat, Send, Settings, UserPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useLocale } from "use-intl";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import { ExpenseDetailSheet } from "@/features/groups/expense-detail-sheet";
import { GroupSettingsSheet } from "@/features/groups/group-settings-sheet";
import { GroupIcon } from "@/features/groups/group-row";
import { InviteSheet } from "@/features/groups/invite-sheet";
import { remindToPay } from "@/features/groups/remind";
import { RepeatingSection } from "@/features/groups/repeating-section";
import { SettleSheet, type SettleTarget } from "@/features/groups/settle-sheet";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { dayLabel } from "@/lib/dates";
import { useExpenses, useGroup, useSetExpenseDeleted, useSettlements } from "@/lib/queries";
import { toast } from "sonner";
import { SettledCheck } from "@/ui/settled-check";
import { SwipeRow } from "@/ui/swipe-row";
import { Avatar, AvatarStack } from "@/ui/avatar";
import { Button, IconButton } from "@/ui/button";
import { Segmented } from "@/ui/controls";
import { EmptyState, ErrorState, PreviewRow, Skeleton, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { springSoft } from "@/ui/motion";
import { BalanceCard } from "@/ui/balance-card";
import { Card, List, SectionHeader } from "@/ui/surface";

type Tab = "expenses" | "balances";

type FeedItem =
  | { kind: "expense"; date: string; createdAt: string; expense: ExpenseDto }
  | { kind: "settlement"; date: string; createdAt: string; settlement: SettlementDto };

function nameOf(group: GroupDetailDto, memberId: string, capital = true) {
  const m = group.members.find((x) => x.id === memberId);
  if (!m) return "Someone";
  return m.isMe ? (capital ? "You" : "you") : m.displayName;
}

function ExpenseRow({ group, expense, onOpen }: { group: GroupDetailDto; expense: ExpenseDto; onOpen: () => void }) {
  const cat = getCategoryMeta(expense.category);
  const saving = expense.lines.length === 0;
  const payers = expense.lines.filter((l) => l.paid > 0);
  const mine = expense.lines.find((l) => l.memberId === group.myMemberId);
  const myNet = mine ? mine.paidGroup - mine.owedGroup : 0;
  const payerText =
    payers.length === 1
      ? `${nameOf(group, payers[0].memberId)} paid`
      : payers.length > 1
        ? `${payers.length} people paid`
        : "Saving…";

  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      disabled={saving}
      whileTap={{ scale: 0.985 }}
      className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-2"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-2 text-xl" aria-hidden>
        {cat.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{expense.description}</span>
        <span className="block truncate text-[13px] text-fg-muted">
          {expense.recurringRuleId && <Repeat className="me-1 inline size-3.5 align-[-2px]" aria-label="Repeating" />}
          {payerText} <Money minor={expense.amount} currency={expense.currency} />
        </span>
      </span>
      <span className="shrink-0 text-end text-sm leading-tight">
        {saving ? (
          <span className="text-xs text-fg-subtle">saving</span>
        ) : !mine ? (
          <span className="text-xs text-fg-subtle">not involved</span>
        ) : myNet === 0 ? (
          <span className="text-xs text-fg-subtle">no balance</span>
        ) : (
          <>
            <span className="block text-xs text-fg-muted">{myNet > 0 ? "you lent" : "you borrowed"}</span>
            <Money minor={myNet} currency={group.currency} tone="auto" absolute className="font-semibold" />
          </>
        )}
      </span>
    </motion.button>
  );
}

function SettlementRow({ group, settlement }: { group: GroupDetailDto; settlement: SettlementDto }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-positive-soft text-positive">
        <ArrowRightLeft className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-[15px]">
        <span className="font-medium">{nameOf(group, settlement.fromMemberId)}</span> paid{" "}
        <span className="font-medium">{nameOf(group, settlement.toMemberId, false)}</span>
      </span>
      <Money minor={settlement.amount} currency={settlement.currency} className="font-semibold text-positive" />
    </div>
  );
}

function ExpensesTab({ group, onOpen }: { group: GroupDetailDto; onOpen: (e: ExpenseDto) => void }) {
  const locale = useLocale();
  const expenses = useExpenses(group.id);
  const settlements = useSettlements(group.id);
  const { openAddExpense } = useAddExpense();
  const setDeleted = useSetExpenseDeleted(group.id);
  const remove = (e: ExpenseDto) => {
    setDeleted.mutate({ id: e.id, deleted: true });
    toast("Expense deleted", {
      description: e.description,
      action: { label: "Undo", onClick: () => setDeleted.mutate({ id: e.id, deleted: false }) },
    });
  };

  const items = useMemo(() => {
    const exp = expenses.data?.pages.flatMap((p) => p.items) ?? [];
    const oldest = expenses.hasNextPage ? exp[exp.length - 1]?.date : undefined;
    const feed: FeedItem[] = [
      ...exp.map((e) => ({ kind: "expense" as const, date: e.date, createdAt: e.createdAt, expense: e })),
      ...(settlements.data ?? [])
        .filter((s) => !s.deleted && (!oldest || s.date >= oldest))
        .map((s) => ({ kind: "settlement" as const, date: s.date, createdAt: s.createdAt, settlement: s })),
    ];
    feed.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
    const byDay = new Map<string, FeedItem[]>();
    for (const item of feed) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
    return [...byDay.entries()];
  }, [expenses.data, expenses.hasNextPage, settlements.data]);

  if (expenses.isPending) {
    return (
      <Card>
        <SkeletonRows count={5} />
      </Card>
    );
  }
  if (expenses.error) {
    return (
      <Card>
        <ErrorState onRetry={() => expenses.refetch()} />
      </Card>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Inbox />}
          preview={
            <div className="space-y-2">
              <PreviewRow emoji="🍽️" title="Dinner" subtitle="You paid · split 3 ways" amount="you lent 40.00" tone="positive" />
              <PreviewRow emoji="🚕" title="Taxi from the airport" subtitle="Bilal paid" amount="you owe 12.00" tone="negative" />
            </div>
          }
          title="No expenses yet"
          body="Add the first one. It takes a few seconds."
          action={
            <Button leading={<Plus className="size-4" />} onClick={() => openAddExpense({ groupId: group.id })}>
              Add expense
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="space-y-5">
      {items.map(([day, dayItems]) => (
        <section key={day}>
          <SectionHeader title={dayLabel(day, locale)} />
          <List>
            <AnimatePresence initial={false}>
              {dayItems.map((item) => (
                <motion.div
                  key={item.kind === "expense" ? item.expense.id : item.settlement.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSoft}
                >
                  {item.kind === "expense" ? (
                    <SwipeRow onAction={() => remove(item.expense)} disabled={item.expense.lines.length === 0}>
                      <ExpenseRow group={group} expense={item.expense} onOpen={() => onOpen(item.expense)} />
                    </SwipeRow>
                  ) : (
                    <SettlementRow group={group} settlement={item.settlement} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        </section>
      ))}
      {expenses.hasNextPage && (
        <Button variant="secondary" block loading={expenses.isFetchingNextPage} onClick={() => expenses.fetchNextPage()}>
          Show older
        </Button>
      )}
    </div>
  );
}

function BalancesTab({ group, onSettle }: { group: GroupDetailDto; onSettle: (t: SettleTarget) => void }) {
  const locale = useLocale();
  const people = group.members.filter((m) => !m.left || (group.balances[m.id] ?? 0) !== 0);
  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title={group.simplifyDebts ? "Suggested payments" : "Who owes whom"} />
        {group.transfers.length === 0 ? (
          <Card className="px-5 py-8 text-center">
            <p className="font-display text-lg font-semibold">Everyone is settled up</p>
            <p className="mt-1 text-sm text-fg-muted">Nobody owes anything in this group.</p>
          </Card>
        ) : (
          <List>
            {group.transfers.map((t) => {
              const involvesMe = t.fromMemberId === group.myMemberId || t.toMemberId === group.myMemberId;
              const from = group.members.find((m) => m.id === t.fromMemberId);
              return (
                <div key={`${t.fromMemberId}-${t.toMemberId}`} className="flex items-center gap-3 px-4 py-3">
                  <Avatar id={t.fromMemberId} name={from?.displayName ?? "?"} image={from?.image} size="sm" />
                  <span className="min-w-0 flex-1 text-[15px]">
                    <span className="font-medium">{nameOf(group, t.fromMemberId)}</span>
                    {t.fromMemberId === group.myMemberId ? " owe " : " owes "}
                    <span className="font-medium">{nameOf(group, t.toMemberId, false)}</span>
                    <span className="block">
                      <Money minor={t.amount} currency={group.currency} tone={involvesMe ? (t.fromMemberId === group.myMemberId ? "negative" : "positive") : "plain"} className="font-semibold" />
                    </span>
                  </span>
                  {t.toMemberId === group.myMemberId && (
                    <Button size="sm" variant="ghost" leading={<Send className="size-4" />} onClick={() => remindToPay(group, t, locale)}>
                      Remind
                    </Button>
                  )}
                  <Button size="sm" variant={involvesMe ? "primary" : "secondary"} onClick={() => onSettle(t)}>
                    {t.fromMemberId === group.myMemberId ? "Pay" : "Record"}
                  </Button>
                </div>
              );
            })}
          </List>
        )}
        {group.simplifyDebts && group.transfers.length > 0 && (
          <p className="mt-2 px-1 text-[13px] text-fg-subtle">The fewest payments that settle everyone. Turn this off in group settings.</p>
        )}
      </section>

      <section>
        <SectionHeader title="Balances" />
        <List>
          {people.map((m) => {
            const b = group.balances[m.id] ?? 0;
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar id={m.id} name={m.displayName} image={m.image} size="sm" pending={!m.claimed} />
                <span className="min-w-0 flex-1 truncate font-medium">{m.isMe ? "You" : m.displayName}</span>
                <span className="text-end text-sm leading-tight">
                  {b === 0 ? (
                    <span className="text-fg-subtle">settled</span>
                  ) : (
                    <>
                      <span className="block text-xs text-fg-muted">
                        {b > 0 ? (m.isMe ? "get back" : "gets back") : m.isMe ? "owe" : "owes"}
                      </span>
                      <Money minor={b} currency={group.currency} tone="auto" absolute className="font-semibold" />
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </List>
        <p className="mt-2 px-1 text-[13px] text-fg-subtle">
          Total spent: <Money minor={group.totalSpent} currency={group.currency} />
        </p>
      </section>
    </div>
  );
}

function GroupScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const group = useGroup(id);
  const { openAddExpense } = useAddExpense();
  const [tab, setTab] = useState<Tab>("expenses");
  const [inviteOpen, setInviteOpen] = useState(params.get("invite") === "1");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settle, setSettle] = useState<SettleTarget | null>(null);
  const [openExpense, setOpenExpense] = useState<ExpenseDto | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  if (!id || (group.error instanceof ApiError && group.error.status === 404)) {
    return (
      <PageBody className="pt-16">
        <ErrorState title="Group not found" body="It may have been deleted, or you're not in it any more." />
        <div className="flex justify-center">
          <Link href="/groups" className="font-medium text-positive">
            Back to groups
          </Link>
        </div>
      </PageBody>
    );
  }
  if (group.isPending) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-48" />} back={{ href: "/groups", label: "Groups" }} />
        <PageBody>
          <Card className="space-y-3 p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-40" />
          </Card>
          <Card>
            <SkeletonRows count={4} />
          </Card>
        </PageBody>
      </>
    );
  }
  if (group.error) {
    return (
      <PageBody className="pt-16">
        <ErrorState onRetry={() => group.refetch()} offline={group.error instanceof ApiError && group.error.isNetwork} />
      </PageBody>
    );
  }

  const g = group.data;
  const myTransfer =
    g.transfers.find((t) => t.fromMemberId === g.myMemberId) ?? g.transfers.find((t) => t.toMemberId === g.myMemberId);
  const active = g.members.filter((m) => !m.left);

  return (
    <>
      <PageHeader
        back={{ href: "/groups", label: "Groups" }}
        title={
          <span className="flex items-center gap-3">
            <GroupIcon type={g.type} emoji={g.emoji} />
            <span className="truncate">{g.name}</span>
          </span>
        }
        actions={
          <>
            <IconButton label="Invite people" variant="solid" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-5" />
            </IconButton>
            <IconButton label="Group settings" variant="solid" onClick={() => setSettingsOpen(true)}>
              <Settings className="size-5" />
            </IconButton>
          </>
        }
      />
      <PageBody>
        <button type="button" onClick={() => setInviteOpen(true)} className="-mt-1 flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
          <AvatarStack people={active.map((m) => ({ id: m.id, name: m.displayName, image: m.image }))} max={5} size="xs" />
          {active.length} {active.length === 1 ? "person" : "people"} · {g.currency}
        </button>

        <BalanceCard balance={g.myBalance}>
          <div>
            <p className="text-sm text-fg-muted">
              {g.myBalance > 0 ? "You are owed" : g.myBalance < 0 ? "You owe" : "You're settled up"}
            </p>
            {celebrate && g.myBalance === 0 ? (
              <div className="mt-2">
                <SettledCheck />
              </div>
            ) : (
              <p className="mt-0.5 font-display text-4xl font-semibold tracking-tight">
                <Money minor={g.myBalance} currency={g.currency} tone="auto" absolute animated />
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button leading={<Plus className="size-4" />} onClick={() => openAddExpense({ groupId: g.id })}>
                Add expense
              </Button>
              <Button
                variant="secondary"
                leading={<ArrowRightLeft className="size-4" />}
                disabled={g.transfers.length === 0}
                onClick={() => {
                  if (myTransfer) setSettle(myTransfer);
                  else setTab("balances");
                }}
              >
                Settle up
              </Button>
            </div>
          </div>
        </BalanceCard>

        {active.length === 1 && (
          <Card className="flex items-center gap-4 p-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-positive">
              <UserPlus className="size-5" />
            </span>
            <span className="flex-1 text-sm">
              <span className="block font-medium">It&apos;s just you so far</span>
              <span className="text-fg-muted">Invite people or add them by name.</span>
            </span>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
          </Card>
        )}

        <Segmented<Tab>
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: "expenses", label: "Expenses" },
            { value: "balances", label: "Balances" },
          ]}
        />

        {tab === "expenses" ? (
          <>
            <RepeatingSection group={g} />
            <ExpensesTab group={g} onOpen={setOpenExpense} />
          </>
        ) : (
          <BalancesTab group={g} onSettle={setSettle} />
        )}
      </PageBody>

      <InviteSheet
        group={g}
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o && params.get("invite")) router.replace(`/group?id=${g.id}`);
        }}
      />
      <GroupSettingsSheet group={g} open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SettleSheet group={g} target={settle} onClose={() => setSettle(null)} onSettledMe={() => setCelebrate(true)} />
      <ExpenseDetailSheet group={g} expense={openExpense} onClose={() => setOpenExpense(null)} />
    </>
  );
}

export default function GroupPage() {
  return (
    <Suspense>
      <GroupScreen />
    </Suspense>
  );
}
