/** Languages the interface is translated into. Formatting follows the full browser locale. */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "hi", name: "हिन्दी" },
  { code: "ur", name: "اردو", rtl: true },
  { code: "ar", name: "العربية", rtl: true },
] as const satisfies readonly { code: string; name: string; rtl?: boolean }[];

export type Language = (typeof LANGUAGES)[number]["code"];
export type LanguagePreference = Language | "auto";

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as readonly Language[];
export const RTL_LANGUAGES: readonly Language[] = LANGUAGES.filter((l) => "rtl" in l && l.rtl).map((l) => l.code);
export const LANGUAGE_STORAGE_KEY = "sm-lang";

export const isLanguage = (v: unknown): v is Language => typeof v === "string" && (LANGUAGE_CODES as readonly string[]).includes(v);
export const dirOf = (lang: Language) => (RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr");

const base = (tag: string) => tag.toLowerCase().split(/[-_]/)[0];

/** The first browser language we have a translation for, else English. */
export function matchLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const b = base(tag);
    if (isLanguage(b)) return b;
  }
  return "en";
}

/**
 * Locale for numbers, money and dates: the browser's own tag when it is the
 * same language ("es-MX" for Spanish in Mexico), else the language itself.
 */
export function formattingLocale(lang: Language, tags: readonly string[]): string {
  const same = tags.find((t) => base(t) === lang);
  const candidate = same ?? lang;
  try {
    return Intl.NumberFormat.supportedLocalesOf([candidate])[0] ?? lang;
  } catch {
    return lang;
  }
}
