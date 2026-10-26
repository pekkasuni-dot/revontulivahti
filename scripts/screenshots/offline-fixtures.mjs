// Synteettinen data --offline-tilaan (ympäristöt ilman verkkoa, esim. Claude-
// kehitysympäristö). Tarkoitus on näyttää KÄYTTÖLIITTYMÄN asettelu, ei oikeaa
// säätä: pilvimassa Pohjanlahdella, tasainen länsituuli, revontuliovaali ~69 °N,
// avaruussää ja Kp. Pohjakartta on tyhjä tausta + maiden nimipisteet
// (geojson-vt + vt-pbf tulevat maplibre-gl:n riippuvuuksina).
import { createRequire } from 'node:module';
// Simuloitu kello (--time): kaikki fixtuurit lasketaan tästä hetkestä.
let NOW_OVERRIDE = null;
export function setNow(t){ NOW_OVERRIDE = t; }
const nowMs = () => NOW_OVERRIDE ?? Date.now();
const require = createRequire(import.meta.url);

export function cloudsFixture(){
  const now = nowMs();
  const init = Math.floor(now / 10800e3) * 10800e3 - 3 * 3600e3;
  const lat0 = 55, lon0 = -30, d = 0.25, nlat = 121, nlon = 361, steps = 17;   // 55-85 N (model_areas.py)
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

// ECMWF askeltiedostot (2026-10-22): meta + yksi tiedosto per aika-askel.
export function cloudsMeta(c){ const {vals, ...m} = c; return {...m, run: c.times[0], hasLayers: false, stepCount: c.times.length}; }
export function cloudsStep(c, i){ const N = c.nlat*c.nlon; return {vals: c.vals.slice(i*N, (i+1)*N)}; }
// Pilvikerrokset (2026-10-24): HARMONIE/ICON-EU -metassa layerFiles, kerrokset
// omissa tiedostoissaan. Synteettiset kentät: matalat = kokonaispilvisyyden
// länsiosa, keskikorkeat = vyö, yläpilvet = laaja harso idempänä.
export function cloudsMetaLayers(c){ return {...cloudsMeta(c), hasLayers: true, layerFiles: true}; }
export function cloudsLayerStep(c, i){
  const N = c.nlat*c.nlon, low = [], mid = [], high = [];
  for(let k = 0; k < N; k++){
    const lat = c.lat0 + Math.floor(k / c.nlon)*c.dlat, lon = c.lon0 + (k % c.nlon)*c.dlon, v = c.vals[i*N + k];
    low.push(lon < 22 ? v : Math.round(v*0.2));
    mid.push(Math.round(80*Math.exp(-(((lat-62-i*0.1)/1.5)**2))));
    high.push(Math.max(0, Math.min(100, Math.round(90*Math.exp(-(((lon-27-i*0.4)/6)**2 + ((lat-66)/3)**2)) + 20*Math.sin(lon/2 - lat/3)))));
  }
  return {t0: c.times[0], valsLow: low, valsMid: mid, valsHigh: high};
}

// Sumu (2026-10-25): HARMONIE/ICON-EU -metassa fogFiles, tiedostossa vis = näkyvyys / 50 m
// (0-100, 100 = yli 5 km). Synteettinen: sumu Pohjanlahdella, utua ympärillä ja Laatokalla.
export function cloudsMetaFog(c){ return {...cloudsMetaLayers(c), fogFiles: true}; }
export function cloudsFogStep(c, i){
  const N = c.nlat*c.nlon, vis = [];
  for(let k = 0; k < N; k++){
    const lat = c.lat0 + Math.floor(k / c.nlon)*c.dlat, lon = c.lon0 + (k % c.nlon)*c.dlon;
    const f = Math.max(Math.exp(-(((lon-21.2-i*0.1)/1.6)**2 + ((lat-63.4)/0.9)**2)), 0.6*Math.exp(-(((lon-31.5)/1.3)**2 + ((lat-61)/0.7)**2)));
    vis.push(Math.max(0, Math.min(100, Math.round(100 - 115*f))));
  }
  return {t0: c.times[0], vis};
}

// Mallien alueet (scripts/model_areas.py; ICON-EU:n pituusasteet DWD:n
// natiivialue). --model=icon_eu/harmonie rajaa testidatan näihin.
export const MODEL_BOX = {
  ecmwf:    {lat0: 55, lat1: 85,   lon0: -30,   lon1: 60},
  icon_eu:  {lat0: 55, lat1: 70.5, lon0: -23.5, lon1: 62.5},
  harmonie: {lat0: 55, lat1: 73.5, lon0: -1,    lon1: 35},
};
// Rajaa pilvitestidatan (0,25° ECMWF-hila) mallin alueelle.
export function cropClouds(c, box){
  const i0 = Math.round((box.lat0 - c.lat0) / c.dlat), i1 = Math.round((box.lat1 - c.lat0) / c.dlat);
  const j0 = Math.round((box.lon0 - c.lon0) / c.dlon), j1 = Math.round((box.lon1 - c.lon0) / c.dlon);
  const nlat = i1 - i0 + 1, nlon = j1 - j0 + 1, N = c.nlat*c.nlon, vals = [];
  for(let s = 0; s < c.times.length; s++) for(let i = i0; i <= i1; i++) for(let j = j0; j <= j1; j++) vals.push(c.vals[s*N + i*c.nlon + j]);
  return {...c, lat0: c.lat0 + i0*c.dlat, lat1: c.lat0 + i1*c.dlat, lon0: c.lon0 + j0*c.dlon, lon1: c.lon0 + j1*c.dlon, nlat, nlon, vals};
}

export function windFixture(times, box){
  if(box){   // mallin alue, 0,5° hila
    const d = 0.5, nlat = Math.round((box.lat1 - box.lat0)/d) + 1, nlon = Math.round((box.lon1 - box.lon0)/d) + 1, N = nlat*nlon, steps = times.length;
    const u = Buffer.alloc(N*steps), v = Buffer.alloc(N*steps);
    for(let k = 0; k < N*steps; k++){ const i = Math.floor((k % N) / nlon); u[k] = 128 + 20 + (i % 9) * 3; v[k] = 128 + ((k % nlon) % 11) * 2 - 10; }
    return {lat0: box.lat0, lat1: box.lat0 + (nlat-1)*d, lon0: box.lon0, lon1: box.lon0 + (nlon-1)*d, nlat, nlon, dlat: d, dlon: d, times, vmin: -80, vmax: 80,
      u: u.toString('base64'), v: v.toString('base64')};
  }
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
  return {'Observation Time': iso(nowMs()), 'Forecast Time': iso(nowMs() + 40*60e3), coordinates: coords};
}

const iso = t => new Date(t).toISOString().slice(0, 19).replace('T', ' ') + '.000';
// Avaruussää: 24 h minuuttidataa (kuten NOAA:n rtsw_*_1m.json) ja mittauskatko
// 2 h 40 min ... 2 h 15 min sitten (näkyy kaavioissa katkona).
const SW_GAP = [160, 135];   // minuuttia sitten (alku, loppu)
const inGap = k => k <= SW_GAP[0] && k > SW_GAP[1];
export function magFixture(){
  const rows = [], end = Math.floor(nowMs() / 60e3) * 60e3 - 60e3;
  for(let k = 1440; k >= 0; k--){
    if(inGap(k)) continue;
    const bt = 6.5 + 2*Math.sin(k/170) + 0.6*Math.sin(k/13);
    const bz = k <= 32 ? -6.4 + 0.8*Math.sin(k/3) : Math.max(-bt, Math.min(bt, 2.1*Math.sin(k/55) + 1.2*Math.sin(k/9) - 0.4));
    rows.push({time_tag: iso(end - k*60e3), active: true, source: 'SOLAR1', bt: +bt.toFixed(2), bx_gsm: 1, by_gsm: 2, bz_gsm: +bz.toFixed(2)});
  }
  return rows.reverse();
}
export function solarWindFixture(){
  const rows = [], end = Math.floor(nowMs() / 60e3) * 60e3 - 60e3;
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
  const end = Math.floor(nowMs() / 60e3) * 60e3 - 60e3, z = t => new Date(t).toISOString().slice(0, 19) + 'Z';
  const rows = [['time_tag', 'speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt', 'vx', 'vy', 'vz', 'propagated_time_tag']];
  for(let k = 54; k >= 0; k--){ const t = end - k*60e3; rows.push([z(t), 470, 3, 1e5, 1, 2, -3, 6, -470, 0, 0, z(t + 52*60e3)]); }
  return rows;
}
export function hemiPowerFixture(){
  // Kuten NOAA:n tiedosto: vain kuluva UTC-vuorokausi (alkaa 00.00 UTC).
  const f = t => new Date(t).toISOString().slice(0, 16).replace('T', '_');
  let txt = '#Aurora Hemispheric Power Tabular Values\n# Observation        Forecast            North    South\n';
  const end = Math.floor(nowMs() / 300e3) * 300e3, day0 = Math.floor(end / 86400e3) * 86400e3;
  for(let t = day0; t <= end; t += 300e3){ const k = (end - t) / 300e3; txt += `${f(t)}    ${f(t + 52*60e3)}    ${Math.round(24 + 14*Math.sin(k/30) + (k < 12 ? 10 : 0))}    18\n`; }
  return txt;
}
// Kp: mitattu 7 vrk (noaa-planetary-k-index.json) + ennustetiedosto
// (observed/estimated/predicted, kuten NOAA:n uusi muoto).
const KP_SERIES = i => Math.max(0, Math.min(9, Math.round((2.3 + 1.8*Math.sin(i/4.5) + (i % 3 === 0 ? 0.33 : 0)) * 3) / 3));
export function kpFixture(){
  const H = 3600e3, cur = Math.floor(nowMs() / (3*H)) * 3*H, rows = [];
  for(let i = 56; i >= 2; i--) rows.push({time_tag: iso(cur - i*3*H).slice(0, 19).replace(' ', 'T'), Kp: +KP_SERIES(56 - i).toFixed(2), a_running: 10, station_count: 8});
  return rows;
}
export function kpForecastFixture(){
  const H = 3600e3, cur = Math.floor(nowMs() / (3*H)) * 3*H, rows = [];
  for(let i = 56; i >= -24; i--){
    const kind = i >= 2 ? 'observed' : i >= 0 ? 'estimated' : 'predicted';   // päättynyt + kuluva jakso = arvio
    rows.push({time_tag: iso(cur - i*3*H).slice(0, 19).replace(' ', 'T'), kp: +KP_SERIES(56 - i).toFixed(2), observed: kind, noaa_scale: null});
  }
  return rows;
}

// 7 vrk (2026-10): ECMWF-ruutu data/e7d-<r>-<c>.json (ks. scripts/fetch-ecmwf-7d.py).
// Pilvisyys vaihtelee öittäin (CLOUD_BY_NIGHT), lämpötila ja tuuli vuorokausirytmissä.
const CLOUD_BY_NIGHT = [70, 15, 50, 20, 60, 30, 85, 40];
export function e7dFixture(r, c){
  const H = 3600e3, now = nowMs(), run = Math.floor(now / (12*H)) * 12*H - 12*H;
  const steps = [...Array.from({length: 49}, (_, i) => i*3), ...Array.from({length: 12}, (_, i) => 150 + i*6)];
  const n = 11, N = n*n, S = steps.length, tcc = Buffer.alloc(S*N), t2m = Buffer.alloc(S*N), ws = Buffer.alloc(S*N);
  steps.forEach((h, s) => {
    const t = run + h*H, night = Math.floor((t - now + 12*H) / (24*H)), hr = new Date(t).getUTCHours();
    tcc.fill(CLOUD_BY_NIGHT[((night % 8) + 8) % 8], s*N, (s+1)*N);
    t2m.fill(Math.round((-4 + 5*Math.cos((hr - 13)/24*2*Math.PI) + 60) * 2), s*N, (s+1)*N);
    ws.fill(Math.round((4 + (night % 4)*1.5) * 4), s*N, (s+1)*N);
  });
  return JSON.stringify({run, generated: now, source: 'offline-test', lat0: 55 + r*2.5, lon0: -30 + c*2.5, d: 0.25, n,
    times: steps.map(h => run + h*H), t2mOff: 60, t2mScale: 2, wsScale: 4,
    tcc: tcc.toString('base64'), t2m: t2m.toString('base64'), ws: ws.toString('base64')});
}
// NOAA 27 vrk:n ennuste (text/27-day-outlook.txt), vuorokauden suurin Kp.
export function kp27Fixture(){
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], KP = [5, 5, 4, 3, 2, 4, 3, 3], d0 = new Date(nowMs());
  let txt = ':Product: 27-day Space Weather Outlook Table 27DO.txt\n#   UTC      Radio Flux   Planetary   Largest\n#  Date       10.7 cm      A Index    Kp Index\n';
  for(let i = 0; i < 27; i++){
    const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() + i));
    txt += `${d.getUTCFullYear()} ${MON[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}     100          10          ${KP[i % KP.length]}\n`;
  }
  return txt;
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

