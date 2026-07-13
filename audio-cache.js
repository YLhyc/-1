(function(global) {
  'use strict';
  var RECENT_KEY = 'audio_cache_recent_v1';
  var LIMIT_KEY = 'audio_cache_limit_v1';
  var ALLOWED_LIMITS = [5, 10, 20];

  function normalize(url) {
    try { return new URL(url, location.href).pathname; } catch(e) { return ''; }
  }
  function isAudioPath(path) {
    return /\/audio_g\d+\.json$/.test(path) || /\/hb\/audio_unit\d+\.json$/.test(path);
  }
  function getLimit() {
    var n = Number(localStorage.getItem(LIMIT_KEY)) || 10;
    return ALLOWED_LIMITS.indexOf(n) >= 0 ? n : 10;
  }
  function getRecent() {
    var arr; try { arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { arr = []; }
    return Array.isArray(arr) ? arr.filter(isAudioPath) : [];
  }
  function setRecent(arr) { localStorage.setItem(RECENT_KEY, JSON.stringify(arr)); }
  async function trim(clearAll) {
    if (!('caches' in global)) return { count: 0 };
    var keep = clearAll ? [] : getRecent().slice(0, getLimit());
    var names = await caches.keys(), deleted = 0;
    for (var n = 0; n < names.length; n++) {
      if (names[n].indexOf('kv-') !== 0) continue;
      var cache = await caches.open(names[n]), requests = await cache.keys();
      for (var i = 0; i < requests.length; i++) {
        var path = normalize(requests[i].url);
        if (isAudioPath(path) && (clearAll || keep.indexOf(path) < 0)) {
          if (await cache.delete(requests[i])) deleted++;
        }
      }
    }
    if (clearAll) setRecent([]); else setRecent(keep);
    return { count: deleted };
  }
  function remember(url) {
    var path = normalize(url); if (!isAudioPath(path)) return;
    var recent = getRecent().filter(function(p) { return p !== path; });
    recent.unshift(path); recent = recent.slice(0, getLimit()); setRecent(recent);
    setTimeout(function() { trim(false); }, 1200);
    setTimeout(function() { trim(false); }, 4500);
  }
  function setLimit(limit) {
    limit = Number(limit);
    if (ALLOWED_LIMITS.indexOf(limit) < 0) return getLimit();
    localStorage.setItem(LIMIT_KEY, String(limit));
    setRecent(getRecent().slice(0, limit));
    trim(false);
    return limit;
  }
  async function stats() {
    var count = 0;
    if ('caches' in global) {
      var names = await caches.keys();
      for (var n = 0; n < names.length; n++) {
        if (names[n].indexOf('kv-') !== 0) continue;
        var requests = await (await caches.open(names[n])).keys();
        for (var i = 0; i < requests.length; i++) if (isAudioPath(normalize(requests[i].url))) count++;
      }
    }
    var usage = 0, quota = 0;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        var estimate = await navigator.storage.estimate(); usage = estimate.usage || 0; quota = estimate.quota || 0;
      }
    } catch(e) {}
    return { count: count, usage: usage, quota: quota, limit: getLimit(), recent: getRecent().length };
  }
  global.AudioCacheManager = { remember: remember, trim: trim, clearAudio: function() { return trim(true); }, stats: stats, getLimit: getLimit, setLimit: setLimit };
  setTimeout(function() { trim(false); }, 2500);
})(window);