import { useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import type Svg from "react-native-svg";
import { useTranslations } from "use-intl";
import { shareQrImage } from "@/features/qr";
import { useTheme } from "@/theme/theme";
import { Button, haptic, IconButton } from "@/ui/button";
import { PayQr } from "@/ui/pay-qr";
import { Text } from "@/ui/text";
import { toast } from "@/ui/toast";

/**
 * Someone's saved QR code, big and sharp, to scan with a banking app or to
 * share as a picture. The code can't carry an amount, so the amount is stated above it.
 */
export function QrModal({
  visible,
  onClose,
  value,
  label,
  payeeName,
  amountText,
  onUsed,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  label: string;
  payeeName: string;
  amountText: string;
  onUsed?: () => void;
}) {
  const { c, radius } = useTheme();
  const t = useTranslations("payWith");
  const tc = useTranslations("common");
  const svg = useRef<Svg>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!svg.current) return;
    setBusy(true);
    try {
      await shareQrImage(svg.current, `${payeeName}-${label}`);
      haptic("light");
      onUsed?.();
    } catch {
      toast.error(t("qrFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel={tc("close")} onPress={onClose} style={{ flex: 1, backgroundColor: c.scrim }} />
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 14, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, alignSelf: "stretch" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading">{t("qrTitle", { name: payeeName })}</Text>
            <Text variant="sub" tone="muted">
              {t("qrScan", { amount: amountText })}
            </Text>
          </View>
          <IconButton icon="close" label={tc("close")} onPress={onClose} />
        </View>
        <View style={{ borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.line }}>
          <PayQr ref={svg} value={value} label={`${label} · ${payeeName}`} size={280} />
        </View>
        <Text variant="label">{label}</Text>
        <Button block icon="share-outline" loading={busy} onPress={() => void share()}>
          {t("qrShare")}
        </Button>
      </View>
    </Modal>
  );
}
