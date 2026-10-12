/**
 * Opportune Service Worker — offline-first caching strategy.
 *
 * - Cache-first for static assets (icons, fonts, images)
 * - Network-first with cache fallback for navigation (HTML pages)
 * - Stale-while-revalidate for Next.js static chunks (_next/static)
 * - Bypass: Firebase, Firestore, and API routes are always fetched live
 */

const CACHE_NAME = "opportune-v1";
const STATIC_ASSETS = [
  "/",
  "/feed",
  "/manifest.webmanifest",
  "/logo_bg.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/animations/loading.json",
];

// Install: pre-cache core shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: remove old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: routing strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always bypass: Firebase, Firestore, API routes, and external origins
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("cloudinary.com") ||
    url.pathname.startsWith("/api/") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Next.js static chunks: stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            cache.put(request, copy).catch(() => {});
          }
          return response;
        });
        return cached ?? networkFetch;
      }),
    );
    return;
  }

  // Navigation requests: network-first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Static assets (icons, images, fonts): cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        }),
    ),
  );
});
