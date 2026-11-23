// SettleMint design tokens: the single source for the web app, the landing
// page and the phone app. Colours are written in OKLCH (perceptual lightness,
// so steps look even) and converted to hex for platforms that need it.
// `web/scripts/build-tokens.mjs` writes web/src/app/tokens.css and the phone
// palette from this file; edit values here, never in the generated files.
//
// No imports: build scripts load this file directly with Node.

/** [lightness 0–1, chroma, hue degrees, alpha 0–1] */
export type Oklch = readonly [number, number, number, number?];

export type ColorRole =
  | "bg"
  | "bg-elevated"
  | "surface"
  | "surface-2"
  | "surface-3"
  | "line"
  | "line-strong"
  | "fg"
  | "fg-muted"
  | "fg-subtle"
  | "accent"
  | "accent-hover"
  | "accent-fg"
  | "accent-soft"
  | "positive"
  | "positive-soft"
  | "negative"
  | "negative-soft"
  | "danger"
  | "danger-soft"
  | "warning"
  | "warning-soft"
  | "info"
  | "info-soft"
  | "glass"
  | "glass-line"
  | "glass-highlight"
  | "scrim"
  | "focus";

const INK_L: Oklch = [0.215, 0.014, 170];
const withAlpha = (c: Oklch, a: number): Oklch => [c[0], c[1], c[2], a];

/**
 * Light is the default: a cool paper-white canvas tinted toward mint, near-black
 * ink, one mint fill for the single primary action. "Owed to you" is deep teal,
 * "you owe" is ember (not alarm red); danger red is kept for destructive actions.
 */
export const light: Record<ColorRole, Oklch> = {
  bg: [0.982, 0.004, 165],
  "bg-elevated": [1, 0, 0],
  surface: [1, 0, 0],
  "surface-2": [0.958, 0.005, 165],
  "surface-3": [0.928, 0.007, 165],
  line: withAlpha(INK_L, 0.12),
  "line-strong": withAlpha(INK_L, 0.18),
  fg: INK_L,
  "fg-muted": [0.45, 0.014, 170],
  "fg-subtle": [0.535, 0.012, 170],
  accent: [0.8, 0.145, 163],
  "accent-hover": [0.765, 0.145, 163],
  "accent-fg": [0.25, 0.06, 165],
  "accent-soft": [0.8, 0.145, 163, 0.18],
  positive: [0.5, 0.105, 166],
  "positive-soft": [0.5, 0.105, 166, 0.1],
  negative: [0.53, 0.14, 48],
  "negative-soft": [0.53, 0.14, 48, 0.1],
  danger: [0.53, 0.2, 25],
  "danger-soft": [0.53, 0.2, 25, 0.09],
  warning: [0.55, 0.115, 78],
  "warning-soft": [0.55, 0.115, 78, 0.12],
  info: [0.52, 0.13, 255],
  "info-soft": [0.52, 0.13, 255, 0.1],
  glass: [0.995, 0.003, 165, 0.72],
  "glass-line": withAlpha(INK_L, 0.1),
  "glass-highlight": [1, 0, 0, 0.9],
  scrim: [0.2, 0.02, 170, 0.32],
  focus: [0.5, 0.105, 166],
};

/** Dark: near-black, elevation by lighter surfaces rather than shadows. */
export const dark: Record<ColorRole, Oklch> = {
  bg: [0.158, 0.007, 170],
  "bg-elevated": [0.205, 0.009, 170],
  surface: [0.205, 0.009, 170],
  "surface-2": [0.245, 0.01, 170],
  "surface-3": [0.295, 0.011, 170],
  line: [1, 0, 0, 0.1],
  "line-strong": [1, 0, 0, 0.16],
  fg: [0.965, 0.004, 165],
  "fg-muted": [0.775, 0.012, 170],
  "fg-subtle": [0.665, 0.012, 170],
  accent: [0.82, 0.14, 163],
  "accent-hover": [0.86, 0.13, 163],
  "accent-fg": [0.25, 0.06, 165],
  "accent-soft": [0.82, 0.14, 163, 0.16],
  positive: [0.84, 0.13, 165],
  "positive-soft": [0.84, 0.13, 165, 0.12],
  negative: [0.81, 0.12, 58],
  "negative-soft": [0.81, 0.12, 58, 0.12],
  danger: [0.72, 0.16, 25],
  "danger-soft": [0.72, 0.16, 25, 0.12],
  warning: [0.84, 0.12, 80],
  "warning-soft": [0.84, 0.12, 80, 0.12],
  info: [0.78, 0.11, 255],
  "info-soft": [0.78, 0.11, 255, 0.12],
  glass: [0.24, 0.008, 170, 0.66],
  "glass-line": [1, 0, 0, 0.12],
  "glass-highlight": [1, 0, 0, 0.1],
  scrim: [0.05, 0.01, 170, 0.6],
  focus: [0.84, 0.13, 165],
};

