import { createTranslator } from "use-intl";
import en, { type Messages } from "./messages/en";

/**
 * The active language for code outside React components (toasts raised by
 * the data layer, share texts). I18nProvider keeps it in step.
 */
let active = { locale: "en", messages: en as Messages };
let translator = createTranslator({ locale: active.locale, messages: active.messages });

export function setActiveMessages(locale: string, messages: Messages) {
  if (active.locale === locale && active.messages === messages) return;
  active = { locale, messages };
  translator = createTranslator({ locale, messages, onError: () => {} });
}

/** Translate outside components: tr()("errors.generic"). */
export const tr = () => translator;
/** Formatting locale outside components. */
export const activeLocale = () => active.locale;
