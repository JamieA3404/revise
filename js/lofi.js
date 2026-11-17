/* =========================================================================
   lofi.js — study lofi beats, generated live with the Web Audio API.
   No audio files, no internet, never the same twice.

   Every bar plays: a jazzy chord (warm electric piano with a "tape wobble"),
   a bassline, a lazy swung boom-bap beat, the odd melody note, and vinyl crackle.
   "New vibe" picks a different chord progression, key and tempo.
   Tweak VIBES below to make your own.
   ========================================================================= */

// Chord progressions: each chord = [bass note, [chord notes]] as MIDI numbers (60 = middle C)
const VIBES = [
  { name: 'Late night', bpm: 72, prog: [
    [38, [53, 57, 60, 64]],   // Dm9
    [43, [53, 57, 59, 64]],   // G13
    [36, [52, 55, 59, 62]],   // Cmaj9
    [45, [55, 59, 60, 64]],   // Am9
  ] },
  { name: 'Rainy window', bpm: 68, prog: [
    [41, [55, 57, 60, 64]],   // Fmaj9
    [40, [55, 59, 62, 66]],   // Em9
    [38, [53, 57, 60, 64]],   // Dm9
    [36, [52, 55, 59, 62]],   // Cmaj9
  ] },
  { name: 'Sunday morning', bpm: 78, prog: [
    [36, [55, 59, 62, 64]],   // Cmaj9 (6)
    [33, [55, 60, 64, 67]],   // Am7
    [41, [57, 60, 64, 67]],   // Fmaj7
    [43, [53, 57, 59, 62]],   // G7sus
  ] },
  { name: 'Library focus', bpm: 70, prog: [
    [45, [55, 60, 64, 67]],   // Am7
    [38, [53, 57, 60, 65]],   // Dm7
    [43, [53, 59, 62, 65]],   // G7
    [36, [52, 55, 59, 64]],   // Cmaj7
  ] },
];
const PENTATONIC = [0, 2, 4, 7, 9]; // for melody notes

