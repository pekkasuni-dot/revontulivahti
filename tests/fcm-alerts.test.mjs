// Hälytykset ruututasolla (päätökset 34 ja 36, 7.11.2026): Nyt, Tulossa, Tänä yönä, yöraja, pimeys, mallienemmistö.
import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../aurora-core.js';
import T from '../alert-texts.js';
import F from '../alerts/fcm-alerts.js';

const ROV = C.alertCell(66.5, 25.7);
const cell = {...ROV, tz: C.cellTimeZone(ROV.center.lat, ROV.center.lon), mlat: C.magLat(ROV.center.lat, ROV.center.lon)};
// Hila ruudun ympärille: arvo f(stepIndex) kaikissa pisteissä, tunnin askeleet alkaen t0.
function grid(t0, n, f){
  const g = {lat0: 65, lat1: 68, lon0: 24, lon1: 28, nlat: 61, nlon: 81, dlat: 0.05, dlon: 0.05,
    times: Array.from({length: n}, (_, i) => new Date(t0 + i * 3600e3)), steps: new Map(), run: new Date(t0)};
  for(let i = 0; i < n; i++) g.steps.set(i, {vals: new Float32Array(g.nlat * g.nlon).fill(f(i) / 100)});
  return g;
}
function ovation(p){ const g = new Float32Array(181 * 360); for(let la = 60; la <= 75; la++) for(let lo = 0; lo < 360; lo++) g[(la + 90) * 360 + lo] = p; return {grid: g}; }
const mag = (now, bz, bt) => Array.from({length: 60}, (_, k) => ({t: new Date(now - (59 - k) * 60e3), bz, bt}));
const kp = (now, v) => ({rt: [{t: new Date(now - 60e3), kp: v}], obsRows: [], obs: null,
  forecast: Array.from({length: 12}, (_, k) => ({t: new Date(Math.floor(now / 10800e3) * 10800e3 + k * 10800e3), kp: v}))});
const NIGHT = Date.parse('2026-11-10T20:00:00Z');   // Rovaniemi klo 22, pimeää
const data = (now, opt = {}) => {
  const t0 = Math.floor(now / 3600e3) * 3600e3 - 3600e3;
  const clear = grid(t0, 24, () => 0), cloudy = grid(t0, 24, () => 100);
  return {ovation: ovation(opt.p ?? 60), mag: mag(now, opt.bz ?? 2, opt.bt ?? 4), kp: kp(now, opt.kp ?? 3),
    grids: opt.grids || {harmonie: clear, icon_eu: clear, ecmwf: clear, edited: null}, clear, cloudy};
};

test('mallienemmistö: puolet saatavilla olevista, pyöristys ylös; puuttuva ei ole nolla', () => {
  assert.deepEqual(F.majority({a: 50, b: 30, c: null}), {ok: true, avail: 2, need: 1, value: 50, count: 1});
  assert.equal(F.majority({a: 45, b: 41, c: 39, d: 10}).ok, true);
  assert.equal(F.majority({a: 45, b: 41, c: 39, d: 10}).value, 41);
  assert.equal(F.majority({a: 45, b: 30, c: 20}).ok, false);
  assert.equal(F.majority({a: null}).avail, 0);
});

test('Nyt: lähtee pimeällä, kerran yössä, uudelleen seuraavana yönä', () => {
  const d = data(NIGHT);
  const nowOf = r => r.alerts.filter(a => a.type === 'now');
  let r = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT));
  assert.equal(nowOf(r).length, 1); assert.equal(nowOf(r)[0].pct, 60);
  r = F.evaluateCells(C, data(NIGHT + 900e3), [cell], r.state, new Date(NIGHT + 900e3));
  assert.equal(r.alerts.filter(a => a.type === 'now').length, 0, 'sama yö');
  const next = NIGHT + 86400e3;
  r = F.evaluateCells(C, data(next), [cell], r.state, new Date(next));
  assert.equal(r.alerts.filter(a => a.type === 'now').length, 1, 'seuraava yö');
});

test('Nyt: ei päivällä eikä hämärässä (aurinko yli −6°), ei kun 2/3 mallia pilvessä', () => {
  const day = Date.parse('2026-11-10T10:00:00Z');
  assert.equal(F.evaluateCells(C, data(day), [cell], {}, new Date(day)).alerts.length, 0);
  const d = data(NIGHT); d.grids = {harmonie: d.clear, icon_eu: d.cloudy, ecmwf: d.cloudy, edited: null};
  const nowN = dd => F.evaluateCells(C, dd, [cell], {}, new Date(NIGHT)).alerts.filter(a => a.type === 'now').length;
  assert.equal(nowN(d), 0);
  d.grids.icon_eu = d.clear;   // 2/3 selkeää -> lähtee
  assert.equal(nowN(d), 1);
});

