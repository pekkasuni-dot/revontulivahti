// Puuttuva hilapiste (meteorologien ennuste, 2026-10-26/27): aurora-core.js editedHourCloud. Ajo: npm test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');

// 6 x 6 hila 65-70 N / 20-25 E, kaksi tuntia, 40 % kaikkialla; luoteiskulmassa NaN (vino malli-alue).
const T0 = Date.parse('2026-10-26T18:00:00Z');
function grid(){
  const n = 6, vals = new Float32Array(n * n).fill(0.4);
  vals[(n - 1) * n + 0] = NaN;   // rivi 5 (70 N), sarake 0 (20 E)
  const g = {...C.gridGeom({lat0: 65, lat1: 70, lon0: 20, lon1: 25, nlat: n, nlon: n, dlat: 1, dlon: 1}),
             times: [new Date(T0), new Date(T0 + 3600e3)], steps: new Map([[0, {vals}], [1, {vals}]])};
  return g;
}
const get = g => i => ({data: g.steps.get(i)});
const has = g => i => g.steps.has(i);
const at = new Date(T0 + 1800e3);

test('editedHourCloud: arvo alueen sisällä, NaN-naapurusto ja alueen ulkopuoli -> null', () => {
  const g = grid();
  const r = C.editedHourCloud(g, get(g), has(g), 67, 22, at);
  assert.equal(r.pct, 40);
  assert.ok(Math.abs(r.factor - 0.6) < 1e-6);
  assert.equal(C.editedHourCloud(g, get(g), has(g), 69.6, 20.3, at), null, 'puuttuva piste naapurustossa');
  assert.equal(C.editedHourCloud(g, get(g), has(g), 72, 22, at), null, 'alueen ulkopuolella');
  assert.equal(C.editedHourCloud(g, get(g), has(g), 67, 22, new Date(T0 + 3 * 3600e3)), null, 'ennusteen jälkeen');
});

test('editedHourCloud: askel latautuu -> undefined', () => {
  const g = grid(); g.steps.delete(1);
  assert.equal(C.editedHourCloud(g, get(g), has(g), 67, 22, at), undefined);
});