const Lofi = {
  on: false,
  vibe: 0,
  key: 0,        // semitones to shift everything by
  step: 0,
  nextTime: 0,

  // Tempo: your own setting (S.settings.lofiBpm) if you've set one, otherwise the vibe's
  bpm() { return S.settings.lofiBpm || VIBES[this.vibe].bpm; },
  setBpm(v) {
    S.settings.lofiBpm = v ? Math.max(50, Math.min(110, Math.round(v))) : null; // null = use the vibe's tempo
    save();
  },

  midi(n) { return 440 * Math.pow(2, (n + this.key - 69) / 12); },

  start() {
    if (this.on) return;
    const ctx = Sound.getCtx();
    this.ctx = ctx;
    // Master chain: volume → warm low-pass → gentle compressor → speakers
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime((S.settings.lofiVol ?? 0.6) * 0.9, ctx.currentTime + 1.5);
    const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 3800;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(warm); warm.connect(comp); comp.connect(ctx.destination);

    // "Tape wobble": a slow wobble applied to the piano's pitch
    this.wobble = ctx.createOscillator(); this.wobble.frequency.value = 0.45;
    this.wobbleAmt = ctx.createGain(); this.wobbleAmt.gain.value = 9; // cents
    this.wobble.connect(this.wobbleAmt); this.wobble.start();

    // White noise (for drums) and a looping vinyl crackle bed
    this.noise = this.makeNoise(1);
    this.crackle = ctx.createBufferSource();
    this.crackle.buffer = this.makeCrackle();
    this.crackle.loop = true;
    const cg = ctx.createGain(); cg.gain.value = 0.5;
    this.crackle.connect(cg); cg.connect(this.master); this.crackle.start();

    this.on = true;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 25);
    if ((typeof Music !== 'undefined')) Music.render();
  },

  stop() {
    if (!this.on) return;
    clearInterval(this.timer);
    const ctx = this.ctx, m = this.master, w = this.wobble, c = this.crackle;
    m.gain.cancelScheduledValues(ctx.currentTime);
    m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
    m.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    setTimeout(() => { try { w.stop(); c.stop(); m.disconnect(); } catch (e) {} }, 600);
    this.on = false;
    if ((typeof Music !== 'undefined')) Music.render();
  },

  setVolume(v) {
    S.settings.lofiVol = v; save();
    if (this.on) this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.1);
  },

  newVibe() {
    this.vibe = (this.vibe + 1 + Math.floor(Math.random() * (VIBES.length - 1))) % VIBES.length;
    this.key = [-3, -2, 0, 2, 3][Math.floor(Math.random() * 5)];
    this.step = 0;
    if ((typeof Music !== 'undefined')) Music.render();
  },

  /* Look ahead and schedule notes slightly in advance (keeps timing tight) */
  schedule() {
    const ahead = document.hidden ? 1.5 : 0.2;
    const sixteenth = 60 / this.bpm() / 4;
    while (this.nextTime < this.ctx.currentTime + ahead) {
      this.playStep(this.step, this.nextTime, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
    }
  },

  playStep(step, t, dur) {
    const v = VIBES[this.vibe];
    const s = step % 16, bar = Math.floor(step / 16);
    const [bass, chord] = v.prog[bar % v.prog.length];
    if (s % 2 === 1) t += dur * 0.22;                 // swing: lazy off-beats
    const human = () => (Math.random() - 0.5) * 0.012; // tiny timing drift = human feel

    // Drums (boom-bap): kick on 1 and the "and" of 3, snare on 2 and 4, soft hats
    if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) this.kick(t + human());
    if (s === 4 || s === 12) this.snare(t + human() + 0.01);
    if (s % 2 === 0) this.hat(t + human(), s === 14 && Math.random() < 0.3 ? 0.22 : 0.035, s % 4 === 0 ? 0.5 : 0.3);

    // Chords: one warm chord per bar, sometimes re-hit on beat 3
    if (s === 0) chord.forEach((n, i) => this.keys(this.midi(n), t + i * 0.012, dur * 15.5, 0.07));
    if (s === 8 && Math.random() < 0.35) chord.slice(1).forEach(n => this.keys(this.midi(n), t, dur * 7, 0.04));

    // Bass
    if (s === 0) this.bass(this.midi(bass), t, dur * 6);
    if (s === 10) this.bass(this.midi(bass + (Math.random() < 0.5 ? 7 : 12)), t, dur * 4);

    // Occasional melody note from the pentatonic scale, an octave up
    if ([2, 6, 11, 14].includes(s) && Math.random() < 0.22) {
      const root = chord[0] + 12;
      const n = root + PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      this.keys(this.midi(n), t, dur * 3, 0.05);
    }
  },

  /* ---------- Instruments ---------- */
  keys(freq, t, len, vol) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.5);
    [['sine', 1, 0], ['triangle', 0.35, 6], ['sine', 0.12, -5]].forEach(([type, amp, det]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = freq * (type === 'triangle' ? 1 : amp === 0.12 ? 2 : 1); o.detune.value = det;
      this.wobbleAmt.connect(o.detune);
      og.gain.value = amp;
      o.connect(og); og.connect(lp);
      o.start(t); o.stop(t + len + 0.6);
    });
    lp.connect(g); g.connect(this.master);
  },

  bass(freq, t, len) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + len + 0.05);
  },

  kick(t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.4);
  },

  snare(t) {
    const ctx = this.ctx, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.25);
  },

  hat(t, len, vel) {
    const ctx = this.ctx, src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise;
    hp.type = 'highpass'; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.06 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(hp); hp.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
  },

  makeNoise(seconds) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },

  // Vinyl: very quiet hiss plus random little pops
  makeCrackle() {
    const rate = this.ctx.sampleRate, b = this.ctx.createBuffer(1, rate * 6, rate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = last * 0.97 + (Math.random() * 2 - 1) * 0.03;
      d[i] = last * 0.25;
      if (Math.random() < 0.00012) { const a = (Math.random() * 0.5 + 0.2) * (Math.random() < 0.5 ? -1 : 1); for (let j = 0; j < 30 && i + j < d.length; j++) d[i + j] += a * Math.exp(-j / 5); }
    }
    return b;
  },
};
