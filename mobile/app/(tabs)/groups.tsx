import { useGroups } from "@settlemint/client/data/queries";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { GroupRow } from "@/features/rows";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Card, Divider, Empty, Loading } from "@/ui/surface";

export default function Groups() {
  const groups = useGroups();
  const t = useTranslations("groups");
  const [showArchived, setShowArchived] = useState(false);
  const all = groups.data ?? [];
  const active = all.filter((g) => !g.archived);
  const archived = all.filter((g) => g.archived);

  return (
    <Screen
      title={t("title")}
      headerRight={<IconButton icon="add" tone="accent" label={t("newGroup")} onPress={() => router.push("/new-group")} />}
      onRefresh={() => void groups.refetch()}
      refreshing={groups.isRefetching}
    >
      {groups.isPending ? (
        <Loading />
      ) : active.length === 0 ? (
        <Card>
          <Empty icon="people" title={t("emptyTitle")} body={t("emptyBody")} action={t("create")} onAction={() => router.push("/new-group")} />
        </Card>
      ) : (
        <Card padded={false}>
          {active.map((g, i) => (
            <View key={g.id}>
              {i > 0 && <Divider inset={72} />}
              <GroupRow group={g} />
            </View>
          ))}
        </Card>
      )}

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
