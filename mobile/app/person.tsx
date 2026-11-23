import { usePeople } from "@settlemint/client/data/queries";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { BalanceLabel, GroupIcon } from "@/features/rows";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { BalanceStatement } from "@/ui/statement";
import { Avatar, Card, Divider, Empty, Loading, Money, Row, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";

/** One person across every group you share: a single balance, and the groups behind it. */
export default function Person() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const people = usePeople();
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const person = people.data?.find((p) => p.key === key);

  if (people.isPending) return <Loading />;
  if (!person) {
    return (
      <Screen headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}>
        <Empty icon="person" title={t("title")} />
      </Screen>
    );
  }

  const lead = person.totals[0];
  // Adding an expense with them goes to your one-to-one group if there is one, else the group you share.
  const target = person.groups.find((g) => g.type === "direct") ?? person.groups[0];
  return (
    <Screen onRefresh={() => void people.refetch()} refreshing={people.isRefetching}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <IconButton icon="chevron-back" label={tc("back")} onPress={() => (router.canGoBack() ? router.back() : router.replace("/groups"))} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar id={person.key} name={person.name} size={56} />
        <Text variant="title" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>
          {person.name}
        </Text>
      </View>

      <BalanceStatement
        label={lead ? (lead.amount > 0 ? t("owesYou", { name: person.name }) : t("youOwe", { name: person.name })) : t("square", { name: person.name })}
        minor={lead?.amount ?? 0}
        currency={lead?.currency ?? "USD"}
        settledText="✓"
        context={t("shared", { count: person.groups.length })}
      >
        {person.totals.slice(1).map((x) => (
          <View key={x.currency} style={{ flexDirection: "row", gap: 8, alignItems: "baseline", marginTop: 6 }}>
            <Money minor={x.amount} currency={x.currency} tone="auto" variant="bodyStrong" />
            <Text tone="muted">{x.amount > 0 ? t("owesYou", { name: person.name }) : t("youOwe", { name: person.name })}</Text>
          </View>
        ))}
      </BalanceStatement>

      {target && (
        <Button
          variant="secondary"
          size="lg"
          icon="add"
          onPress={() => router.push({ pathname: "/add-expense", params: { groupId: target.id } })}
        >
          {tc("addExpense")}
        </Button>
      )}

      <View>
        <SectionHeader title={t("sharedGroups")} />
        <Card padded={false}>
          {person.groups.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <Divider inset={72} />}
              <Row
                onPress={() => router.push({ pathname: "/group/[id]", params: { id: g.id } })}
                leading={<GroupIcon id={g.id} type={g.type} />}
                title={g.name}
                trailing={<BalanceLabel minor={g.amount} currency={g.currency} />}
              />
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
