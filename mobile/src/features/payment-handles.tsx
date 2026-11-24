import { Ionicons } from "@expo/vector-icons";
import { ApiError, makeQrText, normalizePaymentHandle, PAYMENT_KIND_VALUES, PAYMENT_KINDS, type PaymentKind } from "@settlemint/shared";
import { useMe } from "@settlemint/client/data/queries";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTranslations } from "use-intl";
import { pickQrFromPhotos } from "@/features/qr";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { PayQr } from "@/ui/pay-qr";
import { Card } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

interface Row {
  key: string;
  kind: PaymentKind;
  value: string;
  /** A name for the method; only QR codes are named in the app. */
  label: string;
}

const MAX_QR = 5;

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

/** Brand names stay as they are; generic methods are translated. */
export function usePaymentKindText() {
  const t = useTranslations("payments");
  return {
    label: (kind: PaymentKind) => (kind === "bank" || kind === "other" || kind === "qr" ? t(`kind.${kind}`) : PAYMENT_KINDS[kind].label),
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
  const [reading, setReading] = useState(false);
  const me = useMe();
  const rows: Row[] = draft ?? (saved.data ?? []).map((h) => ({ key: h.id, kind: h.kind, value: h.value, label: h.label ?? "" }));
  const qrCount = rows.filter((r) => r.kind === "qr").length;

  const save = useMutation({
    meta: { handlesErrors: true },
    mutationFn: () =>
      api.me.setPaymentHandles(rows.filter((r) => r.value.trim()).map((r) => ({ kind: r.kind, value: r.value, label: r.label.trim() || null }))),
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

  /** The QR for a method already entered (IBAN, UPI, payment links), or null if none can be made. */
  const qrFor = (r: Row) => (r.kind === "qr" || !r.value.trim() ? null : makeQrText({ kind: r.kind, value: r.value }, { name: me.data?.name }));
  const makeQr = (r: Row) => {
    const text = qrFor(r);
    if (!text) return void toast.error(t("makeQrFailed"));
    if (rows.some((x) => x.kind === "qr" && x.value === text)) return void toast.info(t("qrExists"));
    if (qrCount >= MAX_QR) return void toast.error(t("qrTooMany"));
    setDraft([...rows, { key: newKey(), kind: "qr", value: text, label: t("qrName", { method: kindText.label(r.kind) }) }]);
  };

  const addQr = async () => {
    setReading(true);
    try {
      const { text, cancelled } = await pickQrFromPhotos();
      if (cancelled) return;
      if (!text) return void toast.error(t("qrUnreadable"));
      if (rows.some((r) => r.kind === "qr" && r.value === text)) return;
      setDraft([...rows, { key: newKey(), kind: "qr", value: text, label: "" }]);
    } finally {
      setReading(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text variant="heading">{t("title")}</Text>
        <Text variant="sub" tone="muted">
          {t("body")}
        </Text>
      </View>
      {rows.map((r) =>
        r.kind === "qr" ? (
          <View key={r.key} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.line }}>
              <PayQr value={r.value} label={t("qrPreview")} size={64} />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                value={r.label}
                onChangeText={(v) => update(r.key, { label: v })}
                placeholder={t("qrLabelPlaceholder")}
                accessibilityLabel={t("qrLabel")}
                maxLength={40}
              />
            </View>
            <IconButton icon="trash-outline" label={t("remove")} onPress={() => setDraft(rows.filter((x) => x.key !== r.key))} />
          </View>
        ) : (
          <View key={r.key} style={{ gap: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityLabel={t("method")}>
              {PAYMENT_KIND_VALUES.filter((k) => k !== "qr").map((k) => {
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
                {!invalid(r) && qrFor(r) && qrCount < MAX_QR && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("makeQr")} · ${kindText.label(r.kind)}`}
                    onPress={() => makeQr(r)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }}
                  >
                    <Ionicons name="qr-code-outline" size={16} color={c.positive} />
                    <Text variant="caption" tone="positive">
                      {t("makeQr")}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={{ paddingTop: 5 }}>
                <IconButton icon="trash-outline" label={t("remove")} onPress={() => setDraft(rows.filter((x) => x.key !== r.key))} />
              </View>
            </View>
          </View>
        ),
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setDraft([...rows, { key: newKey(), kind: "other", value: "", label: "" }])}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 }}
        >
          <Ionicons name="add-circle" size={20} color={c.positive} />
          <Text variant="label" tone="positive">
            {t("add")}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={reading || qrCount >= MAX_QR || rows.length >= 10}
          onPress={() => void addQr()}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40, opacity: qrCount >= MAX_QR ? 0.5 : 1 }}
        >
          <Ionicons name="qr-code-outline" size={20} color={c.positive} />
          <Text variant="label" tone="positive">
            {reading ? t("qrReading") : t("addQr")}
          </Text>
        </Pressable>
      </View>
      <Text variant="caption" tone="subtle">
        {qrCount >= MAX_QR ? t("qrTooMany") : t("qrHint")}
      </Text>
      {draft !== null && (
        <Button loading={save.isPending} disabled={rows.some(invalid)} onPress={() => save.mutate()}>
          {tc("save")}
        </Button>
      )}
    </Card>
  );
}
