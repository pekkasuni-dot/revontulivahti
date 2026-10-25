// Omat paikat (aurora-core.js, 2026-10-25): tallennusmuoto, versio, viallinen data,
// raja 50, sekä paikannimen haku vektoritiilestä (MVT 'place'-taso).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');
const T0 = Date.UTC(2026, 9, 25, 12, 0, 0);

test('tyhjä ja puuttuva tallennus -> tyhjä lista ilman virhettä', () => {
  for(const v of [null, undefined, '']){
    const r = C.placesParse(v);
    assert.deepEqual(r.places, []); assert.equal(r.error, null); assert.equal(r.readOnly, false);
  }
});

test('tallennus ja luku: sama sisältö, versio 1, kentät id/name/lat/lon/createdAt/updatedAt', () => {
  let {places, place, error} = C.placesAdd([], {name: '  Kilpisjärvi  ', lat: 69.0500001, lon: 20.79}, {now: T0, id: 'a1'});
  assert.equal(error, null);
  assert.deepEqual(place, {id: 'a1', name: 'Kilpisjärvi', lat: 69.05, lon: 20.79,
    createdAt: '2026-10-25T12:00:00.000Z', updatedAt: '2026-10-25T12:00:00.000Z'});
  const txt = C.placesSerialize(places);
  assert.equal(JSON.parse(txt).v, 1);
  const r = C.placesParse(txt);
  assert.equal(r.error, null); assert.equal(r.version, 1); assert.deepEqual(r.places, places);
});

test('uudelleennimeäminen päivittää nimen ja updatedAt:n, poisto poistaa', () => {
  let {places} = C.placesAdd([], {name: 'Levi', lat: 67.8, lon: 24.8}, {now: T0, id: 'x'});
  const ren = C.placesRename(places, 'x', 'Levin tunturi', {now: T0 + 60e3});
  assert.equal(ren.error, null);
  assert.equal(ren.places[0].name, 'Levin tunturi');
  assert.equal(ren.places[0].createdAt, '2026-10-25T12:00:00.000Z');
  assert.equal(ren.places[0].updatedAt, '2026-10-25T12:01:00.000Z');
  assert.equal(C.placesRename(places, 'x', '   ').error, 'invalid');
  assert.equal(C.placesRename(places, 'ei', 'Uusi').error, 'missing');
  assert.deepEqual(C.placesRemove(ren.places, 'x'), []);
});

test('raja 50: 51. paikka hylätään, olemassa olevia ei pudoteta', () => {
  let places = [];
  for(let i = 0; i < 50; i++) places = C.placesAdd(places, {name: 'P' + i, lat: 60 + i / 100, lon: 25}, {now: T0, id: 'id' + i}).places;
  const r = C.placesAdd(places, {name: 'Liikaa', lat: 61, lon: 25}, {now: T0});
  assert.equal(r.error, 'full'); assert.equal(r.places.length, 50);
  // Pidempi lista (esim. tuleva Pro) luetaan kokonaan.
  const big = Array.from({length: 60}, (_, i) => ({id: 'b' + i, name: 'B' + i, lat: 60, lon: 20}));
  assert.equal(C.placesParse(JSON.stringify({v: 1, places: big})).places.length, 60);
});

test('viallinen data: rikkinäinen JSON ja tuntematon rakenne -> readOnly, ei kaadu', () => {
  for(const [txt, err] of [['{rikki', 'json'], ['"teksti"', 'format'], ['{"v":1}', 'format'], ['42', 'format']]){
    const r = C.placesParse(txt);
    assert.equal(r.error, err, txt); assert.equal(r.readOnly, true); assert.deepEqual(r.places, []);
  }
});

test('viallinen data: vialliset paikat ja kaksoiskappaleet pudotetaan, muut säilyvät', () => {
  const txt = JSON.stringify({v: 1, places: [
    {id: 'ok', name: 'Oulu', lat: 65.01, lon: 25.47, createdAt: '2026-10-01T00:00:00Z'},
    {id: 'ok', name: 'Kaksoiskappale', lat: 65, lon: 25},
    {id: 'lat', name: 'Väärä lat', lat: 95, lon: 25},
    {id: 'lon', name: 'Väärä lon', lat: 60, lon: 'x'},
    {id: '', name: 'Ei id:tä', lat: 60, lon: 25},
    {id: 'nimi', name: '', lat: 60, lon: 25},
    null, 'teksti',
    {id: 'aika', name: 'Ilman aikaa', lat: 60, lon: 25, createdAt: 'ei aika'},
  ]});
  const r = C.placesParse(txt);
  assert.equal(r.error, null);
  assert.deepEqual(r.places.map(p => p.id), ['ok', 'aika']);
  assert.equal(r.dropped, 7);
  assert.equal(r.places[0].createdAt, '2026-10-01T00:00:00.000Z');
  assert.equal(r.places[1].createdAt, new Date(0).toISOString());   // puuttuva aika -> epoch, ei kaadu
});

test('versio: v0 (pelkkä taulukko) muunnetaan, uudempi versio luetaan mutta ei kirjoiteta (readOnly)', () => {
  const v0 = C.placesParse(JSON.stringify([{id: 'a', name: 'Inari', lat: 68.9, lon: 27}]));
  assert.equal(v0.version, 0); assert.equal(v0.error, null); assert.equal(v0.places.length, 1);
  assert.equal(JSON.parse(C.placesSerialize(v0.places)).v, 1);
  const fut = C.placesParse(JSON.stringify({v: 2, places: [{id: 'a', name: 'Inari', lat: 68.9, lon: 27, extra: 1}]}));
  assert.equal(fut.error, 'future'); assert.equal(fut.readOnly, true); assert.equal(fut.places.length, 1);
  assert.equal(fut.places[0].extra, undefined);
});

