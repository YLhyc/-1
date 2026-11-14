(function(global) {
  'use strict';

  var RECENT_KEY = 'audio_cache_recent_v1';
  var CLIP_RECENT_KEY = 'audio_clip_cache_recent_v1';
  var URL_MAP_KEY = 'audio_cache_urls_v1';
  var LIMIT_KEY = 'audio_cache_limit_v1';
  var ALLOWED_LIMITS = [5, 10, 20];
  var CLIP_LIMIT = 120;

  var trimChain = Promise.resolve();
  var rememberTrimTimer = null;

  function getBaseHref() {
    try {
      if (global.location && global.location.href) return global.location.href;
    } catch(e) {}
    return 'http://localhost/';
  }

  function normalize(url) {
    try {
      return new URL(url, getBaseHref()).pathname;
    } catch(e) {
      return '';
    }
  }

  function toPathAndSearch(url) {
    try {
      var u = new URL(url, getBaseHref());
      return u.pathname + u.search;
    } catch(e) {
      return String(url || '');
    }
  }

  function isBundlePath(path) {
    return /\/audio_g\d+\.json$/.test(path) || /\/hb\/audio_unit\d+\.json$/.test(path);
  }

  function isClipPath(path) {
    return /\/wordbank\/audio\/.+\.mp3$/.test(path);
  }

  function isAudioPath(path) {
    return isBundlePath(path) || isClipPath(path);
  }

  function getLimit() {
    try {
      var n = Number(localStorage.getItem(LIMIT_KEY)) || 10;
      return ALLOWED_LIMITS.indexOf(n) >= 0 ? n : 10;
    } catch(e) {
      return 10;
    }
  }

  function readRecent(key, filterFn) {
    try {
      var raw = localStorage.getItem(key);
      var arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr.filter(filterFn) : [];
    } catch(e) {
      return [];
    }
  }

  function writeRecent(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch(e) {}
  }

  function readUrlMap() {
    try {
      var raw = localStorage.getItem(URL_MAP_KEY);
      var map = JSON.parse(raw || '{}');
      return (map && typeof map === 'object') ? map : {};
    } catch(e) {
      return {};
    }
  }

  function writeUrlMap(map) {
    try {
      localStorage.setItem(URL_MAP_KEY, JSON.stringify(map));
    } catch(e) {}
  }

  var lastUrlByPath = readUrlMap();

  function recordRememberedUrl(path, fullUrl) {
    lastUrlByPath[path] = fullUrl;
    writeUrlMap(lastUrlByPath);
  }

  function cleanUrlMap(allowedPaths) {
    var nextMap = {};
    for (var i = 0; i < allowedPaths.length; i++) {
      var p = allowedPaths[i];
      if (lastUrlByPath[p]) nextMap[p] = lastUrlByPath[p];
    }
    lastUrlByPath = nextMap;
    writeUrlMap(lastUrlByPath);
  }

  function processSingleCache(cache, clearAll, keepBundlesSet, keepClipsSet) {
    return cache.keys().then(function(requests) {
      var byPath = {};
      var pathsOrder = [];
      for (var i = 0; i < requests.length; i++) {
        var req = requests[i];
        var p = normalize(req.url);
        if (!isAudioPath(p)) continue;
        if (!byPath[p]) {
          byPath[p] = [];
          pathsOrder.push(p);
        }
        byPath[p].push(req);
      }

      var deletions = [];
      var deletedBundles = 0;
      var deletedClips = 0;

      for (var j = 0; j < pathsOrder.length; j++) {
        var path = pathsOrder[j];
        var reqList = byPath[path];
        var isBundle = isBundlePath(path);
        var isKept = !clearAll && (isBundle ? keepBundlesSet[path] : keepClipsSet[path]);

        if (!isKept) {
          // Evict all requests for this path
          for (var k = 0; k < reqList.length; k++) {
            (function(reqItem, bundleFlag) {
              deletions.push(
                cache.delete(reqItem).then(function(ok) {
                  if (ok) {
                    if (bundleFlag) deletedBundles++;
                    else deletedClips++;
                  }
                }).catch(function() {})
              );
            })(reqList[k], isBundle);
          }
        } else {
          // Keep at most ONE entry for this path; prefer lastUrlByPath[path], or last seen entry
          var targetFull = lastUrlByPath[path] || '';
          var keepIndex = -1;
          if (targetFull) {
            for (var m = 0; m < reqList.length; m++) {
              if (toPathAndSearch(reqList[m].url) === targetFull) {
                keepIndex = m;
                break;
              }
            }
          }
          if (keepIndex < 0) {
            keepIndex = reqList.length - 1;
          }

          for (var n = 0; n < reqList.length; n++) {
            if (n === keepIndex) continue;
            (function(reqItem, bundleFlag) {
              deletions.push(
                cache.delete(reqItem).then(function(ok) {
                  if (ok) {
                    if (bundleFlag) deletedBundles++;
                    else deletedClips++;
                  }
                }).catch(function() {})
              );
            })(reqList[n], isBundle);
          }
        }
      }

      return Promise.all(deletions).then(function() {
        return { bundles: deletedBundles, clips: deletedClips };
      });
    });
  }

  function doTrim(clearAll) {
    var limit = getLimit();
    if (!('caches' in global)) {
      return Promise.resolve({
        count: 0,
        bundleCount: 0,
        clipCount: 0,
        limit: limit,
        clipLimit: CLIP_LIMIT,
        recent: []
      });
    }

    var keepBundles = clearAll ? [] : readRecent(RECENT_KEY, isBundlePath).slice(0, limit);
    var keepClips = clearAll ? [] : readRecent(CLIP_RECENT_KEY, isClipPath).slice(0, CLIP_LIMIT);

    var keepBundlesSet = {};
    for (var b = 0; b < keepBundles.length; b++) keepBundlesSet[keepBundles[b]] = true;

    var keepClipsSet = {};
    for (var c = 0; c < keepClips.length; c++) keepClipsSet[keepClips[c]] = true;

    return caches.keys().then(function(names) {
      var kvNames = names.filter(function(name) { return name.indexOf('kv-') === 0; });
      var step = Promise.resolve({ bundles: 0, clips: 0 });

      kvNames.forEach(function(cacheName) {
        step = step.then(function(acc) {
          return caches.open(cacheName).then(function(cache) {
            return processSingleCache(cache, clearAll, keepBundlesSet, keepClipsSet).then(function(res) {
              return {
                bundles: acc.bundles + res.bundles,
                clips: acc.clips + res.clips
              };
            });
          }).catch(function() {
            return acc;
          });
        });
      });

      return step;
    }).then(function(totals) {
      if (clearAll) {
        writeRecent(RECENT_KEY, []);
        writeRecent(CLIP_RECENT_KEY, []);
        lastUrlByPath = {};
        writeUrlMap({});
      } else {
        writeRecent(RECENT_KEY, keepBundles);
        writeRecent(CLIP_RECENT_KEY, keepClips);
        cleanUrlMap(keepBundles.concat(keepClips));
      }

      var totalDeleted = totals.bundles + totals.clips;
      return {
        count: totalDeleted,
        bundleCount: totals.bundles,
        clipCount: totals.clips,
        limit: limit,
        clipLimit: CLIP_LIMIT,
        recent: clearAll ? [] : keepBundles
      };
    }).catch(function() {
      return {
        count: 0,
        bundleCount: 0,
        clipCount: 0,
        limit: limit,
        clipLimit: CLIP_LIMIT,
        recent: clearAll ? [] : keepBundles
      };
    });
  }

  function trim(clearAll) {
    var run = function() {
      return doTrim(!!clearAll);
    };
    var resultPromise = trimChain.then(run, run);
    trimChain = resultPromise.then(function() {}, function() {});
    return resultPromise;
  }

  function remember(url) {
    var path = normalize(url);
    if (!isAudioPath(path)) return;
    var fullUrl = toPathAndSearch(url);

    try {
      if (isBundlePath(path)) {
        var bundleRecent = readRecent(RECENT_KEY, isBundlePath).filter(function(p) { return p !== path; });
        bundleRecent.unshift(path);
        bundleRecent = bundleRecent.slice(0, getLimit());
        writeRecent(RECENT_KEY, bundleRecent);
      } else if (isClipPath(path)) {
        var clipRecent = readRecent(CLIP_RECENT_KEY, isClipPath).filter(function(p) { return p !== path; });
        clipRecent.unshift(path);
        clipRecent = clipRecent.slice(0, CLIP_LIMIT);
        writeRecent(CLIP_RECENT_KEY, clipRecent);
      }
      recordRememberedUrl(path, fullUrl);
    } catch(e) {}

    if (rememberTrimTimer) clearTimeout(rememberTrimTimer);
    rememberTrimTimer = setTimeout(function() {
      rememberTrimTimer = null;
      trim(false);
    }, 1500);
  }

  function setLimit(limit) {
    limit = Number(limit);
    if (ALLOWED_LIMITS.indexOf(limit) < 0) return getLimit();
    try {
      localStorage.setItem(LIMIT_KEY, String(limit));
    } catch(e) {}
    var recent = readRecent(RECENT_KEY, isBundlePath).slice(0, limit);
    writeRecent(RECENT_KEY, recent);
    trim(false);
    return limit;
  }

  function clearAudio() {
    return trim(true);
  }

  function stats() {
    var limit = getLimit();
    var bundlePaths = {};
    var clipPaths = {};

    var getCounts = Promise.resolve();
    if ('caches' in global) {
      getCounts = caches.keys().then(function(names) {
        var kvNames = names.filter(function(n) { return n.indexOf('kv-') === 0; });
        return Promise.all(kvNames.map(function(cacheName) {
          return caches.open(cacheName).then(function(cache) {
            return cache.keys().then(function(requests) {
              for (var i = 0; i < requests.length; i++) {
                var p = normalize(requests[i].url);
                if (isBundlePath(p)) bundlePaths[p] = true;
                else if (isClipPath(p)) clipPaths[p] = true;
              }
            });
          }).catch(function() {});
        }));
      }).catch(function() {});
    }

    return getCounts.then(function() {
      var usage = 0;
      var quota = 0;
      var getStorage = Promise.resolve();

      try {
        if (navigator.storage && navigator.storage.estimate) {
          getStorage = navigator.storage.estimate().then(function(est) {
            if (est) {
              usage = est.usage || 0;
              quota = est.quota || 0;
            }
          }).catch(function() {});
        }
      } catch(e) {}

      return getStorage.then(function() {
        var bCount = Object.keys(bundlePaths).length;
        var cCount = Object.keys(clipPaths).length;
        return {
          count: bCount,
          bundleCount: bCount,
          clipCount: cCount,
          totalCount: bCount + cCount,
          limit: limit,
          clipLimit: CLIP_LIMIT,
          recent: readRecent(RECENT_KEY, isBundlePath),
          usage: usage,
          quota: quota
        };
      });
    });
  }

  global.AudioCacheManager = {
    remember: remember,
    trim: trim,
    clearAudio: clearAudio,
    stats: stats,
    getLimit: getLimit,
    setLimit: setLimit
  };

  setTimeout(function() {
    trim(false);
  }, 2500);

})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this)));
