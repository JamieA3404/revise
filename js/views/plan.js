/* =========================================================================
   plan.js — your weekly timetable + weak topics list.
   ========================================================================= */

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun (JS uses 0 for Sunday)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// A sensible starting timetable — load it, then tweak to fit your life.
const STARTER_PLAN = {
  1: [['maths', 'questions'], ['biology', 'flashcards'], ['englit', 'braindump']],
  2: [['chemistry', 'flashcards'], ['geography', 'questions'], ['englang', 'questions']],
  3: [['physics', 'questions'], ['business', 'flashcards'], ['dit', 'braindump']],
  4: [['maths', 'flashcards'], ['biology', 'questions'], ['dt', 'nea']],
  5: [['chemistry', 'questions'], ['englit', 'flashcards']],
  6: [['maths', 'pastpaper'], ['physics', 'flashcards'], ['geography', 'braindump'], ['dt', 'nea']],
  0: [['business', 'questions'], ['englang', 'flashcards']],
};

const PlanView = {
  addingDay: null,       // weekday whose "add slot" form is open
  topicSubject: 'maths', // which subject's weak topics are showing

  html() {
    const today = new Date().getDay();
    const topics = S.topics[this.topicSubject] || [];
    const ragOrder = { red: 0, amber: 1, green: 2 };
    const sorted = [...topics].sort((a, b) => ragOrder[a.rag] - ragOrder[b.rag]);

    return `
      <div class="section-head">
        <h1>Weekly plan</h1>
        <div class="row wrap">
          <button class="btn btn-white btn-sm" data-act="starter">✨ Load starter plan</button>
          <button class="btn btn-blue btn-sm" data-act="refresh-today">↻ Update today from plan</button>
        </div>
      </div>
      <p class="muted">Whatever you put on a weekday appears on your Today checklist automatically every week.</p>

      <div class="week-grid">
        ${WEEKDAYS.map(wd => `
          <div class="day-col card ${wd === today ? 'is-today' : ''}">
            <div class="day-name">${DAY_NAMES[wd]}${wd === today ? ' <span class="chip chip-green">today</span>' : ''}</div>
            <ul class="slots">
              ${(S.timetable[wd] || []).map((sl, i) => {
                const s = subj(sl.subject), t = ttype(sl.type);
                return `<li class="slot" style="--sc:${s.color}">
                  <span class="slot-emoji">${s.emoji}</span>
                  <span class="slot-text"><b>${esc(s.name)}</b><small>${t.emoji} ${esc(sl.title || t.name)}</small></span>
                  <button class="icon-btn sm" data-act="del-slot" data-wd="${wd}" data-i="${i}" aria-label="Remove">✕</button>
                </li>`;
              }).join('') || '<li class="muted small">Rest day 😴</li>'}
            </ul>
            ${this.addingDay === wd ? `
              <form class="slot-form" data-form="slot" data-wd="${wd}">
                <select name="subject">${subjectOptions(this.lastSubject || 'maths')}</select>
                <select name="type">${typeOptions(this.lastType || 'flashcards')}</select>
                <input name="title" placeholder="Note (optional)" autocomplete="off">
                <div class="row"><button class="btn btn-green btn-sm" type="submit">Add</button>
                <button class="btn btn-white btn-sm" type="button" data-act="cancel-slot">Cancel</button></div>
              </form>` : `<button class="btn btn-white btn-sm btn-block" data-act="add-slot" data-wd="${wd}">＋ Add</button>`}
          </div>`).join('')}
      </div>

      <div class="section-head" id="topics">
        <h1>Weak topics 🎯</h1>
      </div>
      <p class="muted">After your mocks, add the topics that cost you marks. Tap the dot to rate it 🔴 → 🟠 → 🟢. Turning one green earns <b>+30 XP</b>.</p>

      <div class="subject-chips">
        ${SUBJECTS.map(s => {
          const n = (S.topics[s.id] || []).filter(t => t.rag !== 'green').length;
          return `<button class="chip-btn ${s.id === this.topicSubject ? 'on' : ''}" data-act="topic-subj" data-s="${s.id}" style="--sc:${s.color}">
            ${s.emoji} ${esc(s.name)}${n ? ` <span class="count-badge">${n}</span>` : ''}</button>`;
        }).join('')}
      </div>

      <div class="card">
        <form class="row" data-form="topic">
          <input name="name" placeholder="Add a ${esc(subj(this.topicSubject).name)} topic, e.g. ${this.topicExample()}" autocomplete="off" required>
          <button class="btn btn-green" type="submit">Add</button>
        </form>
        <ul class="topics">
          ${sorted.map(t => `
            <li class="topic rag-${t.rag}">
              <button class="rag-dot" data-act="rag" data-id="${t.id}" aria-label="Change confidence (currently ${t.rag})"></button>
              <span class="topic-name">${esc(t.name)}</span>
              <select data-topic-type="${t.id}" aria-label="Task type">${typeOptions('questions')}</select>
              <button class="btn btn-blue btn-sm" data-act="topic-task" data-id="${t.id}">＋ Today</button>
              <button class="icon-btn sm" data-act="del-topic" data-id="${t.id}" aria-label="Delete topic">✕</button>
            </li>`).join('') || '<li class="muted small">No weak topics here yet. Nice — or add some after mocks!</li>'}
        </ul>
      </div>`;
  },

  topicExample() {
    return { maths: 'Vectors', englang: 'Paper 1 Q5 structure', englit: 'Macbeth quotes', physics: 'Specific heat capacity',
      chemistry: 'Moles', biology: 'Hormones', geography: 'Coastal landforms', business: 'Break-even',
      dit: 'Cyber security threats', dt: 'Smart materials' }[this.topicSubject] || 'Something tricky';
  },

  bind(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const wd = Number(b.dataset.wd);
      switch (b.dataset.act) {
        case 'add-slot': this.addingDay = wd; render(); break;
        case 'cancel-slot': this.addingDay = null; render(); break;
        case 'del-slot': S.timetable[wd].splice(Number(b.dataset.i), 1); save(); render(); break;
        case 'starter': {
          const hasAny = WEEKDAYS.some(d => S.timetable[d]?.length);
          if (hasAny && !confirm('Replace your current weekly plan with the starter plan?')) return;
          for (const d of WEEKDAYS) S.timetable[d] = STARTER_PLAN[d].map(([subject, type]) => ({ subject, type, title: '' }));
          save(); refreshToday(); render();
          toast('Starter plan loaded. Today\'s list is ready!', '✨');
          break;
        }
        case 'refresh-today': refreshToday(); render(); toast('Today now matches your plan', '↻', 'blue'); break;
        case 'topic-subj': this.topicSubject = b.dataset.s; render(); break;
        case 'rag': {
          const t = this.topic(b.dataset.id);
          t.rag = { red: 'amber', amber: 'green', green: 'red' }[t.rag];
          if (t.rag === 'green' && !t.wasGreen) {
            t.wasGreen = true; S.topicsFixed = (S.topicsFixed || 0) + 1;
            const r = b.getBoundingClientRect();
            Sfx.ding(); Confetti.burst(r.left + r.width / 2, r.top, 40);
            grant(30, 5, { x: r.left, y: r.top });
            toast('Weak topic conquered!', '🟢');
            checkBadges();
          }
          save(); render();
          break;
        }
        case 'topic-task': {
          const t = this.topic(b.dataset.id);
          const type = root.querySelector(`[data-topic-type="${t.id}"]`).value;
          ensureDay(todayKey()).tasks.push(makeTask({ subject: this.topicSubject, type, title: t.name, source: 'topic' }));
          save();
          toast(`"${t.name}" added to today`, '🎯', 'blue');
          break;
        }
        case 'del-topic':
          S.topics[this.topicSubject] = S.topics[this.topicSubject].filter(t => t.id !== b.dataset.id);
          save(); render(); break;
      }
    };
    root.onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (e.target.dataset.form === 'slot') {
        const wd = Number(e.target.dataset.wd);
        this.lastSubject = f.get('subject'); this.lastType = f.get('type');
        S.timetable[wd].push({ subject: f.get('subject'), type: f.get('type'), title: f.get('title').trim() });
        this.addingDay = null;
      } else if (e.target.dataset.form === 'topic') {
        const name = f.get('name').trim();
        if (!name) return;
        (S.topics[this.topicSubject] ||= []).push({ id: uid(), name, rag: 'red' });
      }
      save(); render();
      // Keep typing topics quickly: put the cursor back in the box
      if (e.target.dataset.form === 'topic') $('[data-form="topic"] input')?.focus();
    };
  },

  topic(id) { return (S.topics[this.topicSubject] || []).find(t => t.id === id); },
};

/* Make today's checklist match the plan, keeping anything done or added by hand */
function refreshToday() {
  const k = todayKey(), day = ensureDay(k);
  day.tasks = day.tasks.filter(t => t.done || t.source !== 'plan');
  const wd = fromKey(k).getDay();
  for (const sl of S.timetable[wd] || []) {
    const already = day.tasks.some(t => t.source === 'plan' && t.subject === sl.subject && t.type === sl.type && t.title === sl.title);
    if (!already) day.tasks.push(makeTask({ ...sl, source: 'plan' }));
  }
  save();
}
