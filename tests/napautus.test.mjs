// Napautusalueet 44 x 44 px (päätös 28, 2026-11-01). VAROITTAVA testi: ei koskaan epäonnistu, kirjaa rikkeet.
// Mittaus tehdään selaimessa (npm run napautus = screenshots.mjs --offline --states=napautus, Playwright), joka
// tallentaa docs/kuvakaappaukset/<pvm>/<koko>-napautus-tulos.json. Tämä testi lukee uusimman mittauksen ja
// vertaa sitä poikkeuslistaan (scripts/napautus-poikkeukset.mjs). CI:ssä ei ole selainta -> ei mittausta, vain ilmoitus.
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onPoikkeus } from '../scripts/napautus-poikkeukset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs', 'kuvakaappaukset');

function latestResults(){
  if(!fs.existsSync(DIR)) return [];
  const days = fs.readdirSync(DIR).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
  for(const d of days){
    const files = fs.readdirSync(path.join(DIR, d)).filter(f => f.endsWith('-napautus-tulos.json'));
    if(files.length) return files.map(f => ({file: path.join(d, f), rows: JSON.parse(fs.readFileSync(path.join(DIR, d, f), 'utf8'))}));
  }
  return [];
}

test('napautusalueet vähintään 44 x 44 px (varoittava)', t => {
  const res = latestResults();
  if(!res.length){ t.diagnostic('Ei napautusmittausta: aja "npm run napautus" (vaatii Playwrightin). Ohitetaan.'); return; }
  let n = 0;
  for(const {file, rows} of res){
    const bad = rows.filter(r => !r.ok && !onPoikkeus(r));
    const seen = new Set();
    for(const r of bad){
      const k = r.view + ' ' + r.label; if(seen.has(k)) continue; seen.add(k); n++;
      t.diagnostic(`VAROITUS ${file}: ${r.view}: ${r.label} ${Math.round(r.w)}×${Math.round(r.h)} px`);
    }
    t.diagnostic(`${file}: ${rows.length} mittausta, alle 44 px (ei poikkeus): ${bad.length}`);
  }
  if(!n) t.diagnostic('Kaikki mitatut napautusalueet vähintään 44 px (poikkeukset pois lukien).');
});
