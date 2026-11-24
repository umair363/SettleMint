import { FindFriend } from "@/features/friends";
import { Ionicons } from "@expo/vector-icons";
import { useCreateGroup, useMe } from "@settlemint/client/data/queries";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTranslations } from "use-intl";
import { GROUP_ICON } from "@/ui/glyphs";
import { useTheme } from "@/theme/theme";
import { Button, IconButton } from "@/ui/button";
import { CurrencyButton } from "@/ui/currency-picker";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Text } from "@/ui/text";

const TYPES = ["trip", "home", "couple", "event", "other"] as const;
type GroupType = (typeof TYPES)[number] | "direct";

export default function NewGroup() {
  const { c, radius } = useTheme();
  const t = useTranslations("newGroup");
  const tc = useTranslations("common");
  const me = useMe();
  const create = useCreateGroup();
  // "Add friend" is its own simple flow: just a name, no group to set up.
  const friend = useLocalSearchParams<{ friend?: string }>().friend === "1";
  const [type, setType] = useState<GroupType>(friend ? "direct" : "trip");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<string | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [person, setPerson] = useState("");
  const currencyValue = currency ?? me.data?.defaultCurrency ?? "USD";
  const direct = type === "direct";

  const addPerson = () => {
    const p = person.trim();
    if (p && !people.includes(p)) setPeople((ps) => [...ps, p]);
    setPerson("");
  };

  const submit = () => {
    const pending = person.trim();
    create.mutate(
      {
        // Splitting with one friend: a two-person group named after them.
        name: name.trim(),
        type,
        currency: currencyValue,
        simplifyDebts: true,
        people: direct ? [{ displayName: name.trim() }] : [...people, ...(pending ? [pending] : [])].map((displayName) => ({ displayName })),
      },
      {
        onSuccess: (group) => {
          router.dismiss();
          router.push({ pathname: "/group/[id]", params: { id: group.id } });
          if (!friend) router.push({ pathname: "/invite", params: { groupId: group.id } });
        },
      },
    );
  };

  return (
    <Screen
      sheet
      title={friend ? t("friendTitle") : t("title")}
      subtitle={friend ? t("friendBody") : undefined}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
      footer={
        <Button size="lg" block loading={create.isPending} disabled={!name.trim()} onPress={submit} testID="create-group">
          {direct ? (friend ? t("friendTitle") : t("startSplitting")) : t("create")}
        </Button>
      }
    >
      {friend && <FindFriend />}
      {!friend && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t("kind")}>
        {TYPES.map((k) => {
          const on = k === type;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setType(k)}
              style={{
                alignItems: "center",
                gap: 4,
                width: 76,
                paddingVertical: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: on ? c.accent : c.line,
                backgroundColor: on ? c.accentSoft : c.surface2,
              }}
            >
              <Ionicons name={GROUP_ICON[k]} size={24} color={on ? c.positive : c.fgMuted} />
              <Text variant="caption" tone={on ? "fg" : "muted"}>
                {t(`type.${k}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      )}

      <Field
        label={direct ? t("theirName") : t("name")}
        value={name}
        onChangeText={setName}
        placeholder={t(`placeholder.${type}`)}
        maxLength={direct ? 60 : 100}
        autoFocus
        testID="group-name"
      />

      <View style={{ gap: 6 }}>
        <Text variant="label" tone="muted">
          {t("currency")}
        </Text>
        <CurrencyButton value={currencyValue} onChange={setCurrency} />
      </View>

      {!direct && (
        <View style={{ gap: 8 }}>
          <Text variant="label" tone="muted">
            {t("whoIn")} <Text variant="label" tone="subtle">{t("optional")}</Text>
          </Text>
          {people.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {people.map((p) => (
                <Pressable
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={t("remove", { name: p })}
                  onPress={() => setPeople((ps) => ps.filter((x) => x !== p))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text variant="label">{p}</Text>
                  <Ionicons name="close" size={14} color={c.fgMuted} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Field
                value={person}
                onChangeText={setPerson}
                placeholder={t("typeName")}
                accessibilityLabel={t("addAnother")}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={addPerson}
                maxLength={60}
              />
            </View>
            <View style={{ paddingTop: 5 }}>
              <IconButton icon="add" label={t("addAnother")} onPress={addPerson} />
            </View>
          </View>
          <Text variant="caption" tone="subtle">
            {t("noAppNeeded")}
          </Text>
        </View>
      )}
    </Screen>
  );
}
