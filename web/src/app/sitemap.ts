import type { MetadataRoute } from "next";
import { LANGUAGES } from "@settlemint/client/i18n/languages";
import { landingPath } from "@/i18n/landing";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LANGUAGES.map((l) => [l.code, `${SITE_URL}${landingPath(l.code)}`]));
  return [
    ...LANGUAGES.map((l) => ({
      url: `${SITE_URL}${landingPath(l.code)}`,
      changeFrequency: "monthly" as const,
      priority: l.code === "en" ? 1 : 0.9,
      alternates: { languages },
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
