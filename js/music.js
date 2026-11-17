/* =========================================================================
   music.js — your Spotify playlist, available on every page (and in Focus mode).

   How it works: tapping 🎵 opens a small Spotify player (Spotify's official
   embed). Switching music OFF removes the player completely, so it stops.
   • Logged into Spotify in this browser → full songs.
   • Not logged in → Spotify only allows 30-second previews. Tap
     "Open in Spotify app" instead; the app keeps playing in the background.
   Your playlist link is saved in Settings (S.settings.spotify).
   ========================================================================= */

const Music = {
  on: false,       // is the player loaded (playing or ready to play)?
  open: false,     // is the panel showing?

  // Turn any Spotify link into { type, id }. Works with:
  // https://open.spotify.com/playlist/ID?si=..., .../intl-en/album/ID, spotify:playlist:ID
  parse(link) {
    const m = String(link || '').match(/(playlist|album|track|artist|show|episode)[/:]([A-Za-z0-9]{10,})/);
    return m ? { type: m[1], id: m[2] } : null;
  },

  link() { return S.settings.spotify || ''; },

  init() {
    const btn = document.createElement('button');
    btn.id = 'music-btn';
    btn.className = 'music-btn';
    btn.setAttribute('aria-label', 'Music');
    btn.onclick = () => { this.open = !this.open; this.render(); };
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'music-panel';
    panel.className = 'music-panel';
    document.body.appendChild(panel);
    // The Spotify player lives in its own box so redrawing the panel never stops the music
    const holder = document.createElement('div');
    holder.id = 'music-holder';
    panel.appendChild(holder);
    const controls = document.createElement('div');
    controls.id = 'music-controls';
    panel.appendChild(controls);

    panel.addEventListener('click', e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'toggle') this.on ? this.stop() : this.start();
      if (b.dataset.m === 'close') { this.open = false; this.render(); }
      if (b.dataset.m === 'change') { this.stop(); S.settings.spotify = ''; save(); this.render(); }
    });
    panel.addEventListener('submit', e => {
      e.preventDefault();
      const v = e.target.querySelector('input').value.trim();
      if (!this.parse(v)) return alert('That doesn\'t look like a Spotify link. In Spotify: open your playlist → ··· → Share → Copy link.');
      S.settings.spotify = v; save();
      this.start();
    });
    this.render();
  },

  start() {
    const p = this.parse(this.link());
    if (!p) return;
    if (!navigator.onLine) { toast('Spotify needs internet', '📶', 'blue'); return; }
    $('#music-holder').innerHTML = `<iframe title="Spotify player"
      src="https://open.spotify.com/embed/${p.type}/${p.id}?utm_source=generator"
      width="100%" height="352" frameborder="0" allowfullscreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    this.on = true;
    this.render();
  },

  stop() {
    $('#music-holder').innerHTML = '';   // removing the player stops the music
    this.on = false;
    this.render();
  },

  render() {
    const btn = $('#music-btn'), panel = $('#music-panel'), controls = $('#music-controls');
    if (!btn) return;
    btn.classList.toggle('playing', this.on);
    btn.innerHTML = this.on ? '🎵<span class="eq"><i></i><i></i><i></i></span>' : '🎵';
    panel.classList.toggle('show', this.open);
    $('#music-holder').classList.toggle('has-player', this.on);
    const p = this.parse(this.link());
    if (!p) {
      controls.innerHTML = `
        <div class="music-head"><b>🎵 Your music</b><button class="icon-btn sm" data-m="close" aria-label="Close">✕</button></div>
        <form class="music-form">
          <p class="small">Paste a Spotify playlist link.<br><span class="muted">In Spotify: open the playlist → ··· → Share → Copy link</span></p>
          <input placeholder="https://open.spotify.com/playlist/…" autocomplete="off">
          <button class="btn btn-green btn-sm btn-block" type="submit">Save & play</button>
        </form>`;
      return;
    }
    controls.innerHTML = `
      <div class="music-head">
        <b>🎵 Music ${this.on ? 'on' : 'off'}</b>
        <button class="icon-btn sm" data-m="close" aria-label="Hide (music keeps playing)">▾</button>
      </div>
      <div class="row wrap">
        <button class="btn ${this.on ? 'btn-white' : 'btn-green'} btn-sm" data-m="toggle">${this.on ? '⏹ Turn off' : '▶ Turn on'}</button>
        <a class="btn btn-white btn-sm" href="https://open.spotify.com/${p.type}/${p.id}" target="_blank" rel="noopener">Open in Spotify app</a>
        <button class="btn btn-white btn-sm" data-m="change">Change</button>
      </div>
      <p class="muted tiny">${this.on ? 'Press play in the player. Only getting 30-second previews? Log in to Spotify in the player, or use the Spotify app.' : 'Turn on to load your playlist.'}</p>`;
  },
};
