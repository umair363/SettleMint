import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import { SITE_URL } from "@/lib/env";

// Shared by both root layouts: (main) for the app, (site)/[lang] for the
// translated public pages.

// One family, chosen by rendering money-heavy samples of 14 typefaces side by
// side: Bricolage Grotesque has true tabular figures, characterful numerals
// for big amounts, and an optical-size axis that gives small text its own
// readable cut. It avoids the overused Inter/Geist/Instrument look.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
  axes: ["opsz"],
});

// Arabic/Urdu and Hindi letters fall back to these. Not preloaded, and split by
// script, so the files download only when such text is actually on screen.
// (Measured: cheaper to lay out than a long chain of system fallbacks.)
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", display: "swap", preload: false });

export const fontVariables = `${bricolage.variable} ${arabic.variable} ${devanagari.variable}`;

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SettleMint", template: "%s · SettleMint" },
  description: "Split bills with anyone, in any currency. Free, fast, and fair to the cent.",
  applicationName: "SettleMint",
  appleWebApp: { capable: true, title: "SettleMint", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const baseViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7f6" },
  ],
};
