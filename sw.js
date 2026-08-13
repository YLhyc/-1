const CACHE = 'kv-2.0.16';
const APP_SHELL = [
  'index.html',
  'review-core.js?v=2.0.16',
  'focus-core.js?v=2.0.16',
  'study-copy.js?v=2.0.16',
  'audio-cache.js?v=2.0.16',
  'ui-motion.js?v=2.0.16',
  'hongbaoshu.json?v=2.0.16',
  'manifest.json',
  'hb/index.html',
  'uf/index.html',
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
  const pathname = new URL(request.url).pathname;
  let fallback = 'index.html';
  if (/\/hb\/(?:index\.html)?$/.test(pathname)) fallback = 'hb/index.html';
  else if (/\/uf\/(?:index\.html)?$/.test(pathname)) fallback = 'uf/index.html';
  else if (/\/wordbank\/(?:index\.html)?$/.test(pathname)) fallback = 'wordbank/index.html';
  return caches.open(CACHE)
    .then(cache => cache.match(request)
      .then(cached => cached || cache.match(fallback)))
    .then(cached => cached || caches.match(request))
    .then(cached => cached || caches.match(fallback));
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
        cache.match('index.html'),
        cache.match('review-core.js?v=2.0.16'),
        cache.match('focus-core.js?v=2.0.16'),
        cache.match('study-copy.js?v=2.0.16'),
        cache.match('audio-cache.js?v=2.0.16'),
        cache.match('ui-motion.js?v=2.0.16'),
        cache.match('hongbaoshu.json?v=2.0.16')
      ]))
      .then(shell => shell.every(Boolean)
        ? caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
        : null)
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  const isSameOrigin = u.origin === self.location.origin;
  const isAudioBundle = /\/audio_g\d+\.json$/.test(u.pathname) || /\/hb\/audio_unit\d+\.json$/.test(u.pathname);
  const isCoreData = /\/hongbaoshu\.json$/.test(u.pathname);
  // Large audio bundles are cache-first. The page keeps only the most recent bounded set.
  if (isAudioBundle) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (!r.ok) return r;
      if (isSameOrigin) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
      return r;
    })));
    return;
  }
  // Core review data must open immediately on weak networks and remain usable
  // offline. Refresh a cached copy in the background when possible.
  if (isCoreData) {
    const networkPromise = fetch(e.request).then(r => {
      if (!r.ok) return r;
      if (isSameOrigin) {
        const copy = r.clone();
        return caches.open(CACHE).then(cache => cache.put(e.request, copy)).then(() => r);
      }
      return r;
    });
    e.waitUntil(networkPromise.then(() => null, () => null));
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true })
        .then(cached => cached || networkPromise)
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
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
