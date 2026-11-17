import { Ionicons } from "@expo/vector-icons";
import { useExpenses, useGroup, useSetExpenseDeleted, useSettlements } from "@settlemint/client/data/queries";
import { dayLabel } from "@settlemint/client/text/dates";
import { reminderText } from "@settlemint/client/text/reminder";
import { ApiError, getCategoryMeta, type ExpenseDto, type GroupDetailDto, type SettlementDto, type TransferDto } from "@settlemint/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { GroupIcon } from "@/features/rows";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Avatar, Card, Divider, Empty, Loading, Money, Row, SectionHeader, Segmented } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

const nameOf = (group: GroupDetailDto, memberId: string, someone: string) =>
  group.members.find((x) => x.id === memberId)?.displayName ?? someone;

/** out: I pay them, in: they pay me, other: between two others. */
const direction = (group: GroupDetailDto, fromId: string, toId: string) =>
  fromId === group.myMemberId ? "out" : toId === group.myMemberId ? "in" : "other";

function ExpenseRow({ group, expense, onDelete }: { group: GroupDetailDto; expense: ExpenseDto; onDelete: () => void }) {
  const { c, radius } = useTheme();
  const t = useTranslations("group");
  const cat = getCategoryMeta(expense.category);
  const saving = expense.lines.length === 0;
  const payers = expense.lines.filter((l) => l.paid > 0);
  const mine = expense.lines.find((l) => l.memberId === group.myMemberId);
  const myNet = mine ? mine.paidGroup - mine.owedGroup : 0;
  const payerText =
    payers.length === 1
      ? t("onePaid", { who: payers[0].memberId === group.myMemberId ? "me" : "other", name: nameOf(group, payers[0].memberId, t("someone")) })
      : payers.length > 1
        ? t("manyPaid", { count: payers.length })
        : t("savingDots");

  return (
    <Pressable
      accessibilityRole="button"
      disabled={saving}
      onPress={() => router.push({ pathname: "/expense/[id]", params: { id: expense.id, groupId: group.id } })}
      onLongPress={onDelete}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? c.surface2 : "transparent",
        opacity: saving ? 0.6 : 1,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, lineHeight: 26 }}>{cat.emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {expense.recurringRuleId ? "🔁 " : ""}
          {expense.description}
        </Text>
        <Text variant="sub" tone="muted" numberOfLines={1}>
          {payerText} <Money minor={expense.amount} currency={expense.currency} variant="sub" tone="muted" />
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {saving ? (
          <Text variant="caption" tone="subtle">
            {t("saving")}
          </Text>
        ) : !mine ? (
          <Text variant="caption" tone="subtle">
            {t("notInvolved")}
          </Text>
        ) : myNet === 0 ? (
          <Text variant="caption" tone="subtle">
            {t("noBalance")}
          </Text>
        ) : (
          <>
            <Text variant="caption" tone="muted">
              {myNet > 0 ? t("youLent") : t("youBorrowed")}
            </Text>
            <Money minor={myNet} currency={group.currency} tone="auto" variant="bodyStrong" />
          </>
        )}
      </View>
    </Pressable>
  );
}

function SettlementRow({ group, settlement }: { group: GroupDetailDto; settlement: SettlementDto }) {
  const { c } = useTheme();
  const t = useTranslations("settle");
  return (
    <Row
      leading={
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.positiveSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="swap-horizontal" size={18} color={c.positive} />
        </View>
      }
      title={t("paidLine", {
        dir: direction(group, settlement.fromMemberId, settlement.toMemberId),
        from: nameOf(group, settlement.fromMemberId, t("you")),
        to: nameOf(group, settlement.toMemberId, t("you")),
      })}
      trailing={<Money minor={settlement.amount} currency={settlement.currency} tone="positive" variant="bodyStrong" />}
    />
  );
}

type FeedItem =
  | { kind: "expense"; date: string; createdAt: string; expense: ExpenseDto }
  | { kind: "settlement"; date: string; createdAt: string; settlement: SettlementDto };

