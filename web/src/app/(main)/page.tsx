import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";
import { languageSuggestScript, type SuggestTexts } from "@/features/landing/language-suggest";
import { landingAlternates, landingMessages } from "@/i18n/landing";
import { LANGUAGES } from "@settlemint/client/i18n/languages";

const en = landingMessages.en;

export const metadata: Metadata = {
  title: { absolute: en.meta.title },
  description: en.meta.description,
  alternates: { canonical: "/", languages: landingAlternates() },
  openGraph: { title: en.meta.title, description: en.meta.description, url: "/", siteName: "SettleMint", locale: "en", type: "website" },
};

// Each suggestion is written in its own language.
const suggestions = Object.fromEntries(
  LANGUAGES.filter((l) => l.code !== "en").map((l) => [
    l.code,
    {
      text: landingMessages[l.code].suggest,
      cta: landingMessages[l.code].suggestCta,
      dismiss: landingMessages[l.code].suggestDismiss,
    },
  ]),
) as SuggestTexts;

export default function Home() {
  return (
    <>
      <Landing lang="en" messages={en} />
      <script dangerouslySetInnerHTML={{ __html: languageSuggestScript(suggestions) }} />
    </>
  );
}
