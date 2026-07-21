import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useTheme } from "@/theme/useTheme";

interface BiometricGateProps {
  children: ReactNode;
}

// Gates access to the authenticated app behind Face/Touch ID when the
// device actually supports and has enrolled biometrics — skips silently
// otherwise (simulators, devices with no biometrics set up) rather than
// blocking those users out.
export default function BiometricGate({ children }: BiometricGateProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<"checking" | "required" | "unlocked" | "unsupported">("checking");

  const attemptUnlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock SettleMint",
      disableDeviceFallback: false,
    });
    setStatus(result.success ? "unlocked" : "required");
  };

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);

      if (!hasHardware || !isEnrolled) {
        setStatus("unsupported");
        return;
      }

      setStatus("required");
      await attemptUnlock();
    })();
  }, []);

  if (status === "checking" || status === "unsupported" || status === "unlocked") {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfacePrimary }]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Locked</Text>
      <Pressable style={[styles.btn, { backgroundColor: theme.mint[400] }]} onPress={attemptUnlock}>
        <Text style={[styles.btnText, { color: theme.slate[950] }]}>Unlock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  icon: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: "700" },
  btn: { borderRadius: 999, paddingVertical: 14, paddingHorizontal: 32 },
  btnText: { fontSize: 16, fontWeight: "600" },
});
