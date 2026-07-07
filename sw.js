const CACHE = 'kv-20260707-154116';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const isSameOrigin = u.origin === self.location.origin;
  // Network-first for JSON / daily-reports: always try network, fall back to cache
  // Skip caching URLs with ?t= cache-busters to prevent storage bloat
  if (u.pathname.endsWith('.json') || u.pathname.includes('/daily/')) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (!r.ok) return r;
        if (isSameOrigin && u.search.indexOf('t=') === -1) {
          const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        if (!r.ok) return r;
        if (isSameOrigin) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
        return r;
      })
      .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
        if (!r.ok) return r;
        if (isSameOrigin) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
        return r;
      }))
    );
  }
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
