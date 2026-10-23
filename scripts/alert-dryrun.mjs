// Revontulihälytysten KUIVAHARJOITUS (vaihe 1): hakee datan, ajaa hälytys-
// logiikan (alerts/aurora-alerts.js + aurora-core.js) testipaikoille ja
// kirjaa tuloksen lokiin. EI lähetä ilmoituksia.
//
//   node scripts/alert-dryrun.mjs --out <hakemisto> [--clouds <tiedosto>]
//   node scripts/alert-dryrun.mjs --out /tmp/x --fixtures [--now 2026-10-21T19:00:00Z]   (testi ilman verkkoa)
//   node scripts/alert-dryrun.mjs --out <hakemisto> --summary-only   (vain YHTEENVETO.md uudelleen)
//   node scripts/alert-dryrun.mjs --out <hakemisto> --final           (lopullinen LOPPURAPORTTI.md, ei ajoa)
// Jakso: --start <ISO-aika> (vanhemmat lokirivit eivät mukana yhteenvedossa/
// raportissa) ja --end <VVVV-KK-PP> (viimeinen päivä, UTC). End-päivän ajot
// kirjoittavat väliaikaisen LOPPURAPORTTI.md:n.
//
// Hakemistoon: logs/YYYY-MM-DD.jsonl (yksi rivi per ajo, UTC-päivä),
// state.json (toiston esto), YHTEENVETO.md (yöt aikajanana), HAVAINNOT.md
// (käyttäjän omat havainnot, luodaan pohjana jos puuttuu; vain ohjeteksti päivittyy). Lokit
// LOG_DAYS vrk, vanhemmat poistetaan. Ks. MUISTIO-halytykset.md.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../aurora-core.js');
const A = require('../alerts/aurora-alerts.js');
const {buildSummary, parseObservations, ensureObsTemplate, placeSetId} = require('../alerts/alert-summary.js');
const {buildReport} = require('../alerts/alert-report.js');
const Keo = require('../alerts/keograms.js');
const PLACES = require('../alerts/test-places.json');
const LOG_DAYS = 16;   // kuivaharjoitus 15 yötä (2. jakso 23.10.-6.11.) + varaa lopulliselle raportille

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if(a.startsWith('--')) acc.push([a.slice(2), arr[i+1] && !arr[i+1].startsWith('--') ? arr[i+1] : true]);
  return acc;
}, []));
const OUT = path.resolve(args.out || 'halytys-loki');
const now = args.now ? new Date(args.now) : new Date();
fs.mkdirSync(path.join(OUT, 'logs'), {recursive: true});
const START = typeof args.start === 'string' ? args.start : null;
const END = typeof args.end === 'string' ? args.end : null;
const obsPath = path.join(OUT, 'HAVAINNOT.md');
// Havaintopohja: rivi joka yölle (vanhan muodon rivit säilyvät); ohjeteksti
// päivittyy testipaikkojen mukaan, käyttäjän rivit eivät muutu.
{
  const old = fs.existsSync(obsPath) ? fs.readFileSync(obsPath, 'utf8') : null;
  const t = ensureObsTemplate(old, START ? START.slice(0, 10) : null, END, PLACES);
  if(t) fs.writeFileSync(obsPath, t);
}

// Yhteenveto (kaikki yöt) ja loppuraportti kaikista lokeista.
const reportPath = path.join(OUT, 'LOPPURAPORTTI.md');
// Keogrammit: tarkistettujen öiden löydetyt osoitteet (alerts/keograms.js).
const keoPath = path.join(OUT, 'keograms.json');
let keograms = {};
try{ keograms = JSON.parse(fs.readFileSync(keoPath, 'utf8')); }catch(e){}
function writeSummary(final){
  const recs = [];
  for(const f of fs.readdirSync(path.join(OUT, 'logs')).sort())
    for(const line of fs.readFileSync(path.join(OUT, 'logs', f), 'utf8').split('\n')) if(line.trim()) recs.push(JSON.parse(line));
  const use = START ? recs.filter(r => r.run >= START) : recs;
  const observations = parseObservations(fs.readFileSync(obsPath, 'utf8'));
  fs.writeFileSync(path.join(OUT, 'YHTEENVETO.md'), buildSummary(use, {places: PLACES, now, observations, start: START, end: END, keograms}));
  // Väliaikainen raportti viimeisenä päivänä (ja --summary-only, jos raportti jo on), lopullinen --final.
  if(final || (END && now.toISOString().slice(0, 10) >= END) || fs.existsSync(reportPath))
    fs.writeFileSync(reportPath, buildReport(use, {places: PLACES, observations, cfg: A.ALERT_CFG, final: !!final, now, keograms,
      kpReq: Object.fromEntries(PLACES.map(p => [p.id, C.kpRequired(C.magLat(p.lat, p.lon))]))}));
}
if(args['summary-only'] || args.final){ writeSummary(!!args.final); process.exit(0); }

