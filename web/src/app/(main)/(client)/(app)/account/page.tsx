"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, Monitor, Moon, Share, ShieldCheck, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { LanguageCard } from "@/features/account/language-card";
import { NotificationsCard } from "@/features/account/notifications-card";
import { PaymentHandlesCard } from "@/features/account/payment-handles-card";
import { YourDataCard } from "@/features/account/your-data-card";
import { useInstall } from "@/features/pwa/pwa";
import { PageBody, PageHeader } from "@/features/shell/page-header";
import { authClient } from "@/lib/auth-client";
import { persister } from "@/lib/persist";
import { disablePush } from "@/lib/push";
import { useMe, useUpdateMe } from "@settlemint/client/data/queries";
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
  const t = useTranslations("account");

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setBusy(false);
    if (error) return setError(t("sendFailed"));
    setSent(true);
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Signing in while a guest links the guest's groups to the real account.
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    setBusy(false);
    if (error) return setError(t("badCode"));
    await qc.invalidateQueries();
    toast.success(t("saved"));
  };

  return (
    <Card className="space-y-4 border-accent/40 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="font-semibold">{t("guestTitle")}</p>
          <p className="text-sm text-fg-muted">{t("guestBody")}</p>
        </div>
      </div>
      {sent ? (
        <form onSubmit={verify} className="space-y-3">
          <TextField
            label={t("codeSent", { email })}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={error}
          />
          <Button type="submit" block loading={busy} disabled={code.length !== 6}>
            {t("saveAccount")}
          </Button>
        </form>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <TextField type="email" label={t("email")} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <Button type="submit" block loading={busy}>
            {t("sendCode")}
          </Button>
        </form>
      )}
    </Card>
  );
}

function InstallCard() {
  const { state, install } = useInstall();
  const t = useTranslations("account");
  if (state === "installed" || state === "unavailable") return null;
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("install")}</p>
        <p className="text-sm text-fg-muted">
          {state === "ios"
            ? t.rich("installIos", { share: () => <Share className="inline size-4 align-text-bottom" aria-label={t("share")} /> })
            : t("installBody")}
        </p>
      </div>
      {state === "prompt" && (
        <Button size="sm" onClick={install}>
          {t("installButton")}
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
  const t = useTranslations("account");

  if (!me.data) return null;
  const nameValue = name ?? me.data.name;

  const signOut = async () => {
    setSigningOut(true);
    // Stop this device getting the next person's notifications (needs the session, so first).
    await disablePush();
    await authClient.signOut();
    // Nothing from this account may stay on a shared device.
    qc.clear();
    await persister.removeClient();
    router.replace("/sign-in");
  };

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <Card className="flex items-center gap-4 p-5">
          <Avatar id={me.data.id} name={me.data.name} image={me.data.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-semibold">{me.data.name}</p>
            <p className="truncate text-sm text-fg-muted">{me.data.email ?? t("guest")}</p>
          </div>
        </Card>

        {me.data.isGuest && <SaveGuestAccount />}

        <section>
          <SectionHeader title={t("profile")} />
          <Card className="space-y-5 p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({ name: nameValue.trim() }, { onSuccess: () => toast.success(t("nameUpdated")) });
              }}
            >
              <TextField
                label={t("name")}
                value={nameValue}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                trailing={
                  nameValue.trim() && nameValue.trim() !== me.data.name ? (
                    <Button type="submit" size="sm" loading={update.isPending}>
                      {t("save")}
                    </Button>
                  ) : undefined
                }
              />
            </form>
            <div className="space-y-1.5">
              <span className="text-[13px] font-medium text-fg-muted">{t("defaultCurrency")}</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 text-start hover:border-line-strong"
              >
                <span className="font-medium">{me.data.defaultCurrency ?? t("notSet")}</span>
                <span className="text-sm text-positive">{t("change")}</span>
              </button>
            </div>
          </Card>
        </section>

        {!me.data.isGuest && <PaymentHandlesCard />}

        <InstallCard />

        <NotificationsCard />

        <LanguageCard />

        <section>
          <SectionHeader title={t("appearance")} />
          <Card className="p-5">
            <Segmented<ThemePreference>
              label={t("theme")}
              value={preference}
              onChange={setPreference}
              options={[
                { value: "light", label: t("light"), icon: <Sun /> },
                { value: "dark", label: t("dark"), icon: <Moon /> },
                { value: "system", label: t("auto"), icon: <Monitor /> },
              ]}
            />
          </Card>
        </section>

        <YourDataCard />

        <Button variant="secondary" block size="lg" loading={signingOut} leading={<LogOut className="size-4" />} onClick={signOut}>
          {t("signOut")}
        </Button>
        <p className="pb-4 text-center text-xs text-fg-subtle">{t("tagline")}</p>
      </PageBody>
      <CurrencyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={me.data.defaultCurrency ?? "USD"}
        onChange={(c) => update.mutate({ defaultCurrency: c }, { onSuccess: () => toast.success(t("currencySet", { currency: c })) })}
      />
    </>
  );
}
