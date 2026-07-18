const CACHE = 'kv-20260718-090533';
const APP_SHELL = [
  './',
  'index.html',
  'review-core.js?v=20260718-090533',
  'audio-cache.js?v=20260718-090533',
  'ui-motion.js?v=20260718-090533',
  'manifest.json',
  'hb/',
  'hb/index.html',
  'uf/',
  'uf/index.html',
  'wordbank/',
  'wordbank/index.html',
  'icons/words-180.png',
  'icons/words-192.png',
  'icons/words-512.png'
];
function cacheAppShell() {
  return caches.open(CACHE).then(cache =>
    Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null)))
  );
}
function matchNavigation(request) {
  return caches.open(CACHE)
    .then(cache => cache.match(request)
      .then(cached => cached || cache.match('./'))
      .then(cached => cached || cache.match('index.html')))
    .then(cached => cached || caches.match(request))
    .then(cached => cached || caches.match('./'))
    .then(cached => cached || caches.match('index.html'));
}
self.addEventListener('install', e => {
  e.waitUntil(
    cacheAppShell()
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all([
        cache.match('./'),
        cache.match('index.html'),
        cache.match('review-core.js?v=20260718-090533'),
        cache.match('audio-cache.js?v=20260718-090533'),
        cache.match('ui-motion.js?v=20260718-090533')
      ]))
      .then(shell => (shell[0] || shell[1]) && shell[2] && shell[3] && shell[4]
        ? caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
        : null)
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const isSameOrigin = u.origin === self.location.origin;
  const isAudioBundle = /\/audio_g\d+\.json$/.test(u.pathname) || /\/hb\/audio_unit\d+\.json$/.test(u.pathname);
  // Large audio bundles are cache-first. The page keeps only the most recent bounded set.
  if (isAudioBundle) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (!r.ok) return r;
      if (isSameOrigin) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
      return r;
    })));
    return;
  }
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
    // Show the cached app immediately, then refresh it in the background.
    const networkPromise = fetch(e.request).then(r => {
      if (!r.ok || !isSameOrigin) return r;
      const copy = r.clone();
      return caches.open(CACHE)
        .then(cache => cache.put(e.request, copy))
        .catch(() => null)
        .then(() => r);
    });
    e.waitUntil(networkPromise.then(() => null, () => null));
    e.respondWith(
      matchNavigation(e.request)
        .then(cached => cached || networkPromise)
        .catch(() => matchNavigation(e.request))
        .then(response => response || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
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
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data && e.data.type === 'getVersion' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ cache: CACHE });
  }
});
