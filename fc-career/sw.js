let CACHE = null;
const ASSETS = [
  "./",
  "./index.html",
  "./version.json",
  "./styles.css",
  "./manifest.webmanifest",
  "./sw-fallback.js",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./src/app.js",
  "./src/update.js",
  "./src/version.js",
  "./src/content.js",
  "./src/engine.js",
  "./src/store.js",
  "./src/data.js",
  "./src/fm-mappings.js",
  "./src/club-data.js",
  "./src/source-manifest.js",
  "./src/squads.js",
  "./src/real-squads.js",
  "./src/asset-registry.js",
  "./src/assets.js",
  "./src/nations.js",
  "./src/nation-refs.js",
  "./src/flag-manifest.js",
  "./src/honors.js",
  "./src/private-assets.js",
  "./src/career.js",
  "./src/narrative.js",
  "./src/systems.js",
  "./src/ai.js",
  "./src/audio.js"
];

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function versionFromScriptUrl() {
  try {
    const params = new URL(self.location.href).searchParams;
    const version = params.get("v");
    return VERSION_PATTERN.test(version || "") ? version : null;
  } catch {
    return null;
  }
}

async function resolveCacheName() {
  const scriptVersion = versionFromScriptUrl();
  if (scriptVersion) return `fc-career-${scriptVersion}`;
  const response = await fetchWithRetry(`./version.json?t=${Date.now()}`, { cache: "no-store" });
  const payload = await response.json();
  if (!payload || !VERSION_PATTERN.test(payload.version)) {
    throw new Error(`invalid version metadata: ${payload?.version}`);
  }
  return `fc-career-${payload.version}`;
}

async function fetchWithRetry(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
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
    CACHE = await resolveCacheName();
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

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_VERSION" && event.ports?.[0]) {
    event.ports[0].postMessage({ version: CACHE ? CACHE.replace(/^fc-career-/, "") : null });
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!CACHE) {
    event.respondWith(fetch(event.request));
    return;
  }
  const cacheUrl = new URL(event.request.url);
  cacheUrl.search = "";
  const cacheRequest = new Request(cacheUrl.href, { method: "GET" });
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(cacheRequest, copy));
      return response;
    }).catch(() => caches.match(cacheRequest))
  );
});
