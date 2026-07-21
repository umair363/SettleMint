// Ported from app/src/app/globals.css — same brand values, restructured as
// plain JS objects since React Native has no CSS custom properties. Keep
// these numerically in sync with the web tokens; the web file is the
// source of truth for the palette itself.

export const mint = {
  50: "#edfdf4",
  100: "#d4fae3",
  200: "#abf4cc",
  300: "#73e8ab",
  400: "#3dd68c",
  500: "#14b86a",
  600: "#099554",
  700: "#087746",
  800: "#095e3a",
  900: "#084d31",
  950: "#032b1c",
} as const;

export const slate = {
  50: "#f9fafb",
  100: "#f1f3f5",
  200: "#e2e5e9",
  300: "#cdd1d7",
  400: "#9da3ad",
  500: "#6e7681",
  600: "#4e545e",
  700: "#363b44",
  800: "#252a31",
  900: "#1a1f2e",
  950: "#0f1219",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export interface ThemeColors {
  surfacePrimary: string;
  surfaceElevated: string;
  surfaceCard: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textAccent: string;
  borderSubtle: string;
  borderDefault: string;
  borderAccent: string;
}

// Mirrors the :root and [data-theme="light"] blocks in globals.css.
export const darkColors: ThemeColors = {
  surfacePrimary: slate[950],
  surfaceElevated: slate[900],
  surfaceCard: "rgba(26, 31, 46, 0.6)",
  textPrimary: slate[50],
  textSecondary: slate[400],
  textTertiary: slate[500],
  textAccent: mint[400],
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderDefault: "rgba(255, 255, 255, 0.1)",
  borderAccent: "rgba(61, 214, 140, 0.3)",
};

export const lightColors: ThemeColors = {
  surfacePrimary: slate[50],
  surfaceElevated: "#ffffff",
  surfaceCard: "rgba(255, 255, 255, 0.7)",
  textPrimary: slate[900],
  textSecondary: slate[600],
  textTertiary: slate[500],
  textAccent: mint[600],
  borderSubtle: "rgba(15, 18, 25, 0.06)",
  borderDefault: "rgba(15, 18, 25, 0.1)",
  borderAccent: "rgba(9, 149, 84, 0.3)",
};

// The easing curves are CSS cubic-beziers; react-native-reanimated's
// Easing.bezier() takes the same four control points, so these translate
// directly once C2 wires up the gesture/animation layer.
export const easing = {
  out: [0.23, 1, 0.32, 1] as const,
  inOut: [0.77, 0, 0.175, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
};
