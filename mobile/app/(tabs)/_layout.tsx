import { useRef } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/useTheme";
import AddExpenseSheet, { type AddExpenseSheetRef } from "@/components/AddExpenseSheet";
import BiometricGate from "@/components/BiometricGate";

export default function TabsLayout() {
  const theme = useTheme();
  const sheetRef = useRef<AddExpenseSheetRef>(null);

  return (
    <BiometricGate>
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.mint[400],
          tabBarInactiveTintColor: theme.colors.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.colors.surfaceElevated,
            borderTopColor: theme.colors.borderSubtle,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: "Groups",
            tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            // The center tab is a FAB that opens the Add Expense sheet
            // rather than navigating — tabBarButton fully replaces the
            // default touchable so the route itself never mounts.
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={styles.fabWrap} pointerEvents="box-none">
                <Pressable
                  style={[styles.fab, { backgroundColor: theme.mint[400] }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    sheetRef.current?.open();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add expense"
                >
                  <Ionicons name="add" size={28} color={theme.slate[950]} />
                </Pressable>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: "Budget",
            tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: "Expenses",
            tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
          }}
        />
      </Tabs>

      <AddExpenseSheet ref={sheetRef} />
    </View>
    </BiometricGate>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3DD68C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
