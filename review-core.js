(function(global) {
  'use strict';
  var REVIEW_META_KEY = 'review_meta_v1';
  var ACTIVITY_KEY = 'learning_activity_v1';
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
  function rateReview(source, en, familiar) {
    var meta = loadReviewMeta(), key = source + ':' + en, old = meta[key] || {};
    var next = { streak: old.streak || 0, lapses: old.lapses || 0, intervalDays: old.intervalDays || 0 };
    if (familiar) {
      next.streak++;
      next.intervalDays = [1,3,7,14,30,60][Math.min(next.streak - 1, 5)];
    } else {
      next.streak = 0; next.lapses++; next.intervalDays = 1;
    }
    next.lastReviewAt = Date.now();
    next.nextDueAt = next.lastReviewAt + next.intervalDays * DAY_MS;
    meta[key] = next;
    saveReviewMeta(meta);
    return old;
  }
  function undoReview(source, en, old) {
    var meta = loadReviewMeta(), key = source + ':' + en;
    if (old && Object.keys(old).length) meta[key] = old; else delete meta[key];
    saveReviewMeta(meta);
  }
  function getDueReviewItems(now) {
    var meta = loadReviewMeta(), at = now || Date.now(), items = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      if (!entry || !entry.nextDueAt || entry.nextDueAt > at) return;
      var split = key.indexOf(':');
      if (split < 1) return;
      items.push({ source: key.slice(0, split), en: key.slice(split + 1), dueAt: entry.nextDueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function upcomingReviewCount(hours) {
    var meta = loadReviewMeta(), now = Date.now(), end = now + (hours || 24) * 3600000, count = 0;
    Object.keys(meta).forEach(function(key) {
      var due = Number(meta[key] && meta[key].nextDueAt) || 0;
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
    ACTIVITY_KEY: ACTIVITY_KEY,
    ACTIVITY_DIRTY_KEY: ACTIVITY_DIRTY_KEY,
    safeJson: safeJson,
    localDayKey: localDayKey,
    loadReviewMeta: loadReviewMeta,
    saveReviewMeta: saveReviewMeta,
    rateReview: rateReview,
    undoReview: undoReview,
    getDueReviewItems: getDueReviewItems,
    upcomingReviewCount: upcomingReviewCount,
    loadLearningActivity: loadLearningActivity,
    saveLearningActivity: saveLearningActivity,
    recordLearningActivity: recordLearningActivity,
    undoLearningActivity: undoLearningActivity
  };
})(window);