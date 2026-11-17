import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";
import { Text } from "./text";

/**
 * A scrolling screen with a large title, pull-to-refresh and room for the tab
 * bar. `sheet` screens (opened as modals) skip the top inset.
 */
export function Screen({
  title,
  subtitle,
  headerRight,
  children,
  onRefresh,
  refreshing = false,
  sheet,
  footer,
}: {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  sheet?: boolean;
  /** Pinned under the scroll area (e.g. the save button of a form). */
  footer?: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: sheet ? c.bgElevated : c.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: sheet ? 20 : insets.top + 12,
          paddingBottom: footer ? 24 : insets.bottom + 110,
          paddingHorizontal: 16,
          gap: 16,
        }}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.positive} colors={[c.accent]} /> : undefined
        }
      >
        {(title || headerRight) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              {title ? (
                <Text variant={sheet ? "title" : "display"} accessibilityRole="header">
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text variant="sub" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {headerRight}
          </View>
        )}
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: c.line,
            backgroundColor: sheet ? c.bgElevated : c.bg,
          }}
        >
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
