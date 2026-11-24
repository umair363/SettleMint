"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { PayQr } from "@/ui/pay-qr";
import { Sheet } from "@/ui/sheet";
import { qrCardBlob, shareOrSaveQr } from "./qr-image";

/**
 * Someone's saved QR code, big and sharp, to scan with a banking app, or to
 * save or share as a picture. The code can't carry the amount, so the amount
 * is shown above it.
 */
export function QrSheet({
  open,
  onOpenChange,
  value,
  label,
  payeeName,
  amountText,
  onUsed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  label: string;
  payeeName: string;
  amountText: string;
  /** Called once the code is saved or shared, so the payment can be recorded as "app". */
  onUsed?: () => void;
}) {
  const t = useTranslations("payWith");
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

  const run = async (mode: "save" | "share") => {
    setBusy(mode);
    try {
      const blob = await qrCardBlob(value, `${label} · ${payeeName}`);
      const result = await shareOrSaveQr(blob, `${payeeName}-${label}`, { share: mode === "share" });
      if (result !== "cancelled") onUsed?.();
    } catch {
      toast.error(t("qrFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("qrTitle", { name: payeeName })}
      description={t("qrScan", { amount: amountText })}
      showDescription
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" loading={busy === "save"} onClick={() => void run("save")}>
            {t("qrSave")}
          </Button>
          <Button loading={busy === "share"} onClick={() => void run("share")}>
            {t("qrShare")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 px-1 pb-2 pt-1">
        <PayQr value={value} label={`${label} · ${payeeName}`} size={288} className="w-full max-w-[18rem] shadow-[0_0_0_1px_var(--line)]" />
        <p className="text-[15px] font-[590]">{label}</p>
      </div>
    </Sheet>
  );
}
