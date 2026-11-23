import { useRestoreTrashItem, useTrash } from "@settlemint/client/data/queries";
import { timeAgo } from "@settlemint/client/text/dates";
import type { TrashItemDto } from "@settlemint/shared";
import { router } from "expo-router";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { Button, IconButton } from "@/ui/button";
import { Screen } from "@/ui/screen";
import { Card, Divider, Empty, Loading, Money } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

function TrashRow({ item }: { item: TrashItemDto }) {
  const t = useTranslations("trash");
  const locale = useLocale();
  const restore = useRestoreTrashItem();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="sub" tone="muted" numberOfLines={1}>
          {t(item.kind)} · {item.kind === "group" ? "" : `${item.groupName} · `}
          {timeAgo(item.deletedAt, locale)}
        </Text>
      </View>
      {item.amount !== null && item.currency ? <Money minor={item.amount} currency={item.currency} tone="muted" variant="bodyStrong" /> : null}
      <Button
        variant="secondary"
        loading={restore.isPending}
        disabled={!item.canRestore}
        accessibilityLabel={`${t("restore")}: ${item.title}`}
        onPress={() =>
          restore.mutate({ kind: item.kind, id: item.id }, { onSuccess: () => toast.success(t("restored", { title: item.title })) })
        }
      >
        {t("restore")}
      </Button>
    </View>
  );
}

/** Things deleted in the last 30 days, each with a way back. */
export default function Trash() {
  const trash = useTrash();
  const t = useTranslations("trash");
  const tc = useTranslations("common");
  return (
    <Screen
      sheet
      title={t("title")}
      subtitle={t("subtitle")}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
    >
      {trash.isPending ? (
        <Loading />
      ) : !trash.data || trash.data.length === 0 ? (
        <Card>
          <Empty icon="trash-outline" title={t("emptyTitle")} body={t("emptyBody")} />
        </Card>
      ) : (
        <Card padded={false}>
          {trash.data.map((item, i) => (
            <View key={`${item.kind}-${item.id}`}>
              {i > 0 && <Divider />}
              <TrashRow item={item} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
