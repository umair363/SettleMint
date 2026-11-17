import { useActivity, useMe } from "@settlemint/client/data/queries";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { ActivityRow } from "@/features/rows";
import { Button } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Card, Divider, Empty, Loading } from "@/ui/surface";

export default function Activity() {
  const me = useMe();
  const activity = useActivity();
  const t = useTranslations("activity");
  const items = activity.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen title={t("title")} subtitle={t("subtitle")} onRefresh={() => void activity.refetch()} refreshing={activity.isRefetching}>
      {activity.isPending ? (
        <Loading />
      ) : items.length === 0 ? (
        <Card>
          <Empty icon="pulse" title={t("emptyTitle")} body={t("emptyBody")} />
        </Card>
      ) : (
        <Card padded={false}>
          {items.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider inset={68} />}
              <ActivityRow event={e} myUserId={me.data?.id} />
            </View>
          ))}
        </Card>
      )}
      {activity.hasNextPage && (
        <Button variant="secondary" loading={activity.isFetchingNextPage} onPress={() => void activity.fetchNextPage()}>
          {t("showOlder")}
        </Button>
      )}
    </Screen>
  );
}
