export interface AppConfig {
  env: "development" | "production" | "test";
  /** Public URL of this API, e.g. https://api.settlemint.online */
  apiUrl: string;
  /** Web app origins allowed to call the API with cookies. */
  webOrigins: string[];
  /** Origins Better Auth accepts: the web origins plus the mobile app's deep-link scheme. */
  trustedOrigins: string[];
  /** Base URL used in links inside emails. */
  webUrl: string;
  authSecret: string;
  /** Share the session cookie across subdomains (e.g. ".settlemint.online"). */
  cookieDomain?: string;
  google?: { clientId: string; clientSecret: string };
  apple?: { clientId: string; clientSecret: string; appBundleIdentifier?: string };
  /** Receipt scanning is off without it. */
  geminiApiKey?: string;
  /** Receipt scans per person per month (bounds AI cost). */
  aiScansPerMonth: number;
  /**
   * Password accounts must confirm their email (a code) before they can sign in,
   * so nobody can hold an account under someone else's address. Always on in
   * production; browser tests switch it off locally.
   */
  requireEmailVerification: boolean;
  /** Sign-in rate limits. Always on in production; browser tests switch them off locally. */
  authRateLimit?: boolean;
  /** Web Push keys (npx web-push generate-vapid-keys). Notifications are off without them. */
  vapid?: { publicKey: string; privateKey: string; subject: string };
  /**
   * Proxies in front of the API that append to X-Forwarded-For (Render: 1;
   * Render behind Cloudflare's proxy: 2). Only those hops are trusted, so a
   * client can't fake its address to dodge rate limits.
   */
  trustProxyHops: number;
  /** Hosts browsers' push services use; subscriptions to anything else are refused. */
  pushHosts: string[];
  /** Only if "enhanced push security" is on for the Expo project. */
  expoAccessToken?: string;
}

/**
 * Browser push services (Chrome/Edge/Opera/Samsung via Google, Firefox,
 * Safari, legacy Edge). A subscription's endpoint must be on one of these, so
 * the API never sends requests to an address someone made up.
 */
export const PUSH_HOSTS = ["googleapis.com", "google.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

/** The mobile app's URL scheme (mobile/app.json). */
export const MOBILE_SCHEME = "settlemint";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const mode = env.NODE_ENV === "production" ? "production" : env.NODE_ENV === "test" ? "test" : "development";
  // Dev default: the web app's dev server.
  const webOrigins = (env.WEB_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const secret = env.AUTH_SECRET ?? (mode === "production" ? undefined : "dev-only-secret-change-me-0123456789");
  if (secret && secret.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");

  return {
    env: mode,
    apiUrl: env.API_URL ?? `http://localhost:${env.PORT ?? 8001}`,
    webOrigins,
    trustedOrigins: [
      ...webOrigins,
      `${MOBILE_SCHEME}://`,
      // Expo Go and dev builds on a local network; never trusted in production.
      ...(mode === "development" ? ["exp://", "exp://**"] : []),
    ],
    webUrl: webOrigins[0],
    authSecret: required("AUTH_SECRET", secret),
    cookieDomain: env.COOKIE_DOMAIN || undefined,
    geminiApiKey: env.GEMINI_API_KEY || undefined,
    aiScansPerMonth: Number(env.AI_SCANS_PER_MONTH) > 0 ? Number(env.AI_SCANS_PER_MONTH) : 30,
    authRateLimit: mode === "production" || env.AUTH_RATE_LIMIT !== "off",
    requireEmailVerification: mode === "production" || env.EMAIL_VERIFICATION !== "off",
    expoAccessToken: env.EXPO_ACCESS_TOKEN || undefined,
    trustProxyHops: Number.isInteger(Number(env.TRUST_PROXY_HOPS)) && env.TRUST_PROXY_HOPS !== undefined && env.TRUST_PROXY_HOPS !== ""
      ? Number(env.TRUST_PROXY_HOPS)
      : mode === "production"
        ? 1
        : 0,
    pushHosts: PUSH_HOSTS,
    vapid:
      env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
        ? {
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
            subject: env.VAPID_SUBJECT || "mailto:support@settlemint.online",
          }
        : undefined,
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
