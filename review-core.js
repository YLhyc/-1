(function(global) {
  'use strict';
  var REVIEW_META_KEY = 'review_meta_v1';
  var EXCLUDED_KEY = 'review_excluded_v1';
  var ACTIVITY_KEY = 'learning_activity_v1';
  var RECALL_KEY = 'recall_quality_v1';
  var ACTIVITY_DIRTY_KEY = 'learning_activity_dirty_v1';
  var EXAM_DATE_KEY = 'exam_date_v1';
  var SPRINT_MODE_KEY = 'sprint_mode_v1';
  var DEFAULT_EXAM_DATE = '2026-12-19';
  var DAY_MS = 86400000;
  var excludedCache = null;

  function safeJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e) { return fallback; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, String(val)); return true; }
    catch(e) { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); return true; }
    catch(e) { return false; }
  }
  function isObject(obj) { return !!obj && typeof obj === 'object' && !Array.isArray(obj); }
  function localDayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function getExamDate() {
    try {
      var v = localStorage.getItem(EXAM_DATE_KEY);
      if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    } catch (e) {}
    return DEFAULT_EXAM_DATE;
  }
  function setExamDate(dateStr) {
    var clean = String(dateStr || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) clean = DEFAULT_EXAM_DATE;
    safeSet(EXAM_DATE_KEY, clean);
    return clean;
  }
  function isSprintMode() {
    try { return localStorage.getItem(SPRINT_MODE_KEY) === '1'; }
    catch (e) { return false; }
  }
  function setSprintMode(enabled) {
    if (enabled) safeSet(SPRINT_MODE_KEY, '1');
    else safeRemove(SPRINT_MODE_KEY);
    return !!enabled;
  }
  function getExamDaysLeft(now) {
    var at = Number(now) || Date.now();
    var ts = new Date(getExamDate() + 'T09:00:00').getTime();
    if (!isFinite(ts)) return 0;
    return Math.ceil((ts - at) / DAY_MS);
  }
  function getExamCapDueAt(now) {
    var at = Number(now) || Date.now();
    var ts = new Date(getExamDate() + 'T09:00:00').getTime();
    if (!isFinite(ts) || ts <= at) return 0;
    var capAt = ts - 3 * DAY_MS;
    if (capAt < at + DAY_MS) return 0;
    return capAt;
  }
  function getHighFreqWrongItems(options) {
    var opts = options || {};
    var minLapses = Number(opts.minLapses) || 2;
    var minHardHits = Number(opts.minHardHits) || 2;
    var meta = loadReviewMeta(), excluded = loadExcluded(), items = [], seen = Object.create(null);
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key], split = key.indexOf(':');
      if (!entry || split < 1) return;
      var canonical = reviewSource(key.slice(0, split)), en = key.slice(split + 1);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(canonical, en))) return;
      var dedupeKey = canonical + ':' + en;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      var lapses = Number(entry.lapses) || 0, hardHits = Number(entry.hardHits) || 0;
      if (lapses < minLapses && hardHits < minHardHits) return;
      var tier = (canonical === 'vocab' || canonical === 'sprint') ? 1 : 2;
      items.push({
        source: canonical, en: en, lapses: lapses, hardHits: hardHits,
        dueAt: effectiveDueAt(entry), lastRating: entry.lastRating || '', tier: tier
      });
    });
    items.sort(function(a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      var scoreA = a.hardHits * 3 + a.lapses * 2;
      var scoreB = b.hardHits * 3 + b.lapses * 2;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.dueAt || 0) - (b.dueAt || 0);
    });
    return items;
  }

  function loadReviewMeta() { return safeJson(REVIEW_META_KEY, {}); }
  function saveReviewMeta(meta) { safeSet(REVIEW_META_KEY, JSON.stringify(meta || {})); }
  function loadExcluded() {
    if (excludedCache) return excludedCache;
    excludedCache = safeJson(EXCLUDED_KEY, {});
    return excludedCache;
  }
  function saveExcluded(data) {
    excludedCache = data || {};
    if (data && Object.keys(data).length) safeSet(EXCLUDED_KEY, JSON.stringify(data));
    else safeRemove(EXCLUDED_KEY);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }
  if (global.addEventListener) {
    global.addEventListener('storage', function(event) {
      if (event && event.key === EXCLUDED_KEY) excludedCache = null;
    });
  }
  function exclusionKey(source, en) { return reviewSource(source) + ':' + en; }
  function isExcluded(source, en) {
    return Object.prototype.hasOwnProperty.call(loadExcluded(), exclusionKey(source, en));
  }
  function cloneValue(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch(e) { return value; }
  }
  function archive(source, en, info) {
    var canonical = reviewSource(source), key = exclusionKey(canonical, en);
    var excluded = loadExcluded(), meta = loadReviewMeta();
    if (excluded[key]) return excluded[key];
    var prefsKey = preferenceStorageKey(canonical), prefs = safeJson(prefsKey, {});
    var hadPref = Object.prototype.hasOwnProperty.call(prefs, en);
    excluded[key] = {
      source: canonical, en: en, meaning: info && info.meaning ? String(info.meaning) : '',
      archivedAt: Date.now(), reason: info && info.reason ? String(info.reason) : 'manual',
      hadPref: hadPref, oldPref: hadPref ? prefs[en] : null,
      oldReview: meta[key] ? cloneValue(meta[key]) : null
    };
    prefs[en] = 'hidden';
    safeSet(prefsKey, JSON.stringify(prefs));
    if (meta[key]) { delete meta[key]; saveReviewMeta(meta); }
    saveExcluded(excluded);
    return excluded[key];
  }
  function restore(source, en) {
    var canonical = reviewSource(source), key = exclusionKey(canonical, en), excluded = loadExcluded();
    var entry = excluded[key];
    if (!entry) return false;
    var prefsKey = preferenceStorageKey(canonical), prefs = safeJson(prefsKey, {});
    if (entry.hadPref) prefs[en] = entry.oldPref;
    else delete prefs[en];
    if (Object.keys(prefs).length) safeSet(prefsKey, JSON.stringify(prefs));
    else safeRemove(prefsKey);
    var meta = loadReviewMeta();
    var now = Date.now();
    if (entry.oldReview && isObject(entry.oldReview)) {
      var restored = cloneValue(entry.oldReview);
      restored.lastReviewAt = now;
      if (restored.hardDueAt) restored.hardDueAt = now;
      if (restored.nextDueAt) restored.nextDueAt = now;
      if (!restored.nextDueAt && !restored.hardDueAt) restored.nextDueAt = now;
      meta[key] = restored;
    } else {
      meta[key] = { streak: 0, lapses: 0, hardHits: 0, intervalDays: 1, lastReviewAt: now, nextDueAt: now };
    }
    saveReviewMeta(meta);
    delete excluded[key]; saveExcluded(excluded);
    return true;
  }
  function reviewSource(source) {
    if (source === 'hb') return 'hongbaoshu';
    if (source === 'sp') return 'sprint';
    return source;
  }
  function preferenceStorageKey(source) {
    var s = reviewSource(source);
    if (s === 'hongbaoshu' || s === 'hb') return 'hb_prefs';
    if (s === 'uf') return 'uf_prefs';
    if (s === 'wb' || s === 'wordbank') return 'wb_prefs';
    if (s === 'sp' || s === 'sprint') return 'sp_prefs';
    return 'vv_prefs';
  }
  function normalizeRating(value) {
    if (value === true) return 'familiar';
    if (value === false) return 'forget';
    if (typeof value === 'string') {
      var s = value.toLowerCase().trim();
      if (s === 'familiar' || s === 'forget' || s === 'uncertain' || s === 'mastered') return s;
      if (s === 'hard') return 'forget';
      if (s === 'easy') return 'mastered';
    }
    return 'forget';
  }
  function applyRating(source, en, ratingOrFamiliar, mode, options) {
    var rating = normalizeRating(ratingOrFamiliar);
    var isFamiliar = (rating === 'familiar' || rating === 'mastered');
    var storageKey = preferenceStorageKey(source), prefs = safeJson(storageKey, {});
    var hadPref = Object.prototype.hasOwnProperty.call(prefs, en);
    var oldPref = hadPref ? prefs[en] : null;
    prefs[en] = isFamiliar ? 'familiar' : 'hard';
    safeSet(storageKey, JSON.stringify(prefs));
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
    var opts = options || {}, oldReview = null, reviewApplied = false;
    var canonicalSource = reviewSource(source);
    var reviewBefore = mode === 'recite' ? loadReviewMeta()[canonicalSource + ':' + en] : null;
    var recallOutcome = null;
    if (mode === 'recite' || (mode === 'morning' && opts.reviewDue)) {
      oldReview = rateReview(canonicalSource, en, rating, opts);
      reviewApplied = true;
    } else if (!isFamiliar) {
      oldReview = scheduleHardOnly(canonicalSource, en);
      reviewApplied = true;
    }
    if (mode === 'recite') {
      recallOutcome = recordRecallOutcome(canonicalSource, en, rating, 'recite', {
        delayed: wasScheduledRecall(reviewBefore)
      });
    }
    return {
      source: canonicalSource, en: en, hadPref: hadPref, oldPref: oldPref,
      oldReview: oldReview, reviewApplied: reviewApplied,
      familiar: isFamiliar, rating: rating,
      mode: mode || 'listen', recallOutcome: recallOutcome
    };
  }
  function undoRating(state) {
    if (!state || !state.en) return;
    var storageKey = preferenceStorageKey(state.source), prefs = safeJson(storageKey, {});
    if (state.hadPref) prefs[state.en] = state.oldPref;
    else delete prefs[state.en];
    if (Object.keys(prefs).length) safeSet(storageKey, JSON.stringify(prefs));
    else safeRemove(storageKey);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
    if (state.reviewApplied) undoReview(state.source, state.en, state.oldReview || {});
    if (state.recallOutcome) undoRecallOutcome(state.recallOutcome);
  }
  function rateReview(source, en, ratingOrFamiliar, options) {
    var rating = normalizeRating(ratingOrFamiliar);
    var canonical = reviewSource(source);
    var meta = loadReviewMeta(), key = canonical + ':' + en;
    var legacyKey = (canonical === 'hongbaoshu' ? 'hb:' + en : null);
    var old = meta[key] || (legacyKey ? meta[legacyKey] : null) || {};
    if (legacyKey && meta[legacyKey]) delete meta[legacyKey];
    var opts = options || {};
    var next = {
      streak: Number(old.streak) || 0,
      lapses: Number(old.lapses) || 0,
      intervalDays: Number(old.intervalDays) || 0,
      hardHits: Number(old.hardHits) || 0,
      lastRating: rating
    };
    var now = Number(opts.now) || Date.now();
    if (rating === 'familiar') {
      next.streak++;
      var intervals = [1, 3, 7, 14, 30, 60, 120];
      var baseInterval = next.streak <= intervals.length ? intervals[next.streak - 1] : Math.round((Number(old.intervalDays) || 60) * 1.8);
      if (baseInterval >= 7 && opts.jitter !== false) {
        var jitterRatio = 0.85 + Math.random() * 0.3;
        next.intervalDays = Math.max(5, Math.round(baseInterval * jitterRatio));
      } else {
        next.intervalDays = baseInterval;
      }
      next.hardDueAt = 0;
      next.hardHits = 0;
    } else if (rating === 'mastered') {
      next.streak = Math.max(next.streak, 7) + 2;
      next.intervalDays = 36500;
      next.hardDueAt = 0;
      next.hardHits = 0;
    } else if (rating === 'uncertain') {
      next.streak = Math.max(0, Math.floor(next.streak * 0.5));
      next.hardHits++;
      var prevInterval = old.lastRating === 'mastered' ? 14 : Math.min(30, Number(old.intervalDays) || 2);
      next.intervalDays = Math.max(1, Math.round(prevInterval * 0.5));
      next.hardDueAt = now + next.intervalDays * DAY_MS;
    } else {
      next.streak = 0;
      next.lapses++;
      next.hardHits++;
      next.intervalDays = 1;
      next.hardDueAt = now + next.intervalDays * DAY_MS;
    }
    next.lastReviewAt = now;
    next.nextDueAt = next.lastReviewAt + next.intervalDays * DAY_MS;
    if (rating === 'familiar' && (isSprintMode() || opts.examCap)) {
      var capAt = getExamCapDueAt(now);
      if (capAt && next.nextDueAt > capAt) {
        next.nextDueAt = Math.max(now + DAY_MS, capAt);
        next.intervalDays = Math.max(1, Math.round((next.nextDueAt - now) / DAY_MS));
        next.examCapped = true;
      }
    }
    meta[key] = next;
    saveReviewMeta(meta);
    return old;
  }
  function scheduleHardOnly(source, en) {
    var canonical = reviewSource(source);
    var meta = loadReviewMeta(), key = exclusionKey(canonical, en);
    var legacyKey = (canonical === 'hongbaoshu' ? 'hb:' + en : null);
    var old = meta[key] || (legacyKey ? meta[legacyKey] : null) || {};
    if (legacyKey && meta[legacyKey]) delete meta[legacyKey];
    var hardHits = Number(old.hardHits) || 0;
    if (!hardHits && Number(old.lapses) > 0) hardHits = 1;
    hardHits++;
    var interval = 1;
    var now = Date.now();
    var due = now + interval * DAY_MS;
    meta[key] = {
      streak: 0, lapses: (Number(old.lapses) || 0) + 1, hardHits: hardHits,
      intervalDays: interval, lastReviewAt: now,
      hardDueAt: due,
      nextDueAt: due,
      lastRating: 'forget'
    };
    saveReviewMeta(meta);
    return old;
  }
  function undoReview(source, en, old) {
    var canonical = reviewSource(source);
    var meta = loadReviewMeta(), key = canonical + ':' + en;
    var legacyKey = (canonical === 'hongbaoshu' ? 'hb:' + en : null);
    if (legacyKey && meta[legacyKey]) delete meta[legacyKey];
    if (old && Object.keys(old).length) meta[key] = old; else delete meta[key];
    if (Object.keys(meta).length) saveReviewMeta(meta); else safeRemove(REVIEW_META_KEY);
  }
  function loadRecallQuality() { return safeJson(RECALL_KEY, { days: {} }); }
  function saveRecallQuality(data) {
    var days = data && isObject(data.days) ? data.days : {};
    var cutoff = Date.now() - 90 * DAY_MS;
    Object.keys(days).forEach(function(day) {
      var ts = new Date(day + 'T00:00:00').getTime();
      if (!isFinite(ts) || ts < cutoff) delete days[day];
    });
    if (Object.keys(days).length) safeSet(RECALL_KEY, JSON.stringify({ days: days }));
    else safeRemove(RECALL_KEY);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }
  function wasScheduledRecall(entry, at) {
    if (!isObject(entry) || !Number(entry.lastReviewAt)) return false;
    var due = effectiveDueAt(entry);
    return due > 0 && due <= (at || Date.now());
  }
  function recordRecallOutcome(source, en, familiarOrRating, mode, options) {
    if (!source || !en) return null;
    var rating = normalizeRating(familiarOrRating);
    var isFamiliar = (rating === 'familiar' || rating === 'mastered');
    var opts = options || {}, at = Number(opts.at) || Date.now(), day = localDayKey(at);
    var data = loadRecallQuality();
    if (!isObject(data.days)) data.days = {};
    var bucket = data.days[day] || { total: 0, familiar: 0, hard: 0, delayed: 0, delayedFamiliar: 0, delayedHard: 0, practice: 0, modes: {}, ratings: {} };
    if (!isObject(bucket.modes)) bucket.modes = {};
    if (!isObject(bucket.ratings)) bucket.ratings = {};
    bucket.total = (Number(bucket.total) || 0) + 1;
    if (isFamiliar) bucket.familiar = (Number(bucket.familiar) || 0) + 1;
    else bucket.hard = (Number(bucket.hard) || 0) + 1;
    bucket.ratings[rating] = (Number(bucket.ratings[rating]) || 0) + 1;
    if (opts.delayed) {
      bucket.delayed = (Number(bucket.delayed) || 0) + 1;
      if (isFamiliar) bucket.delayedFamiliar = (Number(bucket.delayedFamiliar) || 0) + 1;
      else bucket.delayedHard = (Number(bucket.delayedHard) || 0) + 1;
    }
    if (opts.practice) bucket.practice = (Number(bucket.practice) || 0) + 1;
    mode = mode || 'recite';
    bucket.modes[mode] = (Number(bucket.modes[mode]) || 0) + 1;
    bucket.updatedAt = at;
    data.days[day] = bucket;
    saveRecallQuality(data);
    return { day: day, familiar: isFamiliar, rating: rating, delayed: !!opts.delayed, practice: !!opts.practice, mode: mode };
  }
  function undoRecallOutcome(event) {
    if (!event || !event.day) return;
    var data = loadRecallQuality(), bucket = data.days && data.days[event.day];
    if (!bucket) return;
    function dec(key) { bucket[key] = Math.max(0, (Number(bucket[key]) || 0) - 1); }
    dec('total');
    dec(event.familiar ? 'familiar' : 'hard');
    if (event.rating && bucket.ratings && bucket.ratings[event.rating]) {
      bucket.ratings[event.rating] = Math.max(0, (Number(bucket.ratings[event.rating]) || 0) - 1);
    }
    if (event.delayed) {
      dec('delayed');
      dec(event.familiar ? 'delayedFamiliar' : 'delayedHard');
    }
    if (event.practice) dec('practice');
    if (bucket.modes && bucket.modes[event.mode]) {
      bucket.modes[event.mode]--;
      if (bucket.modes[event.mode] <= 0) delete bucket.modes[event.mode];
    }
    bucket.updatedAt = Date.now();
    if (!bucket.total) delete data.days[event.day];
    saveRecallQuality(data);
  }
  function effectiveDueAt(entry) {
    if (!entry || !isObject(entry)) return 0;
    var hardDue = Number(entry.hardDueAt) || 0;
    var nextDue = Number(entry.nextDueAt) || 0;
    var rating = entry.lastRating;
    if (rating === 'familiar' || rating === 'mastered') {
      return nextDue;
    }
    if (hardDue > 0 && nextDue > 0) {
      return Math.min(hardDue, nextDue);
    }
    return hardDue || nextDue || 0;
  }
  function getDueReviewItems(now) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), at = now || Date.now(), items = [];
    var seen = Object.create(null);
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      var split = key.indexOf(':');
      if (!entry || split < 1) return;
      var rawSource = key.slice(0, split), en = key.slice(split + 1);
      var canonical = reviewSource(rawSource);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(canonical, en))) return;
      var dueAt = effectiveDueAt(entry);
      if (!dueAt || dueAt > at) return;
      var dedupeKey = canonical + ':' + en;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      items.push({ source: canonical, en: en, dueAt: dueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function getHardDueReviewItems(now) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), at = now || Date.now(), items = [];
    var seen = Object.create(null);
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key], split = key.indexOf(':');
      if (!entry || split < 1) return;
      var rawSource = key.slice(0, split), en = key.slice(split + 1);
      var canonical = reviewSource(rawSource);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(canonical, en))) return;
      if (!entry.hardDueAt || entry.hardDueAt > at) return;
      var dedupeKey = canonical + ':' + en;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      items.push({ source: canonical, en: en, dueAt: entry.hardDueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function upcomingReviewCount(hours) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), now = Date.now(), end = now + (hours || 24) * 3600000, count = 0;
    var seen = Object.create(null);
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      var split = key.indexOf(':');
      if (!entry || split < 1) return;
      var rawSource = key.slice(0, split), en = key.slice(split + 1);
      var canonical = reviewSource(rawSource);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(canonical, en))) return;
      var dedupeKey = canonical + ':' + en;
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      var due = effectiveDueAt(entry);
      if (due > now && due <= end) count++;
    });
    return count;
  }
  function loadLearningActivity() { return safeJson(ACTIVITY_KEY, { days: {} }); }
  function saveLearningActivity(activity) {
    var days = activity && isObject(activity.days) ? activity.days : {};
    var cutoff = Date.now() - 90 * DAY_MS;
    Object.keys(days).forEach(function(day) {
      var ts = new Date(day + 'T00:00:00').getTime();
      if (!isFinite(ts) || ts < cutoff) delete days[day];
    });
    safeSet(ACTIVITY_KEY, JSON.stringify({ days: days }));
  }
  function recordLearningActivity(source, en, mode) {
    if (!source || !en) return;
    var canonical = reviewSource(source);
    var activity = loadLearningActivity();
    if (!isObject(activity.days)) activity.days = {};
    var day = localDayKey();
    var bucket = activity.days[day] || { words: {}, modes: {}, updatedAt: 0 };
    if (!isObject(bucket.words)) bucket.words = {};
    if (!isObject(bucket.modes)) bucket.modes = {};
    var key = canonical + ':' + en;
    bucket.words[key] = (bucket.words[key] || 0) + 1;
    mode = mode || canonical;
    bucket.modes[mode] = (bucket.modes[mode] || 0) + 1;
    bucket.updatedAt = Date.now();
    activity.days[day] = bucket;
    saveLearningActivity(activity);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }
  function undoLearningActivity(source, en, mode) {
    var activity = loadLearningActivity(), day = localDayKey();
    var bucket = activity.days && activity.days[day];
    if (!bucket || !bucket.words) return;
    var canonical = reviewSource(source);
    var key = canonical + ':' + en;
    var targetKey = bucket.words[key] ? key : (bucket.words[source + ':' + en] ? source + ':' + en : (canonical === 'hongbaoshu' && bucket.words['hb:' + en] ? 'hb:' + en : key));
    if (!bucket.words[targetKey]) return;
    bucket.words[targetKey]--;
    if (bucket.words[targetKey] <= 0) delete bucket.words[targetKey];
    mode = mode || canonical;
    if (bucket.modes && bucket.modes[mode]) {
      bucket.modes[mode]--;
      if (bucket.modes[mode] <= 0) delete bucket.modes[mode];
    }
    bucket.updatedAt = Date.now();
    if (!Object.keys(bucket.words).length) delete activity.days[day];
    saveLearningActivity(activity);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }

  var SMOOTH_BACKUP_KEY = 'review_smooth_backup_v1';
  function hasSmoothBackup() {
    var b = getSmoothBackupInfo();
    return !!(b && isObject(b.items) && Object.keys(b.items).length > 0);
  }
  function getSmoothBackupInfo() {
    return safeJson(SMOOTH_BACKUP_KEY, null);
  }
  function smoothBacklog(days) {
    days = Math.max(2, Math.min(7, Math.floor(Number(days) || 5)));
    if (hasSmoothBackup()) {
      var existing = getSmoothBackupInfo();
      return { smoothed: 0, days: (existing && existing.days) || days, totalCandidates: 0, alreadySmoothed: true };
    }
    var meta = loadReviewMeta();
    var excluded = loadExcluded();
    var now = Date.now();
    var nowDate = new Date(now);
    var todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0).getTime();
    var dayMs = DAY_MS;
    var overdueCandidates = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      if (!entry) return;
      var split = key.indexOf(':');
      if (split < 1) return;
      var source = key.slice(0, split), en = key.slice(split + 1);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) return;
      var dueAt = effectiveDueAt(entry);
      if (dueAt > 0 && (now - dueAt) > dayMs) {
        var lapses = Number(entry.lapses) || 0;
        var streak = Number(entry.streak) || 0;
        if (lapses < 3 && streak >= 1) {
          overdueCandidates.push({ key: key, entry: entry, dueAt: dueAt, streak: streak, lapses: lapses });
        }
      }
    });
    if (!overdueCandidates.length) {
      return { smoothed: 0, days: days, totalCandidates: 0 };
    }
    overdueCandidates.sort(function(a, b) {
      return (b.streak - b.lapses) - (a.streak - a.lapses);
    });
    var backupItems = {};
    overdueCandidates.forEach(function(item, idx) {
      var orig = item.entry;
      backupItems[item.key] = {
        nextDueAt: orig.nextDueAt || 0,
        hardDueAt: orig.hardDueAt || 0,
        updatedAt: orig.updatedAt || 0,
        isSmoothed: !!orig.isSmoothed
      };
      var targetDayOffset = (idx % days) + 1;
      var slotIndex = Math.floor(idx / days);
      var jitter = ((targetDayOffset * 19 + slotIndex * 43) * 60000) % (3 * 3600000);
      var newDue = todayStart + targetDayOffset * dayMs + 8 * 3600000 + jitter;
      if (orig.nextDueAt) orig.nextDueAt = newDue;
      if (orig.hardDueAt) orig.hardDueAt = newDue;
      orig.updatedAt = now;
      orig.isSmoothed = true;
    });
    saveReviewMeta(meta);
    var backup = {
      createdAt: now,
      days: days,
      count: overdueCandidates.length,
      items: backupItems
    };
    safeSet(SMOOTH_BACKUP_KEY, JSON.stringify(backup));
    safeSet(ACTIVITY_DIRTY_KEY, String(now));
    return {
      smoothed: overdueCandidates.length,
      days: days,
      totalCandidates: overdueCandidates.length
    };
  }
  function undoSmoothBacklog() {
    var backup = getSmoothBackupInfo();
    if (!backup || !backup.items || !isObject(backup.items)) return 0;
    var meta = loadReviewMeta();
    var count = 0;
    Object.keys(backup.items).forEach(function(key) {
      if (meta[key]) {
        var saved = backup.items[key];
        if (saved && typeof saved === 'object') {
          if (typeof saved.nextDueAt !== 'undefined') meta[key].nextDueAt = saved.nextDueAt;
          if (typeof saved.hardDueAt !== 'undefined') meta[key].hardDueAt = saved.hardDueAt;
          if (typeof saved.updatedAt !== 'undefined') meta[key].updatedAt = saved.updatedAt;
          if (saved.isSmoothed) meta[key].isSmoothed = true;
          else delete meta[key].isSmoothed;
          count++;
        }
      }
    });
    saveReviewMeta(meta);
    safeRemove(SMOOTH_BACKUP_KEY);
    safeSet(ACTIVITY_DIRTY_KEY, String(Date.now()));
    return count;
  }

  function getEbbinghausForecast(options) {
    var opts = options || {};
    var now = Number(opts.now) || Date.now();
    var meta = loadReviewMeta();
    var excluded = loadExcluded();

    var nowDate = new Date(now);
    var todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0).getTime();
    var todayEnd = todayStart + DAY_MS - 1;

    var forecast = [];
    var dayNames = ['今天', '明天', '后天'];
    for (var i = 0; i < 8; i++) {
      var dTime = todayStart + i * DAY_MS;
      var dObj = new Date(dTime);
      var label = i < 3 ? dayNames[i] : (dObj.getMonth() + 1) + '/' + dObj.getDate();
      var dayKey = localDayKey(dTime);
      forecast.push({
        dayIndex: i,
        dayKey: dayKey,
        label: label,
        total: 0,
        urgent: 0,
        normal: 0,
        words: []
      });
    }

    var depth = {
      early: { count: 0, pct: 0, name: '初识萌芽期', desc: '1–3天复习，遗忘率较高，需密集回火' },
      consolidation: { count: 0, pct: 0, name: '巩固稳定期', desc: '4–15天复习，记忆突触开始稳固' },
      mastered: { count: 0, pct: 0, name: '熟知长效期', desc: '15天以上复习，进入长效抗遗忘阶段' },
      volatile: { count: 0, pct: 0, name: '易错震荡池', desc: '曾有遗忘或多次模糊的难词' }
    };

    var trackedCount = 0;
    var totalRetention = 0;
    var retentionCount = 0;

    var seenForecast = Object.create(null);
    var keys = Object.keys(meta);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var split = key.indexOf(':');
      if (split < 1) continue;
      var source = reviewSource(key.slice(0, split));
      var en = key.slice(split + 1);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) continue;
      var dedupeKey = source + ':' + en;
      if (seenForecast[dedupeKey]) continue;
      seenForecast[dedupeKey] = true;

      var entry = meta[key];
      if (!entry || !isObject(entry)) continue;
      trackedCount++;

      var streak = Number(entry.streak) || 0;
      var lapses = Number(entry.lapses) || 0;
      var hardHits = Number(entry.hardHits) || 0;
      var intervalDays = Math.max(1, Number(entry.intervalDays) || 1);
      var lastReviewAt = Number(entry.lastReviewAt) || 0;
      var dueAt = effectiveDueAt(entry);
      var isUrgent = (lapses > 0 || hardHits > 0 || entry.lastRating === 'forget' || entry.lastRating === 'uncertain');

      if (lapses > 0 || hardHits > 0) {
        depth.volatile.count++;
      }
      if (streak >= 6 || intervalDays > 15 || entry.lastRating === 'mastered') {
        depth.mastered.count++;
      } else if (streak >= 3 && intervalDays >= 4 && intervalDays <= 15) {
        depth.consolidation.count++;
      } else {
        depth.early.count++;
      }

      if (lastReviewAt > 0) {
        var elapsedDays = Math.max(0, (now - lastReviewAt) / DAY_MS);
        var r = Math.pow(0.90, elapsedDays / intervalDays);
        totalRetention += Math.max(0.1, Math.min(1.0, r));
        retentionCount++;
      }

      if (dueAt > 0) {
        if (dueAt <= todayEnd) {
          forecast[0].total++;
          if (isUrgent) forecast[0].urgent++; else forecast[0].normal++;
          if (forecast[0].words.length < 5) forecast[0].words.push(en);
        } else {
          var dayIdx = Math.floor((dueAt - todayStart) / DAY_MS);
          if (dayIdx >= 1 && dayIdx <= 7) {
            forecast[dayIdx].total++;
            if (isUrgent) forecast[dayIdx].urgent++; else forecast[dayIdx].normal++;
            if (forecast[dayIdx].words.length < 5) forecast[dayIdx].words.push(en);
          }
        }
      }
    }

    var sumDepth = depth.early.count + depth.consolidation.count + depth.mastered.count;
    if (sumDepth > 0) {
      depth.early.pct = Math.round((depth.early.count / sumDepth) * 100);
      depth.consolidation.pct = Math.round((depth.consolidation.count / sumDepth) * 100);
      depth.mastered.pct = Math.max(0, 100 - depth.early.pct - depth.consolidation.pct);
      depth.volatile.pct = Math.round((depth.volatile.count / sumDepth) * 100);
    }

    var avgRetention = retentionCount > 0 ? (totalRetention / retentionCount) : 1.0;
    var retentionPct = Math.round(avgRetention * 1000) / 10;

    var advice = '';
    var todayDue = forecast[0].total;
    var maxFutureDay = 0;
    var futurePeakDay = 1;
    for (var f = 1; f < 8; f++) {
      if (forecast[f].total > maxFutureDay) {
        maxFutureDay = forecast[f].total;
        futurePeakDay = f;
      }
    }

    if (trackedCount === 0) {
      advice = '词库尚未开始记录复习进度，完成首次背诵后将自动生成抗遗忘预测。';
    } else if (todayDue > 80) {
      advice = '今日到期与积压达 ' + todayDue + ' 词，建议启用“智能债务平滑”分批消化，避免遗忘堆积。';
    } else if (depth.early.pct > 50) {
      advice = '初识期单词占比 ' + depth.early.pct + '%，近期新词输入节奏充实，建议未来 2 天重点巩固到期复习。';
    } else if (depth.mastered.pct > 40) {
      advice = '熟知长效期词汇占比 ' + depth.mastered.pct + '%，抗遗忘基底坚实！保持每日规律复习即可。';
    } else {
      advice = '复习节奏良好，预计未来高峰在' + forecast[futurePeakDay].label + '（约 ' + maxFutureDay + ' 词），请按计划温故知新。';
    }

    return {
      now: now,
      trackedCount: trackedCount,
      retentionPct: retentionPct,
      retentionCount: retentionCount,
      forecast: forecast,
      depth: depth,
      todayDue: todayDue,
      futureTotal7Days: forecast.slice(1).reduce(function(acc, d) { return acc + d.total; }, 0),
      advice: advice
    };
  }

  global.ReviewCore = {
    REVIEW_META_KEY: REVIEW_META_KEY,
    EXCLUDED_KEY: EXCLUDED_KEY,
    ACTIVITY_KEY: ACTIVITY_KEY,
    RECALL_KEY: RECALL_KEY,
    ACTIVITY_DIRTY_KEY: ACTIVITY_DIRTY_KEY,
    EXAM_DATE_KEY: EXAM_DATE_KEY,
    SPRINT_MODE_KEY: SPRINT_MODE_KEY,
    DEFAULT_EXAM_DATE: DEFAULT_EXAM_DATE,
    SMOOTH_BACKUP_KEY: SMOOTH_BACKUP_KEY,
    getExamDate: getExamDate,
    setExamDate: setExamDate,
    isSprintMode: isSprintMode,
    setSprintMode: setSprintMode,
    getExamDaysLeft: getExamDaysLeft,
    getExamCapDueAt: getExamCapDueAt,
    getHighFreqWrongItems: getHighFreqWrongItems,
    safeJson: safeJson,
    localDayKey: localDayKey,
    loadReviewMeta: loadReviewMeta,
    saveReviewMeta: saveReviewMeta,
    loadExcluded: loadExcluded,
    saveExcluded: saveExcluded,
    isExcluded: isExcluded,
    archive: archive,
    restore: restore,
    scheduleHardOnly: scheduleHardOnly,
    reviewSource: reviewSource,
    preferenceStorageKey: preferenceStorageKey,
    normalizeRating: normalizeRating,
    applyRating: applyRating,
    undoRating: undoRating,
    rateReview: rateReview,
    undoReview: undoReview,
    loadRecallQuality: loadRecallQuality,
    saveRecallQuality: saveRecallQuality,
    recordRecallOutcome: recordRecallOutcome,
    undoRecallOutcome: undoRecallOutcome,
    wasScheduledRecall: wasScheduledRecall,
    effectiveDueAt: effectiveDueAt,
    getDueReviewItems: getDueReviewItems,
    getHardDueReviewItems: getHardDueReviewItems,
    upcomingReviewCount: upcomingReviewCount,
    loadLearningActivity: loadLearningActivity,
    saveLearningActivity: saveLearningActivity,
    recordLearningActivity: recordLearningActivity,
    undoLearningActivity: undoLearningActivity,
    hasSmoothBackup: hasSmoothBackup,
    getSmoothBackupInfo: getSmoothBackupInfo,
    smoothBacklog: smoothBacklog,
    undoSmoothBacklog: undoSmoothBacklog,
    getEbbinghausForecast: getEbbinghausForecast
  };
})(window);