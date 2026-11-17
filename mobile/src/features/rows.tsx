import { Ionicons } from "@expo/vector-icons";
import { describeActivity } from "@settlemint/client/text/activity-text";
import { timeAgo } from "@settlemint/client/text/dates";
import type { ActivityDto, GroupSummaryDto } from "@settlemint/shared";
import { router } from "expo-router";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import type { Palette } from "@/theme/tokens";
import { Money, Row } from "@/ui/surface";
import { Text } from "@/ui/text";

export const GROUP_EMOJI: Record<string, string> = {
  trip: "✈️",
  home: "🏠",
  couple: "💞",
  event: "🎉",
  other: "👥",
  direct: "🤝",
};

const tint = (c: Palette, type: string) =>
  ({ trip: c.infoSoft, home: c.warningSoft, couple: c.negativeSoft, event: c.accentSoft })[type] ?? c.surface3;

export function GroupIcon({ type, emoji, size = 44 }: { type: string; emoji: string | null; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint(c, type), alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.66 }}>{emoji ?? GROUP_EMOJI[type] ?? "👥"}</Text>
    </View>
  );
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
      leading={<GroupIcon type={group.type} emoji={group.emoji} />}
      title={group.name}
      subtitle={`${t("people", { count: group.memberCount })} · ${timeAgo(group.lastActivityAt, locale)}`}
      trailing={<BalanceLabel minor={group.myBalance} currency={group.currency} />}
    />
  );
}

const ACTIVITY_ICON = {
  expense: { icon: "receipt-outline", bg: "infoSoft", fg: "info" },
  payment: { icon: "swap-horizontal", bg: "positiveSoft", fg: "positive" },
  member: { icon: "person-add-outline", bg: "warningSoft", fg: "warning" },
  group: { icon: "settings-outline", bg: "surface3", fg: "fgMuted" },
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
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c[style.bg], alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={style.icon} size={18} color={c[style.fg]} />
        </View>
      }
      title={line.text}
      subtitle={`${showGroup ? `${event.groupEmoji ?? "👥"} ${event.groupName} · ` : ""}${timeAgo(event.createdAt, locale)}`}
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
