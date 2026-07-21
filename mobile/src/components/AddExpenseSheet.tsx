import { forwardRef, useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { CATEGORIES, getCurrencySymbol } from "@settlemint/shared";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";
import CategoryPicker from "./CategoryPicker";

export interface AddExpenseSheetRef {
  open: () => void;
  close: () => void;
}

// Personal-budget quick-add — the group-expense split flow (equal/exact/
// percentage/shares) is a larger port from the web AddExpenseForm and is
// intentionally out of scope for this first native pass.
const AddExpenseSheet = forwardRef<AddExpenseSheetRef>((_props, ref) => {
  const theme = useTheme();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const sym = getCurrencySymbol(session?.user.defaultCurrency || "USD");

  const [sheetRef, setSheetRef] = useState<BottomSheet | null>(null);
  const snapPoints = useMemo(() => ["75%"], []);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("food");
  const [error, setError] = useState("");

  const resetForm = useCallback(() => {
    setAmount("");
    setDescription("");
    setCategory("food");
    setError("");
  }, []);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/budget/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: "expense",
          category,
          description,
          wallet: "card",
        }),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["budget_analytics"] });
      resetForm();
      sheetRef?.close();
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to add expense");
    },
  });

  const canSubmit = !!amount && !!description && parseFloat(amount) > 0 && !createMutation.isPending;

  if (typeof ref === "function") {
    // Expose an imperative open/close API to the tab bar's FAB without
    // leaking the underlying gorhom ref shape to call sites.
    ref({
      open: () => sheetRef?.expand(),
      close: () => sheetRef?.close(),
    });
  } else if (ref) {
    ref.current = {
      open: () => sheetRef?.expand(),
      close: () => sheetRef?.close(),
    };
  }

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    []
  );

  return (
    <BottomSheet
      ref={setSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.borderDefault }}
      onChange={(index) => {
        if (index === 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Add Expense</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.amountRow}>
          <Text style={[styles.currencySymbol, { color: theme.colors.textPrimary }]}>{sym}</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.textPrimary }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <TextInput
          style={[styles.descInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderDefault }]}
          placeholder="What was it for?"
          placeholderTextColor={theme.colors.textTertiary}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Category</Text>
        <CategoryPicker categories={CATEGORIES} value={category} onChange={setCategory} />

        <Pressable
          style={[styles.submitBtn, { backgroundColor: theme.mint[400] }, !canSubmit && styles.submitBtnDisabled]}
          disabled={!canSubmit}
          onPress={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={theme.slate[950]} />
          ) : (
            <Text style={[styles.submitBtnText, { color: theme.slate[950] }]}>Add Expense</Text>
          )}
        </Pressable>
      </BottomSheetView>
    </BottomSheet>
  );
});

AddExpenseSheet.displayName = "AddExpenseSheet";
export default AddExpenseSheet;

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  error: { color: "#ff6b6b", fontSize: 13, marginBottom: 12 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  currencySymbol: { fontSize: 28, fontWeight: "700", marginRight: 4 },
  amountInput: { fontSize: 40, fontWeight: "800", minWidth: 120, textAlign: "center" },
  descInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: "600" },
});
