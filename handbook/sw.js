// Service Worker v4.9.0 - 2027 考研政治核心背诵笔记 (PWA 生产版)
const CACHE_NAME = 'kyzz-cache-v4.9.0';

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
            console.log('[SW v4.9.0] Deleting obsolete cache:', key);
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

  // 3. 页面主导航与 HTML/版本信息：Network-First（网络优先，更新缓存，离线降级）
  const isNavigation = event.request.mode === 'navigate';
  const isHtml = url.endsWith('/') || url.includes('index.html') || url.includes('version.json');

  if (isNavigation || isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. 其余静态资源同样优先网络，网络失败才降级读取缓存
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.startsWith(self.location.origin)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
