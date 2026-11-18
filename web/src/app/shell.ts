import type { Metadata, Viewport } from "next";
import { Mona_Sans, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import { SITE_URL } from "@/lib/env";

// Shared by both root layouts: (main) for the app, (site)/[lang] for the
// translated public pages.

// Mona Sans (GitHub, OFL): one variable file with a width axis. Normal width
// for reading, expanded widths for titles and every amount, so money reads
// like a confident statement rather than a form field.
const mona = Mona_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mona",
  display: "swap",
  axes: ["wdth"],
});

// Arabic/Urdu and Hindi letters fall back to these. Not preloaded, and split by
// script, so the files download only when such text is actually on screen.
// (Measured: cheaper to lay out than a long chain of system fallbacks.)
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", display: "swap", preload: false });

export const fontVariables = `${mona.variable} ${arabic.variable} ${devanagari.variable}`;

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
    { media: "(prefers-color-scheme: dark)", color: "#0a0e0c" },
    { media: "(prefers-color-scheme: light)", color: "#f7faf8" },
  ],
};
