(function () {
  'use strict';

  const mastery = {
    unrated: { level: 0, label: '尚未评估' },
    forgot: { level: 1, label: '完全记不得' },
    fuzzy: { level: 2, label: '模糊' },
    familiar: { level: 3, label: '基本熟悉' },
    mastered: { level: 4, label: '完全熟悉' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function richText(value) {
    let safe = escapeHtml(value);
    safe = safe.replace(/\{\{(accent|danger|success|muted)\|(.+?)\}\}/g, '<span class="rich-$1">$2</span>');
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong class="rich-strong">$1</strong>');
    safe = safe.replace(/==(.+?)==/g, '<mark class="rich-highlight">$1</mark>');
    return safe;
  }

  function masteryInfo(value) {
    return mastery[value] || mastery.unrated;
  }

  function ring(value, extraClass) {
    const info = masteryInfo(value);
    return `<span class="mastery-ring ${extraClass || ''}" data-level="${info.level}" style="--level:${info.level}" aria-label="${info.label}" title="${info.label}"></span>`;
  }

  function outlineItem(item) {
    const children = item.children && item.children.length
      ? `<ul class="outline-children">${item.children.map(child => `<li><strong>${richText(child.heading)}</strong>：${richText(child.text)}</li>`).join('')}</ul>`
      : '';
    return `<article class="outline-item"><h3>${richText(item.heading)}</h3><p>${richText(item.text)}</p>${children}</article>`;
  }

  function cardArticle(card, topic, options) {
    const config = { mode: 'memorize', revealed: true, hintLevel: 0, ...(options || {}) };
    const examples = card.examples && card.examples.length
      ? `<section class="content-section"><div class="content-label">理解与例证</div><div class="example-list">${card.examples.map(text => `<p class="example-item">${richText(text)}</p>`).join('')}</div></section>`
      : '';
    const exam = card.exam_wording
      ? `<section class="content-section"><details class="fold"><summary>考场表述 <span class="rich-muted">默认折叠</span></summary><div class="fold-content">${richText(card.exam_wording)}</div></details></section>`
      : '';
    const hints = card.hints && card.hints.length
      ? `<section class="content-section"><details class="fold"><summary>渐进提示 <span class="rich-muted">${card.hints.length} 级</span></summary><div class="fold-content">${card.hints.map(h => `<p><strong>提示 ${h.level}</strong> · ${richText(h.text)}</p>`).join('')}</div></details></section>`
      : '';
    const tags = (card.tags || []).map(tag => `<span>#${escapeHtml(tag)}</span>`).join(' ');
    const path = `${card.subject} / ${card.module} / ${(topic && topic.title) || card.topic_id}`;

    const visibleHints = (card.hints || []).filter(h => Number(h.level) <= config.hintLevel);
    const recallHints = config.mode === 'recall' && !config.revealed
      ? `<div class="progressive-hints">${visibleHints.map(h => `<p><strong>提示 ${h.level}</strong>${richText(h.text)}</p>`).join('') || '<p class="hint-empty">先独立回忆；想不起来时再逐级展开提示。</p>'}</div>` : '';
    return `
      <div class="knowledge-card">
        <header class="card-cover">
          <div class="card-path">${escapeHtml(path)}</div>
          <div class="card-title-line"><h1>${escapeHtml(card.title)}</h1>${ring(card.schedule && card.schedule.mastery)}</div>
          <div class="card-prompt"><span>RECALL PROMPT</span>${richText(card.prompt)}</div>
          ${recallHints}
        </header>
        <div class="card-body ${config.mode === 'recall' && !config.revealed ? 'answer-concealed' : ''}">
          <section class="content-section"><div class="content-label">核心结论</div><p class="lead-text">${richText(card.summary)}</p></section>
          <section class="content-section"><div class="content-label">知识主干</div><div class="outline-list">${(card.outline || []).map(outlineItem).join('')}</div></section>
          ${examples}
          ${hints}
          ${exam}
          <section class="content-section"><div class="content-label">来源</div><div class="source-line">${escapeHtml(card.source && card.source.note_path || '未记录来源')}<div class="source-tags">${tags}</div></div></section>
        </div>
      </div>`;
  }

  function subjectRow(subject, label, detail, count, averageLevel) {
    const badge = subject === 'politics' ? '政' : subject;
    const color = subject === '706' ? '#da7756' : subject === '807' ? '#141413' : '#8c664e';
    return `<button class="subject-row" type="button" data-subject="${subject}"><span class="subject-badge" style="background:${color}">${badge}</span><span class="subject-copy"><strong>${escapeHtml(label)}</strong><small>${count} 张卡 · ${escapeHtml(detail)}</small></span><span class="mastery-ring" data-level="${averageLevel}" style="--level:${averageLevel}"></span></button>`;
  }

  function topicRow(topic, cards) {
    const levels = cards.map(c => masteryInfo(c.schedule && c.schedule.mastery).level).filter(Boolean);
    const level = levels.length ? Math.round(levels.reduce((a,b) => a+b, 0) / levels.length) : 0;
    return `<button class="topic-row" type="button" data-topic="${escapeHtml(topic.id)}"><span><strong>${escapeHtml(topic.module)} · ${escapeHtml(topic.title)}</strong><p>${escapeHtml(topic.description || '')}<br>${cards.length} 张卡</p></span>${ring(level === 0 ? 'unrated' : ['unrated','forgot','fuzzy','familiar','mastered'][level])}</button>`;
  }

  function cardTitleRow(card) {
    const info = masteryInfo(card.schedule && card.schedule.mastery);
    const due = window.CardsScheduler ? CardsScheduler.formatDue(card.schedule && card.schedule.due_at) : '暂未安排';
    return `<div class="swipe-row" data-row-card="${escapeHtml(card.id)}"><div class="swipe-actions"><button data-action="edit" data-id="${escapeHtml(card.id)}">编辑</button><button data-action="move" data-id="${escapeHtml(card.id)}">移动</button><button class="delete" data-action="delete" data-id="${escapeHtml(card.id)}">删除</button></div><button class="card-title-row swipe-content" type="button" data-card="${escapeHtml(card.id)}"><span class="card-title-copy"><strong>${escapeHtml(card.title)}</strong><small>${info.label} · ${due}</small></span>${ring(card.schedule && card.schedule.mastery)}</button></div>`;
  }

  window.CardsRender = { escapeHtml, richText, masteryInfo, ring, cardArticle, subjectRow, topicRow, cardTitleRow };
})();
