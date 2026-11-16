// Notifications: switch them on in Account, then deliver a push to the real
// service worker (through the DevTools protocol, so nothing is sent to a push
// service) and check the notification it shows.
// Usage: node e2e/push.mjs <outDir>   (needs the v1 API on :8001 with VAPID keys, see README)
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [outDir] = process.argv.slice(2);
const API = "http://localhost:8001";
const ORIGIN = "http://localhost:4555";

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

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const candidates = [path.join(outDir, url), path.join(outDir, url + ".html"), path.join(outDir, url, "index.html")];
  const file = candidates.find((f) => fs.existsSync(f) && fs.statSync(f).isFile()) ?? path.join(outDir, "404.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(4555, r));

// A real profile: Chrome turns the Push API off in incognito-like contexts, and
// the stripped-down headless shell always denies notifications.
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "settlemint-push-"));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  permissions: ["notifications"],
});
let failed = false;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
  if (!ok) failed = true;
};

/** Poll a value from the page until `ok(value)` or the timeout; returns the last value. */
async function until(page, fn, ok, timeout = 15000) {
  const end = Date.now() + timeout;
  let value;
  while (Date.now() < end) {
    value = await page.evaluate(fn).catch(() => undefined);
    if (ok(value)) break;
    await page.waitForTimeout(250);
  }
  return value;
}
const subscription = () => navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(Boolean);

try {
  const api = (method, url, data) => call(ctx, method, url, data);
  await api("POST", "/v1/auth/sign-up/email", { name: "Ben", email: `ben-${Date.now()}@example.com`, password: "correct-horse-battery" });
  await api("PATCH", "/v1/me", { defaultCurrency: "USD" });

  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const cdp = await ctx.newCDPSession(page);
  const registrations = new Map();
  cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations: regs }) => {
    for (const r of regs) if (!r.isDeleted) registrations.set(r.scopeURL, r.registrationId);
  });
  await cdp.send("ServiceWorker.enable");

  await page.goto(`${ORIGIN}/account`, { waitUntil: "load" });
  const toggle = page.getByRole("switch", { name: "On this device" });
  await toggle.waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const available = await toggle.isEnabled();
  check(available, "notifications switch is available");
  if (!available) {
    const card = page.locator("section", { has: toggle });
    throw new Error(`card says: ${(await card.innerText()).replace(/\s+/g, " ")}`);
  }

  // Subscribing talks to the browser's push service (Google's for Chromium).
  // Without internet access that fails with a message; the worker is still checked.
  await toggle.click();
  const outcome = await until(
    page,
    () =>
      document.querySelector('[role="switch"]')?.getAttribute("aria-checked") === "true"
        ? "on"
        : [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.textContent).join(" ") || null,
    Boolean,
    45000, // first registration with the push service can take a while
  );
  const subscribed = outcome === "on";
  if (subscribed) {
    check(await until(page, subscription, Boolean), "switch on and this device subscribed");

    // The whole real path: Ana adds an expense -> API signs and sends a push
    // -> Google's push service -> this browser's worker shows it.
    const ana = await chromium.launch().then((b) => b.newContext());
    const anaApi = (method, url, data) => call(ana, method, url, data);
    await anaApi("POST", "/v1/auth/sign-up/email", { name: "Ana", email: `ana-${Date.now()}@example.com`, password: "correct-horse-battery" });
    const group = await anaApi("POST", "/v1/groups", { name: "Push test", currency: "USD", people: [{ displayName: "Ben" }] });
    const benSpot = group.members.find((m) => m.displayName === "Ben").id;
    const { token } = await anaApi("POST", `/v1/groups/${group.id}/invite`);
    await api("POST", `/v1/invites/${token}/join`, { memberId: benSpot });
    await anaApi("POST", `/v1/groups/${group.id}/expenses`, {
      description: "Gelato",
      amount: 900,
      currency: "USD",
      date: new Date().toISOString().slice(0, 10),
      payers: [{ memberId: group.myMemberId, amount: 900 }],
      split: { method: "equal", memberIds: [group.myMemberId, benSpot] },
    });
    const delivered = await until(
      page,
      () => navigator.serviceWorker.ready.then((r) => r.getNotifications()).then((l) => l.map((n) => n.body).join("\n")),
      (v) => typeof v === "string" && v.includes("Gelato"),
      30000,
    );
    // Depends on Google's service, so a miss is a warning, not a failure.
    if (delivered === "Ana added “Gelato” · $9.00") console.log(`PASS real push arrives through the push service`);
    else console.log(`WARN real push didn't arrive within 30 s (${delivered || "none"}); check the API log for "notifications sent"`);
    await page.evaluate(() => navigator.serviceWorker.ready.then((r) => r.getNotifications()).then((l) => l.forEach((n) => n.close())));
    await ana.browser()?.close();
  } else if (/Couldn't switch notifications on/.test(outcome ?? "")) {
    console.log("SKIP subscribing (push service unreachable from this machine)");
  } else {
    console.log(`WARN switching on didn't finish (${outcome ?? "push service slow?"})`);
  }

  const registrationId = registrations.get(`${ORIGIN}/`);
  check(Boolean(registrationId), "service worker registered");
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin: ORIGIN,
    registrationId,
    data: JSON.stringify({ title: "🏖️ Lisbon trip", body: "Ana added “Pastéis” · $12.50", url: `${ORIGIN}/group?id=x`, tag: "g1" }),
  });
  const shown = await until(
    page,
    () => navigator.serviceWorker.ready.then((r) => r.getNotifications()).then((l) => l.map((n) => `${n.title} | ${n.body}`).join("\n")),
    Boolean,
    10000,
  );
  check(shown === "🏖️ Lisbon trip | Ana added “Pastéis” · $12.50", `worker shows the notification (${shown || "none"})`);

  if (subscribed) {
    await toggle.click();
    check((await until(page, subscription, (v) => v === false, 10000)) === false, "switching off unsubscribes this device");
  }
} catch (err) {
  check(false, `error: ${err.message.split("\n")[0]}`);
} finally {
  await ctx.close();
  fs.rmSync(profile, { recursive: true, force: true });
  server.close();
  process.exit(failed ? 1 : 0);
}
