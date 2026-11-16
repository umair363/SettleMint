<div align="center">

<img src="web/public/icon-192.png" width="88" alt="SettleMint" />

### SettleMint

Split expenses, not friendships.

[Features](#features) · [Architecture](#architecture) · [Run it locally](#run-it-locally) · [Quality checks](#quality-checks) · [Deploy](#deploy-free-tier)

</div>

<br />

SettleMint keeps track of who paid what and who owes whom, in any currency,
fair to the cent. It's an installable web app (PWA) that works offline, built
on a shared money engine the mobile app will reuse.

## Features

- **Free, no limits.** No daily caps, ads or cooldowns.
- **Join from a link, no account needed.** Pick your name from the list and
  you're in; create an account later and keep your history.
- **Three-second add.** Amount-first keypad with quick sums ("12+8.50"),
  smart defaults, and a category guessed from what you type.
- **Every split.** Equally, exact amounts, percentages, shares, adjustments,
  item by item with tax and tip spread fairly, and several payers.
- **150+ currencies.** The exchange rate is locked when you add the expense.
- **Fewest payments.** Debt simplification that is provably minimal for
  groups of up to 16 people, or exact who-owes-whom if you prefer.
- **Get paid, not just reminded.** Add how you like to be paid (UPI, PayPal,
  Venmo, Cash App, Revolut, Monzo, Wise, IBAN, Raast, JazzCash, Easypaisa…).
  Whoever settles with you gets a one-tap link with the amount filled in;
  "Remind" shares a friendly nudge with those links. SettleMint never
  touches the money.
- **Friends and groups.** Split with one person or a whole trip; search
  everything with ⌘K. Changes from others appear live, no refresh.
- **Repeating bills.** Rent and subscriptions add themselves weekly, monthly
  or yearly, on the right day in your time zone.
- **Switch from Splitwise in a minute.** Import a group export; balances
  come over to the cent.
- **Your data is yours.** Export everything as JSON, or delete your account
  (your friends' balances stay correct).
- **Trust.** Full history on every expense, undo on deletes, restore, and
  edit conflicts caught instead of silently overwritten.
- **Offline-first.** Opens instantly from saved data; anything you add
  offline syncs when you're back.
- **Eight languages.** English, Spanish, Portuguese, French, German, Hindi,
  Urdu and Arabic, fully right-to-left for Urdu and Arabic. Numbers, money and
  dates follow your region; notifications arrive in each person's language.
- **Live and notified.** Changes appear on everyone's screen as they happen,
  and an optional notification tells you when friends add expenses or pay you.

## Architecture

```
web/         Next.js 16 static PWA · Tailwind v4 · Radix · Motion   → Cloudflare Pages
api/         Fastify 5 · Drizzle · Postgres · Better Auth           → Render (src/v1)
packages/
  shared/    money engine · API contracts (Zod) · typed API client
mobile/      Expo SDK 57 (to be rebuilt on the shared core)
app/         legacy web app, replaced by web/ at cut-over
```

- **Money** is always integer minor units with an ISO currency code. All
  splitting, conversion and balancing lives in `packages/shared` and runs
  identically on the server, the web app and (later) mobile, so a preview is
  exactly what gets saved. Property tests run thousands of random cases.
- **The API** (`api/src/v1`) has one membership gate on every group route
  (outsiders get 404), client-generated ids so offline retries never
  duplicate, version checks on edits, and structured activity history.
- **The web app** is built with `output: "export"`: plain static files, so it
  can be hosted free anywhere. A hand-written service worker precaches the
  build; the data cache lives in IndexedDB.
- **Design system**: "Liquid Mint" in `web/src/ui`, browsable at `/design`.
  One typeface (Bricolage Grotesque), WCAG AA colour in both themes, motion
  kept under ~300 ms and off for people who prefer reduced motion.

## Run it locally

```bash
npm install
npm run dev:v1    # API on :8001 (uses a local PGlite database, no Postgres needed)
npm run dev:web   # app on http://localhost:3001
```

Copy `api/.env.example` to `api/.env` and `web/.env.example` to
`web/.env.local` to change settings. Without `RESEND_API_KEY`, sign-in codes
are printed in the API's console.

## Quality checks

```bash
npm run typecheck     # shared, api, web
npm test              # money engine + API integration tests (in-memory Postgres)
npm run lint -w web
```

Browser tests (Playwright) live in `web/e2e`: the main flow, offline sync,
and an axe-core accessibility audit of every screen in both themes. See
`web/e2e/README.md`. CI runs all of the above on every push.

## Deploy (free tier)

1. **Database:** create a Neon project; copy the pooled connection string.
2. **API:** in Render, *New > Blueprint* and pick this repo (`render.yaml`).
   Fill in the variables it asks for. Migrations run on start-up.
3. **Web:** in Cloudflare Pages, connect the repo with
   build command `npm ci && npm run build -w web`, output directory
   `web/out`, and `NEXT_PUBLIC_API_URL` set to the API's URL. The build
   writes `_headers` (strict CSP and security headers) for you.
4. **Domain (required for sign-in):** put both on one domain, e.g.
   `app.settlemint.online` (Pages) and `api.settlemint.online` (Render), and
   set `COOKIE_DOMAIN=.settlemint.online`. Browsers block cookies between
   unrelated sites, so `*.pages.dev` + `*.onrender.com` can't keep you signed in.
5. Set `KEEP_ALIVE_URL` to the API's `/health` URL so the free instance
   doesn't sleep.
6. **Notifications (optional, free):** run `npx web-push generate-vapid-keys`
   once and set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` on the API. Keep the
   pair: replacing it disconnects every subscribed device.
7. **Receipt scanning (optional):** set `GEMINI_API_KEY` from Google AI Studio.

<br />

<div align="center">
<sub>Built by <a href="https://github.com/umair363">Umair</a></sub>
</div>
