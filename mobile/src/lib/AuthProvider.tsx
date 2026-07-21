import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getSession, setSession, clearSession, type Session } from "./session";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await getSession();
    setSessionState(s);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const signIn = useCallback(async (s: Session) => {
    await setSession(s);
    setSessionState(s);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSessionState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
