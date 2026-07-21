<div align="center">

<img src="app/public/icon-192.png" width="88" alt="SettleMint" />

### SettleMint

Split expenses, not friendships.

[**settlemint.online**](https://settlemint.online) &nbsp;·&nbsp; [Features](#features) &nbsp;·&nbsp; [Architecture](#architecture) &nbsp;·&nbsp; [Local setup](#local-setup)

</div>

<br />

Shared expenses are a social problem disguised as a math problem. SettleMint
handles the math — who paid, who owes what, and the fewest payments needed to
square up — so the social part stays easy.

It runs as an installable web app, a native Android/iOS app, and a personal
budget tracker, all sharing one backend.

<br />

## Features

**Split anything, fairly.** Equal, exact amounts, percentages, or shares.
All money math runs in integer cents and distributes leftover pennies
round-robin, so a $10 bill split three ways lands on $3.34 / $3.33 / $3.33 —
never $9.99.

**Settle up in the fewest payments.** Rather than everyone paying everyone,
the settlement engine nets debts across the group and computes the minimum
set of transactions to clear the ledger.

**Track personal spending too.** Budget goals per category, recurring
transactions, and analytics that tell you something useful — *"Food is up
20% vs last month"*, *"you're on pace to exceed Groceries by the 24th"* —
instead of just another pie chart.

**Log expenses by talking.** MintBot parses plain English (*"dinner 40 split
3 ways"*) into a structured expense. Or photograph a receipt and let the
scanner pull out the merchant, total, and line items.

**Works offline.** Cached data stays readable without a connection, and
expenses logged offline queue up and sync when you're back.

<br />

## Screenshots

> _Drop screenshots here — dashboard, budget analytics, and the add-expense
> sheet, in both light and dark, would carry this section._

<br />

## Architecture

An npm workspaces monorepo — three deployables, one shared contract package.

```
app/         Next.js 16 · CSS Modules · React Query        → Vercel
api/         Fastify 5 · Drizzle · Postgres                → Render
mobile/      React Native · Expo SDK 57 · expo-router      → EAS
packages/
  shared/    Zod schemas · categories · currency · splits
```

`packages/shared` is the load-bearing piece. Every validation schema,
category definition, and currency rule lives there and is imported by all
three clients — so the web app, the mobile app, and the API physically
cannot disagree about what a valid expense looks like.

**Design system.** Mint green (`#3DD68C`) against warm slate, carrying
30–40% of surface area. Fully themed for light and dark. Type is Outfit for
UI, JetBrains Mono for figures. No Tailwind, no component library —
CSS Modules and hand-built primitives throughout.

**Mobile-feel on the web.** Bottom sheets with real drag physics, pull-to-
refresh with resistance curves, spring-eased page transitions, and haptics
where the platform allows. Gesture math, not media queries.

<br />

## Local setup

```bash
npm install          # once, from the repo root — links all workspaces

npm run dev:app      # web        → localhost:3000
npm run dev:api      # api        → localhost:8000
npm run dev:mobile   # expo dev server
```

Both clients point at the production API by default. To target a local one:

```bash
# app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# mobile/.env  — a phone can't reach your laptop's "localhost"
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

The API needs `api/.env`:

| | |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `RESEND_API_KEY` | transactional email |
| `EMAIL_FROM` | `"SettleMint <noreply@…>"` |
| `GEMINI_API_KEY` | MintBot + receipt scanning |
| `FRONTEND_URL` | required in production — pins CORS |
| `REDIS_URL` | optional cache |

```bash
npm run test:api     # split math, settlement netting, recurrence dates
```

<br />

## Notes for contributors

A few decisions that look odd until you know why:

**The web build runs `next build --webpack`.** `next-pwa` is a Webpack
plugin. Next 16 defaults to Turbopack, under which it emits nothing and
warns about nothing — the service worker silently vanishes. Don't drop the
flag.

**Recurring transactions generate on read, not on a schedule.** Render's
free tier sleeps, so a cron job can't be trusted to fire. Missed
occurrences are backfilled the next time a user fetches their transactions.

**Migrations that touch live data are written by hand.** The workflow is
`drizzle-kit push`, so there's no continuous migration history — and
`drizzle-kit generate` will happily emit a full `CREATE TABLE` schema if it
can't find one. Read the SQL before running it.

**Expo Go can't open the mobile app.** It targets SDK 57; Expo Go currently
ships SDK 54, and only ever supports one at a time. Use an EAS build —
see [`mobile/README.md`](mobile/README.md).

<br />

<div align="center">
<sub>Built by <a href="https://github.com/umair363">Umair</a></sub>
</div>
