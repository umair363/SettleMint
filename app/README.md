# SettleMint web app (PWA)

Next.js 16 App Router app. It talks to the Fastify API in `../api` and uses `@settlemint/shared` for categories, currencies and validation.

Next.js 16 differs from older versions. Before changing framework-level code, read the guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Run locally

From the repo root:

```bash
npm install
npm run db:up          # Postgres (+ services the current API uses), needs Docker
cp api/.env.example api/.env
cp app/.env.example app/.env.local
npm run dev:api        # http://localhost:8000
npm run dev:app        # http://localhost:3000
```

## Checks

```bash
npm run typecheck -w app
npm run lint -w app
```

The service worker is generated only in production builds (`npm run build -w app`).
