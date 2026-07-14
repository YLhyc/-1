(function () {
  'use strict';

  const DAY_MS = 86400000;
  const ratings = {
    forgot: { value: 1, label: '完全记不得', fsrs: 'Again' },
    fuzzy: { value: 2, label: '模糊', fsrs: 'Hard' },
    familiar: { value: 3, label: '基本熟悉', fsrs: 'Good' },
    mastered: { value: 4, label: '完全熟悉', fsrs: 'Easy' }
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function elapsedDays(schedule, now) {
    if (!schedule.last_reviewed_at) return 0;
    return Math.max(0, (now.getTime() - new Date(schedule.last_reviewed_at).getTime()) / DAY_MS);
  }

  function retrievability(schedule, now) {
    const stability = Number(schedule.stability) || 0.4;
    return Math.exp(Math.log(0.9) * elapsedDays(schedule, now) / stability);
  }

  function nextDifficulty(schedule, rating) {
    const current = Number(schedule.difficulty) || 5;
    const delta = { forgot: 1.25, fuzzy: 0.45, familiar: -0.2, mastered: -0.75 }[rating];
    return Number(clamp(current + delta, 1, 10).toFixed(3));
  }

  function nextStability(schedule, rating, now) {
    const current = Number(schedule.stability) || 0;
    if (!schedule.reps || !current) return { forgot: 0.25, fuzzy: 1, familiar: 3, mastered: 7 }[rating];
    const r = clamp(retrievability(schedule, now), 0.05, 1);
    const d = nextDifficulty(schedule, rating);
    const ease = 1 + (10 - d) * 0.045;
    const factor = {
      forgot: 0.55,
      fuzzy: 1.15 + (1 - r) * 0.35,
      familiar: (1.72 + (1 - r) * 1.45) * ease,
      mastered: (2.65 + (1 - r) * 1.85) * (1 + (10 - d) * 0.065)
    }[rating];
    return Number(clamp(current * factor, 0.2, 365).toFixed(3));
  }

  function rate(card, rating, nowValue, elapsedSeconds) {
    if (!ratings[rating]) throw new Error(`Unknown rating: ${rating}`);
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    const previous = card.schedule || {};
    const stability = nextStability(previous, rating, now);
    const difficulty = nextDifficulty(previous, rating);
    let due;
    let state = 'review';
    if (rating === 'forgot') {
      due = new Date(now.getTime() + 10 * 60000);
      state = 'relearning';
    } else {
      const minimum = rating === 'fuzzy' ? 1 : rating === 'familiar' ? 2 : 4;
      const intervalDays = clamp(Math.round(stability), minimum, 180);
      due = new Date(now.getTime() + intervalDays * DAY_MS);
    }
    const reps = Number(previous.reps || 0) + 1;
    const oldAverage = Number(previous.average_seconds || 0);
    const observed = clamp(Number(elapsedSeconds || oldAverage || 75), 10, 900);
    const averageSeconds = reps === 1 ? observed : oldAverage * 0.7 + observed * 0.3;
    return {
      ...card,
      schedule: {
        ...previous,
        mastery: rating,
        state,
        due_at: due.toISOString(),
        last_reviewed_at: now.toISOString(),
        reps,
        lapses: Number(previous.lapses || 0) + (rating === 'forgot' ? 1 : 0),
        difficulty,
        stability,
        average_seconds: Number(averageSeconds.toFixed(1))
      },
      revision: {
        version: Number(card.revision && card.revision.version || 0) + 1,
        updated_at: now.toISOString(),
        device_id: card.revision && card.revision.device_id || 'browser-local'
      }
    };
  }

  function priority(card, now) {
    const schedule = card.schedule || {};
    const dueAt = schedule.due_at ? new Date(schedule.due_at).getTime() : 0;
    const overdueDays = dueAt ? Math.max(0, (now.getTime() - dueAt) / DAY_MS) : 0;
    const masteryWeight = { forgot: 120, fuzzy: 95, unrated: 72, familiar: 48, mastered: 25 }[schedule.mastery] || 60;
    const dueWeight = dueAt <= now.getTime() ? 45 : 0;
    return masteryWeight + dueWeight + Math.min(30, overdueDays * 3);
  }

  function isDue(card, nowValue) {
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    const dueAt = card.schedule && card.schedule.due_at;
    return !dueAt || new Date(dueAt).getTime() <= now.getTime();
  }

  function buildQueue(cards, subject, options) {
    const config = { targetSeconds: 2700, hardLimitSeconds: 3600, now: new Date(), ...(options || {}) };
    const now = config.now instanceof Date ? config.now : new Date(config.now);
    const candidates = cards
      .filter(card => card.subject === subject && isDue(card, now))
      .map(card => ({ card, priority: priority(card, now), seconds: clamp(Number(card.schedule && card.schedule.average_seconds || 75), 30, 420) }))
      .sort((a,b) => b.priority - a.priority || new Date(a.card.schedule.due_at || 0) - new Date(b.card.schedule.due_at || 0) || a.card.order - b.card.order);

    return packQueue(candidates, config);
  }

  function buildTopicQueue(cards, topicId, options) {
    const config = { targetSeconds: 2700, hardLimitSeconds: 3600, now: new Date(), ...(options || {}) };
    const now = config.now instanceof Date ? config.now : new Date(config.now);
    const candidates = cards
      .filter(card => card.topic_id === topicId)
      .map(card => ({ card, priority: priority(card, now), seconds: clamp(Number(card.schedule && card.schedule.average_seconds || 75), 30, 420) }))
      .sort((a,b) => b.priority - a.priority || a.card.order - b.card.order);
    return packQueue(candidates, config);
  }

  function packQueue(candidates, config) {
    const queue = [];
    let seconds = 0;
    for (const item of candidates) {
      // 45 分钟是正常停止线；只有“完全记不得”这类最高优先级卡可越过，且仍受 60 分钟硬上限约束。
      if (seconds + item.seconds > config.targetSeconds && queue.length && item.priority < 150) continue;
      if (seconds + item.seconds > config.hardLimitSeconds) continue;
      queue.push(item.card.id);
      seconds += item.seconds;
    }
    return { ids: queue, estimated_seconds: Math.round(seconds), due_count: candidates.length };
  }

  function formatDue(iso, nowValue) {
    if (!iso) return '尚未安排';
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue || Date.now());
    const target = new Date(iso);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return '现在到期';
    if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}分钟后`;
    if (diff < DAY_MS) return `${Math.round(diff / 3600000)}小时后`;
    return `${Math.round(diff / DAY_MS)}天后`;
  }

  window.CardsScheduler = { ratings, rate, buildQueue, buildTopicQueue, isDue, retrievability, formatDue };
})();
