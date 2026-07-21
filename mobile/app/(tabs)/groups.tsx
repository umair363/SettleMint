import { View, Text, StyleSheet, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";

interface Group {
  id: string;
  name: string;
  emoji: string | null;
  mode: string;
}

export default function GroupsScreen() {
  const { session } = useAuth();
  const theme = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<{ groups: Group[] }>("/api/groups"),
    enabled: !!session,
  });

  const groups = data?.groups || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surfacePrimary }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Groups</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={[styles.empty, { color: theme.colors.textTertiary }]}>No groups yet</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceCard, borderColor: theme.colors.borderSubtle }]}>
            <Text style={styles.emoji}>{item.emoji || "👥"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.cardSub, { color: theme.colors.textTertiary }]}>{item.mode}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { textAlign: "center", marginTop: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  emoji: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSub: { fontSize: 12, marginTop: 2 },
});
