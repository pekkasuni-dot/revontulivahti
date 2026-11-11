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
/* Näkyvyys-%:n sanaluokat (päätös 34, 7.11.2026, käyttäjän päätös): Heikko 0–14 %, Kohtalainen 15–39 %, Hyvä >= 40 %.
   YKSI vakioryhmä: Nyt-tulkintalause, Revontulet-kortti (OVATION-%), vihreä korostus, Tänä yönä / 7 vrk "Paras aika/yö"
   ja hälytysten raja (alerts/fcm-alerts.js) lukevat nämä. KP_VIS-luokat (yllä) ovat erillinen mittari. Ei "Erinomainen"-luokkaa. */
const VIS_CLASSES = {mid: 15, good: 40};
function visClass(p){
  if(p == null || !Number.isFinite(p)) return null;
  return p >= VIS_CLASSES.good ? 'good' : p >= VIS_CLASSES.mid ? 'mid' : 'weak';
}
/* Pilvisyyden läpäisykerroin (päätös 34): tulomalli säilyy, mutta 0–30 % vaikuttaa vähän ja vaikutus jyrkkenee
   yli 80 %:ssa. Paloittain lineaarinen [pilvisyys %, kerroin]; LÄHTÖARVOT, tarkennetaan Dev-testin palautteella. */
