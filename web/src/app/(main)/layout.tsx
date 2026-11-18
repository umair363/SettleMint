import type { ReactNode } from "react";
import { languageScript } from "@/i18n/language-script";
import { themeScript } from "@/ui/theme";
import { baseMetadata, baseViewport, fontVariables } from "../shell";
import "../globals.css";

// The app and the English public pages. Translated public pages have their
// own root layout in (site)/[lang], so their HTML carries the right lang/dir.

// English-only public pages keep lang="en"; the app picks the viewer's language.
const UNTRANSLATED = ["/", "/privacy", "/terms"];

export const metadata = baseMetadata;
export const viewport = baseViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: languageScript(UNTRANSLATED) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
