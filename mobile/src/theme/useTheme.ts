import { useColorScheme } from "react-native";
import { darkColors, lightColors, mint, slate, spacing, radius, type ThemeColors } from "./tokens";

export interface Theme {
  colors: ThemeColors;
  mint: typeof mint;
  slate: typeof slate;
  spacing: typeof spacing;
  radius: typeof radius;
  isDark: boolean;
}

// TODO(C2): once the settings screen ships, read a persisted user override
// from expo-secure-store here first, falling back to useColorScheme() —
// mirrors the web app's light/dark/system toggle in src/utils/theme.ts.
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";

  return {
    colors: isDark ? darkColors : lightColors,
    mint,
    slate,
    spacing,
    radius,
    isDark,
  };
}
