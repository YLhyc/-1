import { CLUBS, POSITIONS, TRAITS } from "./data.js";
import { deterministicRoll } from "./engine.js";
import { addHonor } from "./honors.js";
import { nominateAward } from "./awards.js";
import { canonicalNationId, nationDisplayName } from "./nation-refs.js";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function cloneState(state) {
  const world = { ...state.world };
  const players = world.players;
  delete world.players;
  const next = structuredClone({ ...state, world });
  if (players) next.world.players = players;
  return next;
}

function pushFeed(state, title, text) {
  state.feed.unshift({ time: state.world.date, title, text });
  return state;
}

function sanitizeDiagnostic(value) {
  return String(value || "未知错误")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

export function recordDiagnostic(state, value) {
  const next = cloneState(state);
  next.diagnostics = next.diagnostics || { errors: [] };
  const message = sanitizeDiagnostic(value);
  if (!next.diagnostics.errors.some((entry) => entry.message === message)) {
    next.diagnostics.errors.push({ date: next.world.date, message });
    next.diagnostics.errors = next.diagnostics.errors.slice(-20);
  }
  return next;
}

export function buildErrorReport(state) {
  return JSON.stringify({
    format: "fc-career-error-report-v1",
    generatedAt: new Date().toISOString(),
    saveVersion: state.version,
    worldDate: state.world?.date || null,
    ui: { theme: state.ui?.theme || "dark", largeText: Boolean(state.ui?.largeText) },
    errors: (state.diagnostics?.errors || []).map((entry) => ({ date: entry.date, message: sanitizeDiagnostic(entry.message) }))
  }, null, 2);
}

export function applyPositionTraining(state, positionId) {
  const next = cloneState(state);
  const position = POSITIONS.find((item) => item.id === positionId);
  if (!position || position.id === next.player.position) return next;
  if (next.player.secondaryPositions.includes(position.id)) return next;
  if (next.training.positionTraining?.positionId && next.training.positionTraining.positionId !== positionId) {
    next.feed.unshift({ time: next.world.date, title: "位置训练已更换", text: "你中断了此前的位置训练，进度会保留但效率下降。" });
  }
  if (!next.training.positionTraining || next.training.positionTraining.positionId !== positionId) {
    next.training.positionTraining = { positionId, progress: 0, coachApproved: true, startedAt: next.world.date };
  }
  if (next.resources.time < 10) {
    next.feed.unshift({ time: next.world.date, title: "位置训练受阻", text: "本周没有足够时间安排位置特训。" });
    return next;
  }
  next.resources.time -= 10;
  next.resources.load = clamp(next.resources.load + 4, 0, 100);
  next.training.positionTraining.progress = clamp(next.training.positionTraining.progress + (next.player.hidden.professionalism >= 14 ? 18 : 12), 0, 100);
  if (next.training.positionTraining.progress >= 100) {
    next.player.secondaryPositions.push(position.id);
    next.career.milestones.push(`${next.world.season}-${next.world.week}:完成 ${position.name} 位置训练`);
    next.training.positionTraining = null;
    pushFeed(next, "位置训练完成", `教练批准你增加 ${position.name} 作为可兼任位置。`);
  } else {
    pushFeed(next, "位置训练", `${position.name} 专项训练进度 ${next.training.positionTraining.progress}%。`);
  }
  return next;
}

export function refreshMentalState(state) {
  const next = cloneState(state);
  const mind = next.resources.mind;
  const energy = next.psychology.energy;
  const form = next.health.form || 6.5;
  const coach = next.relations.coach?.trust || 50;
  let stateName = "平静专注";
  let trend = "稳定";
  if (energy < 20) {
    stateName = "自我怀疑";
    trend = "下滑";
  } else if (mind < 40 && form < 6) {
    stateName = "焦躁不安";
    trend = "下滑";
  } else if (coach < 35 && form < 6) {
    stateName = "愤怒燃烧";
    trend = "波动";
  } else if (form >= 7.6 && mind >= 65) {
    stateName = "自信爆棚";
    trend = "上升";
  } else if (mind < 55) {
    stateName = "焦躁不安";
    trend = "波动";
  }
  const advice = stateName === "自我怀疑"
    ? "连续出现负面判断。建议安排家庭时间或心理辅导，避免在下一次关键战前硬扛。"
    : stateName === "焦躁不安"
      ? "关注合同与场外事件，训练前先完成一次呼吸调整。"
      : stateName === "愤怒燃烧"
        ? "把情绪用在压迫上，但避免与裁判争论。"
        : stateName === "自信爆棚"
          ? "可以主动承担关键回合，但注意不要忽视队友。"
          : "保持当前节奏，下一场继续稳定输出。";
  next.psychology.state = stateName;
  next.psychology.trend = trend;
  next.psychology.advice = advice;
  if (form < 5.5 && mind < 45) next.psychology.energy = clamp(energy - 5, 0, 100);
  return next;
}

export function startComeback(state, kind) {
  const next = cloneState(state);
  const allowed = kind === "traditional" ? !next.comeback.traditionalUsed : !next.comeback.legendaryUsed;
  if (!allowed) return next;
  if (kind === "legendary" && !next.comeback.eligible) {
    pushFeed(next, "传奇复出未解锁", "只有生涯成就足够时才出现传奇复出入口。");
    return next;
  }
  next.comeback.traditionalUsed = next.comeback.traditionalUsed || kind === "traditional";
  next.comeback.legendaryUsed = next.comeback.legendaryUsed || kind === "legendary";
  const roll = deterministicRoll(`${next.seed}|comeback|${kind}|${next.world.season}`);
  const success = kind === "legendary" ? roll > 0.15 : roll > 0.5;
  const attempt = {
    kind,
    season: next.world.season,
    success,
    clubId: next.player.clubId,
    date: next.world.date
  };
  next.comeback.attempts.push(attempt);
  next.career.milestones.push(`${next.world.season}:${kind === "legendary" ? "传奇复出" : "传统复出"}尝试`);
  if (success) {
    next.player.status = "active";
    next.player.retired = false;
    next.world.phase = next.world.phase === "final" || next.world.phase === "retirement" ? "season" : next.world.phase;
    pushFeed(next, kind === "legendary" ? "传奇复出" : "复出成功", "你重新进入一线队名单，新的赛季从恢复训练开始。");
  } else {
    pushFeed(next, "复出未成功", "试训反馈肯定你的态度，但身体和状态还不足以拿到合同。");
  }
  return next;
}

export function chooseNationalTeam(state, nationId) {
  const next = cloneState(state);
  const team = (next.world?.players || []).find(() => false) ? null : null;
  void team;
  const targetId = canonicalNationId(nationId);
  const currentId = next.nationalTeam.committedNationId
    || canonicalNationId(next.nationalTeam.committedNation || next.player.nationality);
  if (next.nationalTeam.caps > 0 && currentId !== targetId) {
    pushFeed(next, "国家队选择被拒", "你已代表当前协会参加成年正式比赛，无法再更换协会。");
    return next;
  }
  if (!next.player.secondNationality || next.player.secondNationality === "无") {
    pushFeed(next, "国家队选择", "当前没有可更换的第二协会资格。");
    return next;
  }
  const displayName = nationDisplayName(targetId);
  next.nationalTeam.committedNation = displayName;
  next.nationalTeam.committedNationId = targetId;
  next.nationalTeam.status = "committed";
  next.nationalTeam.choicePending = false;
  next.career.milestones.push(`${next.world.season}:选择代表 ${displayName}`);
  pushFeed(next, "国家队选择", `你正式选择代表 ${displayName}，成年国家队资格从此绑定。`);
  return next;
}

export function createClubPromise(state, title, detail) {
  const next = cloneState(state);
  const promise = { id: `promise-${next.world.season}-${next.world.week}-${next.club.promises.length + 1}`, title, detail, date: next.world.date, kept: null };
  next.club.promises.push(promise);
  pushFeed(next, "俱乐部承诺", `${title}：${detail}`);
  return next;
}

export function resolveClubPromise(state, promiseId, kept) {
  const next = cloneState(state);
  const promise = next.club.promises.find((item) => item.id === promiseId);
  if (!promise || promise.kept !== null) return next;
  promise.kept = kept;
  promise.resolvedAt = next.world.date;
  if (kept) {
    next.relations.coach.trust = clamp(next.relations.coach.trust + 8, 0, 100);
    pushFeed(next, "承诺兑现", `${promise.title} 得到兑现，俱乐部与你的关系升温。`);
  } else {
    next.club.politics.influence = clamp(next.club.politics.influence + 4, 0, 100);
    next.transferOffers = next.transferOffers.length ? next.transferOffers : [{
      id: `protest-${next.world.season}`,
      clubId: CLUBS.find((item) => item.id !== next.player.clubId && item.reputation >= 70)?.id || "shanghai-port",
      clubName: CLUBS.find((item) => item.id !== next.player.clubId && item.reputation >= 70)?.name || "海外俱乐部",
      fee: 500000,
      weeklyWage: 12000,
      years: 2,
      role: "稳定出场",
      releaseClause: 800000
    }];
    pushFeed(next, "承诺违约", `${promise.title} 没有被兑现，经纪人帮你向俱乐部提交抗议并要求补偿或转会。`);
  }
  return next;
}

export function clubPoliticsAction(state, action) {
  const next = cloneState(state);
  if (next.club.politics.influence < 60 && action !== "facilities") {
    pushFeed(next, "俱乐部政治未解锁", "你的队内地位还不够高，暂时无法参与选帅或更衣室权力博弈。");
    return next;
  }
  next.club.politics.unlocked = true;
  next.club.politics.influence = clamp(next.club.politics.influence + (action === "facilities" ? 2 : 6), 0, 100);
  const labels = {
    "support-manager": "公开支持主教练",
    "oppose-manager": "向管理层表达对主帅的质疑",
    recommend: "向董事会推荐新任主帅人选",
    facilities: "要求俱乐部升级训练设施"
  };
  next.club.politics.events.push({ id: `politics-${next.world.season}-${next.world.week}-${action}`, action, date: next.world.date, label: labels[action] });
  if (action === "facilities") {
    const club = CLUBS.find((item) => item.id === next.player.clubId);
    next.feed.unshift({ time: next.world.date, title: "训练设施谈判", text: `你向管理层提出升级训练设施，目前等级 ${club?.facilities || 14}。` });
  } else {
    pushFeed(next, "俱乐部政治", labels[action] + "，更衣室和管理层开始重新评估你的位置。");
  }
  return next;
}

export function createRivals(state) {
  const next = cloneState(state);
  if (next.peers.length >= 3) return next;
  const club = CLUBS.find((item) => item.id === next.player.clubId);
  const candidates = (next.world.players || [])
    .filter((player) => player.clubId !== next.player.clubId && player.position === next.player.position && player.status === "active")
    .slice(0, 20);
  for (let index = 0; index < Math.min(3, Math.max(1, candidates.length)); index += 1) {
    const candidate = candidates[Math.floor(deterministicRoll(`${next.seed}|rival|${next.world.season}|${index}`) * candidates.length)];
    if (candidate && !next.peers.some((peer) => peer.id === candidate.id)) {
      next.peers.push({ id: candidate.id, name: candidate.name, clubId: candidate.clubId, position: candidate.position, narrative: "与你同位置的长期对手，媒体常把你们放在同一篇报道里。" });
    }
  }
  pushFeed(next, "长期对手", `球探和媒体开始把你与${next.peers.map((peer) => peer.name).join("、") || "同位置球员"}放在一起比较。`);
  return next;
}

export function unemploymentPath(state, path) {
  const next = cloneState(state);
  if (!["trial", "lower", "semi-pro", "abroad"].includes(path)) return next;
  if (next.unemployment.status !== "none") {
    pushFeed(next, "失业选择已锁定", "你已经在处理一份试训或合同，不能再同时选择另一条路。");
    return next;
  }
  const labels = {
    trial: "参加试训",
    lower: "接受低级别联赛",
    "semi-pro": "转半职业",
    abroad: "前往海外联赛"
  };
  const roll = deterministicRoll(`${next.seed}|unemployed|${path}|${next.world.season}`);
  const success = path === "trial" ? roll > 0.45 : roll > 0.25;
  next.unemployment.status = path;
  next.unemployment.offers.push({ path, season: next.world.season, success, date: next.world.date });
  if (success) {
    next.player.status = "active";
    next.player.retired = false;
    next.world.phase = "season";
    next.player.clubId = path === "abroad" ? "epl-bournemouth" : path === "lower" ? "csl2-beijing-ligong" : "shanghai-shenhua";
    next.player.club = CLUBS.find((item) => item.id === next.player.clubId)?.name || next.player.club;
    next.season = null;
    pushFeed(next, "失业后复出", `${labels[path]}成功，你重新获得一份合同。`);
  } else {
    pushFeed(next, "失业尝试", `${labels[path]}没有立刻成功，你继续寻找下一扇门。`);
  }
  return next;
}

export function postSocial(state, text, custom = false) {
  const next = cloneState(state);
  const id = `social-${next.world.season}-${next.world.week}-${next.media.social.length + 1}`;
  next.media.social.push({ id, date: next.world.date, text, custom });
  next.media.fans = Math.round(next.media.fans * (custom ? 1.006 : 1.003));
  pushFeed(next, "社交媒体", custom ? "你发布了自定义内容，粉丝讨论度小幅上升。" : "你发布了预设内容，评论区保持温和。");
  return next;
}

export function manageTrait(state, { traitId, replaceId, mode = "add" } = {}) {
  const next = cloneState(state);
  const active = next.player.traits || [];
  const memory = next.player.traitMemory || [];
  const target = TRAITS.find((item) => item.id === traitId);
  const replaced = TRAITS.find((item) => item.id === replaceId);
  if (mode === "add") {
    if (!target || active.includes(target.id) || active.length >= 5) return next;
    next.player.traits = [...active, target.id];
    pushFeed(next, "特性学习", `你把“${target.name}”加入当前可执行特性。`);
    return next;
  }
  if (!replaced || !active.includes(replaced.id)) return next;
  const remember = (status) => {
    if (!memory.some((entry) => entry.id === replaced.id && entry.status === status)) {
      memory.push({ id: replaced.id, name: replaced.name, status, date: next.world.date });
    }
  };
  if (mode === "suppress") {
    next.player.traits = active.filter((id) => id !== replaced.id);
    next.player.traitMemory = memory;
    remember("suppressed");
    pushFeed(next, "特性压制", `“${replaced.name}”暂不执行，但学习记忆已保留。`);
    return next;
  }
  if (mode === "replace" && target && !active.includes(target.id)) {
    next.player.traits = active.map((id) => id === replaced.id ? target.id : id);
    next.player.traitMemory = memory;
    remember("replaced");
    pushFeed(next, "特性替换", `“${replaced.name}”退出当前槽位，“${target.name}”投入比赛；旧特性学习记忆已保留。`);
  }
  return next;
}

export function cacheNarrative(state, key, text) {
  const next = cloneState(state);
  if (next.aiCache.some((item) => item.key === key)) return next;
  next.aiCache.push({ key, text, date: next.world.date, season: next.world.season });
  return next;
}

export function validateExtensionPack(pack) {
  const errors = [];
  if (!pack || typeof pack !== "object") return ["扩展包不是对象"];
  if (!pack.version || typeof pack.version !== "string") errors.push("缺少版本字段");
  if (!pack.type || !["database", "crest", "kit", "event"].includes(pack.type)) errors.push("类型必须是 database/crest/kit/event");
  if (!pack.manifest || typeof pack.manifest !== "object") errors.push("缺少 manifest");
  else if (pack.manifest.checksum && typeof pack.manifest.checksum !== "string") errors.push("checksum 必须是字符串");
  if (!Array.isArray(pack.entries) || !pack.entries.length) errors.push("缺少 entries");
  if (pack?.type === "event" && Array.isArray(pack.entries)) {
    for (const entry of pack.entries) {
      if (!entry?.id || !entry?.title || !entry?.text) errors.push("事件扩展条目必须包含 id、title 和 text");
    }
  }
  return errors;
}

export function importExtensionPack(state, pack) {
  const errors = validateExtensionPack(pack);
  if (errors.length) return { state, errors };
  const next = cloneState(state);
  const id = `ext-${next.extensions.length + 1}-${pack.type}`;
  const entries = pack.type === "event"
    ? pack.entries.map((entry) => ({ id: String(entry.id), title: String(entry.title), text: String(entry.text) }))
    : [];
  next.extensions.push({ id, type: pack.type, version: pack.version, importedAt: next.world.date, entryCount: pack.entries.length, entries, deliveredIds: [] });
  pushFeed(next, "扩展包已导入", `${pack.type} 扩展包通过校验，已导入 ${pack.entries.length} 个条目。`);
  return { state: next, errors: [] };
}

export function unlockAudio(state) {
  const next = cloneState(state);
  next.audio.unlocked = true;
  return next;
}

export function setAudioPreferences(state, preferences) {
  const next = cloneState(state);
  next.audio = { ...next.audio, ...preferences };
  return next;
}

export function coachSetFormation(state, formation) {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.formation = formation;
  next.coach.tactics = formation === "4-3-3" ? "边路进攻" : formation === "3-5-2" ? "翼卫控制" : "均衡";
  pushFeed(next, "阵型调整", `你确定使用 ${formation} 阵型。`);
  return next;
}

export function coachSetLineup(state, starters, bench) {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.lineup = { starters, bench };
  pushFeed(next, "首发确定", `你公布了首发十一人与替补席，更衣室开始执行比赛计划。`);
  return next;
}

export function coachSetTraining(state, focus) {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.trainingFocus = focus;
  pushFeed(next, "周训练计划", `本周训练重点调整为${focus}。`);
  return next;
}

export function coachTransferAction(state, action, playerId = "") {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.budget = next.coach.budget || 2000000;
  if (action === "buy") {
    if (next.coach.budget < 100000) {
      pushFeed(next, "转会预算不足", "董事会没有批准这笔引援。");
      return next;
    }
    next.coach.budget -= 100000;
    next.coach.transfers = next.coach.transfers || [];
    next.coach.transfers.push({ action, playerId: playerId || "template-signing", season: next.world.season, amount: 100000 });
    pushFeed(next, "转会引援", "你签下一名符合战术需求的球员。");
  } else if (action === "sell") {
    next.coach.budget += 80000;
    next.coach.transfers = next.coach.transfers || [];
    next.coach.transfers.push({ action, playerId: playerId || "template-sale", season: next.world.season, amount: 80000 });
    pushFeed(next, "转会出售", "你同意放行一名不在计划内的球员。");
  }
  return next;
}

export function coachMoraleAction(state, action) {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.morale = next.coach.morale || 60;
  const delta = action === "team-talk" ? 5 : action === "rest" ? 3 : action === "criticize" ? -2 : 4;
  next.coach.morale = clamp(next.coach.morale + delta, 0, 100);
  pushFeed(next, "更衣室管理", action === "team-talk" ? "你在训练前做了一次简短动员，球员们抬头听完了。" : action === "rest" ? "你给主力安排恢复日，替补球员获得训练时间。" : "你在会议上对表现提出了更明确的要求。");
  return next;
}

export function playerSuggestToCoach(state, suggestion) {
  const next = cloneState(state);
  const roll = deterministicRoll(`${next.seed}|suggest|${next.world.season}|${next.world.week}`);
  const adopted = roll + (next.relations.coach?.trust || 50) / 160 > 0.78;
  next.player.suggestions = next.player.suggestions || [];
  next.player.suggestions.push({ suggestion, adopted, date: next.world.date });
  next.relations.coach.trust = clamp((next.relations.coach.trust || 50) + (adopted ? 3 : -1), 0, 100);
  if (adopted) {
    next.training.positionTraining = next.training.positionTraining || { positionId: "CM", progress: 0, coachApproved: true };
    pushFeed(next, "建议被采纳", `教练采纳了你的建议：${suggestion}。`);
  } else {
    pushFeed(next, "建议未被采纳", `教练听完你的建议后决定维持原有计划：${suggestion}。`);
  }
  return next;
}

export function refereeEvent(state, action) {
  const next = cloneState(state);
  next.match = next.match || {};
  next.match.patience = next.match.patience ?? 100;
  const referee = (next.world.referees || [])[0] || { name: "主裁判", strictness: 12 };
  if (action === "calm") {
    next.match.patience = clamp(next.match.patience + 5, 0, 100);
    pushFeed(next, "裁判互动", `你保持冷静，${referee.name}没有额外记录这次接触。`);
  } else if (action === "pressure") {
    next.match.patience = clamp(next.match.patience - 12, 0, 100);
    next.relations.media.trust = clamp((next.relations.media.trust || 50) - 2, 0, 100);
    pushFeed(next, "裁判互动", `你向第四官员施压，${referee.name}开始更谨慎地注视你。`);
  } else {
    next.match.patience = clamp(next.match.patience - 30, 0, 100);
    next.media.image.controversy = clamp((next.media.image.controversy || 4) + 3, 0, 20);
    pushFeed(next, "假摔被识破", "VAR 回看确认你夸大了接触，你吃到黄牌并被打上“跳水者”标签。");
  }
  return next;
}

export function moralChoice(state, choiceId) {
  const next = cloneState(state);
  const choices = {
    honest: { professionalism: 1, image: 1, text: "你选择保持平衡继续进攻，裁判没有吹哨，但你赢得了队友和媒体的尊重。" },
    dive: { professionalism: -2, controversy: 3, text: "你顺势倒地，VAR 介入后判罚没有发生，你的声望因此受损。" },
    strong: { professionalism: 0, dominance: 2, text: "你强硬但不越界地完成对抗，比赛没有因此失控。" }
  };
  const choice = choices[choiceId];
  if (!choice) return next;
  next.player.hidden.professionalism = clamp((next.player.hidden.professionalism || 10) + choice.professionalism, 1, 20);
  next.media.image.professional = clamp((next.media.image.professional || 12) + choice.image, 0, 20);
  next.media.image.controversy = clamp((next.media.image.controversy || 4) + (choice.controversy || 0), 0, 20);
  next.media.image.dominance = clamp((next.media.image.dominance || 9) + (choice.dominance || 0), 0, 20);
  next.career.milestones.push(`${next.world.season}:道德选择 ${choiceId}`);
  pushFeed(next, "道德困境", choice.text);
  return next;
}

export function createFactions(state) {
  const next = cloneState(state);
  if (next.club.factions.length) return next;
  const squad = (next.world.players || []).filter((player) => player.clubId === next.player.clubId).slice(0, 18);
  if (squad.length < 23) {
    next.club.factions = [
      { id: "locals", name: "本土帮", core: squad[0]?.name || "队长", power: 60, attitude: "友好" },
      { id: "young", name: "年轻组", core: squad[4]?.name || "新星", power: 45, attitude: "中立" }
    ];
  } else {
    next.club.factions = [
      { id: "locals", name: "本土帮", core: squad[0]?.name || "队长", power: 70, attitude: "友好" },
      { id: "foreign", name: "外援组", core: squad[8]?.name || "外援", power: 65, attitude: "中立" },
      { id: "young", name: "年轻组", core: squad[12]?.name || "新星", power: 50, attitude: "中立" }
    ];
  }
  next.feed.unshift({ time: next.world.date, title: "更衣室派系", text: `更衣室逐渐分成 ${next.club.factions.map((item) => item.name).join("、")}，各派核心人物开始影响训练氛围。` });
  return next;
}

export function mentorApply(state, mentorId) {
  const next = cloneState(state);
  if (next.mentor.mentor) return next;
  const mentors = (next.world.players || []).filter((player) => player.clubId === next.player.clubId && player.position === next.player.position);
  const mentor = mentors[0] || { id: "legend-coach", name: "传奇助教", position: next.player.position };
  next.mentor.mentor = { id: mentor.id, name: mentor.name, progress: 0, learned: false };
  pushFeed(next, "拜师", `你向${mentor.name}提出拜师请求，他答应在半个赛季里观察你的训练。`);
  return next;
}

export function mentorTeach(state) {
  const next = cloneState(state);
  if (!next.mentor.mentor) return next;
  next.mentor.mentor.progress = clamp((next.mentor.mentor.progress || 0) + 20, 0, 100);
  if (next.mentor.mentor.progress >= 100 && !next.mentor.mentor.learned) {
    next.mentor.mentor.learned = true;
    next.player.hidden.professionalism = clamp((next.player.hidden.professionalism || 10) + 1, 1, 20);
    next.mentor.learnedTraits.push("一脚出球");
    next.career.milestones.push(`${next.world.season}:完成拜师学习`);
    pushFeed(next, "拜师完成", "你终于理解了他说的“传球前先观察三次”是什么意思。");
  } else {
    pushFeed(next, "拜师学习", "师徒关系保持稳定，你开始模仿他的处理节奏。");
  }
  return next;
}

export function mediaInterview(state, choiceId) {
  const next = cloneState(state);
  const choices = {
    standard: { professional: 1, controversy: 0, text: "你只谈比赛与团队，记者把你的回答归入“职业”标签。" },
    bold: { professional: 0, controversy: 3, dominance: 1, text: "你放出一句有攻击性的回应，流量立刻涨了起来。" },
    humor: { warmth: 1, professional: 0, text: "你用玩笑化解了尖锐问题，评论区开始转发这个片段。" }
  };
  const choice = choices[choiceId];
  if (!choice) return next;
  next.media.image.professional = clamp((next.media.image.professional || 12) + (choice.professional || 0), 0, 20);
  next.media.image.controversy = clamp((next.media.image.controversy || 4) + (choice.controversy || 0), 0, 20);
  next.media.image.warmth = clamp((next.media.image.warmth || 11) + (choice.warmth || 0), 0, 20);
  next.media.image.dominance = clamp((next.media.image.dominance || 9) + (choice.dominance || 0), 0, 20);
  next.media.fans = Math.round(next.media.fans * (choiceId === "bold" ? 1.01 : 1.004));
  pushFeed(next, "媒体采访", choice.text);
  return next;
}

export function fanEvent(state, action) {
  const next = cloneState(state);
  const fanGroup = next.fanCulture.groups[0] || { id: "hardcore", name: "铁杆球迷组织", trust: 55 };
  if (!next.fanCulture.groups.length) next.fanCulture.groups.push(fanGroup);
  if (action === "greet") {
    fanGroup.trust = clamp((fanGroup.trust || 55) + 6, 0, 100);
    next.fanCulture.tifo.push({ id: `tifo-${next.world.season}-${next.world.week}`, text: "看台为你举起了“我们的人”横幅。" });
    pushFeed(next, "球迷文化", fanGroup.name + "开始为你创作助威歌。");
  } else if (action === "betray") {
    fanGroup.trust = clamp((fanGroup.trust || 55) - 25, 0, 100);
    pushFeed(next, "球迷反应", "转会传闻后，看台出现了焚烧球衣的画面，铁杆球迷组织公开表达失望。");
  } else {
    fanGroup.trust = clamp((fanGroup.trust || 55) + 2, 0, 100);
    pushFeed(next, "球迷互动", "你在赛后绕场感谢球迷，看台回以掌声。");
  }
  return next;
}

export function recordMilestone(state, record) {
  const next = cloneState(state);
  const id = `record-${next.world.season}-${next.world.week}-${next.records.length + 1}`;
  next.records.push({ id, record, date: next.world.date, season: next.world.season });
  next.career.milestones.push(`${next.world.season}:${record}`);
  pushFeed(next, "纪录追逐", record);
  return next;
}

export function awardNomination(state, award) {
  const next = cloneState(state);
  // 确定性奖项解析层（game/src/awards.js）：满足条件必得、不满足不得得、无随机发奖
  const { definition, won } = nominateAward(next, award);
  const title = definition?.title || award;
  if (won) {
    pushFeed(next, "年度评选", `你赢得${title}，媒体开始写专题。`);
  } else {
    pushFeed(next, "年度评选", `你入围${title}，最终没有获奖。`);
  }
  return next;
}

export function worldChange(state, change) {
  const next = cloneState(state);
  const id = `world-${next.world.season}-${next.world.news.length + 1}`;
  next.world.news.unshift({ time: next.world.date, title: "世界变迁", text: change });
  next.world.clubStates = (next.world.clubStates || []).map((club) => ({ ...club, managerStability: clamp(club.managerStability + (change.includes("易主") ? -15 : 0), 0, 100) }));
  next.feed.unshift({ time: next.world.date, title: "世界变迁", text: change });
  return next;
}

export function halftimeChoice(state, choiceId) {
  const next = cloneState(state);
  const choices = {
    silence: { mind: 2, text: "你埋头听完教练布置，把情绪留在更衣室。" },
    motivate: { mind: 6, morale: 3, text: "你主动激励队友，房间里的呼吸声变得整齐。" },
    tactics: { mind: 4, coach: 3, text: "你向教练提出调整，他同意改变右侧的防守职责。" },
    focus: { mind: 8, text: "你独自调整呼吸，把上半场的杂音关在门外。" }
  };
  const choice = choices[choiceId];
  if (!choice) return next;
  next.resources.mind = clamp(next.resources.mind + (choice.mind || 0), 0, 100);
  next.psychology.energy = clamp(next.psychology.energy + (choice.mind || 0), 0, 100);
  next.relations.coach.trust = clamp((next.relations.coach.trust || 50) + (choice.coach || 0), 0, 100);
  next.coach = next.coach || null;
  if (next.coach) next.coach.morale = clamp((next.coach.morale || 60) + (choice.morale || 0), 0, 100);
  pushFeed(next, "中场调整", choice.text);
  return next;
}

export function psychScar(state, title) {
  const next = cloneState(state);
  const id = `scar-${next.world.season}-${next.world.week}-${next.psychology.scars.length + 1}`;
  next.psychology.scars.push({ id, title, date: next.world.date, active: true });
  next.psychology.energy = clamp(next.psychology.energy - 12, 0, 100);
  pushFeed(next, "心理伤疤", title);
  return next;
}

export function mediaImageLabel(state) {
  const image = state.media.image || { professional: 12, controversy: 4, warmth: 11, dominance: 9 };
  const labels = [];
  if (image.professional >= 16 && image.controversy <= 5) labels.push("职业楷模");
  if (image.controversy >= 16 && image.professional <= 10) labels.push("坏小子");
  if (image.warmth <= 8 && image.dominance >= 16) labels.push("沉默刺客");
  if (image.warmth >= 16 && image.controversy <= 5) labels.push("好好先生");
  if (image.controversy >= 14) labels.push("大嘴巴");
  if (image.warmth >= 14 && image.professional >= 14) labels.push("草根英雄");
  return labels.length ? labels : ["职业球员"];
}

export function createBrand(state, brandName) {
  const next = cloneState(state);
  if (next.media.fans < 5000000) {
    pushFeed(next, "个人品牌未解锁", "达到洲际级粉丝量后才可以创建个人品牌。");
    return next;
  }
  if (next.finances.brand) return next;
  next.finances.brand = { name: brandName, value: 100000, createdAt: next.world.date };
  pushFeed(next, "个人品牌", `你创立了个人品牌 ${brandName}，首批产品在社交媒体发布。`);
  return next;
}

export function transferAdaptation(state) {
  const next = cloneState(state);
  const adapt = next.player.hidden.adaptability || 10;
  next.player.adaptation = {
    weeks: adapt >= 15 ? 2 : adapt >= 10 ? 8 : 18,
    remaining: adapt >= 15 ? 2 : adapt >= 10 ? 8 : 18,
    penalty: adapt >= 15 ? 0 : adapt >= 10 ? 1 : 3
  };
  pushFeed(next, "转会适应期", `新联赛与城市需要 ${next.player.adaptation.weeks} 周适应，期间状态会暂时波动。`);
  return next;
}

export function agentEvent(state, action) {
  const next = cloneState(state);
  const agent = next.relations.agent || { trust: 50, respect: 50, closeness: 40 };
  if (action === "leak") {
    agent.trust = clamp(agent.trust - 12, 0, 100);
    next.media.image.controversy = clamp((next.media.image.controversy || 4) + 2, 0, 20);
    pushFeed(next, "经纪人事件", "经纪人向媒体泄露了你的转会意愿，更衣室出现裂痕。");
  } else if (action === "replace") {
    const profiles = [
      { id: "agent-chen-lan", name: "陈岚", type: "职业发展型", resources: 72, loyalty: 68, interests: "优先稳定出场与长期声誉" },
      { id: "agent-luo-qing", name: "罗青", type: "商业平衡型", resources: 76, loyalty: 61, interests: "兼顾合同金额、肖像权与上场时间" },
      { id: "agent-he-yuan", name: "何远", type: "转会进取型", resources: 81, loyalty: 54, interests: "优先高平台与跨联赛机会" }
    ];
    const previous = next.agent || profiles[0];
    const replacement = profiles.find((profile) => profile.id !== previous.id) || profiles[0];
    next.agent = {
      ...replacement,
      history: [
        ...(previous.history || []),
        { date: next.world.date, action: "解约", note: `结束与${previous.name}的合作。` },
        { date: next.world.date, action: "签约", note: `改由${replacement.name}处理职业事务。` }
      ]
    };
    agent.trust = 55;
    agent.closeness = 45;
    next.feed.unshift({ time: next.world.date, title: "更换经纪人", text: `你支付违约金结束与${previous.name}的合作，${replacement.name}开始处理你的商业事务。` });
  } else {
    agent.trust = clamp(agent.trust + 4, 0, 100);
    pushFeed(next, "经纪人事件", "经纪人帮你筛掉一份没有出场规划的报价，保持耐心。");
  }
  next.relations.agent = agent;
  return next;
}

export function familyNextGen(state) {
  const next = cloneState(state);
  if (next.player.partner && !next.fanCulture.children) {
    next.fanCulture.children = [{ id: `child-${next.world.season}`, name: "孩子", birthYear: next.world.season - 1, note: "出生后，家人希望你考虑退役后的生活。" }];
    next.relations.family.closeness = clamp((next.relations.family.closeness || 60) + 5, 0, 100);
    pushFeed(next, "下一代", "你的孩子出生了。家人开始讨论未来是否让他进入青训。");
  } else {
    pushFeed(next, "家庭", "目前没有下一代叙事触发条件。");
  }
  return next;
}

export function ritualFlashback(state) {
  const next = cloneState(state);
  next.career.milestones.push(`${next.world.season}:回忆闪回——${next.player.ritual}`);
  pushFeed(next, "回忆闪回", `你低头系紧${next.player.ritual}时，第一次来到这座球场的画面从记忆里浮上来。`);
  return next;
}

export function injuryRehab(state, pace) {
  const next = cloneState(state);
  const injury = next.health.injuries.find((item) => item.active);
  if (!injury) {
    pushFeed(next, "康复", "当前没有需要处理的伤病。");
    return next;
  }
  if (pace === "aggressive") {
    injury.remaining = Math.max(0, injury.remaining - 2);
    next.health.bodyAge = clamp(next.health.bodyAge + 0.1, 1, 99);
    pushFeed(next, "康复节奏", "你选择加快康复，身体年龄压力小幅上升。");
  } else if (pace === "conservative") {
    injury.remaining = Math.max(0, injury.remaining - 1);
    next.health.bodyAge = clamp(next.health.bodyAge - 0.05, 1, 99);
    pushFeed(next, "康复节奏", "你选择保守康复，理疗师认可你的耐心。");
  } else {
    injury.remaining = Math.max(0, injury.remaining - 1);
    next.health.bodyAge = clamp(next.health.bodyAge + 0.05, 1, 99);
    pushFeed(next, "康复节奏", "你按标准方案推进康复。");
  }
  return next;
}

export function goldenBall(state) {
  const next = cloneState(state);
  // 金球奖确定性结算：满足条件必得、不满足不得得（game/src/awards.js）
  const { definition, won } = nominateAward(next, "金球奖");
  if (definition && won) {
    next.media.reputation = clamp(next.media.reputation + 8, 10, 99);
    next.media.fans = Math.round(next.media.fans * 1.25);
    pushFeed(next, "金球奖", "你赢得金球奖，全球媒体开始重写你的生涯叙事。");
  } else {
    pushFeed(next, "金球奖", "你入围金球奖候选名单，最终没有获奖。");
  }
  return next;
}

export function unlockHiddenTitle(state, title) {
  const next = cloneState(state);
  if (next.hiddenTitles.some((item) => item.title === title)) return next;
  next.hiddenTitles.push({ title, season: next.world.season, date: next.world.date });
  addHonor(next, { id: `honor-hidden-${next.world.season}-${title}`, title, awardId: "hidden-title", season: next.world.season, category: "hidden", won: true });
  next.career.milestones.push(`${next.world.season}:获得隐藏称号 ${title}`);
  pushFeed(next, "隐藏称号", `系统判定你获得隐藏称号：${title}。`);
  return next;
}

export function mindGame(state, choiceId) {
  const next = cloneState(state);
  const choices = {
    calm: { pressure: 2, text: "你冷静回应：“我专注于比赛，用表现说话。”" },
    humor: { warmth: 1, pressure: 1, text: "你幽默化解：“我确实被冲昏了头脑——被训练累昏的。”" },
    aggressive: { aggression: 3, controversy: 2, text: "你激烈回击：“他应该担心自己的状态。”" },
    silent: { pressure: -1, text: "你让经纪人代答“不予置评”。" }
  };
  const choice = choices[choiceId];
  if (!choice) return next;
  next.psychology.energy = clamp(next.psychology.energy + (choice.pressure || 0), 0, 100);
  next.player.hidden.pressure = clamp((next.player.hidden.pressure || 10) + (choice.pressure || 0), 1, 20);
  next.media.image.warmth = clamp((next.media.image.warmth || 11) + (choice.warmth || 0), 0, 20);
  next.media.image.controversy = clamp((next.media.image.controversy || 4) + (choice.controversy || 0), 0, 20);
  next.player.attributes.aggression = clamp((next.player.attributes.aggression || 50) + (choice.aggression || 0), 20, 99);
  pushFeed(next, "对手心理战", choice.text);
  return next;
}

export function potentialBreakthrough(state, source = "赛季末") {
  const next = cloneState(state);
  const hidden = next.player.hidden;
  const cap = Math.min(99, (hidden.potential || 80) + 5);
  if ((hidden.potential || 80) >= cap) {
    pushFeed(next, "潜力突破", "你的潜力上限已经达到当前生涯的最大可能，无法继续突破。");
    return next;
  }
  const gain = source.includes("决定性") ? 2 : 1;
  hidden.potential = Math.min(cap, (hidden.potential || 80) + gain);
  next.career.milestones.push(`${next.world.season}:潜力突破 +${gain}`);
  pushFeed(next, "心流时刻", "教练在训练后重新翻阅你的球探报告，他知道有些东西已经不一样了。");
  return next;
}

export function nationalCaptain(state, action) {
  const next = cloneState(state);
  if (next.player.hidden.leadership < 16 && action !== "respect") {
    pushFeed(next, "国家队更衣室", "你的领导力还不足以争夺队长袖标。");
    return next;
  }
  if (action === "captain") {
    next.player.hidden.leadership = clamp(next.player.hidden.leadership + 1, 1, 20);
    next.nationalTeam.captain = true;
    pushFeed(next, "国家队队长", "你被任命为国家队队长，更衣室开始围绕你组织赛前讲话。");
  } else {
    next.relations.family.trust = clamp((next.relations.family.trust || 60) + 2, 0, 100);
    pushFeed(next, "国家队内关系", "你主动与俱乐部对手兼国家队队友交流，国家队内关系升温。");
  }
  return next;
}
