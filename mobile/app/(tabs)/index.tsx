import { totalsByCurrency, useActivity, useGroups, useMe, usePeople } from "@settlemint/client/data/queries";
import { listablePeople } from "@settlemint/client/data/people";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { ActivityRow, GroupRow, PersonRow } from "@/features/rows";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { BalanceStatement } from "@/ui/statement";
import { Card, Divider, Empty, Money, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";

function partOfDay() {
  const h = new Date().getHours();
  return h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

/** Where you stand, as a sentence: one big figure, other currencies as quiet lines. */
function Standing() {
  const groups = useGroups();
  const t = useTranslations("home");
  const totals = totalsByCurrency(groups.data);
  const lead = totals[0];
  if (!lead) {
    return <BalanceStatement label={t("yourBalance")} minor={0} currency="USD" settledText={t("allSettled")} context={t("nobodyOwes")} />;
  }
  const count = (groups.data ?? []).filter((g) => !g.archived && g.currency === lead.currency && g.myBalance !== 0).length;
  return (
    <BalanceStatement
      label={t("overall", { state: lead.net > 0 ? "owed" : lead.net < 0 ? "owe" : "even" })}
      minor={lead.net}
      currency={lead.currency}
      context={t("acrossGroups", { count })}
    >
      {totals.slice(1).map((b) => (
        <View key={b.currency} style={{ flexDirection: "row", gap: 8, alignItems: "baseline", marginTop: 6 }}>
          <Money minor={b.net} currency={b.currency} tone="auto" variant="bodyStrong" />
          <Text tone="muted">{t("overall", { state: b.net > 0 ? "owed" : b.net < 0 ? "owe" : "even" })}</Text>
        </View>
      ))}
    </BalanceStatement>
  );
}

/** An inset list: rows in one card, separated by hairlines. */
function List({ children }: { children: ReactNode[] }) {
  return (
    <Card padded={false}>
      {children.map((child, i) => (
        <View key={i}>
          {i > 0 && <Divider inset={72} />}
          {child}
        </View>
      ))}
    </Card>
  );
}

export default function Home() {
  const me = useMe();
  const groups = useGroups();
  const activity = useActivity();
  const people = listablePeople(usePeople().data);
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const tg = useTranslations("groups");
  const tp = useTranslations("people");
  const ts = useTranslations("search");
  const firstName = me.data?.isGuest ? "" : (me.data?.name.split(" ")[0] ?? "");
  const everyone = (groups.data ?? []).filter((g) => !g.archived);
  const friends = everyone.filter((g) => g.type === "direct");
  const active = everyone.filter((g) => g.type !== "direct");
  const recent = activity.data?.pages[0]?.items.slice(0, 5) ?? [];
  const isNew = groups.isSuccess && everyone.length === 0;

  const refresh = () => void Promise.all([groups.refetch(), activity.refetch()]);
  const addFriend = () => router.push({ pathname: "/new-group", params: { friend: "1" } });

  return (
    <Screen
      title={t("greeting", { part: partOfDay(), name: firstName || "none" })}
      headerRight={<IconButton icon="search" label={ts("title")} onPress={() => router.push("/search")} />}
      onRefresh={refresh}
      refreshing={groups.isRefetching}
    >
      {isNew ? (
        <Card>
          <Empty icon="sparkles" title={t("firstBillTitle")} body={t("firstBillBody")} />
          <View style={{ gap: 8, paddingBottom: 8 }}>
            <Button size="lg" icon="person-add" onPress={addFriend}>
              {tg("addFriend")}
            </Button>
            <Button size="lg" variant="secondary" icon="add" onPress={() => router.push("/new-group")}>
              {t("createGroup")}
            </Button>
          </View>
          <Text variant="sub" tone="muted" center style={{ paddingTop: 8 }}>
            {t("haveInvite")}
          </Text>
          <View style={{ alignItems: "center" }}>
            <Button variant="ghost" onPress={() => router.push("/import")}>
              {t("fromSplitwise")}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <Standing />

          {friends.length > 0 && (
            <View>
              <SectionHeader
                title={tg("friends")}
                action={
                  <Button variant="ghost" icon="person-add" onPress={addFriend}>
                    {tg("addFriend")}
                  </Button>
                }
              />
              <List>{friends.slice(0, 5).map((g) => <GroupRow key={g.id} group={g} />)}</List>
            </View>
          )}

          {people.length > 0 && (
            <View>
              <SectionHeader title={tp("title")} />
              <List>{people.slice(0, 5).map((p) => <PersonRow key={p.key} person={p} />)}</List>
            </View>
          )}

          <View>
            <SectionHeader
              title={t("groups")}
              action={
                <View style={{ flexDirection: "row" }}>
                  {friends.length === 0 && (
                    <Button variant="ghost" icon="person-add" onPress={addFriend}>
                      {tg("addFriend")}
                    </Button>
                  )}
                  <Button variant="ghost" icon="add" onPress={() => router.push("/new-group")}>
                    {t("newGroup")}
                  </Button>
                </View>
              }
            />
            {active.length > 0 && <List>{active.slice(0, 5).map((g) => <GroupRow key={g.id} group={g} />)}</List>}
            {active.length > 5 && (
              <Button variant="ghost" onPress={() => router.push("/groups")}>
                {tc("all")}
              </Button>
            )}
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
