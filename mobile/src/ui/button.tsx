import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/theme";
import { Text } from "./text";

export type IconName = ComponentProps<typeof Ionicons>["name"];

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function haptic(kind: "light" | "medium" | "success" | "warning" = "light") {
  if (Platform.OS === "web") return;
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else void Haptics.impactAsync(kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  block,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { c, radius } = useTheme();
  const bg = { primary: c.accent, secondary: c.surface2, ghost: "transparent", danger: c.dangerSoft }[variant];
  const fg = { primary: c.accentFg, secondary: c.fg, ghost: c.fgMuted, danger: c.danger }[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        if (variant === "primary") haptic("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          minHeight: size === "lg" ? 54 : 46,
          paddingHorizontal: size === "lg" ? 24 : 18,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: block ? "stretch" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === "lg" ? 20 : 18} color={fg} />}
          <Text variant={size === "lg" ? "bodyStrong" : "label"} style={{ color: fg, fontSize: size === "lg" ? 17 : 15 }}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** A round icon-only button (close, settings, add). */
export function IconButton({
  icon,
  onPress,
  label,
  tone = "default",
  size = 40,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: "default" | "accent";
  size?: number;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tone === "accent" ? c.accent : c.surface2,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={tone === "accent" ? c.accentFg : c.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
