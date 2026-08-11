import { NATION_REFS } from "./flag-manifest.js";
import { nationalityFlagParts, nationFlagCode } from "./nations.js";

export function nationRefForCode(code) {
  return NATION_REFS[String(code || "").toUpperCase()] || null;
}

export function nationRefForValue(value) {
  const parts = nationalityFlagParts(value);
  const code = parts[0]?.code || nationFlagCode(value);
  return code ? nationRefForCode(code) : null;
}

export function canonicalNationId(value) {
  const ref = nationRefForValue(value);
  return ref?.canonicalId || null;
}

export function nationDisplayName(canonicalId) {
  const code = String(canonicalId || "").toUpperCase();
  const ref = NATION_REFS[code] || Object.values(NATION_REFS).find((entry) => entry.canonicalId === canonicalId);
  return ref?.displayNameZh || canonicalId || "未知国籍";
}
