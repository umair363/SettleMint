"use client";

import {
  ApiError,
  formatMoney,
  type ExpenseDto,
  type GroupDetailDto,
  type SettlementDto,
  type TransferDto,
} from "@settlemint/shared";
import { ArrowRightLeft, ChevronRight, Inbox, Plus, Repeat, ScanLine, Send, Settings, UserPlus } from "@/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";
import { useAddExpense } from "@/features/expenses/add-expense-context";
import { ExpenseDetailSheet } from "@/features/groups/expense-detail-sheet";
import { GroupSettingsSheet } from "@/features/groups/group-settings-sheet";
import { InviteSheet } from "@/features/groups/invite-sheet";
import { RemindSheet } from "@/features/groups/remind-sheet";
import { MyQrSheet } from "@/features/payments/my-qr-sheet";
import { RepeatingSection } from "@/features/groups/repeating-section";
import { SettleSheet, type SettleTarget } from "@/features/groups/settle-sheet";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { dayLabel } from "@settlemint/client/text/dates";
import { useExpenses, useGroup, useSetExpenseDeleted, useSettlements } from "@settlemint/client/data/queries";
import { toast } from "sonner";
import { SettledCheck } from "@/ui/settled-check";
import { SettleRing } from "@/ui/settle-ring";
import { SwipeRow } from "@/ui/swipe-row";
import { Avatar, AvatarStack } from "@/ui/avatar";
import { Button, IconButton } from "@/ui/button";
import { Segmented } from "@/ui/controls";
import { EmptyState, ErrorState, PreviewRow, Skeleton, SkeletonRows } from "@/ui/feedback";
import { Money } from "@/ui/money";
import { springSoft } from "@/ui/motion";
import { BalanceStatement } from "@/ui/balance-statement";
import { CategoryTile, GroupMark } from "@/ui/glyph-tile";
import { Card, List, SectionHeader } from "@/ui/surface";

type Tab = "expenses" | "balances";

type FeedItem =
  | { kind: "expense"; date: string; createdAt: string; expense: ExpenseDto }
  | { kind: "settlement"; date: string; createdAt: string; settlement: SettlementDto };

const bold = (chunks: ReactNode) => <span className="font-[600]">{chunks}</span>;

/** Name for sentences, plus which "you" form the sentence needs. */
function nameOf(group: GroupDetailDto, memberId: string, someone: string) {
  return group.members.find((x) => x.id === memberId)?.displayName ?? someone;
}
/** out: I pay them, in: they pay me, other: between two others. */
function direction(group: GroupDetailDto, fromId: string, toId: string) {
  return fromId === group.myMemberId ? "out" : toId === group.myMemberId ? "in" : "other";
}

function ExpenseRow({ group, expense, onOpen }: { group: GroupDetailDto; expense: ExpenseDto; onOpen: () => void }) {
  const saving = expense.lines.length === 0;
  const payers = expense.lines.filter((l) => l.paid > 0);
  const mine = expense.lines.find((l) => l.memberId === group.myMemberId);
  const myNet = mine ? mine.paidGroup - mine.owedGroup : 0;
  const t = useTranslations("group");
  const payerText =
    payers.length === 1
      ? t("onePaid", {
          who: payers[0].memberId === group.myMemberId ? "me" : "other",
          name: nameOf(group, payers[0].memberId, t("someone")),
        })
      : payers.length > 1
        ? t("manyPaid", { count: payers.length })
        : t("savingDots");

  return (
    <motion.button
      type="button"
      layout
      onClick={onOpen}
      disabled={saving}
      whileTap={{ scale: 0.985 }}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition-colors duration-[var(--dur-feedback)] hover:bg-surface-2/70"
    >
      <CategoryTile category={expense.category} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-[540]">{expense.description}</span>
        <span className="mt-0.5 block truncate text-[14px] text-fg-muted">
          {expense.recurringRuleId && <Repeat className="me-1 inline size-3.5 align-[-2px]" aria-label={t("repeating")} />}
          {payerText} <Money minor={expense.amount} currency={expense.currency} />
        </span>
      </span>
      <span className="shrink-0 text-end leading-tight">
        {saving ? (
          <span className="text-[13px] text-fg-subtle">{t("saving")}</span>
        ) : !mine ? (
          <span className="text-[13px] text-fg-subtle">{t("notInvolved")}</span>
        ) : myNet === 0 ? (
          <span className="text-[13px] text-fg-subtle">{t("noBalance")}</span>
        ) : (
          <>
            <span className="block text-[12px] text-fg-muted">{myNet > 0 ? t("youLent") : t("youBorrowed")}</span>
            <Money minor={myNet} currency={group.currency} tone="auto" absolute className="font-wide text-[16px] font-[620]" />
          </>
        )}
      </span>
    </motion.button>
  );
}

