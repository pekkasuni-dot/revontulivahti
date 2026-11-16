// Omien paikkojen nimiehdotus "Paikka, Kunta" (päätös 59, 2026-11-16): kuntaAt (piste monikulmiossa,
// rajauslaatikko ensin) ja placeNameWithKunta (nimen säännöt) sekä oikea aineisto data/kunnat.json
// (scripts/build-kunnat.py) ja sen rajapisteparit tests/fixtures/kunnat-rajapisteet.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');

// Synteettinen aineisto samassa muodossa kuin build-kunnat.py kirjoittaa.
const Q = 10000;
function ring(pts){ const r = [Math.round(pts[0][0] * Q), Math.round(pts[0][1] * Q)];
  for(let i = 1; i < pts.length; i++) r.push(Math.round(pts[i][0] * Q) - Math.round(pts[i - 1][0] * Q), Math.round(pts[i][1] * Q) - Math.round(pts[i - 1][1] * Q));
  return r; }
function ent(n, c, rings, a){ const all = rings.flat(); const xs = all.map(p => Math.round(p[0] * Q)), ys = all.map(p => Math.round(p[1] * Q));
  const e = {n, c, b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], r: rings.map(ring)}; if(a) e.a = a; return e; }
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const SYN = {v: 1, q: Q, m: [
  ent('Ala', 'FI', [box(25, 66, 26, 67), box(25.4, 66.4, 25.6, 66.6)]),        // reikä keskellä = Sisä
  ent('Sisä', 'FI', [box(25.4, 66.4, 25.6, 66.6)]),
  ent('Ylä', 'FI', [box(26, 66, 27, 67), box(26.2, 67.2, 26.4, 67.4)], ['Övre']),   // kaksi osaa (saari)
]};

test('kuntaAt: keskellä, reiässä, toisessa osassa ja ulkopuolella', () => {
  assert.equal(C.kuntaAt(SYN, 66.2, 25.2).name, 'Ala');
  assert.equal(C.kuntaAt(SYN, 66.5, 25.5).name, 'Sisä');
  assert.equal(C.kuntaAt(SYN, 67.3, 26.3).name, 'Ylä');
  assert.deepEqual(C.kuntaAt(SYN, 67.3, 26.3).alt, ['Övre']);
  assert.equal(C.kuntaAt(SYN, 67.1, 26.3), null);        // osien välissä (meri)
  assert.equal(C.kuntaAt(SYN, 60, 10), null);
});
test('kuntaAt: raja kahden kunnan välissä, 100 m kummallakin puolella', () => {
  const dLon = 0.1 / (111.32 * Math.cos(66.5 * Math.PI / 180));
  assert.equal(C.kuntaAt(SYN, 66.7, 26 - dLon).name, 'Ala');
  assert.equal(C.kuntaAt(SYN, 66.7, 26 + dLon).name, 'Ylä');
});
test('kuntaAt: aineisto puuttuu tai on viallinen (lataus epäonnistui) -> null', () => {
  for(const d of [null, undefined, {}, {m: []}, {q: Q}, {q: 0, m: SYN.m}, 'x']) assert.equal(C.kuntaAt(d, 66.2, 25.2), null);
  assert.equal(C.kuntaAt(SYN, NaN, 25), null);
});

test('placeNameWithKunta: "Paikka, Kunta"', () => {
  assert.equal(C.placeNameWithKunta('Apukka', {name: 'Rovaniemi', alt: []}), 'Apukka, Rovaniemi');
  assert.equal(C.placeNameWithKunta('  Apukka ', 'Rovaniemi'), 'Apukka, Rovaniemi');
});
test('placeNameWithKunta: paikannimi = kunta (kirjainkoosta riippumatta, myös muu virallinen nimi) -> kerran', () => {
  assert.equal(C.placeNameWithKunta('Rovaniemi', {name: 'Rovaniemi'}), 'Rovaniemi');
  assert.equal(C.placeNameWithKunta('ROVANIEMI', {name: 'Rovaniemi'}), 'ROVANIEMI');
  assert.equal(C.placeNameWithKunta('Mustasaari', {name: 'Korsholm', alt: ['Mustasaari']}), 'Mustasaari');
  assert.equal(C.placeNameWithKunta('Guovdageaidnu', {name: 'Kautokeino', alt: ['Guovdageaidnu']}), 'Guovdageaidnu');
});
test('placeNameWithKunta: kunta ei tiedossa -> paikannimi; ei paikannimeä -> null (koordinaatit)', () => {
  assert.equal(C.placeNameWithKunta('Apukka', null), 'Apukka');
  assert.equal(C.placeNameWithKunta('Apukka', {name: ''}), 'Apukka');
  assert.equal(C.placeNameWithKunta(null, {name: 'Rovaniemi'}), null);
  assert.equal(C.placeNameWithKunta('  ', {name: 'Rovaniemi'}), null);
});
test('placeNameWithKunta: yli 60 merkkiä -> kunta pois', () => {
  assert.equal(C.PLACES_CFG.nameMax, 60);
  const p = 'A'.repeat(48), k = 'Rovaniemi';                       // 48 + 2 + 9 = 59
  assert.equal(C.placeNameWithKunta(p, k), p + ', ' + k);
  assert.equal(C.placeNameWithKunta(p + 'BC', k), p + 'BC, ' + k); // 60 = raja, mahtuu
  assert.equal(C.placeNameWithKunta(p + 'BCD', k), p + 'BCD');     // 61 -> kunta pois
});