const CLOUD_TRANSMIT = [[0, 1], [30, 0.9], [80, 0.1], [90, 0.02], [100, 0]];
function cloudTransmit(pct){
  if(pct == null || !Number.isFinite(pct)) return null;
  const T = CLOUD_TRANSMIT, x = clamp(pct, T[0][0], T[T.length - 1][0]);
  for(let i = 1; i < T.length; i++) if(x <= T[i][0]){
    const [x0, y0] = T[i - 1], [x1, y1] = T[i];
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return T[T.length - 1][1];
}
/* Kp-kyllästyminen (päätös 34): Kp:n vaikutus päättyy, kun revontulivyöhykkeen reuna (kpVisibility: boundary0 −
   perKp × Kp) on edennyt paikan geomagneettisen leveysasteen yli marginaalin verran. Marginaali johdetaan referenssistä
   (Kp 3,0 Rovaniemen kohdalla 66,5° N 25,7° E) eikä kiinteästä taulukosta: Kp_sat(mlat) = kpRequired(mlat) + marginaali /
   perKp. Tulos: etelämpänä raja korkeampi, pohjoisempana matalampi; näkyvyysarvio enintään base + perDeg × marginaali
   (~84 %). Voimakkuus (Kp) näytetään erikseen. EI kalibrointia (Tänä yönä -kalibrointi ennen kauppaversiota). */
const KP_SAT = {refLat: 66.5, refLon: 25.7, refKp: 3.0};
function kpSatMargin(){ return magLat(KP_SAT.refLat, KP_SAT.refLon) - (KP_VIS.boundary0 - KP_VIS.perKp * KP_SAT.refKp); }
function kpSaturation(mlat){ return (KP_VIS.boundary0 - mlat + kpSatMargin()) / KP_VIS.perKp; }
const NIGHT_CFG = {
  darkDeg: SUN_DARK_DEG,   // pimeyden raja = sama kuin näkyvyysindeksissä
  maxHours: 16,            // pisin näytettävä jakso (napapiirin kaamos)
  goodMin: VIS_CLASSES.good,   // "Hyvä" (päätös 34): Paras aika/yö -korostus = VIS_CLASSES.good
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
  const k = KP_VIS, boundary = k.boundary0 - k.perKp*Math.min(kp, kpSaturation(mlat));   // kyllästyminen (päätös 34)
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
// Hilan geometria (2026-10-23, periaate kaikille malleille ja tasoille): arvo
// k on PISTEESSÄ lat0 + k*dlat, lon0 + k*dlon (ei ruudun kulmassa), ja
// lat0..lat1 / lon0..lon1 ovat ensimmäinen ja viimeinen piste = datan rajat.
// Väli lasketaan rajoista ja pistemäärästä, ei metan pyöristetystä dlat-
// kentästä -> JS-näytteistys (dlat) ja pilvivarjostin (lat0..lat1, texSize-1)
// käyttävät täsmälleen samaa hilaa. Hakuskriptit harventavat samalla
// periaatteella (scripts/grid_resample.py).
function gridGeom(d){
  const step = (a, b, n, fb) => n > 1 ? (b - a) / (n - 1) : fb;
  return {lat0: d.lat0, lat1: d.lat1, lon0: d.lon0, lon1: d.lon1, nlat: d.nlat, nlon: d.nlon,
    dlat: step(d.lat0, d.lat1, d.nlat, d.dlat), dlon: step(d.lon0, d.lon1, d.nlon, d.dlon)};
}
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
// AINA kokonaispilvisyydestä kaikilla malleilla (käyttäjän päätös 2026-10-24):
// pilvikerrokset (HARMONIE, ICON-EU) ovat VAIN kartalla näytettäväksi, eivät
// vaikuta näkyvyysprosenttiin. Sama kaava sovelluksessa ja hälytyksissä.
function cloudVisibilityFactor(g, getStep, lat, lon, date){
  if(!g) return null;
  const total = sampleGridField(g, getStep, 'vals', lat, lon, date);
  return total==null ? null : cloudTransmit(total * 100);   // päätös 34: läpäisykäyrä (ennen 1 - pilvisyys)
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

// Kuten hourCloud, mutta puuttuva hilapiste (NaN; meteorologien ennusteen vinon
// malli-alueen kulmat, 2026-10-26/27) interpoloinnin naapurustossa -> null (ei dataa).
// Sovellus käyttää tätä kaikille malleille (ilman NaN:ia sama kuin hourCloud).
function editedHourCloud(g, getStep, has, lat, lon, date){
  const r = hourCloud(g, getStep, has, lat, lon, date);
  return r && !(Number.isFinite(r.pct) && Number.isFinite(r.factor)) ? null : r;
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
// events = kaikki tapahtumat aikajärjestyksessä [{type:'rise'|'set', t}] (näyttö,
// 2026-10-27); rise/set = ensimmäinen kumpaakin. Tarkistettu PyEphemillä
// (tests/aurora-core.test.mjs, virhe alle 3 min).
function moonEvents(lat, lon, a, b){
  const up = t => moonPos(new Date(t), lat, lon).alt > NIGHT_CFG.moonHorizon;
  const STEP = 10*60e3, out = {rise:null, set:null, events:[]};
  let prev = up(a.getTime());
  for(let t = a.getTime() + STEP; t <= b.getTime(); t += STEP){
    const cur = up(t);
    if(cur !== prev){
      let lo = t - STEP, hi = t;
      while(hi - lo > 60e3){ const m = (lo + hi)/2; if(up(m) === prev) lo = m; else hi = m; }
      out.events.push({type: cur ? 'rise' : 'set', t: new Date(hi)});
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
    ...gridGeom(d)
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

/* ── 7 vrk:n yöt (2026-10-22, KATSELMOINTI 1.2 ja osa 2 kohdat 3-4) ──
   Yö k = pimeä jakso, joka alkaa PISTEEN aurinkokeskipäivien välissä
   (klo 12-12 pisteen aurinkoaikaa, UTC + lon/15 h). Ei riipu puhelimen
   aikavyöhykkeestä eikä sen kalenteripäivästä. Ennen: yöt haettiin
   puhelimen keskipäivästä -> (1) jos pimeä alkoi keskiyön jälkeen, seuraava
   yö ohitettiin (Kilpisjärvi huhti-/elokuu), (2) kaukana itään/länteen
   puhelimen keskipäivä osui pisteen yöhön -> tavallinen yö tulkittiin
   kaamokseksi (Siperia). Kaamos (pimeää keskipäivälläkin): yö klo
   polarFrom-polarTo pisteen aurinkoaikaa. Kellonajat näytetään sovelluksessa
   puhelimen aikavyöhykkeellä (Date-oliot ovat hetkiä).
   cfg = {nights, maxHours, polarFrom, polarTo}. Palauttaa yöt:
   {day: 'YYYY-MM-DD' illan päivä pisteessä, start, end, p, startsNow} tai
   {day, none: true} (ei pimeää). */
function weekWindows(lat, lon, now, cfg){
  const H = 3600e3, D = 24*H, off = lon / 15 * H, t = now.getTime();
  const cap = (s, e) => new Date(Math.min(e, s + cfg.maxHours*H));
  const dayOf = ws => new Date(ws + off).toISOString().slice(0, 10);   // keskipäivän päivä pisteessä
  // Pisteen aurinkokeskipäivä samana tai edellisenä hetkenä kuin t.
  const noonAtOrBefore = tt => { const sd = new Date(tt + off); let n = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), 12) - off; return n > tt ? n - D : n; };
  const polar = ws => ({start: new Date(ws + (cfg.polarFrom - 12)*H), end: new Date(ws + (cfg.polarTo + 12)*H), p: {all: true}});
  // Yksi ikkuna [ws, ws + 24 h): ensimmäinen pimeä jakso sen sisällä.
  const windowNight = ws => {
    const p = darkPeriod(lat, lon, new Date(ws));
    if(p.none) return {day: dayOf(ws), none: true};
    if(p.all || p.now) return {day: dayOf(ws), ...polar(ws)};   // pimeää jo keskipäivällä = kaamos
    if(p.from.getTime() >= ws + D) return {day: dayOf(ws), none: true};
    return {day: dayOf(ws), start: p.from, end: cap(p.from.getTime(), p.to.getTime()), p};
  };
  // Yö 1 = Tänä yönä: kuluva tai seuraava pimeä jakso (sama kuin computeNight).
  const p0 = darkPeriod(lat, lon, now);
  let ws0, first;
  if(p0.none){ ws0 = noonAtOrBefore(t); first = {day: dayOf(ws0), none: true}; }
  else if(p0.all){
    ws0 = noonAtOrBefore(t);
    let w = polar(ws0);
    if(w.end.getTime() <= t){ ws0 += D; w = polar(ws0); }
    first = {day: dayOf(ws0), ...w, start: new Date(Math.max(t, w.start.getTime())), startsNow: t >= w.start.getTime()};
  }else if(p0.now){
    ws0 = noonAtOrBefore(p0.from ? p0.from.getTime() : t);
    first = {day: dayOf(ws0), start: now, end: cap(t, p0.to.getTime()), p: p0, startsNow: true};
  }else{
    ws0 = noonAtOrBefore(p0.from.getTime());
    first = {day: dayOf(ws0), start: p0.from, end: cap(p0.from.getTime(), p0.to.getTime()), p: p0, startsNow: false};
  }
  const out = [first];
  for(let k = 1; k < cfg.nights; k++) out.push(windowNight(ws0 + k*D));
  return out;
}


/* ── Omat paikat (2026-10-25, vaihe 1) ─────────────────────────────────
   Tallennusmuoto (localStorage 'rv-places', myöhemmin myös iCloud-/Android-
   varmuuskopio ja Pro-raja): YKSI JSON-olio {v, places:[...]}, kukin paikka
   {id, name, lat, lon, createdAt, updatedAt} (ajat ISO-merkkijonoina UTC, id
   satunnainen merkkijono -> eri laitteiden listat voi yhdistää id:n ja
   updatedAt:n perusteella). Versio v nousee vain, jos muoto muuttuu; vanhempi
   muoto muunnetaan lukiessa (placesParse), uudempaa ei kirjoiteta yli (future).
   Raja PLACES_CFG.max (50) tarkistetaan vain lisättäessä: jo tallennettuja
   ei koskaan pudoteta, vaikka rajaa myöhemmin pienennettäisiin (Pro). */
const PLACES_CFG = {version: 1, max: 50, nameMax: 60, coordDecimals: 5};
const roundTo = (x, d) => { const k = Math.pow(10, d); return Math.round(x * k) / k; };
function placeIdNew(rand){
  const c = typeof crypto !== 'undefined' && crypto && crypto.randomUUID ? crypto.randomUUID() : null;
  if(c && !rand) return c;
  const r = rand || Math.random;
  let s = '';
  for(let i = 0; i < 4; i++) s += Math.floor(r() * 0x100000000).toString(16).padStart(8, '0');
  return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20, 32);
}
function placeName(name){
  return typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, PLACES_CFG.nameMax) : '';
}
// Yksi paikka tarkistettuna ja normalisoituna, tai null (viallinen).
function placeNormalize(p, nowIso){
  if(!p || typeof p !== 'object') return null;
  const lat = Number(p.lat), lon = Number(p.lon);
  if(!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim().slice(0, 64) : null;
  const name = placeName(p.name);
  if(!id || !name) return null;
  const iso = v => { const t = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null; return t && !isNaN(t) ? t.toISOString() : null; };
  const createdAt = iso(p.createdAt) || nowIso || new Date(0).toISOString();
  return {id, name, lat: roundTo(lat, PLACES_CFG.coordDecimals), lon: roundTo(lon, PLACES_CFG.coordDecimals),
    createdAt, updatedAt: iso(p.updatedAt) || createdAt};
}
// Lukee tallennetun tekstin. Palauttaa {places, version, error, dropped, readOnly}:
//   error null | 'json' (ei jäsennettävissä) | 'format' (ei tunnistettu rakenne) | 'future' (uudempi versio)
//   dropped = poistettujen viallisten / kaksoiskappaleiden määrä; readOnly = älä kirjoita päälle.
function placesParse(text){
  const out = {places: [], version: PLACES_CFG.version, error: null, dropped: 0, readOnly: false};
  if(text == null || text === '') return out;
  let d;
  try{ d = JSON.parse(text); }catch(e){ out.error = 'json'; out.readOnly = true; return out; }
  let list;
  if(Array.isArray(d)){ list = d; out.version = 0; }                       // v0: pelkkä taulukko
  else if(d && typeof d === 'object' && Array.isArray(d.places)){
    out.version = Number.isInteger(d.v) ? d.v : 0;
    list = d.places;
    if(out.version > PLACES_CFG.version){ out.error = 'future'; out.readOnly = true; }
  } else { out.error = 'format'; out.readOnly = true; return out; }
  const seen = new Set();
  for(const p of list){
    const n = placeNormalize(p);
    if(!n || seen.has(n.id)){ out.dropped++; continue; }
    seen.add(n.id); out.places.push(n);
  }
  return out;
}
function placesSerialize(places){
  return JSON.stringify({v: PLACES_CFG.version, places: (places || []).map(p => placeNormalize(p)).filter(Boolean)});
}
// Lisäys: {places, place, error: null | 'full' | 'invalid'}. Alkuperäistä listaa ei muuteta.
function placesAdd(places, {name, lat, lon}, opts = {}){
  const list = places || [];
  if(list.length >= (opts.max || PLACES_CFG.max)) return {places: list, place: null, error: 'full'};
  const now = new Date(opts.now != null ? opts.now : Date.now()).toISOString();
  const place = placeNormalize({id: opts.id || placeIdNew(), name, lat, lon, createdAt: now, updatedAt: now});
  if(!place) return {places: list, place: null, error: 'invalid'};
  return {places: [...list, place], place, error: null};
}
function placesRename(places, id, name, opts = {}){
  const nm = placeName(name);
  if(!nm) return {places, error: 'invalid'};
  const now = new Date(opts.now != null ? opts.now : Date.now()).toISOString();
  let hit = false;
  const out = (places || []).map(p => p.id === id ? (hit = true, {...p, name: nm, updatedAt: now}) : p);
  return {places: hit ? out : places, error: hit ? null : 'missing'};
}
function placesRemove(places, id){ return (places || []).filter(p => p.id !== id); }
// Lähin tallennettu paikka annetun säteen (km) sisällä, tai null.
function placeNear(places, lat, lon, km = 0.1){
  let best = null, bd = km;
  for(const p of places || []){
    const d = distKm(lat, lon, p.lat, p.lon);
    if(d <= bd){ bd = d; best = p; }
  }
  return best;
}
function distKm(lat1, lon1, lat2, lon2){
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Paikannimi karttadatasta (2026-10-25): OpenMapTiles-vektoritiilen 'place'-tason
   pisteet puretaan itse (Mapbox Vector Tile = protobuf). Ei uutta palvelua: sama
   OpenFreeMap-tiili, jonka kartta muutenkin lataa. */
function pbfReader(buf){
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let pos = 0;
  const varint = () => { let v = 0, m = 1, x; do{ x = b[pos++]; v += (x & 0x7f) * m; m *= 128; } while(x >= 0x80 && pos <= b.length); return v; };
  return {
    get pos(){ return pos; }, set pos(v){ pos = v; }, len: b.length, bytes: b, varint,
    skip(wt){ if(wt === 0) varint(); else if(wt === 1) pos += 8; else if(wt === 2){ const n = varint(); pos += n; } else if(wt === 5) pos += 4; else throw new Error('wt ' + wt); },
    sub(){ const n = varint(), s = pos; pos += n; return [s, s + n]; },
  };
}
const zz = n => (n % 2 === 1 ? -(n + 1) / 2 : n / 2);
// Pisteet tiilen tasolta: [{props, lat, lon}]. z/x/y = tiilen osoite.
function mvtLayerPoints(buf, layerName, z, x, y){
  const r = pbfReader(buf), out = [], td = new TextDecoder();
  const str = (s, e) => td.decode(r.bytes.subarray(s, e));
  while(r.pos < r.len){
    const tag = r.varint();
    if(tag >> 3 !== 3 || (tag & 7) !== 2){ r.skip(tag & 7); continue; }
    const [ls, le] = r.sub(), keep = r.pos;
    r.pos = ls;
    let name = '', extent = 4096; const keys = [], vals = [], feats = [];
    while(r.pos < le){
      const t2 = r.varint(), f = t2 >> 3;
      if(f === 1){ const [s, e] = r.sub(); name = str(s, e); }
      else if(f === 2){ feats.push(r.sub()); }
      else if(f === 3){ const [s, e] = r.sub(); keys.push(str(s, e)); }
      else if(f === 4){
        const [vs, ve] = r.sub(), k2 = r.pos; r.pos = vs; let v = null;
        while(r.pos < ve){
          const t3 = r.varint(), f3 = t3 >> 3;
          if(f3 === 1){ const [s, e] = r.sub(); v = str(s, e); }
          else if(f3 === 2){ v = new DataView(r.bytes.buffer, r.bytes.byteOffset + r.pos, 4).getFloat32(0, true); r.pos += 4; }
          else if(f3 === 3){ v = new DataView(r.bytes.buffer, r.bytes.byteOffset + r.pos, 8).getFloat64(0, true); r.pos += 8; }
          else if(f3 === 4 || f3 === 5){ v = r.varint(); }
          else if(f3 === 6){ v = zz(r.varint()); }
          else if(f3 === 7){ v = !!r.varint(); }
          else r.skip(t3 & 7);
        }
        vals.push(v); r.pos = k2;
      }
      else if(f === 5){ extent = r.varint(); }
      else r.skip(t2 & 7);
    }
    if(name === layerName){
      for(const [fs, fe] of feats){
        r.pos = fs; let type = 0, geom = null; const props = {};
        while(r.pos < fe){
          const t4 = r.varint(), f4 = t4 >> 3;
          if(f4 === 2){ const [s, e] = r.sub(), k3 = r.pos; r.pos = s; while(r.pos < e){ const ki = r.varint(), vi = r.varint(); if(keys[ki] != null) props[keys[ki]] = vals[vi]; } r.pos = k3; }
          else if(f4 === 3) type = r.varint();
          else if(f4 === 4) geom = r.sub();
          else r.skip(t4 & 7);
        }
        if(type !== 1 || !geom) continue;
        r.pos = geom[0]; let cx = 0, cy = 0;
        while(r.pos < geom[1]){
          const cmd = r.varint(), id = cmd & 7, cnt = cmd >> 3;
          for(let i = 0; i < cnt; i++){
            if(id === 1 || id === 2){ cx += zz(r.varint()); cy += zz(r.varint()); }
            if(id === 1){
              const n = Math.pow(2, z), px = (x + cx / extent) / n, py = (y + cy / extent) / n;
              out.push({props, lon: px * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * py))) * 180 / Math.PI});
            }
          }
        }
      }
    }
    r.pos = keep;
  }
  return out;
}
const PLACE_NAME_CLASSES = ['city', 'town', 'village', 'suburb', 'hamlet', 'quarter', 'neighbourhood', 'isolated_dwelling', 'locality'];
// Lähin paikannimi pisteille ({props:{name, class}, lat, lon}), korkeintaan maxKm päässä.
// nameKeys = kielen mukaiset nimikentät järjestyksessä (oletus paikallinen 'name').
function nearestPlaceName(points, lat, lon, maxKm = 25, nameKeys = ['name']){
  let best = null, bd = maxKm;
  for(const p of points || []){
    if(!PLACE_NAME_CLASSES.includes(p.props && p.props.class)) continue;
    const nm = nameKeys.map(k => p.props[k]).find(v => typeof v === 'string' && v.trim());
    if(!nm) continue;
    const d = distKm(lat, lon, p.lat, p.lon);
    if(d < bd){ bd = d; best = {name: nm.trim(), km: d, cls: p.props.class}; }
  }
  return best;
}
// Tiilen osoite pisteelle zoomilla z sekä naapurit niillä sivuilla, joiden reunaa piste on lähellä (edge = osuus).
function tilesAround(lat, lon, z, edge = 0.3){
  const n = Math.pow(2, z), fx = (lon + 180) / 360 * n;
  const fy = (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * n;
  const x = Math.floor(fx), y = Math.floor(fy), ox = fx - x, oy = fy - y;
  const dx = [0, ox < edge ? -1 : 0, ox > 1 - edge ? 1 : 0].filter((v, i, a) => i === 0 || v !== 0);
  const dy = [0, oy < edge ? -1 : 0, oy > 1 - edge ? 1 : 0].filter((v, i, a) => i === 0 || v !== 0);
  const out = [];
  for(const a of dx) for(const c of dy){ const tx = (x + a + n) % n, ty = y + c; if(ty >= 0 && ty < n) out.push({z, x: tx, y: ty}); }
  return out;
}

/* ── Hälytysten sijaintiruudut (2026-11-02, päätökset 29 ja 30, vaihe 1) ──────────────
   Jokainen hälytyspaikka (oma sijainti, Omat paikat -kytkimellä) tilaa YHDEN FCM-aiheen: ruutu + kieli.
   Palvelin lähettää ruudun aiheeseen eikä tiedä paikkoja eikä koordinaatteja (päätökset 14 ja 15).
   Samaan ruutuun osuvat paikat = sama aihe = yksi ilmoitus. Aiheen nimi: "al<ver>_<kieli>_<i>_<j>",
   i = rivi etelänavalta (dLat), j = sarake 180 °W:sta (dLon). Kieli aiheessa, koska palvelin lähettää
   valmiin tekstin (sovellus voi olla suljettu). RUUDUN KOKO ON ALUSTAVA (päätös 29: lopullinen vaiheessa 2
   kenttätestin datalla). Koon muutos -> nosta ver: vanhat tilaukset poistuvat ja uudet tilataan itsestään.
   EI hälytyslaskentaa: ALERT_CFG ja aurora-alerts.js ennallaan 7.11. asti. */
// Kielet (päätös 36, 7.11.): fi, en, zh(-Hans); sovelluksen es ja fr -> en-aihe (defLang). Sama lista: alert-texts.js LANGS.
const ALERT_CELL = {ver: 1, dLat: 0.5, dLon: 1, langs: ['fi', 'en', 'zh'], defLang: 'en'};
function alertCell(lat, lon, cfg = ALERT_CELL){
  if(!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90) return null;
  const rows = Math.round(180 / cfg.dLat), cols = Math.round(360 / cfg.dLon);
  const i = Math.min(rows - 1, Math.floor((lat + 90) / cfg.dLat));
  const j = Math.floor((((lon + 180) % 360) + 360) % 360 / cfg.dLon) % cols;
  return {ver: cfg.ver, i, j, key: i + '_' + j,
    lat0: -90 + i * cfg.dLat, lon0: -180 + j * cfg.dLon,
    center: {lat: -90 + (i + 0.5) * cfg.dLat, lon: -180 + (j + 0.5) * cfg.dLon}};
}
function alertLang(lang, cfg = ALERT_CELL){
  const l = String(lang || '').toLowerCase().split(/[-_]/)[0];
  return cfg.langs.includes(l) ? l : cfg.defLang;
}
// FCM-aiheen nimi (sallitut merkit [a-zA-Z0-9-_.~%]).
function alertTopic(cell, lang, cfg = ALERT_CELL){
  return cell ? 'al' + cfg.ver + '_' + alertLang(lang, cfg) + '_' + cell.i + '_' + cell.j : null;
}
function parseAlertTopic(topic, cfg = ALERT_CELL){
  const m = /^al(\d+)_([a-z]{2})_(\d+)_(\d+)$/.exec(String(topic || ''));
  if(!m || +m[1] !== cfg.ver) return null;
  const i = +m[3], j = +m[4];
  return {ver: +m[1], lang: m[2], i, j, key: i + '_' + j,
    center: {lat: -90 + (i + 0.5) * cfg.dLat, lon: -180 + (j + 0.5) * cfg.dLon}};
}
// Hälytyspaikat -> {aihe: {cell, names[], ids[]}}. points: [{id, name, lat, lon}] (oma sijainti id 'own').
function alertTopicsFor(points, lang, cfg = ALERT_CELL){
  const out = {};
  for(const p of points || []){
    const c = p && alertCell(p.lat, p.lon, cfg);
    if(!c) continue;
    const tp = alertTopic(c, lang, cfg);
    const e = out[tp] || (out[tp] = {cell: c, names: [], ids: []});
    e.ids.push(p.id); if(p.name && !e.names.includes(p.name)) e.names.push(p.name);
  }
  return out;
}
// Tilausten muutos: mitä tilataan ja mitä perutaan (järjestys säilyy, ei kaksoiskappaleita).
function alertTopicDiff(have, want){
  const h = new Set(have || []), w = new Set(want || []);
  return {subscribe: [...w].filter(x => !h.has(x)), unsubscribe: [...h].filter(x => !w.has(x))};
}

/* ── Hälytysruudun apufunktiot (päätös 36, 7.11.2026) ─────────────────────────────────────────────
   Ruudun aikavyöhyke (yö = klo 15–07 paikallista, Tänä yönä klo 16), yön tunniste ja pilvisyyden 25. persentiili
   ruudun hilapisteistä (ruudun selkeämpi osa, ilmoitus puhuu "alueestasi"). */
// Karkea Suomen raja (lat, lon), myötäpäivään. Tarkkuus noin ruudun kokoluokkaa (0,5° × 1°); rajaruuduissa
// aikavyöhyke voi olla naapurimaan. Riittää hälytysten yörajaukseen (ero 1 h).
const FI_POLY = [[59.7,19.0],[60.6,19.0],[63.0,20.6],[64.4,21.7],[65.2,23.3],[65.8,24.15],[66.6,23.8],[67.4,23.6],
  [68.0,23.4],[68.45,22.4],[69.06,20.55],[69.12,20.9],[68.98,21.6],[69.2,22.8],[69.45,25.8],[69.9,27.0],[70.08,27.9],[69.8,28.4],
  [69.05,28.9],[68.6,28.5],[68.1,30.0],[67.0,29.1],[66.0,29.9],[65.1,29.6],[64.0,30.1],[63.0,31.2],[62.5,31.5],
  [61.7,30.2],[61.2,29.1],[60.6,27.8],[60.2,27.0],[59.7,22.0]];
function pointInPoly(lat, lon, poly){
  let inside = false;
  for(let i = 0, j = poly.length - 1; i < poly.length; j = i++){
    const [ai, oi] = poly[i], [aj, oj] = poly[j];
    if((oi > lon) !== (oj > lon) && lat < (aj - ai) * (lon - oi) / (oj - oi) + ai) inside = !inside;
  }
  return inside;
}
function cellTimeZone(lat, lon){
  if(pointInPoly(lat, lon, FI_POLY)) return 'Europe/Helsinki';
  if(lon >= 28 && lat >= 59.6) return 'Europe/Moscow';            // Karjala, Kuola (Suomen itäpuolella)
  if(lat < 59.6 && lon >= 21) return 'Europe/Tallinn';            // Baltia (EET)
  if(lon < 1.8 && lat < 61.5) return 'Europe/London';             // Iso-Britannia, Shetland
  return 'Europe/Stockholm';                                       // Ruotsi, Norja, Tanska: CET (sama siirtymä kuin Oslo)
}
function localParts(date, tz){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map(x => [x.type, x.value]));
  return {day: p.year + '-' + p.month + '-' + p.day, hour: +p.hour, minute: +p.minute};
}
// Yö = klo 15–07 paikallista; tunniste = illan päivä. Muulloin (07–15) null.
// Päätös 42 (11.11.2026): Tänä yönä -hälytys ja sen klo 16-22 -ikkuna (tonightWindow) poistettu.
const ALERT_NIGHT = {startHour: 15, endHour: 7};
function alertNightKey(date, tz){
  const lp = localParts(date, tz);
  if(lp.hour >= ALERT_NIGHT.startHour) return lp.day;
  if(lp.hour < ALERT_NIGHT.endHour) return localParts(new Date(date.getTime() - 12 * 3600e3), tz).day;
  return null;
}
// Ruudun hilapisteiden indeksit mallin hilassa (piste k = lat0 + k*dlat, gridGeom). [] = ruutu mallin ulkopuolella.
function cellGridPoints(g, cell, dLat = ALERT_CELL.dLat, dLon = ALERT_CELL.dLon){
  const out = [];
  if(!g) return out;
  const r0 = Math.ceil((cell.lat0 - g.lat0) / g.dlat - 1e-9), r1 = Math.floor((cell.lat0 + dLat - g.lat0) / g.dlat - 1e-9);
  const c0 = Math.ceil((cell.lon0 - g.lon0) / g.dlon - 1e-9), c1 = Math.floor((cell.lon0 + dLon - g.lon0) / g.dlon - 1e-9);
  for(let r = Math.max(0, r0); r <= Math.min(g.nlat - 1, r1); r++)
    for(let c = Math.max(0, c0); c <= Math.min(g.nlon - 1, c1); c++) out.push(r * g.nlon + c);
  return out;
}
function percentile(vals, q){
  if(!vals.length) return null;
  const a = vals.slice().sort((x, y) => x - y), pos = (a.length - 1) * q, i = Math.floor(pos), f = pos - i;
  return i + 1 < a.length ? a[i] + (a[i + 1] - a[i]) * f : a[i];
}
// Ruudun pilvisyys-% hetkellä date: aika-interpoloitu arvo jokaisessa ruudun pisteessä, sitten persentiili q
// (oletus 0,25 = selkeämpi neljännes). Vain TÄSMÄLLEEN ladatut askeleet (g.steps, kuten hourCloud). Puuttuvat
// pisteet (NaN, editoidun ennusteen kulmat) ohitetaan. null = ei dataa.
function cellCloudPct(g, pts, date, q = 0.25){
  if(!g || !pts || !pts.length) return null;
  if(date < g.times[0] || date > g.times[g.times.length - 1]) return null;
  const tf = timeFloatInArray(g.times, date), i0 = Math.floor(tf), i1 = Math.min(i0 + 1, g.times.length - 1), ta = tf - i0;
  const s0 = g.steps.get(i0), s1 = g.steps.get(i1);
  if(!s0 || !s1 || !s0.vals || !s1.vals) return null;
  const v = [];
  for(const k of pts){
    const a = s0.vals[k], b = s1.vals[k];
    if(!Number.isFinite(a) || !Number.isFinite(b)) continue;
    v.push((a + (b - a) * ta) * 100);
  }
  return v.length ? percentile(v, q) : null;
}

/* Hälytyksen varakysely (päätös 36, päätös 42): milloin kysytään "Näkyikö revontulet?". item = {type, sentAt, answer, asked}.
   now/coming: aikaisintaan 90 min hälytyksestä, kun hälytys alle 15 h vanha. Vain kerran (asked) ja vain ilman
   vastausta. Päätös 42: tonight-hälytys ja sen klo 22 jälkeen -sääntö poistettu (vanhaa tonight-riviä ei kysytä). */
const TYPES_ALERT = ['now', 'coming'];
const ALERT_SURVEY = {delayMin: 90, maxAgeH: 15};
function alertSurveyDue(item, now = Date.now(), cfg = ALERT_SURVEY){
  if(!item || item.answer || item.asked || !TYPES_ALERT.includes(item.type)) return false;
  const t = Date.parse(item.sentAt);
  if(!Number.isFinite(t)) return false;
  return now - t >= cfg.delayMin * 60e3 && now - t < cfg.maxAgeH * 3600e3;
}

// Ilmoituksen napautus (11.11.2026, päätös 36 täsmennetty): kysely napautetun hälytyksen päälle vain, jos sen säännöt
// täyttyvät (alertSurveyDue). force = testiviestin lippu (fcm-test --survey): näkyy aikaikkunasta ja aiemmasta
// kysymisestä/vastauksesta riippumatta (sama testitunniste toistuu). Oikeat hälytykset eivät käytä lippua.
function alertSurveyOnTap(item, now = Date.now(), force = false, cfg = ALERT_SURVEY){
  if(!item) return false;
  return force ? true : alertSurveyDue(item, now, cfg);
}

root.AuroraCore = {
  SUN_DARK_DEG, KP_VIS, NIGHT_CFG, BZ, KP_RT, SW_FIELDS,
  clamp, sunAltitude, magLat, darknessFactor, darkPeriod, kpVisibility, kpRequired,
  ovationBilinear, parseOvation, ovationProbAt, visibilityIndex, gridGeom, cloudCovers,
  catmullRom, timeFloatInArray, resolveStep, toUnitFloat32, buildCloudGridFull,
  sampleGridField, cloudVisibilityFactor, cloudPct, hourCloud, editedHourCloud,
  moonPos, moonEvents, nightBest, computeNight, weekWindows,
  swTime, swNum, swRows, swLatest, bzTrend, bzHint,
  kpRow, kpRowFrom, kpRows, kpRtRows, kpBlockStart, kpNowInfo, kpBlockAt,
  PLACES_CFG, placeIdNew, placeNormalize, placesParse, placesSerialize, placesAdd, placesRename, placesRemove,
  placeNear, distKm, mvtLayerPoints, nearestPlaceName, tilesAround,
  ALERT_CELL, alertCell, alertLang, alertTopic, parseAlertTopic, alertTopicsFor, alertTopicDiff,
  VIS_CLASSES, visClass, CLOUD_TRANSMIT, cloudTransmit, KP_SAT, kpSatMargin, kpSaturation,
  FI_POLY, cellTimeZone, localParts, ALERT_NIGHT, alertNightKey, cellGridPoints, percentile, cellCloudPct,
  TYPES_ALERT, ALERT_SURVEY, alertSurveyDue, alertSurveyOnTap,
};
if(typeof module !== 'undefined' && module.exports) module.exports = root.AuroraCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
