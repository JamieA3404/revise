/* =========================================================================
   app.js — starts the app: page switching ("routing"), the stats bar,
   and registering the service worker (which makes it work offline).
   Pages are chosen by the bit after # in the address, e.g. index.html#plan
   ========================================================================= */

const VIEWS = {
  today: TodayView,
  roadmap: RoadmapView,
  mastery: MasteryView,
  future: FutureView,
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

// The 🔥 streak at the top
function renderStatbar() {
  const streak = streakInfo();
  const sync = (typeof Sync !== 'undefined') ? Sync.label() : '';
  $('#statbar').innerHTML = `
    ${sync ? `<a class="stat stat-sync ${Sync.status}" href="#settings" title="${esc(Sync.error || 'Syncing between your devices')}">${sync}</a>` : ''}
    <span class="stat ${streak.todayDone ? 'lit' : ''}" title="Daily streak">🔥 <b>${streak.current}</b> day${streak.current === 1 ? '' : 's'}</span>`;
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// If the app is left open past midnight, refresh to the new day
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); ensurePlan(); if ($('#focus').hidden && currentRoute() !== 'session') render(); }
}, 60000);

// Start!
Focus.bind();
Music.init();
ensurePlan();
render();
Sync.start(); // live sync between devices, if you've set it up in Settings

// Ask the browser to keep our data even when storage is low
navigator.storage?.persist?.();

// Offline support (only works when served over http/https, not file://)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker failed', err));
}
