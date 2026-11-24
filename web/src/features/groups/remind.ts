import type { GroupDetailDto, TransferDto } from "@settlemint/shared";
import { tr } from "@settlemint/client/i18n/runtime";
import { reminderText } from "@settlemint/client/text/reminder";
import { toast } from "sonner";
import { qrCardBlob } from "@/features/payments/qr-image";

/**
 * A friendly message to send yourself (WhatsApp, Messages…) through the share
 * sheet, with the amount and, if asked, ways to pay. With a saved QR code the
 * picture goes along where the device can share files.
 */
export async function remindToPay(group: GroupDetailDto, transfer: TransferDto, locale: string, opts: { includePayment?: boolean } = {}) {
  const include = opts.includePayment !== false;
  const text = reminderText(group, transfer, locale, { includePayment: include });
  const t = tr();

  if (navigator.share) {
    try {
      const me = group.members.find((m) => m.isMe);
      const qr = include ? me?.paymentHandles.find((h) => h.kind === "qr") : undefined;
      let files: File[] | undefined;
      if (qr) {
        try {
          const blob = await qrCardBlob(qr.value, qr.label ?? "", { name: me?.displayName });
          files = [new File([blob], "payment-qr.png", { type: "image/png" })];
        } catch {
          // The text still goes out without the picture.
        }
      }
      await navigator.share(files && navigator.canShare?.({ files }) ? { text, files } : { text });
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
