# Architecture

SettleMint is an npm-workspaces monorepo: a static web app, a phone app, an API, and two
packages the apps share.

```
web/            static PWA (Next.js export)           depends on  shared, client
mobile/         iOS and Android app (Expo)            depends on  shared, client
api/            HTTP API (Fastify)                    depends on  shared
packages/
  shared/       money engine, API contracts, client   no app dependencies
  client/       translations, data hooks, tokens      depends on  shared
```

## The money engine (`packages/shared`)

Everything that touches an amount lives here, so the server, the website and the phone app
compute the same numbers.

- Amounts are integers in a currency's smallest unit (cents, pence, yen), paired with an ISO
  4217 code. There are no floating-point amounts anywhere.
- **Splits** turn a total and a method (equal, exact, percent, shares, adjustment, itemized)
  into what each person owes. Remainders are handed out deterministically so shares always add
  up to the total.
- **Balances** fold a group's expenses and payments into one net figure per member.
- **Debt simplification** suggests the fewest payments that settle a group. It is exact for
  groups of up to 16 people and falls back to a greedy match above that.
- **Saved QR codes** are stored as the text inside them and redrawn on demand (`qr.ts`), so the
  picture is crisp at any size and scans exactly like the original. The same module draws the
  rounded version for the apps and the plain PNG for emails.
- **Contracts** are Zod schemas for every request and response. The typed API client is built
  from them, and the API validates with the same schemas.

Property-based tests generate thousands of random expenses and assert the invariants
(shares sum to the total, balances sum to zero, simplification settles everyone).

## The API (`api/src/v1`)

Fastify 5 with Drizzle ORM on Postgres (Neon in production, an embedded PGlite database in
development and tests).

- **Auth** is Better Auth: email and password with email confirmation, a one-time code sent by
  email, Google, and guest sessions. Sessions are httpOnly cookies on the web and stored in the
  system keychain on the phone.
- **Access control:** one membership check guards every group route. Someone outside a group
  gets `404`, never a hint that the group exists.
- **Writes** carry a client-generated id, so a retry after a dropped connection can never
  create a duplicate. Edits carry a version and conflicting edits return `409` with the current
  copy instead of overwriting it.
- **Soft deletes.** Expenses, payments and groups are marked deleted, never erased, which is
  what makes undo and "Recently deleted" possible. Every change also writes a structured
  activity event, rendered into sentences on the client in the viewer's language.
- **Routes:** groups, members, invites, expenses, settlements, recurring bills, activity, the
  profile (including export, deletion and recently deleted), people (balances across groups),
  search, Splitwise import, receipt scanning and push registration.
- **Live updates** use server-sent events. Receipt scanning calls Google Gemini and is
  rate-limited per person per month.

## The web app (`web`)

Next.js 16 with `output: "export"`: plain static files that can be hosted anywhere for free.

- The public landing and legal pages ship no framework JavaScript. The app itself is
  client-rendered and talks to the API with React Query.
- A hand-written service worker precaches the build, and the query cache is persisted to
  IndexedDB, so the app opens instantly and works offline. Writes made offline are queued and
  sent when the connection returns.
- Pages are built per language at build time; the app's language follows the person's choice.
- `build-headers` writes a strict Content-Security-Policy and the other security headers for
  the host.

## The phone app (`mobile`)

Expo SDK 57 with Expo Router. It talks to the same API, persists its cache to AsyncStorage and
keeps sessions in SecureStore. The same screens render to the web through react-native-web,
which is what the CI smoke test drives.

## Shared client code (`packages/client`)

Everything above the API that the website and the phone app have in common:

- **Translations.** Eight catalogs with the same keys. Tests check that every placeholder, tag
  and plural form is present in every language.
- **Data hooks** (React Query) for groups, expenses, people, activity and the rest.
- **Text helpers** that turn activity events and balances into sentences.
- **Design tokens.** Colours are defined in OKLCH with light and dark roles, checked for WCAG
  AA contrast in a test, and generated into the website's CSS variables and the phone app's
  palette. Identity colours for people and groups, type, spacing and motion live here too.

## Design principles

- Where you stand comes first: balances are the headline of every screen that has one.
- Calm about money: owed is teal and owe is ember, never alarm red. Colour is never the only
  signal; amounts carry words or signs.
- One accent (mint), used for the one filled action on a screen.
- Native feel on a phone: sheets that drag, screens that slide, pull to refresh, no
  rubber-banding of the page.
- Respect settings: reduced motion and reduced transparency fall back to plain, opaque
  surfaces.
