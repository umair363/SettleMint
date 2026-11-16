"use client";

import { ApiError } from "@settlemint/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { AuthLayout } from "@/features/auth/auth-layout";
import { safeNext } from "@/features/auth/safe-next";
import { guessCurrency } from "@/lib/currency-guess";
import { keys, useMe, useUpdateMe } from "@/lib/queries";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/ui/button";
import { CurrencyPicker } from "@/ui/currency-picker";
import { Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";

export default function WelcomePage() {
  const me = useMe();
  const hydrated = useHydrated();
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();
  const update = useUpdateMe();
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useTranslations("welcome");
  const tc = useTranslations("common");

  const unauthorized = me.error instanceof ApiError && me.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/sign-in?next=/welcome");
  }, [unauthorized, router]);

  if (!hydrated || !me.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const nameValue = name ?? me.data.name;
  const currencyValue = currency ?? me.data.defaultCurrency ?? guessCurrency(locale);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { name: nameValue.trim(), defaultCurrency: currencyValue, locale },
      {
        onSuccess: async () => {
          await qc.invalidateQueries({ queryKey: keys.me });
          router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
        },
      },
    );
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-fg-muted">{t("subtitle")}</p>
        </div>
        <TextField
          label={t("nameLabel")}
          autoComplete="given-name"
          autoFocus
          required
          maxLength={60}
          value={nameValue}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
        />
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-fg-muted">{t("currency")}</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 text-start hover:border-line-strong"
          >
            <span className="font-medium">{currencyValue}</span>
            <span className="text-sm text-positive">{tc("change")}</span>
          </button>
          <p className="text-[13px] text-fg-subtle">{t("currencyNote")}</p>
        </div>
        <Button type="submit" block size="lg" disabled={!nameValue.trim()} loading={update.isPending}>
          {t("continue")}
        </Button>
      </form>
      <CurrencyPicker open={pickerOpen} onOpenChange={setPickerOpen} value={currencyValue} onChange={setCurrency} />
    </AuthLayout>
  );
}