async function getJSON(url, text){
  let err;
  for(let k = 0; k < 3; k++){
    try{
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, {signal: ctl.signal, headers: {'cache-control': 'no-cache'}});
      clearTimeout(tm);
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return text ? await r.text() : await r.json();
    }catch(e){ err = e; await new Promise(r => setTimeout(r, 2000 * (k + 1))); }
  }
  throw new Error(url + ': ' + err.message);
}

const errors = [];
const tryGet = async (name, fn) => { try{ return await fn(); }catch(e){ errors.push(name + ': ' + e.message); return null; } };
let raw;
if(args.fixtures){
  const fx = await import('./screenshots/offline-fixtures.mjs');
  if(args.now) fx.setNow(now.getTime());
  raw = {ovation: fx.ovationFixture(), kpObs: fx.kpFixture(), kpForecast: fx.kpForecastFixture(), kpRt: [],
         mag: fx.magFixture(), clouds: fx.cloudsFixture()};
} else {
  const S = A.SOURCES;
  const [ovation, kpObs, kpForecast, kpRt, mag, clouds] = await Promise.all([
    tryGet('OVATION', () => getJSON(S.ovation)),
    tryGet('Kp mitattu', () => getJSON(S.kpObs)),
    tryGet('Kp ennuste', () => getJSON(S.kpForecast)),
    tryGet('Kp reaaliaikainen', () => getJSON(S.kpRt)),
    tryGet('Bz (mag)', async () => { for(const u of S.mag){ try{ return await getJSON(u); }catch(e){ var last = e; } } throw last; }),
    tryGet('pilvet', async () => args.clouds ? JSON.parse(fs.readFileSync(args.clouds, 'utf8')) : getJSON(S.clouds + '?v=' + Math.floor(Date.now()/600e3))),
  ]);
  raw = {ovation, kpObs, kpForecast, kpRt, mag, clouds};
}

// Jäsennys samoilla funktioilla kuin sovellus (aurora-core.js).
const safe = (name, fn) => { try{ return fn(); }catch(e){ errors.push(name + ' (jäsennys): ' + e.message); return null; } };
const ovation = raw.ovation ? safe('OVATION', () => C.parseOvation(raw.ovation)) : null;
const kpObsRows = raw.kpObs ? C.kpRows(raw.kpObs) : [];
const kp = {rt: raw.kpRt ? C.kpRtRows(raw.kpRt) : [], obsRows: kpObsRows, obs: kpObsRows[kpObsRows.length-1] || null,
            forecast: raw.kpForecast ? C.kpRows(raw.kpForecast) : []};
const mag = raw.mag ? C.swRows(raw.mag, C.SW_FIELDS.mag) : null;
const cloudGrid = raw.clouds ? safe('pilvet', () => C.buildCloudGridFull(raw.clouds)) : null;
const data = {ovation, cloudGrid, mag, kp};

// Keogrammien tarkistus (ei --fixtures): vain kuvan olemassaolo, kuvaa ei tallenneta.
if(!args.fixtures && START && END){
  const nights = [];
  for(let t = Date.parse(START.slice(0, 10) + 'T12:00:00Z'); t <= Date.parse(END + 'T12:00:00Z'); t += 86400e3) nights.push(new Date(t).toISOString().slice(0, 10));
  const head = async url => {
    try{
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(url, {headers: {Range: 'bytes=0-0'}, signal: ctl.signal});
      clearTimeout(tm);
      const ok = (r.status === 200 || r.status === 206) && /^image\//.test(r.headers.get('content-type') || '');
      try{ await r.body?.cancel(); }catch(e){}
      return ok;
    }catch(e){ return false; }
  };
  try{
    const checked = await Keo.checkNights(keograms, nights, head, now);
    if(checked.length) console.log('Keogrammit tarkistettu:', checked.map(n => n + ' ' + Object.keys(keograms[n].found).join('/')).join('; '));
    fs.writeFileSync(keoPath, JSON.stringify(keograms, null, 1));
  }catch(e){ errors.push('keogrammit: ' + e.message); }
}

