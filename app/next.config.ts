import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

// NOTE: `next build` must run with `--webpack` (see package.json). next-pwa
// is a Webpack plugin, and under Turbopack — the Next 16 default — it is
// silently inert: no sw.js is emitted, no offline support, no caching, and
// no warning that any of it is missing.

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    // Read-only API data. Matched on path rather than a hardcoded origin so
    // this keeps working if the API host changes.
    //
    // NetworkFirst with a long maxAge: fresh data whenever there's a
    // connection, but the last good response stays available for a week so
    // the app is genuinely usable offline rather than going blank after a
    // few minutes. Mutations are never cached — they go through the
    // offlineSync queue in src/utils/offlineSync.ts instead.
    {
      urlPattern: ({ url, request }: { url: URL; request: Request }) =>
        /\/api\/(budget|expenses|groups|settlements|friends|activity|notifications)/.test(
          url.pathname
        ) && request.method === "GET",
      handler: "NetworkFirst",
      options: {
        cacheName: "settlemint-api",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
        networkTimeoutSeconds: 8,
        cacheableResponse: { statuses: [200] },
      },
    },
    // Cache Google Fonts
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "google-fonts-stylesheets" },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // Cache static assets
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "static-images",
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
