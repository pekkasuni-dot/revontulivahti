// Reitti lähimmälle tielle (aurora-core.js, 2026-11-14): MVT-viivojen purku ('transportation'-taso),
// lähin ajettava tiepiste ja hakutiilet. Karttasovellus ei löydä reittiä pisteeseen, joka on kaukana tiestä.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');

// --- MVT-kooderi viivoille ---
const vint = n => { const o = []; while(n >= 0x80){ o.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); } o.push(n); return o; };
const fld = (f, wt) => vint(f * 8 + wt);
const lenF = (f, bytes) => [...fld(f, 2), ...vint(bytes.length), ...bytes];
const strB = s => [...new TextEncoder().encode(s)];
const zig = n => (n << 1) ^ (n >> 31);
const toTile = (z, x, y, p) => {
  const n = 2 ** z;
  return [Math.round(((p.lon + 180) / 360 * n - x) * 4096),
    Math.round(((1 - Math.log(Math.tan(Math.PI / 4 + p.lat * Math.PI / 360)) / Math.PI) / 2 * n - y) * 4096)];
};
// lines: [{props, coords: [{lat, lon}, ...]}]
function lineTile(z, x, y, lines, layerName = 'transportation'){
  const keys = [], vals = [];
  const ki = k => { let i = keys.indexOf(k); if(i < 0){ keys.push(k); i = keys.length - 1; } return i; };
  const vi = v => { let i = vals.indexOf(v); if(i < 0){ vals.push(v); i = vals.length - 1; } return i; };
  const fb = lines.map(l => {
    const tagBytes = Object.entries(l.props).flatMap(([k, v]) => [ki(k), vi(v)]).flatMap(vint);
    const pts = l.coords.map(p => toTile(z, x, y, p));
    let cx = 0, cy = 0; const g = [];
    pts.forEach(([px, py], i) => {
      if(i === 0) g.push(...vint(1 | (1 << 3)));
      if(i === 1) g.push(...vint(2 | ((pts.length - 1) << 3)));
      g.push(...vint(zig(px - cx)), ...vint(zig(py - cy))); cx = px; cy = py;
    });
    return lenF(2, [...lenF(2, tagBytes), ...fld(3, 0), 2, ...lenF(4, g)]);
  });
  const layer = [...fld(15, 0), 2, ...lenF(1, strB(layerName)), ...fb.flat(),
    ...keys.flatMap(k => lenF(3, strB(k))), ...vals.flatMap(v => lenF(4, lenF(1, strB(String(v))))), ...fld(5, 0), ...vint(4096)];
  return new Uint8Array(lenF(3, layer)).buffer;
}

const LAT = 69.05, LON = 20.79, Z = 13;
const tileOf = (lat, lon, z) => C.tilesAround(lat, lon, z, 0)[0];

test('MVT-viivat puretaan oikeisiin koordinaatteihin', () => {
  const {x, y} = tileOf(LAT, LON, Z);
  const buf = lineTile(Z, x, y, [{props: {class: 'minor'}, coords: [{lat: 69.051, lon: 20.785}, {lat: 69.052, lon: 20.795}, {lat: 69.054, lon: 20.80}]}]);
  const f = C.mvtLayerFeatures(buf, 'transportation', Z, x, y, [2]);
  assert.equal(f.length, 1);
  assert.equal(f[0].type, 2);
  assert.equal(f[0].parts[0].length, 3);
  assert.ok(Math.abs(f[0].parts[0][1].lat - 69.052) < 1e-4 && Math.abs(f[0].parts[0][1].lon - 20.795) < 1e-4, JSON.stringify(f[0].parts[0][1]));
  assert.deepEqual(C.mvtLayerFeatures(buf, 'transportation', Z, x, y, [1]), []);   // vain pisteet -> ei viivoja
  assert.deepEqual(C.mvtLayerPoints(buf, 'transportation', Z, x, y), []);
});

test('lähin tiepiste janan sisältä, ei vain kärkipisteistä', () => {
  const {x, y} = tileOf(LAT, LON, Z);
  // Itä-länsi-suuntainen tie 1 km pohjoiseen pisteestä, kärkipisteet kaukana sivuilla.
  const roadLat = LAT + 1 / 110.57;
  const buf = lineTile(Z, x, y, [{props: {class: 'tertiary'}, coords: [{lat: roadLat, lon: LON - 0.05}, {lat: roadLat, lon: LON + 0.05}]}]);
  const r = C.nearestRoadPoint(C.mvtLayerFeatures(buf, 'transportation', Z, x, y, [2]), LAT, LON, 5);
  assert.ok(r);
  assert.ok(Math.abs(r.km - 1) < 0.02, String(r.km));
  assert.ok(Math.abs(r.lon - LON) < 1e-3 && Math.abs(r.lat - roadLat) < 1e-4, JSON.stringify(r));
  assert.equal(r.cls, 'tertiary');
});

test('metsäautotie, polku, lautta ja rakenteilla oleva tie eivät kelpaa', () => {
  const {x, y} = tileOf(LAT, LON, Z);
  const near = [{lat: LAT + 0.001, lon: LON - 0.01}, {lat: LAT + 0.001, lon: LON + 0.01}];
  const far = [{lat: LAT + 0.012, lon: LON - 0.01}, {lat: LAT + 0.012, lon: LON + 0.01}];
  const buf = lineTile(Z, x, y, [
    {props: {class: 'track'}, coords: near},
    {props: {class: 'path'}, coords: near},
    {props: {class: 'ferry'}, coords: near},
    {props: {class: 'minor_construction'}, coords: near},
    {props: {class: 'minor', brunnel: 'ferry'}, coords: near},
    {props: {class: 'service'}, coords: far},
  ]);
  const r = C.nearestRoadPoint(C.mvtLayerFeatures(buf, 'transportation', Z, x, y, [2]), LAT, LON, 5);
  assert.equal(r.cls, 'service');
  assert.ok(Math.abs(r.lat - (LAT + 0.012)) < 1e-4);
});

test('ei tietä säteen sisällä -> null', () => {
  const {x, y} = tileOf(LAT, LON, Z);
  const buf = lineTile(Z, x, y, [{props: {class: 'primary'}, coords: [{lat: LAT + 0.03, lon: LON - 0.01}, {lat: LAT + 0.03, lon: LON + 0.01}]}]);
  assert.equal(C.nearestRoadPoint(C.mvtLayerFeatures(buf, 'transportation', Z, x, y, [2]), LAT, LON, 2), null);
  assert.equal(C.nearestRoadPoint([], LAT, LON), null);
});

test('tilesInRadius kattaa koko säteen ja sisältää pisteen tiilen', () => {
  for(const [z, km] of C.ROAD_SNAP.steps){
    const tiles = C.tilesInRadius(LAT, LON, z, km);
    const own = tileOf(LAT, LON, z);
    assert.ok(tiles.some(t => t.x === own.x && t.y === own.y), 'oma tiili z' + z);
    for(const [dLat, dLon] of [[km / 111.32, 0], [-km / 111.32, 0], [0, km / (111.32 * Math.cos(LAT * Math.PI / 180))]]){
      const t2 = tileOf(LAT + dLat * 0.99, LON + dLon * 0.99, z);
      assert.ok(tiles.some(t => t.x === t2.x && t.y === t2.y), 'reuna z' + z);
    }
    assert.ok(tiles.length <= 16, 'z' + z + ': ' + tiles.length + ' tiiltä');
  }
});
