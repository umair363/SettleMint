import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "@/lib/api";

const PREF_KEY = "sm-push";

// While the app is open, still show the banner (a friend just paid you).
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PushState = "on" | "off" | "blocked" | "unsupported";

const projectId = () =>
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ?? Constants.easConfig?.projectId;

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  // The API sends to this channel ("activity").
  await Notifications.setNotificationChannelAsync("activity", {
    name: "Group activity",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

async function currentToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    return data;
  } catch {
    return null;
  }
}

/** Whether this phone gets notifications right now. */
export async function pushState(): Promise<PushState> {
  if (Platform.OS === "web" || !Device.isDevice) return "unsupported";
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === "denied" && !perm.canAskAgain) return "blocked";
  if (perm.status !== "granted") return "off";
  return (await AsyncStorage.getItem(PREF_KEY)) === "off" ? "off" : "on";
}

/** Ask for permission (if needed) and register this phone. */
export async function turnPushOn(): Promise<PushState> {
  if (Platform.OS === "web" || !Device.isDevice) return "unsupported";
  await ensureChannel();
  const perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== "granted") return perm.canAskAgain ? "off" : "blocked";
  const token = await currentToken();
  if (!token) throw new Error("No push token");
  await api.push.registerPhone(token);
  await AsyncStorage.setItem(PREF_KEY, "on");
  return "on";
}

export async function turnPushOff(): Promise<PushState> {
  await AsyncStorage.setItem(PREF_KEY, "off");
  const token = await currentToken();
  if (token) await api.push.unregisterPhone(token).catch(() => {});
  return "off";
}

/**
 * While signed in: refresh this phone's token with the API on every launch
 * (tokens can change), and open the group when a notification is tapped.
 */
export function usePushRegistration(active: boolean) {
  useEffect(() => {
    if (!active || Platform.OS === "web") return;
    let live = true;
    (async () => {
      if ((await pushState()) !== "on") return;
      await ensureChannel();
      const token = await currentToken();
      if (live && token) await api.push.registerPhone(token).catch(() => {});
    })();
    return () => {
      live = false;
    };
  }, [active]);

  const response = Platform.OS === "web" ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!active || !response) return;
    const groupId = (response.notification.request.content.data as { groupId?: unknown } | undefined)?.groupId;
    if (typeof groupId === "string" && /^[0-9a-f-]{36}$/i.test(groupId)) {
      router.push({ pathname: "/group/[id]", params: { id: groupId } });
    }
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [active, response]);
}
