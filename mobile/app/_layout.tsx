import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { AuthProvider, useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    // expo-router (this SDK) has no <Redirect> component export — gating is
    // done imperatively via router.replace() once the session state settles.
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, isLoading, segments, router]);

  useEffect(() => {
    if (!session) return;
    // TODO(backend): persist this token via a POST /api/users/push-token
    // endpoint once one exists — the API currently has no push-token
    // storage, so registration succeeds but the token isn't sent anywhere.
    registerForPushNotificationsAsync().then((token) => {
      if (token) console.log("[push] registered token:", token);
    });
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.surfacePrimary } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            // Cached data survives app restarts (persisted below) — keep it
            // long enough to be useful offline without growing unbounded.
            gcTime: 24 * 60 * 60 * 1000,
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: AsyncStorage,
      key: "settlemint_query_cache",
    })
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <AuthProvider>
          <BottomSheetModalProvider>
            <RootNavigator />
          </BottomSheetModalProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
