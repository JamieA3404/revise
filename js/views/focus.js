/* =========================================================================
   focus.js — full-screen Pomodoro timer with background sound.

   How the timer keeps accurate time: instead of counting down 1 second at
   a time (which drifts, and stops when the tab is in the background) we
   store the exact time the phase ENDS (endAt) and work out what's left.
   ========================================================================= */

const Focus = {
  phase: 'work',      // 'work' or 'break'
  running: false,
  endAt: 0,           // timestamp when the current phase finishes (when running)
  remaining: 0,       // ms left (when paused)
  total: 0,           // ms length of this phase
  label: '',         // what you're working on
  subject: 'maths',   // used for free study
  timer: null,
  wakeLock: null,

  /* Open focus mode. info = { subject, label } (what you're working on).
     minutes = optional length for the first round (e.g. 90 for a past paper). */
  open(info = {}, minutes = null) {
    this.subject = info.subject || this.subject;
    this.label = info.label || '';
    this.phase = 'work';
    this.running = false;
    this.total = this.remaining = (minutes || S.settings.workMin) * 60000;
    $('#focus').hidden = false;
    document.body.classList.add('no-scroll');
    this.render();
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 250);
  },

  close() {
    if (this.phase === 'work' && this.elapsedMin() >= 1) {
      const m = this.elapsedMin();
      this.finishWork(m, false);
    }
    this.running = false;
    clearInterval(this.timer);
    Sound.stop();
    this.releaseWake();
    if (document.fullscreenElement) document.exitFullscreen?.();
    $('#focus').hidden = true;
    document.body.classList.remove('no-scroll');
    renderStatbar();
  },

  left() { return this.running ? Math.max(0, this.endAt - Date.now()) : this.remaining; },
  elapsedMin() { return Math.floor((this.total - this.left()) / 60000); },

  start() {
    this.running = true;
    this.endAt = Date.now() + this.remaining;
    if (this.phase === 'work') Sound.play(S.settings.sound);
    else Sound.getCtx();
    this.requestWake();
    this.render();
  },

  pause() {
    this.remaining = this.left();
    this.running = false;
    Sound.stop();
    this.releaseWake();
    this.render();
  },

  // Called 4 times a second: update the clock, and switch phase when time's up
  tick() {
    if (!this.running) return;
    if (this.left() <= 0) return this.complete();
    this.paintClock();
  },

  complete() {
    Sfx.chime();
    if (this.phase === 'work') {
      this.finishWork(Math.round(this.total / 60000), true);
      // Straight into the break; sound pauses during breaks
      Sound.stop();
      this.phase = 'break';
      this.total = this.remaining = S.settings.breakMin * 60000;
      this.running = false;
      this.start();
      this.notify('Focus session done! Take a break ☕');
    } else {
      this.phase = 'work';
      this.total = this.remaining = S.settings.workMin * 60000;
      this.running = false;
      this.releaseWake();
      this.render();
      toast('Break over — ready for another round?', '🔔', 'blue');
      this.notify('Break over — ready for another round?');
    }
  },

  // Log the minutes and give rewards. full = true if the whole session was completed
  finishWork(minutes, full) {
    if (minutes < 1) return;
    logFocus(minutes, this.subject);
    renderStatbar();
    if (full) {
      Confetti.burst(innerWidth / 2, innerHeight / 2 - 100, 100);
      toast(`${minutes} minutes locked in. Take your break!`, '🍅');
    } else {
      toast(`${minutes} min logged`, '⏱');
    }
  },

  // Gentle system notification if the app is in the background (only if allowed)
  notify(text) {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Revise', { body: text, icon: 'icons/icon-192.png' }); } catch (e) {}
    }
  },

  async requestWake() {
    try { if ('wakeLock' in navigator && !this.wakeLock) this.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
  },
  releaseWake() { try { this.wakeLock?.release(); } catch (e) {} this.wakeLock = null; },

  /* ---------- Drawing ---------- */
  fmt(ms) {
    const s = Math.ceil(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  },

  paintClock() {
    const left = this.left();
    const c = 2 * Math.PI * 140;
    const time = $('#focus .clock-time');
    if (time) time.textContent = this.fmt(left);
    const fg = $('#focus .clock-fg');
    if (fg) fg.style.strokeDashoffset = c * (1 - left / this.total);
    document.title = (this.running ? this.fmt(left) + ' · ' : '') + 'Revise';
  },

  render() {
    const k = todayKey();
    const s = subj(this.subject);
    const st = S.settings;
    const c = 2 * Math.PI * 140;
    const isWork = this.phase === 'work';
    const fresh = !this.running && this.remaining === this.total; // not started yet
    const todayMins = focusMinutesOn(k);
    const sessions = S.focusLog.filter(f => f.date === k).length;

    const soundChip = (id, label) =>
      `<button class="chip-btn ${st.sound === id ? 'on' : ''}" data-act="sound" data-sound="${id}">${label}</button>`;

    const el = $('#focus');
    el.className = 'focus ' + (isWork ? 'is-work' : 'is-break');
    el.innerHTML = `
      <div class="focus-top">
        <button class="btn btn-ghost btn-sm" data-act="close">✕ End</button>
        <div class="focus-stats">🍅 ${sessions} · ${fmtMins(todayMins)} today</div>
        ${document.documentElement.requestFullscreen ? '<button class="btn btn-ghost btn-sm" data-act="fullscreen" aria-label="Full screen">⛶</button>' : '<span></span>'}
      </div>

      <div class="focus-body">
        <div class="focus-task">
          <div class="focus-task-emoji" style="background:${s.color}">${s.emoji}</div>
          <div class="focus-label"><div class="small">${esc(s.name)}</div><b>${esc(this.label || 'Focus session')}</b></div>
        </div>

        <div class="phase-pill">${isWork ? '🎯 FOCUS' : '☕ BREAK — stretch, drink water, no phone'}</div>

        <div class="clock">
          <svg viewBox="0 0 300 300">
            <circle class="clock-bg" cx="150" cy="150" r="140"/>
            <circle class="clock-fg" cx="150" cy="150" r="140" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - this.left() / this.total)}"/>
          </svg>
          <div class="clock-time">${this.fmt(this.left())}</div>
        </div>

        ${isWork && fresh ? `
          <div class="row center wrap">
            ${[5, 15, st.workMin, 45].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(m =>
              `<button class="chip-btn ${this.total === m * 60000 ? 'on' : ''}" data-act="len" data-min="${m}">${m === 5 ? '5 min (just start!)' : m + ' min'}</button>`).join('')}
          </div>` : ''}

        <div class="row center wrap focus-controls">
          <button class="btn ${this.running ? 'btn-white' : isWork ? 'btn-green' : 'btn-orange'} btn-big btn-wide" data-act="startpause">
            ${this.running ? '❚❚ Pause' : fresh ? (isWork ? '▶ Start focus' : '▶ Start break') : '▶ Resume'}
          </button>
        </div>
        <div class="row center wrap">
          <button class="btn btn-ghost btn-sm" data-act="plus5">＋5 min</button>
          <button class="btn btn-ghost btn-sm" data-act="skip">${isWork ? 'Skip to break ⏭' : 'Skip break ⏭'}</button>
        </div>
      </div>

      <div class="focus-sound">
        <div class="row wrap center">
          ${soundChip('off', '🔇 Off')}
          ${soundChip('brown', '🟤 Brown')}
          ${soundChip('white', '⚪ White')}
          ${soundChip('rain', '🌧 Rain')}
          ${S.tracks.map(t => soundChip('track:' + t.id, '🎵 ' + esc(t.name))).join('')}
          <label class="chip-btn add-track">＋ My audio<input type="file" accept="audio/*" data-act="upload" hidden></label>
        </div>
        <label class="volume">🔈 <input type="range" min="0" max="1" step="0.01" value="${st.volume}" data-act="volume" aria-label="Volume"> 🔊</label>
      </div>`;
    this.paintClock();
  },

  bind() {
    const el = $('#focus');
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'close': this.close(); break;
        case 'fullscreen':
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.().catch(() => {});
          break;
        case 'startpause': this.running ? this.pause() : this.start(); break;
        case 'len':
          this.total = this.remaining = Number(b.dataset.min) * 60000;
          this.render(); break;
        case 'plus5':
          if (this.running) this.endAt += 300000; else this.remaining += 300000;
          this.total += 300000;
          this.paintClock(); break;
        case 'skip':
          if (this.phase === 'work') {
            // Count what you did so far, then go to break
            const m = this.elapsedMin();
            if (m >= 1) this.finishWork(m, false);
            Sound.stop();
            this.phase = 'break';
            this.total = this.remaining = S.settings.breakMin * 60000;
            this.running = false; this.start();
          } else {
            this.phase = 'work';
            this.total = this.remaining = S.settings.workMin * 60000;
            this.running = false; this.render();
          }
          break;
        case 'sound':
          S.settings.sound = b.dataset.sound; save();
          if (this.running && this.phase === 'work') Sound.play(S.settings.sound);
          else if (S.settings.sound !== 'off') this.preview(S.settings.sound);
          this.render(); break;
      }
    };
    el.onchange = async e => {
      const a = e.target.dataset.act;
      if (a === 'upload' && e.target.files[0]) {
        try {
          const id = await Tracks.add(e.target.files[0]);
          S.settings.sound = 'track:' + id; save();
          toast('Audio saved — works offline too', '🎵', 'blue');
          if (this.running && this.phase === 'work') Sound.play(S.settings.sound);
        } catch (err) { alert('Could not save that audio file: ' + err.message); }
        this.render();
      }
    };
    el.oninput = e => { if (e.target.dataset.act === 'volume') Sound.setVolume(Number(e.target.value)); };
  },

  // Play 2 seconds of a sound so you can hear it while choosing
  preview(kind) {
    Sound.play(kind);
    clearTimeout(this.previewT);
    this.previewT = setTimeout(() => { if (!(this.running && this.phase === 'work')) Sound.stop(); }, 2000);
  },
};

// Space bar starts/pauses, Escape ends (handy on the Mac)
document.addEventListener('keydown', e => {
  if ($('#focus').hidden || e.target.matches('input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); Focus.running ? Focus.pause() : Focus.start(); }
});
// When you come back to the app, catch up the clock straight away
document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#focus').hidden) { Focus.tick(); if (Focus.running) Focus.requestWake(); } });
