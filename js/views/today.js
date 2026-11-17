/* =========================================================================
   today.js — the Today page: countdowns, daily goal, checklist.
   Each view has html() which returns the page HTML, and bind(root)
   which wires up the buttons (using data-act="..." attributes).
   ========================================================================= */

const TodayView = {
  adding: false,   // is the "add a task" form open?

  html() {
    const k = todayKey();
    const day = ensureDay(k);
    const tasks = liveTasks(day);
    const done = tasks.filter(t => t.done).length;
    const left = tasks.length - done;
    const mins = focusMinutesOn(k);
    const pct = tasks.length ? done / tasks.length : 0;
    const st = S.settings;
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const next = tasks.find(t => !t.done);
    const streak = streakInfo();

    // Leftovers from yesterday that haven't been dealt with
    const yk = addDays(k, -1), yday = S.days[yk];
    const leftovers = yday && !yday.leftoversHandled ? liveTasks(yday).filter(t => !t.done) : [];

    return `
      <section class="hero card">
        <div class="hero-text">
          <h1>${greet}${st.name ? ', ' + esc(st.name) : ''} 👋</h1>
          <p class="muted">${esc(dailyMotivation())}</p>
          ${!streak.todayDone && streak.current > 0
            ? `<p class="streak-warn">🔥 Your ${streak.current}-day streak is waiting. One task keeps it alive!</p>` : ''}
          <div class="hero-actions">
            <button class="btn btn-green btn-big" data-act="start-next">
              ▶ ${next ? 'Start: ' + esc(subj(next.subject).name) : 'Start a focus session'}
            </button>
            <button class="btn btn-white" data-act="just5" title="Can't get going? Just do 5 minutes.">⏱ Just 5 mins</button>
          </div>
        </div>
        ${ring(pct, done, tasks.length)}
      </section>

      ${countdowns()}

      ${leftovers.length ? `
        <section class="banner card">
          <div><b>${leftovers.length} task${leftovers.length > 1 ? 's' : ''} left over from yesterday.</b>
          <span class="muted">Bring ${leftovers.length > 1 ? 'them' : 'it'} into today?</span></div>
          <div class="row">
            <button class="btn btn-blue btn-sm" data-act="bring-leftovers">↪ Bring over</button>
            <button class="btn btn-white btn-sm" data-act="skip-leftovers">Skip</button>
          </div>
        </section>` : ''}

      <section>
        <div class="section-head">
          <h2>Today's mission</h2>
          <span class="muted">${fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtMins(mins)} focused</span>
        </div>

        ${tasks.length ? `<ul class="tasks">${tasks.map(t => this.taskRow(t)).join('')}</ul>` : `
          <div class="empty card">
            <div class="empty-emoji">🗓️</div>
            <p><b>No tasks yet today.</b><br>Add a one-off task below, or set up your weekly plan so tasks appear automatically every day.</p>
            <a class="btn btn-blue" href="#plan">Set up my weekly plan</a>
          </div>`}

        ${this.adding ? `
          <form class="add-form card" data-form="add">
            <select name="subject" aria-label="Subject">${subjectOptions(this.lastSubject || 'maths')}</select>
            <select name="type" aria-label="Task type">${typeOptions(this.lastType || 'flashcards')}</select>
            <input name="title" placeholder="What exactly? e.g. Cell biology (optional)" autocomplete="off">
            <div class="row">
              <button class="btn btn-green" type="submit">Add task</button>
              <button class="btn btn-white" type="button" data-act="cancel-add">Cancel</button>
            </div>
          </form>` : `
          <div class="row wrap">
            <button class="btn btn-white" data-act="open-add">＋ Add a task for today</button>
            ${left > 0 ? `<button class="btn btn-white" data-act="carry">↪ Push ${left} unfinished to tomorrow</button>` : ''}
          </div>`}
      </section>`;
  },

  taskRow(t) {
    const s = subj(t.subject), ty = ttype(t.type);
    return `
      <li class="task ${t.done ? 'done' : ''}" style="--sc:${s.color}">
        <button class="check" data-act="toggle" data-id="${t.id}" aria-label="${t.done ? 'Untick' : 'Tick off'} ${esc(s.name)}">
          <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </button>
        <div class="task-icon">${s.emoji}</div>
        <div class="task-main">
          <div class="task-title">${esc(s.name)}</div>
          <div class="task-meta">
            <span class="chip">${ty.emoji} ${esc(taskLabel(t))}</span>
            ${t.title ? `<span class="chip chip-soft">${ty.name}</span>` : ''}
            ${t.source === 'carry' ? '<span class="chip chip-soft">↪ carried</span>' : ''}
            ${t.source === 'topic' ? '<span class="chip chip-soft">🎯 weak topic</span>' : ''}
            <span class="xp-chip">${t.done ? '✓ ' : '+'}${ty.xp} XP</span>
          </div>
        </div>
        ${t.done ? '' : `<button class="icon-btn play" data-act="focus" data-id="${t.id}" aria-label="Focus on this task">▶</button>`}
        <button class="icon-btn" data-act="delete" data-id="${t.id}" aria-label="Remove task">✕</button>
      </li>`;
  },

  bind(root) {
    const k = todayKey();
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.dataset.id, day = ensureDay(k);
      switch (b.dataset.act) {
        case 'toggle': {
          const t = findTask(k, id);
          setTaskDone(k, id, !t.done, b);
          render();
          // Replay the "pop" on the freshly drawn tick
          if (t.done) $(`.check[data-id="${id}"]`)?.classList.add('pop');
          break;
        }
        case 'focus': Focus.open(id); break;
        case 'start-next': {
          const next = liveTasks(day).find(t => !t.done);
          Focus.open(next ? next.id : null);
          break;
        }
        case 'just5': {
          const next = liveTasks(day).find(t => !t.done);
          Focus.open(next ? next.id : null, 5);
          break;
        }
        case 'delete': {
          const t = findTask(k, id);
          if (t.done && !confirm('Remove a task you already finished? Its XP will be taken back.')) return;
          if (t.done) grant(-t.xp, -5);
          day.tasks = day.tasks.filter(x => x.id !== id);
          save(); render();
          break;
        }
        case 'open-add': this.adding = true; render(); $('[name="title"]')?.focus(); break;
        case 'cancel-add': this.adding = false; render(); break;
        case 'carry': {
          const tomorrow = addDays(k, 1);
          const n = moveUnfinished(k, tomorrow);
          render();
          toast(`Moved ${n} task${n > 1 ? 's' : ''} to tomorrow. Rest up 💪`, '↪', 'blue');
          break;
        }
        case 'bring-leftovers': {
          const yk = addDays(k, -1);
          const n = moveUnfinished(yk, k);
          S.days[yk].leftoversHandled = true; save();
          render();
          toast(`${n} task${n > 1 ? 's' : ''} added to today`, '↪', 'blue');
          break;
        }
        case 'skip-leftovers': S.days[addDays(k, -1)].leftoversHandled = true; save(); render(); break;
      }
    };
    root.onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      this.lastSubject = f.get('subject'); this.lastType = f.get('type');
      ensureDay(k).tasks.push(makeTask({ subject: f.get('subject'), type: f.get('type'), title: f.get('title').trim() }));
      save();
      this.adding = false;
      render();
      toast('Task added — you\'ve got this', '📌', 'blue');
    };
  },
};

