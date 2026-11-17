/* =========================================================================
   rewards.js — your daily streak (any finished session or focus time counts).
   ========================================================================= */

function streakInfo() {
  const today = todayKey(), todayDone = isActiveDay(today);
  let k = todayDone ? today : addDays(today, -1), n = 0;
  while (isActiveDay(k)) { n++; k = addDays(k, -1); }
  if (n > (S.bestStreak || 0)) { S.bestStreak = n; save(); }
  return { current: n, todayDone, best: S.bestStreak || 0 };
}

function logFocus(minutes, subject) {
  if (minutes < 1) return;
  S.focusLog.push({ date: todayKey(), subject, minutes });
  save();
}
function focusMinutesOn(k) { return S.focusLog.filter(f => f.date === k).reduce((a, f) => a + f.minutes, 0); }
