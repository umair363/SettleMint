import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";
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
    <html lang="en" data-theme="dark" className={bricolage.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
