// After `next build`: write out/sw.js with the list of built files to precache.
// A hash of that list is the cache version, so every deploy updates cleanly.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "out");

const SKIP = [/\.map$/, /^sw\.js$/, /^404\.html$/, /^_not-found/, /\/_not-found/, /\.DS_Store$/, /^design/];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(out)
  .map((f) => relative(out, f).split(sep).join("/"))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .sort();

const hash = createHash("sha256");
for (const f of files) hash.update(f).update(readFileSync(join(out, f)));
const version = hash.digest("hex").slice(0, 12);

const precache = files.map((f) => `/${f}`);
const template = readFileSync(join(root, "scripts", "sw.template.js"), "utf8");
const markers = ['"%%VERSION%%"', "/*%%PRECACHE%%*/ []"];
for (const m of markers) {
  if (template.split(m).length !== 2) throw new Error(`sw.template.js must contain ${m} exactly once`);
}
writeFileSync(
  join(out, "sw.js"),
  template.replace(markers[0], JSON.stringify(version)).replace(markers[1], JSON.stringify(precache)),
);

const kb = Math.round(files.reduce((s, f) => s + statSync(join(out, f)).size, 0) / 1024);
console.log(`sw.js: ${files.length} files (${kb} KB) precached, version ${version}`);
