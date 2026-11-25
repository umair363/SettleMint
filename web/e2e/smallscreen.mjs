// Small phones (iPhone SE: 375 x 667) in a real browser: nothing the person needs is cut off,
// and scrolling a list inside a sheet never closes the sheet.
// Usage: node e2e/smallscreen.mjs <outDir> [apiUrl] [screenshotsDir]   (needs the v1 API, see README)
//   1. Add expense: the keypad and the "Add expense" button are all on screen, with room to spare.
//   2. The currency picker: it doesn't pop the keyboard up on its own, and dragging the list down
//      leaves the sheet open; only the handle (or Close) dismisses it.
//   3. The same on the biggest phone screen, so shrinking for small ones didn't break large ones.
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

/** Is this element fully inside the screen and actually the thing under its own centre (not clipped or covered)? */
async function reachable(locator, viewport) {
  const box = await locator.boundingBox();
  if (!box) return { yes: false, why: "not on the page" };
  const inside = box.y >= 0 && box.y + box.height <= viewport.height && box.x >= 0 && box.x + box.width <= viewport.width;
  const { top, hit } = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    const name = at ? `${at.tagName.toLowerCase()}.${String(at.className).slice(0, 60)} "${(at.textContent ?? "").slice(0, 30)}"` : "nothing";
    return { top: Boolean(at && (at === el || el.contains(at))), hit: name };
  });
  return { yes: inside && top, why: `y ${Math.round(box.y)}–${Math.round(box.y + box.height)} of ${viewport.height}${top ? "" : `, covered by ${hit}`}` };
}

async function openApp(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-US" });
  const call = async (method, url, data) => {
    const res = await ctx.request.fetch(`${API}${url}`, { method, data, headers: { origin: ORIGIN } });
    if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  };
  await call("POST", "/v1/auth/sign-up/email", { name: "Ana", email: `ana-${Date.now()}-${viewport.height}@example.com`, password: "correct-horse-battery" });
  await call("PATCH", "/v1/me", { defaultCurrency: "USD" });
  await call("POST", "/v1/groups", { name: "Lisbon trip", currency: "USD", type: "trip", people: [{ displayName: "Ben" }] });
  const page = await ctx.newPage();
  await page.goto(`${ORIGIN}/home`, { waitUntil: "load" });
  return { ctx, page };
}

