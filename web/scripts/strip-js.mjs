// After `next build`: make the public pages (landing in every language,
// privacy, terms) plain HTML + CSS. They have nothing interactive that needs
// React (links are <a>, the FAQ is <details>), so the framework scripts and
// the hydration payload are pure cost on a slow phone. Our own small inline
// scripts (theme, language) are kept.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out", import.meta.url));
const LANGS = ["es", "pt", "fr", "de", "hi", "ur", "ar"];
const PAGES = ["index.html", "privacy.html", "terms.html", ...LANGS.map((l) => `${l}.html`)];

const present = new Set(readdirSync(out));
let saved = 0;
for (const page of PAGES) {
  if (!present.has(page)) throw new Error(`strip-js: expected out/${page}`);
  const file = join(out, page);
  const before = readFileSync(file, "utf8");
  const after = before
    // Framework bundles and their preloads.
    .replace(/<script[^>]*\ssrc="\/_next\/[^"]*"[^>]*><\/script>/g, "")
    .replace(/<link[^>]*rel="preload"[^>]*as="script"[^>]*\/?>/g, "")
    .replace(/<link[^>]*as="script"[^>]*rel="preload"[^>]*\/?>/g, "")
    // React Server Components payload used only for hydration.
    .replace(/<script>(\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push|self\.__next_f\.push)[\s\S]*?<\/script>/g, "");
  if (/\/_next\/static\/chunks\/[^"]*\.js/.test(after.replace(/<link[^>]*stylesheet[^>]*>/g, ""))) {
    throw new Error(`strip-js: ${page} still references a script bundle`);
  }
  if (after.includes("__next_f")) throw new Error(`strip-js: ${page} still has hydration data`);
  writeFileSync(file, after);
  saved += before.length - after.length;
}
console.log(`strip-js: ${PAGES.length} public pages are plain HTML (${Math.round(saved / 1024)} KB of scripts removed)`);
