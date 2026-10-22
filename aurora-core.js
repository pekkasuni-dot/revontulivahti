/* ══════════════════════════════════════════════════════════════
   AURORA-CORE (2026-10): sovelluksen ja hälytysten YHTEISET laskentafunktiot
   ──────────────────────────────────────────────────────────────
   Puhtaat funktiot ilman sovelluksen tilaa (state) ja DOMia: auringon ja
   kuun asema, pimeys, geomagneettinen leveys, OVATION-arvo, pilvihilan
   näytteistys (bikubinen Catmull-Rom, sama kuin kartan varjostin),
   näkyvyysindeksi, Bz-trendi ja "Tulossa"-vihje, Kp nyt / Kp-jaksot ja
   Tänä yönä -laskenta. Siirretty index.html:stä SELLAISENAAN (vain tila
   argumenteiksi) -> sama koodi selaimessa, GitHub Actionsissa (Node) ja
   myöhemmin Cloudflare Workerissa. ÄLÄ kopioi kaavoja muualle: muutos
   tähän tiedostoon muuttaa sekä sovelluksen että hälytykset.
   Lataus: selain <script src="aurora-core.js"> (globalThis.AuroraCore),
   Node require()/import (module.exports). Ei riippuvuuksia.
   ══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));

/* ── Säätövakiot (sovellus lukee nämä: NIGHT, SPACE_WX, KP_RT) ── */
// Pimeyden raja = sama kuin näkyvyysindeksin darknessFactor(): aurinko
// alle -6° -> pimeyskerroin > 0.
const SUN_DARK_DEG = -6;
// Kp:stä johdettu revontuliarvio (tulevaisuuden tunnit, Tänä yönä).
// Ovaalin ekvaattorinpuoleinen raja GEOMAGNEETTISENA leveysasteena:
// boundary = boundary0 - perKp × Kp (NOAA SWPC:n Kp-taulukko: Kp0 ≈ 66,5°
// … Kp9 ≈ 48°). Arvio % = base + (maglat - boundary) × perDeg, rajattu
// 0..max. Luokat: alle goodMin heikko, alle greatMin hyvä, muuten erinomainen.
const KP_VIS = {boundary0: 66.5, perKp: 2.05, base: 45, perDeg: 12, max: 100, goodMin: 30, greatMin: 60};
const NIGHT_CFG = {
  darkDeg: SUN_DARK_DEG,   // pimeyden raja = sama kuin näkyvyysindeksissä
  maxHours: 16,            // pisin näytettävä jakso (napapiirin kaamos)
  goodMin: 40,             // kynnys %: hyvä mahdollisuus + korostus (= INFO_BAR.idxHiMin)
  moonHorizon: 0.125,      // kuun geosentrinen korkeus nousu-/laskuhetkellä (°)
};
const BZ = {
  staleMin: 15,              // tätä vanhempi mittaus = "ei tuoretta dataa"
  smoothMin: 10,             // Bz:n liukuvan keskiarvon ikkuna (min)
  maxGapMin: 15,             // tätä pidempi katko katkaisee "etelään"-jakson
  // "Tulossa"-vihje: liukuva Bz <= bzMax JA etelään >= minDurationMin JA Bt >= btMin
  hint: {bzMax: -5, minDurationMin: 20, btMin: 6},
};
const KP_RT = {
  staleMin: 20,      // vanhempi viimeisin minuuttiarvo -> ei reaaliaikaista arviota
  carryMin: 60,      // jakson alussa näin kauan nyt-arvo = max(edellinen jakso, uusin minuuttiarvio)
};
// NOAA:n aurinkotuulitiedostojen kentät (uusi rtsw-nimi ensin, vanha varalla).
const SW_FIELDS = {
  mag:  {bz:['bz_gsm','bz_gse'], bt:['bt']},
  wind: {speed:['proton_speed','speed'], density:['proton_density','density']},
};

/* ── astronomia ja geomagnetismi ── */
/* ── astronomia: auringon korkeus ────────────────────────────── */
function sunAltitude(date, lat, lon){
  const rad=Math.PI/180;
  const d = (date/86400000) - 10957.5;           // days since J2000
  const g = rad*(357.529 + 0.98560028*d);        // mean anomaly
  const q = 280.459 + 0.98564736*d;              // mean longitude
  const L = rad*(q + 1.915*Math.sin(g) + 0.020*Math.sin(2*g)); // ecliptic lon
  const e = rad*(23.439 - 0.00000036*d);         // obliquity
  const RA = Math.atan2(Math.cos(e)*Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e)*Math.sin(L));
  const GMST = (18.697374558 + 24.06570982441908*d) % 24;
  const LST = rad*((GMST*15 + lon) % 360);
  const H = LST - RA;                            // hour angle
  const alt = Math.asin(Math.sin(rad*lat)*Math.sin(dec)
            + Math.cos(rad*lat)*Math.cos(dec)*Math.cos(H));
  return alt/rad;                                // degrees
}

