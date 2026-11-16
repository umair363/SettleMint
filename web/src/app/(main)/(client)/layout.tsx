import type { ReactNode } from "react";
import { Providers } from "../providers";

// Everything that talks to the API (sign-in, onboarding, join, the app)
// lives in this route group, so only these pages load the data cache,
// offline storage, auth client and toasts. Public pages stay light.
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
