const CACHE_NAME = "pu-agent-v2";
const STATIC_ASSETS = ["/", "/index.html", "/icons.svg", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (e.request.method !== "GET" || !sameOrigin) {
    return; // let the browser handle it normally
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (e.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
      return cached || networkFetch;
    })
  );
});
