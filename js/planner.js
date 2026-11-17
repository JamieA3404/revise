/* =========================================================================
   planner.js — the rolling roadmap.

   Every day (and after every session) the roadmap is rebuilt from your REAL
   progress, so:
     • missed sessions automatically merge into the next few days
     • topics you score badly on come back sooner (spaced repetition)
     • weak topics found in past papers move up the queue
     • every topic is planned in before the "cover everything by" date,
       and if that isn't possible at your daily minutes, the roadmap tells you
   Past days are never changed, and today stays as it is once planned.
   ========================================================================= */

// Typical English school holidays for 2026–27. Check yours! Holidays get more time.
const HOLIDAYS = [
  ['2026-12-19', '2027-01-03'], // Christmas
  ['2027-02-13', '2027-02-21'], // February half term
  ['2027-03-27', '2027-04-11'], // Easter
];
const OFF_DAYS = ['2026-12-25', '2026-12-26', '2027-01-01']; // full rest days

// Every topic should be learned at least once by this date (5 weeks before
// finals), leaving the last stretch for past papers and strengthening.
function coverBy() { return addDays(S.settings.examStart, -35); }

function getPhases() {
  const st = S.settings;
  return [
    { id: 'warmup',  name: 'Mock Prep',          emoji: '🔥', colour: 'orange', start: '2000-01-01', end: st.mockStart,
      tip: 'Learn the highest-value topics in every subject, then test yourself on them.' },
    { id: 'mocks',   name: 'Mock Exams',         emoji: '📝', colour: 'red',    start: st.mockStart, end: st.mockEnd,
      tip: 'Light daily reviews. Sleep well. Mocks show you where to aim next.' },
    { id: 'debrief', name: 'Mock Debrief',       emoji: '🔍', colour: 'green',  start: st.mockEnd, end: '2027-01-04',
      tip: 'Upload each mock paper. The marking finds your weak topics and moves them up the roadmap.' },
    { id: 'gaps',    name: 'Close the Gaps',     emoji: '🧩', colour: 'blue',   start: '2027-01-04', end: '2027-02-22',
      tip: 'Learn every remaining topic, and test each one until it\'s secure.' },
    { id: 'papers',  name: 'Past Paper Power',   emoji: '💪', colour: 'purple', start: '2027-02-22', end: '2027-04-12',
      tip: 'A past paper every couple of weeks per subject, marked by AI, and weak topics fixed.' },
    { id: 'sprint',  name: 'Final Sprint',       emoji: '🚀', colour: 'orange', start: '2027-04-12', end: st.examStart,
      tip: 'Weekly papers, strengthen the weakest topics, keep everything fresh.' },
    { id: 'exams',   name: 'Exam Season',        emoji: '🎯', colour: 'red',    start: st.examStart, end: st.examEnd,
      tip: 'Revise for the next paper only. Sleep beats cramming.' },
  ];
}
function phaseOf(k) { const p = getPhases(); return p.filter(x => k >= x.start).pop() || p[0]; }
function isHoliday(k) { return HOLIDAYS.some(([a, b]) => k >= a && k <= b); }

// Minutes available on a day (never below 60 except full rest days)
function dayMinutes(k, phase) {
  if (OFF_DAYS.includes(k)) return 0;
  const m = S.settings.mins, wd = fromKey(k).getDay();
  let mins = isHoliday(k) ? m.holiday : (wd === 0 || wd === 6) ? m.weekend : m.weekday;
  if (phase === 'sprint') mins += 30;
  return Math.max(60, mins);
}

function newSession(kind, subject, extra = {}) {
  return { id: uid(), kind, subject, done: false, ...extra };
}

