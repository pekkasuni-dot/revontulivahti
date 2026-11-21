// Päätös 67: lähdekohtainen raja "ei yhteyttä" -ilmoitukselle (AuroraCore.netNoticeStale).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../aurora-core.js');

const MIN = 60e3, NOW = Date.UTC(2026, 10, 21, 8, 57);
const KP_RT = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const KP_OBS = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const KP_FC = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

test('21.11. tapaus: Kp 20 min vanha -> ei ilmoitusta, seuraava tarkistus rajan kohdalla', () => {
  const r = C.netNoticeStale([{id: 'kp', key: KP_RT, at: NOW - 20*MIN}], NOW);
  assert.deepEqual(r.ids, []);
  assert.equal(r.oldest, 0);
  assert.equal(r.next, NOW + 40*MIN);
});

test('yli rajan -> ilmoitus', () => {
  const r = C.netNoticeStale([{id: 'kp', key: KP_RT, at: NOW - 61*MIN}], NOW);
  assert.deepEqual(r.ids, ['kp']);
  assert.equal(r.oldest, NOW - 61*MIN);
  assert.equal(r.next, 0);
});

test('raja ylittyy kesken katkon ilman uutta hakua', () => {
  const e = [{id: 'ovation', key: 'ov', at: NOW}];
  const a = C.netNoticeStale(e, NOW + 29*MIN);
  assert.deepEqual(a.ids, []);
  const b = C.netNoticeStale(e, a.next);   // ajastin herää tasan rajalla
  assert.deepEqual(b.ids, ['ovation']);
});

test('onnistunut haku poistaa ilmoituksen (avain pois fails-listasta)', () => {
  const e = [{id: 'kp', key: KP_RT, at: NOW - 90*MIN}];
  assert.deepEqual(C.netNoticeStale(e, NOW).ids, ['kp']);
  assert.deepEqual(C.netNoticeStale([], NOW), {ids: [], oldest: 0, next: 0});
});

test('useampi lähde: vain rajan ylittäneet, vanhin aika niistä', () => {
  const r = C.netNoticeStale([
    {id: 'spacewx', key: 'mag', at: NOW - 40*MIN},
    {id: 'ovation', key: 'ov', at: NOW - 35*MIN},
    {id: 'clouds', key: 'meta', at: NOW - 100*MIN},   // alle 3 h -> ei
    {id: 'kp', key: KP_RT, at: NOW - 10*MIN},          // alle 60 min -> ei
  ], NOW);
  assert.deepEqual(r.ids, ['spacewx', 'ovation']);
  assert.equal(r.oldest, NOW - 40*MIN);
  assert.equal(r.next, NOW + 50*MIN);   // Kp ylittää seuraavana
});

test('Kp:n 3 h tiedostot ja ennuste: raja 3 h, minuuttiarvio 60 min', () => {
  assert.equal(C.netNoticeLimitMin('kp', KP_RT), 60);
  assert.equal(C.netNoticeLimitMin('kp', KP_OBS), 180);
  assert.equal(C.netNoticeLimitMin('kp', KP_FC), 180);
  assert.deepEqual(C.netNoticeStale([{id: 'kp', key: KP_FC, at: NOW - 120*MIN}], NOW).ids, []);
  assert.deepEqual(C.netNoticeStale([{id: 'kp', key: KP_FC, at: NOW - 181*MIN}], NOW).ids, ['kp']);
});

test('ei näkyvää dataa (at null) ei kuulu ilmoitukseen; null-raja = ei koskaan; tuntematon lähde = def', () => {
  assert.deepEqual(C.netNoticeStale([{id: 'kp', key: KP_RT, at: null}], NOW).ids, []);
  const L = {src: {x: null}, key: [], def: 5};
  assert.deepEqual(C.netNoticeStale([{id: 'x', key: 'k', at: NOW - 999*MIN}], NOW, L).ids, []);
  assert.deepEqual(C.netNoticeStale([{id: 'y', key: 'k', at: NOW - 6*MIN}], NOW, L).ids, ['y']);
});

test('saman lähteen kaksi avainta -> lähde kerran', () => {
  const r = C.netNoticeStale([{id: 'kp', key: KP_RT, at: NOW - 70*MIN}, {id: 'kp', key: KP_OBS, at: NOW - 200*MIN}], NOW);
  assert.deepEqual(r.ids, ['kp']);
  assert.equal(r.oldest, NOW - 200*MIN);
});
