import { useEntityHistory, useGroup, useMe, useSetExpenseDeleted } from "@settlemint/client/data/queries";
import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { describeActivity } from "@settlemint/client/text/activity-text";
import { dayLabel, timeAgo } from "@settlemint/client/text/dates";
import { getCategoryMeta } from "@settlemint/shared";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { CategoryTile } from "@/ui/glyphs";
import { Screen } from "@/ui/screen";
import { Avatar, Card, Loading, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

export default function ExpenseDetail() {
  const { id, groupId } = useLocalSearchParams<{ id: string; groupId: string }>();
  const { c, radius } = useTheme();
  const locale = useLocale();
  const me = useMe();
  const group = useGroup(groupId ?? null);
  const expense = useQuery({ queryKey: ["expense", id], queryFn: () => api.expenses.get(id!), enabled: Boolean(id) });
  const setDeleted = useSetExpenseDeleted(groupId ?? "");
  const history = useEntityHistory(groupId ?? "", id ?? null);
  const t = useTranslations("expenseDetail");
  const tc = useTranslations("common");
  const ta = useTranslations("activity");
  const tcat = useTranslations("categories");
  const tm = useTranslations("split");

  if (!expense.data || !group.data) return <Loading />;
  const e = expense.data;
  const g = group.data;
  const cat = getCategoryMeta(e.category);
  const member = (mid: string) => g.members.find((m) => m.id === mid);
  const payers = e.lines.filter((l) => l.paid > 0);
  const owers = e.lines.filter((l) => l.owed > 0);

  const remove = () => {
    setDeleted.mutate({ id: e.id, deleted: true });
    router.back();
    toast.info(t("deleted"), {
      description: e.description,
      action: {
        label: tc("undo"),
        onPress: () => setDeleted.mutate({ id: e.id, deleted: false }, { onSuccess: () => toast.success(t("restored")) }),
      },
    });
  };

  const person = (mid: string, amount: number, muted?: boolean) => {
    const m = member(mid);
    return (
      <View key={mid} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 }}>
        <Avatar name={m?.displayName ?? "?"} size={32} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {m?.isMe ? tc("you") : m?.displayName}
          {m?.left ? <Text variant="caption" tone="subtle">{` ${t("left")}`}</Text> : null}
        </Text>
        <Money minor={amount} currency={e.currency} tone={muted ? "muted" : "fg"} />
      </View>
    );
  };

  return (
    <Screen sheet headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />} title={e.description}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <CategoryTile category={cat.id} size={56} />
        <View style={{ gap: 2 }}>
          <Money minor={e.amount} currency={e.currency} variant="title" />
          <Text variant="sub" tone="muted">
            {tcat(cat.id as CategoryKey)} · {dayLabel(e.date, locale)}
          </Text>
        </View>
      </View>

      {e.currency !== g.currency && (
        <View style={{ backgroundColor: c.infoSoft, borderRadius: radius.md, padding: 12 }}>
          <Text variant="sub" style={{ color: c.info }}>
            {t.rich("fx", {
              amount: () => <Money minor={e.groupAmount} currency={g.currency} variant="sub" style={{ color: c.info }} />,
              from: e.currency,
              rate: Number(e.fxRate).toLocaleString(locale, { maximumFractionDigits: 6 }),
              to: g.currency,
            })}
          </Text>
        </View>
      )}

      <Card style={{ gap: 4 }}>
        <SectionHeader title={t("paidBy")} />
        {payers.map((l) => person(l.memberId, l.paid))}
        <SectionHeader title={`${t("split")}${e.split.method !== "itemized" ? ` · ${tm(`method.${e.split.method}`)}` : ""}`} />
        {owers.map((l) => person(l.memberId, l.owed, true))}
      </Card>

      {e.notes ? (
        <Card>
          <Text>{e.notes}</Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          variant="secondary"
          icon="pencil"
          style={{ flex: 1 }}
          onPress={() => router.replace({ pathname: "/add-expense", params: { expenseId: e.id, groupId: g.id } })}
        >
          {tc("edit")}
        </Button>
        <Button variant="danger" icon="trash-outline" style={{ flex: 1 }} onPress={remove}>
          {tc("delete")}
        </Button>
      </View>

      <View>
        <SectionHeader title={t("history")} />
        <View style={{ gap: 10, borderStartWidth: 1, borderStartColor: c.line, paddingStart: 14 }}>
          {(history.data?.items ?? []).map((h) => (
            <View key={h.id}>
              <Text variant="sub">{describeActivity(h, me.data?.id, ta).text}</Text>
              <Text variant="caption" tone="subtle">
                {timeAgo(h.createdAt, locale)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
