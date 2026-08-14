import { registerPrivateAssets, clearPrivateAssets, unregisterPrivateAssets } from "./assets.js";
import { mappingForPrivateAsset, privateAssetPath, LEGACY_FM_ALIASES } from "./fm-mappings.js";

export const PRIVATE_ASSET_DB = "fc-career-private-assets";
export const PRIVATE_ASSET_STORE = "assets";
export const PRIVATE_ASSET_SCHEMA = 1;
export const PRIVATE_ZIP_LIMITS = Object.freeze({ maxFiles: 2048, maxFileBytes: 12 * 1024 * 1024, maxTotalBytes: 64 * 1024 * 1024 });

const ALLOWED_EXTENSIONS = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"]
]);

function viewOf(bytes) {
  return bytes instanceof DataView ? bytes : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function u16(bytes, offset) { return viewOf(bytes).getUint16(offset, true); }
function u32(bytes, offset) { return viewOf(bytes).getUint32(offset, true); }

function bytesOf(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  return null;
}

async function toBytes(input) {
  const direct = bytesOf(input);
  if (direct) return direct;
  if (input?.arrayBuffer) return new Uint8Array(await input.arrayBuffer());
  throw new TypeError("private ZIP must be an ArrayBuffer, Uint8Array or Blob");
}

function textOf(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function safePath(name) {
  const value = String(name || "");
  if (!value || value.includes("\0") || value.includes("\\") || /^[A-Za-z]:/.test(value) || value.startsWith("/") || value.startsWith("\\")) throw new Error("ZIP contains an unsafe path");
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error("ZIP contains an unsafe path");
  return parts.join("/");
}

function mimeFor(name) {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  const mime = ALLOWED_EXTENSIONS.get(extension);
  if (!mime) throw new Error("ZIP contains a non-image asset");
  return mime;
}

function validateMagic(bytes, mime) {
  if (mime === "image/png" && !(bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)) throw new Error("asset MIME does not match PNG bytes");
  if (mime === "image/jpeg" && !(bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) throw new Error("asset MIME does not match JPEG bytes");
  if (mime === "image/webp" && !(bytes.length >= 12 && textOf(bytes.slice(0, 4)) === "RIFF" && textOf(bytes.slice(8, 12)) === "WEBP")) throw new Error("asset MIME does not match WebP bytes");
  if (mime === "image/svg+xml" && !/^\uFEFF?\s*<svg[\s>]/i.test(textOf(bytes.slice(0, 512)))) throw new Error("asset MIME does not match SVG bytes");
}

function findEndRecord(bytes) {
  const start = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (u32(bytes, offset) === 0x06054b50) return offset;
  }
  throw new Error("ZIP end record is missing");
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "function") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const { inflateRawSync } = await import("node:zlib");
  return new Uint8Array(inflateRawSync(bytes));
}

async function sha256(bytes) {
  const subtle = globalThis.crypto?.subtle || (await import("node:crypto")).webcrypto.subtle;
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function readZipEntries(input, limits = PRIVATE_ZIP_LIMITS) {
  const bytes = await toBytes(input);
  const end = findEndRecord(bytes);
  const count = u16(bytes, end + 10);
  const centralSize = u32(bytes, end + 12);
  const centralOffset = u32(bytes, end + 16);
  if (!count || count > limits.maxFiles || centralOffset + centralSize > bytes.length) throw new Error("ZIP file count or directory is invalid");
  const result = [];
  const names = new Set();
  let cursor = centralOffset;
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (u32(bytes, cursor) !== 0x02014b50) throw new Error("ZIP central directory is invalid");
    const method = u16(bytes, cursor + 10);
    const compressedSize = u32(bytes, cursor + 20);
    const uncompressedSize = u32(bytes, cursor + 24);
    const nameLength = u16(bytes, cursor + 28);
    const extraLength = u16(bytes, cursor + 30);
    const commentLength = u16(bytes, cursor + 32);
    const localOffset = u32(bytes, cursor + 42);
    const name = safePath(textOf(bytes.slice(cursor + 46, cursor + 46 + nameLength)));
    if (names.has(name)) throw new Error("ZIP contains duplicate paths");
    names.add(name);
    if (uncompressedSize > limits.maxFileBytes || totalBytes + uncompressedSize > limits.maxTotalBytes) throw new Error("ZIP exceeds the private asset size limit");
    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw new Error("ZIP local file header is invalid");
    const localNameLength = u16(bytes, localOffset + 26);
    const localExtraLength = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) throw new Error("ZIP entry is truncated");
    const compressed = bytes.slice(dataStart, dataEnd);
    let content;
    if (method === 0) content = compressed;
    else if (method === 8) content = await inflateRaw(compressed);
    else throw new Error("ZIP compression method is unsupported");
    if (content.length !== uncompressedSize) throw new Error("ZIP entry size does not match its directory");
    result.push({ name, bytes: content, compressedSize, method, crc32: u32(bytes, cursor + 16) });
    totalBytes += content.length;
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

async function manifestRecords(manifest, entries) {
  if (!manifest || manifest.version !== "fc-private-assets-v2" || !Array.isArray(manifest.matches)) throw new Error("private asset manifest is invalid");
  const files = new Map(entries.map((entry) => [entry.name, entry]));
  const records = [];
  const referenced = new Set(["manifest.json"]);
  for (const match of manifest.matches) {
    const allowed = ["type", "target", "fmId", "variant", "hash", "bytes"];
    if (!match || Object.keys(match).some((key) => !allowed.includes(key))) throw new Error("private asset manifest contains forbidden metadata");
    if (!/^(club|kit|competition|nation|continent)$/.test(String(match.type || "")) || !/^[a-z0-9-]+$/.test(String(match.target || "")) || !/^\d+$/.test(String(match.fmId)) || !/^[a-f0-9]{64}$/i.test(String(match.hash || "")) || !Number.isInteger(match.bytes) || match.bytes < 8) throw new Error("private asset manifest has no exact typed FM target");
    const mapping = mappingForPrivateAsset(match.type, match.target);
    const legacyAliases = LEGACY_FM_ALIASES[`${match.type}:${match.target}`] || [];
    const legacyFmId = mapping.status === "verified" && legacyAliases.includes(String(match.fmId)) && String(match.fmId) !== mapping.fmId;
    if (mapping.status !== "verified" || (mapping.fmId !== String(match.fmId) && !legacyFmId)) throw new Error("private asset manifest target/type/FM ID does not match the verified mapping");
    const expectedPath = privateAssetPath(match.type, match.target, match.variant || null);
    const file = files.get(expectedPath);
    if (!file) throw new Error("private asset manifest references a missing file");
    referenced.add(expectedPath);
    const mime = mimeFor(expectedPath);
    validateMagic(file.bytes, mime);
    const hash = await sha256(file.bytes);
    if (hash !== String(match.hash || "").toLowerCase()) throw new Error("private asset hash verification failed");
    if (file.bytes.length !== match.bytes) throw new Error("private asset byte size verification failed");
    records.push({
      assetId: `private-${match.type}-${match.fmId}-${match.variant || "default"}`,
      fmId: String(match.fmId),
      type: match.type,
      variant: match.variant || null,
      role: match.type === "nation" ? (match.variant === "flag" ? "flag" : "association") : undefined,
      hash,
      mime,
      bytes: file.bytes,
      target: match.target,
      ...(legacyFmId ? { legacyFmId: true, currentFmId: mapping.fmId } : {})
    });
  }
  if (entries.some((entry) => !referenced.has(entry.name))) throw new Error("private asset ZIP contains an unmanifested file");
  return records;
}

export async function parsePrivateZip(input, limits = PRIVATE_ZIP_LIMITS) {
  const entries = await readZipEntries(input, limits);
  const manifestEntry = entries.find((entry) => entry.name === "manifest.json");
  if (!manifestEntry) throw new Error("private asset manifest is missing");
  const manifest = JSON.parse(textOf(manifestEntry.bytes));
  return { manifest, records: await manifestRecords(manifest, entries) };
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

export function openPrivateAssetDb(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl) return Promise.reject(new Error("IndexedDB is unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(PRIVATE_ASSET_DB, PRIVATE_ASSET_SCHEMA);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PRIVATE_ASSET_STORE)) db.createObjectStore(PRIVATE_ASSET_STORE, { keyPath: "assetId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

export async function importPrivateZip(input, options = {}) {
  const parsed = await parsePrivateZip(input, options.limits || PRIVATE_ZIP_LIMITS);
  const db = await openPrivateAssetDb(options.indexedDB || globalThis.indexedDB);
  const records = parsed.records.map((record) => ({ ...record, blob: new Blob([record.bytes], { type: record.mime }), bytes: undefined, importedAt: new Date().toISOString() }));
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(PRIVATE_ASSET_STORE, "readwrite");
    const store = transaction.objectStore(PRIVATE_ASSET_STORE);
    store.clear();
    for (const record of records) store.put(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("private asset transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("private asset transaction aborted"));
  }).catch((error) => {
    try { db.close(); } catch {}
    throw error;
  });
  try { db.close(); } catch {}
  return { version: parsed.manifest.version, imported: records.length, records: records.map(({ bytes, blob, ...record }) => record) };
}

export async function loadPrivateAssets(options = {}) {
  const db = await openPrivateAssetDb(options.indexedDB || globalThis.indexedDB);
  const rows = await new Promise((resolve, reject) => {
    const transaction = db.transaction(PRIVATE_ASSET_STORE, "readonly");
    const request = transaction.objectStore(PRIVATE_ASSET_STORE).getAll();
    requestToPromise(request).then(resolve, reject);
  });
  try { db.close(); } catch {}
  const urlApi = options.urlApi || globalThis.URL;
  const records = rows.map((row) => {
    const src = urlApi.createObjectURL(row.blob);
    return { ...row, src, path: src };
  });
  clearPrivateAssets();
  registerPrivateAssets(records);
  return records;
}

export async function clearPrivateAssetDb(options = {}) {
  clearPrivateAssets();
  const indexedDBImpl = options.indexedDB || globalThis.indexedDB;
  if (!indexedDBImpl) return;
  await new Promise((resolve, reject) => {
    const request = indexedDBImpl.deleteDatabase(PRIVATE_ASSET_DB);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
    request.onerror = () => reject(request.error || new Error("IndexedDB delete failed"));
  });
}

// ---------------------------------------------------------------------------
// 公网 FM 资源同步（S3）：PWA 核心先启动，资源小批量后台下载。
// 校验 SHA-256 后写入 IndexedDB；支持进度、暂停/继续、失败重试、断点续传（Range）、
// 清除、刷新复用（bundleVersion 不变则直接复用）与离线回退（SW 不预缓存 fm-assets，
// 离线展示全部来自 IndexedDB Blob URL）。约 30MB 图片绝不进入 SW 安装预缓存。
// ---------------------------------------------------------------------------

export const PUBLIC_FM_DB = "fc-career-public-fm-assets";
export const PUBLIC_FM_STORE = "assets";
export const PUBLIC_FM_META_STORE = "meta";
export const PUBLIC_FM_SCHEMA = 1;
export const PUBLIC_FM_MANIFEST_URL = "./fm-assets/manifest.json";
export const PUBLIC_FM_ITEM_KEYS = Object.freeze(["url", "type", "target", "variant", "fmId", "bytes", "sha256"]);
export const PUBLIC_FM_TYPES = Object.freeze(["club", "kit", "competition", "nation"]);

const PUBLIC_FM_META_KEY = "sync-meta";
const PUBLIC_FM_META_DEFAULTS = Object.freeze({
  bundleVersion: 0,
  progressIndex: 0,
  paused: false,
  done: Object.create(null),
  failed: Object.create(null),
  partials: Object.create(null)
});

export function openPublicFmDb(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl) return Promise.reject(new Error("IndexedDB is unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(PUBLIC_FM_DB, PUBLIC_FM_SCHEMA);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PUBLIC_FM_STORE)) db.createObjectStore(PUBLIC_FM_STORE, { keyPath: "assetId" });
      if (!db.objectStoreNames.contains(PUBLIC_FM_META_STORE)) db.createObjectStore(PUBLIC_FM_META_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
}

function publicFmTx(db, storeName, mode) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    transaction.oncomplete = () => resolve(store);
    transaction.onerror = () => reject(transaction.error || new Error("transaction failed"));
    transaction.onabort = () => reject(transaction.error || new Error("transaction aborted"));
  });
}

async function publicFmMetaRead(db) {
  const store = await publicFmTx(db, PUBLIC_FM_META_STORE, "readonly");
  const value = await requestToPromise(store.get(PUBLIC_FM_META_KEY));
  const merged = { ...PUBLIC_FM_META_DEFAULTS, ...(value?.value || {}) };
  merged.done = { ...(PUBLIC_FM_META_DEFAULTS.done), ...(value?.value?.done || {}) };
  merged.failed = { ...(PUBLIC_FM_META_DEFAULTS.failed), ...(value?.value?.failed || {}) };
  merged.partials = { ...(PUBLIC_FM_META_DEFAULTS.partials), ...(value?.value?.partials || {}) };
  return merged;
}

async function publicFmMetaWrite(db, meta) {
  const store = await publicFmTx(db, PUBLIC_FM_META_STORE, "readwrite");
  await requestToPromise(store.put({ key: PUBLIC_FM_META_KEY, value: meta }));
}

export function validatePublicFmManifest(manifest) {
  if (!manifest || !Number.isInteger(manifest.bundleVersion) || manifest.bundleVersion < 1) {
    throw new Error("public fm-assets manifest has invalid bundleVersion");
  }
  if (!Array.isArray(manifest.items) || !manifest.items.length) throw new Error("public fm-assets manifest has no items");
  const seen = new Set();
  for (const item of manifest.items) {
    if (!item || typeof item !== "object") throw new Error("public fm-assets manifest has a non-object item");
    if (Object.keys(item).some((key) => !PUBLIC_FM_ITEM_KEYS.includes(key))) throw new Error("public fm-assets item contains forbidden metadata");
    if (!PUBLIC_FM_TYPES.includes(item.type)) throw new Error(`public fm-assets item has invalid type: ${item.type}`);
    if (item.type === "nation" && item.variant !== "association") throw new Error("public fm-assets nation item must be association, never flag");
    if (!/^[a-z0-9-]+$/.test(String(item.target || ""))) throw new Error("public fm-assets item has invalid target");
    if (!/^\d+$/.test(String(item.fmId))) throw new Error("public fm-assets item has invalid fmId");
    if (!/^[a-f0-9]{64}$/i.test(String(item.sha256 || ""))) throw new Error("public fm-assets item has invalid sha256");
    if (!Number.isInteger(item.bytes) || item.bytes < 8) throw new Error("public fm-assets item has invalid bytes");
    if (!/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\.png$/.test(String(item.url || ""))) throw new Error("public fm-assets item has unsafe url");
    const key = `${item.url}`;
    if (seen.has(key)) throw new Error(`public fm-assets manifest has duplicate url: ${key}`);
    seen.add(key);
  }
  return manifest;
}

export async function fetchPublicFmManifest(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const response = await fetchImpl(`${PUBLIC_FM_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store", signal: options.signal });
  if (!response.ok) throw new Error(`public fm-assets manifest fetch failed: HTTP ${response.status}`);
  return validatePublicFmManifest(await response.json());
}

function blobFromChunks(chunks) {
  return new Blob(chunks.map((chunk) => chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)));
}

async function publicFmFetchRange(fetchImpl, url, received, signal) {
  const headers = received > 0 ? { Range: `bytes=${received}-` } : {};
  const response = await fetchImpl(url, { headers, cache: "no-store", signal });
  if (!response.ok && response.status !== 206) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

export async function syncPublicFmAssets(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const urlApi = options.urlApi || globalThis.URL;
  const concurrency = options.concurrency || 3;
  const maxAttempts = options.maxAttempts || 3;
  const db = await openPublicFmDb(options.indexedDB || globalThis.indexedDB);
  const meta = await publicFmMetaRead(db);
  try {
    const manifest = options.manifest || await fetchPublicFmManifest({ fetchImpl, signal: options.signal });
    validatePublicFmManifest(manifest);
    if (meta.bundleVersion === manifest.bundleVersion && !options.force && !meta.paused) {
      await publicFmMetaWrite(db, { ...meta, paused: false });
      options.onProgress?.({ phase: "reuse", done: Object.keys(meta.done).length, total: manifest.items.length, failed: Object.keys(meta.failed).length, bundleVersion: manifest.bundleVersion });
      return { status: "reused", bundleVersion: manifest.bundleVersion, done: Object.keys(meta.done).length, total: manifest.items.length };
    }
    meta.bundleVersion = manifest.bundleVersion;
    meta.paused = false;
    await publicFmMetaWrite(db, meta);

    const pending = manifest.items.filter((item) => {
      const completed = meta.done[item.url];
      return !(completed && completed.sha256 === item.sha256 && completed.bytes === item.bytes);
    });

    const registered = [];
    // 每次同步都从 pending 列表头部开始：已完成条目被 done 检查立即跳过，
    // 未完成条目（含断点分块）重新排队，保证暂停/继续与崩溃恢复不丢项。
    let index = 0;
    const doneCount = () => Object.keys(meta.done).length;
    let aborted = false;
    const abortError = () => {
      aborted = true;
      return new DOMException("sync aborted", "AbortError");
    };

    const onProgressNow = (phase) => {
      options.onProgress?.({
        phase,
        done: doneCount(),
        total: manifest.items.length,
        failed: Object.keys(meta.failed).length,
        bundleVersion: manifest.bundleVersion,
        progressIndex: index
      });
    };

    async function downloadItem(item) {
      const assetId = `public-fm-${item.type}-${item.fmId}-${item.variant || "default"}`;
      const done = meta.done[item.url];
      if (done && done.sha256 === item.sha256 && done.bytes === item.bytes) return;
      let partial = meta.partials[item.url] || null;
      let chunks = partial ? (partial.chunks || []).map((entry) => new Uint8Array(entry)) : [];
      let received = partial ? partial.received : 0;
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt += 1;
        if (aborted) throw abortError();
        try {
          const response = await publicFmFetchRange(fetchImpl, `./fm-assets/${item.url}`, received, options.signal);
          if (response.status === 206 && received > 0) {
            chunks.push(new Uint8Array(await response.arrayBuffer()));
            received = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          } else {
            chunks = [new Uint8Array(await response.arrayBuffer())];
            received = chunks[0].length;
          }
        } catch (error) {
          if (error?.name === "AbortError") {
            if (received > 0) {
              meta.partials[item.url] = { received, attempt, chunks: chunks.map((chunk) => Array.from(chunk)) };
              await publicFmMetaWrite(db, meta);
            }
            throw error;
          }
          if (received > 0) {
            meta.partials[item.url] = { received, attempt, chunks: chunks.map((chunk) => Array.from(chunk)) };
            await publicFmMetaWrite(db, meta);
          }
          if (attempt >= maxAttempts) throw new Error(`download failed after ${maxAttempts} attempts for ${item.url}: ${error?.message || error}`);
          continue;
        }
        if (received < item.bytes) {
          meta.partials[item.url] = { received, attempt, chunks: chunks.map((chunk) => Array.from(chunk)) };
          await publicFmMetaWrite(db, meta);
          throw new Error(`incomplete response for ${item.url} (${received}/${item.bytes})`);
        }
        if (received > item.bytes) throw new Error(`oversized response for ${item.url} (${received}/${item.bytes})`);
        const fullBlob = blobFromChunks(chunks);
        const digest = await sha256(new Uint8Array(await fullBlob.arrayBuffer()));
        if (digest !== item.sha256) {
          chunks = [];
          received = 0;
          if (attempt >= maxAttempts) {
            meta.failed[item.url] = { sha256: item.sha256, at: new Date().toISOString() };
            delete meta.partials[item.url];
            await publicFmMetaWrite(db, meta);
            throw new Error(`sha256 mismatch for ${item.url}`);
          }
          continue;
        }
        const store = await publicFmTx(db, PUBLIC_FM_STORE, "readwrite");
        await requestToPromise(store.put({ assetId, url: item.url, type: item.type, target: item.target, variant: item.variant || null, fmId: String(item.fmId), bytes: item.bytes, sha256: item.sha256, blob: fullBlob, at: new Date().toISOString() }));
        meta.done[item.url] = { sha256: item.sha256, bytes: item.bytes, at: new Date().toISOString() };
        delete meta.partials[item.url];
        delete meta.failed[item.url];
        await publicFmMetaWrite(db, meta);
        registered.push({ fmId: String(item.fmId), variant: item.variant || null, type: item.type, target: item.target, src: urlApi.createObjectURL(fullBlob) });
        return;
      }
      throw new Error(`download failed after ${maxAttempts} attempts for ${item.url}`);
    }

    async function worker() {
      while (index < pending.length) {
        if (aborted) throw abortError();
        const item = pending[index];
        try {
          await downloadItem(item);
          index += 1;
          meta.progressIndex = index;
          await publicFmMetaWrite(db, meta);
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          index += 1;
          meta.progressIndex = index;
          if (!meta.failed[item.url]) {
            meta.failed[item.url] = { sha256: item.sha256, at: new Date().toISOString(), reason: String(error?.message || error).slice(0, 120) };
            await publicFmMetaWrite(db, meta);
          }
        }
        onProgressNow("syncing");
      }
    }

    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));
    } catch (error) {
      if (error?.name === "AbortError") {
        meta.paused = true;
        await publicFmMetaWrite(db, meta);
        onProgressNow("paused");
        return { status: "paused", done: doneCount(), total: manifest.items.length, progressIndex: index };
      }
      throw error;
    }
    registerPrivateAssets(registered);
    await publicFmMetaWrite(db, meta);
    onProgressNow("done");
    return { status: "done", done: doneCount(), total: manifest.items.length, failed: Object.keys(meta.failed).length, bundleVersion: manifest.bundleVersion };
  } finally {
    try { db.close(); } catch { /* already closed */ }
  }
}

export async function loadPublicFmAssets(options = {}) {
  const urlApi = options.urlApi || globalThis.URL;
  const db = await openPublicFmDb(options.indexedDB || globalThis.indexedDB);
  try {
    const store = await publicFmTx(db, PUBLIC_FM_STORE, "readonly");
    const rows = await requestToPromise(store.getAll());
    const records = rows.map((row) => {
      const src = urlApi.createObjectURL(row.blob);
      return { assetId: row.assetId, fmId: row.fmId, type: row.type, variant: row.variant, target: row.target, bytes: row.bytes, sha256: row.sha256, src, path: src };
    });
    registerPrivateAssets(records);
    return records.length;
  } finally {
    try { db.close(); } catch { /* already closed */ }
  }
}

export async function readPublicFmStatus(options = {}) {
  const db = await openPublicFmDb(options.indexedDB || globalThis.indexedDB);
  try {
    const meta = await publicFmMetaRead(db);
    const store = await publicFmTx(db, PUBLIC_FM_STORE, "readonly");
    const count = await requestToPromise(store.count());
    return { bundleVersion: meta.bundleVersion, done: Object.keys(meta.done).length, storedRows: count, failed: Object.keys(meta.failed).length, paused: Boolean(meta.paused), progressIndex: meta.progressIndex || 0 };
  } finally {
    try { db.close(); } catch { /* already closed */ }
  }
}

export async function clearPublicFmAssets(options = {}) {
  const indexedDBImpl = options.indexedDB || globalThis.indexedDB;
  if (indexedDBImpl) {
    const db = await openPublicFmDb(indexedDBImpl);
    try {
      const store = await publicFmTx(db, PUBLIC_FM_STORE, "readonly");
      const rows = await requestToPromise(store.getAll());
      unregisterPrivateAssets(rows.map((row) => ({ fmId: row.fmId, variant: row.variant, type: row.type, target: row.target, assetId: row.assetId })));
    } finally {
      try { db.close(); } catch { /* already closed */ }
    }
  }
  if (!indexedDBImpl) return;
  await new Promise((resolve, reject) => {
    const request = indexedDBImpl.deleteDatabase(PUBLIC_FM_DB);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("IndexedDB delete failed"));
    request.onblocked = () => resolve();
  });
}
