import { totalsByCurrency, useActivity, useGroups, useMe } from "@settlemint/client/data/queries";
import { router } from "expo-router";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { ActivityRow, GroupRow } from "@/features/rows";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Card, Divider, Empty, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";

function partOfDay() {
  const h = new Date().getHours();
  return h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function BalanceHero() {
  const { c } = useTheme();
  const groups = useGroups();
  const t = useTranslations("home");
  const totals = totalsByCurrency(groups.data);
  const mood = totals.reduce((s, x) => s + Math.sign(x.net), 0);
  const tint = mood > 0 ? c.positiveSoft : mood < 0 ? c.negativeSoft : c.surface;

  return (
    <Card style={{ backgroundColor: tint, padding: 20 }}>
      {totals.length === 0 ? (
        <View style={{ gap: 4 }}>
          <Text variant="sub" tone="muted">
            {t("yourBalance")}
          </Text>
          <Text variant="title">{t("allSettled")}</Text>
          <Text variant="sub" tone="muted">
            {t("nobodyOwes")}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {totals.map((b) => (
            <View key={b.currency} style={{ gap: 2 }}>
              <Text variant="sub" tone="muted">
                {t("overall", { state: b.net > 0 ? "owed" : b.net < 0 ? "owe" : "even" })}
              </Text>
              <Money minor={b.net} currency={b.currency} tone="auto" variant="display" />
              {b.owed > 0 && b.owe > 0 && (
                <Text variant="sub" tone="muted">
                  {t.rich("owedAndOwe", {
                    owed: () => <Money minor={b.owed} currency={b.currency} tone="positive" variant="sub" />,
                    owe: () => <Money minor={b.owe} currency={b.currency} tone="negative" variant="sub" />,
                  })}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function Home() {
  const me = useMe();
  const groups = useGroups();
  const activity = useActivity();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const ts = useTranslations("search");
  const firstName = me.data?.isGuest ? "" : (me.data?.name.split(" ")[0] ?? "");
  const active = (groups.data ?? []).filter((g) => !g.archived);
  const recent = activity.data?.pages[0]?.items.slice(0, 5) ?? [];
  const isNew = groups.isSuccess && active.length === 0;

  const refresh = () => void Promise.all([groups.refetch(), activity.refetch()]);

  return (
    <Screen
      title={t("greeting", { part: partOfDay(), name: firstName || "none" })}
      headerRight={<IconButton icon="search" label={ts("title")} onPress={() => router.push("/search")} />}
      onRefresh={refresh}
      refreshing={groups.isRefetching}
    >
      {isNew ? (
        <Card>
          <Empty
            icon="sparkles"
            title={t("firstBillTitle")}
            body={t("firstBillBody")}
            action={t("createGroup")}
            onAction={() => router.push("/new-group")}
          />
          <Text variant="sub" tone="muted" center style={{ paddingBottom: 4 }}>
            {t("haveInvite")}
          </Text>
          <Button variant="ghost" onPress={() => router.push("/import")}>
            {t("fromSplitwise")}
          </Button>
        </Card>
      ) : (
        <>
          <BalanceHero />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button variant="secondary" size="lg" icon="add" style={{ flex: 1 }} onPress={() => router.push("/add-expense")}>
              {tc("addExpense")}
            </Button>
            <Button variant="secondary" size="lg" icon="people" style={{ flex: 1 }} onPress={() => router.push("/new-group")}>
              {t("newGroup")}
            </Button>
          </View>

          <View>
            <SectionHeader
              title={t("groups")}
              action={
                <Button variant="ghost" onPress={() => router.push("/groups")}>
                  {tc("all")}
                </Button>
              }
            />
            <Card padded={false}>
              {active.slice(0, 5).map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <Divider inset={72} />}
                  <GroupRow group={g} />
                </View>
              ))}
            </Card>
          </View>

          <View>
            <SectionHeader
              title={t("recentActivity")}
              action={
                <Button variant="ghost" onPress={() => router.push("/activity")}>
                  {tc("all")}
                </Button>
              }
            />
            <Card padded={false}>
              {recent.length === 0 ? (
                <Empty icon="pulse" title={t("nothingYet")} body={t("activityEmpty")} />
              ) : (
                recent.map((e, i) => (
                  <View key={e.id}>
                    {i > 0 && <Divider inset={68} />}
                    <ActivityRow event={e} myUserId={me.data?.id} />
                  </View>
                ))
              )}
            </Card>
          </View>
        </>
      )}
    </Screen>
  );
}
