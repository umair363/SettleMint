import type { Metadata } from "next";
import { Landing } from "@/features/landing/landing";
import { landingAlternates, landingMessages, landingPath } from "@/i18n/landing";
import type { Language } from "@/i18n/languages";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = (await params).lang as Language;
  const { meta } = landingMessages[lang];
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: landingPath(lang), languages: landingAlternates() },
    openGraph: { title: meta.title, description: meta.description, url: landingPath(lang), siteName: "SettleMint", locale: lang, type: "website" },
  };
}

export default async function LocalizedHome({ params }: Props) {
  const lang = (await params).lang as Language;
  return <Landing lang={lang} messages={landingMessages[lang]} />;
}
