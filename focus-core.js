(function(global) {
  'use strict';
  var STORAGE_KEY = 'focus_words_v1';
  var DIRTY_KEY = 'learning_activity_dirty_v1';
  var LESSON_WORDS = new Set(["curb", "margin", "initiative", "foster", "interpret", "identical"]);
  var VALID_STATUS = ['pending', 'ready', 'review', 'stable'];
  var toastTimer = 0;

  function normalizeWord(word) { return String(word || '').trim().toLocaleLowerCase(); }
  function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function normalizeEntry(raw, fallbackWord) {
    raw = isObject(raw) ? raw : {};
    var word = String(raw.word || fallbackWord || '').trim();
    var key = normalizeWord(word);
    if (!key) return null;
    var status = VALID_STATUS.indexOf(raw.status) >= 0 ? raw.status : (LESSON_WORDS.has(key) ? 'ready' : 'pending');
    if (status === 'pending' && LESSON_WORDS.has(key)) status = 'ready';
    var sources = Array.isArray(raw.sources) ? raw.sources.map(String).filter(Boolean) : [];
    return {
      word: word,
      meaning: String(raw.meaning || ''),
      addedAt: Number(raw.addedAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Number(raw.addedAt) || Date.now(),
      reason: String(raw.reason || ''),
      sources: Array.from(new Set(sources)),
      status: status,
      reviewDueAt: Number(raw.reviewDueAt) || 0
    };
  }
  function load() {
    var parsed;
    try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { parsed = {}; }
    var out = {};
    if (Array.isArray(parsed)) parsed.forEach(function(item) { var entry = normalizeEntry(item); if (entry) out[normalizeWord(entry.word)] = entry; });
    else if (isObject(parsed)) Object.keys(parsed).forEach(function(key) { var entry = normalizeEntry(parsed[key], key); if (entry) out[normalizeWord(entry.word)] = entry; });
    return out;
  }
  function emit(data, action) {
    refreshButtons();
    try { global.dispatchEvent(new CustomEvent('focuschange', { detail: { data: data, action: action || 'save' } })); } catch(e) {}
  }
  function save(data, action) {
    data = isObject(data) ? data : {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(DIRTY_KEY, String(Date.now()));
    emit(data, action);
    return data;
  }
  function add(word, meaning, source, reason) {
    var key = normalizeWord(word); if (!key) return null;
    var data = load(), now = Date.now(), old = data[key];
    var entry = normalizeEntry(old || { word: String(word).trim(), addedAt: now }, word);
    if (meaning) entry.meaning = String(meaning);
    if (reason) entry.reason = String(reason);
    if (source && entry.sources.indexOf(String(source)) < 0) entry.sources.push(String(source));
    if (entry.status === 'pending' && LESSON_WORDS.has(key)) entry.status = 'ready';
    entry.updatedAt = now; data[key] = entry; save(data, old ? 'update' : 'add');
    return entry;
  }
  function remove(word) {
    var key = normalizeWord(word), data = load(); if (!data[key]) return false;
    delete data[key]; save(data, 'remove'); return true;
  }
  function toggle(word, meaning, source, reason) {
    if (isSelected(word)) { remove(word); return false; }
    add(word, meaning, source, reason); return true;
  }
  function isSelected(word) { return !!load()[normalizeWord(word)]; }
  function setStatus(word, status, reviewDueAt) {
    if (VALID_STATUS.indexOf(status) < 0) return null;
    var data = load(), key = normalizeWord(word), entry = data[key]; if (!entry) return null;
    entry.status = status; entry.updatedAt = Date.now(); entry.reviewDueAt = Number(reviewDueAt) || 0;
    data[key] = entry; save(data, 'status'); return entry;
  }
  function buttonHTML(word, meaning, source, reason, options) {
    var selected = isSelected(word), compact = options && options.compact;
    var label = selected ? '移出精选' : '放入精选';
    return '<button type="button" class="focus-toggle' + (selected ? ' is-selected' : '') + (compact ? ' focus-compact' : '') + '"'
      + ' data-focus-word="' + escapeHTML(word) + '" data-focus-meaning="' + escapeHTML(meaning) + '"'
      + ' data-focus-source="' + escapeHTML(source) + '" data-focus-reason="' + escapeHTML(reason) + '"'
      + ' aria-pressed="' + selected + '" aria-label="' + label + '：' + escapeHTML(word) + '" title="' + label + '">'
      + '<span class="focus-star" aria-hidden="true">' + (selected ? '★' : '☆') + '</span>'
      + (compact ? '<span class="focus-label sr-only">' + label + '</span>' : '<span class="focus-label">' + label + '</span>') + '</button>';
  }
  function refreshButtons() {
    if (!document.querySelectorAll) return;
    var data = load();
    document.querySelectorAll('.focus-toggle[data-focus-word]').forEach(function(button) {
      var selected = !!data[normalizeWord(button.getAttribute('data-focus-word'))];
      button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', String(selected));
      var label = selected ? '移出精选' : '放入精选', star = button.querySelector('.focus-star'), text = button.querySelector('.focus-label');
      if (star) star.textContent = selected ? '★' : '☆'; if (text) text.textContent = label;
      button.setAttribute('title', label); button.setAttribute('aria-label', label + '：' + button.getAttribute('data-focus-word'));
    });
  }
  function toast(message) {
    if (!document.body) return;
    var el = document.getElementById('focusCoreToast');
    if (!el) { el = document.createElement('div'); el.id = 'focusCoreToast'; el.className = 'focus-core-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { el.classList.remove('show'); }, 1800);
  }
  function install() {
    if (!document.getElementById('focusCoreStyles')) {
      var style = document.createElement('style'); style.id = 'focusCoreStyles'; style.textContent =
        '.focus-toggle{min-height:42px;padding:0 13px;border:1px solid rgba(20,112,159,.14);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(239,249,255,.9);color:#176f9e;font:700 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0;box-shadow:0 4px 13px rgba(31,99,136,.07);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 160ms ease,color 160ms ease}' +
        '.focus-toggle:active{transform:scale(.96)}.focus-toggle.is-selected{color:#8a6418;background:#fff4dc;border-color:rgba(156,106,22,.2)}.focus-star{font-size:18px;line-height:1}.focus-compact{width:38px;height:38px;min-height:38px;padding:0;border-radius:50%;flex:0 0 38px}.focus-compact .focus-star{font-size:19px}.focus-action-row{display:flex;justify-content:center;margin-top:10px}' +
        '.focus-core-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 94px);z-index:10050;max-width:calc(100vw - 40px);padding:10px 15px;border-radius:999px;background:rgba(19,43,57,.9);color:#fff;font:650 12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0;box-shadow:0 10px 28px rgba(17,49,68,.2);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);opacity:0;transform:translate(-50%,8px);pointer-events:none;transition:opacity 160ms ease,transform 190ms cubic-bezier(.23,1,.32,1)}.focus-core-toast.show{opacity:1;transform:translate(-50%,0)}' +
        '.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}@media(prefers-reduced-motion:reduce){.focus-toggle,.focus-core-toast{transition-duration:.01ms!important}}';
      document.head.appendChild(style);
    }
    document.addEventListener('click', function(event) {
      var button = event.target.closest && event.target.closest('.focus-toggle[data-focus-word]'); if (!button) return;
      event.preventDefault(); event.stopPropagation();
      var selected = toggle(button.getAttribute('data-focus-word'), button.getAttribute('data-focus-meaning'), button.getAttribute('data-focus-source'), button.getAttribute('data-focus-reason'));
      toast(selected ? '已放入精选，不影响当前学习' : '已移出精选');
    }, true);
    global.addEventListener('storage', function(event) { if (event.key === STORAGE_KEY) emit(load(), 'storage'); });
    refreshButtons();
  }
  global.FocusCore = { STORAGE_KEY:STORAGE_KEY, VALID_STATUS:VALID_STATUS, normalizeWord:normalizeWord, load:load, save:save, add:add, remove:remove, toggle:toggle, isSelected:isSelected, setStatus:setStatus, buttonHTML:buttonHTML, refreshButtons:refreshButtons, hasLesson:function(word){return LESSON_WORDS.has(normalizeWord(word));} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})(window);