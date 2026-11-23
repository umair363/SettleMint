import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { identity } from "@/theme/identity";
import { useTheme } from "@/theme/theme";
import type { IconName } from "./button";

/** What a group is, drawn instead of an emoji. */
export const GROUP_ICON: Record<string, IconName> = {
  trip: "airplane",
  home: "home",
  couple: "heart",
  event: "sparkles",
  other: "people",
  direct: "person",
};

/** What an expense was for. */
export const CATEGORY_ICON: Record<string, IconName> = {
  food: "restaurant",
  transport: "car",
  accommodation: "bed",
  entertainment: "film",
  shopping: "bag-handle",
  bills: "flash",
  groceries: "basket",
  health: "medkit",
  other: "pricetag",
};

export const categoryIcon = (id: string | null | undefined): IconName => CATEGORY_ICON[(id ?? "other").toLowerCase()] ?? CATEGORY_ICON.other;

/** A group's mark in its own quiet colour (flat, no gradient). */
export function GroupMark({ id, type, size = 44 }: { id: string; type: string; size?: number }) {
  const { isDark } = useTheme();
  const tone = identity(id, isDark);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={GROUP_ICON[type] ?? GROUP_ICON.other} size={size * 0.5} color={tone.fg} />
    </View>
  );
}

/** What an expense was for, on a neutral tile (colour is kept for balances). */
export function CategoryTile({ category, size = 40 }: { category: string | null | undefined; size?: number }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={categoryIcon(category)} size={size * 0.5} color={c.fgMuted} />
    </View>
  );
}
