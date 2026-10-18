// Synteettinen data --offline-tilaan (ympäristöt ilman verkkoa, esim. Claude-
// kehitysympäristö). Tarkoitus on näyttää KÄYTTÖLIITTYMÄN asettelu, ei oikeaa
// säätä: pilvimassa Pohjanlahdella, tasainen länsituuli, revontuliovaali ~69 °N,
// avaruussää ja Kp. Pohjakartta on tyhjä tausta + maiden nimipisteet
// (geojson-vt + vt-pbf tulevat maplibre-gl:n riippuvuuksina).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export function cloudsFixture(){
  const now = Date.now();
  const init = Math.floor(now / 10800e3) * 10800e3 - 3 * 3600e3;
  const lat0 = 55, lon0 = -30, d = 0.25, nlat = 81, nlon = 361, steps = 17;
  const vals = [];
  for(let s = 0; s < steps; s++) for(let i = 0; i < nlat; i++) for(let j = 0; j < nlon; j++){
    const lat = lat0 + i*d, lon = lon0 + j*d;
    const blob = Math.exp(-(((lon-(19+s*0.6))/4)**2 + ((lat-64)/1.8)**2));
    const clearOulu = Math.exp(-(((lon-25.5)/2.5)**2 + ((lat-65)/1.2)**2));
    const v = 100*blob + 35*Math.max(0, Math.sin(lon/3 + lat/2 + s/3)) - 60*clearOulu;
    vals.push(Math.max(0, Math.min(100, Math.round(v))));
  }
  return {generated: now, source: 'offline-test', lat0, lat1: lat0+(nlat-1)*d, lon0, lon1: lon0+(nlon-1)*d,
    nlat, nlon, dlat: d, dlon: d, times: Array.from({length: steps}, (_, s) => init + s*3*3600e3), vals};
}

export function windFixture(times){
  const nlat = 21, nlon = 91, N = nlat*nlon, steps = times.length;
  const u = Buffer.alloc(N*steps), v = Buffer.alloc(N*steps);
  for(let k = 0; k < N*steps; k++){
    const i = Math.floor((k % N) / nlon);
    u[k] = 128 + 30 + (i % 5) * 4; v[k] = 128 + ((k % nlon) % 7) * 3 - 9;
  }
  return {lat0: 55, lat1: 75, lon0: -30, lon1: 60, nlat, nlon, dlat: 1, dlon: 1, times, vmin: -80, vmax: 80,
    u: u.toString('base64'), v: v.toString('base64')};
}

export function ovationFixture(){
  const coords = [];
  for(let lon = 0; lon < 360; lon++) for(let lat = -90; lat <= 90; lat++){
    const p = lat > 0 ? 38*Math.exp(-(((lat-69)/1.6)**2)) : 0;
    coords.push([lon, lat, Math.round(p)]);
  }
  const iso = t => new Date(t).toISOString().slice(0, 19) + 'Z';
  return {'Observation Time': iso(Date.now()), 'Forecast Time': iso(Date.now() + 40*60e3), coordinates: coords};
}

