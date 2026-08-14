// 个人荣誉奖项确定性触发层（2026-08-14 接入轮）
//
// 原则（领导拍板，硬规则）：
// 1. 每个已注册奖项必须给出确定性触发条件（基于真实赛季统计），或明确标记
//    visualOnly / not-found 状态（无对应赛事模拟或统计时不伪造触发、不随机发奖）。
// 2. 不满足条件 => 不得奖；满足条件 => 必得奖；同一奖项同一赛季只授一次。
// 3. 每个奖项写入统一 honors 结构（awardId/赛季/类别/胜负/来源统计/视觉标记），
//    近似图标只影响视觉展示，不伪装成真实奖杯；历史/弱候选/近似视觉均有标记。
// 4. 全部为纯函数：同一状态输入必然得到同一输出，无随机、无猜测。
//
// 触发入口：seasonEnd / coachSeasonEnd 赛季结算调用 resolveSeasonAwards /
// resolveCoachSeasonAwards；systems.js 的 awardNomination / goldenBall 委托本层。

import { addHonor } from "./honors.js";

export const AWARD_STATUS = Object.freeze({
  ACTIVE: "active",
  VISUAL_ONLY: "visualOnly",
  NOT_FOUND: "not-found",
  EXTERNAL: "external" // 确定性触发在既有机制中（注明位置），不在本层重复授予
});

export const AWARD_VISUAL = Object.freeze({
  EXACT: "exact",           // 现行精确奖杯照片
  HISTORICAL: "historical", // 历史版本奖杯照片（非现行造型）
  WEAK: "weak",             // 弱候选（含人物/背景复杂，身份可辨但非纯奖杯图）
  APPROXIMATE: "approximate" // 近似图标/原创回退（非真实奖杯）
});

const TOP5 = Object.freeze(["epl", "laliga", "bundesliga", "seriea", "ligue1"]);
const CHINESE_LEAGUES = Object.freeze(["csl", "cfl", "csl2"]);

function atLeast(value, threshold) {
  return (value || 0) >= threshold;
}

/**
 * 奖项注册表：id 与 asset-registry.js 的 AWARD_ASSET_IDS 键一一对应。
 * - scope: player（球员赛季）/ coach（教练赛季）/ either
 * - leagues: 限制联赛（null = 任意联赛）
 * - position / ageMax: 位置与年龄限制（门将奖、年轻球员奖）
 * - visual: 视觉资源标记（exact/historical/weak/approximate）
 * - status: active（确定性触发）/ visualOnly（有视觉无触发）/ not-found（无实体奖杯）
 * - condition(ctx): 确定性条件，满足必得
 */
