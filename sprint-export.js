(function(global) {
  'use strict';

  var currentFilter = 'hard';
  var printMode = 'standard';
  var cachedWords = [];

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDictIndex() {
    var map = Object.create(null);
    if (Array.isArray(global.VOCAB)) {
      for (var i = 0; i < global.VOCAB.length; i++) {
        var v = global.VOCAB[i];
        if (v && v.en) {
          var k = String(v.en).trim().toLowerCase();
          if (k && !map[k]) map[k] = v.cn || '';
        }
      }
    }
    if (Array.isArray(global.HONGBAOSHU)) {
      for (var j = 0; j < global.HONGBAOSHU.length; j++) {
        var h = global.HONGBAOSHU[j];
        if (h && h.en) {
          var hk = String(h.en).trim().toLowerCase();
          if (hk && !map[hk]) map[hk] = h.cn || '';
        }
      }
    }
    return map;
  }

  function ensureHongbaoshu(callback) {
    if (Array.isArray(global.HONGBAOSHU) || typeof global.loadHB !== 'function') {
      if (typeof callback === 'function') callback();
      return;
    }
    try {
      global.loadHB(function() {
        if (typeof callback === 'function') callback();
      });
    } catch(e) {
      if (typeof callback === 'function') callback();
    }
  }

  function collectWords(sourceType) {
    var result = [];
    var seen = Object.create(null);
    var dictMap = null;

    function getDict() {
      if (!dictMap) dictMap = getDictIndex();
      return dictMap;
    }

    function add(en, cn, meta) {
      if (!en) return;
      var clean = String(en).trim().toLowerCase();
      if (!clean || seen[clean]) return;
      seen[clean] = true;
      result.push({
        en: String(en).trim(),
        cn: cn || '',
        meta: meta || {}
      });
    }

    if (sourceType === 'hard') {
      var dMap = getDict();
      if (global.ReviewCore && global.ReviewCore.loadReviewMeta) {
        var meta = global.ReviewCore.loadReviewMeta();
        for (var k in meta) {
          var item = meta[k];
          if (!item) continue;
          var split = k.indexOf(':');
          if (split <= 0) continue;
          var rawSrc = k.slice(0, split);
          var en = k.slice(split + 1);
          var src = (global.ReviewCore && global.ReviewCore.reviewSource)
            ? global.ReviewCore.reviewSource(rawSrc)
            : (rawSrc === 'hb' ? 'hongbaoshu' : rawSrc);
          if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded(src, en)) continue;
          var lapses = Number(item.lapses) || 0;
          var hardHits = Number(item.hardHits) || 0;
          var lastRating = item.lastRating;
          if (lapses >= 1 || hardHits >= 1 || lastRating === 'forget' || lastRating === 'uncertain' || lastRating === 'hard') {
            var cn = item.cn || dMap[en.toLowerCase()] || '';
            add(en, cn, { lapses: lapses, hardHits: hardHits, source: src });
          }
        }
      }
      try {
        var vvP = JSON.parse(localStorage.getItem('vv_prefs') || '{}');
        for (var vw in vvP) {
          if (vvP[vw] === 'hard') {
            if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded('vocab', vw)) continue;
            add(vw, dMap[vw.toLowerCase()] || '', { source: 'vocab' });
          }
        }
      } catch(e) {}
      try {
        var hbP = JSON.parse(localStorage.getItem('hb_prefs') || '{}');
        for (var hw in hbP) {
          if (hbP[hw] === 'hard') {
            if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded('hongbaoshu', hw)) continue;
            add(hw, dMap[hw.toLowerCase()] || '', { source: 'hongbaoshu' });
          }
        }
      } catch(e) {}
      try {
        var ufP = JSON.parse(localStorage.getItem('uf_prefs') || '{}');
        for (var uk in ufP) {
          if (ufP[uk] === 'veryhard') {
            var uen = uk;
            var usrc = 'vocab';
            if (uk.indexOf('vocab_') === 0) {
              uen = uk.slice(6);
              usrc = 'vocab';
            } else if (uk.indexOf('hb_') === 0) {
              uen = uk.slice(3);
              usrc = 'hongbaoshu';
            }
            if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded(usrc, uen)) continue;
            add(uen, dMap[uen.toLowerCase()] || '', { source: usrc });
          }
        }
      } catch(e) {}
      try {
        var wbP = JSON.parse(localStorage.getItem('wb_prefs') || '{}');
        for (var wk in wbP) {
          if (wbP[wk] === 'hard') {
            var wbWord = null;
            var under = wk.lastIndexOf('_');
            if (under > 0 && Array.isArray(global.ENTRIES)) {
              var eId = wk.slice(0, under);
              var wIdx = parseInt(wk.slice(under + 1), 10);
              for (var ei = 0; ei < global.ENTRIES.length; ei++) {
                if (global.ENTRIES[ei] && global.ENTRIES[ei].id === eId && Array.isArray(global.ENTRIES[ei].words)) {
                  wbWord = global.ENTRIES[ei].words[wIdx];
                  break;
                }
              }
            }
            if (wbWord && wbWord.en) {
              add(wbWord.en, wbWord.cn || dMap[wbWord.en.toLowerCase()] || '', { source: 'wordbank' });
            } else if (!/^[0-9a-zA-Z_-]+_[0-9]+$/.test(wk)) {
              add(wk, dMap[wk.toLowerCase()] || '', { source: 'wordbank' });
            }
          }
        }
      } catch(e) {}
      try {
        var ufOld = JSON.parse(localStorage.getItem('unfamiliar_words_v1') || '{}');
        for (var uw in ufOld) {
          if (ufOld[uw]) {
            var ucn = (typeof ufOld[uw] === 'object' && ufOld[uw].cn) ? ufOld[uw].cn : (dMap[uw.toLowerCase()] || '');
            add(uw, ucn, { source: 'unfamiliar' });
          }
        }
      } catch(e) {}
      try {
        var sprintMap = Object.create(null);
        if (Array.isArray(global.SPRINT_VOCAB_DATA)) {
          for (var si = 0; si < global.SPRINT_VOCAB_DATA.length; si++) {
            var sv = global.SPRINT_VOCAB_DATA[si];
            if (sv && sv.word) sprintMap[String(sv.word).trim().toLowerCase()] = sv.meaning || '';
          }
        }
        var swList = JSON.parse(localStorage.getItem('sprint_weak_words') || '[]');
        if (Array.isArray(swList)) {
          for (var swi = 0; swi < swList.length; swi++) {
            var sw = swList[swi];
            if (!sw) continue;
            if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded('sprint', sw)) continue;
            var scn = dMap[String(sw).toLowerCase()] || sprintMap[String(sw).toLowerCase()] || '';
            add(sw, scn, { source: 'sprint' });
          }
        }
        var spP = JSON.parse(localStorage.getItem('sp_prefs') || '{}');
        for (var spw in spP) {
          if (spP[spw] === 'hard') {
            if (global.ReviewCore && global.ReviewCore.isExcluded && global.ReviewCore.isExcluded('sprint', spw)) continue;
            var spcn = dMap[spw.toLowerCase()] || sprintMap[spw.toLowerCase()] || '';
            add(spw, spcn, { source: 'sprint' });
          }
        }
      } catch(e) {}
    } else if (sourceType === 'due') {
      if (global.ReviewCore && global.ReviewCore.getDueReviewItems) {
        var dueList = global.ReviewCore.getDueReviewItems();
        var dMapDue = getDict();
        dueList.forEach(function(item) {
          if (!item || !item.en) return;
          var cn = item.cn || dMapDue[item.en.toLowerCase()] || '';
          add(item.en, cn, { dueAt: item.dueAt, lapses: item.lapses, source: item.source });
        });
      }
    } else if (sourceType === 'roots') {
      if (global.WordNetwork && global.WordNetwork.ROOT_FAMILIES) {
        var families = global.WordNetwork.ROOT_FAMILIES;
        var rfList = Array.isArray(families) ? families : Object.keys(families).map(function(k) { return families[k]; });
        rfList.forEach(function(rf) {
          if (!rf) return;
          var wordsList = rf.words || rf.family;
          var rMean = rf.meaning || rf.mean || '';
          if (Array.isArray(wordsList)) {
            wordsList.forEach(function(item) {
              if (!item || !item.en) return;
              var def = (item.pos ? item.pos + ' ' : '') + (item.cn || '');
              add(item.en, def, {
                root: rf.root || '',
                rootMean: rMean
              });
            });
          }
        });
      }
    } else if (sourceType === 'confusables') {
      if (global.WordNetwork && global.WordNetwork.CONFUSABLE_LIST) {
        global.WordNetwork.CONFUSABLE_LIST.forEach(function(pair) {
          if (!pair || !Array.isArray(pair.words)) return;
          pair.words.forEach(function(w) {
            add(w, pair.analysis || '', { confusableGroup: pair.words.join(' vs ') });
          });
        });
      }
    } else if (sourceType === 'vocab') {
      if (Array.isArray(global.VOCAB)) {
        global.VOCAB.forEach(function(item) {
          if (item && item.en) add(item.en, item.cn, { sound: item.sound, source: 'vocab' });
        });
      }
    } else if (sourceType === 'hb' || sourceType === 'hongbaoshu') {
      if (Array.isArray(global.HONGBAOSHU)) {
        global.HONGBAOSHU.forEach(function(item) {
          if (item && item.en) add(item.en, item.cn, { sound: item.sound, source: 'hongbaoshu' });
        });
      }
    } else if (sourceType === 'sprint_all' || sourceType === 'sprint_weak' || sourceType === 'sprint_attitude' || sourceType === 'sprint_logic' || sourceType === 'sprint_polysemy') {
      var sprintList = Array.isArray(global.SPRINT_VOCAB_DATA) ? global.SPRINT_VOCAB_DATA : [];
      var weakSet = Object.create(null);
      if (sourceType === 'sprint_weak') {
        try {
          var swArr = JSON.parse(localStorage.getItem('sprint_weak_words') || '[]');
          if (Array.isArray(swArr)) {
            swArr.forEach(function(w) { if (w) weakSet[String(w).trim().toLowerCase()] = true; });
          }
          var spPrefs = JSON.parse(localStorage.getItem('sp_prefs') || '{}');
          for (var spKey in spPrefs) {
            if (spPrefs[spKey] === 'hard') weakSet[String(spKey).trim().toLowerCase()] = true;
          }
        } catch(e) {}
      }
      sprintList.forEach(function(item) {
        if (!item || !item.word) return;
        var wLower = String(item.word).trim().toLowerCase();
        if (sourceType === 'sprint_weak' && !weakSet[wLower]) return;
        if (sourceType === 'sprint_attitude' && item.category !== 'attitude') return;
        if (sourceType === 'sprint_logic' && item.category !== 'logic') return;
        if (sourceType === 'sprint_polysemy' && item.category !== 'polysemy') return;
        add(item.word, item.meaning || '', {
          badge: item.badge || '',
          contrast: item.contrast || '',
          category: item.category || '',
          type: item.type || '',
          source: 'sprint'
        });
      });
    }

    return result;
  }

  function generateAnkiTsv(words, tagPrefix) {
    var prefix = tagPrefix || '考研英语::冲刺词单';
    var lines = [];
    words.forEach(function(item) {
      var en = item.en;
      var cn = item.cn || '';
      var extraHtml = '';

      if (global.WordNetwork && global.WordNetwork.lookup) {
        var net = global.WordNetwork.lookup(en);
        if (net.hasNetwork) {
          if (net.root) {
            extraHtml += '<div style="margin-top:6px;font-size:12px;color:#07536a;"><b>词根：</b>' +
              escapeHTML(net.root.root) + ' (' + escapeHTML(net.root.meaning || net.root.mean || '') + ')</div>';
          }
          if (net.confusable) {
            extraHtml += '<div style="margin-top:4px;font-size:11px;color:#b45309;"><b>形近辨析：</b>' +
              escapeHTML(net.confusable.analysis) + '</div>';
          }
        }
      }

      var backHtml = '<div style="font-size:16px;font-weight:bold;color:#102a36;">' + escapeHTML(cn) + '</div>' + extraHtml;
      var tag = prefix;
      if (item.meta && item.meta.root) tag += '::' + item.meta.root;
      else if (item.meta && item.meta.lapses) tag += '::易错词';

      var frontClean = en.replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
      var backClean = backHtml.replace(/\t/g, ' ').replace(/\r?\n/g, '');
      var tagClean = tag.replace(/\t/g, ' ').replace(/\s+/g, '_');

      lines.push(frontClean + '\t' + backClean + '\t' + tagClean);
    });

    return lines.join('\n');
  }

  function generatePrintableMarkup(words, title, filterName, mode) {
    var activeMode = mode || printMode || 'standard';
    var isCompact = activeMode === 'compact';
    var now = new Date();
    var nowStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();
    var tipText = isCompact
      ? '极简考前急救版 · 双栏高密度排版（每页约80~100词）'
      : '使用说明：沿中虚线对折即可遮挡中文自测';
    var html = '<div class="sprint-print-sheet' + (isCompact ? ' is-compact' : '') + '">' +
      '<div class="sprint-print-header">' +
        '<div class="sprint-print-title">' + (isCompact ? '考前急救速记单 · ' : '考研英语冲刺折页背诵单 · ') + escapeHTML(title || '重点词单') + '</div>' +
        '<div class="sprint-print-meta">' +
          '<span>分类：' + escapeHTML(filterName || '精选词库') + '</span>' +
          '<span>词量：' + words.length + ' 词</span>' +
          '<span>导出：' + nowStr + '</span>' +
          '<span>' + tipText + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="sprint-print-grid' + (isCompact ? ' is-compact' : '') + '">';

    words.forEach(function(w, idx) {
      var rootNote = '';
      var badgeTag = '';
      if (w.meta && w.meta.badge) {
        badgeTag = '<span class="sprint-print-tag">[' + escapeHTML(w.meta.badge) + ']</span>';
      }
      if (!isCompact && global.WordNetwork && global.WordNetwork.lookup) {
        var net = global.WordNetwork.lookup(w.en);
        if (net.hasNetwork && net.root) {
          var rMean = net.root.meaning || net.root.mean || '';
          rootNote = '<span class="sprint-print-root">[' + escapeHTML(net.root.root) + (rMean ? ':' + escapeHTML(rMean) : '') + ']</span>';
        }
      }
      var cnText = String(w.cn || '').replace(/\s+/g, ' ');
      if (isCompact && cnText.length > 26) cnText = cnText.slice(0, 25) + '…';
      html += '<div class="sprint-print-row">' +
        '<div class="sprint-col-en">' +
          '<span class="sprint-row-num">' + (idx + 1) + '.</span>' +
          '<span class="sprint-word-en">' + escapeHTML(w.en) + '</span>' +
          rootNote +
        '</div>' +
        '<div class="sprint-col-fold">┊</div>' +
        '<div class="sprint-col-cn">' +
          badgeTag +
          '<span class="sprint-word-cn">' + escapeHTML(cnText) + '</span>' +
        '</div>' +
      '</div>';
    });

    html += '</div>' +
      '<div class="sprint-print-footer">Words 考研英语复习助手 · 冲刺打印清单 · 沉着应考 · 祝金榜题名</div>' +
    '</div>';

    return html;
  }

  function getFilterLabel(f) {
    var map = {
      hard: '易错攻坚词',
      due: '待复习高危词',
      sprint_weak: '专题待巩固词',
      sprint_all: '考前专题词全量',
      sprint_attitude: '专题·态度题眼',
      sprint_logic: '专题·逻辑动词',
      sprint_polysemy: '专题·熟词僻义',
      roots: '30+经典词根家族',
      confusables: '27+真题形近辨析',
      vocab: '考研核心生词本',
      hb: '红宝书核心词库',
      hongbaoshu: '红宝书核心词库'
    };
    return map[f] || '精选词单';
  }

  function showToast(msg) {
    if (typeof document === 'undefined') return;
    var t = document.getElementById('sprintToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sprintToast';
      t.className = 'sprint-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2000);
  }

  function triggerPrint() {
    if (typeof document === 'undefined') return;
    ensureHongbaoshu(function() {
      var words = collectWords(currentFilter);
      if (!words.length) {
        showToast('当前分类暂无可打印的单词');
        return;
      }
      cachedWords = words;
      var label = getFilterLabel(currentFilter);
      var container = document.getElementById('sprintPrintZone');
      if (!container) {
        container = document.createElement('div');
        container.id = 'sprintPrintZone';
        document.body.appendChild(container);
      }
      container.innerHTML = generatePrintableMarkup(words, label, label, printMode);
      window.print();
    });
  }

  function copyAnkiText() {
    if (typeof document === 'undefined') return;
    ensureHongbaoshu(function() {
      var words = collectWords(currentFilter);
      if (!words.length) {
        showToast('当前分类暂无词汇可导出');
        return;
      }
      cachedWords = words;
      var label = getFilterLabel(currentFilter);
      var tsv = generateAnkiTsv(words, '考研英语::' + label);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsv).then(function() {
          showToast('已复制 ' + words.length + ' 词 Anki TSV 文本');
        }).catch(function() {
          fallbackCopy(tsv, words.length);
        });
      } else {
        fallbackCopy(tsv, words.length);
      }
    });
  }

  function fallbackCopy(text, count) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('已复制 ' + count + ' 词 Anki TSV 文本');
    } catch(e) {
      showToast('复制失败，请重试');
    }
    document.body.removeChild(ta);
  }

  function downloadAnkiFile() {
    if (typeof document === 'undefined') return;
    ensureHongbaoshu(function() {
      var words = collectWords(currentFilter);
      if (!words.length) {
        showToast('当前分类暂无词汇可导出');
        return;
      }
      cachedWords = words;
      var label = getFilterLabel(currentFilter);
      var tsv = generateAnkiTsv(words, '考研英语::' + label);
      var blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'kaoyan_sprint_' + currentFilter + '_' + words.length + 'words.tsv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      showToast('已生成并下载 ' + words.length + ' 词 Anki 牌组');
    });
  }

  function setPrintMode(mode) {
    printMode = (mode === 'compact') ? 'compact' : 'standard';
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.sprint-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === printMode);
      });
    }
  }

  function switchFilter(f) {
    currentFilter = f;
    updateModalContent();
    if (!Array.isArray(global.HONGBAOSHU) && typeof global.loadHB === 'function') {
      ensureHongbaoshu(function() {
        if (currentFilter === f) updateModalContent();
      });
    }
  }

  function updateModalContent() {
    if (typeof document === 'undefined') return;
    var pills = document.querySelectorAll('.sprint-filter-pill');
    pills.forEach(function(pill) {
      pill.classList.toggle('active', pill.getAttribute('data-filter') === currentFilter);
    });

    cachedWords = collectWords(currentFilter);
    var countEl = document.getElementById('sprintCount');
    if (countEl) countEl.textContent = cachedWords.length;

    var previewEl = document.getElementById('sprintPreview');
    if (previewEl) {
      if (!cachedWords.length) {
        previewEl.innerHTML = '<div style="text-align:center;color:var(--muted,#5f747d);padding:18px 0;">当前分类暂无词汇数据</div>';
      } else {
        var sample = cachedWords.slice(0, 5);
        var previewHtml = '';
        sample.forEach(function(item) {
          previewHtml += '<div class="sprint-preview-item">' +
            '<span class="sprint-preview-en">' + escapeHTML(item.en) + '</span>' +
            '<span class="sprint-preview-cn">' + escapeHTML(item.cn) + '</span>' +
          '</div>';
        });
        if (cachedWords.length > 5) {
          previewHtml += '<div style="text-align:center;color:var(--muted,#5f747d);font-size:11px;padding-top:6px;">… 等共 ' + cachedWords.length + ' 个重点词</div>';
        }
        previewEl.innerHTML = previewHtml;
      }
    }
  }

  function openModal(defaultFilter) {
    if (typeof document === 'undefined') return;
    install();
    if (defaultFilter) currentFilter = defaultFilter;
    var modal = document.getElementById('sprintExportModal');
    if (!modal) return;
    updateModalContent();
    modal.classList.add('open');
    if (!Array.isArray(global.HONGBAOSHU) && typeof global.loadHB === 'function') {
      ensureHongbaoshu(function() {
        updateModalContent();
      });
    }
  }

  function closeModal() {
    if (typeof document === 'undefined') return;
    var modal = document.getElementById('sprintExportModal');
    if (modal) modal.classList.remove('open');
  }

  function install() {
    if (typeof document === 'undefined' || !document.getElementById || !document.head) return;
    if (!document.getElementById('sprintExportStyles')) {
      var style = document.createElement('style');
      style.id = 'sprintExportStyles';
      style.textContent =
        '.sprint-modal-mask{position:fixed;inset:0;z-index:10020;background:rgba(7,83,106,.32);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .18s ease}' +
        '.sprint-modal-mask.open{opacity:1;pointer-events:auto}' +
        '.sprint-modal-card{width:100%;max-width:500px;max-height:86vh;background:rgba(255,255,255,.94);border:1px solid rgba(7,83,106,.16);border-radius:20px;box-shadow:0 18px 45px rgba(7,83,106,.15);display:flex;flex-direction:column;overflow:hidden;transform:scale(.95);transition:transform .2s cubic-bezier(.23,1,.32,1)}' +
        '.sprint-modal-mask.open .sprint-modal-card{transform:scale(1)}' +
        '.sprint-modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(7,83,106,.08);background:rgba(255,255,255,.8)}' +
        '.sprint-modal-title{font-size:16px;font-weight:800;color:var(--deep,#07536a);display:flex;align-items:center;gap:8px}' +
        '.sprint-modal-close{width:32px;height:32px;border-radius:50%;border:none;background:rgba(7,83,106,.06);color:var(--deep,#07536a);cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}' +
        '.sprint-modal-body{padding:14px 18px;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch}' +
        '.sprint-filter-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}' +
        '.sprint-filter-pill{padding:5px 11px;border-radius:999px;border:1px solid rgba(7,83,106,.15);background:rgba(7,83,106,.04);color:var(--ink,#102a36);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s ease;-webkit-tap-highlight-color:transparent}' +
        '.sprint-filter-pill.active{background:var(--deep,#07536a);border-color:var(--deep,#07536a);color:#fff;box-shadow:0 3px 8px rgba(7,83,106,.22)}' +
        '.sprint-summary-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 12px;background:rgba(239,249,255,.85);border:1px solid rgba(20,112,159,.12);border-radius:10px;font-size:12px;color:var(--ocean,#14709f);font-weight:700;margin-bottom:12px}' +
        '.sprint-mode-switch{display:inline-flex;background:rgba(7,83,106,.08);padding:2px;border-radius:8px;gap:2px}' +
        '.sprint-mode-btn{border:none;background:transparent;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;color:var(--muted,#5f747d);cursor:pointer}' +
        '.sprint-mode-btn.active{background:#fff;color:var(--deep,#07536a);box-shadow:0 1px 2px rgba(0,0,0,.08)}' +
        '.sprint-preview-box{border:1px solid rgba(7,83,106,.1);border-radius:12px;background:rgba(255,255,255,.6);padding:10px 12px;max-height:150px;overflow-y:auto;font-size:12px;margin-bottom:14px}' +
        '.sprint-preview-item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed rgba(7,83,106,.08)}' +
        '.sprint-preview-item:last-child{border-bottom:none}' +
        '.sprint-preview-en{font-weight:750;color:var(--deep,#07536a)}' +
        '.sprint-preview-cn{color:var(--muted,#5f747d);max-width:60%;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.sprint-actions-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px}' +
        '.sprint-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:0 12px;border-radius:12px;border:1px solid rgba(7,83,106,.16);font-size:12.5px;font-weight:750;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .12s ease,background-color .15s ease}' +
        '.sprint-btn:active{transform:scale(.96)}' +
        '.sprint-btn-primary{background:var(--deep,#07536a);color:#fff;border-color:var(--deep,#07536a);box-shadow:0 4px 12px rgba(7,83,106,.2)}' +
        '.sprint-btn-secondary{background:rgba(7,83,106,.06);color:var(--deep,#07536a)}' +
        '.sprint-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 85px);z-index:10030;transform:translate(-50%,10px);padding:8px 16px;border-radius:999px;background:rgba(19,43,57,.92);color:#fff;font-size:12px;font-weight:700;opacity:0;pointer-events:none;transition:all .18s ease}' +
        '.sprint-toast.show{opacity:1;transform:translate(-50%,0)}' +
        'html[data-theme="dark"] .sprint-modal-card{background:rgba(15,31,40,.96);border-color:rgba(56,189,248,.22);color:#f0fdf4}' +
        'html[data-theme="dark"] .sprint-modal-head{background:rgba(19,39,51,.9);border-bottom-color:rgba(56,189,248,.14)}' +
        'html[data-theme="dark"] .sprint-modal-title{color:#38bdf8}' +
        'html[data-theme="dark"] .sprint-modal-close{background:rgba(56,189,248,.14);color:#38bdf8}' +
        'html[data-theme="dark"] .sprint-filter-pill{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.2);color:#e2e8f0}' +
        'html[data-theme="dark"] .sprint-filter-pill.active{background:#0ea5e9;border-color:#0ea5e9;color:#fff}' +
        'html[data-theme="dark"] .sprint-summary-bar{background:rgba(14,165,233,.14);border-color:rgba(56,189,248,.22);color:#38bdf8}' +
        'html[data-theme="dark"] .sprint-mode-switch{background:rgba(56,189,248,.12)}' +
        'html[data-theme="dark"] .sprint-mode-btn{color:#94a3b8}' +
        'html[data-theme="dark"] .sprint-mode-btn.active{background:#0ea5e9;color:#fff}' +
        'html[data-theme="dark"] .sprint-preview-box{background:rgba(9,19,25,.65);border-color:rgba(56,189,248,.18)}' +
        'html[data-theme="dark"] .sprint-preview-item{border-bottom-color:rgba(56,189,248,.1)}' +
        'html[data-theme="dark"] .sprint-preview-en{color:#38bdf8}' +
        'html[data-theme="dark"] .sprint-preview-cn{color:#94a3b8}' +
        'html[data-theme="dark"] .sprint-btn-secondary{background:rgba(56,189,248,.12);border-color:rgba(56,189,248,.22);color:#e2e8f0}' +
        'html[data-theme="dark"] .sprint-btn-primary{background:#0ea5e9;border-color:#0ea5e9;color:#fff}' +
        '@media print{' +
          'body>*{display:none!important}' +
          '#sprintPrintZone{display:block!important;position:static!important;width:100%!important;padding:0!important;background:#fff!important;color:#000!important}' +
          '.sprint-print-sheet{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",serif}' +
          '.sprint-print-header{border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end}' +
          '.sprint-print-title{font-size:15pt;font-weight:900;color:#000}' +
          '.sprint-print-meta{font-size:8.5pt;color:#333;display:flex;gap:10px}' +
          '.sprint-print-grid{display:block}' +
          '.sprint-print-grid.is-compact{column-count:2;column-gap:12px;column-rule:1px solid #d4d4d8}' +
          '.sprint-print-row{display:flex;align-items:baseline;padding:3px 0;border-bottom:.5pt dashed #bbb;break-inside:avoid;font-size:9.5pt;line-height:1.35}' +
          '.sprint-print-grid.is-compact .sprint-print-row{padding:1.5px 0;font-size:8pt;line-height:1.2;border-bottom:.4pt dashed #d4d4d8}' +
          '.sprint-col-en{flex:0 0 46%;font-weight:700;color:#000;display:flex;align-items:baseline;gap:4px;min-width:0}' +
          '.sprint-print-grid.is-compact .sprint-col-en{flex:0 0 44%;gap:2px}' +
          '.sprint-row-num{font-size:8pt;color:#666;min-width:16px}' +
          '.sprint-print-grid.is-compact .sprint-row-num{font-size:7pt;min-width:13px}' +
          '.sprint-word-en{font-weight:800;font-size:10pt}' +
          '.sprint-print-grid.is-compact .sprint-word-en{font-size:8.4pt}' +
          '.sprint-col-fold{flex:0 0 12px;text-align:center;color:#888;font-size:8.5pt;user-select:none}' +
          '.sprint-print-grid.is-compact .sprint-col-fold{flex:0 0 8px;font-size:7.5pt}' +
          '.sprint-col-cn{flex:1;color:#111;font-size:9pt;min-width:0}' +
          '.sprint-print-grid.is-compact .sprint-col-cn{font-size:7.8pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
          '.sprint-print-tag{font-size:7.5pt;font-weight:700;color:#333;margin-right:3px}' +
          '.sprint-print-root{font-size:8pt;color:#555;margin-left:3px;font-weight:normal}' +
          '.sprint-print-footer{margin-top:12px;border-top:1px solid #ddd;padding-top:4px;font-size:8pt;color:#666;text-align:center}' +
          '@page{size:A4 portrait;margin:10mm 8mm}' +
        '}';
      document.head.appendChild(style);
    }

    if (!document.getElementById('sprintExportModal')) {
      var modal = document.createElement('div');
      modal.id = 'sprintExportModal';
      modal.className = 'sprint-modal-mask';
      modal.innerHTML =
        '<div class="sprint-modal-card" onclick="event.stopPropagation()">' +
          '<div class="sprint-modal-head">' +
            '<div class="sprint-modal-title">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>' +
              '冲刺词单打印 · Anki 导出' +
            '</div>' +
            '<button class="sprint-modal-close" type="button" aria-label="关闭" onclick="SprintExport.closeModal()">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>' +
          '</div>' +
          '<div class="sprint-modal-body">' +
            '<div class="sprint-filter-pills">' +
              '<button class="sprint-filter-pill active" data-filter="hard" onclick="SprintExport.switchFilter(\'hard\')">易错攻坚词</button>' +
              '<button class="sprint-filter-pill" data-filter="due" onclick="SprintExport.switchFilter(\'due\')">待复习高危</button>' +
              '<button class="sprint-filter-pill" data-filter="sprint_weak" onclick="SprintExport.switchFilter(\'sprint_weak\')">专题待巩固</button>' +
              '<button class="sprint-filter-pill" data-filter="sprint_all" onclick="SprintExport.switchFilter(\'sprint_all\')">考前专题词</button>' +
              '<button class="sprint-filter-pill" data-filter="sprint_attitude" onclick="SprintExport.switchFilter(\'sprint_attitude\')">态度题眼</button>' +
              '<button class="sprint-filter-pill" data-filter="sprint_logic" onclick="SprintExport.switchFilter(\'sprint_logic\')">逻辑动词</button>' +
              '<button class="sprint-filter-pill" data-filter="sprint_polysemy" onclick="SprintExport.switchFilter(\'sprint_polysemy\')">熟词僻义</button>' +
              '<button class="sprint-filter-pill" data-filter="roots" onclick="SprintExport.switchFilter(\'roots\')">30+词根家族</button>' +
              '<button class="sprint-filter-pill" data-filter="confusables" onclick="SprintExport.switchFilter(\'confusables\')">27+形近辨析</button>' +
              '<button class="sprint-filter-pill" data-filter="vocab" onclick="SprintExport.switchFilter(\'vocab\')">生词本全量</button>' +
            '</div>' +
            '<div class="sprint-summary-bar">' +
              '<span>当前已筛选：<b id="sprintCount">0</b> 词</span>' +
              '<div class="sprint-mode-switch">' +
                '<button type="button" class="sprint-mode-btn active" data-mode="standard" onclick="SprintExport.setPrintMode(\'standard\')">标准折页</button>' +
                '<button type="button" class="sprint-mode-btn" data-mode="compact" onclick="SprintExport.setPrintMode(\'compact\')">极简急救(80~100词/页)</button>' +
              '</div>' +
            '</div>' +
            '<div class="sprint-preview-box" id="sprintPreview"></div>' +
            '<div class="sprint-actions-grid">' +
              '<button class="sprint-btn sprint-btn-primary" onclick="SprintExport.triggerPrint()">' +
                '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>' +
                '打印 A4 折页单' +
              '</button>' +
              '<button class="sprint-btn sprint-btn-secondary" onclick="SprintExport.copyAnki()">' +
                '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
                '复制 Anki 文本' +
              '</button>' +
              '<button class="sprint-btn sprint-btn-secondary" onclick="SprintExport.downloadAnki()">' +
                '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
                '下载 TSV' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      modal.onclick = closeModal;
      document.body.appendChild(modal);
    }
  }

  global.SprintExport = {
    collectWords: collectWords,
    generateAnkiTsv: generateAnkiTsv,
    generatePrintableMarkup: generatePrintableMarkup,
    triggerPrint: triggerPrint,
    copyAnki: copyAnkiText,
    downloadAnki: downloadAnkiFile,
    switchFilter: switchFilter,
    setPrintMode: setPrintMode,
    openModal: openModal,
    closeModal: closeModal,
    refreshPreview: updateModalContent
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
  }
})(window);