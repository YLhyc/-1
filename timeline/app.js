(function () {
  'use strict';

  const D706 = window.DATA_706;
  const D807 = window.DATA_807;

  const LS_CHECKED = 'lit_timeline_checked_v1';
  const LS_THEME = 'lit_timeline_theme_v1';
  const LS_SUBJECT = 'lit_timeline_subject_v1';

  const REL_807 = {
    promote: { label: '推动促进', color: '#267346' },
    react:   { label: '反拨革新', color: '#bf3426' },
    branch:  { label: '分流拓展', color: '#2d5f85' }
  };

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 允许 807 数据中的 <mark>...</mark> 高亮标签安全通过
  function safeMark(str) {
    return esc(str)
      .replace(/&lt;mark&gt;/g, '<mark>')
      .replace(/&lt;\/mark&gt;/g, '</mark>');
  }

  function createSubState(sub) {
    return {
      tier: 'ALL',
      genre: 'ALL',
      stream: 'ALL',
      chainId: null,
      search: '',
      uncheckedOnly: false,
      showBridge: sub === '706',
      selectedId: null,
      focusOnly: false,
      showEgo: true,
      relTab: 'all',
      scrollTop: 0
    };
  }

  const appState = {
    subject: localStorage.getItem(LS_SUBJECT) === '807' ? '807' : '706',
    theme: localStorage.getItem(LS_THEME) || 'warm',
    quizMode: false,
    minimapCollapsed: false,
    sheetOpen: false,
    sheetExpanded: false,
    checked: loadJson(LS_CHECKED, {}),
    sub: {
      '706': createSubState('706'),
      '807': createSubState('807')
    }
  };

  // 建立快速索引
  const idx706 = {
    nodeMap: new Map(D706.NODES.map((n, i) => [n.id, { ...n, _order: i }])),
    eraMap: new Map(D706.ERAS.map((e, i) => [e.id, { ...e, _order: i }]))
  };
  const idx807 = {
    nodeMap: new Map(D807.nodes.map((n, i) => [n.id, { ...n, _order: i }])),
    periodMap: new Map(D807.periods.map((p, i) => [p.id, { ...p, _order: i }])),
    streamMap: new Map(D807.streams.map(s => [s.id, s])),
    genreMap: new Map(D807.genres.map(g => [g.id, g]))
  };

  // DOM 引用
  const $ = id => document.getElementById(id);
  const el = {
    metaThemeColor: $('metaThemeColor'),
    btnQuiz: $('btnQuiz'),
    btnFilterDrawer: $('btnFilterDrawer'),
    filterDot: $('filterDot'),
    btnTheme: $('btnTheme'),
    ipadFilterStrip: $('ipadFilterStrip'),
    minimapWrap: $('minimapWrap'),
    minimapInfo: $('minimapInfo'),
    checkStat: $('checkStat'),
    btnMinimapCollapse: $('btnMinimapCollapse'),
    minimapTrack: $('minimapTrack'),
    focusPanel: $('focusPanel'),
    focusPill: $('focusPill'),
    focusText: $('focusText'),
    btnToggleFocusOnly: $('btnToggleFocusOnly'),
    btnToggleEgo: $('btnToggleEgo'),
    btnClearSelect: $('btnClearSelect'),
    egoBox: $('egoBox'),
    egoHint: $('egoHint'),
    egoSvgWrap: $('egoSvgWrap'),
    chainBanner: $('chainBanner'),
    timelinePane: $('timelinePane'),
    timelineList: $('timelineList'),
    sheetBackdrop: $('sheetBackdrop'),
    inspectorPane: $('inspectorPane'),
    btnSheetExpand: $('btnSheetExpand'),
    btnSheetClose: $('btnSheetClose'),
    inspectorBody: $('inspectorBody'),
    dockSearch: $('dockSearch'),
    dockChains: $('dockChains'),
    dockUnchecked: $('dockUnchecked'),
    dockExtra: $('dockExtra'),
    dockExtraLabel: $('dockExtraLabel'),
    dockReset: $('dockReset'),
    modalBackdrop: $('modalBackdrop'),
    drawerModal: $('drawerModal'),
    drawerTitle: $('drawerTitle'),
    drawerBody: $('drawerBody'),
    btnCloseDrawer: $('btnCloseDrawer'),
    toast: $('toast')
  };

  function S() { return appState.sub[appState.subject]; }
  function isPhone() { return window.innerWidth < 820; }
  function checkKey(sub, id) { return sub + ':' + id; }
  function isChecked(sub, id) { return !!appState.checked[checkKey(sub, id)]; }

  let toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
  }

  function applyTheme(theme) {
    appState.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    el.metaThemeColor.setAttribute('content', theme === 'dark' ? '#141413' : '#fbfaf7');
    try { localStorage.setItem(LS_THEME, theme); } catch (_) {}
  }

  // ===== 关系检索工具 =====
  function getRelations(sub, nodeId) {
    const up = [];
    const down = [];
    const cmp = [];
    if (!nodeId) return { up, down, cmp, allIds: new Set(), map: new Map() };

    if (sub === '706') {
      D706.EDGES.forEach(e => {
        if (e.type === 'compare') {
          if (e.from === nodeId) cmp.push({ otherId: e.to, edge: e, dir: 'cmp' });
          else if (e.to === nodeId) cmp.push({ otherId: e.from, edge: e, dir: 'cmp' });
        } else {
          if (e.to === nodeId) up.push({ otherId: e.from, edge: e, dir: 'up' });
          else if (e.from === nodeId) down.push({ otherId: e.to, edge: e, dir: 'down' });
        }
      });
      const sortByOrder = (a, b) => (idx706.nodeMap.get(a.otherId)?._order || 0) - (idx706.nodeMap.get(b.otherId)?._order || 0);
      up.sort(sortByOrder);
      down.sort(sortByOrder);
      cmp.sort(sortByOrder);
    } else {
      D807.edges.forEach(e => {
        if (e.to === nodeId) up.push({ otherId: e.from, edge: e, dir: 'up' });
        else if (e.from === nodeId) down.push({ otherId: e.to, edge: e, dir: 'down' });
      });
      const sortByOrder = (a, b) => (idx807.nodeMap.get(a.otherId)?._order || 0) - (idx807.nodeMap.get(b.otherId)?._order || 0);
      up.sort(sortByOrder);
      down.sort(sortByOrder);
    }

    const allIds = new Set([nodeId]);
    const map = new Map();
    up.forEach(r => { allIds.add(r.otherId); if (!map.has(r.otherId)) map.set(r.otherId, r); });
    down.forEach(r => { allIds.add(r.otherId); if (!map.has(r.otherId)) map.set(r.otherId, r); });
    cmp.forEach(r => { allIds.add(r.otherId); if (!map.has(r.otherId)) map.set(r.otherId, r); });
    return { up, down, cmp, allIds, map };
  }

  function countEdges(sub, nodeId) {
    if (sub === '706') {
      return D706.EDGES.filter(e => e.from === nodeId || e.to === nodeId).length;
    }
    return D807.edges.filter(e => e.from === nodeId || e.to === nodeId).length;
  }

  function getActiveChain(sub, chainId) {
    if (!chainId) return null;
    if (sub === '706') return D706.CHAINS.find(c => c.id === chainId) || null;
    return D807.themes.find(t => t.id === chainId) || null;
  }

  function hasActiveFilters(sub) {
    const st = appState.sub[sub];
    return st.tier !== 'ALL' || st.genre !== 'ALL' || st.stream !== 'ALL' ||
      !!st.chainId || !!st.search.trim() || st.uncheckedOnly || st.focusOnly;
  }

  function getFilteredNodes(sub) {
    const st = appState.sub[sub];
    const rel = getRelations(sub, st.selectedId);
    const chain = getActiveChain(sub, st.chainId);
    const chainSet = chain ? new Set(sub === '706' ? chain.nodes : chain.node_ids) : null;
    const kw = st.search.trim().toLowerCase();

    const list = sub === '706' ? D706.NODES : D807.nodes;
    return list.filter(n => {
      if (sub === '706' && n.tier === 'BRIDGE' && !st.showBridge && !rel.allIds.has(n.id) && !(chainSet && chainSet.has(n.id))) {
        return false;
      }
      if (st.focusOnly && st.selectedId && !rel.allIds.has(n.id)) return false;
      if (chainSet && !chainSet.has(n.id)) return false;
      if (st.tier !== 'ALL' && n.tier !== st.tier) return false;
      if (st.genre !== 'ALL' && n.genre !== st.genre) return false;
      if (sub === '807' && st.stream !== 'ALL' && n.stream !== st.stream) return false;
      if (st.uncheckedOnly && isChecked(sub, n.id)) return false;
      if (kw) {
        const hay = sub === '706'
          ? [n.name, n.subEra, n.school, n.one, n.bg, n.exams, ...(n.skeleton || [])].join(' ').toLowerCase()
          : [n.title, n.subtitle, n.year, n.intro, n.hook, n.exams, n.guard].join(' ').toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }

  // ===== 渲染顶部科目状态 & 打卡计数 =====
  function renderTopMeta() {
    const sub = appState.subject;
    const st = S();
    document.querySelectorAll('.sub-tab').forEach(btn => {
      const on = btn.dataset.subject === sub;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    el.btnQuiz.classList.toggle('active', appState.quizMode);
    document.body.classList.toggle('quiz-on', appState.quizMode);
    el.filterDot.hidden = !hasActiveFilters(sub);
    el.dockUnchecked.classList.toggle('active', st.uncheckedOnly);
    el.dockChains.classList.toggle('active', !!st.chainId);
    el.dockSearch.classList.toggle('active', !!st.search.trim());

    if (sub === '706') {
      el.dockExtraLabel.textContent = st.showBridge ? '藏过渡' : '显过渡';
      el.dockExtra.classList.toggle('active', st.showBridge);
    } else {
      el.dockExtraLabel.textContent = '理论卡';
      el.dockExtra.classList.remove('active');
    }

    // 本机打卡统计（706 统计 35 主节点，807 统计 35 节点）
    const mainNodes = sub === '706' ? D706.NODES.filter(n => n.tier !== 'BRIDGE') : D807.nodes;
    const doneCnt = mainNodes.filter(n => isChecked(sub, n.id)).length;
    el.checkStat.textContent = `已过 ${doneCnt}/${mainNodes.length}`;
  }

  // ===== iPad 常驻精简筛选行 =====
  function renderIpadStrip() {
    const sub = appState.subject;
    const st = S();
    const tiers = ['ALL', 'T0', 'T1', 'T2', 'T3'];
    let html = '<span style="font-size:12px;color:var(--text-3);font-weight:600;">梯度:</span>';
    tiers.forEach(t => {
      const label = t === 'ALL' ? '全部' : t;
      html += `<button type="button" class="f-chip ${st.tier === t ? 'active' : ''}" data-ipad-tier="${t}">${label}</button>`;
    });
    html += `<button type="button" class="f-chip ${st.uncheckedOnly ? 'active' : ''}" data-ipad-action="unchecked">只看未过</button>`;
    if (sub === '706') {
      html += `<button type="button" class="f-chip ${st.showBridge ? 'active' : ''}" data-ipad-action="bridge">过渡锚点</button>`;
    } else {
      html += `<button type="button" class="f-chip" data-ipad-action="theory">文艺理论卡 (8)</button>`;
    }
    html += `<button type="button" class="f-chip ${st.chainId ? 'active' : ''}" data-ipad-action="chains">${st.chainId ? '已选母题链' : '母题链 / 对比'}</button>`;
    if (hasActiveFilters(sub)) {
      html += `<button type="button" class="f-chip" data-ipad-action="reset">重置</button>`;
    }
    el.ipadFilterStrip.innerHTML = html;
  }

  // ===== 时期缩略条 =====
  function renderMinimap(filtered) {
    const sub = appState.subject;
    const st = S();
    const rel = getRelations(sub, st.selectedId);
    const periods = sub === '706' ? D706.ERAS : D807.periods;

    el.minimapWrap.classList.toggle('collapsed', appState.minimapCollapsed);

    if (st.selectedId) {
      const cur = sub === '706' ? idx706.nodeMap.get(st.selectedId) : idx807.nodeMap.get(st.selectedId);
      const cname = cur ? (sub === '706' ? cur.name : cur.title) : '';
      const relCount = rel.up.length + rel.down.length + rel.cmp.length;
      el.minimapInfo.innerHTML = `定位 <strong>${esc(cname)}</strong> · 关联 ${relCount} 处`;
    } else if (st.chainId) {
      const ch = getActiveChain(sub, st.chainId);
      const chName = ch ? (sub === '706' ? ch.name : ch.short) : '';
      el.minimapInfo.innerHTML = `母题链 <strong>${esc(chName)}</strong> · 共 ${filtered.length} 节点`;
    } else {
      el.minimapInfo.textContent = sub === '706'
        ? `八朝时空坐标 · 当前显示 ${filtered.length} 节点`
        : `百年五期坐标 · 当前显示 ${filtered.length} 节点`;
    }

    const byEra = new Map(periods.map(p => [p.id, []]));
    filtered.forEach(n => {
      const key = sub === '706' ? n.era : n.period;
      if (byEra.has(key)) byEra.get(key).push(n);
    });

    let html = '';
    periods.forEach(p => {
      const items = byEra.get(p.id) || [];
      const hitItems = st.selectedId ? items.filter(n => rel.allIds.has(n.id)) : items;
      const isHit = st.selectedId ? hitItems.length > 0 : items.length > 0;
      const isDim = st.selectedId ? hitItems.length === 0 : items.length === 0;
      const shortName = sub === '706' ? p.name : p.range;

      let dotsHtml = '';
      const dotSource = st.selectedId ? hitItems : items.slice(0, 10);
      dotSource.forEach(n => {
        if (n.id === st.selectedId) {
          dotsHtml += '<span class="mm-dot self"></span>';
        } else if (st.selectedId && rel.map.has(n.id)) {
          const r = rel.map.get(n.id);
          const col = sub === '706'
            ? (D706.REL_HEX[r.edge.type] || '#b84a2c')
            : (REL_807[r.edge.type]?.color || '#b84a2c');
          dotsHtml += `<span class="mm-dot" style="background:${col}"></span>`;
        } else {
          const col = n.tier === 'T0' ? 'var(--accent)' : n.tier === 'T1' ? 'var(--warn)' : 'var(--border-strong)';
          dotsHtml += `<span class="mm-dot" style="background:${col}"></span>`;
        }
      });

      html += `
        <button type="button" class="mm-pill ${isHit && st.selectedId ? 'hit' : ''} ${isDim ? 'dim' : ''}" data-jump-era="${p.id}">
          <div class="mm-top">
            <span>${esc(shortName)}</span>
            <span class="mm-cnt">${st.selectedId ? hitItems.length : items.length}</span>
          </div>
          <div class="mm-dots">${dotsHtml}</div>
        </button>`;
    });
    el.minimapTrack.innerHTML = html;
  }

  // ===== 单拎聚焦栏 + 因果流向 SVG（iPhone 竖向三层 / iPad 横向三栏） =====
  function renderFocusAndEgo() {
    const sub = appState.subject;
    const st = S();
    if (!st.selectedId) {
      el.focusPanel.hidden = true;
      return;
    }

    const cur = sub === '706' ? idx706.nodeMap.get(st.selectedId) : idx807.nodeMap.get(st.selectedId);
    if (!cur) {
      el.focusPanel.hidden = true;
      return;
    }

    const rel = getRelations(sub, st.selectedId);
    const totalRel = rel.up.length + rel.down.length + rel.cmp.length;
    const curName = sub === '706' ? cur.name : cur.title;

    el.focusPanel.hidden = false;
    el.focusPill.textContent = st.focusOnly ? '已单拎' : '已选中';
    el.focusText.textContent = `${curName}（上${rel.up.length} · 下${rel.down.length}${rel.cmp.length ? ' · 对' + rel.cmp.length : ''}）`;
    el.btnToggleFocusOnly.classList.toggle('active', st.focusOnly);
    el.btnToggleFocusOnly.textContent = st.focusOnly ? '恢复全部' : '单拎相关';
    el.btnToggleEgo.classList.toggle('active', st.showEgo);

    el.egoBox.hidden = !st.showEgo;
    if (!st.showEgo) return;

    if (totalRel === 0) {
      el.egoHint.textContent = '该节点暂无直接连线关系';
      el.egoSvgWrap.innerHTML = '';
      return;
    }

    if (isPhone()) {
      el.egoHint.innerHTML = '<span>竖向因果流向（上早 → 中当前 → 下晚）</span><span>轻点任意节点继续漫游</span>';
      el.egoSvgWrap.innerHTML = buildVerticalEgoSvg(sub, cur, rel);
    } else {
      el.egoHint.innerHTML = '<span>横向因果流向（左早 → 中当前 → 右晚）</span><span>点击任意关联节点切换中心</span>';
      el.egoSvgWrap.innerHTML = buildHorizontalEgoSvg(sub, cur, rel);
    }
  }

  function truncate(str, max) {
    const s = String(str || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function getEdgeMeta(sub, edge) {
    if (sub === '706') {
      return {
        label: D706.REL_META[edge.type]?.label || edge.type,
        color: D706.REL_HEX[edge.type] || '#b84a2c'
      };
    }
    const m = REL_807[edge.type] || { label: edge.type, color: '#b84a2c' };
    return m;
  }

  function getNodeDisplay(sub, id) {
    if (sub === '706') {
      const n = idx706.nodeMap.get(id);
      if (!n) return { title: id, era: '' };
      return { title: n.name, era: idx706.eraMap.get(n.era)?.name || '' };
    }
    const n = idx807.nodeMap.get(id);
    if (!n) return { title: id, era: '' };
    return { title: n.title, era: n.year };
  }

  // iPhone 竖向三层流向 SVG（上：上游早于它 -> 中：当前 -> 下：下游晚于它 -> 底：对比）
  function buildVerticalEgoSvg(sub, cur, rel) {
    const W = Math.max(320, Math.min(420, window.innerWidth - 28));
    const padX = 10;
    const cols = 2;
    const gapX = 10;
    const cardW = Math.floor((W - padX * 2 - gapX) / cols);
    const cardH = 44;
    const gapY = 10;
    const curW = Math.min(230, W - 40);
    const curH = 48;

    const upRows = Math.ceil(rel.up.length / cols);
    const downRows = Math.ceil(rel.down.length / cols);
    const cmpRows = Math.ceil(rel.cmp.length / cols);

    let y = 18;
    const upPositions = [];
    if (rel.up.length > 0) {
      y += 14;
      rel.up.forEach((item, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const rowLen = Math.min(cols, rel.up.length - r * cols);
        const rowW = rowLen * cardW + (rowLen - 1) * gapX;
        const startX = (W - rowW) / 2;
        upPositions.push({ item, x: startX + c * (cardW + gapX), y: y + r * (cardH + gapY) });
      });
      y += upRows * cardH + Math.max(0, upRows - 1) * gapY + 26;
    }

    const curX = (W - curW) / 2;
    const curY = y;
    y += curH + 28;

    const downPositions = [];
    if (rel.down.length > 0) {
      y += 14;
      rel.down.forEach((item, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const rowLen = Math.min(cols, rel.down.length - r * cols);
        const rowW = rowLen * cardW + (rowLen - 1) * gapX;
        const startX = (W - rowW) / 2;
        downPositions.push({ item, x: startX + c * (cardW + gapX), y: y + r * (cardH + gapY) });
      });
      y += downRows * cardH + Math.max(0, downRows - 1) * gapY + 18;
    }

    const cmpPositions = [];
    if (rel.cmp.length > 0) {
      y += 18;
      rel.cmp.forEach((item, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const rowLen = Math.min(cols, rel.cmp.length - r * cols);
        const rowW = rowLen * cardW + (rowLen - 1) * gapX;
        const startX = (W - rowW) / 2;
        cmpPositions.push({ item, x: startX + c * (cardW + gapX), y: y + r * (cardH + gapY) });
      });
      y += cmpRows * cardH + Math.max(0, cmpRows - 1) * gapY + 12;
    }

    const H = y + 6;
    const curDisp = getNodeDisplay(sub, cur.id);
    const parts = [];

    // 区块标题
    if (rel.up.length > 0) {
      parts.push(`<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-3)">上游来源（更早）</text>`);
    }
    if (rel.down.length > 0) {
      parts.push(`<text x="${W / 2}" y="${curY + curH + 24}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-3)">下游促进（更晚）</text>`);
    }
    if (rel.cmp.length > 0) {
      const cmpLabelY = cmpPositions[0].y - 8;
      parts.push(`<text x="${W / 2}" y="${cmpLabelY}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--purple)">双峰对敲对比</text>`);
    }

    // 连线：上游 -> 当前
    upPositions.forEach(p => {
      const meta = getEdgeMeta(sub, p.item.edge);
      const x1 = p.x + cardW / 2;
      const y1 = p.y + cardH;
      const x2 = W / 2;
      const y2 = curY;
      const my = (y1 + y2) / 2;
      parts.push(`<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="${meta.color}" stroke-width="1.5" stroke-opacity="0.7"/>`);
    });

    // 连线：当前 -> 下游
    downPositions.forEach(p => {
      const meta = getEdgeMeta(sub, p.item.edge);
      const x1 = W / 2;
      const y1 = curY + curH;
      const x2 = p.x + cardW / 2;
      const y2 = p.y;
      const my = (y1 + y2) / 2;
      parts.push(`<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="${meta.color}" stroke-width="1.5" stroke-opacity="0.7"/>`);
    });

    // 连线：对比（虚线）
    cmpPositions.forEach(p => {
      const meta = getEdgeMeta(sub, p.item.edge);
      const x1 = W / 2;
      const y1 = curY + curH;
      const x2 = p.x + cardW / 2;
      const y2 = p.y;
      parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${meta.color}" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity="0.55"/>`);
    });

    // 辅助节点绘制
    const drawNode = (p, dashed) => {
      const d = getNodeDisplay(sub, p.item.otherId);
      const meta = getEdgeMeta(sub, p.item.edge);
      parts.push(`
        <g class="ego-node" data-ego-id="${esc(p.item.otherId)}" style="cursor:pointer;">
          <rect x="${p.x}" y="${p.y}" width="${cardW}" height="${cardH}" rx="9" fill="var(--card)" stroke="${meta.color}" stroke-width="1.2" ${dashed ? 'stroke-dasharray="4 2"' : ''}/>
          <text x="${p.x + 9}" y="${p.y + 18}" font-size="12" font-weight="600" fill="var(--text)">${esc(truncate(d.title, 10))}</text>
          <text x="${p.x + 9}" y="${p.y + 34}" font-size="10" fill="${meta.color}">${esc(meta.label)} · ${esc(truncate(d.era, 8))}</text>
        </g>`);
    };

    upPositions.forEach(p => drawNode(p, false));
    downPositions.forEach(p => drawNode(p, false));
    cmpPositions.forEach(p => drawNode(p, true));

    // 中心当前节点
    parts.push(`
      <g>
        <rect x="${curX}" y="${curY}" width="${curW}" height="${curH}" rx="11" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
        <text x="${W / 2}" y="${curY + 21}" text-anchor="middle" font-size="13.5" font-weight="700" fill="var(--text)">${esc(truncate(curDisp.title, 14))}</text>
        <text x="${W / 2}" y="${curY + 38}" text-anchor="middle" font-size="10.5" fill="var(--accent)">当前中心 · ${esc(curDisp.era)}</text>
      </g>`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
  }

  // iPad 横向三栏流向 SVG（左早 -> 中当前 -> 右晚）
  function buildHorizontalEgoSvg(sub, cur, rel) {
    const W = 760;
    const nodeW = 190;
    const nodeH = 42;
    const gapY = 10;
    const leftX = 16;
    const midX = (W - nodeW) / 2;
    const rightX = W - nodeW - 16;

    const maxSide = Math.max(1, rel.up.length, rel.down.length);
    const mainH = Math.max(110, maxSide * (nodeH + gapY) + 34);
    const cmpH = rel.cmp.length ? 68 : 0;
    const H = mainH + cmpH;
    const midY = (mainH - nodeH) / 2 + 8;

    const parts = [];
    parts.push(`<text x="${leftX + nodeW / 2}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-3)">上游来源（更早）</text>`);
    parts.push(`<text x="${W / 2}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="var(--accent)">当前中心</text>`);
    parts.push(`<text x="${rightX + nodeW / 2}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-3)">下游促进（更晚）</text>`);

    const layoutCol = (items, x) => {
      const totalH = items.length * nodeH + Math.max(0, items.length - 1) * gapY;
      const startY = 26 + (mainH - 26 - totalH) / 2;
      return items.map((item, i) => ({ item, x, y: startY + i * (nodeH + gapY) }));
    };

    const upPos = layoutCol(rel.up, leftX);
    const downPos = layoutCol(rel.down, rightX);

    upPos.forEach(p => {
      const meta = getEdgeMeta(sub, p.item.edge);
      const x1 = p.x + nodeW;
      const y1 = p.y + nodeH / 2;
      const x2 = midX;
      const y2 = midY + nodeH / 2;
      const cx = (x1 + x2) / 2;
      parts.push(`<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}" fill="none" stroke="${meta.color}" stroke-width="1.6" stroke-opacity="0.72"/>`);
    });

    downPos.forEach(p => {
      const meta = getEdgeMeta(sub, p.item.edge);
      const x1 = midX + nodeW;
      const y1 = midY + nodeH / 2;
      const x2 = p.x;
      const y2 = p.y + nodeH / 2;
      const cx = (x1 + x2) / 2;
      parts.push(`<path d="M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}" fill="none" stroke="${meta.color}" stroke-width="1.6" stroke-opacity="0.72"/>`);
    });

    const drawBox = (p, dashed) => {
      const d = getNodeDisplay(sub, p.item.otherId);
      const meta = getEdgeMeta(sub, p.item.edge);
      parts.push(`
        <g class="ego-node" data-ego-id="${esc(p.item.otherId)}" style="cursor:pointer;">
          <rect x="${p.x}" y="${p.y}" width="${nodeW}" height="${nodeH}" rx="9" fill="var(--card)" stroke="${meta.color}" stroke-width="1.2" ${dashed ? 'stroke-dasharray="4 2"' : ''}/>
          <text x="${p.x + 10}" y="${p.y + 18}" font-size="12" font-weight="600" fill="var(--text)">${esc(truncate(d.title, 13))}</text>
          <text x="${p.x + 10}" y="${p.y + 33}" font-size="10" fill="${meta.color}">${esc(meta.label)} · ${esc(truncate(d.era, 10))}</text>
        </g>`);
    };

    upPos.forEach(p => drawBox(p, false));
    downPos.forEach(p => drawBox(p, false));

    if (rel.cmp.length) {
      const rowW = rel.cmp.length * nodeW + (rel.cmp.length - 1) * 14;
      const startX = (W - rowW) / 2;
      const cy = mainH + 14;
      rel.cmp.forEach((item, i) => {
        const px = startX + i * (nodeW + 14);
        const meta = getEdgeMeta(sub, item.edge);
        parts.push(`<line x1="${W / 2}" y1="${midY + nodeH}" x2="${px + nodeW / 2}" y2="${cy}" stroke="${meta.color}" stroke-width="1.3" stroke-dasharray="4 3" stroke-opacity="0.6"/>`);
        drawBox({ item, x: px, y: cy }, true);
      });
    }

    const curDisp = getNodeDisplay(sub, cur.id);
    parts.push(`
      <g>
        <rect x="${midX}" y="${midY}" width="${nodeW}" height="${nodeH + 4}" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>
        <text x="${W / 2}" y="${midY + 20}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--text)">${esc(truncate(curDisp.title, 12))}</text>
        <text x="${W / 2}" y="${midY + 36}" text-anchor="middle" font-size="10.5" fill="var(--accent)">${esc(curDisp.era)}</text>
      </g>`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;">${parts.join('')}</svg>`;
  }

  // ===== 母题链横幅 =====
  function renderChainBanner() {
    const sub = appState.subject;
    const st = S();
    const ch = getActiveChain(sub, st.chainId);
    if (!ch) {
      el.chainBanner.hidden = true;
      return;
    }
    el.chainBanner.hidden = false;
    if (sub === '706') {
      el.chainBanner.innerHTML = `
        <div class="chain-banner-head">
          <span class="chain-banner-title">${esc(ch.name)}</span>
          <button type="button" class="pill-btn ghost" data-clear-chain>退出母题链</button>
        </div>
        <div class="chain-banner-desc">${esc(ch.desc)}</div>
        ${ch.stages ? `<div class="chain-banner-desc" style="margin-top:4px;color:var(--text);">${esc(ch.stages)}</div>` : ''}`;
    } else {
      el.chainBanner.innerHTML = `
        <div class="chain-banner-head">
          <span class="chain-banner-title">${esc(ch.title)}</span>
          <button type="button" class="pill-btn ghost" data-clear-chain>退出母题链</button>
        </div>
        <div class="chain-banner-desc">${esc(ch.exam || '')} · ${safeMark(ch.summary || '')}</div>`;
    }
  }

  // ===== 主时间轴列表 =====
  function renderTimeline(filtered) {
    const sub = appState.subject;
    const st = S();
    const rel = getRelations(sub, st.selectedId);
    const periods = sub === '706' ? D706.ERAS : D807.periods;

    if (filtered.length === 0) {
      el.timelineList.innerHTML = `
        <div class="insp-empty">
          当前筛选条件下没有匹配节点。<br/>
          <button type="button" class="pill-btn active" style="margin-top:12px;" data-reset-all>重置全部筛选</button>
        </div>`;
      return;
    }

    const byEra = new Map(periods.map(p => [p.id, []]));
    filtered.forEach(n => {
      const k = sub === '706' ? n.era : n.period;
      if (byEra.has(k)) byEra.get(k).push(n);
    });

    const checkIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    let html = '';
    periods.forEach(p => {
      const items = byEra.get(p.id) || [];
      if (items.length === 0) return;

      const eraRange = sub === '706' ? p.span : p.range;
      const eraBg = sub === '706' ? p.bg : p.bg;

      html += `<section class="era-section" id="era-${esc(p.id)}">
        <div class="era-header">
          <div class="era-title-row">
            <h2 class="era-name">${esc(p.name)}</h2>
            <span class="era-range">${esc(eraRange)}</span>
          </div>
          <p class="era-bg">${esc(eraBg)}</p>
        </div>
        <div class="era-nodes">`;

      items.forEach(n => {
        const isSel = st.selectedId === n.id;
        const relInfo = st.selectedId && !isSel ? rel.map.get(n.id) : null;
        const isDim = !!st.selectedId && !isSel && !relInfo;
        const checked = isChecked(sub, n.id);
        const edgeCnt = countEdges(sub, n.id);

        const cls = [
          'node-card',
          'tier-' + n.tier,
          n.tier === 'BRIDGE' ? 'is-bridge' : '',
          isSel ? 'selected' : '',
          relInfo ? 'rel-' + relInfo.dir : '',
          isDim ? 'dimmed' : '',
          checked ? 'checked-done' : ''
        ].filter(Boolean).join(' ');

        const relBadge = relInfo
          ? `<span class="rel-badge ${relInfo.dir}">${relInfo.dir === 'up' ? '上游' : relInfo.dir === 'down' ? '下游' : '对比'} · ${esc(getEdgeMeta(sub, relInfo.edge).label)}</span>`
          : '';

        if (sub === '706') {
          const gLabel = D706.GENRE_META[n.genre]?.label || n.genre;
          html += `
            <article class="${cls}" data-node-id="${esc(n.id)}">
              <div class="card-top">
                <div class="card-meta-row">
                  <span class="tier-tag ${n.tier}">${n.tier === 'BRIDGE' ? '过渡·不背' : n.tier}</span>
                  <span class="meta-chip">${esc(n.subEra)}</span>
                  <span class="meta-chip">${esc(gLabel)}</span>
                  ${relBadge}
                </div>
                ${n.tier !== 'BRIDGE' ? `
                <button type="button" class="check-btn ${checked ? 'done' : ''}" data-check-id="${esc(n.id)}" aria-label="标记已过">
                  <span class="check-circle">${checkIconSvg}</span>
                </button>` : ''}
              </div>
              <h3 class="card-title">${esc(n.name)}</h3>
              <div class="card-sub">${esc(n.school)}</div>
              <p class="card-one">${esc(n.one)}</p>
              <div class="card-foot">
                <span class="card-exams">${esc(n.exams || '脉络锚点')}</span>
                <span class="card-rel-cnt">${edgeCnt} 条关联</span>
              </div>
            </article>`;
        } else {
          const stObj = idx807.streamMap.get(n.stream);
          const gObj = idx807.genreMap.get(n.genre);
          html += `
            <article class="${cls}" data-node-id="${esc(n.id)}">
              <div class="card-top">
                <div class="card-meta-row">
                  <span class="tier-tag ${n.tier}">${esc(n.tier)}</span>
                  <span class="meta-chip">${esc(n.year)}</span>
                  ${stObj ? `<span class="meta-chip">${esc(stObj.name)}</span>` : ''}
                  ${gObj ? `<span class="meta-chip">${esc(gObj.name)}</span>` : ''}
                  ${relBadge}
                </div>
                <button type="button" class="check-btn ${checked ? 'done' : ''}" data-check-id="${esc(n.id)}" aria-label="标记已过">
                  <span class="check-circle">${checkIconSvg}</span>
                </button>
              </div>
              <h3 class="card-title">${esc(n.title)}</h3>
              <div class="card-sub">${esc(n.subtitle || '')}</div>
              <p class="card-one">${safeMark(n.intro || '')}</p>
              <div class="card-foot">
                <span class="card-exams">${esc(n.exams || '')}</span>
                <span class="card-rel-cnt">${edgeCnt} 条关联</span>
              </div>
            </article>`;
        }
      });

      html += '</div>';

      // 807 时期附带 T3 速记锚点折叠盒
      if (sub === '807' && !st.focusOnly && !st.chainId && !st.search.trim()) {
        const anchors = (D807.anchors || []).filter(a => a.period === p.id);
        if (anchors.length > 0) {
          html += `
            <details class="anchor-box">
              <summary class="anchor-summary">
                <span>本时期 T3 速记锚点（${anchors.length} 个名词解释）</span>
                <span style="font-size:11px;color:var(--accent);">展开查看</span>
              </summary>
              <div class="anchor-list">
                ${anchors.map(a => `
                  <div class="anchor-item">
                    <div class="anchor-item-head">
                      <span class="anchor-name">${esc(a.year)} · ${esc(a.name)}</span>
                      ${a.exam_tag ? `<span class="anchor-tag">${esc(a.exam_tag)}</span>` : ''}
                    </div>
                    <p><strong>定位：</strong>${safeMark(a.s1)}</p>
                    <p><strong>要素：</strong>${safeMark(a.s2)}</p>
                    <p><strong>意义：</strong>${safeMark(a.s3)}</p>
                  </div>`).join('')}
              </div>
            </details>`;
        }
      }

      html += '</section>';
    });

    el.timelineList.innerHTML = html;
  }

  // ===== 详情面板（iPhone Bottom Sheet / iPad 右侧常驻） =====
  function renderInspector() {
    const sub = appState.subject;
    const st = S();

    if (isPhone()) {
      el.inspectorPane.classList.toggle('open', appState.sheetOpen && !!st.selectedId);
      el.inspectorPane.classList.toggle('expanded', appState.sheetExpanded);
      el.sheetBackdrop.hidden = !(appState.sheetOpen && !!st.selectedId);
    } else {
      el.sheetBackdrop.hidden = true;
    }

    if (!st.selectedId) {
      el.inspectorBody.innerHTML = `
        <div class="insp-empty">
          轻点左侧任意时间轴节点，<br/>
          即可查看答题骨架、历史作用与上下游因果链。<br/><br/>
          <span style="font-size:12px;">小提示：右上角开启「遮罩」可闭卷默写自检，勾选圆点仅存本机缓存。</span>
        </div>`;
      return;
    }

    const cur = sub === '706' ? idx706.nodeMap.get(st.selectedId) : idx807.nodeMap.get(st.selectedId);
    if (!cur) return;

    const rel = getRelations(sub, st.selectedId);
    const checked = isChecked(sub, cur.id);

    const quickBar = `
      <div class="insp-quick-bar">
        <button type="button" class="insp-action ${st.focusOnly ? 'active' : ''}" data-insp-action="focus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
          <span>${st.focusOnly ? '恢复全部' : '单拎相关'}</span>
        </button>
        <button type="button" class="insp-action ${checked ? 'done' : ''}" data-insp-action="check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${checked ? '已过一遍' : '标记已过'}</span>
        </button>
        <button type="button" class="insp-action ${appState.quizMode ? 'active' : ''}" data-insp-action="quiz">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>${appState.quizMode ? '关闭遮罩' : '遮罩自检'}</span>
        </button>
      </div>`;

    let bodyHtml = '';

    if (sub === '706') {
      const eraName = idx706.eraMap.get(cur.era)?.name || cur.era;
      const gLabel = D706.GENRE_META[cur.genre]?.label || cur.genre;
      bodyHtml += `
        <div class="insp-head">
          <div class="card-meta-row">
            <span class="tier-tag ${cur.tier}">${cur.tier === 'BRIDGE' ? '过渡·不背' : cur.tier}</span>
            <span class="meta-chip">${esc(eraName)} · ${esc(cur.subEra)}</span>
            <span class="meta-chip">${esc(gLabel)}</span>
          </div>
          <h2 class="insp-title">${esc(cur.name)}</h2>
          <div class="insp-sub">${esc(cur.school)}</div>
        </div>
        ${quickBar}
        <div class="insp-block">
          <div class="insp-label"><span>时代背景与触媒</span></div>
          <div class="insp-box">${esc(cur.bg)}</div>
        </div>
        <div class="insp-block">
          <div class="insp-label"><span>核心答题骨架</span><span>${appState.quizMode ? '轻点单条揭示' : ''}</span></div>
          <div class="insp-list">
            ${(cur.skeleton || []).map(item => `<div class="insp-li quiz-maskable">${esc(item)}</div>`).join('')}
          </div>
        </div>
        ${(cur.roles && cur.roles.length) ? `
        <div class="insp-block">
          <div class="insp-label"><span>核心文学史作用</span></div>
          <div class="insp-list">
            ${cur.roles.map(r => `<div class="insp-li role-li quiz-maskable">${esc(r)}</div>`).join('')}
          </div>
        </div>` : ''}
        <div class="insp-block">
          <div class="insp-label"><span>真题考情</span></div>
          <div class="insp-box">${esc(cur.exams || '脉络过渡锚点，了解前后衔接即可')}</div>
        </div>`;
    } else {
      const pName = idx807.periodMap.get(cur.period)?.name || cur.period;
      const stName = idx807.streamMap.get(cur.stream)?.name || '';
      const gName = idx807.genreMap.get(cur.genre)?.name || '';
      bodyHtml += `
        <div class="insp-head">
          <div class="card-meta-row">
            <span class="tier-tag ${cur.tier}">${esc(cur.tier)}</span>
            <span class="meta-chip">${esc(cur.year)}</span>
            ${stName ? `<span class="meta-chip">${esc(stName)}</span>` : ''}
            ${gName ? `<span class="meta-chip">${esc(gName)}</span>` : ''}
          </div>
          <h2 class="insp-title">${esc(cur.title)}</h2>
          <div class="insp-sub">${esc(cur.subtitle || pName)}</div>
        </div>
        ${quickBar}
        <div class="insp-block">
          <div class="insp-label"><span>核心总纲</span></div>
          <div class="insp-box">${safeMark(cur.intro || '')}</div>
        </div>
        ${cur.hook ? `
        <div class="insp-block">
          <div class="insp-label"><span>串讲记忆钩子</span></div>
          <div class="insp-box quiz-maskable">${safeMark(cur.hook)}</div>
        </div>` : ''}
        ${cur.guard ? `
        <div class="insp-block">
          <div class="insp-label"><span>考场防混提示</span></div>
          <div class="insp-box guard">${safeMark(cur.guard)}</div>
        </div>` : ''}
        ${(cur.sections && cur.sections.length) ? `
        <div class="insp-block">
          <div class="insp-label"><span>核心分点骨架</span><span>${appState.quizMode ? '轻点揭示' : ''}</span></div>
          ${cur.sections.map(sec => `
            <div class="sec-card">
              <div class="sec-title">${esc(sec.title)}</div>
              ${sec.count_hook ? `<span class="sec-hook">${esc(sec.count_hook)}</span>` : ''}
              ${sec.cue ? `<div class="sec-cue">自问：${esc(sec.cue)}</div>` : ''}
              ${(sec.steps || []).map(step => `
                <div class="sec-step quiz-maskable">
                  <strong>${esc(step.label)}：</strong>${safeMark(step.text)}
                </div>`).join('')}
            </div>`).join('')}
        </div>` : ''}
        ${(cur.variants && cur.variants.length) ? `
        <div class="insp-block">
          <div class="insp-label"><span>常见变形问法</span></div>
          <div class="insp-list">
            ${cur.variants.map(v => `<div class="insp-li">${esc(typeof v === 'string' ? v : (v.q || JSON.stringify(v)))}</div>`).join('')}
          </div>
        </div>` : ''}
        <div class="insp-block">
          <div class="insp-label"><span>历年真题</span></div>
          <div class="insp-box">${esc(cur.exams || '重点备考专题')}</div>
        </div>`;
    }

    // 上下游因果与对比关系块
    const allRels = [
      ...rel.up.map(r => ({ ...r, grp: 'up' })),
      ...rel.down.map(r => ({ ...r, grp: 'down' })),
      ...rel.cmp.map(r => ({ ...r, grp: 'cmp' }))
    ];
    const shownRels = st.relTab === 'all' ? allRels : allRels.filter(r => r.grp === st.relTab);

    bodyHtml += `
      <div class="insp-block">
        <div class="insp-label"><span>前后因果与流派关联（${allRels.length}）</span></div>
        <div class="rel-tabs">
          <button type="button" class="rel-tab ${st.relTab === 'all' ? 'active' : ''}" data-rel-tab="all">全部 (${allRels.length})</button>
          <button type="button" class="rel-tab ${st.relTab === 'up' ? 'active' : ''}" data-rel-tab="up">上游来源 (${rel.up.length})</button>
          <button type="button" class="rel-tab ${st.relTab === 'down' ? 'active' : ''}" data-rel-tab="down">下游促进 (${rel.down.length})</button>
          ${sub === '706' ? `<button type="button" class="rel-tab ${st.relTab === 'cmp' ? 'active' : ''}" data-rel-tab="cmp">真题对比 (${rel.cmp.length})</button>` : ''}
        </div>
        ${shownRels.length === 0 ? '<div class="insp-box" style="color:var(--text-3);">当前分类下暂无关联。</div>' : shownRels.map(r => {
          const other = getNodeDisplay(sub, r.otherId);
          const meta = getEdgeMeta(sub, r.edge);
          const dirTxt = r.grp === 'up' ? '上游 ←' : r.grp === 'down' ? '下游 →' : '对比 ⇄';
          return `
            <div class="rel-card">
              <div class="rel-card-top">
                <button type="button" class="rel-target-btn" data-jump-node="${esc(r.otherId)}">
                  <span>${dirTxt} ${esc(other.title)}</span>
                </button>
                <span class="rel-type-pill" style="color:${meta.color};border-color:${meta.color};">${esc(meta.label)}</span>
              </div>
              ${sub === '706' ? `
                <div class="rel-detail"><strong>影响机制：</strong>${esc(r.edge.how)}</div>
                <div class="rel-detail"><strong>历史作用：</strong>${esc(r.edge.effect)}</div>
              ` : `
                <div class="rel-detail">${esc(r.edge.label)}</div>
              `}
            </div>`;
        }).join('')}
      </div>`;

    el.inspectorBody.innerHTML = bodyHtml;
  }

  // ===== 筛选 / 母题链 / 理论卡 抽屉 =====
  function openDrawer(mode) {
    const sub = appState.subject;
    const st = S();
    el.modalBackdrop.hidden = false;
    el.drawerModal.hidden = false;

    if (mode === 'theory' && sub === '807') {
      el.drawerTitle.textContent = '807 文艺理论急救卡（8 张）';
      el.drawerBody.innerHTML = (D807.theory_cards || []).map(t => `
        <div class="theory-card">
          <div class="theory-head">
            <span class="theory-name">${esc(t.name)}</span>
            <span class="theory-src">${esc(t.source)}</span>
          </div>
          <div class="theory-def">${safeMark(t.def)}</div>
          <div class="theory-demo"><strong>套用示例：</strong>${safeMark(t.demo)}</div>
        </div>`).join('');
      return;
    }

    if (mode === 'chains') {
      el.drawerTitle.textContent = sub === '706' ? '706 跨代母题链与双峰对比' : '807 跨代母题大题路线';
      const chains = sub === '706' ? D706.CHAINS : D807.themes;
      el.drawerBody.innerHTML = `
        <div class="chip-wrap" style="margin-bottom:14px;">
          <button type="button" class="f-chip ${!st.chainId ? 'active' : ''}" data-pick-chain="">显示全部节点</button>
          ${chains.map(c => `
            <button type="button" class="f-chip ${st.chainId === c.id ? 'active' : ''}" data-pick-chain="${esc(c.id)}">
              ${esc(sub === '706' ? c.name : c.short)}
            </button>`).join('')}
        </div>
        ${chains.map(c => `
          <div class="theory-card" data-pick-chain="${esc(c.id)}" style="cursor:pointer;${st.chainId === c.id ? 'border-color:var(--accent);' : ''}">
            <div class="theory-head">
              <span class="theory-name">${esc(sub === '706' ? c.name : c.title)}</span>
              <span class="theory-src">${sub === '706' ? (c.kind === 'compare' ? '双峰对比' : '纵向母题') : '跨期大题'}</span>
            </div>
            <div class="theory-def">${sub === '706' ? esc(c.desc) : safeMark(c.summary || '')}</div>
            ${sub === '706' && c.stages ? `<div class="theory-demo">${esc(c.stages)}</div>` : ''}
            ${sub === '807' && c.exam ? `<div class="theory-demo"><strong>考情：</strong>${esc(c.exam)}</div>` : ''}
          </div>`).join('')}`;
      return;
    }

    // 默认综合筛选 + 搜索抽屉
    el.drawerTitle.textContent = sub === '706' ? '706 筛选与搜索' : '807 筛选与搜索';
    const tiers = ['ALL', 'T0', 'T1', 'T2', 'T3'];
    const genres = sub === '706'
      ? Object.entries(D706.GENRE_META).map(([k, v]) => ({ id: k, name: v.label }))
      : D807.genres;

    let html = `
      <input type="search" class="search-input" id="drawerSearchInput" placeholder="搜索作家、作品、流派、考点关键词…" value="${esc(st.search)}" />

      <div class="filter-group">
        <div class="filter-group-title">考频梯度</div>
        <div class="chip-wrap">
          ${tiers.map(t => `<button type="button" class="f-chip ${st.tier === t ? 'active' : ''}" data-set-tier="${t}">${t === 'ALL' ? '全部' : t}</button>`).join('')}
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-group-title">体裁分类</div>
        <div class="chip-wrap">
          <button type="button" class="f-chip ${st.genre === 'ALL' ? 'active' : ''}" data-set-genre="ALL">全部</button>
          ${genres.map(g => `<button type="button" class="f-chip ${st.genre === g.id ? 'active' : ''}" data-set-genre="${esc(g.id)}">${esc(g.name)}</button>`).join('')}
        </div>
      </div>`;

    if (sub === '807') {
      html += `
        <div class="filter-group">
          <div class="filter-group-title">思潮流派主脉</div>
          <div class="chip-wrap">
            <button type="button" class="f-chip ${st.stream === 'ALL' ? 'active' : ''}" data-set-stream="ALL">全部</button>
            ${D807.streams.map(s => `
              <button type="button" class="f-chip ${st.stream === s.id ? 'active' : ''}" data-set-stream="${esc(s.id)}">
                <span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}
              </button>`).join('')}
          </div>
        </div>`;
    }

    html += `
      <div class="filter-group">
        <div class="filter-group-title">快捷开关</div>
        <div class="chip-wrap">
          <button type="button" class="f-chip ${st.uncheckedOnly ? 'active' : ''}" data-toggle-unchecked>只看未过节点</button>
          ${sub === '706'
            ? `<button type="button" class="f-chip ${st.showBridge ? 'active' : ''}" data-toggle-bridge>显示过渡锚点 (8)</button>`
            : `<button type="button" class="f-chip" data-open-theory>打开文艺理论卡 (8)</button>`}
          <button type="button" class="f-chip" data-open-chains>选择母题链</button>
          <button type="button" class="f-chip" data-reset-all>清空全部筛选</button>
        </div>
      </div>

      <div class="local-note">
        <span>勾选记录仅存于本机浏览器缓存，不改动正式复习进度文件。</span>
        <button type="button" class="pill-btn" data-clear-checks>清空本科勾选</button>
      </div>`;

    el.drawerBody.innerHTML = html;

    if (mode === 'search') {
      const inp = $('drawerSearchInput');
      if (inp) setTimeout(() => inp.focus(), 80);
    }
  }

  function closeDrawer() {
    el.modalBackdrop.hidden = true;
    el.drawerModal.hidden = true;
  }

  // ===== 总渲染入口 =====
  function renderAll() {
    const sub = appState.subject;
    const filtered = getFilteredNodes(sub);
    renderTopMeta();
    renderIpadStrip();
    renderMinimap(filtered);
    renderFocusAndEgo();
    renderChainBanner();
    renderTimeline(filtered);
    renderInspector();
  }

  function selectNode(nodeId, openSheetOnPhone) {
    const st = S();
    st.selectedId = nodeId;
    st.relTab = 'all';
    if (isPhone() && openSheetOnPhone) {
      appState.sheetOpen = true;
    }
    renderAll();
  }

  function switchSubject(newSub) {
    if (newSub === appState.subject) return;
    // 保存当前滚动位置
    S().scrollTop = el.timelinePane.scrollTop;
    appState.subject = newSub;
    appState.sheetOpen = false;
    try { localStorage.setItem(LS_SUBJECT, newSub); } catch (_) {}
    renderAll();
    el.timelinePane.scrollTop = S().scrollTop || 0;
  }

  function toggleCheck(nodeId) {
    const sub = appState.subject;
    const k = checkKey(sub, nodeId);
    if (appState.checked[k]) {
      delete appState.checked[k];
      showToast('已取消本机标记');
    } else {
      appState.checked[k] = true;
      showToast('已标记为本机过了一遍');
    }
    saveJson(LS_CHECKED, appState.checked);
    renderAll();
  }

  function resetFilters() {
    const sub = appState.subject;
    const prev = S();
    appState.sub[sub] = {
      ...createSubState(sub),
      scrollTop: prev.scrollTop
    };
    appState.sheetOpen = false;
    renderAll();
    showToast('已重置当前科目视图');
  }

  // ===== 事件绑定 =====
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => switchSubject(btn.dataset.subject));
  });

  el.btnTheme.addEventListener('click', () => {
    applyTheme(appState.theme === 'warm' ? 'dark' : 'warm');
  });

  el.btnQuiz.addEventListener('click', () => {
    appState.quizMode = !appState.quizMode;
    renderAll();
    showToast(appState.quizMode ? '已开启遮罩自检：轻点灰色块揭示' : '已关闭遮罩自检');
  });

  el.btnFilterDrawer.addEventListener('click', () => openDrawer('filter'));
  el.btnCloseDrawer.addEventListener('click', closeDrawer);
  el.modalBackdrop.addEventListener('click', closeDrawer);

  el.btnMinimapCollapse.addEventListener('click', () => {
    appState.minimapCollapsed = !appState.minimapCollapsed;
    el.minimapWrap.classList.toggle('collapsed', appState.minimapCollapsed);
  });

  el.minimapTrack.addEventListener('click', e => {
    const btn = e.target.closest('[data-jump-era]');
    if (!btn) return;
    const target = document.getElementById('era-' + btn.dataset.jumpEra);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  el.btnToggleFocusOnly.addEventListener('click', () => {
    S().focusOnly = !S().focusOnly;
    renderAll();
  });

  el.btnToggleEgo.addEventListener('click', () => {
    S().showEgo = !S().showEgo;
    renderFocusAndEgo();
  });

  el.btnClearSelect.addEventListener('click', () => {
    S().selectedId = null;
    S().focusOnly = false;
    appState.sheetOpen = false;
    renderAll();
  });

  el.egoSvgWrap.addEventListener('click', e => {
    const g = e.target.closest('[data-ego-id]');
    if (!g) return;
    const nextId = g.getAttribute('data-ego-id');
    selectNode(nextId, false);
    const card = el.timelineList.querySelector(`[data-node-id="${nextId}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  el.chainBanner.addEventListener('click', e => {
    if (e.target.closest('[data-clear-chain]')) {
      S().chainId = null;
      renderAll();
    }
  });

  // 时间轴卡片点击 & 本地勾选点击
  el.timelineList.addEventListener('click', e => {
    const resetBtn = e.target.closest('[data-reset-all]');
    if (resetBtn) { resetFilters(); return; }

    const chk = e.target.closest('[data-check-id]');
    if (chk) {
      e.stopPropagation();
      toggleCheck(chk.dataset.checkId);
      return;
    }

    const card = e.target.closest('[data-node-id]');
    if (card) {
      selectNode(card.dataset.nodeId, true);
    }
  });

  // iPhone Sheet 控制
  el.btnSheetClose.addEventListener('click', () => {
    appState.sheetOpen = false;
    renderInspector();
  });
  el.sheetBackdrop.addEventListener('click', () => {
    appState.sheetOpen = false;
    renderInspector();
  });
  el.btnSheetExpand.addEventListener('click', () => {
    appState.sheetExpanded = !appState.sheetExpanded;
    el.btnSheetExpand.querySelector('span').textContent = appState.sheetExpanded ? '半屏' : '全屏';
    renderInspector();
  });

  // 详情面板内部点击（遮罩揭示 / 关系切换 / 节点跳转 / 快捷动作）
  el.inspectorBody.addEventListener('click', e => {
    const act = e.target.closest('[data-insp-action]');
    if (act) {
      const type = act.dataset.inspAction;
      if (type === 'focus') {
        S().focusOnly = !S().focusOnly;
        renderAll();
      } else if (type === 'check' && S().selectedId) {
        toggleCheck(S().selectedId);
      } else if (type === 'quiz') {
        appState.quizMode = !appState.quizMode;
        renderAll();
      }
      return;
    }

    const tab = e.target.closest('[data-rel-tab]');
    if (tab) {
      S().relTab = tab.dataset.relTab;
      renderInspector();
      return;
    }

    const jump = e.target.closest('[data-jump-node]');
    if (jump) {
      const targetId = jump.dataset.jumpNode;
      selectNode(targetId, true);
      el.inspectorBody.scrollTop = 0;
      const card = el.timelineList.querySelector(`[data-node-id="${targetId}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const mask = e.target.closest('.quiz-maskable');
    if (mask && appState.quizMode) {
      mask.classList.toggle('revealed');
    }
  });

  // iPad 快捷筛选行事件
  el.ipadFilterStrip.addEventListener('click', e => {
    const tBtn = e.target.closest('[data-ipad-tier]');
    if (tBtn) { S().tier = tBtn.dataset.ipadTier; renderAll(); return; }
    const aBtn = e.target.closest('[data-ipad-action]');
    if (!aBtn) return;
    const act = aBtn.dataset.ipadAction;
    if (act === 'unchecked') { S().uncheckedOnly = !S().uncheckedOnly; renderAll(); }
    else if (act === 'bridge') { S().showBridge = !S().showBridge; renderAll(); }
    else if (act === 'theory') { openDrawer('theory'); }
    else if (act === 'chains') { openDrawer('chains'); }
    else if (act === 'reset') { resetFilters(); }
  });

  // iPhone 底部 Dock
  el.dockSearch.addEventListener('click', () => openDrawer('search'));
  el.dockChains.addEventListener('click', () => openDrawer('chains'));
  el.dockUnchecked.addEventListener('click', () => {
    S().uncheckedOnly = !S().uncheckedOnly;
    renderAll();
    showToast(S().uncheckedOnly ? '仅显示未过节点' : '已显示全部节点');
  });
  el.dockExtra.addEventListener('click', () => {
    if (appState.subject === '706') {
      S().showBridge = !S().showBridge;
      renderAll();
      showToast(S().showBridge ? '已显示 8 个过渡锚点' : '已隐藏过渡锚点');
    } else {
      openDrawer('theory');
    }
  });
  el.dockReset.addEventListener('click', resetFilters);

  // 抽屉内交互
  el.drawerBody.addEventListener('input', e => {
    if (e.target.id === 'drawerSearchInput') {
      S().search = e.target.value;
      renderAll();
    }
  });

  el.drawerBody.addEventListener('click', e => {
    const t = e.target.closest('[data-set-tier]');
    if (t) { S().tier = t.dataset.setTier; renderAll(); openDrawer('filter'); return; }

    const g = e.target.closest('[data-set-genre]');
    if (g) { S().genre = g.dataset.setGenre; renderAll(); openDrawer('filter'); return; }

    const s = e.target.closest('[data-set-stream]');
    if (s) { S().stream = s.dataset.setStream; renderAll(); openDrawer('filter'); return; }

    const ch = e.target.closest('[data-pick-chain]');
    if (ch) {
      S().chainId = ch.dataset.pickChain || null;
      S().focusOnly = false;
      closeDrawer();
      renderAll();
      return;
    }

    if (e.target.closest('[data-toggle-unchecked]')) {
      S().uncheckedOnly = !S().uncheckedOnly;
      renderAll();
      openDrawer('filter');
      return;
    }

    if (e.target.closest('[data-toggle-bridge]')) {
      S().showBridge = !S().showBridge;
      renderAll();
      openDrawer('filter');
      return;
    }

    if (e.target.closest('[data-open-theory]')) { openDrawer('theory'); return; }
    if (e.target.closest('[data-open-chains]')) { openDrawer('chains'); return; }

    if (e.target.closest('[data-reset-all]')) {
      closeDrawer();
      resetFilters();
      return;
    }

    if (e.target.closest('[data-clear-checks]')) {
      const prefix = appState.subject + ':';
      Object.keys(appState.checked).forEach(k => {
        if (k.startsWith(prefix)) delete appState.checked[k];
      });
      saveJson(LS_CHECKED, appState.checked);
      renderAll();
      showToast(`已清空 ${appState.subject} 本机勾选`);
    }
  });

  // 视口旋转/缩放时自动切换因果流向图横竖排
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderFocusAndEgo();
      renderInspector();
    }, 160);
  });

  // 注册 Service Worker（离线秒开）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // 初始化
  applyTheme(appState.theme);
  renderAll();
})();
