// Ennustevertailuloki (2026-10-27): puhtaat apufunktiot lokiin ja raporttiin.
// Testit: tests/vertailu.test.mjs. Ks. MUISTIO-selvitykset.md "Ennustevertailuloki".

// Kirjattavat ennusteen pituudet (h ennen kohdetuntia). 1 h = lähes "nyt"
// (Tänä yönä -välilehden ilta), muut käyttäjän pyynnöstä (6/24/48/72 h).
export const LEADS = [1, 6, 24, 48, 72];
// Yön tunnit Suomen aikaa: klo 18-06 (molemmat mukaan, 13 tuntia).
export const NIGHT_FROM = 18, NIGHT_TO = 6;
export const TZ = 'Europe/Helsinki';

// Testipaikat ja vertailuhavainnot. FMI:n havaintoasemat (fmisid), joilla on
// pilvisyys (n_man, oktaa); Lyngenille lähin METAR Sørkjosen (ENSR, ~15 km,
// automaattinen), MET Norjan Frost vaatisi avaimen.
export const PLACES = [
  {id: 'oulu',        name: 'Oulu',        lat: 65.03,  lon: 25.41,  obs: {fmisid: 101786, name: 'Oulu lentoasema'}},
  {id: 'rovaniemi',   name: 'Rovaniemi',   lat: 66.578, lon: 26.015, obs: {fmisid: 101933, name: 'Rovaniemi Apukka'}},
  {id: 'levi',        name: 'Levi',        lat: 67.8,   lon: 24.8,   obs: {fmisid: 101986, name: 'Kittilä lentoasema'}},
  {id: 'sodankyla',   name: 'Sodankylä',   lat: 67.42,  lon: 26.6,   obs: {fmisid: 101932, name: 'Sodankylä Tähtelä'}},
  {id: 'kilpisjarvi', name: 'Kilpisjärvi', lat: 69.05,  lon: 20.79,  obs: {fmisid: 102016, name: 'Kilpisjärvi kyläkeskus'}},
  {id: 'utsjoki',     name: 'Utsjoki',     lat: 69.908, lon: 27.027, obs: {fmisid: 102035, name: 'Utsjoki Kevo'}},
  {id: 'lyngen',      name: 'Lyngen',      lat: 69.75,  lon: 20.6,   obs: {metar: 'ENSR', name: 'Sørkjosen (METAR)'}},
];
export const SOURCES = ['edited', 'harmonie', 'ecmwf'];
export const SRC_NAME = {edited: 'IL editoitu', harmonie: 'HARMONIE', ecmwf: 'ECMWF', app7d: '7 vrk nyt (HARMONIE -> ECMWF)'};

const H = 3600e3;
export const floorHour = ms => Math.floor(ms / H) * H;

// Paikallinen tunti (0-23) Suomen ajassa.
export function localHour(ms, tz = TZ){
  return Number(new Intl.DateTimeFormat('en-GB', {timeZone: tz, hour: '2-digit', hourCycle: 'h23'}).format(new Date(ms)));
}
export const isNightHour = (ms, tz = TZ) => { const h = localHour(ms, tz); return h >= NIGHT_FROM || h <= NIGHT_TO; };

// Yön tunniste = illan päivämäärä Suomen ajassa (klo 00-06 kuuluu edellisen päivän yöhön).
export function nightId(ms, tz = TZ){
  const d = localHour(ms, tz) <= NIGHT_TO ? ms - 12 * H : ms;
  return new Intl.DateTimeFormat('sv-SE', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(d));
}

// Kohdetunnit tälle ajolle: kullekin pituudelle L tunti floor(t)+L, jos se on yötuntia.
export function leadTargets(tMs, leads = LEADS){
  const h0 = floorHour(tMs);
  return leads.map(L => ({lead: L, target: h0 + L * H})).filter(x => isNightHour(x.target));
}

// FMI:n n_man (oktaa 0-8, 9 = taivas ei näy, esim. sumu) -> %.
export function octasToPct(o){
  if(o == null || !Number.isFinite(o) || o < 0) return null;
  return o >= 9 ? 100 : Math.round(Math.min(8, o) / 8 * 100);
}

// METAR -> pilvisyys %: suurin kerros (FEW 1-2/8, SCT 3-4/8, BKN 5-7/8, OVC 8/8,
// VV = taivas ei näy). NCD/NSC/CAVOK/SKC/CLR = 0. Ei tietoa ("///") -> null.
// Rajoitus: CAVOK/NSC eivät kerro yli 5000 ft:n pilvistä, automaattiasema näkee
// vain ceilometrin pystysuoran yläpuolelta.
const METAR_COVER = {FEW: 19, SCT: 44, BKN: 75, OVC: 100, VV: 100};
export function metarToPct(raw){
  if(!raw) return null;
  const body = String(raw).split(/\sRMK\s/)[0];
  if(/\b(CAVOK|NCD|NSC|SKC|CLR)\b/.test(body)) return 0;
  let best = null;
  for(const m of body.matchAll(/\b(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)/g)) best = Math.max(best ?? 0, METAR_COVER[m[1]]);
  return best;
}

// Ennusteen arvo tasatunnille aikasarjasta [{t, v}] (t ms, järjestyksessä),
// lineaarinen ajassa; ei ekstrapolointia.
export function seriesAt(series, t){
  if(!series || !series.length) return null;
  for(let i = 0; i < series.length; i++){
    const a = series[i];
    if(a.t === t) return a.v;
    const b = series[i + 1];
    if(b && a.t < t && t < b.t){
      if(a.v == null || b.v == null) return null;
      return a.v + (b.v - a.v) * (t - a.t) / (b.t - a.t);
    }
  }
  return null;
}

