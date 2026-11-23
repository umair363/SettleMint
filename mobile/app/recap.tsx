import { buildRecap } from "@settlemint/client/data/recap";
import { useExpenses, useGroup } from "@settlemint/client/data/queries";
import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { formatMoney } from "@settlemint/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { Share, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { CategoryTile } from "@/ui/glyphs";
import { Screen } from "@/ui/screen";
import { BalanceStatement } from "@/ui/statement";
import { Avatar, Card, Divider, Empty, Loading, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";

function Bar({ share }: { share: number }) {
  const { c } = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface3, overflow: "hidden", marginTop: 8 }}>
      <View style={{ height: 6, borderRadius: 3, width: `${Math.max(3, Math.round(share * 100))}%`, backgroundColor: c.accent }} />
    </View>
  );
}

/** Where a group's money went and who fronted it. */
export default function Recap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id ?? null);
  const expenses = useExpenses(id ?? null);
  const locale = useLocale();
  const t = useTranslations("recap");
  const tc = useTranslations("common");
  const tcat = useTranslations("categories");

  // The recap needs every expense, so keep loading pages until there are none left.
  useEffect(() => {
    if (expenses.hasNextPage && !expenses.isFetchingNextPage) void expenses.fetchNextPage();
  }, [expenses]);

  const recap = useMemo(
    () => (group.data && expenses.data ? buildRecap(group.data, expenses.data.pages.flatMap((p) => p.items)) : null),
    [group.data, expenses.data],
  );
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));

  if (group.isPending || expenses.isPending || expenses.hasNextPage || !group.data || !recap) return <Loading />;
  const g = group.data;
  const period = recap.firstDate && recap.lastDate ? (recap.firstDate === recap.lastDate ? date(recap.firstDate) : `${date(recap.firstDate)} – ${date(recap.lastDate)}`) : "";
  const context = [t("count", { count: recap.count }), period].filter(Boolean).join(" · ");

  const share = () => {
    const money = (m: number) => formatMoney(m, g.currency, { locale });
    const lines = [
      `${g.name} · ${t("title")}`,
      `${t("spent")}: ${money(recap.total)} (${context})`,
      "",
      t("where"),
      ...recap.byCategory.map((c) => `• ${tcat(c.category as CategoryKey)}: ${money(c.amount)}`),
      "",
      t("whoPaid"),
      ...recap.byPayer.map((p) => `• ${p.name}: ${money(p.amount)}`),
    ];
    void Share.share({ message: lines.join("\n") });
  };

  return (
    <Screen
      title={t("title")}
      subtitle={g.name}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
    >
      {recap.count === 0 ? (
        <Card>
          <Empty icon="stats-chart" title={t("title")} body={t("empty")} />
        </Card>
      ) : (
        <>
          <BalanceStatement label={t("spent")} minor={recap.total} currency={g.currency} context={context} />

          <View>
            <SectionHeader title={t("where")} />
            <Card padded={false}>
              {recap.byCategory.map((c, i) => (
                <View key={c.category}>
                  {i > 0 && <Divider inset={68} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                    <CategoryTile category={c.category} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                          {tcat(c.category as CategoryKey)}
                        </Text>
                        <Money minor={c.amount} currency={g.currency} variant="bodyStrong" />
                      </View>
                      <Bar share={c.amount / recap.byCategory[0].amount} />
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          <View>
            <SectionHeader title={t("whoPaid")} />
            <Card padded={false}>
              {recap.byPayer.map((p, i) => (
                <View key={p.memberId}>
                  {i > 0 && <Divider inset={68} />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                    <Avatar id={p.memberId} name={p.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                        <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, fontWeight: "700" }}>
                          {p.name}
                        </Text>
                        <Money minor={p.amount} currency={g.currency} variant="bodyStrong" />
                      </View>
                      <Bar share={p.amount / recap.byPayer[0].amount} />
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          {recap.biggest && (
            <View>
              <SectionHeader title={t("biggest")} />
              <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading" numberOfLines={1}>
                    {recap.biggest.description}
                  </Text>
                  <Text tone="muted">{date(recap.biggest.date)}</Text>
                </View>
                <Money minor={recap.biggest.amount} currency={g.currency} variant="heading" />
              </Card>
            </View>
          )}

          <Button size="lg" icon="share-outline" onPress={share}>
            {t("share")}
          </Button>
        </>
      )}
    </Screen>
  );
}