// Editoitu ennuste (2026-10-26, FMI pal_skandinavia): meta + PNG-askeleet, 255 = ei dataa.
// Synteettinen: selkeä alue Oulun ympärillä, pilvivyö etelässä; luoteiskulma puuttuu
// (kuten oikean mallin vino alue). Tunnin askeleet edellisestä tasatunnista 19 h eteen.
function pngGray(w, h, bytes){
  const zlib = require('node:zlib');
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = buf => { let c = -1; for(const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc((w + 1) * h);
  for(let y = 0; y < h; y++){ raw[y*(w+1)] = 0; for(let x = 0; x < w; x++) raw[y*(w+1)+1+x] = bytes[y*w+x]; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
export function editedFixture(){
  const now = nowMs(), run = Math.floor(now / 3600e3) * 3600e3 - 3600e3 + 40*60e3;
  const t0 = Math.floor(now / 3600e3) * 3600e3 - 3600e3;
  const lat0 = 58, lon0 = 4, d = 0.1, nlat = 147, nlon = 321, steps = 20;
  const meta = {generated: now, model: 'edited', producer: 'pal_skandinavia', run, lat0, lat1: lat0 + (nlat-1)*d,
    lon0, lon1: lon0 + (nlon-1)*d, nlat, nlon, dlat: d, dlon: d, missing: 255,
    times: Array.from({length: steps}, (_, s) => t0 + s*3600e3), stepCount: steps};
  const step = s => { const b = new Uint8Array(nlat*nlon);
    for(let i = 0; i < nlat; i++) for(let j = 0; j < nlon; j++){
      const lat = lat0 + i*d, lon = lon0 + j*d;
      if(lat - 58 > (lon - 4) * 0.9 + 6) { b[i*nlon+j] = 255; continue; }   // luoteiskulma puuttuu
      const clear = Math.exp(-(((lon-25.5)/3)**2 + ((lat-65)/1.5)**2));
      const band = Math.exp(-(((lat-(61.5+s*0.05))/1.2)**2));
      b[i*nlon+j] = Math.max(0, Math.min(100, Math.round(25 + 70*band - 25*clear + 10*Math.sin(lon/2 + s/4))));
    }
    return {t0: run, vals: pngGray(nlon, nlat, b)}; };
  return {meta, step};
}