function ExpensesTab({ group }: { group: GroupDetailDto }) {
  const locale = useLocale();
  const t = useTranslations("group");
  const tc = useTranslations("common");
  const expenses = useExpenses(group.id);
  const settlements = useSettlements(group.id);
  const setDeleted = useSetExpenseDeleted(group.id);

  const days = useMemo(() => {
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

  const remove = (e: ExpenseDto) => {
    setDeleted.mutate({ id: e.id, deleted: true });
    toast.info(t("expenseDeleted"), {
      description: e.description,
      action: { label: tc("undo"), onPress: () => setDeleted.mutate({ id: e.id, deleted: false }) },
    });
  };

  if (expenses.isPending) return <Loading />;
  if (days.length === 0) {
    return (
      <Card>
        <Empty
          icon="receipt"
          title={t("noExpensesTitle")}
          body={t("noExpensesBody")}
          action={tc("addExpense")}
          onAction={() => router.push({ pathname: "/add-expense", params: { groupId: group.id } })}
        />
      </Card>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {days.map(([day, items]) => (
        <View key={day}>
          <SectionHeader title={dayLabel(day, locale)} />
          <Card padded={false}>
            {items.map((item, i) => (
              <View key={item.kind === "expense" ? item.expense.id : item.settlement.id}>
                {i > 0 && <Divider inset={68} />}
                {item.kind === "expense" ? (
                  <ExpenseRow group={group} expense={item.expense} onDelete={() => remove(item.expense)} />
                ) : (
                  <SettlementRow group={group} settlement={item.settlement} />
                )}
              </View>
            ))}
          </Card>
        </View>
      ))}
      {expenses.hasNextPage && (
        <Button variant="secondary" loading={expenses.isFetchingNextPage} onPress={() => void expenses.fetchNextPage()}>
          {t("showOlder")}
        </Button>
      )}
    </View>
  );
}

function settleParams(group: GroupDetailDto, tr: TransferDto) {
  return { groupId: group.id, from: tr.fromMemberId, to: tr.toMemberId, amount: String(tr.amount) };
}

function BalancesTab({ group }: { group: GroupDetailDto }) {
  const t = useTranslations("group");
  const locale = useLocale();
  const active = group.members.filter((m) => !m.left || (group.balances[m.id] ?? 0) !== 0);

  return (
    <View style={{ gap: 12 }}>
      <View>
        <SectionHeader title={group.simplifyDebts ? t("suggestedPayments") : t("whoOwesWhom")} />
        <Card padded={false}>
          {group.transfers.length === 0 ? (
            <Empty icon="checkmark-done" title={t("everyoneSettled")} body={t("nobodyOwes")} />
          ) : (
            group.transfers.map((tr, i) => {
              const dir = direction(group, tr.fromMemberId, tr.toMemberId);
              return (
                <View key={`${tr.fromMemberId}-${tr.toMemberId}`}>
                  {i > 0 && <Divider />}
                  <View style={{ padding: 16, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={{ flex: 1 }}>
                        {t.rich("owes", {
                          dir,
                          from: nameOf(group, tr.fromMemberId, t("someone")),
                          to: nameOf(group, tr.toMemberId, t("someone")),
                          b: (chunks) => <Text variant="bodyStrong">{chunks}</Text>,
                        })}
                      </Text>
                      <Money minor={tr.amount} currency={group.currency} variant="bodyStrong" tone={dir === "out" ? "negative" : dir === "in" ? "positive" : "fg"} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                      {dir === "in" && (
                        <Button
                          variant="secondary"
                          icon="notifications-outline"
                          onPress={() => void Share.share({ message: reminderText(group, tr, locale) })}
                        >
                          {t("remind")}
                        </Button>
                      )}
                      <Button
                        variant={dir === "out" ? "primary" : "secondary"}
                        onPress={() => router.push({ pathname: "/settle", params: settleParams(group, tr) })}
                      >
                        {dir === "out" ? t("pay") : t("record")}
                      </Button>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>
        {group.simplifyDebts && group.transfers.length > 0 && (
          <Text variant="caption" tone="subtle" style={{ marginTop: 8, paddingHorizontal: 4 }}>
            {t("simplifyNote")}
          </Text>
        )}
      </View>

      <View>
        <SectionHeader title={t("balances")} />
        <Card padded={false}>
          {active.map((m, i) => {
            const b = group.balances[m.id] ?? 0;
            return (
              <View key={m.id}>
                {i > 0 && <Divider inset={64} />}
                <Row
                  leading={<Avatar name={m.displayName} size={36} />}
                  title={m.isMe ? t("you") : m.displayName}
                  trailing={
                    b === 0 ? (
                      <Text variant="sub" tone="subtle">
                        {t("settled")}
                      </Text>
                    ) : (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text variant="caption" tone="muted">
                          {t("memberBalance", { who: m.isMe ? "me" : "other", state: b > 0 ? "back" : "owes" })}
                        </Text>
                        <Money minor={b} currency={group.currency} tone="auto" variant="bodyStrong" />
                      </View>
                    )
                  }
                />
              </View>
            );
          })}
        </Card>
        <Text variant="caption" tone="subtle" style={{ marginTop: 8, paddingHorizontal: 4 }}>
          {t.rich("totalSpent", { amount: () => <Money minor={group.totalSpent} currency={group.currency} variant="caption" tone="muted" /> })}
        </Text>
      </View>
    </View>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const t = useTranslations("group");
  const tc = useTranslations("common");
  const group = useGroup(id ?? null);
  const expenses = useExpenses(id ?? null);
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");

  if (group.isPending) return <Loading />;
  if (!group.data) {
    const gone = group.error instanceof ApiError && (group.error.status === 404 || group.error.status === 403);
    return (
      <Screen>
        <Empty
          icon={gone ? "help-circle" : "cloud-offline"}
          title={gone ? t("notFoundTitle") : t("notFoundTitle")}
          body={gone ? t("notFoundBody") : undefined}
          action={t("backToGroups")}
          onAction={() => router.replace("/groups")}
        />
      </Screen>
    );
  }

  const g = group.data;
  const active = g.members.filter((m) => !m.left);
  const myTransfer = g.transfers.find((tr) => tr.fromMemberId === g.myMemberId || tr.toMemberId === g.myMemberId);
  const tint = g.myBalance > 0 ? c.positiveSoft : g.myBalance < 0 ? c.negativeSoft : c.surface;

  return (
    <Screen
      onRefresh={() => void Promise.all([group.refetch(), expenses.refetch()])}
      refreshing={group.isRefetching}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconButton icon="chevron-back" label={t("groups")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/groups"))} />
        <View style={{ flex: 1 }} />
        <IconButton icon="person-add" label={t("invitePeople")} onPress={() => router.push({ pathname: "/invite", params: { groupId: g.id } })} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <GroupIcon type={g.type} emoji={g.emoji} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" accessibilityRole="header" numberOfLines={2}>
            {g.name}
          </Text>
          <Text variant="sub" tone="muted">
            {t("people", { count: active.length })} · {g.currency}
          </Text>
        </View>
      </View>

      <Card style={{ backgroundColor: tint, padding: 20, gap: 16 }}>
        <View style={{ gap: 2 }}>
          <Text variant="sub" tone="muted">
            {t("myBalance", { state: g.myBalance > 0 ? "owed" : g.myBalance < 0 ? "owe" : "settled" })}
          </Text>
          <Money minor={g.myBalance} currency={g.currency} tone="auto" variant="display" />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button icon="add" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/add-expense", params: { groupId: g.id } })}>
            {tc("addExpense")}
          </Button>
          <Button
            variant="secondary"
            icon="swap-horizontal"
            style={{ flex: 1 }}
            disabled={g.transfers.length === 0}
            onPress={() => {
              if (myTransfer) router.push({ pathname: "/settle", params: settleParams(g, myTransfer) });
              else setTab("balances");
            }}
          >
            {t("settleUp")}
          </Button>
        </View>
      </Card>

      {active.length === 1 && (
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name="people" size={22} color={c.positive} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{t("justYouTitle")}</Text>
            <Text variant="sub" tone="muted">
              {t("justYouBody")}
            </Text>
          </View>
          <Button variant="secondary" onPress={() => router.push({ pathname: "/invite", params: { groupId: g.id } })}>
            {t("invite")}
          </Button>
        </Card>
      )}

      <Segmented
        label={t("show")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "expenses", label: t("expenses") },
          { value: "balances", label: t("balances") },
        ]}
      />
      {tab === "expenses" ? <ExpensesTab group={g} /> : <BalancesTab group={g} />}
    </Screen>
  );
}
