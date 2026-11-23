"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Coins, Download, History, LogOut, Monitor, Moon, Send, Share, ShieldCheck, Sun, UserRound } from "@/ui/icons";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { LanguageRow } from "@/features/account/language-card";
import { NotificationsRow } from "@/features/account/notifications-card";
import { PaymentHandlesCard } from "@/features/account/payment-handles-card";
import { YourDataRows } from "@/features/account/your-data-card";
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
import { IconTile } from "@/ui/glyph-tile";
import { Sheet } from "@/ui/sheet";
import { Card, List, ListRow, SectionHeader } from "@/ui/surface";
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
  const [name, setName] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const t = useTranslations("account");
  const tp = useTranslations("payments");
  const tt = useTranslations("trash");
  const tn = useTranslations("yourData");

  if (!me.data) return null;

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

  const saveName = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t("nameUpdated"));
          setNameOpen(false);
        },
      },
    );
  };

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <div className="flex flex-col items-center gap-3 pb-2 pt-2 text-center">
          <Avatar id={me.data.id} name={me.data.name} image={me.data.image} size="xl" />
          <div className="min-w-0 max-w-full">
            <p className="font-wide truncate text-[26px] font-[680] leading-tight">{me.data.name}</p>
            <p className="mt-0.5 truncate text-[15px] text-fg-muted">{me.data.email ?? t("guest")}</p>
          </div>
        </div>

        {me.data.isGuest && <SaveGuestAccount />}

        <List>
          <ListRow
            leading={
              <IconTile>
                <UserRound />
              </IconTile>
            }
            title={t("name")}
            trailing={<span className="text-[15px] text-fg-muted">{me.data.name}</span>}
            chevron
            onClick={() => {
              setName(me.data!.name);
              setNameOpen(true);
            }}
          />
          <ListRow
            leading={
              <IconTile>
                <Coins />
              </IconTile>
            }
            title={t("currencyRow")}
            trailing={<span className="text-[15px] text-fg-muted">{me.data.defaultCurrency ?? t("notSet")}</span>}
            chevron
            onClick={() => setPickerOpen(true)}
          />
          {!me.data.isGuest && (
            <ListRow
              leading={
                <IconTile>
                  <Send />
                </IconTile>
              }
              title={tp("title")}
              chevron
              onClick={() => setPayOpen(true)}
            />
          )}
        </List>

        <InstallCard />

        <List>
          <NotificationsRow />
          <LanguageRow />
        </List>

        <section>
          <SectionHeader title={t("appearance")} />
          <Card className="p-4">
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

        <section>
          <SectionHeader title={tn("title")} />
          <List>
            <ListRow
              href="/trash"
              leading={
                <IconTile>
                  <History />
                </IconTile>
              }
              title={tt("link")}
              chevron
            />
            <YourDataRows />
          </List>
        </section>

        <Button variant="secondary" block size="lg" loading={signingOut} leading={<LogOut className="size-4" />} onClick={signOut}>
          {t("signOut")}
        </Button>
        <p className="pb-4 text-center text-xs text-fg-subtle">{t("tagline")}</p>
      </PageBody>

      <Sheet open={nameOpen} onOpenChange={setNameOpen} title={t("name")}>
        <form onSubmit={saveName} className="space-y-4 pb-2">
          <TextField aria-label={t("name")} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus={matchMedia("(pointer: fine)").matches} />
          <Button type="submit" block size="lg" loading={update.isPending} disabled={!name.trim() || name.trim() === me.data.name}>
            {t("save")}
          </Button>
        </form>
      </Sheet>
      <Sheet open={payOpen} onOpenChange={setPayOpen} title={tp("title")} description={tp("body")} showDescription tall>
        <PaymentHandlesCard bare />
      </Sheet>
      <CurrencyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={me.data.defaultCurrency ?? "USD"}
        onChange={(c) => update.mutate({ defaultCurrency: c }, { onSuccess: () => toast.success(t("currencySet", { currency: c })) })}
      />
    </>
  );
}