const iso = t => new Date(t).toISOString().slice(0, 19).replace('T', ' ') + '.000';
// Avaruussää: 24 h minuuttidataa (kuten NOAA:n rtsw_*_1m.json) ja mittauskatko
// 2 h 40 min ... 2 h 15 min sitten (näkyy kaavioissa katkona).
const SW_GAP = [160, 135];   // minuuttia sitten (alku, loppu)
const inGap = k => k <= SW_GAP[0] && k > SW_GAP[1];
export function magFixture(){
  const rows = [], end = Math.floor(Date.now() / 60e3) * 60e3 - 60e3;
  for(let k = 1440; k >= 0; k--){
    if(inGap(k)) continue;
    const bt = 6.5 + 2*Math.sin(k/170) + 0.6*Math.sin(k/13);
    const bz = k <= 32 ? -6.4 + 0.8*Math.sin(k/3) : Math.max(-bt, Math.min(bt, 2.1*Math.sin(k/55) + 1.2*Math.sin(k/9) - 0.4));
    rows.push({time_tag: iso(end - k*60e3), active: true, source: 'SOLAR1', bt: +bt.toFixed(2), bx_gsm: 1, by_gsm: 2, bz_gsm: +bz.toFixed(2)});
  }
  return rows.reverse();
}
export function solarWindFixture(){
  const rows = [], end = Math.floor(Date.now() / 60e3) * 60e3 - 60e3;
  for(let k = 1440; k >= 0; k--){
    if(inGap(k)) continue;
    rows.push({time_tag: iso(end - k*60e3), active: true, source: 'SOLAR1',
      proton_speed: +(470 - 60*Math.cos(k/300) + 8*Math.sin(k/7)).toFixed(1),
      proton_density: +(3.2 + 1.4*Math.sin(k/120) + 0.5*Math.sin(k/11)).toFixed(2), proton_temperature: 1e5});
  }
  return rows.reverse();
}
// NOAA products/geospace/propagated-solar-wind-1-hour.json: viimeinen tunti,
// propagated_time_tag = saapumisaika Maahan (tässä +52 min).
export function propagatedFixture(){
  const end = Math.floor(Date.now() / 60e3) * 60e3 - 60e3, z = t => new Date(t).toISOString().slice(0, 19) + 'Z';
  const rows = [['time_tag', 'speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt', 'vx', 'vy', 'vz', 'propagated_time_tag']];
  for(let k = 54; k >= 0; k--){ const t = end - k*60e3; rows.push([z(t), 470, 3, 1e5, 1, 2, -3, 6, -470, 0, 0, z(t + 52*60e3)]); }
  return rows;
}
export function hemiPowerFixture(){
  const f = t => new Date(t).toISOString().slice(0, 16).replace('T', '_');
  let txt = '#Aurora Hemispheric Power Tabular Values\n# Observation        Forecast            North    South\n';
  const end = Math.floor(Date.now() / 300e3) * 300e3;
  for(let k = 288; k >= 0; k--){ const t = end - k*5*60e3; txt += `${f(t)}    ${f(t + 52*60e3)}    ${Math.round(24 + 14*Math.sin(k/30) + (k < 12 ? 10 : 0))}    18\n`; }
  return txt;
}
// Kp: mitattu 7 vrk (noaa-planetary-k-index.json) + ennustetiedosto
// (observed/estimated/predicted, kuten NOAA:n uusi muoto).
const KP_SERIES = i => Math.max(0, Math.min(9, Math.round((2.3 + 1.8*Math.sin(i/4.5) + (i % 3 === 0 ? 0.33 : 0)) * 3) / 3));
export function kpFixture(){
  const H = 3600e3, cur = Math.floor(Date.now() / (3*H)) * 3*H, rows = [];
  for(let i = 56; i >= 1; i--) rows.push({time_tag: iso(cur - i*3*H).slice(0, 19).replace(' ', 'T'), Kp: +KP_SERIES(56 - i).toFixed(2), a_running: 10, station_count: 8});
  return rows;
}
export function kpForecastFixture(){
  const H = 3600e3, cur = Math.floor(Date.now() / (3*H)) * 3*H, rows = [];
  for(let i = 56; i >= -24; i--){
    const kind = i >= 1 ? 'observed' : i === 0 ? 'estimated' : 'predicted';
    rows.push({time_tag: iso(cur - i*3*H).slice(0, 19).replace(' ', 'T'), kp: +KP_SERIES(56 - i).toFixed(2), observed: kind, noaa_scale: null});
  }
  return rows;
}

// Maiden nimipisteet OpenMapTiles-skeeman place-tasona.
const COUNTRIES = [
  ['Finland','Suomi',26,64.5],['Sweden','Ruotsi',16,62.5],['Norway','Norja',9,61.5],['Denmark','Tanska',9.5,56],
  ['Estonia','Viro',25.5,58.7],['Latvia','Latvia',25,56.9],['Lithuania','Liettua',24,55.3],['Poland','Puola',19.5,52],
  ['Germany','Saksa',10.5,51],['United Kingdom','Yhdistynyt kuningaskunta',-2,53.5],['Iceland','Islanti',-18.5,64.9],
  ['Russia','Venäjä',60,60],['Belarus','Valko-Venäjä',28,53.6],
];
let tileIndex = null;
export function placeTile(z, x, y){
  if(!tileIndex){
    const geojsonvt = require('geojson-vt');
    tileIndex = geojsonvt({type: 'FeatureCollection', features: COUNTRIES.map(([en, fi, lon, lat], i) => ({type: 'Feature',
      properties: {class: 'country', rank: 1 + (i % 3), name: en, 'name:en': en, 'name:fi': fi},
      geometry: {type: 'Point', coordinates: [lon, lat]}}))}, {maxZoom: 14, indexMaxZoom: 4, buffer: 64});
  }
  const t = tileIndex.getTile(z, x, y);
  if(!t) return null;
  const vtpbf = require('vt-pbf');
  return Buffer.from(vtpbf.fromGeojsonVt({place: t}, {version: 2}));
}
