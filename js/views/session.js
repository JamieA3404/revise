/* =========================================================================
   session.js — a single revision session, step by step.

     📘 Learn & test : Learn → Brain dump → Flashcards → Test → Results
     🔁 Quick review : Flashcards → Quiz → Results
     📝 Past paper   : Get the paper → Upload & mark → Results
     🔍 Mock debrief : Your mock → Upload & mark → Results
     🛠️ NEA          : Plan & work → Done

   Progress is saved inside the session (s.step, s.work), so you can leave
   and come back. Without an API key, each step falls back to a simple
   do-it-yourself version.
   ========================================================================= */

const STEPS = {
  learn:      [['learn', 'Learn'], ['dump', 'Brain dump'], ['cards', 'Flashcards'], ['test', 'Test'], ['done', 'Results']],
  review:     [['cards', 'Flashcards'], ['quiz', 'Quiz'], ['done', 'Results']],
  paper:      [['get', 'Get the paper'], ['upload', 'Upload & mark'], ['done', 'Results']],
  mockreview: [['get', 'Your mock'], ['upload', 'Upload & mark'], ['done', 'Results']],
  nea:        [['nea', 'Plan & work'], ['done', 'Done']],
};

// Show AI text safely, keeping line breaks
const fmt = t => esc(t).replace(/\n/g, '<br>');
const list = (arr, cls = '') => `<ul class="${cls}">${(arr || []).map(x => `<li>${fmt(x)}</li>`).join('')}</ul>`;
const lessonFor = topic => AI.cacheGet('lesson:' + topic.id + ':' + topic.name);
const searchLink = q => 'https://www.google.com/search?q=' + encodeURIComponent(q);

