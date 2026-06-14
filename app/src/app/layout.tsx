import type { Metadata } from "next";
import "./globals.css";

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
  ],
  openGraph: {
    title: "SettleMint - Split Expenses, Not Friendships",
    description:
      "The fastest, most beautiful way to track and settle shared expenses with friends, roommates, and couples.",
    type: "website",
    locale: "en_US",
    siteName: "SettleMint",
  },
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
