/*
 * StudentMind service worker.
 *
 * Goal: the breathing exercises and the "Urgent help" page keep working with no network.
 *  - Pages are fetched network-first and the last good copy is kept, so any page visited once is
 *    available offline; the pages in PRECACHE (sent by the app) are stored right after install.
 *  - Hashed build assets (/_next/static) are cached forever; icons and fonts are refreshed in the
 *    background.
 *  - Next.js client-side navigations (RSC payloads) are never cached: they share a URL with the
 *    HTML page and would corrupt it. When one fails offline, Next falls back to a normal page load,
 *    which this worker answers from the cache.
 * Bump VERSION to drop every old cache.
 */
const VERSION = "v1";
const STATIC = `sm-static-${VERSION}`;
const PAGES = `sm-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isRsc = (request, url) => request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, analytics: never intercepted
  if (url.pathname.startsWith("/auth/callback") || url.pathname.startsWith("/api/")) return;
  if (isRsc(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (/\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
    return cached || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

/** Fetches a page and every build asset it references, so it renders fully offline. */
async function precache(path) {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(STATIC);
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) return;
  await pages.put(path, response.clone());
  const html = await response.text();
  const found = new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []);
  await Promise.all(
    [...found].map(async (asset) => {
      if (await assets.match(asset)) return;
      try {
        const res = await fetch(asset);
        if (res.ok) await assets.put(asset, res);
      } catch {
        // A missing asset only means that one page may not be fully available offline.
      }
    }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "PRECACHE" || !Array.isArray(data.urls)) return;
  const paths = data.urls.filter((u) => typeof u === "string" && u.startsWith("/") && !u.startsWith("//"));
  event.waitUntil(Promise.allSettled(paths.map(precache)));
});
