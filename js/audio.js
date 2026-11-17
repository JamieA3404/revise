/* =========================================================================
   audio.js — background sound for Focus mode + little reward sound effects.

   Generated noise (brown / white / rain) is made with the Web Audio API,
   so no audio files are needed. Your own audio files are stored in
   IndexedDB (browser storage that can hold big files) so they work offline.
   ========================================================================= */

const Sound = {
  ctx: null,       // the AudioContext (created on first tap — browsers require a tap)
  master: null,    // gain node for background-sound volume
  node: null,      // what's currently playing
  el: null,        // <audio> element for your own tracks
  buffers: {},     // cached generated noise

  getCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = S.settings.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  /* Build ~10 seconds of noise that loops seamlessly (the end is
     cross-faded into the start so there's no click at the loop point). */
  makeNoise(kind) {
    if (this.buffers[kind]) return this.buffers[kind];
    const ctx = this.getCtx();
    const rate = ctx.sampleRate, len = rate * 10, fade = Math.floor(rate * 0.5);
    const buf = ctx.createBuffer(2, len, rate);

    for (let ch = 0; ch < 2; ch++) {
      const raw = new Float32Array(len + fade);
      let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < raw.length; i++) {
        const white = Math.random() * 2 - 1;
        if (kind === 'white') {
          raw[i] = white * 0.25;
        } else if (kind === 'brown') {
          // Brown noise = "random walk": each sample nudges the last one
          last = (last + 0.02 * white) / 1.02;
          raw[i] = last * 3.2;
        } else {
          // Rain: pink noise (softer than white) as the steady "shhh"
          b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
          raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        }
      }
      if (kind === 'rain') {
        // ...plus lots of tiny random "drops" (short bursts that fade fast)
        const drops = 10 * 140;
        for (let d = 0; d < drops; d++) {
          const pos = Math.floor(Math.random() * (raw.length - 400));
          const amp = Math.random() ** 3 * 0.5;
          const decay = 20 + Math.random() * 60;
          for (let j = 0; j < 400; j++) raw[pos + j] += (Math.random() * 2 - 1) * amp * Math.exp(-j / decay);
        }
      }
      // Cross-fade the tail into the start for a seamless loop
      const out = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) out[i] = raw[i];
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        out[i] = raw[i] * t + raw[len + i] * (1 - t);
      }
    }
    this.buffers[kind] = buf;
    return buf;
  },

  // Start a sound: 'brown' | 'white' | 'rain' | 'track:<id>' | 'off'
  async play(kind) {
    this.stop();
    if (!kind || kind === 'off') return;
    const ctx = this.getCtx();
    this.master.gain.value = S.settings.volume;

    if (kind.startsWith('track:')) {
      const rec = await Tracks.get(kind.slice(6));
      if (!rec) return;
      const el = new Audio(URL.createObjectURL(rec.blob));
      el.loop = true;
      // Route through Web Audio so the volume slider works on iPad too
      const src = ctx.createMediaElementSource(el);
      src.connect(this.master);
      this.el = el;
      this.node = src;
      el.play().catch(e => console.warn(e));
      return;
    }

    const src = ctx.createBufferSource();
    src.buffer = this.makeNoise(kind);
    src.loop = true;
    let out = src;
    if (kind === 'rain') {
      // Take the harsh top off the rain so it sounds softer
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 6000;
      src.connect(lp); out = lp;
    }
    out.connect(this.master);
    src.start();
    this.node = src;
  },

  stop() {
    try { if (this.node && this.node.stop) this.node.stop(); } catch (e) {}
    if (this.node) { try { this.node.disconnect(); } catch (e) {} }
    if (this.el) { this.el.pause(); URL.revokeObjectURL(this.el.src); this.el = null; }
    this.node = null;
  },

  setVolume(v) {
    S.settings.volume = v; save();
    if (this.master) this.master.gain.value = v;
  },
};

/* ---------- Short reward sound effects (generated, no files) ---------- */
const Sfx = {
  // Play a list of notes: [frequency Hz, start offset s, length s]
  notes(list, type = 'triangle', vol = 0.18) {
    if (!S.settings.sfx) return;
    const ctx = Sound.getCtx();
    const now = ctx.currentTime;
    list.forEach(([f, at, len]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, now + at);
      g.gain.linearRampToValueAtTime(vol, now + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + at); o.stop(now + at + len + 0.05);
    });
  },
  ding()    { this.notes([[1318.5, 0, 0.25], [1760, 0.08, 0.4]]); },                              // task ticked
  undo()    { this.notes([[440, 0, 0.15], [330, 0.07, 0.2]], 'sine', 0.12); },
  chime()   { this.notes([[523.3, 0, 1.2], [659.3, 0.15, 1.2], [784, 0.3, 1.6]], 'sine', 0.2); }, // timer end
  levelUp() { this.notes([[523.3, 0, 0.2], [659.3, 0.1, 0.2], [784, 0.2, 0.2], [1046.5, 0.3, 0.6]], 'square', 0.08); },
  fanfare() { this.notes([[784, 0, 0.15], [784, 0.15, 0.15], [784, 0.3, 0.15], [1046.5, 0.45, 0.7]], 'square', 0.08); },
  coin()    { this.notes([[987.8, 0, 0.08], [1318.5, 0.08, 0.35]], 'square', 0.07); },
};

/* ---------- Your own audio files, stored in IndexedDB ---------- */
const Tracks = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('revise-audio', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('tracks', { keyPath: 'id' });
      req.onsuccess = () => { this.db = req.result; resolve(this.db); };
      req.onerror = () => reject(req.error);
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', mode);
      const req = fn(tx.objectStore('tracks'));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  },
  get(id) { return this.run('readonly', st => st.get(id)); },
  async add(file) {
    const id = uid();
    // Store as an ArrayBuffer-backed Blob (most reliable in Safari)
    const blob = new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' });
    await this.run('readwrite', st => st.put({ id, name: file.name, blob }));
    S.tracks.push({ id, name: file.name.replace(/\.[^.]+$/, '') });
    save();
    return id;
  },
  async remove(id) {
    await this.run('readwrite', st => st.delete(id));
    S.tracks = S.tracks.filter(t => t.id !== id);
    if (S.settings.sound === 'track:' + id) S.settings.sound = 'brown';
    save();
  },
};
