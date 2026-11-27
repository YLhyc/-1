/* 2027 考研政治刷题 PWA 核心逻辑 */
const STORE_PREFIX = "politics_pwa_v1_";
const ACTIVE_PROFILE_KEY = `${STORE_PREFIX}active_profile`;
const SYNC_CFG_KEY = `${STORE_PREFIX}sync_cfg`;
const LEGACY_MIGRATED_KEY = `${STORE_PREFIX}migrated_v2`;

const PROFILES = {
  me: { id: "me", label: "我的" },
  gf: { id: "gf", label: "女友" }
};

function getActiveProfileId() {
  const v = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return v === "gf" ? "gf" : "me";
}

function getProfileLabel(profId = getActiveProfileId()) {
  return PROFILES[profId]?.label || "我的";
}

const PAPER_STATE_KEY = (pid, profId = getActiveProfileId()) =>
  `${STORE_PREFIX}prof_${profId}_paper_${pid}`;
const MISTAKE_STATE_KEY = (profId = getActiveProfileId()) =>
  `${STORE_PREFIX}prof_${profId}_mistakes_meta`;
const SETTINGS_KEY = (profId = getActiveProfileId()) =>
  `${STORE_PREFIX}prof_${profId}_settings`;

const GIST_FILENAME = "politics_quiz_sync_v1.json";
const GIST_DESC = "2027考研政治刷题PWA同步存档";

function migrateLegacyV1KeysIfNeeded() {
  if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return;
  const moves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(STORE_PREFIX)) continue;
    if (k.startsWith(`${STORE_PREFIX}paper_`)) {
      const pid = k.slice(`${STORE_PREFIX}paper_`.length);
      moves.push([k, PAPER_STATE_KEY(pid, "me")]);
    } else if (k === `${STORE_PREFIX}mistakes_meta`) {
      moves.push([k, MISTAKE_STATE_KEY("me")]);
    } else if (k === `${STORE_PREFIX}settings`) {
      moves.push([k, SETTINGS_KEY("me")]);
    }
  }
  moves.forEach(([oldK, newK]) => {
    if (!localStorage.getItem(newK)) {
      localStorage.setItem(newK, localStorage.getItem(oldK));
    }
    localStorage.removeItem(oldK);
  });
  localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
}

const SVG = {
  moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`,
  sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`
};

const app = {
  manifest: null,
  papersCache: {},
  currentView: "bookshelf", // bookshelf | quiz | mistakes
  seriesFilter: "all",
  activePaper: null,
  activeState: null,
  viewMode: "scroll", // scroll | card
  currentIndex: 0,
  onlyReview: false,
  timerHandle: null,
  timerPaused: false,
  pendingSelection: null,
  lastUndo: null,
  toastTimer: null,
  mistakeFilter: { type: "wrong", mod: "all", hideMastered: true },
  mistakePractice: {}, // ephemeral or stored re-do answers
  syncBusy: false
};

