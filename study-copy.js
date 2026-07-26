(function(global) {
  'use strict';
  var toastTimer = 0;

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function promptText(word, meaning) {
    word = String(word || '').trim(); meaning = String(meaning || '').trim();
    return '请系统讲解考研英语词汇或表达“' + word + '”' + (meaning ? '（当前卡片释义：' + meaning + '）' : '') + '。\n\n'
      + '目标是服务考研英语一阅读理解，不要简单罗列词典义。请依次讲清：\n'
      + '1. 核心语义，以及不同义项之间的联系；\n'
      + '2. 常见词性、词形变化和高频派生词；\n'
      + '3. 考研阅读中的常见搭配、熟词僻义和同义替换；\n'
      + '4. 容易混淆的近义词及使用边界；\n'
      + '5. 3个自然例句，提供中英文并覆盖不同常见语境；\n'
      + '6. 最后给我3道不直接展示答案的主动回忆题。\n\n'
      + '如果当前卡片释义不完整，可以补充，但不要堆砌生僻义项。';
  }
  function buttonHTML(word, meaning, className, id) {
    return '<button type="button"' + (id ? ' id="' + escapeHTML(id) + '"' : '')
      + ' class="' + escapeHTML(className || '') + ' study-copy-btn" data-study-word="' + escapeHTML(word)
      + '" data-study-meaning="' + escapeHTML(meaning) + '" aria-label="复制AI讲解提示词：' + escapeHTML(word)
      + '" title="复制AI讲解提示词"><span class="study-copy-icon" aria-hidden="true">⧉</span></button>';
  }
  function updateButton(button, word, meaning) {
    if (!button) return;
    button.setAttribute('data-study-word', String(word || ''));
    button.setAttribute('data-study-meaning', String(meaning || ''));
    button.setAttribute('aria-label', '复制AI讲解提示词：' + String(word || ''));
  }
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(area); area.select();
    var copied = false; try { copied = document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(area); return copied;
  }
  function toast(message) {
    var el = document.getElementById('studyCopyToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'studyCopyToast'; el.className = 'study-copy-toast';
      el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el);
    }
    el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { el.classList.remove('show'); }, 1500);
  }
  function finish(button, success) {
    var icon = button && button.querySelector('.study-copy-icon');
    if (icon) icon.textContent = success ? '✓' : '!';
    if (button) button.classList.toggle('copied', success);
    toast(success ? '已复制AI讲解提示词' : '复制失败，请稍后重试');
    try { if (success && navigator.vibrate) navigator.vibrate(10); } catch(e) {}
    setTimeout(function() { if (icon) icon.textContent = '⧉'; if (button) button.classList.remove('copied'); }, 1200);
  }
  function copyFromButton(button) {
    var text = promptText(button.getAttribute('data-study-word'), button.getAttribute('data-study-meaning'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() { finish(button, true); }, function() { finish(button, fallbackCopy(text)); });
    } else finish(button, fallbackCopy(text));
  }
  function install() {
    if (!document.getElementById('studyCopyStyles')) {
      var style = document.createElement('style'); style.id = 'studyCopyStyles'; style.textContent =
        '.study-copy-btn{position:relative;flex:0 0 auto;-webkit-tap-highlight-color:transparent;transition:transform 120ms cubic-bezier(.23,1,.32,1),background-color 160ms ease,color 160ms ease}' +
        '.study-copy-btn:active{transform:scale(.94)}.study-copy-btn.copied{color:#247a44;background:#e5f7ec}.study-copy-icon{font-size:17px;line-height:1;font-weight:760}' +
        '.study-copy-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 82px);z-index:10060;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:8px;background:rgba(19,43,57,.94);color:#fff;font:650 12px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0;box-shadow:0 10px 28px rgba(17,49,68,.2);opacity:0;transform:translate(-50%,8px);pointer-events:none;transition:opacity 150ms ease,transform 180ms cubic-bezier(.23,1,.32,1)}.study-copy-toast.show{opacity:1;transform:translate(-50%,0)}' +
        '@media(prefers-reduced-motion:reduce){.study-copy-btn,.study-copy-toast{transition-duration:.01ms!important}}';
      document.head.appendChild(style);
    }
    document.addEventListener('click', function(event) {
      var button = event.target.closest && event.target.closest('.study-copy-btn[data-study-word]'); if (!button) return;
      event.preventDefault(); event.stopPropagation(); copyFromButton(button);
    }, true);
  }
  global.StudyCopy = { promptText:promptText, buttonHTML:buttonHTML, updateButton:updateButton, copyFromButton:copyFromButton };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})(window);