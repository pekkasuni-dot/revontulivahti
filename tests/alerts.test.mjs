// Hälytysten toiston esto (alerts/aurora-alerts.js decide()), 2026-10-22.
process.env.TZ = 'Europe/Helsinki';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../alerts/aurora-alerts.js');
const R = require('../alerts/alert-report.js');

const place = {id: 'oulu', name: 'Oulu', tz: 'Europe/Helsinki'};
const good = {idx: 50, aurora: 30, bz: {mean: -8, southMin: 30, bt: 12, btFresh: true, fresh: true, hint: true},
              kp: 5, kpReq: 3, isDark: true, sunAlt: -20, cloud: 10};
const gap = {...good, idx: null, aurora: null, bz: null};        // OVATION ja mag puuttuvat
const low = {...good, idx: 10, bz: {...good.bz, hint: false}};   // aito lasku rajan alle
const T0 = Date.parse('2026-10-22T15:04:00Z');

// Ajaa sarjan 15 min välein; palauttaa lähteneet hälytykset "hh:mm tyyppi/taso".
function run(seq){
  let st = {}; const fires = [], recs = [];
  seq.forEach((m, i) => {
    const now = new Date(T0 + i * 15 * 60e3), r = A.decide(place, m, st, now);
    st = r.state;
    r.alerts.filter(a => a.fire).forEach(a => fires.push(now.toISOString().slice(11, 16) + ' ' + a.type + '/' + a.level));
    recs.push({run: now.toISOString(), logic: A.LOGIC_VERSION, places: [{id: place.id, name: place.name, alerts: r.alerts
      .filter(a => a.type !== 'tonight').map(a => ({t: a.type, l: a.level, on: a.on, fire: a.fire, ...(a.unknown ? {u: true} : {}), why: a.reason}))}]});
  });
  return {fires, recs};
}

test('datakatko ei laukaise samaa hälytystä uudelleen', () => {
  const {fires} = run([good, good, good, good, gap, good, good]);
  assert.deepEqual(fires.filter(f => f.startsWith('16:19')), [], 'ei hälytystä katkon jälkeen: ' + fires.join(', '));
  assert.ok(fires.some(f => f === '15:04 now/normaali'), 'ensimmäinen hälytys lähtee');
});

test('aito lasku rajan alle ja nousu hälyttää uudelleen', () => {
  const {fires} = run([good, good, low, good]);
  assert.ok(fires.includes('15:49 now/normaali'), fires.join(', '));
  assert.ok(fires.includes('15:49 coming/normaali'), 'Tulossa: oikea siirtymä');
});

test('toistoraja: nousu alle repeatMin edellisestä ei hälytä', () => {
  const {fires} = run([good, low, good]);   // uusi nousu 30 min kohdalla
  const repeat = A.ALERT_CFG.repeatMin;
  const again = fires.filter(f => f.startsWith('15:34 now/'));
  if(repeat > 30) assert.deepEqual(again, []); else assert.ok(again.length > 0);
});

test('tuntematon tila: Bz vanha, Bt puuttuu tai Kp puuttuu', () => {
  const c = (m) => A.condition('coming', m, A.ALERT_CFG.levels.normaali);
  assert.equal(c({...good, bz: {...good.bz, fresh: false}}).unknown, true);
  assert.equal(c({...good, bz: {...good.bz, bt: null}}).unknown, true);
  assert.equal(c({...good, bz: {...good.bz, btFresh: false}}).unknown, true);
  assert.equal(c({...good, kp: null}).unknown, true);
  assert.equal(c({...good, cloud: null}).unknown, true);
  assert.ok(!c({...good, isDark: false}).unknown, 'valoisa = aito "ei täyty"');
  assert.equal(A.condition('now', gap, A.ALERT_CFG.levels.normaali).unknown, true);
});

test('loppuraportti: mahdolliset tuplat vain vanhan logiikan ajoista', () => {
  const {recs} = run([good, good, good, good, gap, good, good]);
  assert.deepEqual(R.possibleDuplicates(recs), [], 'uusi logiikka: ei tuplia');
  // Vanhan logiikan loki: sama sarja, mutta katkon jälkeinen ajo hälytti.
  const old = recs.map(r => ({...r, logic: undefined}));
  const after = old[5].places[0].alerts;
  for(const a of after) if(a.t === 'now' && a.on) a.fire = true;
  const dups = R.possibleDuplicates(old);
  assert.ok(dups.length > 0 && dups.every(x => x.run === old[5].run), JSON.stringify(dups));
});
