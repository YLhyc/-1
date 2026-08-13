export const AI_DEFAULT_FALLBACK = "本地模板已接管叙事。";

function isConfigured(settings) {
  return Boolean(settings?.ai?.endpoint && settings?.ai?.model && settings?.ai?.key);
}

function buildPrompt(state, event, fallback) {
  const player = state.player?.name || "球员";
  const club = state.player?.club || "球队";
  const fixture = event?.fixture || state.match;
  const facts = {
    player,
    club,
    event: event?.kind || "焦点比赛",
    home: fixture?.home || "",
    away: fixture?.away || "",
    score: fixture?.score || state.match?.score || null,
    minute: event?.minute || state.match?.minute || null,
    rating: event?.rating ?? state.match?.rating ?? null
  };
  return [
    "你是足球生涯模拟器的中文叙事作者。你只能表达下面的事实，绝不能改变比分、数值、人物或存档状态。",
    `事实：${JSON.stringify(facts)}`,
    "输出要求：连续四段以上第二人称中文叙事；包含动作、空间、身体、现场与队友/教练反应；不要出现任何数字表格、JSON 或解释；如果无法表达就返回本地模板。",
    `本地回退模板：${fallback}`
  ].join("\n\n");
}

function validateGeneratedText(text, facts = {}) {
  if (!text || typeof text !== "string") return null;
  const score = facts.score;
  const expectedHome = Array.isArray(score) ? score[0] : score?.home;
  const expectedAway = Array.isArray(score) ? score[1] : score?.away;
  if (typeof expectedHome === "number" || typeof expectedAway === "number") {
    for (const match of text.matchAll(/(\d+)\s*[-–:]\s*(\d+)/g)) {
      const home = Number(match[1]);
      const away = Number(match[2]);
      if (typeof expectedHome === "number" && home !== expectedHome) return null;
      if (typeof expectedAway === "number" && away !== expectedAway) return null;
    }
  }
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => paragraph.length >= 20);
  if (paragraphs.length < 4) return null;
  return paragraphs.slice(0, 6);
}

function chapterPrompt(facts) {
  const structured = {};
  for (const key of [
    "id", "date", "week", "season", "phase", "phaseLabel", "club", "opponent",
    "venue", "weather", "title", "summary", "important", "score", "result",
    "playerMoved", "newClub", "injuries", "retirement", "unemployment",
    "national", "family", "media", "coach", "feed"
  ]) {
    if (facts?.[key] !== undefined) structured[key] = facts[key];
  }
  return [
    "你是足球生涯模拟器的中文叙事作者。你只能表达下面结构化事实，不得新增比分、进球、伤病、关系、转会、合同或数值。",
    `事实：${JSON.stringify(structured)}`,
    "输出要求：连续四到六段第二人称现在时中文叙事；写实职业足球，重大时刻可提高文学性；不输出JSON、表格或解释；若事实不足就使用本地模板。",
    "本地模板：完整本地章节已就绪。"
  ].join("\n\n");
}

function parseChapterParagraphs(text) {
  if (!text || typeof text !== "string") return null;
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => paragraph.length >= 20);
  return paragraphs.length >= 4 ? paragraphs.slice(0, 6) : null;
}

function chapterFactsStillMatch(paragraphs, facts) {
  const score = facts?.score;
  if (score) {
    for (const paragraph of paragraphs) {
      for (const match of paragraph.matchAll(/(\d+)\s*[-—–:]\s*(\d+)/g)) {
        if (Number(match[1]) !== Number(score.home) || Number(match[2]) !== Number(score.away)) return false;
      }
    }
  }
  const allowed = new Set([
    String(facts?.week || ""),
    String(facts?.season || ""),
    ...((facts?.date || "").match(/\d+/g) || []),
    ...((facts?.summary || "").match(/\d+/g) || []),
    ...((facts?.feed || []).flatMap((item) => (item.text || "").match(/\d+/g) || [])),
    ...((facts?.injuries || []).flatMap((item) => String(item.weeks || "")))
  ].filter(Boolean));
  if (score) {
    allowed.add(String(score.home));
    allowed.add(String(score.away));
  }
  for (const paragraph of paragraphs) {
    for (const match of paragraph.matchAll(/(?<!\d)(\d+)(?!\d)/g)) {
      if (!allowed.has(match[0])) return false;
    }
  }
  return true;
}

