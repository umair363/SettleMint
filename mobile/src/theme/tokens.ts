// The web app's "Liquid Mint" tokens (web/src/app/globals.css), as plain
// values for React Native. Keep the two in step: the web file is the source.

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surface2: string;
  surface3: string;
  line: string;
  lineStrong: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  accent: string;
  accentFg: string;
  accentSoft: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  scrim: string;
}

export const dark: Palette = {
  bg: "#0b0f14",
  bgElevated: "#10151c",
  surface: "#141a22",
  surface2: "#1a212b",
  surface3: "#222a36",
  line: "rgba(255,255,255,0.07)",
  lineStrong: "rgba(255,255,255,0.13)",
  fg: "#f1f4f6",
  fgMuted: "#a1abb8",
  fgSubtle: "#8a95a3",
  accent: "#3dd68c",
  accentFg: "#03200f",
  accentSoft: "rgba(61,214,140,0.14)",
  positive: "#3dd68c",
  positiveSoft: "rgba(61,214,140,0.12)",
  negative: "#ff7a70",
  negativeSoft: "rgba(255,122,112,0.12)",
  warning: "#ffbd5a",
  warningSoft: "rgba(255,189,90,0.12)",
  info: "#7aa7ff",
  infoSoft: "rgba(122,167,255,0.12)",
  scrim: "rgba(3,6,10,0.6)",
};

export const light: Palette = {
  bg: "#f5f7f6",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surface2: "#f0f3f2",
  surface3: "#e5eae8",
  line: "rgba(12,24,18,0.08)",
  lineStrong: "rgba(12,24,18,0.15)",
  fg: "#0c1511",
  fgMuted: "#4a5751",
  fgSubtle: "#5a6862",
  accent: "#3dd68c",
  accentFg: "#03200f",
  accentSoft: "rgba(31,170,104,0.12)",
  // Darker greens/reds so text stays readable (WCAG AA) on white.
  positive: "#0b7a48",
  positiveSoft: "rgba(11,122,72,0.09)",
  negative: "#c93a32",
  negativeSoft: "rgba(201,58,50,0.08)",
  warning: "#9a5a00",
  warningSoft: "rgba(154,90,0,0.09)",
  info: "#2a5fd0",
  infoSoft: "rgba(42,95,208,0.08)",
  scrim: "rgba(10,20,15,0.35)",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
