/* SettleMint service worker. Generated at build time by scripts/build-sw.mjs,
 * which fills in the build hash and the list of built files below. Only
 * same-origin requests are handled; the API is on its own origin and its data
 * is cached by the app itself (IndexedDB). */
const VERSION = "%%VERSION%%";
const PRECACHE = /*%%PRECACHE%%*/ [];
const CACHE = `settlemint-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("settlemint-") && n !== CACHE).map((n) => caches.delete(n)));
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
