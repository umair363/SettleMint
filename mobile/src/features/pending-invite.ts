import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";

const KEY = "sm-pending-invite";

/** Someone opened an invite, then chose to sign in first: remember where they were going. */
export const setPendingInvite = (token: string) => AsyncStorage.setItem(KEY, token).catch(() => {});

/** Once signed in (and onboarded), continue to the invite they opened. */
export function useResumeInvite(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const token = await AsyncStorage.getItem(KEY).catch(() => null);
      if (!token) return;
      await AsyncStorage.removeItem(KEY).catch(() => {});
      router.push({ pathname: "/join", params: { t: token } });
    })();
  }, [ready]);
}
