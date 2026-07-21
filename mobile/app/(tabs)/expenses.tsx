import { View, Text, StyleSheet, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrencySymbol, getCategoryMeta } from "@settlemint/shared";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";

interface Expense {
  id: string;
  description: string;
  amount: string;
  currency: string;
  category: string | null;
  date: string;
}

export default function ExpensesScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const sym = getCurrencySymbol(session?.user.defaultCurrency || "USD");

  const { data, isLoading } = useQuery({
    queryKey: ["recent_expenses"],
    queryFn: () => apiFetch<{ expenses: Expense[] }>("/api/expenses/me"),
    enabled: !!session,
  });

  const expenses = data?.expenses || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surfacePrimary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Expenses</Text>
      </View>
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={[styles.empty, { color: theme.colors.textTertiary }]}>No expenses yet</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const meta = getCategoryMeta(item.category);
          return (
            <View style={[styles.row, { borderColor: theme.colors.borderSubtle }]}>
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.colors.textPrimary }]}>{item.description}</Text>
                <Text style={[styles.rowSub, { color: theme.colors.textTertiary }]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.amount, { color: theme.colors.textPrimary }]}>
                {sym}
                {parseFloat(item.amount).toFixed(2)}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  emoji: { fontSize: 20 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
