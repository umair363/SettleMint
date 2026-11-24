import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { API_URL } from "./env";

/** Better Auth client for sign-in, codes and sign-out. */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/v1/auth`,
  fetchOptions: { credentials: "include" },
  plugins: [emailOTPClient()],
});
