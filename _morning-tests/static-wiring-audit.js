// Static wiring audit: confirms every morning-player inline handler resolves to a
// defined function, and every element id the morning code touches exists in the HTML.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const scriptStart = html.indexOf('<script>', html.indexOf('audio-cache.js'));
const scriptEnd = html.indexOf('</script>', scriptStart);
const script = html.slice(scriptStart, scriptEnd);
const markup = html.slice(0, scriptStart) + html.slice(scriptEnd);

// defined function names anywhere in the inline script
const defined = new Set();
for (const m of script.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of script.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) defined.add(m[1]);

// ids present in the markup
const ids = new Set();
for (const m of markup.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);

const problems = [];

// 1. inline handlers in the morning views
const morningViews = markup.slice(markup.indexOf('id="view-morning-player"') - 4000, markup.indexOf('id="view-morning-summary"'));
const handlerNames = new Set();
for (const m of morningViews.matchAll(/on[a-z]+\s*=\s*"([^"]*)"/g)) {
  const body = m[1];
  for (const c of body.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) handlerNames.add(c[1]);
}
const builtins = new Set(['event','stopPropagation','preventDefault','String','Number','JSON','parseInt','parseFloat','alert','console']);
for (const name of handlerNames) {
  if (builtins.has(name)) continue;
  if (!defined.has(name)) problems.push('inline handler calls undefined function: ' + name);
}

// 2. element ids referenced by the morning engine
const engine = html.slice(html.indexOf('// ── Playback engine ──'), html.indexOf('// ── Morning Review Page ──'));
const referencedIds = new Set();
for (const m of engine.matchAll(/getElementById\(\s*'([^']+)'\s*\)/g)) referencedIds.add(m[1]);
for (const m of engine.matchAll(/getElementById\(\s*"([^"]+)"\s*\)/g)) referencedIds.add(m[1]);
for (const id of referencedIds) {
  if (!ids.has(id)) problems.push('engine references missing element id: ' + id);
}

// 3. real morning engine symbols and UI elements must exist
const expectedEngineFunctions = [
  'startNewMorning', 'resumeMorningSession', 'toggleMorningPause', 'attemptMorningResume',
  'syncMorningPlayback', 'playMorningCurrent', 'morningGetAu', 'morningLoadAu',
  'morningPreloadAu', 'pauseMorningForAudioFailure', 'updateMorningPlayerUI',
  'updateMorningProgressUI', 'suspendMorningForAppNavigation', 'resumeMorningAfterNavigation',
  'nextMorningWord', 'prevMorningWord', 'replayMorningWord', 'endMorningSession',
  'saveAndExitMorning', 'skipMorningWord'
];
for (const n of expectedEngineFunctions) {
  if (!defined.has(n)) problems.push('missing expected morning function: ' + n);
}

const expectedMorningIds = [
  'morningStartButton', 'mpBtnPlay', 'mpProgressNow', 'mpBtnPrev', 'mpBtnNext',
  'morningPlayerCard', 'view-morning-player', 'view-morning-summary',
  'morningExitScrim', 'morningExitSheet'
];
for (const id of expectedMorningIds) {
  if (!ids.has(id)) problems.push('missing expected morning DOM element id: ' + id);
}

// 4. audio-cache.js and sw.js existence
const rootDir = path.join(__dirname, '..');
if (!fs.existsSync(path.join(rootDir, 'audio-cache.js'))) {
  problems.push('missing audio-cache.js file');
}
if (!fs.existsSync(path.join(rootDir, 'sw.js'))) {
  problems.push('missing sw.js file');
}

// 5. onpause must not contain a bare play() call
const onpauseBlocks = [...engine.matchAll(/au\.onpause\s*=\s*function\s*\(\)\s*\{/g)];
for (const b of onpauseBlocks) {
  let i = b.index + b[0].length - 1, depth = 0, end = i;
  for (let j = i; j < engine.length; j++) {
    if (engine[j] === '{') depth++;
    else if (engine[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  const body = engine.slice(i, end);
  if (/[^.\w]au\.play\s*\(/.test(body) || /\bretryP\s*=/.test(body)) {
    problems.push('onpause still calls play() directly');
  }
}

// 6. guarded resume call sites count
const resumeCallSites = [...engine.matchAll(/attemptMorningResume\s*\(/g)].length;

console.log('inline handler functions:', [...handlerNames].sort().join(', '));
console.log('engine element ids:', [...referencedIds].sort().join(', '));
console.log('attemptMorningResume call sites:', resumeCallSites);
console.log(problems.length ? 'PROBLEMS:\n - ' + problems.join('\n - ') : 'STATIC WIRING AUDIT PASSED');
process.exit(problems.length ? 1 : 0);
