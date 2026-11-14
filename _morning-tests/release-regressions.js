// Targeted release checks. Capture the existing source extractor in memory;
// never write the generated harness or modify application data.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

let harness;
const extractor = path.join(__dirname, 'extract-and-unit-test.js');
vm.runInNewContext(fs.readFileSync(extractor, 'utf8'), {
  __dirname,
  console: { log() {} },
  require(name) {
    if (name === 'fs') return {
      readFileSync: fs.readFileSync.bind(fs),
      writeFileSync(_file, data) { harness = data; }
    };
    return require(name);
  }
});
assert(harness, 'Extractor produced test harness');
const runIdx = harness.indexOf('(async function run');
const formatIdx = harness.indexOf('function formatMorningClock(');
const source = harness.slice(0, runIdx) + harness.slice(formatIdx);

function world() {
  const context = { console, setTimeout, clearTimeout, setInterval, clearInterval };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.finishMorningCurrentWord = function() {};
  context.resetWorld();
  return context;
}

(async () => {
  // 1. Morning engine start -> segment handoff
  let c = world();
  let audio = await c.startAndPlay();
  audio.ended = true;
  audio.fire('onended');
  assert.equal(c.morningStep, 1, 'onended advances to step 1');
  const primary = c.morningGetAu(c.morningSlot);
  if (primary._pending) primary.settlePlay(true);
  await c.flush(10);
  primary.fire('onplaying');
  assert.equal(c.morningPaused, false);
  console.log('PASS segment handoff advances step and plays');

  // 2. Restart current segment
  c = world();
  audio = await c.startAndPlay();
  audio.ended = true;
  audio.fire('onended');
  assert.equal(c.morningStep, 1);
  c.restartMorningCurrentSegment(c._morningPlayToken, c.morningQueue[c.morningPos]);
  assert.equal(c.morningStep, 1);
  console.log('PASS restart preserves current segment');

  // 3. Stale resume cannot corrupt next word
  for (const settle of ['resolve', 'reject']) {
    c = world();
    audio = await c.startAndPlay();
    c.toggleMorningPause();
    const resume = c.attemptMorningResume(true);
    const old = audio._pending;
    c.nextMorningWord();
    if (old) {
      if (settle === 'resolve') old.resolve();
      else old.reject(new Error('old resume rejected'));
    }
    await resume;
    await c.flush(10);
    assert.equal(c.morningPos, 1);
    assert.equal(c.morningAudioFailed, false);
    console.log('PASS stale resume ' + settle + ' cannot fail the next word');
  }

  // 4. Morning engine error retry state -> endMorningSession cleanup
  c = world();
  audio = await c.startAndPlay();
  let retried = false;
  c.pauseMorningForAudioFailure(c._morningPlayToken, c.morningQueue[c.morningPos], () => {
    retried = true;
    c.morningPaused = false;
    c.morningAudioFailed = false;
    return Promise.resolve(true);
  });
  assert.equal(c.morningAudioFailed, true);
  assert.equal(c.morningPaused, true);
  await c.attemptMorningResume(true);
  assert.equal(retried, true);
  assert.equal(c.morningAudioFailed, false);
  c.endMorningSession('completed');
  assert.equal(c.morningPlaying, false);
  assert.equal(c.morningEnded, true);
  assert.equal(c.morningAuA, null);
  assert.equal(c.morningAuB, null);
  console.log('PASS morning engine error retry state and end cleanup');

  // 5. Version alignment & Release files validation
  const root = path.join(__dirname, '..');
  const release = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // sw.js CACHE match
  assert(sw.includes("const CACHE = 'kv-" + release.version + "';"), 'sw.js CACHE matches version.json');
  assert(indexHtml.includes('var APP_BUILD_ID = "' + release.version + '";'), 'index.html APP_BUILD_ID matches version.json');
  assert(indexHtml.includes('var BUILD_TS = ' + release.built_at + ';'), 'index.html BUILD_TS matches version.json');

  // sw.js handles hb/words.json and wordbank audio mp3
  assert(sw.includes('hb\\/words\\.json'), 'sw.js matches /hb/words.json in isCoreData');
  assert(sw.includes('wordbank\\/audio'), 'sw.js matches /wordbank/audio/ in isAudioBundle');
  console.log('PASS sw.js caches version and routes correctly');

  // hb/words.json exists, parses as 6549 entries, hb/index.html does not inline huge WORDS array
  const hbWordsPath = path.join(root, 'hb', 'words.json');
  assert(fs.existsSync(hbWordsPath), 'hb/words.json exists');
  const hbWords = JSON.parse(fs.readFileSync(hbWordsPath, 'utf8'));
  assert.equal(hbWords.length, 6549, 'hb/words.json parses as 6549 entries');

  const hbIndex = fs.readFileSync(path.join(root, 'hb', 'index.html'), 'utf8');
  assert(hbIndex.includes('var WORDS = [];') && hbIndex.length < 250000 && !hbIndex.includes('"cn_note":'), 'hb/index.html externalized WORDS cleanly');
  console.log('PASS hb/words.json externalized with 6549 entries');

  // HTML checks
  const pages = [
    { file: 'index.html', path: path.join(root, 'index.html') },
    { file: 'hb/index.html', path: path.join(root, 'hb', 'index.html') },
    { file: 'uf/index.html', path: path.join(root, 'uf', 'index.html') },
    { file: 'wordbank/index.html', path: path.join(root, 'wordbank', 'index.html') }
  ];

  let missingPages = [];
  for (const page of pages) {
    const content = fs.readFileSync(page.path, 'utf8');
    const hasVp = content.includes('viewport-fit=cover');
    const hasAudioCache = content.includes('audio-cache.js');
    const hasTs = content.includes(String(release.built_at));
    if (!hasVp || !hasAudioCache || !hasTs) {
      missingPages.push({
        file: page.file,
        viewportFit: hasVp,
        audioCache: hasAudioCache,
        timestamp: hasTs
      });
    }
  }

  assert.equal(missingPages.length, 0, 'HTML alignment check failed: ' + JSON.stringify(missingPages));
  console.log('PASS all 4 HTMLs have viewport-fit=cover, audio-cache.js, and matching timestamps');

  // Syntax check inline scripts of index.html and sw.js
  for (const match of indexHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new vm.Script(match[1]);
  }
  new vm.Script(sw);
  console.log('PASS release scripts parse cleanly');

  process.exit(0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
