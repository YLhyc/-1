import {
  acceptCoachJob,
  acceptOffer,
  agentEvent,
  applyPositionTraining,
  awardNomination,
  advanceWeek,
  buildLifeReport,
  buildErrorReport,
  chooseNationalTeam,
  chooseMatchAction,
  classifyFocusFixture,
  clubPoliticsAction,
  coachMoraleAction,
  coachSetFormation,
  coachSetLineup,
  coachSetTraining,
  coachTransferAction,
  continueMatch,
  createClubPromise,
  createBrand,
  createFactions,
  createInitialState,
  createRivals,
  deleteSave,
  exportState,
  fanEvent,
  familyNextGen,
  goldenBall,
  halftimeChoice,
  importExtensionPack,
  importState,
  injuryRehab,
  listSaves,
  loadState,
  markFocusFixture,
  mediaInterview,
  manageTrait,
  mentorApply,
  mentorTeach,
  mindGame,
  moralChoice,
  nationalCaptain,
  negotiateOffer,
  playerSuggestToCoach,
  potentialBreakthrough,
  postSocial,
  psychScar,
  recordMilestone,
  recordDiagnostic,
  refereeEvent,
  refreshMentalState,
  resolveClubPromise,
  retireCoach,
  retirePlayer,
  saveState,
  selectTransferOffer,
  setAudioPreferences,
  ritualFlashback,
  simulateSeason,
  simulateToRetirement,
  startComeback,
  startCurrentMatch,
  unemploymentPath,
  transferAdaptation,
  unlockAudio,
  unlockHiddenTitle,
  worldChange
} from "./career.js";
import { createAudioEngine } from "./audio.js";
import { generateSocialPost } from "./ai.js";
import { CLUBS, COACH_JOBS, LEAGUES, NATIONAL_TEAMS, POSITIONS, SECOND_NATIONALITIES, TALENTS, TRAINING_PLANS, TRAITS } from "./data.js";
import { listPrivateAssets, resolveAssociationAsset, resolveAwardAsset, resolveClubAsset, resolveCompetitionAsset, resolveKitAsset, resolveNationAssets } from "./assets.js";
import { clearPrivateAssetDb, importPrivateZip, loadPrivateAssets } from "./private-assets.js";

const app = document.querySelector("#app");
let storage;
let state = null;
let toastTimer;
let audioEngine = null;
let privateAssetCount = 0;

function getStorage() {
  if (storage) return storage;
  storage = globalThis.localStorage;
  return storage;
}

function activeSaveId() {
  try {
    return getStorage().getItem("fc-career-active");
  } catch {
    return null;
  }
}

function restoreState() {
  const id = activeSaveId();
  if (!id) {
    state = null;
    return;
  }
  try {
    state = loadState(getStorage(), id);
  } catch {
    state = null;
  }
}

restoreState();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function relationLabel(value) {
  if (value >= 76) return "稳定";
  if (value >= 61) return "建立中";
  if (value >= 43) return "观察";
  return "疏远";
}

function mentalLabel(value) {
  if (value >= 82) return "充沛";
  if (value >= 68) return "平静";
  if (value >= 48) return "摇摆";
  return "紧绷";
}

function abilityGrade(value) {
  return clamp(Math.round((value - 38) / 6.5), 1, 9);
}

function renderClubBadge(clubOrId, className = "entity-badge") {
  const club = typeof clubOrId === "object" ? clubOrId : CLUBS.find((item) => item.id === clubOrId);
  const asset = resolveClubAsset(club || clubOrId);
  if (!asset) return "";
  const label = club?.name || club?.short || club?.id || clubOrId;
  return `<img class="${className}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(label)}" data-asset-id="${escapeHtml(asset.assetId || "")}" loading="lazy" decoding="async">`;
}

function renderNationFlags(primary, secondary, className = "nation-flags") {
  return `<span class="${className}" aria-label="${escapeHtml([primary, secondary].filter((value) => value && value !== "无").join("、") || "未列明国籍")}">${resolveNationAssets(primary, secondary).map((asset) => `<img src="${escapeHtml(asset.src)}" alt="${escapeHtml(asset.id.replace(/^nation-/, ""))}" data-asset-id="${escapeHtml(asset.assetId || "")}" loading="lazy" decoding="async">`).join("")}</span>`;
}

function renderAssociationBadge(team, className = "association-badge") {
  if (!team) return "";
  const asset = resolveAssociationAsset(team);
  if (!asset) return "";
  return `<img class="${className}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(`${team.name}足协徽章`)}" data-asset-id="${escapeHtml(asset.assetId || "")}" data-asset-role="association" loading="lazy" decoding="async">`;
}

function renderPrivateAssetPreview() {
  if (!privateAssetCount) return "";
  const imported = listPrivateAssets();
  const club = CLUBS.find((item) => imported.some((asset) => asset.type === "club" && asset.fmId === item.fmId));
  const kitClub = CLUBS.find((item) => imported.some((asset) => asset.type === "kit" && asset.fmId === item.fmId && asset.variant === "home"));
  const competition = LEAGUES.find((item) => imported.some((asset) => asset.type === "competition" && asset.fmId === item.fmId));
  const nation = NATIONAL_TEAMS.find((item) => imported.some((asset) => asset.type === "nation" && asset.fmId === item.fmId));
  return `<div class="private-asset-preview" data-private-asset-preview><span>已导入资源预览</span>${club ? `<b>队徽 ${renderClubBadge(club, "private-preview-badge")}${escapeHtml(club.name)}</b>` : ""}${kitClub ? `<b>球衣 ${renderKitBadge(kitClub)}${escapeHtml(kitClub.name)}</b>` : ""}${competition ? `<b>赛事 ${renderCompetitionBadge(competition.id, "private-preview-badge")}${escapeHtml(competition.name)}</b>` : ""}${nation ? `<b>协会 ${renderAssociationBadge(nation, "private-preview-badge")}${escapeHtml(nation.name)}</b>` : ""}</div>`;
}

function renderAwardBadge(award, className = "award-badge") {
  const asset = resolveAwardAsset(award);
  if (!asset) return "";
  return `<img class="${className}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(award?.award || award?.title || award || "荣誉")}" data-asset-id="${escapeHtml(asset.assetId || "")}" loading="lazy" decoding="async">`;
}

function renderCompetitionBadge(competitionId, className = "competition-badge") {
  const competition = LEAGUES.find((item) => item.id === competitionId || item.name === competitionId);
  const asset = resolveCompetitionAsset(competition || competitionId);
  if (!asset) return "";
  return `<img class="${className}" src="${escapeHtml(asset.src)}" alt="${escapeHtml(competition?.name || competitionId || "赛事")}" data-asset-id="${escapeHtml(asset.assetId || "")}" loading="lazy" decoding="async">`;
}

function renderKitBadge(clubOrId, variant = "home") {
  const club = typeof clubOrId === "object" ? clubOrId : CLUBS.find((item) => item.id === clubOrId);
  const asset = resolveKitAsset(club || clubOrId, variant);
  if (!asset) return "";
  return `<img class="kit-badge" src="${escapeHtml(asset.src)}" alt="${escapeHtml(`${club?.name || clubOrId} ${variant}`)}" data-asset-id="${escapeHtml(asset.assetId || "")}" loading="lazy" decoding="async">`;
}

function phaseLabel(state) {
  const phase = state.world.phase;
  const labels = {
    academy: "青训",
    contract: "合同谈判",
    season: "职业赛季",
    offseason: "休赛期",
    retirement: "退役抉择",
    coach: "教练生涯",
    final: "人生报告"
  };
  return labels[phase] || phase;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function commit(next, message = "") {
  if (!next) return;
  state = saveState(next, getStorage());
  render();
  if (message) showToast(message);
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "auto" });
  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" })));
}

function setView(view) {
  if (!state) return;
  commit({ ...state, ui: { ...state.ui, view } });
}

function renderPlayerCard() {
  const club = CLUBS.find((item) => item.id === state.player.clubId);
  return `
    <article class="player-card surface-card">
      <div class="player-assets">${renderClubBadge(club || state.player.club, "crest")}${renderKitBadge(club || state.player.club)}</div>
      <div class="player-identity">
        <p>${escapeHtml(state.player.club)} · ${state.world.season}</p>
        <h2>${escapeHtml(state.player.name)}</h2>
        <div><span>${escapeHtml(state.player.position)}</span><span>${state.player.age}岁</span><span>${escapeHtml(state.player.foot)}</span><span class="identity-nation">${renderNationFlags(state.player.nationality, state.player.secondNationality)}${escapeHtml(state.player.nationality)}</span></div>
      </div>
      <div class="overall"><small>媒体/市场 OVR</small><strong>${state.player.overall}</strong><span>${state.player.retired ? "已退役" : `状态 ${state.health.form.toFixed(1)}`}</span></div>
    </article>`;
}

function renderMetric(label, value, hint, tone = "") {
  return `<article class="metric-card surface-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`;
}

function renderFeed() {
  const feed = state.feed || [];
  return `
    <section class="feed-card surface-card">
      <header><div><span>${state.world.date}</span><h2>生涯日志</h2></div><button data-action="view" data-view="people">查看关系</button></header>
      ${feed.slice(0, 4).map((item) => `<article><time>${escapeHtml(item.time || "")}</time><div><b>${escapeHtml(item.title || "")}</b><p>${escapeHtml(item.text || "")}</p></div></article>`).join("")}
    </section>`;
}

function renderWorldSimulation() {
  const leagues = state.world.leagueSimulations || [];
  const detailed = leagues.find((league) => league.precision === "detailed");
  const competitions = state.world.competitions || [];
  return `
    <section class="world-simulation surface-card">
      <header><div><span>世界模拟</span><h2>${escapeHtml(detailed?.name || "相关联赛")}</h2></div><b>${leagues.filter((league) => league.precision === "detailed").length} 详细 / ${leagues.filter((league) => league.precision === "simplified").length} 简化</b></header>
      <p>相关联赛保存完整轮次赛果；其他联赛保存积分、奖项与关键纪录，转会后自动切换精度。</p>
      <ul class="memory-list">${competitions.map((competition) => `<li><b>${escapeHtml(competition.name)}</b><span>${competition.kind === "continental-cup" ? "欧战" : competition.kind === "youth" ? "青年赛事" : "抽象地区联赛"} · ${competition.precision === "detailed" ? "详细" : "简化"} · 第 ${competition.currentRound}/${competition.rounds} 轮</span></li>`).join("")}</ul>
    </section>`;
}

