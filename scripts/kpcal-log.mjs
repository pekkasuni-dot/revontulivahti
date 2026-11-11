#!/usr/bin/env node
// Näkyvyys-%:n kalibrointiloki (päätös 47, 2026-11-11): kerran tunnissa (ennustevertailu.yml, sama ajastin)
// OVATION kalibrointipaikoilla + Kp nyt + Kp-ennusteen jaksot -> <out>/kpcal/VVVV-KK-PP.jsonl.
// Myöhemmin parit "Kp-ennuste etukäteen" vs. "OVATION kun tunti tuli" (scripts/kpcal-table.mjs).
// Ei vaikutusta sovellukseen eikä hälytyksiin.   node scripts/kpcal-log.mjs --out DIR [--dry]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {logRow} from './vertailu/kpcal.mjs';
const C = createRequire(import.meta.url)('../aurora-core.js');
const args = process.argv.slice(2), OUT = args[args.indexOf('--out') + 1] || 'ennuste-loki', DRY = args.includes('--dry');
const UA = {'User-Agent': 'revontulivahti (github.com/pekkasuni-dot/revontulivahti)'};
const S = 'https://services.swpc.noaa.gov/';
async function get(url){
  for(let i = 1; ; i++){
    try{ const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(30e3)}); if(!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch(e){ if(i >= 3) throw new Error(url + ': ' + e.message); await new Promise(res => setTimeout(res, 3000 * i)); }
  }
}
const now = Date.now();
const [ov, obs, fc, rt] = await Promise.all(['json/ovation_aurora_latest.json', 'products/noaa-planetary-k-index.json',
  'products/noaa-planetary-k-index-forecast.json', 'json/planetary_k_index_1m.json'].map(u => get(S + u).catch(e => { console.log('::warning::' + e.message); return null; })));
const obsRows = obs ? C.kpRows(obs) : [];
const kp = {rt: rt ? C.kpRtRows(rt) : [], obsRows, obs: obsRows[obsRows.length - 1] || null, forecast: fc ? C.kpRows(fc) : []};
const row = logRow(now, {ovation: ov ? C.parseOvation(ov) : null, kp});
if(DRY){ console.log(JSON.stringify(row).slice(0, 2000)); process.exit(0); }
const dir = path.join(OUT, 'kpcal'); fs.mkdirSync(dir, {recursive: true});
fs.appendFileSync(path.join(dir, row.t.slice(0, 10) + '.jsonl'), JSON.stringify(row) + '\n');
console.log('Kalibrointiloki: ' + Object.keys(row.places).length + ' paikkaa, Kp nyt ' + (row.kpNow ? row.kpNow.kp : '-') + ', ennustejaksoja ' + row.kpFc.length);
