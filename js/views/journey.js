/* =========================================================================
   journey.js — your roadmap from today to the end of exams.

   The road is split into PHASES (like levels in a game). Each week is a
   node on a winding path. Hit your weekly task goal to earn ⭐⭐⭐.
   Edit the dates/tips in getPhases() if your school's calendar differs.
   ========================================================================= */

function getPhases() {
  const st = S.settings;
  return [
    { id: 'warmup', name: 'Mock Warm-up', emoji: '🔥', colour: 'orange', start: '2000-01-01', end: st.mockStart,
      tip: 'Brain dumps and flashcards on every subject. Find out what you know and what you don\'t.' },
    { id: 'mocks', name: 'Mock Exams', emoji: '📝', colour: 'red', start: st.mockStart, end: st.mockEnd,
      tip: 'Sleep, eat, quick flashcards the night before. Mocks are practice, not judgement.' },
    { id: 'debrief', name: 'Debrief & Recharge', emoji: '🎄', colour: 'green', start: st.mockEnd, end: '2027-01-04',
      tip: 'When results come back, add your weak topics. Rest over Christmas, but keep the streak alive with small tasks.' },
    { id: 'gaps', name: 'Close the Gaps', emoji: '🧩', colour: 'blue', start: '2027-01-04', end: '2027-02-22',
      tip: 'Work through your weak topics with topic questions. Turn red topics green, one by one.' },
    { id: 'papers', name: 'Past Paper Power', emoji: '💪', colour: 'purple', start: '2027-02-22', end: '2027-04-12',
      tip: 'At least one past paper a week. Mark it, then make flashcards for every mark you dropped.' },
    { id: 'sprint', name: 'Final Sprint', emoji: '🚀', colour: 'orange', start: '2027-04-12', end: st.examStart,
      tip: 'Timed papers, daily flashcards, finish any NEA. You\'ve done the hard part — now sharpen.' },
    { id: 'exams', name: 'Exam Season', emoji: '🎯', colour: 'red', start: st.examStart, end: st.examEnd,
      tip: 'Revise for the next paper only. Sleep matters more than one extra hour of cramming.' },
  ];
}

// Stats for the week starting on Monday k
function weekStats(monday) {
  let tasks = 0, mins = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    tasks += tasksDoneOn(d);
    mins += focusMinutesOn(d);
  }
  return { tasks, mins };
}

function starsFor(tasks) {
  const goal = S.settings.weeklyGoal;
  return tasks >= goal ? 3 : tasks >= goal * 2 / 3 ? 2 : tasks >= goal / 3 ? 1 : 0;
}

const JourneyView = {
  selected: null, // Monday key of the tapped week

  html() {
    const today = todayKey(), st = S.settings;
    const phases = getPhases();
    const thisMonday = mondayOf(today);
    const firstMonday = mondayOf(S.createdAt < today ? S.createdAt : today);
    const lastMonday = mondayOf(st.examEnd);

    // Group weeks into phases (a week belongs to the phase active on its Monday,
    // or on today's date for the current week)
    const weeks = [];
    for (let m = firstMonday; m <= lastMonday; m = addDays(m, 7)) weeks.push(m);
    const phaseOf = date => phases.filter(p => date >= p.start).pop() || phases[0];
    const current = phaseOf(today);

    // Overall progress: from the day you started to the last exam
    const total = Math.max(1, daysBetween(S.createdAt, st.examEnd));
    const gone = Math.min(total, Math.max(0, daysBetween(S.createdAt, today)));
    const pct = Math.round(gone / total * 100);
    const daysToExams = daysBetween(today, st.examStart);
    const nextPhase = phases.find(p => p.start > today);

    let nodeIndex = 0;
    let html = `
      <section class="card journey-head card-${current.colour}">
        <div class="jh-emoji">${current.emoji}</div>
        <div class="jh-main">
          <div class="small upper">You are here</div>
          <h1>${esc(current.name)}</h1>
          <p>${esc(current.tip)}</p>
          ${nextPhase ? `<p class="small"><b>Next:</b> ${nextPhase.emoji} ${esc(nextPhase.name)} in ${daysBetween(today, nextPhase.start)} days</p>` : ''}
        </div>
      </section>

      <section class="card">
        <div class="row between"><b>Road to results</b><b>${pct}%</b></div>
        <div class="bar big"><div class="bar-fill green" style="width:${pct}%"></div></div>
        <p class="muted small">${daysToExams > 0
          ? `${daysToExams} days (${Math.floor(daysToExams / 7)} weeks) until your first final exam. At just 1½ hours a day, that's <b>${Math.round(daysToExams * 1.5)} hours</b> of revision still ahead of you. Plenty of time to change your grades.`
          : 'You made it to exam season. Trust the work you\'ve done.'}</p>
      </section>

      <div class="path">`;

    for (const p of phases) {
      const pWeeks = weeks.filter(w => phaseOf(w === thisMonday ? today : w) === p);
      if (!pWeeks.length && p.end <= today) continue;
      html += `
        <div class="unit unit-${p.colour}">
          <div><div class="small upper">${fmtDate(p.start > '2001' ? p.start : S.createdAt)} – ${fmtDate(p.end)}</div>
          <h2>${p.emoji} ${esc(p.name)}</h2>
          <p>${esc(p.tip)}</p></div>
        </div>`;
      for (const w of pWeeks) {
        const ws = weekStats(w);
        const stars = starsFor(ws.tasks);
        const state = w < thisMonday ? 'past' : w === thisMonday ? 'current' : 'locked';
        const offset = Math.round(Math.sin(nodeIndex * 0.9) * 90);
        nodeIndex++;
        const icon = state === 'locked' ? '🔒' : state === 'current' ? '★' : stars === 3 ? '👑' : stars ? '✓' : '·';
        html += `
          <div class="node-wrap" style="transform:translateX(${offset}px)">
            ${state === 'current' ? '<div class="bubble">YOU ARE HERE</div>' : ''}
            <button class="node node-${state} ${state === 'past' && stars === 3 ? 'node-gold' : ''} ${state === 'past' && !stars ? 'node-missed' : ''} unit-${p.colour}"
              data-act="week" data-w="${w}" aria-label="Week of ${fmtDate(w)}">
              <span>${icon}</span>
            </button>
            <div class="node-stars">${state === 'locked' ? '' : '⭐'.repeat(stars) + '<span class="dim">' + '⭐'.repeat(3 - stars) + '</span>'}</div>
            ${this.selected === w ? `
              <div class="node-info card">
                <b>Week of ${fmtDate(w, { day: 'numeric', month: 'long' })}</b><br>
                ${state === 'locked' ? 'Coming up! Plan something good for this week.'
                  : `${ws.tasks} task${ws.tasks === 1 ? '' : 's'} · ${fmtMins(ws.mins)} focused<br>
                     ${stars < 3 ? `${Math.max(0, st.weeklyGoal - ws.tasks)} more task${st.weeklyGoal - ws.tasks === 1 ? '' : 's'} for 3 stars` : 'Perfect week! 👑'}`}
              </div>` : ''}
          </div>`;
      }
    }
    html += `
        <div class="unit unit-gold finish">
          <div class="finish-emoji">🎉</div>
          <h2>FREEDOM</h2>
          <p>${fmtDate(st.examEnd, { day: 'numeric', month: 'long', year: 'numeric' })} — the longest summer of your life. No more exams. You'll have earned every day of it.</p>
        </div>
      </div>`;
    return html;
  },

  bind(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-act="week"]');
      if (!b) return;
      this.selected = this.selected === b.dataset.w ? null : b.dataset.w;
      render();
    };
  },
};
