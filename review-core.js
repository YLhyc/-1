(function(global) {
  'use strict';
  var REVIEW_META_KEY = 'review_meta_v1';
  var EXCLUDED_KEY = 'review_excluded_v1';
  var ACTIVITY_KEY = 'learning_activity_v1';
  var RECALL_KEY = 'recall_quality_v1';
  var ACTIVITY_DIRTY_KEY = 'learning_activity_dirty_v1';
  var DAY_MS = 86400000;

  function safeJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch(e) { return fallback; }
  }
  function isObject(obj) { return !!obj && typeof obj === 'object' && !Array.isArray(obj); }
  function localDayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadReviewMeta() { return safeJson(REVIEW_META_KEY, {}); }
  function saveReviewMeta(meta) { localStorage.setItem(REVIEW_META_KEY, JSON.stringify(meta || {})); }
  function loadExcluded() { return safeJson(EXCLUDED_KEY, {}); }
  function saveExcluded(data) {
    if (data && Object.keys(data).length) localStorage.setItem(EXCLUDED_KEY, JSON.stringify(data));
    else localStorage.removeItem(EXCLUDED_KEY);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
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
    localStorage.setItem(prefsKey, JSON.stringify(prefs));
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
    if (Object.keys(prefs).length) localStorage.setItem(prefsKey, JSON.stringify(prefs));
    else localStorage.removeItem(prefsKey);
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
    return source === 'hb' ? 'hongbaoshu' : source;
  }
  function preferenceStorageKey(source) {
    return reviewSource(source) === 'hongbaoshu' ? 'hb_prefs' : 'vv_prefs';
  }
  function applyRating(source, en, familiar, mode, options) {
    var storageKey = preferenceStorageKey(source), prefs = safeJson(storageKey, {});
    var hadPref = Object.prototype.hasOwnProperty.call(prefs, en);
    var oldPref = hadPref ? prefs[en] : null;
    prefs[en] = familiar ? 'familiar' : 'hard';
    localStorage.setItem(storageKey, JSON.stringify(prefs));
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
    var opts = options || {}, oldReview = null, reviewApplied = false;
    var canonicalSource = reviewSource(source);
    var reviewBefore = mode === 'recite' ? loadReviewMeta()[canonicalSource + ':' + en] : null;
    var recallOutcome = null;
    if (mode === 'recite' || (mode === 'morning' && opts.reviewDue)) {
      oldReview = rateReview(canonicalSource, en, familiar);
      reviewApplied = true;
    } else if (!familiar) {
      oldReview = scheduleHardOnly(canonicalSource, en);
      reviewApplied = true;
    }
    if (mode === 'recite') {
      recallOutcome = recordRecallOutcome(canonicalSource, en, familiar, 'recite', {
        delayed: wasScheduledRecall(reviewBefore)
      });
    }
    return {
      source: canonicalSource, en: en, hadPref: hadPref, oldPref: oldPref,
      oldReview: oldReview, reviewApplied: reviewApplied, familiar: !!familiar,
      mode: mode || 'listen', recallOutcome: recallOutcome
    };
  }
  function undoRating(state) {
    if (!state || !state.en) return;
    var storageKey = preferenceStorageKey(state.source), prefs = safeJson(storageKey, {});
    if (state.hadPref) prefs[state.en] = state.oldPref;
    else delete prefs[state.en];
    if (Object.keys(prefs).length) localStorage.setItem(storageKey, JSON.stringify(prefs));
    else localStorage.removeItem(storageKey);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
    if (state.reviewApplied) undoReview(state.source, state.en, state.oldReview || {});
    if (state.recallOutcome) undoRecallOutcome(state.recallOutcome);
  }
  function rateReview(source, en, familiar) {
    var meta = loadReviewMeta(), key = source + ':' + en, old = meta[key] || {};
    var next = { streak: old.streak || 0, lapses: old.lapses || 0, intervalDays: old.intervalDays || 0, hardHits: old.hardHits || 0 };
    if (familiar) {
      next.streak++;
      next.intervalDays = [1,3,7,14,30,60][Math.min(next.streak - 1, 5)];
      next.hardDueAt = 0;
      next.hardHits = 0;
    } else {
      next.streak = 0; next.lapses++; next.hardHits++;
      next.intervalDays = next.hardHits === 1 ? 2 : 1;
      next.hardDueAt = Date.now() + next.intervalDays * DAY_MS;
    }
    next.lastReviewAt = Date.now();
    next.nextDueAt = next.lastReviewAt + next.intervalDays * DAY_MS;
    meta[key] = next;
    saveReviewMeta(meta);
    return old;
  }
  function scheduleHardOnly(source, en) {
    var meta = loadReviewMeta(), key = exclusionKey(source, en), old = meta[key] || {};
    var hardHits = Number(old.hardHits) || 0;
    if (!hardHits && Number(old.lapses) > 0) hardHits = 1;
    hardHits++;
    var interval = hardHits === 1 ? 2 : 1;
    meta[key] = {
      streak: 0, lapses: (Number(old.lapses) || 0) + 1, hardHits: hardHits,
      intervalDays: interval, lastReviewAt: Date.now(),
      hardDueAt: Date.now() + interval * DAY_MS
    };
    saveReviewMeta(meta);
    return old;
  }
  function undoReview(source, en, old) {
    var meta = loadReviewMeta(), key = source + ':' + en;
    if (old && Object.keys(old).length) meta[key] = old; else delete meta[key];
    if (Object.keys(meta).length) saveReviewMeta(meta); else localStorage.removeItem(REVIEW_META_KEY);
  }
  function loadRecallQuality() { return safeJson(RECALL_KEY, { days: {} }); }
  function saveRecallQuality(data) {
    var days = data && isObject(data.days) ? data.days : {};
    var cutoff = Date.now() - 90 * DAY_MS;
    Object.keys(days).forEach(function(day) {
      var ts = new Date(day + 'T00:00:00').getTime();
      if (!isFinite(ts) || ts < cutoff) delete days[day];
    });
    if (Object.keys(days).length) localStorage.setItem(RECALL_KEY, JSON.stringify({ days: days }));
    else localStorage.removeItem(RECALL_KEY);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }
  function wasScheduledRecall(entry, at) {
    if (!isObject(entry) || !Number(entry.lastReviewAt)) return false;
    var due = Number(entry.hardDueAt) || Number(entry.nextDueAt) || 0;
    return due > 0 && due <= (at || Date.now());
  }
  function recordRecallOutcome(source, en, familiar, mode, options) {
    if (!source || !en) return null;
    var opts = options || {}, at = Number(opts.at) || Date.now(), day = localDayKey(at);
    var data = loadRecallQuality();
    if (!isObject(data.days)) data.days = {};
    var bucket = data.days[day] || { total: 0, familiar: 0, hard: 0, delayed: 0, delayedFamiliar: 0, delayedHard: 0, practice: 0, modes: {} };
    if (!isObject(bucket.modes)) bucket.modes = {};
    bucket.total = (Number(bucket.total) || 0) + 1;
    if (familiar) bucket.familiar = (Number(bucket.familiar) || 0) + 1;
    else bucket.hard = (Number(bucket.hard) || 0) + 1;
    if (opts.delayed) {
      bucket.delayed = (Number(bucket.delayed) || 0) + 1;
      if (familiar) bucket.delayedFamiliar = (Number(bucket.delayedFamiliar) || 0) + 1;
      else bucket.delayedHard = (Number(bucket.delayedHard) || 0) + 1;
    }
    if (opts.practice) bucket.practice = (Number(bucket.practice) || 0) + 1;
    mode = mode || 'recite';
    bucket.modes[mode] = (Number(bucket.modes[mode]) || 0) + 1;
    bucket.updatedAt = at;
    data.days[day] = bucket;
    saveRecallQuality(data);
    return { day: day, familiar: !!familiar, delayed: !!opts.delayed, practice: !!opts.practice, mode: mode };
  }
  function undoRecallOutcome(event) {
    if (!event || !event.day) return;
    var data = loadRecallQuality(), bucket = data.days && data.days[event.day];
    if (!bucket) return;
    function dec(key) { bucket[key] = Math.max(0, (Number(bucket[key]) || 0) - 1); }
    dec('total');
    dec(event.familiar ? 'familiar' : 'hard');
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
  function getDueReviewItems(now) {
    var meta = loadReviewMeta(), at = now || Date.now(), items = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      var split = key.indexOf(':');
      if (!entry || split < 1 || isExcluded(key.slice(0, split), key.slice(split + 1))) return;
      var dueAt = entry.nextDueAt || entry.hardDueAt;
      if (!dueAt || dueAt > at) return;
      items.push({ source: key.slice(0, split), en: key.slice(split + 1), dueAt: dueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function getHardDueReviewItems(now) {
    var meta = loadReviewMeta(), at = now || Date.now(), items = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key], split = key.indexOf(':');
      if (!entry || split < 1 || isExcluded(key.slice(0, split), key.slice(split + 1))) return;
      if (!entry.hardDueAt || entry.hardDueAt > at) return;
      items.push({ source: key.slice(0, split), en: key.slice(split + 1), dueAt: entry.hardDueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function upcomingReviewCount(hours) {
    var meta = loadReviewMeta(), now = Date.now(), end = now + (hours || 24) * 3600000, count = 0;
    Object.keys(meta).forEach(function(key) {
      var due = Number(meta[key] && meta[key].nextDueAt) || 0;
      var hardDue = Number(meta[key] && meta[key].hardDueAt) || 0;
      var split = key.indexOf(':');
      if (split > 0 && isExcluded(key.slice(0, split), key.slice(split + 1))) return;
      if ((due > now && due <= end) || (hardDue > now && hardDue <= end)) count++;
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
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify({ days: days }));
  }
  function recordLearningActivity(source, en, mode) {
    if (!source || !en) return;
    var activity = loadLearningActivity();
    if (!isObject(activity.days)) activity.days = {};
    var day = localDayKey();
    var bucket = activity.days[day] || { words: {}, modes: {}, updatedAt: 0 };
    if (!isObject(bucket.words)) bucket.words = {};
    if (!isObject(bucket.modes)) bucket.modes = {};
    var key = source + ':' + en;
    bucket.words[key] = (bucket.words[key] || 0) + 1;
    mode = mode || source;
    bucket.modes[mode] = (bucket.modes[mode] || 0) + 1;
    bucket.updatedAt = Date.now();
    activity.days[day] = bucket;
    saveLearningActivity(activity);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }
  function undoLearningActivity(source, en, mode) {
    var activity = loadLearningActivity(), day = localDayKey();
    var bucket = activity.days && activity.days[day], key = source + ':' + en;
    if (!bucket || !bucket.words || !bucket.words[key]) return;
    bucket.words[key]--;
    if (bucket.words[key] <= 0) delete bucket.words[key];
    if (bucket.modes && bucket.modes[mode]) {
      bucket.modes[mode]--;
      if (bucket.modes[mode] <= 0) delete bucket.modes[mode];
    }
    bucket.updatedAt = Date.now();
    if (!Object.keys(bucket.words).length) delete activity.days[day];
    saveLearningActivity(activity);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
  }

  global.ReviewCore = {
    REVIEW_META_KEY: REVIEW_META_KEY,
    EXCLUDED_KEY: EXCLUDED_KEY,
    ACTIVITY_KEY: ACTIVITY_KEY,
    RECALL_KEY: RECALL_KEY,
    ACTIVITY_DIRTY_KEY: ACTIVITY_DIRTY_KEY,
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
    applyRating: applyRating,
    undoRating: undoRating,
    rateReview: rateReview,
    undoReview: undoReview,
    loadRecallQuality: loadRecallQuality,
    saveRecallQuality: saveRecallQuality,
    recordRecallOutcome: recordRecallOutcome,
    undoRecallOutcome: undoRecallOutcome,
    wasScheduledRecall: wasScheduledRecall,
    getDueReviewItems: getDueReviewItems,
    getHardDueReviewItems: getHardDueReviewItems,
    upcomingReviewCount: upcomingReviewCount,
    loadLearningActivity: loadLearningActivity,
    saveLearningActivity: saveLearningActivity,
    recordLearningActivity: recordLearningActivity,
    undoLearningActivity: undoLearningActivity
  };
})(window);