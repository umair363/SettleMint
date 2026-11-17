import { configureApi } from "@settlemint/client/data/api";
import { createApiClient } from "@settlemint/shared";
import { Platform } from "react-native";
import { authClient } from "./auth";
import { API_URL } from "./env";

const isWeb = Platform.OS === "web";

/**
 * Typed client for the v1 API. Native requests carry the session cookie by
 * hand ("include" would fight it); the web preview lets the browser send it.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  credentials: isWeb ? "include" : "omit",
  headers: isWeb
    ? undefined
    : async (): Promise<Record<string, string>> => {
        const cookie = await authClient.getCookie();
        return cookie ? { cookie } : {};
      },
});
configureApi(api);
