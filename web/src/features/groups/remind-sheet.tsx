"use client";

import { ApiError, formatMoney, type GroupDetailDto, type TransferDto } from "@settlemint/shared";
import { Send } from "@/ui/icons";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "use-intl";
import { toast } from "sonner";
import { useMemberActions, useRemind } from "@settlemint/client/data/queries";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/controls";
import { TextField } from "@/ui/field";
import { Sheet } from "@/ui/sheet";
import { remindToPay } from "./remind";

/**
 * Remind someone who owes me. The notification and email only say that a
 * payment is waiting (never who is asking). I can choose to add my payment
 * details and QR, and always have the share-a-message route for people the
 * app can't reach.
 */
export function RemindSheet({ group, transfer, onClose }: { group: GroupDetailDto; transfer: TransferDto | null; onClose: () => void }) {
  const t = useTranslations("remindSheet");
  const locale = useLocale();
  // Keep showing the last person while the sheet slides away.
  const [shown, setShown] = useState<TransferDto | null>(transfer);
  if (transfer && transfer !== shown) setShown(transfer);
  const tr = transfer ?? shown;

  const remind = useRemind(group.id);
  const { setEmail } = useMemberActions(group.id);
  const me = group.members.find((m) => m.isMe);
  const hasDetails = (me?.paymentHandles.length ?? 0) > 0;
  const [include, setInclude] = useState(true);
  const [email, setEmailText] = useState("");

  if (!tr) return null;
  const debtor = group.members.find((m) => m.id === tr.fromMemberId);
  if (!debtor) return null;

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const reach = debtor.claimed ? (debtor.hasEmail ? "reachAll" : "reachApp") : debtor.hasEmail ? "reachEmail" : "reachNone";
  const canSend = debtor.claimed || debtor.hasEmail;
  const withDetails = include && hasDetails;

  const send = () =>
    remind.mutate(
      { debtorMemberId: debtor.id, includePayment: withDetails },
      {
        onSuccess: (res) => {
          if (res.reachable) {
            toast.success(t("sent"), { description: t("sentDesc", { name: debtor.displayName }) });
            onClose();
          } else {
            toast.error(t("unreachable", { name: debtor.displayName }));
          }
        },
        onError: (err) =>
          toast.error(err instanceof ApiError && err.code === "RATE_LIMITED" ? t("tooSoon", { name: debtor.displayName }) : t("failed")),
      },
    );

  const saveEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk) return;
    setEmail.mutate(
      { memberId: debtor.id, email: email.trim() },
      {
        onSuccess: () => {
          toast.success(t("emailSaved"));
          setEmailText("");
        },
        onError: () => toast.error(t("emailInvalid")),
      },
    );
  };

  return (
    <Sheet
      open={transfer !== null}
      onOpenChange={(o) => !o && onClose()}
      title={t("title", { name: debtor.displayName })}
      description={t("body", { amount: formatMoney(tr.amount, group.currency, { locale }), group: group.name })}
      showDescription
      footer={
        <div className="grid gap-2 pb-1">
          <Button loading={remind.isPending} disabled={!canSend} leading={<Send className="size-4" />} onClick={send}>
            {t("send")}
          </Button>
          <Button variant="secondary" onClick={() => void remindToPay(group, tr, locale, { includePayment: withDetails })}>
            {t("share")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 pb-2 pt-1">
        {hasDetails && <Switch checked={include} onCheckedChange={setInclude} label={t("include")} description={t("includeHint")} />}

        <p className="text-[14px] text-fg-muted">{t(reach, { name: debtor.displayName })}</p>

        {!debtor.claimed && (
          <form onSubmit={saveEmail}>
            <TextField
              type="email"
              inputMode="email"
              autoComplete="off"
              aria-label={t("emailLabel", { name: debtor.displayName })}
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmailText(e.target.value)}
              maxLength={254}
              trailing={
                <Button type="submit" size="sm" variant="ghost" disabled={!emailOk} loading={setEmail.isPending}>
                  {t("emailAdd")}
                </Button>
              }
            />
          </form>
        )}

        <p className="text-[13px] text-fg-subtle">{t("neutral")}</p>
      </div>
    </Sheet>
  );
}
