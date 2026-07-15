(function () {
  'use strict';

  const subjectLabels = {
    '706': ['中国古代文学与古代汉语', '古代文学 · 古代汉语'],
    '807': ['现当代文学与评论写作', '现当代文学 · 评论写作'],
    politics: ['思想政治理论', '马原 · 毛中特 · 史纲 · 思修']
  };
  const state = {
    cards: [], topics: [], currentSubject: '706', currentTopic: null, currentCard: null,
    route: 'home', sortByMastery: false, resume: null, scrollSaveTimer: null,
    cardMode: 'memorize', revealed: true, hintLevel: 0, searchFilter: 'all',
    session: null, reviewingSession: false, timer: null, cardStartedAt: 0, cardStartedSeconds: 0, editorCard: null,
    deviceId: null, syncing: false, lastForegroundRefreshAt: 0, pairingTransfer: null
  };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 1900);
  }
  function setSaveState(message) { $('#saveState').textContent = message; }
  async function setTheme(theme, persist) {
    const dark = theme === 'dark'; document.body.classList.toggle('dark', dark);
    $('#themeToggle').setAttribute('aria-pressed', dark ? 'true' : 'false');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#171614' : '#f5f4ee';
    localStorage.setItem('cards-theme', theme);
    if (persist) {
      const setting = await CardsDB.setSetting('theme', theme);
      await CardsSync.enqueue('setting_changed', 'theme', { setting });
    }
  }
  function masteryLevel(card) { return CardsRender.masteryInfo(card.schedule && card.schedule.mastery).level; }
  function averageLevel(cards) { const rated = cards.map(masteryLevel).filter(Boolean); return rated.length ? Math.round(rated.reduce((a,b)=>a+b,0)/rated.length) : 0; }
  function elapsedLabel(seconds) { const mins = Math.floor(seconds / 60); const secs = Math.round(seconds % 60); return mins ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}秒`; }
  function localDateKey(value) { const date=value?new Date(value):new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function recommendedRating() { if(state.hintLevel<=0)return'mastered';if(state.hintLevel===1)return'familiar';if(state.hintLevel===2)return'fuzzy';return'forgot'; }

  function refreshDerivedViews() {
    renderHome();
    if (state.currentTopic) renderTopicCards();
    const search = $('#searchInput');
    if (search && search.value.trim()) renderSearch(search.value);
    if (state.route === 'stats') return renderStats();
  }

  function navigate(route) {
    if (state.route === 'card' && route !== 'card') pauseTimer();
    state.route = route;
    $$('.page').forEach(page => page.classList.toggle('active', page.dataset.page === route));
    $$('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.route === route));
    window.scrollTo(0, 0);
    if (route === 'home') renderHome();
    if (route === 'today') renderToday();
    if (route === 'stats') renderStats();
    if (route === 'trash') renderTrash();
  }

  function renderHome() {
    $('#subjectList').innerHTML = Object.keys(subjectLabels).map(subject => {
      const cards = state.cards.filter(card => card.subject === subject);
      return CardsRender.subjectRow(subject, subjectLabels[subject][0], subjectLabels[subject][1], cards.length, averageLevel(cards));
    }).join('');
    $('#cardCount').textContent = `${state.cards.length} 张本地卡`;
    $$('#subjectList [data-subject]').forEach(button => button.onclick = () => openSubject(button.dataset.subject));
    const active = state.session && state.session.status === 'active';
    const activeTopic = active && state.session.kind === 'topic' ? state.topics.find(topic=>topic.id===state.session.topic_id) : null;
    $('#resumeButton').textContent = active ? activeTopic ? `继续专题复习 · ${activeTopic.title}` : `继续今日复习 · ${subjectLabels[state.session.subject][0]}` : '进入今日复习';
  }

  function renderToday() {
    const activeSubject = state.session && state.session.status === 'active' ? state.session.subject : null;
    $('#todaySubjectList').innerHTML = Object.keys(subjectLabels).map(subject => {
      const queue = CardsScheduler.buildQueue(state.cards, subject);
      const active = activeSubject === subject;
      const minutes = Math.max(1, Math.round(queue.estimated_seconds / 60));
      return `<button class="today-subject ${active ? 'active-session' : ''}" data-today-subject="${subject}"><span><strong>${subjectLabels[subject][0]}</strong><small>${active ? '有未完成进度 · 点击继续' : `${queue.due_count} 张待复习 · 预计 ${minutes} 分钟`}</small></span><em>${active ? '继续' : '开始'} →</em></button>`;
    }).join('');
    $$('[data-today-subject]').forEach(button => button.onclick = () => startDailyReview(button.dataset.todaySubject));
  }

  async function startDailyReview(subject) {
    if (state.session && state.session.status === 'active' && state.session.subject !== subject) {
      showToast(`请先完成或继续 ${subjectLabels[state.session.subject][0]} 的复习`); return;
    }
    if (state.session && state.session.status === 'active' && state.session.subject === subject && state.session.card_ids.length) {
      const index = Math.min(state.session.current_index || 0, state.session.card_ids.length - 1);
      const saved = state.session.current_card_state;
      const restore = saved && saved.card_id === state.session.card_ids[index] ? saved : null;
      return openCard(state.session.card_ids[index], restore ? restore.scroll_y : 0, { session: true, restore });
    }
    const queue = CardsScheduler.buildQueue(state.cards, subject);
    if (!queue.ids.length) { showToast('这个科目目前没有到期卡片'); return; }
    const now = new Date().toISOString();
    state.session = { id: uid('session'), subject, card_ids: queue.ids, current_index: 0, reviewed_card_ids: [], seconds: 0, started_at: now, updated_at: now, status: 'active', estimated_seconds: queue.estimated_seconds };
    await CardsDB.put('sessions', state.session); await CardsDB.setSetting('active_review_session', state.session);
    openCard(queue.ids[0], 0, { session: true });
  }

  async function startTopicReview() {
    const topic=state.currentTopic;if(!topic)return;
    if(state.session&&state.session.status==='active'){
      if(state.session.kind==='topic'&&state.session.topic_id===topic.id){const index=Math.min(state.session.current_index||0,state.session.card_ids.length-1),saved=state.session.current_card_state,restore=saved&&saved.card_id===state.session.card_ids[index]?saved:null;return openCard(state.session.card_ids[index],restore?restore.scroll_y:0,{session:true,restore});}
      showToast('已有未完成复习，请先继续或完成当前进度');return;
    }
    const queue=CardsScheduler.buildTopicQueue(state.cards,topic.id);if(!queue.ids.length){showToast('这个专题还没有可复习卡片');return;}
    const now=new Date().toISOString();state.session={id:uid('session'),kind:'topic',topic_id:topic.id,subject:topic.subject,card_ids:queue.ids,current_index:0,reviewed_card_ids:[],seconds:0,started_at:now,updated_at:now,status:'active',estimated_seconds:queue.estimated_seconds};
    await CardsDB.put('sessions',state.session);await CardsDB.setSetting('active_review_session',state.session);openCard(queue.ids[0],0,{session:true});
  }

  function openSubject(subject) {
    state.currentSubject = subject; const cards = state.cards.filter(card => card.subject === subject);
    $('#subjectCode').textContent = subject === 'politics' ? 'POLITICS' : subject; $('#subjectTitle').textContent = subjectLabels[subject][0];
    const level = averageLevel(cards); $('#subjectRing').dataset.level = String(level); $('#subjectRing').style.setProperty('--level', level);
    const topics = state.topics.filter(topic => topic.subject === subject).sort((a,b)=>a.order-b.order);
    $('#topicList').innerHTML = topics.map(topic => CardsRender.topicRow(topic, cards.filter(card => card.topic_id === topic.id))).join('');
    $$('#topicList [data-topic]').forEach(button => button.onclick = () => openTopic(button.dataset.topic)); navigate('subject');
  }
  function openTopic(topicId) {
    state.currentTopic = state.topics.find(topic => topic.id === topicId); if (!state.currentTopic) return;
    state.currentSubject = state.currentTopic.subject; $('#topicPath').textContent = `${state.currentTopic.subject} / ${state.currentTopic.module}`; $('#topicTitle').textContent = state.currentTopic.title;
    renderTopicCards(); navigate('topic');
  }
  function bindCardRows(container) {
    $$(`${container} [data-card]`).forEach(button => button.onclick = event => {
      const row = button.closest('.swipe-row');
      if (row && row.dataset.suppressClick === 'true') { event.preventDefault(); return; }
      openCard(button.dataset.card);
    });
    $$(`${container} [data-action]`).forEach(button => button.onclick = event => { event.stopPropagation(); manageCard(button.dataset.action, button.dataset.id); });
    $$(`${container} .swipe-row`).forEach(row => {
      let startX = 0, startY = 0;
      row.addEventListener('touchstart', e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
      row.addEventListener('touchend', e => {
        const delta = startX - e.changedTouches[0].clientX, vertical = startY - e.changedTouches[0].clientY;
        if (Math.abs(delta) <= 45 || Math.abs(delta) <= Math.abs(vertical) * 1.2) return;
        if (delta > 0) { $$(`${container} .swipe-row.swiped`).forEach(item => { if (item !== row) item.classList.remove('swiped'); }); row.classList.add('swiped'); }
        else row.classList.remove('swiped');
        row.dataset.suppressClick = 'true';
        setTimeout(() => { delete row.dataset.suppressClick; }, 450);
      });
      row.addEventListener('touchcancel', () => { startX = 0; startY = 0; }, { passive: true });
    });
  }
  function renderTopicCards() {
    let cards = state.cards.filter(card => card.topic_id === state.currentTopic.id);
    cards.sort(state.sortByMastery ? (a,b)=>masteryLevel(a)-masteryLevel(b)||a.order-b.order : (a,b)=>a.order-b.order);
    $('#topicCardCount').textContent = `${cards.length} 张卡`; $('#sortCardsButton').textContent = state.sortByMastery ? '最不熟悉优先' : '知识结构顺序'; $('#reviewTopicButton').disabled=!cards.length;
    $('#cardTitleList').innerHTML = cards.map(CardsRender.cardTitleRow).join('') || '<div class="empty-state">该专题还没有卡片</div>'; bindCardRows('#cardTitleList');
  }

  async function openCard(cardId, restoreScroll, options) {
    const card = state.cards.find(item => item.id === cardId); if (!card) return;
    state.currentCard = card; state.currentTopic = state.topics.find(topic => topic.id === card.topic_id) || state.currentTopic; state.currentSubject = card.subject;
    const sessionMode = options && options.session;
    state.reviewingSession = Boolean(sessionMode);
    const restored = options && options.restore;
    state.cardMode = restored && restored.mode ? restored.mode : sessionMode ? 'recall' : 'memorize';
    state.revealed = restored && typeof restored.revealed === 'boolean' ? restored.revealed : !sessionMode;
    state.hintLevel = restored ? Number(restored.hint_level || 0) : 0; state.cardStartedAt = Date.now();
    renderCard(); navigate('card'); startTimer(); state.cardStartedSeconds = state.timer ? state.timer.getSeconds() : 0; await saveResumePosition(restoreScroll || 0);
    requestAnimationFrame(() => window.scrollTo(0, restoreScroll || 0));
  }
  function renderCard() {
    $('#cardArticle').innerHTML = CardsRender.cardArticle(state.currentCard, state.currentTopic, { mode: state.cardMode, revealed: state.revealed, hintLevel: state.hintLevel });
    $$('.mode-switch button').forEach(button => button.classList.toggle('active', button.dataset.mode === state.cardMode));
    const recall = state.cardMode === 'recall'; $('#recallControls').hidden = !recall; $('#hintButton').hidden = state.revealed || state.hintLevel >= (state.currentCard.hints || []).length;
    $('#revealButton').hidden = state.revealed; $('#ratingPanel').hidden = !state.revealed;
    const recommendation=recall&&state.revealed?recommendedRating():null;
    $$('.rating-grid [data-rating]').forEach(button=>button.classList.toggle('recommended',button.dataset.rating===recommendation));
    $('#ratingRecommendation').textContent=recommendation?`根据提示使用情况，建议：${CardsScheduler.ratings[recommendation].label}（可手动修改）`:'';
    if (state.reviewingSession && state.session && state.session.status === 'active' && state.session.card_ids.includes(state.currentCard.id)) {
      const index = state.session.current_index + 1, total = state.session.card_ids.length;
      $('#reviewMeta').textContent = `${index} / ${total} · ${elapsedLabel(state.timer ? state.timer.getSeconds() : state.session.seconds)}`;
      $('#reviewProgress').hidden = false; $('#reviewProgress span').style.width = `${(index - 1) / total * 100}%`;
    } else { $('#reviewMeta').textContent = '自由浏览'; $('#reviewProgress').hidden = true; }
  }

  function startTimer() {
    if (!state.reviewingSession || !state.session || state.session.status !== 'active' || state.route !== 'card' || document.visibilityState !== 'visible' || state.timer) return;
    state.timer = new CardsTimer.ActivityTimer({ initialSeconds: state.session.seconds || 0, onTick: seconds => {
      state.session.seconds = Math.round(seconds); $('#reviewMeta').textContent = `${state.session.current_index + 1} / ${state.session.card_ids.length} · ${elapsedLabel(seconds)}`;
      if (Math.round(seconds) % 15 === 0) persistSession();
    }}); state.timer.start();
  }
  async function pauseTimer(options) {
    if (!state.timer) return;
    const timer = state.timer; state.timer = null;
    if (state.session) state.session.seconds = timer.stop();
    if (!options || options.persist !== false) await persistSession();
  }
  async function persistSession() {
    if (!state.session) return; state.session.updated_at = new Date().toISOString(); await CardsDB.put('sessions', state.session);
    await CardsDB.setSetting('active_review_session', state.session.status === 'active' ? state.session : null);
  }
  async function rateCurrent(rating) {
    const activeElapsed = state.timer ? state.timer.getSeconds() - state.cardStartedSeconds : 0;
    const elapsed = Math.max(10, state.reviewingSession ? activeElapsed : Math.round((Date.now() - state.cardStartedAt) / 1000));
    const baseRevision = Number(state.currentCard.revision && state.currentCard.revision.version || 0);
    const updated = CardsScheduler.rate(state.currentCard, rating, new Date(), elapsed);
    updated.revision.device_id = state.deviceId;
    await CardsDB.put('cards', updated);
    state.cards[state.cards.findIndex(card => card.id === updated.id)] = updated; state.currentCard = updated;
    const reviewEvent = { event_id: uid('review'), card_id: updated.id, subject: updated.subject, rating, elapsed_seconds: elapsed, reviewed_at: updated.schedule.last_reviewed_at, session_id: state.reviewingSession && state.session && state.session.status === 'active' ? state.session.id : null, next_due_at: updated.schedule.due_at };
    await CardsDB.put('review_events', reviewEvent);
    await CardsSync.enqueue('review_rated', updated.id, { card: updated, review_event: reviewEvent }, baseRevision);
    if (state.reviewingSession && state.session && state.session.status === 'active' && state.session.card_ids.includes(updated.id)) {
      if (!state.session.reviewed_card_ids.includes(updated.id)) state.session.reviewed_card_ids.push(updated.id);
      state.session.current_index += 1;
      if (state.session.current_index >= state.session.card_ids.length) {
        state.session.status = 'completed'; state.session.completed_at = new Date().toISOString(); state.session.current_card_state = null;
        await pauseTimer({ persist: false }); await persistSession();
        await CardsSync.enqueue('session_completed', state.session.id, { session: state.session });
        await CardsSync.enqueue('setting_changed', 'active_review_session', { setting: { id:'active_review_session', value:null, updated_at:new Date().toISOString() } });
        const completedSession=state.session;showToast(`本次完成 ${state.session.reviewed_card_ids.length} 张卡`); state.session = null; renderHome(); if(completedSession.kind==='topic'&&completedSession.topic_id)openTopic(completedSession.topic_id);else navigate('today'); return;
      }
      state.session.current_card_state = null; await persistSession();
      refreshDerivedViews(); return openCard(state.session.card_ids[state.session.current_index], 0, { session: true });
    }
    showToast(`已安排：${CardsScheduler.formatDue(updated.schedule.due_at)}`); await refreshDerivedViews(); renderCard();
  }

  async function saveResumePosition(scrollY) {
    if (!state.currentCard) return; setSaveState('正在保存…');
    state.resume = { route:'card', card_id:state.currentCard.id, topic_id:state.currentCard.topic_id, subject:state.currentCard.subject, scroll_y:Math.max(0,Math.round(scrollY||0)), mode:state.cardMode, revealed:state.revealed, hint_level:state.hintLevel };
    if (state.reviewingSession && state.session && state.session.status === 'active' && state.session.card_ids[state.session.current_index] === state.currentCard.id) {
      state.session.current_card_state = { card_id:state.currentCard.id, scroll_y:state.resume.scroll_y, mode:state.cardMode, revealed:state.revealed, hint_level:state.hintLevel };
    }
    await CardsDB.saveResume(state.resume); await persistSession();
    await CardsSync.enqueue('setting_changed', 'resume_position', { setting: await CardsDB.get('settings', 'resume_position') });
    if (state.session) await CardsSync.enqueue('setting_changed', 'active_review_session', { setting: await CardsDB.get('settings', 'active_review_session') });
    setSaveState('本地已保存');
  }

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase(); if (!normalized) { $('#searchResults').innerHTML = '<div class="empty-state">输入关键词开始搜索</div>'; return; }
    const results = state.cards.filter(card => {
      if (state.searchFilter !== 'all' && state.searchFilter !== 'weak' && card.subject !== state.searchFilter) return false;
      if (state.searchFilter === 'weak' && !['unrated','forgot','fuzzy'].includes(card.schedule && card.schedule.mastery)) return false;
      const topic = state.topics.find(item => item.id === card.topic_id);
      const outline = (card.outline||[]).flatMap(item=>[item.heading,item.text,...(item.children||[]).flatMap(child=>[child.heading,child.text])]);
      return [card.title,card.prompt,card.summary,card.exam_wording,...outline,...(card.examples||[]),...(card.tags||[]),topic&&topic.title].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
    $('#searchResults').innerHTML = results.map(CardsRender.cardTitleRow).join('') || '<div class="empty-state">没有匹配的知识卡</div>'; bindCardRows('#searchResults');
  }

  async function renderStats() {
    const events = await CardsDB.getAll('review_events'), sessions = await CardsDB.getAll('sessions');
    const ratingEvents = events.filter(e => e.rating);
    const today = localDateKey(), todayEvents = ratingEvents.filter(e => localDateKey(e.reviewed_at) === today), todaySessions = sessions.filter(s => localDateKey(s.started_at) === today);
    $('#statsTodayCards').textContent = todayEvents.length; $('#statsTodayTime').textContent = `${Math.round(todaySessions.reduce((sum,s)=>sum+Number(s.seconds||0),0)/60)} 分`;
    const dates = new Set(ratingEvents.map(e=>localDateKey(e.reviewed_at))); let streak = 0, cursor = new Date();
    while (dates.has(localDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
    $('#statsStreak').textContent = `${streak} 天`; $('#statsDue').textContent = state.cards.filter(card=>CardsScheduler.isDue(card)).length;
    const groups = ['unrated','forgot','fuzzy','familiar','mastered'].map(key=>({ key, label:CardsRender.masteryInfo(key).label, count:state.cards.filter(c=>(c.schedule&&c.schedule.mastery||'unrated')===key).length }));
    $('#masteryChart').innerHTML = groups.map(g=>`<div class="chart-row"><span>${g.label}</span><i><b style="width:${state.cards.length ? g.count/state.cards.length*100 : 0}%"></b></i><em>${g.count}</em></div>`).join('');
    $('#subjectStats').innerHTML=Object.keys(subjectLabels).map(subject=>{const count=todayEvents.filter(event=>event.subject===subject).length,seconds=todaySessions.filter(session=>session.subject===subject).reduce((sum,session)=>sum+Number(session.seconds||0),0);return`<div class="chart-row"><span>${subject==='politics'?'政治':subject}</span><i><b style="width:${todayEvents.length?count/todayEvents.length*100:0}%"></b></i><em>${count}张 · ${Math.round(seconds/60)}分</em></div>`;}).join('');
    const recentDays=Array.from({length:7},(_,index)=>{const date=new Date();date.setDate(date.getDate()-(6-index));const key=localDateKey(date),count=ratingEvents.filter(event=>localDateKey(event.reviewed_at)===key).length;return{key,count,label:`${date.getMonth()+1}/${date.getDate()}`};}),maxDay=Math.max(1,...recentDays.map(day=>day.count));
    $('#trendChart').innerHTML=recentDays.map(day=>`<div class="trend-day"><i><b style="height:${Math.max(3,day.count/maxDay*100)}%"></b></i><strong>${day.count}</strong><small>${day.label}</small></div>`).join('');
    const thirtyStart=new Date();thirtyStart.setHours(0,0,0,0);thirtyStart.setDate(thirtyStart.getDate()-29);const thirtyEvents=ratingEvents.filter(event=>new Date(event.reviewed_at)>=thirtyStart);$('#trend30Summary').textContent=`近 30 天 ${thirtyEvents.length} 张`;
    const topics=state.topics.slice().sort((a,b)=>String(a.subject).localeCompare(String(b.subject))||a.order-b.order);
    $('#topicMastery').innerHTML=topics.map(topic=>{const cards=state.cards.filter(card=>card.topic_id===topic.id),rated=cards.filter(card=>masteryLevel(card)>0),raw=cards.length?cards.reduce((sum,card)=>sum+masteryLevel(card),0)/(cards.length*4):0,percent=Math.round(raw*100);return`<div class="topic-mastery-row"><span><strong>${CardsRender.escapeHtml(topic.title)}</strong><small>${CardsRender.escapeHtml(topic.subject==='politics'?'政治':topic.subject)} · ${rated.length}/${cards.length} 已评估</small></span><em>${percent}%</em><i><b style="width:${percent}%"></b></i></div>`;}).join('')||'<div class="empty-state">暂无专题数据</div>';
  }

  function openEditor(card) {
    state.editorCard = card; const form = $('#cardEditorForm');
    ['title','prompt','summary','exam_wording'].forEach(name => form.elements[name].value = card[name] || '');
    form.elements.topic_id.innerHTML = state.topics.filter(t=>t.subject===card.subject).map(t=>`<option value="${CardsRender.escapeHtml(t.id)}">${CardsRender.escapeHtml(t.module)} · ${CardsRender.escapeHtml(t.title)}</option>`).join('');
    form.elements.topic_id.value = card.topic_id; $('#cardEditor').showModal();
  }
  async function manageCard(action, id) {
    const card = state.cards.find(c=>c.id===id); if (!card) return;
    if (action === 'edit' || action === 'move') return openEditor(card);
    if (action === 'delete') {
      const tombstone = { card_id:id, card, original_subject:card.subject, original_module:card.module, original_topic_id:card.topic_id, original_order:card.order, deleted_at:new Date().toISOString() };
      await CardsDB.put('tombstones', tombstone); await CardsDB.remove('cards', id); state.cards = state.cards.filter(c=>c.id!==id);
      await CardsDB.put('review_events', { event_id:uid('manage'), card_id:id, action:'deleted', original_subject:card.subject, original_topic_id:card.topic_id, original_order:card.order, reviewed_at:new Date().toISOString() });
      await CardsSync.enqueue('card_deleted', id, { tombstone }, Number(card.revision && card.revision.version || 0));
      if (state.session && state.session.status === 'active') {
        const queueIndex = state.session.card_ids.indexOf(id);
        if (queueIndex >= 0) {
          state.session.card_ids.splice(queueIndex, 1);
          if (queueIndex < state.session.current_index) state.session.current_index -= 1;
          if (state.session.current_card_state && state.session.current_card_state.card_id === id) state.session.current_card_state = null;
          if (!state.session.card_ids.length) { state.session.status = 'completed'; state.session.completed_at = new Date().toISOString(); }
          await persistSession();
        }
      }
      await refreshDerivedViews(); showToast('已移入回收站');
    }
  }
  async function renderTrash() {
    const items = await CardsDB.getAll('tombstones');
    $('#trashList').innerHTML = items.map(item=>`<article><span><strong>${CardsRender.escapeHtml(item.card.title)}</strong><small>${CardsRender.escapeHtml(item.card.subject)} · ${new Date(item.deleted_at).toLocaleDateString()}</small></span><button class="secondary-button" data-restore="${CardsRender.escapeHtml(item.card_id)}">恢复</button></article>`).join('') || '<div class="empty-state">回收站是空的</div>';
    $$('[data-restore]').forEach(button => button.onclick = async () => { const item = await CardsDB.get('tombstones',button.dataset.restore); if (!item) return; const restored={...item.card,subject:item.original_subject||item.card.subject,module:item.original_module||item.card.module,topic_id:item.original_topic_id||item.card.topic_id,order:Number.isFinite(item.original_order)?item.original_order:item.card.order,revision:{...(item.card.revision||{}),version:Number(item.card.revision&&item.card.revision.version||0)+1,updated_at:new Date().toISOString(),device_id:state.deviceId}}; await CardsDB.put('cards',restored); await CardsDB.remove('tombstones',item.card_id); state.cards.push(restored); await CardsDB.put('review_events',{event_id:uid('manage'),card_id:item.card_id,action:'restored',subject:restored.subject,topic_id:restored.topic_id,order:restored.order,reviewed_at:new Date().toISOString()}); await CardsSync.enqueue('card_restored', item.card_id, { card:restored }, Number(item.card.revision&&item.card.revision.version||0)); await renderTrash(); await refreshDerivedViews(); showToast('已恢复到原位置'); });
  }

  function downloadJson(snapshot) { const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), link=document.createElement('a'); link.href=url; link.download=`cards-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  async function renderSyncStatus() {
    const status = await CardsSync.status();
    if (status.url && !$('#syncUrl').value) $('#syncUrl').value = status.url;
    const parts = [];
    if (!status.configured) parts.push('尚未配置');
    else if (status.last_error) parts.push('上次同步失败');
    else if (status.last_synced_at) parts.push(`上次同步 ${new Date(status.last_synced_at).toLocaleString()}`);
    else parts.push('已配置，尚未同步');
    if (status.pending) parts.push(`${status.pending} 条待上传`);
    if (status.conflicts) parts.push(`${status.conflicts} 个冲突待处理`);
    $('#syncStatus').textContent = parts.join(' · ');
    $('#syncStatusDot').classList.toggle('error', Boolean(status.last_error || status.conflicts));
    $('#syncStatusDot').classList.toggle('ready', Boolean(status.configured && !status.last_error && !status.conflicts));
  }
  async function runSync(showResult) {
    if (state.syncing) return;
    state.syncing = true; $('#syncNowButton').disabled = true; $('#syncStatus').textContent = '正在同步…';
    try {
      const result = await CardsSync.syncNow();
      if (showResult) showToast(result.conflicts ? `同步完成，保留 ${result.conflicts} 个冲突` : '同步完成');
    } catch (error) {
      await CardsSync.recordError(error);
      if (showResult) showToast(error.message || '同步失败，稍后可重试');
    } finally {
      state.syncing = false; $('#syncNowButton').disabled = false; await renderSyncStatus();
    }
  }
  function bindEvents() {
    $$('[data-route]').forEach(button => button.onclick = () => navigate(button.dataset.route));
    $('#resumeButton').onclick = () => state.session && state.session.status==='active' ? startDailyReview(state.session.subject) : navigate('today');
    $('#backToSubject').onclick = () => openSubject(state.currentSubject);
    $('#backFromCard').onclick = async () => { await saveResumePosition(window.scrollY); if (state.reviewingSession && state.session && state.session.status==='active') { if(state.session.kind==='topic'&&state.session.topic_id)openTopic(state.session.topic_id);else navigate('today'); } else if (state.currentTopic) openTopic(state.currentTopic.id); else openSubject(state.currentSubject); };
    $('#sortCardsButton').onclick = () => { state.sortByMastery=!state.sortByMastery; renderTopicCards(); };
    $('#reviewTopicButton').onclick = startTopicReview;
    $$('.mode-switch button').forEach(button => button.onclick = () => { state.cardMode=button.dataset.mode; state.revealed=state.cardMode==='memorize'; state.hintLevel=0; renderCard(); saveResumePosition(window.scrollY); });
    $('#hintButton').onclick = () => { state.hintLevel=Math.min((state.currentCard.hints||[]).length,state.hintLevel+1); renderCard(); saveResumePosition(window.scrollY); };
    $('#revealButton').onclick = () => { state.revealed=true; renderCard(); saveResumePosition(window.scrollY); };
    $$('.rating-grid [data-rating]').forEach(button => button.onclick = () => rateCurrent(button.dataset.rating));
    $('#searchInput').oninput = event => renderSearch(event.target.value);
    $$('#searchFilters button').forEach(button => button.onclick = () => { state.searchFilter=button.dataset.filter; $$('#searchFilters button').forEach(b=>b.classList.toggle('active',b===button)); renderSearch($('#searchInput').value); });
    $('#trashButton').onclick = () => navigate('trash');
    $('#cardEditorForm').addEventListener('submit', async event => { event.preventDefault(); if (!state.editorCard) return; const data=new FormData(event.currentTarget), topic=state.topics.find(item=>item.id===data.get('topic_id')), action=state.editorCard.topic_id===data.get('topic_id')?'edited':'moved', eventType=action==='moved'?'card_moved':'card_updated', baseRevision=Number(state.editorCard.revision&&state.editorCard.revision.version||0), updated={...state.editorCard,title:data.get('title'),prompt:data.get('prompt'),summary:data.get('summary'),exam_wording:data.get('exam_wording'),topic_id:data.get('topic_id'),module:topic?topic.module:state.editorCard.module,revision:{...(state.editorCard.revision||{}),version:baseRevision+1,updated_at:new Date().toISOString(),device_id:state.deviceId}}; await CardsDB.put('cards',updated); state.cards[state.cards.findIndex(c=>c.id===updated.id)]=updated; if(state.currentCard&&state.currentCard.id===updated.id)state.currentCard=updated; await CardsDB.put('review_events',{event_id:uid('manage'),card_id:updated.id,action,subject:updated.subject,topic_id:updated.topic_id,reviewed_at:new Date().toISOString()}); await CardsSync.enqueue(eventType, updated.id, {card:updated,topic}, baseRevision); state.editorCard=null; $('#cardEditor').close(); await refreshDerivedViews(); showToast('知识卡已保存'); });
    const closeEditor=()=>{state.editorCard=null;$('#cardEditor').close();}; $('#closeCardEditor').onclick=closeEditor; $('#cancelCardEditor').onclick=closeEditor;
    const toggleTheme=()=>setTheme(document.body.classList.contains('dark')?'light':'dark',true); $('#themeButton').onclick=toggleTheme; $('#themeToggle').onclick=toggleTheme;
    $('#exportButton').onclick=async()=>{downloadJson(await CardsDB.exportSnapshot());showToast('本地数据已导出');}; $('#importButton').onclick=()=>$('#importFile').click();
    $('#importFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{await CardsDB.importSnapshot(JSON.parse(await file.text()));await loadState();showToast('导入完成，导入前备份已保留');navigate('home');}catch(error){showToast(error.message||'导入失败');}finally{event.target.value='';}};
  $('#saveSyncButton').onclick=async()=>{try{await CardsSync.configure($('#syncUrl').value.trim(),$('#syncKey').value);$('#syncKey').value='';await renderSyncStatus();showToast('同步配置已保存');}catch(error){showToast(error.message||'配置无效');}};
  $('#syncNowButton').onclick=()=>runSync(true);
  $('#copySyncPairButton').onclick=async()=>{try{if(!state.pairingTransfer)throw new Error('请重新扫描一次本机配对二维码');await navigator.clipboard.writeText(state.pairingTransfer);showToast('配对信息已复制，请打开主屏幕 Cards 导入');}catch(error){showToast(error.message||'复制失败，请检查剪贴板权限');}};
  $('#pasteSyncPairButton').onclick=async()=>{try{const value=(await navigator.clipboard.readText()).trim(),encoded=value.startsWith('cards-pair:')?value.slice(11):new URLSearchParams(value.replace(/^#/, '')).get('pair');if(!encoded)throw new Error('剪贴板中没有 Cards 配对信息');const pairing=decodePairing(encoded);await CardsSync.configure(pairing.url,pairing.key);$('#syncUrl').value=pairing.url;$('#syncKey').value='';try{await navigator.clipboard.writeText('');}catch(error){}await renderSyncStatus();showToast('主屏幕 Cards 已完成配对');runSync(false);}catch(error){showToast(error.message||'导入配对失败');}};
  $('#restoreSyncButton').onclick=async()=>{if(!window.confirm('恢复前会自动保留本地备份。确定使用同步快照替换当前卡片、专题和回收站吗？'))return;try{const result=await CardsSync.restoreSnapshot();await loadState();showToast(`已从快照恢复 ${result.cards} 张卡`);}catch(error){await CardsSync.recordError(error);showToast(error.message||'快照恢复失败');}finally{await renderSyncStatus();}};
    window.addEventListener('cards-sync-status',renderSyncStatus);
    window.addEventListener('cards-sync-applied',async()=>{await loadState();await setTheme(await CardsDB.getSetting('theme',document.body.classList.contains('dark')?'dark':'light'),false);await renderSyncStatus();});
    window.addEventListener('online',()=>runSync(false));
    window.addEventListener('scroll',()=>{if(state.route!=='card'||!state.currentCard)return;clearTimeout(state.scrollSaveTimer);state.scrollSaveTimer=setTimeout(()=>saveResumePosition(window.scrollY),450);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(state.route==='card')saveResumePosition(window.scrollY);pauseTimer();}else{if(state.route==='card')startTimer();refreshOnForeground();}});
    window.addEventListener('pageshow',refreshOnForeground);
    window.addEventListener('focus',refreshOnForeground);
  }
  async function loadState() { state.cards=await CardsDB.getAll('cards'); state.topics=await CardsDB.getAll('topics'); state.resume=await CardsDB.getSetting('resume_position',null); state.session=await CardsDB.getSetting('active_review_session',null); renderHome(); }
  async function refreshOnForeground(){
    if(document.visibilityState!=='visible')return;
    const now=Date.now();if(now-state.lastForegroundRefreshAt<500)return;state.lastForegroundRefreshAt=now;
    try{
      await loadState();
      if(state.currentTopic)state.currentTopic=state.topics.find(topic=>topic.id===state.currentTopic.id)||state.currentTopic;
      if(state.currentCard){const latest=state.cards.find(card=>card.id===state.currentCard.id);if(latest){state.currentCard=latest;if(state.route==='card')renderCard();}}
      await refreshDerivedViews();
      const status=await CardsSync.status();
      if(status.configured&&navigator.onLine)runSync(false);
    }catch(error){console.error('Cards foreground refresh failed',error);}
  }
  function decodePairing(encoded){const normalized=encoded.replace(/-/g,'+').replace(/_/g,'/'),padding='='.repeat((4-normalized.length%4)%4),bytes=Uint8Array.from(atob(normalized+padding),char=>char.charCodeAt(0)),pairing=JSON.parse(new TextDecoder().decode(bytes));if(!pairing||typeof pairing.url!=='string'||typeof pairing.key!=='string')throw new Error('配对信息不完整');return pairing;}
  async function consumePairingLink(){
    const encoded=new URLSearchParams(location.hash.replace(/^#/, '')).get('pair');if(!encoded)return false;
    try{const pairing=decodePairing(encoded);await CardsSync.configure(pairing.url,pairing.key);state.pairingTransfer=`cards-pair:${encoded}`;history.replaceState(null,'',`${location.pathname}${location.search}`);return true;}
    catch(error){history.replaceState(null,'',`${location.pathname}${location.search}`);throw new Error(`同步配对失败：${error.message||error}`);}
  }
  async function registerServiceWorker(){if(!('serviceWorker'in navigator)||location.protocol==='file:'){$('#offlineStatus').textContent=location.protocol==='file:'?'请通过本地服务器验证离线缓存':'当前浏览器不支持';return;}try{await navigator.serviceWorker.register('./service-worker.js');$('#offlineStatus').textContent='应用壳已注册，可离线启动';}catch(error){$('#offlineStatus').textContent='注册失败，请检查控制台';}}
  async function init(){try{await CardsDB.open();await CardsDB.seedIfEmpty(CardsSeed);const paired=await consumePairingLink();state.deviceId=(await CardsSync.status()).device_id;await setTheme(localStorage.getItem('cards-theme')||await CardsDB.getSetting('theme','light'),false);await loadState();bindEvents();await renderSyncStatus();await registerServiceWorker();setSaveState('本地已保存');if(paired)showToast('同步设备已安全配对');if((await CardsSync.status()).configured&&navigator.onLine)runSync(false);}catch(error){console.error(error);setSaveState('载入失败');showToast(error.message||'Cards 初始化失败');}}
  document.addEventListener('DOMContentLoaded',init);
})();
