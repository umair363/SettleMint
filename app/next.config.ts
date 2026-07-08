import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

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
    // Cache API responses for budget/expense data
    {
      urlPattern: /^https:\/\/settlemint\.onrender\.com\/api\/budget/,
      handler: "NetworkFirst",
      options: {
        cacheName: "budget-api",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/settlemint\.onrender\.com\/api\/expenses/,
      handler: "NetworkFirst",
      options: {
        cacheName: "expenses-api",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/settlemint\.onrender\.com\/api\/groups/,
      handler: "NetworkFirst",
      options: {
        cacheName: "groups-api",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
        networkTimeoutSeconds: 10,
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

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
