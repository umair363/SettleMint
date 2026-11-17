import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { haptic } from "@/ui/button";

/** Home, Groups, the add button, Activity, Account: the same shape as the web app on a phone. */
export default function TabsLayout() {
  const { c } = useTheme();
  const t = useTranslations("nav");
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.positive,
        tabBarInactiveTintColor: c.fgSubtle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { backgroundColor: c.bgElevated, borderTopColor: c.line },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: t("groups"),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t("addExpense"),
          tabBarButton: () => (
            <View style={styles.fabWrap} pointerEvents="box-none">
              <Pressable
                testID="add-expense"
                accessibilityRole="button"
                accessibilityLabel={t("addExpense")}
                onPress={() => {
                  haptic("medium");
                  router.push("/add-expense");
                }}
                style={({ pressed }) => [styles.fab, { backgroundColor: c.accent, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <Ionicons name="add" size={30} color={c.accentFg} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t("activity"),
          tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "pulse" : "pulse-outline"} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("account"),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
