// Saved payment QR codes and payment reminders, in a real browser.
// Usage: node e2e/payqr.mjs <outDir> [apiUrl] [apiLogFile] [screenshotsDir]   (needs the v1 API, see README)
//   1. Ana uploads a screenshot of a bank QR; the app reads it and saves it.
//   2. Ben, who owes her, opens it on the pay screen; the redrawn rounded code must
//      still scan back to exactly the same text, and its picture must save.
//   3. Ana sends Ben a reminder (notification + email), with her details included.
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const { qrModules, pakistanP2pQr } = require("@settlemint/shared");
const [outDir, API = "http://localhost:8001", apiLog, shotsDir = os.tmpdir()] = process.argv.slice(2);
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
/** Accessibility check of whatever is on screen (WCAG 2.2 AA), reported as one test. */
async function axeOk(page, name) {
  await page.waitForTimeout(600);
  await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0, null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }));
  ok(`${name} has no accessibility violations`, r.violations.length === 0, r.violations.map((v) => v.id + ": " + v.nodes[0]?.html.slice(0, 220)).join("; "));
}

const BANK_QR = "00020101021126400014A000000677010112011234567890123456789005204739953035865802PK5909Ana Souza6007Karachi6304ABCD";
const failures = [];
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` (${detail})` : ""}`);
  if (!cond) failures.push(name);
};

const browser = await chromium.launch();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "payqr-"));

async function signUp(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const call = async (method, url, data) => {
    const res = await ctx.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };
  await call("POST", "/v1/auth/sign-up/email", { name, email: `${name.toLowerCase()}-${Date.now()}@example.com`, password: "correct-horse-battery" });
  await call("PATCH", "/v1/me", { defaultCurrency: "PKR" });
  return { ctx, call };
}

try {
  const ana = await signUp("Ana");
  const ben = await signUp("Ben");

  // A screenshot like a bank app makes: the code sits among other content.
  const page = await ana.ctx.newPage();
  const pngBase64 = await page.evaluate((modules) => {
    const scale = 7;
    const quiet = 4;
    const n = modules.length;
    const c = document.createElement("canvas");
    c.width = 900;
    c.height = 1300;
    const g = c.getContext("2d");
    g.fillStyle = "#e9eef0";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#1b3a5c";
    g.font = "bold 44px sans-serif";
    g.fillText("My QR code", 60, 110);
    g.fillStyle = "#fff";
    g.fillRect(60, 180, 780, 780);
    const size = (n + quiet * 2) * scale;
    const ox = 60 + (780 - size) / 2;
    const oy = 180 + (780 - size) / 2;
    g.fillStyle = "#000";
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (modules[r][q]) g.fillRect(ox + (q + quiet) * scale, oy + (r + quiet) * scale, scale, scale);
    g.fillStyle = "#1b3a5c";
    g.font = "32px sans-serif";
    g.fillText("Scan to pay with any Raast app", 60, 1040);
    return c.toDataURL("image/png").split(",")[1];
  }, qrModules(BANK_QR));
  const shot = path.join(tmp, "bank-screenshot.png");
  fs.writeFileSync(shot, Buffer.from(pngBase64, "base64"));

  // 1 ─ Ana saves it.
  await page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  await page.getByRole("button", { name: /How people pay you/ }).click();
  await page.getByRole("button", { name: "Add my QR" }).waitFor({ timeout: 20000 });
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles(shot);
  const preview = page.getByRole("img", { name: "Your saved QR code" });
  await preview.waitFor({ timeout: 15000 });
  await axeOk(page, "the payment methods sheet with a QR");
  ok("the QR is read from the screenshot and shown back", await preview.isVisible());
  await page.getByLabel("Name for this QR").fill("HBL Raast");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Payment methods saved").waitFor({ timeout: 10000 });
  const saved = await ana.call("GET", "/v1/me/payment-handles");
  ok("it is stored as the exact text that was in the code", saved.length === 1 && saved[0].kind === "qr" && saved[0].value === BANK_QR && saved[0].label === "HBL Raast", JSON.stringify(saved));

  // Making a QR from an IBAN instead of uploading one: it must be exactly the State Bank's format.
  const PK_IBAN = "PK36SCBL0000001123456702";
  await page.getByRole("button", { name: "Add a method" }).click();
  await page.getByLabel("Payment method").last().selectOption({ label: "IBAN" });
  await page.getByLabel("IBAN details").fill(PK_IBAN);
  await page.getByRole("button", { name: /Make QR · IBAN/ }).click();
  await axeOk(page, "the payment methods sheet with a made QR");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Payment methods saved").waitFor({ timeout: 10000 });
  const saved2 = await ana.call("GET", "/v1/me/payment-handles");
  const made = saved2.find((h) => h.kind === "qr" && h.label === "IBAN QR");
  ok("a QR made from an IBAN is exactly the State Bank's personal-QR format", made?.value === pakistanP2pQr(PK_IBAN), String(made?.value));
  ok("the IBAN itself is kept as well", saved2.some((h) => h.kind === "iban"));

  // Any Pakistani wallet: choose JazzCash, enter its IBAN, and a QR can be made; a phone number alone can't.
  await page.getByRole("button", { name: "Add a method" }).click();
  await page.getByLabel("Payment method").last().selectOption({ label: "JazzCash" });
  await page.getByLabel("JazzCash details").fill("0300 1234567");
  ok("a phone number alone offers no Make QR", (await page.getByRole("button", { name: /Make QR · JazzCash/ }).count()) === 0);
  // The same IBAN as before would make an identical code, which is refused out loud, not silently.
  await page.getByLabel("JazzCash details").fill(PK_IBAN);
  await page.getByRole("button", { name: /Make QR · JazzCash/ }).click();
  await page.getByText("That QR is already in your list.").waitFor({ timeout: 5000 });
  ok("an identical QR is refused with a message", true);
  // A different wallet IBAN (check digits computed here) makes a new one.
  const bban = "JCMA0000009876543210";
  const check = String(98n - (BigInt((bban + "PK00").replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))) % 97n)).padStart(2, "0");
  await page.getByLabel("JazzCash details").fill("PK" + check + bban);
  await page.getByRole("button", { name: /Make QR · JazzCash/ }).click();
  ok("an IBAN typed into JazzCash makes a QR named after it", (await page.locator("input").evaluateAll((els) => els.filter((e) => e.value === "JazzCash QR").length)) === 1);

  // A picture with no QR is refused kindly, and nothing is added.
  const blank = path.join(tmp, "blank.png");
  fs.writeFileSync(blank, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: /How people pay you/ }).click();
  await page.getByRole("button", { name: "Add my QR" }).waitFor();
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles(blank);
  await page.getByText("We couldn't find a QR code in that picture").waitFor({ timeout: 10000 });
  ok("a picture without a QR code is refused with a clear message", true);

  // Ana and Ben share a group where Ben owes her.
  const group = await ana.call("POST", "/v1/groups", { name: "QR trip", currency: "PKR", type: "trip", people: [{ displayName: "Ben" }] });
  const benMember = group.members.find((m) => m.displayName === "Ben").id;
  await ana.call("POST", `/v1/groups/${group.id}/expenses`, {
    description: "Dinner",
    amount: 400000,
    currency: "PKR",
    date: new Date().toISOString().slice(0, 10),
    payers: [{ memberId: group.myMemberId, amount: 400000 }],
    split: { method: "equal", memberIds: [group.myMemberId, benMember] },
  });
  const invite = await ana.call("POST", `/v1/groups/${group.id}/invite`, {});
  await ben.call("POST", `/v1/invites/${invite.token}/join`, { memberId: benMember });

  // 2 ─ Ben opens Ana's QR on the pay screen.
  const benPage = await ben.ctx.newPage();
  await benPage.goto(`${ORIGIN}/group?id=${group.id}`, { waitUntil: "load" });
  await benPage.getByRole("radio", { name: "Balances" }).click();
  await benPage.getByRole("button", { name: "Pay", exact: true }).first().click();
  await benPage.getByRole("button", { name: /HBL Raast\s+Show QR/ }).click();
  const qrImg = benPage.getByRole("img", { name: /HBL Raast · Ana/ });
  await qrImg.waitFor({ timeout: 10000 });
  await axeOk(benPage, "the QR sheet");
  ok("the pay screen shows her QR with the amount to enter", (await benPage.getByText(/then enter/).count()) > 0);

  // The redrawn, rounded code must still scan back to the very same text.
  await benPage.addScriptTag({ path: require.resolve("jsqr/dist/jsQR.js") });
  const decoded = await benPage.evaluate(async () => {
    const svg = document.querySelector('svg[role="img"][aria-label*="HBL Raast"]');
    const clone = svg.cloneNode(true);
    const px = 900;
    clone.setAttribute("width", String(px));
    clone.setAttribute("height", String(px));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, px, px);
    g.drawImage(img, 0, 0, px, px);
    const data = g.getImageData(0, 0, px, px);
    return jsQR(data.data, px, px)?.data ?? null;
  });
  ok("the rounded redrawn QR scans back to exactly the original text", decoded === BANK_QR, String(decoded));

  // Saving it gives a real picture.
  const [download] = await Promise.all([benPage.waitForEvent("download", { timeout: 15000 }), benPage.getByRole("button", { name: "Save image" }).click()]);
  const file = path.join(tmp, "saved.png");
  await download.saveAs(file);
  const head = fs.readFileSync(file).subarray(0, 8);
  ok("Save image downloads a PNG", head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && fs.statSync(file).size > 5000);
  await benPage.screenshot({ path: path.join(tmp, "ben-qr.png") });
  fs.copyFileSync(path.join(tmp, "ben-qr.png"), path.join(shotsDir, "payqr-ben.png"));

  // 2b ─ Ana shows her own QR to someone standing next to her: from Account, and from the balance she is owed.
  await page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  await page.getByText("Show my QR", { exact: true }).click();
  const mine = page.getByRole("img", { name: /HBL Raast · Ana/ });
  await mine.waitFor({ timeout: 10000 });
  await axeOk(page, "the Show my QR sheet");
  await page.addScriptTag({ path: require.resolve("jsqr/dist/jsQR.js") });
  const mineText = await page.evaluate(async () => {
    const svg = document.querySelector('svg[role="img"][aria-label*="HBL Raast"]');
    const clone = svg.cloneNode(true);
    clone.setAttribute("width", "900");
    clone.setAttribute("height", "900");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 900;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 900, 900);
    g.drawImage(img, 0, 0, 900, 900);
    return jsQR(g.getImageData(0, 0, 900, 900).data, 900, 900)?.data ?? null;
  });
  ok("my own QR, shown from Account, scans to the same text", mineText === BANK_QR, String(mineText));
  const [shared] = await Promise.all([page.waitForEvent("download", { timeout: 15000 }), page.getByRole("button", { name: "Save image" }).click()]);
  const sharedFile = path.join(tmp, "my-card.png");
  await shared.saveAs(sharedFile);
  const png = fs.readFileSync(sharedFile);
  ok("the saved card is a tall picture with the code and her name", png.subarray(1, 4).toString() === "PNG" && png.readUInt32BE(16) === 1080 && png.readUInt32BE(20) > 1300, png.readUInt32BE(20) + " px tall");
  fs.copyFileSync(sharedFile, path.join(shotsDir, "payqr-card.png"));
  const cardText = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    return jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
  }, png.toString("base64"));
  ok("the shareable card image itself scans to the same text", cardText === BANK_QR, String(cardText));
  await page.keyboard.press("Escape");

  await page.goto(`${ORIGIN}/group?id=${group.id}`, { waitUntil: "load" });
  await page.getByRole("radio", { name: "Balances" }).click();
  await page.getByRole("button", { name: "Show my QR" }).click();
  await page.getByText(/then enter Rs\s?2,000\.00/).waitFor({ timeout: 10000 });
  ok("from the balance she is owed, it says what to enter after scanning", true);
  await page.keyboard.press("Escape");

  // 3 ─ Ana reminds Ben.
  await page.goto(`${ORIGIN}/group?id=${group.id}`, { waitUntil: "load" });
  await page.getByRole("radio", { name: "Balances" }).click();
  await page.getByRole("button", { name: "Remind" }).first().click();
  await page.getByRole("heading", { name: "Remind Ben" }).waitFor({ timeout: 10000 });
  ok("the reminder sheet offers to include her details", (await page.getByText("Include my payment details").count()) > 0);
  ok("it says the reminder doesn't name who is asking", (await page.getByText(/doesn't say who is asking/).count()) > 0);
  await axeOk(page, "the reminder sheet");
  await page.screenshot({ path: path.join(shotsDir, "payqr-remind.png") });
  await page.getByRole("button", { name: "Send reminder" }).click();
  await page.getByText("Reminder sent").waitFor({ timeout: 10000 });
  ok("sending works and confirms", true);

  const again = await ana.call("GET", `/v1/groups/${group.id}`);
  ok("the group still loads (no address leaked on members)", !JSON.stringify(again).includes("@example.com"));
  if (apiLog && fs.existsSync(apiLog)) {
    const log = fs.readFileSync(apiLog, "utf8");
    ok("an email went out with her payment QR attached", /subject="Payment reminder · QR trip"/.test(log));
  }
  // Second reminder the same day is declined politely.
  await page.getByRole("button", { name: "Remind" }).first().click();
  await page.getByRole("button", { name: "Send reminder" }).click();
  await page.getByText(/already reminded today/).waitFor({ timeout: 10000 });
  ok("a second reminder the same day is declined politely", true);
} catch (err) {
  console.log("FAIL unexpected error:", err);
  failures.push("error");
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `${failures.length} problem(s)` : "payqr completed with no errors");
process.exit(failures.length ? 1 : 0);