// ECMWF 7 vrk -ruutu (data/e7d-<r>-<c>.json, sama laskenta kuin sovelluksen
// weekTileAt): bilineaarinen paikassa, lineaarinen ajassa.
export const E7D_TILE = {lat0: 55, lat1: 85, lon0: -30, lon1: 60, size: 2.5, rows: 12, cols: 36};
export function e7dTileKey(lat, lon, T = E7D_TILE){
  if(lat < T.lat0 || lat > T.lat1 || lon < T.lon0 || lon > T.lon1) return null;
  return Math.min(T.rows - 1, Math.floor((lat - T.lat0) / T.size)) + '-' + Math.min(T.cols - 1, Math.floor((lon - T.lon0) / T.size));
}
export function e7dAt(T, lat, lon, t){
  const ts = T.times;
  if(!ts || t < ts[0] || t > ts[ts.length - 1]) return null;
  let k = 0;
  while(k < ts.length - 2 && ts[k + 1] <= t) k++;
  const f = (t - ts[k]) / (ts[k + 1] - ts[k]);
  const n = T.n, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const y = cl((lat - T.lat0) / T.d, 0, n - 1), x = cl((lon - T.lon0) / T.d, 0, n - 1);
  const i0 = Math.min(Math.floor(y), n - 2), j0 = Math.min(Math.floor(x), n - 2), fy = y - i0, fx = x - j0, a = T.tcc;
  const at = s => {
    const b = s * n * n, v = (r, c) => a[b + r * n + c];
    return (v(i0, j0) * (1 - fx) + v(i0, j0 + 1) * fx) * (1 - fy) + (v(i0 + 1, j0) * (1 - fx) + v(i0 + 1, j0 + 1) * fx) * fy;
  };
  return at(k) * (1 - f) + at(k + 1) * f;
}

/* ── Raportti ── */
// Luokat (oktaa): selkeä <= 2/8, puolipilvinen 3-5/8, pilvinen >= 6/8.
export const CLASS_EDGES = [31.25, 68.75];
export const cloudClass = p => p == null ? null : p <= CLASS_EDGES[0] ? 'selkea' : p <= CLASS_EDGES[1] ? 'puoli' : 'pilvi';

// Lokirivit -> havainnot {place|hour -> %} ja ennusteparit.
export function collect(rows){
  const obs = new Map(), fc = [];
  for(const r of rows){
    for(const [pid, p] of Object.entries(r.places || {})){
      for(const o of p.obs || []) if(o.v != null) obs.set(pid + '|' + o.h, o.v);
      for(const [src, byLead] of Object.entries(p.fc || {})){
        for(const [L, v] of Object.entries(byLead)){
          if(v == null) continue;
          fc.push({place: pid, src, lead: Number(L), target: floorHour(Date.parse(r.t)) + Number(L) * H, v});
        }
      }
    }
  }
  return {obs, fc};
}

// Yöt: paikka + yö -> havaintojen keskiarvo ja luokka (vähintään puolet yön tunneista havaittu).
export function nights(obs){
  const acc = new Map();
  for(const [k, v] of obs){
    const [pid, h] = k.split('|');
    const key = pid + '|' + nightId(Number(h));
    const a = acc.get(key) || {place: pid, night: nightId(Number(h)), n: 0, sum: 0};
    a.n++; a.sum += v; acc.set(key, a);
  }
  const out = new Map();
  for(const [k, a] of acc){
    if(a.n < 7) continue;   // 13 yötuntia, vähintään 7 havaittua
    const mean = a.sum / a.n;
    out.set(k, {...a, mean, cls: cloudClass(mean)});
  }
  return out;
}

// Tilastot: ryhmä -> n, MAE (%-yks.), harha (ennuste - havainto), luokkaosuma (%).
export function stats(pairs){
  if(!pairs.length) return {n: 0, mae: null, bias: null, hit: null};
  let ae = 0, b = 0, hit = 0;
  for(const p of pairs){ ae += Math.abs(p.f - p.o); b += p.f - p.o; if(cloudClass(p.f) === cloudClass(p.o)) hit++; }
  return {n: pairs.length, mae: ae / pairs.length, bias: b / pairs.length, hit: 100 * hit / pairs.length};
}

// Ennuste-havaintoparit. Lisäksi "app7d" = mitä 7 vrk -välilehti nyt näyttää
// HARMONIE valittuna: HARMONIE kohdetunnille, jos se on alle 30 h ajon hetkestä,
// muuten ECMWF 7 vrk (sovelluksen HARMONIE-tiedostot ulottuvat 30 h).
export function pairs(rows, {app7dHarmonieH = 30} = {}){
  const {obs, fc} = collect(rows), ns = nights(obs), out = [];
  for(const f of fc){
    const o = obs.get(f.place + '|' + f.target);
    if(o == null) continue;
    const night = ns.get(f.place + '|' + nightId(f.target));
    const p = {...f, o, f: f.v, night: nightId(f.target), cls: night ? night.cls : null};
    out.push(p);
  }
  for(const p of out.filter(p => p.src === 'harmonie' || p.src === 'ecmwf')){
    const useH = p.lead < app7dHarmonieH;
    if((useH && p.src === 'harmonie') || (!useH && p.src === 'ecmwf')) out.push({...p, src: 'app7d'});
  }
  return {pairs: out, nights: ns};
}
