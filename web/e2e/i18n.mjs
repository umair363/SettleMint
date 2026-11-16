// Languages: an Arabic phone gets the app right-to-left in Arabic (no English
// left over, nothing overflowing, accessible), switching language in Account
// applies at once and is saved, and a Hindi phone gets Devanagari.
// Usage: node e2e/i18n.mjs <outDir> [screenshotDir]   (needs the v1 API on :8001, see README)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const [outDir, shots] = process.argv.slice(2);
const API = "http://localhost:8001";
const ORIGIN = "http://localhost:4555";
if (shots) fs.mkdirSync(shots, { recursive: true });

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
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failed = true;
};

/** API call that waits out sign-up rate limits (several suites sign up back to back). */
async function call(context, method, url, data) {
  for (let attempt = 0; ; attempt++) {
    const res = await context.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (res.status() === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 11_000));
      continue;
    }
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  }
}

async function person(locale, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale });
  const api = (method, url, data) => call(ctx, method, url, data);
  await api("POST", "/v1/auth/sign-up/email", { name, email: `${name.toLowerCase()}-${Date.now()}@example.com`, password: "correct-horse-battery" });
  await api("PATCH", "/v1/me", { defaultCurrency: "EGP", locale });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  return { ctx, api, page };
}

async function axeViolations(page) {
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () =>
    axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
  );
  return r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`);
}

/** Visible text that is plain English words (ignores names, numbers, currency codes, the brand). */
async function englishLeftovers(page) {
  return page.evaluate(() => {
    const allowed = /^(SettleMint|Splitwise|Ctrl\+K|EGP|USD|[A-Z]{3}|Amira|Omar|Priya)$/;
    const words = (document.body.innerText.match(/\b[A-Za-z]{4,}\b/g) ?? []).filter((w) => !allowed.test(w));
    return [...new Set(words)];
  });
}

try {
  // ─── Arabic, right to left ───
  const ar = await person("ar-EG", "Amira");
  const group = await ar.api("POST", "/v1/groups", { name: "رحلة دهب", currency: "EGP", type: "trip", people: [{ displayName: "Omar" }] });
  const omar = group.members.find((m) => m.displayName === "Omar").id;
  await ar.api("POST", `/v1/groups/${group.id}/expenses`, {
    description: "عشاء",
    amount: 120000,
    currency: "EGP",
    date: new Date().toISOString().slice(0, 10),
    payers: [{ memberId: group.myMemberId, amount: 120000 }],
    split: { method: "equal", memberIds: [group.myMemberId, omar] },
  });

  await ar.page.goto(`${ORIGIN}/home`, { waitUntil: "load" });
  await ar.page.getByRole("navigation").first().waitFor();
  await ar.page.waitForFunction(() => !document.documentElement.hasAttribute("data-i18n-pending"));
  const doc = await ar.page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
  check(doc.lang === "ar" && doc.dir === "rtl", `Arabic phone opens right-to-left (lang=${doc.lang}, dir=${doc.dir})`);
  check(await ar.page.getByRole("link", { name: "المجموعات" }).first().isVisible(), "navigation is in Arabic");
  const leftovers = await englishLeftovers(ar.page);
  check(leftovers.length === 0, `no English left on the home screen${leftovers.length ? ` (${leftovers.join(", ")})` : ""}`);
  const overflow = await ar.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `nothing spills sideways at phone width (overflow ${overflow}px)`);
  if (shots) await ar.page.screenshot({ path: path.join(shots, "ar-home.png"), fullPage: true });

  await ar.page.goto(`${ORIGIN}/group?id=${group.id}`, { waitUntil: "load" });
  await ar.page.getByText("عشاء").first().waitFor();
  check(await ar.page.getByText("لك مستحقات").first().isVisible(), "group balance reads in Arabic");
  const groupLeftovers = await englishLeftovers(ar.page);
  check(groupLeftovers.length === 0, `no English left on the group screen${groupLeftovers.length ? ` (${groupLeftovers.join(", ")})` : ""}`);
  if (shots) await ar.page.screenshot({ path: path.join(shots, "ar-group.png"), fullPage: true });
  const violations = await axeViolations(ar.page);
  check(violations.length === 0, `group screen accessible in RTL${violations.length ? ` (${violations.join("; ")})` : ""}`);

  await ar.page.getByRole("button", { name: "إضافة مصروف" }).first().click();
  await ar.page.getByRole("dialog").waitFor();
  await ar.page.waitForTimeout(400);
  if (shots) await ar.page.screenshot({ path: path.join(shots, "ar-add-expense.png") });
  const sheetLeftovers = await englishLeftovers(ar.page);
  check(sheetLeftovers.length === 0, `add-expense sheet fully Arabic${sheetLeftovers.length ? ` (${sheetLeftovers.join(", ")})` : ""}`);
  await ar.page.keyboard.press("Escape");

  // ─── Switching language in Account ───
  await ar.page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  const picker = ar.page.getByRole("combobox", { name: "اللغة" });
  await picker.waitFor();
  await picker.selectOption("es");
  const switched = await ar.page
    .getByRole("link", { name: "Grupos" })
    .first()
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  const after = await ar.page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));
  check(switched && after.lang === "es" && after.dir === "ltr", `choosing Español switches at once, left-to-right (lang=${after.lang})`);
  await ar.page.waitForTimeout(800);
  const me = await ar.api("GET", "/v1/me");
  check(/^es/.test(me.locale ?? ""), `profile language saved for notifications (locale=${me.locale})`);
  await ar.page.reload({ waitUntil: "load" });
  const kept = await ar.page
    .getByRole("link", { name: "Grupos" })
    .first()
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(kept, "choice survives a reload");
  await ar.ctx.close();

  // ─── Hindi ───
  const hi = await person("hi-IN", "Priya");
  await hi.page.goto(`${ORIGIN}/home`, { waitUntil: "load" });
  await hi.page.getByRole("navigation").first().waitFor();
  const hindi = await hi.page
    .getByRole("link", { name: "ग्रुप" })
    .first()
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check(hindi, "Hindi phone gets Hindi navigation");
  if (shots) await hi.page.screenshot({ path: path.join(shots, "hi-home.png"), fullPage: true });
  await hi.ctx.close();
} catch (err) {
  check(false, `error: ${err.message.split("\n")[0]}`);
} finally {
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
}
