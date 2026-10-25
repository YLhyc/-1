// 考研政治背诵手卷 · 极速离线 PWA Service Worker (V4 自动感知与实时更新)
const CACHE_NAME = 'kyzz-handbook-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW pre-caching partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 0. 版本检测清单绝不走缓存 (每次强制穿透网络)
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // 1. 核心加速：iOS/手机桌面 PWA 启动瞬间的主文档导航 (0ms 离线快照，绝无白屏)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cachedIndex) => {
        // 后台静默发起网络拉取以更新缓存 (Stale-While-Revalidate)，绝不阻塞当前界面秒开
        const networkFetch = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./index.html', responseClone);
            });
          }
          return networkResponse;
        }).catch(() => null);

        // 如果本地已预存，0ms 瞬间返给浏览器；未预存时回退网络
        return cachedIndex || networkFetch || fetch(event.request);
      })
    );
    return;
  }

  // 2. 静态资源（图标、manifest、样式等）：Cache-First 策略，忽略 URL 上的 hash 或 query 干扰
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        return cachedResponse;
      });
    })
  );
});