function renderCreate() {
  return `
    <section class="view create-view">
      <header class="view-heading"><div><span>NEW CAREER</span><h1>创建你的足球人生</h1></div><p>中国开档优先。所有自定义内容都会明确标记，你仍可获得游戏内成就。</p></header>
      <form class="create-form" id="createForm">
        <section class="create-section surface-card">
          <header class="create-section-heading"><div><span>IDENTITY</span><h2>球员身份</h2></div><p>先确定你是谁，以及你从哪里开始。</p></header>
          <div class="create-fields identity-fields">
            <label class="form-field field-wide"><span>姓名</span><input id="newName" name="name" value="林骁" maxlength="20" autocomplete="off"></label>
            <label class="form-field"><span>主打位置</span><select id="newPosition" name="position">${POSITIONS.map((item) => `<option value="${item.id}" ${item.id === "CAM" ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
            <label class="form-field"><span>天赋倾向</span><select id="newTalent" name="talent">${TALENTS.map((item) => `<option value="${item.id}" ${item.id === "steady" ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
          </div>
        </section>
        <section class="create-section surface-card">
          <header class="create-section-heading"><div><span>PROFILE</span><h2>能力塑形</h2></div><p>偏置只改变初始倾向，留空项由系统生成。</p></header>
          <div class="create-fields bias-fields">
            <label class="form-field"><span>技术偏置</span><select id="newTechBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
            <label class="form-field"><span>身体偏置</span><select id="newPhysicalBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
            <label class="form-field"><span>精神偏置</span><select id="newMentalBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
            <label class="form-field"><span>潜力上限 <small>70–99，留空自动</small></span><input id="newPotential" type="number" min="70" max="99" value=""></label>
            <label class="form-field"><span>伤病倾向 <small>1–20，留空自动</small></span><input id="newInjuryProneness" type="number" min="1" max="20" value=""></label>
          </div>
        </section>
        <section class="create-section surface-card">
          <header class="create-section-heading"><div><span>BACKGROUND</span><h2>出身与归属</h2></div><p>家庭、国籍和你的第一家俱乐部。</p></header>
          <div class="create-fields background-fields">
            <label class="form-field"><span>家庭背景</span><select id="newFamily" name="family"><option>工人家庭</option><option>中产家庭</option><option>足球世家</option><option>贫寒</option></select></label>
            <label class="form-field"><span>国籍</span><select id="newNationality" name="nationality">${NATIONAL_TEAMS.map((item) => `<option value="${escapeHtml(item.name)}" ${item.id === "chn" ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
            <label class="form-field"><span>第二国籍</span><select id="newSecondNationality" name="secondNationality">${SECOND_NATIONALITIES.map((item) => `<option value="${escapeHtml(item)}" ${item === "无" ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
            <label class="form-field field-wide"><span>初始俱乐部</span><select id="newClub" name="club">${CLUBS.filter((item) => item.league === "csl").map((item) => `<option value="${item.id}" ${item.id === "shanghai-shenhua" ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
          </div>
        </section>
        <section class="create-section surface-card">
          <header class="create-section-heading"><div><span>BODY &amp; KIT</span><h2>身体资料</h2></div><p>这些资料会影响档案展示和生涯初始设定。</p></header>
          <div class="create-fields body-fields">
            <label class="form-field"><span>出生年份</span><select id="newBirthYear" name="birthYear">${[2008, 2009, 2010, 2011, 2012].map((year) => `<option value="${year}" ${year === 2010 ? "selected" : ""}>${year}</option>`).join("")}</select></label>
            <label class="form-field"><span>惯用脚</span><select id="newFoot" name="foot"><option>右脚</option><option>左脚</option><option>双脚</option></select></label>
            <label class="form-field"><span>身高（cm）</span><input id="newHeight" type="number" min="155" max="205" value="176"></label>
            <label class="form-field"><span>体重（kg）</span><input id="newWeight" type="number" min="50" max="100" value="66"></label>
            <label class="form-field"><span>球衣号码</span><input id="newNumber" type="number" min="1" max="99" value="17"></label>
            <label class="check-row"><input id="newCustomized" type="checkbox"><span>标记为自定义生涯</span></label>
          </div>
        </section>
        <section class="create-section create-section-wide surface-card">
          <header class="create-section-heading"><div><span>TRAITS</span><h2>球员特性</h2></div><p>最多选择 5 个；特性会在比赛和长期成长中留下记忆。</p></header>
          <fieldset class="trait-picker"><legend>最多选择 5 个</legend><div class="trait-options">${TRAITS.map((item) => `<label><input type="checkbox" name="trait" value="${item.id}"><span>${escapeHtml(item.name)}</span></label>`).join("")}</div></fieldset>
          <footer class="create-actions"><p>所有字段都可以保留默认值，之后仍能通过训练、转会和事件改变你的生涯。</p><button class="primary-action" data-action="create" type="button">开始生涯</button></footer>
        </section>
      </form>
      <section class="save-list surface-card">
        <h2>已有存档</h2>
        ${renderSaveList()}
      </section>
    </section>`;
}

function renderSaveList() {
  const saves = listSaves(getStorage());
  if (!saves.length) return `<p class="empty-copy">还没有存档。创建后会保存在本机。</p>`;
  return `<div class="save-cards">${saves.map((save) => `
    <article>
      <b>${escapeHtml(save.name)}</b>
      <span>${escapeHtml(save.phase)} · ${escapeHtml(save.date || "")}</span>
      <div><button data-action="load-save" data-id="${escapeHtml(save.id)}">继续</button><button class="danger" data-action="delete-save" data-id="${escapeHtml(save.id)}">删除</button></div>
    </article>`).join("")}</div>`;
}

function renderOverview() {
  const phase = phaseLabel(state);
  const nextAction = nextActionCopy();
  const mind = mentalLabel(state.resources.mind);
  return `
    <section class="view overview-view">
      <div class="overview-grid">
        <section class="career-hero surface-card">
          <p class="eyebrow">${phase} · ${state.world.season} 赛季 · 第 ${state.world.week} 周</p>
          <h1>${nextAction.headline}</h1>
          <p>${nextAction.copy}</p>
          <button class="primary-action" data-action="${nextAction.action}" data-id="${nextAction.id || ""}">${nextAction.label}</button>
        </section>
        <section class="overview-player">${renderPlayerCard()}</section>
         <section class="overview-metrics horizontal-scroll">
          ${renderMetric("身体负荷", `${Math.round(state.resources.load)}%`, state.resources.load > 68 ? "需要留意" : "安全", state.resources.load > 68 ? "danger" : "good")}
          ${renderMetric("心理状态", mind, `${state.resources.mind >= 68 ? "稳定" : "建议生活平衡"}`, state.resources.mind < 48 ? "danger" : "good")}
          ${renderMetric("媒体声望", `${state.media.reputation}`, `${state.media.fans.toLocaleString("zh-CN")} 关注`, "")}
         </section>
        ${renderWorldSimulation()}
         <section class="next-match surface-card">
          <header><div><span>下一节点</span><h2>${nextAction.label}</h2></div><b>${phase}</b></header>
          <p>${nextAction.copy}</p>
          <button class="secondary-action" data-action="${nextAction.action}" data-id="${nextAction.id || ""}">${nextAction.label}</button>
        </section>
        ${renderFeed()}
      </div>
    </section>`;
}

function nextActionCopy() {
  if (state.match?.status === "ready") return { headline: "焦点比赛已经就绪", copy: "比赛引擎已经生成不可变事实，叙事只负责表达。", action: "view", id: "match", label: "进入比赛" };
  if (state.match?.status === "live") return { headline: "比赛正在进行", copy: "选择表达你的意图，执行由事实与能力共同决定。", action: "view", id: "match", label: "回到比赛" };
  if (state.world.phase === "contract") return { headline: "三份合同摆在桌上", copy: "选择优先谈判对象不会立即签约，但会改变经纪人的工作方向。", action: "view", id: "career", label: "查看合同" };
  if (state.world.phase === "retirement") return { headline: "球员生涯到了分岔口", copy: "你可以退役并进入教练世界，也可以继续按赛季推进。", action: "view", id: "career", label: "退役流程" };
  if (state.world.phase === "final") return { headline: "人生报告已经生成", copy: "球员与教练的合并旅程会在这里归档。", action: "view", id: "career", label: "查看人生报告" };
  if (state.world.phase === "coach") return { headline: "教练席上的新任务", copy: "战术、训练、转会与更衣室现在都交给你。", action: "advance", id: "", label: "推进一周" };
  if (state.world.phase === "offseason") return { headline: "休赛期正在恢复", copy: "身体和心理都在回血，经纪人开始安排商业活动。", action: "advance", id: "", label: "推进一周" };
  return { headline: "继续推进生涯", copy: "每次推进都会按你的训练计划处理一周，焦点比赛会在到达时停下来。", action: "advance", id: "", label: "推进一周" };
}

function renderPsychology() {
  const psychology = state.psychology || { energy: 80, state: "平静专注", trend: "稳定", advice: "保持节奏。" };
  return `
    <section class="surface-card psychology-card">
      <header><div><span>心理仪表盘</span><h2>${escapeHtml(psychology.state)}</h2></div><b>${escapeHtml(psychology.trend)}</b></header>
      <label><span>心理能量</span><b>${Math.round(psychology.energy || 0)}</b><i><em style="width:${Math.min(100, psychology.energy || 0)}%"></em></i></label>
      <p>${escapeHtml(psychology.advice || "")}</p>
    </section>`;
}

function renderWeek() {
  const selected = TRAINING_PLANS.find((item) => item.id === state.training.planId) || TRAINING_PLANS[0];
  const mind = mentalLabel(state.resources.mind);
  const nextFixture = state.season?.fixtures?.find((item) => !item.played);
  const nextFocusReasons = nextFixture ? classifyFocusFixture(state, nextFixture) : [];
  const focusLabels = { opening: "揭幕", midseason: "半程", derby: "德比", cup: "杯赛", "title-race": "争冠", relegation: "保级", milestone: "里程碑", manual: "主动标记", "high-profile": "强强对话" };
  return `
    <section class="view week-view">
      <header class="view-heading"><div><span>${state.world.season} 赛季 · 第 ${state.world.week} 周</span><h1>本周计划</h1></div><p>训练、恢复、生活与商业的分配会进入存档，不会靠刷新重新随机。</p></header>
      ${renderPsychology()}
      <section class="resource-strip horizontal-scroll">
        <article><span>可支配时间</span><b>${Math.round(state.resources.time)}</b><i><em style="width:${Math.min(100, state.resources.time)}%"></em></i></article>
        <article><span>身体负荷</span><b>${Math.round(state.resources.load)}</b><i><em style="width:${Math.min(100, state.resources.load)}%"></em></i></article>
        <article><span>心理状态</span><b>${mind}</b><i><em style="width:${Math.min(100, state.resources.mind)}%"></em></i></article>
      </section>
      <div class="week-layout">
        <section class="calendar-card surface-card">
          <h2>日程</h2>
          <ol class="calendar-list">
            <li class="selected-day"><time>本周</time><div><b>${selected.name}</b><span>${selected.description}</span></div><small>当前计划</small></li>
            <li><time>训练</time><div><b>团队合练</b><span>战术熟悉与基础状态</span></div><small>固定</small></li>
            ${nextFixture ? `<li class="match-day"><time>${nextFixture.round}轮</time><div><b>${escapeHtml(nextFixture.home?.name || "")}</b><span>对 ${escapeHtml(nextFixture.away?.name || "")} · ${nextFocusReasons.length ? nextFocusReasons.map((reason) => focusLabels[reason] || reason).join("/") : "常规"}</span></div><small>${nextFocusReasons.length ? "焦点" : "常规"}</small></li>` : ""}
          </ol>
        </section>
        <section class="activity-card surface-card">
          <h2>调整训练计划</h2>
          <p class="section-note">同一存档状态与选择会产生确定性结果。</p>
          <div class="activity-options">
            ${TRAINING_PLANS.map((plan) => `
              <button class="activity-option ${state.training.planId === plan.id ? "selected" : ""}" data-action="plan" data-id="${plan.id}">
                <span><b>${plan.name}</b><em>${plan.description}</em></span>
                <small>时间 ${plan.time >= 0 ? "-" : ""}${plan.time} · 负荷 ${plan.load >= 0 ? "+" : ""}${plan.load} · 心理 ${plan.mind >= 0 ? "+" : ""}${plan.mind}</small>
              </button>`).join("")}
          </div>
        </section>
        <section class="progress-card surface-card">
          <h2>成长进度</h2>
          ${[["技术", state.growth.technique], ["精神", state.growth.composure], ["身体", state.growth.stamina], ["视野", state.growth.vision]].map(([label, value]) => `<label><span>${label}</span><b>${Math.round(value)}%</b><i><em style="width:${Math.min(100, value)}%"></em></i></label>`).join("")}
          <label><span>位置特训</span><select id="positionTraining"><option value="">选择新位置</option>${POSITIONS.filter((item) => item.id !== state.player.position).map((item) => `<option value="${item.id}" ${state.training.positionTraining?.positionId === item.id ? "selected" : ""}>${item.name} · ${item.roles[0]}</option>`).join("")}</select></label>
          <button class="secondary-action" data-action="position-training">推进位置特训</button>
          <button class="secondary-action" data-action="weak-foot">提升逆足（当前 ${state.player.weakFoot.toFixed(1)}/5）</button>
          <button class="secondary-action" data-action="suggest-tactics">向教练提出战术建议</button>
          ${nextFixture && !nextFocusReasons.includes("manual") ? `<button class="secondary-action" data-action="mark-focus" data-id="${nextFixture.id}" ${(state.season.manualFocusIds?.length || 0) >= (state.season.manualFocusLimit || 2) ? "disabled" : ""}>主动标记下一场为焦点（${state.season.manualFocusIds?.length || 0}/${state.season.manualFocusLimit || 2}）</button>` : ""}
          <button class="primary-action" data-action="advance">推进本周</button>
        </section>
      </div>
    </section>`;
}

function renderScoreboard() {
  if (!state.match) return "";
  const match = state.match;
  return `
    <header class="match-scoreboard">
      <div><span>${escapeHtml(match.home)}</span><b>${match.score.home}</b></div>
      <section><small>${match.minute ? `${match.minute}'` : match.kickoff || ""} · ${renderCompetitionBadge(match.competition, "competition-badge-inline")}${escapeHtml(match.competition || "")}</small><strong>${match.score.home} — ${match.score.away}</strong><em>${match.status === "complete" ? "全场结束" : match.status === "live" ? "焦点回合" : "赛前"}</em></section>
      <div><b>${match.score.away}</b><span>${escapeHtml(match.away)}</span></div>
    </header>`;
}

function renderParagraphs(paragraphs, className = "") {
  return paragraphs.map((paragraph) => `<p class="${className}">${escapeHtml(paragraph)}</p>`).join("");
}

function renderMatchTimeline() {
  if (!state.match?.timeline?.length) return `<p class="empty-copy">比赛开始后，客观事件会记录在这里；叙事文本不会改写这些事实。</p>`;
  return `<ol class="match-timeline">${state.match.timeline.slice().reverse().map((item) => `<li class="${item.type}"><time>${item.minute}'</time><p>${escapeHtml(item.text)}</p></li>`).join("")}</ol>`;
}

function renderMatchPreview() {
  const match = state.match;
  return `
    <div class="match-layout preview-layout">
      <article class="match-narrative surface-card pregame-card">
        <p class="eyebrow">${escapeHtml(match.venue || "")} · ${escapeHtml(match.weather || "")}</p>
        <h1>${escapeHtml(match.pregame?.[0]?.slice(0, 18) || "比赛即将开始")}</h1>
        <div class="scene-prose pregame-prose">${renderParagraphs(match.pregame || [])}</div>
        <dl class="brief-grid">
          <div><dt>你的角色</dt><dd>${escapeHtml(match.role || "")}</dd></div>
          <div><dt>战术任务</dt><dd>${escapeHtml(match.tacticalBrief || "")}</dd></div>
          <div><dt>比赛性质</dt><dd>${escapeHtml(match.competition || "")}</dd></div>
        </dl>
        <button class="primary-action immersive" data-action="start-match">走出球员通道</button>
      </article>
      <aside class="match-side surface-card"><h2>比赛事实</h2><p>比赛引擎先计算结果，再由叙事层表达。重新读取检查点不会刷新随机结果。</p>${renderMatchTimeline()}</aside>
    </div>`;
}

function previousMomentEcho(index) {
  if (index <= 0) return "";
  const previous = state.match.resolutions[index - 1];
  if (!previous) return "";
  const fact = previous.fact;
  let text = `上一回合的“${fact.choiceTitle}”留下了它的痕迹。`;
  if (fact.scoreDelta.home) text = `上一回合的“${fact.choiceTitle}”直接改变比分；比赛继续向前，对手也开始更谨慎地封锁你的第一选择。`;
  else if (fact.tier === "success") text = `“${fact.choiceTitle}”让防线移动了，但比赛还没有给出答案。下一回合必须重新观察。`;
  else if (fact.tier === "mixed") text = `“${fact.choiceTitle}”留下一个未完全兑现的机会。你带着这种未完成感继续跑动。`;
  else text = `“${fact.choiceTitle}”没有按想象执行。比赛不会暂停，下一次球到附近时你仍然必须出现。`;
  return `<aside class="continuity-echo"><span>上一回合的回声</span><p>${text}</p></aside>`;
}

function renderMatchDecision() {
  const match = state.match;
  const moment = match.moments[match.currentMoment];
  return `
    <div class="match-layout">
      <article class="match-narrative surface-card">
        <section class="scene-chapter">
          <header><span>比赛进程</span><b>${escapeHtml(moment.interval)}</b></header>
          ${previousMomentEcho(match.currentMoment)}
          <div class="scene-prose">${renderParagraphs(moment.leadIn)}</div>
        </section>
        <section class="decision-threshold">
          <p class="eyebrow">第 ${moment.minute} 分钟 · ${escapeHtml(moment.zone)}</p>
          <h1>${escapeHtml(moment.label)}</h1>
          <p class="narrative-lead">${escapeHtml(moment.sensory)}</p>
          <p class="decision-cue">${escapeHtml(moment.decisionCue)}</p>
          <div class="pressure-block"><span>此刻的压力</span><p>${escapeHtml(moment.pressure)}。${escapeHtml(moment.tactical)}</p></div>
          <header class="choice-heading"><span>现在</span><h2>你决定如何处理这一球？</h2></header>
          <div class="decision-list">
            ${moment.choices.map((choice) => `
              <button data-action="match-choice" data-id="${choice.id}">
                <span><b>${escapeHtml(choice.title)}</b><em>${escapeHtml(choice.intent)} · ${escapeHtml(choice.risk)}</em></span>
                <small>${escapeHtml(choice.detail)}</small>
              </button>`).join("")}
          </div>
          <p class="decision-footnote">选择表达意图；执行仍取决于能力、战术、身体、心理、对手与确定性随机。</p>
        </section>
      </article>
      <aside class="match-side surface-card">
        <div class="live-stats"><div><span>比赛评分</span><b>${match.rating.toFixed(1)}</b></div><div><span>身体负荷</span><b>${Math.round(match.fatigue)}%</b></div><div><span>教练信任</span><b>${relationLabel(state.relations.coach.trust)}</b></div></div>
        <h2>场上记录</h2>${renderMatchTimeline()}
      </aside>
    </div>`;
}

function renderMatchOutcome() {
  const match = state.match;
  const resolution = match.lastResolution;
  const moment = match.moments[match.currentMoment];
  const nextMoment = match.moments[match.currentMoment + 1];
  return `
    <div class="match-layout">
      <article class="match-narrative outcome-card surface-card">
        <p class="eyebrow">第 ${moment.minute} 分钟 · ${escapeHtml(resolution.fact.label)}</p>
        <h1>${escapeHtml(resolution.fact.choiceTitle)}</h1>
        <div class="outcome-prose">${renderParagraphs(Object.values(resolution.narrative))}</div>
        <section class="fact-strip">
          <div><span>回合结果</span><b>${escapeHtml(resolution.fact.label)}</b></div>
          <div><span>评分变化</span><b>${resolution.fact.ratingDelta >= 0 ? "+" : ""}${resolution.fact.ratingDelta.toFixed(2)}</b></div>
          <div><span>记分牌</span><b>${resolution.fact.scoreDelta.home ? `主队 +${resolution.fact.scoreDelta.home}` : "未改变"}</b></div>
        </section>
        <aside class="next-chapter-hint"><span>${nextMoment ? "下一章节" : "接近终场"}</span><p>${nextMoment ? "这一回合的事实会进入下一段，而不是被新的选择覆盖。" : "剩余时间会按照已经发生的事实继续运行，随后生成完整比赛报告。"}</p></aside>
        <button class="primary-action immersive" data-action="continue-match">${nextMoment ? `继续阅读：${nextMoment.interval}` : "继续阅读至终场"}</button>
      </article>
      <aside class="match-side surface-card"><h2>客观事件记录</h2><p>这一结果已经写入存档。叙事只描述发生了什么。</p>${renderMatchTimeline()}</aside>
    </div>`;
}

function renderMatchSummary() {
  const match = state.match;
  const summary = match.summary;
  const goalMoments = match.resolutions.filter((item) => item.fact.scoreDelta.home > 0).length;
  return `
    <div class="match-summary-layout">
      <article class="summary-hero surface-card">
        <p class="eyebrow">全场结束 · ${escapeHtml(summary.result)}</p>
        <h1>${escapeHtml(summary.headline)}</h1>
        <p>${escapeHtml(summary.identity)}</p>
        <div class="summary-rating"><span>你的评分</span><strong>${summary.rating.toFixed(1)}</strong><small>${escapeHtml(summary.coachVerdict)}</small></div>
        <div class="summary-actions"><button class="primary-action" data-action="view" data-view="overview">返回生涯</button><button class="secondary-action" data-action="advance">继续推进</button></div>
      </article>
      <section class="summary-facts surface-card"><h2>比赛报告</h2><div class="summary-grid"><div><span>关键处理</span><b>${match.resolutions.length}</b></div><div><span>直接改变比分</span><b>${goalMoments}</b></div><div><span>最终身体负荷</span><b>${Math.round(match.fatigue)}%</b></div><div><span>教练信任</span><b>${relationLabel(state.relations.coach.trust)}</b></div></div>${renderMatchTimeline()}</section>
    </div>`;
}

function renderMatch() {
  if (!state.match) return `<section class="view match-view"><article class="surface-card empty-copy">当前没有待处理比赛。<button class="primary-action" data-action="advance">推进到下一节点</button></article></section>`;
  let body;
  if (state.match.status === "ready") body = renderMatchPreview();
  else if (state.match.status === "complete") body = renderMatchSummary();
  else if (state.match.screen === "outcome") body = renderMatchOutcome();
  else body = renderMatchDecision();
  return `<section class="view match-view">${renderScoreboard()}${body}</section>`;
}

function relationRows() {
  const relationNames = {
    coach: "主教练",
    mate: "核心搭档",
    rival: "位置竞争者",
    agent: "经纪人",
    family: "家庭",
    media: "媒体",
    fans: "球迷"
  };
  return Object.entries(relationNames).map(([id, label]) => {
    const relation = state.relations[id];
    if (!relation) return "";
    return `<label class="relation-row"><span>${label}</span><i><em style="width:${Math.min(100, relation.trust || 50)}%"></em></i><b>${relationLabel(relation.trust || 50)}</b></label>`;
  }).join("");
}

function renderPeople() {
  const committedName = state.nationalTeam.committedNation || state.player.nationality;
  const committedTeam = NATIONAL_TEAMS.find((item) => item.name === committedName) || NATIONAL_TEAMS[0];
  const agent = state.agent || { name: "待分配", type: "未记录", resources: 0, loyalty: 0, interests: "未记录", history: [] };
  const activeTraits = (state.player.traits || []).map((id) => TRAITS.find((item) => item.id === id)).filter(Boolean);
  const availableTraits = TRAITS.filter((item) => !state.player.traits?.includes(item.id));
  return `
    <section class="view people-view">
      <header class="view-heading"><div><span>RELATIONSHIP MEMORY</span><h1>你在世界中的位置</h1></div><p>关系不使用万能好感度。信任、尊重和亲密会分别变化，人物也会记住具体事件。</p></header>
      <div class="people-layout">
        <article class="relationship-detail surface-card">
          <p class="eyebrow">关系网</p><h1>${escapeHtml(state.player.name)}</h1>
          <p class="relation-summary">${escapeHtml(state.player.family)}出生，国家队资格：${escapeHtml(state.nationalTeam.status)}。媒体声望 ${state.media.reputation}，球迷 ${state.media.fans.toLocaleString("zh-CN")}。</p>
          <div class="relation-bars">${relationRows()}</div>
        </article>
        <section class="people-strip surface-card">
          <h2>国家与家庭</h2>
          <div class="national-card"><span>国家队</span><b>${renderAssociationBadge(committedTeam)}${renderNationFlags(committedName)}${escapeHtml(committedTeam.name)}</b><p>成年队出场 ${state.nationalTeam.caps} · 进球 ${state.nationalTeam.goals}</p></div>
          <div class="national-card"><span>第二国籍</span><b>${renderNationFlags(state.player.secondNationality)}${escapeHtml(state.player.secondNationality)}</b><p>${state.player.secondNationality === "无" ? "目前没有资格选择。" : "尚未代表成年队时仍可作出最终选择。"}</p></div>
           ${state.player.secondNationality && state.player.secondNationality !== "无" && state.nationalTeam.caps === 0 ? `
             <label class="inline-control"><span>选择国家队协会</span><select id="nationalChoice"><option value="${escapeHtml(state.player.secondNationality)}">${escapeHtml(state.player.secondNationality)}</option></select></label>
             <button class="secondary-action" data-action="choose-national">作出最终选择</button>` : ""}
           <button class="secondary-action" data-action="national-captain">争夺队长袖标</button>
           ${renderPsychology()}
           <section class="agent-card surface-card">
             <h2>经纪人</h2>
             <p><b>${escapeHtml(agent.name)}</b> · ${escapeHtml(agent.type)}</p>
             <p>资源 ${agent.resources}/100 · 忠诚 ${agent.loyalty}/100</p>
             <p>${escapeHtml(agent.interests)}</p>
             <p class="section-note">最近记录：${escapeHtml(agent.history?.at(-1)?.note || "暂无")}</p>
             <button class="secondary-action" data-action="agent-replace">更换经纪人</button>
           </section>
           <section class="trait-card surface-card">
             <h2>球员特性（${activeTraits.length}/5）</h2>
             <p>${activeTraits.length ? activeTraits.map((item) => escapeHtml(item.name)).join("、") : "当前没有激活特性。"}</p>
             <label><span>训练新特性</span><select id="traitTraining"><option value="">选择特性</option>${availableTraits.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
             ${activeTraits.length < 5 ? `<button class="secondary-action" data-action="trait-add">加入特性槽</button>` : `
               <label><span>当前槽位</span><select id="traitReplace">${activeTraits.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
               <div class="button-row"><button class="secondary-action" data-action="trait-suppress">压制旧特性</button><button class="secondary-action" data-action="trait-replace">替换并保留学习记忆</button></div>`}
             <p class="section-note">学习记忆：${state.player.traitMemory?.length ? state.player.traitMemory.map((item) => `${escapeHtml(item.name)}（${item.status === "suppressed" ? "压制" : "替换"}）`).join("、") : "暂无"}</p>
           </section>
           <section class="social-card surface-card">
            <h2>社交媒体</h2>
            <textarea id="socialText" rows="3" placeholder="关键事件后输入草稿；仅在 AI 已配置且成功时发布自定义内容。">${escapeHtml(state.media.social.at(-1)?.text || "")}</textarea>
            <button class="secondary-action" data-action="post-social">生成并发布自定义内容</button>
            <p class="section-note">无 AI、离线或生成失败时不会保存草稿，自动发布预设内容。</p>
          </section>
          <section class="rival-card surface-card">
            <h2>长期对手</h2>
            ${state.peers.length ? `<ul>${state.peers.map((peer) => `<li>${renderClubBadge(peer.clubId, "mini-badge")}<b>${escapeHtml(peer.name)}</b><span>${escapeHtml(CLUBS.find((club) => club.id === peer.clubId)?.name || peer.clubId)} · ${escapeHtml(peer.position)}</span></li>`).join("")}</ul>` : `<p class="empty-copy">还没有形成长期对手。</p>`}
            <button class="secondary-action" data-action="create-rivals">生成长期对手</button>
          </section>
          <section class="moral-card surface-card">
            <h2>裁判、VAR 与道德选择</h2>
            <p>裁判耐心：${state.match?.patience ?? 100}/100 · 主裁判：${escapeHtml(state.match?.referee?.name || (state.world.referees?.[0]?.name || "待定"))}</p>
            <div class="button-row">
              <button class="secondary-action" data-action="referee-calm">冷静等待</button>
              <button class="secondary-action" data-action="referee-pressure">向第四官员施压</button>
              <button class="secondary-action" data-action="moral-honest">诚实继续进攻</button>
              <button class="secondary-action" data-action="moral-dive">顺势倒地</button>
              <button class="secondary-action" data-action="moral-strong">强硬不越界</button>
            </div>
          </section>
          <section class="psych-extra surface-card">
            <h2>中场调控、心理战与心理伤疤</h2>
            <div class="button-row">
              <button class="secondary-action" data-action="halftime-silence">中场沉默</button>
              <button class="secondary-action" data-action="halftime-motivate">主动激励</button>
              <button class="secondary-action" data-action="psych-scar">触发心理伤疤</button>
              <button class="secondary-action" data-action="mind-calm">冷静回应</button>
              <button class="secondary-action" data-action="mind-aggressive">激烈回击</button>
            </div>
          </section>
          <section class="locker-card surface-card">
            <h2>更衣室派系与师徒</h2>
            <p>${state.club.factions.length ? state.club.factions.map((item) => `${escapeHtml(item.name)}（${escapeHtml(item.attitude)}）`).join(" · ") : "更衣室尚未形成派系。"}</p>
            <div class="button-row">
              <button class="secondary-action" data-action="create-factions">观察派系</button>
              <button class="secondary-action" data-action="mentor-apply">申请拜师</button>
              <button class="secondary-action" data-action="mentor-teach">推进师徒学习</button>
            </div>
          </section>
          <section class="media-card surface-card">
            <h2>媒体采访与球迷文化</h2>
            <div class="button-row">
              <button class="secondary-action" data-action="interview-standard">标准回应</button>
              <button class="secondary-action" data-action="interview-bold">个性回应</button>
              <button class="secondary-action" data-action="interview-humor">幽默化解</button>
              <button class="secondary-action" data-action="fan-greet">绕场感谢</button>
              <button class="secondary-action" data-action="fan-betray">回应转会传闻</button>
            </div>
          </section>
          <h2>共同记忆</h2>
          <ul class="memory-list">${state.feed.slice(0, 5).map((item) => `<li><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.text)}</span></li>`).join("")}</ul>
        </section>
      </div>
    </section>`;
}

function renderOffers() {
  return state.offers.map((offer) => `
    <article class="offer-card surface-card">
      <span>${escapeHtml(offer.contract || "职业合同")}</span>
      <h2>${renderClubBadge(offer.clubId, "mini-badge")}${escapeHtml(offer.name || CLUBS.find((club) => club.id === offer.clubId)?.name || offer.clubId)}</h2>
      <b>${escapeHtml(offer.role || "")}</b>
      <p>${escapeHtml(offer.city || "")} · 适配 ${offer.fit ?? "-"}${offer.negotiated ? " · 已协商" : ""}</p>
      ${offer.note ? `<em>${escapeHtml(offer.note)}</em>` : `<em>选择后进入合同</em>`}
      <div class="offer-actions"><button class="secondary-action" data-action="negotiate-offer" data-id="${offer.id}">协商条款</button><button class="primary-action" data-action="accept-offer" data-id="${offer.id}">接受</button></div>
    </article>`).join("");
}

function renderTransferOffers() {
  if (!state.transferOffers?.length) return "";
  return state.transferOffers.map((offer) => `
    <article class="transfer-card surface-card">
      <span>海外报价</span><h2>${renderClubBadge(offer.clubId, "mini-badge")}${escapeHtml(offer.clubName)}</h2>
      <p>转会费 ${(offer.fee / 10000).toFixed(0)} 万欧元 · 周薪 ${Math.round(offer.weeklyWage)}</p>
      <div><button class="primary-action" data-action="accept-transfer" data-id="${offer.id}">接受</button><button class="secondary-action" data-action="reject-transfer" data-id="${offer.id}">留在现队</button></div>
    </article>`).join("");
}

function renderCoachJobs() {
  if (!state.coach?.jobOffers?.length) return `<p class="empty-copy">根据你的声望，目前没有合适的教练职位。</p>`;
  return state.coach.jobOffers.map((job) => `
    <button class="offer-card surface-card" data-action="coach-job" data-id="${job.id}">
      <span>${escapeHtml(job.level)}</span><h2>${escapeHtml(job.name)}</h2>
      <b>周薪 ${job.wage}</b><p>最低声望 ${job.minReputation}</p><em>接受这份工作</em>
    </button>`).join("");
}

function renderCoach() {
  const coach = state.coach;
  const stats = coach?.seasonStats;
  return `
    <article class="coach-hero surface-card">
      <p class="eyebrow">COACH CAREER</p>
      <h1>${escapeHtml(coach?.name || state.player.name)} 的教练席</h1>
      <p>${coach?.club ? `${renderClubBadge(coach.clubId, "mini-badge")}执教 ${escapeHtml(coach.club)} · ${coach.license} 证书` : "等待第一份工作"} · 声望 ${Math.round(coach?.reputation || 0)}</p>
      <div class="coach-stats">${stats ? `<div><span>胜</span><b>${stats.wins}</b></div><div><span>平</span><b>${stats.draws}</b></div><div><span>负</span><b>${stats.losses}</b></div><div><span>进球</span><b>${stats.goalsFor}</b></div>` : ""}</div>
    </article>`;
}

function renderHonorsRoom() {
  const honors = Array.isArray(state.honors) ? state.honors : [];
  const groups = [
    ["club", "俱乐部荣誉"],
    ["national", "国家队荣誉"],
    ["individual", "个人奖项"],
    ["hidden", "隐藏称号"]
  ];
  return `<section class="honors-room surface-card"><header><div><p class="eyebrow">HONORS ROOM</p><h2>奖杯陈列室</h2></div><span>${honors.filter((item) => item.won).length} 项已获得</span></header><div class="honors-groups">${groups.map(([category, label]) => {
    const items = honors.filter((item) => item.category === category);
    return `<section class="honor-group"><h3>${label}</h3>${items.length ? `<div class="honor-grid">${items.map((honor) => `<article class="honor-item ${honor.won ? "won" : "nominated"}">${renderAwardBadge(honor)}${renderCompetitionBadge(honor.competitionId)}<div><b>${escapeHtml(honor.title)}</b><span>${honor.season ? `${honor.season} 赛季` : "生涯记录"}${honor.clubId ? ` · ${escapeHtml(CLUBS.find((club) => club.id === honor.clubId)?.name || honor.clubId)}` : ""}</span><small>${honor.won ? `获得 ×${honor.count || 1}` : "提名"}</small></div></article>`).join("")}</div>` : `<p class="empty-copy">还没有${label}。</p>`}</section>`;
  }).join("")}</div></section>`;
}

function renderCareer() {
  const stats = state.career.totalStats;
  const season = state.career.seasonStats;
  const average = season.appearances ? (season.ratingSum / season.appearances).toFixed(2) : "-";
  let body = "";
  if (state.world.phase === "contract") {
    body = `<section class="offer-grid horizontal-scroll">${renderOffers()}</section>`;
  } else if (state.world.phase === "retirement") {
    body = `
      <section class="retire-panel surface-card">
        <h2>结束球员生涯？</h2>
        <p>你的声望 ${state.media.reputation}，教练证书取决于职业生涯与领导力。退役后仍可在同一世界继续。</p>
        <button class="primary-action" data-action="retire">进入退役流程</button>
      </section>
      <h2 class="section-title">可申请的教练职位</h2>
      <section class="offer-grid horizontal-scroll">${renderCoachJobs()}</section>`;
  } else if (state.world.phase === "coach") {
    body = `
      ${renderCoach()}
      <section class="coach-ops surface-card">
        <h2>教练操作台</h2>
        <p>${state.coach?.club} · 第 ${state.world.week} 周 · 士气 ${Math.round(state.coach?.morale || 60)} · 预算 ${((state.coach?.budget || 2000000) / 10000).toFixed(0)} 万</p>
        <label><span>阵型</span><select id="coachFormation">${["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "5-3-2"].map((item) => `<option value="${item}" ${state.coach?.formation === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <button class="secondary-action" data-action="coach-formation">应用阵型</button>
        <label><span>首发（逗号分隔球员 ID）</span><input id="coachStarters" value="${escapeHtml((state.coach?.lineup?.starters || []).join(","))}"></label>
        <label><span>替补（逗号分隔球员 ID）</span><input id="coachBench" value="${escapeHtml((state.coach?.lineup?.bench || []).join(","))}"></label>
        <button class="secondary-action" data-action="coach-lineup">保存首发与替补</button>
        <label><span>训练重点</span><select id="coachTraining">${["高位压迫", "控球推进", "定位球", "身体对抗", "反击速度"].map((item) => `<option value="${item}" ${state.coach?.trainingFocus === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
        <button class="secondary-action" data-action="coach-training">更新训练</button>
        <div class="button-row"><button class="primary-action" data-action="coach-buy">引援（-100万）</button><button class="secondary-action" data-action="coach-sell">出售球员（+80万）</button><button class="secondary-action" data-action="coach-morale">更衣室动员</button></div>
        <button class="primary-action" data-action="advance">推进一周</button>
        <button class="secondary-action danger" data-action="retire-coach">结束教练生涯</button>
      </section>`;
  } else if (state.world.phase === "final") {
    const report = buildLifeReport(state);
    body = `<article class="life-report surface-card"><p class="eyebrow">LIFE REPORT</p><h1>${escapeHtml(report.report)}</h1><p>${escapeHtml(report.themes.join("、"))}</p></article>`;
  } else {
    body = `
      <section class="contract-summary surface-card">
        <span>当前合同</span><strong>${renderClubBadge(state.contract.clubId, "mini-badge")}${escapeHtml(CLUBS.find((item) => item.id === state.contract.clubId)?.name || state.player.club)}</strong>
        <p>${escapeHtml(state.contract.type)} · 周薪 ${state.contract.weeklyWage} · 到期 ${escapeHtml(state.contract.endDate)}</p>
      </section>
      ${renderTransferOffers()}
      <section class="career-stats surface-card">
        <h2>生涯数据</h2>
        <div class="summary-grid">
          <div><span>出场</span><b>${stats.appearances}</b></div>
          <div><span>进球</span><b>${stats.goals}</b></div>
          <div><span>助攻</span><b>${stats.assists}</b></div>
          <div><span>本季场均</span><b>${average}</b></div>
        </div>
      </section>
      <section class="career-stats surface-card">
        <h2>能力等级（1-9）</h2>
        <div class="summary-grid ability-grid">
          ${[["终结", state.player.attributes.finishing], ["视野", state.player.attributes.vision], ["传球", (state.player.attributes.shortPassing + state.player.attributes.longPassing) / 2], ["盘带", state.player.attributes.dribbling], ["镇定", state.player.attributes.composure], ["身体", (state.player.attributes.stamina + state.player.attributes.strength) / 2]].map(([label, value]) => `<div><span>${label}</span><b>${abilityGrade(value)}</b></div>`).join("")}
        </div>
      </section>
      <section class="club-politics surface-card">
        <h2>俱乐部承诺与政治</h2>
        <p>影响力 ${state.club.politics.influence}/100 · ${state.club.politics.unlocked ? "政治已解锁" : "尚未解锁"}</p>
        <div class="button-row">
          <button class="secondary-action" data-action="create-promise">提出承诺要求</button>
          <button class="secondary-action" data-action="resolve-promise">标记承诺兑现</button>
          <button class="secondary-action" data-action="politics-facilities">要求升级设施</button>
          <button class="secondary-action" data-action="politics-support">支持主教练</button>
        </div>
      </section>
      <section class="comeback-card surface-card">
        <h2>复出与失业机会</h2>
        <p>传统复出已使用：${state.comeback.traditionalUsed ? "是" : "否"} · 传奇复出已使用：${state.comeback.legendaryUsed ? "是" : "否"}</p>
        <div class="button-row">
          <button class="secondary-action" data-action="comeback-traditional">传统复出</button>
          <button class="secondary-action" data-action="comeback-legendary">传奇复出</button>
          <button class="secondary-action" data-action="unemployment-trial">失业后试训</button>
          <button class="secondary-action" data-action="unemployment-abroad">前往海外</button>
        </div>
      </section>
      <section class="fast-forward surface-card">
        <h2>快速推进（旧档/测试用）</h2>
        <p>把球员生涯推进到退役并自动接受第一份教练合同；教练阶段仍需要你亲自完成阵容、战术、训练、转会与更衣室操作。</p>
        <button class="secondary-action" data-action="fast-forward-player">快速推进至教练世界</button>
      </section>
      <section class="records-card surface-card">
        <h2>纪录、奖项与世界变迁</h2>
        <p>历史纪录 ${state.records.length} · 奖项提名 ${state.awards.length} · 世界新闻 ${state.world.news.length}</p>
        <div class="button-row">
          <button class="secondary-action" data-action="record-milestone">记录里程碑</button>
          <button class="secondary-action" data-action="award-nomination">发起年度评选</button>
          <button class="secondary-action" data-action="golden-ball">金球奖叙事</button>
          <button class="secondary-action" data-action="hidden-title">解锁隐藏称号</button>
          <button class="secondary-action" data-action="potential-breakthrough">触发潜力突破</button>
          <button class="secondary-action" data-action="world-change">触发世界变迁</button>
        </div>
        <div class="button-row">
          <button class="secondary-action" data-action="brand-create">创建个人品牌</button>
          <button class="secondary-action" data-action="transfer-adapt">转会适应期</button>
          <button class="secondary-action" data-action="agent-replace">更换经纪人</button>
          <button class="secondary-action" data-action="family-next">下一代叙事</button>
          <button class="secondary-action" data-action="ritual-flash">回忆闪回</button>
          <button class="secondary-action" data-action="injury-rehab">推进康复</button>
        </div>
      </section>
      <section class="wealth-card surface-card">
        <h2>财富与赞助</h2>
        <p>现金 ${state.finances.cash.toLocaleString("zh-CN")} · 生涯收入 ${state.finances.careerEarnings.toLocaleString("zh-CN")}</p>
        <p>${state.finances.sponsors.length ? `现有赞助：${state.finances.sponsors.map((s) => escapeHtml(s.name)).join("、")}` : "还没有长期赞助。"}</p>
      </section>
      <section class="national-card surface-card">
        <h2>国家队</h2>
        <p>${renderNationFlags(state.player.nationality, state.player.secondNationality)}${state.player.nationality} · 成年队 ${state.nationalTeam.caps} 场 ${state.nationalTeam.goals} 球 · 青年队 ${state.nationalTeam.youthCaps} 场 · 资格 ${escapeHtml(state.nationalTeam.status)}</p>
        ${state.nationalTeam.history.slice(-3).map((entry) => `<p class="national-history">${escapeHtml(entry.date)} ${escapeHtml(entry.stage)} ${entry.caps} 场 ${entry.goals} 球 · 评分 ${entry.rating.toFixed(1)}</p>`).join("")}
        <button class="secondary-action danger" data-action="retire">提前结束球员生涯</button>
      </section>`;
  }
  return `
    <section class="view career-view">
      <header class="view-heading"><div><span>${state.world.phase === "coach" ? "COACH DESK" : "CAREER DESK"}</span><h1>${state.world.phase === "coach" ? "教练办公室" : state.world.phase === "final" ? "人生报告" : "职业档案"}</h1></div><p>球员生涯、合同、转会、财富和国家队记录都在这里。</p></header>
      ${body}
      ${state.world.phase === "contract" ? "" : renderHonorsRoom()}
    </section>`;
}

function renderSettings() {
  return `
    <section class="view settings-view">
      <header class="view-heading"><div><span>SETTINGS</span><h1>设置与存档</h1></div><p>API Key 只保存在本机 localStorage，绝不写入仓库、URL 或日志。</p></header>
      <div class="settings-grid">
        <section class="surface-card">
          <h2>AI 叙事（可选）</h2>
          <label><span>接口地址</span><input id="aiEndpoint" value="${escapeHtml(state?.settings?.ai?.endpoint || "")}" placeholder="https://example.com/v1/chat/completions"></label>
          <label><span>模型</span><input id="aiModel" value="${escapeHtml(state?.settings?.ai?.model || "")}" placeholder="gpt-4o-mini"></label>
          <label><span>API Key</span><input id="aiKey" type="password" value="${escapeHtml(state?.settings?.ai?.key || "")}" placeholder="留空则使用本地模板"></label>
          <button class="primary-action" data-action="save-ai">保存 AI 配置</button>
          <p class="section-note">无 Key、离线或生成失败时，游戏会完整回退到本地模板。</p>
        </section>
        <section class="surface-card">
          <h2>界面</h2>
          <button class="secondary-action" data-action="theme">切换深浅色</button>
          <button class="secondary-action" data-action="large-text">${state?.ui?.largeText ? "关闭大字体" : "开启大字体"}</button>
          <button class="secondary-action" data-action="export">导出存档</button>
          <button class="secondary-action" data-action="export-error-report">导出错误报告</button>
          <label class="file-label"><span>导入存档</span><input type="file" accept="application/json" data-action="import"></label>
        </section>
        <section class="surface-card">
          <h2>声音与反馈</h2>
          <p>音频只在你点击后才解锁；可分别关闭背景、界面反馈和球场环境。</p>
          <button class="secondary-action" data-action="audio-enable">${state.audio.enabled ? "声音已启用" : "点击解锁声音"}</button>
          <label><span>背景音乐</span><input type="checkbox" id="audioBackground" ${state.audio.background ? "checked" : ""}></label>
          <label><span>界面反馈</span><input type="checkbox" id="audioUi" ${state.audio.ui ? "checked" : ""}></label>
          <label><span>球场环境</span><input type="checkbox" id="audioEnvironment" ${state.audio.environment ? "checked" : ""}></label>
          <button class="secondary-action" data-action="save-audio">保存声音设置</button>
        </section>
        <section class="surface-card">
          <h2>版本化扩展包</h2>
          <p>导入前校验版本、类型、manifest 与条目；事件包会在后续赛季周进入本地事件流。</p>
          <label class="file-label"><span>导入扩展 JSON</span><input id="extensionPackFile" data-action="import-extension-pack" type="file" accept=".json,application/json"></label>
          <button class="secondary-action" data-action="import-sample-extension">导入示例扩展包</button>
          <p class="section-note">已导入 ${state.extensions?.length || 0} 个扩展包；错误文件会被拒绝且不会覆盖现有包。</p>
        </section>
        <section class="surface-card">
          <h2>存档数据库快照</h2>
          <p>版本 ${escapeHtml(state.world.database?.version || "未知")} · ${state.world.database?.frozen ? "创建后冻结" : "未冻结"}</p>
          <p class="section-note">现实数据库更新只用于新存档；当前存档继续使用创建时的俱乐部、联赛和球员快照。</p>
        </section>
        <section class="surface-card">
          <h2>生涯难度</h2>
          <label><span>伤病频率</span><select id="injuryRate"><option value="0.5" ${state.settings.injuryRate === 0.5 ? "selected" : ""}>较低</option><option value="1" ${state.settings.injuryRate === 1 ? "selected" : ""}>标准</option><option value="1.6" ${state.settings.injuryRate === 1.6 ? "selected" : ""}>较高</option></select></label>
          <label><span>随机性</span><select id="randomness"><option value="0.7" ${state.settings.randomness === 0.7 ? "selected" : ""}>更稳定</option><option value="1" ${state.settings.randomness === 1 ? "selected" : ""}>标准</option><option value="1.4" ${state.settings.randomness === 1.4 ? "selected" : ""}>更波动</option></select></label>
          <label><span>经济压力</span><select id="economicPressure"><option value="0.6" ${state.settings.economicPressure === 0.6 ? "selected" : ""}>宽松</option><option value="1" ${state.settings.economicPressure === 1 ? "selected" : ""}>标准</option><option value="1.5" ${state.settings.economicPressure === 1.5 ? "selected" : ""}>紧巴</option></select></label>
          <label><span>计划退役年龄</span><select id="retireAge"><option value="22" ${state.settings.retireAge === 22 ? "selected" : ""}>22（快速测试）</option><option value="28" ${state.settings.retireAge === 28 ? "selected" : ""}>28</option><option value="34" ${state.settings.retireAge === 34 ? "selected" : ""}>34（标准）</option></select></label>
          <button class="secondary-action" data-action="save-settings">保存难度</button>
        </section>
        <section class="surface-card save-list">
          <h2>存档</h2>
          ${renderSaveList()}
          <button class="secondary-action" data-action="new">新建生涯</button>
        </section>
        <section class="surface-card private-assets-card">
          <h2>私人 FM26 资源</h2>
          <p>只在本机 IndexedDB 保存精确 FM ID 匹配的队徽、球衣、赛事、国家和洲际资源，不会上传到 GitHub Pages。</p>
          <label><span>导入私人 ZIP</span><input id="privateAssetsZip" data-action="import-private-assets" type="file" accept=".zip,application/zip"></label>
          <button class="secondary-action danger" data-action="clear-private-assets">删除本机私人包</button>
          <p class="section-note">当前设备已加载 ${privateAssetCount} 个私人资源；找不到匹配时自动使用公开原创回退。</p>
          ${renderPrivateAssetPreview()}
        </section>
      </div>
    </section>`;
}

function renderCurrentView() {
  if (!state) return renderCreate();
  if (state.ui.view === "week") return renderWeek();
  if (state.ui.view === "match") return renderMatch();
  if (state.ui.view === "people") return renderPeople();
  if (state.ui.view === "career") return renderCareer();
  if (state.ui.view === "settings") return renderSettings();
  return renderOverview();
}

function render() {
  if (!state) {
    app.innerHTML = `<div class="game-shell create-shell">${renderCreate()}<div class="toast" id="toast" role="status" aria-live="polite"></div></div>`;
    return;
  }
  document.documentElement.dataset.theme = state.ui.theme;
  document.documentElement.classList.toggle("large-text", state.ui.largeText);
  document.querySelector("#themeColor")?.setAttribute("content", state.ui.theme === "dark" ? "#081019" : "#f2efe7");
  const navItems = [
    { id: "overview", icon: "◉", label: "生涯" },
    { id: "week", icon: "▦", label: "本周" },
    { id: "match", icon: "●", label: "比赛" },
    { id: "people", icon: "◎", label: "关系" },
    { id: "career", icon: "◇", label: state.world.phase === "coach" ? "教练" : "职业" }
  ];
  app.innerHTML = `
    <div class="game-shell">
      <header class="app-header surface-card">
        <div class="brand"><b>FC</b><span>${state.ui.theme === "dark" ? "深色模式" : "浅色模式"}</span></div>
        <div class="app-title"><small>${escapeHtml(phaseLabel(state))}</small><strong>${escapeHtml(state.player.name)} · ${state.world.season}</strong></div>
        <div class="world-date"><span>存档内 · ${escapeHtml(state.world.date)}</span><b>${escapeHtml(state.player.club)}</b></div>
        <button class="theme-toggle" data-action="theme" aria-label="切换主题"><i>${state.ui.theme === "dark" ? "☀" : "☾"}</i><span>${state.ui.theme === "dark" ? "浅色" : "深色"}</span></button>
      </header>
      <nav class="main-nav surface-card" aria-label="主要页面">
        ${navItems.map((item) => `<button class="${state.ui.view === item.id ? "active" : ""}" data-action="view" data-view="${item.id}"><i>${item.icon}</i><span>${item.label}</span></button>`).join("")}
        <div class="nav-spacer"></div>
        <button class="utility-button" data-action="view" data-view="settings"><i>⚙</i><span>设置</span></button>
        <button class="utility-button danger" data-action="new"><i>＋</i><span>新档</span></button>
      </nav>
      <main class="app-content" id="mainContent">${renderCurrentView()}</main>
    </div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;
  if (audioEngine && state?.audio?.enabled) audioEngine.setPreferences(state.audio);
}

function createCareer() {
  const name = document.querySelector("#newName")?.value?.trim() || "林骁";
  const position = document.querySelector("#newPosition")?.value || "CAM";
  const talent = document.querySelector("#newTalent")?.value || "steady";
  const family = document.querySelector("#newFamily")?.value || "工人家庭";
  const nationality = document.querySelector("#newNationality")?.value || "中国";
  const secondNationality = document.querySelector("#newSecondNationality")?.value || "无";
  const clubId = document.querySelector("#newClub")?.value || "shanghai-shenhua";
  const birthYear = Number(document.querySelector("#newBirthYear")?.value || 2010);
  const foot = document.querySelector("#newFoot")?.value || "右脚";
  const height = Number(document.querySelector("#newHeight")?.value || 176);
  const weight = Number(document.querySelector("#newWeight")?.value || 66);
  const number = Number(document.querySelector("#newNumber")?.value || 17);
  const techBias = Number(document.querySelector("#newTechBias")?.value || 0);
  const physicalBias = Number(document.querySelector("#newPhysicalBias")?.value || 0);
  const mentalBias = Number(document.querySelector("#newMentalBias")?.value || 0);
  const potential = Number(document.querySelector("#newPotential")?.value || 0);
  const injuryProneness = Number(document.querySelector("#newInjuryProneness")?.value || 0);
  const customized = Boolean(document.querySelector("#newCustomized")?.checked);
  const traits = [...document.querySelectorAll('input[name="trait"]:checked')].slice(0, 5).map((input) => input.value);
  const next = createInitialState({
    name,
    position,
    talent,
    family,
    nationality,
    secondNationality,
    clubId,
    birthYear,
    foot,
    height,
    weight,
    number,
    customized,
    traits,
    attributeBias: { technical: techBias, physical: physicalBias, mental: mentalBias },
    hidden: {
      potential: potential >= 70 ? potential : undefined,
      injuryProneness: injuryProneness >= 1 ? injuryProneness : undefined
    },
    seed: `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`
  });
  commit(next, "生涯已创建，检查点会自动保存");
}

function loadSave(id) {
  try {
    const next = loadState(getStorage(), id);
    state = { ...next, ui: { ...next.ui, view: "overview" } };
    saveState(state, getStorage());
    render();
  } catch {
    showToast("存档无法读取");
  }
}

function removeSave(id) {
  deleteSave(getStorage(), id);
  if (activeSaveId() === id) {
    state = null;
  }
  render();
}

function exportCurrent() {
  if (!state) return;
  const blob = new Blob([exportState(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fc-career-${state.player.name}-${state.world.date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("存档已导出");
}

function exportErrorReport() {
  if (!state) return;
  const blob = new Blob([buildErrorReport(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fc-career-error-report-${state.world.date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("本机错误报告已导出；不含 API Key、图片或完整存档");
}

function rememberClientError(value) {
  if (!state) return;
  state = recordDiagnostic(state, value);
  saveState(state, getStorage());
}

async function importFile(file) {
  try {
    const text = await file.text();
    const next = importState(text, getStorage());
    state = { ...next, ui: { ...next.ui, view: "overview" } };
    render();
    showToast("存档已导入");
  } catch {
    showToast("导入失败：JSON 无效或版本不受支持");
  }
}

async function importPrivateFile(file) {
  try {
    const result = await importPrivateZip(file);
    const loaded = await loadPrivateAssets();
    privateAssetCount = loaded.length;
    render();
    showToast(`私人 FM 资源已导入 ${result.imported} 个`);
  } catch {
    showToast("私人资源导入失败：ZIP、路径或 SHA-256 校验未通过");
  }
}

async function importExtensionFile(file) {
  try {
    const pack = JSON.parse(await file.text());
    const result = importExtensionPack(state, pack);
    if (result.errors.length) {
      showToast(`扩展包校验失败：${result.errors.join("；")}`);
      return;
    }
    commit(result.state, `扩展包已导入：${pack.type}`);
  } catch {
    showToast("扩展包导入失败：文件必须是通过校验的 JSON");
  }
}

async function clearPrivateFile() {
  try {
    await clearPrivateAssetDb();
    privateAssetCount = 0;
    render();
    showToast("本机私人包已删除，公开回退已恢复");
  } catch {
    showToast("私人包删除失败");
  }
}

function saveAiSettings() {
  if (!state) return;
  const endpoint = document.querySelector("#aiEndpoint")?.value?.trim() || "";
  const model = document.querySelector("#aiModel")?.value?.trim() || "";
  const key = document.querySelector("#aiKey")?.value || "";
  const next = {
    ...state,
    settings: { ...state.settings, ai: { endpoint, model, key } }
  };
  commit(next, "AI 配置已保存在本机");
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "create") createCareer();
  else if (action === "view") setView(button.dataset.view);
  else if (action === "plan") {
    if (!state) return;
    commit({ ...state, training: { ...state.training, planId: button.dataset.id } }, "训练计划已更新");
  } else if (action === "training-position") {
    if (!state) return;
    const positionTraining = document.querySelector("#positionTraining")?.value || "";
    commit({ ...state, training: { ...state.training, positionTraining } }, "位置专项已更新");
  } else if (action === "position-training") {
    if (!state) return;
    const positionId = document.querySelector("#positionTraining")?.value;
    commit(positionId ? applyPositionTraining(state, positionId) : state, positionId ? "位置特训已推进" : "请先选择新位置");
  } else if (action === "suggest-tactics") {
    if (!state) return;
    commit(playerSuggestToCoach(state, "增加一次右路配合训练，并在比赛日提前布置第一脚触球方向。"), "战术建议已提交");
  } else if (action === "mark-focus") {
    if (!state) return;
    commit(markFocusFixture(state, button.dataset.id), "比赛已加入本赛季主动焦点名单");
  } else if (action === "choose-national") {
    if (!state) return;
    const nation = document.querySelector("#nationalChoice")?.value;
    commit(nation ? chooseNationalTeam(state, nation) : state, "国家队选择已提交");
  } else if (action === "post-social") {
    if (!state) return;
    const draft = document.querySelector("#socialText")?.value?.trim();
    if (!draft) {
      showToast("内容为空");
      return;
    }
    const generated = await generateSocialPost({ state, draft });
    const preset = "感谢每一位支持者，下一周继续把训练和比赛做好。";
    commit(postSocial(state, generated || preset, Boolean(generated)), generated ? "AI 已生成并发布自定义内容" : "AI 不可用或生成失败，已回退到预设内容");
  } else if (action === "trait-add") {
    if (!state) return;
    const traitId = document.querySelector("#traitTraining")?.value;
    commit(traitId ? manageTrait(state, { traitId, mode: "add" }) : state, traitId ? "特性已加入当前槽位" : "请先选择新特性");
  } else if (action === "trait-suppress") {
    if (!state) return;
    const replaceId = document.querySelector("#traitReplace")?.value;
    commit(replaceId ? manageTrait(state, { replaceId, mode: "suppress" }) : state, replaceId ? "旧特性已压制并保留学习记忆" : "请先选择当前槽位");
  } else if (action === "trait-replace") {
    if (!state) return;
    const traitId = document.querySelector("#traitTraining")?.value;
    const replaceId = document.querySelector("#traitReplace")?.value;
    commit(traitId && replaceId ? manageTrait(state, { traitId, replaceId, mode: "replace" }) : state, traitId && replaceId ? "特性已替换，旧学习记忆已保留" : "请选择新特性和当前槽位");
  } else if (action === "create-rivals") {
    if (!state) return;
    commit(createRivals(state), "长期对手已生成");
  } else if (action === "referee-calm") {
    if (!state) return;
    commit(refereeEvent(state, "calm"), "裁判互动已记录");
  } else if (action === "referee-pressure") {
    if (!state) return;
    commit(refereeEvent(state, "pressure"), "裁判互动已记录");
  } else if (action === "moral-honest") {
    if (!state) return;
    commit(moralChoice(state, "honest"), "道德选择已记录");
  } else if (action === "moral-dive") {
    if (!state) return;
    commit(moralChoice(state, "dive"), "道德选择已记录");
  } else if (action === "moral-strong") {
    if (!state) return;
    commit(moralChoice(state, "strong"), "道德选择已记录");
  } else if (action === "create-factions") {
    if (!state) return;
    commit(createFactions(state), "更衣室派系已观察");
  } else if (action === "mentor-apply") {
    if (!state) return;
    commit(mentorApply(state), "拜师申请已提交");
  } else if (action === "mentor-teach") {
    if (!state) return;
    commit(mentorTeach(state), "师徒学习已推进");
  } else if (action === "interview-standard") {
    if (!state) return;
    commit(mediaInterview(state, "standard"), "采访回应已保存");
  } else if (action === "interview-bold") {
    if (!state) return;
    commit(mediaInterview(state, "bold"), "采访回应已保存");
  } else if (action === "interview-humor") {
    if (!state) return;
    commit(mediaInterview(state, "humor"), "采访回应已保存");
  } else if (action === "fan-greet") {
    if (!state) return;
    commit(fanEvent(state, "greet"), "球迷互动已记录");
  } else if (action === "fan-betray") {
    if (!state) return;
    commit(fanEvent(state, "betray"), "球迷反应已记录");
  } else if (action === "record-milestone") {
    if (!state) return;
    commit(recordMilestone(state, `第 ${state.career.totalStats.appearances + 1} 场里程碑`), "纪录已记录");
  } else if (action === "award-nomination") {
    if (!state) return;
    commit(awardNomination(state, "赛季最佳阵容"), "年度评选已处理");
  } else if (action === "world-change") {
    if (!state) return;
    commit(worldChange(state, "联赛宣布引入新的财务规则，一家老牌俱乐部完成易主。"), "世界变迁已记录");
  } else if (action === "halftime-silence") {
    if (!state) return;
    commit(halftimeChoice(state, "silence"), "中场选择已记录");
  } else if (action === "halftime-motivate") {
    if (!state) return;
    commit(halftimeChoice(state, "motivate"), "中场选择已记录");
  } else if (action === "psych-scar") {
    if (!state) return;
    commit(psychScar(state, "再次面对相同情境时，你感到熟悉的迟疑。"), "心理伤疤已记录");
  } else if (action === "mind-calm") {
    if (!state) return;
    commit(mindGame(state, "calm"), "心理战回应已保存");
  } else if (action === "mind-aggressive") {
    if (!state) return;
    commit(mindGame(state, "aggressive"), "心理战回应已保存");
  } else if (action === "brand-create") {
    if (!state) return;
    commit(createBrand(state, "个人运动品牌"), "品牌创建已处理");
  } else if (action === "transfer-adapt") {
    if (!state) return;
    commit(transferAdaptation(state), "转会适应期已启动");
  } else if (action === "agent-replace") {
    if (!state) return;
    commit(agentEvent(state, "replace"), "经纪人事件已处理");
  } else if (action === "family-next") {
    if (!state) return;
    commit(familyNextGen(state), "家庭事件已处理");
  } else if (action === "ritual-flash") {
    if (!state) return;
    commit(ritualFlashback(state), "回忆闪回已记录");
  } else if (action === "injury-rehab") {
    if (!state) return;
    commit(injuryRehab(state, "standard"), "康复已推进");
  } else if (action === "golden-ball") {
    if (!state) return;
    commit(goldenBall(state), "金球奖叙事已处理");
  } else if (action === "hidden-title") {
    if (!state) return;
    commit(unlockHiddenTitle(state, "生涯图腾"), "隐藏称号已解锁");
  } else if (action === "potential-breakthrough") {
    if (!state) return;
    commit(potentialBreakthrough(state, "决定性表现"), "潜力突破已处理");
  } else if (action === "national-captain") {
    if (!state) return;
    commit(nationalCaptain(state, "captain"), "国家队事件已处理");
  } else if (action === "create-promise") {
    if (!state) return;
    commit(createClubPromise(state, "出场承诺", "俱乐部承诺在下一阶段给予稳定比赛时间。"), "承诺已记录");
  } else if (action === "resolve-promise") {
    if (!state) return;
    const promise = state.club.promises.find((item) => item.kept === null);
    commit(promise ? resolveClubPromise(state, promise.id, true) : state, promise ? "承诺已标记兑现" : "没有待处理的承诺");
  } else if (action === "politics-facilities") {
    if (!state) return;
    commit(clubPoliticsAction(state, "facilities"), "训练设施谈判已发起");
  } else if (action === "politics-support") {
    if (!state) return;
    commit(clubPoliticsAction(state, "support-manager"), "已公开支持主教练");
  } else if (action === "comeback-traditional") {
    if (!state) return;
    commit(startComeback(state, "traditional"), "传统复出尝试已处理");
  } else if (action === "comeback-legendary") {
    if (!state) return;
    commit(startComeback(state, "legendary"), "传奇复出尝试已处理");
  } else if (action === "unemployment-trial") {
    if (!state) return;
    commit(unemploymentPath(state, "trial"), "失业试训已处理");
  } else if (action === "unemployment-abroad") {
    if (!state) return;
    commit(unemploymentPath(state, "abroad"), "海外机会已处理");
  } else if (action === "fast-forward-player") {
    if (!state) return;
    commit(refreshMentalState(simulateToRetirement(state, { coach: true })), "已快速推进到教练世界");
  } else if (action === "coach-formation") {
    if (!state) return;
    const formation = document.querySelector("#coachFormation")?.value;
    commit(formation ? coachSetFormation(state, formation) : state, "阵型已应用");
  } else if (action === "coach-lineup") {
    if (!state) return;
    const starters = (document.querySelector("#coachStarters")?.value || "").split(",").map((item) => item.trim()).filter(Boolean);
    const bench = (document.querySelector("#coachBench")?.value || "").split(",").map((item) => item.trim()).filter(Boolean);
    commit(coachSetLineup(state, starters, bench), "首发与替补已保存");
  } else if (action === "coach-training") {
    if (!state) return;
    const focus = document.querySelector("#coachTraining")?.value;
    commit(focus ? coachSetTraining(state, focus) : state, "训练重点已更新");
  } else if (action === "coach-buy") {
    if (!state) return;
    commit(coachTransferAction(state, "buy"), "引援处理完成");
  } else if (action === "coach-sell") {
    if (!state) return;
    commit(coachTransferAction(state, "sell"), "出售处理完成");
  } else if (action === "coach-morale") {
    if (!state) return;
    commit(coachMoraleAction(state, "team-talk"), "更衣室动员完成");
  } else if (action === "audio-enable") {
    if (!state) return;
    if (!audioEngine) audioEngine = createAudioEngine();
    let next = unlockAudio(state);
    next = setAudioPreferences(next, { ...next.audio, enabled: true });
    if (audioEngine) audioEngine.setPreferences(next.audio);
    commit(next, "声音已通过用户点击解锁");
  } else if (action === "save-audio") {
    if (!state) return;
    const preferences = {
      enabled: true,
      background: Boolean(document.querySelector("#audioBackground")?.checked),
      ui: Boolean(document.querySelector("#audioUi")?.checked),
      environment: Boolean(document.querySelector("#audioEnvironment")?.checked),
      unlocked: state.audio.unlocked
    };
    if (audioEngine) audioEngine.setPreferences(preferences);
    commit(setAudioPreferences(state, preferences), "声音设置已保存");
  } else if (action === "import-sample-extension") {
    if (!state) return;
    const pack = {
      version: "1.0",
      type: "database",
      manifest: { checksum: "sample" },
      entries: [{ id: "sample-club", name: "示例俱乐部" }]
    };
    const result = importExtensionPack(state, pack);
    commit(result.errors.length ? state : result.state, result.errors.length ? "扩展包校验失败" : "示例扩展包已导入");
  } else if (action === "weak-foot") {
    if (!state) return;
    const weakFoot = Math.min(5, state.player.weakFoot + 0.5);
    commit({ ...state, player: { ...state.player, weakFoot }, training: { ...state.training, weakFoot: 1 } }, "逆足训练已加入本周计划");
  } else if (action === "advance") {
    if (!state) return;
    const next = refreshMentalState(advanceWeek(state));
    const progressed = next.world.week !== state.world.week || next.world.phase !== state.world.phase || next.match?.id !== state.match?.id;
    commit(next, progressed ? "一周已推进" : "当前节点需要你先处理");
  } else if (action === "start-match") {
    commit(startCurrentMatch(state), "比赛开始：关键事实将自动保存");
    scrollTop();
  } else if (action === "match-choice") {
    commit(chooseMatchAction(state, button.dataset.id));
    scrollTop();
  } else if (action === "continue-match") {
    commit(continueMatch(state));
    scrollTop();
  } else if (action === "accept-offer") {
    commit(acceptOffer(state, button.dataset.id), "合同已确认，职业赛季开始");
  } else if (action === "negotiate-offer") {
    commit(negotiateOffer(state, button.dataset.id), "合同条款已协商");
  } else if (action === "accept-transfer") {
    commit(selectTransferOffer(state, true, button.dataset.id), "转会完成");
  } else if (action === "reject-transfer") {
    commit(selectTransferOffer(state, false, button.dataset.id), "报价已拒绝");
  } else if (action === "retire") {
    commit(retirePlayer(state), "球员生涯结束，教练世界开启");
  } else if (action === "coach-job") {
    commit(acceptCoachJob(state, button.dataset.id), "教练合同已签署");
  } else if (action === "retire-coach") {
    commit(retireCoach(state), "教练生涯结束");
  } else if (action === "theme") {
    if (!state) return;
    commit({ ...state, ui: { ...state.ui, theme: state.ui.theme === "dark" ? "light" : "dark" } });
  } else if (action === "large-text") {
    if (!state) return;
    commit({ ...state, ui: { ...state.ui, largeText: !state.ui.largeText } });
  } else if (action === "save-ai") {
    saveAiSettings();
  } else if (action === "save-settings") {
    if (!state) return;
    const injuryRate = Number(document.querySelector("#injuryRate")?.value || 1);
    const randomness = Number(document.querySelector("#randomness")?.value || 1);
    const economicPressure = Number(document.querySelector("#economicPressure")?.value || 1);
    const retireAge = Number(document.querySelector("#retireAge")?.value || 34);
    commit({ ...state, settings: { ...state.settings, injuryRate, randomness, economicPressure, retireAge } }, "难度设置已保存");
  } else if (action === "export") {
    exportCurrent();
  } else if (action === "export-error-report") {
    exportErrorReport();
  } else if (action === "new") {
    state = null;
    render();
  } else if (action === "load-save") {
    loadSave(button.dataset.id);
  } else if (action === "delete-save") {
    removeSave(button.dataset.id);
  } else if (action === "clear-private-assets") {
    clearPrivateFile();
  }
});

app.addEventListener("change", (event) => {
  const input = event.target;
  if (input.dataset.action === "import" && input.files?.[0]) importFile(input.files[0]);
  if (input.dataset.action === "import-private-assets" && input.files?.[0]) importPrivateFile(input.files[0]);
  if (input.dataset.action === "import-extension-pack" && input.files?.[0]) importExtensionFile(input.files[0]);
});

render();
window.addEventListener("error", (event) => rememberClientError(event.message || "window error"));
window.addEventListener("unhandledrejection", (event) => rememberClientError(event.reason?.message || event.reason || "unhandled rejection"));
loadPrivateAssets().then((loaded) => {
  privateAssetCount = loaded.length;
  if (state) render();
}).catch(() => {});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FC_CAREER_UPDATE") showToast("新版本已就绪，请刷新页面");
    });
  });
}
