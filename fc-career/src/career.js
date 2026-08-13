import {
  CLUBS,
  COACH_JOBS,
  DATA_VERSION,
  DATA_SOURCE_NOTES,
  LEAGUES,
  LEAGUE_RULES,
  NAME_POOLS,
  NATIONAL_TEAMS,
  POSITIONS,
  REAL_PLAYERS,
  SPONSOR_POOL,
  SURNAMES_BY_NATION,
  TALENTS,
  TRAINING_PLANS,
  TRAITS,
  WORLD_COMPETITIONS
} from "./data.js";
import { SQUADS } from "./squads.js";
import { MATCH } from "./content.js";
import { buildMatchSummary, deterministicRoll, resolveMoment } from "./engine.js";
import { addHonor, migrateHonors } from "./honors.js";
import { canonicalNationId, nationDisplayName, nationRefForCode } from "./nation-refs.js";
import {
  buildChapter,
  collectWeeklyFacts,
  defaultNarrativeState,
  rememberChapter
} from "./narrative.js";

export const SAVE_VERSION = 5;
export const SAVES_KEY = "fc-career-saves";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function randomSeed() {
  if (globalThis.crypto?.randomUUID) return `fc-${globalThis.crypto.randomUUID()}`;
  return `fc-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function saveKey(id) {
  return `fc-career-save-${id}`;
}

function cloneState(state) {
  const world = { ...state.world };
  const players = world.players;
  delete world.players;
  const next = structuredClone({ ...state, world });
  if (players) next.world.players = players;
  return next;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function positionBaseAttributes(positionId) {
  const shared = {
    acceleration: 62, sprintSpeed: 60, positioning: 58, finishing: 55, shotPower: 55, longShots: 52,
    volleys: 50, penalties: 55, vision: 60, shortPassing: 62, longPassing: 58, crossing: 52, curve: 52,
    freeKicks: 52, agility: 60, balance: 58, reactions: 60, ballControl: 62, dribbling: 58, composure: 60,
    decisions: 60,
    defensiveAwareness: 52, interceptions: 50, heading: 52, standingTackle: 50, slidingTackle: 46,
    strength: 56, stamina: 58, jumping: 55, aggression: 50
  };
  if (positionId === "GK") {
    return { diving: 62, handling: 62, reflex: 64, positioning: 62, kicking: 60 };
  }
  const weights = {
    ST: { finishing: 10, acceleration: 8, positioning: 9, ballControl: 5, composure: 6, strength: 5, sprintSpeed: 4, heading: 4, shortPassing: 2 },
    CAM: { vision: 10, shortPassing: 8, composure: 8, ballControl: 7, longPassing: 5, dribbling: 5, longShots: 4, finishing: 3, acceleration: 3 },
    CM: { stamina: 8, vision: 7, shortPassing: 6, longPassing: 5, defensiveAwareness: 4, interceptions: 4, dribbling: 3, acceleration: 3, strength: 3 },
    CDM: { defensiveAwareness: 8, interceptions: 7, standingTackle: 6, strength: 5, stamina: 5, shortPassing: 5, composure: 4, longPassing: 3 },
    CB: { defensiveAwareness: 9, standingTackle: 7, heading: 6, strength: 6, jumping: 5, slidingTackle: 4, shortPassing: 4, composure: 4 },
    RB: { stamina: 7, acceleration: 6, crossing: 6, standingTackle: 5, defensiveAwareness: 5, shortPassing: 4, dribbling: 4 },
    LB: { stamina: 7, acceleration: 6, crossing: 6, standingTackle: 5, defensiveAwareness: 5, shortPassing: 4, dribbling: 4 },
    LW: { dribbling: 8, acceleration: 7, crossing: 6, finishing: 6, ballControl: 6, composure: 5, agility: 5, sprintSpeed: 4 },
    RW: { dribbling: 8, acceleration: 7, crossing: 6, finishing: 6, ballControl: 6, composure: 5, agility: 5, sprintSpeed: 4 }
  };
  for (const [key, weight] of Object.entries(weights[positionId] || {})) {
    shared[key] = clamp(shared[key] + weight * 1.8, 40, 85);
  }
  return shared;
}

function rollAttributes(seed, positionId, talent, bias = {}) {
  const base = positionBaseAttributes(positionId);
  const attributes = {};
  for (const [key, value] of Object.entries(base)) {
    const roll = deterministicRoll(`${seed}|attr|${key}`);
    const modifier = Math.round((roll - 0.5) * 10 + (key in { acceleration: 1, sprintSpeed: 1, strength: 1, stamina: 1, jumping: 1, aggression: 1 } ? talent.body : key in { vision: 1, shortPassing: 1, longPassing: 1, dribbling: 1, ballControl: 1, technique: 1 } ? talent.tech : talent.mind));
    const adjusted = bias.technical && key in { vision: 1, shortPassing: 1, longPassing: 1, dribbling: 1, ballControl: 1, technique: 1, finishing: 1, volleys: 1, freeKicks: 1, curve: 1 }
      ? value + modifier + (bias.technical || 0)
      : bias.physical && key in { acceleration: 1, sprintSpeed: 1, strength: 1, stamina: 1, jumping: 1, agility: 1, balance: 1 }
        ? value + modifier + (bias.physical || 0)
        : bias.mental && key in { composure: 1, decisions: 1, positioning: 1, reactions: 1, aggression: 1 }
          ? value + modifier + (bias.mental || 0)
          : value + modifier;
    attributes[key] = clamp(Math.round(adjusted), 38, 88);
  }
  attributes.composure = clamp((attributes.composure || 60) + talent.mind, 40, 90);
  attributes.technique = attributes.technique ?? clamp(Math.round((attributes.dribbling + attributes.ballControl) / 2), 45, 88);
  return attributes;
}

function rollHidden(seed, talent, family, hidden = {}) {
  const range = talent.potential;
  const potential = hidden.potential
    ? clamp(Number(hidden.potential), 70, 99)
    : Math.round(range[0] + deterministicRoll(`${seed}|potential`) * (range[1] - range[0]));
  const familyModifier = family === "足球世家" ? 2 : family === "工人家庭" ? 1 : 0;
  return {
    potential,
    injuryProneness: hidden.injuryProneness
      ? clamp(Number(hidden.injuryProneness), 1, 20)
      : clamp(Math.round(3 + deterministicRoll(`${seed}|injury`) * 14 + (talent.id === "gifted" ? 2 : 0)), 1, 20),
    bigMatchType: "稳定",
    professionalism: clamp(Math.round(8 + deterministicRoll(`${seed}|pro`) * 10 + familyModifier), 1, 20),
    adaptability: clamp(Math.round(5 + deterministicRoll(`${seed}|adapt`) * 13), 1, 20),
    pressure: clamp(Math.round(6 + deterministicRoll(`${seed}|pressure`) * 12), 1, 20),
    growthSpurt: talent.id === "late" ? "晚成" : talent.id === "gifted" ? "早熟" : "正常",
    businessMind: clamp(Math.round(4 + deterministicRoll(`${seed}|business`) * 14), 1, 20),
    leadership: clamp(Math.round(5 + deterministicRoll(`${seed}|leader`) * 13), 1, 20),
    languageTalent: clamp(Math.round(5 + deterministicRoll(`${seed}|language`) * 13), 1, 20)
  };
}

function initialRelations() {
  return {
    coach: { trust: 58, respect: 64, closeness: 24, memory: [] },
    mate: { trust: 67, respect: 61, closeness: 56, memory: [] },
    rival: { trust: 31, respect: 55, closeness: 18, memory: [] },
    agent: { trust: 63, respect: 59, closeness: 42, memory: [] },
    family: { trust: 72, respect: 70, closeness: 68, memory: [] },
    media: { trust: 50, respect: 50, closeness: 40, memory: [] },
    fans: { trust: 55, respect: 52, closeness: 48, memory: [] }
  };
}

function initialAgent(seed) {
  const profiles = [
    { id: "agent-chen-lan", name: "陈岚", type: "职业发展型", resources: 72, loyalty: 68, interests: "优先稳定出场与长期声誉" },
    { id: "agent-luo-qing", name: "罗青", type: "商业平衡型", resources: 76, loyalty: 61, interests: "兼顾合同金额、肖像权与上场时间" },
    { id: "agent-he-yuan", name: "何远", type: "转会进取型", resources: 81, loyalty: 54, interests: "优先高平台与跨联赛机会" }
  ];
  const profile = profiles[Math.floor(deterministicRoll(`${seed}|agent-profile`) * profiles.length)] || profiles[0];
  return { ...profile, history: [{ date: "2026-02-18", action: "签约", note: "经纪人确认以长期发展为首要目标。" }] };
}

function initialPlayer(options, seed, club) {
  const position = POSITIONS.find((item) => item.id === options.position) || POSITIONS.find((item) => item.id === "CAM");
  const talent = TALENTS.find((item) => item.id === options.talent) || TALENTS[1];
  const attributes = rollAttributes(seed, position.id, talent, options.attributeBias);
  const hidden = rollHidden(seed, talent, options.family, options.hidden);
  const birthYear = options.birthYear || 2010;
  const birthMonth = options.birthMonth || 6;
  const birthDay = options.birthDay || 15;
  return {
    id: `player-${seed.replace(/[^a-z0-9-]/gi, "").slice(0, 16)}`,
    name: options.name || "林骁",
    birthDate: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
    age: 2026 - birthYear,
    nationality: options.nationality || "中国",
    nationalityId: canonicalNationId(options.nationality || "中国"),
    secondNationality: options.secondNationality || "无",
    secondNationalityId: options.secondNationality && options.secondNationality !== "无" ? canonicalNationId(options.secondNationality) : null,
    nationMigrationSource: null,
    clubId: club.id,
    club: `${club.name} U21`,
    academyClubId: club.id,
    squad: "U21",
    position: position.id,
    role: position.roles[0],
    foot: options.foot || "右脚",
    weakFoot: 3,
    height: options.height || 176,
    weight: options.weight || 66,
    number: options.number || 17,
    secondaryPositions: options.secondaryPositions || [],
    // OVR is a public-facing media/market evaluation. Match resolution only reads attributes.
    overall: 67,
    attributes,
    hidden,
    traits: options.traits?.length ? options.traits.map((id) => TRAITS.find((t) => t.id === id)).filter(Boolean).map((t) => t.id) : [],
    traitMemory: [],
    customized: Boolean(options.customized),
    source: options.customized ? "自定义生涯（已标记）" : "模板开档",
    family: options.family || "工人家庭",
    ritual: options.ritual || "赛前系紧右脚鞋带",
    partner: null,
    status: "active",
    retired: false
  };
}

function createSeason(club, season, seed) {
  const league = LEAGUES.find((item) => item.id === club.league);
  const rules = LEAGUE_RULES[club.league] || {};
  const rounds = rules.rounds || league?.rounds || 30;
  const opponents = CLUBS.filter((item) => item.league === club.league && item.id !== club.id);
  const clubIndex = CLUBS.findIndex((item) => item.id === club.id);
  const fixtures = [];
  const startDate = `${season}-${rules.start || "03-01"}`;
  for (let index = 0; index < rounds; index += 1) {
    const opponent = opponents[(clubIndex + index) % Math.max(opponents.length, 1)];
    const home = (index + clubIndex) % 2 === 0;
    const round = index + 1;
    const focusReasons = [];
    if (round === 1) focusReasons.push("opening");
    if (round === Math.ceil(rounds / 2)) focusReasons.push("midseason");
    if (opponent?.city && opponent.city === club.city) focusReasons.push("derby");
    if (opponent?.reputation >= 80) focusReasons.push("high-profile");
    fixtures.push({
      id: `${season}-r${round}-${club.id}-${opponent?.id || "bye"}`,
      round,
      home: home ? club : opponent,
      away: home ? opponent : club,
      competition: league?.name || "联赛",
      competitionType: "league",
      focus: focusReasons.length > 0,
      focusReasons,
      played: false,
      date: addDays(startDate, index * 7)
    });
  }
  const nation = league?.nation;
  const cupPool = CLUBS.filter((item) => item.id !== club.id && (LEAGUES.find((entry) => entry.id === item.league)?.nation === nation || (nation !== "中国" && ["epl", "laliga", "bundesliga", "seriea", "ligue1"].includes(item.league))));
  const cupOpponent = cupPool[Math.floor(deterministicRoll(`${seed}|cup-opponent|${season}|${club.id}`) * cupPool.length)] || opponents[0];
  if (cupOpponent) {
    const insertion = Math.min(7, fixtures.length);
    fixtures.splice(insertion, 0, {
      id: `${season}-cup-1-${club.id}-${cupOpponent.id}`,
      round: 1,
      home: club,
      away: cupOpponent,
      competition: nation === "中国" ? "中国足协杯" : club.reputation >= 86 ? "欧洲冠军联赛" : "欧洲联赛",
      competitionType: "cup",
      focus: true,
      focusReasons: ["cup"],
      played: false,
      date: addDays(startDate, Math.max(4, insertion * 7 - 3))
    });
  }
  return {
    season,
    leagueId: club.league,
    fixtures,
    index: 0,
    results: [],
    standings: [],
    manualFocusIds: [],
    manualFocusLimit: 2,
    seed: `${seed}|season-${season}`
  };
}

export function classifyFocusFixture(state, fixture) {
  const reasons = new Set(fixture.focusReasons || []);
  if (fixture.competitionType === "cup") reasons.add("cup");
  if (state.season?.manualFocusIds?.includes(fixture.id)) reasons.add("manual");
  const totalRounds = state.season?.fixtures?.length || 0;
  if (fixture.round >= Math.max(1, totalRounds - 3) && state.season?.standings?.length) {
    const rank = state.season.standings.findIndex((entry) => entry.clubId === state.player.clubId) + 1;
    if (rank > 0 && rank <= 3) reasons.add("title-race");
    if (rank > 0 && rank >= Math.max(1, state.season.standings.length - 2)) reasons.add("relegation");
  }
  if ((state.career?.totalStats?.appearances || 0) > 0 && ((state.career.totalStats.appearances + 1) % 50 === 0)) reasons.add("milestone");
  return [...reasons];
}

export function markFocusFixture(state, fixtureId) {
  const next = cloneState(state);
  const fixture = next.season?.fixtures?.find((item) => item.id === fixtureId && !item.played);
  if (!fixture) return next;
  next.season.manualFocusIds = next.season.manualFocusIds || [];
  const limit = next.season.manualFocusLimit || 2;
  if (next.season.manualFocusIds.includes(fixtureId) || next.season.manualFocusIds.length >= limit) return next;
  next.season.manualFocusIds.push(fixtureId);
  fixture.focusReasons = classifyFocusFixture(next, fixture);
  fixture.focus = true;
  next.feed.unshift({ time: next.world.date, title: "主动标记焦点比赛", text: `${fixture.home?.name || "主队"}对${fixture.away?.name || "客队"}已加入本赛季焦点名单（${next.season.manualFocusIds.length}/${limit}）。` });
  return next;
}

function migrateSeasonFocus(state) {
  if (!state.season) return;
  state.season.manualFocusIds = state.season.manualFocusIds || [];
  state.season.manualFocusLimit = state.season.manualFocusLimit || 2;
  for (const fixture of state.season.fixtures || []) {
    fixture.competitionType = fixture.competitionType || "league";
    fixture.focusReasons = fixture.focusReasons || (fixture.focus ? ["legacy-focus"] : []);
  }
}

function createTable(clubIds) {
  return clubIds.map((clubId) => {
    const club = CLUBS.find((item) => item.id === clubId);
    return { clubId, name: club?.name || clubId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  });
}

function databaseSnapshot() {
  return {
    version: DATA_VERSION,
    frozen: true,
    createdAt: "2026-08-10",
    leagues: LEAGUES.map((league) => ({ id: league.id, name: league.name, nation: league.nation, level: league.level })),
    clubs: CLUBS.map((club) => ({ id: club.id, name: club.name, league: club.league, city: club.city, reputation: club.reputation })),
    playerCount: SQUADS.length
  };
}

function createLeagueSimulations(relatedLeagueId) {
  return LEAGUES.map((league) => {
    const clubIds = CLUBS.filter((club) => club.league === league.id).map((club) => club.id);
    return {
      leagueId: league.id,
      name: league.name,
      precision: league.id === relatedLeagueId ? "detailed" : "simplified",
      standings: createTable(clubIds),
      results: [],
      rounds: [],
      awards: [],
      records: [],
      lastAdvancedKey: null
    };
  });
}

function competitionParticipants(definition) {
  const pool = CLUBS
    .filter((club) => definition.leagueIds.includes(club.league))
    .sort((a, b) => b.reputation - a.reputation || a.id.localeCompare(b.id));
  const offsetById = { ucl: 0, uel: 8, uecl: 16 };
  const offset = Math.min(offsetById[definition.id] || 0, Math.max(0, pool.length - definition.participantCount));
  return pool.slice(offset, offset + definition.participantCount).map((club) => club.id);
}

function createCompetitionStates(relatedClubId) {
  return WORLD_COMPETITIONS.map((definition) => {
    const participants = competitionParticipants(definition);
    return {
      id: definition.id,
      name: definition.name,
      kind: definition.kind,
      rounds: definition.rounds,
      currentRound: 0,
      participants,
      precision: participants.includes(relatedClubId) ? "detailed" : "simplified",
      standings: createTable(participants),
      results: [],
      summaries: [],
      awards: [],
      records: [],
      lastAdvancedKey: null
    };
  });
}

function ensureWorldAuditState(state) {
  state.world.database = state.world.database || databaseSnapshot();
  const relatedClubId = state.world.phase === "coach" && state.coach?.clubId ? state.coach.clubId : state.player.clubId;
  const relatedLeagueId = CLUBS.find((club) => club.id === relatedClubId)?.league || state.season?.leagueId || "csl";
  state.world.leagueSimulations = state.world.leagueSimulations || createLeagueSimulations(relatedLeagueId);
  state.world.competitions = state.world.competitions || createCompetitionStates(relatedClubId);
}

function setRelatedSimulationPrecision(state, relatedClubId) {
  ensureWorldAuditState(state);
  const relatedLeagueId = CLUBS.find((club) => club.id === relatedClubId)?.league;
  for (const simulation of state.world.leagueSimulations) simulation.precision = simulation.leagueId === relatedLeagueId ? "detailed" : "simplified";
  for (const competition of state.world.competitions) competition.precision = competition.participants.includes(relatedClubId) ? "detailed" : "simplified";
}

function applyTableResult(table, homeId, awayId, homeGoals, awayGoals) {
  const home = table.find((entry) => entry.clubId === homeId);
  const away = table.find((entry) => entry.clubId === awayId);
  if (!home || !away) return;
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;
  if (homeGoals > awayGoals) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
  } else if (awayGoals > homeGoals) {
    away.wins += 1;
    home.losses += 1;
    away.points += 3;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  }
  table.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
}

function simulateTableRound(state, simulation, key) {
  const ids = simulation.standings.map((entry) => entry.clubId);
  if (ids.length < 2) return;
  const shift = (state.world.week - 1) % ids.length;
  const rotated = ids.slice(shift).concat(ids.slice(0, shift));
  const roundResults = [];
  for (let index = 0; index + 1 < rotated.length; index += 2) {
    const homeId = rotated[index];
    const awayId = rotated[index + 1];
    const homeClub = CLUBS.find((club) => club.id === homeId);
    const awayClub = CLUBS.find((club) => club.id === awayId);
    const roll = deterministicRoll(`${state.seed}|world-table|${simulation.leagueId || simulation.id}|${key}|${homeId}|${awayId}`);
    const edge = ((homeClub?.reputation || 50) - (awayClub?.reputation || 50)) / 24;
    const homeGoals = Math.max(0, Math.round(1.2 + edge + (roll - 0.45) * 2.2));
    const awayGoals = Math.max(0, Math.round(1.0 - edge + (0.55 - roll) * 1.8));
    applyTableResult(simulation.standings, homeId, awayId, homeGoals, awayGoals);
    if (simulation.precision === "detailed") roundResults.push({ homeId, awayId, homeGoals, awayGoals, date: state.world.date, week: state.world.week });
    if (homeGoals + awayGoals >= 6) simulation.records.push({ week: state.world.week, type: "high-score", homeId, awayId, score: [homeGoals, awayGoals] });
  }
  if (simulation.precision === "detailed") simulation.results.push(...roundResults);
  const roundRecord = { week: state.world.week, leader: simulation.standings[0]?.clubId || null, matches: rotated.length >> 1 };
  if (Array.isArray(simulation.rounds)) simulation.rounds.push(roundRecord);
  else simulation.summaries.push(roundRecord);
  simulation.lastAdvancedKey = key;
}

function advanceWorldSimulations(state) {
  ensureWorldAuditState(state);
  const key = `${state.world.season}-${state.world.week}`;
  for (const simulation of state.world.leagueSimulations) {
    if (simulation.lastAdvancedKey !== key) simulateTableRound(state, simulation, key);
  }
  if (state.world.week % 2 === 1) {
    for (const competition of state.world.competitions) {
      if (competition.lastAdvancedKey === key || competition.currentRound >= competition.rounds) continue;
      simulateTableRound(state, competition, key);
      competition.currentRound += 1;
      competition.summaries.push({ round: competition.currentRound, leader: competition.standings[0]?.clubId || null });
      if (competition.currentRound === competition.rounds) {
        const winner = competition.standings[0];
        competition.awards.push({ title: `${competition.name}冠军`, clubId: winner?.clubId || null, season: state.world.season });
      }
    }
  }
  return state;
}

function ensureStandings(state) {
  if (!state.season || state.season.standings?.length) return;
  state.season.standings = CLUBS
    .filter((club) => club.league === state.season.leagueId)
    .map((club) => ({
      clubId: club.id,
      name: club.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));
}

function updateStandings(state, result) {
  ensureStandings(state);
  const homeId = result.home?.id;
  const awayId = result.away?.id;
  if (!homeId || !awayId || !state.season?.standings?.length) return;
  const home = state.season.standings.find((item) => item.clubId === homeId);
  const away = state.season.standings.find((item) => item.clubId === awayId);
  if (!home || !away) return;
  home.played += 1;
  away.played += 1;
  home.goalsFor += result.homeGoals || 0;
  home.goalsAgainst += result.awayGoals || 0;
  away.goalsFor += result.awayGoals || 0;
  away.goalsAgainst += result.homeGoals || 0;
  if (result.homeGoals > result.awayGoals) {
    home.wins += 1;
    home.points += 3;
    away.losses += 1;
  } else if (result.homeGoals < result.awayGoals) {
    away.wins += 1;
    away.points += 3;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  }
  state.season.standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
}

export function createInitialState(options = {}) {
  const seed = options.seed || randomSeed();
  const club = CLUBS.find((item) => item.id === options.clubId) || CLUBS.find((item) => item.id === "shanghai-shenhua");
  const player = initialPlayer(options, seed, club);
  player.overall = clamp(Math.round(calculateOverall({ player, health: { form: 6.5 } })), 40, 99);
  const world = {
    date: "2026-02-18",
    season: 2026,
    week: 1,
    phase: "academy",
    calendar: "中国青训赛季",
    transferWindows: LEAGUE_RULES[club.league]?.transferWindows || [],
    news: [],
    newStars: [],
    players: structuredClone(SQUADS),
    database: databaseSnapshot(),
    leagueSimulations: createLeagueSimulations(club.league),
    competitions: createCompetitionStates(club.id),
    referees: [
      { id: "ref-zh-01", name: "马宁", strictness: 14, pressureResistance: 12, impression: 0 },
      { id: "ref-zh-02", name: "傅明", strictness: 11, pressureResistance: 13, impression: 0 },
      { id: "ref-eu-01", name: "Marciniak", strictness: 13, pressureResistance: 15, impression: 0 },
      { id: "ref-eu-02", name: "Taylor", strictness: 12, pressureResistance: 14, impression: 0 }
    ],
    clubStates: CLUBS.map((item) => ({ id: item.id, reputation: item.reputation, managerStability: 60 }))
  };
  return {
    version: SAVE_VERSION,
    id: `save-${seed.replace(/[^a-z0-9-]/gi, "").slice(0, 12) || "new"}`,
    seed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ui: { view: "overview", theme: "dark", largeText: false, activeSave: null },
    settings: {
      injuryRate: options.injuryRate ?? 1,
      randomness: options.randomness ?? 1,
      economicPressure: options.economicPressure ?? 1,
      retireAge: options.retireAge ?? 34,
      lengthMode: options.lengthMode ?? "standard",
      mildMode: Boolean(options.mildMode),
      ai: { endpoint: "", model: "", key: "" }
    },
    world,
    player,
    resources: { time: 72, load: 34, mind: 78 },
    growth: { technique: 0, composure: 0, stamina: 0, vision: 0, passing: 0, physical: 0 },
    training: { planId: "balanced", positionTraining: null, weakFoot: 0 },
    psychology: {
      energy: 80,
      state: "平静专注",
      trend: "稳定",
      advice: "保持训练与生活平衡，连续两场稳定发挥后状态会继续向上。",
      scars: []
    },
    club: {
      promises: [],
      politics: { influence: 0, unlocked: false, support: null, events: [] },
      factions: []
    },
    mentor: { mentor: null, disciples: [], learnedTraits: [] },
    agent: initialAgent(seed),
    comeback: { eligible: false, traditionalUsed: false, legendaryUsed: false, attempts: [] },
    unemployment: { status: "none", offers: [] },
    aiCache: [],
    extensions: [],
    diagnostics: { errors: [] },
    fanCulture: { groups: [], tifo: [], rituals: [player.ritual] },
    peers: [],
    awards: [],
    honors: [],
    honorsVersion: 1,
    records: [],
    hiddenTitles: [],
    audio: { enabled: false, background: false, ui: false, environment: false, unlocked: false },
    contract: {
      clubId: club.id,
      type: "青训合同",
      weeklyWage: 1500,
      endDate: "2027-12-31",
      role: "U21 核心",
      releaseClause: 0,
      imageRights: 0.3,
      signingBonus: 0
    },
    finances: {
      cash: 5000,
      weeklyWage: 1500,
      careerEarnings: 0,
      sponsors: [],
      investments: [],
      consumption: []
    },
    health: { fatigue: 34, injuries: [], injuryProneness: player.hidden.injuryProneness, bodyAge: player.age, form: 6.5, missWeeks: 0 },
    relations: initialRelations(),
    media: { fans: 1200, reputation: 20, image: { professional: 12, controversy: 4, warmth: 11, dominance: 9 }, social: [] },
    nationalTeam: {
      status: "eligible",
      caps: 0,
      goals: 0,
      youthCaps: 0,
      youthGoals: 0,
      callups: [],
      history: [],
      choicePending: false,
      committedNation: options.nationality || "中国",
      committedNationId: canonicalNationId(options.nationality || "中国")
    },
    career: {
      seasonStats: { appearances: 0, starts: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0, motm: 0, season: 2026 },
      totalStats: { appearances: 0, goals: 0, assists: 0, minutes: 0, titles: [] },
      milestones: [],
      themeScores: {},
      report: null
    },
    offers: [],
    transferOffers: [],
    coach: null,
    match: null,
    narrative: defaultNarrativeState(),
    feed: [
      { time: world.date, title: "青训开营", text: "你进入基地，第一份训练计划已经放在储物柜里。" },
      { time: world.date, title: "球探到场", text: "教练组确认，两家俱乐部将在青训结束时到场。" }
    ]
  };
}

export function migrate(raw) {
  if (!raw || typeof raw !== "object") return createInitialState();
    if (raw.version === SAVE_VERSION || raw.version === 4) {
      const next = structuredClone(raw);
      next.player.traitMemory = next.player.traitMemory || [];
      next.agent = next.agent || initialAgent(next.seed || "migrated-agent");
      next.diagnostics = next.diagnostics || { errors: [] };
      next.narrative = next.narrative || defaultNarrativeState();
      next.settings = next.settings || {};
      next.settings.lengthMode = next.settings.lengthMode || "standard";
      next.settings.mildMode = Boolean(next.settings.mildMode);
      next.version = SAVE_VERSION;
      migrateNationRefs(next, raw);
      migrateSeasonFocus(next);
      ensureWorldAuditState(next);
      return migrateHonors(next);
    }
  if (raw.version === 2) {
    const next = structuredClone(raw);
    next.version = SAVE_VERSION;
    next.psychology = next.psychology || { energy: 80, state: "平静专注", trend: "稳定", advice: "保持训练与生活平衡。", scars: [] };
    next.club = next.club || { promises: [], politics: { influence: 0, unlocked: false, support: null, events: [] }, factions: [] };
    next.mentor = next.mentor || { mentor: null, disciples: [], learnedTraits: [] };
    next.agent = next.agent || initialAgent(next.seed || "migrated-agent");
    next.comeback = next.comeback || { eligible: false, traditionalUsed: false, legendaryUsed: false, attempts: [] };
    next.unemployment = next.unemployment || { status: "none", offers: [] };
    next.aiCache = next.aiCache || [];
    next.extensions = next.extensions || [];
    next.diagnostics = next.diagnostics || { errors: [] };
    next.narrative = next.narrative || defaultNarrativeState();
    next.settings = next.settings || {};
    next.settings.lengthMode = next.settings.lengthMode || "standard";
    next.fanCulture = next.fanCulture || { groups: [], tifo: [], rituals: [] };
    next.peers = next.peers || [];
    next.awards = next.awards || [];
    next.honors = next.honors || [];
    next.honorsVersion = next.honorsVersion || 1;
    next.records = next.records || [];
    next.hiddenTitles = next.hiddenTitles || [];
    next.audio = next.audio || { enabled: false, background: false, ui: false, environment: false, unlocked: false };
    next.player.secondaryPositions = next.player.secondaryPositions || [];
    next.player.traitMemory = next.player.traitMemory || [];
    next.nationalTeam = next.nationalTeam || {};
    next.nationalTeam.choicePending = next.nationalTeam.choicePending || false;
    next.nationalTeam.committedNation = next.nationalTeam.committedNation || next.player.nationality || "中国";
    next.world.referees = next.world.referees || [];
    migrateNationRefs(next, raw);
    migrateSeasonFocus(next);
    ensureWorldAuditState(next);
    return migrateHonors(next);
  }
  if (raw.version === 3) {
    const next = structuredClone(raw);
    next.version = SAVE_VERSION;
    next.player = next.player || {};
    next.player.traitMemory = next.player.traitMemory || [];
    next.narrative = next.narrative || defaultNarrativeState();
    next.settings = next.settings || {};
    next.settings.lengthMode = next.settings.lengthMode || "standard";
    next.nationalTeam = next.nationalTeam || {};
    next.nationalTeam.committedNation = next.nationalTeam.committedNation || next.player.nationality || "中国";
    migrateNationRefs(next, raw);
    migrateSeasonFocus(next);
    ensureWorldAuditState(next);
    return migrateHonors(next);
  }
  if (raw.version === 1 || raw.version === undefined) {
    const next = createInitialState({ seed: raw.seed || "migrated-v1" });
    next.ui = { ...next.ui, theme: raw.ui?.theme || next.ui.theme, largeText: Boolean(raw.ui?.largeText) };
    next.settings = { ...next.settings, ...raw.settings };
    if (raw.player) {
      next.player.name = raw.player.name || next.player.name;
      next.player.age = raw.player.age ?? next.player.age;
      next.player.position = raw.player.position || next.player.position;
      next.player.clubId = raw.player.clubId || next.player.clubId;
      next.player.club = raw.player.club || next.player.club;
      next.player.secondaryPositions = raw.player.secondaryPositions || next.player.secondaryPositions;
      next.player.attributes = { ...next.player.attributes, ...raw.player.attributes };
      next.player.overall = raw.player.overall ?? next.player.overall;
    }
    if (raw.player?.nationality) next.player.nationality = raw.player.nationality;
    if (raw.player?.secondNationality) next.player.secondNationality = raw.player.secondNationality;
    migrateNationRefs(next, raw);
    if (raw.coach) next.coach = structuredClone(raw.coach);
    if (raw.season) next.season = structuredClone(raw.season);
    if (raw.world) next.world = { ...next.world, ...structuredClone(raw.world) };
    if (raw.career) next.career = { ...next.career, ...structuredClone(raw.career) };
    if (raw.training) next.training.planId = raw.training.selected || next.training.planId;
    if (raw.resources) next.resources = { ...next.resources, ...raw.resources };
    if (raw.relations) next.relations = { ...next.relations, ...raw.relations };
    if (raw.match) next.match = structuredClone(raw.match);
    next.honors = next.honors || [];
    next.honorsVersion = next.honorsVersion || 1;
    if (raw.offers?.unlocked && raw.offers?.selected) {
      const selected = raw.offers.selected;
      const offerMap = {
        shenhua: "shanghai-shenhua",
        zhejiang: "zhejiang",
        chengdu: "chengdu-rongcheng"
      };
      next.offers = [{ id: selected, clubId: offerMap[selected] || "shanghai-shenhua", name: selected }];
    }
    next.feed = raw.feed || next.feed;
    return migrateHonors(next);
  }
  throw new Error(`Unsupported save version: ${raw.version}`);
}

function migrateNationRefs(next, raw) {
  const primary = next.player?.nationality || raw?.player?.nationality || "中国";
  const secondary = next.player?.secondNationality || raw?.player?.secondNationality || "无";
  next.player.nationality = primary;
  next.player.nationalityId = canonicalNationId(primary);
  next.player.secondNationality = secondary;
  next.player.secondNationalityId = secondary && secondary !== "无" ? canonicalNationId(secondary) : null;
  if (!next.player.nationMigrationSource && raw?.player) {
    next.player.nationMigrationSource = {
      version: raw.version ?? "unknown",
      nationality: raw.player.nationality ?? null,
      secondNationality: raw.player.secondNationality ?? null
    };
  }
  next.nationalTeam = next.nationalTeam || {};
  next.nationalTeam.committedNation = next.nationalTeam.committedNation || primary;
  next.nationalTeam.committedNationId = canonicalNationId(next.nationalTeam.committedNation || primary);
  return next;
}

function stamp(state) {
  state.updatedAt = new Date().toISOString();
  return state;
}

export function loadState(storage = globalThis.localStorage, id) {
  if (!storage) return createInitialState();
  try {
    const raw = storage.getItem(id ? saveKey(id) : saveKey("active"));
    if (!raw) return createInitialState();
    return migrate(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  if (!storage) return state;
  const key = saveKey(state.id);
  storage.setItem(key, JSON.stringify(stamp(structuredClone(state))));
  try {
    const list = JSON.parse(storage.getItem(SAVES_KEY) || "[]");
    if (!list.includes(state.id)) {
      list.unshift(state.id);
      storage.setItem(SAVES_KEY, JSON.stringify(list.slice(0, 20)));
    }
  } catch {
    storage.setItem(SAVES_KEY, JSON.stringify([state.id]));
  }
  storage.setItem("fc-career-active", state.id);
  return state;
}

export function listSaves(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const ids = JSON.parse(storage.getItem(SAVES_KEY) || "[]");
    return ids.map((id) => {
      try {
        const raw = JSON.parse(storage.getItem(saveKey(id)));
        return {
          id,
          name: raw?.player?.name || "未命名生涯",
          phase: raw?.world?.phase || "unknown",
          date: raw?.world?.date || "",
          updatedAt: raw?.updatedAt || ""
        };
      } catch {
        return { id, name: "损坏存档", phase: "broken", date: "", updatedAt: "" };
      }
    });
  } catch {
    return [];
  }
}

export function deleteSave(storage = globalThis.localStorage, id) {
  if (!storage) return;
  storage.removeItem(saveKey(id));
  try {
    const list = JSON.parse(storage.getItem(SAVES_KEY) || "[]").filter((item) => item !== id);
    storage.setItem(SAVES_KEY, JSON.stringify(list));
  } catch {
    storage.removeItem(SAVES_KEY);
  }
}

function applyPlan(state, planId) {
  const plan = TRAINING_PLANS.find((item) => item.id === planId) || TRAINING_PLANS[0];
  const next = cloneState(state);
  next.training.planId = plan.id;
  next.resources.time = clamp(next.resources.time - plan.time / 7, 0, 100);
  next.resources.load = clamp(next.resources.load + plan.load / 7, 0, 100);
  next.resources.mind = clamp(next.resources.mind + plan.mind / 7, 0, 100);
  const rate = 0.9 + next.player.hidden.professionalism / 12;
  for (const focus of plan.focus) {
    if (focus in next.growth) {
      next.growth[focus] = clamp(next.growth[focus] + rate, 0, 100);
    } else if (focus === "media") {
      next.media.reputation = clamp(next.media.reputation + 0.1, 10, 99);
      next.media.fans = Math.round(next.media.fans * 1.004);
    } else if (focus === "finances") {
      next.finances.cash = Math.round(next.finances.cash + next.finances.weeklyWage * 0.15);
    }
  }
  if (next.training.positionTraining) {
    const focus = next.training.positionTraining;
    if (focus in next.growth) next.growth[focus] = clamp(next.growth[focus] + rate * 0.6, 0, 100);
  }
  if (next.training.weakFoot > 0) {
    next.player.weakFoot = clamp(next.player.weakFoot + (plan.id === "intense" ? 0.06 : 0.02), 0, 5);
  }
  const roll = deterministicRoll(`${next.seed}|training|${next.world.season}|${next.world.week}`);
  if (roll > 0.97 * next.settings.injuryRate && next.world.phase !== "offseason") {
    const injury = rollInjury(next, "训练");
    next.health.injuries.push(injury);
    next.feed.unshift({ time: next.world.date, title: "训练伤情", text: injury.narrative });
  }
  return next;
}

function rollInjury(state, source) {
  const proneness = state.player.hidden.injuryProneness;
  const severityRoll = deterministicRoll(`${state.seed}|injury-event|${state.world.season}|${state.world.week}|${source}`);
  const severity = severityRoll > 0.88 ? "重度" : severityRoll > 0.65 ? "中度" : "轻度";
  const weeks = severity === "重度" ? 14 : severity === "中度" ? 6 : 2;
  return {
    id: `injury-${state.world.season}-${state.world.week}-${source}`,
    name: severity === "重度" ? "十字韧带损伤" : severity === "中度" ? "大腿肌肉撕裂" : "脚踝扭伤",
    severity,
    weeks,
    remaining: weeks,
    active: true,
    source,
    permanent: severity === "重度" ? { acceleration: -2, agility: -2, strength: -1 } : severity === "中度" ? { acceleration: -1 } : null,
    narrative: `${source}中你感到一阵刺痛。队医判断为${severity}${severity === "重度" ? "，康复周期至少三个月" : severity === "中度" ? "，预计缺阵数周" : "，预计一到两周"}。`
  };
}

function advanceInjuries(state) {
  const next = cloneState(state);
  next.health.injuries = next.health.injuries.map((injury) => ({ ...injury, remaining: Math.max(0, injury.remaining - 1) }));
  for (const injury of next.health.injuries) {
    if (injury.active && injury.remaining <= 0) {
      injury.active = false;
      if (injury.permanent) {
        for (const [key, delta] of Object.entries(injury.permanent)) {
          next.player.attributes[key] = clamp((next.player.attributes[key] || 50) + delta, 20, 99);
        }
      }
      next.feed.unshift({ time: next.world.date, title: "复出", text: `${injury.name}康复结束，你回到合练。` });
    }
  }
  next.health.injuries = next.health.injuries.filter((injury) => injury.active || injury.severity === "重度");
  next.health.missWeeks = next.health.injuries.reduce((sum, injury) => sum + (injury.active ? 1 : 0), 0);
  return next;
}

function applyGrowthToAttributes(state) {
  const next = cloneState(state);
  const growthMap = {
    technique: [["technique", 2], ["ballControl", 1], ["shortPassing", 1], ["dribbling", 1]],
    composure: [["composure", 2], ["decisions", 1]],
    stamina: [["stamina", 2], ["acceleration", 1], ["strength", 1]],
    vision: [["vision", 2], ["positioning", 1], ["longPassing", 1]],
    passing: [["shortPassing", 1], ["longPassing", 1], ["vision", 1]],
    physical: [["acceleration", 1], ["stamina", 1], ["strength", 1], ["agility", 1]]
  };
  for (const [focus, gains] of Object.entries(growthMap)) {
    const progress = next.growth[focus] || 0;
    if (progress >= 100) {
      for (const [attribute, delta] of gains) {
        next.player.attributes[attribute] = clamp((next.player.attributes[attribute] || 55) + delta, 20, 99);
      }
      next.growth[focus] = 0;
    } else if (progress >= 35) {
      const [attribute, delta] = gains[0];
      next.player.attributes[attribute] = clamp((next.player.attributes[attribute] || 55) + delta, 20, 99);
      next.growth[focus] -= 35;
    }
  }
  return next;
}

function nationalTeamFor(state) {
  const committedId = state.nationalTeam?.committedNationId
    || canonicalNationId(state.nationalTeam?.committedNation || state.player.nationality);
  const byCanonical = { cn: "chn", "gb-eng": "eng", es: "esp", ar: "arg", br: "bra" };
  return NATIONAL_TEAMS.find((item) => item.id === byCanonical[committedId])
    || NATIONAL_TEAMS.find((item) => item.name === state.player.nationality)
    || NATIONAL_TEAMS[0];
}

function processNationalTeam(state) {
  const next = cloneState(state);
  if (next.world.phase !== "season" || next.health.injuries.some((injury) => injury.active)) return next;
  const team = nationalTeamFor(next);
  const selectionScore = calculateSelectionScore(next);
  const seniorReady = next.player.age >= 18 && selectionScore >= (team.threshold || 60);
  const youthReady = next.player.age <= 23 && selectionScore >= (team.threshold || 60) - 10;
  if (!seniorReady && !youthReady) return next;
  const stage = seniorReady ? "成年队" : "U23/青年队";
  const every = seniorReady ? 12 : 8;
  if ((next.world.week - 1) % every !== 0) return next;
  const key = `nt-${next.world.season}-${next.world.week}`;
  if (next.nationalTeam.history.some((entry) => entry.id === key)) return next;
  const roll = deterministicRoll(`${next.seed}|national|${key}`);
  const rating = Number((6 + roll * 2).toFixed(1));
  const canScore = next.player.position !== "GK" && stage === "成年队" && roll > 0.78;
  const goals = canScore ? 1 : 0;
  const entry = {
    id: key,
    date: next.world.date,
    stage,
    caps: 1,
    goals,
    rating,
    opponent: stage === "成年队" ? "亚洲预选赛对手" : "青年友谊赛对手"
  };
  next.nationalTeam.callups.push(entry);
  next.nationalTeam.history.push(entry);
  if (stage === "成年队") {
    next.nationalTeam.caps += 1;
    next.nationalTeam.goals += goals;
    next.nationalTeam.status = "committed";
    next.media.reputation = clamp(next.media.reputation + 1, 10, 99);
    next.media.fans = Math.round(next.media.fans * 1.03);
  } else {
    next.nationalTeam.youthCaps += 1;
    next.nationalTeam.youthGoals += goals;
    next.nationalTeam.status = "youth";
  }
  next.relations.media.memory.push(`${key}:${stage}出场，评分 ${rating.toFixed(1)}`);
  next.relations.family.memory.push(`${key}:家人观看了${stage}比赛`);
  next.feed.unshift({
    time: next.world.date,
    title: `${stage}征召`,
    text: `${team.name}${stage}名单公布，你获得一次出场机会并完成 ${goals ? `${goals} 粒进球` : "稳定发挥"}，赛后评分 ${rating.toFixed(1)}。`
  });
  return next;
}

function processWealthEvents(state) {
  const next = cloneState(state);
  const week = next.world.week;
  if (week % 6 === 0 && next.world.phase === "season" && next.contract?.weeklyWage) {
    const paid = Math.round(next.contract.weeklyWage * 0.85);
    next.finances.cash += paid;
    next.finances.careerEarnings += paid;
    next.feed.unshift({ time: next.world.date, title: "工资日", text: `经纪人确认 ${paid.toLocaleString("zh-CN")} 已到账。` });
  }
  if (next.world.phase === "season" && week % 16 === 0 && next.finances.cash > 50000) {
    const key = `investment-${next.world.season}-${week}`;
    if (!next.finances.investments.some((item) => item.id === key)) {
      const amount = Math.min(10000, Math.round(next.finances.cash * 0.1));
      const risk = 0.45 + deterministicRoll(`${next.seed}|invest|${key}`) * 0.3;
      next.finances.cash -= amount;
      next.finances.investments.push({ id: key, amount, risk, season: next.world.season, matureSeason: next.world.season + 2 });
      next.feed.unshift({ time: next.world.date, title: "投资决策", text: `你把 ${amount.toLocaleString("zh-CN")} 投入长期项目，两年后见回报。` });
    }
  }
  if (next.world.phase === "season" && week % 10 === 0 && next.finances.cash > 10000) {
    const key = `consumption-${next.world.season}-${week}`;
    if (!(next.finances.consumption || []).some((item) => item.id === key)) {
      const cost = Math.min(2000, Math.round(next.finances.cash * 0.05));
      next.finances.cash -= cost;
      next.resources.mind = clamp(next.resources.mind + 2, 0, 100);
      next.finances.consumption = next.finances.consumption || [];
      next.finances.consumption.push({ id: key, date: next.world.date, amount: cost });
      next.feed.unshift({ time: next.world.date, title: "消费", text: `生活开支 ${cost.toLocaleString("zh-CN")}，心理状态小幅回升。` });
    }
  }
  for (const investment of next.finances.investments) {
    if (investment.matureSeason > next.world.season) continue;
    const roll = deterministicRoll(`${next.seed}|invest-result|${investment.id}`);
    const outcome = roll > investment.risk
      ? Math.round(investment.amount * (1.12 + roll * 0.18))
      : Math.round(investment.amount * 0.45);
    next.finances.cash += outcome;
    next.finances.careerEarnings += Math.max(0, outcome - investment.amount);
    next.feed.unshift({
      time: next.world.date,
      title: roll > investment.risk ? "投资回报" : "投资亏损",
      text: `${investment.id} 结算为 ${outcome.toLocaleString("zh-CN")}。`
    });
  }
  next.finances.investments = next.finances.investments.filter((item) => item.matureSeason > next.world.season);
  return next;
}

function processLifeEvents(state) {
  const next = cloneState(state);
  const week = next.world.week;
  if (next.world.phase === "season") {
    const eventPack = (next.extensions || []).find((pack) => pack.type === "event" && pack.entries?.some((entry) => !pack.deliveredIds?.includes(entry.id)));
    if (eventPack) {
      eventPack.deliveredIds = eventPack.deliveredIds || [];
      const event = eventPack.entries.find((entry) => !eventPack.deliveredIds.includes(entry.id));
      if (event) {
        eventPack.deliveredIds.push(event.id);
        next.feed.unshift({ time: next.world.date, title: event.title, text: event.text });
      }
    }
    const socialKey = `social-${next.world.season}-${week}`;
    if (week % 5 === 0 && !next.media.social.some((item) => item.id === socialKey)) {
      const posts = [
        "训练后加练了二十五分钟第一脚触球，灯熄灭时才离开。",
        "更衣室里的战术板比手机屏幕更能让我想清楚下一场。",
        "赢球后的晚上，我只想和家人视频五分钟。"
      ];
      const text = posts[Math.floor(deterministicRoll(`${next.seed}|social|${socialKey}`) * posts.length)];
      next.media.social.push({ id: socialKey, date: next.world.date, text });
      next.media.fans = Math.round(next.media.fans * 1.005);
    }
    if (week % 11 === 0) {
      const mediaKey = `interview-${next.world.season}-${week}`;
      if (!next.relations.media.memory.some((item) => item.startsWith(mediaKey))) {
        next.relations.media.trust = clamp(next.relations.media.trust + 1, 0, 100);
        next.media.reputation = clamp(next.media.reputation + 0.2, 10, 99);
        next.relations.media.memory.push(`${mediaKey}:接受了赛前采访`);
        next.feed.unshift({ time: next.world.date, title: "媒体采访", text: "你只回答关于下一场的问题，没有把注意力留给场外话题。" });
      }
    }
    if (week === 3 && next.player.age >= 24 && !next.player.partner) {
      const partnerKey = `partner-${next.world.season}`;
      if (!next.relations.family.memory.some((item) => item.startsWith(partnerKey))) {
        next.player.partner = "稳定的长期伴侣";
        next.relations.family.closeness = clamp(next.relations.family.closeness + 4, 0, 100);
        next.relations.family.memory.push(`${partnerKey}:家庭接纳了你的长期伴侣`);
        next.feed.unshift({ time: next.world.date, title: "家庭", text: "家人开始认真对待你的长期伴侣，并希望你照顾好心理和身体。" });
      }
    }
  }
  if (next.world.phase === "offseason" && week === 3) {
    const restKey = `rest-${next.world.season}`;
    if (!next.relations.family.memory.some((item) => item.startsWith(restKey))) {
      next.relations.family.closeness = clamp(next.relations.family.closeness + 2, 0, 100);
      next.relations.family.memory.push(`${restKey}:休赛期家庭旅行`);
      next.feed.unshift({ time: next.world.date, title: "休赛期生活", text: "你和家人离开训练基地，短途旅行让心理回血。" });
    }
  }
  return next;
}

function rememberRelation(state, id, title, text, delta = {}) {
  const next = cloneState(state);
  if (!next.relations[id]) return next;
  next.relations[id].trust = clamp((next.relations[id].trust || 50) + (delta.trust || 0), 0, 100);
  next.relations[id].respect = clamp((next.relations[id].respect || 50) + (delta.respect || 0), 0, 100);
  next.relations[id].closeness = clamp((next.relations[id].closeness || 50) + (delta.closeness || 0), 0, 100);
  next.relations[id].memory.push(`${next.world.date}:${title}:${text}`);
  return next;
}

function fixtureStrength(fixture, side) {
  const club = side === "home" ? fixture.home : fixture.away;
  return clamp(club?.reputation || 50, 40, 96);
}

function rolls(key, count) {
  return Array.from({ length: count }, (_, index) => deterministicRoll(`${key}|${index}`));
}

function simulateNormalMatch(state, fixture) {
  const homeStrength = fixtureStrength(fixture, "home");
  const awayStrength = fixtureStrength(fixture, "away");
  const rollsList = rolls(`${state.seed}|normal|${fixture.id}`, 5);
  const lambdaHome = 0.7 + homeStrength / 65 + (rollsList[0] - 0.5) * 0.6;
  const lambdaAway = 0.7 + awayStrength / 65 + (rollsList[1] - 0.5) * 0.6;
  const homeGoals = Math.max(0, Math.round(lambdaHome + (rollsList[2] - 0.5) * 2));
  const awayGoals = Math.max(0, Math.round(lambdaAway + (rollsList[3] - 0.5) * 2));
  const isHome = fixture.home?.id === state.player.clubId;
  const teamGoals = isHome ? homeGoals : awayGoals;
  const opponentGoals = isHome ? awayGoals : homeGoals;
  const rating = computeRating(state, teamGoals, opponentGoals, rollsList[4], fixture.focus);
  const goals = state.player.position === "GK" ? 0 : scoreChance(state, rating, rolls(`${state.seed}|goal|${fixture.id}`, 2));
  const assists = state.player.position === "GK" ? 0 : scoreChance(state, rating * 0.72, rolls(`${state.seed}|assist|${fixture.id}`, 2));
  const minutes = state.health.injuries.length ? 20 : 90;
  return {
    id: fixture.id,
    round: fixture.round,
    competition: fixture.competition,
    home: fixture.home,
    away: fixture.away,
    homeGoals,
    awayGoals,
    teamGoals,
    opponentGoals,
    rating: Number(rating.toFixed(1)),
    goals,
    assists,
    minutes,
    motm: rating >= 8.4,
    form: rating,
    narrative: buildNormalNarrative(state, fixture, { homeGoals, awayGoals, rating, goals, assists }),
    facts: Object.freeze({ fixtureId: fixture.id, score: [homeGoals, awayGoals], rating, goals, assists })
  };
}

function computeRating(state, teamGoals, opponentGoals, roll, focus) {
  const attrs = state.player.attributes;
  const technical = (attrs.vision + attrs.shortPassing + attrs.dribbling + attrs.ballControl) / 4;
  const physical = (attrs.stamina + attrs.acceleration + attrs.strength) / 3;
  const mental = (attrs.composure + (attrs.decisions || 60) + state.player.hidden.pressure) / 3;
  let rating = 6 + (technical - 58) / 18 + (physical - 55) / 25 + (mental - 55) / 22;
  if (teamGoals > opponentGoals) rating += 0.45;
  if (teamGoals < opponentGoals) rating -= 0.25;
  rating += (roll - 0.5) * 0.9;
  if (focus) rating += 0.25;
  rating = clamp(rating, 3.5, 10);
  return rating;
}

function scoreChance(state, rating, rollsList) {
  const chance = (rating - 5.5) / 5;
  const primary = state.player.position === "ST" || state.player.position === "LW" || state.player.position === "RW" || state.player.position === "CAM" ? chance * 0.5 : chance * 0.2;
  return rollsList[0] < primary ? 1 + (rollsList[1] > 0.85 ? 1 : 0) : 0;
}

function buildNormalNarrative(state, fixture, result) {
  const resultText = result.homeGoals > result.awayGoals ? "获胜" : result.homeGoals === result.awayGoals ? "战平" : "失利";
  return [
    `${fixture.competition}第 ${fixture.round} 轮，${fixture.home?.name} ${result.homeGoals}—${result.awayGoals} ${fixture.away?.name}。`,
    result.goals ? `你贡献 ${result.goals} 粒进球，赛后评分 ${result.rating.toFixed(1)}。` : `你帮助球队${resultText}，赛后评分 ${result.rating.toFixed(1)}。`,
    result.motm ? "你被选为全场最佳，媒体开始讨论你在更衣室里的角色。" : "教练在赛后拍了拍你的肩膀，没有多余的话。",
    "下一次训练从恢复开始。"
  ].join(" ");
}

function buildFocusMatch(state, fixture) {
  const moments = buildFocusMoments(state, fixture);
  const homeShort = fixture.home?.short || fixture.home?.name || "主队";
  const awayShort = fixture.away?.short || fixture.away?.name || "客队";
  return {
    id: `focus-${fixture.id}`,
    seed: `${state.seed}|focus|${fixture.id}`,
    competition: fixture.competition,
    venue: `${fixture.home?.stadium || "主场"} · 焦点战`,
    weather: "晴转多云，草皮状态良好",
    home: fixture.home?.name,
    away: fixture.away?.name,
    homeShort,
    awayShort,
    kickoff: "周六 19:35",
    role: `${state.player.position} · ${state.player.role}`,
    tacticalBrief: "在对手防线与中场之间接球，用第一脚触球改变方向。",
    pregame: buildPregame(state, fixture),
    moments
  };
}

function buildPregame(state, fixture) {
  const home = fixture.home?.name || "主队";
  const away = fixture.away?.name || "客队";
  const club = CLUBS.find((item) => item.id === state.player.clubId);
  return [
    `更衣室的门关上以后，外面的声音只留下看台的低鸣。${club?.name || "你的球队"}今天要在${home}与${away}的焦点战中证明自己的位置。`,
    "教练把战术板推到中间，指节敲在对方后腰的位置上：他们会在第二落点形成人数优势，你要做的是在他们合拢之前转身。",
    `球探报告最后一页写着你的名字。${state.player.name}，16 岁，本赛季第一次进入这样的比赛名单。你低头把鞋带重新系了一遍。`,
    "走出通道时，灯柱投下的影子先于你抵达球场。你没有看记分牌，只把呼吸压到可以听见自己脚步的节奏。"
  ];
}

function focusParagraphs(state, fixture, minute, scenario) {
  const home = fixture.home?.name || "主队";
  const away = fixture.away?.name || "客队";
  const teammate = state.relations.mate.name || "顾辰";
  const rival = state.relations.rival.name || "周启明";
  const base = [
    `比赛开始后，${home}的阵线比录像里更靠前。你第一次接球时，${away}的后腰已经用前臂确认了你的位置。`,
    `第 ${Math.max(2, minute - 10)} 分钟，${teammate}从右侧斜插，传球却慢了半秒。他跑回来时没有抱怨，只低声说再来一次。`,
    `${rival}在训练里的竞争没有带到比赛中，但每次你回撤，他都会提前一步占据你原本要去的空间。`,
    `第 ${minute} 分钟，球终于沿地面送到你一直寻找的区域。${scenario}`
  ];
  return base.map((text) => `${text}${text.length < 50 ? " 你知道这一刻不会等你完全准备好。" : ""}`);
}

function choiceSet(prefix, minute) {
  return [
    {
      id: "through",
      title: "送出提前量直塞",
      intent: "创造",
      risk: "高风险",
      detail: "把球送进防线身后，相信队友能先触到球。",
      primary: "vision",
      secondary: "shortPassing",
      difficulty: 69,
      effects: { success: { home: 1, rating: 0.7, coach: 5, mate: 6, fatigue: 5 }, mixed: { rating: 0.2, coach: 2, mate: 2, fatigue: 4 }, fail: { rating: -0.25, coach: -2, fatigue: 4 } }
    },
    {
      id: "drive",
      title: "转身带球推进",
      intent: "承担",
      risk: "中风险",
      detail: "利用对手重心前移，从外侧把球带向禁区。",
      primary: "dribbling",
      secondary: "acceleration",
      difficulty: 65,
      effects: { success: { rating: 0.5, coach: 4, fatigue: 8 }, mixed: { rating: 0.1, coach: 1, fatigue: 7 }, fail: { rating: -0.3, coach: -1, fatigue: 8 } }
    },
    {
      id: "reset",
      title: "回传重新组织",
      intent: "控制",
      risk: "低风险",
      detail: "把球交回后腰，等待下一次接应角度。",
      primary: "composure",
      secondary: "shortPassing",
      difficulty: 55,
      effects: { success: { rating: 0.2, coach: 2, fatigue: 2 }, mixed: { rating: 0.05, fatigue: 2 }, fail: { rating: -0.1, coach: -1, fatigue: 2 } }
    }
  ];
}

function decisionCueText(base, detail) {
  return `${base}${detail}`.padEnd(45, "。");
}

function buildFocusMoments(state, fixture) {
  const prefix = fixture.id.replace(/[^a-z0-9-]/gi, "");
  return [
    {
      id: `${prefix}-m14`,
      minute: 14,
      label: "第一次被看见",
      interval: "开球至第 14 分钟",
      zone: "右肋",
      leadIn: focusParagraphs(state, fixture, 14, "你已经决定先观察再触球。"),
      pressure: "对方后腰正从你的左肩逼近",
      sensory: "鞋钉切进草皮，你能听见队友在右路调整呼吸。",
      tactical: "直塞窗口只存在一瞬；自己带球会进入包围。",
      decisionCue: decisionCueText("球还没有抵达脚下，但你必须在第一脚触球前决定方向。", "后腰正在收紧空间，第一选择会决定这一轮进攻是继续向前还是回到控制。"),
      choices: choiceSet(prefix, 14),
      bridge: { minute: 24, away: 1, text: "一次反击从你们右侧穿过，远门柱的射门碰到草皮加速入网。" }
    },
    {
      id: `${prefix}-m38`,
      minute: 38,
      label: "比分改变以后",
      interval: "第 15 至第 38 分钟",
      zone: "禁区弧顶",
      leadIn: focusParagraphs(state, fixture, 38, "解围球从弧顶落下，风让它短暂停在空中。"),
      pressure: "两名中场同时冲向第二点",
      sensory: "雨停了，替补席的塑料棚被风吹响。",
      tactical: "凌空处理能立刻制造威胁，卸球则更稳定。",
      decisionCue: decisionCueText("你有时间完成一个动作，却未必有时间完成两个。", "身后的碰撞正在靠近，守门员的视线被人群切开，弱侧队友刚刚摆脱盯防。"),
      choices: [
        {
          id: "volley",
          title: "迎球凌空抽射",
          intent: "终结",
          risk: "高风险",
          detail: "不等球落地，利用门将视线被挡的瞬间。",
          primary: "technique",
          secondary: "composure",
          difficulty: 73,
          effects: { success: { home: 1, rating: 0.8, coach: 5, fatigue: 7 }, mixed: { rating: 0.2, coach: 1, fatigue: 6 }, fail: { rating: -0.25, fatigue: 6 } }
        },
        {
          id: "cushion",
          title: "卸球送向弱侧",
          intent: "组织",
          risk: "中风险",
          detail: "第一脚触球留在身前，再寻找弱侧空位。",
          primary: "technique",
          secondary: "vision",
          difficulty: 64,
          effects: { success: { rating: 0.55, coach: 4, mate: 2, fatigue: 5 }, mixed: { rating: 0.15, coach: 1, fatigue: 5 }, fail: { rating: -0.2, fatigue: 5 } }
        },
        {
          id: "shield",
          title: "卡住身位等待支援",
          intent: "稳定",
          risk: "低风险",
          detail: "用身体挡住对手，争取定位球。",
          primary: "strength",
          secondary: "composure",
          difficulty: 61,
          effects: { success: { rating: 0.25, coach: 2, fatigue: 6 }, mixed: { rating: 0.05, fatigue: 6 }, fail: { rating: -0.2, fatigue: 7 } }
        }
      ],
      bridge: { minute: 46, home: 0, away: 0, text: "半场结束。通道里只有鞋底敲击水泥地的声音。" }
    },
    {
      id: `${prefix}-m71`,
      minute: 71,
      label: "身体开始讨价还价",
      interval: "中场休息至第 71 分钟",
      zone: "中圈右侧",
      leadIn: focusParagraphs(state, fixture, 71, "髋部的紧绷比上半场更早出现。"),
      pressure: "阵线被拉开，身体开始要求筛选跑动",
      sensory: "汗水滑进眼角，呼吸盖过场边声音。",
      tactical: "继续前插可能撕开防线，也可能失去处理质量。",
      decisionCue: decisionCueText("持球队友已经抬头。启动还是回撤，答案必须在这一秒出现。", "身体的热度与场边的喊声同时涌来，你必须选择把下一次冲刺留给哪块空间。"),
      choices: [
        {
          id: "burst",
          title: "继续冲击身后",
          intent: "冒险",
          risk: "身体风险",
          detail: "用一次最大强度启动迫使防线后退。",
          primary: "stamina",
          secondary: "acceleration",
          difficulty: 70,
          effects: { success: { rating: 0.6, coach: 5, fatigue: 13 }, mixed: { rating: 0.1, coach: 1, fatigue: 14 }, fail: { rating: -0.35, coach: -2, fatigue: 15 } }
        },
        {
          id: "drop",
          title: "回撤成为出球点",
          intent: "阅读",
          risk: "中风险",
          detail: "帮助球队重新获得中场控制。",
          primary: "composure",
          secondary: "shortPassing",
          difficulty: 62,
          effects: { success: { rating: 0.45, coach: 4, fatigue: 7 }, mixed: { rating: 0.15, coach: 1, fatigue: 7 }, fail: { rating: -0.15, fatigue: 7 } }
        },
        {
          id: "signal",
          title: "向教练示意身体",
          intent: "诚实",
          risk: "角色风险",
          detail: "请求调整任务，把最危险的冲刺留给队友。",
          primary: "composure",
          secondary: "decisions",
          difficulty: 58,
          effects: { success: { rating: 0.15, coach: 3, fatigue: 2 }, mixed: { coach: 1, fatigue: 3 }, fail: { rating: -0.1, coach: -1, fatigue: 3 } }
        }
      ],
      bridge: { minute: 79, home: 1, text: "队友在左侧抢下几乎出界的球，倒三角传中被后插上的中场推入近角。" }
    },
    {
      id: `${prefix}-m87`,
      minute: 87,
      label: "最后一个窗口",
      interval: "第 72 至第 87 分钟",
      zone: "禁区右角",
      leadIn: focusParagraphs(state, fixture, 87, "近角被门将封住，远角只露出一条弧线。"),
      pressure: "比分接近，防线不再冒险上抢",
      sensory: "场灯全部亮起，草皮上的鞋印比上半场更深。",
      tactical: "射门角度很小，横传更合理，但后点也被盯住。",
      decisionCue: decisionCueText("终场前也许不会再有同样完整的一次触球。", "近角被守门员封住，远角只露出一条弧线，后点的队友正在等待横传。"),
      choices: [
        {
          id: "curl",
          title: "兜射远角",
          intent: "决定比赛",
          risk: "高风险",
          detail: "让球绕过封堵腿与门将指尖。",
          primary: "technique",
          secondary: "composure",
          difficulty: 75,
          effects: { success: { home: 1, rating: 1, coach: 6, fatigue: 8 }, mixed: { rating: 0.25, coach: 1, fatigue: 7 }, fail: { rating: -0.3, coach: -2, fatigue: 7 } }
        },
        {
          id: "square",
          title: "横传后点",
          intent: "无私",
          risk: "中风险",
          detail: "相信队友会抵达你看见的空地。",
          primary: "vision",
          secondary: "shortPassing",
          difficulty: 67,
          effects: { success: { home: 1, rating: 0.8, coach: 5, mate: 5, fatigue: 6 }, mixed: { rating: 0.2, coach: 2, mate: 1, fatigue: 5 }, fail: { rating: -0.2, fatigue: 5 } }
        },
        {
          id: "recycle",
          title: "护球等待压上",
          intent: "耐心",
          risk: "低风险",
          detail: "不把最后一次进攻浪费在狭小角度里。",
          primary: "composure",
          secondary: "strength",
          difficulty: 60,
          effects: { success: { rating: 0.3, coach: 3, fatigue: 5 }, mixed: { rating: 0.1, coach: 1, fatigue: 5 }, fail: { rating: -0.15, fatigue: 6 } }
        }
      ]
    }
  ];
}

function startMatch(state, fixture, academy = false) {
  const next = cloneState(state);
  const match = academy ? structuredClone(MATCH) : buildFocusMatch(state, fixture);
  if (academy) {
    match.seed = `${next.seed}|academy-final`;
    match.id = `academy-final-${next.seed}`;
  }
  next.match = {
    ...match,
    status: "ready",
    screen: "preview",
    score: { home: 0, away: 0 },
    minute: 0,
    currentMoment: 0,
    rating: 6.5,
    fatigue: next.health.fatigue,
    decisions: [],
    resolutions: [],
    timeline: [],
    lastResolution: null,
    summary: null,
    fixtureId: fixture?.id || null,
    academy: Boolean(academy)
  };
  next.feed.unshift({ time: next.world.date, title: "焦点比赛", text: `${next.match.competition}：${next.match.home} 对 ${next.match.away}。` });
  return next;
}

export function startCurrentMatch(state) {
  const next = cloneState(state);
  if (next.match?.status !== "ready") return next;
  next.match.status = "live";
  next.match.screen = "decision";
  next.match.minute = next.match.moments[0].minute;
  next.match.fatigue = next.health.fatigue;
  next.match.timeline.push({ minute: 0, type: "system", text: "比赛开始。你进入首发。" });
  return next;
}

export function chooseMatchAction(state, choiceId) {
  const next = cloneState(state);
  if (next.match?.status !== "live" || next.match?.screen !== "decision") return next;
  const moment = next.match.moments[next.match.currentMoment];
  const choice = moment?.choices.find((item) => item.id === choiceId);
  if (!moment || !choice) return next;
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
  return next;
}

export function continueMatch(state) {
  let next = cloneState(state);
  if (next.match?.status !== "live" || next.match?.screen !== "outcome") return next;
  const moment = next.match.moments[next.match.currentMoment];
  if (moment?.bridge) {
    next.match.score.home += moment.bridge.home || 0;
    next.match.score.away += moment.bridge.away || 0;
    next.match.timeline.push({ minute: moment.bridge.minute, type: "system", text: moment.bridge.text });
  }
  const isLast = next.match.currentMoment >= next.match.moments.length - 1;
  if (isLast) {
    next.match.status = "complete";
    next.match.screen = "summary";
    next.match.minute = 90;
    next.match.summary = buildMatchSummary(next);
    next = finalizeFocusMatch(next);
  } else {
    next.match.currentMoment += 1;
    next.match.minute = next.match.moments[next.match.currentMoment].minute;
    next.match.screen = "decision";
    next.match.lastResolution = null;
  }
  return next;
}

function finalizeFocusMatch(state) {
  let next = cloneState(state);
  const match = next.match;
  const rating = match.summary?.rating || match.rating;
  const goals = Math.max(0, Math.min(2, match.resolutions.filter((item) => item.fact.scoreDelta.home > 0).length));
  const assists = Math.max(0, Math.min(1, match.resolutions.filter((item) => item.fact.intent === "无私" && item.fact.scoreDelta.home > 0).length));
  if (match.academy) {
    next.world.phase = "contract";
    next.offers = [
      { id: "shenhua", clubId: "shanghai-shenhua", name: "上海申花", contract: "青年球员合同", role: "U21 核心 / 一线队杯赛观察", city: "上海", fit: 82 },
      { id: "zhejiang", clubId: "zhejiang", name: "浙江队", contract: "三年职业合同", role: "前场组织核心培养", city: "杭州", fit: 77 },
      { id: "chengdu", clubId: "chengdu-rongcheng", name: "成都蓉城", contract: "梯队合同 + 一线队训练", role: "轮换前腰培养", city: "成都", fit: 70 }
    ];
    next.feed.unshift({ time: next.world.date, title: "职业合同评审", text: `评分 ${rating.toFixed(1)}。三家俱乐部更新了正式条件。` });
    return next;
  }
  next = applyResultToCareer(next, {
    fixtureId: match.fixtureId,
    home: match.home,
    away: match.away,
    homeGoals: match.score.home,
    opponentGoals: match.score.away,
    rating,
    goals,
    assists,
    minutes: 90,
    motm: rating >= 8.4,
    competition: match.competition
  });
  next.world.week += 1;
  next.match = null;
  return next;
}

function applyResultToCareer(state, result) {
  const next = cloneState(state);
  const season = next.career.seasonStats;
  season.appearances += 1;
  season.starts += 1;
  season.goals += result.goals || 0;
  season.assists += result.assists || 0;
  season.minutes += result.minutes || 90;
  season.ratingSum += result.rating || 6;
  if (result.motm) season.motm += 1;
  next.career.totalStats.appearances += 1;
  next.career.totalStats.goals += result.goals || 0;
  next.career.totalStats.assists += result.assists || 0;
  next.career.totalStats.minutes += result.minutes || 90;
  next.health.fatigue = clamp(next.health.fatigue + (result.minutes || 90) * 0.1, 0, 100);
  next.health.form = clamp(result.rating || 6, 3, 10);
  next.resources.mind = clamp(next.resources.mind + (result.rating > 7.4 ? 5 : result.rating < 6 ? -5 : 0), 0, 100);
  next.media.fans = Math.round(next.media.fans * (1 + ((result.rating - 6) * 0.004 + (result.goals ? 0.02 : 0))));
  next.finances.cash = Math.round(next.finances.cash + next.finances.weeklyWage * 0.25);
  if (next.season) {
    const fixture = next.season.fixtures.find((item) => item.id === result.fixtureId);
  if (fixture) {
      fixture.played = true;
      fixture.score = [result.homeGoals ?? result.teamGoals, result.opponentGoals];
      fixture.result = (result.homeGoals ?? result.teamGoals) > result.opponentGoals ? "win" : (result.homeGoals ?? result.teamGoals) === result.opponentGoals ? "draw" : "loss";
      fixture.rating = result.rating;
    }
    next.season.results.push({
      id: result.fixtureId,
      round: fixture?.round || next.season.results.length + 1,
      home: result.home,
      away: result.away,
      score: [result.homeGoals, result.opponentGoals],
      playerRating: result.rating,
      goals: result.goals || 0,
      assists: result.assists || 0
    });
    if (fixture?.competitionType !== "cup") {
      updateStandings(next, {
        home: result.home,
        away: result.away,
        homeGoals: result.homeGoals ?? result.teamGoals,
        awayGoals: result.opponentGoals
      });
    }
  }
  return next;
}

function generateAcademyOffers(state) {
  const next = cloneState(state);
  next.offers = [
    { id: "shenhua", clubId: "shanghai-shenhua", name: "上海申花", contract: "青年球员合同", role: "U21 核心 / 一线队杯赛观察", city: "上海", fit: 82 },
    { id: "zhejiang", clubId: "zhejiang", name: "浙江队", contract: "三年职业合同", role: "前场组织核心培养", city: "杭州", fit: 77 },
    { id: "chengdu", clubId: "chengdu-rongcheng", name: "成都蓉城", contract: "梯队合同 + 一线队训练", role: "轮换前腰培养", city: "成都", fit: 70 }
  ];
  next.world.phase = "contract";
  next.feed.unshift({ time: next.world.date, title: "三份正式条件", text: "青训结束，三家俱乐部都愿意给你一份职业起点。" });
  return next;
}

function advanceAcademyWeek(state) {
  let next = cloneState(state);
  if (next.world.week < 8) {
    next = advanceInjuries(next);
    next.feed.unshift({ time: next.world.date, title: `青训第 ${next.world.week} 周`, text: "训练按计划推进，教练组开始整理你的比赛报告。" });
    next.world.week += 1;
    next.world.date = addDays(next.world.date, 7);
    if (next.world.week === 8) {
      const fixture = {
        id: "academy-final",
        round: 0,
        home: { name: "上海申花 U21", short: "申花 U21", reputation: 62 },
        away: { name: "北京国安 U21", short: "国安 U21", reputation: 61 },
        competition: "青训考核赛",
        focus: true
      };
      next = startMatch(next, fixture, true);
    }
    return next;
  }
  if (next.world.week >= 8 && !next.match) {
    return generateAcademyOffers(next);
  }
  return next;
}

function advanceSeasonWeek(state) {
  let next = cloneState(state);
  next = advanceInjuries(next);
  next = applyPlan(next, next.training.planId);
  next = processNationalTeam(next);
  next = processWealthEvents(next);
  next = processLifeEvents(next);
  next = advanceWorldSimulations(next);
  if (!next.season) {
    next.season = createSeason(CLUBS.find((item) => item.id === next.player.clubId), next.world.season, next.seed);
  }
  const fixture = next.season.fixtures[next.season.index];
  if (!fixture) {
    next.world.phase = "offseason";
    next.world.week = 1;
    next = seasonEnd(next);
    next.feed.unshift({ time: next.world.date, title: "赛季结束", text: "联赛赛程已经全部完成，管理层进入续约与转会讨论。" });
    return next;
  }
  if (fixture.played) {
    next.season.index += 1;
    return next;
  }
  fixture.focusReasons = classifyFocusFixture(next, fixture);
  fixture.focus = fixture.focusReasons.length > 0;
  if (fixture.focus) {
    next = startMatch(next, fixture, false);
    return next;
  }
  const result = simulateNormalMatch(next, fixture);
  next = applyResultToCareer(next, {
    ...result,
    home: result.home,
    away: result.away
  });
  next.feed.unshift({ time: fixture.date, title: `${fixture.competition}第 ${fixture.round} 轮`, text: result.narrative });
  next.season.index += 1;
  next.world.date = fixture.date;
  next.world.week += 1;
  if (next.season.index === Math.ceil(next.season.fixtures.length / 2)) {
    next = generateTransferOffers(next);
  }
  if (next.season.index >= next.season.fixtures.length) {
    next.world.phase = "offseason";
    next.world.week = 1;
    next = seasonEnd(next);
  }
  return next;
}

function generateTransferOffers(state) {
  const next = cloneState(state);
  const current = CLUBS.find((item) => item.id === next.player.clubId);
  const candidates = CLUBS.filter((item) => item.id !== current.id && item.league !== "csl" && item.reputation >= current.reputation);
  if (!candidates.length) {
    next.feed.unshift({ time: next.world.date, title: "转会窗", text: "经纪人确认，目前没有适合你的海外报价。" });
    return next;
  }
  const offerClub = candidates[Math.floor(deterministicRoll(`${next.seed}|transfer|${next.world.season}|${next.season.index}`) * candidates.length)];
  const value = Math.round((next.player.overall - 40) * 14000 + offerClub.reputation * 12000);
  next.transferOffers = [
    {
      id: `transfer-${next.world.season}-${offerClub.id}`,
      clubId: offerClub.id,
      clubName: offerClub.name,
      fee: value,
      weeklyWage: Math.round((offerClub.reputation * 18) + next.player.overall * 25),
      years: 3,
      role: "轮换球员",
      releaseClause: Math.round(value * 1.2)
    }
  ];
  next.feed.unshift({ time: next.world.date, title: "海外报价", text: `${offerClub.name}通过经纪人发来一份 ${Math.round(value / 10000)} 万欧元报价。` });
  return next;
}

export function seasonEnd(state) {
  let next = cloneState(state);
  ensureWorldAuditState(next);
  for (const simulation of next.world.leagueSimulations) {
    if (!simulation.awards.some((award) => award.season === next.world.season)) {
      simulation.awards.push({ title: `${simulation.name}赛季冠军`, clubId: simulation.standings[0]?.clubId || null, season: next.world.season });
    }
    if (!simulation.records.some((record) => record.season === next.world.season)) {
      simulation.records.push({ type: "season-leader", season: next.world.season, clubId: simulation.standings[0]?.clubId || null, points: simulation.standings[0]?.points || 0 });
    }
  }
  next = applyGrowthToAttributes(next);
  const stats = next.career.seasonStats;
  const average = stats.appearances ? stats.ratingSum / stats.appearances : 6;
  next.player.age += 1;
  if (next.player.age >= (next.settings.retireAge || 34)) {
    next.world.phase = "retirement";
    next.world.week = 1;
    next.feed.unshift({ time: next.world.date, title: "退役选项", text: `${next.player.age} 岁的你开始认真考虑离开球员生涯。` });
    return next;
  }
  next.health.bodyAge += 0.4;
  next.player.overall = clamp(Math.round(calculateOverall(next)), 40, 99);
  next.media.reputation = clamp(Math.round(next.media.reputation + (average - 6) * 8 + (stats.goals ? 4 : 0)), 10, 99);
  next.career.milestones.push(`${next.world.season} 赛季：${stats.appearances} 场 ${stats.goals} 球 ${stats.assists} 助攻，场均 ${average.toFixed(2)}。`);
  next.world.news.unshift({ time: next.world.date, title: "赛季总结", text: `你的赛季报告完成，队内排名 ${Math.max(1, Math.round(next.career.totalStats.appearances / 10))}。` });
  const standing = next.season?.standings?.[0];
  if (standing?.clubId === next.player.clubId) {
    next.career.totalStats.titles.push(`${next.world.season} ${next.season.leagueId || "联赛"}冠军`);
    next.awards.push({ id: `award-champion-${next.world.season}`, award: "联赛冠军", season: next.world.season, won: true });
    addHonor(next, { id: `honor-champion-${next.world.season}`, awardId: "league-title", title: "联赛冠军", category: "club", season: next.world.season, clubId: next.player.clubId, won: true });
    next.feed.unshift({ time: next.world.date, title: "联赛冠军", text: "你的球队赢得联赛冠军，夺冠游行将在休赛期进行。" });
  }
  if (stats.goals >= 15) {
    next.records.push({ id: `record-goals-${next.world.season}`, record: `单赛季 ${stats.goals} 球`, date: next.world.date, season: next.world.season });
  }
  next = evolveWorld(next);
  next.career.seasonStats = { appearances: 0, starts: 0, goals: 0, assists: 0, minutes: 0, ratingSum: 0, motm: 0, season: next.world.season };
  return next;
}

function evolveWorld(state) {
  const next = cloneState(state);
  if (Array.isArray(state.world.players)) {
    next.world.players = state.world.players.map((player) => ({ ...player }));
    for (const player of next.world.players) {
      const age = player.age || (2026 - (player.birthYear || 1995));
      player.age = age + 1;
      if (player.status === "injured") {
        player.injury = player.injury || { name: "肌肉拉伤", weeks: 4 };
        player.injury.weeks = Math.max(0, player.injury.weeks - 1);
        if (player.injury.weeks <= 0) {
          player.status = "active";
          player.injury = null;
        }
        continue;
      }
      if (player.status === "loaned") {
        const roll = deterministicRoll(`${next.seed}|loan-return|${next.world.season}|${player.id}`);
        if (roll < 0.35) {
          player.status = "active";
          player.clubId = player.loanClubId || player.clubId;
          player.loanClubId = null;
        }
        continue;
      }
      if (player.status !== "active") continue;
      const roll = deterministicRoll(`${next.seed}|player-life|${next.world.season}|${player.id}`);
      if (age > 34 && roll > 0.82) {
        player.status = "retired";
        continue;
      }
      if (roll > 0.97) {
        const club = CLUBS.find((item) => item.id === player.clubId);
        const candidates = CLUBS.filter((item) => item.league === club?.league && item.id !== player.clubId);
        const target = candidates.length ? candidates[Math.floor(roll * 17 * candidates.length) % candidates.length] : null;
        if (target) {
          player.clubHistory = player.clubHistory || [];
          player.clubHistory.push(player.clubId);
          player.clubId = target.id;
        }
      }
      if (roll > 0.985) {
        player.status = "loaned";
        player.loanClubId = CLUBS.find((item) => item.id !== player.clubId && item.league === CLUBS.find((item) => item.id === player.clubId)?.league)?.id || player.clubId;
      } else if (roll > 0.99) {
        player.status = "injured";
        player.injury = { name: "肌肉拉伤", weeks: 4 };
      }
    }
  }
  for (const club of next.world.clubStates) {
    const roll = deterministicRoll(`${next.seed}|evolve|${next.world.season}|${club.id}`);
    club.reputation = clamp(club.reputation + (roll > 0.7 ? 1 : roll < 0.25 ? -1 : 0), 35, 99);
    club.managerStability = clamp(club.managerStability + Math.round((roll - 0.5) * 10), 0, 100);
    if (roll > 0.95) {
      next.world.news.unshift({ time: next.world.date, title: "换帅", text: `${CLUBS.find((item) => item.id === club.id)?.name}宣布更换主教练。` });
    }
  }
  if (deterministicRoll(`${next.seed}|world-rule|${next.world.season}`) > 0.97) {
    next.world.news.unshift({ time: next.world.date, title: "规则变迁", text: "联赛办公室宣布调整外援名额与财务规则，俱乐部开始重新评估阵容。" });
  }
  const nation = next.player.nationality;
  const surnamePool = SURNAMES_BY_NATION[nation] || ["王", "李", "张"];
  const namePool = NAME_POOLS[nation] || ["新星"];
  for (let index = 0; index < 2; index += 1) {
    const roll = deterministicRoll(`${next.seed}|newstar|${next.world.season}|${index}`);
    const surname = surnamePool[Math.floor(roll * surnamePool.length) % surnamePool.length];
    const given = namePool[Math.floor(roll * 7 * namePool.length) % namePool.length] || "新星";
    next.world.newStars.push({
      id: `star-${next.world.season}-${index}`,
      name: `${surname}${given.replace(/^[A-Za-zÁÉÍÓÚáéíóú]+/, "") || "新星"}`,
      nationality: nation,
      age: 16 + Math.floor(roll * 3),
      position: ["ST", "CAM", "LW", "CM"][Math.floor(roll * 4) % 4],
      template: true,
      note: "模板生成，仅用于世界演化。"
    });
  }
  return next;
}

function calculateOverall(state) {
  const attrs = state.player.attributes;
  const values = Object.values(attrs);
  const base = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  return clamp(base + (state.health.form - 6) * 1.2, 35, 99);
}

function calculateSelectionScore(state) {
  const attrs = state.player.attributes;
  const values = Object.values(attrs);
  const base = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const availability = state.health?.injuries?.some((injury) => injury.active) ? -16 : 0;
  return clamp(base + (state.health?.form - 6) * 1.1 + availability, 35, 99);
}

function advanceOffseasonWeek(state) {
  let next = cloneState(state);
  next = processWealthEvents(next);
  next = processLifeEvents(next);
  if (next.world.week <= 4) {
    next.resources.load = clamp(next.resources.load - 15, 0, 100);
    next.resources.mind = clamp(next.resources.mind + 12, 0, 100);
    next.health.bodyAge = clamp(next.health.bodyAge - 0.2, Math.max(1, next.player.age - 3), 99);
    if (next.world.week === 1) {
      const sponsor = SPONSOR_POOL[Math.floor(deterministicRoll(`${next.seed}|sponsor|${next.world.season}`) * SPONSOR_POOL.length)];
      next.finances.sponsors.push({ ...sponsor, starts: next.world.date });
      next.media.fans = Math.round(next.media.fans * 1.05);
      next.feed.unshift({ time: next.world.date, title: "休赛期", text: `经纪人带来一份${sponsor.name}的合作意向。` });
    }
    next.world.week += 1;
    next.world.date = addDays(next.world.date, 7);
    return next;
  }
  next.world.season += 1;
  next.world.week = 1;
  next.world.phase = "season";
  const club = CLUBS.find((item) => item.id === next.player.clubId);
  next.world.transferWindows = LEAGUE_RULES[club?.league]?.transferWindows || next.world.transferWindows;
  next.season = createSeason(club, next.world.season, next.seed);
  next.world.date = `${next.world.season}-03-01`;
  next.feed.unshift({ time: next.world.date, title: `新赛季 ${next.world.season}`, text: `你回到${next.player.club}，第一轮名单已经公布。` });
  return next;
}

export function acceptOffer(state, offerId) {
  const next = cloneState(state);
  const offer = next.offers.find((item) => item.id === offerId);
  if (!offer) return next;
  const club = CLUBS.find((item) => item.id === offer.clubId) || CLUBS.find((item) => item.id === "shanghai-shenhua");
  next.player.clubId = club.id;
  next.player.club = club.name;
  next.player.squad = "一线队/梯队";
  next.contract = {
    clubId: club.id,
    type: offer.contract,
    weeklyWage: Math.round(club.reputation * (offer.negotiated ? 58 : 45)),
    endDate: `${next.world.season + 3}-12-31`,
    role: offer.negotiated ? `核心培养 · ${offer.role.replace(/^核心培养 · /, "")}` : offer.role,
    releaseClause: Math.round(club.reputation * (offer.negotiated ? 12000 : 18000)),
    imageRights: offer.negotiated ? 0.45 : 0.35,
    signingBonus: Math.round(club.reputation * (offer.negotiated ? 800 : 500))
  };
  next.finances.weeklyWage = next.contract.weeklyWage;
  next.finances.cash += next.contract.signingBonus;
  next.world.phase = "season";
  next.world.week = 1;
  next.world.date = `${next.world.season}-03-01`;
  next.world.transferWindows = LEAGUE_RULES[club.league]?.transferWindows || next.world.transferWindows;
  next.season = createSeason(club, next.world.season, next.seed);
  next.feed.unshift({ time: next.world.date, title: "签约", text: `你与${club.name}签下${offer.contract}。` });
  return next;
}

export function negotiateOffer(state, offerId) {
  const next = cloneState(state);
  const offer = next.offers.find((item) => item.id === offerId);
  if (!offer || offer.negotiated) return next;
  offer.negotiated = true;
  offer.contract = `协商条款 · ${offer.contract}`;
  offer.role = `核心培养 · ${offer.role}`;
  offer.fit = clamp((offer.fit || 70) + 5, 50, 99);
  offer.note = "提高周薪与签字费，降低解约金；俱乐部接受，因为青训名额值得争取。";
  next.feed.unshift({ time: next.world.date, title: "合同谈判", text: `${offer.name}接受了你的经纪人对角色与条款的修改。` });
  return next;
}

export function selectTransferOffer(state, accept, offerId) {
  const next = cloneState(state);
  const offer = next.transferOffers.find((item) => item.id === offerId);
  if (!offer) return next;
  if (accept) {
    const club = CLUBS.find((item) => item.id === offer.clubId);
    if (!club) return next;
    next.player.clubId = club.id;
    next.player.club = club.name;
    next.contract = {
      clubId: club.id,
      type: "职业合同",
      weeklyWage: offer.weeklyWage,
      endDate: `${next.world.season + offer.years}-12-31`,
      role: offer.role,
      releaseClause: offer.releaseClause,
      imageRights: 0.4,
      signingBonus: Math.round(offer.fee * 0.02)
    };
    next.finances.weeklyWage = offer.weeklyWage;
    next.finances.cash += next.contract.signingBonus;
    next.feed.unshift({ time: next.world.date, title: "转会完成", text: `你加盟${club.name}，转会费 ${Math.round(offer.fee / 10000)} 万欧元。` });
    next.world.transferWindows = LEAGUE_RULES[club.league]?.transferWindows || next.world.transferWindows;
    next.season = createSeason(club, next.world.season, next.seed);
    next.season.index = 1;
    setRelatedSimulationPrecision(next, club.id);
    next.player.hidden.adaptability = clamp(next.player.hidden.adaptability + 1, 1, 20);
  } else {
    next.feed.unshift({ time: next.world.date, title: "转会窗", text: `你拒绝${offer.clubName}的报价，留在${next.player.club}。` });
  }
  next.transferOffers = [];
  return next;
}

export function retirePlayer(state) {
  const next = cloneState(state);
  if (next.player.retired) return next;
  next.player.retired = true;
  next.player.status = "retired";
  const reputation = next.media.reputation;
  const leadership = next.player.hidden.leadership;
  next.coach = {
    id: `coach-${next.player.id}`,
    name: next.player.name,
    license: reputation >= 80 ? "A级" : reputation >= 60 ? "B级" : "C级",
    reputation,
    leadership,
    clubId: null,
    club: null,
    contract: null,
    tactics: "均衡",
    trainingFocus: "技术",
    seasonStats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    jobOffers: COACH_JOBS.filter((job) => reputation >= job.minReputation).map((job) => ({ ...job, selected: false })),
    retired: false,
    milestones: []
  };
  next.world.phase = "retirement";
  next.feed.unshift({ time: next.world.date, title: "退役", text: `${next.player.name}结束球员生涯，教练证书已经归档。` });
  return next;
}

export function acceptCoachJob(state, jobId) {
  const next = cloneState(state);
  if (!next.coach) return next;
  const job = next.coach.jobOffers.find((item) => item.id === jobId);
  if (!job) return next;
  const clubPool = CLUBS.filter((item) => item.league === (job.level === "青年" ? "csl2" : "csl") || (job.level === "青年" && item.league === "csl"));
  const club = clubPool[0] || CLUBS.find((item) => item.league === "csl2");
  next.coach.clubId = club.id;
  next.coach.club = club.name;
  next.coach.contract = { weeklyWage: job.wage, years: 2 };
  next.coach.formation = "4-2-3-1";
  next.coach.trainingFocus = "控球推进";
  next.coach.morale = 60;
  next.coach.budget = 800000 + club.reputation * 8000;
  next.coach.transfers = [];
  next.coach.lineup = { starters: [], bench: [] };
  next.coach.squad = (next.world.players || []).filter((player) => player.clubId === club.id).slice(0, 18);
  next.coach.seasonStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  next.coach.careerStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  next.coach.jobOffers = [];
  next.world.phase = "coach";
  next.world.week = 1;
  next.world.date = `${next.world.season + 1}-07-01`;
  next.world.transferWindows = LEAGUE_RULES[club.league]?.transferWindows || next.world.transferWindows;
  next.season = createSeason(club, next.world.season + 1, `${next.seed}|coach`);
  next.season.index = 0;
  setRelatedSimulationPrecision(next, club.id);
  next.feed.unshift({ time: next.world.date, title: "教练生涯", text: `你成为${club.name}的${job.name}。` });
  return next;
}

function coachSeasonEnd(state) {
  let next = cloneState(state);
  const stats = next.coach.seasonStats || { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  next.coach.careerStats = next.coach.careerStats || { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  next.coach.careerStats.wins += stats.wins || 0;
  next.coach.careerStats.draws += stats.draws || 0;
  next.coach.careerStats.losses += stats.losses || 0;
  next.coach.careerStats.goalsFor += stats.goalsFor || 0;
  next.coach.careerStats.goalsAgainst += stats.goalsAgainst || 0;
  next.coach.careerStats.matches += stats.matches || 0;
  const fixtures = next.season?.fixtures || [];
  const points = stats.wins * 3 + stats.draws;
  const finish = Math.max(1, Math.min(20, Math.round(20 - points * 2.2)));
  const wonTitle = finish <= 2;
  const underPressure = finish >= 14;
  next.coach.contract.years = Math.max(0, (next.coach.contract?.years || 2) - 1);
  next.coach.reputation = clamp(next.coach.reputation + (wonTitle ? 5 : underPressure ? -2 : 1), 20, 99);
  if (next.coach.reputation >= 85 && next.coach.license !== "A级") {
    next.coach.license = "A级";
    next.feed.unshift({ time: next.world.date, title: "教练证书升级", text: "你通过 A 级教练证书考核，开始被列入更高级别候选名单。" });
  }
  next.career.milestones.push(`${next.world.season}:教练赛季结束，最终排名约第 ${finish} 位`);
  if (wonTitle) next.feed.unshift({ time: next.world.date, title: "教练赛季冠军", text: "你带队赢得赛季冠军，董事会和更衣室都认可你的计划。" });
  if (underPressure) next.feed.unshift({ time: next.world.date, title: "下课风险", text: "赛季末排名靠后，董事会开始评估你的位置。" });
  if (next.coach.contract.years <= 0) {
    next.coach.jobOffers = COACH_JOBS.filter((job) => next.coach.reputation >= job.minReputation).map((job) => ({ ...job, selected: false }));
    next.feed.unshift({ time: next.world.date, title: "合同到期", text: "你的教练合同到期，市场上出现了新的机会。" });
  }
  const club = CLUBS.find((item) => item.id === next.coach.clubId);
  next.world.season += 1;
  next.world.week = 1;
  next.world.date = `${next.world.season}-07-01`;
  next.season = createSeason(club, next.world.season, `${next.seed}|coach`);
  next.season.index = 0;
  next.coach.seasonStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  return next;
}

function advanceCoachWeek(state) {
  let next = cloneState(state);
  if (!next.coach) return next;
  next = advanceWorldSimulations(next);
  if (!next.season) {
    next.season = createSeason(CLUBS.find((item) => item.id === next.coach.clubId), next.world.season, `${next.seed}|coach`);
  }
  const fixture = next.season.fixtures[next.season.index];
  if (!fixture) {
    return coachSeasonEnd(next);
  }
  const roll = deterministicRoll(`${next.seed}|coach|${fixture.id}`);
  const clubStrength = CLUBS.find((item) => item.id === next.coach.clubId)?.reputation || 55;
  const opponentStrength = fixtureStrength(fixture, fixture.home?.id === next.coach.clubId ? "away" : "home");
  const trainingEdge = next.coach.trainingFocus === "高位压迫" ? 0.12 : next.coach.trainingFocus === "定位球" ? 0.1 : next.coach.trainingFocus === "反击速度" ? 0.08 : 0;
  const moraleEdge = ((next.coach.morale || 60) - 60) / 100;
  const lineupEdge = next.coach.lineup?.starters?.length >= 11 ? 0.08 : -0.12;
  const edge = (clubStrength - opponentStrength) / 25 + (roll - 0.5) * 1.6 + next.coach.leadership / 50 + trainingEdge + moraleEdge + lineupEdge;
  const goalsFor = Math.max(0, Math.round(0.9 + edge + (roll - 0.4) * 1.2));
  const goalsAgainst = Math.max(0, Math.round(0.8 - edge + (roll - 0.6) * 1.1));
  next.season.results.push({ id: fixture.id, round: fixture.round, home: fixture.home, away: fixture.away, score: [goalsFor, goalsAgainst], coach: true });
  fixture.played = true;
  fixture.score = [goalsFor, goalsAgainst];
  fixture.result = goalsFor > goalsAgainst ? "win" : goalsFor === goalsAgainst ? "draw" : "loss";
  updateStandings(next, { home: fixture.home, away: fixture.away, homeGoals: goalsFor, awayGoals: goalsAgainst });
  next.coach.seasonStats.wins += fixture.result === "win" ? 1 : 0;
  next.coach.seasonStats.draws += fixture.result === "draw" ? 1 : 0;
  next.coach.seasonStats.losses += fixture.result === "loss" ? 1 : 0;
  next.coach.seasonStats.goalsFor += goalsFor;
  next.coach.seasonStats.goalsAgainst += goalsAgainst;
  next.coach.seasonStats.matches = (next.coach.seasonStats.matches || 0) + 1;
  next.coach.morale = clamp((next.coach.morale || 60) + (fixture.result === "win" ? 2 : fixture.result === "loss" ? -2 : 0.5), 0, 100);
  next.coach.reputation = clamp(next.coach.reputation + (fixture.result === "win" ? 0.4 : fixture.result === "loss" ? -0.3 : 0.05), 20, 99);
  next.world.date = fixture.date;
  next.world.week += 1;
  next.season.index += 1;
  next.feed.unshift({ time: fixture.date, title: `执教第 ${fixture.round} 轮`, text: `${fixture.home?.name} ${goalsFor}—${goalsAgainst} ${fixture.away?.name}。` });
  return next;
}

export function retireCoach(state) {
  const next = cloneState(state);
  if (!next.coach) return next;
  next.coach.retired = true;
  next.world.phase = "final";
  next.feed.unshift({ time: next.world.date, title: "教练退役", text: "你决定结束执教生涯，最终人生报告开始生成。" });
  return next;
}

export function buildLifeReport(state) {
  const player = state.player;
  const career = state.career.totalStats;
  const coach = state.coach;
  const themeChecks = [
    ["冠军收割者", career.titles.length >= 3],
    ["一生一队传奇", career.appearances >= 300 && (state.player.academyClubId === state.player.clubId)],
    ["纪录粉碎机", (state.records || []).length >= 3],
    ["商业帝国缔造者", state.finances.careerEarnings > 3000000],
    ["国家队救世主", (state.nationalTeam.goals || 0) >= 20],
    ["浴火重生者", (state.psychology.scars || []).length >= 1 && career.appearances >= 200],
    ["足球传道者", (coach?.careerStats?.wins || 0) >= 50 || (state.mentor?.disciples || []).length >= 1],
    ["文化符号", state.media.fans >= 20000000]
  ];
  const themes = themeChecks.filter(([, active]) => active).map(([name]) => name);
  if (!themes.length) themes.push("足球旅人");
  return {
    playerName: player.name,
    themes,
    playerStats: career,
    coachStats: coach?.seasonStats || null,
    report: `${player.name}结束了漫长的足球人生。作为球员，他留下 ${career.appearances} 场、${career.goals} 球、${career.assists} 次助攻；${coach ? `作为教练，他带队取得 ${(coach.careerStats?.wins || coach.seasonStats?.wins || 0)} 场胜利。` : "他没有走向教练席。"}他的一生被概括为：${themes.join("、")}。`
  };
}

export function advanceWeek(state) {
  const before = cloneState(state);
  let next = before;
  if (next.match?.status === "live") return next;
  if (next.match?.status === "ready") return next;
  if (next.world.phase === "academy") return advanceAcademyWeek(next);
  if (next.world.phase === "season") return advanceSeasonWeek(next);
  if (next.world.phase === "offseason") return advanceOffseasonWeek(next);
  if (next.world.phase === "coach") return advanceCoachWeek(next);
  return next;
}

function attachWeeklyChapter(state, next) {
  const facts = collectWeeklyFacts(state, next);
  const chapter = buildChapter({
    state: next,
    facts,
    lengthMode: next.settings?.lengthMode || "standard"
  });
  return rememberChapter(next, chapter);
}

export function advanceWeekWithChapter(state) {
  const before = cloneState(state);
  const next = advanceWeek(state);
  const changed =
    next.world?.date !== state.world?.date ||
    next.world?.week !== state.world?.week ||
    next.world?.phase !== state.world?.phase ||
    (next.feed?.length || 0) !== (state.feed?.length || 0) ||
    Boolean(next.match) !== Boolean(state.match);
  return changed ? attachWeeklyChapter(before, next) : next;
}

export function simulateToRetirement(state, options = {}) {
  let next = cloneState(state);
  let safety = 0;
  while (!next.player.retired && safety < 20000) {
    safety += 1;
    if (next.match?.status === "live") {
      if (next.match.screen === "decision") {
        const moment = next.match.moments[next.match.currentMoment];
        next = chooseMatchAction(next, moment.choices[0].id);
      } else {
        next = continueMatch(next);
      }
      continue;
    }
    if (next.match?.status === "ready") {
      next = startCurrentMatch(next);
      continue;
    }
    if (next.world.phase === "contract") {
      next = acceptOffer(next, next.offers[0]?.id || "shenhua");
      continue;
    }
    if (next.world.phase === "retirement") {
      next = retirePlayer(next);
      if (options.coach && next.coach?.jobOffers?.length) next = acceptCoachJob(next, next.coach.jobOffers[0].id);
      else break;
      continue;
    }
    next = advanceWeek(next);
  }
  return next;
}

export async function simulateToRetirementChunked(state, options = {}) {
  const {
    coach = true,
    chunkMs = 12,
    frameMs = 1,
    onProgress = null,
    signal = null
  } = options;
  let next = structuredClone(state);
  let safety = 0;
  let cancelled = false;
  const tick = () => new Promise((resolve) => setTimeout(resolve, frameMs));
  while (!next.player.retired && safety < 20000 && !(signal?.aborted)) {
    const started = performance.now();
    while (performance.now() - started < chunkMs && safety < 20000 && !(signal?.aborted) && !next.player.retired) {
      safety += 1;
      if (next.match?.status === "live") {
        if (next.match.screen === "decision") {
          const moment = next.match.moments[next.match.currentMoment];
          next = chooseMatchAction(next, moment.choices[0].id);
        } else {
          next = continueMatch(next);
        }
        continue;
      }
      if (next.match?.status === "ready") {
        next = startCurrentMatch(next);
        continue;
      }
      if (next.world.phase === "contract") {
        next = acceptOffer(next, next.offers[0]?.id || "shenhua");
        continue;
      }
      if (next.world.phase === "retirement") {
        next = retirePlayer(next);
        if (coach && next.coach?.jobOffers?.length) next = acceptCoachJob(next, next.coach.jobOffers[0].id);
        else break;
        continue;
      }
      next = advanceWeekWithChapter(next);
    }
    onProgress?.({
      progress: Math.min(100, Math.round((safety / 20000) * 100)),
      week: next.world?.week || 0,
      phase: next.world?.phase || "",
      iterations: safety,
      durationMs: Math.round((performance.now() - started) * 100) / 100
    });
    await tick();
  }
  if (signal?.aborted) cancelled = true;
  return { state: cancelled ? structuredClone(state) : next, cancelled };
}

export function simulateSeason(state, options = {}) {
  let next = cloneState(state);
  let safety = 0;
  while (next.world.phase === "season" && safety < 1000) {
    safety += 1;
    if (next.match?.status === "live") {
      if (next.match.screen === "decision") {
        const moment = next.match.moments[next.match.currentMoment];
        next = chooseMatchAction(next, moment.choices[0].id);
      } else {
        next = continueMatch(next);
      }
    } else if (next.match?.status === "ready") {
      next = startCurrentMatch(next);
    } else {
      next = advanceWeek(next);
    }
  }
  return next;
}

export function simulateCoachSeason(state) {
  let next = cloneState(state);
  const targetSeason = next.world.season;
  let safety = 0;
  while (next.world.phase === "coach" && next.world.season === targetSeason && safety < 2000) {
    safety += 1;
    next = advanceWeek(next);
  }
  return next;
}

export function exportState(state) {
  return JSON.stringify(structuredClone(state), null, 2);
}

export function importState(json, storage = globalThis.localStorage) {
  const parsed = JSON.parse(json);
  let next = migrate(parsed);
  if (storage && listSaves(storage).some((save) => save.id === next.id)) {
    next = { ...next, id: `${next.id}-import-${Date.now()}` };
  }
  if (storage) saveState(next, storage);
  return next;
}

export { DATA_SOURCE_NOTES };
export { applyNarrativeChoice, cacheAiChapter, chapterLibrary, markChapterRead, microSceneForAction, seasonMontage } from "./narrative.js";
export * from "./systems.js";