/* ── geomagneettinen leveysaste (dipoliapproksimaatio) ───────── */
function magLat(lat,lon){
  const rad=Math.PI/180;
  const latP=80.7*rad, lonP=-72.7*rad;
  const la=lat*rad, lo=lon*rad;
  return Math.asin(Math.sin(la)*Math.sin(latP)
       + Math.cos(la)*Math.cos(latP)*Math.cos(lo-lonP))/rad;
}

function darknessFactor(altDeg){
  // aurinko yli -6° → liian valoisaa; alle -12° → täysi pimeys
  if(altDeg >= -6) return 0;
  if(altDeg <= -12) return 1;
  return (-6 - altDeg)/6;
}

// Pimeä jakso (aurinko alle SUN_DARK_DEG) nykyhetkestä eteenpäin:
// {now:true|false, from, to} tai {none:true} (ei pimeää 36 h sisällä) tai
// {all:true} (pimeää koko tarkastelujakson). Haku 10 min askelin, rajat
// tarkennetaan puolitushaulla minuutin tarkkuuteen.
function darkPeriod(lat, lon, now){
  const isDark = t => sunAltitude(new Date(t), lat, lon) < SUN_DARK_DEG;
  const STEP = 10*60e3, H = 36*3600e3, t0 = now.getTime();
  // a ja b eri tilassa (kumpi tahansa järjestys) -> raja sekunnin tarkkuudella,
  // pyöristettynä lähimpään minuuttiin. Ennen (minuutin puolitus) tulos riippui
  // hakuruudukosta eli kutsuhetkestä -> sama raja näkyi eri kohdissa minuutin
  // erolla (18.42 / 18.43, 2. kierros kohta 7).
  const edge = (a, b) => {
    const da = isDark(a);
    while(Math.abs(b - a) > 1e3){ const m = (a + b) / 2; if(isDark(m) === da) a = m; else b = m; }
    return new Date(Math.round(Math.max(a, b) / 60e3) * 60e3);
  };
  const scan = (from, dir, want) => {   // ensimmäinen hetki jossa tila = want
    for(let k = 1; k * STEP <= H; k++){
      const tt = from + dir * k * STEP;
      if(isDark(tt) === want) return edge(from + dir * (k-1) * STEP, tt);
    }
    return null;
  };
  if(isDark(t0)){
    const to = scan(t0, 1, false), from = scan(t0, -1, false);
    if(!to) return {all:true};
    return {now:true, from, to};
  }
  const from = scan(t0, 1, true);
  if(!from) return {none:true};
  const to = scan(from.getTime(), 1, false);
  return {now:false, from, to};
}

function kpVisibility(kp, mlat){
  const k = KP_VIS, boundary = k.boundary0 - k.perKp*kp;
  const p = clamp(k.base + (mlat - boundary)*k.perDeg, 0, k.max);
  return {p, cls: p >= k.greatMin ? 'great' : p >= k.goodMin ? 'good' : 'weak'};
}

// Paikan Kp-raja: Kp, jolla revontulivyöhykkeen reuna (kpVisibility:n
// boundary, jossa arvio = base 45 %) ulottuu paikan geomagneettiselle
// leveysasteelle. Sama muunnos kuin Tänä yönä -välilehdellä (käänteinen).
// Negatiivinen = paikka on vyöhykkeellä jo Kp 0:lla.
function kpRequired(mlat){
  const k = KP_VIS;
  return (k.boundary0 - mlat) / k.perKp;
}

// OVATION-arvo pisteessä bilineaarisesti (solun keskipiste kokonaisluvussa:
// lon 0..359, lat -90..90). Pituusaste kiertää (359 -> 0), leveysaste
// rajataan hilaan. Sama funktio ruudukon näytteistykseen ja lippuun.
function ovationBilinear(g, lat, lon){
  const fx = ((lon % 360) + 360) % 360, ix = Math.floor(fx), tx = fx - ix;
  const fy = clamp(lat + 90, 0, 180), iy = Math.min(Math.floor(fy), 179), ty = fy - iy;
  const x0 = ix % 360, x1 = (ix + 1) % 360, r0 = iy*360, r1 = (iy+1)*360;
  return (g[r0+x0]*(1-tx) + g[r0+x1]*tx)*(1-ty) + (g[r1+x0]*(1-tx) + g[r1+x1]*tx)*ty;
}