test('nimi rajataan 60 merkkiin, välilyönnit tiivistetään', () => {
  const {place} = C.placesAdd([], {name: 'a  b ' + 'x'.repeat(100), lat: 60, lon: 25}, {now: T0, id: 'n'});
  assert.equal(place.name.length, 60); assert.ok(place.name.startsWith('a b x'));
});

test('placeNear löytää tallennetun paikan 100 m säteeltä', () => {
  const {places} = C.placesAdd([], {name: 'Utsjoki', lat: 69.908, lon: 27.027}, {now: T0, id: 'u'});
  assert.equal(C.placeNear(places, 69.9085, 27.027).id, 'u');
  assert.equal(C.placeNear(places, 69.92, 27.027), null);
});

test('placeIdNew: uniikit tunnisteet UUID-muodossa', () => {
  const ids = new Set(Array.from({length: 200}, () => C.placeIdNew()));
  assert.equal(ids.size, 200);
  for(const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

// --- MVT: pieni kooderi testiä varten (protobuf) ---
const vint = n => { const o = []; while(n >= 0x80){ o.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); } o.push(n); return o; };
const fld = (f, wt) => vint(f * 8 + wt);
const lenF = (f, bytes) => [...fld(f, 2), ...vint(bytes.length), ...bytes];
const strB = s => [...new TextEncoder().encode(s)];
const zig = n => (n << 1) ^ (n >> 31);
function tileWith(z, x, y, places){
  // Paikat lon/lat -> tiilen sisäiset koordinaatit (extent 4096).
  const n = 2 ** z, feats = places.map(p => {
    const fx = ((p.lon + 180) / 360 * n - x) * 4096;
    const fy = ((1 - Math.log(Math.tan(Math.PI / 4 + p.lat * Math.PI / 360)) / Math.PI) / 2 * n - y) * 4096;
    return {x: Math.round(fx), y: Math.round(fy), props: p.props};
  });
  const other = [...fld(15, 0), 2, ...lenF(1, strB('water')), ...fld(5, 0), ...vint(4096)];
  const keys = [], vals = [];
  const ki = k => { let i = keys.indexOf(k); if(i < 0){ keys.push(k); i = keys.length - 1; } return i; };
  const vi = v => { let i = vals.indexOf(v); if(i < 0){ vals.push(v); i = vals.length - 1; } return i; };
  const fb = feats.map(f => {
    const tagBytes = Object.entries(f.props).flatMap(([k, v]) => [ki(k), vi(v)]).flatMap(vint);
    const geom = [...vint(1 | (1 << 3)), ...vint(zig(f.x)), ...vint(zig(f.y))];
    return lenF(2, [...lenF(2, tagBytes), ...fld(3, 0), 1, ...lenF(4, geom)]);
  });
  const layer = [...fld(15, 0), 2, ...lenF(1, strB('place')), ...fb.flat(),
    ...keys.flatMap(k => lenF(3, strB(k))), ...vals.flatMap(v => lenF(4, lenF(1, strB(String(v))))), ...fld(5, 0), ...vint(4096)];
  return new Uint8Array([...lenF(3, other), ...lenF(3, layer)]).buffer;
}

test('MVT: place-tason pisteet puretaan oikeisiin koordinaatteihin ja lähin nimi löytyy', () => {
  const lat = 69.05, lon = 20.79, z = 10;
  const [{x, y}] = C.tilesAround(lat, lon, z, 0);
  const buf = tileWith(z, x, y, [
    {lat: 69.045, lon: 20.80, props: {name: 'Kilpisjärvi', class: 'village', 'name:en': 'Kilpisjarvi'}},
    {lat: 69.10, lon: 20.95, props: {name: 'Kaukana', class: 'hamlet'}},
    {lat: 69.05, lon: 20.79, props: {name: 'Suomi', class: 'country'}},
  ]);
  const pts = C.mvtLayerPoints(buf, 'place', z, x, y);
  assert.equal(pts.length, 3);
  assert.ok(Math.abs(pts[0].lat - 69.045) < 0.01 && Math.abs(pts[0].lon - 20.80) < 0.01, JSON.stringify(pts[0]));
  const best = C.nearestPlaceName(pts, lat, lon);
  assert.equal(best.name, 'Kilpisjärvi');            // maa (country) ohitetaan
  assert.equal(C.nearestPlaceName(pts, lat, lon, 25, ['name:en', 'name']).name, 'Kilpisjarvi');
  assert.equal(C.nearestPlaceName(pts, 60, 25), null);   // liian kaukana -> null (sovellus käyttää koordinaatteja)
});

test('MVT: rikkinäinen tai tyhjä tiili ei kaada nimen hakua', () => {
  assert.deepEqual(C.mvtLayerPoints(new Uint8Array(0).buffer, 'place', 10, 0, 0), []);
  assert.throws(() => C.mvtLayerPoints(new Uint8Array([0x1f, 0xff]).buffer, 'place', 10, 0, 0));
});

test('tilesAround: reunan lähellä otetaan naapuritiili mukaan', () => {
  assert.equal(C.tilesAround(69.05, 20.79, 10, 0).length, 1);
  assert.ok(C.tilesAround(69.05, 20.79, 10, 0.5).length >= 2);
});