async function check(viewport, label) {
  const { ctx, page } = await openApp(viewport);
  try {
    await page.getByRole("button", { name: "Add expense" }).last().click();
    const sheet = page.getByRole("dialog");
    await sheet.waitFor({ timeout: 15000 });
    const add = sheet.getByRole("button", { name: "Add expense" });
    await add.waitFor({ timeout: 15000 });
    await page.waitForTimeout(700); // let the sheet finish sliding in
    await page.screenshot({ path: path.join(shotsDir, `small-add-${label}.png`) });

    // Disabled at 0, so it ignores pointer hits: check it sits inside the screen and inside the sheet.
    const addBox = await add.boundingBox();
    const sheetBox = await sheet.boundingBox();
    ok(
      `${label}: the Add expense button is on screen`,
      Boolean(addBox && sheetBox) &&
        addBox.y >= 0 &&
        addBox.y + addBox.height <= viewport.height &&
        addBox.y + addBox.height <= sheetBox.y + sheetBox.height + 1,
      `button y ${Math.round(addBox?.y ?? -1)}–${Math.round((addBox?.y ?? 0) + (addBox?.height ?? 0))}, screen ${viewport.height}`,
    );
    for (const key of ["1", "5", "9", "0"]) {
      const k = await reachable(sheet.getByRole("button", { name: key, exact: true }), viewport);
      ok(`${label}: keypad key ${key} is on screen`, k.yes, k.why);
    }
    const chip = await reachable(sheet.getByRole("button", { name: /^Currency/ }), viewport);
    ok(`${label}: the currency chip is on screen`, chip.yes, chip.why);

    // Typing an amount still works and the button follows it.
    await sheet.getByRole("button", { name: "4", exact: true }).click();
    await sheet.getByRole("button", { name: "2", exact: true }).click();
    await sheet.getByRole("button", { name: /^Add \$42/ }).waitFor({ timeout: 5000 });
    ok(`${label}: typing an amount updates the button`, true);

    // The currency picker, a sheet on top of the form.
    await sheet.getByRole("button", { name: /^Currency/ }).click();
    const picker = page.getByRole("dialog", { name: "Currency" });
    await picker.waitFor({ timeout: 10000 });
    await page.waitForTimeout(700);
    const focused = await page.evaluate(() => document.activeElement?.tagName === "INPUT");
    ok(`${label}: the picker doesn't open the keyboard by itself`, !focused);
    await page.screenshot({ path: path.join(shotsDir, `small-currency-${label}.png`) });

    // The keyboard: it can't be raised in a desktop browser, but zooming the page in shrinks the
    // visible area the same way, so the sheet must squeeze into what's visible, not hide below it.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await page.waitForTimeout(800);
    const fit = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"][aria-labelledby]:last-of-type') ?? document.querySelectorAll('[role="dialog"]')[1];
      const vv = window.visualViewport;
      const r = el.getBoundingClientRect();
      // Layout position of the visible area (getBoundingClientRect is in layout coordinates).
      return { top: r.top, bottom: r.bottom, visTop: vv.offsetTop, visBottom: vv.offsetTop + vv.height };
    });
    ok(
      `${label}: with the keyboard up, the sheet sits inside the visible area`,
      fit.bottom <= fit.visBottom + 2 && fit.top >= fit.visTop - 2,
      `sheet ${Math.round(fit.top)}–${Math.round(fit.bottom)}, visible ${Math.round(fit.visTop)}–${Math.round(fit.visBottom)}`,
    );
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    await page.waitForTimeout(600);

    // Drag the list down from its middle, as a thumb does when scrolling back up.
    const box = await picker.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.55;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(x, y + i * 24, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(1500); // a closing sheet takes a moment to leave
    const stillOpen = async () => (await page.getByRole("dialog", { name: "Currency" }).count()) === 1;
    ok(`${label}: dragging the list down doesn't close the picker`, await stillOpen());

    // Scroll the list down and back up (wheel), still open and the list moved.
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(200);
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(600);
    ok(`${label}: scrolling the list leaves the picker open`, await stillOpen());

    // The search field is there to tap, and typing filters the list.
    await picker.getByRole("textbox").tap();
    await picker.getByRole("textbox").fill("pkr");
    await picker.getByRole("button", { name: /Pakistani Rupee/ }).first().waitFor({ timeout: 5000 });
    ok(`${label}: searching finds a currency`, true);
    await picker.getByRole("button", { name: /Pakistani Rupee/ }).first().tap();
    await picker.waitFor({ state: "hidden", timeout: 5000 });
    await sheet.getByRole("button", { name: /^Currency.*PKR/ }).waitFor({ timeout: 5000 });
    ok(`${label}: picking a currency returns to the form with it chosen`, true);

    // The handle still dismisses a sheet by dragging it down.
    const form = await sheet.boundingBox();
    const hx = form.x + form.width / 2;
    const hy = form.y + 14;
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    for (let i = 1; i <= 14; i++) await page.mouse.move(hx, hy + i * 30, { steps: 2 });
    await page.mouse.up();
    await sheet.waitFor({ state: "hidden", timeout: 5000 }).then(
      () => ok(`${label}: dragging the handle down closes the sheet`, true),
      () => ok(`${label}: dragging the handle down closes the sheet`, false),
    );
  } finally {
    await ctx.close();
  }
}

/** The Home Screen icon: green square on a light phone, green S on near-black on a dark one. */
async function checkIcon() {
  for (const [scheme, file] of [["light", "/apple-touch-icon.png"], ["dark", "/apple-touch-icon-dark.png"]]) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/sign-in`, { waitUntil: "load" });
    await page.waitForFunction((f) => document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") === f, file, { timeout: 10000 }).then(
      () => ok(`a ${scheme} phone gets the ${scheme} Home Screen icon`, true),
      async () => ok(`a ${scheme} phone gets the ${scheme} Home Screen icon`, false, await page.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ?? "no link")),
    );
    const res = await ctx.request.get(`${ORIGIN}${file}`);
    ok(`the ${scheme} icon file is served as a PNG`, res.ok() && (res.headers()["content-type"] ?? "").includes("png"));
    await ctx.close();
  }
}

try {
  await check({ width: 375, height: 667 }, "iPhone SE");
  await check({ width: 430, height: 932 }, "iPhone Pro Max");
  await checkIcon();
} catch (err) {
  console.log("FAIL unexpected error:", err);
  failures.push("error");
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `${failures.length} problem(s)` : "small screens completed with no errors");
process.exit(failures.length ? 1 : 0);
