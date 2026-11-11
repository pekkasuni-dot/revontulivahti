#!/usr/bin/env node
// Revontulihälytykset ruututasolla, Aurora Dev -testi (päätökset 34 ja 36, 7.11.2026).
// Hakee datan (OVATION, Bz/Bt, Kp, pilvimallit HARMONIE / ICON-EU / ECMWF / IL editoitu), arvioi alueen ruudut
// (alerts/fcm-alerts.js) ja lähettää hälytykset ruutujen FCM-aiheisiin kielillä fi/en/zh (alert-texts.js).
// Kolme vaihetta (päätös 38, työnkulku .github/workflows/alert-fcm.yml): laske -> tallenna tila ja pushaa -> lähetä.
//   node scripts/alert-fcm.mjs --out <tila> --gate                 esitarkistus: pimeää tai Tänä yönä -ikkuna?
//                                                                   (GITHUB_OUTPUT run=true|false), ei verkkohakuja
//   node scripts/alert-fcm.mjs --out <tila> [--outbox <tiedosto>] [--now ISO]
//                                                                   laskenta: state.json + logs/ + viestit outboxiin
//   node scripts/alert-fcm.mjs --send-outbox <tiedosto>            lähetys (FCM_SERVICE_ACCOUNT)
// Ilman --outboxia = kuivaharjoitus (viestit tulostetaan). Palautteen allekirjoitus PALAUTE_AVAIN_FCM: puuttuu ->
// varoitus (palaute-Worker hylkää vastaukset). Avaimia ei tulosteta. Tilahakemistoon: state.json (yö- ja
// Tulossa-tila ruuduittain) ja logs/YYYY-MM-DD.jsonl (ajo: ruututunnisteet, tyypit, luvut; ei käyttäjä- eikä
// sijaintitietoa), lokit LOG_KEEP_DAYS päivää. Outbox ei mene tilahaaraan (sisältää vain viestit, ei avaimia).
// Lähetetään KAIKILLE ehdon täyttäville ruuduille x 3 kieltä: palvelin ei tiedä, onko aiheella tilaajia
// (päätös 29: ei laitetietoja palvelimelle); FCM hyväksyy lähetyksen tilaajattomaan aiheeseen.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../aurora-core.js');
const T = require('../alert-texts.js');
const F = require('../alerts/fcm-alerts.js');
const A = require('../alerts/aurora-alerts.js');
const CM = require('../alerts/cloud-models.js');
const fcm = require('../alerts/fcm.js');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if(a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const GHA = !!process.env.GITHUB_ACTIONS;
const warn = msg => console.log((GHA ? '::warning::' : 'VAROITUS: ') + msg);
const LOG_KEEP_DAYS = 14, SEND_PARALLEL = 8;

// ── Lähetys (vaihe 3) ──
if(args['send-outbox']){
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if(!raw){ console.log((GHA ? '::error::' : 'VIRHE: ') + 'FCM_SERVICE_ACCOUNT puuttuu: ei lähetetty'); process.exit(1); }
  const msgs = JSON.parse(fs.readFileSync(args['send-outbox'], 'utf8'));
  if(!msgs.length){ console.log('Ei lähetettävää.'); process.exit(0); }
  const sa = fcm.parseServiceAccount(raw), token = await fcm.accessToken(sa);
  let ok = 0, fail = 0, i = 0;
  await Promise.all(Array.from({length: Math.min(SEND_PARALLEL, msgs.length)}, async () => {
    while(i < msgs.length){
      const m = msgs[i++];
      try{ await fcm.send(sa, m, {token}); ok++; }
      catch(e){ fail++; warn(m.message.topic + ': ' + e.message); }
    }
  }));
  console.log('Lähetetty', ok, '/', msgs.length, fail ? '| epäonnistui ' + fail : '');
  process.exit(fail ? 1 : 0);
}

const OUT = path.resolve(args.out || 'halytys-fcm');
const now = args.now ? new Date(args.now) : new Date();
fs.mkdirSync(path.join(OUT, 'logs'), {recursive: true});
const errors = [];
async function getJSON(url){
  let err;
  for(let k = 0; k < 3; k++){
    try{
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
      const r = await fetch(url, {signal: ctl.signal, headers: {'cache-control': 'no-cache'}});
      clearTimeout(tm);
      if(!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    }catch(e){ err = e; await new Promise(r => setTimeout(r, 2000 * (k + 1))); }
  }
  throw new Error(url + ': ' + err.message);
}
const tryGet = async (name, fn) => { try{ return await fn(); }catch(e){ errors.push(name + ': ' + e.message); return null; } };

const statePath = path.join(OUT, 'state.json');
let prev = {};
try{ prev = JSON.parse(fs.readFileSync(statePath, 'utf8')); }catch(e){}
const cells = F.regionCells(C);
const cfg = F.FCM_ALERT_CFG;
const need = F.runNeed(C, cells, prev, now);
// ── Esitarkistus (vaihe 0): ei pimeää eikä Tänä yönä -ikkunaa missään ruudussa -> ei hakuja, ei tilan tallennusta ──
if(args.gate){
  console.log('Esitarkistus', now.toISOString(), '| pimeitä ruutuja', need.dark, '->', need.run ? 'ajetaan' : 'ei ajoa');
  if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'run=' + need.run + '\n');
  process.exit(0);
}
// Päätös 42: vain nykyhetki ja +30..+60 min (Tänä yönä -hälytys poistettu -> ei yön tunteja eikä IL editoitua).
const dates = [now, ...cfg.coming.leadMin.map(m => new Date(now.getTime() + m * 60e3))];

const S = A.SOURCES;
const [ovRaw, kpObs, kpForecast, kpRt, magRaw, ecRaw] = await Promise.all([
  tryGet('OVATION', () => getJSON(S.ovation)), tryGet('Kp mitattu', () => getJSON(S.kpObs)),
  tryGet('Kp ennuste', () => getJSON(S.kpForecast)), tryGet('Kp reaaliaikainen', () => getJSON(S.kpRt)),
  tryGet('Bz (mag)', async () => { let last; for(const u of S.mag){ try{ return await getJSON(u); }catch(e){ last = e; } } throw last; }),
  tryGet('ECMWF', () => getJSON(S.clouds + '?v=' + Math.floor(Date.now() / 600e3))),
]);
const inflate = b => new Uint8Array(zlib.inflateSync(b));
const grids = {};
for(const k of ['harmonie', 'icon_eu'])
  grids[k] = await tryGet(CM.MODELS[k].name, () => CM.loadLazyGrid(C, k, dates, u => getJSON(u + '?v=' + Math.floor(Date.now() / 600e3)), inflate));
grids.ecmwf = ecRaw ? (() => { try{ return C.buildCloudGridFull(ecRaw); }catch(e){ errors.push('ECMWF: ' + e.message); return null; } })() : null;
// Vain tuore ajo kelpaa (päätös 36: puuttuva malli ei ole nolla, se jää pois saatavilla olevista).
const modelState = {};
for(const k of Object.keys(grids)){
  const f = CM.gridFresh(grids[k], now, cfg.maxAgeH[k]);
  modelState[k] = f.reason;
  if(!f.ok) grids[k] = null;
}
const kpRows = kpObs ? C.kpRows(kpObs) : [];
const data = {
  ovation: ovRaw ? (() => { try{ return C.parseOvation(ovRaw); }catch(e){ errors.push('OVATION: ' + e.message); return null; } })() : null,
  mag: magRaw ? C.swRows(magRaw, C.SW_FIELDS.mag) : null,
  kp: {rt: kpRt ? C.kpRtRows(kpRt) : [], obsRows: kpRows, obs: kpRows[kpRows.length - 1] || null, forecast: kpForecast ? C.kpRows(kpForecast) : []},
  grids,
};

const res = F.evaluateCells(C, data, cells, prev, now);
const sentAt = now.toISOString();
const key = process.env.PALAUTE_AVAIN_FCM || '';
if(!key) warn('PALAUTE_AVAIN_FCM puuttuu: hälytykset lähtevät ilman allekirjoitusta, palaute-Worker hylkää vastaukset (403).');
const msgs = [];
for(const a of res.alerts){
  // Sama rakennus kuin testilähetyksessä (fcm.alertMessages, scripts/fcm-test.mjs).
  msgs.push(...await fcm.alertMessages({core: C, texts: T, alerts: F, alert: a, sentAt, key}));
}
// Lähetys erillisessä vaiheessa VASTA kun tila on tallennettu ja pushattu (ei tuplia; push epäonnistuu -> ei lähetetä).
if(args.outbox) fs.writeFileSync(args.outbox, JSON.stringify(msgs));
const record = {run: sentAt, models: modelState, errors, dark: need.dark, messages: msgs.length,
  alerts: res.alerts.map(a => ({type: a.type, cell: a.cell.key, night: a.night, pct: a.pct, ok: a.ok, avail: a.avail,
    models: a.models, report: a.report})), mode: args.outbox ? 'lähetysjono' : 'kuivaharjoitus'};
fs.appendFileSync(path.join(OUT, 'logs', sentAt.slice(0, 10) + '.jsonl'), JSON.stringify(record) + '\n');
fs.writeFileSync(statePath, JSON.stringify(res.state));
// Vanhat lokit pois (tilahaara korvataan joka ajolla, joten se ei kasva).
const keepFrom = new Date(now.getTime() - LOG_KEEP_DAYS * 864e5).toISOString().slice(0, 10);
for(const f of fs.readdirSync(path.join(OUT, 'logs'))) if(/^\d{4}-\d\d-\d\d\.jsonl$/.test(f) && f.slice(0, 10) < keepFrom) fs.rmSync(path.join(OUT, 'logs', f));
console.log('Ajo', sentAt, '| ruutuja', cells.length, '| mallit', JSON.stringify(modelState), '| virheet', errors.length ? errors.join('; ') : 'ei');
for(const a of res.alerts) console.log(' ', a.type.padEnd(7), a.cell.key, a.cell.tz, a.pct + ' %', a.ok + '/' + a.avail, 'mallia',
  '| pilvet', a.report.cloud, '% | Bz', a.report.bz, '| Bt', a.report.bt, '| Kp', a.report.kp);
console.log('Viestejä', msgs.length, args.outbox ? '-> ' + args.outbox : '(kuivaharjoitus, ei lähetetä)');
if(!args.outbox) for(const m of msgs.slice(0, 6)) console.log('  [' + m.message.topic + '] ' + m.message.data.title + ' | ' + m.message.data.body);
