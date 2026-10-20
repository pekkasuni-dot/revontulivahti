/* Revontulivahti service worker — v187
   Sovelluksen runko välimuistiin. Data haetaan sivulta suoraan verkosta;
   sivu tallentaa sen itse omaan 'rv-data'-välimuistiinsa (ks. index.html NET). */
const CACHE = 'revontulivahti-v187';
const SHELL = ['./', 'index.html', 'i18n.js', 'manifest.webmanifest',
               'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.svg',
               'lib/maplibre-gl.js', 'lib/maplibre-gl.css'];   // MapLibre omana (2026-10)

// cache:'reload' (2026-10): ohita selaimen HTTP-välimuisti asennuksessa.
// Ilman sitä uusi index.html saattoi päätyä välimuistiin VANHAN i18n.js:n
// kanssa (GitHub Pages: max-age 600) -> asetuksissa näkyi raakoja avaimia
// ("settings.clock"), koska vanhasta käännöstiedostosta puuttui uudet avaimet.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))));
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      // 'rv-data'-alkuiset = sovelluksen tallentama data (index.html, NET.cacheName):
      // säilyy päivityksen yli, jotta viimeisin data näkyy myös ilman yhteyttä.
      Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('rv-data')).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ulkoiset lähteet (NOAA, karttatiilet, YouTube): aina verkko, ei välimuistia
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
