// Joining a group from an invite link, in a real browser: there is no "continue without an account".
// Usage: node e2e/join.mjs <outDir> [apiUrl] [screenshotsDir]   (needs the v1 API, see README)
//   1. Ana makes a group and an invite link.
//   2. Someone signed out opens it: they see the group and "Create an account to join", never a guest option.
//   3. They pick who they are, create an account, and land back on the invite and join.
//   4. The sign-in page itself has no guest option, and the API refuses a new guest session.
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

const failures = [];
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` (${detail})` : ""}`);
  if (!cond) failures.push(name);
};

const browser = await chromium.launch();
try {
  // 1 ─ Ana makes a group with Ben in it, and an invite link.
  const ana = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const call = async (method, url, data) => {
    const res = await ana.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };
  await call("POST", "/v1/auth/sign-up/email", { name: "Ana", email: `ana-${Date.now()}@example.com`, password: "correct-horse-battery" });
  await call("PATCH", "/v1/me", { defaultCurrency: "USD" });
  const group = await call("POST", "/v1/groups", { name: "Lisbon trip", currency: "USD", type: "trip", people: [{ displayName: "Ben" }] });
  const invite = await call("POST", `/v1/groups/${group.id}/invite`);

  // 2 ─ A signed-out visitor opens the link.
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await guest.newPage();
  await page.goto(`${ORIGIN}/join?t=${invite.token}`, { waitUntil: "load" });
  await page.getByRole("heading", { name: "Lisbon trip" }).waitFor({ timeout: 15000 });
  ok("the visitor sees the group they were invited to", true);
  ok("there is no way to join without an account", (await page.getByText(/without an account/i).count()) === 0);
  const create = page.getByRole("button", { name: "Create an account to join" });
  ok("it asks them to create an account", await create.isVisible());
  ok("and waits until they say which person they are", await create.isDisabled());
  await page.getByRole("radio", { name: "Ben" }).click();
  ok("picking a person enables it", await create.isEnabled());
  await page.screenshot({ path: path.join(shotsDir, "join-signed-out.png") });

  // 3 ─ They create an account and come back to the invite.
  await create.click();
  await page.waitForURL(/\/sign-in/, { timeout: 15000 });
  await page.getByLabel("Your name", { exact: true }).waitFor({ timeout: 15000 });
  ok("it opens the create-account form, not the sign-in form", true);
  await page.getByLabel("Your name", { exact: true }).fill("Ben");
  await page.getByLabel("Email").fill(`ben-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/welcome/, { timeout: 20000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(/\/join\?t=/, { timeout: 20000 });
  ok("after setting up, they are back on the invite", true);
  const claimed = page.getByRole("radio", { name: "Ben" });
  await claimed.waitFor({ timeout: 15000 });
  ok("the person they picked is still picked", (await claimed.getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: "Join group" }).click();
  await page.waitForURL(/\/group\?id=/, { timeout: 20000 });
  ok("they join the group", true);
  const detail = await (await guest.request.fetch(`${API}/v1/groups/${group.id}`, { headers: { origin: ORIGIN } })).json();
  ok("as Ben, with their own account", detail.members.find((m) => m.isMe)?.displayName === "Ben");

  // 4 ─ Neither the page nor the API offers a guest.
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto(`${ORIGIN}/sign-in`, { waitUntil: "load" });
  await fresh.getByRole("button", { name: "Sign in", exact: true }).waitFor({ timeout: 15000 });
  ok("the sign-in page has no guest option", (await fresh.getByText(/without an account|guest/i).count()) === 0);
  const refused = await ana.request.fetch(`${API}/v1/auth/sign-in/anonymous`, { method: "POST", data: {}, headers: { origin: ORIGIN } });
  ok("the API refuses a new guest session", refused.status() === 403, String(refused.status()));
} catch (err) {
  console.log("FAIL unexpected error:", err);
  failures.push("error");
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `${failures.length} problem(s)` : "join completed with no errors");
process.exit(failures.length ? 1 : 0);
