import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/button";
import { Text } from "@/ui/text";

const KEY = "sm-app-lock";
/** Coming back within this time doesn't ask again (switching apps to pay someone). */
const GRACE_MS = 60_000;

export async function appLockAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hardware && enrolled;
}

export async function isAppLockOn(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === "on";
}

export async function setAppLock(on: boolean, prompt: string): Promise<boolean> {
  if (on) {
    // Confirm it works before switching it on, so nobody locks themselves out.
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt });
    if (!r.success) return false;
  }
  await AsyncStorage.setItem(KEY, on ? "on" : "off");
  return true;
}

/**
 * Optional lock (Account › App lock): covers the app with a lock screen on
 * launch and after a minute in the background, until Face ID, fingerprint or
 * the phone's passcode unlocks it.
 */
export function AppLock() {
  const { c } = useTheme();
  const t = useTranslations("mobile");
  const [locked, setLocked] = useState(false);
  const leftAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: t("unlockPrompt") });
    if (r.success) setLocked(false);
  }, [t]);

  const lockIfOn = useCallback(async () => {
    if (!(await isAppLockOn()) || !(await appLockAvailable())) return;
    setLocked(true);
    void unlock();
  }, [unlock]);

  useEffect(() => {
    void lockIfOn();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") leftAt.current = Date.now();
      if (s === "active" && leftAt.current !== null && Date.now() - leftAt.current > GRACE_MS) void lockIfOn();
    });
    return () => sub.remove();
  }, [lockIfOn]);

  if (!locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="lock-closed" size={32} color={c.positive} />
      </View>
      <Text variant="title" center>
        {t("locked")}
      </Text>
      <Button size="lg" icon="finger-print" onPress={unlock}>
        {t("unlock")}
      </Button>
    </View>
  );
}
