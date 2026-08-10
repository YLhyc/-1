import { registerPrivateAssets, clearPrivateAssets } from "./assets.js";
import { mappingForPrivateAsset, privateAssetPath } from "./fm-mappings.js";

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
    if (mapping.status !== "verified" || mapping.fmId !== String(match.fmId)) throw new Error("private asset manifest target/type/FM ID does not match the verified mapping");
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
      target: match.target
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
