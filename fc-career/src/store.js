import { MATCH, PEOPLE, PLAYER, TRAINING_ACTIVITIES } from "./content.js";
import { buildMatchSummary, resolveMoment } from "./engine.js";

export const SAVE_VERSION = 1;
export const STORAGE_KEY = "fc-career-save-v1";

const relationSeed = {
  coach: { trust: 58, respect: 64, closeness: 24 },
  mate: { trust: 67, respect: 61, closeness: 56 },
  rival: { trust: 31, respect: 55, closeness: 18 },
  agent: { trust: 63, respect: 59, closeness: 42 }
};

export function createInitialState() {
  return {
    version: SAVE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ui: { view: "overview", person: "coach", theme: "dark", largeText: false },
    settings: { injuryRate: 1, randomness: 1, economicPressure: 1 },
    world: { date: "2026-02-18", season: 2026, week: 7, phase: "academy" },
    player: structuredClone(PLAYER),
    resources: { time: 72, load: 36, mind: 78 },
    growth: { vision: 68, passing: 42, stamina: 24 },
    training: { selected: null, completed: false, note: "周二尚未安排。" },
    relations: structuredClone(relationSeed),
    offers: { selected: null, unlocked: false },
    feed: [
      { time: "08:40", title: "教练安排发生变化", text: "你被加入定位球第二组，信任趋势上升。" },
      { time: "11:25", title: "新的球探观察", text: "两家俱乐部确认将在周六到场。" },
      { time: "14:10", title: "恢复建议", text: "理疗师建议取消一次重度特训。" }
    ],
    match: {
      id: MATCH.id,
      status: "ready",
      screen: "preview",
      home: MATCH.home,
      away: MATCH.away,
      homeShort: "申花 U21",
      awayShort: "国安 U21",
      score: { home: 0, away: 0 },
      minute: 0,
      currentMoment: 0,
      rating: 6.5,
      fatigue: 36,
      momentum: 0,
      decisions: [],
      resolutions: [],
      timeline: [],
      lastResolution: null,
      summary: null
    }
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function stamp(state) {
  state.updatedAt = new Date().toISOString();
  return state;
}

export function loadState(storage = globalThis.localStorage) {
  if (!storage) return createInitialState();
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!parsed || parsed.version !== SAVE_VERSION) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(stamp(state)));
  return state;
}

export function selectView(state, view) {
  state.ui.view = view;
  return stamp(state);
}

export function toggleTheme(state) {
  state.ui.theme = state.ui.theme === "dark" ? "light" : "dark";
  return stamp(state);
}

export function selectPerson(state, personId) {
  if (PEOPLE.some((person) => person.id === personId)) state.ui.person = personId;
  return stamp(state);
}

export function chooseTraining(state, activityId) {
  if (state.match.status !== "ready") return state;
  const activity = TRAINING_ACTIVITIES.find((item) => item.id === activityId);
  if (!activity) return state;
  const next = structuredClone(state);
  next.resources.time = clamp(72 - activity.costs.time, 0, 100);
  next.resources.load = clamp(36 + activity.costs.load, 0, 100);
  next.resources.mind = clamp(78 + activity.costs.mind, 0, 100);
  next.training = { selected: activity.id, completed: true, note: activity.signal };
  next.relations.coach.trust = clamp(relationSeed.coach.trust + activity.coach, 0, 100);
  for (const [attribute, gain] of Object.entries(activity.gains)) {
    if (attribute in next.growth) next.growth[attribute] = clamp(next.growth[attribute] + gain, 0, 100);
  }
  return stamp(next);
}

export function startMatch(state) {
  if (state.match.status !== "ready") return state;
  const next = structuredClone(state);
  next.match.status = "live";
  next.match.screen = "decision";
  next.match.minute = MATCH.moments[0].minute;
  next.match.fatigue = next.resources.load;
  next.match.timeline.push({ minute: 0, type: "system", text: "比赛开始。你出任首发前腰。" });
  return stamp(next);
}

export function chooseMatchAction(state, choiceId) {
  if (state.match.status !== "live" || state.match.screen !== "decision") return state;
  const moment = MATCH.moments[state.match.currentMoment];
  const choice = moment?.choices.find((item) => item.id === choiceId);
  if (!moment || !choice) return state;
  const next = structuredClone(state);
  const resolution = resolveMoment({ state: next, moment, choice });
  next.match.decisions.push(choice.id);
  next.match.resolutions.push(resolution);
  next.match.lastResolution = resolution;
  next.match.score.home += resolution.fact.scoreDelta.home;
  next.match.score.away += resolution.fact.scoreDelta.away;
  next.match.rating = clamp(next.match.rating + resolution.fact.ratingDelta, 3, 10);
  next.match.fatigue = clamp(next.match.fatigue + resolution.fact.fatigueDelta, 0, 100);
  next.relations.coach.trust = clamp(next.relations.coach.trust + resolution.fact.coachDelta, 0, 100);
  next.relations.mate.trust = clamp(next.relations.mate.trust + resolution.fact.mateDelta, 0, 100);
  next.match.timeline.push({ minute: moment.minute, type: resolution.fact.tier, text: `${choice.title} · ${resolution.fact.label}` });
  next.match.screen = "outcome";
  return stamp(next);
}

export function continueMatch(state) {
  if (state.match.status !== "live" || state.match.screen !== "outcome") return state;
  const next = structuredClone(state);
  const moment = MATCH.moments[next.match.currentMoment];
  if (moment.bridge) {
    next.match.score.home += moment.bridge.home || 0;
    next.match.score.away += moment.bridge.away || 0;
    next.match.timeline.push({ minute: moment.bridge.minute, type: "system", text: moment.bridge.text });
  }
  const isLast = next.match.currentMoment >= MATCH.moments.length - 1;
  if (isLast) {
    next.match.status = "complete";
    next.match.screen = "summary";
    next.match.minute = 90;
    next.offers.unlocked = true;
    next.match.summary = buildMatchSummary(next);
    next.feed.unshift({ time: "赛后", title: "职业合同评审已更新", text: next.match.summary.coachVerdict });
  } else {
    next.match.currentMoment += 1;
    next.match.minute = MATCH.moments[next.match.currentMoment].minute;
    next.match.screen = "decision";
    next.match.lastResolution = null;
  }
  return stamp(next);
}

export function selectOffer(state, offerId) {
  const next = structuredClone(state);
  next.offers.selected = offerId;
  return stamp(next);
}

export function resetState(storage = globalThis.localStorage) {
  const next = createInitialState();
  if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
