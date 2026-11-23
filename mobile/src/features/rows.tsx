import { Ionicons } from "@expo/vector-icons";
import { describeActivity } from "@settlemint/client/text/activity-text";
import { timeAgo } from "@settlemint/client/text/dates";
import type { ActivityDto, GroupSummaryDto, PersonDto } from "@settlemint/shared";
import { router } from "expo-router";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { CategoryTile, GroupMark } from "@/ui/glyphs";
import { Avatar, Money, Row } from "@/ui/surface";
import { Text } from "@/ui/text";

/** A group's mark: drawn in its own colour. (`emoji` is ignored: groups are drawn, not emoji.) */
export function GroupIcon({ id, type, size = 44 }: { id: string; type: string; emoji?: string | null; size?: number }) {
  return <GroupMark id={id} type={type} size={size} />;
}

/** "you are owed $12.00" / "you owe" / "settled up", stacked at the end of a row. */
export function BalanceLabel({ minor, currency }: { minor: number; currency: string }) {
  const t = useTranslations("groups");
  if (minor === 0)
    return (
      <Text variant="sub" tone="subtle">
        {t("settledUp")}
      </Text>
    );
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text variant="caption" tone="muted">
        {minor > 0 ? t("youAreOwed") : t("youOwe")}
      </Text>
      <Money minor={minor} currency={currency} tone="auto" variant="bodyStrong" />
    </View>
  );
}

export function GroupRow({ group }: { group: GroupSummaryDto }) {
  const t = useTranslations("groups");
  const locale = useLocale();
  return (
    <Row
      onPress={() => router.push({ pathname: "/group/[id]", params: { id: group.id } })}
      leading={<GroupIcon id={group.id} type={group.type} />}
      title={group.name}
      subtitle={`${t("people", { count: group.memberCount })} · ${timeAgo(group.lastActivityAt, locale)}`}
      trailing={<BalanceLabel minor={group.myBalance} currency={group.currency} />}
    />
  );
}

// Neutral tiles: colour is kept for balances, except a payment (mint).
const ACTIVITY_ICON = {
  expense: { icon: "receipt-outline", bg: "surface2", fg: "fgMuted" },
  payment: { icon: "swap-horizontal", bg: "positiveSoft", fg: "positive" },
  member: { icon: "person-add-outline", bg: "surface2", fg: "fgMuted" },
  group: { icon: "settings-outline", bg: "surface2", fg: "fgMuted" },
} as const;

export function ActivityRow({ event, myUserId, showGroup = true }: { event: ActivityDto; myUserId?: string; showGroup?: boolean }) {
  const { c } = useTheme();
  const t = useTranslations("activity");
  const locale = useLocale();
  const line = describeActivity(event, myUserId, t);
  const style = ACTIVITY_ICON[line.kind];
  return (
    <Row
      onPress={() => router.push({ pathname: "/group/[id]", params: { id: event.groupId } })}
      leading={
        line.kind === "expense" && typeof event.data.category === "string" ? (
          <CategoryTile category={event.data.category} />
        ) : (
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c[style.bg], alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={style.icon} size={20} color={c[style.fg]} />
          </View>
        )
      }
      title={line.text}
      titleParts={line.parts}
      subtitle={`${showGroup ? `${event.groupName} · ` : ""}${timeAgo(event.createdAt, locale)}`}
      trailing={
        line.amount ? (
          <Money
            minor={line.amount.minor}
            currency={line.amount.currency}
            tone={line.deleted ? "subtle" : "fg"}
            variant="bodyStrong"
            style={line.deleted ? { textDecorationLine: "line-through" } : undefined}
          />
        ) : undefined
      }
    />
  );
}

/** Someone you share groups with, and what is owed between you across all of them. */
export function PersonRow({ person }: { person: PersonDto }) {
  const t = useTranslations("people");
  return (
    <Row
      onPress={() => router.push({ pathname: "/person", params: { key: person.key } })}
      leading={<Avatar id={person.key} name={person.name} size={44} />}
      title={person.name}
      subtitle={t("shared", { count: person.groups.length })}
      trailing={
        person.totals.length === 0 ? (
          <BalanceLabel minor={0} currency="USD" />
        ) : (
          <View style={{ gap: 4 }}>
            {person.totals.map((x) => (
              <BalanceLabel key={x.currency} minor={x.amount} currency={x.currency} />
            ))}
          </View>
        )
      }
    />
  );
}
