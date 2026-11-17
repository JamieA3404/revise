/* =========================================================================
   app.js — starts the app: page switching ("routing"), the stats bar,
   and registering the service worker (which makes it work offline).
   Pages are chosen by the bit after # in the address, e.g. index.html#plan
   ========================================================================= */

const VIEWS = {
  today: TodayView,
  roadmap: RoadmapView,
  mastery: MasteryView,
  settings: SettingsView,
  session: SessionView,   // #session/<id>
};

function currentRoute() {
  const r = location.hash.slice(1).split('/')[0];
  return VIEWS[r] ? r : 'today';
}

// Draw the current page from scratch
function render() {
  const route = currentRoute();
  const view = $('#view');
  view.innerHTML = VIEWS[route].html();
  VIEWS[route].bind(view);
  const navRoute = route === 'session' ? 'today' : route;
  document.querySelectorAll('.nav a[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === navRoute));
  renderStatbar();
}

// The 🔥 ⚡ bar at the top
function renderStatbar() {
  const lv = levelInfo(S.xp), streak = streakInfo();
  $('#statbar').innerHTML = `
    <span class="stat ${streak.todayDone ? 'lit' : ''}" title="Daily streak">🔥 <b>${streak.current}</b></span>
    <span class="stat stat-level" title="${esc(lv.title)}">
      <span class="lv">Lv ${lv.level}</span>
      <span class="mini-bar"><span style="width:${lv.into / lv.need * 100}%"></span></span>
    </span>`;
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// If the app is left open past midnight, refresh to the new day
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); ensurePlan(); if ($('#focus').hidden && currentRoute() !== 'session') render(); }
}, 60000);

// Start!
Focus.bind();
ensurePlan();
render();

// Ask the browser to keep our data even when storage is low
navigator.storage?.persist?.();

// Offline support (only works when served over http/https, not file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker failed', err));
}
