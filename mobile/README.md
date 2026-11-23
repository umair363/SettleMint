# SettleMint for iOS and Android

The phone app: React Native with Expo SDK 57 and Expo Router. It talks to the same API as the
website and shares its money engine (`@settlemint/shared`), translations, data hooks and design
tokens (`@settlemint/client`).

## Run it

```bash
# from the repository root
npm install
cp mobile/.env.example mobile/.env     # then edit it
npm run dev:mobile
```

A phone can't reach `localhost` on your computer, so set `EXPO_PUBLIC_API_URL` in `mobile/.env`
to your computer's network address (for example `http://192.168.1.20:8001`) and start the API
with `npm run dev:v1`.

**Use a development build rather than Expo Go.** Expo Go supports only one SDK at a time and
usually lags a new release. A development build is compiled against this project's SDK:

```bash
npx eas-cli build --platform android --profile development
```

Notifications, the app lock and the share sheet need a real device.

### Browser preview

The same screens render in a browser through react-native-web, which is also what the smoke
test drives:

```bash
cd mobile
npx expo start --web
```

Add the preview's address (for example `http://localhost:8081`) to the API's `WEB_ORIGINS`.

## Structure

```
app/            Expo Router routes: the (tabs) shell, group, person, recap, sheets and sign-in
src/features/   screen pieces shared by several routes (rows, receipts, push, app lock)
src/i18n/       language selection and the translations provider
src/lib/        API client, auth, query client and offline persistence
src/theme/      colours (generated from the shared design tokens), identity colours, theme provider
src/ui/         primitives: text, buttons, fields, cards, rows, glyphs, statement
e2e/smoke.mjs   an end-to-end run of the app's web build
```

Colours come from `src/theme/palette.ts`, which is generated from
`packages/client/src/design/tokens.ts` by `npm run tokens -w web`. Edit the tokens, not the
generated file, so the website and the app stay identical.

## Test

```bash
cd mobile
npx tsc --noEmit
npx expo export --platform web --output-dir ../mobile-web
node e2e/smoke.mjs ../mobile-web
```

The smoke test signs in as a guest and runs the core journey (new group, expense, balance,
payment, rename, search, add a friend, recently deleted) and then switches to Arabic to check
right-to-left layout. It needs the API running on port 8001 with the test origin allowed; see
`web/e2e/README.md`.

## Build and release (EAS)

Build profiles live in `eas.json`.

```bash
# An installable Android build for internal testing
npx eas-cli build --platform android --profile preview

# A JavaScript-only update to builds that are already installed
npx eas-cli update --branch preview --message "what changed" --environment preview
```

Updates are tied to a native build's version (`runtimeVersion` policy `appVersion`), so a change
that needs new native code needs a new build.

## App icon

`assets/logo-source.png` is the source mark (1254×1254, mint background). Every other icon is
derived from it:

- `icon.png`, `splash-icon.png`: the full mark at 1024×1024
- `favicon.png`: 48×48
- `android-icon-background.png`: a solid mint fill
- `android-icon-foreground.png`: the mark on a transparent background, scaled to about 55% of
  the canvas so adaptive-icon masks never clip it
- `android-icon-monochrome.png`: the foreground in solid white, which Android 13+ tints for
  themed icons

If the source mark changes, regenerate the derived files from it rather than editing them by
hand.
