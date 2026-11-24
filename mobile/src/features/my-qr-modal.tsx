import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { QrModal } from "@/features/qr-modal";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/theme";
import { Card, Chip, Row } from "@/ui/surface";

export interface MyQr {
  id: string;
  value: string;
  label: string;
}

/**
 * "Show my QR": my own saved code, big and sharp, to hold up so someone next
 * to me can scan it and pay. With an amount it says what they should enter
 * after scanning. I can also share it as a picture.
 */
export function MyQrModal({ visible, onClose, qrs, name, amountText }: { visible: boolean; onClose: () => void; qrs: MyQr[]; name: string; amountText?: string }) {
  const t = useTranslations("myQr");
  const [picked, setPicked] = useState(0);
  const qr = qrs[Math.min(picked, qrs.length - 1)];
  if (!qr) return null;
  return (
    <QrModal
      visible={visible}
      onClose={onClose}
      value={qr.value}
      label={qr.label}
      payeeName={name}
      title={t("title")}
      description={amountText ? `${t("hint")} ${t("hintAmount", { amount: amountText })}` : t("hint")}
      extra={
        qrs.length > 1 ? (
          <View accessibilityLabel={t("pick")} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {qrs.map((q, i) => (
              <Chip key={q.id} label={q.label} selected={i === picked} onPress={() => setPicked(i)} />
            ))}
          </View>
        ) : null
      }
    />
  );
}

/** A row on the account tab that opens my QR; only shown once one is saved. */
export function ShowMyQrRow({ name }: { name: string }) {
  const { c } = useTheme();
  const t = useTranslations("myQr");
  const [open, setOpen] = useState(false);
  const saved = useQuery({ queryKey: ["payment-handles"], queryFn: () => api.me.paymentHandles() });
  const qrs = (saved.data ?? []).filter((h) => h.kind === "qr").map((h) => ({ id: h.id, value: h.value, label: h.label || "QR" }));
  if (qrs.length === 0) return null;
  return (
    <>
      <Card padded={false}>
        <Row leading={<Ionicons name="qr-code-outline" size={22} color={c.fgMuted} />} title={t("show")} chevron onPress={() => setOpen(true)} />
      </Card>
      <MyQrModal visible={open} onClose={() => setOpen(false)} qrs={qrs} name={name} />
    </>
  );
}
