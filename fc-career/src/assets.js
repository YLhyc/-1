import {
  ASSET_BY_ID,
  AWARD_ASSET_IDS,
  CLUB_ASSET_IDS,
  COMPETITION_ASSET_IDS,
  CONTINENT_ASSET_IDS,
  KIT_ASSET_IDS,
  NATION_ASSET_IDS,
  PORTRAIT_ASSET_IDS,
  ASSET_REGISTRY_VERSION
} from "./asset-registry.js";

/**
 * Asset resolution is deliberately kept in one module. The public registry is
 * immutable; private FM assets may only overlay a known game entity after an
 * exact fmId match performed by the importer.
 */
export const ASSET_RESOLVER_VERSION = `resolver-${ASSET_REGISTRY_VERSION}`;

const PRIVATE_ASSETS = new Map();

const AWARD_ALIASES = new Map([
  ["联赛冠军", "league-title"],
  ["联赛冠军奖杯", "league-title"],
  ["国家队冠军", "national-team"],
  ["国家队荣誉", "national-team"],
  ["金球奖", "golden-ball"],
  ["赛季最佳阵容", "season-xi"],
  ["最佳阵容", "season-xi"],
  ["教练冠军", "coach-title"],
  ["隐藏称号", "hidden-title"]
]);

function freezeResolved(entry, extra = {}) {
  if (!entry) return null;
  return Object.freeze({
    ...entry,
    source: entry.source || "public",
    path: entry.path || entry.src || "",
    src: entry.src || entry.path || "",
    registryVersion: entry.registryVersion || ASSET_REGISTRY_VERSION,
    ...extra
  });
}

function publicEntry(assetId) {
  return freezeResolved(ASSET_BY_ID[assetId], { assetId, private: false });
}

function privateLookup(keys, type) {
  for (const key of keys.filter(Boolean)) {
    const value = PRIVATE_ASSETS.get(`${type}:${String(key)}`) || PRIVATE_ASSETS.get(String(key));
    if (value) return value;
  }
  return null;
}

function overlay(publicAsset, keys, type) {
  const privateAsset = privateLookup(keys, type);
  if (privateAsset) {
    return freezeResolved(privateAsset, {
      assetId: privateAsset.assetId || publicAsset?.assetId || keys.find(Boolean),
      type,
      source: "private-fm26-exact",
      private: true,
      fallbackAssetId: publicAsset?.assetId || null
    });
  }
  return publicAsset ? freezeResolved(publicAsset, { type }) : null;
}

function clubIdOf(clubOrId) {
  return typeof clubOrId === "string" ? clubOrId : clubOrId?.id;
}

function fmIdOf(clubOrId) {
  return typeof clubOrId === "object" ? clubOrId?.fmId : null;
}

export function registerPrivateAsset(asset) {
  if (!asset || typeof asset !== "object") throw new TypeError("private asset must be an object");
  const type = String(asset.type || "");
  if (!["club", "kit", "competition", "nation", "continent", "award", "portrait"].includes(type)) throw new TypeError(`unsupported private asset type: ${type}`);
  const key = asset.fmId ?? asset.assetId ?? asset.clubId ?? asset.id;
  if (key === undefined || key === null || !asset.src) throw new TypeError("private asset requires an exact key and src");
  if (/^(?:https?:|data:)/i.test(String(asset.src))) throw new TypeError("private asset src must be local/blob-backed");
  const normalized = Object.freeze({
    ...asset,
    type,
    src: String(asset.src),
    path: String(asset.path || asset.src),
    source: "private-fm26-exact",
    private: true
  });
  PRIVATE_ASSETS.set(`${type}:${String(key)}`, normalized);
  if (asset.fmId && asset.variant) PRIVATE_ASSETS.set(`${type}:${String(asset.fmId)}:${String(asset.variant)}`, normalized);
  if (asset.assetId) PRIVATE_ASSETS.set(String(asset.assetId), normalized);
  if (asset.clubId) PRIVATE_ASSETS.set(`${type}:${String(asset.clubId)}`, normalized);
  return normalized;
}

export function registerPrivateAssets(assets = []) {
  if (!Array.isArray(assets)) throw new TypeError("private assets must be an array");
  return assets.map(registerPrivateAsset);
}

export function clearPrivateAssets() {
  PRIVATE_ASSETS.clear();
}

export function listPrivateAssets() {
  return [...new Set(PRIVATE_ASSETS.values())];
}

export function resolveClubAsset(clubOrId, options = {}) {
  const clubId = clubIdOf(clubOrId);
  const fmId = fmIdOf(clubOrId) ?? options.fmId;
  const assetId = CLUB_ASSET_IDS[clubId];
  const publicAsset = publicEntry(assetId);
  return overlay(publicAsset, [fmId, clubId, assetId], "club");
}

