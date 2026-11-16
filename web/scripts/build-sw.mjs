// After `next build`: write out/sw.js with the list of built files to precache.
// A hash of that list is the cache version, so every deploy updates cleanly.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "out");

const SKIP = [
  /\.map$/,
  /^sw\.js$/,
  /^404\.html$/,
  /^_not-found/,
  /\/_not-found/,
  /\.DS_Store$/,
  /^design/,
  // Translated landing pages and crawler files: public web pages, not part of the app.
  /^(es|pt|fr|de|hi|ur|ar)(\.html|\.txt|\/)/,
  /^(sitemap\.xml|robots\.txt)$/,
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const all = walk(out)
  .map((f) => relative(out, f).split(sep).join("/"))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .sort();

// Only some people need these, so they are cached on first use instead of
// precached for everyone: the other languages' text, and the Arabic-script and
// Devanagari fonts. (English text is in the main bundle.)
const read = (f) => readFileSync(join(out, f), "utf8");
const lazyFonts = new Set();
for (const css of all.filter((f) => f.endsWith(".css"))) {
  for (const face of read(css).match(/@font-face\{[^}]*\}/g) ?? []) {
    if (!/font-family:\s*["']?Noto Sans (Arabic|Devanagari)/.test(face)) continue;
    for (const [, url] of face.matchAll(/url\(([^)]+)\)/g)) lazyFonts.add(url.replace(/^\.\.\//, "_next/static/").replace(/["']/g, ""));
  }
}
const isLanguageChunk = (f) => {
  if (!f.endsWith(".js") || !f.startsWith("_next/static/chunks/")) return false;
  const js = read(f);
  // A translated catalog: has the catalog's keys but not the English text.
  return /sampleTaxi:"/.test(js) && !js.includes("Taxi from the airport");
};
const lazy = all.filter((f) => lazyFonts.has(f) || isLanguageChunk(f));
const files = all.filter((f) => !lazy.includes(f));
if (lazy.filter((f) => f.endsWith(".js")).length !== 7) {
  throw new Error(`expected 7 translated language chunks, found ${lazy.filter((f) => f.endsWith(".js")).length}`);
}

const hash = createHash("sha256");
for (const f of files) hash.update(f).update(readFileSync(join(out, f)));
const version = hash.digest("hex").slice(0, 12);

const precache = files.map((f) => `/${f}`);
const template = readFileSync(join(root, "scripts", "sw.template.js"), "utf8");
const markers = ['"%%VERSION%%"', "/*%%PRECACHE%%*/ []", "/*%%LAZY%%*/ []"];
for (const m of markers) {
  if (template.split(m).length !== 2) throw new Error(`sw.template.js must contain ${m} exactly once`);
}
writeFileSync(
  join(out, "sw.js"),
  template
    .replace(markers[0], JSON.stringify(version))
    .replace(markers[1], JSON.stringify(precache))
    .replace(markers[2], JSON.stringify(lazy.map((f) => `/${f}`))),
);

const kb = Math.round(files.reduce((s, f) => s + statSync(join(out, f)).size, 0) / 1024);
const lazyKb = Math.round(lazy.reduce((s, f) => s + statSync(join(out, f)).size, 0) / 1024);
console.log(`sw.js: ${files.length} files (${kb} KB) precached, ${lazy.length} (${lazyKb} KB) on first use, version ${version}`);
