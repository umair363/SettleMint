import { Ionicons } from "@expo/vector-icons";
import { minorToInputText } from "@settlemint/client/data/split-model";
import { useCreateSettlement, useGroup } from "@settlemint/client/data/queries";
import { todayIso } from "@settlemint/client/text/dates";
import { buildPayAction, parseMoneyInput, type GroupDetailDto, type MemberDto } from "@settlemint/shared";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { uuidv7 } from "uuidv7";
import { usePaymentKindText } from "@/features/payment-handles";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar, Chip, Loading, Money, Segmented } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

type Method = "cash" | "bank" | "app" | "other";

/** Opens the payee's payment app with the amount filled in, or copies their details. */
function PayWith({ payee, amount, currency, note, onUsed }: { payee: MemberDto; amount: number; currency: string; note?: string; onUsed: () => void }) {
  const { c, radius } = useTheme();
  const t = useTranslations("payWith");
  const kindText = usePaymentKindText();
  const [copied, setCopied] = useState<string | null>(null);
  if (payee.paymentHandles.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label" tone="muted">
        {t("title", { name: payee.displayName })}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {payee.paymentHandles.map((h) => {
          const action = buildPayAction(h, { amount, currency, note, payeeName: payee.displayName });
          const label = kindText.label(h.kind);
          return (
            <Pressable
              key={h.id}
              accessibilityRole="button"
              accessibilityLabel={action.url ? t("payWithLabel", { method: label, filled: action.amountIncluded ? "yes" : "no" }) : t("copyLabel", { method: label })}
              onPress={async () => {
                if (action.url) {
                  try {
                    await Linking.openURL(action.url);
                    onUsed();
                  } catch {
                    await Clipboard.setStringAsync(h.value);
                    toast.info(t("copyLabel", { method: label }));
                  }
                } else {
                  await Clipboard.setStringAsync(action.copy ?? h.value);
                  setCopied(h.id);
                  haptic("light");
                  setTimeout(() => setCopied(null), 2000);
                  onUsed();
                }
              }}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: "45%",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                minHeight: 52,
                padding: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: pressed ? c.surface3 : c.surface2,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text variant="label">{label}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {action.url && action.amountIncluded ? t("amountFilled") : h.value}
                </Text>
              </View>
              <Ionicons name={action.url ? "open-outline" : copied === h.id ? "checkmark" : "copy-outline"} size={16} color={copied === h.id ? c.positive : c.fgSubtle} />
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" tone="subtle">
        {t("after")}
      </Text>
    </View>
  );
}

function PersonChooser({ group, value, onChange, exclude, label }: { group: GroupDetailDto; value: string; onChange: (id: string) => void; exclude: string; label: string }) {
  const t = useTranslations("settle");
  const m = group.members.find((x) => x.id === value);
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
      <Text variant="caption" tone="subtle" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Text>
      {m && <Avatar name={m.displayName} size={52} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityLabel={label}>
        {group.members
          .filter((x) => !x.left && x.id !== exclude)
          .map((x) => (
            <Chip key={x.id} label={x.isMe ? t("you") : x.displayName} selected={x.id === value} onPress={() => onChange(x.id)} />
          ))}
      </ScrollView>
    </View>
  );
}

/** Record a payment. Params: groupId, from, to, amount (minor units, prefilled from the suggestion). */
export default function Settle() {
  const p = useLocalSearchParams<{ groupId: string; from: string; to: string; amount?: string }>();
  const group = useGroup(p.groupId ?? null);
  if (!group.data) return <Loading />;
  return <SettleForm group={group.data} from={p.from} to={p.to} amount={Number(p.amount) || 0} />;
}

function SettleForm({ group, from: initialFrom, to: initialTo, amount: initialAmount }: { group: GroupDetailDto; from: string; to: string; amount: number }) {
  const { c } = useTheme();
  const t = useTranslations("settle");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [text, setText] = useState(initialAmount ? minorToInputText(initialAmount, group.currency, locale) : "");
  const [method, setMethod] = useState<Method>("cash");
  const [note, setNote] = useState("");
  const create = useCreateSettlement(group.id);
  const amount = parseMoneyInput(text, group.currency, locale) ?? 0;
  const fromM = group.members.find((m) => m.id === from);
  const toM = group.members.find((m) => m.id === to);
  const owed = group.transfers.find((x) => x.fromMemberId === from && x.toMemberId === to)?.amount ?? 0;

  const save = () => {
    create.mutate({
      id: uuidv7(),
      fromMemberId: from,
      toMemberId: to,
      amount,
      currency: group.currency,
      method,
      note: note.trim() || null,
      date: todayIso(),
    });
    haptic("success");
    toast.success(t("recorded"), {
      description: t("paidLine", {
        dir: fromM?.isMe ? "out" : toM?.isMe ? "in" : "other",
        from: fromM?.displayName ?? "",
        to: toM?.displayName ?? "",
      }),
    });
    router.back();
  };

  return (
    <Screen
      sheet
      title={t("title")}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
      footer={
        <Button size="lg" block disabled={amount <= 0 || from === to} onPress={save} testID="record-payment">
          {t.rich("recordAmount", {
            amount: () => (amount > 0 ? <Money minor={amount} currency={group.currency} tone="accentFg" variant="bodyStrong" /> : ""),
          })}
        </Button>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <PersonChooser group={group} value={from} onChange={setFrom} exclude={to} label={t("paidLabel")} />
        <IconButton
          icon="swap-horizontal"
          label={t("swap")}
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
        />
        <PersonChooser group={group} value={to} onChange={setTo} exclude={from} label={t("toLabel")} />
      </View>

      <View style={{ alignItems: "center", gap: 4 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={c.fgSubtle}
          accessibilityLabel={t("typeAmount")}
          style={{ width: "100%", maxWidth: 280, fontSize: 44, fontWeight: "700", color: c.fg, textAlign: "center", fontVariant: ["tabular-nums"] }}
        />
        <Text variant="caption" tone="subtle">
          {group.currency}
        </Text>
        {owed > 0 && owed !== amount && (
          <Button variant="ghost" onPress={() => setText(minorToInputText(owed, group.currency, locale))}>
            {t.rich("fullAmount", { amount: () => <Money minor={owed} currency={group.currency} variant="label" tone="positive" /> })}
          </Button>
        )}
      </View>

      {fromM?.isMe && toM && <PayWith payee={toM} amount={amount} currency={group.currency} note={group.name} onUsed={() => setMethod("app")} />}

      <View style={{ gap: 8 }}>
        <Text variant="label" tone="muted">
          {t("howPaid")}
        </Text>
        <Segmented<Method>
          label={t("howPaid")}
          value={method}
          onChange={setMethod}
          options={[
            { value: "cash", label: t("cash") },
            { value: "bank", label: t("bank") },
            { value: "app", label: t("app") },
            { value: "other", label: t("other") },
          ]}
        />
      </View>
      <Field label={t("note")} value={note} onChangeText={setNote} placeholder={t("notePlaceholder")} maxLength={200} />
    </Screen>
  );
}
