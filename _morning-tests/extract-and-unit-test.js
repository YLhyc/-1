// Test harness: extracts the REAL morning-player functions from index.html and
// drives them against a fake Audio element to verify the playback state machine.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scriptStart = html.indexOf('// ── Playback engine ──');
const scriptEnd = html.indexOf('// ── Morning Review Page ──');
const region = html.slice(scriptStart, scriptEnd);

function extractFunc(src, name) {
  const idx = src.indexOf('function ' + name + '(');
  if (idx < 0) throw new Error('missing function ' + name);
  const i = src.indexOf('{', idx);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(idx, j + 1); }
  }
  throw new Error('unbalanced ' + name);
}

const want = [
  'formatMorningClock', 'estimateMorningRemainingSec', 'morningElapsedMs', 'pauseMorningClock',
  'resumeMorningClock', 'getMorningStepLabels', 'getMorningHardAppendInfo',
  'morningGetAu', 'morningClearAudioWatchdog', 'morningClearResumeVerification',
  'beginMorningPlayPromise', 'invalidateMorningPlayPromise', 'morningPlayPromiseIsCurrent',
  'morningDetachAu', 'morningLoadAu', 'morningPreloadAu', 'morningResetAu', 'morningStopAudio',
  'morningSoftStopAudio', 'pauseMorningForAudioFailure', 'updateMorningPlayerUI',
  'morningExamples', 'updateMorningExamplePager', 'morningExampleStep', 'updateMorningProgressUI',
  'countMorningQueueDone', 'updateMorningTimeUI', 'updateMorningRatingUI', 'finishMorningCurrentWord',
  'skipMorningCurrentForFamiliar', 'playMorningCurrent', 'maybeExtendOrEnd', 'prepareMorningPlayer',
  'startNewMorning', 'startMorning', 'resumeMorningSession', 'pauseMorningForBackground',
  'suspendMorningForAppNavigation', 'setMorningPausedState', 'resumeMorningAfterNavigation',
  'restartMorningCurrentSegment', 'holdMorningResumeFailure', 'armMorningResumeProgressCheck',
  'trackMorningResumePromise', 'attemptMorningResume', 'syncMorningPlayback', 'toggleMorningPause',
  'prevMorningWord', 'nextMorningWord', 'replayMorningWord', 'undoMorningRating',
  'restartMorningWordForRating', 'setMorningCurrentRating', 'markMorningHard', 'markMorningFamiliar',
  'skipMorningWord', 'confirmEndMorning', 'closeMorningExitSheet', 'saveAndExitMorning',
  'endMorningFromSheet', 'endMorningSession'
];

let code = '';
for (const f of want) code += extractFunc(region, f) + '\n\n';

