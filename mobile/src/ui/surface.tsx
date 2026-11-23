import { Ionicons } from "@expo/vector-icons";
import { formatMoney } from "@settlemint/shared";
import type { ReactNode } from "react";
import { ActivityIndicator, I18nManager, Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { useLocale } from "use-intl";
import { identity } from "@/theme/identity";
import { useTheme } from "@/theme/theme";
import type { IconName } from "./button";
import { Button } from "./button";
import { Text, type AppTextProps } from "./text";

/** A content card: solid surface, hairline border. */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { c, radius } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, overflow: "hidden" },
        padded && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 8 }}>
      <Text variant="heading" accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", letterSpacing: -0.2 }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

/** Money in the viewer's locale; signed amounts are coloured owed (mint) / owe (coral). */
export function Money({
  minor,
  currency,
  tone,
  signed,
  ...rest
}: { minor: number; currency: string; tone?: "auto" | AppTextProps["tone"]; signed?: boolean } & Omit<AppTextProps, "tone">) {
  const locale = useLocale();
  const value = formatMoney(signed ? minor : Math.abs(minor), currency, {
    locale,
    signDisplay: signed ? "exceptZero" : "auto",
  });
  const resolved = tone === "auto" ? (minor > 0 ? "positive" : minor < 0 ? "negative" : "muted") : tone;
  return (
    <Text tabular tone={resolved} {...rest}>
      {value}
    </Text>
  );
}

/** Initials in the person's own quiet colour, so a face keeps it everywhere (and never reads as a balance). */
export function Avatar({ name, size = 40, id }: { name: string; size?: number; id?: string; emoji?: string | null }) {
  const { isDark } = useTheme();
  const tone = identity(id ?? name, isDark);
  // One letter when small, so it is never clipped.
  const letters = size < 36 ? 1 : 2;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, letters)
    .map((w) => [...w][0] ?? "")
    .join("")
    .toLocaleUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: tone.fg, lineHeight: size * 0.62 }}>{initials || "?"}</Text>
    </View>
  );
}

/** A tappable list row: leading visual, title and subtitle, trailing content. */
export function Row({
  leading,
  title,
  titleParts,
  subtitle,
  trailing,
  onPress,
  chevron,
  accessibilityLabel,
}: {
  leading?: ReactNode;
  title: string;
  /** The same text split so names can be shown bold (activity sentences). */
  titleParts?: { text: string; strong: boolean }[];
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 60 }}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        {titleParts ? (
          <Text variant="body" numberOfLines={2} accessibilityLabel={title}>
            {titleParts.map((p, i) => (
              <Text key={i} variant="body" style={p.strong ? { fontWeight: "700" } : undefined}>
                {p.text}
              </Text>
            ))}
          </Text>
        ) : (
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text variant="sub" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron && <Ionicons name="chevron-forward" size={18} color={c.fgSubtle} style={{ transform: [{ scaleX: isRtl() ? -1 : 1 }] }} />}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? c.surface2 : "transparent" })}
    >
      {body}
    </Pressable>
  );
}

const isRtl = () => I18nManager.isRTL;

export function Divider({ inset = 16 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.line, marginStart: inset }} />;
}

export function Empty({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={28} color={c.positive} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {body ? (
        <Text variant="sub" tone="muted" center style={{ maxWidth: 320 }}>
          {body}
        </Text>
      ) : null}
      {action && onAction ? (
        <Button onPress={onAction} style={{ marginTop: 8 }}>
          {action}
        </Button>
      ) : null}
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <ActivityIndicator color={c.positive} size="large" />
    </View>
  );
}

/** Choose one of a few options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  const { c, radius } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: "row", backgroundColor: c.surface2, borderRadius: radius.full, padding: 4, gap: 4 }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.full,
              backgroundColor: on ? c.surface : "transparent",
              borderWidth: on ? 1 : 0,
              borderColor: c.lineStrong,
              paddingHorizontal: 8,
            }}
          >
            <Text variant="label" tone={on ? "fg" : "muted"} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small rounded tag (selected people, filters). */
export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(selected) }}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 38,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        backgroundColor: selected ? c.accentSoft : c.surface2,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.line,
      }}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={c.positive} /> : icon ? <Ionicons name={icon} size={16} color={c.fgMuted} /> : null}
      <Text variant="label" tone={selected ? "positive" : "fg"}>
        {label}
      </Text>
    </Pressable>
  );
}
