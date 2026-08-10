import { ADDITIONAL_CLUBS } from "./club-data.js";

const BASE_CLUB_IDS = [
  "shanghai-port", "shanghai-shenhua", "chengdu-rongcheng", "beijing-guoan", "shandong-taishan",
  "tianjin-jinmen", "zhejiang", "henan", "wuhan-three-towns", "qingdao-west-coast",
  "yunnan-yukun", "dalian-yingbo", "shenzhen-pengcity", "qingdao-hainiu", "liaoning-tieren",
  "chongqing-tonglianglong",
  "guangdong-guangzhou-baoleopard", "changchun-yatai", "meizhou-hakka", "shaanxi-union",
  "nantong-zhiyun", "nanjing-city", "shenzhen-juniors", "dalian-kuncheng", "shijiazhuang-gongfu",
  "foshan-nanshi", "suzhou-dongwu", "yanbian-longding", "ningbo", "guangxi-hengchen",
  "wuxi-wugou", "dingnan-ganlian",
  "hubei-qingnianxing", "wuhan-three-towns-b", "chengdu-rongcheng-b", "hangzhou-linping-wuyue",
  "jiangxi-lushan", "wenzhou", "guizhou-guiyang-athletic", "ganzhou-ruishi", "xiamen-feilu",
  "guangzhou-pugongying", "guangdong-mingtu", "shenzhen-2028",
  "man-city", "liverpool", "arsenal",
  "real-madrid", "barcelona",
  "bayern",
  "inter",
  "psg"
];

const ALL_CLUB_IDS = [...BASE_CLUB_IDS, ...ADDITIONAL_CLUBS.map((club) => club.id)];

export const SOURCE_MANIFEST = {
  version: "2026-08-09-real-v1",
  verifiedAt: "2026-08-09",
  assets: {
    publicRegistryVersion: "2026-08-10-assets-v1",
    privatePriority: ["club", "kit", "competition", "nation", "continent"],
    exactMatchField: "fmId",
    publicFallback: true,
    privateNeverPublished: true
  },
  leagueCounts: {
    csl: 16,
    cfl: 16,
    csl2: 24,
    epl: 20,
    laliga: 20,
    bundesliga: 18,
    seriea: 20,
    ligue1: 18
  },
  leagueSources: {
    csl: { name: "中超", url: "https://baike.baidu.com/item/2026赛季中国足球超级联赛阵容/67026664", verifiedAt: "2026-08-09" },
    cfl: { name: "中甲", url: "https://baike.baidu.com/item/2026赛季中国足球甲级联赛阵容/67164471", rosterSource: "https://www.bodongxi.com/team/squad-{teamId}.html", verifiedAt: "2026-08-09" },
    csl2: { name: "中乙", url: "https://wzstyj.wenzhou.gov.cn/col/col1229339747/art/2026/art_b2d10cb7ebfa4ef5904cd05727bc39c0.html", scheduleSource: "https://www.bodongxi.com/league/schedule-1544.html", rosterSource: "https://www.bodongxi.com/team/squad-{teamId}.html", verifiedAt: "2026-08-09" },
    epl: { name: "英超", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams", season: "2025", verifiedAt: "2026-08-09" },
    laliga: { name: "西甲", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/teams", season: "2025", verifiedAt: "2026-08-09" },
    bundesliga: { name: "德甲", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/teams", season: "2025", verifiedAt: "2026-08-09" },
    seriea: { name: "意甲", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/teams", season: "2025", verifiedAt: "2026-08-09" },
    ligue1: { name: "法甲", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/teams", season: "2025", verifiedAt: "2026-08-09" }
  },
  clubIds: ALL_CLUB_IDS,
  players: {
    minimumPerClub: 18,
    source: "ESPN 公开阵容 API、百度百科 2026 联赛阵容页与 Bodongxi 2026 球队阵容页，核验日期 2026-08-09；所有运行时球员均为公开名单身份，能力评分仍由游戏模板生成。",
    realRosterClubs: 152,
    realPlayersAvailable: 5000,
    pendingRosterClubs: 0,
    pendingClubIds: [],
    identityVerified: true,
    note: "152 家俱乐部均已逐人核验公开阵容身份并保留来源/位置字段；部分个人资料未列出生年时保留 null，不推断。",
    verifiedAt: "2026-08-09"
  }
};
