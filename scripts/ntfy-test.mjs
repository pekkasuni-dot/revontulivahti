// Testi-ilmoitus yhteiselle kanavalle (2026-10-24, kenttätesti):
//   node scripts/ntfy-test.mjs --id testi-<ajo>-<yritys> [--simulate]
// Kanava ja palauteavain ympäristöstä (NTFY_TOPIC_YHTEINEN, PALAUTE_AVAIN,
// PALAUTE_URL) - kanavan nimeä ei tulosteta.
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
if(!env[N.TOPIC_ENV]){ console.error('Salaisuus puuttuu: ' + N.TOPIC_ENV + ' (OHJE-ntfy.md)'); process.exit(1); }
const feedback = {url: env.PALAUTE_URL || '', key: env.PALAUTE_AVAIN || ''};
if(!feedback.url || !feedback.key) console.log('HUOM: ' + (!feedback.key ? 'PALAUTE_AVAIN' : 'PALAUTE_URL') + ' puuttuu -> ilmoitus ilman nappeja.');

const clock = new Intl.DateTimeFormat('fi-FI', {timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date());
const n = {id, place: 'testi', type: 'testi', priority: 3, click: N.APP_URL,
  message: 'Testi: AuroraAwesome-kenttätesti · klo ' + clock + '\nPaina yhtä napeista – palaute tallentuu lokiin (PALAUTE.md, testirivi).'};
const log = await N.sendAll([n], env, feedback);
console.log('Testi-ilmoitus ' + id + ': ' + log[0].status + (log[0].buttons ? ' (napit mukana)' : ' (ei nappeja)'));
if(log[0].status !== 'ok') process.exit(1);

if(args.simulate){
  if(!feedback.url || !feedback.key){ console.error('--simulate vaatii PALAUTE_URL ja PALAUTE_AVAIN'); process.exit(1); }
  for(const v of Object.keys(N.ANSWERS)){
    const s = await N.sign(feedback.key, id);
    const u = feedback.url.replace(/\/$/, '') + '/palaute?h=' + id + '&v=' + v + '&s=' + s;
    const r = await fetch(u, {method: 'POST'});
    console.log('Simuloitu nappi ' + N.ANSWERS[v] + ': HTTP ' + r.status + ' ' + (await r.text()));
    if(!r.ok) process.exit(1);
  }
}
