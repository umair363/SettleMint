import type { ReactNode } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { Money } from "./surface";
import { Text } from "./text";

/**
 * Where you stand, said as a sentence set on the canvas: a label, the amount
 * large, one line of context. No card and no tint: the type carries it.
 */
export function BalanceStatement({
  label,
  minor,
  currency,
  context,
  settledText,
  children,
}: {
  label: string;
  minor: number;
  currency: string;
  context?: string;
  /** Shown instead of the amount when the balance is zero. */
  settledText?: string;
  children?: ReactNode;
}) {
  const settled = minor === 0 && settledText;
  return (
    <View style={{ gap: 4 }}>
      <Text variant="heading" tone="muted" style={{ fontWeight: "400" }}>
        {label}
      </Text>
      {settled ? (
        <Text variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
          {settledText}
        </Text>
      ) : (
        <Money minor={minor} currency={currency} tone="auto" variant="display" style={{ fontSize: 52, lineHeight: 58, letterSpacing: -1.2 }} />
      )}
      {context ? (
        <Text tone="muted" style={{ marginTop: 6 }}>
          {context}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** How much of what the group spent is already squared away: a thin bar that fills as people pay back. */
export function SettleProgress({ outstanding, spent }: { outstanding: number; spent: number }) {
  const { c } = useTheme();
  const t = useTranslations("group");
  if (spent <= 0) return null;
  const done = outstanding === 0;
  const progress = Math.max(0, Math.min(1, 1 - outstanding / spent));
  const percent = done ? 100 : Math.floor(progress * 100);
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t("settleProgress", { percent })} style={{ gap: 6 }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surface3, overflow: "hidden" }}>
        <View style={{ height: 8, width: `${Math.max(3, percent)}%`, borderRadius: 4, backgroundColor: c.accent }} />
      </View>
      <Text variant="caption" tone="muted">
        {t("settleProgress", { percent })}
      </Text>
    </View>
  );
}