export const AWARD_DEFINITIONS = Object.freeze([
  // ===== 全球球员个人奖 =====
  {
    id: "golden-ball", title: "金球奖", category: "individual", scope: "either", leagues: null,
    visual: AWARD_VISUAL.HISTORICAL, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 20) && ctx.stats.avgRating >= 8.0
      && (ctx.stats.position === "GK" ? atLeast(ctx.stats.cleanSheets, 15) : atLeast(ctx.stats.goals, 15))
  },
  {
    id: "the-best", title: "世界足球先生（The Best）", category: "individual", scope: "either", leagues: null,
    visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 20) && ctx.stats.avgRating >= 7.8
      && (ctx.stats.position === "GK" ? atLeast(ctx.stats.cleanSheets, 12) : atLeast(ctx.stats.goals, 12))
  },
  {
    id: "puskas", title: "普斯卡什奖", category: "individual", scope: "player", leagues: null,
    visual: AWARD_VISUAL.HISTORICAL, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.wonderGoals, 1)
  },
  {
    id: "euro-golden-shoe", title: "欧洲金靴奖", category: "individual", scope: "player",
    leagues: TOP5, visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 25) && atLeast(ctx.stats.apps, 20)
  },
  {
    id: "gerd-mueller", title: "盖德·穆勒奖", category: "individual", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 30) && atLeast(ctx.stats.apps, 20)
  },
  {
    id: "kopa", title: "科帕奖", category: "individual", scope: "player", leagues: null,
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 15) && ctx.stats.avgRating >= 7.4
  },
  {
    id: "golden-boy", title: "金童奖", category: "individual", scope: "player", leagues: null,
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 12) && ctx.stats.avgRating >= 7.2
  },
  {
    id: "yashin", title: "雅辛奖", category: "individual", scope: "player", leagues: null,
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 15) && atLeast(ctx.stats.apps, 20)
  },
  {
    id: "fifa-best-gk", title: "FIFA 最佳门将", category: "individual", scope: "either", leagues: null,
    position: "GK", visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 12) && atLeast(ctx.stats.apps, 18)
  },
  {
    id: "fifa-best-coach", title: "FIFA 最佳教练", category: "individual", scope: "coach", leagues: null,
    visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => ctx.coach && ctx.coach.matches >= 25 && ctx.coach.winRate >= 0.6
  },
  {
    id: "johan-cruyff", title: "克鲁伊夫奖", category: "individual", scope: "coach", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => ctx.coach && ctx.coach.matches >= 25 && ctx.coach.winRate >= 0.65
  },
  {
    id: "fifpro-xi", title: "FIFPRO 年度最佳阵容", category: "individual", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 22) && ctx.stats.avgRating >= 7.6
  },
  {
    id: "season-xi", title: "赛季最佳阵容", category: "individual", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 15) && ctx.stats.avgRating >= 7.4
  },
  {
    // 德国足球先生为证书/奖牌制，无固定实体奖杯（研究文档 F10）
    id: "germany-footballer", title: "德国足球先生", category: "individual", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "无固定实体奖杯（证书/奖牌制），仅保留视觉回退，不伪造触发"
  },
  // ===== 既有机制确定性触发（不在本层重复授予，trigger 注明位置）=====
  {
    id: "league-title", title: "联赛冠军", category: "club", scope: "either", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.EXTERNAL,
    trigger: "career.seasonEnd 冠军结算（积分榜第一）"
  },
  {
    id: "coach-title", title: "教练冠军/晋级", category: "club", scope: "coach", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.EXTERNAL,
    trigger: "awards.resolveCoachSeasonAwards 前两名结算（教练冠军/晋级）"
  },
  {
    id: "hidden-title", title: "隐藏称号", category: "hidden", scope: "either", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.EXTERNAL,
    trigger: "systems.unlockHiddenTitle"
  },
  {
    id: "national-team", title: "国家队冠军", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟国家队大赛夺冠事件（仅征召机制，无夺冠结算），不伪造触发"
  },

  // ===== 中超 / 中甲 / 中乙 =====
  {
    id: "csl-mvp", title: "中超最佳球员", category: "individual", scope: "either", leagues: ["csl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 18) && ctx.stats.avgRating >= 7.4
      && (atLeast(ctx.stats.goals, 10) || atLeast(ctx.stats.assists, 6))
  },
  {
    id: "csl-top-scorer", title: "中超最佳射手", category: "individual", scope: "player", leagues: ["csl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 12) && atLeast(ctx.stats.apps, 15)
  },
  {
    id: "csl-gk", title: "中超最佳门将", category: "individual", scope: "player", leagues: ["csl"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 10) && atLeast(ctx.stats.apps, 15)
  },
  {
    id: "csl-young", title: "中超最佳年轻球员", category: "individual", scope: "player", leagues: ["csl"],
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 12) && ctx.stats.avgRating >= 7.2
  },
  {
    id: "csl-coach", title: "中超最佳教练", category: "individual", scope: "coach", leagues: ["csl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => ctx.coach && ctx.coach.matches >= 20 && ctx.coach.winRate >= 0.55
  },
  {
    id: "cfl-mvp", title: "中甲最佳球员", category: "individual", scope: "either", leagues: ["cfl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 16) && ctx.stats.avgRating >= 7.2
      && (atLeast(ctx.stats.goals, 8) || atLeast(ctx.stats.assists, 5))
  },
  {
    id: "cfl-top-scorer", title: "中甲最佳射手", category: "individual", scope: "player", leagues: ["cfl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 10) && atLeast(ctx.stats.apps, 15)
  },
  {
    id: "cfl-gk", title: "中甲最佳门将", category: "individual", scope: "player", leagues: ["cfl"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 8) && atLeast(ctx.stats.apps, 14)
  },
  {
    id: "csl2-mvp", title: "中乙最佳球员", category: "individual", scope: "either", leagues: ["csl2"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 14) && ctx.stats.avgRating >= 7.0
      && (atLeast(ctx.stats.goals, 6) || atLeast(ctx.stats.assists, 4))
  },
  {
    id: "csl2-top-scorer", title: "中乙最佳射手", category: "individual", scope: "player", leagues: ["csl2"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 8) && atLeast(ctx.stats.apps, 14)
  },
  {
    id: "csl2-gk", title: "中乙最佳门将", category: "individual", scope: "player", leagues: ["csl2"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 6) && atLeast(ctx.stats.apps, 12)
  },

  // ===== 英超 =====
  {
    id: "epl-pots", title: "英超赛季最佳球员", category: "individual", scope: "either", leagues: ["epl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 20) && ctx.stats.avgRating >= 7.6
      && (atLeast(ctx.stats.goals, 12) || atLeast(ctx.stats.assists, 8))
  },
  {
    id: "pfa-poty", title: "PFA 年度最佳球员", category: "individual", scope: "player", leagues: ["epl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 20) && ctx.stats.avgRating >= 7.5
  },
  {
    id: "epl-golden-boot", title: "英超金靴", category: "individual", scope: "player", leagues: ["epl"],
    visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 15) && atLeast(ctx.stats.apps, 18)
  },
  {
    id: "epl-manager", title: "英超赛季最佳教练", category: "individual", scope: "coach", leagues: ["epl"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => ctx.coach && ctx.coach.matches >= 20 && ctx.coach.winRate >= 0.55
  },

  // ===== 西甲 =====
  {
    id: "laliga-mvp", title: "西甲赛季最佳球员", category: "individual", scope: "either", leagues: ["laliga"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 20) && ctx.stats.avgRating >= 7.6
      && (atLeast(ctx.stats.goals, 12) || atLeast(ctx.stats.assists, 8))
  },
  {
    id: "pichichi", title: "皮奇奇奖（西甲金靴）", category: "individual", scope: "player", leagues: ["laliga"],
    visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 15) && atLeast(ctx.stats.apps, 18)
  },
  {
    id: "zamora", title: "萨莫拉奖（西甲最佳门将）", category: "individual", scope: "player", leagues: ["laliga"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 12) && atLeast(ctx.stats.apps, 18)
  },

  // ===== 德甲 =====
  {
    id: "bundesliga-pots", title: "德甲赛季最佳球员", category: "individual", scope: "either", leagues: ["bundesliga"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 18) && ctx.stats.avgRating >= 7.6
      && (atLeast(ctx.stats.goals, 10) || atLeast(ctx.stats.assists, 7))
  },
  {
    id: "bundesliga-top-scorer", title: "德甲小钢炮（最佳射手）", category: "individual", scope: "player", leagues: ["bundesliga"],
    visual: AWARD_VISUAL.HISTORICAL, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 13) && atLeast(ctx.stats.apps, 18)
  },

  // ===== 意甲 =====
  {
    id: "seriea-mvp", title: "意甲赛季最佳球员", category: "individual", scope: "either", leagues: ["seriea"],
    visual: AWARD_VISUAL.EXACT, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 18) && ctx.stats.avgRating >= 7.6
      && (atLeast(ctx.stats.goals, 12) || atLeast(ctx.stats.assists, 8))
  },
  {
    id: "seriea-top-scorer", title: "意甲金靴（Capocannoniere）", category: "individual", scope: "player", leagues: ["seriea"],
    visual: AWARD_VISUAL.WEAK, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 15) && atLeast(ctx.stats.apps, 18)
  },
  {
    id: "seriea-young", title: "意甲最佳年轻球员", category: "individual", scope: "player", leagues: ["seriea"],
    ageMax: 23, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 12) && ctx.stats.avgRating >= 7.2
  },
  {
    id: "seriea-gk", title: "意甲最佳门将", category: "individual", scope: "player", leagues: ["seriea"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 12) && atLeast(ctx.stats.apps, 18)
  },

  // ===== 法甲 =====
  {
    id: "ligue1-best-player", title: "法甲最佳球员", category: "individual", scope: "either", leagues: ["ligue1"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 18) && ctx.stats.avgRating >= 7.5
      && (atLeast(ctx.stats.goals, 12) || atLeast(ctx.stats.assists, 7))
  },
  {
    id: "ligue1-young", title: "法甲最佳年轻球员", category: "individual", scope: "player", leagues: ["ligue1"],
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.apps, 12) && ctx.stats.avgRating >= 7.2
  },
  {
    id: "ligue1-gk", title: "法甲最佳门将", category: "individual", scope: "player", leagues: ["ligue1"],
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.cleanSheets, 10) && atLeast(ctx.stats.apps, 15)
  },
  {
    id: "ligue1-coach", title: "法甲最佳教练", category: "individual", scope: "coach", leagues: ["ligue1"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => ctx.coach && ctx.coach.matches >= 20 && ctx.coach.winRate >= 0.55
  },
  {
    id: "ligue1-top-scorer", title: "法甲金靴", category: "individual", scope: "player", leagues: ["ligue1"],
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE,
    condition: (ctx) => atLeast(ctx.stats.goals, 13) && atLeast(ctx.stats.apps, 18)
  },

  // ===== 大赛个人奖（游戏未模拟世界杯/欧洲杯/亚洲杯赛事，无对应统计，不伪造触发）=====
  {
    id: "wc-golden-ball", title: "世界杯金球奖", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.WEAK, status: AWARD_STATUS.VISUAL_ONLY,
    reason: "游戏未模拟世界杯赛事（无对应统计），仅保留视觉展示，不伪造触发"
  },
  {
    id: "wc-golden-boot", title: "世界杯金靴奖", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.WEAK, status: AWARD_STATUS.VISUAL_ONLY,
    reason: "游戏未模拟世界杯赛事（无对应统计），仅保留视觉展示，不伪造触发"
  },
  {
    id: "wc-golden-glove", title: "世界杯金手套奖", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.WEAK, status: AWARD_STATUS.VISUAL_ONLY,
    reason: "游戏未模拟世界杯赛事（无对应统计），仅保留视觉展示，不伪造触发"
  },
  {
    id: "wc-best-young", title: "世界杯最佳年轻球员", category: "national", scope: "player", leagues: null,
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.VISUAL_ONLY,
    reason: "游戏未模拟世界杯赛事（无对应统计），仅保留视觉展示，不伪造触发"
  },
  {
    id: "euro-best-player", title: "欧洲杯最佳球员", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟欧洲杯赛事且无实体奖杯素材（研究文档 F05 not-found），仅视觉回退"
  },
  {
    id: "euro-best-young", title: "欧洲杯最佳年轻球员", category: "national", scope: "player", leagues: null,
    ageMax: 21, visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟欧洲杯赛事且无实体奖杯素材（研究文档 F05 not-found），仅视觉回退"
  },
  {
    id: "euro-top-scorer", title: "欧洲杯最佳射手", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟欧洲杯赛事且无实体奖杯素材（研究文档 F05 not-found），仅视觉回退"
  },
  {
    id: "afc-mvp", title: "亚洲杯 MVP", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟亚洲杯赛事且无实体奖杯素材（研究文档 F06 not-found），仅视觉回退"
  },
  {
    id: "afc-top-scorer", title: "亚洲杯最佳射手", category: "national", scope: "player", leagues: null,
    visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟亚洲杯赛事且无实体奖杯素材（研究文档 F06 not-found），仅视觉回退"
  },
  {
    id: "afc-best-gk", title: "亚洲杯最佳门将", category: "national", scope: "player", leagues: null,
    position: "GK", visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.NOT_FOUND,
    reason: "游戏未模拟亚洲杯赛事且无实体奖杯素材（研究文档 F06 not-found），仅视觉回退"
  }
]);

