// Real-browser E2E test for the morning-listening player.
// Serves the project over HTTP and drives the actual page in Chrome via Playwright.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORT = 8123;
const CDP_PORT = 9333;
const CHROME = 'C:\\Users\\23756\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end('nf');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const results = [];
let managedChrome, managedBrowser;
function check(name, ok, detail) {
  results.push({ name, ok, detail });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

(async () => {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  // Launch Chrome ourselves (the pipe transport is unavailable in this sandbox)
  // and attach Playwright over the TCP CDP endpoint.
  const profile = path.join(os.tmpdir(), 'dsh-morning-e2e-' + Date.now());
  fs.mkdirSync(profile, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile,
    '--mute-audio',
    '--window-size=1280,900', 'about:blank'
  ], { stdio: 'ignore' });
  managedChrome = chrome;

  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      await getJson('http://127.0.0.1:' + CDP_PORT + '/json/version');
      up = true;
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  if (!up) {
    console.log('chrome CDP did not start');
    process.exit(2);
  }

  const browser = await chromium.connectOverCDP('http://127.0.0.1:' + CDP_PORT);
  managedBrowser = browser;
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));

  // Keep the page stable: no service-worker controller change may reload it mid-test.
  await page.addInitScript(() => {
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register = function () {
          return Promise.reject(new Error('sw disabled for test'));
        };
      }
    } catch (e) {}
  });
  await page.route('**/sw.js*', r => r.abort());
  await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Instrument play() BEFORE the app uses it.
  await page.evaluate(() => {
    window.__playCalls = 0;
    window.__policyBlocks = 0;
    window.__gestureClick = false;
    const authorized = new WeakSet();
    document.addEventListener('click', () => {
      window.__gestureClick = true;
      setTimeout(() => { window.__gestureClick = false; }, 0);
    }, true);
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
      window.__playCalls++;
      if (processPolicy && window.__gestureClick && !this.muted) authorized.add(this);
      if (processPolicy && !authorized.has(this)) {
        window.__policyBlocks++;
        return Promise.reject(new DOMException('Element has not received a user gesture', 'NotAllowedError'));
      }
      return orig.apply(this, arguments);
    };
    const processPolicy = true;
  });

  // Build a small real queue and boot the player the way startNewMorning() would.
  await page.evaluate(() => {
    window.hideAllViews();
    const items = [];
    for (let i = 0; i < 3; i++) {
      items.push({
        source: 'hb',
        key: 'hb:w' + i,
        en: 'word' + i,
        cn: '单词' + i,
        ex: '',
        ex_cn: '',
        idx: i,
        reason: 'due',
        morningRating: null,
        morningCompleted: false,
        morningSkipped: false,
        morningPrefCaptured: false
      });
    }
    window.morningQueue = items;
    window.morningSettings = Object.assign(window.loadMorningSettings(), { durationMin: 25 });
    window.morningPos = 0;
    window.morningStep = 0;
    window.morningSlot = 0;
    window.morningPaused = false;
    window.morningPlaying = true;
    window.morningAudioFailed = false;
    window.morningRetryCurrentSegment = null;
    window.morningResumePromise = null;
    window.morningEnded = false;
    window._morningPlayToken = 0;
    window.morningSessionStart = Date.now();
    window.morningElapsedActiveMs = 0;
    window.morningActiveStartedAt = Date.now();
    window.morningSessionHard = 0;
    window.morningSessionFamiliar = 0;
    window.morningSessionSkipped = 0;
    window.morningSessionCompleted = 0;
    window.morningQueueBuiltAt = Date.now();
    document.getElementById('view-morning-home').style.display = 'block';
    return true;
  });

  // Use a trusted browser click and the real prepare/warm-up/start path.
  await page.click('#morningStartButton');

  // Wait for real audible progress.
  const progress = await page.waitForFunction(() => {
    const au = window.morningGetAu(window.morningSlot);
    return !!(au && !au.paused && au.currentTime > 0.15 && isFinite(au.duration) && au.duration > 0);
  }, null, { timeout: 20000 }).then(() => true).catch(() => false);

  const snap1 = await page.evaluate(() => {
    const au = window.morningGetAu(window.morningSlot);
    const btn = document.getElementById('mpBtnPlay');
    return {
      muted: au.muted,
      volume: au.volume,
      rate: au.playbackRate,
      src: au.src.slice(0, 12),
      duration: au.duration,
      t: au.currentTime,
      paused: au.paused,
      isPauseIcon: !!(btn && btn.querySelector('rect')),
      isPlayIcon: !!(btn && btn.querySelector('polygon')),
      aria: btn ? btn.getAttribute('aria-label') : null,
      now: document.getElementById('mpProgressNow').textContent,
      playing: window.morningPlaying,
      morningPaused: window.morningPaused
    };
  });
  check('E2E-1 first word is audible (currentTime advances)', progress, JSON.stringify(snap1));
  check('E2E-2 element is unmuted with audible volume', snap1.muted === false && snap1.volume > 0, JSON.stringify(snap1));
  check('E2E-3 state reports playing and not paused', snap1.playing === true && snap1.morningPaused === false, JSON.stringify(snap1));
  check('E2E-4 play button shows pause icon + aria-label 暂停', snap1.isPauseIcon && snap1.aria === '暂停', JSON.stringify(snap1));
  check('E2E-5 Progress label reports 播放中', snap1.now.indexOf('播放中') >= 0, snap1.now);

  // 3 rapid pauses in a row, each must hold.
  const pauseResults = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { window.__playCalls = 0; });
    await page.evaluate(() => document.getElementById('mpBtnPlay').click());
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => {
      const au = window.morningGetAu(window.morningSlot);
      const btn = document.getElementById('mpBtnPlay');
      return {
        morningPaused: window.morningPaused,
        auPaused: au.paused,
        isPlayIcon: !!(btn && btn.querySelector('polygon')),
        aria: btn ? btn.getAttribute('aria-label') : null,
        plays: window.__playCalls
      };
    });
    pauseResults.push(s);
    // next click resumes so the loop tests both directions
    await page.evaluate(() => document.getElementById('mpBtnPlay').click());
    await page.waitForTimeout(1200);
    const s2 = await page.evaluate(() => ({
      morningPaused: window.morningPaused,
      t: window.morningGetAu(window.morningSlot).currentTime,
      auPaused: window.morningGetAu(window.morningSlot).paused
    }));
    pauseResults[i].afterResume = s2;
  }
  const allPaused = pauseResults.every(p => p.morningPaused === true && p.auPaused === true && p.isPlayIcon);
  const noAutoPlayDuringPause = pauseResults.every(p => p.plays === 0);
  const allResumed = pauseResults.every(p => p.afterResume.morningPaused === false && p.afterResume.auPaused === false);
  check('E2E-6 three consecutive clicks all land in a stable user pause', allPaused, JSON.stringify(pauseResults.map(p => p.morningPaused + '/' + p.auPaused)));
  check('E2E-7 no play() escapes while paused (no auto-resume)', noAutoPlayDuringPause, JSON.stringify(pauseResults.map(p => p.plays)));
  check('E2E-8 clicking again resumes from the same segment', allResumed, JSON.stringify(pauseResults.map(p => p.afterResume)));

  // Pause, then wait / focus / visibilitychange / pageshow -> must stay paused.
  await page.evaluate(() => document.getElementById('mpBtnPlay').click());
  await page.waitForTimeout(1200);
  const pausedSnap = await page.evaluate(() => {
    const au = window.morningGetAu(window.morningSlot);
    return { t: au.currentTime, src: au.src, morningPaused: window.morningPaused };
  });
  await page.evaluate(() => { window.__playCalls = 0; });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
    window.syncMorningPlayback();
    window.syncMorningPlayback();
    window.syncMorningPlayback();
  });
  await page.waitForTimeout(2500);
  const afterIdle = await page.evaluate(() => {
    const au = window.morningGetAu(window.morningSlot);
    const btn = document.getElementById('mpBtnPlay');
    return {
      morningPaused: window.morningPaused,
      auPaused: au.paused,
      t: au.currentTime,
      plays: window.__playCalls,
      isPlayIcon: !!(btn && btn.querySelector('polygon')),
      aria: btn ? btn.getAttribute('aria-label') : null,
      now: document.getElementById('mpProgressNow').textContent
    };
  });
  check('E2E-9 3s idle + focus + pageshow never auto-resumes a user pause',
    afterIdle.plays === 0 && afterIdle.auPaused === true && afterIdle.morningPaused === true, JSON.stringify(afterIdle));
  check('E2E-10 paused UI stays truthful while idle',
    afterIdle.isPlayIcon && afterIdle.now.indexOf('已暂停') >= 0,
    JSON.stringify({ isPlayIcon: afterIdle.isPlayIcon, aria: afterIdle.aria, now: afterIdle.now }));

  // Resume and confirm it continues from the paused position.
  await page.evaluate(() => document.getElementById('mpBtnPlay').click());
  await page.waitForTimeout(1500);
  const resumed = await page.evaluate(() => {
    const au = window.morningGetAu(window.morningSlot);
    const btn = document.getElementById('mpBtnPlay');
    return {
      morningPaused: window.morningPaused,
      t: au.currentTime,
      paused: au.paused,
      isPauseIcon: !!(btn && btn.querySelector('rect')),
      aria: btn ? btn.getAttribute('aria-label') : null
    };
  });
  check('E2E-11 resume continues the segment and is audible',
    resumed.morningPaused === false && resumed.paused === false && resumed.t >= pausedSnap.t,
    JSON.stringify({ from: pausedSnap.t, to: resumed.t, paused: resumed.paused }));
  check('E2E-12 UI realigns to playing', resumed.isPauseIcon && resumed.aria === '暂停',
    JSON.stringify({ isPauseIcon: resumed.isPauseIcon, aria: resumed.aria }));

  // Rapid prev / next / replay while playing: the next segment must really play
  const navChecks = [];
  for (const fn of ['nextMorningWord', 'prevMorningWord', 'replayMorningWord']) {
    await page.evaluate(f => {
      window.__playCalls = 0;
      window[f]();
    }, fn);
    const navOkOne = await page.waitForFunction(() => {
      const au = window.morningGetAu(window.morningSlot);
      return !window.morningPaused && !au.paused && au.currentTime > 0.1;
    }, null, { timeout: 20000 }).then(() => true).catch(() => false);
    const settled = await page.evaluate(() => {
      const au = window.morningGetAu(window.morningSlot);
      const btn = document.getElementById('mpBtnPlay');
      return {
        morningPaused: window.morningPaused,
        t: au.currentTime,
        auPaused: au.paused,
        muted: au.muted,
        isPauseIcon: !!(btn && btn.querySelector('rect')),
        aria: btn ? btn.getAttribute('aria-label') : null,
        plays: window.__playCalls
      };
    });
    navChecks.push({ fn, audible: navOkOne, settled });
  }
  check('E2E-13 prev/next/replay each end with real audible playback',
    navChecks.every(n => n.audible && n.settled.morningPaused === false && n.settled.auPaused === false &&
      n.settled.t > 0.1 && n.settled.isPauseIcon && n.settled.aria === '暂停' && n.settled.muted === false),
    JSON.stringify(navChecks));

  // Simulate dead audio source through the real load path:
  const failure = await page.evaluate(async () => {
    window.__origSegUrl = window.morningSegUrl;
    window.morningSegUrl = function (item, step, info) {
      if (item === window.morningQueue[window.morningPos]) return 'blob:http://127.0.0.1:8123/deadbeef';
      return window.__origSegUrl.apply(this, arguments);
    };
    window.morningPaused = false;
    window.playMorningCurrent();
    await new Promise(r => setTimeout(r, 9000));
    const btn = document.getElementById('mpBtnPlay');
    return {
      morningPaused: window.morningPaused,
      failed: window.morningAudioFailed,
      hasRetry: !!window.morningRetryCurrentSegment,
      isPlayIcon: !!(btn && btn.querySelector('polygon')),
      aria: btn ? btn.getAttribute('aria-label') : null,
      now: document.getElementById('mpProgressNow').textContent
    };
  });
  check('E2E-14 a dead audio source lands in a retryable error state, never playing',
    failure.failed === true && failure.hasRetry === true && failure.morningPaused === true && failure.isPlayIcon,
    JSON.stringify(failure));

  // Tapping retry while the source is still broken must attempt playback and stay retryable
  const retryStillBroken = await page.evaluate(async () => {
    window.__playCalls = 0;
    document.getElementById('mpBtnPlay').click();
    await new Promise(r => setTimeout(r, 9000));
    return {
      failed: window.morningAudioFailed,
      plays: window.__playCalls,
      morningPaused: window.morningPaused
    };
  });
  check('E2E-15 retry on a still-broken source attempts playback and stays retryable',
    retryStillBroken.plays > 0 && retryStillBroken.failed === true && retryStillBroken.morningPaused === true,
    JSON.stringify(retryStillBroken));

  // Once the source is healthy again, the user restarts the word and gets sound.
  const recovered = await page.evaluate(async () => {
    window.morningSegUrl = window.__origSegUrl;
    window.__playCalls = 0;
    window.replayMorningWord();
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const au = window.morningGetAu(window.morningSlot);
      const btn = document.getElementById('mpBtnPlay');
      if (!window.morningPaused && !au.paused && au.currentTime > 0.1) {
        return {
          ok: true,
          t: au.currentTime,
          morningPaused: window.morningPaused,
          plays: window.__playCalls,
          isPauseIcon: !!(btn && btn.querySelector('rect')),
          aria: btn ? btn.getAttribute('aria-label') : null
        };
      }
      await new Promise(r => setTimeout(r, 200));
    }
    const au = window.morningGetAu(window.morningSlot);
    return { ok: false, morningPaused: window.morningPaused, paused: au.paused, t: au.currentTime };
  });
  check('E2E-16 a healthy restart after failure restores real audible playback',
    recovered.ok === true && recovered.isPauseIcon && recovered.aria === '暂停',
    JSON.stringify(recovered));

  // Ending the session clears metadata and state and releases audio.
  const ended = await page.evaluate(() => {
    window.endMorningSession('completed');
    return {
      playing: window.morningPlaying,
      ended: window.morningEnded,
      auA: window.morningAuA,
      auB: window.morningAuB
    };
  });
  check('E2E-17 session end releases audio and sets playing=false, ended=true',
    ended.playing === false && ended.ended === true && ended.auA === null && ended.auB === null,
    JSON.stringify(ended));

  // Leaving the player suspends; returning must not resurrect audio.
  await page.evaluate(() => {
    window.hideAllViews();
    window.morningQueue = [{
      source: 'hb',
      key: 'hb:x',
      en: 'word0',
      cn: '词',
      idx: 0,
      reason: 'due',
      morningRating: null,
      morningCompleted: false,
      morningSkipped: false,
      morningPrefCaptured: false
    }];
    window.morningPos = 0;
    window.morningStep = 0;
    window.morningSlot = 0;
    window.morningPaused = false;
    window.morningPlaying = true;
    window.morningAudioFailed = false;
    window.morningEnded = false;
    window._morningPlayToken = 0;
    window.morningQueueBuiltAt = Date.now();
    document.getElementById('view-morning-home').style.display = 'block';
  });
  await page.click('#morningStartButton');
  const leaveReturn = await page.evaluate(async () => {
    await new Promise(r => setTimeout(r, 2500));
    const before = window.morningGetAu(window.morningSlot).currentTime;
    window.__playCalls = 0;
    window.suspendMorningForAppNavigation();
    const atSuspend = { paused: window.morningPaused, playing: window.morningPlaying };
    window.syncMorningPlayback();
    window.syncMorningPlayback();
    await new Promise(r => setTimeout(r, 800));
    return {
      before,
      atSuspend,
      afterPlays: window.__playCalls,
      playing: window.morningPlaying,
      paused: window.morningPaused
    };
  });
  check('E2E-18 leaving the view suspends and cannot be auto-resumed',
    leaveReturn.atSuspend.paused === true && leaveReturn.atSuspend.playing === false &&
    leaveReturn.afterPlays === 0 && leaveReturn.paused === true,
    JSON.stringify(leaveReturn));

  check('E2E-19 no uncaught page errors during the whole run', pageErrors.length === 0, pageErrors.join(' | '));

  // Long continuous run: three complete real words
  await page.evaluate(() => {
    window.hideAllViews();
    window.morningQueue = Array.from({ length: 4 }, (_, i) => ({
      source: 'hb',
      key: 'hb:continuous' + i,
      en: 'continuous' + i,
      cn: '连续播放',
      idx: i,
      reason: 'due',
      morningRating: null,
      morningCompleted: false,
      morningSkipped: false
    }));
    window.morningQueueBuiltAt = Date.now();
    document.getElementById('view-morning-home').style.display = 'block';
    window.__policyBlocks = 0;
    window.__continuousSteps = new Set();
    window.__continuousElements = new Set();
    window.__sampleTimer = setInterval(() => {
      if (!window.morningPlaying || window.morningEnded) return;
      const au = window.morningGetAu(window.morningSlot);
      if (!au.paused && au.currentTime > 0.04) {
        window.__continuousSteps.add(window.morningPos + ':' + window.morningStep);
        window.__continuousElements.add(au);
      }
    }, 30);
  });
  await page.click('#morningStartButton');
  const continuous = await page.waitForFunction(() => window.morningPos >= 3 || window.morningAudioFailed,
    null, { timeout: 180000 }).then(() => true).catch(() => false);
  const continuousSnap = await page.evaluate(() => {
    clearInterval(window.__sampleTimer);
    const result = {
      pos: window.morningPos,
      completed: window.morningSessionCompleted,
      steps: window.__continuousSteps.size,
      elements: window.__continuousElements.size,
      blocks: window.__policyBlocks,
      failed: window.morningAudioFailed,
      paused: window.morningPaused
    };
    if (!window.morningPaused) window.toggleMorningPause();
    return result;
  });
  check('E2E-20 three full words auto-advance under element-specific gesture policy',
    continuous && continuousSnap.pos >= 3 && continuousSnap.completed >= 3 && continuousSnap.steps >= 18 &&
    continuousSnap.blocks === 0 && !continuousSnap.failed, JSON.stringify(continuousSnap));

  await browser.close();
  try { chrome.kill(); } catch (e) {}
  server.close();

  const failed = results.filter(r => !r.ok);
  for (const r of results) {
    console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.ok ? '' : '\n        ' + r.detail));
  }
  console.log('\n' + (failed.length ? failed.length + ' FAILED' : 'ALL ' + results.length + ' BROWSER E2E CHECKS PASSED'));
  process.exit(failed.length ? 1 : 0);
})().catch(async e => {
  console.error('harness error:', e);
  if (managedBrowser) await managedBrowser.close().catch(() => {});
  if (managedChrome) managedChrome.kill();
  server.close();
  process.exit(2);
});
