import { Ionicons } from "@expo/vector-icons";
import { CURRENCY_CODES, currencyName, currencySymbol } from "@settlemint/shared";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale, useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { IconButton } from "./button";
import { Field } from "./field";
import { Text } from "./text";

const COMMON = ["USD", "EUR", "GBP", "INR", "PKR", "AED", "SAR", "CAD", "AUD", "BRL", "MXN", "JPY"];

/** The currency button that opens a searchable list of every ISO currency. */
export function CurrencyButton({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const { c, radius } = useTheme();
  const t = useTranslations("ui");
  const locale = useLocale();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("currencyLabel", { currency: currencyName(value, locale) })}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 50,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: pressed ? c.surface3 : c.surface2,
        })}
      >
        <Text variant="bodyStrong">{value}</Text>
        <Text variant="sub" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
          {currencyName(value, locale)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.fgSubtle} />
      </Pressable>
      <CurrencyPicker
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(code) => {
          onChange(code);
          setOpen(false);
        }}
      />
    </>
  );
}

export function CurrencyPicker({
  open,
  value,
  onClose,
  onPick,
}: {
  open: boolean;
  value: string;
  onClose: () => void;
  onPick: (code: string) => void;
}) {
  const { c } = useTheme();
  const t = useTranslations("ui");
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = CURRENCY_CODES.map((code) => ({ code, name: currencyName(code, locale) }));
    if (q) return all.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
    const common = COMMON.filter((code) => CURRENCY_CODES.includes(code)).map((code) => ({ code, name: currencyName(code, locale) }));
    return [...common, ...all.filter((r) => !COMMON.includes(r.code))];
  }, [query, locale]);

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bgElevated, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
          <Text variant="title" style={{ flex: 1 }} accessibilityRole="header">
            {t("currency")}
          </Text>
          <IconButton icon="close" label={t("close")} onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Field value={query} onChangeText={setQuery} placeholder={t("searchCurrencies")} autoCorrect={false} accessibilityLabel={t("searchCurrencies")} />
        </View>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          initialNumToRender={20}
          renderItem={({ item }) => {
            const on = item.code === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => onPick(item.code)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  minHeight: 54,
                  backgroundColor: pressed ? c.surface2 : "transparent",
                })}
              >
                <View style={{ width: 44 }}>
                  <Text variant="bodyStrong">{item.code}</Text>
                </View>
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text tone="muted">{safeSymbol(item.code, locale)}</Text>
                {on && <Ionicons name="checkmark" size={20} color={c.positive} />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function safeSymbol(code: string, locale: string) {
  try {
    return currencySymbol(code, locale);
  } catch {
    return "";
  }
}
