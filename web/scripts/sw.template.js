/* SettleMint service worker. Generated at build time by scripts/build-sw.mjs,
 * which fills in the build hash and the list of built files below. Only
 * same-origin requests are handled; the API is on its own origin and its data
 * is cached by the app itself (IndexedDB). */
const VERSION = "%%VERSION%%";
const PRECACHE = /*%%PRECACHE%%*/ [];
// Cached on first use (other languages, extra fonts) and kept across updates.
const LAZY = /*%%LAZY%%*/ [];
const CACHE = `settlemint-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const old = names.filter((n) => n.startsWith("settlemint-") && n !== CACHE);
      // Carry over files fetched on first use that this version still has
      // (hashed names, so identical), e.g. the person's language: offline after
      // an update keeps working in their language.
      const current = await caches.open(CACHE);
      for (const name of old) {
        const previous = await caches.open(name);
        for (const url of LAZY) {
          const hit = await previous.match(url);
          if (hit) await current.put(url, hit);
        }
      }
      await Promise.all(old.map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

// The page asks the waiting worker to take over when the person taps "Update".
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/** "/group?id=x" -> "/group.html"; "/" -> "/index.html". Static export file names. */
function pageFile(url) {
  const path = url.pathname.replace(/\/+$/, "") || "/index";
  return path.endsWith(".html") ? path : `${path}.html`;
}

async function fromCache(request, fallbackPath) {
  const cache = await caches.open(CACHE);
  return (
    (await cache.match(request, { ignoreSearch: true })) ||
    (fallbackPath ? await cache.match(fallbackPath) : undefined)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first (always fresh when online), saved copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const response = await fetch(request, { signal: controller.signal });
          clearTimeout(timer);
          return response;
        } catch {
          return (
            (await fromCache(new Request(pageFile(url)))) ||
            (await fromCache(new Request("/home.html"))) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await fromCache(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Everything else (route payloads, icons): saved copy now, refresh in the background.
  event.respondWith(
    (async () => {
      const cached = await fromCache(request);
      const network = fetch(request)
        .then(async (response) => {
          if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
          return response;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    })(),
  );
});

// ─── Notifications ──────────────────────────────────────────────────────────
// Every push must show something (browsers revoke silent pushes). Same-group
// notifications replace each other via `tag`, so a busy evening is one card.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "SettleMint", {
      body: data.body || "Something changed in one of your groups.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/home", self.location.origin);
  // Only ever open our own pages.
  const url = target.origin === self.location.origin ? target.href : new URL("/home", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
