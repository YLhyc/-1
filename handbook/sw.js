// Service Worker v4.5.0 - 2027 考研政治核心背诵笔记 (PWA 生产版)
const CACHE_NAME = 'kyzz-cache-v4.5.0';

// 核心离线静态资源白名单
const CORE_ASSETS = [
  './',
  './index.html',
  './version.json',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 1. 完全放行所有非 GET 请求
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 2. 核心豁免：对于所有音频文件 (*.mp3) 及带 Range 请求头的分片播放请求，直接走网络
  if (url.includes('.mp3') || url.includes('/audio_') || event.request.headers.has('range')) {
    return;
  }

  // 3. 网络优先，失败后降级读取缓存 (Network-first with Cache Fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});
