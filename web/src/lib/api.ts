import { configureApi } from "@settlemint/client/data/api";
import { createApiClient } from "@settlemint/shared";
import { API_URL } from "./env";

/** Typed client for the v1 API; the session cookie is sent automatically. */
export const api = createApiClient({ baseUrl: API_URL, credentials: "include" });
configureApi(api);
