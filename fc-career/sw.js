const CACHE = "fc-career-v2026-08-11-5";
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

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const registryResponse = await fetch("./src/asset-registry.js");
    const registryText = await registryResponse.text();
    const publicAssets = [...registryText.matchAll(/\"path\":\s*\"([^\"]+)\"/g)].map((match) => match[1]);
    await cache.addAll([...new Set([...ASSETS, ...publicAssets])]);
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
