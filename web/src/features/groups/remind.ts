import type { GroupDetailDto, TransferDto } from "@settlemint/shared";
import { tr } from "@settlemint/client/i18n/runtime";
import { reminderText } from "@settlemint/client/text/reminder";
import { toast } from "sonner";

/** A friendly nudge with the amount and one-tap ways to pay, via the share sheet. */
export async function remindToPay(group: GroupDetailDto, transfer: TransferDto, locale: string) {
  const text = reminderText(group, transfer, locale);
  const t = tr();
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
