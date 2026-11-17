import { Ionicons } from "@expo/vector-icons";
import { LANGUAGES, formattingLocale, matchLanguage, type LanguagePreference } from "@settlemint/client/i18n/languages";
import { useMe, useUpdateMe } from "@settlemint/client/data/queries";
import { useQueryClient } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, Platform, Pressable, Switch, View } from "react-native";
import { useTranslations } from "use-intl";
import { appLockAvailable, isAppLockOn, setAppLock } from "@/features/app-lock";
import { PaymentHandlesCard } from "@/features/payment-handles";
import { pushState, turnPushOff, turnPushOn, type PushState } from "@/features/push";
import { deviceTags, useLanguage } from "@/i18n/i18n";
import { api } from "@/lib/api";
import { authClient, signOut } from "@/lib/auth";
import { useTheme, type ThemePreference } from "@/theme/theme";
import { Button } from "@/ui/button";
import { CurrencyButton } from "@/ui/currency-picker";
import { Field } from "@/ui/field";
import { Screen } from "@/ui/screen";
import { Avatar, Card, SectionHeader, Segmented } from "@/ui/surface";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

function SaveGuestAccount() {
  const qc = useQueryClient();
  const t = useTranslations("account");
  const { c } = useTheme();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(t("sendFailed"));
    setSent(true);
  };
  const verify = async () => {
    setBusy(true);
    setError(null);
    // Signing in while a guest moves the guest's groups to the real account.
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    setBusy(false);
    if (error) return setError(t("badCode"));
    await qc.invalidateQueries();
    toast.success(t("saved"));
  };

  return (
    <Card style={{ gap: 14, borderColor: c.accent }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Ionicons name="shield-checkmark" size={24} color={c.positive} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{t("guestTitle")}</Text>
          <Text variant="sub" tone="muted">
            {t("guestBody")}
          </Text>
        </View>
      </View>
      {sent ? (
        <>
          <Field
            label={t("codeSent", { email })}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            error={error}
          />
          <Button loading={busy} disabled={code.length !== 6} onPress={verify}>
            {t("saveAccount")}
          </Button>
        </>
      ) : (
        <>
          <Field
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={error}
          />
          <Button loading={busy} disabled={!email.includes("@")} onPress={send}>
            {t("sendCode")}
          </Button>
        </>
      )}
    </Card>
  );
}

function SettingRow({ icon, title, body, value, onChange, disabled }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={c.positive} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {body ? (
          <Text variant="sub" tone="muted">
            {body}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: c.accent, false: c.surface3 }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

function DeviceCard() {
  const t = useTranslations("notifications");
  const tm = useTranslations("mobile");
  const [push, setPush] = useState<PushState | null>(null);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [lock, setLock] = useState(false);

  useEffect(() => {
    void pushState().then(setPush);
    void appLockAvailable().then(setLockAvailable);
    void isAppLockOn().then(setLock);
  }, []);

  if (push === "unsupported" && !lockAvailable) return null;

  return (
    <Card style={{ gap: 18 }}>
      {push !== "unsupported" && push !== null && (
        <View style={{ gap: 10 }}>
          <SettingRow
            icon="notifications"
            title={t("title")}
            body={t("description")}
            value={push === "on"}
            disabled={push === "blocked"}
            onChange={async (on) => {
              try {
                setPush(on ? await turnPushOn() : await turnPushOff());
              } catch {
                toast.error(t("failed"));
              }
            }}
          />
          {push === "blocked" && (
            <View style={{ gap: 8 }}>
              <Text variant="sub" tone="warning">
                {tm("notificationsBlocked")}
              </Text>
              <Button variant="secondary" onPress={() => void Linking.openSettings()}>
                {tm("openSettings")}
              </Button>
            </View>
          )}
        </View>
      )}
      {lockAvailable && (
        <SettingRow
          icon="finger-print"
          title={tm("appLock")}
          body={tm("appLockHelp")}
          value={lock}
          onChange={async (on) => {
            if (await setAppLock(on, tm("unlockPrompt"))) setLock(on);
          }}
        />
      )}
    </Card>
  );
}

function LanguagePicker() {
  const t = useTranslations("account");
  const tm = useTranslations("mobile");
  const { c, radius } = useTheme();
  const { preference, setPreference, language } = useLanguage();
  const update = useUpdateMe();
  const [open, setOpen] = useState(false);
  const current = preference === "auto" ? t("languageAuto") : LANGUAGES.find((l) => l.code === preference)?.name;

  const choose = async (next: LanguagePreference) => {
    setOpen(false);
    const tags = deviceTags();
    const lang = next === "auto" ? matchLanguage(tags) : next;
    // Saved to the profile too, so notifications arrive in this language.
    update.mutate({ locale: formattingLocale(lang, tags) });
    const flips = (["ar", "ur"].includes(lang) !== ["ar", "ur"].includes(language)) && Platform.OS !== "web";
    if (flips) {
      Alert.alert(LANGUAGES.find((l) => l.code === lang)?.name ?? "", tm("restartNote"), [
        { text: "OK", onPress: () => void setPreference(next) },
      ]);
    } else {
      await setPreference(next);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("language")}: ${current}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 50,
          paddingHorizontal: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: pressed ? c.surface3 : c.surface2,
        })}
      >
        <Ionicons name="language" size={20} color={c.positive} />
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {current}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.fgSubtle} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: c.bgElevated, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 8, paddingBottom: 32 }}>
            {([{ code: "auto", name: t("languageAuto") }, ...LANGUAGES] as { code: LanguagePreference; name: string }[]).map((l) => (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: preference === l.code }}
                onPress={() => void choose(l.code)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  minHeight: 52,
                  paddingHorizontal: 16,
                  borderRadius: radius.md,
                  backgroundColor: pressed ? c.surface2 : "transparent",
                })}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {l.name}
                </Text>
                {preference === l.code && <Ionicons name="checkmark" size={20} color={c.positive} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function YourData() {
  const t = useTranslations("yourData");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { c } = useTheme();

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await api.me.export();
      const file = new File(Paths.cache, `settlemint-export-${new Date().toISOString().slice(0, 10)}.json`);
      file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json" });
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.me.delete();
      await signOut(qc);
    } catch {
      setDeleting(false);
      toast.error(t("deleteFailed"));
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text variant="heading">{t("title")}</Text>
        <Text variant="sub" tone="muted">
          {t("body")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {Platform.OS !== "web" && (
          <Button variant="secondary" icon="download-outline" loading={exporting} onPress={exportData}>
            {t("export")}
          </Button>
        )}
        <Button variant="danger" icon="trash-outline" onPress={() => setDeleteOpen(true)}>
          {t("delete")}
        </Button>
      </View>
      {deleteOpen && (
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }}>
          <Text variant="bodyStrong">{t("confirmTitle")}</Text>
          <Text variant="sub" tone="negative">
            {t("cantUndo")}
          </Text>
          {[t("point1"), t("point2"), t("point3")].map((p) => (
            <Text key={p} variant="sub" tone="muted">
              • {p}
            </Text>
          ))}
          <Field
            label={t("typeToConfirm", { word: t("confirmWord") })}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            variant="danger"
            loading={deleting}
            disabled={typed.trim().toLocaleUpperCase() !== t("confirmWord").toLocaleUpperCase()}
            onPress={deleteAccount}
          >
            {t("deleteMine")}
          </Button>
          <Button variant="ghost" onPress={() => setDeleteOpen(false)}>
            {tc("cancel")}
          </Button>
        </View>
      )}
    </Card>
  );
}

