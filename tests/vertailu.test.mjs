// Ennustevertailuloki (scripts/vertailu/core.mjs, scripts/forecast-report.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {octasToPct, metarToPct, leadTargets, isNightHour, nightId, seriesAt, e7dTileKey, e7dAt, cloudClass, pairs, stats} from '../scripts/vertailu/core.mjs';
import {reportMarkdown} from '../scripts/forecast-report.mjs';

const H = 3600e3, T = s => Date.parse(s);

test('oktat ja METAR prosenteiksi', () => {
  assert.equal(octasToPct(0), 0); assert.equal(octasToPct(4), 50); assert.equal(octasToPct(8), 100);
  assert.equal(octasToPct(9), 100); assert.equal(octasToPct(null), null); assert.equal(octasToPct(NaN), null);
  assert.equal(metarToPct('ENSR 262150Z AUTO 15019KT 9999 NCD 11/05 Q0994 RMK WIND RWY 32'), 0);
  assert.equal(metarToPct('EFOU 262020Z AUTO 16009KT CAVOK 09/07 Q1003'), 0);
  assert.equal(metarToPct('ENDU 262150Z VRB02KT 9999 FEW040 SCT060 05/02 Q0993'), 44);
  assert.equal(metarToPct('EFRO 262120Z AUTO 17011KT 9999 -SHRA BKN007 OVC037 08/07'), 100);
  assert.equal(metarToPct('ENSR 262050Z AUTO 13019KT 9999 FEW062/// 11/04'), 19);
  assert.equal(metarToPct('XXXX 262050Z AUTO 13019KT 9999 11/04 Q0994'), null);   // ei pilvitietoa
});

test('yön tunnit Suomen ajassa ja yön tunniste', () => {
  // 27.10. (talviaika, UTC+2): klo 18 = 16Z, klo 06 = 04Z, klo 07 = 05Z.
  assert.equal(isNightHour(T('2026-10-27T16:00:00Z')), true);
  assert.equal(isNightHour(T('2026-10-27T15:00:00Z')), false);
  assert.equal(isNightHour(T('2026-10-28T04:00:00Z')), true);
  assert.equal(isNightHour(T('2026-10-28T05:00:00Z')), false);
  assert.equal(nightId(T('2026-10-27T20:00:00Z')), '2026-10-27');
  assert.equal(nightId(T('2026-10-28T03:00:00Z')), '2026-10-27');
});

test('kohdetunnit: vain yötunnit, pituus tasatunnista', () => {
  // Ajo klo 13.25 Suomen aikaa (11.25Z): 1 h -> klo 14 (ei), 6 h -> klo 19, 24/48/72 h -> klo 13 (ei).
  assert.deepEqual(leadTargets(T('2026-10-27T11:25:00Z')).map(x => x.lead), [6]);
  // Ajo klo 21.25: kaikki pituudet osuvat yöhön (1 h -> 22, 6 h -> 03, 24-72 h -> 21).
  assert.deepEqual(leadTargets(T('2026-10-27T19:25:00Z')).map(x => x.lead), [1, 6, 24, 48, 72]);
  assert.equal(leadTargets(T('2026-10-27T19:25:00Z'))[2].target, T('2026-10-28T19:00:00Z'));
});

test('aikasarja ja ECMWF-ruutu', () => {
  const s = [{t: 0, v: 10}, {t: H, v: 30}, {t: 2 * H, v: null}];
  assert.equal(seriesAt(s, 0), 10); assert.equal(seriesAt(s, H / 2), 20);
  assert.equal(seriesAt(s, 1.5 * H), null); assert.equal(seriesAt(s, 3 * H), null);
  assert.equal(e7dTileKey(67.42, 26.6), '4-22');
  assert.equal(e7dTileKey(50, 26), null);
  // 2 x 2 -ruutu, kaksi askelta: arvo keskellä = keskiarvo, ajassa lineaarinen.
  const tile = {lat0: 67.5, lon0: 25, d: 2.5, n: 2, times: [0, 6 * H], tcc: Uint8Array.from([0, 100, 0, 100, 100, 100, 100, 100])};
  assert.equal(e7dAt(tile, 68.75, 26.25, 0), 50);
  assert.equal(e7dAt(tile, 68.75, 26.25, 3 * H), 75);
  assert.equal(e7dAt(tile, 68.75, 26.25, 7 * H), null);
});

test('luokat ja tilastot', () => {
  assert.equal(cloudClass(25), 'selkea'); assert.equal(cloudClass(50), 'puoli'); assert.equal(cloudClass(75), 'pilvi');
  const s = stats([{f: 10, o: 0}, {f: 90, o: 100}, {f: 60, o: 100}]);
  assert.equal(s.n, 3); assert.equal(Math.round(s.mae), 20); assert.equal(Math.round(s.bias), -13); assert.equal(Math.round(s.hit), 67);
});

// Synteettinen loki: Sodankylä selkeä yö 27.10. (havainto 0 %), editoitu osuu, HARMONIE ei.
function fakeRows(){
  const rows = [];
  for(let h = T('2026-10-27T16:00:00Z'); h <= T('2026-10-28T04:00:00Z'); h += H){
    // Ajo, joka ennusti tämän tunnin 6 h etukäteen ja 48 h etukäteen.
    rows.push({t: new Date(h - 6 * H + 25 * 60e3).toISOString(), places: {sodankyla: {fc: {edited: {6: 10}, harmonie: {6: 80}, ecmwf: {6: 50}}}}});
    rows.push({t: new Date(h - 48 * H + 25 * 60e3).toISOString(), places: {sodankyla: {fc: {edited: {48: 20}, harmonie: {48: null}, ecmwf: {48: 90}}}}});
    rows.push({t: new Date(h + 25 * 60e3).toISOString(), places: {sodankyla: {fc: {}, obs: [{h, v: 0}]}}});
  }
  return rows;
}

test('parit, yön luokka ja 7 vrk:n nykyinen ketju', () => {
  const {pairs: P, nights: ns} = pairs(fakeRows());
  assert.equal(ns.get('sodankyla|2026-10-27').cls, 'selkea');
  const by = (src, lead) => P.filter(p => p.src === src && p.lead === lead);
  assert.equal(by('edited', 6).length, 13);
  assert.equal(by('harmonie', 48).length, 0);                          // ei arvoa -> ei paria
  assert.equal(by('app7d', 6).every(p => p.f === 80), true);           // alle 30 h -> HARMONIE
  assert.equal(by('app7d', 48).every(p => p.f === 90), true);          // muuten ECMWF
  assert.equal(by('edited', 6).every(p => p.cls === 'selkea'), true);
});

test('raportti ja keräyksen päättyminen', () => {
  const rows = fakeRows();
  const r1 = reportMarkdown(rows, {minEnd: '2026-11-17', maxEnd: '2026-12-15', now: T('2026-11-20T00:00:00Z')});
  assert.equal(r1.status.clearNights, 1);
  assert.equal(r1.status.done, false);                                 // 3 viikkoa täynnä, mutta vain 1 selkeä yö
  assert.match(r1.md, /Selkeät ja puolipilviset yöt/);
  assert.match(r1.md, /48 h: editoitu 20 vs\. nykyinen 90 \(editoitu parempi/);
  const r2 = reportMarkdown(rows, {minEnd: '2026-11-17', maxEnd: '2026-12-15', now: T('2026-12-16T00:00:00Z')});
  assert.equal(r2.status.done, true);
});
