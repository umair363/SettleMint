export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "settlemint_theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  if (theme === "system") {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

// Inline script source, injected before hydration in the root layout so the
// correct theme is set before first paint — avoids a flash of the wrong
// theme when the stored preference differs from the OS default.
export const themeInitScript = `
(function() {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;