/** 通过 id 或中文名查找奖项定义 */
export function findAwardDefinition(idOrTitle) {
  if (!idOrTitle) return null;
  const value = String(idOrTitle).trim();
  return AWARD_DEFINITIONS.find((def) => def.id === value || def.title === value) || null;
}

/**
 * 构建确定性统计上下文（纯函数）。
 * ctx.stats 来源：career.seasonStats（含最小确定性字段 cleanSheets/wonderGoals）、
 * player 位置、season.leagueId、coach.seasonStats。
 */
export function buildAwardContext(state) {
  const season = state?.season || {};
  const stats = state?.career?.seasonStats || {};
  const player = state?.player || {};
  const coach = state?.coach || {};
  const coachStats = coach.seasonStats || {};
  const coachMatches = coachStats.matches || 0;
  const coachWins = coachStats.wins || 0;
  const coachDraws = coachStats.draws || 0;
  const coachPoints = coachWins * 3 + coachDraws;
  // 与 career.js coachSeasonEnd 同一确定性公式：约 20 名次制
  const finish = Math.max(1, Math.min(20, Math.round(20 - coachPoints * 2.2)));
  return {
    season: state?.world?.season || season.season || 0,
    leagueId: season.leagueId || null,
    stats: {
      apps: stats.appearances || 0,
      starts: stats.starts || 0,
      goals: stats.goals || 0,
      assists: stats.assists || 0,
      minutes: stats.minutes || 0,
      motm: stats.motm || 0,
      cleanSheets: stats.cleanSheets || 0,
      wonderGoals: stats.wonderGoals || 0,
      avgRating: (stats.appearances || 0) ? Number((stats.ratingSum / stats.appearances).toFixed(2)) : 0,
      position: player.position || "",
      age: player.age ?? 16
    },
    coach: coachMatches
      ? { matches: coachMatches, wins: coachWins, winRate: Number((coachWins / coachMatches).toFixed(2)), finish, points: coachPoints }
      : null
  };
}

