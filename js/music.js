/* =========================================================================
   music.js — the 🎧 button (bottom-right, on every page and in Focus mode)
   that switches study lofi on and off. The music itself is made in lofi.js.
   ========================================================================= */

const Music = {
  open: false,

  init() {
    const btn = document.createElement('button');
    btn.id = 'music-btn';
    btn.className = 'music-btn';
    btn.setAttribute('aria-label', 'Study lofi');
    btn.onclick = () => { this.open = !this.open; this.render(); };
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'music-panel';
    panel.className = 'music-panel';
    document.body.appendChild(panel);
    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'toggle') Lofi.on ? Lofi.stop() : Lofi.start();
      if (b.dataset.m === 'vibe') Lofi.newVibe();
      if (b.dataset.m === 'close') { this.open = false; this.render(); }
      if (b.dataset.m === 'bpm-reset') { Lofi.setBpm(null); this.render(); }
    });
    panel.addEventListener('input', e => {
      if (e.target.dataset.m === 'vol') Lofi.setVolume(Number(e.target.value));
      if (e.target.dataset.m === 'bpm') {
        Lofi.setBpm(Number(e.target.value));
        // Update the numbers without redrawing the panel (keeps the slider smooth)
        panel.querySelectorAll('[data-bpm-label]').forEach(el => { el.textContent = Lofi.bpm(); });
      }
    });
    // When you let go of the tempo slider, redraw so the "reset tempo" link appears
    panel.addEventListener('change', e => { if (e.target.dataset.m === 'bpm') this.render(); });
    this.render();
  },

  render() {
    const btn = $('#music-btn'), panel = $('#music-panel');
    if (!btn) return;
    btn.classList.toggle('playing', Lofi.on);
    btn.innerHTML = Lofi.on ? '🎧<span class="eq"><i></i><i></i><i></i></span>' : '🎧';
    panel.classList.toggle('show', this.open);
    const v = VIBES[Lofi.vibe];
    panel.innerHTML = `
      <div class="music-head"><b>🎧 Study lofi</b><button class="icon-btn sm" data-m="close" aria-label="Hide (music keeps playing)">▾</button></div>
      <div class="lofi-now ${Lofi.on ? 'on' : ''}">
        <div class="lofi-art">${Lofi.on ? '<span class="eq big"><i></i><i></i><i></i><i></i></span>' : '☕'}</div>
        <div><b>${esc(v.name)}</b><div class="muted small"><span data-bpm-label>${Lofi.bpm()}</span> BPM · made live on your device</div></div>
      </div>
      <div class="row">
        <button class="btn ${Lofi.on ? 'btn-white' : 'btn-green'} btn-sm" data-m="toggle">${Lofi.on ? '⏹ Turn off' : '▶ Play'}</button>
        <button class="btn btn-white btn-sm" data-m="vibe">🔀 New vibe</button>
      </div>
      <label class="volume-row" title="Tempo">🐢 <input type="range" min="50" max="110" step="1" value="${Lofi.bpm()}" data-m="bpm" aria-label="Tempo (BPM)"> 🐇
        <b class="bpm-num"><span data-bpm-label>${Lofi.bpm()}</span></b></label>
      ${S.settings.lofiBpm ? `<button class="link-btn" data-m="bpm-reset">↺ Use ${esc(v.name)}'s tempo (${v.bpm} BPM)</button>` : ''}
      <label class="volume-row">🔈 <input type="range" min="0" max="1" step="0.01" value="${S.settings.lofiVol ?? 0.6}" data-m="vol" aria-label="Lofi volume"> 🔊</label>
      <p class="muted tiny">Works offline. No ads, no login, never the same twice.</p>`;
  },
};
