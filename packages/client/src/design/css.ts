// Builds web/src/app/tokens.css from tokens.ts (see web/scripts/build-tokens.mjs).
import { motion, oklchCss, radius, themes, type ColorRole } from "./tokens.ts";

const block = (selector: string, theme: Record<ColorRole, readonly [number, number, number, number?]>, scheme: string) =>
  [
    `${selector} {`,
    `  color-scheme: ${scheme};`,
    ...Object.entries(theme).map(([role, value]) => `  --${role}: ${oklchCss(value)};`),
    "}",
  ].join("\n");

const bezier = (v: readonly number[]) => `cubic-bezier(${v.join(", ")})`;

/** The generated stylesheet. Light is the default; dark applies under [data-theme="dark"]. */
export function toCss(): string {
  return [
    "/* Generated from packages/client/src/design/tokens.ts by web/scripts/build-tokens.mjs. Do not edit. */",
    "",
    block(':root,\n[data-theme="light"]', themes.light, "light"),
    "",
    block('[data-theme="dark"]', themes.dark, "dark"),
    "",
    ":root {",
    ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v === 999 ? "999px" : `${v / 16}rem`};`),
    ...Object.entries(motion.ease).map(([k, v]) => `  --ease-${k}: ${bezier(v)};`),
    ...(["press", "feedback", "state", "panel", "layout", "focal"] as const).map((k) => `  --dur-${k}: ${motion[k]}ms;`),
    "}",
    "",
  ].join("\n");
}
