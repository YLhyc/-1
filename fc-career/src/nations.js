/**
 * Canonical country/region flag resolution.
 *
 * The code list is the Unicode 17.0 RGI emoji flag set. Display names are
 * provided by the browser's built-in CLDR data, so the PWA stays offline and
 * does not need a third-party flag service. Football-only home nations use the
 * Unicode subdivision sequences supported by iOS.
 */
export const RGI_FLAG_CODES = Object.freeze(`
AC AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CP CQ CR CU CV CW CX CY CZ DE DG DJ DK DM DO DZ EA EC EE EG EH ER ES ET EU FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU IC ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TA TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM UN US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW
`.trim().split(/\s+/));

const RGI_FLAG_CODE_SET = new Set(RGI_FLAG_CODES);
const SUBDIVISION_CODES = new Set(["GB-ENG", "GB-SCT", "GB-WLS", "GB-NIR"]);
const NAME_TO_CODE = new Map();

function normalizeNationName(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .toLocaleLowerCase("en-US");
}

function addAlias(alias, code) {
  const normalized = normalizeNationName(alias);
  if (normalized) NAME_TO_CODE.set(normalized, code);
}

for (const code of RGI_FLAG_CODES) addAlias(code, code);

if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
  for (const locale of ["zh-Hans", "zh", "en"]) {
    let displayNames;
    try {
      displayNames = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      continue;
    }
    for (const code of RGI_FLAG_CODES) {
      const displayName = displayNames.of(code);
      if (displayName && displayName !== code) addAlias(displayName, code);
    }
  }
}

const MANUAL_ALIASES = {
  "China PR": "CN",
  "中国队": "CN",
  "Chinese Taipei": "TW",
  "中国台北": "TW",
  "中华台北": "TW",
  "Hong Kong": "HK",
  "Hong Kong, China": "HK",
  "中国香港": "HK",
  "Macao": "MO",
  "Macau": "MO",
  "Macao, China": "MO",
  "中国澳门": "MO",
  "England": "GB-ENG",
  "英格兰": "GB-ENG",
  "Scotland": "GB-SCT",
  "苏格兰": "GB-SCT",
  "Wales": "GB-WLS",
  "威尔士": "GB-WLS",
  "Northern Ireland": "GB-NIR",
  "北爱尔兰": "GB-NIR",
  "United Kingdom": "GB",
  "Great Britain": "GB",
  "UK": "GB",
  "英国": "GB",
  "Republic of Ireland": "IE",
  "爱尔兰共和国": "IE",
  "Korea Republic": "KR",
  "South Korea": "KR",
  "大韩民国": "KR",
  "Korea DPR": "KP",
  "North Korea": "KP",
  "朝鲜": "KP",
  "IR Iran": "IR",
  "Iran": "IR",
  "伊朗": "IR",
  "Congo DR": "CD",
  "DR Congo": "CD",
  "Democratic Republic of Congo": "CD",
  "Democratic Republic of the Congo": "CD",
  "刚果民主": "CD",
  "民主刚果": "CD",
  "刚果（金）": "CD",
  "Congo Republic": "CG",
  "Congo": "CG",
  "Republic of the Congo": "CG",
  "刚果（布）": "CG",
  "Ivory Coast": "CI",
  "Cote d'Ivoire": "CI",
  "Côte d'Ivoire": "CI",
  "Cape Verde Islands": "CV",
  "Cape Verde": "CV",
  "Cabo Verde": "CV",
  "The Gambia": "GM",
  "Türkiye": "TR",
  "Turkey": "TR",
  "Czech Republic": "CZ",
  "Bosnia and Herzegovina": "BA",
  "波黑": "BA",
  "Trinidad and Tobago": "TT",
  "United States of America": "US",
  "USA": "US",
  "United States": "US",
  "Kosovo": "XK",
  "科索沃": "XK",
  "Palestine": "PS",
  "Palestinian Territories": "PS",
  "巴勒斯坦": "PS",
  "Curacao": "CW",
  "Curaçao": "CW"
};

for (const [alias, code] of Object.entries(MANUAL_ALIASES)) addAlias(alias, code);

export function nationFlagCode(value) {
  const normalized = normalizeNationName(value);
  if (!normalized) return "";
  const directCode = normalized.toUpperCase();
  if (RGI_FLAG_CODE_SET.has(directCode) || SUBDIVISION_CODES.has(directCode)) return directCode;
  return NAME_TO_CODE.get(normalized) || "";
}

function explicitParts(value) {
  return String(value || "")
    .split(/[\/／\r\n,，、;&＆；]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitChineseCompound(value) {
  const text = String(value || "").trim();
  for (let index = text.indexOf("和"); index >= 0; index = text.indexOf("和", index + 1)) {
    const left = text.slice(0, index).trim();
    const right = text.slice(index + 1).trim();
    if (nationFlagCode(left) && nationFlagCode(right)) return [left, right];
  }
  return [text];
}

export function nationalityFlagParts(...values) {
  const resolved = [];
  for (const value of values) {
    const text = String(value || "").trim();
    if (!text || text === "无") continue;
    const wholeCode = nationFlagCode(text);
    if (wholeCode) {
      resolved.push({ raw: text, code: wholeCode });
      continue;
    }
    const parts = explicitParts(text);
    const candidates = parts.length > 1 ? parts : splitChineseCompound(text);
    for (const raw of candidates) {
      const code = nationFlagCode(raw);
      if (code) resolved.push({ raw, code });
    }
  }
  const unique = [];
  for (const entry of resolved) {
    if (!unique.some((item) => item.code === entry.code)) unique.push(entry);
    if (unique.length === 2) break;
  }
  return unique;
}

export function flagGlyphFromCode(code) {
  const normalized = String(code || "").toUpperCase();
  if (SUBDIVISION_CODES.has(normalized)) {
    const tag = normalized.toLowerCase().replaceAll("-", "");
    return String.fromCodePoint(0x1f3f4, ...[...tag].map((character) => 0xe0061 + character.charCodeAt(0) - 97), 0xe007f);
  }
  if (!RGI_FLAG_CODE_SET.has(normalized)) return "";
  return String.fromCodePoint(...[...normalized].map((character) => 0x1f1e6 + character.charCodeAt(0) - 65));
}
