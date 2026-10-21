// Yhteenveto kuivaharjoituksen lokista komentorivillä:
//   node scripts/alert-summary.mjs [lokihakemisto] [--nights 7]   (oletus: kaikki yöt)
// Lokihakemisto = haaran halytys-loki sisältö (esim. git worktree add ../loki origin/halytys-loki).
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {buildSummary, parseObservations} = require('../alerts/alert-summary.js');
const PLACES = require('../alerts/test-places.json');
const argv = process.argv.slice(2);
const dir = path.resolve(argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--nights') || 'halytys-loki');
const nights = argv.includes("--nights") ? +argv[argv.indexOf("--nights") + 1] : Infinity;
const recs = [];
for(const f of fs.readdirSync(path.join(dir, 'logs')).filter(f => f.endsWith('.jsonl')).sort())
  for(const line of fs.readFileSync(path.join(dir, 'logs', f), 'utf8').split('\n')) if(line.trim()) recs.push(JSON.parse(line));
let observations = [];
try{ observations = parseObservations(fs.readFileSync(path.join(dir, 'HAVAINNOT.md'), 'utf8')); }catch(e){}
process.stdout.write(buildSummary(recs, {places: PLACES, nights, observations}));
