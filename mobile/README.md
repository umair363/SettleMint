# SettleMint Mobile

React Native + Expo (SDK 57) app, sharing the backend API and data contracts
(`@settlemint/shared`) with the Next.js web app in `../app`.

## Getting started

```bash
# from the repo root
npm install
npm run dev:mobile
# or: cd mobile && npm start
```

Requires `NEXT_PUBLIC_API_URL` equivalent — set `EXPO_PUBLIC_API_URL` in a
`.env` file at `mobile/` root to point at your backend (falls back to the
production URL via `@settlemint/shared`'s `getApiUrl()` otherwise, same as
the web app).

## Structure

- `app/` — expo-router file-based routes. `(auth)` = login/signup/verify,
  `(tabs)` = the authenticated app shell (Home/Groups/Budget/Expenses).
- `src/lib/` — `session.ts` (expo-secure-store backed JWT storage),
  `AuthProvider.tsx` (auth state context), `api.ts` (fetch wrapper that
  attaches the bearer token).
- `src/theme/` — design tokens ported from `app/src/app/globals.css`
  (`tokens.ts`) + a `useTheme()` hook reading the OS color scheme.

## Notes

- **Expo SDK 57 is new** — read `AGENTS.md` before assuming APIs from an
  older SDK version. Confirmed during this scaffold: `expo-router` in this
  version has **no `<Redirect>` component export** — auth gating in
  `app/_layout.tsx` uses `router.replace()` in an effect instead.
- `babel.config.js` + `babel-plugin-module-resolver` wire up the `@/*` path
  alias for Metro — TypeScript's `tsconfig.json` `paths` alone only affects
  the type checker, not the bundler, in this SDK.
- `expo-doctor` flags a duplicate `react` version between this workspace
  (`19.2.3`, pinned by Expo's `bundledNativeModules.json` — do not change)
  and the web app (`19.2.4`). npm resolves this by nesting a local
  `mobile/node_modules/react` copy, and a real Metro bundle export
  (`npx expo export --platform android`) built cleanly against it. Revisit
  if an EAS/native build ever behaves differently from the Metro bundle.

## App icons

`assets/logo-source.png` is the original AI-generated 1254x1254 mark (mint
`#3DD68C` background, dark "S" glyph) — all other icon assets are derived
from it:

- `icon.png` / `splash-icon.png` — the full mark, resized to 1024x1024.
- `favicon.png` — resized to 48x48.
- `android-icon-background.png` — solid mint fill (matches the source bg).
- `android-icon-foreground.png` — the "S" mark isolated on a transparent
  background (keyed out by darkness/brightness threshold, not a color-key,
  since the mark and background were both solid colors), scaled to ~55% of
  the canvas to stay inside Android's adaptive-icon safe zone so circular/
  squircle icon masks don't clip it.
- `android-icon-monochrome.png` — the foreground recolored to solid white
  (alpha preserved) for Android 13+ themed icons, which the OS tints itself.

If the source mark ever changes, regenerate all derived assets from
`logo-source.png` rather than hand-editing the derived PNGs individually.
