/** The v1 API origin. Set NEXT_PUBLIC_API_URL at build time. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(/\/+$/, "");

/** Show "Continue with Google" only when the API has Google configured. */
export const GOOGLE_SIGN_IN = process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "true";

/** Public address of this site, for canonical links, the sitemap and share cards. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.settlemint.online").replace(/\/+$/, "");
