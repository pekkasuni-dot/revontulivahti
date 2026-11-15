// Hälytysten sijaintiruudut (2026-11-02, päätökset 29 ja 30): aihe, ruutu, yhdistäminen ja tilausten muutos.
import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../aurora-core.js';

test('ruutu ja aihe: Rovaniemi ja Oulu eri ruuduissa, sama ruutu samalle alueelle', () => {
  const rov = C.alertCell(66.50, 25.73), rov2 = C.alertCell(66.70, 25.10), oulu = C.alertCell(65.01, 25.47);
  assert.equal(rov.key, rov2.key);
  assert.notEqual(rov.key, oulu.key);
  assert.equal(C.alertTopic(rov, 'fi', 'now', 'h'), 'al2_fi_313_205_now_h');
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
  assert.equal(C.alertTopic(null, 'fi', 'now', 'h'), null);
  assert.equal(C.alertTopic(C.alertCell(66.5, 25.7), 'fi', 'kp', 'h'), null);   // tuntematon laukaisin
});
test('kieli: tuettu sellaisenaan, muut englanniksi', () => {
  assert.equal(C.alertLang('fi-FI'), 'fi');
  assert.equal(C.alertLang('zh'), 'zh');
  assert.equal(C.alertLang('sv'), 'en');
  assert.equal(C.alertLang(''), 'en');
});
test('aiheen jäsennys on alertTopicin käänteinen', () => {
  const c = C.alertCell(69.06, 20.79), tp = C.alertTopic(c, 'en', 'bz', 'n'), p = C.parseAlertTopic(tp);
  assert.equal(p.key, c.key); assert.equal(p.lang, 'en'); assert.equal(p.trig, 'bz'); assert.equal(p.lv, 'n');
  assert.equal(C.parseAlertTopic('al2_en_' + c.key).trig, null);   // ruudun keskipiste ilman luokkaa (napautus)
  assert.equal(C.parseAlertTopic('al1_fi_313_205'), null);   // vanha versio assert.deepEqual(p.center, c.center);
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
  // Oletus Herkkä: kumpikin laukaisin h, n, v -> 6 aihetta ruutua kohti
  const keys = Object.keys(r);
  assert.equal(keys.length, 12);
  assert.deepEqual(r[keys[0]].ids, ['own', 'a']);
  assert.deepEqual(r[keys[0]].names, ['Oma sijainti', 'Rovaniemi']);
  assert.equal(new Set(keys.map(k => C.parseAlertTopic(k).key)).size, 2);
});
test('tilausten muutos', () => {
  assert.deepEqual(C.alertTopicDiff(['a', 'b'], ['b', 'c']), {subscribe: ['c'], unsubscribe: ['a']});
  assert.deepEqual(C.alertTopicDiff(null, ['a', 'a']), {subscribe: ['a'], unsubscribe: []});
  assert.deepEqual(C.alertTopicDiff(['a'], []), {subscribe: [], unsubscribe: ['a']});
});

// Päätös 56: herkkyysluokat. Puhelin tilaa oman luokkansa ja tiukemmat; raja täsmälleen kullakin tasolla.
test('herkkyys: tilattavat luokat (Herkkä h,n,v / Normaali n,v / Varma v), erikseen Nyt ja Bz', () => {
  const pt = [{id: 'own', lat: 66.5, lon: 25.7}];
  const lv = sens => Object.values(C.alertTopicsFor(pt, 'fi', sens)).map(e => e.trig + e.lv).sort();
  assert.deepEqual(lv({}), ['bzh', 'bzn', 'bzv', 'nowh', 'nown', 'nowv']);   // asetus puuttuu -> Herkkä
  assert.deepEqual(lv({now: 'n', bz: 'v'}), ['bzv', 'nown', 'nowv']);
  assert.deepEqual(lv({now: 'v', bz: 'h'}), ['bzh', 'bzn', 'bzv', 'nowv']);
  assert.deepEqual(lv({now: 'roskaa'}), lv({}));
  // Siirtymä: vanhat al1-aiheet puretaan, uudet tilataan
  const want = Object.keys(C.alertTopicsFor(pt, 'fi', {now: 'v', bz: 'v'}));
  const d = C.alertTopicDiff(['al1_fi_313_205'], want);
  assert.deepEqual(d.unsubscribe, ['al1_fi_313_205']); assert.deepEqual(d.subscribe.sort(), ['al2_fi_313_205_bz_v', 'al2_fi_313_205_now_v']);
  // Luokan vaihto Herkkä -> Normaali perii h-aiheet
  const h = Object.keys(C.alertTopicsFor(pt, 'fi', {})), n = Object.keys(C.alertTopicsFor(pt, 'fi', {now: 'n', bz: 'n'}));
  assert.deepEqual(C.alertTopicDiff(h, n), {subscribe: [], unsubscribe: ['al2_fi_313_205_now_h', 'al2_fi_313_205_bz_h']});
});
test('herkkyys: rajat täsmälleen kullakin tasolla', () => {
  const S = C.ALERT_SENS;
  assert.deepEqual([S.now.h, S.now.n, S.now.v, S.bz.h, S.bz.n, S.bz.v, S.southMin], [12, 25, 40, -1.0, -2.2, -3.5, 15]);
  assert.deepEqual([11.9, 12, 24.9, 25, 39.9, 40, 100].map(C.nowLevel), [null, 'h', 'h', 'n', 'n', 'v', 'v']);
  assert.deepEqual([-0.9, -1.0, -0.9999999999999998, -2.19, -2.2, -3.49, -3.5, -8].map(C.bzLevel), [null, 'h', 'h', 'h', 'n', 'n', 'v', 'v']);
  assert.equal(C.nowLevel(null), null); assert.equal(C.bzLevel(undefined), null);
});