/* ── indeksin laskenta ───────────────────────────────────────── */
// Catmull-Rom-kaava (4 pistetta, p0..p3, t=0..1 valilla p1->p2) - SAMA
// kaava jota kartan shader kayttaa (ks. cwgFragSource():n catromWeights()-funktio).
// Palauttaa TARKALLEEN p1:n kun t=0 ja p2:n kun t=1 (Catmull-Romin
// maaritelma), EI koskaan p0/p3:aa tarkalleen - talla on merkitysta
// hilan reunaindeksoinnille alla, ks. kommentti.
function catmullRom(p0,p1,p2,p3,t){
  const t2=t*t, t3=t2*t;
  return 0.5*((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3);
}

// Yleinen aika->liukuindeksi-haku mielle tahansa (nouseva, Date[]) -taulukolle.
// cloudGrid ja windGrid kayttavat samaa logiikkaa, kumpikin omalla times-taulukollaan.
function timeFloatInArray(ts, date){
  const t = date.getTime();
  if(t <= ts[0].getTime()) return 0;
  if(t >= ts[ts.length-1].getTime()) return ts.length - 1.0001;
  let lo = 0, hi = ts.length - 1;
  while(hi - lo > 1){ const mid = (lo+hi)>>1; if(t >= ts[mid].getTime()) lo=mid; else hi=mid; }
  return lo + Math.min((t - ts[lo].getTime()) / (ts[lo+1].getTime() - ts[lo].getTime()), 0.9999);
}

// Palauttaa {idx, data}-objektin halutulle aika-askeleelle - jos tarkkaa
// askelta ei ole viela ladattu (laiska hila), etsii LAHIMMAN jo ladatun
// askeleen molempiin suuntiin (nain ruutu ei jaa tyhjaksi/mustaksi latauksen
// ajaksi, vaan nayttaa hetken verran hieman vanhempaa/uudempaa dataa).
// Palauttaa null jos YHTAAN askelta ei ole viela ladattu lainkaan.
function resolveStep(g, idx){
  if(!g || !g.steps) return null;
  if(g.steps.has(idx)) return {idx, data:g.steps.get(idx)};
  for(let d=1; d<g.times.length; d++){
    if(idx-d>=0 && g.steps.has(idx-d)) return {idx:idx-d, data:g.steps.get(idx-d)};
    if(idx+d<g.times.length && g.steps.has(idx+d)) return {idx:idx+d, data:g.steps.get(idx+d)};
  }
  return null;
}

// Muuntaa 0..100-%-taulukon 0..1-Float32Array:ksi (null/puuttuva -> 0)
function toUnitFloat32(arr, n){
  const out = new Float32Array(n);
  if(Array.isArray(arr)) for(let i=0;i<n;i++) out[i] = (arr[i]||0)/100;
  return out;
}

// Näytteistää yhden kentän (vals/valsLow/valsMid/valsHigh) state.cloudGrid:stä
// samalla interpoloinnilla (aika + bikubinen Catmull-Rom paikka) kuin
// kartan pilvitaso piirtää — käytetään KAIKKIIN pilvisyysnäyttöihin, jotta
// luku täsmää aina sen kohdalla näkyvän läpinäkyvyyden kanssa ja kaikki
// mallit toimivat samalla koodilla (ks. CLOUD_MODELS).
//
// HUOM (korjattu todellinen bugi, löytyi Python-simulaatiolla ennen
// koodiin kirjoittamista): hilaindeksin YLÄRAJA on nyt TARKALLEEN
// `nlat-1`/`nlon-1` (ei `nlat-2.0001` kuten bilineaarisessa versiossa) -
// Catmull-Rom palauttaa tarkan arvon VAIN t=0 (p1) tai t=1 (p2) -kohdassa,
// EI KOSKAAN p0/p3:ssa. Jos hilan VIIMEINEN rivi/sarake pyritään
// tavoittamaan p3:na (kuten `nlat-2.0001`-rajoitus olisi tehnyt), tulos
// EI tasmaa raakadataan edes likimain (jopa >0,9 virhe havaittu
// simulaatiossa) - rajan pitaa sen sijaan sallia hilaindeksin kasvaa
// tasan `nlat-1`:een, jolloin viimeinen rivi/sarake tavoitetaan p1:na
// (rf=0) ja tasmaa AINA tarkalleen. Reunan ULKOPUOLISET "haamu"-pisteet
// (p0 ennen ensimmaista, p3 viimeisen jalkeen) leikataan erikseen
// kelvollisiin taulukkoindekseihin (clamp-to-edge -reunaehto, vakiintunut
// tapa Catmull-Rom-splineille datan reunalla).
// Kattaako valitun mallin pilvihila pisteen (2026-10-22, tiukka linja): vain
// mallin oma alue, EI varamallia. Alueen ulkopuolella pilvisyys ja näkyvyys
// ovat "ei dataa" (null) kaikkialla (lippu, alapalkki, Nyt, Tänä yönä, 7 vrk).
function cloudCovers(g, lat, lon){
  return !!g && lon >= g.lon0 && lon <= g.lon1 && lat >= g.lat0 && lat <= g.lat1;
}
function sampleGridField(g, getStep, field, lat, lon, date){
  if(!g) return null;
  if(!cloudCovers(g, lat, lon)) return null;
  const tf = timeFloatInArray(g.times, date);
  const ti0 = Math.floor(tf), ti1 = Math.min(ti0+1, g.times.length-1), ta = tf-ti0;
  // Sovelluksessa getStep käynnistää laiskan hilan taustalatauksen ja
  // palauttaa sillä välin lähimmän jo ladatun askeleen (resolveStep).
  const s0 = getStep(ti0), s1 = getStep(ti1);
  if(!s0 || !s1) return null;
  const arr0 = s0.data[field], arr1 = s1.data[field];
  if(!arr0 || !arr1) return null;   // esim. valsLow puuttuu kun hasLayers=false
  const fr = clamp((lat-g.lat0)/g.dlat, 0, g.nlat-1);
  const fc = clamp((lon-g.lon0)/g.dlon, 0, g.nlon-1);
  const row0 = Math.floor(fr), rf = fr-row0;
  const col0 = Math.floor(fc), cf = fc-col0;
  const clampIdx = (v,max)=> v<0 ? 0 : (v>max ? max : v);
  const rows = [row0-1,row0,row0+1,row0+2].map(r=>clampIdx(r,g.nlat-1));
  const cols = [col0-1,col0,col0+1,col0+2].map(c=>clampIdx(c,g.nlon-1));
  const sampleAt = (arr)=>{
    const rowVals = rows.map(r=>{
      const base = r*g.nlon;
      return catmullRom(arr[base+cols[0]], arr[base+cols[1]], arr[base+cols[2]], arr[base+cols[3]], cf);
    });
    return clamp(catmullRom(rowVals[0],rowVals[1],rowVals[2],rowVals[3],rf), 0, 1);
  };
  return sampleAt(arr0)*(1-ta) + sampleAt(arr1)*ta;   // 0..1
}

// Näkyvyys-ympyrän (idx) korkeuspainotettu pilvikerroin (0..1).
// HUOM (2026-10, käyttäjän pyyntö): EI enää käytetä "Pilvetön taivas"
// -laatikkoon (fCloud) - se näyttää nyt täsmälleen 100-lipun pilvisyys%,
// ks. update(). Tämä funktio vaikuttaa VAIN Näkyvyys-ympyrään.
// Jos malli tarjoaa korkeuserittelyn (hasLayers), painotetaan korkeuden
// mukaan kuten ennen (alapilvet peittävät lähes täysin, ohuen yläpilven
// läpi näkee osin). Jos ei (esim. ECMWF:n avoin data, vain kokonaispilvisyys),
// käytetään yksinkertaista 1-kokonaispilvisyys-arviota — tämä on tietoinen
// yksinkertaistus, ei virhe: kyseisen mallin avoimessa datassa ei ole
// korkeuserittelyä saatavilla (ks. MUISTIO-mallit.md).
function cloudVisibilityFactor(g, getStep, lat, lon, date){
  if(!g) return null;
  if(g.hasLayers){
    const low  = sampleGridField(g, getStep, 'valsLow', lat, lon, date);
    const mid  = sampleGridField(g, getStep, 'valsMid', lat, lon, date);
    const high = sampleGridField(g, getStep, 'valsHigh', lat, lon, date);
    if(low==null || mid==null || high==null) return null;
    const block = clamp(0.95*low + 0.65*mid + 0.30*high, 0, 1);
    return 1-block;
  }
  const total = sampleGridField(g, getStep, 'vals', lat, lon, date);
  return total==null ? null : 1-total;
}

// Pilvet tunnille TÄSMÄLLEEN ladatuista askelista. undefined = latautuu,
// null = ei dataa (mallin alueen tai ennusteen ulkopuolella).
function hourCloud(g, getStep, has, lat, lon, date){
  if(!g) return undefined;
  if(!cloudCovers(g, lat, lon)) return null;
  if(date < g.times[0] || date > g.times[g.times.length-1]) return null;
  const tf = timeFloatInArray(g.times, date), i0 = Math.floor(tf), i1 = Math.min(i0+1, g.times.length-1);
  const h0 = has(i0), h1 = has(i1);   // molemmat kysytään (sovellus käynnistää molempien latauksen)
  if(!h0 || !h1) return undefined;
  const v = sampleGridField(g, getStep, 'vals', lat, lon, date), f = cloudVisibilityFactor(g, getStep, lat, lon, date);
  const pct = v == null ? null : Math.round(v*100);
  return pct == null || f == null ? null : {pct, factor: f};
}

/* ── Kuu (matalan tarkkuuden kaavat, Meeus / Astronomical Almanac) ── */
function moonPos(date, lat, lon){
  const rad = Math.PI/180, d = date/86400000 - 10957.5;
  const L = rad*(218.316 + 13.176396*d), M = rad*(134.963 + 13.064993*d), F = rad*(93.272 + 13.229350*d);
  const l = L + rad*6.289*Math.sin(M), b = rad*5.128*Math.sin(F), e = rad*23.4397;
  const ra = Math.atan2(Math.sin(l)*Math.cos(e) - Math.tan(b)*Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b)*Math.cos(e) + Math.cos(b)*Math.sin(e)*Math.sin(l));
  const H = rad*(280.16 + 360.9856235*d + lon) - ra;
  const alt = Math.asin(Math.sin(rad*lat)*Math.sin(dec) + Math.cos(rad*lat)*Math.cos(dec)*Math.cos(H));
  // Valaistu osuus auringon ja kuun ekliptisten pituuksien erosta.
  const g = rad*(357.529 + 0.98560028*d), q = 280.459 + 0.98564736*d;
  const Ls = q + 1.915*Math.sin(g) + 0.020*Math.sin(2*g);
  const dl = ((l/rad - Ls) % 360 + 360) % 360;
  const elong = Math.acos(Math.cos(b)*Math.cos(dl*rad));
  return {alt: alt/rad, illum: (1 - Math.cos(elong))/2, waxing: dl < 180};
}