const statePath = path.join(OUT, 'state.json');
let prev = {};
try{ prev = JSON.parse(fs.readFileSync(statePath, 'utf8')); }catch(e){}
const res = A.evaluateAll(C, data, PLACES, prev, now);

const iso = d => d ? new Date(d).toISOString() : null;
const lastMag = mag && mag.length ? mag[mag.length-1] : null;
const record = {
  run: now.toISOString(),
  logic: A.LOGIC_VERSION,   // 2 = tuntematon tila ei nollaa toiston estoa (2026-10-22)
  placeSet: placeSetId(PLACES),   // testipaikat (2026-10-23: kameroiden kohdat); vaihdos näkyy yhteenvedossa/raportissa
  data: {
    ovationObs: iso(ovation && ovation.time), ovationForecast: iso(ovation && ovation.forecast),
    kpRt: iso(kp.rt.length && kp.rt[kp.rt.length-1].t), kpObs: iso(kp.obs && kp.obs.t),
    kpForecastTo: iso(kp.forecast.length && kp.forecast[kp.forecast.length-1].t),
    mag: iso(lastMag && lastMag.t), cloudsRun: iso(cloudGrid && cloudGrid.run),
    cloudsTo: iso(cloudGrid && cloudGrid.times[cloudGrid.times.length-1]),
  },
  errors,
  // Hälytykset tiiviisti: rajan ylittäneet tasot (on) ja ne, jotka olisivat
  // lähteneet (fire), syy jokaiselle; muut tyypit yhdellä rivillä (alin taso:
  // miksi ei). Tänä yönä vain tarkistusajona.
  places: res.places.map(p => ({id: p.id, name: p.name, ...p.metrics,
    alerts: A.TYPES.flatMap(t => {
      const list = p.alerts.filter(a => a.type === t);
      if(t === 'tonight' && !p.metrics.night) return [];
      const hit = list.filter(a => a.on || a.fire);
      return (hit.length ? hit : [list[0]]).map(a => ({t, l: a.level, on: a.on, fire: a.fire, ...(a.unknown ? {u: true} : {}), why: a.reason}));
    })})),
};
const day = now.toISOString().slice(0, 10);
fs.appendFileSync(path.join(OUT, 'logs', day + '.jsonl'), JSON.stringify(record) + '\n');
fs.writeFileSync(statePath, JSON.stringify(res.state, null, 1));

// Vanhat lokit pois (LOG_DAYS vrk).
const cut = new Date(now.getTime() - LOG_DAYS * 86400e3).toISOString().slice(0, 10);
for(const f of fs.readdirSync(path.join(OUT, 'logs'))){
  const d = f.slice(0, 10);
  if(/^\d{4}-\d\d-\d\d\.jsonl$/.test(f) && d < cut) fs.unlinkSync(path.join(OUT, 'logs', f));
}

writeSummary();

const fired = record.places.flatMap(p => p.alerts.filter(a => a.fire).map(a => p.name + ': ' + A.TYPE_NAMES[a.t] + ' (' + A.LEVEL_NAMES[a.l] + ') - ' + a.why));
console.log('Ajo', record.run, '| virheet:', errors.length ? errors.join('; ') : 'ei');
for(const p of record.places) console.log(' ', p.name.padEnd(12), 'näkyvyys', String(p.idx).padStart(3), '% | revontulet', p.aurora, '% | pilvet', p.cloud, '% | aurinko', p.sunAlt, '° | Kp-raja', p.kpReq, '| Bz', p.bz ? p.bz.mean + ' nT/' + p.bz.southMin + ' min' + (p.bz.hint ? ' VIHJE' : '') : '–', p.night ? '| yö max ' + p.night.max + ' %' : '');
console.log(fired.length ? 'Hälytykset (EI lähetetty):\n  ' + fired.join('\n  ') : 'Ei hälytyksiä.');
