import { ADDITIONAL_CLUBS } from "./club-data.js";
import { attachFmMapping, continentEntities } from "./fm-mappings.js";

export const DATA_VERSION = "2026-08-09";

export const DATA_SOURCE_NOTES = {
  clubs: "2026 赛季中国职业联赛准入名单与公开赛历（中足联/维基/媒体，核验 2026-08-09）；能力与设施为游戏模板近似值，不声称官方评级。",
  clubs2026: "2026 赛季中超 16 队、中甲 16 队、中乙部分公开名单，核验日期 2026-08-09；未获得 FM26 唯一 ID 的俱乐部使用通用队徽并明确标注。",
  players: "少数现实球员仅记录可核验身份与公开出生信息；场上能力为模板近似值，不代表官方或实时合同。",
  fmId: "中国俱乐部 FM26 ID 来自 sortitoutsi/fmtransferupdate 公开页面，核验日期 2026-08-09；公开版不捆绑 FM26 素材，私人导入器按同一字段精确匹配。"
};

export const SECOND_NATIONALITIES = ["无", "香港", "英格兰", "西班牙", "阿根廷", "巴西", "意大利", "法国", "德国"];

export const LEAGUE_RULES = {
  csl: { start: "03-01", end: "11-30", rounds: 30, transferWindows: ["01-01", "02-28", "06-15", "07-31"] },
  cfl: { start: "03-14", end: "11-15", rounds: 30, transferWindows: ["01-01", "02-28", "06-15", "07-31"] },
  csl2: { start: "03-22", end: "10-31", rounds: 28, transferWindows: ["01-01", "02-28", "06-15", "07-31"] },
  epl: { start: "08-15", end: "05-25", rounds: 38, transferWindows: ["06-10", "09-01", "01-01", "02-03"] },
  laliga: { start: "08-22", end: "05-24", rounds: 38, transferWindows: ["06-10", "09-01", "01-01", "02-03"] },
  bundesliga: { start: "08-21", end: "05-23", rounds: 34, transferWindows: ["06-10", "09-01", "01-01", "02-03"] },
  seriea: { start: "08-23", end: "05-25", rounds: 38, transferWindows: ["06-10", "09-01", "01-01", "02-03"] },
  ligue1: { start: "08-15", end: "05-23", rounds: 34, transferWindows: ["06-10", "09-01", "01-01", "02-03"] }
};

const RAW_LEAGUES = [
  { id: "csl", name: "中超", nation: "中国", level: 1, rounds: 30, reputation: 68, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "cfl", name: "中甲", nation: "中国", level: 2, rounds: 30, reputation: 54, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "csl2", name: "中乙", nation: "中国", level: 3, rounds: 28, reputation: 43, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "epl", name: "英超", nation: "英格兰", level: 1, rounds: 38, reputation: 94, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "laliga", name: "西甲", nation: "西班牙", level: 1, rounds: 38, reputation: 92, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "bundesliga", name: "德甲", nation: "德国", level: 1, rounds: 34, reputation: 90, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "seriea", name: "意甲", nation: "意大利", level: 1, rounds: 38, reputation: 89, real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "ligue1", name: "法甲", nation: "法国", level: 1, rounds: 34, reputation: 86, real: true, source: DATA_SOURCE_NOTES.clubs }
];

export const LEAGUES = Object.freeze(RAW_LEAGUES.map((league) => attachFmMapping(league, "competition")));

