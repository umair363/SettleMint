# Contributing

Thanks for helping with SettleMint. This guide covers how to set the project up, what a good
change looks like, and what the checks expect.

## Set up

You need Node 24 and npm. No database is needed for development.

```bash
npm install
npm run dev:v1     # API on http://localhost:8001
npm run dev:web    # web app on http://localhost:3001
```

See the [README](README.md#getting-started) for the phone app and the
[architecture notes](docs/architecture.md) for how the pieces fit together.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run typecheck
npm test
npm run lint
```

For changes to screens, also run the browser tests described in
[web/e2e/README.md](web/e2e/README.md) and look at the result at phone width, in both themes,
and in Arabic (right-to-left).

## What a good change looks like

- **Small and focused.** One idea per pull request, with a description of what changed and why.
- **Tested.** Logic that touches money, splitting or access control needs a test. A bug fix
  starts with a test that fails.
- **Money is integers.** Amounts are always integer minor units with a currency code. Do all
  arithmetic with the helpers in `packages/shared`; never use floating point for money.
- **Every language.** User-facing text lives in `packages/client/src/i18n/messages` and must
  exist in all eight languages. The translation tests fail if a key, placeholder or plural form
  is missing.
- **Accessible.** Controls have names, touch targets are at least 44 px, colour is never the
  only signal, and reduced motion is respected. The axe audit must stay clean.
- **Shared design tokens.** Change colours, type and spacing in
  `packages/client/src/design/tokens.ts`, then run `npm run tokens -w web`. Never edit the
  generated `tokens.css` or `palette.ts` by hand.
- **No secrets.** Never commit `.env` files or keys. Use the `.env.example` files to document a
  new setting.

## Commit messages

Use a short, imperative summary, optionally prefixed with a type and scope:

```
feat(web): show one balance per person
fix(api): reject a settlement between the same two members
docs: explain the deployment variables
```

Explain the reason for the change in the body when it isn't obvious.

## Reporting a problem

- Bugs and ideas: open an issue using the templates.
- Security problems: do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).
