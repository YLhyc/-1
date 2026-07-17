(function () {
  'use strict';

  const subjectLabels = {
    '706': ['中国古代文学与古代汉语', '古代文学 · 古代汉语'],
    '807': ['现当代文学与评论写作', '现当代文学 · 评论写作'],
    politics: ['思想政治理论', '马原 · 毛中特 · 史纲 · 思修']
  };
  const syncRetryIntervalMs = Number(window.CARDS_SYNC_RETRY_INTERVAL_MS || 15000);
  const state = {
    cards: [], topics: [], currentSubject: '706', currentTopic: null, currentCard: null,
    route: 'home', sortByMastery: false, resume: null, scrollSaveTimer: null,
    cardMode: 'memorize', revealed: true, hintLevel: 0, searchSubjectFilter: 'all', searchMasteryFilter: 'all',
    session: null, pausedSessions: {}, reviewDurationMinutes: 10, reviewingSession: false, timer: null,
    cardStartedAt: 0, cardStartedSeconds: 0, freeElapsed: 0, editorCard: null,
    deviceId: null, syncing: false, ratingInProgress: false, syncRetryTimer: null, lastForegroundRefreshAt: 0, pairingTransfer: null, activeConflict: null
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
  function averageLevel(cards) { return cards.length ? Math.round(cards.reduce((sum, card) => sum + masteryLevel(card), 0) / cards.length) : 0; }
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
    const primaryRoute = ['home','today','subject','topic','card'].includes(route) ? 'home' : route === 'trash' ? 'settings' : route;
    $$('.bottom-nav button').forEach(button => {
      const active = button.dataset.route === primaryRoute;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('#mainContent').scrollTo(0, 0);
    if (route === 'home') renderHome();
    if (route === 'today') renderToday();
    if (route === 'stats') renderStats();
    if (route === 'trash') renderTrash();
    if (route === 'settings') renderSnapshotHistory(false);
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
    $$('#reviewDurationPicker [data-review-minutes]').forEach(button => {
      const active = Number(button.dataset.reviewMinutes) === state.reviewDurationMinutes;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    $('#todaySubjectList').innerHTML = Object.keys(subjectLabels).map(subject => {
      const queue = CardsScheduler.buildQueue(state.cards, subject, reviewQueueOptions());
      const active = activeSubject === subject;
      const paused = Boolean(state.pausedSessions[sessionKey({ subject })]);
      const minutes = queue.ids.length ? Math.max(1, Math.round(queue.estimated_seconds / 60)) : 0;
      const status = active ? '正在进行 · 点击继续' : paused ? '已暂停 · 点击继续' : `${queue.due_count} 张待复习 · 本次约 ${minutes} 分钟`;
      return `<button class="today-subject ${active || paused ? 'active-session' : ''}" data-today-subject="${subject}"><span><strong>${subjectLabels[subject][0]}</strong><small>${status}</small></span><em>${active || paused ? '继续' : '开始'}</em></button>`;
    }).join('');
    $$('[data-today-subject]').forEach(button => button.onclick = () => startDailyReview(button.dataset.todaySubject));
  }

  function sessionKey(session) { return session && session.kind === 'topic' ? `topic:${session.topic_id}` : `daily:${session && session.subject}`; }
  function reviewQueueOptions() {
    const targetSeconds = state.reviewDurationMinutes * 60;
    return { targetSeconds, hardLimitSeconds: state.reviewDurationMinutes >= 45 ? 3600 : Math.max(targetSeconds, 420) };
  }
  async function persistPausedSessions() {
    const setting = await CardsDB.setSetting('paused_review_sessions', state.pausedSessions);
    await CardsSync.enqueue('setting_changed', 'paused_review_sessions', { setting });
  }
  async function pauseActiveSession() {
    if (!state.session || state.session.status !== 'active') return null;
    await pauseTimer({ persist: false });
    const paused = { ...state.session, status: 'paused', updated_at: new Date().toISOString() };
    await CardsDB.put('sessions', paused);
    state.pausedSessions[sessionKey(paused)] = paused;
    state.session = null; state.reviewingSession = false;
    const activeSetting = await CardsDB.setSetting('active_review_session', null);
    await CardsSync.enqueue('setting_changed', 'active_review_session', { setting: activeSetting });
    await persistPausedSessions();
    return paused;
  }
  async function activatePausedSession(key) {
    const paused = state.pausedSessions[key]; if (!paused) return null;
    delete state.pausedSessions[key];
    state.session = { ...paused, status: 'active', updated_at: new Date().toISOString() };
    await CardsDB.put('sessions', state.session);
    const activeSetting = await CardsDB.setSetting('active_review_session', state.session);
    await CardsSync.enqueue('setting_changed', 'active_review_session', { setting: activeSetting });
    await persistPausedSessions();
    return state.session;
  }
  function resumeActiveSession() {
    if(!state.session||state.session.status!=='active'||!state.session.card_ids.length)return navigate('today');
    const index=Math.min(state.session.current_index||0,state.session.card_ids.length-1),saved=state.session.current_card_state;
    const restore=saved&&saved.card_id===state.session.card_ids[index]?saved:null;
    return openCard(state.session.card_ids[index],restore?restore.scroll_y:0,{session:true,restore});
  }

  async function startDailyReview(subject) {
    if (state.session && state.session.status === 'active' && (state.session.subject !== subject || state.session.kind === 'topic')) {
      await pauseActiveSession(); showToast('已暂停上一科，可稍后继续');
    }
    if (state.session && state.session.status === 'active' && state.session.subject === subject && state.session.card_ids.length) return resumeActiveSession();
    const paused = await activatePausedSession(sessionKey({ subject }));
    if (paused && paused.card_ids.length) {
      const index = Math.min(paused.current_index || 0, paused.card_ids.length - 1), saved = paused.current_card_state;
      const restore = saved && saved.card_id === paused.card_ids[index] ? saved : null;
      return openCard(paused.card_ids[index], restore ? restore.scroll_y : 0, { session: true, restore });
    }
    const queue = CardsScheduler.buildQueue(state.cards, subject, reviewQueueOptions());
    if (!queue.ids.length) { showToast('这个科目目前没有到期卡片'); return; }
    const now = new Date().toISOString();
    state.session = { id: uid('session'), subject, card_ids: queue.ids, current_index: 0, reviewed_card_ids: [], seconds: 0, started_at: now, updated_at: now, status: 'active', estimated_seconds: queue.estimated_seconds, target_minutes: state.reviewDurationMinutes };
    await CardsDB.put('sessions', state.session); await CardsDB.setSetting('active_review_session', state.session);
    openCard(queue.ids[0], 0, { session: true });
  }

  async function startTopicReview() {
    const topic=state.currentTopic;if(!topic)return;
    if(state.session&&state.session.status==='active'){
      if(state.session.kind==='topic'&&state.session.topic_id===topic.id){const index=Math.min(state.session.current_index||0,state.session.card_ids.length-1),saved=state.session.current_card_state,restore=saved&&saved.card_id===state.session.card_ids[index]?saved:null;return openCard(state.session.card_ids[index],restore?restore.scroll_y:0,{session:true,restore});}
      await pauseActiveSession();showToast('已暂停上一组复习，可稍后继续');
    }
    const paused=await activatePausedSession(sessionKey({kind:'topic',topic_id:topic.id}));if(paused&&paused.card_ids.length){const index=Math.min(paused.current_index||0,paused.card_ids.length-1),saved=paused.current_card_state,restore=saved&&saved.card_id===paused.card_ids[index]?saved:null;return openCard(paused.card_ids[index],restore?restore.scroll_y:0,{session:true,restore});}
    const queue=CardsScheduler.buildTopicQueue(state.cards,topic.id,reviewQueueOptions());if(!queue.ids.length){showToast('这个专题还没有可复习卡片');return;}
    const now=new Date().toISOString();state.session={id:uid('session'),kind:'topic',topic_id:topic.id,subject:topic.subject,card_ids:queue.ids,current_index:0,reviewed_card_ids:[],seconds:0,started_at:now,updated_at:now,status:'active',estimated_seconds:queue.estimated_seconds,target_minutes:state.reviewDurationMinutes};
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
    state.currentSubject = state.currentTopic.subject; $('#topicPath').textContent = `${state.currentTopic.subject} / ${state.currentTopic.module}`; $('#topicTitle').textContent = state.currentTopic.title; $('#topicParentLabel').textContent = `${state.currentTopic.module}专题`; $('#topicParentMeta').textContent = state.currentTopic.subject === 'politics' ? 'POLITICS' : state.currentTopic.subject;
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
      let startX = 0, startY = 0, edgeReserved = false;
      row.addEventListener('touchstart', e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; edgeReserved = startX <= 28 || startX >= window.innerWidth - 28; }, { passive: true });
      row.addEventListener('touchend', e => {
        if (edgeReserved) { edgeReserved = false; return; }
        const delta = startX - e.changedTouches[0].clientX, vertical = startY - e.changedTouches[0].clientY;
        if (Math.abs(delta) <= 45 || Math.abs(delta) <= Math.abs(vertical) * 1.2) return;
        if (delta > 0) { $$(`${container} .swipe-row.swiped`).forEach(item => { if (item !== row) item.classList.remove('swiped'); }); row.classList.add('swiped'); }
        else row.classList.remove('swiped');
        row.dataset.suppressClick = 'true';
        setTimeout(() => { delete row.dataset.suppressClick; }, 450);
      });
      row.addEventListener('touchcancel', () => { startX = 0; startY = 0; edgeReserved = false; }, { passive: true });
    });
  }
  function renderTopicCards() {
    let cards = state.cards.filter(card => card.topic_id === state.currentTopic.id);
    cards.sort(state.sortByMastery ? (a,b)=>masteryLevel(a)-masteryLevel(b)||a.order-b.order : (a,b)=>a.order-b.order);
    $('#topicCardCount').textContent = `${cards.length} 张卡`; $('#sortCardsButton').textContent = state.sortByMastery ? '最不熟悉优先' : '知识结构顺序'; $('#sortCardsButton').setAttribute('aria-pressed', state.sortByMastery ? 'true' : 'false'); $('#reviewTopicButton').disabled=!cards.length;
    $('#cardTitleList').innerHTML = cards.map(CardsRender.cardTitleRow).join('') || '<div class="empty-state">该专题还没有卡片</div>'; bindCardRows('#cardTitleList');
  }

  async function openCard(cardId, restoreScroll, options) {
    const card = state.cards.find(item => item.id === cardId); if (!card) return;
    state.currentCard = card; state.currentTopic = state.topics.find(topic => topic.id === card.topic_id) || state.currentTopic; state.currentSubject = card.subject;
    const sessionMode = options && options.session;
    state.reviewingSession = Boolean(sessionMode);
    const dailySession = state.reviewingSession && state.session && state.session.kind !== 'topic';
    $('#cardParentLabel').textContent = dailySession ? '今日复习' : state.currentTopic ? state.currentTopic.title : '专题卡片';
    $('#cardParentMeta').textContent = dailySession ? 'TODAY' : card.subject === 'politics' ? 'POLITICS' : card.subject;
    const restored = options && options.restore;
    state.cardMode = restored && restored.mode ? restored.mode : sessionMode ? 'recall' : 'memorize';
    state.revealed = restored && typeof restored.revealed === 'boolean' ? restored.revealed : !sessionMode;
    state.hintLevel = restored ? Number(restored.hint_level || 0) : 0; state.cardStartedAt = Date.now(); state.freeElapsed = 0;
    renderCard(); navigate('card'); if (options && options.animateEntry) playCardEnter(); startTimer(); state.cardStartedSeconds = state.timer ? state.timer.getSeconds() : 0; await saveResumePosition(restoreScroll || 0);
    requestAnimationFrame(() => $('#mainContent').scrollTo(0, restoreScroll || 0));
  }
  function renderCard() {
    $('#cardArticle').innerHTML = CardsRender.cardArticle(state.currentCard, state.currentTopic, { mode: state.cardMode, revealed: state.revealed, hintLevel: state.hintLevel });
    $$('.mode-switch button').forEach(button => { const active=button.dataset.mode===state.cardMode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false'); });
    const recall = state.cardMode === 'recall'; $('#recallControls').hidden = !recall; $('#hintButton').hidden = state.revealed || state.hintLevel >= (state.currentCard.hints || []).length;
    $('#revealButton').hidden = state.revealed; $('#ratingPanel').hidden = !state.revealed;
    const recommendation=recall&&state.revealed?recommendedRating():null;
    $$('.rating-grid [data-rating]').forEach(button=>{button.classList.toggle('recommended',button.dataset.rating===recommendation);button.disabled=state.ratingInProgress;});
    $('#ratingRecommendation').textContent=recommendation?`根据提示使用情况，建议：${CardsScheduler.ratings[recommendation].label}（可手动修改）`:'';
    $('#pauseSessionButton').hidden = !(state.reviewingSession && state.session && state.session.status === 'active');
    if (state.reviewingSession && state.session && state.session.status === 'active' && state.session.card_ids.includes(state.currentCard.id)) {
      const index = state.session.current_index + 1, total = state.session.card_ids.length;
      $('#reviewMeta').textContent = `${index} / ${total} · ${elapsedLabel(state.timer ? state.timer.getSeconds() : state.session.seconds)}`;
      $('#reviewProgress').hidden = false; $('#reviewProgress span').style.width = `${(index - 1) / total * 100}%`;
    } else { $('#reviewMeta').textContent = '自由浏览'; $('#reviewProgress').hidden = true; }
  }

  function reducedMotionPreferred() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  async function playCardExit() {
    const article = $('#cardArticle');
    if (!article || reducedMotionPreferred()) return;
    article.classList.remove('card-entering');
    article.classList.add('card-leaving');
    const animation = article.getAnimations().find(item => item.animationName === 'card-leave');
    if (animation) await animation.finished.catch(() => {});
    article.classList.remove('card-leaving');
  }
  function playCardEnter() {
    const article = $('#cardArticle');
    if (!article || reducedMotionPreferred()) return;
    article.classList.remove('card-entering');
    requestAnimationFrame(() => {
      article.classList.add('card-entering');
      const animation = article.getAnimations().find(item => item.animationName === 'card-enter');
      if (animation) animation.finished.catch(() => {}).finally(() => article.classList.remove('card-entering'));
    });
  }

  function startTimer() {
    if (!state.currentCard || state.route !== 'card' || document.visibilityState !== 'visible' || state.timer) return;
    const sessionActive = state.reviewingSession && state.session && state.session.status === 'active';
    const initialSeconds = sessionActive ? state.session.seconds || 0 : state.freeElapsed || 0;
    state.timer = new CardsTimer.ActivityTimer({ initialSeconds, onTick: seconds => {
      if (sessionActive) {
        state.session.seconds = Math.round(seconds); $('#reviewMeta').textContent = `${state.session.current_index + 1} / ${state.session.card_ids.length} · ${elapsedLabel(seconds)}`;
        if (Math.round(seconds) % 15 === 0) persistSession();
      } else state.freeElapsed = Math.round(seconds);
    }}); state.timer.start();
  }
  async function pauseTimer(options) {
    if (!state.timer) return;
    const timer = state.timer; state.timer = null;
    const seconds = timer.stop();
    if (state.reviewingSession && state.session) state.session.seconds = seconds; else state.freeElapsed = seconds;
    if (state.reviewingSession && (!options || options.persist !== false)) await persistSession();
  }
  async function persistSession() {
    if (!state.session) return; state.session.updated_at = new Date().toISOString(); await CardsDB.put('sessions', state.session);
    await CardsDB.setSetting('active_review_session', state.session.status === 'active' ? state.session : null);
  }
  async function rateCurrent(rating) {
    if (state.ratingInProgress || !state.currentCard) return;
    state.ratingInProgress = true;
    $$('.rating-grid [data-rating]').forEach(button => { button.disabled = true; });
    const committingButton = $(`.rating-grid [data-rating="${rating}"]`);
    if (committingButton) committingButton.classList.add('committing');
    try {
      await pauseTimer();
      const activeElapsed = state.reviewingSession && state.session ? state.session.seconds - state.cardStartedSeconds : state.freeElapsed;
      const elapsed = Math.max(10, Math.round(activeElapsed));
      const baseRevision = Number(state.currentCard.revision && state.currentCard.revision.version || 0);
      const updated = CardsScheduler.rate(state.currentCard, rating, new Date(), elapsed);
      updated.revision.device_id = state.deviceId;
      await CardsDB.put('cards', updated);
      state.cards[state.cards.findIndex(card => card.id === updated.id)] = updated; state.currentCard = updated;
      const reviewEvent = { event_id: uid('review'), card_id: updated.id, subject: updated.subject, rating, elapsed_seconds: elapsed, reviewed_at: updated.schedule.last_reviewed_at, session_id: state.reviewingSession && state.session && state.session.status === 'active' ? state.session.id : null, next_due_at: updated.schedule.due_at };
      await CardsDB.put('review_events', reviewEvent);
      await CardsSync.enqueue('review_rated', updated.id, { card: updated, review_event: reviewEvent }, baseRevision);
      if (!state.reviewingSession) {
        const now = new Date().toISOString();
        const freeSession = { id:uid('session'), kind:'free', subject:updated.subject, card_ids:[updated.id], current_index:1, reviewed_card_ids:[updated.id], seconds:elapsed, started_at:new Date(state.cardStartedAt).toISOString(), updated_at:now, completed_at:now, status:'completed' };
        await CardsDB.put('sessions', freeSession); await CardsSync.enqueue('session_completed', freeSession.id, { session:freeSession });
      }
      if (state.reviewingSession && state.session && state.session.status === 'active' && state.session.card_ids.includes(updated.id)) {
        if (!state.session.reviewed_card_ids.includes(updated.id)) state.session.reviewed_card_ids.push(updated.id);
        state.session.current_index += 1;
        if (state.session.current_index >= state.session.card_ids.length) {
          state.session.status = 'completed'; state.session.completed_at = new Date().toISOString(); state.session.current_card_state = null;
          await pauseTimer({ persist: false }); await persistSession();
          await CardsSync.enqueue('session_completed', state.session.id, { session: state.session });
          await CardsSync.enqueue('setting_changed', 'active_review_session', { setting: { id:'active_review_session', value:null, updated_at:new Date().toISOString() } });
          const completedSession=state.session;showToast(`本次完成 ${state.session.reviewed_card_ids.length} 张卡`);await playCardExit();state.session = null; renderHome(); if(completedSession.kind==='topic'&&completedSession.topic_id)openTopic(completedSession.topic_id);else navigate('today'); return;
        }
        state.session.current_card_state = null; await persistSession();
        await playCardExit();refreshDerivedViews();return openCard(state.session.card_ids[state.session.current_index],0,{session:true,animateEntry:true});
      }
      showToast(`已安排：${CardsScheduler.formatDue(updated.schedule.due_at)}`); state.freeElapsed=0;state.cardStartedAt=Date.now();await refreshDerivedViews(); renderCard(); startTimer();
    } finally {
      state.ratingInProgress = false;
      $$('.rating-grid [data-rating]').forEach(button => { button.disabled = false; button.classList.remove('committing'); });
    }
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
  async function returnFromCard(){await saveResumePosition($('#mainContent').scrollTop);if(state.reviewingSession&&state.session&&state.session.status==='active'){if(state.session.kind==='topic'&&state.session.topic_id)openTopic(state.session.topic_id);else navigate('today');}else if(state.currentTopic)openTopic(state.currentTopic.id);else openSubject(state.currentSubject);}
  async function pauseCurrentSessionAndExit(){
    if(!state.session||state.session.status!=='active')return;
    const paused=await pauseActiveSession();showToast('本次进度已暂停');renderHome();
    if(paused&&paused.kind==='topic'&&paused.topic_id)openTopic(paused.topic_id);else navigate('today');
  }
  function canEdgeBack(){return ['today','subject','topic','card','trash'].includes(state.route);}
  async function edgeBack(){if(state.route==='card')return returnFromCard();if(state.route==='topic')return openSubject(state.currentSubject);if(state.route==='subject'||state.route==='today')return navigate('home');if(state.route==='trash')return navigate('settings');}

  function renderSearch(query) {
    const normalized = query.trim().toLowerCase(); if (!normalized) { $('#searchResults').innerHTML = '<div class="empty-state">输入关键词开始搜索</div>'; return; }
    const results = state.cards.filter(card => {
      if (state.searchSubjectFilter !== 'all' && card.subject !== state.searchSubjectFilter) return false;
      const mastery = card.schedule && card.schedule.mastery || 'unrated';
      if (state.searchMasteryFilter === 'weak' && !['unrated','forgot','fuzzy'].includes(mastery)) return false;
      if (state.searchMasteryFilter === 'strong' && !['familiar','mastered'].includes(mastery)) return false;
      const topic = state.topics.find(item => item.id === card.topic_id);
      const outline = (card.outline||[]).flatMap(item=>[item.heading,item.text,...(item.children||[]).flatMap(child=>[child.heading,child.text])]);
      return [card.title,card.prompt,card.summary,card.exam_wording,...outline,...(card.examples||[]),...(card.tags||[]),topic&&topic.title].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    });
    $('#searchResults').innerHTML = results.map(CardsRender.cardTitleRow).join('') || '<div class="empty-state">没有匹配的知识卡</div>'; bindCardRows('#searchResults');
  }

  async function renderStats() {
    const events = await CardsDB.getAll('review_events'), sessions = await CardsDB.getAll('sessions');
    const ratingEvents = events.filter(e => e.rating);
    const today = localDateKey(), todayEvents = ratingEvents.filter(e => localDateKey(e.reviewed_at) === today), todaySessions = sessions.filter(s => localDateKey(s.completed_at||s.updated_at||s.started_at) === today);
    const todayUniqueCards = new Set(todayEvents.map(event=>event.card_id)).size;
    $('#statsTodayCards').textContent = todayUniqueCards; $('#statsTodayTime').textContent = `${Math.round(todaySessions.reduce((sum,s)=>sum+Number(s.seconds||0),0)/60)} 分`;
    const dates = new Set(ratingEvents.map(e=>localDateKey(e.reviewed_at))); let streak = 0, cursor = new Date();
    if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate()-1);
    while (dates.has(localDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
    $('#statsStreak').textContent = `${streak} 天`; $('#statsDue').textContent = state.cards.filter(card=>CardsScheduler.isDue(card)).length;
    const groups = ['unrated','forgot','fuzzy','familiar','mastered'].map(key=>({ key, label:CardsRender.masteryInfo(key).label, count:state.cards.filter(c=>(c.schedule&&c.schedule.mastery||'unrated')===key).length }));
    $('#masteryChart').innerHTML = groups.map(g=>`<div class="chart-row"><span>${g.label}</span><i><b style="width:${state.cards.length ? g.count/state.cards.length*100 : 0}%"></b></i><em>${g.count}</em></div>`).join('');
    $('#subjectStats').innerHTML=Object.keys(subjectLabels).map(subject=>{const subjectEvents=todayEvents.filter(event=>event.subject===subject),count=new Set(subjectEvents.map(event=>event.card_id)).size,seconds=todaySessions.filter(session=>session.subject===subject).reduce((sum,session)=>sum+Number(session.seconds||0),0);return`<div class="chart-row"><span>${subject==='politics'?'政治':subject}</span><i><b style="width:${todayUniqueCards?count/todayUniqueCards*100:0}%"></b></i><em>${count}张 · ${Math.round(seconds/60)}分</em></div>`;}).join('');
    const recentDays=Array.from({length:7},(_,index)=>{const date=new Date();date.setDate(date.getDate()-(6-index));const key=localDateKey(date),count=ratingEvents.filter(event=>localDateKey(event.reviewed_at)===key).length;return{key,count,label:`${date.getMonth()+1}/${date.getDate()}`};}),maxDay=Math.max(1,...recentDays.map(day=>day.count));
    $('#trendChart').innerHTML=recentDays.map(day=>`<div class="trend-day"><i><b style="height:${Math.max(3,day.count/maxDay*100)}%"></b></i><strong>${day.count}</strong><small>${day.label}</small></div>`).join('');
    const thirtyStart=new Date();thirtyStart.setHours(0,0,0,0);thirtyStart.setDate(thirtyStart.getDate()-29);const thirtyEvents=ratingEvents.filter(event=>new Date(event.reviewed_at)>=thirtyStart);$('#trend30Summary').textContent=`近 30 天 ${thirtyEvents.length} 张`;
    const topics=state.topics.slice().sort((a,b)=>a.order-b.order);
    $('#topicMastery').innerHTML=Object.keys(subjectLabels).map(subject=>{const subjectTopics=topics.filter(topic=>topic.subject===subject);if(!subjectTopics.length)return'';const label=subject==='politics'?'政治':subject,rows=subjectTopics.map(topic=>{const cards=state.cards.filter(card=>card.topic_id===topic.id),rated=cards.filter(card=>masteryLevel(card)>0),raw=cards.length?cards.reduce((sum,card)=>sum+masteryLevel(card),0)/(cards.length*4):0,percent=Math.round(raw*100);return`<div class="topic-mastery-row" data-topic-subject="${subject}"><span><strong>${CardsRender.escapeHtml(topic.title)}</strong><small>${rated.length}/${cards.length} 已评估</small></span><em>${percent}%</em><i><b style="width:${percent}%"></b></i></div>`;}).join('');return`<section class="topic-mastery-group" data-topic-subject-group="${subject}"><div class="topic-mastery-heading"><h3>${label}</h3><span>${CardsRender.escapeHtml(subjectLabels[subject][0])}</span></div><div class="topic-mastery-group-list">${rows}</div></section>`;}).join('')||'<div class="empty-state">暂无专题数据</div>';
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
    await renderDiagnostics(status);
  }
  function diagnosticTime(value) { return value ? new Date(value).toLocaleString() : '—'; }
  async function renderDiagnostics(existingStatus) {
    const status = existingStatus || await CardsSync.status();
    const releaseId = String(window.CardsSeed && CardsSeed.release_id || 'development');
    const contentVersion = String(window.CardsSeed && CardsSeed.content_version || 'local-seed');
    const cacheKeys = 'caches' in window ? await caches.keys() : [];
    const shell = cacheKeys.find(key => key.startsWith('cards-shell-')) || '未注册';
    const shellMatches = releaseId === 'development' || shell.endsWith(releaseId);
    $('#releaseId').textContent = releaseId;
    $('#contentVersion').textContent = contentVersion;
    $('#serviceWorkerVersion').textContent = shell;
    $('#syncCursor').textContent = status.cursor || '0';
    $('#syncPending').textContent = String(status.pending || 0);
    $('#syncConflicts').textContent = String(status.conflicts || 0);
    $('#syncLastSuccess').textContent = diagnosticTime(status.last_synced_at);
    $('#syncLastAttempt').textContent = diagnosticTime(status.last_attempt_at);
    $('#syncDeviceId').textContent = status.device_id || '—';
    $('#updateState').textContent = shellMatches ? '已是当前发布版本' : '应用壳正在后台更新，关闭后重新打开即可生效';
    $('#syncLastError').hidden = !status.last_error;
    $('#syncLastError').textContent = status.last_error ? `最近错误：${status.last_error}` : '';
    await renderConflicts();
  }
  function conflictVersion(card) {
    const field = (label, value) => `<div class="conflict-version-field"><b>${label}</b><p>${CardsRender.escapeHtml(String(value || '—'))}</p></div>`;
    return field('标题', card && card.title) + field('回忆问题', card && card.prompt) + field('核心结论', card && card.summary) + field('考场表述', card && card.exam_wording);
  }
  async function renderConflicts() {
    const conflicts = await CardsSync.listConflicts();
    $('#conflictSummary').textContent = conflicts.length ? `${conflicts.length} 个冲突待处理` : '没有待处理冲突';
    $('#conflictStatusDot').classList.toggle('error', conflicts.length > 0);
    $('#conflictStatusDot').classList.toggle('ready', conflicts.length === 0);
    $('#conflictList').innerHTML = conflicts.map(conflict => `<article class="conflict-row"><span><strong>${CardsRender.escapeHtml(conflict.local && conflict.local.title || conflict.remote && conflict.remote.title || conflict.card_id)}</strong><small>${new Date(conflict.detected_at).toLocaleString()} · revision ${Number(conflict.local&&conflict.local.revision&&conflict.local.revision.version||0)} / ${Number(conflict.remote&&conflict.remote.revision&&conflict.remote.revision.version||0)}</small></span><button class="secondary-button" data-conflict="${CardsRender.escapeHtml(conflict.id)}">处理</button></article>`).join('') || '<div class="empty-state compact">两台设备同时编辑同一张卡时，会在这里保留双方版本。</div>';
    $$('[data-conflict]').forEach(button => button.onclick = () => openConflict(button.dataset.conflict));
  }
  async function renderSnapshotHistory(showErrors = true) {
    const container = $('#snapshotHistoryList');
    const status = await CardsSync.status();
    if (!status.configured) { container.innerHTML = '<small class="sync-pair-help">配置安全同步后可查看历史快照。</small>'; return; }
    try {
      container.innerHTML = '<small class="sync-pair-help">正在读取历史快照…</small>';
      const snapshots = await CardsSync.listSnapshots();
      container.innerHTML = snapshots.length ? `<div class="snapshot-list">${snapshots.map(item => `<article class="snapshot-row"><span><strong>${new Date(item.created_at).toLocaleString()}</strong><small>${Number(item.card_count||0)} 卡 · ${Number(item.topic_count||0)} 专题 · 游标 ${CardsRender.escapeHtml(String(item.cursor||0))}</small></span><button class="secondary-button" data-snapshot-id="${Number(item.id)}">恢复</button></article>`).join('')}</div>` : '<small class="sync-pair-help">云端还没有历史快照。</small>';
      $$('[data-snapshot-id]').forEach(button => button.onclick = () => restoreCloudSnapshot(Number(button.dataset.snapshotId)));
    } catch (error) {
      container.innerHTML = '<small class="diagnostics-error">历史快照读取失败，可稍后重试。</small>';
      if (showErrors) showToast(error.message || '历史快照读取失败');
    }
  }
  async function restoreCloudSnapshot(snapshotId = null) {
    const label = snapshotId === null ? '最新快照' : '所选历史快照';
    if (!window.confirm(`恢复前会自动保留本地备份。确定使用${label}替换当前卡片、专题和回收站吗？`)) return;
    try { const result=await CardsSync.restoreSnapshot(snapshotId);await loadState();showToast(`已从快照恢复 ${result.cards} 张卡`); }
    catch(error){await CardsSync.recordError(error);showToast(error.message||'快照恢复失败');}
    finally{await renderSyncStatus();}
  }
  async function openConflict(id) {
    const conflict = (await CardsSync.listConflicts()).find(item => item.id === id);
    if (!conflict) return renderConflicts();
    state.activeConflict = conflict;
    $('#conflictTitle').textContent = conflict.local && conflict.local.title || conflict.remote && conflict.remote.title || '处理正文冲突';
    $('#conflictLocal').innerHTML = conflictVersion(conflict.local);
    $('#conflictRemote').innerHTML = conflictVersion(conflict.remote);
    const form = $('#conflictMergeForm'), source = conflict.local || conflict.remote;
    ['title','prompt','summary','exam_wording'].forEach(name => form.elements[name].value = source && source[name] || '');
    $('#conflictResolver').showModal();
  }
  async function finishConflict(selected, resolution) {
    if (!state.activeConflict) return;
    const resolved = await CardsSync.resolveConflict(state.activeConflict.id, selected, resolution);
    const index = state.cards.findIndex(card => card.id === resolved.id);
    if (index >= 0) state.cards[index] = resolved; else state.cards.push(resolved);
    state.activeConflict = null; $('#conflictResolver').close(); await refreshDerivedViews(); await renderSyncStatus(); showToast('冲突已解决并等待同步');
    if (navigator.onLine) runSync(false);
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
  async function retryPendingSync() {
    if (document.visibilityState !== 'visible' || state.syncing || navigator.onLine === false) return;
    try {
      const status = await CardsSync.status();
      if (status.configured && (status.pending > 0 || status.last_error)) runSync(false);
    } catch (error) {
      console.error('Cards sync retry check failed', error);
    }
  }
  function startSyncRetryWatch() {
    clearInterval(state.syncRetryTimer);
    state.syncRetryTimer = setInterval(retryPendingSync, syncRetryIntervalMs);
  }
  function bindEvents() {
    $$('[data-route]').forEach(button => button.onclick = () => navigate(button.dataset.route));
    $('#resumeButton').onclick = () => state.session && state.session.status==='active' ? resumeActiveSession() : navigate('today');
    $('#backToSubject').onclick = () => openSubject(state.currentSubject);
    $('#backFromCard').onclick = returnFromCard;
    $('#sortCardsButton').onclick = () => { state.sortByMastery=!state.sortByMastery; renderTopicCards(); };
    $('#reviewTopicButton').onclick = startTopicReview;
    $('#pauseSessionButton').onclick = pauseCurrentSessionAndExit;
    $$('#reviewDurationPicker [data-review-minutes]').forEach(button => button.onclick = async () => {
      state.reviewDurationMinutes=Number(button.dataset.reviewMinutes);renderToday();const setting=await CardsDB.setSetting('review_duration_minutes',state.reviewDurationMinutes);await CardsSync.enqueue('setting_changed','review_duration_minutes',{setting});
    });
    $$('.mode-switch button').forEach(button => button.onclick = () => { state.cardMode=button.dataset.mode; state.revealed=state.cardMode==='memorize'; state.hintLevel=0; renderCard(); saveResumePosition($('#mainContent').scrollTop); });
    $('#hintButton').onclick = () => { state.hintLevel=Math.min((state.currentCard.hints||[]).length,state.hintLevel+1); renderCard(); saveResumePosition($('#mainContent').scrollTop); };
    $('#revealButton').onclick = () => { state.revealed=true; renderCard(); saveResumePosition($('#mainContent').scrollTop); };
    $$('.rating-grid [data-rating]').forEach(button => button.onclick = () => rateCurrent(button.dataset.rating));
    $('#searchInput').oninput = event => renderSearch(event.target.value);
    $$('#searchSubjectFilters [data-subject-filter]').forEach(button => button.onclick = () => { state.searchSubjectFilter=button.dataset.subjectFilter;$$('#searchSubjectFilters button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});renderSearch($('#searchInput').value); });
    $$('#searchMasteryFilters [data-mastery-filter]').forEach(button => button.onclick = () => { state.searchMasteryFilter=button.dataset.masteryFilter;$$('#searchMasteryFilters button').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active?'true':'false');});renderSearch($('#searchInput').value); });
    $('#trashButton').onclick = () => navigate('trash');
    $('#cardEditorForm').addEventListener('submit', async event => { event.preventDefault(); if (!state.editorCard) return; const data=new FormData(event.currentTarget), topic=state.topics.find(item=>item.id===data.get('topic_id')), action=state.editorCard.topic_id===data.get('topic_id')?'edited':'moved', eventType=action==='moved'?'card_moved':'card_updated', baseRevision=Number(state.editorCard.revision&&state.editorCard.revision.version||0), updated={...state.editorCard,title:data.get('title'),prompt:data.get('prompt'),summary:data.get('summary'),exam_wording:data.get('exam_wording'),topic_id:data.get('topic_id'),module:topic?topic.module:state.editorCard.module,revision:{...(state.editorCard.revision||{}),version:baseRevision+1,updated_at:new Date().toISOString(),device_id:state.deviceId}}; await CardsDB.put('cards',updated); state.cards[state.cards.findIndex(c=>c.id===updated.id)]=updated; if(state.currentCard&&state.currentCard.id===updated.id)state.currentCard=updated; await CardsDB.put('review_events',{event_id:uid('manage'),card_id:updated.id,action,subject:updated.subject,topic_id:updated.topic_id,reviewed_at:new Date().toISOString()}); await CardsSync.enqueue(eventType, updated.id, {card:updated,topic}, baseRevision); state.editorCard=null; $('#cardEditor').close(); await refreshDerivedViews(); showToast('知识卡已保存'); });
    const closeEditor=()=>{state.editorCard=null;$('#cardEditor').close();}; $('#closeCardEditor').onclick=closeEditor; $('#cancelCardEditor').onclick=closeEditor;
    const toggleTheme=()=>setTheme(document.body.classList.contains('dark')?'light':'dark',true); $('#themeButton').onclick=toggleTheme; $('#themeToggle').onclick=toggleTheme;
    $('#exportButton').onclick=async()=>{downloadJson(await CardsDB.exportSnapshot());showToast('本地数据已导出');}; $('#importButton').onclick=()=>$('#importFile').click();
    $('#importFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{await CardsDB.importSnapshot(JSON.parse(await file.text()));await loadState();showToast('导入完成，导入前备份已保留');navigate('home');}catch(error){showToast(error.message||'导入失败');}finally{event.target.value='';}};
  $('#saveSyncButton').onclick=async()=>{try{await CardsSync.configure($('#syncUrl').value.trim(),$('#syncKey').value);$('#syncKey').value='';await renderSyncStatus();showToast('同步配置已保存');}catch(error){showToast(error.message||'配置无效');}};
    $('#syncNowButton').onclick=()=>runSync(true);
  $('#refreshDiagnosticsButton').onclick=()=>renderDiagnostics().then(()=>showToast('诊断状态已刷新'));
  $('#closeConflictResolver').onclick=()=>{state.activeConflict=null;$('#conflictResolver').close();};
  $('#keepLocalConflict').onclick=()=>state.activeConflict&&finishConflict(state.activeConflict.local,'local');
  $('#keepRemoteConflict').onclick=()=>state.activeConflict&&finishConflict(state.activeConflict.remote,'remote');
  $('#conflictMergeForm').onsubmit=event=>{event.preventDefault();if(!state.activeConflict)return;const data=new FormData(event.currentTarget),merged={...state.activeConflict.local,title:data.get('title'),prompt:data.get('prompt'),summary:data.get('summary'),exam_wording:data.get('exam_wording')};finishConflict(merged,'merged');};
  $('#copySyncPairButton').onclick=async()=>{try{if(!state.pairingTransfer)throw new Error('请重新扫描一次本机配对二维码');await navigator.clipboard.writeText(state.pairingTransfer);showToast('配对信息已复制，请打开主屏幕 Cards 导入');}catch(error){showToast(error.message||'复制失败，请检查剪贴板权限');}};
  $('#pasteSyncPairButton').onclick=async()=>{try{const value=(await navigator.clipboard.readText()).trim(),encoded=value.startsWith('cards-pair:')?value.slice(11):new URLSearchParams(value.replace(/^#/, '')).get('pair');if(!encoded)throw new Error('剪贴板中没有 Cards 配对信息');const pairing=decodePairing(encoded);await CardsSync.configure(pairing.url,pairing.key);$('#syncUrl').value=pairing.url;$('#syncKey').value='';try{await navigator.clipboard.writeText('');}catch(error){}await renderSyncStatus();showToast('主屏幕 Cards 已完成配对');runSync(false);}catch(error){showToast(error.message||'导入配对失败');}};
    $('#restoreSyncButton').onclick=()=>restoreCloudSnapshot(null);
    $('#refreshSnapshotsButton').onclick=()=>renderSnapshotHistory(true);
    const main=$('#mainContent'),indicator=$('#edgeBackIndicator');let edgeStart=null;
    main.addEventListener('touchstart',event=>{const touch=event.touches[0],bounds=main.getBoundingClientRect(),side=touch.clientX<=bounds.left+28?'left':touch.clientX>=bounds.right-28?'right':null;edgeStart=canEdgeBack()&&side?{x:touch.clientX,y:touch.clientY,side}:null;indicator.classList.toggle('from-right',Boolean(edgeStart&&side==='right'));},{passive:true});
    main.addEventListener('touchmove',event=>{if(!edgeStart)return;const touch=event.touches[0],dx=touch.clientX-edgeStart.x,dy=touch.clientY-edgeStart.y,progress=edgeStart.side==='left'?dx:-dx;if(progress>10&&progress>Math.abs(dy)*1.15){event.preventDefault();indicator.classList.add('active');}},{passive:false});
    main.addEventListener('touchend',event=>{if(!edgeStart)return;const touch=event.changedTouches[0],dx=touch.clientX-edgeStart.x,dy=touch.clientY-edgeStart.y,progress=edgeStart.side==='left'?dx:-dx,complete=progress>=72&&progress>Math.abs(dy)*1.2;edgeStart=null;indicator.classList.remove('active','from-right');if(complete)edgeBack();},{passive:true});
    main.addEventListener('touchcancel',()=>{edgeStart=null;indicator.classList.remove('active','from-right');},{passive:true});
    window.addEventListener('cards-sync-status',renderSyncStatus);
    window.addEventListener('cards-sync-applied',async()=>{await loadState();await setTheme(await CardsDB.getSetting('theme',document.body.classList.contains('dark')?'dark':'light'),false);await renderSyncStatus();});
    window.addEventListener('online',()=>runSync(false));
    $('#mainContent').addEventListener('scroll',()=>{if(state.route!=='card'||!state.currentCard)return;clearTimeout(state.scrollSaveTimer);state.scrollSaveTimer=setTimeout(()=>saveResumePosition($('#mainContent').scrollTop),450);},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){if(state.route==='card')saveResumePosition($('#mainContent').scrollTop);pauseTimer();}else{if(state.route==='card')startTimer();refreshOnForeground();}});
    window.addEventListener('pageshow',refreshOnForeground);
    window.addEventListener('focus',refreshOnForeground);
  }
  async function loadState() { state.cards=await CardsDB.getAll('cards'); state.topics=await CardsDB.getAll('topics'); state.resume=await CardsDB.getSetting('resume_position',null); state.session=await CardsDB.getSetting('active_review_session',null); state.pausedSessions=await CardsDB.getSetting('paused_review_sessions',{});state.reviewDurationMinutes=Number(await CardsDB.getSetting('review_duration_minutes',10))||10;renderHome(); }
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
  async function init(){try{await CardsDB.open();const seeded=await CardsDB.seedIfEmpty(CardsSeed);if(!seeded)await CardsDB.upgradeSeedContent(CardsSeed);const paired=await consumePairingLink();state.deviceId=(await CardsSync.status()).device_id;await setTheme(localStorage.getItem('cards-theme')||await CardsDB.getSetting('theme','light'),false);await loadState();bindEvents();startSyncRetryWatch();await renderSyncStatus();await registerServiceWorker();setSaveState('本地已保存');if(paired)showToast('同步设备已安全配对');if((await CardsSync.status()).configured&&navigator.onLine)runSync(false);}catch(error){console.error(error);setSaveState('载入失败');showToast(error.message||'Cards 初始化失败');}}
  document.addEventListener('DOMContentLoaded',init);
})();
