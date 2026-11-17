import { expoClient } from "@better-auth/expo/client";
import { anonymousClient, emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import { API_URL, SCHEME } from "./env";
import { persister } from "./persist";

/**
 * Sign-in, codes, guests and sign-out. On a phone the session cookie lives in
 * the keychain / keystore (SecureStore), never in plain storage; in the web
 * preview the browser keeps it as usual.
 */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/v1/auth`,
  plugins: [
    expoClient({ scheme: SCHEME, storagePrefix: SCHEME, storage: SecureStore }),
    emailOTPClient(),
    anonymousClient(),
  ],
  ...(Platform.OS === "web" ? { fetchOptions: { credentials: "include" as const } } : {}),
});

/**
 * Sign out and forget everything this account had on the device, so the next
 * person to sign in never sees it.
 */
export async function signOut(qc: QueryClient) {
  await authClient.signOut().catch(() => {});
  await startFresh(qc);
}

/** Drop saved data before showing a newly signed-in account. */
export async function startFresh(qc: QueryClient) {
  qc.clear();
  await persister.removeClient();
}
