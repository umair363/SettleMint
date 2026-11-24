import { PAYMENT_KINDS, type PaymentKind } from "@settlemint/shared";
import { useTranslations } from "use-intl";

/** Brand names stay as they are; generic methods ("Bank account", "Other") are translated. */
export function usePaymentKindText() {
  const t = useTranslations("payments");
  return {
    label: (kind: PaymentKind) => (kind === "bank" || kind === "other" || kind === "qr" ? t(`kind.${kind}`) : PAYMENT_KINDS[kind].label),
    placeholder: (kind: PaymentKind) => t(`placeholder.${kind}`),
  };
}
