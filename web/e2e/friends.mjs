// Adding friends by username or email, in a real browser.
// Usage: node e2e/friends.mjs <outDir> [apiUrl] [screenshotsDir]   (needs the v1 API, see README)
//   1. Ben picks a username (Account → Username).
//   2. Ana finds him by it from Add a friend; Ben sees the request, accepts, and they are friends.
//   3. Ana invites an email with no account, sees it waiting, and can cancel it.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [outDir, API = "http://localhost:8001", shotsDir = os.tmpdir()] = process.argv.slice(2);
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

const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const failures = [];
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` (${detail})` : ""}`);
  if (!cond) failures.push(name);
};
async function axeOk(page, name) {
  await page.waitForTimeout(600);
  await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
  ok(`${name} has no accessibility violations`, r.violations.length === 0, r.violations.map((v) => v.id + ": " + v.nodes[0]?.html.slice(0, 160)).join("; "));
}

const browser = await chromium.launch();
async function signUp(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const call = async (method, url, data) => {
    const res = await ctx.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };
  await call("POST", "/v1/auth/sign-up/email", { name, email: `${name.toLowerCase()}-${Date.now()}@example.com`, password: "correct-horse-battery" });
  await call("PATCH", "/v1/me", { defaultCurrency: "USD" });
  return { ctx, call };
}

try {
  const ana = await signUp("Ana");
  const ben = await signUp("Ben");
  const handle = `ben_${Date.now().toString(36)}`;

  // 1 ─ Ben picks a username on the Account page.
  const benPage = await ben.ctx.newPage();
  await benPage.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  await benPage.getByText("Username", { exact: true }).click();
  await benPage.getByLabel("Username", { exact: true }).fill(`@${handle.toUpperCase()}`);
  await axeOk(benPage, "the username sheet");
  await benPage.getByRole("button", { name: "Save", exact: true }).click();
  await benPage.getByText("Username saved").waitFor({ timeout: 10000 });
  const me = await ben.call("GET", "/v1/me");
  ok("the username is saved in lower case", me.username === handle, String(me.username));

  // 2 ─ Ana finds him by it.
  const anaPage = await ana.ctx.newPage();
  await anaPage.goto(`${ORIGIN}/groups`, { waitUntil: "load" });
  await anaPage.getByRole("button", { name: "Add friend", exact: true }).first().click();
  await anaPage.getByPlaceholder("Email or @username").fill("@nobody_has_this_9");
  await anaPage.getByRole("button", { name: "Send request" }).click();
  await anaPage.getByText("No one has that username.").waitFor({ timeout: 10000 });
  ok("an unknown username says so", true);
  await anaPage.getByPlaceholder("Email or @username").fill(`@${handle}`);
  await axeOk(anaPage, "the add-a-friend sheet");
  await anaPage.getByRole("button", { name: "Send request" }).click();
  await anaPage.getByText("Request sent").waitFor({ timeout: 10000 });
  ok("the request is sent", true);
  await anaPage.getByText(`@${handle}`).first().waitFor({ timeout: 10000 });
  ok("Ana sees it waiting, by what she typed", true);

  // Ben sees who is asking and accepts.
  await benPage.goto(`${ORIGIN}/groups`, { waitUntil: "load" });
  await benPage.getByRole("heading", { name: "Friend requests" }).waitFor({ timeout: 10000 }).catch(() => {});
  await benPage.getByText("wants to add you").waitFor({ timeout: 10000 });
  ok("Ben sees the request with Ana's name", (await benPage.getByText("Ana", { exact: true }).count()) > 0);
  await axeOk(benPage, "the friend requests list");
  await benPage.screenshot({ path: path.join(shotsDir, "friends-request.png") });
  await benPage.getByRole("button", { name: "Accept" }).click();
  await benPage.getByText("You and Ana are friends.").waitFor({ timeout: 10000 });
  ok("accepting says you are friends", true);
  await benPage.getByText("wants to add you").waitFor({ state: "detached", timeout: 10000 });
  ok("the request disappears once answered", true);

  const anaGroups = await ana.call("GET", "/v1/groups");
  ok("both now share a one-to-one group", anaGroups.some((g) => g.type === "direct"));
  await anaPage.goto(`${ORIGIN}/groups`, { waitUntil: "load" });
  await anaPage.getByText("Ben", { exact: true }).first().waitFor({ timeout: 10000 });
  ok("Ben shows up in Ana's friends", true);

  // 3 ─ An email with no account is invited; it waits and can be cancelled.
  const stranger = `new-${Date.now().toString(36)}@example.com`;
  await anaPage.getByRole("button", { name: "Add friend", exact: true }).first().click();
  await anaPage.getByPlaceholder("Email or @username").fill(stranger);
  await anaPage.getByRole("button", { name: "Send request" }).click();
  await anaPage.getByText("Request sent").waitFor({ timeout: 10000 });
  await anaPage.getByText(stranger, { exact: true }).waitFor({ timeout: 10000 });
  ok("an invited email waits in the list", true);
  await anaPage.getByRole("button", { name: `Cancel the request to ${stranger}` }).click();
  await anaPage.getByText(stranger, { exact: true }).waitFor({ state: "detached", timeout: 10000 });
  ok("a waiting request can be cancelled", true);
  await anaPage.screenshot({ path: path.join(shotsDir, "friends-add.png") });
} catch (err) {
  console.log("FAIL unexpected error:", err);
  failures.push("error");
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `${failures.length} problem(s)` : "friends completed with no errors");
process.exit(failures.length ? 1 : 0);