// Nousu ja lasku aikavälillä [a, b] (10 min haku + puolitus minuuttiin).
function moonEvents(lat, lon, a, b){
  const up = t => moonPos(new Date(t), lat, lon).alt > NIGHT_CFG.moonHorizon;
  const STEP = 10*60e3, out = {rise:null, set:null};
  let prev = up(a.getTime());
  for(let t = a.getTime() + STEP; t <= b.getTime(); t += STEP){
    const cur = up(t);
    if(cur !== prev){
      let lo = t - STEP, hi = t;
      while(hi - lo > 60e3){ const m = (lo + hi)/2; if(up(m) === prev) lo = m; else hi = m; }
      if(cur && !out.rise) out.rise = new Date(hi);
      if(!cur && !out.set) out.set = new Date(hi);
    }
    prev = cur;
  }
  out.upAll = !out.rise && !out.set && up(a.getTime());
  return out;
}

// Paras aika (2026-10, käyttäjän päätös, 5. kierros): yön SUURIN näkyvyys ja
// tunti molemmin puolin - ei kynnystä. Jos sama huippuarvo toistuu, kaikki
// huiput +-1 h (vierekkäiset/päällekkäiset yhdistetään). Rajataan yön
// tuntien sisään. Näkyvyys 0 % koko yön (tai ei dataa) -> null.
// good = huippu >= NIGHT.goodMin (vihreä korostus; muuten neutraali).
// Palauttaa {idx: korostetut tunnit, peaks, max, good, runs: [{from, to}]}.
function nightBest(hours){
  const vals = hours.map(h => h.chance).filter(v => v != null);
  if(!vals.length) return null;
  const max = Math.max(...vals);
  if(max <= 0) return null;
  const H = 3600e3, t0 = hours[0].t.getTime(), t1 = hours[hours.length - 1].t.getTime(), peaks = [], runs = [];
  hours.forEach((h, i) => { if(h.chance === max) peaks.push(i); });
  for(const i of peaks){
    const a = Math.max(t0, hours[i].t.getTime() - H), b = Math.min(t1, hours[i].t.getTime() + H), r = runs[runs.length - 1];
    if(r && a <= r.to.getTime()) r.to = new Date(Math.max(b, r.to.getTime()));
    else runs.push({from: new Date(a), to: new Date(b)});
  }
  const idx = [];
  hours.forEach((h, i) => { if(runs.some(r => h.t >= r.from && h.t <= r.to)) idx.push(i); });
  return {idx, peaks, max, good: max >= NIGHT_CFG.goodMin, runs};
}