/* Move unfinished tasks from one day to another (marks the old ones as moved) */
function moveUnfinished(fromKey, toKey) {
  const from = S.days[fromKey], to = ensureDay(toKey);
  const undone = liveTasks(from).filter(t => !t.done);
  for (const t of undone) {
    t.moved = true;
    to.tasks.push(makeTask({ subject: t.subject, type: t.type, title: t.title, source: 'carry' }));
  }
  save();
  return undone.length;
}

/* Circular progress ring for today's tasks */
function ring(pct, done, total) {
  const r = 52, c = 2 * Math.PI * r;
  const label = total === 0 ? '—' : done === total ? '🏆' : `${done}/${total}`;
  return `
    <div class="ring ${total && done === total ? 'ring-done' : ''}">
      <svg viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="${r}"/>
        <circle class="ring-fg" cx="60" cy="60" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/>
      </svg>
      <div class="ring-label"><b>${label}</b><span>${total && done === total ? 'cleared!' : 'tasks'}</span></div>
    </div>`;
}

/* The two countdown cards (mocks + finals) */
function countdowns() {
  const st = S.settings, k = todayKey();
  const card = (colour, emoji, title, start, end, after) => {
    const toStart = daysBetween(k, start), toEnd = daysBetween(k, end);
    let big, small;
    if (toStart > 0) { big = toStart; small = `day${toStart === 1 ? '' : 's'} until ${title}`; }
    else if (toEnd >= 0) { big = '🔥'; small = `${title} — happening now. You've got this!`; }
    else { big = '✓'; small = after; }
    return `
      <div class="count card card-${colour}">
        <div class="count-emoji">${emoji}</div>
        <div><div class="count-big">${big}</div><div class="count-small">${small}</div>
        ${toStart > 0 ? `<div class="count-date">${fmtDate(start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>` : ''}</div>
      </div>`;
  };
  return `<section class="counts">
    ${card('orange', '📝', 'mocks', st.mockStart, st.mockEnd, 'Mocks done! Add your weak topics.')}
    ${card('purple', '🎯', 'final exams', st.examStart, st.examEnd, 'EXAMS OVER. Enjoy summer 🎉')}
  </section>`;
}
