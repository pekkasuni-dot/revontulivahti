#!/usr/bin/env node
// Revontulihälytykset ruututasolla, Aurora Dev -testi (päätökset 34 ja 36, 7.11.2026).
// Hakee datan (OVATION, Bz/Bt, Kp, pilvimallit HARMONIE / ICON-EU / ECMWF / IL editoitu), arvioi alueen ruudut
// (alerts/fcm-alerts.js) ja lähettää hälytykset ruutujen FCM-aiheisiin kielillä fi/en/zh (alert-texts.js).
//   node scripts/alert-fcm.mjs --out <hakemisto> [--now ISO] [--send]
// Oletus = kuivaharjoitus: viestit tulostetaan ja kirjataan, mitään ei lähetetä. --send vaatii salaisuuden
// FCM_SERVICE_ACCOUNT; palautteen allekirjoitus PALAUTE_AVAIN_FCM (valinnainen). Avaimia ei tulosteta.
// Hakemistoon: state.json (yö- ja Tulossa-tila ruuduittain) ja logs/YYYY-MM-DD.jsonl (ajo: ruututunnisteet,
// tyypit, luvut; ei käyttäjä- eikä sijaintitietoa). Ajotapa (työnkulku tai Worker) päätetään erikseen (päätös 37).
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
// Tänä yönä -tarkistus jossakin ruudussa -> yön tunnit ladataan (muuten vain nykyhetki ja +30..+60 min).
const tonightDue = cells.some(c => { const n = C.alertNightKey(now, c.tz), lp = C.localParts(now, c.tz);
  return n && n === lp.day && lp.hour >= C.ALERT_NIGHT.tonightHour && !(prev[c.key] && prev[c.key].tonight === n); });
const dates = [now, ...cfg.coming.leadMin.map(m => new Date(now.getTime() + m * 60e3))];
if(tonightDue) for(let h = 1; h <= 18; h++) dates.push(new Date(now.getTime() + h * 3600e3));

const S = A.SOURCES;
const [ovRaw, kpObs, kpForecast, kpRt, magRaw, ecRaw] = await Promise.all([
  tryGet('OVATION', () => getJSON(S.ovation)), tryGet('Kp mitattu', () => getJSON(S.kpObs)),
  tryGet('Kp ennuste', () => getJSON(S.kpForecast)), tryGet('Kp reaaliaikainen', () => getJSON(S.kpRt)),
  tryGet('Bz (mag)', async () => { let last; for(const u of S.mag){ try{ return await getJSON(u); }catch(e){ last = e; } } throw last; }),
  tryGet('ECMWF', () => getJSON(S.clouds + '?v=' + Math.floor(Date.now() / 600e3))),
]);
const inflate = b => new Uint8Array(zlib.inflateSync(b));
const grids = {};
for(const k of ['harmonie', 'icon_eu', 'edited'])
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
const msgs = [];
for(const a of res.alerts){
  const aid = F.alertId(a), sig = key ? await fcm.signAlert(key, aid, sentAt) : '';
  for(const lang of T.LANGS){
    const tx = F.alertTexts(T, a, lang);
    msgs.push(fcm.buildMessage({topic: C.alertTopic(a.cell, lang), title: tx.title, body: tx.body,
      data: {ver: a.cell.ver, cell: a.cell.key, view: a.type === 'tonight' ? 'night' : 'now', kind: a.type, aid, sentAt, ...(sig ? {sig} : {})}}));
  }
}
const sent = [];
if(args.send && msgs.length){
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if(!raw){ errors.push('FCM_SERVICE_ACCOUNT puuttuu: ei lähetetty'); }
  else{
    const sa = fcm.parseServiceAccount(raw), token = await fcm.accessToken(sa);
    for(const m of msgs){
      try{ await fcm.send(sa, m, {token}); sent.push({topic: m.message.topic, ok: true}); }
      catch(e){ sent.push({topic: m.message.topic, ok: false}); errors.push(m.message.topic + ': ' + e.message); }
    }
  }
}
const record = {run: sentAt, models: modelState, errors, tonightDue,
  alerts: res.alerts.map(a => ({type: a.type, cell: a.cell.key, night: a.night, pct: a.pct, ok: a.ok, avail: a.avail,
    models: a.models, kp: a.kp})), sent: args.send ? sent : 'kuivaharjoitus'};
fs.appendFileSync(path.join(OUT, 'logs', sentAt.slice(0, 10) + '.jsonl'), JSON.stringify(record) + '\n');
fs.writeFileSync(statePath, JSON.stringify(res.state));
console.log('Ajo', sentAt, '| ruutuja', cells.length, '| mallit', JSON.stringify(modelState), '| virheet', errors.length ? errors.join('; ') : 'ei');
for(const a of res.alerts) console.log(' ', a.type.padEnd(7), a.cell.key, a.cell.tz, a.pct + ' %', a.ok + '/' + a.avail, 'mallia');
if(!args.send) for(const m of msgs.slice(0, 6)) console.log('  [' + m.message.topic + '] ' + m.message.notification.title + ' | ' + m.message.notification.body);
