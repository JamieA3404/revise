/* =========================================================================
   sw.js — the "service worker". It saves a copy of every app file so the
   app opens with no internet.

   After you edit any file: change CACHE_VERSION (e.g. 'v2'), so devices
   download the new files. Open the app twice to see the update.
   ========================================================================= */

const CACHE_VERSION = 'v1';
const CACHE = 'revise-' + CACHE_VERSION;

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/data.js',
  'js/audio.js',
  'js/fx.js',
  'js/rewards.js',
  'js/views/today.js',
  'js/views/focus.js',
  'js/views/plan.js',
  'js/views/journey.js',
  'js/views/progress.js',
  'js/views/settings.js',
  'js/app.js',
  'icons/icon.svg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

// Install: download and store all files
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Activate: delete caches from older versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('revise-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: answer from the cache instantly, and refresh the cache in the
// background when online ("stale-while-revalidate").
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
