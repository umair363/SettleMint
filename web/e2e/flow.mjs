// Drives the built web app against the local v1 API like a new user would.
// Usage: node e2e.mjs <outDir> <shotsDir> [phone|desktop] [dark|light]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [outDir, shotsDir, device = "phone", theme = "dark"] = process.argv.slice(2);
fs.mkdirSync(shotsDir, { recursive: true });


// Apply out/_headers (as the static host would), so the tests run under the real CSP.
function headerRules(dir) {
  const file = path.join(dir, "_headers");
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: {} });
    else {
      const i = line.indexOf(":");
      rules[rules.length - 1].headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}
const matches = (pattern, url) => (pattern.endsWith('*') ? url.startsWith(pattern.slice(0, -1)) : url === pattern);
const rules = headerRules(outDir);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const candidates = [path.join(outDir, url), path.join(outDir, url + ".html"), path.join(outDir, url, "index.html")];
  const file = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) ?? path.join(outDir, "404.html");
  const extra = Object.assign({}, ...rules.filter((r) => matches(r.pattern, url)).map((r) => r.headers));
  res.writeHead(200, { ...extra, "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4555, r));

const browser = await chromium.launch();
const viewport = device === "phone" ? { width: 390, height: 844 } : { width: 1280, height: 860 };
const ctx = await browser.newContext({
  viewport,
  isMobile: device === "phone",
  hasTouch: device === "phone",
  colorScheme: theme,
  locale: "en-US",
});
await ctx.addInitScript((t) => localStorage.setItem("sm-theme", t), theme);
const page = await ctx.newPage();
const problems = [];
page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 500 && problems.push(`HTTP ${r.status()} ${r.url()}`));

let n = 0;
const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(shotsDir, `${String(++n).padStart(2, "0")}-${device}-${theme}-${name}.png`) });
};
const step = async (name, fn) => {
  try {
    await fn();
  } catch (err) {
    problems.push(`STEP FAILED "${name}": ${err.message.split("\n")[0]}`);
    await shot(`FAILED-${name}`);
    throw err;
  }
};

try {
  await step("landing", async () => {
    await page.goto("http://localhost:4555/", { waitUntil: "networkidle" });
    await shot("landing");
    await page.getByRole("link", { name: "Get started" }).click();
    await page.waitForURL("**/sign-in");
    await shot("sign-in");
  });

  await step("sign up", async () => {
    await page.getByRole("button", { name: "Use a password" }).click();
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByLabel("Your name").fill("Ana Souza");
    await page.getByLabel("Email").fill(`ana-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/home", { timeout: 20000 });
    await shot("home-empty");
  });

  await step("create group", async () => {
    await page.getByRole("button", { name: "Create a group" }).first().click();
    await page.getByLabel("Name").fill("Lisbon trip");
    const person = page.locator("#add-person");
    await person.fill("Bilal");
    await person.press("Enter");
    await person.fill("Chen");
    await person.press("Enter");
    await shot("new-group-sheet");
    await page.getByRole("button", { name: "Create group" }).click();
    await page.waitForURL("**/group?id=*", { timeout: 20000 });
    await page.getByText("Copy link").waitFor();
    await shot("invite-sheet");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await shot("group-empty");
  });

  await step("add expense", async () => {
    await page.getByRole("button", { name: "Add expense" }).last().click();
    await page.getByLabel("Description").fill("Dinner at the market");
    await page.getByLabel("Description").blur();
    for (const k of ["1", "2", "0"]) await page.getByRole("button", { name: k, exact: true }).click();
    await shot("add-expense");
    await page.getByRole("button", { name: /^Split/ }).click();
    await shot("split-panel");
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: /^Add \$120\.00/ }).click();
    await page.waitForTimeout(1500);
    await shot("group-with-expense");
  });

  await step("expense detail", async () => {
    await page.getByRole("button", { name: /Dinner at the market/ }).click();
    await page.getByText("History").waitFor();
    await shot("expense-detail");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  });

  await step("balances and settle", async () => {
    await page.getByRole("radio", { name: "Balances" }).click();
    await shot("balances");
    await page.getByRole("button", { name: "Record" }).first().click();
    await page.getByRole("heading", { name: "Record a payment" }).waitFor();
    await shot("settle-sheet");
    await page.getByRole("button", { name: /^Record \$/ }).click();
    await page.waitForTimeout(1500);
    await shot("after-settle");
  });

  await step("activity and home", async () => {
    await page.goto("http://localhost:4555/activity", { waitUntil: "networkidle" });
    await shot("activity");
    await page.goto("http://localhost:4555/home", { waitUntil: "networkidle" });
    await shot("home");
    await page.goto("http://localhost:4555/account", { waitUntil: "networkidle" });
    await shot("account");
  });
} catch {
  // reported below
} finally {
  await browser.close();
  server.close();
  console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "flow completed with no errors");
}