// ---------------- 工具函数 ----------------
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nowMs() {
  return Date.now();
}

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function formatDurationZh(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}秒`;
  return `${m}分${String(r).padStart(2, "0")}秒`;
}

function showToast(msg, undoFn = null) {
  const t = document.getElementById("toast");
  const m = document.getElementById("toastMsg");
  const u = document.getElementById("toastUndoBtn");
  m.textContent = msg;
  app.lastUndo = undoFn;
  u.classList.toggle("hidden", !undoFn);
  t.classList.remove("hidden");
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => {
    t.classList.add("hidden");
    app.lastUndo = null;
  }, undoFn ? 4200 : 2400);
}

function isTouchDevice() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

// ---------------- 设置与主题 ----------------
function loadSettings(profId = getActiveProfileId()) {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY(profId)) || "{}") || {};
  } catch {
    return {};
  }
}

function saveSettings(patch, profId = getActiveProfileId()) {
  const cur = { ...loadSettings(profId), ...patch };
  localStorage.setItem(SETTINGS_KEY(profId), JSON.stringify(cur));
  return cur;
}

function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "warm";
  document.documentElement.setAttribute("data-theme", t);
  const meta = document.getElementById("metaThemeColor");
  if (meta) meta.setAttribute("content", t === "dark" ? "#141413" : "#faf9f5");
  const icon = document.getElementById("themeIcon");
  if (icon) icon.innerHTML = t === "dark" ? SVG.sun : SVG.moon;
}

// ---------------- 状态存储 ----------------
function emptyPaperState() {
  return {
    answers: {},
    questionMarks: {},
    optionMarks: {},
    excludedOptions: {},
    highlights: {}, // key: `${qId}__stem` or `${qId}__opt_${A}` -> [{start, end}]
    submitted: false,
    elapsedSeconds: 0,
    updatedAt: 0
  };
}

function loadPaperState(paperId, profId = getActiveProfileId()) {
  try {
    const raw = localStorage.getItem(PAPER_STATE_KEY(paperId, profId));
    if (!raw) return emptyPaperState();
    const parsed = JSON.parse(raw);
    return { ...emptyPaperState(), ...parsed };
  } catch {
    return emptyPaperState();
  }
}

function savePaperState(paperId, state, triggerAutoSync = true, profId = getActiveProfileId()) {
  state.updatedAt = nowMs();
  localStorage.setItem(PAPER_STATE_KEY(paperId, profId), JSON.stringify(state));
  if (triggerAutoSync) {
    scheduleAutoSync();
  }
}

function loadMistakeMeta(profId = getActiveProfileId()) {
  try {
    return JSON.parse(localStorage.getItem(MISTAKE_STATE_KEY(profId)) || "{}") || {};
  } catch {
    return {};
  }
}

function saveMistakeMeta(meta, triggerAutoSync = true, profId = getActiveProfileId()) {
  localStorage.setItem(MISTAKE_STATE_KEY(profId), JSON.stringify(meta));
  if (triggerAutoSync) scheduleAutoSync();
}

function syncProfileUi() {
  const profId = getActiveProfileId();
  const label = getProfileLabel(profId);
  const badge = document.getElementById("activeProfileBadge");
  if (badge) badge.textContent = label;
  document.querySelectorAll("[data-switch-profile]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-switch-profile") === profId);
  });
  const mSub = document.getElementById("mistakesOwnerSub");
  if (mSub) {
    mSub.textContent = `当前展示「${label}」档案错题与标疑题，支持独立重做演练与斩题归档`;
  }
}

function switchActiveProfile(profId) {
  const next = profId === "gf" ? "gf" : "me";
  if (next === getActiveProfileId()) return;
  stopTimer();
  localStorage.setItem(ACTIVE_PROFILE_KEY, next);
  app.mistakePractice = {};
  applyTheme(loadSettings(next).theme || "warm");
  syncProfileUi();

  if (app.currentView === "quiz" && app.activePaper) {
    app.activeState = loadPaperState(app.activePaper.paper_id, next);
    app.currentIndex = 0;
    app.onlyReview = false;
    app.timerPaused = false;
    renderQuizView();
    if (!app.activeState.submitted) startTimer();
  } else if (app.currentView === "mistakes") {
    renderBookshelf();
    openMistakesView();
  } else {
    renderBookshelf();
  }
  showToast(`已切换至「${getProfileLabel(next)}」独立存档`);
  const cfg = loadSyncCfg();
  if (cfg.token && navigator.onLine && cfg.autoSync !== false) {
    syncWithGist(true);
  }
}

// ---------------- 判分逻辑 ----------------
function checkAnswer(q, ans) {
  if (q.type === "single") return ans === q.answer;
  if (!Array.isArray(ans) || !Array.isArray(q.answer)) return false;
  return [...ans].sort().join(",") === [...q.answer].sort().join(",");
}

function computePaperSummary(paper, st) {
  let correct = 0;
  let score = 0;
  let maxPts = 0;
  let singlePts = 0, singleMax = 0, multiPts = 0, multiMax = 0;
  const modStats = {};
  const qs = paper.questions || [];
  let answeredCount = 0;

  qs.forEach((q) => {
    const pts = q.type === "single" ? 1 : 2;
    maxPts += pts;
    if (q.type === "single") singleMax += pts;
    else multiMax += pts;
    const u = st.answers[q.id];
    if (Array.isArray(u) ? u.length > 0 : Boolean(u)) answeredCount++;

    const mod = (q.tags && q.tags[0]) ? q.tags[0] : "其他";
    modStats[mod] = modStats[mod] || { pts: 0, max: 0, ok: 0, total: 0 };
    modStats[mod].max += pts;
    modStats[mod].total += 1;

    if (st.submitted && checkAnswer(q, u)) {
      correct++;
      score += pts;
      if (q.type === "single") singlePts += pts;
      else multiPts += pts;
      modStats[mod].pts += pts;
      modStats[mod].ok += 1;
    }
  });

  const markedCount = Object.keys(st.questionMarks || {}).length;
  return {
    total: qs.length,
    answeredCount,
    correct,
    wrong: st.submitted ? qs.length - correct : 0,
    score,
    maxPts,
    singlePts,
    singleMax,
    multiPts,
    multiMax,
    markedCount,
    modStats
  };
}

// ---------------- 文本偏移高亮引擎 ----------------
function normalizeRanges(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return [];
  const sorted = ranges
    .filter((r) => r && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .map((r) => ({ start: Math.floor(r.start), end: Math.floor(r.end) }))
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of sorted) {
    if (!merged.length || r.start > merged[merged.length - 1].end) {
      merged.push({ ...r });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    }
  }
  return merged;
}

function renderHighlightedText(plainText, ranges, hlKey) {
  const norm = normalizeRanges(ranges);
  if (!norm.length) return esc(plainText);
  let out = "";
  let pos = 0;
  norm.forEach((r, idx) => {
    const s = Math.max(0, Math.min(plainText.length, r.start));
    const e = Math.max(s, Math.min(plainText.length, r.end));
    if (s > pos) out += esc(plainText.slice(pos, s));
    if (e > s) {
      out += `<mark class="user-hl" data-hl-key="${esc(hlKey)}" data-hl-idx="${idx}" title="点击取消高光">${esc(plainText.slice(s, e))}</mark>`;
    }
    pos = e;
  });
  if (pos < plainText.length) out += esc(plainText.slice(pos));
  return out;
}

function getTextOffsetWithin(containerEl, targetNode, targetOffset) {
  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null);
  let offset = 0;
  let node;
  while ((node = walker.nextNode())) {
    if (node === targetNode) {
      return offset + targetOffset;
    }
    offset += node.nodeValue.length;
  }
  return -1;
}

function captureSelectionTarget() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const text = sel.toString().trim();
  if (!text) return null;

  const range = sel.getRangeAt(0);
  let el = range.commonAncestorContainer;
  if (el.nodeType === 3) el = el.parentElement;
  const targetBox = el?.closest("[data-hl-key]");
  if (!targetBox) return null;

  const start = getTextOffsetWithin(targetBox, range.startContainer, range.startOffset);
  const end = getTextOffsetWithin(targetBox, range.endContainer, range.endOffset);
  if (start < 0 || end <= start) return null;
  return {
    hlKey: targetBox.getAttribute("data-hl-key"),
    start,
    end
  };
}

function applyHighlight(hlKey, start, end) {
  if (!app.activePaper || !app.activeState) return;
  const list = app.activeState.highlights[hlKey] || [];
  list.push({ start, end });
  app.activeState.highlights[hlKey] = normalizeRanges(list);
  savePaperState(app.activePaper.paper_id, app.activeState);
  rehydrateHighlightTarget(hlKey);
  window.getSelection()?.removeAllRanges();
  hideHlFloatBar();
}

function removeHighlightAt(hlKey, hlIdx) {
  if (!app.activePaper || !app.activeState) return;
  const prev = [...(app.activeState.highlights[hlKey] || [])];
  if (hlIdx < 0 || hlIdx >= prev.length) return;
  const next = prev.filter((_, i) => i !== hlIdx);
  if (next.length) app.activeState.highlights[hlKey] = next;
  else delete app.activeState.highlights[hlKey];
  savePaperState(app.activePaper.paper_id, app.activeState);
  rehydrateHighlightTarget(hlKey);
  showToast("已取消高光标记", () => {
    app.activeState.highlights[hlKey] = prev;
    savePaperState(app.activePaper.paper_id, app.activeState);
    rehydrateHighlightTarget(hlKey);
  });
}

function rehydrateHighlightTarget(hlKey) {
  const el = document.querySelector(`[data-hl-key="${CSS.escape(hlKey)}"]`);
  if (!el || !app.activePaper) return;
  const [qid, kind] = hlKey.split("__");
  const q = app.activePaper.questions.find((x) => x.id === qid);
  if (!q) return;
  const plain = kind === "stem" ? q.stem : q.options[kind.replace("opt_", "")];
  const ranges = (app.activeState.highlights || {})[hlKey] || [];
  el.innerHTML = renderHighlightedText(plain, ranges, hlKey);
}

function showHlFloatBar() {
  document.getElementById("hlFloatBar").classList.remove("hidden");
}

function hideHlFloatBar() {
  document.getElementById("hlFloatBar").classList.add("hidden");
  app.pendingSelection = null;
}

// ---------------- 数据加载 ----------------
async function fetchManifest() {
  const res = await fetch("./data/manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("无法加载试卷目录");
  app.manifest = await res.json();
}

async function fetchPaper(paperId) {
  if (app.papersCache[paperId]) return app.papersCache[paperId];
  const res = await fetch(`./data/papers/${paperId}.json`);
  if (!res.ok) throw new Error(`加载试卷 ${paperId} 失败`);
  const data = await res.json();
  app.papersCache[paperId] = data;
  return data;
}

async function ensureAllPapersLoaded() {
  if (!app.manifest) await fetchManifest();
  await Promise.all(app.manifest.papers.map((p) => fetchPaper(p.paper_id)));
}

// ---------------- 视图切换 ----------------
function switchView(viewName) {
  app.currentView = viewName;
  document.getElementById("bookshelfView").classList.toggle("hidden", viewName !== "bookshelf");
  document.getElementById("quizView").classList.toggle("hidden", viewName !== "quiz");
  document.getElementById("mistakesView").classList.toggle("hidden", viewName !== "mistakes");
  document.getElementById("backBtn").classList.toggle("hidden", viewName === "bookshelf");
  document.getElementById("bottomDock").classList.toggle("hidden", viewName !== "quiz");
  hideHlFloatBar();

  if (viewName !== "quiz") {
    stopTimer();
    document.getElementById("topbarTitle").textContent =
      viewName === "mistakes" ? "本地错题与标疑本" : "2027 考研政治刷题";
  } else if (app.activePaper) {
    document.getElementById("topbarTitle").textContent = app.activePaper.short_title || app.activePaper.title;
  }
}

// ---------------- 书架渲染 ----------------
async function renderBookshelf() {
  switchView("bookshelf");
  if (!app.manifest) await fetchManifest();
  const papers = app.manifest.papers || [];

  let doneCount = 0;
  let scoreSum = 0;
  let wrongTotal = 0;
  let markedTotal = 0;
  const mistakeMeta = loadMistakeMeta();

  const cardsHtml = [];
  for (const meta of papers) {
    const st = loadPaperState(meta.paper_id);
    const ansCount = Object.values(st.answers || {}).filter((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v)
    ).length;
    const mCount = Object.keys(st.questionMarks || {}).length;
    markedTotal += mCount;

    let statusText = "未作答";
    let statusCls = "";
    let extraMeta = `<span>33 题 · 50 分</span>`;

    if (st.submitted) {
      doneCount++;
      // 若已加载论文则精确算分，未加载则在后台预算或读缓存 score
      let score = st._cachedScore;
      let wrong = st._cachedWrong;
      if (app.papersCache[meta.paper_id]) {
        const sum = computePaperSummary(app.papersCache[meta.paper_id], st);
        score = sum.score;
        wrong = sum.wrong;
      }
      if (typeof score === "number") {
        scoreSum += score;
        statusText = `${score} / 50 分`;
      } else {
        statusText = "已交卷";
      }
      statusCls = "done";
      if (typeof wrong === "number") {
        // 统计未斩掉的错题
        const qs = app.papersCache[meta.paper_id]?.questions || [];
        const activeWrong = qs.filter((q) => !checkAnswer(q, st.answers[q.id]) && !mistakeMeta[q.id]?.mastered).length;
        wrongTotal += activeWrong;
        extraMeta = `<span>用时 ${formatDurationZh(st.elapsedSeconds)}</span><span>错 ${wrong} 题</span>`;
      }
    } else if (ansCount > 0) {
      statusText = `作答中 ${ansCount}/33`;
      statusCls = "wip";
      extraMeta = `<span>已用时 ${formatDurationZh(st.elapsedSeconds)}</span>`;
    }

    const matchSeries =
      app.seriesFilter === "all" ||
      (app.seriesFilter === "todo" && !st.submitted) ||
      app.seriesFilter === meta.series;
    if (!matchSeries) continue;

    cardsHtml.push(`
      <button class="paper-card" type="button" data-open-paper="${esc(meta.paper_id)}">
        <div class="paper-card-top">
          <span class="series-tag ${esc(meta.series)}">${meta.series === "xiao8" ? "27 肖八" : "徐涛十套卷"}</span>
          <span class="paper-status ${statusCls}">${esc(statusText)}</span>
        </div>
        <div class="paper-title">${esc(meta.short_title || meta.title)}</div>
        <div class="paper-meta">
          ${extraMeta}
          ${mCount > 0 ? `<span>标疑 ${mCount}</span>` : ""}
        </div>
      </button>
    `);
  }

  document.getElementById("statDone").textContent = `${doneCount} / ${papers.length}`;
  document.getElementById("statAvg").textContent = doneCount ? `${(scoreSum / doneCount).toFixed(1)} 分` : "--";
  document.getElementById("statWrong").textContent = String(wrongTotal);
  document.getElementById("statMarked").textContent = String(markedTotal);
  document.getElementById("mistakesCountBadge").textContent = `错题 ${wrongTotal}`;

  document.getElementById("paperGrid").innerHTML =
    cardsHtml.join("") || `<div class="help-note">当前筛选条件下暂无试卷。</div>`;
}

// ---------------- 刷题计时器 ----------------
function startTimer() {
  stopTimer();
  if (!app.activeState || app.activeState.submitted || app.timerPaused) {
    syncTimerUi();
    return;
  }
  syncTimerUi();
  app.timerHandle = setInterval(() => {
    if (!app.activePaper || !app.activeState || app.activeState.submitted || app.timerPaused) return;
    app.activeState.elapsedSeconds = (app.activeState.elapsedSeconds || 0) + 1;
    // 每 10 秒落盘一次时间避免频繁 IO
    if (app.activeState.elapsedSeconds % 10 === 0) {
      localStorage.setItem(PAPER_STATE_KEY(app.activePaper.paper_id), JSON.stringify(app.activeState));
    }
    syncTimerUi();
  }, 1000);
}

function stopTimer() {
  if (app.timerHandle) {
    clearInterval(app.timerHandle);
    app.timerHandle = null;
  }
}

function syncTimerUi() {
  const el = document.getElementById("timerText");
  const btn = document.getElementById("timerToggleBtn");
  if (!app.activeState) return;
  el.textContent = formatDuration(app.activeState.elapsedSeconds || 0);
  btn.classList.toggle("active", app.timerPaused);
}

// ---------------- 刷题页渲染 ----------------
async function openPaper(paperId) {
  const paper = await fetchPaper(paperId);
  const meta = (app.manifest?.papers || []).find((p) => p.paper_id === paperId);
  if (meta) paper.short_title = meta.short_title;

  app.activePaper = paper;
  app.activeState = loadPaperState(paperId);
  app.currentIndex = 0;
  app.onlyReview = false;
  app.timerPaused = false;
  const settings = loadSettings();
  app.viewMode = settings.viewMode || "scroll";

  switchView("quiz");
  renderQuizView();
  if (!app.activeState.submitted) startTimer();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function getFilteredQuestions() {
  if (!app.activePaper) return [];
  const qs = app.activePaper.questions;
  if (!app.onlyReview) return qs;
  const st = app.activeState;
  return qs.filter((q) => {
    const isCor = st.submitted ? checkAnswer(q, st.answers[q.id]) : true;
    const hasQMark = !!st.questionMarks[q.id];
    const hasOptMark = Object.keys(q.options).some((k) => !!st.optionMarks[`${q.id}_${k}`]);
    return (st.submitted && !isCor) || hasQMark || hasOptMark;
  });
}

function buildQuestionCardHtml(q, globalIdx) {
  const st = app.activeState;
  const uAns = st.answers[q.id];
  const isMarked = !!st.questionMarks[q.id];
  const noteVal = st.questionMarks[q.id]?.note || "";
  const isSubmitted = st.submitted;
  const isCorrect = isSubmitted ? checkAnswer(q, uAns) : false;

  const optsHtml = Object.entries(q.options).map(([letter, text]) => {
    const isSel = q.type === "single" ? uAns === letter : Array.isArray(uAns) && uAns.includes(letter);
    const optKey = `${q.id}_${letter}`;
    const optMarked = !!st.optionMarks[optKey];
    const optExcl = !!st.excludedOptions[optKey];

    let rowCls = "opt-row";
    if (isSel) rowCls += " selected";
    if (optMarked) rowCls += " opt-marked";
    if (optExcl) rowCls += " opt-excluded";
    if (isSubmitted) {
      const rightSet = Array.isArray(q.answer) ? q.answer : [q.answer];
      if (rightSet.includes(letter)) rowCls += " ans-correct";
      else if (isSel && !rightSet.includes(letter)) rowCls += " ans-wrong";
    }

    const hlKey = `${q.id}__opt_${letter}`;
    const textHtml = renderHighlightedText(text, (st.highlights || {})[hlKey], hlKey);

    return `
      <div class="${rowCls}">
        <div class="opt-main" data-select-opt="${esc(q.id)}|${esc(letter)}">
          <span class="opt-letter">${esc(letter)}</span>
          <span class="otext" data-hl-key="${esc(hlKey)}">${textHtml}</span>
        </div>
        <div class="opt-tools">
          <button class="mini-tool-btn ${optMarked ? "active-mark" : ""}" type="button" data-mark-opt="${esc(optKey)}" title="标疑选项">疑</button>
          <button class="mini-tool-btn ${optExcl ? "active-excl" : ""}" type="button" data-excl-opt="${esc(optKey)}" title="排除此项">排</button>
        </div>
      </div>
    `;
  }).join("");

  const stemKey = `${q.id}__stem`;
  const stemHtml = renderHighlightedText(q.stem, (st.highlights || {})[stemKey], stemKey);

  let reviewHtml = "";
  if (isSubmitted) {
    const uStr = Array.isArray(uAns) ? (uAns.length ? uAns.join("、") : "未作答") : (uAns || "未作答");
    const cStr = Array.isArray(q.answer) ? q.answer.join("、") : q.answer;
    reviewHtml = `
      <div class="review ${isCorrect ? "good" : "bad"}">
        <div class="review-head">
          <span class="review-badge ${isCorrect ? "ok" : "err"}">
            ${isCorrect ? SVG.check : SVG.cross} ${isCorrect ? "回答正确" : "回答错误"}
          </span>
          <span>你的答案：<strong>${esc(uStr)}</strong></span>
          <span>参考答案：<strong>${esc(cStr)}</strong></span>
        </div>
        <div>${q.explanation || ""}</div>
      </div>
    `;
  }

  return `
    <article class="q-card ${isMarked ? "is-marked" : ""}" id="qwrap_${esc(q.id)}">
      <div class="q-head">
        <div class="q-badges">
          <span class="q-num">第 ${globalIdx + 1} 题</span>
          <span class="q-type ${q.type === "multi" ? "multi" : ""}">${q.type === "single" ? "单选 1分" : "多选 2分"}</span>
          ${(q.tags || []).slice(0, 2).map((t) => `<span class="q-tag">#${esc(t)}</span>`).join("")}
        </div>
        <button class="mark-q-btn ${isMarked ? "active" : ""}" type="button" data-mark-q="${esc(q.id)}">
          ${SVG.flag}
          <span>${isMarked ? "已标疑" : "标疑"}</span>
        </button>
      </div>
      ${isMarked ? `
        <div class="q-note-box">
          <input class="q-note-input" type="text" data-q-note="${esc(q.id)}" value="${esc(noteVal)}" placeholder="选填：记录拿不准的原因或关键词...">
        </div>
      ` : ""}
      <div class="stem" data-hl-key="${esc(stemKey)}">${stemHtml}</div>
      <div class="options">${optsHtml}</div>
      ${reviewHtml}
    </article>
  `;
}

function renderQuizView() {
  const paper = app.activePaper;
  const st = app.activeState;
  if (!paper || !st) return;

  const summary = computePaperSummary(paper, st);
  document.getElementById("quizProgressText").textContent = `${summary.answeredCount} / ${summary.total}`;
  document.getElementById("quizProgressFill").style.width = `${Math.round((summary.answeredCount / summary.total) * 100)}%`;

  const modeText = document.getElementById("viewModeText");
  const modeBtn = document.getElementById("viewModeBtn");
  modeText.textContent = app.viewMode === "card" ? "长列表模式" : "单题模式";
  modeBtn.classList.toggle("active", app.viewMode === "card");

  const filterBtn = document.getElementById("filterReviewBtn");
  filterBtn.classList.toggle("active", app.onlyReview);
  document.getElementById("filterReviewText").textContent = app.onlyReview ? "看全部" : "错题/标记";

  // 结算卡
  const resEl = document.getElementById("resultSummaryCard");
  if (st.submitted) {
    const modHtml = Object.entries(summary.modStats)
      .map(([m, v]) => `<div class="mod-item"><span>${esc(m)}</span><span class="num">${v.pts}/${v.max}</span></div>`)
      .join("");
    const receiptText = buildFormattedReceipt(paper, st, summary);
    resEl.classList.remove("hidden");
    resEl.innerHTML = `
      <h3>测验结算：${summary.score} / ${summary.maxPts} 分（对 ${summary.correct}/${summary.total} 题 · ${Math.round((summary.correct / summary.total) * 100)}%）</h3>
      <div style="font-size:13px;color:var(--text-secondary);">
        单选 ${summary.singlePts}/${summary.singleMax} 分 · 多选 ${summary.multiPts}/${summary.multiMax} 分 · 用时 ${formatDurationZh(st.elapsedSeconds)} · 标疑 ${summary.markedCount} 题
      </div>
      <div class="mod-grid">${modHtml}</div>
      <div class="btn-row">
        <button class="dock-btn primary" type="button" id="resCopyBtn">${SVG.copy}<span>复制标准答题结果（含标记）</span></button>
        <button class="dock-btn" type="button" id="resFilterBtn">${SVG.filter}<span>${app.onlyReview ? "显示全部" : "只看错题与标疑"}</span></button>
      </div>
      <textarea id="copyReceiptArea" class="copy-area hidden" readonly>${esc(receiptText)}</textarea>
    `;
  } else {
    resEl.classList.add("hidden");
    resEl.innerHTML = "";
  }

  // 题目列表
  const listEl = document.getElementById("questionContainer");
  const visibleQs = getFilteredQuestions();
  if (!visibleQs.length) {
    listEl.innerHTML = `<div class="help-note">当前筛选条件下没有错题或标记题。</div>`;
  } else if (app.viewMode === "card") {
    if (app.currentIndex >= visibleQs.length) app.currentIndex = visibleQs.length - 1;
    if (app.currentIndex < 0) app.currentIndex = 0;
    const q = visibleQs[app.currentIndex];
    const gIdx = paper.questions.findIndex((x) => x.id === q.id);
    listEl.innerHTML = buildQuestionCardHtml(q, gIdx);
  } else {
    listEl.innerHTML = visibleQs
      .map((q) => {
        const gIdx = paper.questions.findIndex((x) => x.id === q.id);
        return buildQuestionCardHtml(q, gIdx);
      })
      .join("");
  }

  // 底部 dock 更新
  const prevBtn = document.getElementById("dockPrevBtn");
  const nextBtn = document.getElementById("dockNextOrSubmitBtn");
  const nextLbl = document.getElementById("dockNextLabel");
  const copyBtn = document.getElementById("dockCopyBtn");
  const sheetLbl = document.getElementById("dockSheetLabel");

  sheetLbl.textContent = app.viewMode === "card"
    ? `答题卡 (${app.currentIndex + 1}/${visibleQs.length || 0})`
    : `答题卡 (${summary.answeredCount}/${summary.total})`;

  copyBtn.classList.toggle("hidden", !st.submitted);

  if (app.viewMode === "card") {
    prevBtn.classList.remove("hidden");
    prevBtn.disabled = app.currentIndex <= 0;
    if (app.currentIndex < visibleQs.length - 1) {
      nextLbl.textContent = "下一题";
      nextBtn.className = "dock-btn primary";
    } else if (!st.submitted) {
      nextLbl.textContent = "交卷结算";
      nextBtn.className = "dock-btn accent";
    } else {
      nextLbl.textContent = "回顶部战绩";
      nextBtn.className = "dock-btn";
    }
  } else {
    prevBtn.classList.add("hidden");
    if (!st.submitted) {
      nextLbl.textContent = "交卷结算";
      nextBtn.className = "dock-btn accent";
    } else {
      nextLbl.textContent = "回顶部战绩";
      nextBtn.className = "dock-btn";
    }
  }

  syncTimerUi();
}

function updateQuestionCardInPlace(qid) {
  if (!app.activePaper || !app.activeState) return;
  const gIdx = app.activePaper.questions.findIndex((x) => x.id === qid);
  const el = document.getElementById(`qwrap_${qid}`);
  if (gIdx < 0 || !el) {
    renderQuizView();
    return;
  }
  const q = app.activePaper.questions[gIdx];
  const tpl = document.createElement("template");
  tpl.innerHTML = buildQuestionCardHtml(q, gIdx).trim();
  const nextEl = tpl.content.firstElementChild;
  if (nextEl) el.replaceWith(nextEl);

  const summary = computePaperSummary(app.activePaper, app.activeState);
  document.getElementById("quizProgressText").textContent = `${summary.answeredCount} / ${summary.total}`;
  document.getElementById("quizProgressFill").style.width = `${Math.round((summary.answeredCount / summary.total) * 100)}%`;
  const visibleQs = getFilteredQuestions();
  document.getElementById("dockSheetLabel").textContent = app.viewMode === "card"
    ? `答题卡 (${app.currentIndex + 1}/${visibleQs.length || 0})`
    : `答题卡 (${summary.answeredCount}/${summary.total})`;
}

function buildFormattedReceipt(paper, st, summary) {
  const lines = [
    `${paper.title}`,
    `总分：${summary.score}/${summary.maxPts}分（做对 ${summary.correct}/${summary.total} 题）｜用时：${formatDurationZh(st.elapsedSeconds)}`,
    `作答结果：`
  ];
  paper.questions.forEach((q) => {
    const uAns = st.answers[q.id];
    const isCor = checkAnswer(q, uAns);
    const uStr = Array.isArray(uAns) ? (uAns.length ? uAns.join("、") : "未作答") : (uAns || "未作答");
    const cStr = Array.isArray(q.answer) ? q.answer.join("、") : q.answer;
    const marks = [];
    if (st.questionMarks[q.id]) {
      const n = st.questionMarks[q.id].note;
      marks.push(`整题${n ? `【${n}】` : ""}`);
    }
    Object.keys(q.options).forEach((opt) => {
      const k = `${q.id}_${opt}`;
      if (st.optionMarks[k]) marks.push(`选项${opt}`);
    });
    const excls = Object.keys(q.options).filter((opt) => st.excludedOptions[`${q.id}_${opt}`]);
    let row = `${q.id}｜${q.source_label}｜${(q.tags || []).join("、")}｜你的答案：${uStr}｜正确答案：${cStr}｜${isCor ? "正确" : "错误"}`;
    if (marks.length) row += `｜标记：${marks.join("，")}`;
    if (excls.length) row += `｜排除：${excls.join("、")}`;
    lines.push(row);
  });
  return lines.join("\n");
}

function copyReceiptText() {
  if (!app.activePaper || !app.activeState?.submitted) return;
  const summary = computePaperSummary(app.activePaper, app.activeState);
  const txt = buildFormattedReceipt(app.activePaper, app.activeState, summary);
  const area = document.getElementById("copyReceiptArea");
  if (area) {
    area.value = txt;
    area.classList.remove("hidden");
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(txt).then(
      () => showToast("已复制标准答题结果（含标记与排除）"),
      () => showToast("请长按展开文本框手动复制")
    );
  } else {
    showToast("已展开文本框，请长按全选复制");
  }
}

function submitActivePaper() {
  const paper = app.activePaper;
  const st = app.activeState;
  if (!paper || !st) return;

  const unanswered = paper.questions.filter((q) => {
    const a = st.answers[q.id];
    return Array.isArray(a) ? a.length === 0 : !a;
  });

  if (unanswered.length > 0) {
    const first = unanswered[0];
    const ok = confirm(`尚有 ${unanswered.length} 道题目未作答（如第 ${paper.questions.indexOf(first) + 1} 题），确定要直接交卷吗？\n点击「取消」将跳转至首道未答题目。`);
    if (!ok) {
      const idx = paper.questions.indexOf(first);
      jumpToQuestion(idx);
      return;
    }
  }

  st.submitted = true;
  const summary = computePaperSummary(paper, st);
  st._cachedScore = summary.score;
  st._cachedWrong = summary.wrong;
  stopTimer();
  savePaperState(paper.paper_id, st);
  renderQuizView();
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(`交卷成功：${summary.score} / 50 分`);
}

function jumpToQuestion(globalIdx) {
  const paper = app.activePaper;
  if (!paper) return;
  if (app.onlyReview) {
    app.onlyReview = false;
  }
  if (app.viewMode === "card") {
    app.currentIndex = Math.max(0, Math.min(paper.questions.length - 1, globalIdx));
    renderQuizView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    renderQuizView();
    const q = paper.questions[globalIdx];
    const el = q && document.getElementById(`qwrap_${q.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------------- 答题卡抽屉 ----------------
function openAnswerSheet() {
  const paper = app.activePaper;
  const st = app.activeState;
  if (!paper || !st) return;

  const visibleQs = getFilteredQuestions();
  const activeQid = app.viewMode === "card" ? visibleQs[app.currentIndex]?.id : null;

  const makePills = (qs) => qs.map((q) => {
    const num = paper.questions.indexOf(q) + 1;
    const u = st.answers[q.id];
    const hasAns = Array.isArray(u) ? u.length > 0 : Boolean(u);
    const isMarked = !!st.questionMarks[q.id] || Object.keys(q.options).some((k) => !!st.optionMarks[`${q.id}_${k}`]);
    let cls = "nav-pill";
    if (st.submitted) {
      cls += checkAnswer(q, u) ? " correct" : " wrong";
    } else if (hasAns) {
      cls += " answered";
    }
    if (isMarked) cls += " marked";
    if (q.id === activeQid) cls += " current";
    return `<button class="${cls}" type="button" data-jump-idx="${num - 1}">${num}</button>`;
  }).join("");

  document.getElementById("sheetSingleGrid").innerHTML = makePills(paper.questions.slice(0, 16));
  document.getElementById("sheetMultiGrid").innerHTML = makePills(paper.questions.slice(16));
  document.getElementById("sheetCopyBtn").classList.toggle("hidden", !st.submitted);
  document.getElementById("sheetSubmitBtn").classList.toggle("hidden", st.submitted);
  document.getElementById("sheetBackdrop").classList.remove("hidden");
}

function closeAnswerSheet() {
  document.getElementById("sheetBackdrop").classList.add("hidden");
}

// ---------------- 本地错题本视图 ----------------
async function openMistakesView() {
  switchView("mistakes");
  document.getElementById("mistakesList").innerHTML = `<div class="help-note">正在汇总全部 18 套卷错题与标疑题...</div>`;
  await ensureAllPapersLoaded();
  renderMistakesList();
}

function renderMistakesList() {
  const papers = app.manifest?.papers || [];
  const meta = loadMistakeMeta();
  const items = [];

  papers.forEach((pInfo) => {
    const paper = app.papersCache[pInfo.paper_id];
    if (!paper) return;
    const st = loadPaperState(pInfo.paper_id);

    paper.questions.forEach((q) => {
      const u = st.answers[q.id];
      const isWrong = st.submitted && !checkAnswer(q, u);
      const isMarked = !!st.questionMarks[q.id] || Object.keys(q.options).some((k) => !!st.optionMarks[`${q.id}_${k}`]);
      const matchType =
        (app.mistakeFilter.type === "wrong" && isWrong) ||
        (app.mistakeFilter.type === "marked" && isMarked) ||
        (app.mistakeFilter.type === "both" && (isWrong || isMarked));
      if (!matchType) return;

      const mod = (q.tags && q.tags[0]) ? q.tags[0] : "其他";
      if (app.mistakeFilter.mod !== "all" && mod !== app.mistakeFilter.mod) return;

      const isMastered = !!meta[q.id]?.mastered;
      if (app.mistakeFilter.hideMastered && isMastered) return;

      items.push({ paper, st, q, isWrong, isMarked, isMastered });
    });
  });

  document.getElementById("mistakeCountLabel").textContent = `共 ${items.length} 题`;
  const listEl = document.getElementById("mistakesList");
  if (!items.length) {
    listEl.innerHTML = `<div class="help-note">当前筛选条件下暂无错题或标疑题。完成任意套卷交卷或标疑后，错题会自动汇集于此！</div>`;
    return;
  }

  listEl.innerHTML = items.map(({ paper, st, q, isWrong, isMarked, isMastered }) => {
    const pAns = app.mistakePractice[q.id];
    const revealed = !!app.mistakePractice[`__rev_${q.id}`];

    const optsHtml = Object.entries(q.options).map(([letter, text]) => {
      const isSel = q.type === "single" ? pAns === letter : Array.isArray(pAns) && pAns.includes(letter);
      let cls = "opt-row";
      if (isSel) cls += " selected";
      if (revealed) {
        const rightSet = Array.isArray(q.answer) ? q.answer : [q.answer];
        if (rightSet.includes(letter)) cls += " ans-correct";
        else if (isSel && !rightSet.includes(letter)) cls += " ans-wrong";
      }
      return `
        <div class="${cls}">
          <div class="opt-main" data-m-opt="${esc(q.id)}|${esc(letter)}|${esc(q.type)}">
            <span class="opt-letter">${esc(letter)}</span>
            <span class="otext">${esc(text)}</span>
          </div>
        </div>
      `;
    }).join("");

    const origAns = st.answers[q.id];
    const origStr = Array.isArray(origAns) ? (origAns.join("、") || "未填") : (origAns || "未填");
    const cStr = Array.isArray(q.answer) ? q.answer.join("、") : q.answer;
    const pOk = checkAnswer(q, pAns);

    return `
      <article class="q-card">
        <div class="q-head">
          <div class="q-badges">
            <span class="q-num">${esc(q.source_label)}</span>
            <span class="q-type ${q.type === "multi" ? "multi" : ""}">${q.type === "single" ? "单选" : "多选"}</span>
            ${(q.tags || []).slice(0, 2).map((t) => `<span class="q-tag">#${esc(t)}</span>`).join("")}
            ${isWrong ? `<span class="q-tag" style="color:var(--error);">原答:${esc(origStr)}</span>` : ""}
            ${isMarked ? `<span class="q-tag" style="color:var(--warning);">已标疑</span>` : ""}
          </div>
          <button class="mark-q-btn ${isMastered ? "active" : ""}" type="button" data-toggle-mastered="${esc(q.id)}">
            ${SVG.check}
            <span>${isMastered ? "已掌握" : "标为已掌握"}</span>
          </button>
        </div>
        <div class="stem">${esc(q.stem)}</div>
        <div class="options">${optsHtml}</div>
        <div class="btn-row" style="margin-top:12px;">
          <button class="pill-btn ${revealed ? "active" : ""}" type="button" data-m-reveal="${esc(q.id)}">
            ${revealed ? "收起答案与解析" : "核对答案与解析"}
          </button>
          <button class="pill-btn" type="button" data-open-paper-at="${esc(paper.paper_id)}|${esc(q.id)}">回原卷查看</button>
        </div>
        ${revealed ? `
          <div class="review ${pOk ? "good" : "bad"}">
            <div class="review-head">
              <span class="review-badge ${pOk ? "ok" : "err"}">${pOk ? "重做正确" : "重做对照"}</span>
              <span>参考答案：<strong>${esc(cStr)}</strong></span>
            </div>
            <div>${q.explanation || ""}</div>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");
}

// ---------------- GitHub Gist 云同步与 JSON 备份 ----------------
function loadSyncCfg() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveSyncCfg(patch) {
  const next = { ...loadSyncCfg(), ...patch };
  localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(next));
  return next;
}

function setSyncIndicator(status, text) {
  const dot = document.getElementById("syncDot");
  const lbl = document.getElementById("syncStatusText");
  if (dot) dot.className = `sync-dot ${status || ""}`;
  if (lbl && text) lbl.textContent = text;
}

function collectProfileBundle(profId = getActiveProfileId()) {
  const prefix = `${STORE_PREFIX}prof_${profId}_paper_`;
  const papers = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      const pid = k.slice(prefix.length);
      papers[pid] = loadPaperState(pid, profId);
    }
  }
  return {
    label: getProfileLabel(profId),
    updatedAt: nowMs(),
    papers,
    mistakesMeta: loadMistakeMeta(profId),
    settings: loadSettings(profId)
  };
}

function normalizeRemoteToV2(remote) {
  if (!remote || typeof remote !== "object") {
    return { schema: "politics_quiz_pwa_sync_v2", updatedAt: 0, profiles: {} };
  }
  if (remote.schema === "politics_quiz_pwa_sync_v2" && remote.profiles && typeof remote.profiles === "object") {
    return remote;
  }
  // 兼容 v1 单人结构：自动归入 profiles.me
  return {
    schema: "politics_quiz_pwa_sync_v2",
    updatedAt: remote.exportedAt || nowMs(),
    profiles: {
      me: {
        label: "我的",
        updatedAt: remote.exportedAt || nowMs(),
        papers: remote.papers || {},
        mistakesMeta: remote.mistakesMeta || {},
        settings: remote.settings || {}
      }
    }
  };
}

function mergeProfileIntoLocal(profId, remoteProf) {
  if (!remoteProf || typeof remoteProf !== "object") return false;
  let changed = false;

  // 合并每套卷：updatedAt 更新者胜出
  const rPapers = remoteProf.papers || {};
  for (const [pid, rState] of Object.entries(rPapers)) {
    const lState = loadPaperState(pid, profId);
    if ((rState.updatedAt || 0) > (lState.updatedAt || 0)) {
      localStorage.setItem(PAPER_STATE_KEY(pid, profId), JSON.stringify({ ...emptyPaperState(), ...rState }));
      changed = true;
    }
  }

  // 合并错题斩题标记：updatedAt 更新者胜出
  const lMeta = loadMistakeMeta(profId);
  const rMeta = remoteProf.mistakesMeta || {};
  const mergedMeta = { ...lMeta };
  for (const [qid, rm] of Object.entries(rMeta)) {
    const lm = mergedMeta[qid];
    if (!lm || (rm.updatedAt || 0) > (lm.updatedAt || 0)) {
      mergedMeta[qid] = rm;
      changed = true;
    }
  }
  localStorage.setItem(MISTAKE_STATE_KEY(profId), JSON.stringify(mergedMeta));
  return changed;
}

function mergeRemoteBundle(rawRemote, targetProfId = getActiveProfileId()) {
  const v2 = normalizeRemoteToV2(rawRemote);
  if (v2.profiles[targetProfId]) {
    return mergeProfileIntoLocal(targetProfId, v2.profiles[targetProfId]);
  }
  return false;
}

function buildUpdatedCloudPayload(rawRemote, activeProfId = getActiveProfileId()) {
  const v2 = normalizeRemoteToV2(rawRemote);
  const nextProfiles = { ...(v2.profiles || {}) };
  nextProfiles[activeProfId] = collectProfileBundle(activeProfId);
  return {
    schema: "politics_quiz_pwa_sync_v2",
    updatedAt: nowMs(),
    profiles: nextProfiles
  };
}

async function gistApi(token, method, path, body = null) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${msg.slice(0, 120)}`);
  }
  return res.json();
}

async function findOrCreateSyncGist(token, existingId) {
  if (existingId) {
    try {
      return await gistApi(token, "GET", `/gists/${existingId}`);
    } catch {
      // 若 ID 无效则继续查找
    }
  }
  const list = await gistApi(token, "GET", "/gists?per_page=100");
  const found = list.find((g) => g.description === GIST_DESC || Boolean(g.files && g.files[GIST_FILENAME]));
  if (found) {
    return await gistApi(token, "GET", `/gists/${found.id}`);
  }
  const initial = buildUpdatedCloudPayload(null, getActiveProfileId());
  return await gistApi(token, "POST", "/gists", {
    description: GIST_DESC,
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(initial, null, 2)
      }
    }
  });
}