/* Build (or rebuild) the roadmap. resetBaseline = re-draw the "on track" line too. */
function buildPlan(resetBaseline = false) {
  const today = todayKey(), st = S.settings, end = addDays(st.examStart, -1);
  const old = (S.plan && S.plan.days) || {};
  const days = {};
  for (const k in old) if (k < today) days[k] = old[k]; // history is kept as it happened

  // A simulated copy of your progress, moved forward day by day
  const topics = allTopics();
  const bySubject = {};
  const sim = {};
  let unlearned = 0;
  for (const t of topics) {
    const m = S.mastery[t.id];
    sim[t.id] = { learned: !!(m && m.learned), due: m && m.due, score: m ? m.score : null, n: m ? m.n : 0 };
    if (!sim[t.id].learned) unlearned++;
    (bySubject[t.subject] ||= []).push(t);
  }
  const lastPaper = { ...S.lastPaper }, paperNo = { ...S.paperNo };
  const mockDone = new Set(Object.values(old).flat().filter(s => s.kind === 'mockreview' && s.done).map(s => s.subject));
  const credit = {};
  SUBJECTS.forEach(s => { credit[s.id] = 0; });

  const apply = (s, k) => {
    const x = s.topicId && sim[s.topicId];
    if (s.kind === 'learn' && x) {
      if (!x.learned) unlearned--;
      x.learned = true; x.n++; x.score = Math.max(x.score ?? 0, 70); x.due = addDays(k, reviewGap(x.score, x.n));
    }
    if (s.kind === 'review' && x) { x.n++; x.score = Math.min(100, (x.score ?? 60) + 8); x.due = addDays(k, reviewGap(x.score, x.n)); }
    if (s.kind === 'paper') { lastPaper[s.subject] = k; paperNo[s.subject] = (paperNo[s.subject] || 0) + 1; }
    if (s.kind === 'mockreview') mockDone.add(s.subject);
  };

  // Pick the next topic to learn: subjects take turns by weight (smooth weighted
  // round-robin), and within a subject the most likely / weakest topics go first.
  const pickLearn = used => {
    const open = SUBJECTS.filter(s => bySubject[s.id].some(t => !sim[t.id].learned));
    if (!open.length) {
      // Everything learned: strengthen the weakest topic not already done today
      const learned = topics.filter(t => !used.has(t.subject)).sort((a, b) => (sim[a.id].score ?? 0) - (sim[b.id].score ?? 0));
      return learned[0] && sim[learned[0].id].score < 85 ? learned[0] : null;
    }
    const pool = open.filter(s => !used.has(s.id));
    const choose = pool.length ? pool : open;
    const totalW = choose.reduce((a, s) => a + SUBJECT_WEIGHT[s.id], 0);
    choose.forEach(s => { credit[s.id] += SUBJECT_WEIGHT[s.id]; });
    const s = choose.reduce((a, b) => (credit[b.id] > credit[a.id] ? b : a));
    credit[s.id] -= totalW;
    const prio = t => (t.freq || 70) + (sim[t.id].score != null ? (100 - sim[t.id].score) / 2 : 0);
    return bySubject[s.id].filter(t => !sim[t.id].learned).sort((a, b) => prio(b) - prio(a))[0];
  };

  const cb = coverBy();
  // The day revision starts (Settings → "Start revision on"). Before it: no sessions.
  const startOn = revisionStart();
  let start = today;
  if (today < startOn) {
    // Not started yet: keep anything you already finished today, plan nothing else
    days[today] = (old[today] || []).filter(s => s.done);
    days[today].forEach(s => apply(s, today));
    start = addDays(today, 1);
  } else if (old[today] && old[today].length) {   // today is fixed once planned
    days[today] = old[today];
    old[today].forEach(s => apply(s, today));
    start = addDays(today, 1);
  }

  const baseline = {};
  let coveredOn = unlearned === 0 ? today : null;
  baseline[addDays(start, -1)] = topics.length - unlearned;

  for (let k = start; k <= end; k = addDays(k, 1)) {
    const phase = phaseOf(k).id;
    let mins = k < startOn ? 0 : dayMinutes(k, phase);
    const list = (days[k] = []);
    const used = new Set();
    const push = s => { list.push(s); apply(s, k); mins -= KINDS[s.kind].mins; used.add(s.subject); };
    const wd = fromKey(k).getDay();
    const free = wd === 0 || wd === 6 || isHoliday(k);

    if (mins > 0) {
      // 1. After mocks: one debrief per subject, two a day
      if (phase === 'debrief') {
        for (const s of SUBJECTS) {
          if (list.length >= 2 || mins < 30) break;
          if (!mockDone.has(s.id)) push(newSession('mockreview', s.id));
        }
      }
      // 2. Product Design NEA on Wednesdays and Saturdays
      if (k <= st.neaUntil && phase !== 'mocks' && (wd === 3 || wd === 6) && mins >= 60) push(newSession('nea', 'dt'));

      // 3. A past paper (90 min) for the subject that's waited longest
      const gap = { warmup: 30, papers: 14, sprint: 7 }[phase];
      if (gap && mins >= 90 && (free || phase === 'sprint')) {
        const due = SUBJECTS
          .filter(s => !used.has(s.id) && (phase !== 'warmup' || s.id === 'maths'))
          .filter(s => daysBetween(lastPaper[s.id] || '2000-01-01', k) >= gap * (s.id === 'maths' ? 0.7 : 1))
          .sort((a, b) => (lastPaper[a.id] || '').localeCompare(lastPaper[b.id] || '') || SUBJECT_WEIGHT[b.id] - SUBJECT_WEIGHT[a.id])[0];
        if (due) {
          const n = paperNo[due.id] || 0, P = PAPERS[due.id], ser = SERIES[due.id] || SERIES.default;
          push(newSession('paper', due.id, { paper: P[n % P.length], series: ser[Math.floor(n / P.length) % ser.length] }));
        }
      }

      // 4. Reviews that are due, most overdue first. They get up to half the remaining
      //    time, but never so much that new topics fall behind the pace needed to
      //    learn every topic by the cover-by date.
      const R = KINDS.review.mins;
      let budget = unlearned === 0 ? mins : Math.floor(mins / 2); // all learned? reviews can use the whole day
      if (unlearned > 0 && k < cb) {
        const pace = Math.ceil(unlearned / Math.max(1, daysBetween(k, cb)) * 1.1);
        budget = Math.max(0, Math.min(budget, mins - pace * 30));
      }
      const dueTopics = topics
        .filter(t => sim[t.id].learned && sim[t.id].due && sim[t.id].due <= k)
        .sort((a, b) => sim[a.id].due.localeCompare(sim[b.id].due) || (sim[a.id].score ?? 0) - (sim[b.id].score ?? 0));
      for (const t of dueTopics) {
        if (budget < R || mins < R) break;
        push(newSession('review', t.subject, { topicId: t.id })); budget -= R;
      }

      // 5. Learn new topics (or strengthen weak ones) with the rest
      while (mins >= 30) {
        const t = pickLearn(used);
        if (!t) break;
        push(newSession('learn', t.subject, { topicId: t.id, strengthen: sim[t.id].learned }));
      }
      // 6. Use any spare minutes on quick reviews of the weakest learned topics
      while (mins >= KINDS.review.mins) {
        const t = topics.filter(x => sim[x.id].learned && !used.has(x.subject)).sort((a, b) => (sim[a.id].score ?? 0) - (sim[b.id].score ?? 0))[0];
        if (!t) break;
        push(newSession('review', t.subject, { topicId: t.id }));
      }
    }
    baseline[k] = topics.length - unlearned;
    if (!coveredOn && unlearned === 0) coveredOn = k;
  }

  // Will everything be covered in time? If not, how many more minutes a day?
  let extraMins = 0;
  if (!coveredOn || coveredOn > cb) {
    const left = topics.length - (baseline[cb] ?? baseline[end] ?? 0);
    const daysLeft = Math.max(1, daysBetween(todayKey(), cb));
    extraMins = Math.ceil((left * 30) / daysLeft / 5) * 5;
  }

  S.plan = {
    builtOn: today,
    startOn,
    days,
    // The "on track" line is drawn once and kept, so falling behind shows up
    baseline: resetBaseline || !S.plan || !S.plan.baseline ? baseline : { ...baseline, ...S.plan.baseline },
    coveredOn, extraMins,
  };
  save();
  return S.plan;
}