/** 同一奖项同一赛季是否已授予（防重复） */
function alreadyGranted(state, awardId, season) {
  return (state.awards || []).some((entry) => entry.awardId === awardId && entry.season === season)
    || (state.honors || []).some((honor) => honor.awardId === awardId && honor.season === season);
}

function statsSummary(stats) {
  const keys = ["apps", "goals", "assists", "motm", "cleanSheets", "wonderGoals", "avgRating"];
  return keys.map((key) => `${key}=${stats[key] ?? 0}`).join(";");
}

/**
 * 授予奖项：写入 state.awards（完整详情）与统一 honors 结构。
 * honors 条目经 addHonor 标准化（awardId/赛季/类别/胜负/来源统计+视觉标记），
 * awards 条目保留结构化 stats 与视觉标记，供陈列室与详情展示。
 */
export function grantAward(state, def, ctx, { won = true, extra = {} } = {}) {
  const season = ctx.season || state.world?.season || 0;
  if (alreadyGranted(state, def.id, season)) return state;
  const id = `award-${def.id}-${season}`;
  const entry = {
    id,
    award: def.title,
    awardId: def.id,
    title: def.title,
    category: def.category,
    season,
    won,
    stats: { ...ctx.stats },
    visual: def.visual,
    status: def.status,
    source: "season-settlement",
    date: state.world?.date || null,
    ...extra
  };
  state.awards = state.awards || [];
  state.awards.push(entry);
  addHonor(state, {
    id,
    awardId: def.id,
    title: def.title,
    category: def.category,
    season,
    won,
    clubId: state.player?.clubId || null,
    competitionId: state.season?.leagueId || null,
    nation: state.nationalTeam?.committedNation || state.player?.nationality || null,
    source: `season-settlement:${statsSummary(ctx.stats)};visual=${def.visual}`,
    date: state.world?.date || null
  });
  return state;
}

