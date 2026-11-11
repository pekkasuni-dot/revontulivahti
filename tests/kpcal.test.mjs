// Näkyvyys-%:n kalibrointiloki ja -taulukko (päätös 47).
import test from 'node:test';
import assert from 'node:assert/strict';
import {pairsFrom, aheadPairs, calTable, logRow, kpClass, zoneOf, MIN_PAIRS, CAL_PLACES} from '../scripts/vertailu/kpcal.mjs';

test('luokat ja vyöhykkeet', () => {
  assert.deepEqual([0, 1.9, 2, 3.3, 4.9, 7].map(kpClass), [0, 0, 1, 2, 3, 4]);
  assert.deepEqual([57.7, 62, 64.9, 65, 67.3].map(zoneOf), [0, 1, 1, 2, 2]);
});

test('parit kenttätestin lokista ja kalibrointilokista, vain pimeältä', () => {
  const rows = [
    {run: '2026-10-30T00:00:00Z', places: [{id: 'oulu', isDark: true, aurora: 7, kp: 1.3, mlat: 62.2}, {id: 'x', isDark: false, aurora: 9, kp: 1, mlat: 63}]},
    {t: '2026-11-12T20:30:00Z', kpNow: {kp: 2.3}, places: {oulu: {ov: 12, mlat: 62.2, dark: 1}, helsinki: {ov: 1, mlat: 57.7, dark: 0.4}}},
  ];
  assert.deepEqual(pairsFrom(rows).map(p => [p.id, p.kp, p.ov]), [['oulu', 1.3, 7], ['oulu', 2.3, 12]]);
});

test('taulukko: pieni ryhmä saa lähimmän ryhmän arvon ja merkitään epävarmaksi', () => {
  const pairs = [];
  for(let i = 0; i < MIN_PAIRS; i++) pairs.push({kp: 3.2, mlat: 63.5, ov: 20}, {kp: 1, mlat: 63.5, ov: 8});
  pairs.push({kp: 3.4, mlat: 58, ov: 3});
  const {table} = calTable(pairs);
  assert.equal(table[1][2].val, 20); assert.equal(table[1][2].unsure, false); assert.equal(table[1][2].n, MIN_PAIRS);
  assert.equal(table[0][2].val, 20); assert.equal(table[0][2].unsure, true); assert.equal(table[0][2].n, 1);
});

test('etukäteen tehdyt parit: ennuste ajolta H-L, OVATION tunnilla H', () => {
  const H = 3600e3, h = Date.parse('2026-11-12T21:00:00Z');
  const run = (t, ov, kpFc) => ({t: new Date(t).toISOString(), kpNow: {kp: 2}, kpFc, places: {oulu: {ov, mlat: 62.2, dark: 1}}});
  const rows = [run(h - 6 * H + 1800e3, 5, [['2026-11-12T21:00:00.000Z', 3.67]]), run(h + 1800e3, 18, [])];
  const a = aheadPairs(rows, [6]);
  assert.equal(a.length, 1); assert.equal(a[0].kpFc, 3.67); assert.equal(a[0].ov, 18); assert.equal(a[0].lead, 6);
});

test('lokirivi: kaikki paikat, tulevat ennustejaksot', () => {
  const grid = new Float32Array(181 * 360).fill(10), now = Date.parse('2026-11-12T21:30:00Z');
  const row = logRow(now, {ovation: {grid, time: new Date(now - 6e5), forecast: new Date(now + 36e5)},
    kp: {rt: [], obs: {kp: 2, t: new Date(now - 4 * 36e5)}, forecast: [{t: new Date(now - 6 * 36e5), kp: 1}, {t: new Date(Date.parse('2026-11-13T00:00:00Z')), kp: 3}]}});
  assert.equal(Object.keys(row.places).length, CAL_PLACES.length);
  assert.equal(row.places.oulu.ov, 10);
  assert.deepEqual(row.kpFc, [['2026-11-13T00:00:00.000Z', 3]]);
  assert.equal(row.kpNow.kp, 2);
});
