/* =========================================================================
   rewards.js — XP, levels, gems, streaks and badges.

   How you earn things:
     • Tick off a task      → XP for its type (see TASK_TYPES) + 5 gems
     • Each focus minute    → 2 XP, + 5 gems per finished focus session
     • Clear your whole day → 100 XP bonus + 20 gems
     • Unlock a badge       → 25 gems
     • Turn a weak topic green → 30 XP
   Gems are spent on rewards YOU choose (Progress page).
   ========================================================================= */

/* ---------- Levels ----------
   Level 2 needs 100 XP, level 3 needs 300, level 4 needs 600 ...
   (each level needs 100 XP more than the last). */
const LEVEL_TITLES = [
  [1, 'Fresh Start'], [3, 'Getting Going'], [5, 'Flashcard Fan'], [8, 'Brain Builder'],
  [11, 'Topic Tamer'], [14, 'Paper Crusher'], [18, 'Exam Warrior'], [22, 'Grade 9 Hunter'], [27, 'Revision Legend'],
];
function levelInfo(xp) {
  let n = 1;
  while (50 * n * (n + 1) <= xp) n++;
  const base = 50 * (n - 1) * n, next = 50 * n * (n + 1);
  const title = LEVEL_TITLES.filter(([lv]) => n >= lv).pop()[1];
  return { level: n, title, into: xp - base, need: next - base };
}

/* Give (or take back) XP and gems. `at` = {x, y} screen point for the "+XP" floater. */
function grant(xp, gems = 0, at = null) {
  const before = levelInfo(S.xp).level;
  S.xp = Math.max(0, S.xp + xp);
  S.gems = Math.max(0, S.gems + gems);
  save();
  if (at && xp > 0) floatText('+' + xp + ' XP', at.x, at.y);
  const after = levelInfo(S.xp);
  if (after.level > before) {
    Sfx.levelUp();
    Celebrate.show({
      emoji: '⚡', colour: 'purple',
      title: 'Level ' + after.level + '!',
      text: `You're now a <b>${esc(after.title)}</b>. Every level is proof you showed up.`,
      button: 'Let\'s go',
    });
  }
  renderStatbar();
}

/* ---------- Streak ----------
   A day counts if you completed at least one task or did any focus time. */
function streakInfo() {
  const today = todayKey();
  const todayDone = isActiveDay(today);
  let k = todayDone ? today : addDays(today, -1);
  let n = 0;
  while (isActiveDay(k)) { n++; k = addDays(k, -1); }
  if (n > (S.bestStreak || 0)) { S.bestStreak = n; save(); }
  return { current: n, todayDone, best: S.bestStreak || 0 };
}

/* ---------- Badges ---------- */
const BADGES = [
  { id: 'first',  emoji: '👣', name: 'First Step',     desc: 'Complete your first task',          test: s => s.tasks >= 1 },
  { id: 't10',    emoji: '🔟', name: 'Ten Down',       desc: 'Complete 10 tasks',                 test: s => s.tasks >= 10 },
  { id: 't50',    emoji: '🏅', name: 'Half Century',   desc: 'Complete 50 tasks',                 test: s => s.tasks >= 50 },
  { id: 't100',   emoji: '💯', name: 'Centurion',      desc: 'Complete 100 tasks',                test: s => s.tasks >= 100 },
  { id: 't250',   emoji: '👑', name: 'Royalty',        desc: 'Complete 250 tasks',                test: s => s.tasks >= 250 },
  { id: 'f60',    emoji: '⏱️', name: 'Hour of Power',  desc: 'Focus for 1 hour in total',         test: s => s.mins >= 60 },
  { id: 'f600',   emoji: '🧘', name: 'Deep Diver',     desc: 'Focus for 10 hours in total',       test: s => s.mins >= 600 },
  { id: 'f3000',  emoji: '🌋', name: 'Unstoppable',    desc: 'Focus for 50 hours in total',       test: s => s.mins >= 3000 },
  { id: 's3',     emoji: '🔥', name: 'On Fire',        desc: '3-day streak',                      test: s => s.streak >= 3 },
  { id: 's7',     emoji: '🚒', name: 'Week Warrior',   desc: '7-day streak',                      test: s => s.streak >= 7 },
  { id: 's30',    emoji: '☄️', name: 'Month Monster',  desc: '30-day streak',                     test: s => s.streak >= 30 },
  { id: 'pp1',    emoji: '📝', name: 'Paper Cut',      desc: 'Finish your first past paper',      test: s => s.papers >= 1 },
  { id: 'pp10',   emoji: '🐯', name: 'Paper Tiger',    desc: 'Finish 10 past papers',             test: s => s.papers >= 10 },
  { id: 'clear1', emoji: '✨', name: 'Clean Sweep',    desc: 'Clear every task in a day',         test: s => s.cleared >= 1 },
  { id: 'clear7', emoji: '🌟', name: 'Sweep Week',     desc: 'Clear 7 days',                      test: s => s.cleared >= 7 },
  { id: 'all',    emoji: '🌈', name: 'All-Rounder',    desc: 'Do a task in every subject',        test: s => s.subjects >= SUBJECTS.length },
  { id: 'fixed',  emoji: '🧩', name: 'Gap Closer',     desc: 'Turn a weak topic green',           test: s => s.fixed >= 1 },
  { id: 'fixed10',emoji: '🛡️', name: 'No Weak Spots',  desc: 'Turn 10 weak topics green',         test: s => s.fixed >= 10 },
  { id: 'early',  emoji: '🌅', name: 'Early Bird',     desc: 'Finish a task before 8am',          test: s => s.early },
  { id: 'treat',  emoji: '🎁', name: 'Treat Yourself', desc: 'Spend gems on a reward',            test: s => s.redeemed >= 1 },
];

