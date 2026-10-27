// Yksikkötestit: aurora-core.js (2026-10-22, KATSELMOINTI osa 2).
// Ajo: npm test  (node --test tests/). Ei riippuvuuksia.
process.env.TZ = 'Europe/Helsinki';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');

const H = 3600e3, MIN = 60e3;
const d = s => new Date(s);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (sallittu ±${tol})`);

/* ── Näkyvyys ── */
test('visibilityIndex: tulo, pyöristys ja puuttuva tieto', () => {
  assert.equal(C.visibilityIndex(80, 0.5, 1), 40);
  assert.equal(C.visibilityIndex(100, 1, 1), 100);
  assert.equal(C.visibilityIndex(50, 1, 0), 0);
  assert.equal(C.visibilityIndex(33, 0.333, 1), 11);
  // Puuttuva pilvikerroin = "ei dataa", EI pilvetöntä (korjattu 2026-10-22).
  assert.equal(C.visibilityIndex(80, null, 1), null);
  assert.equal(C.visibilityIndex(null, 1, 1), null);
  assert.equal(C.visibilityIndex(80, 1, null), null);
});

test('darknessFactor: -6° ... -12° lineaarinen', () => {
  assert.equal(C.darknessFactor(0), 0);
  assert.equal(C.darknessFactor(-6), 0);
  assert.equal(C.darknessFactor(-9), 0.5);
  assert.equal(C.darknessFactor(-12), 1);
  assert.equal(C.darknessFactor(-30), 1);
});

/* ── Pimeys ── */
test('sunAltitude: Helsinki keskipäivällä kesä- ja joulukuussa', () => {
  near(C.sunAltitude(d('2026-06-21T10:20:00Z'), 60.17, 24.94), 53.3, 0.5, 'kesäkuu');
  near(C.sunAltitude(d('2026-12-21T10:20:00Z'), 60.17, 24.94), 6.4, 0.5, 'joulukuu');
});

test('darkPeriod: tavallinen yö, ei pimeää, kaamos', () => {
  // Oulu 22.10. klo 12 Suomen aikaa: pimeä alkaa illalla ja loppuu aamulla.
  const p = C.darkPeriod(65.01, 25.47, d('2026-10-22T09:00:00Z'));
  assert.equal(p.now, false);
  assert.ok(p.from > d('2026-10-22T14:00:00Z') && p.from < d('2026-10-22T17:00:00Z'), 'alku illalla ' + p.from.toISOString());
  assert.ok(p.to > d('2026-10-23T02:00:00Z') && p.to < d('2026-10-23T06:00:00Z'), 'loppu aamulla ' + p.to.toISOString());
  // Rajat minuutin tarkkuudella (sama arvo kaikkialla).
  assert.equal(p.from.getTime() % MIN, 0);
  // Kesäkuu 69 °N: ei pimeää.
  assert.equal(C.darkPeriod(69.05, 20.8, d('2026-06-21T12:00:00Z')).none, true);
  // Joulukuu 78 °N (Huippuvuoret): pimeää koko tarkastelujakson.
  assert.equal(C.darkPeriod(78.2, 15.6, d('2026-12-21T12:00:00Z')).all, true);
});

test('darkPeriod: pimeällä kysyttäessä now=true ja loppu tulevaisuudessa', () => {
  const now = d('2026-10-22T21:00:00Z');
  const p = C.darkPeriod(60.17, 24.94, now);
  assert.equal(p.now, true);
  assert.ok(p.from < now && p.to > now);
});

test('kesäaikasiirtymä 25.10.2026: pimeä jakso jatkuu yhtenäisenä', () => {
  // Helsinki, ilta 24.10.: yö kattaa siirtymän (klo 4 -> 3). Jakso on UTC-ajassa
  // yhtenäinen ja kesto järkevä (ei tunnin aukkoa tai päällekkäisyyttä).
  const p = C.darkPeriod(60.17, 24.94, d('2026-10-24T12:00:00Z'));
  const hours = (p.to - p.from) / H;
  assert.ok(hours > 11 && hours < 14, 'kesto ' + hours);
  // Seuraavan illan jakso alkaa ~23,9 h myöhemmin (aurinkoaika ei siirry).
  const q = C.darkPeriod(60.17, 24.94, d('2026-10-25T12:00:00Z'));
  near((q.from - p.from) / MIN, 24*60 - 4, 5, 'peräkkäisten iltojen ero (min)');
});

/* ── Kuu ── */
test('moonPos: täysikuu 26.10.2026 ja uusikuu 10.10.2026', () => {
  assert.ok(C.moonPos(d('2026-10-26T04:12:00Z'), 60, 25).illum > 0.98);
  assert.ok(C.moonPos(d('2026-10-10T15:50:00Z'), 60, 25).illum < 0.02);
  assert.equal(C.moonPos(d('2026-10-20T12:00:00Z'), 60, 25).waxing, true);
  assert.equal(C.moonPos(d('2026-10-30T12:00:00Z'), 60, 25).waxing, false);
});

test('moonEvents: nousu ja lasku löytyvät vuorokaudessa', () => {
  const ev = C.moonEvents(60.17, 24.94, d('2026-10-22T00:00:00Z'), d('2026-10-23T00:00:00Z'));
  assert.ok(ev.rise || ev.set, 'ainakin toinen tapahtuma');
  for(const t of [ev.rise, ev.set].filter(Boolean)) near(C.moonPos(t, 60.17, 24.94).alt, C.NIGHT_CFG.moonHorizon, 0.5, 'korkeus tapahtumassa');
});

// Vertailuarvot PyEphem 4.x:llä (yläreuna, refraktio -0:34, topo; 2026-10-27).
// Utsjoki 2.11.2026: laskee 14.23Z (16.23 Suomen aikaa), nousee 19.59Z (21.59).
test('moonEvents: Utsjoki 2.11.2026 laskee ja nousee aikajärjestyksessä', () => {
  const lat = 69.908, lon = 27.027, p = C.darkPeriod(lat, lon, d('2026-11-02T12:00:00Z'));
  const ev = C.moonEvents(lat, lon, p.from, p.to);
  assert.deepEqual(ev.events.map(e => e.type), ['set', 'rise']);
  near((ev.events[0].t - d('2026-11-02T14:23:23Z')) / MIN, 0, 5, 'lasku (min)');
  near((ev.events[1].t - d('2026-11-02T19:58:46Z')) / MIN, 0, 5, 'nousu (min)');
});
test('moonEvents: nousee ja laskee yön aikana (Helsinki 22.-23.10.2026)', () => {
  const ev = C.moonEvents(60.17, 24.94, d('2026-10-22T12:00:00Z'), d('2026-10-23T03:00:00Z'));
  assert.deepEqual(ev.events.map(e => e.type), ['rise', 'set']);
  near((ev.events[0].t - d('2026-10-22T13:44:28Z')) / MIN, 0, 5, 'nousu (min)');
  near((ev.events[1].t - d('2026-10-23T01:22:30Z')) / MIN, 0, 5, 'lasku (min)');
});
test('moonEvents: koko yön taivaalla / ei taivaalla (Utsjoki)', () => {
  const lat = 69.908, lon = 27.027;
  const night = day => { const p = C.darkPeriod(lat, lon, d(day + 'T12:00:00Z')); return C.moonEvents(lat, lon, p.from, p.to); };
  const a = night('2026-10-27');   // PyEphem: korkeus 10-45° koko yön
  assert.equal(a.events.length, 0); assert.equal(a.upAll, true);
  const b = night('2026-11-09');   // PyEphem: korkeus -44...-12° koko yön
  assert.equal(b.events.length, 0); assert.equal(b.upAll, false);
});

/* ── Kp-jaksot ── */
test('kpBlockStart: NOAA:n jaksot alkavat 00, 03, ... UTC', () => {
  assert.equal(C.kpBlockStart(Date.parse('2026-10-22T04:59:00Z')), Date.parse('2026-10-22T03:00:00Z'));
  assert.equal(C.kpBlockStart(Date.parse('2026-10-22T03:00:00Z')), Date.parse('2026-10-22T03:00:00Z'));
  // Kesäaikasiirtymä ei vaikuta (UTC).
  assert.equal(C.kpBlockStart(Date.parse('2026-10-25T01:30:00Z')), Date.parse('2026-10-25T00:00:00Z'));
});

test('kpRows: uusi olio- ja vanha taulukkomuoto, aikaleima ilman vyöhykettä = UTC', () => {
  const a = C.kpRows([{time_tag: '2026-10-22T03:00:00', Kp: 2.33}]);
  const b = C.kpRows([['time_tag', 'Kp'], ['2026-10-22 03:00:00.000', '2.33']]);
  assert.equal(a[0].t.toISOString(), '2026-10-22T03:00:00.000Z');
  assert.equal(b[0].t.toISOString(), '2026-10-22T03:00:00.000Z');
  assert.equal(a[0].kp, 2.33); assert.equal(b[0].kp, 2.33);
});

test('kpNowInfo: tuore minuuttiarvio, jakson vaihde ja vanhentunut arvio', () => {
  const t = s => d(s);
  const now = Date.parse('2026-10-22T10:30:00Z');   // jakso 09-12, 90 min alusta
  const kp = {rt: [{t: t('2026-10-22T10:29:00Z'), kp: 3.0}], obs: {t: t('2026-10-22T06:00:00Z'), kp: 2}, obsRows: []};
  assert.deepEqual([C.kpNowInfo(kp, now).kp, C.kpNowInfo(kp, now).kind], [3.0, 'estimated']);
  // Jakson alussa (alle 60 min): suurempi edellisen jakson arvo voittaa.
  const early = Date.parse('2026-10-22T09:20:00Z');
  const kp2 = {rt: [{t: t('2026-10-22T08:50:00Z'), kp: 4.0}, {t: t('2026-10-22T09:19:00Z'), kp: 1.0}], obsRows: [], obs: null};
  assert.equal(C.kpNowInfo(kp2, early).kp, 4.0);
  // Yli 20 min vanha minuuttiarvio -> mitattu jakso varalla.
  const late = Date.parse('2026-10-22T11:00:00Z');
  assert.equal(C.kpNowInfo(kp, late).kind, 'observed');
});

test('kpBlockAt: kuluva jakso = Kp nyt, tulevat ennusteesta', () => {
  const now = Date.parse('2026-10-22T10:30:00Z');
  const kp = {rt: [{t: d('2026-10-22T10:29:00Z'), kp: 3.3}], obsRows: [],
              forecast: [{t: d('2026-10-22T09:00:00Z'), kp: 1}, {t: d('2026-10-22T12:00:00Z'), kp: 5}]};
  assert.equal(C.kpBlockAt(kp, d('2026-10-22T11:00:00Z'), now).kp, 3.3);
  assert.equal(C.kpBlockAt(kp, d('2026-10-22T13:00:00Z'), now).kp, 5);
  assert.equal(C.kpBlockAt(kp, d('2026-10-23T13:00:00Z'), now), null);
});

/* ── Bz ── */
const bzRows = (vals, t0 = Date.parse('2026-10-22T20:00:00Z')) => vals.map((bz, i) => ({t: new Date(t0 + i*MIN), bz, bt: 10}));

test('bzTrend: etelään-jakson kesto ja liukuva keskiarvo', () => {
  const r = C.bzTrend(bzRows([...Array(10).fill(3), ...Array(30).fill(-8)]));
  assert.ok(r.southMin >= 24 && r.southMin <= 30, 'etelään ' + r.southMin);
  assert.equal(r.mean, -8);
  // Yksittäinen positiivinen piikki ei katkaise jaksoa.
  const s = C.bzTrend(bzRows([...Array(20).fill(-8), 5, ...Array(10).fill(-8)]));
  assert.ok(s.southMin >= 29, 'piikki ei katkaise: ' + s.southMin);
  // Yli 15 min katko katkaisee.
  const rows = bzRows(Array(20).fill(-8)).concat(bzRows(Array(5).fill(-8), Date.parse('2026-10-22T20:40:00Z')));
  assert.ok(C.bzTrend(rows).southMin <= 5, 'katko katkaisee');
  assert.equal(C.bzTrend([]), null);
});

test('bzHint: kynnykset ja tuoreus', () => {
  const rows = bzRows(Array(30).fill(-8));
  const last = rows[rows.length - 1].t.getTime();
  assert.equal(C.bzHint(rows, last + MIN).show, true);
  assert.equal(C.bzHint(rows, last + (C.BZ.staleMin + 1) * MIN).show, false, 'vanha data ei näytä vihjettä');
  assert.equal(C.bzHint(bzRows(Array(30).fill(-3)), last + MIN).show, false, 'Bz liian heikko');
  assert.equal(C.bzHint(rows.map(r => ({...r, bt: 4})), last + MIN).show, false, 'Bt liian pieni');
});

/* ── Hilan geometria (2026-10-23): arvo hilapisteessä, väli rajoista ── */
test('gridGeom: väli rajoista (ei metan pyöristetystä dlat-kentästä), viimeinen piste = lat1', () => {
  // HARMONIE-tuuli keskitetyn harvennuksen jälkeen: 207 pistettä 55-73,5 N; meta dlat pyöristettynä.
  const g = C.gridGeom({lat0: 55, lat1: 73.5, lon0: -1, lon1: 35, nlat: 207, nlon: 401, dlat: 0.09, dlon: 0.09});
  near(g.lat0 + (g.nlat - 1) * g.dlat, 73.5, 1e-9, 'viimeinen rivi');
  near(g.lon0 + (g.nlon - 1) * g.dlon, 35, 1e-9, 'viimeinen sarake');
});

test('sampleGridField: tunnettu arvo tunnetussa hilapisteessä, myös viimeisellä rivillä', () => {
  // 5 x 4 hila, arvo = rivi*10 + sarake (%), väli "pyöristetty" metassa.
  const nlat = 5, nlon = 4, vals = [];
  for(let i = 0; i < nlat; i++) for(let j = 0; j < nlon; j++) vals.push(i*10 + j);
  const g = C.buildCloudGridFull({lat0: 60, lat1: 61, lon0: 20, lon1: 21.5, nlat, nlon, dlat: 0.2501, dlon: 0.5001,
    times: [Date.parse('2026-10-23T00:00:00Z')], vals});
  const at = (lat, lon) => C.sampleGridField(g, i => ({data: g.steps.get(i)}), 'vals', lat, lon, new Date('2026-10-23T00:00:00Z')) * 100;
  near(at(60.5, 20.5), 21, 1e-6, 'piste (2,1)');
  near(at(61, 21.5), 43, 1e-6, 'viimeinen piste (4,3) = lat1/lon1');
  near(at(60, 20), 0, 1e-6, 'ensimmäinen piste');
  assert.equal(C.sampleGridField(g, i => ({data: g.steps.get(i)}), 'vals', 61.01, 21, new Date('2026-10-23T00:00:00Z')), null, 'rajan ulkopuolella ei dataa');
});
