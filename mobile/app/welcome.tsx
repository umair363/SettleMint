import { keys, useMe, useUpdateMe } from "@settlemint/client/data/queries";
import { guessCurrency } from "@settlemint/client/text/currency-guess";
import { useQueryClient } from "@tanstack/react-query";
import { getLocales } from "expo-localization";
import { useState } from "react";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/ui/button";
import { CurrencyButton } from "@/ui/currency-picker";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Loading } from "@/ui/surface";
import { Text } from "@/ui/text";

/** The phone knows its region better than the language tag does. */
function phoneCurrency(locale: string) {
  const fromPhone = getLocales()[0]?.currencyCode;
  return fromPhone && /^[A-Z]{3}$/.test(fromPhone) ? fromPhone : guessCurrency(locale);
}

export default function Welcome() {
  const me = useMe();
  const t = useTranslations("welcome");
  const locale = useLocale();
  const qc = useQueryClient();
  const update = useUpdateMe();
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);

  if (!me.data) return <Loading />;
  const nameValue = name ?? (me.data.isGuest ? "" : me.data.name);
  const currencyValue = currency ?? me.data.defaultCurrency ?? phoneCurrency(locale);

  const submit = () =>
    update.mutate(
      { name: nameValue.trim(), defaultCurrency: currencyValue, locale },
      // The root layout moves on once the profile is complete.
      { onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }) },
    );

  return (
    <Screen
      footer={
        <Button size="lg" block loading={update.isPending} disabled={!nameValue.trim()} onPress={submit}>
          {t("continue")}
        </Button>
      }
    >
      <View style={{ gap: 6, marginTop: 24 }}>
        <Text variant="display">👋</Text>
        <Text variant="title" accessibilityRole="header">
          {t("title")}
        </Text>
        <Text tone="muted">{t("subtitle")}</Text>
      </View>
      <Field
        label={t("nameLabel")}
        value={nameValue}
        onChangeText={setName}
        placeholder={t("namePlaceholder")}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={60}
        autoFocus
      />
      <View style={{ gap: 6 }}>
        <Text variant="label" tone="muted">
          {t("currency")}
        </Text>
        <CurrencyButton value={currencyValue} onChange={setCurrency} />
        <Text variant="caption" tone="subtle">
          {t("currencyNote")}
        </Text>
      </View>
    </Screen>
  );
}