export default function Account() {
  const me = useMe();
  const update = useUpdateMe();
  const qc = useQueryClient();
  const t = useTranslations("account");
  const { preference, setPreference } = useTheme();
  const [name, setName] = useState<string | null>(null);

  if (!me.data) return null;
  const nameValue = name ?? me.data.name;

  return (
    <Screen title={t("title")}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Avatar name={me.data.name} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{me.data.isGuest ? t("guest") : me.data.name}</Text>
          {me.data.email && !me.data.isGuest ? (
            <Text variant="sub" tone="muted">
              {me.data.email}
            </Text>
          ) : null}
        </View>
      </View>

      {me.data.isGuest && <SaveGuestAccount />}

      <View>
        <SectionHeader title={t("profile")} />
        <Card style={{ gap: 14 }}>
          <Field label={t("name")} value={nameValue} onChangeText={setName} maxLength={60} autoComplete="name" />
          {name !== null && name.trim() !== me.data.name && (
            <Button
              loading={update.isPending}
              disabled={!name.trim()}
              onPress={() =>
                update.mutate(
                  { name: name.trim() },
                  {
                    onSuccess: () => {
                      setName(null);
                      toast.success(t("nameUpdated"));
                    },
                  },
                )
              }
            >
              {t("save")}
            </Button>
          )}
          <View style={{ gap: 6 }}>
            <Text variant="label" tone="muted">
              {t("defaultCurrency")}
            </Text>
            <CurrencyButton
              value={me.data.defaultCurrency ?? "USD"}
              onChange={(code) =>
                update.mutate({ defaultCurrency: code }, { onSuccess: () => toast.success(t("currencySet", { currency: code })) })
              }
            />
          </View>
        </Card>
      </View>

      <View>
        <SectionHeader title={t("appearance")} />
        <Card style={{ gap: 14 }}>
          <Segmented<ThemePreference>
            label={t("theme")}
            value={preference}
            onChange={setPreference}
            options={[
              { value: "auto", label: t("auto") },
              { value: "dark", label: t("dark") },
              { value: "light", label: t("light") },
            ]}
          />
          <LanguagePicker />
        </Card>
      </View>

      <DeviceCard />
      {!me.data.isGuest && <PaymentHandlesCard />}
      <YourData />

      <Button variant="secondary" size="lg" icon="log-out-outline" onPress={() => void signOut(qc)}>
        {t("signOut")}
      </Button>
      <Text variant="caption" tone="subtle" center>
        {t("tagline")}
      </Text>
    </Screen>
  );
}
