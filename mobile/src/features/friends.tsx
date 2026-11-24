import { Ionicons } from "@expo/vector-icons";
import { useAddFriend, useAnswerFriendRequest, useCancelFriendRequest, useFriendRequests, useUpdateMe } from "@settlemint/client/data/queries";
import { ApiError } from "@settlemint/shared";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Avatar, Card, Divider, Row, SectionHeader } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

/**
 * Add a friend by exactly their email or @username. It never says whether an
 * email has an account: they get a request to accept, or an invitation.
 */
export function FindFriend() {
  const t = useTranslations("friends");
  const { c } = useTheme();
  const [to, setTo] = useState("");
  const add = useAddFriend();
  const requests = useFriendRequests();
  const cancel = useCancelFriendRequest();
  const outgoing = requests.data?.outgoing ?? [];

  const submit = () => {
    const typed = to.trim();
    if (!typed) return;
    add.mutate(typed, {
      onSuccess: () => {
        haptic("success");
        toast.success(t("sentDesc", { to: typed }));
        setTo("");
      },
      onError: (err) => {
        const message = err instanceof ApiError ? err.message : "";
        toast.error(
          !(err instanceof ApiError)
            ? t("failed")
            : err.code === "NOT_FOUND"
              ? t("notFound")
              : err.code === "RATE_LIMITED"
                ? t("tooMany")
                : err.code === "FORBIDDEN"
                  ? t("guest")
                  : err.code === "VALIDATION_ERROR"
                    ? message.includes("you")
                      ? t("self")
                      : t("badInput")
                    : t("failed"),
        );
      },
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Field
            value={to}
            onChangeText={setTo}
            placeholder={t("placeholder")}
            accessibilityLabel={t("placeholder")}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={254}
            returnKeyType="send"
            onSubmitEditing={submit}
            testID="friend-find"
          />
        </View>
        <Button icon="person-add" loading={add.isPending} disabled={!to.trim()} onPress={submit}>
          {t("send")}
        </Button>
      </View>
      <Text variant="caption" tone="subtle">
        {t("body")}
      </Text>
      {outgoing.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text variant="label" tone="muted">
            {t("waiting")}
          </Text>
          <Card padded={false}>
            {outgoing.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <Divider inset={16} />}
                <Row title={r.label} trailing={<IconButton icon="close" label={t("cancelLabel", { to: r.label })} onPress={() => cancel.mutate(r.id)} />} />
              </View>
            ))}
          </Card>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: c.line }} />
      <Text variant="label">{t("byName")}</Text>
    </View>
  );
}

/** People who asked to be my friend, with one tap to accept or decline. Nothing shows when there are none. */
export function FriendRequests() {
  const t = useTranslations("friends");
  const requests = useFriendRequests();
  const answer = useAnswerFriendRequest();
  const incoming = requests.data?.incoming ?? [];
  if (incoming.length === 0) return null;
  return (
    <View>
      <SectionHeader title={t("requestsTitle")} />
      <Card padded={false}>
        {incoming.map((r, i) => (
          <View key={r.id}>
            {i > 0 && <Divider inset={72} />}
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={r.name} id={r.id} size={44} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {r.username ? `@${r.username} · ` : ""}
                    {t("wantsToAdd")}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="ghost" disabled={answer.isPending} onPress={() => answer.mutate({ id: r.id, accept: false })}>
                  {t("decline")}
                </Button>
                <Button
                  disabled={answer.isPending}
                  onPress={() =>
                    answer.mutate(
                      { id: r.id, accept: true },
                      {
                        onSuccess: () => {
                          haptic("success");
                          toast.success(t("friendsNow", { name: r.name }));
                        },
                      },
                    )
                  }
                >
                  {t("accept")}
                </Button>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

/** The handle friends can add me by: a row that opens a small editor. */
export function UsernameRow({ current }: { current: string | null }) {
  const { c, radius } = useTheme();
  const t = useTranslations("friends");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const update = useUpdateMe();
  const clean = value.trim().replace(/^@/, "").toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(clean);

  const save = (username: string | null) =>
    update.mutate(
      { username },
      {
        onSuccess: () => {
          toast.success(t("usernameSaved"));
          setOpen(false);
        },
        onError: (err) => toast.error(err instanceof ApiError && err.code === "CONFLICT" ? t("usernameTaken") : err instanceof ApiError && err.code === "VALIDATION_ERROR" ? t("usernameInvalid") : t("failed")),
      },
    );

  return (
    <>
      <Card padded={false}>
        <Row
          leading={<Ionicons name="at" size={22} color={c.fgMuted} />}
          title={t("usernameRow")}
          trailing={
            <Text variant="sub" tone="muted">
              {current ? `@${current}` : t("usernameNone")}
            </Text>
          }
          chevron
          onPress={() => {
            setValue(current ?? "");
            setOpen(true);
          }}
        />
      </Card>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={tc("close")} onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: c.scrim }} />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading">{t("usernameTitle")}</Text>
              <Text variant="sub" tone="muted">
                {t("usernameBody")}
              </Text>
            </View>
            <IconButton icon="close" label={tc("close")} onPress={() => setOpen(false)} />
          </View>
          <Field
            value={value}
            onChangeText={setValue}
            placeholder={t("usernamePlaceholder")}
            accessibilityLabel={t("usernameRow")}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={21}
            error={value.trim() && !valid ? t("usernameInvalid") : null}
          />
          <Button block loading={update.isPending} disabled={!valid || clean === current} onPress={() => save(clean)}>
            {tc("save")}
          </Button>
          {current && (
            <Button block variant="ghost" onPress={() => save(null)}>
              {t("usernameRemove")}
            </Button>
          )}
        </View>
      </Modal>
    </>
  );
}
