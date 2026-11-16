import type { Language } from "../languages";
import { LANGUAGES } from "../languages";
import ar from "./ar";
import de from "./de";
import en, { type LandingMessages } from "./en";
import es from "./es";
import fr from "./fr";
import hi from "./hi";
import pt from "./pt";
import ur from "./ur";

/** Build-time only: every language's landing text. */
export const landingMessages: Record<Language, LandingMessages> = { en, es, pt, fr, de, hi, ur, ar };

/** Path of the landing page in a language. */
export const landingPath = (lang: Language) => (lang === "en" ? "/" : `/${lang}`);

/** hreflang alternates, so search engines show people their own language. */
export function landingAlternates() {
  return {
    "x-default": "/",
    ...Object.fromEntries(LANGUAGES.map((l) => [l.code, landingPath(l.code)])),
  };
}