// ── Oikea aineisto ──
const DATA = JSON.parse(fs.readFileSync(new URL('../data/kunnat.json', import.meta.url), 'utf8'));
const FIX = JSON.parse(fs.readFileSync(new URL('./fixtures/kunnat-rajapisteet.json', import.meta.url), 'utf8'));

test('aineisto: kaikki kolme maata, kunnissa nimi ja rajauslaatikko', () => {
  const by = {};
  for(const e of DATA.m){ by[e.c] = (by[e.c] || 0) + 1; assert.ok(e.n && e.b.length === 4 && e.r.length > 0, e.n); }
  assert.ok(by.FI > 280 && by.FI < 330, 'FI ' + by.FI);
  assert.ok(by.SE > 280 && by.SE < 300, 'SE ' + by.SE);
  assert.ok(by.NO > 340 && by.NO < 370, 'NO ' + by.NO);
});
test('aineisto: piste keskellä kuntaa (FI, SE, NO)', () => {
  const cases = [[66.5039, 25.7294, 'Rovaniemi'], [60.1699, 24.9384, 'Helsinki'], [68.6587, 27.5389, 'Inari'],
    [67.8558, 20.2253, 'Kiruna'], [59.3293, 18.0686, 'Stockholm'], [69.6492, 18.9553, 'Tromsø'], [59.9139, 10.7522, 'Oslo']];
  for(const [lat, lon, want] of cases){
    const k = C.kuntaAt(DATA, lat, lon);
    assert.equal(k && k.name, want, `${lat},${lon}`);
  }
  assert.equal(C.kuntaAt(DATA, 63.0960, 21.6158).name, 'Vaasa');      // kaksikielinen, suomenkielinen enemmistö
  assert.equal(C.kuntaAt(DATA, 63.6747, 22.7036).name, 'Jakobstad');   // ruotsinkielinen enemmistö
  assert.equal(C.kuntaAt(DATA, 60.0973, 19.9348).name, 'Mariehamn');   // Ahvenanmaa
});
test('aineisto: Apukka (Rovaniemi) -> "Apukka, Rovaniemi"', () => {
  const k = C.kuntaAt(DATA, 66.5755, 26.0045);
  assert.equal(k && k.name, 'Rovaniemi');
  assert.equal(C.placeNameWithKunta('Apukka', k), 'Apukka, Rovaniemi');
  assert.equal(C.placeNameWithKunta('Rovaniemi', C.kuntaAt(DATA, 66.5039, 25.7294)), 'Rovaniemi');
});
test('aineisto: piste aineiston ulkopuolella (meri, Viro, Venäjä) -> null', () => {
  for(const [lat, lon] of [[61.5, 19.5] /* Selkämeri */, [59.437, 24.7536] /* Tallinna */, [68.97, 33.08] /* Murmansk */, [71.5, 25]])
    assert.equal(C.kuntaAt(DATA, lat, lon), null, `${lat},${lon}`);
});
test('aineisto: rajapisteet alle 1 km kuntarajasta kummallakin puolella (FI, SE, NO)', () => {
  const maat = new Set();
  for(const f of FIX.pisteet){
    assert.ok(f.rajasta_m < 1000, f.pari);
    const k = C.kuntaAt(DATA, f.lat, f.lon);
    assert.equal(k && k.name, f.kunta, `${f.pari} ${f.rajasta_m} m (${f.lat}, ${f.lon})`);
    maat.add(f.maa);
  }
  for(const c of ['FI', 'SE', 'NO']){
    const pts = FIX.pisteet.filter(f => f.maa === c);
    const pairs = new Set(pts.map(f => f.pari));
    for(const p of pairs){ const kunnat = new Set(pts.filter(f => f.pari === p).map(f => f.kunta)); assert.equal(kunnat.size, 2, p); }
    assert.ok(pairs.size >= 1, c);
  }
});