export const themes = { light, dark } as const;
export type ThemeName = keyof typeof themes;

/**
 * Identity colours for people and groups: eight low-chroma hues that stay clear
 * of mint (owed) and ember (owe), so a face never reads as a balance.
 */
export const IDENTITY_HUES = [255, 285, 320, 350, 75, 105, 205, 230] as const;
export function identityColors(hue: number) {
  return {
    light: { bg: [0.92, 0.045, hue] as Oklch, fg: [0.4, 0.09, hue] as Oklch },
    dark: { bg: [0.33, 0.055, hue] as Oklch, fg: [0.9, 0.06, hue] as Oklch },
  };
}
/** A stable hue for an id or name. */
export function identityHue(key: string): number {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.codePointAt(0)!) | 0;
  return IDENTITY_HUES[Math.abs(h) % IDENTITY_HUES.length];
}

/** Text sizes in px with line height and tracking (em). */
export const type = {
  displayXl: { size: "clamp(3rem, 7.4vw, 5.75rem)", line: 0.98, track: -0.035, width: 118, weight: 640 },
  moneyHero: { size: 56, line: 1, track: -0.03, width: 116, weight: 620 },
  title1: { size: 32, line: 1.1, track: -0.025, width: 112, weight: 640 },
  title2: { size: 24, line: 1.15, track: -0.02, width: 110, weight: 620 },
  title3: { size: 20, line: 1.25, track: -0.012, width: 106, weight: 600 },
  body: { size: 17, line: 1.45, track: -0.005, width: 100, weight: 420 },
  callout: { size: 15, line: 1.4, track: 0, width: 100, weight: 420 },
  footnote: { size: 13, line: 1.35, track: 0.002, width: 100, weight: 450 },
  caption: { size: 12, line: 1.3, track: 0.01, width: 100, weight: 520 },
} as const;

export const space = [0, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128] as const;

/** Concentric radii: inner = outer − padding. */
export const radius = { tile: 12, key: 16, group: 20, panel: 24, sheet: 32, pill: 999 } as const;

/** Durations (ms), curves and springs, shared by Motion (web) and Reanimated (phone). */
export const motion = {
  press: 90,
  feedback: 120,
  state: 200,
  panel: 240,
  layout: 300,
  focal: 600,
  ease: {
    standard: [0.2, 0.8, 0.2, 1],
    enter: [0.22, 1, 0.36, 1],
    focal: [0.16, 1, 0.3, 1],
    exit: [0.4, 0, 1, 1],
  },
  spring: {
    snappy: { visualDuration: 0.18, bounce: 0 },
    panel: { visualDuration: 0.32, bounce: 0 },
    digits: { visualDuration: 0.55, bounce: 0.08 },
  },
} as const;

// ─── Colour maths ───────────────────────────────────────────────────────────

/** OKLCH to sRGB channels 0–1 (clipped to the sRGB gamut). */
export function oklchToRgb([l, c, h]: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  const gamma = (x: number) => {
    const v = Math.min(1, Math.max(0, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return [gamma(lin[0]), gamma(lin[1]), gamma(lin[2])];
}

export function oklchToHex(color: Oklch): string {
  const hex = oklchToRgb(color)
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("");
  const alpha = color[3];
  return alpha === undefined || alpha >= 1 ? `#${hex}` : `#${hex}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
}

/** CSS `oklch()` string. */
export function oklchCss([l, c, h, a]: Oklch): string {
  const base = `${+(l * 100).toFixed(2)}% ${+c.toFixed(4)} ${+h.toFixed(1)}`;
  return a === undefined || a >= 1 ? `oklch(${base})` : `oklch(${base} / ${+a.toFixed(3)})`;
}

/** Blend a translucent colour over an opaque one (for contrast checks). */
export function over(top: Oklch, under: Oklch): [number, number, number] {
  const t = oklchToRgb(top);
  const u = oklchToRgb(under);
  const a = top[3] ?? 1;
  return [t[0] * a + u[0] * (1 - a), t[1] * a + u[1] * (1 - a), t[2] * a + u[2] * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]) {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two colours (the first may be translucent over the second). */
export function contrast(fg: Oklch, bg: Oklch): number {
  const a = luminance(over(fg, bg));
  const b = luminance(oklchToRgb(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
