import { FriendRequests } from "@/features/friends";
import { useGroups, usePeople } from "@settlemint/client/data/queries";
import { listablePeople } from "@settlemint/client/data/people";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { GroupRow, PersonRow } from "@/features/rows";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Card, Divider, Empty, Loading, SectionHeader } from "@/ui/surface";

export default function Groups() {
  const groups = useGroups();
  const people = listablePeople(usePeople().data);
  const t = useTranslations("groups");
  const tp = useTranslations("people");
  const [showArchived, setShowArchived] = useState(false);
  const all = groups.data ?? [];
  const active = all.filter((g) => !g.archived && g.type !== "direct");
  const friends = all.filter((g) => !g.archived && g.type === "direct");
  const archived = all.filter((g) => g.archived);
  const addFriend = () => router.push({ pathname: "/new-group", params: { friend: "1" } });

  return (
    <Screen
      title={t("title")}
      headerRight={
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton icon="person-add" label={t("addFriend")} onPress={addFriend} />
          <IconButton icon="add" tone="accent" label={t("newGroup")} onPress={() => router.push("/new-group")} />
        </View>
      }
      onRefresh={() => void groups.refetch()}
      refreshing={groups.isRefetching}
    >
      <FriendRequests />
      {groups.isPending ? (
        <Loading />
      ) : active.length === 0 && friends.length === 0 ? (
        <Card>
          <Empty icon="people" title={t("emptyTitle")} body={t("emptyBody")} action={t("addFriend")} onAction={addFriend} />
          <Button variant="ghost" onPress={() => router.push("/new-group")}>
            {t("create")}
          </Button>
        </Card>
      ) : (
        <>
          {friends.length > 0 && (
            <View>
              <SectionHeader title={t("friends")} />
              <Card padded={false}>
                {friends.map((g, i) => (
                  <View key={g.id}>
                    {i > 0 && <Divider inset={72} />}
                    <GroupRow group={g} />
                  </View>
                ))}
              </Card>
            </View>
          )}
          {people.length > 0 && (
            <View>
              <SectionHeader title={tp("title")} />
              <Card padded={false}>
                {people.map((p, i) => (
                  <View key={p.key}>
                    {i > 0 && <Divider inset={72} />}
                    <PersonRow person={p} />
                  </View>
                ))}
              </Card>
            </View>
          )}
          {active.length > 0 && (
            <View>
              {(friends.length > 0 || people.length > 0) && <SectionHeader title={t("sectionGroups")} />}
              <Card padded={false}>
                {active.map((g, i) => (
                  <View key={g.id}>
                    {i > 0 && <Divider inset={72} />}
                    <GroupRow group={g} />
                  </View>
                ))}
              </Card>
            </View>
          )}
        </>
      )}

      <Button variant="ghost" icon="cloud-download-outline" onPress={() => router.push("/import")}>
        {t("import")}
      </Button>

      {archived.length > 0 && (
        <View style={{ gap: 8 }}>
          <Button variant="ghost" icon={showArchived ? "chevron-up" : "chevron-down"} onPress={() => setShowArchived((v) => !v)}>
            {`${t("archived", { count: archived.length })} · ${showArchived ? t("hide") : t("show")}`}
          </Button>
          {showArchived && (
            <Card padded={false}>
              {archived.map((g, i) => (
                <View key={g.id}>
                  {i > 0 && <Divider inset={72} />}
                  <GroupRow group={g} />
                </View>
              ))}
            </Card>
          )}
        </View>
      )}
    </Screen>
  );
}
