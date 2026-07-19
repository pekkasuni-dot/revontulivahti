// Hakee pilviruudukon Open-Meteosta ja kirjoittaa data/clouds.json.
// Ajetaan GitHub Actionsissa kerran tunnissa — käyttäjien selaimet
// lataavat vain valmiin tiedoston, eivätkä kutsu säärajapintaa lainkaan.
// Ruudukon on vastattava sovelluksen CG-määrittelyä (index.html).

import { writeFileSync, mkdirSync } from 'node:fs';

const CG = { lat0: 58, lat1: 71, lon0: 12, lon1: 36, nlat: 19, nlon: 17 };
CG.dlat = (CG.lat1 - CG.lat0) / (CG.nlat - 1);
CG.dlon = (CG.lon1 - CG.lon0) / (CG.nlon - 1);

const lats = Array.from({ length: CG.nlat }, (_, i) => CG.lat0 + i * CG.dlat);
const lons = Array.from({ length: CG.nlon }, (_, i) => CG.lon0 + i * CG.dlon);
const pts = [];
for (const la of lats) for (const lo of lons) pts.push([la, lo]);

const chunks = [];
for (let i = 0; i < pts.length; i += 70) chunks.push(pts.slice(i, i + 70));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let times = null;
let vals = null;
let off = 0;

for (const ch of chunks) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    '?latitude=' + ch.map((p) => p[0].toFixed(2)).join(',') +
    '&longitude=' + ch.map((p) => p[1].toFixed(2)).join(',') +
    '&hourly=cloud_cover&forecast_days=2&timezone=UTC';

  let res = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url);
    if (r.ok) { res = await r.json(); break; }
    console.error(`HTTP ${r.status}, yritys ${attempt + 1}/3`);
    await sleep(15000);
  }
  if (!res) {
    console.error('Haku epäonnistui — ei kirjoiteta tiedostoa. Seuraava ajo yrittää tunnin päästä.');
    process.exit(1);
  }
  if (!Array.isArray(res)) res = [res];

  if (!times) {
    times = res[0].hourly.time.map((t) => Date.parse(t + 'Z'));
    vals = new Array(times.length * CG.nlat * CG.nlon).fill(0);
  }
  res.forEach((loc, j) => {
    const p = off + j;
    const r = Math.floor(p / CG.nlon), c = p % CG.nlon;
    loc.hourly.cloud_cover.forEach((v, t) => {
      vals[t * CG.nlat * CG.nlon + r * CG.nlon + c] = Math.round(v ?? 0);
    });
  });
  off += ch.length;
  await sleep(500);
}

mkdirSync('data', { recursive: true });
writeFileSync('data/clouds.json',
  JSON.stringify({ generated: Date.now(), ...CG, times, vals }));
console.log(`OK: ${times.length} h × ${CG.nlat * CG.nlon} pistettä → data/clouds.json`);
