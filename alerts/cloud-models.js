/* Pilvimallit hälytysajoon (2026-10-24, kenttätesti).
   Lataa ECMWF:n (yksi tiedosto) sekä ICON-EU:n ja HARMONIEn (meta + askel-
   tiedostot) GitHub Pagesilta ja rakentaa niistä saman hilamuodon kuin
   sovellus (aurora-core.js: buildCloudGridFull / gridGeom). Askeleista
   ladataan vain tarvittavat (nykyhetki, Tänä yönä -tarkistuksessa yön tunnit).
   ICON-EU:n kentät ovat harmaasävy-PNG:itä (base64); purku tässä ilman
   kirjastoa, zlib-purkufunktio annetaan parametrina (Node: zlib.inflateSync).
   Ei verkko- eikä Node-riippuvuuksia itsessään -> testattavissa. */
(function(root){
'use strict';

const BASE = 'https://pekkasuni-dot.github.io/revontulivahti/data/';
const MODELS = {
  ecmwf:    {name: 'ECMWF',    full: 'clouds-ecmwf.json'},
  icon_eu:  {name: 'ICON-EU',  meta: 'clouds-icon_eu-meta.json',  step: i => 'clouds-icon_eu-step' + String(i).padStart(2, '0') + '.json'},
  harmonie: {name: 'HARMONIE', meta: 'clouds-harmonie-meta.json', step: i => 'clouds-harmonie-step' + String(i).padStart(2, '0') + '.json'},
};

const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64'))
  : Uint8Array.from(atob(s), c => c.charCodeAt(0));

// Harmaasävy-PNG (8 bit, lomittamaton) -> {width, height, data}. Sama purku kuin
// sovelluksen decodePngGray (index.html), mutta synkroninen inflate-funktio.
function decodePngGray(bytes, inflate){
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  for(let i = 0; i < 8; i++) if(bytes[i] !== SIG[i]) throw new Error('ei PNG');
  let pos = 8, width = 0, height = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  while(pos + 8 <= bytes.length){
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    if(type === 'IHDR'){ width = dv.getUint32(pos + 8); height = dv.getUint32(pos + 12); depth = body[8]; ctype = body[9]; interlace = body[12]; }
    else if(type === 'IDAT') idat.push(body);
    else if(type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = {0: 1, 2: 3, 4: 2, 6: 4}[ctype];
  if(depth !== 8 || !bpp || interlace !== 0) throw new Error('PNG-muotoa ei tueta');
  const total = idat.reduce((s, a) => s + a.length, 0), z = new Uint8Array(total);
  let o = 0; for(const a of idat){ z.set(a, o); o += a.length; }
  const raw = inflate(z), stride = width * bpp;
  if(raw.length < height * (stride + 1)) throw new Error('PNG-data vajaa');
  const cur = new Uint8Array(stride), prev = new Uint8Array(stride), out = new Uint8Array(width * height);
  for(let y = 0; y < height; y++){
    const off = y * (stride + 1), ft = raw[off];
    for(let x = 0; x < stride; x++){
      const r = raw[off + 1 + x], a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v;
      switch(ft){
        case 0: v = r; break;
        case 1: v = r + a; break;
        case 2: v = r + b; break;
        case 3: v = r + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                  v = r + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c)); break; }
        default: throw new Error('PNG-suodatin ' + ft);
      }
      cur[x] = v;
    }
    for(let x = 0; x < width; x++) out[y * width + x] = cur[x * bpp];
    prev.set(cur);
  }
  return {width, height, data: out};
}

// Kenttä (taulukko 0..100 tai PNG-merkkijono) -> Float32Array 0..1.
function decodeField(v, g, inflate){
  const N = g.nlat * g.nlon;
  if(v == null) return null;
  if(Array.isArray(v)){ const out = new Float32Array(N); for(let i = 0; i < N; i++) out[i] = (v[i] || 0) / 100; return out; }
  if(typeof v === 'string'){
    const p = decodePngGray(b64(v), inflate);
    if(p.width !== g.nlon || p.height !== g.nlat) throw new Error('PNG-kentän koko ei täsmää metaan');
    const out = new Float32Array(N);
    for(let i = 0; i < N; i++) out[i] = Math.min(p.data[i], 100) / 100;
    return out;
  }
  return null;
}

// Askelindeksit, joita tarvitaan annetuille hetkille (interpolointi i0..i1).
function stepsFor(times, dates){
  const C = root.AuroraCore || (typeof require === 'function' ? require('../aurora-core.js') : null);
  const need = new Set();
  for(const d of dates){
    if(d < times[0] || d > times[times.length - 1]) continue;
    const tf = C.timeFloatInArray(times, d), i0 = Math.floor(tf);
    need.add(i0); need.add(Math.min(i0 + 1, times.length - 1));
  }
  return [...need].sort((a, b) => a - b);
}

// Laiska malli: meta + valitut askeleet. getJSON(url) -> Promise<olio>.
// Askel kelpaa vain, jos sen t0 (jos on) = metan 1. aika (sama ajo).
// Vain kokonaispilvisyys: kerrokset ovat omissa tiedostoissaan eivätkä
// vaikuta näkyvyyteen (2026-10-24).
async function loadLazyGrid(C, key, dates, getJSON, inflate, base = BASE){
  const M = MODELS[key];
  const meta = await getJSON(base + M.meta);
  const times = meta.times.map(t => new Date(t));
  const r = meta.run ? new Date(meta.run) : null;
  const g = {times, isLazy: true, steps: new Map(), pending: new Set(), stepFile: null,
    run: r && !isNaN(r) ? r : times[0], model: key, ...C.gridGeom(meta)};
  const idx = stepsFor(times, dates);
  await Promise.all(idx.map(async i => {
    const d = await getJSON(base + M.step(i));
    if(d.t0 != null && d.t0 !== times[0].getTime()) throw new Error(M.name + ' askel ' + i + ' eri ajosta kuin meta');
    const vals = decodeField(d.vals, g, inflate);
    if(!vals) throw new Error(M.name + ' askel ' + i + ': ei arvoja');
    g.steps.set(i, {vals});
  }));
  return g;
}

// Onko malli käyttökelpoinen hälytykseen: ajo enintään maxAgeH tuntia vanha
// ja nykyhetki ennusteen sisällä. Palauttaa {ok, reason}.
function gridFresh(g, now, maxAgeH){
  if(!g) return {ok: false, reason: 'ei dataa'};
  const age = (now.getTime() - g.run.getTime()) / 3600e3;
  if(age > maxAgeH) return {ok: false, reason: 'ajo ' + Math.round(age) + ' h vanha (raja ' + maxAgeH + ' h)'};
  if(now > g.times[g.times.length - 1]) return {ok: false, reason: 'ennuste päättynyt'};
  return {ok: true, reason: 'ajo ' + Math.round(age) + ' h vanha'};
}

const CloudModels = {BASE, MODELS, decodePngGray, decodeField, stepsFor, loadLazyGrid, gridFresh};
root.CloudModels = CloudModels;
if(typeof module !== 'undefined' && module.exports) module.exports = CloudModels;
})(typeof globalThis !== 'undefined' ? globalThis : this);
