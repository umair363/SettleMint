import { identityColors, identityHue, oklchToHex } from "@settlemint/client/design/tokens";

/** Each person and group keeps one quiet colour everywhere: same hue on the web and on the phone. */
export function identity(key: string, isDark: boolean): { bg: string; fg: string } {
  const set = identityColors(identityHue(key))[isDark ? "dark" : "light"];
  return { bg: oklchToHex(set.bg), fg: oklchToHex(set.fg) };
}
