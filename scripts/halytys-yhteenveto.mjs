#!/usr/bin/env node
// Hälytysehtojen yhteenveto tila-haaran lokeista (2026-11-13). Vain luku, ei verkkoa paitsi git fetch.
//   node scripts/halytys-yhteenveto.mjs              -> lukee origin/halytys-fcm-tila:logs/*.jsonl (git fetch ensin)
//   node scripts/halytys-yhteenveto.mjs --dir <kansio>   -> paikalliset .jsonl-tiedostot
//   --json  tulostaa taulukon sijaan JSONin
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const S = createRequire(import.meta.url)('../alerts/fcm-log-summary.js');
const args = process.argv.slice(2), dir = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null;
const lines = [];
if(dir){
  for(const f of fs.readdirSync(dir).filter(f => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f)).sort()) lines.push(...fs.readFileSync(path.join(dir, f), 'utf8').split('\n'));
} else {
  const git = (...a) => execFileSync('git', a, {encoding: 'utf8', maxBuffer: 1e9});
  try{ git('fetch', '-q', 'origin', 'halytys-fcm-tila'); }catch(e){ console.error('git fetch epäonnistui, käytetään paikallista kopiota'); }
  const files = git('ls-tree', '--name-only', 'origin/halytys-fcm-tila', 'logs/').split('\n').filter(f => /\.jsonl$/.test(f)).sort();
  for(const f of files) lines.push(...git('show', 'origin/halytys-fcm-tila:' + f).split('\n'));
}
const recs = lines.filter(Boolean).map(l => { try{ return JSON.parse(l); }catch(e){ return null; } }).filter(Boolean);
const rows = S.summarize(recs);
process.stdout.write(args.includes('--json') ? JSON.stringify(rows, null, 1) + '\n' : S.toMarkdown(rows));
