"use client";

import { Mail, Sparkles } from "@/ui/icons";
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
import { isPasswordBreached } from "@/lib/pwned";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";

/**
 * Sign in the way every app does it: email and password first. Creating an
 * account asks for a name, email and password, then confirms the email with a
 * code (so nobody can register with someone else's address). "Forgot
 * password" sends a code and sets a new one. An emailed sign-in code and a
 * guest session stay available as quieter options.
 */
type Step = "signin" | "signup" | "forgot" | "reset" | "verify" | "code";

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

function CodeBox({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  label,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  error: boolean;
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(v);
        if (v.length === 6) onComplete?.(v);
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label={label}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
      placeholder="••••••"
      className="tabular h-16 w-full rounded-[var(--radius-lg)] bg-surface-2 text-center font-wide text-3xl font-[620] tracking-[0.5em] text-fg shadow-[inset_0_0_0_1px_var(--line)] placeholder:text-fg-subtle focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--focus)]"
    />
  );
}

function SignIn() {
  const router = useRouter();
  const t = useTranslations("signIn");
  // Already signed in (e.g. tapped "Get started" again): go straight on.
  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  // Only for a session that existed when the page opened; a session created here
  // is routed by that action (new accounts go to onboarding).
  const acted = useRef(false);
  useEffect(() => {
    if (signedIn && !acted.current) router.replace(nextPath());
  }, [signedIn, router]);

  const [step, setStep] = useState<Step>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  // The emailed-code screen asks for the address first, then for the code.
  const [codeSent, setCodeSent] = useState(false);
  // Advice only: a password seen in a breach gets a note, never a refusal.
  const [checked, setChecked] = useState<{ password: string; breached: boolean } | null>(null);
  const breached = (step === "signup" || step === "reset") && checked?.password === password && checked.breached;
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((step !== "signup" && step !== "reset") || password.length < 8) return;
    const abort = new AbortController();
    const timer = setTimeout(
      () => void isPasswordBreached(password, abort.signal).then((b) => !abort.signal.aborted && setChecked({ password, breached: b })),
      600,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [password, step]);

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
    setTimeout(() => codeRef.current?.focus(), 60);
  };

  const finish = async (isNewAccount = false) => {
    // Never show a previous account's saved data to whoever signs in next.
    await persister.removeClient();
    router.replace(isNewAccount ? `/welcome?next=${encodeURIComponent(nextPath())}` : nextPath());
  };

  /** Run one auth call with the busy and error handling every button needs. */
  const run = async (fallback: string, call: () => Promise<{ error?: { code?: string; status?: number } | null } | { data?: unknown; error?: unknown }>) => {
    setError(null);
    acted.current = true;
    setBusy(true);
    try {
      const res = (await call()) as { error?: { code?: string; status?: number } | null };
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

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    acted.current = true;
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    // The account exists but its email isn't confirmed yet: the API just sent a code.
    if (err?.code === "EMAIL_NOT_VERIFIED") return askForCode("verify");
    if (err) return setError(errorText(t, err, t("wrongPassword")));
    await finish();
  };

  const signUp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    acted.current = true;
    setBusy(true);
    const { data, error: err } = await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
    setBusy(false);
    if (err) return setError(errorText(t, err, t("createFailed")));
    // Production confirms the email first (no session yet); local testing signs straight in.
    if (!data?.token) return askForCode("verify");
    await finish(true);
  };

  const verifyEmail = async (value: string) => {
    if (value.length !== 6) return;
    const res = await run(t("badCode"), () => authClient.emailOtp.verifyEmail({ email: email.trim(), otp: value }));
    if (!res) return setCode("");
    await finish(true);
  };

  const sendReset = async (e?: FormEvent) => {
    e?.preventDefault();
    const res = await run(t("sendFailed"), () => authClient.emailOtp.requestPasswordReset({ email: email.trim() }));
    if (res) askForCode("reset");
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    const res = await run(t("badCode"), () => authClient.emailOtp.resetPassword({ email: email.trim(), otp: code, password }));
    if (!res) return;
    // Their new password works straight away.
    const signedIn = await run(t("wrongPassword"), () => authClient.signIn.email({ email: email.trim(), password }));
    if (signedIn) await finish();
  };

  const sendLoginCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const res = await run(t("sendFailed"), () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }));
    if (res) askForCode("code");
  };

  const loginWithCode = async (value: string) => {
    if (value.length !== 6) return;
    const res = await run(t("badCode"), () => authClient.signIn.emailOtp({ email: email.trim(), otp: value }));
    if (!res) return setCode("");
    await finish();
  };

  const asGuest = async () => {
    const res = await run(t("guestFailed"), () => authClient.signIn.anonymous());
    if (res) await finish();
  };

  const google = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${nextPath()}`,
      errorCallbackURL: `${window.location.origin}/sign-in`,
    });
  };

  const heading = (title: string, sub?: string) => (
    <div className="space-y-2 text-center">
      <h1 className="font-wide text-[30px] font-[640] leading-[1.1] tracking-[-0.025em] text-balance">{title}</h1>
      {sub && <p className="text-[16px] leading-snug text-fg-muted">{sub}</p>}
    </div>
  );
  const linkButton = (label: string, onClick: () => void, strong = false) => (
    <button
      type="button"
      onClick={onClick}
      className={strong ? "font-[600] text-positive hover:underline" : "text-fg-muted hover:text-fg"}
    >
      {label}
    </button>
  );
  const emailField = (autoFocus = false) => (
    <TextField
      type="email"
      label={t("email")}
      autoComplete="email"
      inputMode="email"
      required
      autoFocus={autoFocus}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder={t("emailPlaceholder")}
    />
  );
  const googleButton = GOOGLE_SIGN_IN && (
    <Button variant="secondary" block size="lg" onClick={google}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2Z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.2-3.7 1.2-2.9 0-5.3-1.9-6.2-4.5H2v2.9A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.8 14.2A6.6 6.6 0 0 1 5.4 12c0-.8.1-1.5.4-2.2V6.9H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1 4.9l3.8-2.7Z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 6.9l3.8 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
      </svg>
      {t("google")}
    </Button>
  );

  return (
    <AuthLayout
      footer={t.rich("agree", {
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
    >
      {step === "signin" && (
        <form key="signin" onSubmit={signIn} className="animate-enter space-y-5">
          {heading(t("welcomeBack"), t("signInSubtitle"))}
          {emailField(true)}
          <TextField
            label={t("password")}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
          <Button type="submit" block size="lg" loading={busy}>
            {t("signIn")}
          </Button>
          <div className="flex items-center justify-between text-[15px]">
            {linkButton(t("forgot"), () => go("forgot"))}
            {linkButton(t("createAccount"), () => go("signup"), true)}
          </div>
          {googleButton}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4 text-[14px]">
            <button type="button" onClick={() => (email.includes("@") ? sendLoginCode() : go("code"))} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              <Mail className="size-4" /> {t("useCode")}
            </button>
            <button type="button" onClick={asGuest} disabled={busy} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
              <Sparkles className="size-4" /> {t("guest")}
            </button>
          </div>
        </form>
      )}

      {step === "signup" && (
        <form key="signup" onSubmit={signUp} className="animate-enter space-y-5">
          {heading(t("createTitle"), t("createSubtitle"))}
          <TextField label={t("yourName")} autoComplete="name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          {emailField()}
          <TextField
            label={t("password")}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={breached ? t("passwordBreached") : t("passwordHint")}
            error={error}
          />
          <Button type="submit" block size="lg" loading={busy}>
            {t("createAccount")}
          </Button>
          {googleButton}
          <p className="text-center text-[15px]">{linkButton(t("haveAccount"), () => go("signin"), true)}</p>
        </form>
      )}

      {step === "verify" && (
        <div key="verify" className="animate-enter space-y-5 text-center">
          {heading(t("confirmEmail"), undefined)}
          <p className="text-[16px] leading-snug text-fg-muted">
            {t.rich("codeSent", { email, b: (chunks) => <span className="font-[600] text-fg">{chunks}</span> })}
          </p>
          <CodeBox value={code} onChange={setCode} onComplete={verifyEmail} disabled={busy} error={Boolean(error)} label={t("codeLabel")} inputRef={codeRef} />
          {error && (
            <p role="alert" className="text-sm text-negative">
              {error}
            </p>
          )}
          <Button block size="lg" loading={busy} disabled={code.length !== 6} onClick={() => verifyEmail(code)}>
            {t("continue")}
          </Button>
          <div className="flex items-center justify-between text-[15px]">
            {linkButton(t("otherEmail"), () => go("signup"))}
            <button
              type="button"
              disabled={resendIn > 0 || busy}
              onClick={async () => {
                const res = await run(t("sendFailed"), () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" }));
                if (res) setResendIn(30);
              }}
              className="text-fg-muted hover:text-fg disabled:opacity-50"
            >
              {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
            </button>
          </div>
        </div>
      )}

      {step === "forgot" && (
        <form key="forgot" onSubmit={sendReset} className="animate-enter space-y-5">
          {heading(t("resetTitle"), t("resetBody"))}
          {emailField(true)}
          {error && (
            <p role="alert" className="text-sm text-negative">
              {error}
            </p>
          )}
          <Button type="submit" block size="lg" loading={busy} disabled={!email.includes("@")}>
            {t("sendResetCode")}
          </Button>
          <p className="text-center text-[15px]">{linkButton(t("backToSignIn"), () => go("signin"))}</p>
        </form>
      )}

      {step === "reset" && (
        <form key="reset" onSubmit={resetPassword} className="animate-enter space-y-5">
          {heading(t("resetTitle"), undefined)}
          <p className="text-center text-[16px] leading-snug text-fg-muted">
            {t.rich("codeSent", { email, b: (chunks) => <span className="font-[600] text-fg">{chunks}</span> })}
          </p>
          <CodeBox value={code} onChange={setCode} disabled={busy} error={Boolean(error)} label={t("codeLabel")} inputRef={codeRef} />
          <TextField
            label={t("newPassword")}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={breached ? t("passwordBreached") : t("passwordHint")}
            error={error}
          />
          <Button type="submit" block size="lg" loading={busy} disabled={code.length !== 6 || password.length < 8}>
            {t("setNewPassword")}
          </Button>
          <div className="flex items-center justify-between text-[15px]">
            {linkButton(t("backToSignIn"), () => go("signin"))}
            <button type="button" disabled={resendIn > 0 || busy} onClick={() => void sendReset().then(() => setResendIn(30))} className="text-fg-muted hover:text-fg disabled:opacity-50">
              {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form key="code" onSubmit={sendLoginCode} className="animate-enter space-y-5">
          {codeSent ? (
            <>
              {heading(t("checkEmail"), undefined)}
              <p className="text-center text-[16px] leading-snug text-fg-muted">
                {t.rich("codeSent", { email, b: (chunks) => <span className="font-[600] text-fg">{chunks}</span> })}
              </p>
              <CodeBox value={code} onChange={setCode} onComplete={loginWithCode} disabled={busy} error={Boolean(error)} label={t("codeLabel")} inputRef={codeRef} />
              {error && (
                <p role="alert" className="text-center text-sm text-negative">
                  {error}
                </p>
              )}
              <Button type="button" block size="lg" loading={busy} disabled={code.length !== 6} onClick={() => loginWithCode(code)}>
                {t("continue")}
              </Button>
            </>
          ) : (
            <>
              {heading(t("useCode"), undefined)}
              {emailField(true)}
              {error && (
                <p role="alert" className="text-sm text-negative">
                  {error}
                </p>
              )}
              <Button type="submit" block size="lg" loading={busy} disabled={!email.includes("@")}>
                {t("emailCode")}
              </Button>
            </>
          )}
          <p className="text-center text-[15px]">{linkButton(t("backToSignIn"), () => go("signin"))}</p>
        </form>
      )}
    </AuthLayout>
  );
}
