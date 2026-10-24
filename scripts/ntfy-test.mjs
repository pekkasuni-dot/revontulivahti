// Testi-ilmoitus kummallekin kanavalle (2026-10-24, kenttätesti):
//   node scripts/ntfy-test.mjs --id testi-<ajo>-<yritys> [--simulate]
// Kanavat ja palauteavain ympäristöstä (NTFY_TOPIC_PEKKA, NTFY_TOPIC_OPAS,
// PALAUTE_AVAIN, PALAUTE_URL) - kanavien nimiä ei tulosteta.
// --simulate: painaa lisäksi itse kaikki kolme nappia (POST Workerille, kuten
// ntfy-sovellus) -> palaute.yml kirjaa kolme riviä PALAUTE.md:hen.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const N = require('../alerts/notify.js');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if(a.startsWith('--')) acc.push([a.slice(2), arr[i+1] && !arr[i+1].startsWith('--') ? arr[i+1] : true]);
  return acc;
}, []));
const id = args.id;
if(!N.ID_RE.test(id || '') || !id.startsWith('testi-')){ console.error('Anna --id testi-…'); process.exit(2); }
const env = process.env;
const missing = Object.entries(N.RECIPIENTS).filter(([, v]) => !env[v]).map(([, v]) => v);
if(missing.length){ console.error('Salaisuus puuttuu: ' + missing.join(', ') + ' (OHJE-ntfy.md)'); process.exit(1); }
const feedback = {url: env.PALAUTE_URL || '', key: env.PALAUTE_AVAIN || ''};
if(!feedback.url || !feedback.key) console.log('HUOM: ' + (!feedback.key ? 'PALAUTE_AVAIN' : 'PALAUTE_URL') + ' puuttuu -> ilmoitus ilman nappeja.');

const clock = new Intl.DateTimeFormat('fi-FI', {timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date());
const n = {id, place: 'testi', type: 'testi', to: Object.keys(N.RECIPIENTS), priority: 3, click: N.APP_URL,
  message: 'Testi: AuroraAwesome-kenttätesti · klo ' + clock + '\nPaina yhtä napeista – palaute tallentuu lokiin (PALAUTE.md, testirivi).'};
const log = await N.sendAll([n], env, feedback);
console.log('Testi-ilmoitus ' + id + ': ' + JSON.stringify(log[0].to) + (log[0].buttons ? ' (napit mukana)' : ' (ei nappeja)'));
if(Object.values(log[0].to).some(v => v !== 'ok')) process.exit(1);

if(args.simulate){
  if(!feedback.url || !feedback.key){ console.error('--simulate vaatii PALAUTE_URL ja PALAUTE_AVAIN'); process.exit(1); }
  for(const v of Object.keys(N.ANSWERS)){
    const s = await N.sign(feedback.key, id + '|pekka');
    const u = feedback.url.replace(/\/$/, '') + '/palaute?h=' + id + '&v=' + v + '&k=pekka&s=' + s;
    const r = await fetch(u, {method: 'POST'});
    console.log('Simuloitu nappi ' + N.ANSWERS[v] + ': HTTP ' + r.status + ' ' + (await r.text()));
    if(!r.ok) process.exit(1);
  }
}
