"use client";

import { ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthLayout } from "@/features/auth/auth-layout";
import { safeNext } from "@/features/auth/safe-next";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_SIGN_IN } from "@/lib/env";
import { persister } from "@/lib/persist";
import { Button } from "@/ui/button";
import { TextField } from "@/ui/field";

type Step = "email" | "code" | "password";

function errorText(err: { message?: string; status?: number } | null | undefined, fallback: string) {
  if (!err) return fallback;
  if (err.status === 429) return "Too many attempts. Wait a minute and try again.";
  return err.message || fallback;
}

/** Where to go after signing in. Read when needed (not during render), so the page pre-renders fully. */
function nextPath() {
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

export default function SignInPage() {
  const router = useRouter();
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
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
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(errorText(error, "Couldn't send the code"));
    setStep("code");
    setResendIn(30);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (value: string) => {
    if (value.length !== 6) return;
    setError(null);
    acted.current = true;
    setBusy(true);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: value });
    setBusy(false);
    if (error) {
      setCode("");
      return setError(errorText(error, "That code didn't work"));
    }
    await finish();
  };

  const withPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    acted.current = true;
    setBusy(true);
    const { error } = creating
      ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(errorText(error, creating ? "Couldn't create the account" : "Wrong email or password"));
    await finish(creating);
  };

  const asGuest = async () => {
    acted.current = true;
    setBusy(true);
    const { error } = await authClient.signIn.anonymous();
    setBusy(false);
    if (error) return setError(errorText(error, "Couldn't start a guest session"));
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
          By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
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
              <h1 className="font-display text-3xl font-semibold tracking-tight">Split anything, with anyone</h1>
              <p className="text-fg-muted">Sign in or create an account. No password needed.</p>
            </div>
            <TextField
              type="email"
              label="Email"
              autoComplete="email"
              inputMode="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leading={<Mail className="size-4" />}
              error={error}
            />
            <Button type="submit" block size="lg" loading={busy} trailing={<ArrowRight className="size-4 rtl:rotate-180" />}>
              Email me a code
            </Button>
            {GOOGLE_SIGN_IN && (
              <Button variant="secondary" block size="lg" onClick={google}>
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2.1H12v4h6c-.1 1-.8 2.5-2.3 3.5v2.8h3.7c2.1-2 3.2-4.9 3.2-8.2Z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.2-3.7 1.2-2.9 0-5.3-1.9-6.2-4.5H2v2.9A11 11 0 0 0 12 23Z" />
                  <path fill="#FBBC05" d="M5.8 14.2A6.6 6.6 0 0 1 5.4 12c0-.8.1-1.5.4-2.2V6.9H2A11 11 0 0 0 1 12c0 1.8.4 3.4 1 4.9l3.8-2.7Z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 6.9l3.8 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
                </svg>
                Continue with Google
              </Button>
            )}
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("password")} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
                <KeyRound className="size-4" /> Use a password
              </button>
              <button type="button" onClick={asGuest} disabled={busy} className="inline-flex items-center gap-1.5 text-fg-muted hover:text-fg">
                <Sparkles className="size-4" /> Try without an account
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
              <h1 className="font-display text-3xl font-semibold tracking-tight">Check your email</h1>
              <p className="text-fg-muted">
                We sent a 6-digit code to <span className="font-medium text-fg">{email}</span>
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
              aria-label="6-digit code"
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
              Continue
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("email")} className="text-fg-muted hover:text-fg">
                Use another email
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || busy}
                onClick={() => sendCode()}
                className="text-fg-muted hover:text-fg disabled:opacity-50"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
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
              {creating ? "Create your account" : "Welcome back"}
            </h1>
            {creating && (
              <TextField label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField
              label="Password"
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={creating ? "At least 8 characters." : undefined}
              error={error}
            />
            <Button type="submit" block size="lg" loading={busy}>
              {creating ? "Create account" : "Sign in"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep("email")} className="text-fg-muted hover:text-fg">
                Use an email code instead
              </button>
              <button type="button" onClick={() => setCreating((c) => !c)} className="font-medium text-positive">
                {creating ? "I have an account" : "Create account"}
              </button>
            </div>
          </form>
        )}
    </AuthLayout>
  );
}
