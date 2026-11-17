import { Ionicons } from "@expo/vector-icons";
import { ApiError, normalizePaymentHandle, PAYMENT_KIND_VALUES, PAYMENT_KINDS, type PaymentKind } from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTranslations } from "use-intl";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Card } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

interface Row {
  key: string;
  kind: PaymentKind;
  value: string;
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** Brand names stay as they are; generic methods are translated. */
export function usePaymentKindText() {
  const t = useTranslations("payments");
  return {
    label: (kind: PaymentKind) => (kind === "bank" || kind === "other" ? t(`kind.${kind}`) : PAYMENT_KINDS[kind].label),
    placeholder: (kind: PaymentKind) => t(`placeholder.${kind}`),
  };
}

/** "How people pay you": shown to your groups when they settle up. */
export function PaymentHandlesCard() {
  const { c, radius } = useTheme();
  const qc = useQueryClient();
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const kindText = usePaymentKindText();
  const saved = useQuery({ queryKey: ["payment-handles"], queryFn: () => api.me.paymentHandles() });
  const [draft, setDraft] = useState<Row[] | null>(null);
  const rows: Row[] = draft ?? (saved.data ?? []).map((h) => ({ key: h.id, kind: h.kind, value: h.value }));

  const save = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () => api.me.setPaymentHandles(rows.filter((r) => r.value.trim()).map((r) => ({ kind: r.kind, value: r.value }))),
    onSuccess: (handles) => {
      qc.setQueryData(["payment-handles"], handles);
      void qc.invalidateQueries({ queryKey: ["group"] });
      setDraft(null);
      toast.success(t("saved"));
    },
    onError: (err) => toast.error(err instanceof ApiError && err.code === "VALIDATION_ERROR" ? t("invalidSave") : t("saveFailed")),
  });

  const update = (key: string, patch: Partial<Row>) => setDraft(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const invalid = (r: Row) => r.value.trim() !== "" && normalizePaymentHandle(r.kind, r.value) === null;

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text variant="heading">{t("title")}</Text>
        <Text variant="sub" tone="muted">
          {t("body")}
        </Text>
      </View>
      {rows.map((r) => (
        <View key={r.key} style={{ gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityLabel={t("method")}>
            {PAYMENT_KIND_VALUES.map((k) => {
              const on = k === r.kind;
              return (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => update(r.key, { kind: k })}
                  style={{
                    paddingHorizontal: 12,
                    minHeight: 34,
                    justifyContent: "center",
                    borderRadius: radius.full,
                    backgroundColor: on ? c.accentSoft : c.surface2,
                    borderWidth: 1,
                    borderColor: on ? c.accent : c.line,
                  }}
                >
                  <Text variant="caption" tone={on ? "positive" : "muted"}>
                    {kindText.label(k)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                value={r.value}
                onChangeText={(v) => update(r.key, { value: v })}
                placeholder={kindText.placeholder(r.kind)}
                accessibilityLabel={t("details", { method: kindText.label(r.kind) })}
                autoCapitalize="none"
                autoCorrect={false}
                error={invalid(r) ? t("invalid", { method: kindText.label(r.kind) }) : null}
              />
            </View>
            <View style={{ paddingTop: 5 }}>
              <IconButton icon="trash-outline" label={t("remove")} onPress={() => setDraft(rows.filter((x) => x.key !== r.key))} />
            </View>
          </View>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setDraft([...rows, { key: newKey(), kind: "other", value: "" }])}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 }}
      >
        <Ionicons name="add-circle" size={20} color={c.positive} />
        <Text variant="label" tone="positive">
          {t("add")}
        </Text>
      </Pressable>
      {draft !== null && (
        <Button loading={save.isPending} disabled={rows.some(invalid)} onPress={() => save.mutate()}>
          {tc("save")}
        </Button>
      )}
    </Card>
  );
}
