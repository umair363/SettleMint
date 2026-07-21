import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrencySymbol, getCategoryMeta } from "@settlemint/shared";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";

interface AnalyticsResponse {
  byCategory: { category: string; total: string }[];
  summary: { totalExpense: string; totalIncome: string; txnCount: number };
}

export default function BudgetScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const sym = getCurrencySymbol(session?.user.defaultCurrency || "USD");

  const now = new Date();
  const { data, isLoading } = useQuery({
    queryKey: ["budget_analytics", now.getMonth() + 1, now.getFullYear()],
    queryFn: () =>
      apiFetch<AnalyticsResponse>(`/api/budget/analytics?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
    enabled: !!session,
  });

  const summary = data?.summary || { totalExpense: "0", totalIncome: "0", txnCount: 0 };
  const byCategory = data?.byCategory || [];
  const totalExpense = parseFloat(summary.totalExpense) || 0;
  const totalIncome = parseFloat(summary.totalIncome) || 0;
  const netSavings = totalIncome - totalExpense;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surfacePrimary }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>My Budget</Text>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceCard, borderColor: theme.colors.borderSubtle }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
              {sym}
              {totalExpense.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceCard, borderColor: theme.colors.borderSubtle }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: theme.mint[400] }]}>
              {sym}
              {totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceCard, borderColor: theme.colors.borderSubtle }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Net</Text>
            <Text style={[styles.summaryValue, { color: netSavings >= 0 ? theme.mint[400] : "#ff6b6b" }]}>
              {netSavings >= 0 ? "+" : "-"}
              {sym}
              {Math.abs(netSavings).toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Spending by Category</Text>
        {byCategory.length === 0 && !isLoading ? (
          <Text style={{ color: theme.colors.textTertiary }}>No spending this month</Text>
        ) : (
          byCategory
            .sort((a, b) => parseFloat(b.total) - parseFloat(a.total))
            .map((c) => {
              const meta = getCategoryMeta(c.category);
              return (
                <View key={c.category} style={[styles.catRow, { borderColor: theme.colors.borderSubtle }]}>
                  <Text style={styles.catEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.catLabel, { color: theme.colors.textPrimary }]}>{meta.label}</Text>
                  <Text style={[styles.catAmount, { color: theme.colors.textPrimary }]}>
                    {sym}
                    {parseFloat(c.total).toFixed(2)}
                  </Text>
                </View>
              );
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 14 },
  summaryLabel: { fontSize: 11, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  catEmoji: { fontSize: 18 },
  catLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  catAmount: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
