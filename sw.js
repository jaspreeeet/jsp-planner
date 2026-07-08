/* JSP·OS service worker — offline-first, network-refresh */
const VERSION = 'jsp-os-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/main.css',
  'js/main.js', 'js/core.js', 'js/wm.js',
  'js/apps/today.js', 'js/apps/meds.js', 'js/apps/routines.js', 'js/apps/planner.js',
  'js/apps/journal.js', 'js/apps/trackers.js', 'js/apps/collections.js', 'js/apps/photos.js',
  'js/apps/unstuck.js', 'js/apps/selfcare.js', 'js/apps/games.js', 'js/apps/shortcuts.js',
  'js/apps/launcher.js', 'js/apps/mixtape.js', 'js/apps/stats.js', 'js/apps/sync.js',
  'fonts/silkscreen-400.woff2', 'fonts/silkscreen-700.woff2', 'fonts/vt323.woff2',
  'fonts/instrument-serif.woff2', 'fonts/instrument-serif-italic.woff2',
  'assets/icons/favicon.svg', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch audio streams etc.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
