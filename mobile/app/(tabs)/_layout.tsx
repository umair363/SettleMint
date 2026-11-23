import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { haptic } from "@/ui/button";
import type { IconName } from "@/ui/button";
import { Text } from "@/ui/text";

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: "home", off: "home-outline" },
  groups: { on: "people", off: "people-outline" },
  activity: { on: "pulse", off: "pulse-outline" },
  account: { on: "person-circle", off: "person-circle-outline" },
};

/**
 * Four sections in a floating capsule and, apart from it, the one mint action:
 * the same shape as the website on a phone. Content scrolls under both.
 */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTranslations("nav");
  const routes = state.routes.filter((r) => ICONS[r.name]);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.capsule, { backgroundColor: c.bgElevated, borderColor: c.glassLine, shadowColor: "#0a1a12" }]}>
        {routes.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const icon = ICONS[route.name];
          const title = descriptors[route.key]?.options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={title}
              testID={`tab-${route.name}`}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={[styles.tab, focused && { backgroundColor: c.surface2 }]}
            >
              <Ionicons name={focused ? icon.on : icon.off} size={22} color={focused ? c.fg : c.fgMuted} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: focused ? c.fg : c.fgMuted }} numberOfLines={1}>
                {title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        testID="add-expense"
        accessibilityRole="button"
        accessibilityLabel={t("addExpense")}
        onPress={() => {
          haptic("medium");
          router.push("/add-expense");
        }}
        style={({ pressed }) => [styles.fab, { backgroundColor: c.accent, shadowColor: "#0a1a12", transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Ionicons name="add" size={32} color={c.accentFg} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const t = useTranslations("nav");
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: t("home") }} />
      <Tabs.Screen name="groups" options={{ title: t("groups") }} />
      <Tabs.Screen name="add" options={{ title: t("addExpense") }} />
      <Tabs.Screen name="activity" options={{ title: t("activity") }} />
      <Tabs.Screen name="account" options={{ title: t("account") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  capsule: {
    flex: 1,
    flexDirection: "row",
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    gap: 2,
    shadowOpacity: Platform.OS === "web" ? 0.1 : 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 26 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