const SessionView = {
  ui: {}, // temporary screen state (loading, flashcard position...) — not saved

  current() {
    const id = location.hash.split('/')[1];
    const f = id && S.plan && findSession(id);
    return f ? f.s : null;
  },

  html() {
    const s = this.current();
    if (!s) return `<div class="card empty"><p>That session isn't in your roadmap any more.</p><a class="btn btn-blue" href="#today">Back to today</a></div>`;
    if (this.ui.id !== s.id) this.ui = { id: s.id };
    s.work ||= {};
    s.step ||= 0;
    const steps = STEPS[s.kind];
    const stepId = steps[Math.min(s.step, steps.length - 1)][0];
    const topic = s.topicId ? topicById(s.topicId) : null;
    const sb = subj(s.subject), kind = KINDS[s.kind];
    const title = topic ? topic.name : s.kind === 'paper' ? s.paper : s.kind === 'mockreview' ? `${sb.name} mock` : 'NEA session';

    return `
      <div class="session-head">
        <a href="#today" class="back">← Today</a>
        <button class="btn btn-white btn-sm" data-act="timer">⏱ Focus timer</button>
      </div>
      <section class="card session-title" style="--sc:${sb.color}">
        <div class="st-emoji">${sb.emoji}</div>
        <div><div class="small upper">${esc(sb.name)} · ${kind.emoji} ${kind.name}${s.strengthen ? ' (strengthen)' : ''} · ${kind.mins} min</div>
        <h1>${esc(title)}</h1></div>
      </section>
      <ol class="stepper">
        ${steps.map(([, name], i) => `<li class="${i < s.step ? 'done' : i === s.step ? 'now' : ''}"><span>${i < s.step ? '✓' : i + 1}</span>${name}</li>`).join('')}
      </ol>
      ${this.ui.error ? `<div class="card error-card"><b>Something went wrong:</b> ${esc(this.ui.error)}
        <div class="row"><button class="btn btn-blue btn-sm" data-act="retry">Try again</button></div></div>` : ''}
      ${this.ui.error ? '' : this.ui.busy ? this.loading(this.ui.busy) : this['step_' + stepId](s, topic)}`;
  },

  loading(text) {
    return `<div class="card loading"><div class="spinner"></div><p><b>${esc(text)}</b><br><span class="muted small">This usually takes 10–40 seconds.</span></p></div>`;
  },
  next(label = 'Next') { return `<div class="next-row"><button class="btn btn-green btn-big" data-act="next">${label} →</button></div>`; },

  /* ======================= LEARN ======================= */
  step_learn(s, topic) {
    const L = lessonFor(topic);
    if (!L) {
      if (AI.key()) return this.loading('Writing your lesson on ' + topic.name + '…');
      return `
        <section class="card">
          <h2>Your steps (no AI key: do-it-yourself mode)</h2>
          <ol class="guide">
            <li>Open your revision guide or class notes on <b>${esc(topic.name)}</b>. <span>10 min</span></li>
            <li>Write 6–8 bullet points of the key facts, in your own words.</li>
            <li>Do one exam-style question on it and check the mark scheme.</li>
          </ol>
          <a class="btn btn-white btn-sm" target="_blank" rel="noopener" href="${searchLink('BBC Bitesize ' + subj(s.subject).board + ' ' + topic.name)}">🔎 Find notes on this topic</a>
          <p class="muted small">Add your OpenAI key in Settings and this step becomes a full lesson, written for you.</p>
        </section>${this.next('Brain dump')}`;
    }
    const ex = L.workedExample || {};
    return `
      <section class="card">
        <h2>🎯 ${fmt(L.goal)}</h2>
        <ol class="guide">
          <li>Read the key points carefully. Say them out loud. <span>8 min</span></li>
          <li>Copy the ✏️ list into your notes and tick each one off. <span>5 min</span></li>
          <li>Try the worked example yourself <i>before</i> revealing it. <span>5 min</span></li>
          <li>Then brain dump, flashcards and the end-of-topic test. <span>12 min</span></li>
        </ol>
      </section>
      <section class="card"><h3>Key points</h3>${list(L.keyPoints, 'points')}</section>
      <section class="card note-card"><h3>✏️ Note these down</h3>
        <ul class="checklist">${(L.noteDown || []).map((x, i) => `<li><label><input type="checkbox"> <span>${fmt(x)}</span></label></li>`).join('')}</ul>
      </section>
      ${ex.question ? `<section class="card"><h3>Worked example</h3>
        <p class="question">${fmt(ex.question)}</p>
        <details class="reveal"><summary>Try it first, then tap to reveal</summary>
          <ol class="steps">${(ex.steps || []).map(x => `<li>${fmt(x)}</li>`).join('')}</ol>
          ${ex.answer ? `<p><b>Answer:</b> ${fmt(ex.answer)}</p>` : ''}
        </details></section>` : ''}
      <section class="two-col">
        <div class="card"><h3>⚠️ Common mistakes</h3>${list(L.commonMistakes)}</div>
        <div class="card"><h3>⭐ Grade 9 tips</h3>${list(L.grade9Tips)}</div>
      </section>
      ${this.next('I\'ve made my notes: brain dump')}`;
  },

  /* ======================= BRAIN DUMP ======================= */
  step_dump(s, topic) {
    const L = lessonFor(topic);
    const prompt = (L && L.brainDumpPrompt) || `Write down everything you can remember about ${topic.name}: facts, key words, examples. No looking!`;
    const d = s.work.dump || {};
    if (d.fb) {
      const f = d.fb;
      return `
        <section class="card result-card">
          <div class="score-big ${f.score >= 80 ? 'good' : f.score >= 55 ? 'ok' : 'low'}">${f.score}%</div>
          <p>${fmt(f.tip || '')}</p>
        </section>
        <section class="two-col">
          ${f.good?.length ? `<div class="card fb-good"><h3>✅ You got</h3>${list(f.good)}</div>` : ''}
          ${f.missing?.length ? `<div class="card fb-missing"><h3>➕ Missing</h3>${list(f.missing)}</div>` : ''}
        </section>
        ${f.wrong?.length ? `<section class="card fb-wrong"><h3>❌ Fix these</h3>${list(f.wrong)}</section>` : ''}
        ${f.modelAnswer ? `<section class="card"><details class="reveal" open><summary>Grade 9 version</summary><p>${fmt(f.modelAnswer)}</p></details></section>` : ''}
        <p class="muted small">Add anything you missed to your notes now. That's how it sticks.</p>
        ${this.next('Flashcards')}`;
    }
    return `
      <form class="card" data-form="dump">
        <h2>🧠 Brain dump: from memory, no notes</h2>
        <p class="question">${fmt(prompt)}</p>
        <textarea name="text" rows="9" placeholder="Type everything you remember…" required>${esc(d.text || '')}</textarea>
        ${AI.key()
          ? '<button class="btn btn-green btn-big btn-block" type="submit">Check my brain dump</button>'
          : `<p class="small"><b>Now check against your notes.</b> How much did you get?</p>
             <div class="row wrap">${[20, 40, 60, 80, 100].map(v => `<button class="btn btn-white btn-sm" type="button" data-act="self-dump" data-v="${v}">${v}%</button>`).join('')}</div>`}
      </form>`;
  },

  /* ======================= FLASHCARDS ======================= */
  step_cards(s, topic) {
    const c = s.work.cards;
    if (c) return `
      <section class="card result-card">
        <div class="score-big ${c.known / c.total >= 0.8 ? 'good' : 'ok'}">${c.known}/${c.total}</div>
        <p>knew first time. The ones you missed will come back in future reviews.</p>
      </section>${this.next(s.kind === 'learn' ? 'End-of-topic test' : 'Quick quiz')}`;
    const L = lessonFor(topic);
    if (!L) {
      if (AI.key()) return this.loading('Making flashcards for ' + topic.name + '…');
      return `<section class="card"><h2>🃏 Flashcards</h2>
        <p>Make 8 flashcards on <b>${esc(topic.name)}</b> (question on the front, answer on the back), then test yourself twice.</p>
        <p class="small">How many did you know first time, out of 8?</p>
        <div class="row wrap">${[2, 4, 6, 8].map(v => `<button class="btn btn-white btn-sm" data-act="self-cards" data-v="${v}">${v}/8</button>`).join('')}</div></section>`;
    }
    const cards = L.flashcards || [];
    const ui = this.ui;
    if (!ui.queue) { ui.queue = cards.map((_, i) => i); ui.first = {}; ui.flipped = false; }
    const i = ui.queue[0];
    const doneCount = cards.length - new Set(ui.queue).size;
    return `
      <section class="flash-wrap">
        <div class="muted small center-text">Card ${Math.min(doneCount + 1, cards.length)} of ${cards.length}${ui.queue.length > cards.length - doneCount ? ' · retrying missed cards' : ''}</div>
        <button class="flashcard ${ui.flipped ? 'flipped' : ''}" data-act="flip">
          <div class="fc-label">${ui.flipped ? 'Answer' : 'Question'}</div>
          <div class="fc-text">${fmt(ui.flipped ? cards[i].a : cards[i].q)}</div>
          ${ui.flipped ? '' : '<div class="fc-hint">Say your answer, then tap to flip</div>'}
        </button>
        ${ui.flipped ? `<div class="row center">
          <button class="btn btn-red btn-big" data-act="card-no">✗ Not yet</button>
          <button class="btn btn-green btn-big" data-act="card-yes">✓ Got it</button>
        </div>` : ''}
      </section>`;
  },

  /* ======================= TEST / QUIZ ======================= */
  step_test(s, topic) { return this.testStep(s, topic, { mcq: 6, written: 2 }); },
  step_quiz(s, topic) { return this.testStep(s, topic, { mcq: 5, written: 0 }); },

  testStep(s, topic, shape) {
    const t = s.work.test;
    if (!t) {
      if (AI.key()) return this.loading('Writing your test on ' + topic.name + '…');
      return `<section class="card"><h2>📝 Exam questions</h2>
        <p>Find 3–5 exam questions on <b>${esc(topic.name)}</b>, answer them, then mark them with the mark scheme.</p>
        <a class="btn btn-white btn-sm" target="_blank" rel="noopener" href="${searchLink(subj(s.subject).board + ' ' + topic.name + ' exam questions mark scheme')}">🔎 Find exam questions</a>
        <p class="small">What % did you score?</p>
        <div class="row wrap">${[20, 40, 60, 80, 100].map(v => `<button class="btn btn-white btn-sm" data-act="self-test" data-v="${v}">${v}%</button>`).join('')}</div></section>`;
    }
    const D = t.data;
    if (!t.submitted) return `
      <form data-form="test">
        <section class="card"><h2>Multiple choice</h2>
          ${D.mcq.map((q, qi) => `
            <div class="mcq">
              <p class="question"><b>${qi + 1}.</b> ${fmt(q.q)}</p>
              <div class="opts">${q.options.map((o, oi) => `
                <label class="opt"><input type="radio" name="mcq${qi}" value="${oi}" required><span>${'ABCD'[oi]}</span> ${fmt(o)}</label>`).join('')}</div>
            </div>`).join('')}
        </section>
        ${D.written.length ? `<section class="card"><h2>Exam questions</h2>
          ${D.written.map((q, wi) => `
            <div class="written">
              <p class="question"><b>${D.mcq.length + wi + 1}.</b> ${fmt(q.q)} <span class="marks">[${q.marks} marks]</span></p>
              <textarea name="w${wi}" rows="6" placeholder="Write your answer, showing working…"></textarea>
            </div>`).join('')}
        </section>` : ''}
        <div class="next-row"><button class="btn btn-green btn-big" type="submit">Submit for marking</button></div>
      </form>`;

    // Marked
    const mcqRight = D.mcq.filter((q, i) => Number(t.mcqAns[i]) === q.answer).length;
    const M = t.marked;
    return `
      <section class="card"><h2>Multiple choice: ${mcqRight}/${D.mcq.length}</h2>
        ${D.mcq.map((q, qi) => {
          const ok = Number(t.mcqAns[qi]) === q.answer;
          return `<div class="mcq marked ${ok ? 'right' : 'wrong'}">
            <p class="question">${ok ? '✅' : '❌'} ${fmt(q.q)}</p>
            ${ok ? '' : `<p class="small">You said <b>${fmt(q.options[t.mcqAns[qi]] ?? '—')}</b>. Correct: <b>${fmt(q.options[q.answer])}</b></p>`}
            <p class="small muted">${fmt(q.explain || '')}</p></div>`;
        }).join('')}
      </section>
      ${M ? `<section class="card"><h2>Exam questions</h2>
        ${D.written.map((q, wi) => {
          const raw = (M.results || M.questions || [])[wi] || {};
          const r = { marks: raw.marks ?? raw.awarded ?? raw.score ?? 0, feedback: raw.feedback || raw.comment || raw.reason || '', improve: raw.improve || raw.improvement || '' };
          return `<div class="written marked">
            <p class="question">${fmt(q.q)} <span class="marks ${r.marks >= q.marks ? 'full' : ''}">${r.marks ?? 0}/${q.marks}</span></p>
            <p class="small"><b>Your answer:</b> ${fmt(t.writtenAns[wi] || '(blank)')}</p>
            <p>${fmt(r.feedback || '')}</p>
            ${r.improve ? `<p class="improve">💡 ${fmt(r.improve)}</p>` : ''}
            <details class="reveal"><summary>Mark scheme</summary>${list(q.markScheme)}</details>
          </div>`;
        }).join('')}
        ${M.summary ? `<p><b>${fmt(M.summary)}</b></p>` : ''}
        ${M.nextFocus ? `<p class="improve">🎯 Next focus: ${fmt(M.nextFocus)}</p>` : ''}
      </section>` : ''}
      ${this.next('See my results')}`;
  },

  /* ======================= PAST PAPER / MOCK ======================= */
  step_get(s) {
    const sb = subj(s.subject);
    if (s.kind === 'mockreview') return `
      <section class="card">
        <h2>🔍 Get your ${esc(sb.name)} mock back</h2>
        <ol class="guide">
          <li>Get your marked mock paper(s) back from your teacher.</li>
          <li>Photograph every page clearly, flat and in good light, or scan them to a PDF.</li>
          <li>Upload them on the next step. They'll be marked question by question, mapped to topics, and your roadmap will then put your weakest topics first.</li>
        </ol>
        <label class="field"><span>Which paper?</span>
          <select data-act="set-paper">${PAPERS[s.subject].map(p => `<option ${s.paper === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
        <p class="muted small">No mock back yet? Leave this session. It'll stay on your roadmap.</p>
      </section>${this.next('Upload my mock')}`;
    return `
      <section class="card">
        <h2>📝 ${esc(s.paper)}</h2>
        <p class="muted">${esc(sb.board)} · ${esc(s.series || 'any recent series')}</p>
        <div class="links">${paperLinks(s.subject, s.paper, s.series || '').map(l =>
          `<a class="btn btn-white btn-sm" target="_blank" rel="noopener" href="${l.url}">⬇ ${esc(l.label)}</a>`).join('')}</div>
        <ol class="guide">
          <li>Download the <b>question paper</b> and the <b>mark scheme</b>. Don't look at the mark scheme yet!</li>
          <li>Do the paper in exam conditions: timed, no notes, phone away. <span>~90 min</span></li>
          <li>Write on the printout, or annotate the PDF on your iPad.</li>
          <li>Photograph every page (or save the PDF), then upload it on the next step to get it marked.</li>
        </ol>
        <div class="field-row">
          <label class="field"><span>Paper</span><select data-act="set-paper">${PAPERS[s.subject].map(p => `<option ${s.paper === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
          <label class="field"><span>Series (year)</span><input data-act="set-series" value="${esc(s.series || '')}" placeholder="e.g. June 2023"></label>
        </div>
        <button class="btn btn-orange" data-act="paper-timer">⏱ Start a 90-minute exam timer</button>
      </section>${this.next('I\'ve finished: upload it')}`;
  },

  step_upload(s) {
    const n = (this.ui.files || []).length;
    return `
      <section class="card">
        <h2>📤 Upload your paper</h2>
        <p>Add photos of every page, or a PDF. Including the mark scheme pages makes the marking more accurate.</p>
        <label class="btn btn-white btn-big btn-block upload-btn">📷 Choose photos / PDF
          <input type="file" accept="image/*,application/pdf" multiple data-act="files" hidden></label>
        <p class="center-text"><b>${n ? n + ' file' + (n > 1 ? 's' : '') + ' ready' : 'No files chosen yet'}</b></p>
        ${AI.key() ? `<button class="btn btn-green btn-big btn-block" data-act="mark-paper" ${n ? '' : 'disabled'}>✨ Mark my paper</button>` : '<p class="muted small">Add your OpenAI key in Settings for automatic marking, or enter your marks below.</p>'}
      </section>
      <details class="card manual">
        <summary><b>Or enter your marks yourself</b> (if you marked it with the mark scheme)</summary>
        <form data-form="manual-paper">
          <div class="field-row">
            <label class="field"><span>Marks you got</span><input name="got" type="number" min="0" required></label>
            <label class="field"><span>Out of</span><input name="max" type="number" min="1" required></label>
          </div>
          <p class="small"><b>Tick the topics where you lost marks:</b></p>
          <div class="topic-ticks">${topicList(s.subject).map(t => `<label><input type="checkbox" name="weak" value="${t.id}"> ${esc(t.name)}</label>`).join('')}</div>
          <button class="btn btn-green" type="submit">Save result</button>
        </form>
      </details>`;
  },

  /* ======================= NEA ======================= */
  step_nea(s) {
    const g = s.work.nea;
    return `
      <form class="card" data-form="nea">
        <h2>🛠️ NEA session</h2>
        <p>What stage is your NEA at, and what do you want to get done in this session?</p>
        <textarea name="note" rows="4" placeholder="e.g. Finished research, starting initial design ideas…">${esc(s.work.neaNote || '')}</textarea>
        ${AI.key() ? '<button class="btn btn-blue" type="submit">Get a plan for this session</button>' : ''}
      </form>
      ${g ? `<section class="card"><h2>🎯 ${fmt(g.focus)}</h2>
        <ol class="guide">${(g.steps || []).map(x => `<li>${fmt(x)}</li>`).join('')}</ol>
        <h3>Top-band portfolios show…</h3>${list(g.checklist)}
        <p class="improve">💡 ${fmt(g.tip || '')}</p></section>` : ''}
      ${this.next('Done: log this session')}`;
  },

  /* ======================= RESULTS ======================= */
  step_done(s, topic) {
    const r = s.result || {};
    const sb = subj(s.subject), est = subjectEstimate(s.subject);
    const nextUp = todaySessions().find(x => !x.done);
    let body = '';
    if (r.paper) {
      const P = r.paper;
      body = `
        <section class="card result-card">
          <div class="score-big ${P.percent >= 80 ? 'good' : P.percent >= 55 ? 'ok' : 'low'}">${P.percent ?? '?'}%</div>
          <p><b>${P.marks ?? '?'} / ${P.maxMarks ?? '?'} marks · estimated grade ${P.grade ?? '?'}</b></p>
          <p>${fmt(P.summary || '')}</p>
        </section>
        <section class="two-col">
          ${P.strengths?.length ? `<div class="card fb-good"><h3>💪 Strengths</h3>${list(P.strengths)}</div>` : ''}
          ${P.improvements?.length ? `<div class="card fb-missing"><h3>📈 How to improve</h3>${list(P.improvements)}</div>` : ''}
        </section>
        ${P.questions?.length ? `<section class="card"><h3>Question by question</h3>
          <table class="qtable"><tr><th>Q</th><th>Topic</th><th>Marks</th><th>Comment</th></tr>
          ${P.questions.map(q => `<tr><td>${esc(q.number)}</td><td>${esc(topicById(q.topicId).name)}</td><td class="${q.marks >= q.max ? 'full' : ''}">${q.marks}/${q.max}</td><td>${fmt(q.comment || '')}</td></tr>`).join('')}
          </table></section>` : ''}
        ${P.notes && P.notes.length ? `<p class="muted small">Note: ${fmt([].concat(P.notes).join(' '))}</p>` : ''}
        ${r.weakest?.length ? `<section class="card note-card"><h3>🗺️ Roadmap updated</h3><p>These topics now come up sooner: <b>${r.weakest.map(id => esc(topicById(id).name)).join(', ')}</b>.</p></section>` : ''}`;
    } else if (topic && r.score != null) {
      const st = strength(topic.id);
      body = `
        <section class="card result-card">
          <div class="score-big ${r.score >= 80 ? 'good' : r.score >= 55 ? 'ok' : 'low'}">${r.score}%</div>
          <p>${r.score >= 80 ? 'Excellent: this topic is secure. 🔒' : r.score >= 55 ? 'Good progress. It\'ll come back soon so it sticks.' : 'This one needs more work, so it\'ll come back in 2 days. That\'s the plan working.'}</p>
        </section>
        <section class="stat-grid">
          <div class="card"><div class="small upper">Topic strength</div><div class="big">${st ?? '–'}%</div><div class="bar"><div class="bar-fill" style="width:${st || 0}%;background:${sb.color}"></div></div></div>
          <div class="card"><div class="small upper">Grade 9 ready</div><div class="big">${nineChance(st || 0)}%</div><div class="muted small">for this topic</div></div>
          <div class="card"><div class="small upper">${esc(sb.name)} estimate</div><div class="big">Grade ${est.grade}</div><div class="muted small">${est.enoughData ? est.p9 + '% chance of a 9' : 'needs more topics tested'}</div></div>
        </section>`;
    } else {
      body = `<section class="card result-card"><div class="score-big good">✓</div><p>Session logged. Nice work.</p></section>`;
    }
    return `${body}
      <div class="next-row">
        ${nextUp ? `<a class="btn btn-green btn-big" href="#session/${nextUp.id}">Next session ▶</a>` : '<a class="btn btn-green btn-big" href="#today">Back to today 🎉</a>'}
      </div>`;
  },

  /* ======================= Finishing ======================= */
  finish(s) {
    if (s.done) return;
    const topic = s.topicId ? topicById(s.topicId) : null;
    const w = s.work;
    let score = null;
    if (s.kind === 'learn' || s.kind === 'review') {
      const parts = [];
      if (w.test) parts.push([testScore(w.test), s.kind === 'learn' ? 0.7 : 0.6]);
      if (w.dump && w.dump.fb) parts.push([w.dump.fb.score, 0.15]);
      if (w.cards) parts.push([w.cards.known / w.cards.total * 100, s.kind === 'learn' ? 0.15 : 0.4]);
      if (parts.length) {
        const tw = parts.reduce((a, p) => a + p[1], 0);
        score = Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / tw);
        recordScore(topic.id, score, s.kind, s.kind === 'learn' ? 0.6 : 0.4);
      }
    }
    if (w.paper) score = w.paper.percent;
    s.result = { ...(s.result || {}), score };
    s.done = true;
    s.doneAt = Date.now();
    addActivity(KINDS[s.kind].mins);
    grant(KINDS[s.kind].xp + (score >= 80 ? 20 : 0), { x: innerWidth / 2, y: 140 });
    Sfx.fanfare();
    Confetti.burst(innerWidth / 2, innerHeight / 3, 120);
    buildPlan(); // re-plan the future with your new scores
    save();
  },

  /* Apply a marked paper: update every topic's strength, then re-plan */
  applyPaper(s, P) {
    P.percent = Math.round(P.percent ?? (P.maxMarks ? P.marks / P.maxMarks * 100 : 0));
    const valid = (P.topicScores || []).filter(t => topicList(s.subject).some(x => x.id === t.topicId));
    valid.forEach(t => recordScore(t.topicId, t.percent, 'paper', 0.4));
    if (s.kind === 'paper') { S.lastPaper[s.subject] = todayKey(); S.paperNo[s.subject] = (S.paperNo[s.subject] || 0) + 1; }
    S.papers.push({ id: uid(), date: todayKey(), subject: s.subject, name: (s.paper || '') + (s.kind === 'mockreview' ? ' (mock)' : ''),
                    percent: P.percent, grade: P.grade, summary: P.summary || '' });
    s.work.paper = P;
    s.result = { paper: P, weakest: valid.sort((a, b) => a.percent - b.percent).slice(0, 4).filter(t => t.percent < 70).map(t => t.topicId) };
  },

  /* ======================= Buttons & forms ======================= */
  async run(label, fn) {
    if (this.ui.busy) return;
    this.ui.busy = label; this.ui.error = null; render();
    try { await fn(); } catch (e) { this.ui.error = e.message; console.error(e); }
    this.ui.busy = false; save(); render();
  },

  // Start any AI loading the current step needs (called after each draw)
  autoload(s) {
    if (this.ui.busy || this.ui.error || !AI.key()) return;
    const stepId = STEPS[s.kind][s.step][0];
    const topic = s.topicId ? topicById(s.topicId) : null;
    if (topic && ['learn', 'dump', 'cards'].includes(stepId) && !lessonFor(topic)) {
      this.run(`Writing your ${stepId === 'cards' ? 'flashcards' : 'lesson'} on ${topic.name}…`, () => AI.lesson(topic));
    } else if (topic && (stepId === 'test' || stepId === 'quiz') && !s.work.test) {
      const shape = stepId === 'test' ? { mcq: 6, written: 2 } : { mcq: 5, written: 0 };
      this.run('Writing your ' + (stepId === 'test' ? 'end-of-topic test' : 'quiz') + '…', async () => {
        const data = await AI.test(topic, { ...shape, attempt: ((S.mastery[topic.id] || {}).n || 0) + 1 });
        data.mcq = (data.mcq || []).filter(q => q.options && q.options.length === 4);
        data.written = shape.written ? (data.written || []) : [];
        // Shuffle each question's options so the right answer isn't always in the same place
        data.mcq.forEach(q => {
          const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
          q.options = order.map(i => q.options[i]);
          q.answer = order.indexOf(Number(q.answer));
        });
        s.work.test = { data };
      });
    }
  },

  advance(s) {
    s.step++;
    this.ui = { id: s.id };
    if (STEPS[s.kind][s.step][0] === 'done') this.finish(s);
    save(); render(); window.scrollTo(0, 0);
  },

  bind(root) {
    const s = this.current();
    if (!s) return;
    const topic = s.topicId ? topicById(s.topicId) : null;
    this.autoload(s);

    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const ui = this.ui;
      switch (b.dataset.act) {
        case 'next': this.advance(s); break;
        case 'retry': ui.error = null; render(); break;
        case 'timer': Focus.open({ subject: s.subject, label: topic ? topic.name : (s.paper || 'NEA') }); break;
        case 'paper-timer': Focus.open({ subject: s.subject, label: s.paper }, 90); break;
        case 'flip': ui.flipped = !ui.flipped; render(); break;
        case 'card-yes': case 'card-no': {
          const i = ui.queue.shift();
          if (!(i in ui.first)) ui.first[i] = b.dataset.act === 'card-yes';
          if (b.dataset.act === 'card-no') ui.queue.push(i); // see it again at the end
          ui.flipped = false;
          if (!ui.queue.length) {
            const total = Object.keys(ui.first).length;
            s.work.cards = { known: Object.values(ui.first).filter(Boolean).length, total };
            save();
          }
          render();
          break;
        }
        case 'self-dump': s.work.dump = { text: $('[name="text"]', root).value, fb: { score: Number(b.dataset.v), tip: 'Add anything you missed to your notes.' } }; save(); render(); break;
        case 'self-cards': s.work.cards = { known: Number(b.dataset.v), total: 8 }; save(); render(); break;
        case 'self-test': s.work.test = { self: Number(b.dataset.v) }; this.advance(s); break;
        case 'mark-paper':
          this.run('Marking your paper… this can take a minute or two', async () => {
            const files = await prepareFiles(ui.files);
            const P = await AI.markPaper(s.subject, s.paper || PAPERS[s.subject][0], files);
            this.applyPaper(s, P);
            s.step++;
            this.finish(s);
          });
          break;
      }
    };

    root.onchange = e => {
      const a = e.target.dataset.act;
      if (a === 'files') { this.ui.files = [...e.target.files]; render(); }
      if (a === 'set-paper') { s.paper = e.target.value; save(); }
      if (a === 'set-series') { s.series = e.target.value; save(); }
    };

    root.onsubmit = e => {
      e.preventDefault();
      const form = e.target, f = new FormData(form);
      switch (form.dataset.form) {
        case 'dump': {
          const text = f.get('text').trim();
          const L = lessonFor(topic);
          const prompt = (L && L.brainDumpPrompt) || `Everything about ${topic.name}`;
          s.work.dump = { text };
          this.run('Reading your brain dump…', async () => { s.work.dump.fb = await AI.brainDumpFeedback(topic, prompt, text); });
          break;
        }
        case 'test': {
          const t = s.work.test, D = t.data;
          t.mcqAns = D.mcq.map((_, i) => f.get('mcq' + i));
          t.writtenAns = D.written.map((_, i) => (f.get('w' + i) || '').trim());
          t.submitted = true;
          if (D.written.length) {
            this.run('Marking your answers like an examiner…', async () => {
              t.marked = await AI.markWritten(topic, D.written.map((q, i) => ({ ...q, answer: t.writtenAns[i] })));
            });
          } else { save(); render(); }
          break;
        }
        case 'manual-paper': {
          const got = Number(f.get('got')), max = Number(f.get('max'));
          const weak = f.getAll('weak');
          const pct = Math.round(got / max * 100);
          this.applyPaper(s, {
            marks: got, maxMarks: max, percent: pct, grade: gradeFor(pct), summary: 'Marked by you.',
            topicScores: weak.map(id => ({ topicId: id, percent: Math.min(pct, 40) })),
          });
          s.step++; this.finish(s); render(); window.scrollTo(0, 0);
          break;
        }
        case 'nea': {
          s.work.neaNote = f.get('note');
          this.run('Planning your NEA session…', async () => { s.work.nea = await AI.neaCoach(s.work.neaNote); });
          break;
        }
      }
    };
  },
};

// Test score as a %: multiple choice counts 40%, written answers 60%
function testScore(t) {
  if (t.self != null) return t.self;
  const D = t.data;
  const mcq = D.mcq.length ? D.mcq.filter((q, i) => Number(t.mcqAns[i]) === q.answer).length / D.mcq.length * 100 : null;
  let written = null;
  if (D.written.length && t.marked) {
    const got = D.written.reduce((a, q, i) => { const r = (t.marked.results || t.marked.questions || [])[i] || {}; return a + Math.min(q.marks, Number(r.marks ?? r.awarded ?? r.score) || 0); }, 0);
    const max = D.written.reduce((a, q) => a + q.marks, 0);
    written = got / max * 100;
  }
  if (mcq != null && written != null) return mcq * 0.4 + written * 0.6;
  return mcq ?? written ?? 0;
}
