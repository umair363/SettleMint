import { registerMutationDefaults } from "@settlemint/client/data/queries";
import { tr } from "@settlemint/client/i18n/runtime";
import { apiErrorText } from "@settlemint/client/text/api-error-text";
import { ApiError } from "@settlemint/shared";
import { focusManager, MutationCache, onlineManager, QueryCache, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, Platform } from "react-native";
import { toast } from "@/ui/toast";
import "./api"; // hands the API client to the shared data hooks

// Pause requests while offline (queued writes are sent on reconnect)...
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
  return () => sub.remove();
});
// ...and refresh what's on screen when the app comes back to the foreground.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (s) => setFocused(s === "active"));
    return () => sub.remove();
  });
}

/** Same behaviour as the web app: saved data first, quiet retries, no silent failures. */
export function makeQueryClient() {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (err, query) => {
        const offline = err instanceof ApiError && err.isNetwork && !onlineManager.isOnline();
        if (query.state.data !== undefined && !offline && !(err instanceof ApiError && err.status === 401)) {
          toast.error(tr()("errors.refreshFailed"), { description: tr()("errors.showingSaved") });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (mutation.meta?.handlesErrors) return;
        toast.error(apiErrorText(err), {
          description: err instanceof ApiError && err.isNetwork ? tr()("errors.checkConnection") : undefined,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
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
