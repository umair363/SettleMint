"use client";

import { ApiError } from "@settlemint/shared";
import { MutationCache, onlineManager, QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { OfflineBanner, ServiceWorker } from "@/features/pwa/pwa";
import { CACHE_BUSTER, persister } from "@/lib/persist";
import { registerMutationDefaults } from "@/lib/queries";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { IntlProvider } from "use-intl";
import { ThemeProvider, useTheme } from "@/ui/theme";

/**
 * The viewer's locale decides number, money and date formatting. The static
 * HTML is rendered as "en"; the real locale is applied after the first
 * paint to avoid a hydration mismatch.
 */
function browserLocale(): string {
  const candidate = navigator.languages?.[0] ?? navigator.language ?? "en";
  try {
    return Intl.NumberFormat.supportedLocalesOf([candidate])[0] ?? "en";
  } catch {
    return "en";
  }
}

function subscribeLanguage(onChange: () => void) {
  window.addEventListener("languagechange", onChange);
  return () => window.removeEventListener("languagechange", onChange);
}

function useViewerLocale() {
  return useSyncExternalStore(subscribeLanguage, browserLocale, () => "en");
}

function ThemedToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="top-center"
      offset={16}
      toastOptions={{
        unstyled: true,
        classNames: {
          // Solid, not glass: toasts can land over a dimmed sheet backdrop, where
          // translucency would wash the text out.
          toast:
            "flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-line-strong bg-bg-elevated px-4 py-3 text-fg shadow-float",
          title: "text-[15px] font-semibold",
          description: "text-[13px] text-fg-muted",
          icon: "shrink-0 [&_svg]:size-5",
          success: "[&_[data-icon]]:text-positive",
          error: "[&_[data-icon]]:text-negative",
          actionButton: "ms-auto shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-fg",
          cancelButton: "shrink-0 rounded-full bg-surface-3 px-3 py-1.5 text-sm",
        },
      }}
    />
  );
}

function makeQueryClient() {
  // React Query assumes "online" until an offline event arrives; start from the
  // real state so an offline launch pauses requests instead of failing them.
  if (typeof navigator !== "undefined") onlineManager.setOnline(navigator.onLine);
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (err, query) => {
        // Background refetch failures for data already on screen get a quiet toast,
        // except offline, where the offline pill already says so.
        const offline = err instanceof ApiError && err.isNetwork && !onlineManager.isOnline();
        if (query.state.data !== undefined && !offline && !(err instanceof ApiError && err.status === 401)) {
          toast.error("Couldn't refresh", { id: "refresh-failed", description: "Showing saved data." });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        // Screens that stay open and show their own message set meta.handlesErrors.
        // Everything else (e.g. an expense saved after its sheet closed) is reported here,
        // so a failed save is never silent.
        if (mutation.meta?.handlesErrors) return;
        toast.error(err instanceof ApiError ? err.message : "Something went wrong", {
          description: err instanceof ApiError && err.isNetwork ? "Check your connection and try again." : undefined,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Kept for a week so the app can open from saved data.
        gcTime: 7 * 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: (count, err) => {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
          return count < 4;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      },
    },
  });
  registerMutationDefaults(client);
  return client;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const locale = useViewerLocale();
  return (
    <ThemeProvider>
      <IntlProvider locale={locale} messages={{}} onError={() => {}}>
        <PersistQueryClientProvider
          client={client}
          persistOptions={{
            persister,
            buster: CACHE_BUSTER,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            dehydrateOptions: {
              // Save loaded data and queued writes; never half-loaded or failed queries.
              shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "invite",
            },
          }}
          onSuccess={() => {
            // Send anything that was queued while offline, then refresh.
            void client.resumePausedMutations().then(() => client.invalidateQueries());
          }}
        >
          {children}
          <ThemedToaster />
          <OfflineBanner />
          <ServiceWorker />
        </PersistQueryClientProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}