function computeNight(lat, lon, now, src){
  const {cloudAt: nightCloud, kpBlockAt} = src;   // datalähteet: sovellus (state) tai hälytysajo
  const p = darkPeriod(lat, lon, now);
  if(p.none) return {kind:'nodark'};
  const H = 3600e3, start = p.now || p.all ? now : p.from;
  let end = p.to && !p.all ? p.to : new Date(start.getTime() + NIGHT_CFG.maxHours*H);
  end = new Date(Math.min(end.getTime(), start.getTime() + NIGHT_CFG.maxHours*H));
  const mlat = magLat(lat, lon), hours = [];
  for(let t = Math.floor(start.getTime()/H)*H; t < end.getTime(); t += H){
    const at = new Date(Math.max(t, start.getTime()));
    const cloud = nightCloud(lat, lon, at);
    const blk = kpBlockAt(at);
    const aur = blk ? {...kpVisibility(blk.kp, mlat), kp: blk.kp, block: blk.t.getTime()} : null;
    const dark = darknessFactor(sunAltitude(at, lat, lon));
    const chance = (cloud && aur) ? visibilityIndex(aur.p, cloud.factor, dark) : null;
    hours.push({t: new Date(t), at, cloud, aur, dark, chance, moon: moonPos(at, lat, lon).alt});
  }
  const loading = hours.some(h => h.cloud === undefined);
  const best = nightBest(hours);
  const mm = moonPos(new Date((start.getTime() + end.getTime())/2), lat, lon);
  return {kind:'ok', p, start, end, startsNow: !!(p.now || p.all), hours, best, loading,
          moon: {...mm, ev: moonEvents(lat, lon, start, end)}};
}

