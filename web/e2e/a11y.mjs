// Accessibility check: runs axe-core (WCAG 2.2 A/AA rules) on every main
// screen and on open sheets, in both themes.
// Usage: node e2e/a11y.mjs <outDir>   (needs the v1 API on :8001, see README)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [outDir] = process.argv.slice(2);

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const candidates = [path.join(outDir, url), path.join(outDir, url + ".html"), path.join(outDir, url, "index.html")];
  const file = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) ?? path.join(outDir, "404.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4555, r));

const browser = await chromium.launch();
const results = [];

async function audit(page, label) {
  await page.waitForTimeout(500);
  // Toasts fade in and out; measuring one mid-fade reports false contrast
  // failures, so wait for any to finish (they are audited at rest elsewhere).
  await page
    .waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 8000 })
    .catch(() => {});
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () =>
    axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
  );
  for (const v of r.violations) {
    results.push({
      label,
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary ?? "").split("\n").slice(1, 2).join("")),
    });
  }
}

for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("sm-theme", t), theme);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const at = (name) => `${theme} · ${name}`;

  await page.goto("http://localhost:4555/", { waitUntil: "networkidle" });
  await audit(page, at("landing"));
  await page.goto("http://localhost:4555/sign-in", { waitUntil: "networkidle" });
  await audit(page, at("sign-in"));

  await page.getByRole("button", { name: "Use a password" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Your name").fill("Ava Access");
  await page.getByLabel("Email").fill(`ava-${theme}-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  // New accounts go through a short onboarding (name + currency) first.
  await page.waitForURL(/\/(welcome|home)(\?|$)/, { timeout: 20000 });
  if (new URL(page.url()).pathname === "/welcome") {
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL("**/home", { timeout: 20000 });
  }
  await audit(page, at("home (new)"));

  await page.getByRole("button", { name: "Create a group" }).first().click();
  await audit(page, at("new group sheet"));
  await page.getByLabel("Name").fill("Accessible trip");
  await page.locator("#add-person").fill("Ben");
  await page.locator("#add-person").press("Enter");
  await page.getByRole("button", { name: "Create group" }).click();
  await page.waitForURL("**/group?id=*", { timeout: 20000 });
  await page.getByText("Copy link").waitFor();
  await audit(page, at("invite sheet"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: "Add expense" }).last().click();
  await page.getByLabel("Description").fill("Dinner");
  for (const k of ["3", "0"]) await page.getByRole("button", { name: k, exact: true }).click();
  await audit(page, at("add expense sheet"));
  await page.getByRole("button", { name: /^Split/ }).click();
  await audit(page, at("split panel"));
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /^Add / }).click();
  await page.waitForTimeout(1500);
  await audit(page, at("group · expenses"));
  await page.getByRole("radio", { name: "Balances" }).click();
  await audit(page, at("group · balances"));
  await page.getByRole("button", { name: "Record" }).first().click();
  await page.getByRole("heading", { name: "Record a payment" }).waitFor();
  await audit(page, at("settle sheet"));
  await page.keyboard.press("Escape");

  for (const p of ["home", "groups", "activity", "account"]) {
    await page.goto(`http://localhost:4555/${p}`, { waitUntil: "networkidle" });
    await audit(page, at(p));
  }
  await ctx.close();
}

await browser.close();
server.close();

if (results.length === 0) {
  console.log("axe: no violations on any screen");
} else {
  const byRule = new Map();
  for (const r of results) {
    const key = `${r.impact} ${r.id}: ${r.help}`;
    byRule.set(key, [...(byRule.get(key) ?? []), r]);
  }
  for (const [rule, hits] of byRule) {
    console.log(`\n${rule}  (${hits.length} screens: ${[...new Set(hits.map((h) => h.label))].join(", ")})`);
    for (const n of hits[0].nodes) console.log("   " + n.slice(0, 220));
  }
  process.exitCode = 1;
}
