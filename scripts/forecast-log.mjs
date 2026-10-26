#!/usr/bin/env node
// Ennustevertailuloki (2026-10-27): kerran tunnissa testipaikoille
//  - ennusteet yön tunneille (klo 18-06 Suomen aikaa) 1, 6, 24, 48 ja 72 h etukäteen:
//    IL editoitu (pal_skandinavia) ja HARMONIE FMI:n pisteennusteena, ECMWF
//    7 vrk -ruuduista (sama data kuin sovelluksen 7 vrk -välilehti)
//  - havaittu pilvisyys edellisiltä yötunneilta (FMI-asemat n_man, Lyngen METAR).
// Kirjoittaa <out>/logs/VVVV-KK-PP.jsonl (UTC-päivä, rivi per ajo) ja raportin
// (scripts/forecast-report.mjs). Ei käyttöliittymää, ei vaikutusta sovellukseen.
//
//   node scripts/forecast-log.mjs --out DIR [--min-end VVVV-KK-PP] [--max-end VVVV-KK-PP] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import {PLACES, LEADS, floorHour, leadTargets, isNightHour, octasToPct, metarToPct, seriesAt, e7dTileKey, e7dAt} from './vertailu/core.mjs';
import {writeReport} from './forecast-report.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => {
  if(x.startsWith('--')) a.push([x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return a;
}, []));
const OUT = args.out || 'ennuste-loki';
const H = 3600e3;
const UA = {'User-Agent': 'revontulivahti (github.com/pekkasuni-dot/revontulivahti)'};
const iso = ms => new Date(ms).toISOString().slice(0, 19) + 'Z';
const PAGES = 'https://pekkasuni-dot.github.io/revontulivahti/data/';
const errors = [];

async function get(url, type = 'json', tries = 3){
  for(let i = 1; ; i++){
    try{
      const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(30e3)});
      if(!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120));
      return type === 'json' ? await r.json() : await r.text();
    }catch(e){
      if(i >= tries) throw e;
      await new Promise(res => setTimeout(res, 2000 * i));
    }
  }
}
const parseFmiTime = s => Date.parse(String(s).replace(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)$/, '$1-$2-$3T$4:$5:$6Z'));

// FMI:n pisteennuste: [{t, v}] + ajo (origintime). Pilvisyys %:na (0-1 -> %).
async function fmiPoint(producer, p, h0){
  const q = new URLSearchParams({producer, param: 'time,origintime,TotalCloudCover', latlon: p.lat + ',' + p.lon,
    format: 'json', tz: 'UTC', starttime: iso(h0), endtime: iso(h0 + 73 * H), timestep: '60'});
  const rows = await get('https://opendata.fmi.fi/timeseries?' + q);
  const s = rows.map(r => ({t: parseFmiTime(r.time), v: r.TotalCloudCover == null ? null : Number(r.TotalCloudCover)}));
  if(s.length && s.every(x => x.v == null || x.v <= 1.0001)) s.forEach(x => { if(x.v != null) x.v *= 100; });
  return {series: s, run: rows.length ? iso(parseFmiTime(rows[0].origintime)) : null};
}

// ECMWF 7 vrk -ruutu GitHub Pagesilta (sama kuin sovelluksessa).
const e7dCache = new Map();
async function e7dTile(key){
  if(!e7dCache.has(key)) e7dCache.set(key, get(PAGES + 'e7d-' + key + '.json').then(d => ({
    lat0: d.lat0, lon0: d.lon0, d: d.d, n: d.n, times: d.times, run: d.run,
    tcc: new Uint8Array(Buffer.from(d.tcc, 'base64'))})));
  return e7dCache.get(key);
}

// FMI-havainto: n_man (oktaa) tunneittain [{h, v}].
async function fmiObs(fmisid, from, to){
  const q = new URLSearchParams({service: 'WFS', version: '2.0.0', request: 'getFeature', storedquery_id: 'fmi::observations::weather::simple',
    fmisid: String(fmisid), parameters: 'n_man', starttime: iso(from), endtime: iso(to), timestep: '60'});
  const xml = await get('https://opendata.fmi.fi/wfs?' + q, 'text');
  const out = [];
  for(const m of xml.matchAll(/<BsWfs:Time>([^<]+)<\/BsWfs:Time>[\s\S]*?<BsWfs:ParameterValue>([^<]*)<\/BsWfs:ParameterValue>/g)){
    const v = Number(m[2]);
    out.push({h: Date.parse(m[1]), v: m[2] === 'NaN' || m[2] === '' ? null : octasToPct(v), raw: m[2] === 'NaN' ? null : v});
  }
  return out;
}