const swNum = v => { const n = typeof v === 'number' ? v : parseFloat(v); return Number.isFinite(n) && n > -9990 ? n : null; };
// Aikaleima: ISO-merkkijono (ilman vyöhykettä = UTC) tai luku (s / ms).
function swTime(v){
  if(typeof v === 'number') return new Date(v > 1e11 ? v : v * 1000);
  if(typeof v !== 'string') return null;
  const s = v.trim().replace(' ', 'T');
  const d = new Date(s + (/Z|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'));
  return isNaN(d) ? null : d;
}

// Rivit -> [{t, ...kentät}] nousevassa aikajärjestyksessä. Olio-muodossa
// valitaan aktiivinen satelliitti (active:true), jos merkintä on mukana.
function swRows(data, fields){
  if(!Array.isArray(data) || !data.length) return [];
  let rows;
  if(Array.isArray(data[0])){
    const h = data[0].map(x => String(x).toLowerCase());
    rows = data.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i]])));
  } else {
    rows = data.filter(r => r && typeof r === 'object');
    if(rows.some(r => 'active' in r)){
      const act = rows.filter(r => r.active === true || r.active === 'true');
      if(act.length) rows = act;
    }
  }
  const out = new Map();
  for(const r of rows){
    const tt = swTime(r.time_tag);
    if(!tt) continue;
    const o = {t: tt};
    for(const [k, names] of Object.entries(fields)){
      o[k] = null;
      for(const n of names){ const v = swNum(r[n]); if(v != null){ o[k] = v; break; } }
    }
    if(Object.keys(fields).some(k => o[k] != null)) out.set(tt.getTime(), o);
  }
  return [...out.values()].sort((a, b) => a.t - b.t);
}

// Bz:n liukuva keskiarvo (smoothMin) ja yhtäjaksoisen "etelään"-jakson kesto:
// taaksepäin viimeisimmästä niin kauan kuin keskiarvo < 0 eikä mittauksissa
// ole yli maxGapMin katkoa. Yksittäinen positiivinen piikki ei katkaise jaksoa,
// koska se ei käännä keskiarvoa.
function bzTrend(rows){
  const pts = (rows || []).filter(r => r.bz != null);
  if(!pts.length) return null;
  const W = BZ.smoothMin * 60e3, G = BZ.maxGapMin * 60e3;
  const mean = new Array(pts.length);
  let j = 0, sum = 0;
  for(let i = 0; i < pts.length; i++){
    sum += pts[i].bz;
    while(pts[i].t - pts[j].t >= W){ sum -= pts[j].bz; j++; }
    mean[i] = sum / (i - j + 1);
  }
  const last = pts.length - 1;
  let start = null;
  for(let i = last; i >= 0; i--){
    if(mean[i] >= 0) break;
    if(i < last && pts[i+1].t - pts[i].t > G) break;
    start = pts[i].t;
  }
  return {mean: mean[last], t: pts[last].t, southMin: start ? Math.round((pts[last].t - start) / 60e3) : 0};
}

const kpBlockStart = ms => Math.floor(ms / (3*3600e3)) * 3*3600e3;   // NOAA:n jaksot alkavat 00, 03, ... UTC
// NOAA SWPC:n products-JSONit vaihtuivat 2026 (Service Change Notice 26-21):
// ennen [[otsikot], [arvot]...] -taulukko, nyt [{time_tag, Kp, ...}] -olioita
// numeroarvoin. Kp näytti "–" koska vanha koodi luki rows[i][1]. Tämä
// lukee molemmat muodot: {t, kp} tai null.
function kpRow(r, header){
  if(Array.isArray(r)){
    if(!header) return null;
    const ti = header.indexOf('time_tag'), ki = header.findIndex(h => String(h).toLowerCase() === 'kp');
    return ti < 0 || ki < 0 ? null : kpRowFrom(r[ti], r[ki]);
  }
  if(r && typeof r === 'object'){
    const k = Object.keys(r).find(k => k.toLowerCase() === 'kp' || k === 'estimated_kp');
    return kpRowFrom(r.time_tag, k ? r[k] : undefined);
  }
  return null;
}

