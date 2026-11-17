/**
 * Where the app finds the API. A phone can't reach "localhost" on your
 * computer: in development set EXPO_PUBLIC_API_URL in mobile/.env to your
 * computer's network address, e.g. http://192.168.1.20:8001.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8001").replace(/\/+$/, "");

/** The web app: invite links, terms and privacy pages. */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || "https://app.settlemint.online").replace(/\/+$/, "");

/** Show "Continue with Google" (only once Google sign-in is set up on the API). */
export const GOOGLE_SIGN_IN = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN === "1";

/** The app's deep-link scheme (app.json "scheme"). */
export const SCHEME = "settlemint";
