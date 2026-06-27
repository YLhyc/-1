// FSRS v4 — Free Spaced Repetition Scheduler
// Inline implementation for 考研每日晨报 (vanilla JS, no deps)
// Based on open-spaced-repetition/fsrs4anki

var FSRS_W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
var FSRS_DECAY = -1;
var FSRS_FACTOR = 1 / 9;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// Retrievability: probability of recall after elapsedDays days
function fsrsR(stability, elapsedDays) {
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + FSRS_FACTOR * elapsedDays / stability, FSRS_DECAY);
}

// Current retrievability for a card
function fsrsCurrentR(card, nowMs) {
  if (!card.last_reviewed || !card.stability) return 0;
  var elapsed = (nowMs - card.last_reviewed) / (24 * 3600 * 1000);
  return fsrsR(card.stability, Math.max(0, elapsed));
}

// Is card due for review?
function fsrsIsDue(card, nowMs) {
  if (!card.next_review) return true;
  return nowMs >= card.next_review;
}

// Initialize first review
function fsrsInit(rating) {
  var w = FSRS_W;
  var d = w[4] - (rating - 3) * w[5];
  d = clamp(d, 1, 10);
  var s = w[rating - 1];
  return { difficulty: d, stability: s, state: rating >= 3 ? 'Review' : 'Learning', reps: 1, lapses: rating === 1 ? 1 : 0 };
}

// Schedule subsequent review
function fsrsSchedule(card, rating, nowMs) {
  var w = FSRS_W;
  var D = card.difficulty, S = card.stability || 0.01;
  var elapsedDays = 0, oldR = 1;

  if (card.last_reviewed && S > 0) {
    elapsedDays = (nowMs - card.last_reviewed) / (24 * 3600 * 1000);
    if (elapsedDays < 0) elapsedDays = 0;
    oldR = fsrsR(S, elapsedDays);
  }

  var newD, newS, newState;
  if (rating === 1) {
    newS = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - oldR));
    newS = Math.min(newS, S || 0.01);
    newState = 'Relearning';
    var D0Good = w[4] - w[5];
    var dDeltaForget = -w[6] * (rating - 3);
    newD = w[7] * D0Good + (1 - w[7]) * (D + dDeltaForget);
  } else {
    var hardPenalty = rating === 2 ? w[15] : 1;
    var easyBonus = rating === 4 ? w[16] : 1;
    newS = S * (1 + Math.exp(w[8] * (11 - D)) * Math.pow(S, -w[9]) * (Math.exp(w[10] * (1 - oldR)) - 1) * hardPenalty * easyBonus);
    newS = Math.max(newS, 0.01);
    newState = 'Review';
    var dDelta = -w[6] * (rating - 3);
    var D0Baseline = w[4] - w[5];
    newD = w[7] * D0Baseline + (1 - w[7]) * (D + dDelta);
  }

  newD = clamp(newD, 1, 10);

  // Interval in days (when R drops to target ~0.9)
  var intervalDays = (newS / FSRS_FACTOR) * 0.1;
  intervalDays = clamp(intervalDays, 0.02, 36500);

  return {
    difficulty: newD,
    stability: newS,
    state: newState,
    retrievability_before: oldR,
    last_reviewed: nowMs,
    next_review: nowMs + intervalDays * 24 * 3600 * 1000,
    reps: (card.reps || 0) + 1,
    lapses: (card.lapses || 0) + (rating === 1 ? 1 : 0),
    interval_days: intervalDays
  };
}

// Sort by due-first, then by lowest R for due cards, then by next_review
function fsrsSortQueue(cards, nowMs) {
  return cards.slice().sort(function (a, b) {
    var aDue = fsrsIsDue(a, nowMs), bDue = fsrsIsDue(b, nowMs);
    if (aDue !== bDue) return aDue ? -1 : 1;
    if (aDue) return fsrsCurrentR(a, nowMs) - fsrsCurrentR(b, nowMs);
    return (a.next_review || Infinity) - (b.next_review || Infinity);
  });
}

// Format interval for display
function fsrsIntervalText(card, nowMs) {
  if (!card.next_review) return '待首次复习';
  var diff = card.next_review - nowMs;
  var days = Math.round(diff / (24 * 3600 * 1000));
  if (days <= 0) return '现在';
  if (days === 1) return '明天';
  if (days < 7) return days + '天后';
  if (days < 30) return Math.round(days / 7) + '周后';
  return Math.round(days / 30) + '月后';
}

// Format R as percentage
function fsrsRPercent(card, nowMs) {
  return Math.round(fsrsCurrentR(card, nowMs) * 100);
}
