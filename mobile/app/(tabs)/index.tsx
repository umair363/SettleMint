import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getCurrencySymbol, convertCurrency } from "@settlemint/shared";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";

export default function HomeScreen() {
  const { session } = useAuth();
  const theme = useTheme();
  const defaultCurrency = session?.user.defaultCurrency || "USD";
  const sym = getCurrencySymbol(defaultCurrency);

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<{ groups: any[] }>("/api/groups"),
    enabled: !!session,
  });

  const expensesQuery = useQuery({
    queryKey: ["recent_expenses"],
    queryFn: () => apiFetch<{ expenses: any[] }>("/api/expenses/me"),
    enabled: !!session,
  });

  const settlementsQuery = useQuery({
    queryKey: ["settlements"],
    queryFn: () => apiFetch<{ settlements: any[] }>("/api/settlements"),
    enabled: !!session,
  });

  const isRefreshing = groupsQuery.isFetching || expensesQuery.isFetching || settlementsQuery.isFetching;
  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    groupsQuery.refetch();
    expensesQuery.refetch();
    settlementsQuery.refetch();
  };

  const groups = groupsQuery.data?.groups || [];
  const expenses = expensesQuery.data?.expenses || [];
  const settlements = settlementsQuery.data?.settlements || [];
  const userId = session?.user.id;

  let totalOwed = 0;
  let totalOwe = 0;
  expenses.forEach((exp: any) => {
    const isPayer = exp.paidBy === userId;
    exp.splits?.forEach((split: any) => {
      const amt = convertCurrency(parseFloat(split.amountOwed), exp.currency || "USD", defaultCurrency);
      if (split.userId === userId && !isPayer) totalOwe += amt;
      else if (split.userId !== userId && isPayer) totalOwed += amt;
    });
  });
  settlements.forEach((st: any) => {
    const group = groups.find((g: any) => g.id === st.groupId);
    const currency = group ? group.baseCurrency : defaultCurrency;
    const amount = convertCurrency(parseFloat(st.amount), currency, defaultCurrency);
    if (st.paidBy === userId) totalOwe -= amount;
    else if (st.paidTo === userId) totalOwed -= amount;
  });
  totalOwe = Math.max(0, totalOwe);
  totalOwed = Math.max(0, totalOwed);
  const netBalance = totalOwed - totalOwe;

  const firstName = session?.user.fullName?.split(" ")[0] || "there";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surfacePrimary }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.mint[400]} />}
      >
        <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Good day 👋</Text>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{firstName}</Text>

        <View style={[styles.heroCard, { backgroundColor: theme.slate[950], borderColor: "rgba(61,214,140,0.15)" }]}>
          <Text style={styles.heroLabel}>Net Balance</Text>
          <Text style={[styles.heroAmount, { color: netBalance >= 0 ? theme.mint[400] : "#ff6b6b" }]}>
            {netBalance >= 0 ? "+" : "-"}
            {sym}
            {Math.abs(netBalance).toFixed(2)}
          </Text>
          <Text style={styles.heroSub}>
            {groups.length} active group{groups.length !== 1 ? "s" : ""}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>You are owed</Text>
              <Text style={[styles.heroStatValue, { color: theme.mint[400] }]}>
                {sym}
                {totalOwed.toFixed(2)}
              </Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>You owe</Text>
              <Text style={[styles.heroStatValue, { color: "#ff6b6b" }]}>
                {sym}
                {totalOwe.toFixed(2)}
              </Text>
            </View>
          </View>

          {totalOwe > 0 && (
            <Text style={styles.settleNudge}>
              You owe {sym}
              {totalOwe.toFixed(2)} — settle up →
            </Text>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Groups</Text>
        {groups.length === 0 ? (
          <Text style={{ color: theme.colors.textTertiary }}>No groups yet</Text>
        ) : (
          groups.map((g: any) => (
            <View key={g.id} style={[styles.row, { borderColor: theme.colors.borderSubtle }]}>
              <Text style={styles.rowEmoji}>{g.emoji || "👥"}</Text>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>{g.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 14 },
  name: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  heroLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  heroAmount: { fontSize: 36, fontWeight: "800", marginBottom: 4 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 },
  heroStats: { flexDirection: "row", gap: 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 16 },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 },
  heroStatValue: { fontSize: 16, fontWeight: "700" },
  settleNudge: { marginTop: 16, fontSize: 13, fontWeight: "600", color: "#ff6b6b" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowEmoji: { fontSize: 20 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
});
