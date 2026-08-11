const CACHE = "fc-career-v2026-08-11-7";
const ASSETS = [
  "./",
  "./index.html",
  "./version.json",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./src/app.js",
  "./src/content.js",
  "./src/engine.js",
  "./src/store.js",
  "./src/data.js",
  "./src/fm-mappings.js",
  "./src/club-data.js",
  "./src/source-manifest.js",
  "./src/squads.js",
  "./src/asset-registry.js",
  "./src/assets.js",
  "./src/nations.js",
  "./src/nation-refs.js",
  "./src/flag-manifest.js",
  "./src/honors.js",
  "./src/private-assets.js",
  "./src/career.js",
  "./src/systems.js",
  "./src/ai.js",
  "./src/audio.js"
];

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw lastError || new Error(`fetch failed for ${url}`);
}

async function cacheUrls(cache, urls, concurrency = 64) {
  let index = 0;
  async function worker() {
    while (index < urls.length) {
      const url = urls[index];
      index += 1;
      const response = await fetchWithRetry(url);
      await cache.put(new Request(url, { cache: "reload" }), response);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const registryResponse = await fetchWithRetry("./src/asset-registry.js");
    const registryText = await registryResponse.text();
    const publicAssets = [...registryText.matchAll(/\"path\":\s*\"([^\"]+)\"/g)].map((match) => match[1]);
    const offlineVisualAssets = publicAssets.filter((asset) => (
      /^\.\/assets\/(flags|clubs|competitions|continents|awards|portraits|associations)\//.test(asset)
      || /^\.\/assets\/flags\/(manifest\.json|LICENSE|SOURCE\.md)$/.test(asset)
    ));
    await cacheUrls(cache, [...new Set([...ASSETS, ...offlineVisualAssets])]);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("fc-career-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: "FC_CAREER_UPDATE" })))
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request))
  );
});
