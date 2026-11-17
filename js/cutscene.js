/* =========================================================================
   cutscene.js — a ~25-second full-screen hype intro for when you don't feel
   like revising. Tap to skip ahead, ✕ to skip it entirely.
   Plays automatically before your first session each day (turn that off in
   Settings), or any time from 🎬 buttons.
   Edit the scenes in scenes() to make it yours.
   ========================================================================= */

const Cutscene = {
  timer: null,

  scenes(session) {
    const st = S.settings, today = todayKey();
    const days = Math.max(0, daysBetween(today, st.examStart));
    const money = moneyStatus();
    const next = session || todaySessions().find(s => !s.done);
    const mins = todaySessions().filter(s => !s.done).reduce((a, s) => a + KINDS[s.kind].mins, 0) || 30;
    const topic = next && next.topicId ? topicById(next.topicId).name : next && next.kind === 'paper' ? next.paper : 'today\'s session';
    const streak = streakInfo();
    const weekday = fromKey(today).toLocaleDateString('en-GB', { weekday: 'long' });
    const top = ['google', 'apple', 'meta', 'amazon', 'microsoft', 'deepmind'].map(id => COMPANIES.find(c => c.id === id));
    return [
      { dur: 2600, html: `<div class="cs-small">It's ${weekday}.</div><div class="cs-big">You don't feel like it.</div>` },
      { dur: 2600, html: `<div class="cs-big">Good.</div><div class="cs-small">Nobody who made it ever felt like it.<br><b>They did it anyway.</b></div>` },
      { dur: 3000, html: `<div class="cs-num" data-count="${days}">0</div><div class="cs-small">days until your finals.</div>` },
      { dur: 3000, html: `<div class="cs-emoji">📬</div><div class="cs-small">August 2027. Results day.</div><div class="cs-big cs-grades"><span>9</span><span>9</span><span>8</span><span>9</span><span>9</span></div>` },
      { dur: 2800, html: `<div class="cs-emoji">💰</div><div class="cs-big">£${money.max.toLocaleString()}</div><div class="cs-small">£120 for every 7+. On course right now: <b>£${money.earned}</b>.<br>Let's change that.</div>` },
      { dur: 3400, html: `<div class="cs-small">Then the doors open.</div><div class="cs-cos">${top.map((c, i) => `<div class="cs-co" style="animation-delay:${i * 0.18}s">${companyMark(c)}<small>${esc(c.roles.split(' · ')[0])}</small><b>${esc(c.start)}</b></div>`).join('')}</div>` },
      { dur: 2800, html: `<div class="cs-emoji">🚀</div><div class="cs-big">Or build your own.</div><div class="cs-small">Your code. Your company. Your rules.</div>` },
      { dur: 3200, riser: true, html: `<div class="cs-small">Every one of those futures starts the same way.</div><div class="cs-big">${mins} minutes. Today.</div><div class="cs-topic">${next ? subj(next.subject).emoji : '📘'} ${esc(topic)}</div>` },
      { final: true, html: `<div class="cs-lock">LOCK IN.</div>${streak.current ? `<div class="cs-small">🔥 Keep your ${streak.current}-day streak alive.</div>` : '<div class="cs-small">🔥 Day one of your streak starts now.</div>'}<button class="btn btn-green btn-big cs-go" data-cs="go">▶ LET'S GO</button>` },
    ];
  },

  play(onDone, session) {
    this.close();
    this.list = this.scenes(session);
    this.onDone = onDone;
    this.i = -1;
    const el = document.createElement('div');
    el.id = 'cutscene';
    el.className = 'cutscene';
    el.innerHTML = `
      <div class="cs-bars">${this.list.map(() => '<span><i></i></span>').join('')}</div>
      <button class="cs-skip" data-cs="skip" aria-label="Skip">Skip ✕</button>
      <div class="cs-stars"></div>
      <div class="cs-stage"></div>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-cs]');
      if (b && (b.dataset.cs === 'skip' || b.dataset.cs === 'go')) return this.finish(b.dataset.cs === 'go');
      if (!this.list[this.i].final) this.next();
    });
    document.body.appendChild(el);
    document.body.classList.add('no-scroll');
    this.next();
  },

  next() {
    clearTimeout(this.timer);
    this.i++;
    const sc = this.list[this.i];
    if (!sc) return;
    const el = $('#cutscene');
    el.querySelectorAll('.cs-bars span').forEach((b, j) => {
      b.className = j < this.i ? 'done' : j === this.i ? 'now' : '';
      if (j === this.i) b.querySelector('i').style.animationDuration = (sc.dur || 1000) + 'ms';
    });
    const stage = $('.cs-stage', el);
    stage.innerHTML = `<div class="cs-scene ${sc.final ? 'final' : ''}">${sc.html}</div>`;
    // Count-up numbers
    stage.querySelectorAll('[data-count]').forEach(n => {
      const target = Number(n.dataset.count), t0 = performance.now();
      const tick = now => { const p = Math.min(1, (now - t0) / 1400); n.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    this.sound(sc);
    if (sc.final) Confetti.burst(innerWidth / 2, innerHeight / 2, 140);
    else this.timer = setTimeout(() => this.next(), sc.dur);
  },

  finish(go) {
    this.close();
    if (go && this.onDone) this.onDone();
    else if (go && currentRoute() !== 'session') {
      const next = todaySessions().find(s => !s.done);
      if (next) location.hash = 'session/' + next.id;
    }
  },

  close() {
    clearTimeout(this.timer);
    const el = $('#cutscene');
    if (el) el.remove();
    if ($('#focus').hidden) document.body.classList.remove('no-scroll');
  },

  /* ---------- Cinematic sound effects (generated) ---------- */
  sound(sc) {
    if (!S.settings.sfx) return;
    const ctx = Sound.getCtx(), t = ctx.currentTime;
    if (sc.final) { this.boom(ctx, t, 1); this.boom(ctx, t + 0.05, 0.6, 30); return; }
    this.boom(ctx, t, 0.35);
    if (sc.riser) this.riser(ctx, t, sc.dur / 1000);
  },
  boom(ctx, t, vol, low = 38) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(low, t + 0.6);
    g.gain.setValueAtTime(vol * 0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 1.7);
  },
  riser(ctx, t, len) {
    const b = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = b; f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6000, t + len);
    g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.25, t + len);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + len);
  },
};