const stub = `
// ── module-local globals (mirrors index.html names) ──
var morningPaused = false;
var morningPlaying = false;
var _morningPlayToken = 0;
var morningPos = 0;
var morningStep = 0;
var morningSlot = 0;
var morningAuA = null;
var morningAuB = null;
var morningAuUrlA = null;
var morningAuUrlB = null;
var morningSingle = false;
var morningRatingRestartPending = null;
var morningRatingAppendPending = null;
var morningDisplayStepInfo = null;
var morningCurrentAudioUrl = null;
var morningCurrentAudioToken = 0;
var morningAudioAttemptSerial = 0;
var morningPlayPromiseSerial = 0;
var morningCurrentPlayPromiseId = 0;
var morningAudioWatchdog = null;
var morningResumeVerificationTimer = null;
var MORNING_RESUME_START_TIMEOUT_MS = 4500;
var MORNING_RESUME_PROGRESS_TIMEOUT_MS = 1600;
var morningCurrentSegmentProgress = 0;
var morningCurrentSegmentLang = null;
var morningCurrentSegmentRate = 1;
var morningSegmentLoadStartedAt = 0;
var morningSegmentPlayingAt = 0;
var morningCurrentWordCompletedSteps = 0;
var morningCurrentWordTotalSteps = 1;
var morningSessionStart = 0;
var morningActiveStartedAt = 0;
var morningElapsedActiveMs = 0;
var morningSessionHard = 0;
var morningSessionFamiliar = 0;
var morningSessionSkipped = 0;
var morningSessionCompleted = 0;
var morningEnded = false;
var morningElapsedTimer = null;
var morningActiveSaveTimer = null;
var morningResumePromise = null;
var morningExitShouldResume = false;
var morningAudioFailed = false;
var morningRetryCurrentSegment = null;

var morningQueue = [];
var morningSettings = { durationMin: 25 };
var morningQueueEstSec = 0;
var morningPlanningContext = null;
var morningExampleWordKey = '';
var morningExampleIndex = 0;
var morningQueueBuiltAt = 0;

// ── stubs for out-of-scope app code ──
var PLAY_CALLS = { n: 0 };
function makeEl() {
  return {
    textContent: '',
    innerHTML: '',
    style: { setProperty() {} },
    disabled: false,
    attrs: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; },
    classList: {
      _classes: new Set(),
      toggle(cls, force) {
        if (force === undefined) {
          if (this._classes.has(cls)) this._classes.delete(cls); else this._classes.add(cls);
        } else if (force) this._classes.add(cls);
        else this._classes.delete(cls);
      },
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      contains(cls) { return this._classes.has(cls); }
    },
    parentElement: { classList: { toggle() {}, add() {}, remove() {} } }
  };
}
var els = {};
var document = {
  getElementById(id) {
    if (!els[id]) els[id] = makeEl();
    return els[id];
  },
  querySelectorAll() { return []; }
};

function FakeAudio() {
  this.paused = true;
  this.currentTime = 0;
  this.duration = 10;
  this.ended = false;
  this.muted = false;
  this.volume = 1;
  this.playbackRate = 1;
  this.seeking = false;
  this.src = '';
  this.error = null;
  this.readyState = 4;
  this.preload = 'auto';
  this._pending = null;
}
FakeAudio.prototype.play = function() {
  PLAY_CALLS.n++;
  const self = this;
  const p = new Promise(function(resolve, reject) {
    self._pending = { resolve: resolve, reject: reject };
  });
  p.then(function() {
    self.paused = false;
  }, function() {});
  return p;
};
FakeAudio.prototype.load = function() {
  this.currentTime = 0;
  this.ended = false;
  this.error = null;
};
FakeAudio.prototype.removeAttribute = function(a) {
  if (a === 'src') this.src = '';
};
FakeAudio.prototype.pause = function() {
  this.paused = true;
};
FakeAudio.prototype.settlePlay = function(ok) {
  const p = this._pending;
  this._pending = null;
  if (!p) return;
  if (ok === false) {
    p.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
  } else {
    this.paused = false;
    p.resolve();
  }
};
FakeAudio.prototype.fire = function(name) {
  if (this[name]) this[name]({ type: name });
};
function flush(ms) {
  return new Promise(function(r) { setTimeout(r, ms || 0); });
}
var Audio = FakeAudio;

function escapeHTML(s) { return String(s || ''); }
function morningReasonLabel(item) { return (item && item.reason) || '复习'; }
function trimMorningAudioCache() {}
function cleanupMorningAudioCache() {}
function prewarmMorningImmediateNext() {}
function prefetchMorningAudioSequence() {}
function saveMorningActiveSession() {}
function loadMorningActiveSession() { return null; }
function archiveMorningActiveSession() {}
function clearMorningActiveSession() {}
function advanceMorningCursor() {}
function updateMorningMeta() {}
function morningKey(item) { return item ? item.en : ''; }
function loadMorningTiming() { return { segmentSec: { en: 1, cn: 1 }, loadSec: 0.1 }; }
function recordMorningTimingSample() {}
function loadMorningSettings() { return { durationMin: 25 }; }
function saveMorningSettings() {}
function loadMorningSessions() { return []; }
function saveMorningSessions() {}
function alert() {}
function loadMorningMeta() { return {}; }
function saveMorningMeta() {}
function getMorningStats() { return { due: 0 }; }
function wordHeardYesterday() { return false; }
function wordHeardDayBefore() { return false; }
function buildMorningQueue() {}
function refreshMorningQueue() {}
function buildMorningCandidates() { return []; }
function estimateWordDurationSec() { return 10; }
function hideAllViews() {}
function showMorningHome() {}
function bindMorningCardSwipe() {}
var ReviewCore = {
  applyRating: function() { return { hadPref: false, oldPref: null }; },
  undoRating: function() {},
  upcomingReviewCount: function() { return 0; }
};
function getTodayReciteDayStats() { return { completed: 0 }; }
var FocusCore = { buttonHTML: function() { return ''; } };
var StudyCopy = { updateButton: function() {} };
var WordsMotion = { bindCardSwipe: function() {} };

function ensureMorningAudio(item, cb) {
  cb(null, {});
}
function morningSegUrl(item, step) {
  if (!item || !item._urls) return 'blob:seg' + step;
  return item._urls[step] || null;
}
function releaseAudioElement(au) {
  if (!au) return;
  morningDetachAu(au);
  try { au.pause(); } catch (e) {}
  try { au.removeAttribute('src'); } catch (e) {}
  try { au.load(); } catch (e) {}
}

var failures = [];
function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function newItem(en) {
  return {
    en: en,
    cn: '测试',
    idx: 0,
    source: 'hb',
    morningRating: null,
    morningCompleted: false,
    morningSkipped: false,
    _urls: ['blob:seg0', 'blob:seg1']
  };
}

function resetWorld() {
  PLAY_CALLS.n = 0;
  morningAuA = null;
  morningAuB = null;
  morningAuUrlA = null;
  morningAuUrlB = null;
  morningQueue = [newItem('alpha'), newItem('beta')];
  morningPos = 0;
  morningStep = 0;
  morningSlot = 0;
  morningPlaying = true;
  morningEnded = false;
  morningPaused = false;
  morningAudioFailed = false;
  morningRetryCurrentSegment = null;
  morningResumePromise = null;
  morningAudioAttemptSerial = 0;
  morningPlayPromiseSerial = 0;
  morningCurrentPlayPromiseId = 0;
  morningCurrentAudioUrl = null;
  morningCurrentAudioToken = 0;
  _morningPlayToken = 0;
  morningCurrentWordCompletedSteps = 0;
  morningCurrentWordTotalSteps = 2;
  morningSingle = false;
  morningRatingRestartPending = null;
  morningRatingAppendPending = null;
  morningDisplayStepInfo = null;
  morningAudioWatchdog = null;
  morningResumeVerificationTimer = null;
  morningSessionStart = Date.now();
  morningActiveStartedAt = Date.now();
  morningElapsedActiveMs = 0;
  morningSessionHard = 0;
  morningSessionFamiliar = 0;
  morningSessionSkipped = 0;
  morningSessionCompleted = 0;
}

// helper: run playMorningCurrent and settle play promise
function startAndPlay() {
  playMorningCurrent();
  const au = morningGetAu(morningSlot);
  au.settlePlay(true);
  return flush(5).then(function() {
    au.fire('onplaying');
    return flush(5);
  }).then(function() {
    return au;
  });
}

(async function run(){
  // ── S1: start -> playing; user pause is terminal; focus/sync never auto-resumes ──
  resetWorld();
  var au = await startAndPlay();
  assert(morningPlaying === true && morningPaused === false, 'S1 playing state active');
  assert(els['mpBtnPlay'].innerHTML.indexOf('<rect') >= 0, 'S1 pause icon rendered');
  assert(els['mpBtnPlay'].getAttribute('aria-label') === '暂停', 'S1 pause aria-label');

  toggleMorningPause(); await flush(5);
  assert(morningPaused === true, 'S1 paused state');
  assert(au.paused === true, 'S1 audio element paused');
  assert(els['mpBtnPlay'].innerHTML.indexOf('<polygon') >= 0, 'S1 play icon rendered');
  assert(els['mpBtnPlay'].getAttribute('aria-label') === '播放', 'S1 play aria-label');

  // onpause event while already paused must NOT trigger auto-play
  au.fire('onpause'); await flush(300);
  assert(PLAY_CALLS.n === 1, 'S1 onpause must not auto-play when user paused');

  // syncMorningPlayback must never resurrect paused playback
  syncMorningPlayback(); await flush(100);
  syncMorningPlayback(); await flush(100);
  assert(PLAY_CALLS.n === 1, 'S1 syncMorningPlayback must not resume paused session');
  assert(morningPaused === true, 'S1 stays paused');

  // toggleMorningPause resumes
  toggleMorningPause(); await flush(5);
  if (au._pending) au.settlePlay(true);
  await flush(10);
  assert(morningPaused === false, 'S1 unpaused');
  au.fire('onplaying'); await flush(5);
  assert(morningPlaying === true && morningPaused === false, 'S1 resumed playing');

  // ── S2: token cancellation prevents stale callbacks from corrupting engine ──
  resetWorld();
  var au2 = await startAndPlay();
  var oldToken = _morningPlayToken;
  _morningPlayToken++; // simulate token advancement (e.g. rapid user action)
  au2.fire('onplaying');
  au2.fire('ontimeupdate');
  assert(morningPos === 0, 'S2 position unaffected by stale token events');

  // ── S3: toggleMorningPause spam ends in stable state ──
  resetWorld();
  await startAndPlay();
  toggleMorningPause(); await flush(5);
  toggleMorningPause(); await flush(5);
  toggleMorningPause(); await flush(5);
  assert(morningPaused === true, 'S3 odd number of toggles leaves player paused');
  syncMorningPlayback(); await flush(100);
  assert(morningPaused === true, 'S3 paused state holds across sync');

  // ── S4: pauseMorningForAudioFailure -> retry button/callback recovery ──
  resetWorld();
  await startAndPlay();
  var retryCalled = false;
  var failedToken = _morningPlayToken;
  var currentItem = morningQueue[morningPos];
  pauseMorningForAudioFailure(failedToken, currentItem, function() {
    retryCalled = true;
    morningPaused = false;
    morningAudioFailed = false;
    return Promise.resolve(true);
  });
  assert(morningPaused === true, 'S4 failure pauses playback');
  assert(morningAudioFailed === true, 'S4 marks audio failed');
  assert(typeof morningRetryCurrentSegment === 'function', 'S4 stores retry callback');

  // Trigger retry through toggleMorningPause or attemptMorningResume
  await attemptMorningResume(true);
  await flush(20);
  assert(retryCalled === true, 'S4 retry callback was executed');
  assert(morningAudioFailed === false, 'S4 error cleared on retry');

  // ── S5: attemptMorningResume coalescing & bounds checks ──
  resetWorld();
  morningPlaying = false;
  var resStopped = await attemptMorningResume(false);
  assert(resStopped === false, 'S5 stopped session rejects resume');

  resetWorld();
  morningPos = 999;
  var resOutOfBounds = await attemptMorningResume(false);
  assert(resOutOfBounds === false, 'S5 out of bounds position rejects resume');

  resetWorld();
  await startAndPlay();
  morningPaused = true;
  var p1 = attemptMorningResume(false);
  var p2 = attemptMorningResume(false);
  assert(p1 === p2, 'S5 in-flight resumes coalesce to single promise');
  var auResume = morningGetAu(morningSlot);
  if (auResume._pending) auResume.settlePlay(true);
  await p1;
  assert(morningResumePromise === null, 'S5 resume promise cleared after settling');

  // ── S6: au.onpause 240ms recovery + user-pause cancellation ──
  resetWorld();
  var au6 = await startAndPlay();
  var callsBefore = PLAY_CALLS.n;
  // Trigger unexpected pause
  au6.pause();
  au6.fire('onpause');
  // If user pauses within 240ms, unexpected pause timer must NOT resume
  toggleMorningPause();
  await flush(300);
  assert(morningPaused === true, 'S6 user pause cancels unexpected pause recovery');
  assert(PLAY_CALLS.n === callsBefore, 'S6 no extra play call made after user pause');

  // ── S7: unexpected pause beyond 240ms without user pause attempts recovery ──
  resetWorld();
  var au7 = await startAndPlay();
  var callsBefore7 = PLAY_CALLS.n;
  au7.pause();
  au7.fire('onpause');
  await flush(350);
  assert(PLAY_CALLS.n > callsBefore7, 'S7 unexpected pause triggers recovery play()');
  if (au7._pending) au7.settlePlay(true);
  await flush(10);
  au7.fire('onplaying');
  assert(morningPaused === false, 'S7 recovered playback');

  // ── S8: endMorningSession cleanup ──
  resetWorld();
  await startAndPlay();
  endMorningSession('completed');
  assert(morningPlaying === false, 'S8 playing is false after end');
  assert(morningEnded === true, 'S8 ended is true after end');
  assert(morningAuA === null && morningAuB === null, 'S8 audio elements released');

  // ── S9: next / prev / replay while playing vs while paused ──
  resetWorld();
  await startAndPlay();
  nextMorningWord(); await flush(10);
  assert(morningPos === 1, 'S9 next advances position');
  assert(morningPaused === false, 'S9 next while playing stays playing');

  prevMorningWord(); await flush(10);
  assert(morningPos === 0, 'S9 prev returns position');
  assert(morningPaused === false, 'S9 prev while playing stays playing');

  // While paused: next/prev advances cursor but does not play audio
  toggleMorningPause(); await flush(5);
  var pauseCalls = PLAY_CALLS.n;
  nextMorningWord(); await flush(300);
  assert(morningPos === 1, 'S9 next while paused advances cursor');
  assert(morningPaused === true, 'S9 next while paused stays paused');
  assert(PLAY_CALLS.n === pauseCalls, 'S9 next while paused does not call play');

  prevMorningWord(); await flush(300);
  assert(morningPos === 0, 'S9 prev while paused retreats cursor');
  assert(morningPaused === true, 'S9 prev while paused stays paused');
  assert(PLAY_CALLS.n === pauseCalls, 'S9 prev while paused does not call play');

  // ── S10: skip while playing vs while paused ──
  resetWorld();
  await startAndPlay();
  skipMorningWord(); await flush(10);
  assert(morningPos === 1, 'S10 skip advances position');
  assert(morningQueue[0].morningSkipped === true, 'S10 marks item skipped');

  // ── S11: suspendMorningForAppNavigation ──
  resetWorld();
  await startAndPlay();
  document.getElementById('view-morning-player').style.display = 'block';
  suspendMorningForAppNavigation();
  assert(morningPaused === true, 'S11 suspended sets morningPaused');
  assert(morningPlaying === false, 'S11 suspended stops playing');

  console.log(failures.length ? 'FAILURES:\\n - ' + failures.join('\\n - ') : 'ALL MORNING STATE-MACHINE TESTS PASSED');
  process.exit(failures.length ? 1 : 0);
})();
`;

fs.writeFileSync(path.join(__dirname, '_morning_extracted.js'), stub + '\n' + code, 'utf8');
console.log('harness written ->', path.join(__dirname, '_morning_extracted.js'));
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  require(path.join(__dirname, '_morning_extracted.js'));
}
