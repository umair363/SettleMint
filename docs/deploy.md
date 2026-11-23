# Deployment

SettleMint runs entirely on free tiers. This is the setup the project uses; any equivalent
hosts work.

| Part | Host | Notes |
| --- | --- | --- |
| Database | [Neon](https://neon.tech) | Postgres. Use the pooled connection string |
| API | [Render](https://render.com) | A web service from `render.yaml` |
| Website | [Cloudflare Pages](https://pages.cloudflare.com) | Static files from `web/out` |
| Email | [Resend](https://resend.com) | Sign-in and confirmation emails |
| Phone app | [EAS](https://expo.dev/eas) | Store builds |

## 1. Database

Create a Neon project and copy the pooled connection string. It becomes `V1_DATABASE_URL`.
Migrations run automatically when the API starts.

## 2. API on Render

1. In Render choose **New → Blueprint** and select this repository. `render.yaml` describes
   the service.
2. Fill in the variables it asks for (see below).
3. Set **Branch** to the branch you deploy from and **Auto-Deploy** to *On Commit*.
4. Add `/health` as the health check path (the blueprint does this).

Required variables:

| Variable | Value |
| --- | --- |
| `V1_DATABASE_URL` | the Neon connection string |
| `AUTH_SECRET` | 32+ random characters (Render can generate one) |
| `API_URL` | the API's public address, e.g. `https://api.example.com` |
| `WEB_ORIGINS` | the website's address(es), comma separated |
| `COOKIE_DOMAIN` | the shared parent domain, e.g. `.example.com` |
| `TRUST_PROXY_HOPS` | `1` on Render, `2` if Cloudflare's proxy also sits in front |
| `RESEND_API_KEY`, `EMAIL_FROM` | email delivery |

Optional: `GEMINI_API_KEY` (receipt scanning), `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
(web notifications; generate once with `npx web-push generate-vapid-keys` and never rotate
casually, because replacing the pair drops every subscription), `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`, and `KEEP_ALIVE_URL` (the API's own `/health` address, which stops the
free instance from sleeping).

### Deploying from CI

Render's own GitHub link can be unreliable on the free plan. As a robust alternative, the CI
workflow can start a deploy itself once every check has passed:

1. In Render open the service's **Settings → Deploy Hook** and copy the URL. Treat it like a
   password: anyone with it can trigger a deploy.
2. In GitHub open **Settings → Secrets and variables → Actions** and add a repository secret
   named `RENDER_DEPLOY_HOOK` with that URL.
3. Set the service's Auto-Deploy to *Off* so it doesn't build twice.

The `deploy-api` job in `.github/workflows/ci.yml` then runs on every push to `v2` after the
checks pass, and quietly does nothing when the secret isn't set.

## 3. Website on Cloudflare Pages

Connect the repository with:

- **Build command:** `npm ci && npm run build -w web`
- **Output directory:** `web/out`
- **Variables:** `NEXT_PUBLIC_API_URL` (the API's address) and `NEXT_PUBLIC_SITE_URL` (the
  site's own address, used for canonical links and the sitemap)

Or deploy a local build directly:

```bash
cd web
NEXT_PUBLIC_API_URL=https://api.example.com \
NEXT_PUBLIC_SITE_URL=https://www.example.com \
npm run build
npx wrangler pages deploy out --project-name <your-project>
```

The build writes a `_headers` file with a strict Content-Security-Policy and the other
security headers.

## 4. One domain for both

Sign-in uses cookies, and browsers block cookies between unrelated sites. Put the website and
the API on subdomains of one domain (for example `www.example.com` and `api.example.com`) and
set `COOKIE_DOMAIN` to the parent. Addresses like `*.pages.dev` plus `*.onrender.com` cannot
keep anyone signed in.

## 5. Email

Verify your sending domain in Resend (SPF and DKIM records) and set `EMAIL_FROM` to an address
on it. A send-only API key is enough. Without a key the API prints codes to its console, which
is fine for development.

## 6. Phone app

```bash
cd mobile
eas build --platform android --profile preview
```

Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` in `eas.json` or the EAS dashboard. Phone
notifications use Expo's free push service and need no keys. Publishing to the stores needs a
Google Play developer account (one-off fee) and, for iPhone, an Apple developer account
(yearly). See [mobile/README.md](../mobile/README.md).

## Checking a deployment

- `GET /health` returns `{"ok":true}` and never touches the database.
- `GET /v1/me` returns `401` without a session, which also proves the database is reachable.
- The website's response headers include `Content-Security-Policy` and
  `Strict-Transport-Security`.
