import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslations } from "use-intl";
import { authClient, startFresh } from "@/lib/auth";
import { GOOGLE_SIGN_IN, WEB_URL } from "@/lib/env";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/button";
import { Field } from "@/ui/field";
import { Text } from "@/ui/text";

type Step = "email" | "code" | "password";
type SignInT = ReturnType<typeof useTranslations<"signIn">>;

/** Better Auth's messages are English; known codes get a translated sentence. */
function errorText(t: SignInT, err: { code?: string; status?: number } | null | undefined, fallback: string) {
  if (!err) return fallback;
  if (err.status === 429) return t("tooMany");
  switch (err.code) {
    case "INVALID_OTP":
      return t("badCode");
    case "OTP_EXPIRED":
      return t("codeExpired");
    case "INVALID_EMAIL_OR_PASSWORD":
      return t("wrongPassword");
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t("accountExists");
    case "PASSWORD_TOO_SHORT":
      return t("passwordShort");
    case "INVALID_EMAIL":
      return t("badEmail");
    default:
      return fallback;
  }
}

export default function SignIn() {
  const t = useTranslations("signIn");
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Signing in flips the session; the root layout then shows the app (or onboarding).
  const before = () => {
    setError(null);
    setBusy(true);
    return startFresh(qc);
  };

  const sendCode = async () => {
    setError(null);
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(errorText(t, error, t("sendFailed")));
    setStep("code");
    setResendIn(30);
    setTimeout(() => codeRef.current?.focus(), 100);
  };

  const verify = async (value: string) => {
    if (value.length !== 6) return;
    await before();
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: value });
    setBusy(false);
    if (error) {
      setCode("");
      setError(errorText(t, error, t("badCode")));
    }
  };

  const withPassword = async () => {
    await before();
    const { error } = creating
      ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(errorText(t, error, creating ? t("createFailed") : t("wrongPassword")));
  };

  const asGuest = async () => {
    await before();
    const { error } = await authClient.signIn.anonymous();
    setBusy(false);
    if (error) setError(errorText(t, error, t("guestFailed")));
  };

  const google = async () => {
    await before();
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    setBusy(false);
    if (error) setError(errorText(t, error, t("sendFailed")));
  };

  const link = (path: string) => () => void WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
      >
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="leaf" size={32} color={c.accentFg} />
          </View>
        </View>

        {step === "email" && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text variant="title" center accessibilityRole="header">
                {t("title")}
              </Text>
              <Text tone="muted" center>
                {t("subtitle")}
              </Text>
            </View>
            <Field
              label={t("email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("emailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={sendCode}
              error={error}
              testID="email"
            />
            <Button size="lg" block loading={busy} disabled={!email.includes("@")} onPress={sendCode} icon="mail">
              {t("emailCode")}
            </Button>
            {GOOGLE_SIGN_IN && (
              <Button size="lg" block variant="secondary" icon="logo-google" onPress={google}>
                {t("google")}
              </Button>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <Button variant="ghost" icon="key" onPress={() => setStep("password")}>
                {t("usePassword")}
              </Button>
              <Button variant="ghost" icon="sparkles" onPress={asGuest} disabled={busy} testID="guest">
                {t("guest")}
              </Button>
            </View>
          </View>
        )}

        {step === "code" && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text variant="title" center accessibilityRole="header">
                {t("checkEmail")}
              </Text>
              <Text tone="muted" center>
                {t.rich("codeSent", { email, b: (chunks) => <Text variant="bodyStrong">{chunks}</Text> })}
              </Text>
            </View>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                if (digits.length === 6) void verify(digits);
              }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              accessibilityLabel={t("codeLabel")}
              editable={!busy}
              placeholder="••••••"
              placeholderTextColor={c.fgSubtle}
              style={{
                height: 68,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: error ? c.negative : c.line,
                backgroundColor: c.surface2,
                textAlign: "center",
                fontSize: 32,
                fontWeight: "700",
                letterSpacing: 12,
                color: c.fg,
                fontVariant: ["tabular-nums"],
              }}
            />
            {error ? (
              <Text tone="negative" center accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Button size="lg" block loading={busy} disabled={code.length !== 6} onPress={() => verify(code)}>
              {t("continue")}
            </Button>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button variant="ghost" onPress={() => setStep("email")}>
                {t("otherEmail")}
              </Button>
              <Button variant="ghost" disabled={resendIn > 0 || busy} onPress={sendCode}>
                {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
              </Button>
            </View>
          </View>
        )}

        {step === "password" && (
          <View style={{ gap: 14 }}>
            <Text variant="title" center accessibilityRole="header">
              {creating ? t("createTitle") : t("welcomeBack")}
            </Text>
            {creating && <Field label={t("yourName")} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />}
            <Field
              label={t("email")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Field
              label={t("password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={creating ? "new-password" : "current-password"}
              textContentType={creating ? "newPassword" : "password"}
              hint={creating ? t("passwordHint") : undefined}
              error={error}
              returnKeyType="go"
              onSubmitEditing={withPassword}
            />
            <Button size="lg" block loading={busy} onPress={withPassword} disabled={!email || password.length < 8 || (creating && !name.trim())}>
              {creating ? t("createAccount") : t("signIn")}
            </Button>
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" }}>
              <Button variant="ghost" onPress={() => setStep("email")}>
                {t("useCode")}
              </Button>
              <Button variant="ghost" onPress={() => setCreating((v) => !v)}>
                {creating ? t("haveAccount") : t("createAccount")}
              </Button>
            </View>
          </View>
        )}

        <Text variant="caption" tone="subtle" center style={{ marginTop: 8 }}>
          {t.rich("agree", {
            terms: (chunks) => (
              <Text variant="caption" tone="muted" style={{ textDecorationLine: "underline" }} onPress={link("/terms")}>
                {chunks}
              </Text>
            ),
            privacy: (chunks) => (
              <Text variant="caption" tone="muted" style={{ textDecorationLine: "underline" }} onPress={link("/privacy")}>
                {chunks}
              </Text>
            ),
          })}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

