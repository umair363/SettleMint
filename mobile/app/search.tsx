import type { CategoryKey } from "@settlemint/client/i18n/messages/en";
import { dayLabel } from "@settlemint/client/text/dates";
import { getCategoryMeta } from "@settlemint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { GroupIcon } from "@/features/rows";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Card, Divider, Money, Row, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";

/** Search every expense and group you're in. */
export default function Search() {
  const { c, radius } = useTheme();
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const tcat = useTranslations("categories");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(timer);
  }, [q]);

  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => api.search(debounced),
    enabled: debounced.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const data = debounced ? results.data : undefined;
  const empty = data && data.groups.length === 0 && data.expenses.length === 0;
  const open = (groupId: string) => {
    router.back();
    router.push({ pathname: "/group/[id]", params: { id: groupId } });
  };

  return (
    <Screen sheet title={t("title")} headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}>
      <View>
        <Field
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder={t("placeholder")}
          accessibilityLabel={t("label")}
          returnKeyType="search"
          autoCorrect={false}
        />
        {results.isFetching && (
          <ActivityIndicator color={c.positive} style={{ position: "absolute", end: 14, top: 15 }} />
        )}
      </View>
      {!debounced && (
        <Text variant="sub" tone="muted">
          {t("hint")}
        </Text>
      )}
      {empty && (
        <Text variant="sub" tone="muted">
          {t("noMatch", { query: debounced })}
        </Text>
      )}
      {data && data.groups.length > 0 && (
        <View>
          <SectionHeader title={t("groups")} />
          <Card padded={false}>
            {data.groups.map((g, i) => (
              <View key={g.id}>
                {i > 0 && <Divider inset={72} />}
                <Row leading={<GroupIcon type={g.type} emoji={g.emoji} />} title={g.name} onPress={() => open(g.id)} chevron />
              </View>
            ))}
          </Card>
        </View>
      )}
      {data && data.expenses.length > 0 && (
        <View>
          <SectionHeader title={t("expenses")} />
          <Card padded={false}>
            {data.expenses.map((e, i) => {
              const cat = getCategoryMeta(e.category);
              return (
                <View key={e.id}>
                  {i > 0 && <Divider inset={68} />}
                  <Row
                    leading={
                      <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20, lineHeight: 26 }} accessibilityLabel={tcat(cat.id as CategoryKey)}>
                          {cat.emoji}
                        </Text>
                      </View>
                    }
                    title={e.description}
                    subtitle={`${e.groupName} · ${dayLabel(e.date, locale)}`}
                    trailing={<Money minor={e.amount} currency={e.currency} variant="bodyStrong" />}
                    onPress={() => open(e.groupId)}
                  />
                </View>
              );
            })}
          </Card>
        </View>
      )}
    </Screen>
  );
}
