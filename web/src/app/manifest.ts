import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/home",
    name: "SettleMint",
    short_name: "SettleMint",
    description: "Split bills with anyone, in any currency. Fair to the cent.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f14",
    theme_color: "#0b0f14",
    categories: ["finance", "productivity", "travel"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", url: "/home?add=1", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Groups", url: "/groups", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