async function syncWithGist(quiet = false) {
  const cfg = loadSyncCfg();
  if (!cfg.token) return;
  if (app.syncBusy) return;
  app.syncBusy = true;
  const activeProf = getActiveProfileId();
  setSyncIndicator("busy", "正在同步...");
  try {
    const gist = await findOrCreateSyncGist(cfg.token, cfg.gistId);
    saveSyncCfg({ gistId: gist.id });
    const idInput = document.getElementById("gistIdInput");
    if (idInput) idInput.value = gist.id;

    let remoteRaw = null;
    const fileObj = gist.files && gist.files[GIST_FILENAME];
    if (fileObj && fileObj.content) {
      try {
        remoteRaw = JSON.parse(fileObj.content);
        mergeRemoteBundle(remoteRaw, activeProf);
      } catch {
        remoteRaw = null;
      }
    }

    const nextPayload = buildUpdatedCloudPayload(remoteRaw, activeProf);
    await gistApi(cfg.token, "PATCH", `/gists/${gist.id}`, {
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(nextPayload, null, 2)
        }
      }
    });

    const cloudProfiles = Object.keys(nextPayload.profiles || {}).map((k) => getProfileLabel(k)).join("+");
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    saveSyncCfg({ lastSyncAt: nowMs() });
    setSyncIndicator("ok", `已同步 ${timeStr}（云端含 ${cloudProfiles}）`);

    if (app.currentView === "bookshelf") renderBookshelf();
    else if (app.currentView === "quiz" && app.activePaper) {
      app.activeState = loadPaperState(app.activePaper.paper_id);
      renderQuizView();
    } else if (app.currentView === "mistakes") {
      renderMistakesList();
    }
    if (!quiet) showToast(`「${getProfileLabel(activeProf)}」云端同步完成`);
  } catch (err) {
    setSyncIndicator("err", "同步失败");
    if (!quiet) showToast(`同步失败：${err.message}`);
  } finally {
    app.syncBusy = false;
  }
}

