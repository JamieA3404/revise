/* =========================================================================
   today.js — today's sessions, whether you're on track, countdowns.
   ========================================================================= */

const TodayView = {
  html() {
    ensurePlan();
    const k = todayKey(), st = S.settings;
    const list = todaySessions();
    const done = list.filter(s => s.done);
    const mins = list.reduce((a, s) => a + KINDS[s.kind].mins, 0);
    const minsDone = done.reduce((a, s) => a + KINDS[s.kind].mins, 0);
    const tr = trackStatus();
    const toMocks = daysBetween(k, st.mockStart), toFinals = daysBetween(k, st.examStart);
    const hour = new Date().getHours();
    const greet = (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + (st.name ? ', ' + esc(st.name) : '');
    const next = list.find(s => !s.done);
    const allDone = list.length && !next;

    const status = {
      on: `✅ <b>On track.</b> ${tr.learned} of ${tr.total} topics learned so far.`,
      close: `🟠 <b>Slightly behind (${tr.behind} topic${tr.behind > 1 ? 's' : ''}).</b> I've merged ${tr.behind > 1 ? 'them' : 'it'} into your next few days.`,
      behind: `🔴 <b>${tr.behind} topics behind.</b> They're spread over the coming days. One bonus session a day for a week will catch you up.`,
    }[tr.level];

    return `
      <section class="today-head">
        <div>
          <h1>${fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
          <p class="muted">${greet} 👋</p>
        </div>
        <div class="count-pills">
          <button class="pill pill-hype" data-act="hype">🎬 Hype me up</button>
          ${toMocks > 0 ? `<span class="pill pill-orange">📝 Mocks in <b>${toMocks}</b> days</span>` : ''}
          ${toFinals > 0 ? `<span class="pill pill-purple">🎯 Finals in <b>${toFinals}</b> days</span>` : ''}
        </div>
      </section>

      ${this.hype(toFinals)}

      <section class="card status status-${tr.level}">
        <p>${status}</p>
        ${S.plan.extraMins > 0 ? `<p class="small">⚠️ At your current daily time, not every topic fits before ${fmtDate(coverBy(), { day: 'numeric', month: 'long' })}. Add about <b>${S.plan.extraMins} min a day</b> in Settings to cover 100%.</p>` : `<p class="small muted">Every topic is planned in by ${fmtDate(S.plan.coveredOn || coverBy(), { day: 'numeric', month: 'long' })}.</p>`}
      </section>

      ${AI.key() ? '' : `<section class="card banner">
        <p>🔑 <b>Add your OpenAI key</b> to unlock written lessons, flashcards, tests, marking and feedback. Until then, sessions run in do-it-yourself mode.</p>
        <a class="btn btn-blue btn-sm" href="#settings">Add key</a></section>`}

      <section>
        <div class="section-head">
          <h2>Today · ${fmtMins(mins)}</h2>
          <span class="muted">${done.length}/${list.length} done · ${fmtMins(minsDone)}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${mins ? minsDone / mins * 100 : 0}%"></div></div>

        ${list.length ? `<ol class="sessions">${list.map((s, i) => this.row(s, i, s === next)).join('')}</ol>`
          : `<div class="card empty"><div class="empty-emoji">😴</div><p><b>Rest day.</b> Recharging is part of the plan.</p></div>`}

        ${allDone ? `
          <div class="card day-done">
            <div class="empty-emoji">🏆</div>
            <h2>Day complete!</h2>
            <p>Everything planned for today is done. Want to get ahead?</p>
            <button class="btn btn-white" data-act="bonus">⚡ Pull in tomorrow's first session</button>
          </div>` : ''}
      </section>`;
  },

  // A daily hype strip linking to the Future page
  hype(toFinals) {
    const m = moneyStatus();
    const lines = [
      'Every session today is a brick in the future you actually want.',
      'Top unis, a tech career, your own business. It starts with today\'s list.',
      'Future you is either thanking you or wishing you\'d started. Choose.',
      'Lock in now and the whole summer of 2027 is yours.',
      'The people who get everything they want did the boring reps first.',
    ];
    const line = lines[daysBetween('2026-01-01', todayKey()) % lines.length];
    return `<a class="hype-strip" href="#future">
      <span class="hs-line">🚀 ${line}</span>
      <span class="hs-money">💰 £${m.earned} / £${m.max} on course · ${toFinals > 0 ? toFinals + ' days to go' : 'exam season'}</span>
    </a>`;
  },

  row(s, i, isNext) {
    const sb = subj(s.subject), kd = KINDS[s.kind];
    const topic = s.topicId ? topicById(s.topicId) : null;
    const title = topic ? topic.name : s.kind === 'paper' ? s.paper : s.kind === 'mockreview' ? `Go through your ${sb.name} mock` : 'Push your NEA forward';
    const steps = STEPS[s.kind].map(x => x[1]).filter(x => x !== 'Results' && x !== 'Done').join(' → ');
    const inProgress = !s.done && s.step > 0;
    return `
      <li class="session ${s.done ? 'done' : ''} ${isNext ? 'is-next' : ''}" style="--sc:${sb.color}">
        <div class="s-num">${s.done ? '✓' : i + 1}</div>
        <div class="s-main">
          <div class="s-sub">${sb.emoji} ${esc(sb.name)} · ${kd.emoji} ${kd.name}${s.strengthen ? ' (strengthen)' : ''} · ${kd.mins} min</div>
          <div class="s-title">${esc(title)}</div>
          <div class="s-unlock">🔓 ${esc(unlockLine(s))}</div>
          <div class="s-steps">${s.done ? (s.result && s.result.score != null ? `Scored <b>${s.result.score}%</b>` : 'Done') : steps}</div>
        </div>
        <a class="btn ${s.done ? 'btn-white' : 'btn-green'} ${isNext ? '' : 'btn-sm'}" href="#session/${s.id}">${s.done ? 'Review' : inProgress ? 'Continue' : 'Start'}</a>
      </li>`;
  },

  bind(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'hype') return Cutscene.play();
      if (b.dataset.act === 'bonus') {
        const tomorrow = addDays(todayKey(), 1);
        const first = (S.plan.days[tomorrow] || []).shift();
        if (!first) return toast('Nothing planned tomorrow. Enjoy the rest!', '😴', 'blue');
        todaySessions().push(first);
        buildPlan();
        render();
        toast('Bonus session added. Future you says thanks', '⚡');
      }
    };
  },
};
