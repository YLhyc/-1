// Precise brace-balanced extraction of morning playback engine functions + invariants.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const region = html.slice(html.indexOf('// ── Playback engine ──'), html.indexOf('// ── Morning Review Page ──'));

function bodyOf(src, marker) {
  const idx = src.indexOf(marker);
  if (idx < 0) return null;
  const i = src.indexOf('{', idx + marker.length - 1);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

let bad = 0;
function assert(name, ok, extra) {
  console.log((ok ? 'OK   ' : 'BAD  ') + name + (ok ? '' : '  ' + (extra || '')));
  if (!ok) bad++;
}

// 1. au.onpause invariants
const onpause = bodyOf(region, 'au.onpause = function()');
assert('onpause handler found', !!onpause);
assert('onpause contains NO direct play() call', onpause && !/\.play\s*\(/.test(onpause));
assert('onpause uses unexpectedPauseTimer with 240ms debounce',
  onpause && /unexpectedPauseTimer\s*=\s*setTimeout/.test(onpause) && /240/.test(onpause));
assert('onpause delegates to handleFailure with AudioPaused',
  onpause && /handleFailure\(\{\s*name:\s*'AudioPaused'\s*\}\)/.test(onpause));

// 2. handleFailure invariants
const handleFailure = bodyOf(region, 'function handleFailure(err, playPromiseId)');
assert('handleFailure found', !!handleFailure);
assert('handleFailure AudioPaused branch calls attemptMorningResume(false)',
  handleFailure && /attemptMorningResume\(false\)/.test(handleFailure));
assert('handleFailure NotAllowedError pauses for audio failure',
  handleFailure && /err\.name\s*===\s*'NotAllowedError'/.test(handleFailure) && /pauseMorningForAudioFailure/.test(handleFailure));

// 3. au.onended & au.onerror invariants
const onended = bodyOf(region, 'au.onended = function()');
assert('onended found', !!onended);
assert('onended does not play() directly', onended && !/\.play\s*\(/.test(onended));
assert('onended detaches audio and calls playSegment',
  onended && /morningDetachAu\(au\)/.test(onended) && /playSegment\(\)/.test(onended));

const onerror = bodyOf(region, 'au.onerror = function()');
assert('onerror found', !!onerror);
assert('onerror does not play() directly', onerror && !/\.play\s*\(/.test(onerror));
assert('onerror delegates to handleFailure', onerror && /handleFailure\(/.test(onerror));

// 4. attemptMorningResume invariants
const attempt = bodyOf(region, 'function attemptMorningResume(');
assert('attemptMorningResume found', !!attempt);
assert('attemptMorningResume checks !morningPlaying || morningEnded || morningPos >= morningQueue.length',
  attempt && /!morningPlaying\s*\|\|\s*morningEnded\s*\|\|\s*morningPos\s*>=\s*morningQueue\.length/.test(attempt));
assert('attemptMorningResume coalesces in-flight attempts via morningResumePromise',
  attempt && /if\s*\(morningResumePromise\)\s*return\s*morningResumePromise/.test(attempt));

// 5. syncMorningPlayback invariants
const sync = bodyOf(region, 'function syncMorningPlayback()');
assert('syncMorningPlayback found', !!sync);
assert('syncMorningPlayback guards on !morningPlaying || morningEnded || morningPaused || morningPos >= morningQueue.length',
  sync && /!morningPlaying\s*\|\|\s*morningEnded\s*\|\|\s*morningPaused\s*\|\|\s*morningPos\s*>=\s*morningQueue\.length/.test(sync));
assert('syncMorningPlayback calls attemptMorningResume(false) when au.paused',
  sync && /attemptMorningResume\(false\)/.test(sync));

// 6. Token cancellation and PlayPromise serial invariants
assert('beginMorningPlayPromise increments serial',
  /function beginMorningPlayPromise\(\)\s*\{\s*morningCurrentPlayPromiseId\s*=\s*\+\+morningPlayPromiseSerial;\s*return morningCurrentPlayPromiseId;\s*\}/.test(region));
assert('invalidateMorningPlayPromise invalidates promise id',
  /function invalidateMorningPlayPromise\(\)\s*\{\s*morningPlayPromiseSerial\+\+;\s*morningCurrentPlayPromiseId\s*=\s*0;\s*\}/.test(region));
assert('morningPlayPromiseIsCurrent validates matching serial and id',
  /function morningPlayPromiseIsCurrent\(playPromiseId\)\s*\{\s*return playPromiseId === morningPlayPromiseSerial && playPromiseId === morningCurrentPlayPromiseId;\s*\}/.test(region));
assert('_morningPlayToken gates playMorningCurrent callbacks',
  /var token = _morningPlayToken;/.test(region) && /if \(token !== _morningPlayToken\) return;/.test(region));

// 7. Pause state & timer cleanup
const togglePause = bodyOf(region, 'function toggleMorningPause()');
assert('toggleMorningPause found', !!togglePause);
assert('toggleMorningPause clears watchdogs, invalidates promise, and sets paused state',
  togglePause && /morningClearAudioWatchdog\(\)/.test(togglePause) &&
  /morningClearResumeVerification\(\)/.test(togglePause) &&
  /invalidateMorningPlayPromise\(\)/.test(togglePause) &&
  /setMorningPausedState\(true\)/.test(togglePause));

// 8. endMorningSession cleanup
const endSession = bodyOf(region, 'function endMorningSession(');
assert('endMorningSession found', !!endSession);
assert('endMorningSession stops audio, sets playing=false, ended=true, and clears timers',
  endSession && /morningStopAudio\(\)/.test(endSession) &&
  /morningPlaying = false/.test(endSession) &&
  /morningEnded = true/.test(endSession) &&
  /cleanupMorningAudioCache\(\)/.test(endSession));

const stopAudio = bodyOf(region, 'function morningStopAudio()');
assert('morningStopAudio resets audio elements and clears timers',
  stopAudio && /morningClearAudioWatchdog\(\)/.test(stopAudio) &&
  /morningClearResumeVerification\(\)/.test(stopAudio) &&
  /morningAuA = null/.test(stopAudio) &&
  /morningAuB = null/.test(stopAudio));

console.log(bad ? '\n' + bad + ' INVARIANT(S) VIOLATED' : '\nALL PLAYBACK INVARIANTS HOLD');
process.exit(bad ? 1 : 0);
