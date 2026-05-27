// =============================================================================
// EOD FLOW — Service Worker (PWA Offline Support)
// ─── PERF: Optimized caching strategies ──────────────────────────────────────
//   • Cache-first for _next/static (hashed, immutable)
//   • Stale-while-revalidate for API responses
//   • Network-first for navigation (HTML pages)
// =============================================================================

const CACHE_NAME = "eod-flow-v3";
const STATIC_CACHE = "eod-flow-static-v1";
const OFFLINE_URL = "/offline";

// App shell files to pre-cache
const PRECACHE_URLS = [
  "/",
  "/overview",
  "/offline",
  "/manifest.json",
];

// Install: Pre-cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  const KEEP = [CACHE_NAME, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: Strategy-based caching
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (Google Fonts, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip auth routes (never cache auth flows)
  if (url.pathname.startsWith("/api/auth/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  // ─── Strategy 1: Cache-first for _next/static (hashed, immutable) ────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // ─── Strategy 2: Stale-while-revalidate for API responses ────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request)
            .then((response) => {
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } }));

          // Return cached immediately, update in background
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // ─── Skip _next/data (RSC payloads) ──────────────────────────────────────
  if (url.pathname.startsWith("/_next/data/")) {
    return;
  }

  // ─── Strategy 3: Network-first for navigation (HTML pages) ───────────────
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful navigation responses
        if (response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Serve from cache or offline page
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, show offline page
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("", { status: 503 });
        });
      })
  );
});

// ─── Push notification handler ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "eod-flow-" + Date.now(),
      data: { url: data.url || "/overview" },
      // Vibration pattern for mobile (buzz-pause-buzz)
      vibrate: [200, 100, 200],
      // Keep notification visible until user interacts (critical for reminders)
      requireInteraction: true,
      timestamp: data.timestamp || Date.now(),
      actions: [
        { action: "open", title: "OPEN" },
        { action: "dismiss", title: "DISMISS" },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "EOD Flow", options)
    );
  } catch {
    // Silently fail for malformed push data
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/overview";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if one is open with the app
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new tab
      return self.clients.openWindow(url);
    })
  );
});
