// Hälytykset ruututasolla (päätökset 34, 36 ja 42): Nyt, Tulossa, tiheysraja 2 h, pimeys, mallienemmistö, sääraportti.
// Päätös 42 (11.11.2026): Tänä yönä -hälytys poistettu, sama ilmoitus Nyt ja Tulossa.
// Päätös 48 (12.11.2026): IL editoitu Nyt-hälytyksen 4. malliksi, 2/4 riittää; Tulossa 3 mallia.
import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../aurora-core.js';
import T from '../alert-texts.js';
import F from '../alerts/fcm-alerts.js';
import CM from '../alerts/cloud-models.js';

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

test('Nyt: lähtee pimeällä; tiheysraja 2 h ruutua kohti (ei alle 2 h, uudelleen 2 h jälkeen)', () => {
  const nowOf = r => r.alerts.filter(a => a.type === 'now');
  let r = F.evaluateCells(C, data(NIGHT), [cell], {}, new Date(NIGHT));
  assert.equal(nowOf(r).length, 1); assert.equal(nowOf(r)[0].pct, 60);
  const t1 = NIGHT + 115 * 60e3;   // 1 h 55 min
  r = F.evaluateCells(C, data(t1), [cell], r.state, new Date(t1));
  assert.equal(r.alerts.length, 0, 'alle 2 h: ei lähde');
  const t2 = NIGHT + 120 * 60e3;   // 2 h
  r = F.evaluateCells(C, data(t2), [cell], r.state, new Date(t2));
  assert.equal(nowOf(r).length, 1, '2 h jälkeen lähtee');
});

test('sääraportti: näkyvyys, arvioitu aika, pilvisyys, mallit ok/avail, Bz, Bt, Kp', () => {
  const d = data(NIGHT, {bz: -3, bt: 7, kp: 4});
  d.grids.ecmwf = null;   // 2 mallia saatavilla -> nimittäjä 2
  const [a] = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts;
  assert.deepEqual(a.report, {pct: 60, at: new Date(NIGHT).toISOString(), cloud: 0, ok: 2, avail: 2, bz: -3, bt: 7, kp: 4});
});

test('vanha tila (päätös 36: sent, tonight) siirtyy: viimeisin lähetys = tiheysrajan alku', () => {
  const nk = C.alertNightKey(new Date(NIGHT), cell.tz);
  const prev = {[cell.key]: {night: nk, sent: {now: new Date(NIGHT - 30 * 60e3).toISOString(), tonight: 'x'}, tonight: nk}};
  const r = F.evaluateCells(C, data(NIGHT), [cell], prev, new Date(NIGHT));
  assert.equal(r.alerts.length, 0, 'Nyt lähti 30 min sitten -> ei');
  assert.equal(r.state[cell.key].sent, undefined); assert.equal(r.state[cell.key].tonight, undefined);
  assert.equal(r.state[cell.key].last, new Date(NIGHT - 30 * 60e3).toISOString());
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

test('Tulossa: Bz-siirtymä laukaisee, lähtee kun näkyvyys 30–60 min päästä >= 40 %, kerran siirtymää kohti, 2 h raja', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3;
  // Pilvet: nyt 100 %, tunnin päästä 0 % -> Nyt ei lähde, ennuste +60 min lähtee.
  const g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const prev = {[cell.key]: {coming: {on: false}}};
  const d = data(now, {bz: -8, bt: 10, kp: 3, grids: {harmonie: g, icon_eu: g, ecmwf: g, edited: null}});
  let r = F.evaluateCells(C, d, [cell], prev, new Date(now));
  assert.deepEqual(r.alerts.map(a => a.type), ['coming']);
  assert.ok(r.alerts[0].pct >= 40);
  assert.ok(Date.parse(r.alerts[0].report.at) > now, 'arvioitu aika tulevaisuudessa');
  r = F.evaluateCells(C, d, [cell], r.state, new Date(now + 900e3));
  assert.equal(r.alerts.length, 0, 'siirtymä käytetty');
  // Ilman siirtymää (edellinen tila tuntematon) ei lähde
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(now)).alerts.filter(a => a.type === 'coming').length, 0);
  // Hälytys samaan ruutuun alle 2 h sitten -> Tulossa ei lähde
  const prev2 = {[cell.key]: {coming: {on: false}, last: new Date(now - 600e3).toISOString()}};
  assert.equal(F.evaluateCells(C, d, [cell], prev2, new Date(now)).alerts.length, 0);
});

