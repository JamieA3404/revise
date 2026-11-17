/* =========================================================================
   mastery.js (view) — how strong you are in every topic, estimated grade
   and chance of a 9 per subject, and your marked past papers.
   ========================================================================= */

const MasteryView = {
  open: null, // which subject is expanded

  html() {
    const tr = trackStatus();
    const tested = allTopics().filter(t => strength(t.id) != null).length;
    return `
      <h1>Mastery</h1>
      <section class="card">
        <div class="big-stats">
          <div><b>${tr.learned}/${tr.total}</b><span>topics learned</span></div>
          <div><b>${tested}</b><span>topics tested</span></div>
          <div><b>${S.papers.length}</b><span>papers marked</span></div>
        </div>
        <p class="muted small">Estimates use only the work you've done in Revise. Untested topics count as 45%, so the estimates get more accurate as you test more topics. Grade boundaries vary by year, so treat these as a guide, not a promise.</p>
      </section>

      <div class="subjects">
        ${SUBJECTS.map(s => this.subjectCard(s)).join('')}
      </div>

      ${S.papers.length ? `
        <h2 class="mt">Marked papers</h2>
        <section class="card"><table class="qtable">
          <tr><th>Date</th><th>Paper</th><th>Score</th><th>Grade</th></tr>
          ${S.papers.slice().reverse().map(p => `<tr><td>${fmtDate(p.date)}</td><td>${subj(p.subject).emoji} ${esc(p.name)}</td><td>${p.percent}%</td><td>${p.grade ?? '–'}</td></tr>`).join('')}
        </table></section>` : ''}`;
  },

  subjectCard(s) {
    const e = subjectEstimate(s.id);
    const isOpen = this.open === s.id;
    const topics = topicList(s.id);
    return `
      <section class="card subject-card" style="--sc:${s.color}">
        <button class="subject-head" data-act="toggle" data-s="${s.id}" aria-expanded="${isOpen}">
          <span class="sh-emoji">${s.emoji}</span>
          <span class="sh-main">
            <b>${esc(s.name)}</b>
            <span class="bar"><span class="bar-fill" style="width:${e.coverage}%;background:${s.color}"></span></span>
            <span class="muted small">${e.learned}/${e.count} topics learned · ${e.tested} tested</span>
          </span>
          <span class="sh-grade ${e.enoughData ? '' : 'dim-grade'}">
            <b>${e.enoughData ? e.grade : '?'}</b><small>${e.enoughData ? e.p9 + '% for a 9' : 'need data'}</small>
          </span>
        </button>
        ${isOpen ? `
          <div class="topic-rows">
            ${s.id === 'maths' ? '<p class="muted small">"Appears" is Revise\'s estimate of how likely a topic is to come up across the three Higher papers, based on past-paper patterns. Topics are planned in that order.</p>' : ''}
            ${topics.map(t => {
              const st = strength(t.id), m = S.mastery[t.id];
              return `<div class="trow">
                <div class="trow-name">${esc(t.name)}
                  <span class="muted small">${s.id === 'maths' ? `appears ~${t.freq}% · ` : ''}${m && m.last ? 'last ' + fmtDate(m.last) : 'not started'}</span></div>
                <div class="trow-bar"><span class="bar"><span class="bar-fill" style="width:${st || 0}%;background:${st == null ? 'transparent' : st >= 80 ? 'var(--green)' : st >= 55 ? 'var(--orange)' : 'var(--red)'}"></span></span>
                  <span class="small"><b>${st == null ? '–' : st + '%'}</b>${st == null ? '' : ` · 9-ready ${nineChance(st)}%`}</span></div>
                <button class="btn btn-white btn-sm" data-act="study" data-t="${t.id}">Study now</button>
              </div>`;
            }).join('')}
            <div class="row wrap mt">
              <button class="btn btn-blue" data-act="paper" data-s="${s.id}">📝 Mark a past paper</button>
              <button class="btn btn-white" data-act="mock" data-s="${s.id}">🔍 Mark a mock</button>
            </div>
          </div>` : ''}
      </section>`;
  },

  bind(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'toggle') { this.open = this.open === b.dataset.s ? null : b.dataset.s; render(); return; }
      // Add an extra session to today and open it
      let s;
      if (a === 'study') {
        const t = topicById(b.dataset.t);
        s = newSession('learn', t.subject, { topicId: t.id, strengthen: !!(S.mastery[t.id] && S.mastery[t.id].learned), extra: true });
      } else if (a === 'paper') {
        const n = S.paperNo[b.dataset.s] || 0;
        s = newSession('paper', b.dataset.s, { paper: PAPERS[b.dataset.s][n % PAPERS[b.dataset.s].length], series: '', extra: true });
      } else if (a === 'mock') {
        s = newSession('mockreview', b.dataset.s, { paper: PAPERS[b.dataset.s][0], extra: true });
      }
      if (s) { todaySessions().push(s); save(); location.hash = 'session/' + s.id; }
    };
  },
};
