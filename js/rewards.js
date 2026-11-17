/* =========================================================================
   rewards.js — XP, levels and your daily streak. Kept small on purpose.
   XP comes from finishing sessions (see KINDS in data.js) plus a bonus for
   good test scores.
   ========================================================================= */

const LEVEL_TITLES = [
  [1, 'Fresh Start'], [3, 'Getting Going'], [5, 'Building Up'], [8, 'Brain Builder'],
  [11, 'Topic Tamer'], [14, 'Paper Crusher'], [18, 'Exam Warrior'], [22, 'Grade 9 Hunter'], [27, 'Revision Legend'],
];
// Level 2 at 100 XP, level 3 at 300, level 4 at 600... (each level needs 100 more than the last)
function levelInfo(xp) {
  let n = 1;
  while (50 * n * (n + 1) <= xp) n++;
  const base = 50 * (n - 1) * n, next = 50 * n * (n + 1);
  return { level: n, title: LEVEL_TITLES.filter(([lv]) => n >= lv).pop()[1], into: xp - base, need: next - base };
}

function grant(xp, at = null) {
  const before = levelInfo(S.xp).level;
  S.xp = Math.max(0, S.xp + xp);
  save();
  if (at && xp > 0) floatText('+' + xp + ' XP', at.x, at.y);
  const after = levelInfo(S.xp);
  if (after.level > before) {
    Sfx.levelUp();
    Celebrate.show({ emoji: '⚡', colour: 'purple', title: 'Level ' + after.level + '!',
      text: `You're now a <b>${esc(after.title)}</b>.`, button: 'Keep going' });
  }
  renderStatbar();
}

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
