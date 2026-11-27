const CACHE_NAME = 'politics-quiz-pwa-v3';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './data/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL_ASSETS);
      try {
        const res = await fetch('./data/manifest.json', { cache: 'no-cache' });
        if (res.ok) {
          const manifest = await res.json();
          const paperUrls = (manifest.papers || []).map((p) => `./data/papers/${p.paper_id}.json`);
          await Promise.all(
            paperUrls.map((url) =>
              fetch(url).then((r) => (r.ok ? cache.put(url, r) : null)).catch(() => null)
            )
          );
        }
      } catch (err) {
        // 离线安装回退忽略
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavOrManifest = req.mode === 'navigate' || url.pathname.endsWith('/manifest.json');

  if (isNavOrManifest) {
    // 导航与目录优先走网络保证更新及时，断网立即回退缓存
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源与试卷 JSON：优先命中缓存，同时后台静默刷新
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return resp;
      });
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }
      return networkFetch;
    })
  );
});
