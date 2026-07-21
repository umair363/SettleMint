import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getApiUrl } from "@settlemint/shared";
import { useAuth } from "@/lib/AuthProvider";
import { useTheme } from "@/theme/useTheme";

const API = getApiUrl();

export default function VerifyScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const theme = useTheme();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      await signIn({
        user: data.user,
        token: data.token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfacePrimary }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Verify your email</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Enter the 6-digit code we sent to {email}.
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={[styles.otpInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderDefault }]}
        placeholder="000000"
        placeholderTextColor={theme.colors.textTertiary}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
      />

      <Pressable
        style={[styles.submitBtn, { backgroundColor: theme.mint[400] }, loading && styles.submitBtnDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.slate[950]} />
        ) : (
          <Text style={[styles.submitBtnText, { color: theme.slate[950] }]}>Verify</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 16,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
