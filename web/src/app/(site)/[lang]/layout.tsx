import type { ReactNode } from "react";
import { dirOf, LANGUAGE_CODES, LANGUAGE_STORAGE_KEY, type Language } from "@settlemint/client/i18n/languages";
import { iconScript } from "@/features/pwa/icon-script";
import { themeScript } from "@/ui/theme";
import { baseMetadata, baseViewport, fontVariables } from "../../shell";
import "../../globals.css";

// Root layout for the translated public pages (/es, /ar, …): the HTML is
// built with the right lang and direction, so search engines and screen
// readers get it before any script runs. English lives at / in (main).

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGUAGE_CODES.filter((l) => l !== "en").map((lang) => ({ lang }));
}

export const metadata = baseMetadata;
export const viewport = baseViewport;

// Links marked data-set-lang open the app in this page's language.
const rememberLanguage = `document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("[data-set-lang]");if(a)try{localStorage.setItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)},a.getAttribute("data-set-lang"))}catch(_){}})`;

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <html lang={lang} dir={dirOf(lang as Language)} data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: iconScript }} />
        <script dangerouslySetInnerHTML={{ __html: rememberLanguage }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
