# SettleMint API

The HTTP API: Fastify 5, Drizzle ORM, Postgres and Better Auth. Everything lives under
`src/v1`.

## Run it

```bash
# from the repository root
npm install
npm run dev:v1     # http://localhost:8001
```

With no configuration it uses an embedded database stored in `api/.data`, so Postgres isn't
needed, and prints emails (sign-in codes) to the console. Copy `.env.example` to `.env` to
change that. For a real Postgres, run `npm run db:up` and set `V1_DATABASE_URL`.

## Structure

```
src/v1/
  app.ts          builds the server: plugins, security headers, rate limits, routes
  auth.ts         Better Auth: password, email code, Google, guests
  main.ts         entry point (migrations, keep-alive, listen)
  config.ts       reads and validates environment variables
  routes/         groups, members, invites, expenses, settlements, recurring, activity,
                  me (profile, export, recently deleted), people, remind, search, import, ai, push
  services/       ledger, activity, receipts, recurring bills, push, exchange rates
  db/             Drizzle schema and SQL migrations (run automatically on start)
  live.ts         server-sent events for live updates
  test/           integration tests
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev:v1` | Run with automatic reload |
| `npm test` | All tests (money engine and API integration) |
| `npm run typecheck` | Type-check |
| `npm run build` | Compile for production, as Render does |
| `npm run v1:db:generate` | Generate a SQL migration after changing the schema |

## Testing

Tests start the real server against an in-memory Postgres (PGlite) and make HTTP requests, so
routes, validation, authentication and migrations are exercised together. Every group route is
checked to refuse people who aren't members.

## Conventions

- Validate every request body, query and path with Zod schemas from `@settlemint/shared`.
- Group routes go through the membership gate; outsiders get `404`.
- Writes accept a client-generated id so a retry never creates a duplicate; edits carry a
  version and return `409` on conflict.
- Deletes are soft (`deletedAt`) and recorded as activity events.
- Errors never include stack traces or internal details.

See [SECURITY.md](../SECURITY.md) for the full list of protections.
