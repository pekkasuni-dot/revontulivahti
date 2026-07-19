/* Revontulivahti service worker — v12
   Sovelluksen runko välimuistiin, data aina verkosta. */
const CACHE = 'revontulivahti-v12';
const SHELL = ['./', 'index.html', 'manifest.webmanifest',
               'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Data-APIt (NOAA, Open-Meteo, karttatiilet): aina verkko, ei välimuistia
  if (url.origin !== location.origin) return;

  // Actions-putken tuottama pilvidata: aina tuoreena verkosta, ei sovellusvälimuistiin
  if (url.pathname.includes('/data/')) return;

  // Oma runko: cache first, päivitys taustalla
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
