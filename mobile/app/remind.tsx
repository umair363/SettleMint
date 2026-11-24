import { useMemberActions, useGroup, useRemind } from "@settlemint/client/data/queries";
import { reminderText } from "@settlemint/client/text/reminder";
import { ApiError, formatMoney, type GroupDetailDto, type TransferDto } from "@settlemint/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Share, Switch, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Card, Loading } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

/**
 * Remind someone who owes me. The notification and email only say a payment is
 * waiting (never who is asking). I can add my payment details and QR, and can
 * always share a message instead for people the app can't reach.
 * Params: groupId, from (the person who owes me), amount (minor units).
 */
export default function Remind() {
  const p = useLocalSearchParams<{ groupId: string; from: string; amount?: string }>();
  const group = useGroup(p.groupId ?? null);
  if (!group.data) return <Loading />;
  const transfer = group.data.transfers.find((x) => x.fromMemberId === p.from && x.toMemberId === group.data.myMemberId);
  if (!transfer) return <Loading />;
  return <RemindForm group={group.data} transfer={transfer} />;
}

function RemindForm({ group, transfer }: { group: GroupDetailDto; transfer: TransferDto }) {
  const { c } = useTheme();
  const t = useTranslations("remindSheet");
  const tc = useTranslations("common");
  const locale = useLocale();
  const remind = useRemind(group.id);
  const { setEmail } = useMemberActions(group.id);
  const debtor = group.members.find((m) => m.id === transfer.fromMemberId);
  const me = group.members.find((m) => m.isMe);
  const hasDetails = (me?.paymentHandles.length ?? 0) > 0;
  const [include, setInclude] = useState(true);
  const [email, setEmailText] = useState("");
  if (!debtor) return <Loading />;

  const withDetails = include && hasDetails;
  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const reach = debtor.claimed ? (debtor.hasEmail ? "reachAll" : "reachApp") : debtor.hasEmail ? "reachEmail" : "reachNone";
  const canSend = debtor.claimed || debtor.hasEmail;

  const send = () =>
    remind.mutate(
      { debtorMemberId: debtor.id, includePayment: withDetails },
      {
        onSuccess: (res) => {
          if (res.reachable) {
            haptic("success");
            toast.success(t("sent"));
            router.back();
          } else {
            toast.error(t("unreachable", { name: debtor.displayName }));
          }
        },
        onError: (err) => toast.error(err instanceof ApiError && err.code === "RATE_LIMITED" ? t("tooSoon", { name: debtor.displayName }) : t("failed")),
      },
    );

  return (
    <Screen
      sheet
      title={t("title", { name: debtor.displayName })}
      subtitle={t("body", { amount: formatMoney(transfer.amount, group.currency, { locale }), group: group.name })}
      headerRight={<IconButton icon="close" label={tc("close")} onPress={() => router.back()} />}
    >
      <Card style={{ gap: 14 }}>
        {hasDetails && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{t("include")}</Text>
              <Text variant="caption" tone="muted">
                {t("includeHint")}
              </Text>
            </View>
            <Switch
              value={include}
              onValueChange={(v) => {
                haptic("light");
                setInclude(v);
              }}
              trackColor={{ true: c.accent }}
              accessibilityLabel={t("include")}
            />
          </View>
        )}
        <Text variant="sub" tone="muted">
          {t(reach, { name: debtor.displayName })}
        </Text>
        {!debtor.claimed && (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Field
                value={email}
                onChangeText={setEmailText}
                placeholder={t("emailPlaceholder")}
                accessibilityLabel={t("emailLabel", { name: debtor.displayName })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
              />
            </View>
            <Button
              variant="secondary"
              disabled={!emailOk}
              loading={setEmail.isPending}
              onPress={() =>
                setEmail.mutate(
                  { memberId: debtor.id, email: email.trim() },
                  {
                    onSuccess: () => {
                      toast.success(t("emailSaved"));
                      setEmailText("");
                    },
                    onError: () => toast.error(t("emailInvalid")),
                  },
                )
              }
            >
              {t("emailAdd")}
            </Button>
          </View>
        )}
        <Text variant="caption" tone="subtle">
          {t("neutral")}
        </Text>
      </Card>

      <Button block icon="paper-plane-outline" loading={remind.isPending} disabled={!canSend} onPress={send}>
        {t("send")}
      </Button>
      <Button block variant="secondary" onPress={() => void Share.share({ message: reminderText(group, transfer, locale, { includePayment: withDetails }) })}>
        {t("share")}
      </Button>
    </Screen>
  );
}
