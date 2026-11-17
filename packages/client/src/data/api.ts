import type { ApiClient } from "@settlemint/shared";

let client: ApiClient | null = null;

/**
 * Each app makes its own client (the browser sends its session cookie, the
 * phone adds it by hand) and hands it over once at start-up.
 */
export function configureApi(c: ApiClient) {
  client = c;
}

/** The app's API client; use after configureApi. */
export const api: ApiClient = new Proxy({} as ApiClient, {
  get(_target, key) {
    if (!client) throw new Error("configureApi() must run before the API is used");
    return client[key as keyof ApiClient];
  },
});