const BASE_CLUBS = [
  { id: "shanghai-port", fmId: "23292170", name: "上海海港", short: "海港", city: "上海", league: "csl", reputation: 82, facilities: 18, stadium: "浦东足球场", colors: ["#c8102e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "shanghai-shenhua", fmId: "414", name: "上海申花", short: "申花", city: "上海", league: "csl", reputation: 81, facilities: 16, stadium: "上海体育场", colors: ["#00539c", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "chengdu-rongcheng", fmId: "23447397", name: "成都蓉城", short: "蓉城", city: "成都", league: "csl", reputation: 79, facilities: 17, stadium: "凤凰山体育公园", colors: ["#e00000", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "fminside FM 2026-08-09" },
  { id: "beijing-guoan", fmId: "406", name: "北京国安", short: "国安", city: "北京", league: "csl", reputation: 80, facilities: 17, stadium: "工人体育场", colors: ["#00502f", "#ffe200"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "shandong-taishan", fmId: "116403", name: "山东泰山", short: "泰山", city: "济南", league: "csl", reputation: 79, facilities: 17, stadium: "济南奥体中心", colors: ["#e51b22", "#f5a623"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "tianjin-jinmen", fmId: "416", name: "天津津门虎", short: "津门虎", city: "天津", league: "csl", reputation: 71, facilities: 14, stadium: "天津奥体中心", colors: ["#004a9f", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "zhejiang", fmId: "131229", name: "浙江队", short: "浙江", city: "杭州", league: "csl", reputation: 75, facilities: 15, stadium: "黄龙体育中心", colors: ["#0072bc", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "henan", fmId: "131162", name: "河南队", short: "河南", city: "郑州", league: "csl", reputation: 70, facilities: 14, stadium: "航海体育场", colors: ["#d71920", "#1a1a1a"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "wuhan-three-towns", fmId: "23487243", name: "武汉三镇", short: "三镇", city: "武汉", league: "csl", reputation: 73, facilities: 15, stadium: "武汉体育中心", colors: ["#0a7ec2", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "fmtransferupdate FM26 2026-08-09" },
  { id: "qingdao-west-coast", fmId: "34039025", name: "青岛西海岸", short: "西海岸", city: "青岛", league: "csl", reputation: 66, facilities: 13, stadium: "青岛青春足球场", colors: ["#1f4f9e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs, fmIdSource: "fminside FM26 2026-08-09" },
  { id: "yunnan-yukun", fmId: "2000319417", name: "云南玉昆", short: "玉昆", city: "玉溪", league: "csl", reputation: 64, facilities: 13, stadium: "玉溪高原体育中心", colors: ["#7a1e3c", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "dalian-yingbo", fmId: null, name: "大连英博", short: "英博", city: "大连", league: "csl", reputation: 74, facilities: 16, stadium: "大连梭鱼湾足球场", colors: ["#0055a4", "#f5b81b"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "shenzhen-pengcity", fmId: null, name: "深圳新鹏城", short: "新鹏城", city: "深圳", league: "csl", reputation: 72, facilities: 15, stadium: "深圳体育场", colors: ["#00509e", "#f7d117"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "qingdao-hainiu", fmId: null, name: "青岛海牛", short: "海牛", city: "青岛", league: "csl", reputation: 70, facilities: 14, stadium: "青春足球场", colors: ["#004a9f", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "liaoning-tieren", fmId: null, name: "辽宁铁人", short: "铁人", city: "沈阳", league: "csl", reputation: 69, facilities: 14, stadium: "沈阳奥体中心", colors: ["#b71234", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "chongqing-tonglianglong", fmId: null, name: "重庆铜梁龙", short: "铜梁龙", city: "重庆", league: "csl", reputation: 68, facilities: 14, stadium: "铜梁龙体育场", colors: ["#e4002b", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },

  { id: "guangdong-guangzhou-baoleopard", fmId: null, name: "广东广州豹", short: "广州豹", city: "广州", league: "cfl", reputation: 70, facilities: 15, stadium: "广州大学城体育中心", colors: ["#c8102e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "changchun-yatai", fmId: null, name: "长春亚泰", short: "亚泰", city: "长春", league: "cfl", reputation: 68, facilities: 15, stadium: "长春体育中心", colors: ["#d71920", "#f5b81b"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "meizhou-hakka", fmId: "23199255", name: "梅州客家", short: "客家", city: "梅州", league: "cfl", reputation: 63, facilities: 12, stadium: "惠堂体育场", colors: ["#00843d", "#f5b81b"], real: true, source: DATA_SOURCE_NOTES.clubs2026, fmIdSource: "sortitoutsi FM26 2026-08-09" },
  { id: "shaanxi-union", fmId: null, name: "陕西联合", short: "陕西", city: "西安", league: "cfl", reputation: 66, facilities: 15, stadium: "西安国际足球中心", colors: ["#0066b3", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "nantong-zhiyun", fmId: null, name: "南通支云", short: "支云", city: "南通", league: "cfl", reputation: 65, facilities: 14, stadium: "如皋奥体中心", colors: ["#003c71", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "nanjing-city", fmId: null, name: "南京城市", short: "南京", city: "南京", league: "cfl", reputation: 64, facilities: 14, stadium: "南京奥体中心", colors: ["#004a9f", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "shenzhen-juniors", fmId: null, name: "深圳青年人", short: "青年人", city: "深圳", league: "cfl", reputation: 64, facilities: 13, stadium: "深圳龙岗大运中心", colors: ["#00a651", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "dalian-kuncheng", fmId: null, name: "大连鲲城", short: "鲲城", city: "大连", league: "cfl", reputation: 63, facilities: 13, stadium: "大连足球青训基地", colors: ["#1b2a49", "#00a1de"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "shijiazhuang-gongfu", fmId: null, name: "石家庄功夫", short: "功夫", city: "石家庄", league: "cfl", reputation: 62, facilities: 13, stadium: "裕彤国际体育中心", colors: ["#b71234", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "foshan-nanshi", fmId: null, name: "佛山南狮", short: "南狮", city: "佛山", league: "cfl", reputation: 62, facilities: 13, stadium: "佛山世纪莲体育场", colors: ["#ed1c24", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "suzhou-dongwu", fmId: null, name: "苏州东吴", short: "东吴", city: "苏州", league: "cfl", reputation: 62, facilities: 14, stadium: "苏州奥体中心", colors: ["#0066b3", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "yanbian-longding", fmId: null, name: "延边龙鼎", short: "龙鼎", city: "延吉", league: "cfl", reputation: 61, facilities: 12, stadium: "延吉人民体育场", colors: ["#c8102e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "ningbo", fmId: null, name: "宁波", short: "宁波", city: "宁波", league: "cfl", reputation: 61, facilities: 13, stadium: "宁波体育中心", colors: ["#003c71", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "guangxi-hengchen", fmId: null, name: "广西恒宸", short: "恒宸", city: "南宁", league: "cfl", reputation: 60, facilities: 12, stadium: "广西体育中心", colors: ["#009b3a", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "wuxi-wugou", fmId: null, name: "无锡吴钩", short: "吴钩", city: "无锡", league: "cfl", reputation: 58, facilities: 12, stadium: "无锡体育中心", colors: ["#004a9f", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "dingnan-ganlian", fmId: null, name: "定南赣联", short: "赣联", city: "定南", league: "cfl", reputation: 58, facilities: 11, stadium: "定南足球训练基地", colors: ["#e4002b", "#f5b81b"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },

  { id: "hubei-qingnianxing", fmId: null, name: "湖北青年星", short: "青年星", city: "武汉", league: "csl2", reputation: 52, facilities: 12, stadium: "新华路体育场", colors: ["#00509e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "wuhan-three-towns-b", fmId: null, name: "武汉三镇B", short: "三镇B", city: "武汉", league: "csl2", reputation: 50, facilities: 13, stadium: "武汉塔子湖基地", colors: ["#0a7ec2", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "chengdu-rongcheng-b", fmId: null, name: "成都蓉城B", short: "蓉城B", city: "成都", league: "csl2", reputation: 50, facilities: 13, stadium: "成都谢菲联足球公园", colors: ["#e00000", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "hangzhou-linping-wuyue", fmId: null, name: "杭州临平吴越", short: "吴越", city: "杭州", league: "csl2", reputation: 49, facilities: 12, stadium: "临平体育中心", colors: ["#0072bc", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "jiangxi-lushan", fmId: null, name: "江西庐山", short: "庐山", city: "九江", league: "csl2", reputation: 48, facilities: 11, stadium: "九江体育中心", colors: ["#006400", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "wenzhou", fmId: null, name: "温州", short: "温州", city: "温州", league: "csl2", reputation: 48, facilities: 11, stadium: "温州体育中心", colors: ["#0072bc", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "guizhou-guiyang-athletic", fmId: null, name: "贵州贵阳竞技", short: "贵阳竞技", city: "贵阳", league: "csl2", reputation: 49, facilities: 11, stadium: "贵阳奥体中心", colors: ["#00509e", "#f5b81b"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "ganzhou-ruishi", fmId: null, name: "赣州瑞狮", short: "瑞狮", city: "赣州", league: "csl2", reputation: 47, facilities: 10, stadium: "赣州体育中心", colors: ["#c8102e", "#ffd100"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "xiamen-feilu", fmId: null, name: "厦门飞鹭", short: "飞鹭", city: "厦门", league: "csl2", reputation: 47, facilities: 10, stadium: "厦门白鹭体育场", colors: ["#00509e", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "guangzhou-pugongying", fmId: null, name: "广州蒲公英", short: "蒲公英", city: "广州", league: "csl2", reputation: 47, facilities: 10, stadium: "广州越秀山体育场", colors: ["#ed1c24", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "guangdong-mingtu", fmId: null, name: "广东铭途", short: "铭途", city: "梅州", league: "csl2", reputation: 46, facilities: 10, stadium: "五华惠堂体育场", colors: ["#00843d", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },
  { id: "shenzhen-2028", fmId: null, name: "深圳二零二八", short: "二零二八", city: "深圳", league: "csl2", reputation: 46, facilities: 10, stadium: "深圳光明基地", colors: ["#00a651", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs2026 },

  { id: "man-city", fmId: null, name: "曼城", short: "曼城", city: "曼彻斯特", league: "epl", reputation: 95, facilities: 20, stadium: "伊蒂哈德球场", colors: ["#6cabdd", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "liverpool", fmId: null, name: "利物浦", short: "红军", city: "利物浦", league: "epl", reputation: 95, facilities: 19, stadium: "安菲尔德", colors: ["#c8102e", "#00b2a9"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "arsenal", fmId: null, name: "阿森纳", short: "枪手", city: "伦敦", league: "epl", reputation: 93, facilities: 19, stadium: "酋长球场", colors: ["#ef0107", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "real-madrid", fmId: null, name: "皇家马德里", short: "皇马", city: "马德里", league: "laliga", reputation: 96, facilities: 20, stadium: "伯纳乌", colors: ["#f0f0f0", "#febe10"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "barcelona", fmId: null, name: "巴塞罗那", short: "巴萨", city: "巴塞罗那", league: "laliga", reputation: 94, facilities: 19, stadium: "诺坎普", colors: ["#004d98", "#a50044"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "bayern", fmId: null, name: "拜仁慕尼黑", short: "拜仁", city: "慕尼黑", league: "bundesliga", reputation: 94, facilities: 20, stadium: "安联球场", colors: ["#dc052d", "#ffffff"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "inter", fmId: null, name: "国际米兰", short: "国米", city: "米兰", league: "seriea", reputation: 91, facilities: 18, stadium: "梅阿查", colors: ["#0068a8", "#000000"], real: true, source: DATA_SOURCE_NOTES.clubs },
  { id: "psg", fmId: null, name: "巴黎圣日耳曼", short: "巴黎", city: "巴黎", league: "ligue1", reputation: 93, facilities: 20, stadium: "王子公园球场", colors: ["#004170", "#da291c"], real: true, source: DATA_SOURCE_NOTES.clubs }
];

export const CLUBS = Object.freeze([...BASE_CLUBS, ...ADDITIONAL_CLUBS].map((club) => attachFmMapping(club, "club")));

const RAW_NATIONAL_TEAMS = [
  { id: "chn", name: "中国", short: "中国", reputation: 68, threshold: 62, real: true },
  { id: "eng", name: "英格兰", short: "英格兰", reputation: 92, threshold: 78, real: true },
  { id: "esp", name: "西班牙", short: "西班牙", reputation: 94, threshold: 80, real: true },
  { id: "arg", name: "阿根廷", short: "阿根廷", reputation: 95, threshold: 82, real: true },
  { id: "bra", name: "巴西", short: "巴西", reputation: 94, threshold: 81, real: true }
];

export const NATIONAL_TEAMS = Object.freeze(RAW_NATIONAL_TEAMS.map((team) => attachFmMapping(team, "nation")));
export const CONTINENTS = continentEntities();

export const WORLD_COMPETITIONS = Object.freeze([
  { id: "ucl", name: "欧洲冠军联赛", kind: "continental-cup", leagueIds: ["epl", "laliga", "bundesliga", "seriea", "ligue1"], participantCount: 16, rounds: 8 },
  { id: "uel", name: "欧洲联赛", kind: "continental-cup", leagueIds: ["epl", "laliga", "bundesliga", "seriea", "ligue1"], participantCount: 16, rounds: 8 },
  { id: "uecl", name: "欧洲协会联赛", kind: "continental-cup", leagueIds: ["epl", "laliga", "bundesliga", "seriea", "ligue1"], participantCount: 16, rounds: 8 },
  { id: "europe-youth", name: "欧洲五大联赛青年赛事", kind: "youth", leagueIds: ["epl", "laliga", "bundesliga", "seriea", "ligue1"], participantCount: 20, rounds: 10 },
  { id: "china-youth", name: "中国职业俱乐部青年联赛", kind: "youth", leagueIds: ["csl", "cfl", "csl2"], participantCount: 20, rounds: 10 },
  { id: "china-regional", name: "中国抽象地区联赛", kind: "regional-abstract", leagueIds: ["csl2"], participantCount: 16, rounds: 12 }
]);

export const REAL_PLAYERS = [
  {
    id: "wu-lei",
    name: "武磊",
    fmId: null,
    clubId: "shanghai-port",
    position: "ST",
    nationality: "中国",
    birthYear: 1991,
    source: "公开身份资料",
    verifiedAt: "2026-08-09",
    template: false,
    note: "身份可核验；游戏属性为模板近似，不声称官方评级。"
  },
  {
    id: "zhang-yuning",
    name: "张玉宁",
    fmId: null,
    clubId: "beijing-guoan",
    position: "ST",
    nationality: "中国",
    birthYear: 1997,
    source: "公开身份资料",
    verifiedAt: "2026-08-09",
    template: false,
    note: "身份可核验；游戏属性为模板近似，不声称官方评级。"
  },
  {
    id: "wang-dalei",
    name: "王大雷",
    fmId: null,
    clubId: "shandong-taishan",
    position: "GK",
    nationality: "中国",
    birthYear: 1989,
    source: "公开身份资料",
    verifiedAt: "2026-08-09",
    template: false,
    note: "身份可核验；游戏属性为模板近似，不声称官方评级。"
  },
  {
    id: "wei-shihao",
    name: "韦世豪",
    fmId: null,
    clubId: "chengdu-rongcheng",
    position: "LW",
    nationality: "中国",
    birthYear: 1995,
    source: "公开身份资料",
    verifiedAt: "2026-08-09",
    template: false,
    note: "身份可核验；游戏属性为模板近似，不声称官方评级。"
  }
];

export const TALENTS = [
  { id: "gifted", name: "天赋异禀", growth: 1.15, body: 3, tech: 2, mind: 0, potential: [88, 95] },
  { id: "steady", name: "稳步攀升", growth: 1, body: 1, tech: 1, mind: 2, potential: [82, 90] },
  { id: "late", name: "大器晚成", growth: 0.8, body: 0, tech: 0, mind: 3, potential: [78, 88] }
];

export const POSITIONS = [
  { id: "GK", name: "门将", roles: ["传统门将", "清道夫门将", "出球门将"] },
  { id: "RB", name: "右后卫", roles: ["进攻型边后卫", "防守型边后卫", "内收型边后卫"] },
  { id: "CB", name: "中后卫", roles: ["出球中卫", "清道夫中卫", "拖后中卫"] },
  { id: "LB", name: "左后卫", roles: ["进攻型边后卫", "防守型边后卫", "内收型边后卫"] },
  { id: "CDM", name: "后腰", roles: ["防守型后腰", "拖后组织核心", "抢球机器"] },
  { id: "CM", name: "中场", roles: ["全能中场", "拖后组织核心", "前场组织核心"] },
  { id: "CAM", name: "前腰", roles: ["古典前腰", "影子前锋", "边路组织核心"] },
  { id: "LW", name: "左边锋", roles: ["内锋", "传统边锋", "内切型边锋"] },
  { id: "RW", name: "右边锋", roles: ["内锋", "传统边锋", "内切型边锋"] },
  { id: "ST", name: "前锋", roles: ["突前前锋", "站桩中锋", "全能前锋"] }
];

export const TRAITS = [
  { id: "one-touch", name: "一脚出球", kind: "passing" },
  { id: "killer-ball", name: "尝试致命直塞", kind: "passing" },
  { id: "wide-run", name: "喜欢拉到边路接球", kind: "movement" },
  { id: "late-run", name: "后排插上", kind: "movement" },
  { id: "first-shot", name: "第一时间射门", kind: "shooting" },
  { id: "near-post", name: "追求角度的推射", kind: "shooting" },
  { id: "press", name: "紧逼对手", kind: "defending" },
  { id: "vocal", name: "语言激励队友", kind: "psychology" },
  { id: "crowd", name: "煽动观众情绪", kind: "psychology" }
];

export const TRAINING_PLANS = [
  { id: "balanced", name: "均衡计划", time: 42, load: 18, mind: 4, focus: ["technique", "composure"], description: "团队训练与恢复并重。" },
  { id: "intense", name: "高强度特训", time: 58, load: 32, mind: -4, focus: ["technique", "stamina"], description: "集中提升技术，身体负荷上升。" },
  { id: "recovery", name: "恢复优先", time: 28, load: -12, mind: 10, focus: ["composure", "stamina"], description: "降低负荷，为比赛保留身体。" },
  { id: "family", name: "生活平衡", time: 20, load: -4, mind: 18, focus: ["composure"], description: "家庭与个人时间，防止心理透支。" },
  { id: "business", name: "商业周", time: 40, load: 10, mind: 2, focus: ["media", "finances"], description: "增加收入与曝光，可能影响训练。" }
];

export const SPONSOR_POOL = [
  { id: "sport-shoe", name: "运动品牌", amount: 12000, image: "professional", conflict: ["bad-boy"] },
  { id: "energy-drink", name: "能量饮料", amount: 8000, image: "youth", conflict: ["professional"] },
  { id: "family-car", name: "家用汽车", amount: 15000, image: "family", conflict: [] },
  { id: "local-bank", name: "地方银行", amount: 10000, image: "reliable", conflict: [] }
];

export const COACH_JOBS = [
  { id: "youth-assistant", name: "青年队助教", minReputation: 35, wage: 6000, level: "青年" },
  { id: "youth-manager", name: "青年队主教练", minReputation: 55, wage: 11000, level: "青年" },
  { id: "assistant-manager", name: "一线队助教", minReputation: 60, wage: 16000, level: "一线" },
  { id: "head-coach-csl2", name: "中乙主教练", minReputation: 65, wage: 22000, level: "一线" },
  { id: "head-coach-csl", name: "中超主教练", minReputation: 80, wage: 45000, level: "一线" }
];

export const NAME_POOLS = {
  "中国": ["王晨", "李铭", "张锐", "刘洋", "陈浩", "杨帆", "赵磊", "孙明", "周凯", "吴迪"],
  "英格兰": ["James Carter", "Harry Bell", "Jack Foster", "George Reed", "Owen Hall"],
  "西班牙": ["Álvaro Ruiz", "Iker Navarro", "Sergio Marín", "Dani Ferrer", "Pablo Costa"],
  "阿根廷": ["Mateo Sosa", "Lautaro Vega", "Thiago Ríos", "Facundo Luna"],
  "巴西": ["Gabriel Souza", "Matheus Lima", "Rafael Alves", "João Pedro"]
};

export const SURNAMES_BY_NATION = {
  "中国": ["王", "李", "张", "刘", "陈", "杨", "赵", "孙", "周", "吴"],
  "英格兰": ["Carter", "Bell", "Foster", "Reed", "Hall"],
  "西班牙": ["Ruiz", "Navarro", "Marín", "Ferrer", "Costa"],
  "阿根廷": ["Sosa", "Vega", "Ríos", "Luna"],
  "巴西": ["Souza", "Lima", "Alves", "Pedro"]
};
