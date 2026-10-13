/* global __ASSETS__ */
/* Invoicyfy service worker: keeps the app itself on the device so it opens and bills without internet.
 * The API (/api/...) is never cached here — offline bills go to the app's own outbox instead.
 * __BUILD__ and __ASSETS__ are filled in at build time (vite.config.js). */
const VERSION = "__BUILD__";
const CACHE = `invoicyfy-app-${VERSION}`;
const ASSETS = __ASSETS__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["./", ...ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("invoicyfy-app-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isApi = (url) => /\/api\//.test(url.pathname) || url.pathname.endsWith(".php");

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || isApi(url)) return;

  // Pages: always try the network first so a new version shows up; the saved copy is used when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./", copy));
          }
          return res;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Built files have a hash in their name, so a saved copy is always right.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