export function resolveKitAsset(clubOrId, variant = "home", options = {}) {
  const clubId = clubIdOf(clubOrId);
  const fmId = fmIdOf(clubOrId) ?? options.fmId;
  const normalizedVariant = ["home", "away", "third", "goalkeeper"].includes(variant) ? variant : "home";
  const assetId = KIT_ASSET_IDS[clubId]?.[normalizedVariant];
  return overlay(publicEntry(assetId), [`${fmId}:${normalizedVariant}`, fmId, `${clubId}:${normalizedVariant}`, assetId], "kit");
}

export function resolveNationAssets(primary, secondary, options = {}) {
  const values = [primary, secondary]
    .filter((value) => value !== undefined && value !== null && value !== "" && value !== "无")
    .flatMap((value) => NATION_ASSET_IDS[value] || []);
  const ids = [...new Set(values)];
  if (!ids.length) ids.push("nation-neutral");
  return ids.slice(0, 2).map((assetId) => {
    const publicAsset = publicEntry(assetId);
    const privateAsset = privateLookup([options.fmId, assetId, primary, secondary], "nation");
    return privateAsset?.role === "flag" ? freezeResolved(privateAsset, { assetId, type: "nation", source: "private-fm26-exact", private: true, fallbackAssetId: assetId }) : publicAsset;
  });
}

export function resolveNationAsset(nation, options = {}) {
  return resolveNationAssets(nation, options.secondary)[0];
}

export function resolveAssociationAsset(nationOrId, options = {}) {
  const name = typeof nationOrId === "object" ? nationOrId.name : nationOrId;
  const fmId = typeof nationOrId === "object" ? nationOrId.fmId : options.fmId;
  const fallback = resolveNationAsset(name);
  const privateAsset = privateLookup([fmId, name, fallback?.assetId], "nation");
  if (privateAsset && privateAsset.role !== "flag") return freezeResolved(privateAsset, { assetId: privateAsset.assetId || fallback?.assetId, type: "nation", source: "private-fm26-exact", private: true, fallbackAssetId: fallback?.assetId || null });
  return fallback;
}

export function resolveCompetitionAsset(competitionOrId, options = {}) {
  const id = typeof competitionOrId === "object" ? competitionOrId.id : competitionOrId;
  const fmId = typeof competitionOrId === "object" ? competitionOrId.fmId : options.fmId;
  const assetId = COMPETITION_ASSET_IDS[id];
  return overlay(publicEntry(assetId), [fmId, id, assetId], "competition");
}

export function resolveContinentAsset(continentOrId, options = {}) {
  const id = typeof continentOrId === "object" ? continentOrId.id : continentOrId;
  const fmId = typeof continentOrId === "object" ? continentOrId.fmId : options.fmId;
  const assetId = CONTINENT_ASSET_IDS[id];
  return overlay(publicEntry(assetId), [fmId, id, assetId], "continent");
}

export function resolvePortraitAsset(personOrRole, options = {}) {
  const role = typeof personOrRole === "object" ? (personOrRole.role || options.role || "player") : personOrRole;
  const personId = typeof personOrRole === "object" ? (personOrRole.fmId || personOrRole.personId || personOrRole.id) : options.personId;
  const normalizedRole = role === "coach" ? "coach" : "player";
  const assetId = PORTRAIT_ASSET_IDS[normalizedRole];
  return overlay(publicEntry(assetId), [personId, assetId], "portrait");
}

export function resolveAwardAsset(awardOrId, options = {}) {
  const value = typeof awardOrId === "object" ? (awardOrId.awardId || awardOrId.id || awardOrId.award) : awardOrId;
  const normalized = AWARD_ASSET_IDS[value] ? value : AWARD_ALIASES.get(value) || "league-title";
  return overlay(publicEntry(AWARD_ASSET_IDS[normalized]), [value, normalized, AWARD_ASSET_IDS[normalized]], "award");
}

export function resolveAsset(ref, options = {}) {
  if (!ref) return null;
  if (ref.type === "club" || options.type === "club") return resolveClubAsset(ref.id || ref.clubId || ref, options);
  if (ref.type === "kit" || options.type === "kit") return resolveKitAsset(ref.club || ref.clubId || ref, ref.variant, options);
  if (ref.type === "nation" || options.type === "nation") return resolveNationAsset(ref.id || ref.nationality || ref, options);
  if (ref.type === "competition" || options.type === "competition") return resolveCompetitionAsset(ref, options);
  if (ref.type === "continent" || options.type === "continent") return resolveContinentAsset(ref, options);
  if (ref.type === "portrait" || options.type === "portrait") return resolvePortraitAsset(ref, options);
  if (ref.type === "award" || options.type === "award") return resolveAwardAsset(ref, options);
  return publicEntry(ref.assetId || ref.id || ref);
}

export function assetRegistrySnapshot() {
  return Object.freeze({ version: ASSET_REGISTRY_VERSION, entries: Object.freeze(Object.values(ASSET_BY_ID)) });
}