function kpRowFrom(tag, kp){
  const v = typeof kp === 'number' ? kp : parseFloat(kp);
  if(!tag || !Number.isFinite(v)) return null;
  const t = new Date(String(tag).replace(' ','T') + (/Z|[+-]\d\d:?\d\d$/.test(tag) ? '' : 'Z'));
  return isNaN(t) ? null : {t, kp:v};
}

function kpRows(rows){
  if(!Array.isArray(rows)) return [];
  const header = Array.isArray(rows[0]) && rows[0].includes('time_tag') ? rows[0] : null;
  return (header ? rows.slice(1) : rows).map(r => kpRow(r, header)).filter(Boolean);
}

// Kp nyt: {kp, kind:'estimated'|'observed', t: jakson alku (Date), updated?} tai null.
// kp = viimeisin minuuttiarvio, updated = sen aikaleima.
// Jakson vaihde (2026-10-20): NOAA:n minuuttiarvio nollautuu jokaisen 3 h jakson
// alussa ja nousee vähitellen -> jakson ensimmäiset KP_RT.carryMin minuuttia
// nyt-arvo = suurempi kahdesta: edellisen jakson arvo (mitattu, jos julkaistu,
// muuten sen jakson viimeisin minuuttiarvio) ja kuluvan jakson uusin minuuttiarvio.
// Palauttaa {kp, kind, t: jakson alku, updated?, prev?: edellisen jakson alku (Date)}.
// Reaaliaikainen Kp (json/planetary_k_index_1m.json) -> [{t, kp}] nousevasti.
// VAIN desimaalinen estimated_kp, ei kp_index-varapolkua (kokonaisluku).
function kpRtRows(raw){
  const rows = [];
  for(const o of Array.isArray(raw) ? raw : []){
    const r = o && kpRowFrom(o.time_tag, o.estimated_kp);
    if(r) rows.push(r);
  }
  rows.sort((x, y) => x.t - y.t);
  return rows;
}
function kpPrevBlockValue(kp, b0){
  const p0 = b0 - 3*3600e3;
  const obs = (kp.obsRows || []).find(r => r.t.getTime() === p0);
  if(obs) return obs.kp;
  let v = null;
  for(const r of kp.rt || []){ const tt = r.t.getTime(); if(tt >= p0 && tt < b0) v = r.kp; }
  return v;
}

function kpNowInfo(kp, now = Date.now()){
  const rt = kp.rt, last = rt && rt[rt.length-1];
  if(last && now - last.t.getTime() <= KP_RT.staleMin * 60e3 && last.t.getTime() <= now + 60e3){
    const b0 = kpBlockStart(now), cur = last.t.getTime() >= b0 ? last.kp : null;
    if(now - b0 < KP_RT.carryMin * 60e3){
      const prev = kpPrevBlockValue(kp, b0);
      if(prev != null && (cur == null || prev > cur))
        return {kp: prev, kind: 'estimated', t: new Date(b0), src: 'rt', prev: new Date(b0 - 3*3600e3)};
    }
    return {kp: last.kp, updated: last.t, kind: 'estimated', t: new Date(b0), src: 'rt'};
  }
  const o = kp.obs;
  return o ? {kp: o.kp, kind: 'observed', t: o.t, src: 'obs'} : null;
}

// 3 h Kp-jakso, johon hetki osuu (NOAA:n time_tag = jakson alku).
// Kuluva jakso (sisältää nykyhetken) = Kp nyt (reaaliaikainen arvio tai
// viimeisin mitattu), EI ennuste; muut jaksot ennustetiedostosta.
function kpBlockAt(kp, date, now = Date.now()){
  const t = date.getTime();
  if(kpBlockStart(t) === kpBlockStart(now)){
    const k = kpNowInfo(kp, now);
    if(k) return {t: new Date(kpBlockStart(now)), kp: k.kp, kind: k.kind, src: k.src};
  }
  for(const r of kp.forecast || []){
    const s = r.t.getTime();
    if(t >= s && t < s + 3*3600e3) return r;
  }
  return null;
}

