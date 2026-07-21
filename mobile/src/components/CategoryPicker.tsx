import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import type { Category } from "@settlemint/shared";
import { useTheme } from "@/theme/useTheme";

interface CategoryPickerProps {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
}

// Mirrors app/src/components/CategoryPicker.tsx (web) — same selection
// model and category-tinted selected state, adapted to RN primitives.
export default function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {categories.map((c) => {
        const selected = value === c.id;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[
              styles.btn,
              {
                backgroundColor: selected ? `${c.color}18` : theme.colors.surfaceCard,
                borderColor: selected ? c.color : theme.colors.borderSubtle,
              },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(c.id);
            }}
          >
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text
              style={[
                styles.label,
                { color: selected ? c.color : theme.colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btn: {
    width: "30%",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emoji: { fontSize: 22 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
