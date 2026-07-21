import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { themeInitScript } from "@/utils/theme";
import "./globals.css";

export const viewport: Viewport = {
  // Matches the surface color of each theme so the browser chrome and iOS
  // status bar blend into the app instead of banding against it.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1219" },
  ],
  width: "device-width",
  initialScale: 1,
  // Let the app fill the notch/home-indicator area — the safe-area insets
  // in globals.css already account for it.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SettleMint - Split Expenses, Not Friendships",
  description:
    "The most beautiful and intelligent way to split, track, and settle shared expenses. Built for real relationships, not spreadsheets.",
  keywords: [
    "split bills",
    "group expenses",
    "settle up",
    "expense tracker",
    "splitwise alternative",
    "bill splitter",
    "shared costs",
    "budget tracker",
    "personal finance",
  ],
  openGraph: {
    title: "SettleMint - Split Expenses, Not Friendships",
    description:
      "The fastest, most beautiful way to track and settle shared expenses with friends, roommates, and couples.",
    type: "website",
    locale: "en_US",
    siteName: "SettleMint",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "SettleMint" }],
  },
  twitter: {
    card: "summary",
    title: "SettleMint",
    description: "Split expenses, not friendships.",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SettleMint",
    startupImage: "/icon-512.png",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#0a0e17",
    "msapplication-TileImage": "/icon-192.png",
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before hydration to avoid a flash of the wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
