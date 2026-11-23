import { useCreateGroup, useMe } from "@settlemint/client/data/queries";
import { guessCurrency } from "@settlemint/client/text/currency-guess";
import { useState } from "react";
import { View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";

/** Split with one person: type a name and carry on. Behind the scenes it's a private two-person group. */
export function QuickFriend({ onCreated }: { onCreated: (groupId: string) => void }) {
  const t = useTranslations("expense");
  const locale = useLocale();
  const me = useMe();
  const create = useCreateGroup();
  const [name, setName] = useState("");
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    create.mutate(
      { name: n, type: "direct", currency: me.data?.defaultCurrency ?? guessCurrency(locale), simplifyDebts: true, people: [{ displayName: n }] },
      { onSuccess: (g) => onCreated(g.id) },
    );
  };
  return (
    <View style={{ gap: 10 }}>
      <Field
        value={name}
        onChangeText={setName}
        placeholder={t("friendPlaceholder")}
        accessibilityLabel={t("friendPlaceholder")}
        maxLength={60}
        returnKeyType="done"
        onSubmitEditing={submit}
        testID="friend-name"
      />
      <Button loading={create.isPending} disabled={!name.trim()} onPress={submit}>
        {t("friendAdd")}
      </Button>
    </View>
  );
}
