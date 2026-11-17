import "@/lib/intl-polyfills";
import { useMe } from "@settlemint/client/data/queries";
import { ApiError } from "@settlemint/shared";
import { useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLock } from "@/features/app-lock";
import { useResumeInvite } from "@/features/pending-invite";
import { usePushRegistration } from "@/features/push";
import { I18nProvider } from "@/i18n/i18n";
import { authClient, signOut } from "@/lib/auth";
import { CACHE_BUSTER, persister } from "@/lib/persist";
import { makeQueryClient } from "@/lib/query-client";
import { ThemeProvider, useTheme } from "@/theme/theme";
import { Loading } from "@/ui/surface";
import { Toaster } from "@/ui/toast";

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Sheets slide up as native form sheets on iPhone and as modals on Android.
const sheet = { presentation: Platform.OS === "ios" ? "formSheet" : "modal", headerShown: false } as const;

function Navigator() {
  const { c, isDark } = useTheme();
  const qc = useQueryClient();
  const session = authClient.useSession();
  const signedIn = Boolean(session.data?.user);
  const me = useMe(signedIn);
  const needsWelcome = Boolean(me.data && (!me.data.name.trim() || !me.data.defaultCurrency));
  usePushRegistration(signedIn && !needsWelcome);
  useResumeInvite(signedIn && Boolean(me.data) && !needsWelcome);

  // The saved session was revoked (signed out elsewhere, account deleted): forget it here too.
  const revoked = signedIn && me.error instanceof ApiError && me.error.status === 401;
  useEffect(() => {
    if (revoked) void signOut(qc);
  }, [revoked, qc]);

  const ready = !session.isPending && (!signedIn || me.data !== undefined || me.isError);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && needsWelcome}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !needsWelcome}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="add-expense" options={sheet} />
          <Stack.Screen name="expense/[id]" options={sheet} />
          <Stack.Screen name="settle" options={sheet} />
          <Stack.Screen name="new-group" options={sheet} />
          <Stack.Screen name="invite" options={sheet} />
        </Stack.Protected>
        {/* Invite links work signed in or out (guests can join without an account). */}
        <Stack.Screen name="join" />
      </Stack>
      {signedIn && <AppLock />}
    </View>
  );
}

export default function RootLayout() {
  const [client] = useState(makeQueryClient);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <PersistQueryClientProvider
              client={client}
              persistOptions={{
                persister,
                buster: CACHE_BUSTER,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                dehydrateOptions: {
                  shouldDehydrateQuery: (q) => q.state.status === "success" && q.queryKey[0] !== "invite",
                },
              }}
              onSuccess={() => {
                // Send anything queued while offline, then refresh.
                void client.resumePausedMutations().then(() => client.invalidateQueries());
              }}
            >
              <Navigator />
              <Toaster />
            </PersistQueryClientProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
