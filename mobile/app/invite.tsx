import { useGroup, useMemberActions } from "@settlemint/client/data/queries";
import { useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Share, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar, Card, Loading } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

function listOf(names: string[], locale: string) {
  try {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}

export default function Invite() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId ?? null);
  const { c, radius } = useTheme();
  const t = useTranslations("invite");
  const tc = useTranslations("common");
  const locale = useLocale();
  const link = useMutation({ mutationFn: (rotate: boolean) => api.groups.inviteLink(groupId!, rotate) });
  const { add } = useMemberActions(groupId ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const emailOk = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());
  const [copied, setCopied] = useState(false);

  const { mutate, isIdle } = link;
  useEffect(() => {
    if (groupId && isIdle) mutate(false);
  }, [groupId, isIdle, mutate]);

  if (!group.data) return <Loading />;
  const g = group.data;
  const url = link.data?.url;
  const canRotate = g.members.find((m) => m.isMe)?.role !== "member";
  const unclaimed = g.members.filter((m) => !m.left && !m.claimed && !m.isMe);

  return (
    <Screen
      sheet
      title={t("title")}
      subtitle={t("description")}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
    >
      <Card style={{ gap: 12 }}>
        <View style={{ backgroundColor: c.surface2, borderRadius: radius.md, padding: 12 }}>
          <Text variant="sub" tone="muted" numberOfLines={1} selectable>
            {url ? url.replace(/^https?:\/\//, "") : "…"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            variant="secondary"
            icon={copied ? "checkmark" : "copy-outline"}
            style={{ flex: 1 }}
            disabled={!url}
            onPress={async () => {
              await Clipboard.setStringAsync(url!);
              haptic("light");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? tc("copied") : t("copyLink")}
          </Button>
          <Button
            icon="share-outline"
            style={{ flex: 1 }}
            disabled={!url}
            onPress={() => void Share.share({ message: t("shareText", { group: g.name, url: url! }) })}
          >
            {tc("share")}
          </Button>
        </View>
        <Text variant="caption" tone="subtle">
          {t("anyone")}
          {unclaimed.length > 0 ? ` ${t("pickName", { names: listOf(unclaimed.map((m) => m.displayName), locale) })}` : ""}
        </Text>
        {canRotate && url && (
          <Button variant="ghost" icon="refresh" onPress={() => link.mutate(true, { onSuccess: () => toast.success(t("resetDone")) })}>
            {t("reset")}
          </Button>
        )}
      </Card>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field label={t("addByName")} value={name} onChangeText={setName} placeholder={t("namePlaceholder")} maxLength={60} />
          </View>
          <Button
            variant="secondary"
            icon="person-add"
            disabled={!name.trim() || !emailOk}
            loading={add.isPending}
            onPress={() =>
              add.mutate(email.trim() ? { displayName: name.trim(), email: email.trim() } : { displayName: name.trim() }, {
                onSuccess: () => {
                  toast.success(t("added", { name: name.trim() }));
                  setName("");
                  setEmail("");
                },
              })
            }
          >
            {t("add")}
          </Button>
        </View>
        <Field
          value={email}
          onChangeText={setEmail}
          placeholder={t("emailPlaceholder")}
          accessibilityLabel={t("emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={254}
        />
        <Text variant="caption" tone="subtle">
          {t("addNote")} {t("emailNote")}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {g.members
          .filter((m) => !m.left)
          .map((m) => (
            <View
              key={m.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface2, borderRadius: 999, paddingVertical: 4, paddingStart: 4, paddingEnd: 12, opacity: m.claimed || m.isMe ? 1 : 0.75 }}
            >
              <Avatar name={m.displayName} size={24} />
              <Text variant="label">{m.isMe ? tc("you") : m.displayName}</Text>
            </View>
          ))}
      </View>
    </Screen>
  );
}