// Make sure there's an up-to-date roadmap (called on start-up)
function ensurePlan() {
  if (!S.plan || S.plan.builtOn !== todayKey() || S.plan.startOn !== revisionStart()) buildPlan(true);
  return S.plan;
}

// The first day of revision (never earlier than today for planning purposes)
function revisionStart() {
  const sd = S.settings.startDate, today = todayKey();
  return sd && sd > today ? sd : today;
}

function todaySessions() { return (S.plan && S.plan.days[todayKey()]) || []; }
function findSession(id) {
  for (const k in S.plan.days) { const s = S.plan.days[k].find(x => x.id === id); if (s) return { s, date: k }; }
  return null;
}

/* Are you on track? Compares topics learned so far with where the plan said you'd be. */
function trackStatus() {
  const today = todayKey(), y = addDays(today, -1);
  const learned = allTopics().filter(t => S.mastery[t.id] && S.mastery[t.id].learned).length;
  const target = S.plan && S.plan.baseline ? S.plan.baseline[y] : undefined;
  let missed = 0;
  for (let i = 1; i <= 7; i++) missed += ((S.plan && S.plan.days[addDays(today, -i)]) || []).filter(s => !s.done).length;
  const behind = target == null ? 0 : Math.max(0, target - learned);
  return { learned, total: allTopics().length, behind, missed,
           level: behind === 0 ? 'on' : behind <= 3 ? 'close' : 'behind' };
}
