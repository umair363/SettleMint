import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, identityColors, IDENTITY_HUES, oklchToHex, themes, type ColorRole } from "./tokens";

// Text/background pairs that must stay readable (WCAG AA: 4.5:1 for text).
const TEXT_PAIRS: [ColorRole, ColorRole][] = [
  ["fg", "bg"],
  ["fg", "surface"],
  ["fg", "surface-2"],
  ["fg-muted", "bg"],
  ["fg-muted", "surface"],
  ["fg-muted", "surface-2"],
  ["fg-subtle", "bg"],
  ["fg-subtle", "surface"],
  ["positive", "bg"],
  ["positive", "surface"],
  ["negative", "bg"],
  ["negative", "surface"],
  ["danger", "surface"],
  ["warning", "bg"],
  ["accent-fg", "accent"],
  ["info", "surface"],
];

describe("design tokens", () => {
  for (const [name, theme] of Object.entries(themes)) {
    describe(name, () => {
      it.each(TEXT_PAIRS)("%s on %s passes AA", (fg, bg) => {
        expect(contrast(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
      });

      it("focus ring is visible against the canvas (3:1)", () => {
        expect(contrast(theme.focus, theme.bg)).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it.each(IDENTITY_HUES)("identity hue %i keeps initials readable in both themes", (hue) => {
    const c = identityColors(hue);
    expect(contrast(c.light.fg, c.light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.dark.fg, c.dark.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("converts OKLCH to the expected hex", () => {
    expect(oklchToHex([1, 0, 0])).toBe("#ffffff");
    expect(oklchToHex([0, 0, 0])).toBe("#000000");
    expect(oklchToHex([0.982, 0.004, 165])).toBe("#f7faf8");
  });

  it("generated stylesheet is up to date (run: npm run tokens -w web)", async () => {
    const { toCss } = await import("./css");
    const current = readFileSync(new URL("../../../../web/src/app/tokens.css", import.meta.url), "utf8");
    expect(current.replace(/\r\n/g, "\n")).toBe(toCss());
  });
});
