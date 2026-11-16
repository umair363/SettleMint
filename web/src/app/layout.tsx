import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Noto_Sans_Arabic, Noto_Sans_Devanagari } from "next/font/google";
import type { ReactNode } from "react";
import { languageScript } from "@/i18n/languages";
import { themeScript } from "@/ui/theme";
import "./globals.css";

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
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", preload: false });
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", display: "swap", preload: false });

// Public pages that are English-only for now keep lang="en".
const UNTRANSLATED = ["/", "/privacy", "/terms"];

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f14" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7f6" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${bricolage.variable} ${arabic.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: languageScript(UNTRANSLATED) }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
