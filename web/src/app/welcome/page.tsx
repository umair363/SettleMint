"use client";

import { ApiError } from "@settlemint/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "use-intl";
import { AuthLayout } from "@/features/auth/auth-layout";
import { guessCurrency } from "@/lib/currency-guess";
import { keys, useMe, useUpdateMe } from "@/lib/queries";
import { Button } from "@/ui/button";
import { CurrencyPicker } from "@/ui/currency-picker";
import { Spinner } from "@/ui/feedback";
import { TextField } from "@/ui/field";

export default function WelcomePage() {
  const me = useMe();
  const router = useRouter();
  const locale = useLocale();
  const qc = useQueryClient();
  const update = useUpdateMe();
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const unauthorized = me.error instanceof ApiError && me.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/sign-in?next=/welcome");
  }, [unauthorized, router]);

  if (!me.data) {
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
          router.replace("/home");
        },
      },
    );
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome to SettleMint</h1>
          <p className="text-fg-muted">Two quick things and you&apos;re in.</p>
        </div>
        <TextField
          label="What should friends call you?"
          autoComplete="given-name"
          autoFocus
          required
          maxLength={60}
          value={nameValue}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-fg-muted">Your usual currency</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-12 w-full items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 text-start hover:border-line-strong"
          >
            <span className="font-medium">{currencyValue}</span>
            <span className="text-sm text-positive">Change</span>
          </button>
          <p className="text-[13px] text-fg-subtle">Each group can still use its own currency.</p>
        </div>
        <Button type="submit" block size="lg" disabled={!nameValue.trim()} loading={update.isPending}>
          Continue
        </Button>
      </form>
      <CurrencyPicker open={pickerOpen} onOpenChange={setPickerOpen} value={currencyValue} onChange={setCurrency} />
    </AuthLayout>
  );
}