function allStats() {
  let tasks = 0, papers = 0, cleared = 0, early = false;
  const subjects = new Set();
  for (const k in S.days) {
    const d = S.days[k];
    if (d.cleared) cleared++;
    for (const t of liveTasks(d)) {
      if (!t.done) continue;
      tasks++; subjects.add(t.subject);
      if (t.type === 'pastpaper') papers++;
      if (t.doneAt && new Date(t.doneAt).getHours() < 8) early = true;
    }
  }
  const mins = S.focusLog.reduce((a, f) => a + f.minutes, 0);
  return { tasks, papers, cleared, early, subjects: subjects.size, mins,
           streak: streakInfo().best, fixed: S.topicsFixed || 0, redeemed: S.redeemed.length };
}

function checkBadges() {
  const st = allStats();
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.test(st)) {
      S.badges[b.id] = todayKey();
      S.gems += 25;
      save();
      Sfx.fanfare();
      Celebrate.show({ emoji: b.emoji, title: 'Badge unlocked: ' + b.name, text: esc(b.desc) + '<br><b>+25 💎</b>', button: 'Nice', colour: 'blue' });
    }
  }
  renderStatbar();
}

/* ---------- Completing tasks (used by Today, Focus) ---------- */
function setTaskDone(dayKey, id, done, fromEl) {
  const t = findTask(dayKey, id);
  if (!t || t.done === done) return;
  const r = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const at = { x: r.left + r.width / 2, y: r.top };

  if (done) {
    t.done = true; t.doneAt = Date.now(); t.xp = ttype(t.type).xp;
    Sfx.ding();
    Confetti.burst(at.x, at.y + r.height / 2, 30);
    grant(t.xp, 5, at);
    toast(randomCheer(), '✅');
    // Whole day cleared? Big bonus (once per day)
    const day = S.days[dayKey];
    const live = liveTasks(day);
    if (!day.cleared && live.length && live.every(x => x.done)) {
      day.cleared = true; save();
      grant(100, 20);
      Celebrate.show({ emoji: '🏆', title: 'Day cleared!', text: 'Every task done. <b>+100 XP</b> and <b>+20 💎</b> bonus.<br>Go enjoy your evening — you earned it.', button: 'Collect', colour: 'orange' });
    }
  } else {
    // Unticking takes the XP back, so it's always fair
    t.done = false; t.doneAt = null;
    grant(-t.xp, -5);
    t.xp = 0;
    Sfx.undo();
  }
  save();
  checkBadges();
}

function logFocus(minutes, subject, taskId) {
  if (minutes < 1) return;
  S.focusLog.push({ date: todayKey(), subject, minutes, taskId: taskId || null });
  save();
}

/* ---------- Motivation lines ---------- */
const MOTIVATION = [
  'You don\'t have to feel ready. You just have to start.',
  'Five minutes. That\'s all. Then see how you feel.',
  'Every flashcard now is a mark in the exam hall later.',
  'Small, boring, consistent. That\'s the secret.',
  'Future you is going to be so glad you did this.',
  'Done is better than perfect. Tick one thing off.',
  'Motivation comes AFTER starting, not before.',
  'Phone in another room = superpowers.',
  'You\'re not behind. You\'re here, and that counts.',
  'One task at a time. That\'s it.',
  'The summer after exams is going to feel amazing.',
];
function dailyMotivation() {
  return MOTIVATION[daysBetween('2026-01-01', todayKey()) % MOTIVATION.length];
}
