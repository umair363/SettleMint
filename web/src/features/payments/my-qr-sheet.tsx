"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Chip } from "@/ui/controls";
import { PayQr } from "@/ui/pay-qr";
import { Sheet } from "@/ui/sheet";
import { qrCardBlob, shareOrSaveQr } from "./qr-image";

export interface MyQr {
  id: string;
  value: string;
  label: string;
}

/**
 * "Show my QR": my own saved code, big and sharp, to hold up so someone
 * standing next to me can scan it and pay. I can also save or share it as a
 * picture. With an amount, it says what they should enter after scanning.
 */
export function MyQrSheet({
  open,
  onOpenChange,
  qrs,
  name,
  amountText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrs: MyQr[];
  /** My name, printed on the shared picture. */
  name: string;
  /** What the person paying should type after scanning, when there is a specific amount. */
  amountText?: string;
}) {
  const t = useTranslations("myQr");
  const tp = useTranslations("payWith");
  const [picked, setPicked] = useState(0);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const qr = qrs[Math.min(picked, qrs.length - 1)];
  if (!qr) return null;

  const run = async (mode: "save" | "share") => {
    setBusy(mode);
    try {
      const blob = await qrCardBlob(qr.value, qr.label, { name, footer: t("footer") });
      await shareOrSaveQr(blob, `${name}-${qr.label}`, { share: mode === "share" });
    } catch {
      toast.error(tp("qrFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={amountText ? `${t("hint")} ${t("hintAmount", { amount: amountText })}` : t("hint")}
      showDescription
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" loading={busy === "save"} onClick={() => void run("save")}>
            {tp("qrSave")}
          </Button>
          <Button loading={busy === "share"} onClick={() => void run("share")}>
            {tp("qrShare")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 px-1 pb-2 pt-1">
        {qrs.length > 1 && (
          <div role="group" aria-label={t("pick")} className="flex flex-wrap justify-center gap-2">
            {qrs.map((q, i) => (
              <Chip key={q.id} selected={i === picked} onToggle={() => setPicked(i)}>
                {q.label}
              </Chip>
            ))}
          </div>
        )}
        <PayQr value={qr.value} label={`${qr.label} · ${name}`} size={304} className="w-full max-w-[19rem] shadow-[0_0_0_1px_var(--line)]" />
        <p className="text-[17px] font-[620]">{qr.label}</p>
      </div>
    </Sheet>
  );
}
