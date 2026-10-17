(function(global) {
  'use strict';
  var REVIEW_META_KEY = 'review_meta_v1';
  var EXCLUDED_KEY = 'review_excluded_v1';
  var ACTIVITY_KEY = 'learning_activity_v1';
  var RECALL_KEY = 'recall_quality_v1';
  var ACTIVITY_DIRTY_KEY = 'learning_activity_dirty_v1';
  var DAY_MS = 86400000;
  var excludedCache = null;

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
  function loadExcluded() {
    if (excludedCache) return excludedCache;
    excludedCache = safeJson(EXCLUDED_KEY, {});
    return excludedCache;
  }
  function saveExcluded(data) {
    excludedCache = data || {};
    if (data && Object.keys(data).length) localStorage.setItem(EXCLUDED_KEY, JSON.stringify(data));
    else localStorage.removeItem(EXCLUDED_KEY);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
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
    localStorage.setItem(storageKey, JSON.stringify(prefs));
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
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
    if (Object.keys(prefs).length) localStorage.setItem(storageKey, JSON.stringify(prefs));
    else localStorage.removeItem(storageKey);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
    if (state.reviewApplied) undoReview(state.source, state.en, state.oldReview || {});
    if (state.recallOutcome) undoRecallOutcome(state.recallOutcome);
  }
  function rateReview(source, en, ratingOrFamiliar, options) {
    var rating = normalizeRating(ratingOrFamiliar);
    var meta = loadReviewMeta(), key = source + ':' + en, old = meta[key] || {};
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
      var prevInterval = Number(old.intervalDays) || 2;
      next.intervalDays = Math.max(1, Math.round(prevInterval * 0.5));
      next.hardDueAt = now + next.intervalDays * DAY_MS;
    } else {
      next.streak = 0;
      next.lapses++;
      next.hardHits++;
      next.intervalDays = next.hardHits === 1 ? 2 : 1;
      next.hardDueAt = now + next.intervalDays * DAY_MS;
    }
    next.lastReviewAt = now;
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
  function getDueReviewItems(now) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), at = now || Date.now(), items = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      var split = key.indexOf(':');
      var source = key.slice(0, split), en = key.slice(split + 1);
      if (!entry || split < 1 || Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) return;
      var dueAt = entry.nextDueAt || entry.hardDueAt;
      if (!dueAt || dueAt > at) return;
      items.push({ source: source, en: en, dueAt: dueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function getHardDueReviewItems(now) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), at = now || Date.now(), items = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key], split = key.indexOf(':');
      var source = key.slice(0, split), en = key.slice(split + 1);
      if (!entry || split < 1 || Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) return;
      if (!entry.hardDueAt || entry.hardDueAt > at) return;
      items.push({ source: source, en: en, dueAt: entry.hardDueAt, lapses: Number(entry.lapses) || 0 });
    });
    items.sort(function(a, b) { return a.dueAt - b.dueAt; });
    return items;
  }
  function upcomingReviewCount(hours) {
    var meta = loadReviewMeta(), excluded = loadExcluded(), now = Date.now(), end = now + (hours || 24) * 3600000, count = 0;
    Object.keys(meta).forEach(function(key) {
      var due = Number(meta[key] && meta[key].nextDueAt) || 0;
      var hardDue = Number(meta[key] && meta[key].hardDueAt) || 0;
      var split = key.indexOf(':');
      if (split > 0 && Object.prototype.hasOwnProperty.call(excluded, exclusionKey(key.slice(0, split), key.slice(split + 1)))) return;
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

  var SMOOTH_BACKUP_KEY = 'review_smooth_backup_v1';
  function hasSmoothBackup() {
    try {
      var raw = localStorage.getItem(SMOOTH_BACKUP_KEY);
      return !!(raw && JSON.parse(raw));
    } catch (e) {
      return false;
    }
  }
  function getSmoothBackupInfo() {
    return safeJson(SMOOTH_BACKUP_KEY, null);
  }
  function smoothBacklog(days) {
    days = Math.max(2, Math.min(7, Math.floor(Number(days) || 5)));
    var meta = loadReviewMeta();
    var excluded = loadExcluded();
    var now = Date.now();
    var dayMs = DAY_MS;
    var overdueCandidates = [];
    Object.keys(meta).forEach(function(key) {
      var entry = meta[key];
      if (!entry) return;
      var split = key.indexOf(':');
      if (split < 1) return;
      var source = key.slice(0, split), en = key.slice(split + 1);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) return;
      var dueAt = entry.nextDueAt || entry.hardDueAt || 0;
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
      var jitter = (idx * 37) % (3 * 3600000);
      var newDue = now + targetDayOffset * dayMs + jitter;
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
    localStorage.setItem(SMOOTH_BACKUP_KEY, JSON.stringify(backup));
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(now));
    return {
      smoothed: overdueCandidates.length,
      days: days,
      totalCandidates: overdueCandidates.length
    };
  }
  function undoSmoothBacklog() {
    var backup = getSmoothBackupInfo();
    if (!backup || !backup.items) return 0;
    var meta = loadReviewMeta();
    var count = 0;
    Object.keys(backup.items).forEach(function(key) {
      if (meta[key]) {
        var saved = backup.items[key];
        if (typeof saved.nextDueAt !== 'undefined') meta[key].nextDueAt = saved.nextDueAt;
        if (typeof saved.hardDueAt !== 'undefined') meta[key].hardDueAt = saved.hardDueAt;
        if (typeof saved.updatedAt !== 'undefined') meta[key].updatedAt = saved.updatedAt;
        if (saved.isSmoothed) meta[key].isSmoothed = true;
        else delete meta[key].isSmoothed;
        count++;
      }
    });
    saveReviewMeta(meta);
    localStorage.removeItem(SMOOTH_BACKUP_KEY);
    localStorage.setItem(ACTIVITY_DIRTY_KEY, String(Date.now()));
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

    var keys = Object.keys(meta);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var split = key.indexOf(':');
      if (split < 1) continue;
      var source = key.slice(0, split);
      var en = key.slice(split + 1);
      if (Object.prototype.hasOwnProperty.call(excluded, exclusionKey(source, en))) continue;

      var entry = meta[key];
      if (!entry || !isObject(entry)) continue;
      trackedCount++;

      var streak = Number(entry.streak) || 0;
      var lapses = Number(entry.lapses) || 0;
      var hardHits = Number(entry.hardHits) || 0;
      var intervalDays = Math.max(1, Number(entry.intervalDays) || 1);
      var lastReviewAt = Number(entry.lastReviewAt) || 0;
      var dueAt = Number(entry.hardDueAt) || Number(entry.nextDueAt) || 0;
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
          var diffMs = dueAt - todayEnd;
          var dayIdx = Math.floor(diffMs / DAY_MS) + 1;
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
    SMOOTH_BACKUP_KEY: SMOOTH_BACKUP_KEY,
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