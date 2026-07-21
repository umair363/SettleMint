# SettleMint

Split shared expenses with friends, roommates, or travel groups — track who
paid, who owes what, and settle up. Includes a personal budget tracker,
AI-assisted expense entry, and native apps for web and mobile.

**Live:** [settlemint.online](https://settlemint.online)

## Monorepo layout

This is an npm workspaces monorepo with three deployables and one shared package:

```
app/       Next.js 16 web app (Vercel)
api/       Fastify API + Postgres/Drizzle (Render)
mobile/    React Native + Expo app (iOS/Android)
packages/
  shared/  Zod schemas, categories, currency table, split-type logic —
           the single source of truth all three clients import from
```

Run `npm install` once at the repo root — it installs and links all four
workspaces together. Don't run `npm install` inside an individual workspace
folder; it'll fight the root lockfile.

## Running it locally

```bash
npm install                # from the repo root, once

npm run dev:app            # Next.js web app     → localhost:3000
npm run dev:api            # Fastify API         → localhost:8000
npm run dev:mobile         # Expo dev server      → scan QR with Expo Go
```

The web and mobile apps both default to the production API
(`settlemint.onrender.com`) unless you point them at something else:

```bash
# app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# mobile/.env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000   # not localhost — the phone is a separate device
```

The API needs its own `api/.env` — see the environment variable table below
for what it expects, at minimum a Postgres connection string.

## What's actually in each piece

**`api/`** — Fastify, Drizzle ORM, Postgres (Neon). JWT auth with email OTP
verification. Every mutable route runs through Zod validation
(`src/middleware/validate.middleware.ts`) before touching the database.
Split-calculation and settlement-netting logic lives in
`src/utils/splitCalculator.ts` / `settlementEngine.ts` — both have unit
tests (`npm test`, via Vitest) since they're the part of this app that
handles money math and is least forgiving of bugs.

Recurring personal-budget transactions are generated **on read**, not by a
background cron — Render's free tier sleeps when idle, so a scheduled job
can't be relied on to fire. `src/utils/recurrence.ts` backfills any missed
occurrences the next time a user's transactions are fetched.

Rate limiting is two-tier: 100 req/min globally, 10 req/min on the AI
endpoints specifically, since those proxy to the Gemini API and are the
most expensive/abusable routes in the app.

**`app/`** — Next.js App Router, CSS Modules (no Tailwind, no component
library — everything here is hand-built). Dark and light themes via a
`[data-theme]` attribute on `<html>`, toggled in Settings → Appearance and
persisted to `localStorage`. The mobile-web layer (bottom sheets, pull-to-
refresh, page transitions) uses real touch-gesture math, not just CSS
media queries — see `src/components/BottomSheet.tsx` and
`PullToRefresh.tsx` if you're curious how.

**`mobile/`** — Expo (managed workflow), file-based routing via
expo-router. Shares design tokens with the web app (`src/theme/tokens.ts`
is a hand-port of `app/src/app/globals.css`'s CSS variables) and shares all
data contracts via `@settlemint/shared`, so the two clients can't drift out
of sync on what a valid split, category, or currency looks like. JWT is
stored in the platform keychain (`expo-secure-store`), not plain
AsyncStorage. See `mobile/README.md` for Expo-specific setup notes.

**`packages/shared/`** — Zod schemas for every API payload, the canonical
category/wallet/currency lists, and the split-type enum. If you're adding a
new expense category or changing what a valid transaction looks like, this
is the only place that needs to change — both frontends and the backend
import from here.

## Environment variables (`api/`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | `openssl rand -hex 32` — never commit a placeholder |
| `RESEND_API_KEY` | yes | transactional email (OTP, welcome, alerts) |
| `EMAIL_FROM` | yes | e.g. `"SettleMint <noreply@yourdomain.com>"` |
| `GEMINI_API_KEY` | for AI features | powers MintBot (NLP expense entry) and the receipt scanner — both silently no-op without it |
| `REDIS_URL` | optional | caching layer; app runs without it |
| `FRONTEND_URL` | production | locks CORS to your actual frontend origin — without it, CORS reflects *any* origin |

## Database migrations

The dev workflow is `drizzle-kit push` (schema-diff apply, no tracked
migration history) — that's why `api/src/db/migrations/` has gaps in its
sequence. When a migration needs hand-review (enum conversions, column
type changes on a live table), it's written by hand rather than trusting
`drizzle-kit generate`, which will happily try to regenerate your entire
schema as fresh `CREATE TABLE`s if it can't find prior migration history.
Read the SQL file before running it against a database with real data.

## Testing

```bash
npm run test:api     # Vitest — split math, settlement netting, recurrence dates
```

The frontend has no test suite yet. If you're adding logic to the web or
mobile apps that isn't purely presentational, consider whether it belongs
in `packages/shared` instead, where it can be tested once and used
everywhere.
