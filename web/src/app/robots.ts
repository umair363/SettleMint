import type { MetadataRoute } from "next";
import { LANGUAGE_CODES } from "@/i18n/languages";
import { SITE_URL } from "@/lib/env";

export const dynamic = "force-static";

// Public pages only; the app itself (groups, expenses) is private and useless to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", ...LANGUAGE_CODES.filter((l) => l !== "en").map((l) => `/${l}$`), "/privacy", "/terms", "/sign-in"],
      disallow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