test('Tänä yönä -hälytystä ei enää lähetetä (päätös 42), klo 16 illalla ei hälytystä ennen pimeää', () => {
  const at = Date.parse('2026-11-10T14:05:00Z');   // Helsinki klo 16.05 (ennen: Tänä yönä -arvioinnin alku)
  const d = data(at, {kp: 4}); d.grids.edited = d.clear;
  const r = F.evaluateCells(C, d, [cell], {}, new Date(at));
  assert.equal(r.alerts.filter(a => a.type === 'tonight').length, 0);
  assert.deepEqual(F.TYPES, ['now', 'coming']);
});

test('alue: ruudut ja aikavyöhykkeet', () => {
  const cells = F.regionCells(C);
  assert.equal(cells.length, 28 * 36);
  assert.equal(cells.find(c => c.key === ROV.key).tz, 'Europe/Helsinki');
});

test('tekstit: Nyt ja Tulossa SAMA ilmoitus (fi/en/zh, prosentti), ei Bz-erillistekstiä, tunniste', () => {
  const a = {type: 'now', cell, night: '2026-11-10', pct: 62, ok: 2, avail: 3, kp: [2.7, 2.7], best: null};
  const fi = F.alertTexts(T, a, 'fi'), en = F.alertTexts(T, a, 'en'), zh = F.alertTexts(T, a, 'zh-Hans');
  assert.match(fi.title, /62\u00a0%$/); assert.match(en.title, /62%$/); assert.match(zh.title, /62%$/);
  for(const l of ['fi', 'en', 'zh']) assert.deepEqual(F.alertTexts(T, {...a, type: 'coming'}, l), F.alertTexts(T, a, l), l);
  assert.doesNotMatch(fi.title + fi.body, /Bz|Tänä yönä/);
  assert.equal(F.alertTexts(T, a, 'es').title, en.title, 'es -> en');
  assert.equal(F.alertId(a), 'now-' + cell.key + '-2026-11-10');
});

test('esitarkistus: päivällä ei ajoa, illalla ja yöllä ajo (vain pimeys, päätös 42)', () => {
  const cells = F.regionCells(C);
  assert.equal(F.runNeed(C, cells, {}, new Date('2026-11-07T10:00:00Z')).run, false);
  assert.ok(F.runNeed(C, cells, {}, new Date('2026-11-07T23:00:00Z')).dark > 900);
  assert.equal(F.runNeed(C, cells, {}, new Date('2026-11-07T23:00:00Z')).tonight, 0);
  assert.equal(F.runNeed(C, cells.filter(c => c.center.lat > 67), {}, new Date('2026-06-21T22:00:00Z')).run, false);   // juhannus Lapissa
});

test('päätös 48: Nyt arvioi 4 mallia (IL mukana), Tulossa 3; IL:n ikäraja 6 h', () => {
  assert.deepEqual(F.FCM_ALERT_CFG.models.now, ['harmonie', 'icon_eu', 'ecmwf', 'edited']);
  assert.deepEqual(F.FCM_ALERT_CFG.models.coming, ['harmonie', 'icon_eu', 'ecmwf']);
  assert.equal(F.FCM_ALERT_CFG.maxAgeH.edited, 6);
  assert.equal(F.needModels(4), 2); assert.equal(F.needModels(3), 2);
});

test('päätös 48: 4 mallia, tasapeli 2/4 riittää; luku = toiseksi suurin malliarvo', () => {
  const d = data(NIGHT), t0 = Math.floor(NIGHT / 3600e3) * 3600e3 - 3600e3, mid = grid(t0, 24, () => 30);
  d.grids = {harmonie: d.clear, icon_eu: mid, ecmwf: d.cloudy, edited: d.cloudy};
  const vMid = F.cellVis(C, d.grids, (m, c) => C.cellGridPoints(d.grids[m], c), cell, 60, new Date(NIGHT), ['icon_eu']).icon_eu;
  assert.ok(vMid >= 40 && vMid < 60, 'välipilvisyys antaa 40..60 % (' + vMid + ')');
  const [a] = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts;
  assert.equal(a.type, 'now'); assert.equal(a.ok, 2); assert.equal(a.avail, 4);
  assert.equal(a.pct, vMid, 'toiseksi suurin');
  assert.equal(a.report.avail, 4);
  d.grids.icon_eu = d.cloudy;   // 1/4 -> ei
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts.length, 0);
});

