/* =========================================================================
   app.js — starts the app: page switching ("routing"), the stats bar,
   and registering the service worker (which makes it work offline).
   Pages are chosen by the bit after # in the address, e.g. index.html#plan
   ========================================================================= */

const VIEWS = {
  today: TodayView,
  journey: JourneyView,
  plan: PlanView,
  progress: ProgressView,
  settings: SettingsView,
};

function currentRoute() {
  const r = location.hash.slice(1);
  return VIEWS[r] ? r : 'today';
}

// Draw the current page from scratch
function render() {
  const route = currentRoute();
  const view = $('#view');
  view.innerHTML = VIEWS[route].html();
  VIEWS[route].bind(view);
  document.querySelectorAll('.nav a[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  renderStatbar();
}

// The 🔥 💎 ⚡ bar at the top
function renderStatbar() {
  const lv = levelInfo(S.xp), streak = streakInfo();
  $('#statbar').innerHTML = `
    <a class="stat ${streak.todayDone ? 'lit' : ''}" href="#progress" title="Daily streak">🔥 <b>${streak.current}</b></a>
    <a class="stat" href="#progress" title="Gems to spend in the reward shop">💎 <b>${S.gems}</b></a>
    <a class="stat stat-level" href="#progress" title="${esc(lv.title)}">
      <span class="lv">Lv ${lv.level}</span>
      <span class="mini-bar"><span style="width:${lv.into / lv.need * 100}%"></span></span>
    </a>`;
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// The Focus button in the nav opens the timer (it isn't a normal page)
$('#nav').addEventListener('click', e => {
  if (e.target.closest('[data-act="open-focus"]')) {
    e.preventDefault();
    const next = liveTasks(ensureDay(todayKey())).find(t => !t.done);
    Focus.open(next ? next.id : null);
  }
});

// If the app is left open past midnight, refresh to the new day
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); if ($('#focus').hidden) render(); }
}, 60000);

// Start!
Focus.bind();
render();
checkBadges();

// Ask the browser to keep our data even when storage is low
navigator.storage?.persist?.();

// Offline support (only works when served over http/https, not file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker failed', err));
}
