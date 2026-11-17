import { buildPayAction, formatMoney, type GroupDetailDto, type TransferDto } from "@settlemint/shared";
import { tr } from "../i18n/runtime";

/** A friendly nudge with the amount and up to three ways to pay me, in the viewer's language. */
export function reminderText(group: GroupDetailDto, transfer: TransferDto, locale: string): string {
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
  return [
    t("remind.message", { name: debtor?.displayName ?? "none", amount, group: group.name }),
    ...(ways.length ? ["", t("remind.payWith"), ...ways] : []),
  ].join("\n");
}