function SettlementRow({ group, settlement }: { group: GroupDetailDto; settlement: SettlementDto }) {
  const t = useTranslations("group");
  return (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-positive-soft text-positive">
        <ArrowRightLeft className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-[16px]">
        {t.rich("paid", {
          dir: direction(group, settlement.fromMemberId, settlement.toMemberId),
          from: nameOf(group, settlement.fromMemberId, t("someone")),
          to: nameOf(group, settlement.toMemberId, t("someone")),
          b: bold,
        })}
      </span>
      <Money minor={settlement.amount} currency={settlement.currency} className="font-wide text-[16px] font-[620] text-positive" />
    </div>
  );
}

function ExpensesTab({ group, onOpen }: { group: GroupDetailDto; onOpen: (e: ExpenseDto) => void }) {
  const locale = useLocale();
  const expenses = useExpenses(group.id);
  const settlements = useSettlements(group.id);
  const { openAddExpense } = useAddExpense();
  const setDeleted = useSetExpenseDeleted(group.id);
  const t = useTranslations("group");
  const tc = useTranslations("common");
  const remove = (e: ExpenseDto) => {
    setDeleted.mutate({ id: e.id, deleted: true });
    toast(t("expenseDeleted"), {
      description: e.description,
      action: { label: tc("undo"), onClick: () => setDeleted.mutate({ id: e.id, deleted: false }) },
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
              <PreviewRow glyph={{ category: "food" }} title={t("sampleDinner")} subtitle={t("sampleDinnerLine")} amount={t("sampleDinnerAmount")} tone="positive" />
              <PreviewRow glyph={{ category: "transport" }} title={t("sampleTaxi")} subtitle={t("sampleTaxiLine")} amount={t("sampleTaxiAmount")} tone="negative" />
            </div>
          }
          title={t("noExpensesTitle")}
          body={t("noExpensesBody")}
          action={
            <Button leading={<Plus className="size-4" />} onClick={() => openAddExpense({ groupId: group.id })}>
              {tc("addExpense")}
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {items.map(([day, dayItems]) => (
        <section key={day}>
          <h2 className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 -mx-1 mb-2 bg-bg px-2 py-1.5 text-[14px] font-[600] text-fg-muted lg:top-0">
            {dayLabel(day, locale)}
          </h2>
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
          {t("showOlder")}
        </Button>
      )}
    </div>
  );
}

function BalancesTab({
  group,
  onSettle,
  onRemind,
}: {
  group: GroupDetailDto;
  onSettle: (t: SettleTarget) => void;
  onRemind: (t: TransferDto) => void;
}) {
  const locale = useLocale();
  const tq = useTranslations("myQr");
  const [qrFor, setQrFor] = useState<TransferDto | null>(null);
  const meMember = group.members.find((m) => m.isMe);
  const myQrs = (meMember?.paymentHandles ?? []).filter((h) => h.kind === "qr").map((h) => ({ id: h.id, value: h.value, label: h.label || "QR" }));
  const t = useTranslations("group");
  const trecap = useTranslations("recap");
  const people = group.members.filter((m) => !m.left || (group.balances[m.id] ?? 0) !== 0);
  return (
    <div className="space-y-6">
      <MyQrSheet
        open={qrFor !== null}
        onOpenChange={(o) => !o && setQrFor(null)}
        qrs={myQrs}
        name={meMember?.displayName ?? ""}
        amountText={qrFor ? formatMoney(qrFor.amount, group.currency, { locale }) : undefined}
      />
      <section>
        <SectionHeader title={group.simplifyDebts ? t("suggestedPayments") : t("whoOwesWhom")} />
        {group.transfers.length === 0 ? (
          <Card className="px-5 py-7">
            <p className="font-wide text-[20px] font-[620]">{t("everyoneSettled")}</p>
            <p className="mt-1 text-[15px] text-fg-muted">{t("nobodyOwes")}</p>
          </Card>
        ) : (
          <List>
            {group.transfers.map((tr) => {
              const involvesMe = tr.fromMemberId === group.myMemberId || tr.toMemberId === group.myMemberId;
              const from = group.members.find((m) => m.id === tr.fromMemberId);
              return (
                <div key={`${tr.fromMemberId}-${tr.toMemberId}`} className="flex gap-3 px-4 py-3.5">
                  <Avatar id={tr.fromMemberId} name={from?.displayName ?? "?"} image={from?.image} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[16px] leading-snug">
                        {t.rich("owes", {
                          dir: direction(group, tr.fromMemberId, tr.toMemberId),
                          from: nameOf(group, tr.fromMemberId, t("someone")),
                          to: nameOf(group, tr.toMemberId, t("someone")),
                          b: bold,
                        })}
                      </span>
                      <Money
                        minor={tr.amount}
                        currency={group.currency}
                        tone={involvesMe ? (tr.fromMemberId === group.myMemberId ? "negative" : "positive") : "plain"}
                        className="shrink-0 font-wide text-[17px] font-[620]"
                      />
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onSettle(tr)}>
                        {tr.fromMemberId === group.myMemberId ? t("pay") : t("record")}
                      </Button>
                      {tr.toMemberId === group.myMemberId && (
                        <Button size="sm" variant="ghost" leading={<Send className="size-4" />} onClick={() => onRemind(tr)}>
                          {t("remind")}
                        </Button>
                      )}
                      {tr.toMemberId === group.myMemberId && myQrs.length > 0 && (
                        <Button size="sm" variant="ghost" leading={<ScanLine className="size-4" />} onClick={() => setQrFor(tr)}>
                          {tq("show")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </List>
        )}
        {group.simplifyDebts && group.transfers.length > 0 && (
          <p className="mt-2 px-1 text-[13px] text-fg-subtle">{t("simplifyNote")}</p>
        )}
      </section>

      <section>
        <SectionHeader title={t("balances")} />
        <List>
          {people.map((m) => {
            const b = group.balances[m.id] ?? 0;
            return (
              <div key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <Avatar id={m.id} name={m.displayName} image={m.image} size="md" pending={!m.claimed} />
                <span className="min-w-0 flex-1 truncate text-[16px] font-[540]">{m.isMe ? t("you") : m.displayName}</span>
                <span className="text-end leading-tight">
                  {b === 0 ? (
                    <span className="text-fg-subtle">{t("settled")}</span>
                  ) : (
                    <>
                      <span className="block text-[12px] text-fg-muted">
                        {t("memberBalance", { who: m.isMe ? "me" : "other", state: b > 0 ? "back" : "owes" })}
                      </span>
                      <Money minor={b} currency={group.currency} tone="auto" absolute className="font-wide text-[16px] font-[620]" />
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </List>
        <p className="mt-2 px-1 text-[13px] text-fg-subtle">
          {t.rich("totalSpent", { amount: () => <Money minor={group.totalSpent} currency={group.currency} /> })}
        </p>
        {group.totalSpent > 0 && (
          <Link href={`/recap?id=${group.id}`} className="mt-3 inline-flex items-center gap-1 rounded-full px-1 py-1 text-[15px] font-[600] text-positive">
            {trecap("link")} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
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
  const [remind, setRemind] = useState<TransferDto | null>(null);
  const [openExpense, setOpenExpense] = useState<ExpenseDto | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const t = useTranslations("group");
  const tc = useTranslations("common");

  if (!id || (group.error instanceof ApiError && group.error.status === 404)) {
    return (
      <PageBody className="pt-16">
        <ErrorState title={t("notFoundTitle")} body={t("notFoundBody")} />
        <div className="flex justify-center">
          <Link href="/groups" className="font-medium text-positive">
            {t("backToGroups")}
          </Link>
        </div>
      </PageBody>
    );
  }
  if (group.isPending) {
    return (
      <>
        <PageHeader title={<Skeleton className="h-8 w-48" />} back={{ href: "/groups", label: t("groups") }} />
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
        back={{ href: "/groups", label: t("groups") }}
        leading={<GroupMark id={g.id} type={g.type} size="lg" />}
        title={g.name}
        subtitle={
          <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-2 hover:text-fg">
            <AvatarStack people={active.map((m) => ({ id: m.id, name: m.displayName, image: m.image }))} max={5} size="xs" />
            {t("people", { count: active.length })} · {g.currency}
          </button>
        }
        actions={
          <>
            <IconButton label={t("invitePeople")} variant="solid" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus />
            </IconButton>
            <IconButton label={t("settings")} variant="solid" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </>
        }
      />
      <PageBody>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="flex items-end gap-5">
          {celebrate && g.myBalance === 0 ? (
            <div>
              <p className="text-[17px] text-fg-muted">{t("myBalance", { state: "settled" })}</p>
              <div className="mt-3">
                <SettledCheck />
              </div>
            </div>
          ) : (
            <BalanceStatement
              label={t("myBalance", { state: g.myBalance > 0 ? "owed" : g.myBalance < 0 ? "owe" : "settled" })}
              minor={g.myBalance}
              currency={g.currency}
              settledText={g.transfers.length === 0 ? t("everyoneSettled") : undefined}
            />
          )}
          <SettleRing outstanding={g.transfers.reduce((sum, tr) => sum + tr.amount, 0)} spent={g.totalSpent} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              leading={<ArrowRightLeft className="size-[18px]" />}
              disabled={g.transfers.length === 0}
              onClick={() => {
                if (myTransfer) setSettle(myTransfer);
                else setTab("balances");
              }}
            >
              {t("settleUp")}
            </Button>
            <Button variant="secondary" leading={<Plus className="size-[18px]" />} className="max-lg:hidden" onClick={() => openAddExpense({ groupId: g.id })}>
              {tc("addExpense")}
            </Button>
          </div>
        </div>

        {active.length === 1 && (
          <Card className="flex items-center gap-4 p-4">
            <span className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-positive">
              <UserPlus className="size-5" />
            </span>
            <span className="flex-1 text-[15px] leading-snug">
              <span className="block font-[600]">{t("justYouTitle")}</span>
              <span className="text-fg-muted">{t("justYouBody")}</span>
            </span>
            <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>
              {t("invite")}
            </Button>
          </Card>
        )}

        <Segmented<Tab>
          label={t("show")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "expenses", label: t("expenses") },
            { value: "balances", label: t("balances") },
          ]}
        />

        {tab === "expenses" ? (
          <>
            <RepeatingSection group={g} />
            <ExpensesTab group={g} onOpen={setOpenExpense} />
          </>
        ) : (
          <BalancesTab group={g} onSettle={setSettle} onRemind={setRemind} />
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
      <RemindSheet group={g} transfer={remind} onClose={() => setRemind(null)} />
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
