"use client";

import { Languages } from "@/ui/icons";
import { useTranslations } from "use-intl";
import { formattingLocale, LANGUAGES, matchLanguage, type LanguagePreference } from "@settlemint/client/i18n/languages";
import { setLanguagePreference, useLanguagePreference } from "@/i18n/provider";
import { useUpdateMe } from "@settlemint/client/data/queries";
import { Card, SectionHeader } from "@/ui/surface";

/** Interface language for this device; also saved to the profile so notifications match. */
export function LanguageCard() {
  const t = useTranslations("account");
  const pref = useLanguagePreference();
  const update = useUpdateMe();

  const choose = (next: LanguagePreference) => {
    setLanguagePreference(next);
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
    const lang = next === "auto" ? matchLanguage(tags) : next;
    update.mutate({ locale: formattingLocale(lang, tags) });
  };

  return (
    <section>
      <SectionHeader title={t("language")} />
      <Card className="p-5">
        <label className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-positive">
            <Languages className="size-5" aria-hidden />
          </span>
          <span className="sr-only">{t("language")}</span>
          <select
            value={pref}
            onChange={(e) => choose(e.target.value as LanguagePreference)}
            className="h-12 min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 text-[15px] font-medium text-fg focus:border-accent focus:outline-none"
          >
            <option value="auto">{t("languageAuto")}</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </Card>
    </section>
  );
}
