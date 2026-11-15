export interface AppConfig {
  env: "development" | "production" | "test";
  /** Public URL of this API, e.g. https://api.settlemint.online */
  apiUrl: string;
  /** Web app origins allowed to call the API with cookies. */
  webOrigins: string[];
  /** Base URL used in links inside emails. */
  webUrl: string;
  authSecret: string;
  /** Share the session cookie across subdomains (e.g. ".settlemint.online"). */
  cookieDomain?: string;
  google?: { clientId: string; clientSecret: string };
  apple?: { clientId: string; clientSecret: string; appBundleIdentifier?: string };
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mode = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  const webOrigins = (env.WEB_ORIGINS ?? env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const secret = env.AUTH_SECRET ?? (mode === "production" ? undefined : "dev-only-secret-change-me-0123456789");
  if (secret && secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");

  return {
    env: mode,
    apiUrl: env.API_URL ?? `http://localhost:${env.PORT ?? 8001}`,
    webOrigins,
    webUrl: webOrigins[0],
    authSecret: required("AUTH_SECRET", secret),
    cookieDomain: env.COOKIE_DOMAIN || undefined,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
    apple:
      env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
        ? {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret: env.APPLE_CLIENT_SECRET,
            appBundleIdentifier: env.APPLE_APP_BUNDLE_ID || undefined,
          }
        : undefined,
  };
}
