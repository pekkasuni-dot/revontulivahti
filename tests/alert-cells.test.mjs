// Hälytysten sijaintiruudut (2026-11-02, päätökset 29 ja 30): aihe, ruutu, yhdistäminen ja tilausten muutos.
import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../aurora-core.js';

test('ruutu ja aihe: Rovaniemi ja Oulu eri ruuduissa, sama ruutu samalle alueelle', () => {
  const rov = C.alertCell(66.50, 25.73), rov2 = C.alertCell(66.70, 25.10), oulu = C.alertCell(65.01, 25.47);
  assert.equal(rov.key, rov2.key);
  assert.notEqual(rov.key, oulu.key);
  assert.equal(C.alertTopic(rov, 'fi'), 'al1_fi_313_205');
  assert.ok(rov.center.lat > 66.5 && rov.center.lat < 67 && rov.center.lon === 205 - 180 + 0.5);
});
test('reunat: navat, 180°, negatiiviset pituusasteet ja virheelliset arvot', () => {
  assert.equal(C.alertCell(90, 0).i, 359);
  assert.equal(C.alertCell(-90, 0).i, 0);
  assert.equal(C.alertCell(10, 180).j, C.alertCell(10, -180).j);
  assert.equal(C.alertCell(64.1, -21.9).j, 158);   // Reykjavík
  assert.equal(C.alertCell(64.1, -21.9 + 360).j, 158);
  assert.equal(C.alertCell(NaN, 1), null);
  assert.equal(C.alertCell(91, 1), null);
  assert.equal(C.alertTopic(null, 'fi'), null);
});
test('kieli: tuettu sellaisenaan, muut englanniksi', () => {
  assert.equal(C.alertLang('fi-FI'), 'fi');
  assert.equal(C.alertLang('zh'), 'zh');
  assert.equal(C.alertLang('sv'), 'en');
  assert.equal(C.alertLang(''), 'en');
});
test('aiheen jäsennys on alertTopicin käänteinen', () => {
  const c = C.alertCell(69.06, 20.79), tp = C.alertTopic(c, 'en'), p = C.parseAlertTopic(tp);
  assert.equal(p.key, c.key); assert.equal(p.lang, 'en'); assert.deepEqual(p.center, c.center);
  assert.match(tp, /^[a-zA-Z0-9-_.~%]+$/);
  assert.equal(C.parseAlertTopic('al9_fi_1_2'), null);   // eri versio
  assert.equal(C.parseAlertTopic('roskaa'), null);
});
test('samaan ruutuun osuvat paikat jakavat aiheen ja nimet', () => {
  const r = C.alertTopicsFor([
    {id: 'own', name: 'Oma sijainti', lat: 66.50, lon: 25.73},
    {id: 'a', name: 'Rovaniemi', lat: 66.52, lon: 25.80},
    {id: 'b', name: 'Kilpisjärvi', lat: 69.05, lon: 20.79},
    {id: 'c', name: 'Viallinen', lat: null, lon: 1},
  ], 'fi');
  const keys = Object.keys(r);
  assert.equal(keys.length, 2);
  assert.deepEqual(r[keys[0]].ids, ['own', 'a']);
  assert.deepEqual(r[keys[0]].names, ['Oma sijainti', 'Rovaniemi']);
});
test('tilausten muutos', () => {
  assert.deepEqual(C.alertTopicDiff(['a', 'b'], ['b', 'c']), {subscribe: ['c'], unsubscribe: ['a']});
  assert.deepEqual(C.alertTopicDiff(null, ['a', 'a']), {subscribe: ['a'], unsubscribe: []});
  assert.deepEqual(C.alertTopicDiff(['a'], []), {subscribe: [], unsubscribe: ['a']});
});