test('Tulossa: Bz-siirtymä laukaisee, lähtee kun näkyvyys 30–60 min päästä >= 40 %, ei jos Nyt lähti', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3;
  // Pilvet: nyt 100 %, tunnin päästä 0 % -> Nyt ei lähde, ennuste +60 min lähtee.
  const g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const nk = C.alertNightKey(new Date(now), cell.tz);
  const prev = {[cell.key]: {night: nk, sent: {}, coming: {on: false}, tonight: nk}};   // Tänä yönä jo tarkistettu
  const d = data(now, {bz: -8, bt: 10, kp: 3, grids: {harmonie: g, icon_eu: g, ecmwf: g, edited: null}});
  let r = F.evaluateCells(C, d, [cell], prev, new Date(now));
  assert.deepEqual(r.alerts.map(a => a.type), ['coming']);
  assert.ok(r.alerts[0].pct >= 40);
  r = F.evaluateCells(C, d, [cell], r.state, new Date(now + 900e3));
  assert.equal(r.alerts.length, 0, 'enintään yksi yössä');
  // Ilman siirtymää (edellinen tila tuntematon) ei lähde
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(now)).alerts.filter(a => a.type === 'coming').length, 0);
  // Nyt lähtenyt samana yönä -> Tulossa ei lähde
  const prev2 = {[cell.key]: {...prev[cell.key], sent: {now: new Date(now - 600e3).toISOString()}}};
  assert.equal(F.evaluateCells(C, d, [cell], prev2, new Date(now)).alerts.length, 0);
});

test('Tänä yönä: kerran klo 16 jälkeen ruudun aikavyöhykkeellä, 4 mallista puolet', () => {
  const at = Date.parse('2026-11-10T14:05:00Z');   // Helsinki klo 16.05
  const d = data(at, {kp: 4});
  d.grids.edited = d.clear;
  let r = F.evaluateCells(C, d, [cell], {}, new Date(at));
  const tn = r.alerts.filter(a => a.type === 'tonight');
  assert.equal(tn.length, 1); assert.equal(tn[0].avail, 4); assert.ok(tn[0].pct >= 40); assert.ok(tn[0].best);
  r = F.evaluateCells(C, d, [cell], r.state, new Date(at + 900e3));
  assert.equal(r.alerts.filter(a => a.type === 'tonight').length, 0, 'kerran yössä');
  // Ennen klo 16 ei tarkisteta
  const early = Date.parse('2026-11-10T13:30:00Z');
  assert.equal(F.evaluateCells(C, data(early, {kp: 4}), [cell], {}, new Date(early)).alerts.filter(a => a.type === 'tonight').length, 0);
});

test('alue: ruudut ja aikavyöhykkeet', () => {
  const cells = F.regionCells(C);
  assert.equal(cells.length, 28 * 36);
  assert.equal(cells.find(c => c.key === ROV.key).tz, 'Europe/Helsinki');
});

test('tekstit: fi/en/zh, prosentti, mallit sanallisena, Kp haarukkana, tunniste', () => {
  const a = {type: 'now', cell, night: '2026-11-10', pct: 62, ok: 2, avail: 3, kp: [2.7, 2.7], best: null};
  const fi = F.alertTexts(T, a, 'fi'), en = F.alertTexts(T, a, 'en'), zh = F.alertTexts(T, a, 'zh-Hans');
  assert.match(fi.title, /62 %$/); assert.match(en.title, /62%$/); assert.match(zh.title, /62%$/);
  assert.match(fi.body, /Useimmat säämallit/); assert.match(fi.body, /Kp 2–3\./);
  assert.doesNotMatch(fi.body + en.body, /2\/3|2\/4/);
  assert.equal(F.alertTexts(T, a, 'es').title, en.title, 'es -> en');
  const c = F.alertTexts(T, {...a, type: 'coming'}, 'fi');
  assert.match(c.body, /^Bz kääntyi etelään\. Revontulia todennäköisesti pian, näkyvyys 62 %\./);
  const tn = F.alertTexts(T, {...a, type: 'tonight', best: ['2026-11-10T19:00:00Z', '2026-11-10T21:00:00Z']}, 'fi');
  assert.match(tn.body, /klo 21\.00–23\.00/);
  assert.equal(F.alertId(a), 'now-' + cell.key + '-2026-11-10');
});
