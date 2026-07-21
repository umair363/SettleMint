import * as SecureStore from "expo-secure-store";

// expo-secure-store persists in the platform keychain/keystore rather than
// AsyncStorage, so the JWT never sits in plaintext-readable storage — the
// mobile equivalent of the localStorage-JWT concern flagged for the web app.
const SESSION_KEY = "settlemint_session";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  defaultCurrency: string;
}

export interface Session {
  user: SessionUser;
  token: string;
  expiresAt: number;
}

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: Session = JSON.parse(raw);
    if (parsed.expiresAt < Date.now()) {
      await clearSession();
      return null;
    }
    return parsed;
  } catch {
    // Corrupted session value — treat as logged out rather than crashing
    // the app on a bad JSON.parse (this bit the web app before it was fixed).
    await clearSession();
    return null;
  }
}

export async function setSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