let autoSyncTimer = null;
function scheduleAutoSync() {
  const cfg = loadSyncCfg();
  if (!cfg.token || cfg.autoSync === false) return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => {
    if (navigator.onLine) syncWithGist(true);
  }, 1800);
}

// ---------------- 事件绑定 ----------------
function bindEvents() {
  // 顶部导航
  document.getElementById("backBtn").addEventListener("click", () => renderBookshelf());
  document.getElementById("mistakesNavBtn").addEventListener("click", () => openMistakesView());
  document.getElementById("themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "warm" : "dark";
    applyTheme(next);
    saveSettings({ theme: next });
  });

  // 同步弹窗
  document.getElementById("syncOpenBtn").addEventListener("click", () => {
    const cfg = loadSyncCfg();
    document.getElementById("gistTokenInput").value = cfg.token || "";
    document.getElementById("gistIdInput").value = cfg.gistId || "";
    document.getElementById("autoSyncChk").checked = cfg.autoSync !== false;
    document.getElementById("syncBackdrop").classList.remove("hidden");
  });
  document.getElementById("closeSyncBtn").addEventListener("click", () => {
    document.getElementById("syncBackdrop").classList.add("hidden");
  });
  document.getElementById("syncBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "syncBackdrop") document.getElementById("syncBackdrop").classList.add("hidden");
  });
  document.getElementById("syncNowBtn").addEventListener("click", () => {
    const token = document.getElementById("gistTokenInput").value.trim();
    const gistId = document.getElementById("gistIdInput").value.trim();
    const autoSync = document.getElementById("autoSyncChk").checked;
    if (!token) {
      showToast("请先输入 GitHub Token");
      return;
    }
    saveSyncCfg({ token, gistId, autoSync });
    syncWithGist(false);
  });
  document.getElementById("clearTokenBtn").addEventListener("click", () => {
    localStorage.removeItem(SYNC_CFG_KEY);
    document.getElementById("gistTokenInput").value = "";
    document.getElementById("gistIdInput").value = "";
    setSyncIndicator("", "已清除 Token");
    showToast("已清除本机 Token");
  });

  // 双人身份切换（首页 + 同步抽屉共用）
  document.addEventListener("click", (e) => {
    const profBtn = e.target.closest("[data-switch-profile]");
    if (!profBtn) return;
    switchActiveProfile(profBtn.getAttribute("data-switch-profile"));
  });

  // 导出导入 JSON（绑定当前身份）
  document.getElementById("exportBackupBtn").addEventListener("click", () => {
    const profId = getActiveProfileId();
    const data = buildUpdatedCloudPayload(null, profId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `politics-quiz-${profId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出「${getProfileLabel(profId)}」本地备份`);
  });
  document.getElementById("importBackupBtn").addEventListener("click", () => {
    document.getElementById("importFileInput").click();
  });
  document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const profId = getActiveProfileId();
        if (parsed.schema === "politics_quiz_pwa_sync_v2" && parsed.profiles) {
          const profData = parsed.profiles[profId] || Object.values(parsed.profiles)[0];
          if (profData) mergeProfileIntoLocal(profId, profData);
        } else {
          mergeRemoteBundle(parsed, profId);
        }
        showToast(`已导入合并至「${getProfileLabel(profId)}」`);
        if (app.currentView === "bookshelf") renderBookshelf();
        else if (app.currentView === "quiz" && app.activePaper) {
          app.activeState = loadPaperState(app.activePaper.paper_id);
          renderQuizView();
        }
      } catch {
        showToast("导入失败：JSON 格式无效");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // 书架筛选与开卷
  document.getElementById("seriesTabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-series]");
    if (!btn) return;
    app.seriesFilter = btn.getAttribute("data-series");
    document.querySelectorAll("#seriesTabs .seg-tab").forEach((b) =>
      b.classList.toggle("active", b === btn)
    );
    renderBookshelf();
  });
  document.getElementById("paperGrid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-open-paper]");
    if (card) openPaper(card.getAttribute("data-open-paper"));
  });

  // 刷题工具条
  document.getElementById("timerToggleBtn").addEventListener("click", () => {
    if (!app.activeState || app.activeState.submitted) return;
    app.timerPaused = !app.timerPaused;
    if (app.timerPaused) stopTimer();
    else startTimer();
    syncTimerUi();
  });
  document.getElementById("viewModeBtn").addEventListener("click", () => {
    app.viewMode = app.viewMode === "scroll" ? "card" : "scroll";
    saveSettings({ viewMode: app.viewMode });
    renderQuizView();
  });
  document.getElementById("filterReviewBtn").addEventListener("click", () => {
    app.onlyReview = !app.onlyReview;
    app.currentIndex = 0;
    renderQuizView();
  });

  // 题目区交互委派
  document.getElementById("quizView").addEventListener("click", (e) => {
    // 若用户正在划词选区，不触发选项点击
    const selText = window.getSelection()?.toString().trim();
    if (selText && e.target.closest(".stem, .otext")) return;

    // 轻点高光直接取消（兼容触摸端无右键）
    const hlMark = e.target.closest("mark.user-hl");
    if (hlMark) {
      e.stopPropagation();
      const key = hlMark.getAttribute("data-hl-key");
      const idx = Number(hlMark.getAttribute("data-hl-idx"));
      removeHighlightAt(key, idx);
      return;
    }

    if (e.target.closest("#resCopyBtn")) {
      copyReceiptText();
      return;
    }
    if (e.target.closest("#resFilterBtn")) {
      app.onlyReview = !app.onlyReview;
      app.currentIndex = 0;
      renderQuizView();
      return;
    }

    const optMain = e.target.closest("[data-select-opt]");
    if (optMain && app.activePaper && app.activeState && !app.activeState.submitted) {
      const [qid, letter] = optMain.getAttribute("data-select-opt").split("|");
      const q = app.activePaper.questions.find((x) => x.id === qid);
      if (!q) return;
      const optKey = `${qid}_${letter}`;
      if (app.activeState.excludedOptions[optKey]) {
        delete app.activeState.excludedOptions[optKey];
      }
      if (q.type === "single") {
        app.activeState.answers[qid] = letter;
      } else {
        const cur = Array.isArray(app.activeState.answers[qid]) ? [...app.activeState.answers[qid]] : [];
        const i = cur.indexOf(letter);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(letter);
        cur.sort();
        if (cur.length) app.activeState.answers[qid] = cur;
        else delete app.activeState.answers[qid];
      }
      savePaperState(app.activePaper.paper_id, app.activeState);
      updateQuestionCardInPlace(qid);
      return;
    }

    const markQ = e.target.closest("[data-mark-q]");
    if (markQ && app.activePaper && app.activeState) {
      const qid = markQ.getAttribute("data-mark-q");
      if (app.activeState.questionMarks[qid]) delete app.activeState.questionMarks[qid];
      else app.activeState.questionMarks[qid] = { note: "" };
      savePaperState(app.activePaper.paper_id, app.activeState);
      updateQuestionCardInPlace(qid);
      return;
    }

    const markOpt = e.target.closest("[data-mark-opt]");
    if (markOpt && app.activePaper && app.activeState) {
      const key = markOpt.getAttribute("data-mark-opt");
      const qid = key.slice(0, key.lastIndexOf("_"));
      if (app.activeState.optionMarks[key]) delete app.activeState.optionMarks[key];
      else app.activeState.optionMarks[key] = { note: "" };
      savePaperState(app.activePaper.paper_id, app.activeState);
      updateQuestionCardInPlace(qid);
      return;
    }

    const exclOpt = e.target.closest("[data-excl-opt]");
    if (exclOpt && app.activePaper && app.activeState && !app.activeState.submitted) {
      const key = exclOpt.getAttribute("data-excl-opt");
      const lastUnderscore = key.lastIndexOf("_");
      const qid = key.slice(0, lastUnderscore);
      const letter = key.slice(lastUnderscore + 1);
      if (app.activeState.excludedOptions[key]) {
        delete app.activeState.excludedOptions[key];
      } else {
        app.activeState.excludedOptions[key] = true;
        // 排除时取消该项选中
        const cur = app.activeState.answers[qid];
        if (cur === letter) delete app.activeState.answers[qid];
        else if (Array.isArray(cur)) {
          const next = cur.filter((x) => x !== letter);
          if (next.length) app.activeState.answers[qid] = next;
          else delete app.activeState.answers[qid];
        }
      }
      savePaperState(app.activePaper.paper_id, app.activeState);
      updateQuestionCardInPlace(qid);
    }
  });

  // 笔记输入
  document.getElementById("quizView").addEventListener("input", (e) => {
    const inp = e.target.closest("[data-q-note]");
    if (!inp || !app.activePaper || !app.activeState) return;
    const qid = inp.getAttribute("data-q-note");
    app.activeState.questionMarks[qid] = { note: inp.value };
    savePaperState(app.activePaper.paper_id, app.activeState);
  });

  // PC 右键取消高光兼容
  document.getElementById("quizView").addEventListener("contextmenu", (e) => {
    const hl = e.target.closest("mark.user-hl");
    if (!hl) return;
    e.preventDefault();
    removeHighlightAt(hl.getAttribute("data-hl-key"), Number(hl.getAttribute("data-hl-idx")));
  });

  // 选区划词高亮（PC 自动 / 触屏浮条）
  let selDebounce = null;
  document.addEventListener("selectionchange", () => {
    if (app.currentView !== "quiz") return;
    clearTimeout(selDebounce);
    selDebounce = setTimeout(() => {
      const target = captureSelectionTarget();
      if (!target) {
        hideHlFloatBar();
        return;
      }
      app.pendingSelection = target;
      showHlFloatBar();
    }, 180);
  });

  // 桌面端鼠标松开直接高亮
  document.getElementById("quizView").addEventListener("mouseup", (e) => {
    if (isTouchDevice() && e.pointerType === "touch") return;
    setTimeout(() => {
      const target = captureSelectionTarget();
      if (target && !isTouchDevice()) {
        applyHighlight(target.hlKey, target.start, target.end);
      }
    }, 20);
  });

  document.getElementById("hlApplyBtn").addEventListener("click", () => {
    if (app.pendingSelection) {
      applyHighlight(app.pendingSelection.hlKey, app.pendingSelection.start, app.pendingSelection.end);
    }
  });
  document.getElementById("hlCancelBtn").addEventListener("click", () => {
    window.getSelection()?.removeAllRanges();
    hideHlFloatBar();
  });

  // 单题模式左右手势滑动切题
  let touchStartX = 0, touchStartY = 0;
  const qContainer = document.getElementById("questionContainer");
  qContainer.addEventListener("touchstart", (e) => {
    if (app.viewMode !== "card" || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  qContainer.addEventListener("touchend", (e) => {
    if (app.viewMode !== "card" || e.changedTouches.length !== 1) return;
    if (window.getSelection()?.toString().trim()) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      const visibleQs = getFilteredQuestions();
      if (dx < 0 && app.currentIndex < visibleQs.length - 1) {
        app.currentIndex++;
        renderQuizView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (dx > 0 && app.currentIndex > 0) {
        app.currentIndex--;
        renderQuizView();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, { passive: true });

  // 底部操作栏
  document.getElementById("dockPrevBtn").addEventListener("click", () => {
    if (app.currentIndex > 0) {
      app.currentIndex--;
      renderQuizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  document.getElementById("dockSheetBtn").addEventListener("click", () => openAnswerSheet());
  document.getElementById("dockCopyBtn").addEventListener("click", () => copyReceiptText());
  document.getElementById("dockNextOrSubmitBtn").addEventListener("click", () => {
    const visibleQs = getFilteredQuestions();
    if (app.viewMode === "card" && app.currentIndex < visibleQs.length - 1) {
      app.currentIndex++;
      renderQuizView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (!app.activeState?.submitted) {
      submitActivePaper();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // 答题卡抽屉事件
  document.getElementById("closeSheetBtn").addEventListener("click", () => closeAnswerSheet());
  document.getElementById("sheetBackdrop").addEventListener("click", (e) => {
    if (e.target.id === "sheetBackdrop") closeAnswerSheet();
    const pill = e.target.closest("[data-jump-idx]");
    if (pill) {
      closeAnswerSheet();
      jumpToQuestion(Number(pill.getAttribute("data-jump-idx")));
    }
  });
  document.getElementById("sheetSubmitBtn").addEventListener("click", () => {
    closeAnswerSheet();
    submitActivePaper();
  });
  document.getElementById("sheetCopyBtn").addEventListener("click", () => {
    closeAnswerSheet();
    copyReceiptText();
  });
  document.getElementById("sheetResetBtn").addEventListener("click", () => {
    if (!app.activePaper) return;
    if (!confirm("确定清空当前试卷全部作答、标疑、排除和高光记录吗？")) return;
    app.activeState = emptyPaperState();
    savePaperState(app.activePaper.paper_id, app.activeState);
    app.currentIndex = 0;
    app.onlyReview = false;
    app.timerPaused = false;
    closeAnswerSheet();
    renderQuizView();
    startTimer();
    showToast("本卷已重置");
  });

  // 错题本事件
  document.getElementById("mistakeTypeTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mtype]");
    if (!b) return;
    app.mistakeFilter.type = b.getAttribute("data-mtype");
    document.querySelectorAll("#mistakeTypeTabs .seg-tab").forEach((x) => x.classList.toggle("active", x === b));
    renderMistakesList();
  });
  document.getElementById("mistakeModTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mmod]");
    if (!b) return;
    app.mistakeFilter.mod = b.getAttribute("data-mmod");
    document.querySelectorAll("#mistakeModTabs .seg-tab").forEach((x) => x.classList.toggle("active", x === b));
    renderMistakesList();
  });
  document.getElementById("hideMasteredChk").addEventListener("change", (e) => {
    app.mistakeFilter.hideMastered = e.target.checked;
    renderMistakesList();
  });
  document.getElementById("mistakesPracticeResetBtn").addEventListener("click", () => {
    app.mistakePractice = {};
    renderMistakesList();
    showToast("已清空错题重做选择");
  });
  document.getElementById("mistakesList").addEventListener("click", (e) => {
    const opt = e.target.closest("[data-m-opt]");
    if (opt) {
      const [qid, letter, qtype] = opt.getAttribute("data-m-opt").split("|");
      if (qtype === "single") {
        app.mistakePractice[qid] = letter;
      } else {
        const cur = Array.isArray(app.mistakePractice[qid]) ? [...app.mistakePractice[qid]] : [];
        const i = cur.indexOf(letter);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(letter);
        cur.sort();
        app.mistakePractice[qid] = cur;
      }
      renderMistakesList();
      return;
    }
    const rev = e.target.closest("[data-m-reveal]");
    if (rev) {
      const qid = rev.getAttribute("data-m-reveal");
      app.mistakePractice[`__rev_${qid}`] = !app.mistakePractice[`__rev_${qid}`];
      renderMistakesList();
      return;
    }
    const tog = e.target.closest("[data-toggle-mastered]");
    if (tog) {
      const qid = tog.getAttribute("data-toggle-mastered");
      const meta = loadMistakeMeta();
      const cur = !!meta[qid]?.mastered;
      meta[qid] = { mastered: !cur, updatedAt: nowMs() };
      saveMistakeMeta(meta);
      renderMistakesList();
      return;
    }
    const openOrig = e.target.closest("[data-open-paper-at]");
    if (openOrig) {
      const [pid, qid] = openOrig.getAttribute("data-open-paper-at").split("|");
      openPaper(pid).then(() => {
        const idx = app.activePaper.questions.findIndex((x) => x.id === qid);
        if (idx >= 0) jumpToQuestion(idx);
      });
    }
  });

  // Toast 撤销
  document.getElementById("toastUndoBtn").addEventListener("click", () => {
    if (app.lastUndo) {
      const fn = app.lastUndo;
      app.lastUndo = null;
      document.getElementById("toast").classList.add("hidden");
      fn();
    }
  });
}

function syncStickyOffsets() {
  const topbar = document.getElementById("topbar");
  const subbar = document.getElementById("quizSubbar");
  if (topbar) {
    document.documentElement.style.setProperty("--topbar-h", `${topbar.offsetHeight}px`);
  }
  if (subbar && subbar.offsetHeight > 0) {
    document.documentElement.style.setProperty("--subbar-h", `${subbar.offsetHeight}px`);
  }
}

// ---------------- 初始化 ----------------
async function initApp() {
  migrateLegacyV1KeysIfNeeded();
  syncProfileUi();
  const settings = loadSettings();
  applyTheme(settings.theme || "warm");
  bindEvents();
  syncStickyOffsets();

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(syncStickyOffsets);
    const tb = document.getElementById("topbar");
    const sb = document.getElementById("quizSubbar");
    if (tb) ro.observe(tb);
    if (sb) ro.observe(sb);
  } else {
    window.addEventListener("resize", syncStickyOffsets);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  try {
    await fetchManifest();
    await renderBookshelf();
    // 后台预加载试卷用于精准统计错题数
    ensureAllPapersLoaded().then(() => {
      if (app.currentView === "bookshelf") renderBookshelf();
    });
  } catch (err) {
    document.getElementById("paperGrid").innerHTML = `<div class="help-note">题库加载失败：${esc(err.message)}</div>`;
  }

  const cfg = loadSyncCfg();
  if (cfg.token) {
    setSyncIndicator("ok", cfg.lastSyncAt ? "已绑定云同步" : "就绪");
    if (navigator.onLine && cfg.autoSync !== false) {
      syncWithGist(true);
    }
  }
}

window.addEventListener("DOMContentLoaded", initApp);
