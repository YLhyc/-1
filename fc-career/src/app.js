import {
  acceptCoachJob,
  acceptOffer,
  advanceWeek,
  buildLifeReport,
  chooseMatchAction,
  continueMatch,
  createInitialState,
  deleteSave,
  exportState,
  importState,
  listSaves,
  loadState,
  negotiateOffer,
  retireCoach,
  retirePlayer,
  saveState,
  selectTransferOffer,
  simulateSeason,
  simulateToRetirement,
  startCurrentMatch
} from "./career.js";
import { CLUBS, COACH_JOBS, LEAGUES, NATIONAL_TEAMS, POSITIONS, SECOND_NATIONALITIES, TALENTS, TRAINING_PLANS, TRAITS } from "./data.js";

const app = document.querySelector("#app");
let storage;
let state = null;
let toastTimer;

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
  const short = club?.short || state.player.club || "FC";
  return `
    <article class="player-card surface-card">
      <div class="crest"><b>${escapeHtml(short.slice(0, 1))}</b><small>${escapeHtml(short.slice(0, 3).toUpperCase())}</small></div>
      <div class="player-identity">
        <p>${escapeHtml(state.player.club)} · ${state.world.season}</p>
        <h2>${escapeHtml(state.player.name)}</h2>
        <div><span>${escapeHtml(state.player.position)}</span><span>${state.player.age}岁</span><span>${escapeHtml(state.player.foot)}</span><span>${escapeHtml(state.player.nationality)}</span></div>
      </div>
      <div class="overall"><small>OVR</small><strong>${state.player.overall}</strong><span>${state.player.retired ? "已退役" : `状态 ${state.health.form.toFixed(1)}`}</span></div>
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

function renderCreate() {
  return `
    <section class="view create-view">
      <header class="view-heading"><div><span>NEW CAREER</span><h1>创建你的足球人生</h1></div><p>中国开档优先。所有自定义内容都会明确标记，你仍可获得游戏内成就。</p></header>
      <form class="create-form surface-card" id="createForm">
        <label><span>姓名</span><input id="newName" name="name" value="林骁" maxlength="20" autocomplete="off"></label>
        <label><span>主打位置</span><select id="newPosition" name="position">${POSITIONS.map((item) => `<option value="${item.id}" ${item.id === "CAM" ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
        <label><span>天赋倾向</span><select id="newTalent" name="talent">${TALENTS.map((item) => `<option value="${item.id}" ${item.id === "steady" ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
        <label><span>技术偏置</span><select id="newTechBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
        <label><span>身体偏置</span><select id="newPhysicalBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
        <label><span>精神偏置</span><select id="newMentalBias">${[-3, -2, -1, 0, 1, 2, 3].map((value) => `<option value="${value}" ${value === 0 ? "selected" : ""}>${value > 0 ? "+" : ""}${value}</option>`).join("")}</select></label>
        <label><span>潜力上限（70-99，留空自动）</span><input id="newPotential" type="number" min="70" max="99" value=""></label>
        <label><span>伤病倾向（1-20，留空自动）</span><input id="newInjuryProneness" type="number" min="1" max="20" value=""></label>
        <label><span>家庭背景</span><select id="newFamily" name="family"><option>工人家庭</option><option>中产家庭</option><option>足球世家</option><option>贫寒</option></select></label>
        <label><span>国籍</span><select id="newNationality" name="nationality">${NATIONAL_TEAMS.map((item) => `<option value="${escapeHtml(item.name)}" ${item.id === "chn" ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
        <label><span>第二国籍</span><select id="newSecondNationality" name="secondNationality">${SECOND_NATIONALITIES.map((item) => `<option value="${escapeHtml(item)}" ${item === "无" ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select></label>
        <label><span>初始俱乐部</span><select id="newClub" name="club">${CLUBS.filter((item) => item.league === "csl").map((item) => `<option value="${item.id}" ${item.id === "shanghai-shenhua" ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
        <label><span>出生年份</span><select id="newBirthYear" name="birthYear">${[2008, 2009, 2010, 2011, 2012].map((year) => `<option value="${year}" ${year === 2010 ? "selected" : ""}>${year}</option>`).join("")}</select></label>
        <label><span>惯用脚</span><select id="newFoot" name="foot"><option>右脚</option><option>左脚</option><option>双脚</option></select></label>
        <label><span>身高（cm）</span><input id="newHeight" type="number" min="155" max="205" value="176"></label>
        <label><span>体重（kg）</span><input id="newWeight" type="number" min="50" max="100" value="66"></label>
        <label><span>球衣号码</span><input id="newNumber" type="number" min="1" max="99" value="17"></label>
        <label class="check-row"><input id="newCustomized" type="checkbox"><span>标记为自定义生涯</span></label>
        <fieldset class="trait-picker"><legend>球员特性（最多 5 个）</legend>${TRAITS.map((item) => `<label><input type="checkbox" name="trait" value="${item.id}"><span>${escapeHtml(item.name)}</span></label>`).join("")}</fieldset>
        <button class="primary-action" data-action="create" type="button">开始生涯</button>
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

function renderWeek() {
  const selected = TRAINING_PLANS.find((item) => item.id === state.training.planId) || TRAINING_PLANS[0];
  const mind = mentalLabel(state.resources.mind);
  const nextFixture = state.season?.fixtures?.find((item) => !item.played);
  return `
    <section class="view week-view">
      <header class="view-heading"><div><span>${state.world.season} 赛季 · 第 ${state.world.week} 周</span><h1>本周计划</h1></div><p>训练、恢复、生活与商业的分配会进入存档，不会靠刷新重新随机。</p></header>
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
            ${nextFixture ? `<li class="match-day"><time>${nextFixture.round}轮</time><div><b>${escapeHtml(nextFixture.home?.name || "")}</b><span>对 ${escapeHtml(nextFixture.away?.name || "")}</span></div><small>${nextFixture.focus ? "焦点" : "常规"}</small></li>` : ""}
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
          <label><span>位置专项</span><select id="positionTraining"><option value="">无</option><option value="technique" ${state.training.positionTraining === "technique" ? "selected" : ""}>技术</option><option value="composure" ${state.training.positionTraining === "composure" ? "selected" : ""}>精神</option><option value="stamina" ${state.training.positionTraining === "stamina" ? "selected" : ""}>身体</option><option value="vision" ${state.training.positionTraining === "vision" ? "selected" : ""}>视野</option><option value="passing" ${state.training.positionTraining === "passing" ? "selected" : ""}>传球</option><option value="physical" ${state.training.positionTraining === "physical" ? "selected" : ""}>体能</option></select></label>
          <button class="secondary-action" data-action="training-position">应用位置专项</button>
          <button class="secondary-action" data-action="weak-foot">提升逆足（当前 ${state.player.weakFoot.toFixed(1)}/5）</button>
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
      <section><small>${match.minute ? `${match.minute}'` : match.kickoff || ""} · ${escapeHtml(match.competition || "")}</small><strong>${match.score.home} — ${match.score.away}</strong><em>${match.status === "complete" ? "全场结束" : match.status === "live" ? "焦点回合" : "赛前"}</em></section>
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
          <div class="national-card"><span>国家队</span><b>${escapeHtml(NATIONAL_TEAMS.find((item) => item.id === "chn")?.name || "中国")}</b><p>成年队出场 ${state.nationalTeam.caps} · 进球 ${state.nationalTeam.goals}</p></div>
          <div class="national-card"><span>第二国籍</span><b>${escapeHtml(state.player.secondNationality)}</b><p>${state.player.secondNationality === "无" ? "目前没有资格选择。" : "尚未代表成年队时仍可作出最终选择。"}</p></div>
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
      <h2>${escapeHtml(offer.name || offer.clubId)}</h2>
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
      <span>海外报价</span><h2>${escapeHtml(offer.clubName)}</h2>
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
      <p>${coach?.club ? `执教 ${escapeHtml(coach.club)} · ${coach.license} 证书` : "等待第一份工作"} · 声望 ${Math.round(coach?.reputation || 0)}</p>
      <div class="coach-stats">${stats ? `<div><span>胜</span><b>${stats.wins}</b></div><div><span>平</span><b>${stats.draws}</b></div><div><span>负</span><b>${stats.losses}</b></div><div><span>进球</span><b>${stats.goalsFor}</b></div>` : ""}</div>
    </article>`;
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
      <section class="transfer-card surface-card"><h2>执教赛季</h2><p>${state.coach?.club} · 第 ${state.world.week} 周。推进一周会处理训练、比赛、转会与更衣室事件。</p><button class="primary-action" data-action="advance">推进一周</button><button class="secondary-action danger" data-action="retire-coach">结束教练生涯</button></section>`;
  } else if (state.world.phase === "final") {
    const report = buildLifeReport(state);
    body = `<article class="life-report surface-card"><p class="eyebrow">LIFE REPORT</p><h1>${escapeHtml(report.report)}</h1><p>${escapeHtml(report.themes.join("、"))}</p></article>`;
  } else {
    body = `
      <section class="contract-summary surface-card">
        <span>当前合同</span><strong>${escapeHtml(CLUBS.find((item) => item.id === state.contract.clubId)?.name || state.player.club)}</strong>
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
      <section class="wealth-card surface-card">
        <h2>财富与赞助</h2>
        <p>现金 ${state.finances.cash.toLocaleString("zh-CN")} · 生涯收入 ${state.finances.careerEarnings.toLocaleString("zh-CN")}</p>
        <p>${state.finances.sponsors.length ? `现有赞助：${state.finances.sponsors.map((s) => escapeHtml(s.name)).join("、")}` : "还没有长期赞助。"}</p>
      </section>
      <section class="national-card surface-card">
        <h2>国家队</h2>
        <p>${state.player.nationality} · 成年队 ${state.nationalTeam.caps} 场 ${state.nationalTeam.goals} 球 · 青年队 ${state.nationalTeam.youthCaps} 场 · 资格 ${escapeHtml(state.nationalTeam.status)}</p>
        ${state.nationalTeam.history.slice(-3).map((entry) => `<p class="national-history">${escapeHtml(entry.date)} ${escapeHtml(entry.stage)} ${entry.caps} 场 ${entry.goals} 球 · 评分 ${entry.rating.toFixed(1)}</p>`).join("")}
        <button class="secondary-action danger" data-action="retire">提前结束球员生涯</button>
      </section>`;
  }
  return `
    <section class="view career-view">
      <header class="view-heading"><div><span>${state.world.phase === "coach" ? "COACH DESK" : "CAREER DESK"}</span><h1>${state.world.phase === "coach" ? "教练办公室" : state.world.phase === "final" ? "人生报告" : "职业档案"}</h1></div><p>球员生涯、合同、转会、财富和国家队记录都在这里。</p></header>
      ${body}
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
          <label class="file-label"><span>导入存档</span><input type="file" accept="application/json" data-action="import"></label>
        </section>
        <section class="surface-card">
          <h2>生涯难度</h2>
          <label><span>伤病频率</span><select id="injuryRate"><option value="0.5" ${state.settings.injuryRate === 0.5 ? "selected" : ""}>较低</option><option value="1" ${state.settings.injuryRate === 1 ? "selected" : ""}>标准</option><option value="1.6" ${state.settings.injuryRate === 1.6 ? "selected" : ""}>较高</option></select></label>
          <label><span>随机性</span><select id="randomness"><option value="0.7" ${state.settings.randomness === 0.7 ? "selected" : ""}>更稳定</option><option value="1" ${state.settings.randomness === 1 ? "selected" : ""}>标准</option><option value="1.4" ${state.settings.randomness === 1.4 ? "selected" : ""}>更波动</option></select></label>
          <label><span>经济压力</span><select id="economicPressure"><option value="0.6" ${state.settings.economicPressure === 0.6 ? "selected" : ""}>宽松</option><option value="1" ${state.settings.economicPressure === 1 ? "selected" : ""}>标准</option><option value="1.5" ${state.settings.economicPressure === 1.5 ? "selected" : ""}>紧巴</option></select></label>
          <button class="secondary-action" data-action="save-settings">保存难度</button>
        </section>
        <section class="surface-card save-list">
          <h2>存档</h2>
          ${renderSaveList()}
          <button class="secondary-action" data-action="new">新建生涯</button>
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
    app.innerHTML = `<div class="game-shell">${renderCreate()}<div class="toast" id="toast" role="status" aria-live="polite"></div></div>`;
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

app.addEventListener("click", (event) => {
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
  } else if (action === "weak-foot") {
    if (!state) return;
    const weakFoot = Math.min(5, state.player.weakFoot + 0.5);
    commit({ ...state, player: { ...state.player, weakFoot }, training: { ...state.training, weakFoot: 1 } }, "逆足训练已加入本周计划");
  } else if (action === "advance") {
    if (!state) return;
    const next = advanceWeek(state);
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
    commit({ ...state, settings: { ...state.settings, injuryRate, randomness, economicPressure } }, "难度设置已保存");
  } else if (action === "export") {
    exportCurrent();
  } else if (action === "new") {
    state = null;
    render();
  } else if (action === "load-save") {
    loadSave(button.dataset.id);
  } else if (action === "delete-save") {
    removeSave(button.dataset.id);
  }
});

app.addEventListener("change", (event) => {
  const input = event.target;
  if (input.dataset.action === "import" && input.files?.[0]) importFile(input.files[0]);
});

render();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "FC_CAREER_UPDATE") showToast("新版本已就绪，请刷新页面");
    });
  });
}
