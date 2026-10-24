// Pilvidatan PNG-pakkaus kaikille malleille (2026-10-24): PNG-kenttä antaa
// täsmälleen samat arvot kuin vanha plain JSON -lukutaulukko, myös pisteessä
// näytteistettynä (sama polku kuin lippu, Nyt ja Tänä yönä). Data = ote oikeasta
// gh-pages-datasta (tests/fixtures/cloud-png-sample.json, ks. test_cloud_png.py).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../aurora-core.js');
const CM = require('../alerts/cloud-models.js');

const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/cloud-png-sample.json', import.meta.url)));
const inflate = b => new Uint8Array(zlib.inflateSync(b));

for(const c of FX.cases){
  test(`${c.model}: PNG-kenttä = plain JSON (${c.nlat} x ${c.nlon})`, () => {
    const g = {nlat: c.nlat, nlon: c.nlon};
    const fromJson = CM.decodeField(c.vals, g, inflate);
    const fromPng = CM.decodeField(c.png, g, inflate);
    assert.equal(fromPng.length, c.nlat * c.nlon);
    assert.deepEqual([...fromPng], [...fromJson]);
  });

  test(`${c.model}: pisteiden pilvisyys sama kummastakin muodosta`, () => {
    const meta = {lat0: c.lat0, lat1: c.lat0 + (c.nlat - 1) * c.dlat, lon0: c.lon0, lon1: c.lon0 + (c.nlon - 1) * c.dlon,
      nlat: c.nlat, nlon: c.nlon, dlat: c.dlat, dlon: c.dlon};
    const T = Date.parse('2026-10-24T12:00:00Z');
    const g = {times: [new Date(T), new Date(T + 3600e3)], ...C.gridGeom(meta)};
    const mk = v => { const d = {vals: CM.decodeField(v, g, inflate)}; return () => ({data: d}); };
    const json = mk(c.vals), png = mk(c.png);
    // Hilapisteet (myös kulmat) ja hilapisteiden välit.
    const pts = [[0, 0], [c.nlat - 1, c.nlon - 1], [Math.floor(c.nlat / 2), Math.floor(c.nlon / 3)],
                 [3.5, 7.25], [c.nlat - 2.3, 1.6], [10.1, c.nlon - 1.5]];
    for(const [r, k] of pts){
      const lat = meta.lat0 + r * g.dlat, lon = meta.lon0 + k * g.dlon;
      const a = C.sampleGridField(g, json, 'vals', lat, lon, new Date(T + 1800e3));
      const b = C.sampleGridField(g, png, 'vals', lat, lon, new Date(T + 1800e3));
      assert.ok(a != null);
      assert.equal(b, a);
      if(Number.isInteger(r) && Number.isInteger(k)) assert.equal(Math.round(a * 100), c.vals[r * c.nlon + k]);
    }
  });
}

// HARMONIEn kerrokset (2026-10-24): laiska hila lukee valsLow/Mid/High PNG:nä,
// kun meta.hasLayers = true; hälytysajo voi jättää ne käyttämättä (layers:false).
test('loadLazyGrid: kerrokset käyttöön ja pois (opts.layers)', async () => {
  const c = FX.cases[0];
  const t0 = Date.parse('2026-10-24T12:00:00Z');
  const meta = {lat0: c.lat0, lat1: c.lat0 + (c.nlat - 1) * c.dlat, lon0: c.lon0, lon1: c.lon0 + (c.nlon - 1) * c.dlon,
    nlat: c.nlat, nlon: c.nlon, dlat: c.dlat, dlon: c.dlon, hasLayers: true, times: [t0, t0 + 3600e3], run: t0};
  // Matala = koko kenttä, keski ja ylä = 0 -> peittokerroin 0,95 * matala.
  const zero = c.vals.map(() => 0);
  const step = {t0, vals: c.png, valsLow: c.png, valsMid: zero, valsHigh: zero};
  const getJSON = async u => u.endsWith('meta.json') ? meta : step;
  const date = new Date(t0 + 1800e3);
  const g = await CM.loadLazyGrid(C, 'harmonie', [date], getJSON, inflate, 'x/');
  assert.equal(g.hasLayers, true);
  const get = i => ({data: g.steps.get(i)});
  const lat = c.lat0 + 3 * g.dlat, lon = c.lon0 + 5 * g.dlon, v = c.vals[3 * c.nlon + 5] / 100;
  assert.ok(Math.abs(C.cloudVisibilityFactor(g, get, lat, lon, date) - (1 - 0.95 * v)) < 1e-6);
  const g2 = await CM.loadLazyGrid(C, 'harmonie', [date], getJSON, inflate, 'x/', {layers: false});
  assert.equal(g2.hasLayers, false);
  const get2 = i => ({data: g2.steps.get(i)});
  assert.ok(Math.abs(C.cloudVisibilityFactor(g2, get2, lat, lon, date) - (1 - v)) < 1e-6);
});
