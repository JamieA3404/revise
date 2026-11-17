/* =========================================================================
   roadmap.js — every day from when you started to your first exam, week by
   week. Past days show what you did; missed sessions show as "moved"
   because they've been merged into upcoming days.
   ========================================================================= */

const RoadmapView = {
  html() {
    ensurePlan();
    const today = todayKey(), st = S.settings, p = S.plan;
    const tr = trackStatus();
    const phase = phaseOf(today);
    const keys = Object.keys(p.days).sort();
    const first = mondayOf(keys[0] || today);
    const last = keys[keys.length - 1] || today;
    const pct = Math.round(tr.learned / tr.total * 100);
    const thisMonday = mondayOf(today);
    let html = `
      <section class="card phase-card unit-${phase.colour}">
        <div class="small upper">You are here</div>
        <h1>${phase.emoji} ${esc(phase.name)}</h1>
        <p>${esc(phase.tip)}</p>
      </section>

      <section class="card">
        <div class="row between"><b>Topics learned</b><b>${tr.learned} / ${tr.total} (${pct}%)</b></div>
        <div class="bar big"><div class="bar-fill" style="width:${pct}%"></div></div>
        <p class="small">${p.extraMins > 0
          ? `⚠️ At your current minutes per day, the plan can't fit every topic before ${fmtDate(coverBy(), { day: 'numeric', month: 'long' })}. <b>Add ~${p.extraMins} min/day</b> in Settings to reach 100%.`
          : `✅ Every one of the ${tr.total} topics is planned in by <b>${fmtDate(p.coveredOn || today, { day: 'numeric', month: 'long' })}</b>. After that it's past papers and strengthening your weakest topics until ${fmtDate(st.examStart, { day: 'numeric', month: 'long' })}.`}</p>
        ${tr.missed ? `<p class="small muted">${tr.missed} session${tr.missed > 1 ? 's' : ''} missed in the last week. They've been merged into upcoming days.</p>` : ''}
      </section>

      <div class="weeks">`;

    let lastPhase = null;
    for (let m = first; m <= last; m = addDays(m, 7)) {
      const ph = phaseOf(m < today && addDays(m, 6) >= today ? today : m);
      if (ph.id !== lastPhase) {
        html += `<div class="unit unit-${ph.colour}"><h2>${ph.emoji} ${esc(ph.name)}</h2><p>${esc(ph.tip)}</p></div>`;
        lastPhase = ph.id;
      }
      const dayKeys = [...Array(7)].map((_, i) => addDays(m, i)).filter(k => p.days[k]);
      const all = dayKeys.flatMap(k => p.days[k]);
      if (!all.length && m < thisMonday) continue;
      const doneN = all.filter(s => s.done).length;
      const mins = all.reduce((a, s) => a + KINDS[s.kind].mins, 0);
      const isNow = m === thisMonday;
      html += `
        <details class="week card ${isNow ? 'is-now' : ''}" ${isNow || m === addDays(thisMonday, 7) ? 'open' : ''}>
          <summary>
            <b>${isNow ? 'This week' : 'Week of ' + fmtDate(m)}</b>
            <span class="muted small">${all.length} sessions · ${fmtMins(mins)}${m <= thisMonday ? ` · ${doneN}/${all.length} done` : ''}</span>
          </summary>
          ${dayKeys.map(k => this.day(k, p.days[k], today)).join('')}
        </details>`;
    }
    html += `
        <div class="unit unit-gold finish">
          <div class="finish-emoji">🎉</div><h2>Finals start ${fmtDate(st.examStart, { day: 'numeric', month: 'long' })}</h2>
          <p>Every topic learned, tested and strengthened. Then the summer is yours.</p>
        </div>
      </div>`;
    return html;
  },

  day(k, sessions, today) {
    const past = k < today;
    return `
      <div class="rday ${k === today ? 'is-today' : ''} ${past ? 'past' : ''}">
        <div class="rday-date">${k === today ? '<b>Today</b>' : fmtDate(k, { weekday: 'short', day: 'numeric' })}</div>
        <div class="rday-items">
          ${sessions.length ? sessions.map(s => {
            const sb = subj(s.subject), t = s.topicId ? topicById(s.topicId).name : s.kind === 'paper' ? s.paper : KINDS[s.kind].name;
            const state = s.done ? 'done' : past ? 'missed' : '';
            return `<span class="ritem ${state}" style="--sc:${sb.color}" title="${esc(sb.name)}: ${esc(t)}">${sb.emoji} ${KINDS[s.kind].emoji} ${esc(t)}${s.done ? ' ✓' : past ? ' ↪' : ''}</span>`;
          }).join('') : '<span class="muted small">Rest day 😴</span>'}
        </div>
      </div>`;
  },

  bind() {},
};
