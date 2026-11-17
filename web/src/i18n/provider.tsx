"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { IntlProvider } from "use-intl";
import {
  dirOf,
  formattingLocale,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  matchLanguage,
  type Language,
  type LanguagePreference,
} from "@settlemint/client/i18n/languages";
import en, { type Messages } from "@settlemint/client/i18n/messages/en";
import { setActiveMessages } from "@settlemint/client/i18n/runtime";

// Each language is its own chunk: people download only theirs.
const loaders: Record<Exclude<Language, "en">, () => Promise<{ default: Messages }>> = {
  es: () => import("@settlemint/client/i18n/messages/es"),
  pt: () => import("@settlemint/client/i18n/messages/pt"),
  fr: () => import("@settlemint/client/i18n/messages/fr"),
  de: () => import("@settlemint/client/i18n/messages/de"),
  hi: () => import("@settlemint/client/i18n/messages/hi"),
  ur: () => import("@settlemint/client/i18n/messages/ur"),
  ar: () => import("@settlemint/client/i18n/messages/ar"),
};
const cache = new Map<Language, Messages>([["en", en]]);

async function load(lang: Language): Promise<Messages> {
  const hit = cache.get(lang);
  if (hit) return hit;
  const messages = (await loaders[lang as Exclude<Language, "en">]()).default;
  cache.set(lang, messages);
  return messages;
}

// ─── Preference (localStorage) and browser languages, read as external stores ───

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener("languagechange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("languagechange", listener);
  };
}

function readPreference(): LanguagePreference {
  try {
    const v = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

const browserTags = () => (navigator.languages?.length ? navigator.languages : [navigator.language || "en"]).join(",");

export function setLanguagePreference(pref: LanguagePreference) {
  try {
    if (pref === "auto") localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    else localStorage.setItem(LANGUAGE_STORAGE_KEY, pref);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  listeners.forEach((l) => l());
}

export function useLanguagePreference(): LanguagePreference {
  return useSyncExternalStore(subscribe, readPreference, () => "auto");
}

/** The language in use and the locale numbers and dates are formatted in. */
export function useResolvedLanguage(): { language: Language; locale: string } {
  const pref = useLanguagePreference();
  const tags = useSyncExternalStore(subscribe, browserTags, () => "en").split(",");
  const language = pref === "auto" ? matchLanguage(tags) : pref;
  return { language, locale: formattingLocale(language, tags) };
}

/**
 * Provides translations. The static HTML is English; the viewer's language is
 * applied right after hydration. Until its text has loaded the page stays
 * hidden (data-i18n-pending, set before paint by languageScript), so nobody
 * sees English flash first.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { language, locale } = useResolvedLanguage();
  const [shown, setShown] = useState<{ language: Language; messages: Messages }>({ language: "en", messages: en });

  useEffect(() => {
    let live = true;
    load(language)
      .then((messages) => live && setShown({ language, messages }))
      .catch(() => live && setShown({ language: "en", messages: en }));
    return () => {
      live = false;
    };
  }, [language]);

  // While a newly chosen language loads, the previous one stays on screen.
  const current = shown;
  const currentLocale = current.language === language ? locale : formattingLocale(current.language, [locale]);

  useEffect(() => {
    setActiveMessages(currentLocale, current.messages);
    const root = document.documentElement;
    root.lang = current.language;
    root.dir = dirOf(current.language);
    if (current.language === language) root.removeAttribute("data-i18n-pending");
  }, [currentLocale, current.messages, current.language, language]);

  return (
    <IntlProvider locale={currentLocale} messages={current.messages} onError={() => {}}>
      <div data-i18n-root className="contents">
        {children}
      </div>
    </IntlProvider>
  );
}
