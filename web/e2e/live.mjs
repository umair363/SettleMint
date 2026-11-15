// Live updates: Ben watches a group while Ana adds an expense in another
// browser; Ben's screen must show it without reloading.
// Usage: node e2e/live.mjs <outDir>   (needs the v1 API on :8001, see README)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [outDir] = process.argv.slice(2);
const API = "http://localhost:8001";
const ORIGIN = "http://localhost:4555";

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

async function account(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const api = async (method, url, data) => {
    const res = await ctx.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };
  await api("POST", "/v1/auth/sign-up/email", {
    name,
    email: `${name.toLowerCase()}-${Date.now()}@example.com`,
    password: "correct-horse-battery",
  });
  await api("PATCH", "/v1/me", { defaultCurrency: "USD" });
  return { ctx, api };
}

try {
  const ana = await account("Ana");
  const ben = await account("Ben");
  const group = await ana.api("POST", "/v1/groups", { name: "Live test", currency: "USD", people: [{ displayName: "Ben" }] });
  const benSpot = group.members.find((m) => m.displayName === "Ben").id;
  const { token } = await ana.api("POST", `/v1/groups/${group.id}/invite`);
  await ben.api("POST", `/v1/invites/${token}/join`, { memberId: benSpot });

  const page = await ben.ctx.newPage();
  await page.goto(`${ORIGIN}/group?id=${group.id}`, { waitUntil: "load" });
  await page.getByText("No expenses yet").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000); // stream connected

  const started = Date.now();
  await ana.api("POST", `/v1/groups/${group.id}/expenses`, {
    description: "Pizza night",
    amount: 3600,
    currency: "USD",
    date: new Date().toISOString().slice(0, 10),
    payers: [{ memberId: group.myMemberId, amount: 3600 }],
    split: { method: "equal", memberIds: [group.myMemberId, benSpot] },
  });
  const appeared = await page
    .getByText("Pizza night")
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check(appeared, `Ben sees Ana's expense without reloading (${Date.now() - started} ms)`);
  const owes = await page.getByText("You owe").isVisible().catch(() => false);
  check(owes, "Ben's balance updates to \"You owe\"");
} catch (err) {
  check(false, `error: ${err.message.split("\n")[0]}`);
} finally {
  await browser.close();
  server.close();
  if (failed) process.exitCode = 1;
}