test('päätös 48: IL puuttuu (alueen ulkopuolella tai vanha) -> 3 mallia, 2/3', () => {
  const d = data(NIGHT); d.grids = {harmonie: d.clear, icon_eu: d.clear, ecmwf: d.cloudy, edited: null};
  const [a] = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts;
  assert.equal(a.ok, 2); assert.equal(a.avail, 3);
  // IL:n hila ei kata ruutua (länsi, < 4 °E): kaikki pisteet NaN -> ei saatavilla
  const t0 = Math.floor(NIGHT / 3600e3) * 3600e3 - 3600e3, nan = grid(t0, 24, () => NaN);
  d.grids.edited = nan;
  const [b] = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts;
  assert.equal(b.avail, 3, 'IL NaN ei ole nolla');
  // IL vanhentunut: gridFresh hylkää yli 6 h vanhan ajon (alert-fcm.mjs asettaa hilan nulliksi)
  const old = grid(t0, 24, () => 0); old.run = new Date(NIGHT - 7 * 3600e3);
  assert.equal(CM.gridFresh(old, new Date(NIGHT), F.FCM_ALERT_CFG.maxAgeH.edited).ok, false);
  old.run = new Date(NIGHT - 5 * 3600e3);
  assert.equal(CM.gridFresh(old, new Date(NIGHT), F.FCM_ALERT_CFG.maxAgeH.edited).ok, true);
});

test('päätös 48: IL-erot lokiin (IL:n tulos poikkeaa 3 mallin enemmistöstä), myös ilman hälytystä', () => {
  const d = data(NIGHT); d.grids = {harmonie: d.clear, icon_eu: d.clear, ecmwf: d.clear, edited: d.cloudy};
  let r = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT));
  assert.equal(r.alerts.length, 1);
  assert.equal(r.ilDiff.length, 1);
  assert.deepEqual({cell: r.ilDiff[0].cell, il: r.ilDiff[0].il, ilCloud: r.ilDiff[0].ilCloud, ok3: r.ilDiff[0].ok3, ok4: r.ilDiff[0].ok4, count: r.ilDiff[0].count},
    {cell: cell.key, il: 0, ilCloud: 100, ok3: true, ok4: true, count: 3});
  // IL ainoa selkeä: 3 mallia ei, 4 mallia 1/4 ei -> ero kirjataan, ei hälytystä
  d.grids = {harmonie: d.cloudy, icon_eu: d.cloudy, ecmwf: d.cloudy, edited: d.clear};
  r = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT));
  assert.equal(r.alerts.length, 0); assert.equal(r.ilDiff.length, 1); assert.equal(r.ilDiff[0].ok3, false);
  // Samaa mieltä -> ei kirjausta; IL puuttuu -> ei kirjausta
  d.grids.edited = d.cloudy;
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).ilDiff.length, 0);
  d.grids.edited = null;
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).ilDiff.length, 0);
});

test('päätös 48: Tulossa käyttää edelleen 3 mallia (IL ei lasketa)', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3 - 3600e3;
  const later = grid(t0, 24, i => i <= 1 ? 100 : 0), cl = grid(t0, 24, () => 100);   // nyt pilvessä, +60 min selkeää
  const d = data(now, {bz: -8, bt: 10, kp: 3, grids: {harmonie: later, icon_eu: later, ecmwf: cl, edited: later}});
  const prev = {[cell.key]: {night: C.alertNightKey(new Date(now), cell.tz), coming: {on: false, armed: null}}};
  const r = F.evaluateCells(C, d, [cell], prev, new Date(now));
  assert.equal(r.alerts.filter(a => a.type === 'now').length, 0, 'Nyt pilvessä');
  const c = r.alerts.find(a => a.type === 'coming');
  assert.ok(c, 'Tulossa lähtee'); assert.equal(c.avail, 3); assert.equal(c.ok, 2);
  assert.equal('edited' in c.models, false);
});
