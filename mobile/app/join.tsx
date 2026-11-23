import { Ionicons } from "@expo/vector-icons";
import { keys, useMe } from "@settlemint/client/data/queries";
import { apiErrorText } from "@settlemint/client/text/api-error-text";
import { ApiError } from "@settlemint/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { setPendingInvite } from "@/features/pending-invite";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/button";
import { GroupMark } from "@/ui/glyphs";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar, Empty, Loading } from "@/ui/surface";
import { Text } from "@/ui/text";

/** Opened from an invite link: settlemint://join?t=TOKEN (same shape as the web link). */
export default function Join() {
  const { t: token = "" } = useLocalSearchParams<{ t?: string }>();
  const t = useTranslations("join");
  const { c, radius } = useTheme();
  const qc = useQueryClient();
  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  const me = useMe(signedIn);

  const preview = useQuery({
    queryKey: [...keys.invite(token), signedIn],
    queryFn: () => api.invites.preview(token),
    enabled: token.length >= 16,
    retry: false,
  });
  const [spot, setSpot] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");

  const memberOf = preview.data?.alreadyMember ? preview.data.group.id : null;
  useEffect(() => {
    if (memberOf) router.replace({ pathname: "/group/[id]", params: { id: memberOf } });
  }, [memberOf]);

  const join = useMutation({
    meta: { handlesErrors: true },
    mutationFn: async () => {
      if (!signedIn) {
        const { error } = await authClient.signIn.anonymous();
        if (error) throw new Error(t("guestFailed"));
      }
      return api.invites.join(token, spot && spot !== "new" ? { memberId: spot } : { displayName: name.trim() || undefined });
    },
    onSuccess: async (group) => {
      await qc.invalidateQueries();
      router.replace({ pathname: "/group/[id]", params: { id: group.id } });
    },
  });

  if (!token || (preview.error instanceof ApiError && preview.error.status === 404)) {
    return (
      <Screen>
        <Empty icon="link" title={t("badLinkTitle")} body={t("badLinkBody")} action={t("goHome")} onAction={() => router.replace("/")} />
      </Screen>
    );
  }
  if (preview.isPending || (signedIn && me.isPending) || memberOf) return <Loading />;
  if (preview.error) {
    return (
      <Screen>
        <Empty icon="cloud-offline" title={apiErrorText(preview.error)} action={t("goHome")} onAction={() => void preview.refetch()} />
      </Screen>
    );
  }

  const { group, openSpots } = preview.data;
  const needsName = !signedIn && (openSpots.length === 0 || spot === "new") && !name.trim();
  const joinError =
    join.error instanceof ApiError && join.error.code === "ALREADY_CLAIMED"
      ? t("claimed")
      : join.error
        ? join.error instanceof ApiError
          ? apiErrorText(join.error)
          : join.error.message
        : null;

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          {joinError ? (
            <Text tone="negative" center accessibilityLiveRegion="polite">
              {joinError}
            </Text>
          ) : null}
          <Button
            size="lg"
            block
            loading={join.isPending}
            disabled={(openSpots.length > 0 && !spot) || needsName}
            onPress={() => join.mutate()}
          >
            {signedIn ? t("join") : t("joinGuest")}
          </Button>
          {!signedIn && (
            <Button
              variant="ghost"
              onPress={async () => {
                // Come back to this invite after signing in.
                await setPendingInvite(token);
                router.replace("/sign-in");
              }}
            >
              {t.rich("haveAccount", { link: (chunks) => chunks })}
            </Button>
          )}
        </View>
      }
    >
      <View style={{ alignItems: "center", gap: 8, marginTop: 24 }}>
        <GroupMark id={group.id} type="other" size={72} />
        <Text tone="muted">{t("invitedTo")}</Text>
        <Text variant="title" center accessibilityRole="header">
          {group.name}
        </Text>
        <Text variant="sub" tone="muted">
          {t("people", { count: group.memberCount })} · {group.currency}
        </Text>
      </View>

      {openSpots.length > 0 && (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t("pickName")}>
          <Text variant="label" tone="muted">
            {t("whichYou")}
          </Text>
          {[...openSpots, { id: "new", displayName: t("someoneNew") }].map((s) => {
            const on = spot === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setSpot(s.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: on ? c.accent : c.line,
                  backgroundColor: on ? c.accentSoft : c.surface,
                }}
              >
                {s.id === "new" ? (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface3, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="person-add" size={18} color={c.fg} />
                  </View>
                ) : (
                  <Avatar name={s.displayName} size={36} />
                )}
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {s.displayName}
                </Text>
                {on && <Ionicons name="checkmark" size={20} color={c.positive} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {(openSpots.length === 0 || spot === "new") && !signedIn && (
        <Field label={t("yourName")} value={name} onChangeText={setName} placeholder={t("namePlaceholder")} autoComplete="name" />
      )}
    </Screen>
  );
}