/* ── Uudet kokoavat apufunktiot (sovelluksen kaavat yhdessä paikassa) ── */
// OVATION-JSON -> {grid: Float32Array(181*360), time, forecast}.
// coordinates: [lon 0..359, lat -90..90, aurora prob 0..100]; time = mittaus
// (Observation Time), forecast = ennusteen voimassaoloraja (Forecast Time).
function parseOvation(d){
  if(!d || !Array.isArray(d.coordinates)) throw new Error('OVATION: tuntematon muoto');
  const grid = new Float32Array(181*360);
  for(const [lon,lat,p] of d.coordinates){
    grid[(lat+90)*360 + lon] = p;
  }
  const obs = new Date(d['Observation Time'] || d['Forecast Time'] || Date.now());
  return {grid, time: obs, forecast: new Date(d['Forecast Time'] || obs)};
}
// Revontulien todennäköisyys pisteessä (Nyt-välilehti, näkyvyysindeksi):
// lähin OVATION-ruutu, ja ovaali voi näkyä horisontissa -> 3° pohjoisempi
// ruutu painolla 0,6.
function ovationProbAt(grid, lat, lon){
  const li = clamp(Math.round(lat+90),0,180);
  const lo = Math.round((lon+360)%360)%360;
  let p = grid[li*360+lo] || 0;
  const li2 = clamp(li+3,0,180);
  p = Math.max(p, (grid[li2*360+lo]||0)*0.6);
  return p;
}
// Näkyvyys % (ks. MUISTIO-infoikkuna.md):
//   idx = revontulet% /100 * pilvikerroin * pimeyskerroin * 100
// YKSI funktio kaikkialle (Nyt, alapalkki, Tänä yönä, 7 vrk, hälytykset).
// Pilvikerroin null (alueen ulkopuolella tai ei vielä ladattu) -> null =
// "ei dataa", EI lukua (2026-10-22: ennen null = 1 -> alapalkki näytti
// alueen ulkopuolella esim. 56 %, vaikka pilvidataa ei ollut).
function visibilityIndex(p, cf, df){
  if(p == null || cf == null || df == null) return null;
  return Math.round((p/100) * cf * df * 100);
}
// Pilvisyys-% pisteessä (kokonaispilvisyys, 0..100) tai null.
function cloudPct(g, getStep, lat, lon, date){
  const v = sampleGridField(g, getStep, 'vals', lat, lon, date);
  return v==null ? null : Math.round(v*100);
}
// EI-laiska pilvihila (ECMWF, yksi tiedosto): kaikki askeleet puretaan heti.
function buildCloudGridFull(d){
  const times = d.times.map(t=>new Date(t));
  const N = d.nlat * d.nlon;
  const hasLayers = Array.isArray(d.valsLow) && Array.isArray(d.valsMid) && Array.isArray(d.valsHigh);
  const steps = new Map();
  for(let i=0;i<times.length;i++){
    const off = i*N;
    steps.set(i, {
      vals:     toUnitFloat32(d.vals.slice(off, off+N), N),
      valsLow:  hasLayers ? toUnitFloat32(d.valsLow.slice(off, off+N), N)  : null,
      valsMid:  hasLayers ? toUnitFloat32(d.valsMid.slice(off, off+N), N)  : null,
      valsHigh: hasLayers ? toUnitFloat32(d.valsHigh.slice(off, off+N), N) : null,
    });
  }
  const r = d.run ? new Date(d.run) : null;
  return {
    times, isLazy:false, steps, pending:new Set(), stepFile:null, run: r && !isNaN(r) ? r : times[0],
    hasLayers,
    lat0:d.lat0, lat1:d.lat1, lon0:d.lon0, lon1:d.lon1,
    nlat:d.nlat, nlon:d.nlon, dlat:d.dlat, dlon:d.dlon
  };
}
// "Tulossa"-vihje (Nyt-välilehti): VAIN tuoreesta mag-datasta (ei vanhempi
// kuin BZ.staleMin): liukuva Bz <= hint.bzMax, etelään yhtäjaksoisesti
// >= hint.minDurationMin ja Bt >= hint.btMin.
// Palauttaa {show, trend, magRow, btRow, fresh}.
const swLatest = (rows, k) => { if(rows) for(let i = rows.length - 1; i >= 0; i--) if(rows[i][k] != null) return rows[i]; return null; };
function bzHint(magRows, now = Date.now()){
  const staleMs = BZ.staleMin * 60e3, h = BZ.hint;
  const fresh = r => !!r && now - r.t <= staleMs;
  const magRow = swLatest(magRows, 'bz'), btRow = swLatest(magRows, 'bt'), trend = bzTrend(magRows);
  const show = fresh(magRow) && fresh(btRow) && !!trend && trend.mean <= h.bzMax
    && trend.southMin >= h.minDurationMin && btRow.bt >= h.btMin;
  return {show, trend, magRow, btRow, fresh: fresh(magRow)};
}

root.AuroraCore = {
  SUN_DARK_DEG, KP_VIS, NIGHT_CFG, BZ, KP_RT, SW_FIELDS,
  clamp, sunAltitude, magLat, darknessFactor, darkPeriod, kpVisibility, kpRequired,
  ovationBilinear, parseOvation, ovationProbAt, visibilityIndex, cloudCovers,
  catmullRom, timeFloatInArray, resolveStep, toUnitFloat32, buildCloudGridFull,
  sampleGridField, cloudVisibilityFactor, cloudPct, hourCloud,
  moonPos, moonEvents, nightBest, computeNight,
  swTime, swNum, swRows, swLatest, bzTrend, bzHint,
  kpRow, kpRowFrom, kpRows, kpRtRows, kpBlockStart, kpNowInfo, kpBlockAt,
};
if(typeof module !== 'undefined' && module.exports) module.exports = root.AuroraCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
