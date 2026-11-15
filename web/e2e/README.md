# End-to-end checks

Real browser runs of the built app against a local v1 API (Playwright + Chromium).

```bash
# 1. API on :8001 that accepts the test origin (uses a local PGlite database)
cd api && PORT=8001 WEB_ORIGINS=http://localhost:4555 npx tsx src/v1/main.ts

# 2. Build the web app against it
cd web && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build

# 3. Run (serves web/out on :4555; screenshots go to the given folder)
node e2e/flow.mjs out ../.e2e-shots phone dark     # sign up → group → expense → settle → activity
node e2e/offline.mjs out ../.e2e-shots/offline     # open offline, add offline, reload, sync
```

`flow.mjs` takes `phone|desktop` and `dark|light`. Both print PASS/FAIL lines or problems found.
