"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, Monitor, Moon, Share, ShieldCheck, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useInstall } from "@/features/pwa/pwa";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { authClient } from "@/lib/auth-client";
import { persister } from "@/lib/persist";
import { useMe, useUpdateMe } from "@/lib/queries";
import { Avatar } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Segmented } from "@/ui/controls";
import { CurrencyPicker } from "@/ui/currency-picker";
import { TextField } from "@/ui/field";
import { Card, SectionHeader } from "@/ui/surface";
import { useTheme, type ThemePreference } from "@/ui/theme";

function SaveGuestAccount() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(error.message ?? "Couldn't send the code");
    setSent(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Signing in while a guest links the guest's groups to the real account.
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    setBusy(false);
    if (error) return setError(error.message ?? "That code didn't work");
    await qc.invalidateQueries();
    toast.success("Your account is saved");
  };

  return (
    <Card className="space-y-4 border-accent/40 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="font-semibold">You&apos;re using a guest account</p>
          <p className="text-sm text-fg-muted">Add your email to keep your groups if you change phones or clear your browser.</p>
        </div>
      </div>
      {sent ? (
        <form onSubmit={verify} className="space-y-3">
          <TextField
            label={`Code sent to ${email}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={error}
          />
          <Button type="submit" block loading={busy} disabled={code.length !== 6}>
            Save my account
          </Button>
        </form>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <TextField type="email" label="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" block loading={busy}>
            Send code
          </Button>
        </form>
      )}
    </Card>
  );
}

function InstallCard() {
  const { state, install } = useInstall();
  if (state === "installed" || state === "unavailable") return null;
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Install SettleMint</p>
        <p className="text-sm text-fg-muted">
          {state === "ios" ? (
            <>
              Tap <Share className="inline size-4 align-text-bottom" aria-label="Share" /> then “Add to Home Screen”.
            </>
          ) : (
            "Open it like an app, even offline."
          )}
        </p>
      </div>
      {state === "prompt" && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
    </Card>
  );
}

export default function AccountPage() {
  const me = useMe();
  const update = useUpdateMe();
  const router = useRouter();
  const qc = useQueryClient();
  const { preference, setPreference } = useTheme();
  const [name, setName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!me.data) return null;
  const nameValue = name ?? me.data.name;

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    // Nothing from this account may stay on a shared device.
    qc.clear();
    await persister.removeClient();
    router.replace("/sign-in");
  };

  return (
    <>
      <PageHeader title="Account" />
      <PageBody>
        <Card className="flex items-center gap-4 p-5">
          <Avatar id={me.data.id} name={me.data.name} image={me.data.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold">{me.data.name}</p>
            <p className="truncate text-sm text-fg-muted">{me.data.email ?? "Guest"}</p>
          </div>
        </Card>

        {me.data.isGuest && <SaveGuestAccount />}

        <section>
          <SectionHeader title="Profile" />
          <Card className="space-y-5 p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({ name: nameValue.trim() }, { onSuccess: () => toast.success("Name updated") });
              }}
            >
              <TextField
                label="Name"
                value={nameValue}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                trailing={
                  nameValue.trim() && nameValue.trim() !== me.data.name ? (
                    <Button type="submit" size="sm" loading={update.isPending}>
                      Save
                    </Button>
                  ) : undefined
                }
              />
            </form>
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium text-fg-muted">Default currency for new groups</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 text-start hover:border-line-strong"
              >
                <span className="font-medium">{me.data.defaultCurrency ?? "Not set"}</span>
                <span className="text-sm text-positive">Change</span>
              </button>
            </div>
          </Card>
        </section>

        <InstallCard />

        <section>
          <SectionHeader title="Appearance" />
          <Card className="p-5">
            <Segmented<ThemePreference>
              label="Theme"
              value={preference}
              onChange={setPreference}
              options={[
                { value: "light", label: "Light", icon: <Sun /> },
                { value: "dark", label: "Dark", icon: <Moon /> },
                { value: "system", label: "Auto", icon: <Monitor /> },
              ]}
            />
          </Card>
        </section>

        <Button variant="secondary" block size="lg" loading={signingOut} leading={<LogOut className="size-4" />} onClick={signOut}>
          Sign out
        </Button>
        <p className="pb-4 text-center text-xs text-fg-subtle">SettleMint · made for fair friendships</p>
      </PageBody>
      <CurrencyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={me.data.defaultCurrency ?? "USD"}
        onChange={(c) => update.mutate({ defaultCurrency: c }, { onSuccess: () => toast.success(`Default currency: ${c}`) })}
      />
    </>
  );
}
