import {
  ASSET_BY_ID,
  AWARD_ASSET_IDS,
  CLUB_ASSET_IDS,
  COMPETITION_ASSET_IDS,
  CONTINENT_ASSET_IDS,
  KIT_ASSET_IDS,
  PORTRAIT_ASSET_IDS,
  ASSET_REGISTRY_VERSION
} from "./asset-registry.js";
import { FLAG_ASSET_BY_CODE } from "./flag-manifest.js";
import { flagGlyphFromCode, nationalityFlagParts } from "./nations.js";
import { nationRefForCode, nationRefForValue, canonicalNationId, nationDisplayName } from "./nation-refs.js";

export { nationRefForCode, nationRefForValue, canonicalNationId, nationDisplayName };

/**
 * Asset resolution is deliberately kept in one module. The public registry is
 * immutable; private FM assets may only overlay a known game entity after an
 * exact fmId match performed by the importer.
 */
export const ASSET_RESOLVER_VERSION = `resolver-${ASSET_REGISTRY_VERSION}`;

const PRIVATE_ASSETS = new Map();

const FLAG_CODE_BY_NATION_ID = new Map([
  ["albania", "AL"], ["algeria", "DZ"], ["angola", "AO"], ["argentina", "AR"],
  ["armenia", "AM"], ["australia", "AU"], ["austria", "AT"], ["belgium", "BE"],
  ["belarus", "BY"], ["benin", "BJ"], ["bolivia", "BO"], ["bosnia", "BA"], ["brazil", "BR"],
  ["bulgaria", "BG"], ["burkina-faso", "BF"], ["burundi", "BI"], ["cameroon", "CM"],
  ["canada", "CA"], ["cape-verde", "CV"], ["central-african-republic", "CF"], ["chile", "CL"],
  ["china", "CN"], ["chinese-taipei", "TW"], ["colombia", "CO"], ["congo", "CG"],
  ["congo-dr", "CD"], ["costa-rica", "CR"], ["croatia", "HR"], ["cyprus", "CY"],
  ["czechia", "CZ"], ["denmark", "DK"], ["dominican", "DO"], ["ecuador", "EC"],
  ["egypt", "EG"], ["england", "GB-ENG"], ["equatorial-guinea", "GQ"], ["estonia", "EE"],
  ["faroe", "FO"], ["finland", "FI"], ["france", "FR"], ["gabon", "GA"], ["gambia", "GM"],
  ["georgia", "GE"], ["germany", "DE"], ["ghana", "GH"], ["greece", "GR"],
  ["guinea", "GN"], ["guinea-bissau", "GW"], ["haiti", "HT"], ["honduras", "HN"],
  ["hong-kong", "HK"], ["hungary", "HU"], ["iceland", "IS"], ["indonesia", "ID"],
  ["israel", "IL"], ["italy", "IT"], ["ivory-coast", "CI"], ["jamaica", "JM"], ["japan", "JP"],
  ["jordan", "JO"], ["kenya", "KE"], ["korea", "KR"], ["latvia", "LV"], ["libya", "LY"],
  ["lithuania", "LT"], ["luxembourg", "LU"], ["madagascar", "MG"], ["malaysia", "MY"], ["mali", "ML"],
  ["mauritania", "MR"], ["mexico", "MX"], ["moldova", "MD"], ["montenegro", "ME"],
  ["morocco", "MA"], ["mozambique", "MZ"], ["netherlands", "NL"], ["new-zealand", "NZ"],
  ["niger", "NE"], ["nigeria", "NG"], ["northern-ireland", "GB"], ["north-macedonia", "MK"],
  ["norway", "NO"], ["panama", "PA"], ["paraguay", "PY"], ["peru", "PE"],
  ["poland", "PL"], ["portugal", "PT"], ["republic-of-ireland", "IE"], ["romania", "RO"],
  ["russia", "RU"], ["saudi-arabia", "SA"], ["scotland", "GB-SCT"], ["senegal", "SN"],
  ["serbia", "RS"], ["sierra-leone", "SL"], ["slovakia", "SK"], ["slovenia", "SI"],
  ["south-africa", "ZA"], ["spain", "ES"], ["suriname", "SR"], ["sweden", "SE"],
  ["switzerland", "CH"], ["syria", "SY"], ["tanzania", "TZ"], ["thailand", "TH"],
  ["togo", "TG"], ["trinidad-and-tobago", "TT"], ["tunisia", "TN"], ["turkey", "TR"],
  ["ukraine", "UA"], ["united-states", "US"], ["uruguay", "UY"], ["uzbekistan", "UZ"],
  ["venezuela", "VE"], ["wales", "GB-WLS"], ["zambia", "ZM"], ["zimbabwe", "ZW"]
]);

