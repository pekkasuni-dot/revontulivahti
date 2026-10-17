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
export function magFixture(){
  const rows = [], end = Date.now();
  for(let k = 180; k >= 0; k--) rows.push({time_tag: iso(end - k*60e3), active: true, source: 'DSCOVR',
    bt: 8.2, bx_gsm: 1, by_gsm: 2, bz_gsm: k <= 32 ? -6.4 : 2.1});
  return rows.reverse();
}
export function solarWindFixture(){
  const rows = [], end = Date.now();
  for(let k = 120; k >= 0; k--) rows.push({time_tag: iso(end - k*60e3), active: true, source: 'DSCOVR',
    proton_speed: 512.4, proton_density: 4.27, proton_temperature: 1e5});
  return rows.reverse();
}
export function hemiPowerFixture(){
  const f = t => new Date(t).toISOString().slice(0, 16).replace('T', '_');
  let txt = '# Product: Aurora Hemispheric Power\n# Units: GigaWatts\n';
  for(let k = 6; k >= 0; k--){ const t = Date.now() - k*5*60e3; txt += `${f(t)}    ${f(t + 35*60e3)}    ${30 + k}    18\n`; }
  return txt;
}
export function kpFixture(){ return [{time_tag: iso(Date.now() - 3600e3), Kp: 3.67}]; }

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
