// Keogrammilinkit (alerts/keograms.js), 2026-10-23.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const K = require('../alerts/keograms.js');

test('osoitteet: FMI illan päivä, IRF ilta + aamu UTC-päivinä', () => {
  const st = c => K.STATIONS.find(s => s.code === c);
  assert.equal(st('MUO').urls('2026-10-31')[0].url, 'https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/MUO.2610/MUO_261031.jpg');
  assert.deepEqual(st('KRN').urls('2026-10-31').map(u => u.url), [
    'https://www.irf.se/alis/allsky/krn/2026/10/31/keo20261031.gif',
    'https://www.irf.se/alis/allsky/krn/2026/11/01/keo20261101.gif']);
});

test('tarkistus: vain valmiit yöt, linkit vain löytyneisiin, julkaisematta luetellaan', async () => {
  const st = {}, nights = ['2026-10-23', '2026-10-24', '2026-10-25'];
  const seen = [];
  const head = async url => { seen.push(url); return /MUO|KEV|krn/.test(url); };
  // 24.10. klo 05 UTC: yö 23.10. ei vielä valmis
  assert.deepEqual(await K.checkNights(st, nights, head, new Date('2026-10-24T05:00:00Z')), []);
  assert.equal(K.keogramLine(st, '2026-10-23'), null);
  // klo 06.05 UTC: yö 23.10. tarkistetaan
  assert.deepEqual(await K.checkNights(st, nights, head, new Date('2026-10-24T06:05:00Z')), ['2026-10-23']);
  const line = K.keogramLine(st, '2026-10-23');
  assert.match(line, /^\[Muonio\]\(https:\/\/space\.fmi\.fi\/.*MUO_261023\.jpg\) · \[Kevo\]/);
  assert.match(line, /Kiiruna \[ilta\]\(.*keo20261023\.gif\) \+ \[aamu\]\(.*keo20261024\.gif\)/);
  assert.match(line, /julkaisematta: Kilpisjärvi, Sodankylä$/);
  // Seuraava ajo samana aamuna: yö tarkistetaan uudelleen (puuttuvia), löydettyjä ei kysytä uudelleen
  seen.length = 0;
  await K.checkNights(st, nights, head, new Date('2026-10-24T06:20:00Z'));
  assert.ok(seen.every(u => /KIL|SOD/.test(u)), seen.join(' '));
  // Seuraavana päivänä: uusin yö joka ajo, vanha puuttuva kerran vuorokaudessa (klo 07 UTC jälkeen)
  assert.deepEqual(await K.checkNights(st, nights, head, new Date('2026-10-25T06:10:00Z')), ['2026-10-24']);
  assert.deepEqual(await K.checkNights(st, nights, head, new Date('2026-10-25T07:05:00Z')), ['2026-10-23', '2026-10-24']);
  assert.deepEqual(await K.checkNights(st, nights, head, new Date('2026-10-25T07:20:00Z')), ['2026-10-24']);
  // Kilpisjärvi julkaistaan myöhemmin -> linkki ilmestyy
  const head2 = async url => /MUO|KEV|krn|KIL/.test(url);
  await K.checkNights(st, nights, head2, new Date('2026-10-26T07:05:00Z'));
  assert.match(K.keogramLine(st, '2026-10-23'), /\[Kilpisjärvi\].*julkaisematta: Sodankylä$/);
});
