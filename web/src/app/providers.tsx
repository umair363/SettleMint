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
        unstyled: true,
        classNames: {
          toast:
            "glass flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-fg shadow-float",
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
