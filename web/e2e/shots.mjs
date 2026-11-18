// Screenshot matrix for design reviews: key screens at phone, tablet and
// desktop widths, light and dark, English and Arabic, with realistic data.
// Usage: node e2e/shots.mjs <outDir> [webOrigin] [apiUrl]
//   e.g. node e2e/shots.mjs ../.e2e-shots/baseline http://localhost:3001 http://localhost:8001
// Options (env): ONLY=home,group  WIDTHS=390,1440  THEMES=light  LANGS=en
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { seed } from "./seed.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [outDir, ORIGIN = "http://localhost:3001", API = "http://localhost:8001"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: node e2e/shots.mjs <outDir> [webOrigin] [apiUrl]");
fs.mkdirSync(outDir, { recursive: true });

const list = (v, d) => (v ? v.split(",") : d);
const WIDTHS = list(process.env.WIDTHS, ["390", "768", "1440"]).map(Number);
const THEMES = list(process.env.THEMES, ["light", "dark"]);
const LANGS = list(process.env.LANGS, ["en", "ar"]);
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const height = (w) => (w <= 390 ? 844 : w <= 768 ? 1024 : 900);

const browser = await chromium.launch();
const seedCtx = await browser.newContext();
const ids = await seed(seedCtx, API, ORIGIN);
const storage = await seedCtx.storageState();
await seedCtx.close();

/** Screens: name, path, and an optional step to open a sheet. */
const screens = [
  { name: "landing", path: "/", public: true },
  { name: "sign-in", path: "/sign-in", public: true },
  { name: "home", path: "/home" },
  { name: "groups", path: "/groups" },
  { name: "group", path: `/group?id=${ids.tripId}` },
  {
    name: "group-balances",
    path: `/group?id=${ids.tripId}`,
    step: async (page) => page.getByRole("radio", { name: /Balances|الأرصدة/ }).click(),
  },
  { name: "activity", path: "/activity" },
  { name: "account", path: "/account" },
  {
    name: "add-expense",
    path: `/group?id=${ids.tripId}`,
    step: async (page) => page.getByRole("button", { name: /Add expense|إضافة مصروف/ }).last().click(),
  },
  { name: "design", path: "/design" },
].filter((s) => !ONLY || ONLY.has(s.name));

let count = 0;
for (const lang of LANGS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: height(width) },
        deviceScaleFactor: width <= 390 ? 2 : 1,
        isMobile: width <= 390,
        hasTouch: width <= 390,
        storageState: storage,
        colorScheme: theme,
        locale: lang === "ar" ? "ar" : "en-US",
      });
      await ctx.addInitScript(
        ([t, l]) => {
          localStorage.setItem("sm-theme", t);
          localStorage.setItem("sm-lang", l);
        },
        [theme, lang],
      );
      const page = await ctx.newPage();
      for (const s of screens) {
        const url = s.public && lang === "ar" && s.name === "landing" ? `${ORIGIN}/ar` : `${ORIGIN}${s.path}`;
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
          // Let data load and entrance motion settle before capturing.
          await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], [aria-busy=""]'), null, { timeout: 30_000 }).catch(() => {});
          await page.waitForTimeout(1200);
          if (s.step) {
            await s.step(page);
            await page.waitForTimeout(800);
          }
          const file = path.join(outDir, `${s.name}.${width}.${theme}.${lang}.png`);
          await page.screenshot({ path: file, fullPage: !s.step });
          count++;
        } catch (err) {
          console.log(`skip ${s.name} ${width} ${theme} ${lang}: ${err.message.split("\n")[0]}`);
        }
      }
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`${count} screenshots in ${outDir}`);
