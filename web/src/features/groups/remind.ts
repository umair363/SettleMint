import { buildPayAction, formatMoney, type GroupDetailDto, type TransferDto } from "@settlemint/shared";
import { tr } from "@/i18n/runtime";
import { toast } from "sonner";

/** A friendly nudge with the amount and one-tap ways to pay, via the share sheet. */
export async function remindToPay(group: GroupDetailDto, transfer: TransferDto, locale: string) {
  const debtor = group.members.find((m) => m.id === transfer.fromMemberId);
  const me = group.members.find((m) => m.id === group.myMemberId);
  const amount = formatMoney(transfer.amount, group.currency, { locale });
  const ways = (me?.paymentHandles ?? [])
    .map((h) => {
      const a = buildPayAction(h, { amount: transfer.amount, currency: group.currency, note: group.name, payeeName: me?.displayName });
      // upi:// links don't work when shared as text in most chat apps.
      return a.url && !a.url.startsWith("upi:") ? `${a.label}: ${a.url}` : `${a.label}: ${h.value}`;
    })
    .slice(0, 3);
  const t = tr();
  const text = [
    t("remind.message", { name: debtor?.displayName ?? "none", amount, group: group.name }),
    ...(ways.length ? ["", t("remind.payWith"), ...ways] : []),
  ].join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return; // they cancelled
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t("remind.copied"), { description: t("remind.paste") });
  } catch {
    toast.error(t("remind.copyFailed"));
  }
}
