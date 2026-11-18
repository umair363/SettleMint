"use client";

import { ArrowRight, KeyRound, Mail, Sparkles } from "@/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "use-intl";
import { AuthLayout } from "@/features/auth/auth-layout";
import { I18nProvider } from "@/i18n/provider";
import { safeNext } from "@/features/auth/safe-next";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_SIGN_IN } from "@/lib/env";
import { persister } from "@/lib/persist";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";

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
    case "PASSWORD_COMPROMISED":
      return t("passwordBreached");
    case "INVALID_EMAIL":
      return t("badEmail");
    default:
      return fallback;
  }
}

/** Where to go after signing in. Read when needed (not during render), so the page pre-renders fully. */
function nextPath() {
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

// Outside the app's providers (kept light), so it brings its own translations.
export default function SignInPage() {
  return (
    <I18nProvider>
      <SignIn />
    </I18nProvider>
  );
}

function SignIn() {
  const router = useRouter();
  const t = useTranslations("signIn");
  // Already signed in (e.g. tapped "Get started" again): go straight on. Better Auth's
  // session endpoint answers "no session" with a 200, so a signed-out visit logs no error.
  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  // Only for a session that existed when the page opened; a session created by
  // signing in or up here is routed by that action (e.g. new accounts go to onboarding).
  const acted = useRef(false);
  useEffect(() => {
    if (signedIn && !acted.current) router.replace(nextPath());
  }, [signedIn, router]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  // The code confirms a new password account's email (instead of signing in by code).
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const finish = async (isNewAccount = false) => {
    // Never show a previous account's saved data to whoever signs in next.
    await persister.removeClient();
    router.replace(isNewAccount ? `/welcome?next=${encodeURIComponent(nextPath())}` : nextPath());
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    acted.current = true;
    setBusy(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: confirming ? "email-verification" : "sign-in",
    });
    setBusy(false);
    if (error) return setError(errorText(t, error, t("sendFailed")));
    setStep("code");
    setResendIn(30);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (value: string) => {
    if (value.length !== 6) return;
    setError(null);
    acted.current = true;
    setBusy(true);
    const { error } = confirming
      ? await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: value })
      : await authClient.signIn.emailOtp({ email: email.trim(), otp: value });
    setBusy(false);
    if (error) {
      setCode("");
      return setError(errorText(t, error, t("badCode")));
    }
    await finish(confirming && creating);
  };

  const withPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    acted.current = true;
    setBusy(true);
    const { data, error } = creating
      ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    // Password accounts confirm their email first; the API has just emailed a code.
    const needsCode = creating ? !error && !data?.token : error?.code === "EMAIL_NOT_VERIFIED";
    if (needsCode) {
      setConfirming(true);
      setCode("");
      setStep("code");
      setResendIn(30);
      setTimeout(() => codeRef.current?.focus(), 50);
      return;
    }
    if (error) return setError(errorText(t, error, creating ? t("createFailed") : t("wrongPassword")));
    await finish(creating);
  };

  const asGuest = async () => {
    acted.current = true;
    setBusy(true);
    const { error } = await authClient.signIn.anonymous();
    setBusy(false);
    if (error) return setError(errorText(t, error, t("guestFailed")));
    await finish();
  };

  const google = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${nextPath()}`,
      errorCallbackURL: `${window.location.origin}/sign-in`,
    });
  };

  return (
    <AuthLayout
      footer={
        <>
          {t.rich("agree", {
            terms: (chunks) => (
              <Link href="/terms" className="underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </>
      }
    >
        {step === "email" && (
          <form
            key="email"
            onSubmit={sendCode}
            className="animate-enter space-y-5"
          >
            <div className="space-y-1.5 text-center">
              <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="text-fg-muted">{t("subtitle")}</p>
            </div>
            <TextField
              type="email"
              label={t("email")}
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              leading={<Mail className="size-4" />}
              error={error}
            />
            <Button type="submit" block size="lg" loading={busy} trailing={<ArrowRight className="size-4 rtl:rotate-180" />}>
              {t("emailCode")}
            </Button>
            {GOOGLE_SIGN_IN && (
              <Button variant="secondary" block size="lg" onClick={google}>
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2Z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.2-3.7 1.2-2.9 0-5.3-1.9-6.2-4.5H2v2.9A11 11 0 0 0 12 23Z" />
                  <path fill="#FBBC05" d="M5.8 14.2A6.6 6.6 0 0 1 5.4 12c0-.8.1-1.5.4-2.2V6.9H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1 4.9l3.8-2.7Z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 6.9l3.8 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
                </svg>
                {t("google")}
              </Button>
            )}
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("password")} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
                <KeyRound className="size-4" /> {t("usePassword")}
              </button>
              <button type="button" onClick={asGuest} disabled={busy} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
                <Sparkles className="size-4" /> {t("guest")}
              </button>
            </div>
          </form>
        )}

        {step === "code" && (
          <div
            key="code"
            className="animate-enter space-y-5 text-center"
          >
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-semibold tracking-tight">{t("checkEmail")}</h1>
              <p className="text-fg-muted">
                {t.rich("codeSent", { email, b: (chunks) => <span className="font-medium text-fg">{chunks}</span> })}
              </p>
            </div>
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (v.length === 6) void verify(v);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t("codeLabel")}
              aria-invalid={error ? true : undefined}
              disabled={busy}
              placeholder="••••••"
              className="tabular h-16 w-full rounded-[var(--radius-lg)] border border-line bg-surface-2 text-center font-display text-3xl font-semibold tracking-[0.5em] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft"
            />
            {error && (
              <p role="alert" className="text-sm text-negative">
                {error}
              </p>
            )}
            <Button block size="lg" loading={busy} disabled={code.length !== 6} onClick={() => verify(code)}>
              {t("continue")}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setStep("email");
                }}
                className="text-fg-muted hover:text-fg"
              >
                {t("otherEmail")}
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => sendCode()}
                className="text-fg-muted hover:text-fg disabled:opacity-50"
              >
                {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
              </button>
            </div>
          </div>
        )}

        {step === "password" && (
          <form
            key="password"
            onSubmit={withPassword}
            className="animate-enter space-y-4"
          >
            <h1 className="text-center font-display text-3xl font-semibold tracking-tight">
              {creating ? t("createTitle") : t("welcomeBack")}
            </h1>
            {creating && (
              <TextField label={t("yourName")} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <TextField label={t("email")} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label={t("password")}
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={creating ? t("passwordHint") : undefined}
              error={error}
            />
            <Button type="submit" block size="lg" loading={busy}>
              {creating ? t("createAccount") : t("signIn")}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("email")} className="text-fg-muted hover:text-fg">
                {t("useCode")}
              </button>
              <button type="button" onClick={() => setCreating((c) => !c)} className="font-medium text-positive">
                {creating ? t("haveAccount") : t("createAccount")}
              </button>
            </div>
          </form>
        )}
    </AuthLayout>
  );
}
