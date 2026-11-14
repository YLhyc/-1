/* theme-core.js - Immediate pre-paint theme application + SVG toggle (ES5 compatible) */
(function(window, document) {
  'use strict';

  var THEME_KEY = 'app_theme_v1';
  var VALID_PREFS = { auto: true, light: true, dark: true };

  function getPref() {
    try {
      if (window.localStorage) {
        var val = window.localStorage.getItem(THEME_KEY);
        if (val && VALID_PREFS[val]) {
          return val;
        }
      }
    } catch (e) {
      // localStorage may fail in restricted/private contexts
    }
    return 'auto';
  }

  function getResolved(pref) {
    var p = pref || getPref();
    if (p === 'dark') return 'dark';
    if (p === 'light') return 'light';
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  }

  function ensureMetaThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      if (document.head) {
        document.head.appendChild(meta);
      } else if (document.documentElement) {
        document.documentElement.appendChild(meta);
      }
    }
    return meta;
  }

  function applyTheme(optPref) {
    var pref = optPref || getPref();
    var resolved = getResolved(pref);
    var root = document.documentElement;
    if (root) {
      root.setAttribute('data-theme', resolved);
      root.setAttribute('data-theme-pref', pref);
      if (root.style) {
        root.style.colorScheme = resolved;
      }
    }
    var meta = ensureMetaThemeColor();
    if (meta) {
      meta.setAttribute('content', resolved === 'dark' ? '#0b161c' : '#cfe5eb');
    }
    return resolved;
  }

  function getLabel(pref) {
    var p = pref || getPref();
    if (p === 'light') return '浅色模式';
    if (p === 'dark') return '深色模式';
    return '跟随系统';
  }

  function getIconHTML(pref) {
    var p = pref || getPref();
    if (p === 'light') {
      return '<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';
    }
    if (p === 'dark') {
      return '<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
    // auto: contrast / half-circle
    return '<svg class="theme-icon theme-icon-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 3v18"></path><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"></path></svg>';
  }

  function updateButtons() {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    if (!buttons || !buttons.length) return;
    var pref = getPref();
    var label = getLabel(pref);
    var iconHtml = getIconHTML(pref);
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.classList && btn.classList.contains('theme-toggle-pill')) {
        btn.innerHTML = '<span class="theme-pill-icon" aria-hidden="true">' + iconHtml + '</span><span class="theme-pill-text">' + label + '</span>';
      } else {
        btn.innerHTML = iconHtml;
      }
      btn.setAttribute('title', '外观：' + label + ' (点击切换)');
      btn.setAttribute('aria-label', '切换外观主题，当前：' + label);
    }
  }

  function setPref(nextPref) {
    var val = VALID_PREFS[nextPref] ? nextPref : 'auto';
    try {
      if (window.localStorage) {
        window.localStorage.setItem(THEME_KEY, val);
      }
    } catch (e) {}
    applyTheme(val);
    updateButtons();
    return val;
  }

  function cycle() {
    var cur = getPref();
    var next = 'auto';
    if (cur === 'auto') next = 'light';
    else if (cur === 'light') next = 'dark';
    else next = 'auto';

    setPref(next);

    if (typeof window.showScheduleFeedback === 'function') {
      try {
        window.showScheduleFeedback('外观：' + getLabel(next));
      } catch (e) {}
    }
    return next;
  }

  // Immediate pre-paint execution
  applyTheme();

  // MatchMedia listener for system changes when pref is auto
  if (window.matchMedia) {
    try {
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var onMqlChange = function() {
        if (getPref() === 'auto') {
          applyTheme('auto');
          updateButtons();
        }
      };
      if (mql.addEventListener) {
        mql.addEventListener('change', onMqlChange);
      } else if (mql.addListener) {
        mql.addListener(onMqlChange);
      }
    } catch (e) {}
  }

  // Cross-tab sync via storage event
  window.addEventListener('storage', function(e) {
    if (e && e.key === THEME_KEY) {
      applyTheme();
      updateButtons();
    }
  }, false);

  // Delegated click listener for any [data-theme-toggle] button
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.hasAttribute && target.hasAttribute('data-theme-toggle')) {
        e.preventDefault();
        cycle();
        return;
      }
      target = target.parentNode;
    }
  }, false);

  // Hydrate buttons on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateButtons, false);
  } else {
    updateButtons();
  }

  // Expose global API
  window.WordsTheme = {
    getPref: getPref,
    getResolved: getResolved,
    setPref: setPref,
    cycle: cycle,
    updateButtons: updateButtons,
    getIconHTML: getIconHTML,
    getLabel: getLabel
  };
})(window, document);
