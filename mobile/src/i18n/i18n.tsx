import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  dirOf,
  formattingLocale,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  matchLanguage,
  type Language,
  type LanguagePreference,
} from "@settlemint/client/i18n/languages";
import ar from "@settlemint/client/i18n/messages/ar";
import de from "@settlemint/client/i18n/messages/de";
import en, { type Messages } from "@settlemint/client/i18n/messages/en";
import es from "@settlemint/client/i18n/messages/es";
import fr from "@settlemint/client/i18n/messages/fr";
import hi from "@settlemint/client/i18n/messages/hi";
import pt from "@settlemint/client/i18n/messages/pt";
import ur from "@settlemint/client/i18n/messages/ur";
import { setActiveMessages } from "@settlemint/client/i18n/runtime";
import { getCalendars, getLocales } from "expo-localization";
import * as Updates from "expo-updates";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DevSettings, I18nManager, Platform } from "react-native";
import { IntlProvider } from "use-intl";

// All languages ship inside the app (about 250 KB of text), so switching is instant offline.
const CATALOGS: Record<Language, Messages> = { en, es, pt, fr, de, hi, ur, ar };

interface LanguageState {
  /** What the person chose ("auto" follows the phone). */
  preference: LanguagePreference;
  language: Language;
  /** Locale for numbers, money and dates, e.g. "es-MX". */
  locale: string;
  setPreference: (p: LanguagePreference) => Promise<void>;
}

const LanguageContext = createContext<LanguageState | null>(null);

const deviceTags = () => {
  const tags = getLocales()
    .map((l) => l.languageTag)
    .filter(Boolean);
  return tags.length ? tags : ["en"];
};

/** Restart the JavaScript app (needed after switching between left-to-right and right-to-left). */
async function restart() {
  if (__DEV__) DevSettings.reload();
  else await Updates.reloadAsync();
}

/**
 * Native layout direction is fixed when the app starts. When the language
 * needs the other direction, flip it and restart once. Returns true if a
 * restart was started.
 */
function syncDirection(language: Language): boolean {
  const rtl = dirOf(language) === "rtl";
  if (Platform.OS === "web") {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
    return false;
  }
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  void restart();
  return true;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPref] = useState<LanguagePreference | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((v) => setPref(isLanguage(v) ? v : "auto"))
      .catch(() => setPref("auto"));
  }, []);

  const tags = deviceTags();
  const resolved = preference ?? "auto";
  const language = resolved === "auto" ? matchLanguage(tags) : resolved;
  const locale = formattingLocale(language, tags);
  const messages = CATALOGS[language];
  setActiveMessages(locale, messages);

  useEffect(() => {
    if (preference !== null) syncDirection(language);
  }, [language, preference]);

  const value = useMemo<LanguageState>(
    () => ({
      preference: resolved,
      language,
      locale,
      setPreference: async (p) => {
        if (p === "auto") await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY).catch(() => {});
        else await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, p).catch(() => {});
        setPref(p);
      },
    }),
    [resolved, language, locale],
  );

  // Wait for the saved choice (a few ms) so the wrong language never flashes.
  if (preference === null) return null;

  return (
    <LanguageContext.Provider value={value}>
      <IntlProvider
        locale={locale}
        messages={messages}
        timeZone={getCalendars()[0]?.timeZone ?? undefined}
        onError={() => {}}
      >
        {children}
      </IntlProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const v = useContext(LanguageContext);
  if (!v) throw new Error("useLanguage must be used inside I18nProvider");
  return v;
}

/** Languages the phone prefers, most preferred first. */
export { deviceTags };
