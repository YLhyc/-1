(function (globalScope) {
  'use strict';

  var STORAGE_KEYS = {
    vocabPrefs: 'vv_prefs',
    vocabCounts: 'vv_counts',
    hbPrefs: 'hb_prefs',
    hbCounts: 'hb_counts',
    ufPrefs: 'uf_prefs',
    ufCounts: 'uf_counts',
    wbPrefs: 'wb_prefs',
    wbDeleted: 'wb_deleted',
    wbPinned: 'wb_pinned',
    spPrefs: 'sp_prefs',
    sprintMastered: 'sprint_mastered_words',
    sprintWeak: 'sprint_weak_words',
    activity: 'learning_activity_v1',
    recall: 'recall_quality_v1',
    review: 'review_meta_v1',
    excluded: 'review_excluded_v1',
    focus: 'focus_words_v1',
    learningResume: 'learning_resume_v1',
    todaySettings: 'today_recite_settings_v1',
    todayDaily: 'today_recite_daily_v1',
    todaySession: 'today_recite_session_v1',
    todayRotation: 'today_recite_rotation_v1',
    morMeta: 'morning_meta_v1',
    morSettings: 'morning_settings_v1',
    morCursor: 'morning_cursor_v1',
    morSessions: 'morning_sessions_v1',
    morDaily: 'morning_daily_v1',
    morActive: 'morning_active_session_v1',
    morTiming: 'morning_timing_v1'
  };

  var GITHUB_CONFIG_KEY = 'github_backup_config_v1';
  var GITHUB_LAST_KEY = 'github_backup_last_v1';
  var GITHUB_ERROR_KEY = 'github_backup_error_v1';
  var ACTIVITY_DIRTY_KEY = 'learning_activity_dirty_v1';
  var SYNC_META_KEY = 'words_sync_meta_v1';
  var SYNC_BASE_KEY = 'words_sync_base_v1';
  var SYNC_LAST_SEEN_KEY = 'words_sync_last_seen_v1';
  var SYNC_REMOTE_SIG_KEY = 'words_sync_remote_sig_v1';

  var BACKUP_APP_ID = 'kaoyan-english-review';
  var BACKUP_VERSION = 11;
  var GITHUB_BACKUP_FILE = 'kaoyan-english-review-backup.json';

  var MAP_STORE_KEYS = [
    'vocabPrefs', 'hbPrefs', 'ufPrefs', 'wbPrefs', 'spPrefs',
    'review', 'excluded', 'focus', 'wbDeleted', 'morMeta'
  ];
  var SCALAR_STORE_KEYS = [
    'learningResume', 'todaySettings', 'todaySession', 'todayRotation',
    'morSettings', 'morCursor', 'morActive', 'morTiming', 'wbPinned',
    'sprintMastered', 'sprintWeak'
  ];

  var WATCHED_RAW_KEYS = {};
  Object.keys(STORAGE_KEYS).forEach(function (k) { WATCHED_RAW_KEYS[STORAGE_KEYS[k]] = true; });
  WATCHED_RAW_KEYS[ACTIVITY_DIRTY_KEY] = true;

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function cloneJson(v) {
    if (v === undefined) return undefined;
    return JSON.parse(JSON.stringify(v));
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (typeof a === 'object') {
      if (Array.isArray(b)) return false;
      var ak = Object.keys(a), bk = Object.keys(b);
      if (ak.length !== bk.length) return false;
      for (var j = 0; j < ak.length; j++) {
        var key = ak[j];
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  function safeParse(raw, fallback) {
    if (!raw) return cloneJson(fallback);
    try {
      var parsed = JSON.parse(raw);
      return parsed === undefined ? cloneJson(fallback) : parsed;
    } catch (e) {
      return cloneJson(fallback);
    }
  }

  function getStore(storage) {
    if (storage) return storage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  }

  function safeSetItem(st, key, strVal) {
    if (!st) return false;
    try {
      st.setItem(key, String(strVal));
      return true;
    } catch (e) {
      var isQuota = !!(e && (
        e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.code === 22 ||
        e.code === 1014 ||
        /quota/i.test((e && e.message) || '')
      ));
      var msg = isQuota ? '本地存储空间已满 (QuotaExceededError)' : ((e && e.message) || String(e));
      try {
        if (key !== GITHUB_ERROR_KEY) {
          st.setItem(GITHUB_ERROR_KEY, msg);
        }
      } catch (ignored) {}
      if (typeof _status !== 'undefined') {
        setStatus('error', msg);
      }
      return false;
    }
  }

  function safeRemoveItem(st, key) {
    if (!st) return false;
    try {
      st.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  function readKey(storage, key, fallback) {
    var st = getStore(storage);
    if (!st) return cloneJson(fallback);
    return safeParse(st.getItem(key), fallback);
  }

  function writeKey(storage, key, val) {
    var st = getStore(storage);
    if (!st) return false;
    if (val === null || val === undefined) {
      return safeRemoveItem(st, key);
    }
    var jsonStr;
    try {
      jsonStr = JSON.stringify(val);
    } catch (e) {
      return false;
    }
    return safeSetItem(st, key, jsonStr);
  }

  function normalizeGistId(value) {
    var text = String(value || '').trim();
    if (!text) return '';
    var match = text.match(/gist[.]github[.]com[/](?:[^/]+[/])?([a-f0-9]+)/i);
    return match ? match[1] : text.replace(/^.*[/]/, '').replace(/[^a-f0-9]/gi, '');
  }

  function loadGithubConfig(storage) {
    var cfg = readKey(storage, GITHUB_CONFIG_KEY, {});
    return isPlainObject(cfg) ? {
      token: String(cfg.token || '').trim(),
      gistId: normalizeGistId(cfg.gistId),
      auto: cfg.auto !== false
    } : { token: '', gistId: '', auto: true };
  }

  function saveGithubConfig(config, storage) {
    var normalized = {
      token: String((config && config.token) || '').trim(),
      gistId: normalizeGistId(config && config.gistId),
      auto: !config || config.auto !== false
    };
    writeKey(storage, GITHUB_CONFIG_KEY, normalized);
    return normalized;
  }

  function ensureMeta(meta) {
    var m = isPlainObject(meta) ? cloneJson(meta) : {};
    if (!m.deviceId) {
      m.deviceId = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    }
    if (!isPlainObject(m.mapTs)) m.mapTs = {};
    for (var i = 0; i < MAP_STORE_KEYS.length; i++) {
      if (!isPlainObject(m.mapTs[MAP_STORE_KEYS[i]])) m.mapTs[MAP_STORE_KEYS[i]] = {};
    }
    if (!isPlainObject(m.scalarTs)) m.scalarTs = {};
    m.rev = Number(m.rev) || 0;
    return m;
  }

  function normalizeWbDeleted(raw) {
    var arr = Array.isArray(raw) ? raw : [];
    var out = [];
    var seen = {};
    for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      var id = typeof item === 'string' ? item : (item && item.id ? String(item.id) : '');
      if (!id || seen[id]) continue;
      seen[id] = true;
      out.push({
        id: id,
        deletedAt: isPlainObject(item) && isFinite(Number(item.deletedAt)) ? Number(item.deletedAt) : 0
      });
    }
    return out;
  }

  function wbDeletedArrayToMap(arr) {
    var map = {};
    var norm = normalizeWbDeleted(arr);
    for (var i = 0; i < norm.length; i++) map[norm[i].id] = norm[i];
    return map;
  }

  function wbDeletedMapToArray(map) {
    var list = [];
    if (!isPlainObject(map)) return list;
    Object.keys(map).forEach(function (id) {
      if (isPlainObject(map[id])) {
        list.push({ id: id, deletedAt: Number(map[id].deletedAt) || 0 });
      }
    });
    list.sort(function (a, b) { return (a.deletedAt || 0) - (b.deletedAt || 0) || a.id.localeCompare(b.id); });
    return list;
  }

  function collectLocalData(storage) {
    var st = getStore(storage);
    var todaySession = readKey(st, STORAGE_KEYS.todaySession, null);
    var morActive = readKey(st, STORAGE_KEYS.morActive, null);
    var learningResume = readKey(st, STORAGE_KEYS.learningResume, null);

    var activityRaw = readKey(st, STORAGE_KEYS.activity, { days: {} });
    var recallRaw = readKey(st, STORAGE_KEYS.recall, { days: {} });
    var todayDailyRaw = readKey(st, STORAGE_KEYS.todayDaily, { days: {}, rated: {} });

    return {
      vocab: {
        p: isPlainObject(readKey(st, STORAGE_KEYS.vocabPrefs, {})) ? readKey(st, STORAGE_KEYS.vocabPrefs, {}) : {},
        c: isPlainObject(readKey(st, STORAGE_KEYS.vocabCounts, {})) ? readKey(st, STORAGE_KEYS.vocabCounts, {}) : {}
      },
      hongbaoshu: {
        p: isPlainObject(readKey(st, STORAGE_KEYS.hbPrefs, {})) ? readKey(st, STORAGE_KEYS.hbPrefs, {}) : {},
        c: isPlainObject(readKey(st, STORAGE_KEYS.hbCounts, {})) ? readKey(st, STORAGE_KEYS.hbCounts, {}) : {}
      },
      uf: isPlainObject(readKey(st, STORAGE_KEYS.ufPrefs, {})) ? readKey(st, STORAGE_KEYS.ufPrefs, {}) : {},
      uf_counts: isPlainObject(readKey(st, STORAGE_KEYS.ufCounts, {})) ? readKey(st, STORAGE_KEYS.ufCounts, {}) : {},
      wb: {
        p: isPlainObject(readKey(st, STORAGE_KEYS.wbPrefs, {})) ? readKey(st, STORAGE_KEYS.wbPrefs, {}) : {},
        deleted: normalizeWbDeleted(readKey(st, STORAGE_KEYS.wbDeleted, [])),
        pinned: Array.isArray(readKey(st, STORAGE_KEYS.wbPinned, [])) ? readKey(st, STORAGE_KEYS.wbPinned, []) : []
      },
      sprint: {
        p: isPlainObject(readKey(st, STORAGE_KEYS.spPrefs, {})) ? readKey(st, STORAGE_KEYS.spPrefs, {}) : {},
        mastered: Array.isArray(readKey(st, STORAGE_KEYS.sprintMastered, [])) ? readKey(st, STORAGE_KEYS.sprintMastered, []) : [],
        weak: Array.isArray(readKey(st, STORAGE_KEYS.sprintWeak, [])) ? readKey(st, STORAGE_KEYS.sprintWeak, []) : []
      },
      activity: isPlainObject(activityRaw) && isPlainObject(activityRaw.days) ? activityRaw : { days: {} },
      recall: isPlainObject(recallRaw) && isPlainObject(recallRaw.days) ? recallRaw : { days: {} },
      review: isPlainObject(readKey(st, STORAGE_KEYS.review, {})) ? readKey(st, STORAGE_KEYS.review, {}) : {},
      excluded: isPlainObject(readKey(st, STORAGE_KEYS.excluded, {})) ? readKey(st, STORAGE_KEYS.excluded, {}) : {},
      focus: isPlainObject(readKey(st, STORAGE_KEYS.focus, {})) ? readKey(st, STORAGE_KEYS.focus, {}) : {},
      learningResume: isPlainObject(learningResume) ? learningResume : null,
      todayRecite: {
        settings: isPlainObject(readKey(st, STORAGE_KEYS.todaySettings, { limit: 30 })) ? readKey(st, STORAGE_KEYS.todaySettings, { limit: 30 }) : { limit: 30 },
        daily: isPlainObject(todayDailyRaw) ? todayDailyRaw : { days: {}, rated: {} },
        session: isPlainObject(todaySession) ? todaySession : null,
        rotation: isPlainObject(readKey(st, STORAGE_KEYS.todayRotation, { cursor: 0 })) ? readKey(st, STORAGE_KEYS.todayRotation, { cursor: 0 }) : { cursor: 0 }
      },
      morning: {
        meta: isPlainObject(readKey(st, STORAGE_KEYS.morMeta, {})) ? readKey(st, STORAGE_KEYS.morMeta, {}) : {},
        settings: isPlainObject(readKey(st, STORAGE_KEYS.morSettings, {})) ? readKey(st, STORAGE_KEYS.morSettings, {}) : {},
        cursor: isPlainObject(readKey(st, STORAGE_KEYS.morCursor, {})) ? readKey(st, STORAGE_KEYS.morCursor, {}) : {},
        sessions: Array.isArray(readKey(st, STORAGE_KEYS.morSessions, [])) ? readKey(st, STORAGE_KEYS.morSessions, []) : [],
        daily: isPlainObject(readKey(st, STORAGE_KEYS.morDaily, {})) ? readKey(st, STORAGE_KEYS.morDaily, {}) : {},
        active: isPlainObject(morActive) ? morActive : null,
        timing: isPlainObject(readKey(st, STORAGE_KEYS.morTiming, {})) ? readKey(st, STORAGE_KEYS.morTiming, {}) : {}
      }
    };
  }

  function normalizeIncomingData(rawAll) {
    var a = isPlainObject(rawAll) ? rawAll : {};
    var v = isPlainObject(a.vocab) ? a.vocab : {};
    var hb = isPlainObject(a.hongbaoshu) ? a.hongbaoshu : {};
    var wb = isPlainObject(a.wb) ? a.wb : {};
    var sp = isPlainObject(a.sprint) ? a.sprint : {};
    var tr = isPlainObject(a.todayRecite) ? a.todayRecite : {};
    var mor = isPlainObject(a.morning) ? a.morning : {};

    return {
      vocab: {
        p: isPlainObject(v.p) ? v.p : {},
        c: isPlainObject(v.c) ? v.c : {}
      },
      hongbaoshu: {
        p: isPlainObject(hb.p) ? hb.p : {},
        c: isPlainObject(hb.c) ? hb.c : {}
      },
      uf: isPlainObject(a.uf) ? a.uf : {},
      uf_counts: isPlainObject(a.uf_counts) ? a.uf_counts : {},
      wb: {
        p: isPlainObject(wb.p) ? wb.p : {},
        deleted: normalizeWbDeleted(wb.deleted),
        pinned: Array.isArray(wb.pinned) ? wb.pinned.slice() : []
      },
      sprint: {
        p: isPlainObject(sp.p) ? sp.p : {},
        mastered: Array.isArray(sp.mastered) ? sp.mastered.slice() : [],
        weak: Array.isArray(sp.weak) ? sp.weak.slice() : []
      },
      activity: isPlainObject(a.activity) && isPlainObject(a.activity.days) ? a.activity : { days: {} },
      recall: isPlainObject(a.recall) && isPlainObject(a.recall.days) ? a.recall : { days: {} },
      review: isPlainObject(a.review) ? a.review : {},
      excluded: isPlainObject(a.excluded) ? a.excluded : {},
      focus: isPlainObject(a.focus) ? a.focus : {},
      learningResume: isPlainObject(a.learningResume) ? a.learningResume : null,
      todayRecite: {
        settings: isPlainObject(tr.settings) ? tr.settings : { limit: 30 },
        daily: isPlainObject(tr.daily) ? tr.daily : { days: {}, rated: {} },
        session: isPlainObject(tr.session) ? tr.session : null,
        rotation: isPlainObject(tr.rotation) ? tr.rotation : { cursor: 0 }
      },
      morning: {
        meta: isPlainObject(mor.meta) ? mor.meta : {},
        settings: isPlainObject(mor.settings) ? mor.settings : {},
        cursor: isPlainObject(mor.cursor) ? mor.cursor : {},
        sessions: Array.isArray(mor.sessions) ? mor.sessions : [],
        daily: isPlainObject(mor.daily) ? mor.daily : {},
        active: isPlainObject(mor.active) ? mor.active : null,
        timing: isPlainObject(mor.timing) ? mor.timing : {}
      }
    };
  }

  function extractMapsFromData(data) {
    return {
      vocabPrefs: (data.vocab && data.vocab.p) || {},
      hbPrefs: (data.hongbaoshu && data.hongbaoshu.p) || {},
      ufPrefs: data.uf || {},
      wbPrefs: (data.wb && data.wb.p) || {},
      spPrefs: (data.sprint && data.sprint.p) || {},
      review: data.review || {},
      excluded: data.excluded || {},
      focus: data.focus || {},
      wbDeleted: wbDeletedArrayToMap((data.wb && data.wb.deleted) || []),
      morMeta: (data.morning && data.morning.meta) || {}
    };
  }

  function extractScalarsFromData(data) {
    return {
      learningResume: data.learningResume || null,
      todaySettings: (data.todayRecite && data.todayRecite.settings) || { limit: 30 },
      todaySession: (data.todayRecite && data.todayRecite.session) || null,
      todayRotation: (data.todayRecite && data.todayRecite.rotation) || { cursor: 0 },
      morSettings: (data.morning && data.morning.settings) || {},
      morCursor: (data.morning && data.morning.cursor) || {},
      morActive: (data.morning && data.morning.active) || null,
      morTiming: (data.morning && data.morning.timing) || {},
      wbPinned: (data.wb && data.wb.pinned) || [],
      sprintMastered: (data.sprint && data.sprint.mastered) || [],
      sprintWeak: (data.sprint && data.sprint.weak) || []
    };
  }

  function entryNaturalTs(entry) {
    if (!isPlainObject(entry)) return 0;
    return Math.max(
      Number(entry.updatedAt) || 0,
      Number(entry.lastAt) || 0,
      Number(entry.archivedAt) || 0,
      Number(entry.deletedAt) || 0,
      Number(entry.savedAt) || 0,
      Number(entry.ts) || 0
    );
  }

  function isDataEmpty(data) {
    if (!data) return true;
    var hasObjKeys = function (o) { return isPlainObject(o) && Object.keys(o).length > 0; };
    if (hasObjKeys(data.vocab && data.vocab.p)) return false;
    if (hasObjKeys(data.vocab && data.vocab.c)) return false;
    if (hasObjKeys(data.hongbaoshu && data.hongbaoshu.p)) return false;
    if (hasObjKeys(data.hongbaoshu && data.hongbaoshu.c)) return false;
    if (hasObjKeys(data.uf) || hasObjKeys(data.uf_counts)) return false;
    if (hasObjKeys(data.wb && data.wb.p)) return false;
    if (data.wb && ((data.wb.deleted && data.wb.deleted.length) || (data.wb.pinned && data.wb.pinned.length))) return false;
    if (hasObjKeys(data.review) || hasObjKeys(data.excluded) || hasObjKeys(data.focus)) return false;
    if (hasObjKeys(data.activity && data.activity.days)) return false;
    if (hasObjKeys(data.recall && data.recall.days)) return false;
    if (data.morning && (hasObjKeys(data.morning.meta) || (data.morning.sessions && data.morning.sessions.length))) return false;
    return true;
  }

  function captureLocalChanges(storage, nowMs) {
    var st = getStore(storage);
    var now = Number(nowMs) || Date.now();
    var currentData = collectLocalData(st);
    var meta = ensureMeta(readKey(st, SYNC_META_KEY, null));
    var prevData = readKey(st, SYNC_LAST_SEEN_KEY, null);

    var curMaps = extractMapsFromData(currentData);
    var prevMaps = prevData ? extractMapsFromData(normalizeIncomingData(prevData)) : null;

    var curScalars = extractScalarsFromData(currentData);
    var prevScalars = prevData ? extractScalarsFromData(normalizeIncomingData(prevData)) : null;

    var bootstrapTs = Number(st && st.getItem(ACTIVITY_DIRTY_KEY)) || Number(st && st.getItem(GITHUB_LAST_KEY)) || 1;
    var dirtyDetected = false;

    MAP_STORE_KEYS.forEach(function (storeKey) {
      var curMap = curMaps[storeKey];
      var prevMap = prevMaps ? prevMaps[storeKey] : null;
      var tsMap = meta.mapTs[storeKey];

      if (!prevMap) {
        Object.keys(curMap).forEach(function (entryKey) {
          if (tsMap[entryKey] === undefined) {
            tsMap[entryKey] = entryNaturalTs(curMap[entryKey]) || bootstrapTs;
          }
        });
      } else {
        var allKeys = {};
        Object.keys(curMap).forEach(function (k) { allKeys[k] = true; });
        Object.keys(prevMap).forEach(function (k) { allKeys[k] = true; });
        Object.keys(allKeys).forEach(function (entryKey) {
          var hasCur = Object.prototype.hasOwnProperty.call(curMap, entryKey);
          var hasPrev = Object.prototype.hasOwnProperty.call(prevMap, entryKey);
          if (hasCur !== hasPrev || !deepEqual(curMap[entryKey], prevMap[entryKey])) {
            var natTs = hasCur ? entryNaturalTs(curMap[entryKey]) : 0;
            tsMap[entryKey] = natTs > 0 ? natTs : now;
            dirtyDetected = true;
          }
        });
      }
    });

    SCALAR_STORE_KEYS.forEach(function (scalarKey) {
      if (!prevScalars) {
        if (meta.scalarTs[scalarKey] === undefined) {
          meta.scalarTs[scalarKey] = entryNaturalTs(curScalars[scalarKey]) || (curScalars[scalarKey] ? bootstrapTs : 0);
        }
      } else if (!deepEqual(curScalars[scalarKey], prevScalars[scalarKey])) {
        meta.scalarTs[scalarKey] = Math.max(now, entryNaturalTs(curScalars[scalarKey]));
        dirtyDetected = true;
      }
    });

    if (prevData && !deepEqual(currentData, normalizeIncomingData(prevData))) {
      dirtyDetected = true;
    }

    writeKey(st, SYNC_META_KEY, meta);
    writeKey(st, SYNC_LAST_SEEN_KEY, currentData);
    return { data: currentData, meta: meta, dirtyDetected: dirtyDetected };
  }

  function mergeCounterValue(hasBase, baseVal, localVal, remoteVal) {
    var l = Number(localVal) || 0;
    var r = Number(remoteVal) || 0;
    if (!isFinite(l) || l < 0) l = 0;
    if (!isFinite(r) || r < 0) r = 0;
    if (l === r) return l;
    if (!hasBase) return Math.max(l, r);
    var b = Number(baseVal) || 0;
    if (!isFinite(b) || b < 0) b = 0;
    if (r === b) return Math.max(0, l);
    if (l === b) return Math.max(0, r);
    return Math.max(0, b + (l - b) + (r - b));
  }

  function mergeFlatCounterMap(hasBase, bMap, lMap, rMap) {
    var out = {};
    var bObj = isPlainObject(bMap) ? bMap : {};
    var lObj = isPlainObject(lMap) ? lMap : {};
    var rObj = isPlainObject(rMap) ? rMap : {};
    var keys = {};
    Object.keys(bObj).forEach(function (k) { keys[k] = true; });
    Object.keys(lObj).forEach(function (k) { keys[k] = true; });
    Object.keys(rObj).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var lv = lObj[k], rv = rObj[k], bv = bObj[k];
      var hasL = Object.prototype.hasOwnProperty.call(lObj, k);
      var hasR = Object.prototype.hasOwnProperty.call(rObj, k);
      var hasB = hasBase && Object.prototype.hasOwnProperty.call(bObj, k);
      var val = mergeCounterValue(hasBase, bv, lv, rv);
      if (val > 0) {
        out[k] = val;
      } else if (hasB || hasL || hasR) {
        out[k] = 0;
      }
    });
    return out;
  }

  function mergeNestedCounterTree(hasBase, bNode, lNode, rNode) {
    if (typeof bNode === 'number' || typeof lNode === 'number' || typeof rNode === 'number') {
      return mergeCounterValue(hasBase, bNode, lNode, rNode);
    }
    var bObj = isPlainObject(bNode) ? bNode : {};
    var lObj = isPlainObject(lNode) ? lNode : {};
    var rObj = isPlainObject(rNode) ? rNode : {};
    var out = {};
    var keys = {};
    Object.keys(bObj).forEach(function (k) { keys[k] = true; });
    Object.keys(lObj).forEach(function (k) { keys[k] = true; });
    Object.keys(rObj).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      var lv = lObj[k], rv = rObj[k], bv = bObj[k];
      var hasL = Object.prototype.hasOwnProperty.call(lObj, k);
      var hasR = Object.prototype.hasOwnProperty.call(rObj, k);
      var hasB = hasBase && Object.prototype.hasOwnProperty.call(bObj, k);
      if (typeof lv === 'number' || typeof rv === 'number' || typeof bv === 'number') {
        var n = mergeCounterValue(hasBase, bv, lv, rv);
        if (n > 0) {
          out[k] = n;
        } else if (hasB || hasL || hasR) {
          out[k] = 0;
        }
      } else if (isPlainObject(lv) || isPlainObject(rv) || isPlainObject(bv)) {
        out[k] = mergeNestedCounterTree(hasBase, bv, lv, rv);
      } else if (rv !== undefined || lv !== undefined) {
        out[k] = lv !== undefined ? cloneJson(lv) : cloneJson(rv);
      }
    });
    return out;
  }

  function mergeMapEntries(hasBase, bMap, lMap, rMap, lTsMap, rTsMap, customConflictResolver) {
    var b = isPlainObject(bMap) ? bMap : {};
    var l = isPlainObject(lMap) ? lMap : {};
    var r = isPlainObject(rMap) ? rMap : {};
    var lt = isPlainObject(lTsMap) ? lTsMap : {};
    var rt = isPlainObject(rTsMap) ? rTsMap : {};
    var merged = {};
    var mergedTs = {};

    var keys = {};
    Object.keys(b).forEach(function (k) { keys[k] = true; });
    Object.keys(l).forEach(function (k) { keys[k] = true; });
    Object.keys(r).forEach(function (k) { keys[k] = true; });
    Object.keys(lt).forEach(function (k) { keys[k] = true; });
    Object.keys(rt).forEach(function (k) { keys[k] = true; });

    Object.keys(keys).forEach(function (k) {
      var hasL = Object.prototype.hasOwnProperty.call(l, k);
      var hasR = Object.prototype.hasOwnProperty.call(r, k);
      var hasB = hasBase && Object.prototype.hasOwnProperty.call(b, k);
      var lv = hasL ? l[k] : undefined;
      var rv = hasR ? r[k] : undefined;
      var bv = hasB ? b[k] : undefined;

      var lTime = Math.max(Number(lt[k]) || 0, hasL ? entryNaturalTs(lv) : 0);
      var rTime = Math.max(Number(rt[k]) || 0, hasR ? entryNaturalTs(rv) : 0);

      if (hasL === hasR && (!hasL || deepEqual(lv, rv))) {
        if (hasL) merged[k] = cloneJson(lv);
        var eqTs = Math.max(lTime, rTime);
        if (eqTs) mergedTs[k] = eqTs;
        return;
      }

      if (hasBase) {
        var lChanged = (hasL !== hasB) || (hasL && !deepEqual(lv, bv));
        var rChanged = (hasR !== hasB) || (hasR && !deepEqual(rv, bv));
        if (!lChanged && rChanged) {
          if (hasR) merged[k] = cloneJson(rv);
          if (rTime || !hasR) mergedTs[k] = Math.max(lTime, rTime);
          return;
        }
        if (lChanged && !rChanged) {
          if (hasL) merged[k] = cloneJson(lv);
          if (lTime || !hasL) mergedTs[k] = Math.max(lTime, rTime);
          return;
        }
      } else {
        if (hasL && !hasR) {
          if (rTime > lTime) {
            mergedTs[k] = rTime;
          } else {
            merged[k] = cloneJson(lv);
            if (lTime) mergedTs[k] = lTime;
          }
          return;
        }
        if (!hasL && hasR) {
          if (lTime > rTime) {
            mergedTs[k] = lTime;
          } else {
            merged[k] = cloneJson(rv);
            if (rTime) mergedTs[k] = rTime;
          }
          return;
        }
      }

      if (customConflictResolver && hasL && hasR) {
        var resolved = customConflictResolver(hasBase ? bv : undefined, lv, rv, lTime, rTime);
        if (resolved !== undefined) merged[k] = cloneJson(resolved);
        var cTs = Math.max(lTime, rTime);
        if (cTs) mergedTs[k] = cTs;
        return;
      }

      if (rTime > lTime) {
        if (hasR) merged[k] = cloneJson(rv);
      } else if (lTime > rTime) {
        if (hasL) merged[k] = cloneJson(lv);
      } else {
        if (hasR && !hasL) merged[k] = cloneJson(rv);
        else if (hasL) merged[k] = cloneJson(lv);
      }
      var maxTs = Math.max(lTime, rTime);
      if (maxTs) mergedTs[k] = maxTs;
    });

    return { map: merged, ts: mergedTs };
  }

  function mergeReviewEntry(bv, lv, rv, lTime, rTime) {
    var pickRemote = rTime > lTime;
    var winner = cloneJson(pickRemote ? rv : lv);
    if (!isPlainObject(winner)) return winner;
    winner.lapses = Math.max(Number(lv.lapses) || 0, Number(rv.lapses) || 0);
    winner.updatedAt = Math.max(Number(lv.updatedAt) || 0, Number(rv.updatedAt) || 0, lTime || 0, rTime || 0);
    return winner;
  }

  function mergeMorningMetaEntry(bv, lv, rv, lTime, rTime) {
    var pickRemote = rTime > lTime;
    var winner = cloneJson(pickRemote ? rv : lv);
    if (!isPlainObject(winner)) return winner;
    var hasBase = isPlainObject(bv);
    ['plays', 'hardHits', 'familiarHits', 'skipHits'].forEach(function (field) {
      if (lv[field] !== undefined || rv[field] !== undefined || (hasBase && bv[field] !== undefined)) {
        winner[field] = mergeCounterValue(hasBase, hasBase ? bv[field] : 0, lv[field], rv[field]);
      }
    });
    winner.lastAt = Math.max(Number(lv.lastAt) || 0, Number(rv.lastAt) || 0);
    return winner;
  }

  function mergeMorningSessions(lSessions, rSessions) {
    var map = {};
    var order = [];
    function ingest(arr) {
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        var s = arr[i];
        if (!isPlainObject(s)) continue;
        var key = String(s.startedAt || s.id || ('idx_' + i + '_' + (s.endedAt || 0)));
        if (!Object.prototype.hasOwnProperty.call(map, key)) {
          map[key] = cloneJson(s);
          order.push(key);
        } else {
          var prev = map[key];
          var prevScore = (Number(prev.durationMs) || 0) + (Number(prev.completed) || 0) * 1000 + (Number(prev.endedAt) || 0);
          var curScore = (Number(s.durationMs) || 0) + (Number(s.completed) || 0) * 1000 + (Number(s.endedAt) || 0);
          if (curScore >= prevScore) map[key] = cloneJson(s);
        }
      }
    }
    ingest(lSessions);
    ingest(rSessions);
    var out = order.map(function (k) { return map[k]; });
    out.sort(function (a, b) {
      return (Number(a.startedAt) || 0) - (Number(b.startedAt) || 0);
    });
    return out;
  }

  function mergeScalarValue(hasBase, bv, lv, rv, lTime, rTime, fallbackRemoteEmpty) {
    if (deepEqual(lv, rv)) {
      return { val: cloneJson(lv), ts: Math.max(lTime, rTime) };
    }
    var lt = Math.max(Number(lTime) || 0, entryNaturalTs(lv));
    var rt = Math.max(Number(rTime) || 0, entryNaturalTs(rv));
    if (hasBase) {
      var lChanged = !deepEqual(lv, bv);
      var rChanged = !deepEqual(rv, bv);
      if (!lChanged && rChanged) return { val: cloneJson(rv), ts: rt || lt };
      if (lChanged && !rChanged) return { val: cloneJson(lv), ts: lt || rt };
    } else if (fallbackRemoteEmpty) {
      if ((lv === null || lv === undefined || (Array.isArray(lv) && !lv.length)) && rv !== null && rv !== undefined) {
        return { val: cloneJson(rv), ts: rt };
      }
      if ((rv === null || rv === undefined || (Array.isArray(rv) && !rv.length)) && lv !== null && lv !== undefined) {
        return { val: cloneJson(lv), ts: lt };
      }
    }
    if (rt > lt) return { val: cloneJson(rv), ts: rt };
    if (lt > rt) return { val: cloneJson(lv), ts: lt };
    return { val: cloneJson(lv !== null && lv !== undefined ? lv : rv), ts: Math.max(lt, rt) };
  }

  function mergeState(params) {
    var hasBase = !!(params && params.base);
    var base = hasBase ? normalizeIncomingData(params.base) : null;
    var local = normalizeIncomingData(params && params.local);
    var remote = normalizeIncomingData(params && params.remote);
    var lMeta = ensureMeta(params && params.localMeta);
    var rMeta = ensureMeta(params && params.remoteMeta);

    if (!hasBase && isDataEmpty(local) && !isDataEmpty(remote)) {
      var initMeta = ensureMeta(rMeta);
      initMeta.deviceId = lMeta.deviceId;
      return {
        mergedData: cloneJson(remote),
        mergedMeta: initMeta,
        localChanged: true,
        remoteChanged: false
      };
    }

    var bMaps = base ? extractMapsFromData(base) : {};
    var lMaps = extractMapsFromData(local);
    var rMaps = extractMapsFromData(remote);

    var outMaps = {};
    var outMapTs = {};
    MAP_STORE_KEYS.forEach(function (key) {
      var resolver = key === 'review' ? mergeReviewEntry : (key === 'morMeta' ? mergeMorningMetaEntry : null);
      var res = mergeMapEntries(
        hasBase,
        hasBase ? bMaps[key] : {},
        lMaps[key],
        rMaps[key],
        lMeta.mapTs[key],
        rMeta.mapTs[key],
        resolver
      );
      outMaps[key] = res.map;
      outMapTs[key] = res.ts;
    });

    var bScalars = base ? extractScalarsFromData(base) : {};
    var lScalars = extractScalarsFromData(local);
    var rScalars = extractScalarsFromData(remote);
    var outScalars = {};
    var outScalarTs = {};

    SCALAR_STORE_KEYS.forEach(function (sKey) {
      var res = mergeScalarValue(
        hasBase,
        hasBase ? bScalars[sKey] : undefined,
        lScalars[sKey],
        rScalars[sKey],
        lMeta.scalarTs[sKey],
        rMeta.scalarTs[sKey],
        !hasBase
      );
      outScalars[sKey] = res.val;
      if (res.ts) outScalarTs[sKey] = res.ts;
    });

    if (!hasBase && Array.isArray(lScalars.wbPinned) && Array.isArray(rScalars.wbPinned)) {
      var pinSeen = {};
      var unionPinned = [];
      lScalars.wbPinned.concat(rScalars.wbPinned).forEach(function (id) {
        if (id && !pinSeen[id]) { pinSeen[id] = true; unionPinned.push(id); }
      });
      outScalars.wbPinned = unionPinned;
    }
    ['sprintMastered', 'sprintWeak'].forEach(function (spKey) {
      if (!hasBase && Array.isArray(lScalars[spKey]) && Array.isArray(rScalars[spKey])) {
        var spSeen = {};
        var unionList = [];
        lScalars[spKey].concat(rScalars[spKey]).forEach(function (w) {
          if (w && !spSeen[w]) { spSeen[w] = true; unionList.push(w); }
        });
        outScalars[spKey] = unionList;
      }
    });

    var mergedData = {
      vocab: {
        p: outMaps.vocabPrefs,
        c: mergeFlatCounterMap(hasBase, base && base.vocab.c, local.vocab.c, remote.vocab.c)
      },
      hongbaoshu: {
        p: outMaps.hbPrefs,
        c: mergeFlatCounterMap(hasBase, base && base.hongbaoshu.c, local.hongbaoshu.c, remote.hongbaoshu.c)
      },
      uf: outMaps.ufPrefs,
      uf_counts: mergeFlatCounterMap(hasBase, base && base.uf_counts, local.uf_counts, remote.uf_counts),
      wb: {
        p: outMaps.wbPrefs,
        deleted: wbDeletedMapToArray(outMaps.wbDeleted),
        pinned: Array.isArray(outScalars.wbPinned) ? outScalars.wbPinned : []
      },
      sprint: {
        p: outMaps.spPrefs,
        mastered: Array.isArray(outScalars.sprintMastered) ? outScalars.sprintMastered : [],
        weak: Array.isArray(outScalars.sprintWeak) ? outScalars.sprintWeak : []
      },
      activity: {
        days: mergeNestedCounterTree(hasBase, base && base.activity.days, local.activity.days, remote.activity.days)
      },
      recall: {
        days: mergeNestedCounterTree(hasBase, base && base.recall.days, local.recall.days, remote.recall.days)
      },
      review: outMaps.review,
      excluded: outMaps.excluded,
      focus: outMaps.focus,
      learningResume: outScalars.learningResume || null,
      todayRecite: {
        settings: outScalars.todaySettings || { limit: 30 },
        daily: mergeNestedCounterTree(hasBase, base && base.todayRecite.daily, local.todayRecite.daily, remote.todayRecite.daily),
        session: outScalars.todaySession || null,
        rotation: outScalars.todayRotation || { cursor: 0 }
      },
      morning: {
        meta: outMaps.morMeta,
        settings: outScalars.morSettings || {},
        cursor: outScalars.morCursor || {},
        sessions: mergeMorningSessions(local.morning.sessions, remote.morning.sessions),
        daily: mergeNestedCounterTree(hasBase, base && base.morning.daily, local.morning.daily, remote.morning.daily),
        active: outScalars.morActive || null,
        timing: outScalars.morTiming || {}
      }
    };

    var mergedMeta = ensureMeta({
      deviceId: lMeta.deviceId,
      rev: Math.max(Number(lMeta.rev) || 0, Number(rMeta.rev) || 0),
      mapTs: outMapTs,
      scalarTs: outScalarTs
    });

    var localChanged = !deepEqual(mergedData, local);
    var remoteChanged = !deepEqual(mergedData, remote);

    return {
      mergedData: mergedData,
      mergedMeta: mergedMeta,
      localChanged: localChanged,
      remoteChanged: remoteChanged
    };
  }

  var _applyingSync = false;

  function applyDataToStorage(data, mergedMeta, storage) {
    var st = getStore(storage);
    if (!st) return false;
    var norm = normalizeIncomingData(data);
    _applyingSync = true;
    var ok = true;
    try {
      if (!writeKey(st, STORAGE_KEYS.vocabPrefs, norm.vocab.p)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.vocabCounts, norm.vocab.c)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.hbPrefs, norm.hongbaoshu.p)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.hbCounts, norm.hongbaoshu.c)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.ufPrefs, norm.uf)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.ufCounts, norm.uf_counts)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.wbPrefs, norm.wb.p)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.wbDeleted, norm.wb.deleted)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.wbPinned, norm.wb.pinned)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.spPrefs, norm.sprint.p)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.sprintMastered, norm.sprint.mastered)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.sprintWeak, norm.sprint.weak)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.activity, norm.activity)) ok = false;
      if (norm.recall && norm.recall.days && Object.keys(norm.recall.days).length) {
        if (!writeKey(st, STORAGE_KEYS.recall, norm.recall)) ok = false;
      } else {
        safeRemoveItem(st, STORAGE_KEYS.recall);
      }
      if (!writeKey(st, STORAGE_KEYS.review, norm.review)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.excluded, norm.excluded)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.focus, norm.focus)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.learningResume, norm.learningResume)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.todaySettings, norm.todayRecite.settings)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.todayDaily, norm.todayRecite.daily)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.todaySession, norm.todayRecite.session)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.todayRotation, norm.todayRecite.rotation)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morMeta, norm.morning.meta)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morSettings, norm.morning.settings)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morCursor, norm.morning.cursor)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morSessions, norm.morning.sessions)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morDaily, norm.morning.daily)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morActive, norm.morning.active)) ok = false;
      if (!writeKey(st, STORAGE_KEYS.morTiming, norm.morning.timing)) ok = false;

      if (mergedMeta) {
        if (!writeKey(st, SYNC_META_KEY, ensureMeta(mergedMeta))) ok = false;
      }
      if (!writeKey(st, SYNC_LAST_SEEN_KEY, norm)) ok = false;
    } finally {
      _applyingSync = false;
    }
    return ok;
  }

  function buildCloudPayload(data, meta) {
    var cleanData = normalizeIncomingData(data);
    var syncEnvelope = ensureMeta(meta);
    return {
      app: BACKUP_APP_ID,
      v: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      exportedAtMs: Date.now(),
      syncMeta: {
        schema: 1,
        rev: syncEnvelope.rev,
        deviceId: syncEnvelope.deviceId,
        mapTs: syncEnvelope.mapTs,
        scalarTs: syncEnvelope.scalarTs
      },
      data: cleanData
    };
  }

  function parseCloudPayload(rawPayload) {
    var payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    if (!isPlainObject(payload)) throw new Error('云端数据格式不是对象');
    var data = payload.app === BACKUP_APP_ID && payload.data ? payload.data : payload;
    var remoteMeta = isPlainObject(payload.syncMeta) ? payload.syncMeta : {
      mapTs: {},
      scalarTs: {},
      rev: 0
    };
    return {
      data: normalizeIncomingData(data),
      remoteMeta: ensureMeta(remoteMeta),
      exportedAtMs: Number(payload.exportedAtMs) || 0,
      hasSyncSchema: !!(payload.syncMeta && payload.syncMeta.schema)
    };
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    var opts = options ? Object.assign({}, options) : {};
    if (typeof AbortController !== 'undefined') {
      var controller = new AbortController();
      opts.signal = controller.signal;
      var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 15000);
      return fetch(url, opts).then(function (res) {
        clearTimeout(timer);
        return res;
      }, function (err) {
        clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new Error('请求超时');
        throw err;
      });
    }
    return fetch(url, opts);
  }

  function githubApiRequest(url, options, token) {
    var opts = options ? Object.assign({}, options) : {};
    var headers = Object.assign({}, opts.headers || {}, {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    });
    if (opts.body) headers['Content-Type'] = 'application/json';
    opts.headers = headers;
    opts.cache = 'no-store';
    return fetchWithTimeout(url, opts, 15000).then(function (res) {
      return res.text().then(function (txt) {
        var data = {};
        if (txt) {
          try { data = JSON.parse(txt); } catch (e) { data = { raw: txt }; }
        }
        if (!res.ok) {
          var msg = data && data.message ? data.message : ('HTTP ' + res.status);
          throw new Error(msg);
        }
        return data;
      });
    });
  }

  function downloadGist(config) {
    var url = 'https://api.github.com/gists/' + encodeURIComponent(config.gistId);
    return githubApiRequest(url, { method: 'GET' }, config.token).then(function (gist) {
      var files = gist && gist.files ? gist.files : {};
      var file = files[GITHUB_BACKUP_FILE];
      if (!file) {
        Object.keys(files).some(function (name) {
          if (/[.]json$/i.test(name)) { file = files[name]; return true; }
          return false;
        });
      }
      if (!file) {
        return { empty: true, updatedAt: gist && gist.updated_at ? gist.updated_at : '' };
      }
      var readContent = file.truncated && file.raw_url
        ? fetchWithTimeout(file.raw_url, { method: 'GET', cache: 'no-store' }, 15000).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        : Promise.resolve(file.content || '');
      return readContent.then(function (text) {
        var parsed = parseCloudPayload(text);
        parsed.updatedAt = (gist && gist.updated_at) || '';
        return parsed;
      });
    });
  }

  function uploadGist(config, payloadObj) {
    var body = {
      description: '考研英语复习助手学习记录备份',
      public: false,
      files: {}
    };
    body.files[GITHUB_BACKUP_FILE] = { content: JSON.stringify(payloadObj) };
    var url = 'https://api.github.com/gists' + (config.gistId ? '/' + encodeURIComponent(config.gistId) : '');
    return githubApiRequest(url, {
      method: config.gistId ? 'PATCH' : 'POST',
      body: JSON.stringify(body)
    }, config.token).then(function (res) {
      if (!config.gistId && res && res.id) config.gistId = res.id;
      if (!config.gistId) throw new Error('GitHub 未返回 Gist ID');
      return { config: config, updatedAt: (res && res.updated_at) || '' };
    });
  }

  var _status = { state: 'idle', message: '', ts: 0, dirty: false };
  var _inFlight = null;
  var _debounceTimer = null;
  var _lastPullAt = 0;
  var _resyncRequested = false;
  var _localWriteSeq = 0;

  function mergeLiveMeta(liveMeta, uploadedMeta) {
    var live = ensureMeta(liveMeta);
    var up = ensureMeta(uploadedMeta);
    var outMapTs = {};
    MAP_STORE_KEYS.forEach(function (sk) {
      outMapTs[sk] = {};
      var upMap = up.mapTs[sk] || {};
      var liveMap = live.mapTs[sk] || {};
      Object.keys(upMap).forEach(function (k) { outMapTs[sk][k] = Number(upMap[k]) || 0; });
      Object.keys(liveMap).forEach(function (k) {
        var lts = Number(liveMap[k]) || 0;
        var uts = Number(outMapTs[sk][k]) || 0;
        outMapTs[sk][k] = Math.max(lts, uts);
      });
    });
    var outScalarTs = {};
    SCALAR_STORE_KEYS.forEach(function (sk) {
      outScalarTs[sk] = Math.max(Number(up.scalarTs[sk]) || 0, Number(live.scalarTs[sk]) || 0);
    });
    return ensureMeta({
      deviceId: live.deviceId || up.deviceId,
      rev: Math.max(Number(up.rev) || 0, Number(live.rev) || 0),
      mapTs: outMapTs,
      scalarTs: outScalarTs
    });
  }

  function reconcileSyncDirty(st, startSeq, syncedMeta) {
    if (!st) return;
    safeSetItem(st, GITHUB_LAST_KEY, String(Date.now()));
    if (_localWriteSeq !== startSeq) {
      var curDirty = st.getItem(ACTIVITY_DIRTY_KEY);
      safeSetItem(st, ACTIVITY_DIRTY_KEY, curDirty || String(Date.now()));
      var liveMeta = readKey(st, SYNC_META_KEY, null);
      writeKey(st, SYNC_META_KEY, mergeLiveMeta(liveMeta, syncedMeta));
      scheduleDebouncedSync(1500);
    } else {
      safeRemoveItem(st, ACTIVITY_DIRTY_KEY);
    }
    safeRemoveItem(st, GITHUB_ERROR_KEY);
  }

  function isMorActiveAutosave(rawValue) {
    if (typeof rawValue !== 'string' || rawValue.indexOf('"reason"') === -1) return false;
    try {
      var parsed = JSON.parse(rawValue);
      return !!(parsed && parsed.reason === 'autosave');
    } catch (e) {
      return false;
    }
  }

  function emitEvent(name, detail) {
    if (typeof globalScope.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      try { globalScope.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {}
    }
  }

  function setStatus(state, message, extra) {
    var st = getStore();
    var cfg = loadGithubConfig(st);
    var last = st ? Number(st.getItem(GITHUB_LAST_KEY) || 0) : 0;
    _status = Object.assign({
      state: state,
      message: message || '',
      ts: Date.now(),
      configured: !!(cfg.token),
      gistId: cfg.gistId || '',
      auto: cfg.auto !== false,
      lastSyncedAt: last,
      dirty: !!(st && st.getItem(ACTIVITY_DIRTY_KEY))
    }, extra || {});
    renderStatusPills();
    emitEvent('wordssyncstatus', _status);
  }

  function formatShortTime(ms) {
    if (!ms) return '';
    var diff = Math.max(0, Date.now() - ms);
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分前';
    var d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function renderStatusPills() {
    if (typeof document === 'undefined') return;
    var pills = document.querySelectorAll('[data-sync-pill]');
    if (!pills || !pills.length) return;
    var cfg = loadGithubConfig();
    var st = getStore();
    var isDirty = _status.dirty || !!(st && st.getItem(ACTIVITY_DIRTY_KEY));
    var text = '未同步', cls = 'sync-pill-idle', title = '点击配置三端同步';
    if (!cfg.token) {
      text = '未连接云同步';
      cls = 'sync-pill-unconfigured';
      title = '配置 GitHub Gist 后自动在手机/iPad/电脑间双向同步';
    } else if (_status.state === 'syncing') {
      text = '同步中…';
      cls = 'sync-pill-syncing';
      title = _status.message || '正在与云端双向合并';
    } else if (_status.state === 'error') {
      text = '同步失败';
      cls = 'sync-pill-error';
      title = (_status.message || '同步失败') + ' · 点击重试';
    } else if (isDirty) {
      text = '待同步';
      cls = 'sync-pill-pending';
      title = '本地有新学习记录，点击立即同步';
    } else if (_status.lastSyncedAt || cfg.gistId) {
      var shortT = _status.lastSyncedAt ? formatShortTime(_status.lastSyncedAt) : '';
      text = shortT ? ('已同步 · ' + shortT) : '已同步';
      cls = 'sync-pill-ok';
      title = '三端双向同步已连接 · 点击立即同步';
    }
    for (var i = 0; i < pills.length; i++) {
      var pill = pills[i];
      pill.className = pill.className.replace(/\bsync-pill-(idle|unconfigured|syncing|error|pending|ok)\b/g, '').trim() + ' ' + cls;
      var labelEl = pill.querySelector('.sync-pill-text');
      if (labelEl) labelEl.textContent = text;
      else pill.textContent = text;
      pill.title = title;
      pill.setAttribute('aria-label', title);
    }
  }

  function scheduleDebouncedSync(delayMs) {
    var cfg = loadGithubConfig();
    if (!cfg.token || !cfg.auto) return;
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      _debounceTimer = null;
      syncNow({ reason: 'auto_debounce', interactive: false });
    }, typeof delayMs === 'number' ? delayMs : 12000);
  }

  function markDirty(storeKey, entryKey, immediate) {
    if (_applyingSync) return;
    var st = getStore();
    if (st) {
      var now = Date.now();
      safeSetItem(st, ACTIVITY_DIRTY_KEY, String(now));
      if (storeKey) {
        var meta = ensureMeta(readKey(st, SYNC_META_KEY, null));
        if (MAP_STORE_KEYS.indexOf(storeKey) !== -1 && entryKey) {
          meta.mapTs[storeKey][String(entryKey)] = now;
        } else if (SCALAR_STORE_KEYS.indexOf(storeKey) !== -1) {
          meta.scalarTs[storeKey] = now;
        }
        writeKey(st, SYNC_META_KEY, meta);
      }
    }
    _localWriteSeq++;
    renderStatusPills();
    scheduleDebouncedSync(immediate ? 1500 : 12000);
  }

  function syncNow(options) {
    var opts = options || {};
    var st = getStore();
    var cfg = opts.config ? saveGithubConfig(opts.config, st) : loadGithubConfig(st);
    if (!cfg.token) {
      setStatus('idle', '未配置 GitHub Token');
      return Promise.resolve({ skipped: true, reason: 'unconfigured' });
    }
    if (!opts.interactive && cfg.auto === false) {
      return Promise.resolve({ skipped: true, reason: 'auto_disabled' });
    }
    if (!opts.force && typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('pending', '离线待同步');
      return Promise.resolve({ skipped: true, reason: 'offline' });
    }
    if (_inFlight) {
      _resyncRequested = true;
      return _inFlight;
    }

    if (_debounceTimer) {
      clearTimeout(_debounceTimer);
      _debounceTimer = null;
    }

    _lastPullAt = Date.now();
    setStatus('syncing', cfg.gistId ? '正在拉取并合并三端记录…' : '正在创建私有云同步…');

    _inFlight = Promise.resolve().then(function () {
      if (!cfg.gistId) {
        var startSeq = _localWriteSeq;
        var captured = captureLocalChanges(st, Date.now());
        var localData = captured.data;
        var localMeta = captured.meta;
        localMeta.rev = (Number(localMeta.rev) || 0) + 1;
        var initialPayload = buildCloudPayload(localData, localMeta);
        return uploadGist(cfg, initialPayload).then(function (up) {
          saveGithubConfig(up.config, st);
          applyDataToStorage(localData, localMeta, st);
          writeKey(st, SYNC_BASE_KEY, localData);
          reconcileSyncDirty(st, startSeq, localMeta);
          setStatus('ok', '云同步已创建');
          return { created: true, config: up.config, localChanged: false, remoteChanged: true };
        });
      }

      return downloadGist(cfg).then(function (remote) {
        // Snapshot _localWriteSeq right before reading local data for merge/sync
        var startSeq = _localWriteSeq;
        var fresh = captureLocalChanges(st, Date.now());
        var curLocalData = fresh.data;
        var curLocalMeta = fresh.meta;

        if (remote.empty) {
          curLocalMeta.rev = (Number(curLocalMeta.rev) || 0) + 1;
          var seedPayload = buildCloudPayload(curLocalData, curLocalMeta);
          return uploadGist(cfg, seedPayload).then(function (up) {
            applyDataToStorage(curLocalData, curLocalMeta, st);
            writeKey(st, SYNC_BASE_KEY, curLocalData);
            reconcileSyncDirty(st, startSeq, curLocalMeta);
            setStatus('ok', '同步完成');
            return { localChanged: false, remoteChanged: true, config: up.config };
          });
        }

        var baseData = readKey(st, SYNC_BASE_KEY, null);
        var merged = mergeState({
          base: baseData,
          local: curLocalData,
          remote: remote.data,
          localMeta: curLocalMeta,
          remoteMeta: remote.remoteMeta
        });

        var needsUpload = merged.remoteChanged || !remote.hasSyncSchema || fresh.dirtyDetected || (st && !!st.getItem(ACTIVITY_DIRTY_KEY));
        if (merged.localChanged) {
          if (!applyDataToStorage(merged.mergedData, merged.mergedMeta, st)) {
            throw new Error('本地存储空间不足，无法完整写入云端合并记录');
          }
        } else {
          writeKey(st, SYNC_META_KEY, merged.mergedMeta);
          writeKey(st, SYNC_LAST_SEEN_KEY, merged.mergedData);
        }
        if (!needsUpload) {
          writeKey(st, SYNC_BASE_KEY, merged.mergedData);
        }

        var finishOk = function (uploaded) {
          reconcileSyncDirty(st, startSeq, merged.mergedMeta);
          if (st && remote.updatedAt && !uploaded) {
            safeSetItem(st, SYNC_REMOTE_SIG_KEY, String(remote.updatedAt));
          }
          if (merged.localChanged) {
            emitEvent('wordssyncapplied', { data: merged.mergedData, reason: opts.reason || 'sync' });
          }
          setStatus('ok', merged.localChanged ? '已合并三端新记录' : '已是最新');
          return {
            localChanged: merged.localChanged,
            remoteChanged: uploaded,
            config: cfg
          };
        };

        if (!needsUpload) {
          return finishOk(false);
        }

        merged.mergedMeta.rev = (Number(merged.mergedMeta.rev) || 0) + 1;
        var outPayload = buildCloudPayload(merged.mergedData, merged.mergedMeta);
        return uploadGist(cfg, outPayload).then(function (up) {
          if (_localWriteSeq === startSeq) {
            writeKey(st, SYNC_META_KEY, merged.mergedMeta);
          }
          writeKey(st, SYNC_BASE_KEY, merged.mergedData);
          if (st && up.updatedAt) safeSetItem(st, SYNC_REMOTE_SIG_KEY, String(up.updatedAt));
          else if (st && remote.updatedAt) safeSetItem(st, SYNC_REMOTE_SIG_KEY, String(remote.updatedAt));
          return finishOk(true);
        });
      });
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (st) safeSetItem(st, GITHUB_ERROR_KEY, msg);
      setStatus('error', msg);
      if (opts.interactive) throw err;
      return null;
    }).then(function (result) {
      _inFlight = null;
      if (_resyncRequested) {
        _resyncRequested = false;
        scheduleDebouncedSync(1000);
      }
      return result;
    }, function (err) {
      _inFlight = null;
      if (_resyncRequested) {
        _resyncRequested = false;
        scheduleDebouncedSync(1000);
      }
      throw err;
    });

    return _inFlight;
  }

  function maybePullSync(reason, minCooldownMs) {
    var cfg = loadGithubConfig();
    if (!cfg.token || !cfg.auto) return Promise.resolve(null);
    var cooldown = typeof minCooldownMs === 'number' ? minCooldownMs : 20000;
    var hasDirty = !!(getStore() && getStore().getItem(ACTIVITY_DIRTY_KEY));
    if (!hasDirty && Date.now() - _lastPullAt < cooldown) {
      return Promise.resolve({ skipped: true, reason: 'cooldown' });
    }
    return syncNow({ reason: reason || 'auto_pull', interactive: false });
  }

  function resetSyncBaseline() {
    var st = getStore();
    if (!st) return;
    safeRemoveItem(st, SYNC_BASE_KEY);
    safeRemoveItem(st, SYNC_LAST_SEEN_KEY);
    safeRemoveItem(st, SYNC_REMOTE_SIG_KEY);
  }

  function installStorageHook() {
    if (typeof Storage === 'undefined' || !Storage.prototype || Storage.prototype._wordsSyncHooked) return;
    if (typeof localStorage === 'undefined') return;
    var origSet = Storage.prototype.setItem;
    var origRemove = Storage.prototype.removeItem;
    Storage.prototype._wordsSyncHooked = true;

    Storage.prototype.setItem = function (key, value) {
      origSet.call(this, key, value);
      if (!_applyingSync && this === localStorage && WATCHED_RAW_KEYS[key]) {
        if (key === STORAGE_KEYS.morActive && isMorActiveAutosave(value)) return;
        _localWriteSeq++;
        renderStatusPills();
        scheduleDebouncedSync(12000);
      }
    };
    Storage.prototype.removeItem = function (key) {
      origRemove.call(this, key);
      if (!_applyingSync && this === localStorage && WATCHED_RAW_KEYS[key]) {
        _localWriteSeq++;
        renderStatusPills();
        scheduleDebouncedSync(12000);
      }
    };
  }

  var _lifecycleInstalled = false;
  function installLifecycle(options) {
    if (_lifecycleInstalled || typeof window === 'undefined') return;
    _lifecycleInstalled = true;
    var opts = options || {};
    installStorageHook();

    if (typeof opts.onApplied === 'function') {
      window.addEventListener('wordssyncapplied', function (e) {
        opts.onApplied(e && e.detail);
      });
    }

    setTimeout(function () {
      renderStatusPills();
      maybePullSync('startup', 0);
    }, typeof opts.startupDelayMs === 'number' ? opts.startupDelayMs : 1100);

    setInterval(function () {
      if (typeof document !== 'undefined' && document.hidden) return;
      maybePullSync('poll', 90000);
    }, 120000);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
          setTimeout(function () { maybePullSync('visibility', 20000); }, 350);
        } else {
          var st = getStore();
          var hasDirty = !!(st && st.getItem(ACTIVITY_DIRTY_KEY));
          if (_debounceTimer || hasDirty) {
            if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
            syncNow({ reason: 'visibility_hidden', interactive: false });
          }
        }
      });
    }
    window.addEventListener('focus', function () {
      setTimeout(function () { maybePullSync('focus', 20000); }, 350);
    });
    window.addEventListener('online', function () {
      setTimeout(function () { maybePullSync('online', 0); }, 500);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', function () {
        var st = getStore();
        var hasDirty = !!(st && st.getItem(ACTIVITY_DIRTY_KEY));
        if (_debounceTimer || hasDirty) {
          if (_debounceTimer) { clearTimeout(_debounceTimer); _debounceTimer = null; }
          syncNow({ reason: 'pagehide', interactive: false });
        }
      });
    }
    window.addEventListener('storage', function (e) {
      if (!e || !e.key || WATCHED_RAW_KEYS[e.key]) {
        if (e && e.key === STORAGE_KEYS.morActive) return;
        renderStatusPills();
        if (typeof opts.onApplied === 'function') {
          opts.onApplied({ reason: 'cross_tab_storage', key: e ? e.key : '' });
        }
      }
    });
  }

  var api = {
    STORAGE_KEYS: STORAGE_KEYS,
    GITHUB_CONFIG_KEY: GITHUB_CONFIG_KEY,
    GITHUB_LAST_KEY: GITHUB_LAST_KEY,
    GITHUB_ERROR_KEY: GITHUB_ERROR_KEY,
    ACTIVITY_DIRTY_KEY: ACTIVITY_DIRTY_KEY,
    SYNC_META_KEY: SYNC_META_KEY,
    SYNC_BASE_KEY: SYNC_BASE_KEY,
    SYNC_LAST_SEEN_KEY: SYNC_LAST_SEEN_KEY,
    loadGithubConfig: loadGithubConfig,
    saveGithubConfig: saveGithubConfig,
    collectLocalData: collectLocalData,
    normalizeIncomingData: normalizeIncomingData,
    captureLocalChanges: captureLocalChanges,
    mergeState: mergeState,
    mergeCounterValue: mergeCounterValue,
    mergeNestedCounterTree: mergeNestedCounterTree,
    mergeFlatCounterMap: mergeFlatCounterMap,
    applyDataToStorage: applyDataToStorage,
    buildCloudPayload: buildCloudPayload,
    parseCloudPayload: parseCloudPayload,
    syncNow: syncNow,
    maybePullSync: maybePullSync,
    markDirty: markDirty,
    resetSyncBaseline: resetSyncBaseline,
    renderStatusPills: renderStatusPills,
    installLifecycle: installLifecycle,
    installStorageHook: installStorageHook,
    safeSetItem: safeSetItem,
    safeRemoveItem: safeRemoveItem,
    getStore: getStore,
    getLocalWriteSeq: function () { return _localWriteSeq; },
    getStatus: function () { return Object.assign({}, _status); }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  globalScope.WordsSync = api;
})(typeof window !== 'undefined' ? window : globalThis);
