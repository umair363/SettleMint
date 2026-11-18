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

type Step = "signin" | "signup" | "forgot" | "reset" | "verify" | "code";
type SignInT = ReturnType<typeof useTranslations<"signIn">>;
type AuthResult = { data?: unknown; error?: { code?: string; status?: number } | null };

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

/**
 * Email and password first, like every app: sign in, create an account (then
 * confirm the email with a code), forgot password (code, then a new password).
 * An emailed sign-in code and a guest session stay as quieter options.
 */
export default function SignIn() {
  const t = useTranslations("signIn");
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const go = (next: Step) => {
    setError(null);
    setCode("");
    setCodeSent(false);
    setStep(next);
  };
  const askForCode = (next: Step) => {
    go(next);
    setCodeSent(true);
    setResendIn(30);
    setTimeout(() => codeRef.current?.focus(), 120);
  };

  /** One auth call with the busy and error handling every button needs; null when it failed. */
  const run = async (fallback: string, call: () => Promise<AuthResult>, opts: { fresh?: boolean } = {}) => {
    setError(null);
    setBusy(true);
    try {
      // Never show a previous account's saved data to whoever signs in next.
      if (opts.fresh) await startFresh(qc);
      const res = await call();
      if (res.error) {
        setError(errorText(t, res.error, fallback));
        return null;
      }
      return res;
    } catch {
      setError(fallback);
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Signing in flips the session; the root layout then shows the app (or onboarding).
  const signIn = async () => {
    setError(null);
    setBusy(true);
    await startFresh(qc);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    // Account exists but its email isn't confirmed: the API just sent a code.
    if (err?.code === "EMAIL_NOT_VERIFIED") return askForCode("verify");
    if (err) setError(errorText(t, err, t("wrongPassword")));
  };

  const signUp = async () => {
    setError(null);
    setBusy(true);
    await startFresh(qc);
    const { data, error: err } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
    setBusy(false);
    if (err) return setError(errorText(t, err, t("createFailed")));
    if (!data?.token) askForCode("verify");
  };

  const verifyEmail = async (value: string) => {
    if (value.length !== 6) return;
    const res = await run(t("badCode"), () => authClient.emailOtp.verifyEmail({ email: email.trim(), otp: value }), { fresh: true });
    if (!res) setCode("");
  };

  const sendReset = async () => {
    const res = await run(t("sendFailed"), () => authClient.emailOtp.requestPasswordReset({ email: email.trim() }));
    if (res) askForCode("reset");
  };

  const resetPassword = async () => {
    const res = await run(t("badCode"), () => authClient.emailOtp.resetPassword({ email: email.trim(), otp: code, password }));
    if (res) await run(t("wrongPassword"), () => authClient.signIn.email({ email: email.trim(), password }), { fresh: true });
  };

  const sendLoginCode = async () => {
    const res = await run(t("sendFailed"), () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }));
    if (res) askForCode("code");
  };

  const loginWithCode = async (value: string) => {
    if (value.length !== 6) return;
    const res = await run(t("badCode"), () => authClient.signIn.emailOtp({ email: email.trim(), otp: value }), { fresh: true });
    if (!res) setCode("");
  };

  const asGuest = () => run(t("guestFailed"), () => authClient.signIn.anonymous(), { fresh: true });
  const google = () => run(t("sendFailed"), () => authClient.signIn.social({ provider: "google", callbackURL: "/" }), { fresh: true });
  const link = (path: string) => () => void WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);

  const heading = (title: string, sub?: string) => (
    <View style={{ gap: 6 }}>
      <Text variant="title" center accessibilityRole="header">
        {title}
      </Text>
      {sub ? (
        <Text tone="muted" center>
          {sub}
        </Text>
      ) : null}
    </View>
  );
  const emailField = (autoFocus = false) => (
    <Field
      label={t("email")}
      value={email}
      onChangeText={setEmail}
      placeholder={t("emailPlaceholder")}
      keyboardType="email-address"
      autoCapitalize="none"
      autoComplete="email"
      textContentType="emailAddress"
      autoFocus={autoFocus}
      testID="email"
    />
  );
  const codeInput = (onComplete?: (v: string) => void) => (
    <TextInput
      ref={codeRef}
      value={code}
      onChangeText={(v) => {
        const digits = v.replace(/\D/g, "").slice(0, 6);
        setCode(digits);
        if (digits.length === 6) onComplete?.(digits);
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
  );
  const errorLine = error ? (
    <Text tone="negative" center accessibilityLiveRegion="polite">
      {error}
    </Text>
  ) : null;
  const resend = (onPress: () => void) => (
    <Button variant="ghost" disabled={resendIn > 0 || busy} onPress={onPress}>
      {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
    </Button>
  );
  const back = (
    <Button variant="ghost" onPress={() => go("signin")}>
      {t("backToSignIn")}
    </Button>
  );

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

        {step === "signin" && (
          <View style={{ gap: 16 }}>
            {heading(t("welcomeBack"), t("signInSubtitle"))}
            {emailField(true)}
            <Field
              label={t("password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              error={error}
              returnKeyType="go"
              onSubmitEditing={signIn}
            />
            <Button size="lg" block loading={busy} disabled={!email.includes("@") || !password} onPress={signIn}>
              {t("signIn")}
            </Button>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button variant="ghost" onPress={() => go("forgot")}>
                {t("forgot")}
              </Button>
              <Button variant="ghost" onPress={() => go("signup")}>
                {t("createAccount")}
              </Button>
            </View>
            {GOOGLE_SIGN_IN && (
              <Button size="lg" block variant="secondary" icon="logo-google" onPress={google}>
                {t("google")}
              </Button>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <Button variant="ghost" icon="mail" onPress={() => go("code")}>
                {t("useCode")}
              </Button>
              <Button variant="ghost" icon="sparkles" onPress={asGuest} disabled={busy} testID="guest">
                {t("guest")}
              </Button>
            </View>
          </View>
        )}

        {step === "signup" && (
          <View style={{ gap: 14 }}>
            {heading(t("createTitle"), t("createSubtitle"))}
            <Field label={t("yourName")} value={name} onChangeText={setName} autoComplete="name" textContentType="name" autoFocus />
            {emailField()}
            <Field
              label={t("password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              hint={t("passwordHint")}
              error={error}
            />
            <Button size="lg" block loading={busy} disabled={!email.includes("@") || password.length < 8 || !name.trim()} onPress={signUp}>
              {t("createAccount")}
            </Button>
            <Button variant="ghost" onPress={() => go("signin")}>
              {t("haveAccount")}
            </Button>
          </View>
        )}

        {step === "verify" && (
          <View style={{ gap: 16 }}>
            {heading(t("confirmEmail"))}
            <Text tone="muted" center>
              {t.rich("codeSent", { email, b: (chunks) => <Text variant="bodyStrong">{chunks}</Text> })}
            </Text>
            {codeInput(verifyEmail)}
            {errorLine}
            <Button size="lg" block loading={busy} disabled={code.length !== 6} onPress={() => verifyEmail(code)}>
              {t("continue")}
            </Button>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Button variant="ghost" onPress={() => go("signup")}>
                {t("otherEmail")}
              </Button>
              {resend(async () => {
                const res = await run(t("sendFailed"), () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" }));
                if (res) setResendIn(30);
              })}
            </View>
          </View>
        )}

        {step === "forgot" && (
          <View style={{ gap: 16 }}>
            {heading(t("resetTitle"), t("resetBody"))}
            {emailField(true)}
            {errorLine}
            <Button size="lg" block loading={busy} disabled={!email.includes("@")} onPress={sendReset}>
              {t("sendResetCode")}
            </Button>
            {back}
          </View>
        )}

        {step === "reset" && (
          <View style={{ gap: 14 }}>
            {heading(t("resetTitle"))}
            <Text tone="muted" center>
              {t.rich("codeSent", { email, b: (chunks) => <Text variant="bodyStrong">{chunks}</Text> })}
            </Text>
            {codeInput()}
            <Field
              label={t("newPassword")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              hint={t("passwordHint")}
              error={error}
            />
            <Button size="lg" block loading={busy} disabled={code.length !== 6 || password.length < 8} onPress={resetPassword}>
              {t("setNewPassword")}
            </Button>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {back}
              {resend(sendReset)}
            </View>
          </View>
        )}

        {step === "code" && (
          <View style={{ gap: 16 }}>
            {codeSent ? (
              <>
                {heading(t("checkEmail"))}
                <Text tone="muted" center>
                  {t.rich("codeSent", { email, b: (chunks) => <Text variant="bodyStrong">{chunks}</Text> })}
                </Text>
                {codeInput(loginWithCode)}
                {errorLine}
                <Button size="lg" block loading={busy} disabled={code.length !== 6} onPress={() => loginWithCode(code)}>
                  {t("continue")}
                </Button>
                {resend(sendLoginCode)}
              </>
            ) : (
              <>
                {heading(t("useCode"))}
                {emailField(true)}
                {errorLine}
                <Button size="lg" block loading={busy} disabled={!email.includes("@")} onPress={sendLoginCode}>
                  {t("emailCode")}
                </Button>
              </>
            )}
            {back}
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