export function nationFlagGlyph(assetOrId) {
  const explicitCode = typeof assetOrId === "object" ? assetOrId?.flagCode : "";
  if (explicitCode) return flagGlyphFromCode(explicitCode);
  const assetId = typeof assetOrId === "string" ? assetOrId : assetOrId?.assetId || assetOrId?.fallbackAssetId || assetOrId?.id;
  if (/^flag-/.test(assetId)) {
    return flagGlyphFromCode(assetId.slice(5).toUpperCase());
  }
  if (/^unicode-/.test(assetId)) {
    return flagGlyphFromCode(assetId.slice(7).toUpperCase());
  }
  const nationId = String(assetId || "").replace(/^nation-/, "");
  const code = FLAG_CODE_BY_NATION_ID.get(nationId);
  return flagGlyphFromCode(code);
}

const AWARD_ALIASES = new Map([
  ["联赛冠军", "league-title"],
  ["联赛冠军奖杯", "league-title"],
  ["国家队冠军", "national-team"],
  ["国家队荣誉", "national-team"],
  ["金球奖", "golden-ball"],
  ["赛季最佳阵容", "season-xi"],
  ["最佳阵容", "season-xi"],
  ["教练冠军", "coach-title"],
  ["隐藏称号", "hidden-title"],
  // 2026-08-14 个人荣誉奖杯接入：照片/图标资产
  ["世界足球先生", "the-best"],
  ["The Best", "the-best"],
  ["FIFA最佳门将", "fifa-best-gk"],
  ["FIFA最佳男门将", "fifa-best-gk"],
  ["FIFA最佳教练", "fifa-best-coach"],
  ["FIFA最佳男足教练", "fifa-best-coach"],
  ["欧洲金靴奖", "euro-golden-shoe"],
  ["欧洲金靴", "euro-golden-shoe"],
  ["世界杯金球奖", "wc-golden-ball"],
  ["世界杯金靴奖", "wc-golden-boot"],
  ["世界杯金手套奖", "wc-golden-glove"],
  ["世界杯最佳年轻球员", "wc-best-young"],
  ["欧洲杯最佳球员", "euro-best-player"],
  ["欧洲杯最佳年轻球员", "euro-best-young"],
  ["欧洲杯最佳射手", "euro-top-scorer"],
  ["亚洲杯MVP", "afc-mvp"],
  ["亚洲杯最佳射手", "afc-top-scorer"],
  ["亚洲杯最佳门将", "afc-best-gk"],
  ["中超最佳球员", "csl-mvp"],
  ["中超MVP", "csl-mvp"],
  ["中超最佳射手", "csl-top-scorer"],
  ["中超金靴", "csl-top-scorer"],
  ["中超最佳门将", "csl-gk"],
  ["中超最佳年轻球员", "csl-young"],
  ["中超最佳教练", "csl-coach"],
  ["中甲最佳球员", "cfl-mvp"],
  ["中甲最佳射手", "cfl-top-scorer"],
  ["中甲最佳门将", "cfl-gk"],
  ["中乙最佳球员", "csl2-mvp"],
  ["中乙最佳射手", "csl2-top-scorer"],
  ["中乙最佳门将", "csl2-gk"],
  ["英超赛季最佳球员", "epl-pots"],
  ["英超最佳球员", "epl-pots"],
  ["PFA年度最佳球员", "pfa-poty"],
  ["英超金靴", "epl-golden-boot"],
  ["英超赛季最佳教练", "epl-manager"],
  ["西甲赛季最佳球员", "laliga-mvp"],
  ["西甲MVP", "laliga-mvp"],
  ["皮奇奇奖", "pichichi"],
  ["西甲金靴", "pichichi"],
  ["萨莫拉奖", "zamora"],
  ["德甲金靴", "bundesliga-top-scorer"],
  ["小钢炮", "bundesliga-top-scorer"],
  ["德甲赛季最佳球员", "bundesliga-pots"],
  ["德国足球先生", "germany-footballer"],
  ["意甲MVP", "seriea-mvp"],
  ["意甲最佳球员", "seriea-mvp"],
  ["意甲金靴", "seriea-top-scorer"],
  ["意甲最佳年轻球员", "seriea-young"],
  ["意甲最佳门将", "seriea-gk"],
  ["法甲最佳球员", "ligue1-best-player"],
  ["法甲最佳年轻球员", "ligue1-young"],
  ["法甲最佳门将", "ligue1-gk"],
  ["法甲最佳教练", "ligue1-coach"],
  ["法甲金靴", "ligue1-top-scorer"],
  ["科帕奖", "kopa"],
  ["雅辛奖", "yashin"],
  ["盖德·穆勒奖", "gerd-mueller"],
  ["克鲁伊夫奖", "johan-cruyff"],
  ["金童奖", "golden-boy"],
  ["FIFPRO年度最佳阵容", "fifpro-xi"],
  ["普斯卡什奖", "puskas"],
  ["FIFA普斯卡什奖", "puskas"]
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

export function unregisterPrivateAssets(assets = []) {
  if (!Array.isArray(assets)) throw new TypeError("private assets must be an array");
  for (const asset of assets) {
    if (!asset || typeof asset !== "object") continue;
    const type = String(asset.type || "");
    const key = asset.fmId ?? asset.assetId ?? asset.clubId ?? asset.id;
    if (key === undefined || key === null) continue;
    PRIVATE_ASSETS.delete(`${type}:${String(key)}`);
    if (asset.fmId && asset.variant) PRIVATE_ASSETS.delete(`${type}:${String(asset.fmId)}:${String(asset.variant)}`);
    if (asset.assetId) PRIVATE_ASSETS.delete(String(asset.assetId));
    if (asset.clubId) PRIVATE_ASSETS.delete(`${type}:${String(asset.clubId)}`);
  }
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
  const parts = nationalityFlagParts(primary, secondary);
  if (!parts.length) return [publicEntry("nation-neutral") || freezeResolved({ id: "nation-neutral", type: "nation", source: "neutral" }, { assetId: "nation-neutral", role: "flag", private: false })];
  return parts.map(({ raw, code }) => {
    const assetId = FLAG_ASSET_BY_CODE[code] || `unicode-${code}`;
    const publicAsset = publicEntry(assetId)
      || freezeResolved({ id: assetId, type: "nation", source: "unicode-rgi-flag", unicodeOnly: !FLAG_ASSET_BY_CODE[code] }, { assetId, flagCode: code, role: "flag", private: false });
    const privateAsset = privateLookup([options.fmId, assetId, raw, code], "nation");
    return privateAsset?.role === "flag"
      ? freezeResolved(privateAsset, { assetId, type: "nation", source: "private-fm26-exact", private: true, fallbackAssetId: assetId, flagCode: code })
      : freezeResolved(publicAsset, { assetId, flagCode: code, role: "flag", private: false });
  });
}

export function resolveNationAsset(nation, options = {}) {
  return resolveNationAssets(nation, options.secondary)[0];
}

export function resolveAssociationAsset(nationOrId, options = {}) {
  const name = typeof nationOrId === "object" ? nationOrId.name : nationOrId;
  const fmId = typeof nationOrId === "object" ? nationOrId.fmId : options.fmId;
  const fallback = publicEntry("association-neutral") || publicEntry("nation-neutral");
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
