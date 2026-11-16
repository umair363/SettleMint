# End-to-end checks

Real browser runs of the built app against a local v1 API (Playwright + Chromium).

```bash
# 1. API on :8001 that accepts the test origin (uses a local PGlite database)
# (push.mjs also needs VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY from `npx web-push generate-vapid-keys`)
cd api && PORT=8001 WEB_ORIGINS=http://localhost:4555 FAKE_RECEIPT_READER=1 AUTH_RATE_LIMIT=off npx tsx src/v1/main.ts

# 2. Build the web app against it
cd web && NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build

# 3. Run (serves web/out on :4555; screenshots go to the given folder)
node e2e/flow.mjs out ../.e2e-shots phone dark     # sign up → group → expense → settle → activity
node e2e/offline.mjs out ../.e2e-shots/offline     # open offline, add offline, reload, sync
node e2e/live.mjs out                              # two browsers: changes appear without reloading
node e2e/a11y.mjs out                              # axe-core WCAG 2.2 AA on every screen, both themes
node e2e/push.mjs out                              # notifications: subscribe, worker shows them, real delivery
node e2e/i18n.mjs out ../.e2e-shots/i18n           # Arabic right-to-left, language switching, Hindi
```

`flow.mjs` takes `phone|desktop` and `dark|light`. Both print PASS/FAIL lines or problems found.
