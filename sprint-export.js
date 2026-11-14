(function(global) {
  'use strict';

  var currentFilter = 'hard';
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

  function generatePrintableMarkup(words, title, filterName) {
    var now = new Date();
    var nowStr = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate();
    var html = '<div class="sprint-print-sheet">' +
      '<div class="sprint-print-header">' +
        '<div class="sprint-print-title">考研英语冲刺折页背诵单 · ' + escapeHTML(title || '重点词单') + '</div>' +
        '<div class="sprint-print-meta">' +
          '<span>分类：' + escapeHTML(filterName || '精选词库') + '</span>' +
          '<span>词量：' + words.length + ' 词</span>' +
          '<span>导出日期：' + nowStr + '</span>' +
          '<span>使用说明：沿中虚线对折即可遮挡中文自测</span>' +
        '</div>' +
      '</div>' +
      '<div class="sprint-print-grid">';

    words.forEach(function(w, idx) {
      var rootNote = '';
      if (global.WordNetwork && global.WordNetwork.lookup) {
        var net = global.WordNetwork.lookup(w.en);
        if (net.hasNetwork && net.root) {
          var rMean = net.root.meaning || net.root.mean || '';
          rootNote = '<span class="sprint-print-root">[' + escapeHTML(net.root.root) + (rMean ? ':' + escapeHTML(rMean) : '') + ']</span>';
        }
      }
      html += '<div class="sprint-print-row">' +
        '<div class="sprint-col-en">' +
          '<span class="sprint-row-num">' + (idx + 1) + '.</span>' +
          '<span class="sprint-word-en">' + escapeHTML(w.en) + '</span>' +
          rootNote +
        '</div>' +
        '<div class="sprint-col-fold">┊</div>' +
        '<div class="sprint-col-cn">' +
          '<span class="sprint-word-cn">' + escapeHTML(w.cn) + '</span>' +
        '</div>' +
      '</div>';
    });

    html += '</div>' +
      '<div class="sprint-print-footer">Words 考研英语复习助手 · 冲刺打印折页清单 · 沉着应考 · 祝金榜题名</div>' +
    '</div>';

    return html;
  }

  function getFilterLabel(f) {
    var map = {
      hard: '易错攻坚词',
      due: '待复习高危词',
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
      container.innerHTML = generatePrintableMarkup(words, label, label);
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
        '.sprint-summary-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(239,249,255,.85);border:1px solid rgba(20,112,159,.12);border-radius:10px;font-size:12px;color:var(--ocean,#14709f);font-weight:700;margin-bottom:12px}' +
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
        '@media print{' +
          'body>*{display:none!important}' +
          '#sprintPrintZone{display:block!important;position:absolute!important;left:0!important;top:0!important;width:100%!important;padding:8mm 10mm!important;background:#fff!important;color:#000!important}' +
          '.sprint-print-sheet{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC",serif}' +
          '.sprint-print-header{border-bottom:2px solid #000;padding-bottom:5px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-end}' +
          '.sprint-print-title{font-size:15pt;font-weight:900;color:#000}' +
          '.sprint-print-meta{font-size:8.5pt;color:#333;display:flex;gap:10px}' +
          '.sprint-print-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}' +
          '.sprint-print-row{display:flex;align-items:baseline;padding:2.5px 0;border-bottom:.5pt dashed #bbb;break-inside:avoid;font-size:9.5pt;line-height:1.3}' +
          '.sprint-col-en{flex:0 0 46%;font-weight:700;color:#000;display:flex;align-items:baseline;gap:4px}' +
          '.sprint-row-num{font-size:8pt;color:#666;min-width:14px}' +
          '.sprint-word-en{font-weight:800;font-size:10pt}' +
          '.sprint-col-fold{flex:0 0 10px;text-align:center;color:#888;font-size:8.5pt;user-select:none}' +
          '.sprint-col-cn{flex:1;color:#111;font-size:9pt}' +
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
              '<button class="sprint-filter-pill" data-filter="roots" onclick="SprintExport.switchFilter(\'roots\')">30+词根家族</button>' +
              '<button class="sprint-filter-pill" data-filter="confusables" onclick="SprintExport.switchFilter(\'confusables\')">27+形近辨析</button>' +
              '<button class="sprint-filter-pill" data-filter="vocab" onclick="SprintExport.switchFilter(\'vocab\')">生词本全量</button>' +
            '</div>' +
            '<div class="sprint-summary-bar">' +
              '<span>当前已筛选：<b id="sprintCount">0</b> 词</span>' +
              '<span style="font-size:11px;font-weight:normal;opacity:.85;">适合双面打印与 Anki 刷词</span>' +
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
    openModal: openModal,
    closeModal: closeModal,
    refreshPreview: updateModalContent
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
  }
})(window);