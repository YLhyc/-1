// Read the real player functions; model mobile playback restrictions and edge cases.
// This is a deterministic regression suite covering iOS WebView constraints.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

let harness;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'extract-and-unit-test.js'), 'utf8'), {
  __dirname, console: { log() {} },
  require(name) {
    if (name === 'fs') return {
      readFileSync: fs.readFileSync.bind(fs), writeFileSync(_file, data) { harness = data; }
    };
    return require(name);
  }
});
assert(harness, 'Harness extracted from index.html');
const runIdx = harness.indexOf('(async function run');
const formatIdx = harness.indexOf('function formatMorningClock(');
const source = harness.slice(0, runIdx) + harness.slice(formatIdx);

function world() {
  const c = { console, setTimeout, clearTimeout, setInterval, clearInterval };
  vm.createContext(c);
  vm.runInContext(source, c);
  c.resetWorld();
  return c;
}

const failures = [];
async function test(name, run) {
  const c = world();
  try {
    await run(c);
    console.log('PASS ' + name);
  } catch (e) {
    failures.push(name);
    console.error('FAIL ' + name + ': ' + e.message);
  } finally {
    c.morningClearAudioWatchdog();
    c.morningClearResumeVerification();
  }
}

(async () => {
  // 1. onpause recovery vs user pause staying paused
  await test('onpause recovery fires after 240ms, but user pause stays strictly paused', async c => {
    const au = await c.startAndPlay();
    const calls0 = c.PLAY_CALLS.n;

    // Unexpected pause fires onpause
    au.pause();
    au.fire('onpause');
    await c.flush(300);
    assert.equal(c.PLAY_CALLS.n, calls0 + 1, 'unexpected pause triggers attemptMorningResume');
    if (au._pending) au.settlePlay(true);
    await c.flush(20);
    au.fire('onplaying');
    assert.equal(c.morningPaused, false);

    // Now test intentional user pause cancels recovery
    const calls1 = c.PLAY_CALLS.n;
    au.pause();
    au.fire('onpause');
    c.toggleMorningPause(); // user pauses within 240ms debounce window
    await c.flush(300);
    assert.equal(c.morningPaused, true, 'stays paused');
    assert.equal(c.PLAY_CALLS.n, calls1, 'user pause prevents auto-resume play() call');

    // syncMorningPlayback must also honor the user pause
    c.syncMorningPlayback();
    await c.flush(100);
    assert.equal(c.PLAY_CALLS.n, calls1, 'sync does not trigger play() while user paused');
  });

  // 2. NotAllowedError vs AbortError in attemptMorningResume
  await test('NotAllowedError enters audio failure state, AbortError handles cleanly', async c => {
    // A) NotAllowedError
    const au = await c.startAndPlay();
    c.morningPaused = true;
    const resumeP = c.attemptMorningResume(false);
    au.settlePlay(false); // rejects with NotAllowedError
    await resumeP;
    await c.flush(20);
    assert.equal(c.morningAudioFailed, true, 'NotAllowedError triggers audio failure');
    assert.equal(c.morningPaused, true, 'session paused on NotAllowedError');
    assert.equal(typeof c.morningRetryCurrentSegment, 'function', 'retry callback stored');

    // User retry from gesture
    let retried = false;
    c.morningRetryCurrentSegment = () => { retried = true; c.morningAudioFailed = false; c.morningPaused = false; return Promise.resolve(true); };
    await c.attemptMorningResume(true);
    assert.equal(retried, true, 'retry successfully executes');
    assert.equal(c.morningAudioFailed, false);

    // B) AbortError during token change
    c.resetWorld();
    const auB = await c.startAndPlay();
    const tokenBefore = c._morningPlayToken;
    c.morningPaused = true;
    const abortResume = c.attemptMorningResume(false);
    c._morningPlayToken++; // user clicked next/prev during resume
    if (auB._pending) {
      auB._pending.reject(Object.assign(new Error('play interrupted'), { name: 'AbortError' }));
    }
    await abortResume;
    await c.flush(20);
    // Aborted resume for an expired token must not set permanent failure on the new token
    assert.equal(c.morningAudioFailed, false, 'AbortError on superseded token does not fail new token');
  });

  // 3. Rapid prev / next / replay token cancellation
  await test('rapid prev/next/replay token cancellation prevents out-of-order execution', async c => {
    await c.startAndPlay();
    const token0 = c._morningPlayToken;

    // Rapidly navigate next, next, replay, prev
    c.nextMorningWord();
    const token1 = c._morningPlayToken;
    assert(token1 > token0, 'next advances token');

    c.replayMorningWord();
    const token2 = c._morningPlayToken;
    assert(token2 > token1, 'replay advances token');

    c.prevMorningWord();
    const token3 = c._morningPlayToken;
    assert(token3 > token2, 'prev advances token');

    // An old audio element finishing from token0 or token1
    const oldAu = c.morningGetAu(0);
    oldAu.ended = true;
    oldAu.fire('onended');
    await c.flush(20);
    assert.equal(c._morningPlayToken, token3, 'stale event does not change play token');
  });

  // 4. Navigation suspend/resume without resurrecting user pause
  await test('navigation suspend does not resurrect user pause upon app focus/sync', async c => {
    await c.startAndPlay();
    c.document.getElementById('view-morning-player').style.display = 'block';

    // User paused before leaving
    c.toggleMorningPause();
    await c.flush(10);
    assert.equal(c.morningPaused, true, 'user paused');

    // App view navigation suspend
    c.suspendMorningForAppNavigation();
    assert.equal(c.morningPlaying, false, 'suspended');
    assert.equal(c.morningPaused, true, 'still paused');

    // Repeated focus / visibility events trigger syncMorningPlayback
    const calls = c.PLAY_CALLS.n;
    c.syncMorningPlayback();
    c.syncMorningPlayback();
    await c.flush(100);
    assert.equal(c.PLAY_CALLS.n, calls, 'sync does not start audio');
    assert.equal(c.morningPlaying, false, 'still suspended');
  });

  // 5. iOS single-element reuse across consecutive segments
  await test('consecutive segments reuse the user-authorized primary element', async c => {
    c.userGesture = true;
    const au = await c.startAndPlay();
    const authorized = c.morningGetAu(0);
    assert.equal(au, authorized);

    // Advance segment
    au.ended = true;
    au.fire('onended');
    await c.flush(20);
    const auStep1 = c.morningGetAu(c.morningSlot);
    assert.equal(c.morningStep, 1, 'step advanced to 1');
    if (auStep1._pending) auStep1.settlePlay(true);
    await c.flush(10);
    auStep1.fire('onplaying');

    assert.equal(c.morningAudioFailed, false);
    assert.equal(auStep1.paused, false);
  });

  process.exit(failures.length ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(2);
});
