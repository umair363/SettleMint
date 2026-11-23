"use client";

import { Languages } from "@/ui/icons";
import { useTranslations } from "use-intl";
import { formattingLocale, LANGUAGES, matchLanguage, type LanguagePreference } from "@settlemint/client/i18n/languages";
import { setLanguagePreference, useLanguagePreference } from "@/i18n/provider";
import { useUpdateMe } from "@settlemint/client/data/queries";
import { IconTile } from "@/ui/glyph-tile";
import { ChevronRight } from "@/ui/icons";

/** Interface language for this device; also saved to the profile so notifications match. */
export function LanguageRow() {
  const t = useTranslations("account");
  const pref = useLanguagePreference();
  const update = useUpdateMe();

  const choose = (next: LanguagePreference) => {
    setLanguagePreference(next);
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
    const lang = next === "auto" ? matchLanguage(tags) : next;
    update.mutate({ locale: formattingLocale(lang, tags) });
  };
  const current = pref === "auto" ? t("languageAuto") : (LANGUAGES.find((l) => l.code === pref)?.name ?? "");

  return (
    <label className="relative flex min-h-16 w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70 active:bg-surface-2">
      <IconTile>
        <Languages />
      </IconTile>
      <span className="min-w-0 flex-1 truncate text-[16px] font-[540] text-fg">{t("language")}</span>
      <span className="max-w-[45%] truncate text-[15px] text-fg-muted">{current}</span>
      <ChevronRight className="size-4 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
      <select
        aria-label={t("language")}
        value={pref}
        onChange={(e) => choose(e.target.value as LanguagePreference)}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        <option value="auto">{t("languageAuto")}</option>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
