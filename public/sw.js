const CACHE = 'qrious-v1';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only intercept same-origin GETs; let Supabase/CDN calls hit the network
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Network-first for HTML, cache-first for static assets
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const clone = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((r) => {
        if (r.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
          const clone = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return r;
      })
    )
  );
});
