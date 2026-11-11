#!/usr/bin/env node
// Kalibrointitaulukko (päätös 47): node scripts/kpcal-table.mjs <jsonl-tiedostoja tai hakemistoja...>
// Lukee kenttätestin lokit (halytys-loki*, logs/*.jsonl) ja kalibrointilokin (ennuste-loki kpcal/*.jsonl).
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pairsFrom, aheadPairs, calTable, ZONES, KP_CLASSES} from './vertailu/kpcal.mjs';
const C = createRequire(import.meta.url)('../aurora-core.js');
const files = process.argv.slice(2).flatMap(p => fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => f.endsWith('.jsonl')).map(f => path.join(p, f)) : [p]);
const rows = files.flatMap(f => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)));
const pairs = pairsFrom(rows), {table} = calTable(pairs);
const f1 = n => Number.isFinite(n) ? n.toFixed(1) : '–';
console.log(`Pareja (pimeä): ${pairs.length}\n\n| Vyöhyke | ` + KP_CLASSES.map(k => 'Kp ' + k).join(' | ') + ' |\n|---|' + KP_CLASSES.map(() => '---').join('|') + '|');
table.forEach((r, z) => console.log('| ' + ZONES[z] + ' | ' + r.map(c => `${f1(c.val)} (n ${c.n}${c.unsure ? ', epävarma' : ''})`).join(' | ') + ' |'));
const ahead = aheadPairs(rows);
console.log(`\nEtukäteen tehtyjä pareja (Kp-ennuste -> OVATION): ${ahead.length}`);
for(const L of [...new Set(ahead.map(x => x.lead))].sort((a, b) => a - b)){
  const a = ahead.filter(x => x.lead === L), m = arr => arr.reduce((s, x) => s + x, 0) / arr.length;
  console.log(`  ${L} h: n ${a.length}, Kp-ennuste ka ${f1(m(a.map(x => x.kpFc)))}, Kp toteutui ${f1(m(a.filter(x => x.kpNow != null).map(x => x.kpNow)))}, OVATION ka ${f1(m(a.map(x => x.ov)))}, Kp-tapa ka ${f1(m(a.map(x => C.kpVisibility(x.kpFc, x.mlat).p)))}`);
}