// METAR: kullekin tasatunnille lähin sanoma +-30 min sisällä.
async function metarObs(icao, hours){
  const list = await get('https://aviationweather.gov/api/data/metar?' + new URLSearchParams({ids: icao, hours: '5', format: 'json'}));
  return hours.map(h => {
    let best = null;
    for(const m of list){
      const t = m.obsTime * 1000, d = Math.abs(t - h);
      if(d <= 30 * 60e3 && (!best || d < best.d)) best = {d, m};
    }
    return best ? {h, v: metarToPct(best.m.rawOb), raw: best.m.rawOb.replace(/\sRMK\s.*$/, '')} : {h, v: null};
  }).filter(o => o.v != null);
}

async function logOnce(now){
  const h0 = floorHour(now), targets = leadTargets(now), obsHours = [h0 - 2 * H, h0 - H, h0].filter(isNightHour);
  const row = {t: iso(now), h0: iso(h0), runs: {}, places: {}};
  for(const p of PLACES){
    const fc = {}, rec = {fc};
    if(targets.length){
      for(const [src, producer] of [['edited', 'pal_skandinavia'], ['harmonie', 'harmonie_scandinavia_surface']]){
        try{
          const {series, run} = await fmiPoint(producer, p, h0);
          row.runs[src] = row.runs[src] && row.runs[src] > run ? row.runs[src] : run;
          fc[src] = Object.fromEntries(targets.map(x => [x.lead, round(seriesAt(series, x.target))]));
        }catch(e){ errors.push(`${p.id} ${src}: ${e.message}`); }
      }
      try{
        const key = e7dTileKey(p.lat, p.lon), T = key && await e7dTile(key);
        if(T){
          row.runs.ecmwf = iso(T.run);
          fc.ecmwf = Object.fromEntries(targets.map(x => [x.lead, round(e7dAt(T, p.lat, p.lon, x.target))]));
        }
      }catch(e){ errors.push(`${p.id} ecmwf: ${e.message}`); }
    }
    if(obsHours.length){
      try{
        const o = p.obs.fmisid ? (await fmiObs(p.obs.fmisid, obsHours[0], obsHours[obsHours.length - 1])).filter(x => obsHours.includes(x.h))
                               : await metarObs(p.obs.metar, obsHours);
        rec.obs = o.map(x => ({h: x.h, v: x.v, ...(x.raw != null ? {raw: x.raw} : {})}));
      }catch(e){ errors.push(`${p.id} havainto: ${e.message}`); }
    }
    row.places[p.id] = rec;
  }
  if(errors.length) row.err = errors;
  return row;
}
const round = v => v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10;

const now = Date.now();
const status = fs.existsSync(path.join(OUT, 'status.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'status.json'), 'utf8')) : {};
if(status.done){
  console.log('Keräys päättynyt (' + status.doneReason + ') - ei ajoa.');
  process.exit(0);
}
const row = await logOnce(now);
if(args.dry){ console.log(JSON.stringify(row, null, 1)); process.exit(0); }
fs.mkdirSync(path.join(OUT, 'logs'), {recursive: true});
fs.appendFileSync(path.join(OUT, 'logs', iso(now).slice(0, 10) + '.jsonl'), JSON.stringify(row) + '\n');
const rep = writeReport(OUT, {minEnd: args['min-end'], maxEnd: args['max-end'], now});
console.log(`Kirjattu: ${Object.keys(row.places).length} paikkaa, kohdetunnit ${leadTargets(now).map(x => x.lead + ' h').join(', ') || '-'}; ` +
  `yöt ${rep.nights}, selkeitä/puolipilvisiä ${rep.clearNights}` + (errors.length ? `; virheitä ${errors.length}` : ''));
for(const e of errors) console.log('::warning title=Ennustevertailu::' + e);
