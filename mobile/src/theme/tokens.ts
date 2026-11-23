// The app's colours: generated from packages/client/src/design/tokens.ts (the
// same source as the website), so the two always match. Edit that file, run
// `npm run tokens` in web, never this one.
import { palette } from "./palette";

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
  /** Destructive actions and errors only; "negative" (ember) is for money you owe. */
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  glass: string;
  glassLine: string;
  scrim: string;
}

const adapt = (p: (typeof palette)["light"] | (typeof palette)["dark"]): Palette => ({
  bg: p.bg,
  bgElevated: p["bg-elevated"],
  surface: p.surface,
  surface2: p["surface-2"],
  surface3: p["surface-3"],
  line: p.line,
  lineStrong: p["line-strong"],
  fg: p.fg,
  fgMuted: p["fg-muted"],
  fgSubtle: p["fg-subtle"],
  accent: p.accent,
  accentFg: p["accent-fg"],
  accentSoft: p["accent-soft"],
  positive: p.positive,
  positiveSoft: p["positive-soft"],
  negative: p.negative,
  negativeSoft: p["negative-soft"],
  danger: p.danger,
  dangerSoft: p["danger-soft"],
  warning: p.warning,
  warningSoft: p["warning-soft"],
  info: p.info,
  infoSoft: p["info-soft"],
  glass: p.glass,
  glassLine: p["glass-line"],
  scrim: p.scrim,
});

export const light: Palette = adapt(palette.light);
export const dark: Palette = adapt(palette.dark);

// Concentric corners: a sheet holds panels, panels hold rows, rows hold tiles.
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, full: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