function eligibleByContext(def, ctx) {
  if (def.status !== AWARD_STATUS.ACTIVE) return false;
  if (def.scope === "player" && ctx.coach) return false;
  if (def.scope === "coach" && !ctx.coach) return false;
  if (def.leagues && !def.leagues.includes(ctx.leagueId)) return false;
  if (def.position && def.position !== ctx.stats.position) return false;
  if (def.ageMax != null && ctx.stats.age > def.ageMax) return false;
  return true;
}

/**
 * 球员赛季结算入口：遍历全部 ACTIVE 球员奖项，满足条件必得，否则不得。
 * 由 career.js seasonEnd 调用。
 */
export function resolveSeasonAwards(state) {
  const ctx = buildAwardContext(state);
  for (const def of AWARD_DEFINITIONS) {
    if (!eligibleByContext(def, ctx)) continue;
    if (def.condition(ctx)) grantAward(state, def, ctx, { won: true });
  }
  return state;
}

/** 教练赛季结算：教练个人奖 + 晋级/冠军相关教练荣誉。由 career.js coachSeasonEnd 调用。 */
export function resolveCoachSeasonAwards(state) {
  const ctx = buildAwardContext(state);
  if (!ctx.coach) return state;
  for (const def of AWARD_DEFINITIONS) {
    if (def.scope !== "coach" || !eligibleByContext(def, ctx)) continue;
    if (def.condition(ctx)) grantAward(state, def, ctx, { won: true });
  }
  // 晋级/冠军相关教练荣誉：前 2 名 = 冠军；中甲/中乙前 2 名同时记为晋级。
  // 两者 awardId 均为 coach-title，用各自 id 判重，避免互相拦截。
  const finish = ctx.coach.finish;
  if (finish <= 2) {
    const season = ctx.season;
    const championId = `award-coach-title-${season}`;
    const promotionId = `award-coach-title-promotion-${season}`;
    if (!(state.awards || []).some((entry) => entry.id === championId)) {
      state.awards = state.awards || [];
      state.awards.push({
        id: championId, award: "教练冠军", awardId: "coach-title", title: "教练冠军",
        category: "club", season, won: true, stats: { finish, points: ctx.coach.points },
        visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE, source: "season-settlement",
        date: state.world?.date || null
      });
      addHonor(state, {
        id: championId, awardId: "coach-title", title: "教练冠军", category: "club", season, won: true,
        clubId: state.coach?.clubId || null,
        competitionId: state.season?.leagueId || null,
        nation: state.player?.nationality || null,
        source: `season-settlement:finish=${finish};visual=${AWARD_VISUAL.APPROXIMATE}`,
        date: state.world?.date || null
      });
    }
    if (CHINESE_LEAGUES.includes(ctx.leagueId) && !(state.awards || []).some((entry) => entry.id === promotionId)) {
      state.awards = state.awards || [];
      state.awards.push({
        id: promotionId, award: "教练晋级", awardId: "coach-title", title: "教练晋级",
        category: "club", season, won: true, stats: { finish, points: ctx.coach.points },
        visual: AWARD_VISUAL.APPROXIMATE, status: AWARD_STATUS.ACTIVE, source: "season-settlement",
        date: state.world?.date || null
      });
      addHonor(state, {
        id: promotionId, awardId: "coach-title", title: "教练晋级", category: "club", season, won: true,
        clubId: state.coach?.clubId || null,
        competitionId: state.season?.leagueId || null,
        nation: state.player?.nationality || null,
        source: `season-settlement:finish=${finish};visual=${AWARD_VISUAL.APPROXIMATE}`,
        date: state.world?.date || null
      });
    }
  }
  return state;
}

/**
 * 年度评选入口（systems.js awardNomination / goldenBall 委托）：
 * 支持中文名/id；按确定性条件判定胜负并写入统一结构；同赛季同奖项不重复。
 */
export function nominateAward(state, idOrTitle) {
  const def = findAwardDefinition(idOrTitle);
  const ctx = buildAwardContext(state);
  if (!def) {
    // 未注册奖项：确定性记录 won:false 提名，不随机发奖、不凭名称猜测
    const season = ctx.season || state.world?.season || 0;
    const label = String(idOrTitle || "未命名荣誉").trim();
    const id = `award-${season}-${label}`;
    if (!(state.awards || []).some((entry) => entry.id === id)) {
      state.awards = state.awards || [];
      state.awards.push({ id, award: label, awardId: label, title: label, category: "individual", season, won: false, source: "nomination" });
    }
    return { state, definition: null, won: false };
  }
  const won = def.status === AWARD_STATUS.ACTIVE && eligibleByContext(def, ctx) ? Boolean(def.condition(ctx)) : false;
  grantAward(state, def, ctx, { won });
  return { state, definition: def, won };
}
