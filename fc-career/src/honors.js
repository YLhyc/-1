export const HONORS_VERSION = 1;

const CLUB_WORDS = ["联赛", "杯", "冠军", "俱乐部", "足协", "超级杯"];
const NATIONAL_WORDS = ["国家队", "世界杯", "亚洲杯", "欧洲杯", "奥运"];

function text(value) {
  return String(value ?? "").trim();
}

function categoryFor(value, fallback = "individual") {
  const label = text(value);
  if (NATIONAL_WORDS.some((word) => label.includes(word))) return "national";
  if (CLUB_WORDS.some((word) => label.includes(word))) return "club";
  if (label.includes("隐藏")) return "hidden";
  return fallback;
}

function stableId(prefix, value, index) {
  return `${prefix}-${index}-${text(value).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "honor"}`;
}

export function normalizeHonor(input, index = 0, defaults = {}) {
  const value = typeof input === "string" ? { title: input } : (input || {});
  const title = text(value.title || value.award || value.name || "未命名荣誉");
  const season = Number(value.season) || defaults.season || null;
  const category = value.category || categoryFor(title, defaults.category);
  return {
    id: text(value.id) || stableId(`honor-${category}`, title, index),
    category,
    title,
    awardId: value.awardId || value.award || defaults.awardId || null,
    season,
    clubId: value.clubId || defaults.clubId || null,
    competitionId: value.competitionId || value.leagueId || defaults.competitionId || null,
    nation: value.nation || value.nationality || defaults.nation || null,
    count: Math.max(1, Number(value.count) || 1),
    won: value.won !== false,
    date: value.date || defaults.date || null,
    source: value.source || defaults.source || "runtime",
    migrated: Boolean(value.migrated || defaults.migrated)
  };
}

function appendUnique(target, honor) {
  const existing = target.find((item) => item.id === honor.id);
  if (existing) {
    existing.count = Math.max(existing.count || 1, honor.count || 1);
    existing.won = existing.won || honor.won;
    return existing;
  }
  target.push(honor);
  return honor;
}

export function migrateHonors(state) {
  const next = state;
  const structured = Array.isArray(next.honors) ? next.honors : [];
  next.honors = structured.map((honor, index) => normalizeHonor(honor, index));
  const defaults = {
    clubId: next.player?.clubId || next.contract?.clubId || null,
    competitionId: next.season?.leagueId || null,
    nation: next.nationalTeam?.committedNation || next.player?.nationality || null,
    date: next.world?.date || null,
    source: "legacy-migration",
    migrated: true
  };
  const titles = next.career?.totalStats?.titles;
  if (Array.isArray(titles)) {
    titles.forEach((title, index) => appendUnique(next.honors, normalizeHonor(title, index, { ...defaults, category: "club" })));
  }
  if (Array.isArray(next.awards)) {
    next.awards = next.awards.map((award, index) => {
      const normalized = normalizeHonor(award, index, defaults);
      appendUnique(next.honors, normalized);
      return { ...award, awardId: award.awardId || normalized.awardId, category: award.category || normalized.category };
    });
  } else {
    next.awards = [];
  }
  if (Array.isArray(next.hiddenTitles)) {
    next.hiddenTitles = next.hiddenTitles.map((hidden, index) => {
      const normalized = normalizeHonor(typeof hidden === "string" ? hidden : { ...hidden, title: hidden.title }, index, { ...defaults, category: "hidden" });
      appendUnique(next.honors, normalized);
      return typeof hidden === "string" ? { title: hidden, season: normalized.season, date: normalized.date } : hidden;
    });
  } else {
    next.hiddenTitles = [];
  }
  next.honorsVersion = HONORS_VERSION;
  return next;
}

export function addHonor(state, input, defaults = {}) {
  const next = state;
  next.honors = Array.isArray(next.honors) ? next.honors : [];
  const honor = normalizeHonor(input, next.honors.length, {
    season: next.world?.season,
    clubId: next.player?.clubId || next.contract?.clubId,
    competitionId: next.season?.leagueId || null,
    nation: next.nationalTeam?.committedNation || next.player?.nationality,
    date: next.world?.date,
    ...defaults
  });
  appendUnique(next.honors, honor);
  return honor;
}

export function honorsByCategory(state, category) {
  return (state?.honors || []).filter((honor) => honor.category === category);
}

export function honorCounts(state) {
  return (state?.honors || []).reduce((counts, honor) => {
    counts[honor.category] = (counts[honor.category] || 0) + (honor.won ? honor.count : 0);
    return counts;
  }, {});
}
