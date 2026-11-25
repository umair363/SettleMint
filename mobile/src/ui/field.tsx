import { forwardRef, useState } from "react";
import { Platform, TextInput, View, type TextInputInstance, type TextInputProps } from "react-native";
import { useTheme } from "@/theme/theme";
import { Text } from "./text";

interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
}

/** Labelled text input with hint and error, 16px+ text so nothing zooms. */
export const Field = forwardRef<TextInputInstance, FieldProps>(function Field({ label, hint, error, style, ...rest }, ref) {
  const { c, radius } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={c.fgSubtle}
        accessibilityLabel={label}
        accessibilityHint={hint}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 50,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? c.negative : focused ? c.accent : c.line,
            backgroundColor: c.surface2,
            paddingHorizontal: 14,
            fontSize: 16,
            color: c.fg,
            textAlign: "auto",
          },
          // The border colour shows focus; drop the browser's own outline in the web preview.
          Platform.OS === "web" && ({ outlineStyle: "none" } as object),
          style,
        ]}
      />
      {error ? (
        <Text variant="sub" tone="negative" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="subtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
