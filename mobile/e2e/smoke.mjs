// Drives the phone app's web build (same code as iOS/Android, rendered by
// react-native-web) through the core journey against the local v1 API.
// Usage: npx expo export --platform web --output-dir <dir>   (EXPO_PUBLIC_API_URL=http://localhost:8001)
//        node e2e/smoke.mjs <dir>        (API on :8001 with WEB_ORIGINS including http://localhost:4555)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Playwright is installed for the web app's browser tests.
const require = createRequire(new URL("../../web/package.json", import.meta.url));
const { chromium } = require("playwright");
const [outDir] = process.argv.slice(2);
const ORIGIN = "http://localhost:4555";

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".ico": "image/x-icon", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(outDir, url);
  // A single-page app: unknown paths get index.html and the router takes over.
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(outDir, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(target)] ?? "application/octet-stream" });
  fs.createReadStream(target).pipe(res);
});
await new Promise((r) => server.listen(4555, r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "en-US" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
page.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource|401/.test(m.text())) errors.push(m.text().split("\n")[0]);
});

let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}${ok ? "" : ` (at ${new URL(page.url()).pathname})`}`);
  if (!ok) failed = true;
};
/** SHOTS=<dir> saves a screenshot of each screen for a visual check. */
const shot = (name) => process.env.SHOTS && page.screenshot({ path: path.join(process.env.SHOTS, `${name}.png`) });
const see = (text, timeout = 15000) =>
  page
    .getByText(text, { exact: false })
    // Screens underneath in the stack stay in the page, hidden.
    .filter({ visible: true })
    .first()
    .waitFor({ timeout })
    .then(() => true, () => false);

try {
  await page.goto(ORIGIN, { waitUntil: "load" });
  check(await see("Welcome back"), "sign-in screen");
  await shot("1-sign-in");

  await page.getByTestId("guest").click();
  check(await see("Welcome to SettleMint"), "guest lands on onboarding");
  await page.getByLabel("What should friends call you?").fill("Ana");
  await page.getByRole("button", { name: "Continue" }).click();
  check(await see("Let's split your first bill"), "empty home invites a first group");
  await shot("2-home-empty");

  await page.getByRole("button", { name: "Create a group" }).click();
  await page.getByTestId("group-name").fill("Lisbon trip");
  await page.getByLabel("Add another").first().fill("Ben");
  await page.keyboard.press("Enter");
  await page.getByTestId("create-group").click();
  check(await see("Invite people"), "new group opens the invite sheet");
  check(await see("/join?t="), "invite link is shown");
  await page.getByRole("button", { name: "Close" }).click();
  check(await see("Settle up"), "group screen");

  await page.getByRole("button", { name: "Add expense" }).first().click();
  await page.getByTestId("amount").fill("30");
  await page.getByTestId("description").fill("Dinner");
  check(await see("$15.00"), "split preview shows each share");
  await shot("3-add-expense");
  await page.getByTestId("save-expense").click();
  check(await see("Added Dinner"), "expense saved");
  check(await see("You are owed"), "balance says I'm owed");
  check(await see("$15.00"), "balance is $15.00");
  await page.waitForTimeout(4500); // let the toast go
  await shot("4-group");

  await page.getByRole("radio", { name: "Balances" }).click();
  check(await see("Ben owes"), "suggested payment: Ben owes me");
  await shot("5-balances");
  // Remind: Ben was added by name, so the screen offers his email or a shared message instead.
  await page.getByRole("button", { name: "Remind" }).click();
  check(await see("Remind Ben"), "reminder screen opens for the person who owes");
  check(await see("It's a general reminder and doesn't say who is asking."), "reminder says it won't name who is asking");
  check(await see("hasn't joined yet"), "an unreachable friend is offered an email or a shared message");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByTestId("record-payment").click();
  check(await see("Payment recorded"), "payment recorded");
  check(await see("Everyone is settled up"), "everyone settled after the payment");

  // Group settings: rename the group.
  await page.getByRole("button", { name: "Group settings" }).click();
  await page.getByLabel("Name").first().fill("Lisbon 2026");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  check(await see("Lisbon 2026"), "group renamed in settings");

  // Search finds the expense from anywhere.
  await page.goto(ORIGIN, { waitUntil: "load" });
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search expenses and groups").fill("dinner");
  check(await see("Lisbon 2026 ·"), "search finds the expense");
  await page.getByRole("button", { name: "Close" }).click();

  // A friend needs only a name, and nothing has been deleted yet.
  await page.goto(`${ORIGIN}/groups`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Add friend" }).first().click();
  await page.getByTestId("group-name").fill("Sam");
  await page.getByTestId("create-group").click();
  check(await see("Settle up"), "friend added with just a name");
  await page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  await page.getByRole("button", { name: /Recently deleted/ }).click();
  check(await see("Nothing deleted lately"), "recently deleted is empty");
  await page.getByRole("button", { name: "Close" }).click();

  // Language: Arabic switches the text and the layout direction.
  await page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  await page.getByRole("button", { name: /Language/ }).click();
  await page.getByRole("radio", { name: "العربية" }).click();
  check(await see("الحساب"), "Arabic text after choosing العربية");
  check((await page.evaluate(() => document.documentElement.dir)) === "rtl", "layout is right-to-left");
  await shot("6-account-ar");
} catch (err) {
  check(false, `error: ${err.message.split("\n")[0]}`);
  await page.screenshot({ path: path.join(outDir, "failure.png") }).catch(() => {});
} finally {
  const unexpected = errors.filter((e) => !/hydrat/i.test(e));
  check(unexpected.length === 0, `no page errors${unexpected.length ? `: ${unexpected.slice(0, 3).join(" | ")}` : ""}`);
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
}
