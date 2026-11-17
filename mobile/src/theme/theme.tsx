import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { dark, light, radius, space, type Palette } from "./tokens";

export type ThemePreference = "auto" | "dark" | "light";

export interface Theme {
  c: Palette;
  isDark: boolean;
  radius: typeof radius;
  space: typeof space;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const KEY = "sm-theme";
const ThemeContext = createContext<Theme | null>(null);

/** Dark is the default, like the web app; "Auto" follows the phone. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("auto");

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "auto") setPref(v);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Theme>(() => {
    const isDark = preference === "auto" ? system !== "light" : preference === "dark";
    return {
      c: isDark ? dark : light,
      isDark,
      radius,
      space,
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(KEY, p).catch(() => {});
      },
    };
  }, [preference, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme must be used inside ThemeProvider");
  return t;
}
