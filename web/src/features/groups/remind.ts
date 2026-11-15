import { buildPayAction, formatMoney, type GroupDetailDto, type TransferDto } from "@settlemint/shared";
import { toast } from "sonner";

/** A friendly nudge with the amount and one-tap ways to pay, via the share sheet. */
export async function remindToPay(group: GroupDetailDto, t: TransferDto, locale: string) {
  const debtor = group.members.find((m) => m.id === t.fromMemberId);
  const me = group.members.find((m) => m.id === group.myMemberId);
  const amount = formatMoney(t.amount, group.currency, { locale });
  const ways = (me?.paymentHandles ?? [])
    .map((h) => {
      const a = buildPayAction(h, { amount: t.amount, currency: group.currency, note: group.name, payeeName: me?.displayName });
      // upi:// links don't work when shared as text in most chat apps.
      return a.url && !a.url.startsWith("upi:") ? `${a.label}: ${a.url}` : `${a.label}: ${h.value}`;
    })
    .slice(0, 3);
  const text = [
    `Hi ${debtor?.displayName ?? "there"}! Quick reminder: you owe me ${amount} for "${group.name}" on SettleMint.`,
    ...(ways.length ? ["", "You can pay me with:", ...ways] : []),
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
    toast.success("Reminder copied", { description: "Paste it into a message." });
  } catch {
    toast.error("Couldn't copy the reminder");
  }
}
