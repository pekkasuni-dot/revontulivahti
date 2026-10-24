// Kirjaa yhden kenttäpalautteen lokihaaran PALAUTE.md:hen (2026-10-24).
//   node scripts/alert-feedback.mjs --out <lokihakemisto> --id <hälytys> --answer nakyi|ei|pilvessa --who pekka|opas
// Hyväksyy vain tunnetut hälytykset: lokissa lähetetyt (record.sent[].id) tai
// testi-ilmoitukset (testi-…). Worker on jo tarkistanut allekirjoituksen.
// Exit 2 = tuntematon tai virheellinen -> työnkulku epäonnistuu näkyvästi.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const F = require('../alerts/feedback.js');
const N = require('../alerts/notify.js');
const PLACES = require('../alerts/test-places.json');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if(a.startsWith('--')) acc.push([a.slice(2), arr[i+1] && !arr[i+1].startsWith('--') ? arr[i+1] : true]);
  return acc;
}, []));
const OUT = path.resolve(args.out || '.');
const {id, answer, who} = args;
if(!N.ID_RE.test(id || '') || !F.ANSWERS[answer] || !F.WHO[who]){ console.error('Virheellinen palaute'); process.exit(2); }

if(!id.startsWith('testi-')){
  let known = false;
  const dir = path.join(OUT, 'logs');
  for(const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []){
    for(const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')){
      if(!line.includes(id)) continue;
      try{ if((JSON.parse(line).sent || []).some(s => s.id === id)){ known = true; break; } }catch(e){}
    }
    if(known) break;
  }
  if(!known){ console.error('Tuntematon hälytys ' + id + ' - ei kirjattu'); process.exit(2); }
}
const file = path.join(OUT, 'PALAUTE.md');
const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
fs.writeFileSync(file, F.appendRow(old, F.rowFor(id, answer, who, PLACES, new Date())));
console.log('Palaute kirjattu: ' + id + ' ' + F.ANSWERS[answer] + ' (' + F.WHO[who] + ')');