export async function generateChapterNarrative({
  chapter,
  facts = chapter?.facts,
  settings,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000
}) {
  if (!isConfigured(settings) || typeof fetchImpl !== "function" || !chapter || !facts) {
    return { ok: false, reason: "not-configured" };
  }
  const { endpoint, model, key } = settings.ai;
  const controller = new AbortController();
  let timedOut = false;
  try {
    const fetchPromise = fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: chapterPrompt(facts) },
          { role: "user", content: "请生成这一章的中文叙事段落。" }
        ],
        temperature: 0.4,
        max_tokens: 1100
      })
    });
    let timer;
    const timeoutPromise = new Promise((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        resolve(null);
      }, timeoutMs);
    });
    fetchPromise.finally(() => clearTimeout(timer));
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    if (timedOut || response === null) return { ok: false, reason: "timeout" };
    if (!response.ok) return { ok: false, reason: "endpoint" };
    const data = await response.json();
    if (timedOut) return { ok: false, reason: "timeout" };
    const paragraphs = parseChapterParagraphs(data?.choices?.[0]?.message?.content || "");
    if (!paragraphs) return { ok: false, reason: "format" };
    if (!chapterFactsStillMatch(paragraphs, facts)) return { ok: false, reason: "validation" };
    return { ok: true, paragraphs };
  } catch {
    return { ok: false, reason: timedOut ? "timeout" : "endpoint" };
  }
}

export async function generateNarrative({ state, event, fallback = AI_DEFAULT_FALLBACK, fetchImpl = globalThis.fetch }) {
  const settings = state?.settings || {};
  if (!isConfigured(settings) || typeof fetchImpl !== "function") return fallback;
  const { endpoint, model, key } = settings.ai;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildPrompt(state, event, fallback) },
          { role: "user", content: "请生成连续叙事段落。" }
        ],
        temperature: 0.4,
        max_tokens: 900
      })
    });
    if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const facts = {
      player: state.player?.name || "球员",
      club: state.player?.club || "球队",
      event: event?.kind || "焦点比赛",
      home: event?.fixture?.home || state.match?.home || "",
      away: event?.fixture?.away || state.match?.away || "",
      score: event?.fixture?.score || state.match?.score || null,
      minute: event?.minute || state.match?.minute || null,
      rating: event?.rating ?? state.match?.rating ?? null
    };
    const paragraphs = validateGeneratedText(text, facts);
    return paragraphs || fallback;
  } catch {
    return fallback;
  }
}

function validateSocialText(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 8 || normalized.length > 180) return null;
  return normalized;
}

export async function generateSocialPost({ state, draft, fetchImpl = globalThis.fetch }) {
  if (!isConfigured(state?.settings) || typeof fetchImpl !== "function") return null;
  const cleanDraft = String(draft || "").trim();
  if (!cleanDraft) return null;
  try {
    const { endpoint, model, key } = state.settings.ai;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是足球生涯游戏的社交媒体编辑。只改写玩家给出的草稿，不得加入未经提供的人名、球队、比分、时间或事实。输出一条 8 至 180 字简体中文内容，不要解释。" },
          { role: "user", content: cleanDraft }
        ],
        temperature: 0.3,
        max_tokens: 180
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    return validateSocialText(data?.choices?.[0]?.message?.content || "");
  } catch {
    return null;
  }
}

export function describeAiConfig(state) {
  const configured = isConfigured(state?.settings);
  return configured ? "AI 已配置，失败时仍会回退本地模板" : "未配置 AI，使用本地模板";
}
