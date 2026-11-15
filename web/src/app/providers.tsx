"use client";

import { ApiError } from "@settlemint/shared";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
        classNames: {
          toast: "!glass !rounded-[var(--radius-lg)] !shadow-float !text-fg !border-glass-line",
          description: "!text-fg-muted",
          actionButton: "!bg-accent !text-accent-fg !font-semibold !rounded-full",
        },
      }}
    />
  );
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (err, query) => {
        // Background refetch failures for data already on screen get a quiet toast.
        if (query.state.data !== undefined && !(err instanceof ApiError && err.status === 401)) {
          toast.error("Couldn't refresh", { id: "refresh-failed", description: "Showing saved data." });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (mutation.options.onError) return; // the screen handles it
        toast.error(err instanceof ApiError ? err.message : "Something went wrong");
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        retry: (count, err) => {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
          return count < 2;
        },
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  const locale = useViewerLocale();
  return (
    <ThemeProvider>
      <IntlProvider locale={locale} messages={{}} onError={() => {}}>
        <QueryClientProvider client={client}>
          {children}
          <ThemedToaster />
        </QueryClientProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}
