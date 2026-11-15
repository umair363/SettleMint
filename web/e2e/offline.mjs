// Offline test: app opens offline from cache, offline expense syncs after reconnect + reload.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("B:/Settle-Mint/package.json");
const { chromium } = require("playwright");
const [outDir, shotsDir] = process.argv.slice(2);
fs.mkdirSync(shotsDir, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const candidates = [path.join(outDir, url), path.join(outDir, url + ".html"), path.join(outDir, url, "index.html")];
  const file = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) ?? path.join(outDir, "404.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4555, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
const page = await ctx.newPage();
const log = [];
page.setDefaultTimeout(15000);
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && log.push(`CONSOLE ${m.type()}: ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => log.push(`PAGEERROR ${e.message.slice(0, 200)}`));
const ok = (msg) => log.push(`PASS ${msg}`);
const fail = (msg) => log.push(`FAIL ${msg}`);
let n = 0;
const shot = async (name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(shotsDir, `${String(++n).padStart(2, "0")}-${name}.png`) });
};

try {
  await page.goto("http://localhost:4555/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Use a password" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Your name").fill("Olu Offline");
  await page.getByLabel("Email").fill(`olu-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/home", { timeout: 20000 });
  await page.getByRole("button", { name: "Create a group" }).first().click();
  await page.getByLabel("Name").fill("Cabin weekend");
  await page.locator("#add-person").fill("Mia");
  await page.locator("#add-person").press("Enter");
  await page.getByRole("button", { name: "Create group" }).click();
  await page.waitForURL("**/group?id=*", { timeout: 20000 });
  const groupUrl = page.url().replace("&invite=1", "");
  await page.keyboard.press("Escape");

  // Let the service worker install and take control, and the cache persist.
  const swState = await page.evaluate(async () => {
    const timeout = new Promise((r) => setTimeout(() => r("timeout"), 20000));
    const ready = navigator.serviceWorker.ready.then(() => "ready");
    const regs = await navigator.serviceWorker.getRegistrations();
    return `${await Promise.race([ready, timeout])} (registrations: ${regs.length})`;
  });
  log.push(`INFO service worker: ${swState}`);
  await page.goto(groupUrl, { waitUntil: "networkidle" });
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  controlled ? ok("service worker controls the page") : fail("service worker not controlling");
  await page.waitForTimeout(1500);

  // 1. Offline reload opens from cache.
  await ctx.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Cabin weekend").first().waitFor({ timeout: 10000 });
  ok("group opens offline from saved data");
  (await page.getByText("Offline · changes will sync").isVisible()) ? ok("offline pill shown") : fail("offline pill missing");
  await shot("offline-group");

  // 2. Add an expense while offline.
  await page.getByRole("button", { name: "Add expense" }).last().click();
  await page.getByLabel("Description").fill("Firewood");
  await page.getByLabel("Description").blur();
  for (const k of ["4", "5"]) await page.getByRole("button", { name: k, exact: true }).click();
  await page.getByRole("button", { name: /^Add \$45\.00/ }).click();
  await page.getByText("Firewood").first().waitFor({ timeout: 5000 });
  ok("offline expense appears immediately");
  await shot("offline-expense-added");

  // 3. Reload while still offline: the queued expense must survive.
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Cabin weekend").first().waitFor({ timeout: 10000 });
  (await page.getByText("Firewood").count()) > 0 ? ok("queued expense survives an offline reload") : fail("queued expense lost on reload");

  // 4. Back online: it syncs.
  await ctx.setOffline(false);
  await page.waitForTimeout(6000);
  await page.goto(groupUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const synced = await page.evaluate(async (id) => {
    const res = await fetch(`http://localhost:8001/v1/groups/${id}/expenses`, { credentials: "include" });
    const body = await res.json();
    return body.items.map((e) => `${e.description}:${e.amount}`);
  }, new URL(groupUrl).searchParams.get("id"));
  synced.includes("Firewood:4500") ? ok(`server has the offline expense (${synced.join(", ")})`) : fail(`server missing it: ${JSON.stringify(synced)}`);
  await shot("after-sync");
} catch (err) {
  fail(`error: ${err.message.split("\n")[0]}`);
  await shot("error");
} finally {
  await browser.close();
  server.close();
  console.log(log.join("\n"));
}
