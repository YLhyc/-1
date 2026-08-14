export const FM_MAPPING_VERSION = "fm26-exact-audit-2026-08-10";

const UNVERIFIED_QUERY_EVIDENCE = "2026-08-10 local FM26 asset index was inspected. It contains numeric config targets and asset paths, but no authoritative entity-name relation for this game record; no name, image, colour, order, or folder inference was used.";
const CONTINENT_NAMES = Object.freeze({
  asia: "亚洲",
  europe: "欧洲",
  africa: "非洲",
  "north-america": "北美洲",
  "south-america": "南美洲",
  oceania: "大洋洲"
});

function verified(type, target, entityName, fmId, source, verifiedAt) {
  return Object.freeze({ status: "verified", type, target, entityName, fmId: String(fmId), source, verifiedAt });
}

const LOCAL_FC12_CLUBS = Object.freeze([
  ["arsenal", "Arsenal", "602", "arsenal", "England - Premier League 2526"],
  ["epl-aston-villa", "Aston Villa", "603", "aston_villa", "England - Premier League 2526"],
  ["epl-bournemouth", "Bournemouth", "600", "bournemouth", "England - Premier League 2526"],
  ["epl-brentford", "Brentford", "617", "brentford", "England - Premier League 2526"],
  ["epl-brighton", "Brighton", "618", "brighton", "England - Premier League 2526"],
  ["epl-burnley", "Burnley", "622", "burnley", "England - Premier League 2526"],
  ["epl-chelsea", "Chelsea", "630", "chelsea", "England - Premier League 2526"],
  ["epl-crystal-palace", "Crystal Palace", "642", "crystal_palace", "England - Premier League 2526"],
  ["epl-everton", "Everton", "650", "everton", "England - Premier League 2526"],
  ["epl-nottingham-forest", "Nottingham Forest", "692", "forest", "England - Premier League 2526"],
  ["epl-fulham", "Fulham", "654", "fulham", "England - Premier League 2526"],
  ["epl-leeds", "Leeds United", "671", "leeds", "England - Premier League 2526"],
  ["liverpool", "Liverpool", "676", "liverpool", "England - Premier League 2526"],
  ["man-city", "Manchester City", "679", "man_city", "England - Premier League 2526"],
  ["epl-man-united", "Manchester United", "680", "manunited", "England - Premier League 2526"],
  ["epl-newcastle", "Newcastle United", "688", "newcastle", "England - Premier League 2526"],
  ["epl-sunderland", "Sunderland", "722", "sunderland", "England - Premier League 2526"],
  ["epl-tottenham", "Tottenham Hotspur", "728", "tottenham", "England - Premier League 2526"],
  ["epl-west-ham", "West Ham United", "735", "west_ham", "England - Premier League 2526"],
  ["epl-wolves", "Wolverhampton Wanderers", "740", "wolves", "England - Premier League 2526"],

  ["laliga-alaves", "Alaves", "1688", "alaves", "Spain - La Liga 2526 v2"],
  ["laliga-athletic-bilbao", "Athletic Bilbao", "1664", "athletic_bilbao", "Spain - La Liga 2526 v2"],
  ["laliga-atletico-madrid", "Atletico Madrid", "1687", "atletico_madrid", "Spain - La Liga 2526 v2"],
  ["barcelona", "Barcelona", "1708", "barcelona", "Spain - La Liga 2526 v2"],
  ["laliga-betis", "Real Betis", "1733", "betis", "Spain - La Liga 2526 v2"],
  ["laliga-celta-vigo", "Celta Vigo", "1724", "celta", "Spain - La Liga 2526 v2"],
  ["laliga-elche", "Elche", "1707", "elche", "Spain - La Liga 2526 v2"],
  ["laliga-espanyol", "Espanyol", "1725", "espanol", "Spain - La Liga 2526 v2"],
  ["laliga-getafe", "Getafe", "1710", "getafe", "Spain - La Liga 2526 v2"],
  ["laliga-girona", "Girona", "814089", "girona", "Spain - La Liga 2526 v2"],
  ["laliga-levante", "Levante", "1717", "levante", "Spain - La Liga 2526 v2"],
  ["laliga-mallorca", "Mallorca", "1726", "mallorca", "Spain - La Liga 2526 v2"],
  ["laliga-osasuna", "Osasuna", "1685", "osasuna", "Spain - La Liga 2526 v2"],
  ["laliga-oviedo", "Real Oviedo", "1741", "oviedo", "Spain - La Liga 2526 v2"],
  ["laliga-rayo-vallecano", "Rayo Vallecano", "1729", "rayo_vallecano", "Spain - La Liga 2526 v2"],
  ["real-madrid", "Real Madrid", "1736", "real_madrid", "Spain - La Liga 2526 v2"],
  ["laliga-real-sociedad", "Real Sociedad", "1742", "real_sociedad", "Spain - La Liga 2526 v2"],
  ["laliga-sevilla", "Sevilla", "1759", "sevilla", "Spain - La Liga 2526 v2"],
  ["laliga-valencia", "Valencia", "1775", "valencia", "Spain - La Liga 2526 v2"],
  ["laliga-villarreal", "Villarreal", "1777", "villarreal", "Spain - La Liga 2526 v2"],

  ["bundesliga-augsburg", "Augsburg", "2238", "augsburg", "Germany - Bundesliga 2526 v2"],
  ["bayern", "Bayern Munich", "915", "bayern", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-gladbach", "Borussia Monchengladbach", "908", "borussia_gladbach", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-dortmund", "Borussia Dortmund", "907", "dortmund", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-frankfurt", "Eintracht Frankfurt", "912", "eintracht_frankfurt", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-freiburg", "Freiburg", "944", "freiburg", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-heidenheim", "Heidenheim", "880295", "heidenheim", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-hoffenheim", "Hoffenheim", "879226", "hoffenheim", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-hamburg", "Hamburg", "947", "hsv", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-cologne", "Cologne", "916", "koln", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-leverkusen", "Bayer Leverkusen", "901", "leverkusen", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-mainz", "Mainz", "918", "mainz", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-leipzig", "RB Leipzig", "91013388", "rb_leipzig", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-st-pauli", "St Pauli", "946", "st_pauli", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-stuttgart", "Stuttgart", "960", "stuttgart", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-union-berlin", "Union Berlin", "121182", "union_berlin", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-werder-bremen", "Werder Bremen", "948", "werder_bremen", "Germany - Bundesliga 2526 v2"],
  ["bundesliga-wolfsburg", "Wolfsburg", "961", "wolfsburg", "Germany - Bundesliga 2526 v2"],

  ["seriea-atalanta", "Atalanta", "1106", "atalanta", "Italy - Serie A 2526 v4"],
  ["seriea-bologna", "Bologna", "1111", "bologna", "Italy - Serie A 2526 v4"],
  ["seriea-cagliari", "Cagliari", "1114", "cagliari", "Italy - Serie A 2526 v4"],
  ["seriea-como", "Como", "1123", "como", "Italy - Serie A 2526 v4"],
  ["seriea-cremonese", "Cremonese", "1125", "cremonese", "Italy - Serie A 2526 v4"],
  ["seriea-fiorentina", "Fiorentina", "1129", "fiorentina", "Italy - Serie A 2526 v4"],
  ["seriea-genoa", "Genoa", "1132", "genoa", "Italy - Serie A 2526 v4"],
  ["seriea-verona", "Hellas Verona", "2201", "hellas", "Italy - Serie A 2526 v4"],
  ["inter", "Inter", "1135", "inter", "Italy - Serie A 2526 v4"],
  ["seriea-juventus", "Juventus", "1139", "juventus", "Italy - Serie A 2526 v4"],
  ["seriea-lazio", "Lazio", "1140", "lazio", "Italy - Serie A 2526 v4"],
  ["seriea-lecce", "Lecce", "1141", "lecce", "Italy - Serie A 2526 v4"],
  ["seriea-ac-milan", "AC Milan", "1099", "milan", "Italy - Serie A 2526 v4"],
  ["seriea-napoli", "Napoli", "1150", "napoli", "Italy - Serie A 2526 v4"],
  ["seriea-parma", "Parma", "1156", "parma", "Italy - Serie A 2526 v4"],
  ["seriea-pisa", "Pisa", "2215", "pisa", "Italy - Serie A 2526 v4"],
  ["seriea-roma", "Roma", "1100", "roma", "Italy - Serie A 2526 v4"],
  ["seriea-sassuolo", "Sassuolo", "3800256", "sassuolo", "Italy - Serie A 2526 v4"],
  ["seriea-torino", "Torino", "1174", "torino", "Italy - Serie A 2526 v4"],
  ["seriea-udinese", "Udinese", "1178", "udinese", "Italy - Serie A 2526 v4"],

  ["ligue1-angers", "Angers", "875", "angers", "France - Ligue 1 2526 v3"],
  ["ligue1-auxerre", "Auxerre", "824", "auxerre", "France - Ligue 1 2526 v3"],
  ["ligue1-brest", "Brest", "2061", "brest", "France - Ligue 1 2526 v3"],
  ["ligue1-le-havre", "Le Havre", "856", "havre", "France - Ligue 1 2526 v3"],
  ["ligue1-lens", "Lens", "871", "lens", "France - Ligue 1 2526 v3"],
  ["ligue1-lille", "Lille", "858", "lille", "France - Ligue 1 2526 v3"],
  ["ligue1-lorient", "Lorient", "2005", "lorient", "France - Ligue 1 2526 v3"],
  ["ligue1-lyon", "Lyon", "865", "lyon", "France - Ligue 1 2526 v3"],
  ["ligue1-metz", "Metz", "844", "metz", "France - Ligue 1 2526 v3"],
  ["ligue1-monaco", "Monaco", "826", "monaco", "France - Ligue 1 2526 v3"],
  ["ligue1-nantes", "Nantes", "846", "nantes", "France - Ligue 1 2526 v3"],
  ["ligue1-nice", "Nice", "862", "nice", "France - Ligue 1 2526 v3"],
  ["ligue1-marseille", "Olympique Marseille", "866", "olympique_marseille", "France - Ligue 1 2526 v3"],
  ["ligue1-paris-fc", "Paris FC", "867", "paris", "France - Ligue 1 2526 v3"],
  ["psg", "Paris Saint-Germain", "868", "psg", "France - Ligue 1 2526 v3"],
  ["ligue1-rennes", "Rennes", "884", "rennes", "France - Ligue 1 2526 v3"],
  ["ligue1-strasbourg", "Strasbourg", "872", "strasbourg", "France - Ligue 1 2526 v3"],
  ["ligue1-toulouse", "Toulouse", "886", "toulouse", "France - Ligue 1 2526 v3"]
]);

const SORTITOUTSI_CHINESE_CLUBS = Object.freeze([
  ["dalian-yingbo", "Dalian Yingbo", "2000337865"],
  ["shenzhen-pengcity", "Shenzhen Peng City", "2000328113"],
  ["qingdao-hainiu", "Qingdao Hainiu", "412"],
  ["liaoning-tieren", "Liaoning Tieren", "2000337864"],
  ["chongqing-tonglianglong", "Chongqing Tongliang Loong", "2000208932"],
  ["guangdong-guangzhou-baoleopard", "Guangdong Guangzhou Power", "2000328121"],
  ["changchun-yatai", "Changchun Yatai", "131135"],
  ["shaanxi-union", "Shaanxi Union", "2000290298"],
  ["nantong-zhiyun", "Nantong Zhiyun", "23340823"],
  ["nanjing-city", "Nanjing City", "34039002"],
  ["shenzhen-juniors", "Shenzhen Juniors", "2000260967"],
  ["dalian-kuncheng", "Dalian K'un City", "2000337868"],
  ["shijiazhuang-gongfu", "Shijiazhuang Gongfu", "2000183928"],
  ["foshan-nanshi", "Foshan Nanshi", "2000328112"],
  ["suzhou-dongwu", "Suzhou Dongwu", "23318347"],
  ["yanbian-longding", "Yanbian Longding", "23492352"],
  ["ningbo", "Ningbo Professional", "2000525586"],
  ["guangxi-hengchen", "Guangxi Hengchen", "2000208927"],
  ["wuxi-wugou", "Wuxi Wugo", "2000082648"],
  ["dingnan-ganlian", "Jiangxi Dingnan United", "2000439194"],
  ["hubei-qingnianxing", "Hubei Istar", "23385913"],
  ["hangzhou-linping-wuyue", "Hangzhou Linping Wuyue", "2000439191"],
  ["jiangxi-lushan", "Jiangxi Lushan", "1035522"],
  ["wenzhou", "Wenzhou Professional", "2000439192"],
  ["guizhou-guiyang-athletic", "Guizhou Guiyang Athletic", "2000337886"],
  ["ganzhou-ruishi", "Ganzhou Ruishi", "2000337867"],
  ["xiamen-feilu", "Xiamen Feilu", "2000269049"],
  ["guangzhou-pugongying", "Guangzhou Dandelion", "2000439190"],
  ["guangdong-mingtu", "Guangdong Mingtu", "2000269035"],
  ["shenzhen-2028", "Shenzhen 2028", "2000383177"],
  ["csl2-shanxi-chongde-ronghai", "Shanxi Chongde Ronghai", "2000439195"],
  ["csl2-changchun-xidu", "Changchun Xidu", "2000208910"],
  ["csl2-beijing-ligong", "Beijing Institute of Technology", "23009360"],
  ["csl2-dalian-kewei", "Dalian Kewei", "2000461700"],
  ["csl2-lanzhou-longyuan", "Lanzhou Longyuan Athletic", "2000439193"],
  ["csl2-taian-tianguang", "Tai'an Tiankuang", "2000183924"],
  ["csl2-qingdao-red-lions", "Qingdao Red Lions", "23359269"],
  ["csl2-nantong-haimen-kediyuan", "Nantong Haimen Codion", "34054269"]
]);

function verifiedLocalClub([target, entityName, fmId, sourceLabel, configFolder]) {
  return verified("club", target, entityName, fmId, `FM26 local FC'12 config ${configFolder}: explicit from=${sourceLabel}_1 to=graphics/pictures/team/${fmId}/kits/home`, "2026-08-10");
}

function verifiedSortitoutsiChineseClub([target, entityName, fmId]) {
  return verified("club", target, entityName, fmId, `sortitoutsi FM26 team/data-update record ${fmId}; identity checked one-to-one against the project's 2026 Chinese club record`, "2026-08-10");
}

const VERIFIED = Object.freeze([
  verified("club", "shanghai-port", "Shanghai Port", "23292170", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "shanghai-shenhua", "Shanghai Shenhua", "414", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "chengdu-rongcheng", "Chengdu Rongcheng", "23447397", "fminside FM26 team record", "2026-08-09"),
  verified("club", "beijing-guoan", "Beijing Guoan", "406", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "shandong-taishan", "Shandong Taishan", "116403", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "tianjin-jinmen", "Tianjin Jinmen Tiger", "416", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "zhejiang", "Zhejiang", "131229", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "henan", "Henan", "131162", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "wuhan-three-towns", "Wuhan Three Towns", "23487243", "fmtransferupdate FM26 team record", "2026-08-09"),
  verified("club", "qingdao-west-coast", "Qingdao West Coast", "34039025", "fminside FM26 team record", "2026-08-09"),
  verified("club", "yunnan-yukun", "Yunnan Yukun", "2000319417", "sortitoutsi FM26 team record", "2026-08-09"),
  verified("club", "meizhou-hakka", "Meizhou Hakka", "23199255", "sortitoutsi FM26 team record", "2026-08-09"),
  ...SORTITOUTSI_CHINESE_CLUBS.map(verifiedSortitoutsiChineseClub),
  ...LOCAL_FC12_CLUBS.map(verifiedLocalClub),
  verified("competition", "csl", "Chinese Super League", "130931", "sortitoutsi FM26 competition 130931; local TCM China competition config targets competition/130931/logo", "2026-08-10"),
  verified("competition", "cfl", "Chinese National First Division", "131126", "sortitoutsi FM26 competition 131126; local TCM China competition config targets competition/131126/logo", "2026-08-10"),
  verified("competition", "csl2", "Chinese National Second Division", "130932", "sortitoutsi FM26 competition 130932; local TCM China competition config targets competition/130932/logo", "2026-08-10"),
  verified("competition", "epl", "English Premier Division", "11", "sortitoutsi FM26 competition 11; local TCM England competition config targets competition/11/logo", "2026-08-10"),
  verified("competition", "laliga", "Spanish First Division", "67", "sortitoutsi FM26 competition 67; local TCM Spain competition config targets competition/67/logo", "2026-08-10"),
  verified("competition", "bundesliga", "Bundesliga", "22", "sortitoutsi FM26 competition 22; local TCM Germany competition config targets competition/22/logo", "2026-08-10"),
  verified("competition", "seriea", "Italian Serie A", "32", "sortitoutsi FM26 competition 32 (Italian Serie A); local TCM Italy competition config targets competition/32/logo; vision 2026-08-13 dual evidence: 32.png=SERIE A, 37.png=SERIE C (docs/FM_ASSET_AUDIT.md)", "2026-08-13"),
  verified("competition", "ligue1", "French Ligue 1", "16", "sortitoutsi FM26 competition 16; local TCM France competition config targets competition/16/logo", "2026-08-10"),
  verified("nation", "chn", "People's Republic of China", "110", "sortitoutsi FM26 nation record", "2026-08-10"),
  verified("nation", "eng", "England", "765", "sortitoutsi FM26 nation record", "2026-08-10"),
  verified("nation", "esp", "Spain", "796", "sortitoutsi FM26 nation record", "2026-08-10"),
  verified("nation", "arg", "Argentina", "1649", "sortitoutsi FM26 nation record", "2026-08-10"),
  verified("nation", "bra", "Brazil", "1651", "sortitoutsi FM26 nation record", "2026-08-10")
]);

const VERIFIED_BY_KEY = new Map(VERIFIED.map((record) => [`${record.type}:${record.target}`, record]));

// 旧版私人 ZIP 使用的历史 fmId（错误映射），导入时兼容接受但不会覆盖当前实体资产：
// seriea 曾错误使用 37（SERIE C），2026-08-13 修正为 32（SERIE A）。
export const LEGACY_FM_ALIASES = Object.freeze({
  "competition:seriea": Object.freeze(["37"])
});

function unverified(type, target, entityName, reason) {
  return Object.freeze({
    status: "unverified",
    type,
    target,
    entityName,
    queryEvidence: UNVERIFIED_QUERY_EVIDENCE,
    unverifiedReason: reason
  });
}

export function mappingFor(type, target, entityName) {
  return VERIFIED_BY_KEY.get(`${type}:${target}`)
    || unverified(type, target, entityName, type === "continent"
      ? "The local pack labels these records as confederations with numeric IDs, not the game's six geographic-continent entities. Mapping would be cross-type speculation."
      : "No one-to-one FM ID source was independently verified for this entity.");
}

export function attachFmMapping(entity, type) {
  const record = mappingFor(type, entity.id, entity.name);
  if (entity.fmId && (!record.fmId || entity.fmId !== record.fmId)) {
    throw new Error(`FM mapping mismatch for ${type}:${entity.id}`);
  }
  return Object.freeze({
    ...entity,
    ...(record.status === "verified" ? { fmId: record.fmId, fmIdSource: record.source, fmVerifiedAt: record.verifiedAt } : {}),
    fmMapping: record
  });
}

export function continentEntities() {
  return Object.freeze(Object.entries(CONTINENT_NAMES).map(([id, name]) => Object.freeze({ id, name, ...mappingFor("continent", id, name) })));
}

export function allMappingRecords({ clubs = [], leagues = [], nationalTeams = [], continents = continentEntities() } = {}) {
  return Object.freeze([
    ...clubs.map((entity) => entity.fmMapping || mappingFor("club", entity.id, entity.name)),
    ...leagues.map((entity) => entity.fmMapping || mappingFor("competition", entity.id, entity.name)),
    ...nationalTeams.map((entity) => entity.fmMapping || mappingFor("nation", entity.id, entity.name)),
    ...continents.map((entity) => entity.fmMapping || mappingFor("continent", entity.id, entity.name))
  ]);
}

export function mappingByExactFmId(type, fmId) {
  const matches = VERIFIED.filter((record) => record.type === type && record.fmId === String(fmId));
  if (matches.length !== 1) return null;
  return matches[0];
}

export function mappingForPrivateAsset(type, target) {
  const mappingType = type === "kit" ? "club" : type;
  return mappingFor(mappingType, target, target);
}

export function privateAssetPath(type, target, variant = null) {
  if (!/^(club|kit|competition|nation|continent)$/.test(type)) throw new Error(`unsupported private asset type: ${type}`);
  if (!/^[a-z0-9-]+$/.test(String(target))) throw new Error("private asset target is not canonical");
  const safeVariant = variant || "default";
  if (!/^(home|away|third|goalkeeper|logo|flag|association|default)$/.test(String(safeVariant))) throw new Error("private asset variant is not canonical");
  return `assets/${type}/${target}/${safeVariant}.png`;
}

export function verifiedMappings() {
  return VERIFIED;
}
