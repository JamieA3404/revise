/* =========================================================================
   fx.js — the fun stuff: confetti, pop-up toasts, "+20 XP" floaters
   and big celebration pop-ups.
   ========================================================================= */

const CONFETTI_COLOURS = ['#3CC84B', '#2F9BFF', '#FFC93C', '#FF5C8A', '#B65CFF', '#FF8A1F', '#00C2A8'];

/* Confetti burst from a point (x, y in screen pixels). amount = number of pieces. */
const Confetti = {
  parts: [],
  running: false,
  burst(x = innerWidth / 2, y = innerHeight / 3, amount = 80) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 9;
      this.parts.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 6,
        size: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        color: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length], life: 0,
      });
    }
    if (!this.running) { this.running = true; requestAnimationFrame(() => this.frame()); }
  },
  frame() {
    const c = $('#confetti'), g = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    if (c.width !== innerWidth * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    this.parts = this.parts.filter(p => p.y < innerHeight + 40 && p.life < 240);
    for (const p of this.parts) {
      p.vy += 0.35; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    }
    if (this.parts.length) requestAnimationFrame(() => this.frame());
    else { this.running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
  },
};

/* Small message that slides in at the top and disappears */
function toast(text, emoji = '✨', colour = 'green') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + colour;
  el.innerHTML = `<span class="toast-emoji">${emoji}</span><span>${esc(text)}</span>`;
  const box = $('#toasts');
  box.appendChild(el);
  // Only keep the newest 2 on screen so they don't pile up
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

/* "+20 XP" text that floats up from where you tapped */
function floatText(text, x, y, colour = 'var(--yellow-d)') {
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = colour;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* Big centred pop-up for level-ups, badges and clearing your day.
   Several in a row are queued so they show one after another. */
const Celebrate = {
  queue: [],
  showing: false,
  show({ emoji, title, text, button = 'Keep going!', colour = 'green' }) {
    this.queue.push({ emoji, title, text, button, colour });
    if (!this.showing) this.next();
  },
  next() {
    const item = this.queue.shift();
    const wrap = $('#modal');
    if (!item) { this.showing = false; wrap.hidden = true; return; }
    this.showing = true;
    wrap.innerHTML = `
      <div class="modal pop-in">
        <div class="modal-emoji bounce">${item.emoji}</div>
        <h2>${esc(item.title)}</h2>
        <p>${item.text}</p>
        <button class="btn btn-${item.colour} btn-big btn-block" data-close>${esc(item.button)}</button>
      </div>`;
    wrap.hidden = false;
    $('[data-close]', wrap).onclick = () => this.next();
    Confetti.burst(innerWidth / 2, innerHeight / 2 - 80, 120);
  },
};

// Random hype lines shown when you tick something off
const CHEERS = ['Nice one!', 'Boom 💥', 'Brain gains!', 'Easy.', 'Smashed it!', 'Future you says thanks', 'Unstoppable!', 'One step closer', 'Lets gooo', 'That\'s how it\'s done'];
function randomCheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }
