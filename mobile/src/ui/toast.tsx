import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";
import { Text } from "./text";

interface ToastItem {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

// A tiny store so the data layer (outside React) can raise toasts too.
let current: ToastItem | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function show(kind: ToastItem["kind"], title: string, opts: Omit<ToastItem, "id" | "kind" | "title"> = {}) {
  current = { id: nextId++, kind, title, ...opts };
  AccessibilityInfo.announceForAccessibility([title, opts.description].filter(Boolean).join(". "));
  emit();
}

export const toast = {
  success: (title: string, opts?: Omit<ToastItem, "id" | "kind" | "title">) => show("success", title, opts),
  error: (title: string, opts?: Omit<ToastItem, "id" | "kind" | "title">) => show("error", title, opts),
  info: (title: string, opts?: Omit<ToastItem, "id" | "kind" | "title">) => show("info", title, opts),
  dismiss: () => {
    current = null;
    emit();
  },
};

/** Shows the latest toast at the top, for 4 s (6 s when it offers undo). */
export function Toaster() {
  const item = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  const { c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<ToastItem | null>(null);

  useEffect(() => {
    if (item) {
      setShown(item);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      const timer = setTimeout(() => toast.dismiss(), item.action ? 6000 : 4000);
      return () => clearTimeout(timer);
    }
    Animated.timing(anim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setShown(null));
  }, [item, anim]);

  if (!shown) return null;
  const icon = shown.kind === "success" ? "checkmark-circle" : shown.kind === "error" ? "alert-circle" : "information-circle";
  const color = shown.kind === "success" ? c.positive : shown.kind === "error" ? c.negative : c.info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }}
    >
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: radius.lg,
          backgroundColor: c.bgElevated,
          borderWidth: 1,
          borderColor: c.lineStrong,
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Ionicons name={icon} size={22} color={color} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{shown.title}</Text>
          {shown.description ? (
            <Text variant="sub" tone="muted">
              {shown.description}
            </Text>
          ) : null}
        </View>
        {shown.action && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              shown.action?.onPress();
              toast.dismiss();
            }}
            style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text variant="label" tone="accentFg">
              {shown.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
