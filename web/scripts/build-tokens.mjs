// Writes the design tokens for the web (src/app/tokens.css) and the phone app
// (mobile/src/theme/palette.ts) from packages/client/src/design/tokens.ts.
// Runs before dev and build; the outputs are committed so diffs are reviewable.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toCss } from "../../packages/client/src/design/css.ts";
import { oklchToHex, themes } from "../../packages/client/src/design/tokens.ts";

const at = (p) => fileURLToPath(new URL(p, import.meta.url));

writeFileSync(at("../src/app/tokens.css"), toCss());

const palette = Object.fromEntries(
  Object.entries(themes).map(([name, roles]) => [name, Object.fromEntries(Object.entries(roles).map(([k, v]) => [k, oklchToHex(v)]))]),
);
writeFileSync(
  at("../../mobile/src/theme/palette.ts"),
  `// Generated from packages/client/src/design/tokens.ts by web/scripts/build-tokens.mjs. Do not edit.\n\nexport const palette = ${JSON.stringify(palette, null, 2)} as const;\n\nexport type PaletteRole = keyof typeof palette.light;\n`,
);
console.log("tokens: web/src/app/tokens.css and mobile/src/theme/palette.ts written");
