# SettleMint web app

The installable web app and the public landing page, built with Next.js 16 as a static export
(`output: "export"`), Tailwind v4, Radix primitives and Motion.

## Run it

```bash
# from the repository root
npm install
npm run dev:v1     # the API, in another terminal
npm run dev:web    # http://localhost:3001
```

Copy `.env.example` to `.env.local` to change the API address or the site's public address.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload (also regenerates the design tokens) |
| `npm run build` | Production build: tokens, static export, service worker and security headers |
| `npm run typecheck` | Generate route types and type-check |
| `npm run lint` | ESLint |
| `npm run tokens` | Regenerate `src/app/tokens.css` from the shared design tokens |

## Structure

```
src/app/         routes: the public site (landing, legal), sign-in, and the app under (client)
src/features/    feature code: groups, expenses, people, recap, account, shell, landing, pwa
src/ui/          design-system components (buttons, rows, sheets, money, avatars, icons)
src/i18n/        the landing page's translations and the app's language provider
src/lib/         API client, auth client, offline persistence, push
public/          icons, manifest assets and the landing page's optional WebGL script
scripts/         build steps: tokens, stripping framework JS from public pages,
                 the service worker and the security headers
e2e/             Playwright browser tests (see e2e/README.md)
```

## Design tokens

Colours, type, spacing and motion are defined in `packages/client/src/design/tokens.ts` and
generated into `src/app/tokens.css`. A test checks that every text and background pair meets
WCAG AA and that the generated file is current. Change the tokens, run `npm run tokens`, and
commit the result; never edit `tokens.css` by hand.

## Notes

- The public pages (landing, privacy, terms) ship no framework JavaScript. The build strips it
  and fails if a public page keeps a script it shouldn't.
- The service worker is written by hand in `scripts/build-sw.mjs`. It precaches the build and
  serves the app offline.
- `npm run build` also writes `out/_headers` with a strict Content-Security-Policy that allows
  only the configured API address.
