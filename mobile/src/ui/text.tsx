import { Text as RNText, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import type { Palette } from "@/theme/tokens";

const VARIANTS = {
  display: { fontSize: 34, fontWeight: "700", letterSpacing: -0.6, lineHeight: 40 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.4, lineHeight: 32 },
  heading: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  sub: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  label: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof VARIANTS;
type Tone = "fg" | "muted" | "subtle" | "accent" | "positive" | "negative" | "warning" | "accentFg";

const toneColor = (c: Palette, tone: Tone) =>
  ({
    fg: c.fg,
    muted: c.fgMuted,
    subtle: c.fgSubtle,
    accent: c.positive,
    positive: c.positive,
    negative: c.negative,
    warning: c.warning,
    accentFg: c.accentFg,
  })[tone];

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: Tone;
  /** Figures that line up in columns (money). */
  tabular?: boolean;
  center?: boolean;
}

/** All text in the app: one type scale, theme colours, and the phone's text-size setting respected. */
export function Text({ variant = "body", tone = "fg", tabular, center, style, ...rest }: AppTextProps) {
  const { c } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        VARIANTS[variant],
        { color: toneColor(c, tone), textAlign: center ? "center" : undefined },
        tabular && { fontVariant: ["tabular-nums"] },
        style,
      ]}
    />
  );
}
