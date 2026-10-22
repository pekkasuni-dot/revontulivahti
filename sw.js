/* Revontulivahti service worker — v216
   Sovelluksen runko välimuistiin. Data haetaan sivulta suoraan verkosta;
   sivu tallentaa sen itse omaan 'rv-data'-välimuistiinsa (ks. index.html NET). */
const CACHE = 'revontulivahti-v216';
const SHELL = ['./', 'index.html', 'i18n.js', 'aurora-core.js', 'manifest.webmanifest',
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
      // 'rv-data' (index.html NET.cacheName) ja 'rv-tiles' (pohjakartta, alla)
      // säilyvät sovelluksen päivityksen yli.
      Promise.all(keys.filter(k => k !== CACHE && !k.startsWith('rv-data') && !k.startsWith('rv-tiles')).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Pohjakartta ilman yhteyttä (2026-10, kuten Windy): kartan palat, kirjasimet,
// korkeustiilet ja ilmakuvat tallennetaan katsottaessa. Verkko ensin (ei muuta
// toimintaa yhteyden kanssa), ilman yhteyttä viimeksi tallennettu. Enintään
// TILE_MAX palaa (n. 50 Mt), vanhimmat poistetaan ensin.
const TILE_CACHE = 'rv-tiles-v1', TILE_MAX = 1500;
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'server.arcgisonline.com',
                    'fonts.googleapis.com', 'fonts.gstatic.com'];
let tilePuts = 0;
async function trimTiles(c){
  const keys = await c.keys();
  for (let i = 0; i < keys.length - TILE_MAX; i++) await c.delete(keys[i]);
}
function tileFetch(req){
  return fetch(req).then(res => {
    if (res.ok && res.type !== 'opaque') {
      const copy = res.clone();
      caches.open(TILE_CACHE).then(c => c.put(req, copy).then(() => { if (++tilePuts % 50 === 0) return trimTiles(c); })).catch(() => {});
    }
    return res;
  }).catch(err => caches.open(TILE_CACHE).then(c => c.match(req)).then(hit => hit || Promise.reject(err)));
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ulkoiset lähteet: pohjakartta tallennetaan (yllä), muut (NOAA, YouTube) aina verkosta
  if (url.origin !== location.origin) {
    if (e.request.method === 'GET' && TILE_HOSTS.includes(url.hostname)
        && (url.hostname !== 's3.amazonaws.com' || url.pathname.startsWith('/elevation-tiles-prod/')))
      e.respondWith(tileFetch(e.request));
    return;
  }

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
