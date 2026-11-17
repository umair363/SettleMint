# Security

## Reporting a problem

Email **security@settlemint.online** with what you found and how to reproduce
it. Please don't open a public issue for security problems. We aim to reply
within three working days.

## How SettleMint protects people's data

**Accounts and sessions**
- Sign-in by emailed code, password, Google or as a guest (Better Auth).
- Password accounts must confirm their email with a code before they can sign
  in, so nobody can hold an account under someone else's address. When the real
  owner signs in by code, any password or session set up by someone else is removed.
- Passwords: 8–128 characters, stored as slow salted hashes; in production,
  passwords known from data breaches are refused (Have I Been Pwned range
  lookup: only 5 characters of a hash leave the server).
- Sessions are httpOnly, Secure, SameSite cookies on the web, and in the
  phone's keychain / keystore (SecureStore) in the app. Never in localStorage.
- Codes expire after 10 minutes and allow 5 attempts.

**Access control**
- Every group route checks membership; outsiders get "not found", never a
  hint that a group exists. Integration tests cover this for every route.
- Invite links are 144-bit random tokens and can be reset by group admins.

**Abuse limits**
- Every client is rate limited (300 requests a minute), with tighter limits on
  sign-in, receipt scans, imports, data export, account deletion, search,
  invites and push registration. Receipt scans also have a monthly quota.
- The client address is taken only from the hosting provider's proxy
  (`TRUST_PROXY_HOPS`), so a client can't fake it to dodge limits.
- Live-update streams are capped per person and end after 30 minutes.

**Input and output**
- All database access goes through Drizzle's parameterised queries (no SQL is
  built from strings). Search escapes `%` and `_`.
- Every request body, query and path is validated with Zod; bodies are size-limited.
- Errors never include stack traces or internal details.
- Web push is only ever sent to the real browser push services (no requests to
  arbitrary addresses); phone push goes to Expo's fixed endpoint.

**Browser and network**
- The web app is static files served with a strict Content-Security-Policy,
  HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a
  minimal permissions policy.
- The API allows only the configured web origins (CORS) and rejects writes that
  announce a foreign origin; API responses are `Cache-Control: no-store`.
- Session cookies and authorization headers are redacted from logs.

**Privacy**
- People can export everything about them as JSON, or delete their account.
- Receipt photos are shrunk on the device and sent to the AI provider only to
  read them; SettleMint doesn't store them.
- The Android app opts out of cloud backups of its cached data.

## Running it safely

- Set a long random `AUTH_SECRET` (Render generates one) and never reuse it.
- Keep `TRUST_PROXY_HOPS` matched to your hosting: 1 on Render, 2 if
  Cloudflare's proxy also sits in front.
- `AUTH_RATE_LIMIT=off` and `EMAIL_VERIFICATION=off` exist for local browser
  tests only; production ignores both.
- `npm audit --omit=dev` before releases. At the time of writing, the remaining
  advisories are in build tools (Metro, the Expo CLI, drizzle-kit), not in code
  that runs on the server or in the apps, plus one in expo-router's URL decoding
  that can only affect the device that opens a malformed link.
