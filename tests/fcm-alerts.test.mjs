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
  assert.deepEqual(a.report, {pct: 60, at: new Date(NIGHT).toISOString(), trig: 'now', cloud: 0, ok: 2, avail: 2, bz: -3, bt: 7, kp: 4, lv: 'v'});
});

test('vanha tila (päätös 36: sent, tonight) siirtyy: viimeisin lähetys = tiheysrajan alku', () => {
  const nk = C.alertNightKey(new Date(NIGHT), cell.tz);
  const prev = {[cell.key]: {night: nk, sent: {now: new Date(NIGHT - 30 * 60e3).toISOString(), tonight: 'x'}, tonight: nk}};
  const r = F.evaluateCells(C, data(NIGHT), [cell], prev, new Date(NIGHT));
  assert.equal(r.alerts.length, 0, 'Nyt lähti 30 min sitten -> ei');
  assert.equal(r.state[cell.key].sent, undefined); assert.equal(r.state[cell.key].tonight, undefined);
  // Päätös 56: vanha lähetys (al1 tavoitti kaikki) -> Varma-luokan aika, estää kaikki luokat 2 h
  assert.equal(r.state[cell.key].last, undefined);
  assert.equal(r.state[cell.key].lv.v, new Date(NIGHT - 30 * 60e3).toISOString());
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

test('tekstit: Nyt ja Tulossa SAMA ilmoitus (fi/en/zh), päätös 52: ei numeroita, tunniste', () => {
  const a = {type: 'now', cell, night: '2026-11-10', pct: 62, ok: 2, avail: 3, kp: [2.7, 2.7], best: null};
  const fi = F.alertTexts(T, a, 'fi'), en = F.alertTexts(T, a, 'en'), zh = F.alertTexts(T, a, 'zh-Hans');
  for(const x of [fi, en, zh]) assert.doesNotMatch(x.title + x.body, /\d/, 'ei numeroita: ' + x.title);
  assert.equal(fi.title, 'Revontulia voi näkyä alueellasi'); assert.match(fi.body, /revontuliraportti/);
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

test('päätös 48: Nyt arvioi 4 mallia (IL mukana); IL:n ikäraja 6 h', () => {
  assert.deepEqual(F.FCM_ALERT_CFG.models.now, ['harmonie', 'icon_eu', 'ecmwf', 'edited']);
  assert.equal(F.FCM_ALERT_CFG.models.coming, undefined, 'päätös 49 täsmennys: Bz käyttää models.now');
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

test('päätös 49 täsmennys: Bz arvioi 4 mallia (IL mukana), 2/4 riittää', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3 - 3600e3;
  const later = grid(t0, 24, i => i <= 1 ? 100 : 0), cl = grid(t0, 24, () => 100);   // nyt pilvessä, +60 min selkeää
  const prev = () => ({[cell.key]: {night: C.alertNightKey(new Date(now), cell.tz), coming: {on: false, armed: null}}});
  const run = grids => F.evaluateCells(C, data(now, {bz: -8, bt: 10, kp: 0, grids}), [cell], prev(), new Date(now));
  let r = run({harmonie: later, icon_eu: cl, ecmwf: cl, edited: later});
  assert.equal(r.alerts.filter(a => a.type === 'now').length, 0, 'Nyt pilvessä');
  let c = r.alerts.find(a => a.trig === 'bz');
  assert.ok(c, '2/4 (HARMONIE + IL) riittää'); assert.equal(c.avail, 4); assert.equal(c.ok, 2);
  assert.equal('edited' in c.models, true);
  // IL puuttuu (alueen ulkopuolella / vanha = null) -> 1/3 ei riitä, 2/3 riittää
  assert.equal(run({harmonie: later, icon_eu: cl, ecmwf: cl, edited: null}).alerts.length, 0);
  c = run({harmonie: later, icon_eu: later, ecmwf: cl, edited: null}).alerts[0];
  assert.equal(c.trig, 'bz'); assert.equal(c.avail, 3); assert.equal(c.ok, 2);
  // IL:n hila ei kata ruutua (NaN) -> ei saatavilla
  c = run({harmonie: later, icon_eu: later, ecmwf: cl, edited: grid(t0, 24, () => NaN)}).alerts[0];
  assert.equal(c.avail, 3);
  // 1/4 ei riitä
  assert.equal(run({harmonie: later, icon_eu: cl, ecmwf: cl, edited: cl}).alerts.length, 0);
});

test('päätös 49 täsmennys: pilvikynnys = läpäisykerroin >= 0,40 <=> pilvisyys <= 61,25 % (lineaarinen interpolointi)', () => {
  assert.ok(Math.abs(C.cloudTransmit(61.25) - 0.4) < 1e-12);
  const t0 = Math.floor(NIGHT / 3600e3) * 3600e3 - 3600e3;
  const bzAt = pct => { const g = grid(t0, 24, () => pct), d = data(NIGHT, {p: 5, bz: -8, kp: 0}); d.grids = {harmonie: g, icon_eu: g, ecmwf: g, edited: g};
    return F.evaluateCells(C, d, [cell], {[cell.key]: {coming: {on: false}}}, new Date(NIGHT)).alerts.filter(a => a.trig === 'bz').length; };
  assert.equal(bzAt(61), 1); assert.equal(bzAt(61.5), 0, 'ei pyöristystä kertoimessa');
});

test('päätös 49 täsmennys: seurattavat ruudut lokiin (vain tunnisteet), IL:n ikäraja 6 h', () => {
  assert.deepEqual(F.WATCH_CELLS, ['310_205', '313_205', '318_200', '319_207']);
  const ou = C.alertCell(65.01, 25.47), oc = {...ou, tz: C.cellTimeZone(ou.center.lat, ou.center.lon), mlat: C.magLat(ou.center.lat, ou.center.lon)};
  assert.equal(oc.key, '310_205');
  const t0 = Math.floor(NIGHT / 3600e3) * 3600e3 - 3600e3, g = grid(t0, 24, () => 0);
  g.lat0 = 64; g.lat1 = 67; g.lon0 = 24; g.lon1 = 28;
  const d = data(NIGHT, {kp: 1, grids: {harmonie: g, icon_eu: g, ecmwf: g, edited: null}});
  const w = F.evaluateCells(C, d, [oc], {}, new Date(NIGHT)).diag.watch['310_205'];
  assert.equal(w.dark, true); assert.equal(w.ovation, 60); assert.equal(w.sent, 'now:v');
  assert.deepEqual(Object.keys(w).sort(), ['bzArmed', 'cf', 'cloud', 'cloudRule', 'dark', 'df', 'now', 'ovation', 'quiet', 'sent', 'vis']);
  const old = grid(t0, 24, () => 0); old.run = new Date(NIGHT - 6.5 * 3600e3);
  assert.equal(CM.gridFresh(old, new Date(NIGHT), F.FCM_ALERT_CFG.maxAgeH.edited).ok, false, 'IL yli 6 h -> ei saatavilla');
});

// ── Päätös 49: kolme ehtoa (Nyt, Bz, Kp) ──

test('päätös 49: Nyt yksin (Kp alle 2,5, ei Bz-siirtymää) -> trig now', () => {
  const r = F.evaluateCells(C, data(NIGHT, {kp: 1}), [cell], {}, new Date(NIGHT));
  assert.deepEqual(r.alerts.map(a => [a.type, a.trig]), [['now', 'now']]);
  assert.equal(r.alerts[0].report.trig, 'now');
  assert.equal(r.diag.kp, 1); assert.equal(r.diag.dark, 1); assert.equal(r.diag.cloudPass, 1);
});

test('päätös 49: Bz-ehto ilman Kp-ehtoa (Kp 0), pilvisääntö riittää, luku = näkyvyys-% (voi olla alle 40)', () => {
  assert.equal(F.FCM_ALERT_CFG.coming.kpMargin, undefined);
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3, g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const d = data(now, {p: 20, bz: -8, bt: 10, kp: 0, grids: {harmonie: g, icon_eu: g, ecmwf: g, edited: null}});
  assert.equal(F.comingTrigger(C, {mag: d.mag}, null, new Date(now)), true, 'ei tarvitse Kp:tä');
  const r = F.evaluateCells(C, d, [cell], {[cell.key]: {coming: {on: false}}}, new Date(now));
  assert.deepEqual(r.alerts.map(a => [a.type, a.trig]), [['coming', 'bz']]);
  assert.equal(r.alerts[0].pct, 20, 'OVATION 20 % × läpäisy 1 × pimeys 1');
  assert.equal(r.alerts[0].ok, 3); assert.equal(r.alerts[0].avail, 3);
  assert.equal(r.diag.bz, true);
  // Pilvessä koko ajan -> Bz ei lähde
  const cl = grid(t0 - 3600e3, 24, () => 100);
  const d2 = data(now, {p: 20, bz: -8, bt: 10, kp: 0, grids: {harmonie: cl, icon_eu: cl, ecmwf: cl, edited: null}});
  assert.equal(F.evaluateCells(C, d2, [cell], {[cell.key]: {coming: {on: false}}}, new Date(now)).alerts.length, 0);
});

test('loki 13.11.: Bz-ehdon osat rajoineen ja Nyt-ehdon paras arvo koko alueelta', () => {
  const ROV2 = C.alertCell(66.5, 26.7), c2 = {...ROV2, tz: C.cellTimeZone(ROV2.center.lat, ROV2.center.lon), mlat: C.magLat(ROV2.center.lat, ROV2.center.lon)};
  const d = data(NIGHT, {bz: -3, bt: 7, kp: 1});
  const r = F.evaluateCells(C, d, [cell], {}, new Date(NIGHT));
  const B = r.diag.bzv;
  assert.equal(B.mean, -3); assert.equal(B.bt, 7); assert.equal(B.fresh, true); assert.ok(B.southMin >= 20);
  assert.deepEqual(B.limits, {bzMax: -1.0, southMin: 15}); assert.deepEqual(B.old, {bzMax: -5, southMin: 20, btMin: 6});
  assert.equal(r.diag.bz, true, '-3 nT 60 min'); assert.equal(r.diag.bzOld, false, 'vanha: -3 > -5');
  assert.deepEqual(r.diag.nowMax, {value: 60, cell: cell.key, count: 3, avail: 3, ovation: 60});
  assert.equal(r.diag.nowNear, 1);
  // Pilvessä: paras arvo 0 %, ei lähellä; tiheysrajan aikanakin arvo kirjataan
  const dc = data(NIGHT, {kp: 1}); dc.grids = {harmonie: dc.cloudy, icon_eu: dc.cloudy, ecmwf: dc.cloudy, edited: null};
  const r2 = F.evaluateCells(C, dc, [cell, c2], {[cell.key]: {lv: {v: new Date(NIGHT - 600e3).toISOString()}}}, new Date(NIGHT));
  assert.equal(r2.diag.nowMax.value, 0); assert.equal(r2.diag.nowNear, 0);
  // 15.11.: Nyt paras -rivin mallimäärä Nyt-rajalla 12 % (ei 40): 15 % kaikissa malleissa -> 3/3
  const r3 = F.evaluateCells(C, data(NIGHT, {p: 15, kp: 1}), [cell], {}, new Date(NIGHT));
  assert.deepEqual([r3.diag.nowMax.value, r3.diag.nowMax.count, r3.diag.nowMax.avail], [15, 3, 3]);
  assert.equal(F.evaluateCells(C, {...d, mag: null}, [cell], {}, new Date(NIGHT)).diag.bzv, null);
});

test('päätös 51: Nyt-raja 12 % (nowMin), oma vakio; pilvisääntö yhä 40 (goodMin)', () => {
  assert.equal(F.FCM_ALERT_CFG.nowMin, 12); assert.equal(F.FCM_ALERT_CFG.goodMin, 40);
  const nowAt = p => F.evaluateCells(C, data(NIGHT, {p, kp: 1}), [cell], {}, new Date(NIGHT)).alerts.filter(a => a.trig === 'now');
  assert.equal(nowAt(11).length, 0, '11 % ei');
  const [a] = nowAt(12);
  assert.ok(a, '12 % lähtee'); assert.equal(a.pct, 12); assert.equal(a.ok, 3);
  // Mallisääntö ennallaan: 1/3 mallia >= 12 ei riitä
  const d = data(NIGHT, {p: 20, kp: 1}); d.grids = {harmonie: d.clear, icon_eu: d.cloudy, ecmwf: d.cloudy, edited: null};
  assert.equal(F.evaluateCells(C, d, [cell], {}, new Date(NIGHT)).alerts.length, 0);
});

// ── Päätös 52: Kp-hälytys pois, Bz-ehto −1,2 nT / 15 min ilman Bt:tä ──
const magRows = (now, south, bzS, bzN = 3, bt = 2) => Array.from({length: 90}, (_, k) => ({t: new Date(now - (89 - k) * 60e3), bz: k >= 90 - south ? bzS : bzN, bt}));
const bzData = (now, rows, opt = {}) => { const d = data(now, {p: 5, kp: 0, ...opt}); d.mag = rows; return d; };

test('päätös 52/56: herkin Bz-raja tarkalleen −1,0 nT laukaisee, −0,9 ei; Bt-arvo ei estä', () => {
  assert.deepEqual([F.FCM_ALERT_CFG.coming.bzMax, F.FCM_ALERT_CFG.coming.southMin], [-1.0, 15]);
  assert.equal(F.FCM_ALERT_CFG.coming.btMin, undefined); assert.equal(F.FCM_ALERT_CFG.kp, undefined);
  const trig = (bz, bt) => F.comingTrigger(C, {mag: mag(NIGHT, bz, bt)}, null, new Date(NIGHT));
  assert.equal(trig(-1.0, 1), true, 'Bt 1 nT ei estä'); assert.equal(trig(-0.9, 1), false);
  assert.equal(trig(-1.2, 1), true); assert.equal(trig(-1.1, 1), true, 'ennen −1,2: nyt Herkkä');
  assert.equal(F.comingTriggerOld(C, {mag: mag(NIGHT, -6, 7)}, new Date(NIGHT)), true);
  assert.equal(F.comingTriggerOld(C, {mag: mag(NIGHT, -6, 5)}, new Date(NIGHT)), false, 'vanha: Bt 5 < 6');
});

test('päätös 52: kesto 14 min ei, 15 min laukaisee (Bz etelässä yhtäjaksoisesti)', () => {
  // Haetaan rivimäärät, joilla bzTrend antaa etelässä-ajaksi 14 ja 15 min (10 min liukuva keskiarvo).
  const at = n => C.bzTrend(magRows(NIGHT, n, -8)).southMin;
  const n14 = [...Array(40).keys()].find(n => at(n) === 14), n15 = [...Array(40).keys()].find(n => at(n) === 15);
  assert.ok(n14 != null && n15 != null);
  const trig = n => F.comingTrigger(C, {mag: magRows(NIGHT, n, -8)}, null, new Date(NIGHT));
  assert.equal(trig(n14), false); assert.equal(trig(n15), true);
});

test('päätös 52: Bz-hälytys siirtymästä (−1,5 nT, Bt 2), luku näkyvyys-%; Kp 5 ei laukaise mitään', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3, g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const d = bzData(now, mag(now, -1.5, 2), {grids: {harmonie: g, icon_eu: g, ecmwf: g, edited: g}});
  let r = F.evaluateCells(C, d, [cell], {[cell.key]: {coming: {on: false}}}, new Date(now));
  assert.deepEqual(r.alerts.map(a => [a.type, a.trig]), [['coming', 'bz']]);
  assert.equal(r.diag.bzOld, false);
  r = F.evaluateCells(C, d, [cell], r.state, new Date(now + 900e3));
  assert.equal(r.alerts.length, 0, 'ei toistu ilman uutta siirtymää');
  // Kp 5, selkeää, OVATION 5 % -> ei Nyt (5 < 12), ei Kp-hälytystä
  const k = data(NIGHT, {p: 5, kp: 5});
  const rk = F.evaluateCells(C, k, [cell], {}, new Date(NIGHT));
  assert.equal(rk.alerts.length, 0); assert.equal(rk.diag.kp, 5); assert.equal('kpOn' in rk.diag, false);
});

test('päätös 52: vanha tila (kpc, sent, tonight) ei hajoa, kpc poistuu', () => {
  const nk = C.alertNightKey(new Date(NIGHT), cell.tz);
  const old = {[cell.key]: {night: nk, kpc: {on: true}, sent: {now: new Date(NIGHT - 3 * 3600e3).toISOString()}, tonight: nk, coming: {on: false, armed: null}}};
  const r = F.evaluateCells(C, data(NIGHT, {kp: 1}), [cell], old, new Date(NIGHT));
  assert.equal(r.state[cell.key].kpc, undefined); assert.equal(r.state[cell.key].sent, undefined);
  assert.deepEqual(r.alerts.map(a => a.trig), ['now']);
  assert.deepEqual(F.migrateCell({kpc: {on: false}, last: 'x'}), {lv: {v: 'x'}});
  assert.deepEqual(F.migrateCell({coming: {on: true, armed: 'y'}}), {coming: {h: {on: true, armed: 'y'}}});
});

// ── Päätös 56: herkkyysluokat, luokittainen tiheysraja ja Bz-siirtymä ──
const lvSeq = (pcts, stepMin = 30) => {   // Nyt-hälytykset peräkkäisissä ajoissa: [[aika, luokka|null]]
  let st = {}; const out = [];
  pcts.forEach((p, k) => { const t = NIGHT + k * stepMin * 60e3;
    const r = F.evaluateCells(C, data(t, {p, kp: 1}), [cell], st, new Date(t)); st = r.state;
    out.push(r.alerts.length ? r.alerts[0].lv : null); });
  return {out, st};
};
test('päätös 56: Nyt lähtee tiukimman ylittyneen luokan aiheeseen; raja täsmälleen', () => {
  const lvAt = p => (F.evaluateCells(C, data(NIGHT, {p, kp: 1}), [cell], {}, new Date(NIGHT)).alerts[0] || {}).lv || null;
  assert.deepEqual([11, 12, 24, 25, 39, 40].map(lvAt), [null, 'h', 'h', 'n', 'n', 'v']);
});
test('päätös 56: luokittainen tiheysraja: h -> v sallittu, v -> h estetty, n -> v sallittu, v -> n estetty', () => {
  assert.deepEqual(lvSeq([15, 45]).out, ['h', 'v'], 'h sitten v');
  assert.deepEqual(lvSeq([45, 15]).out, ['v', null], 'v sitten h');
  assert.deepEqual(lvSeq([30, 45]).out, ['n', 'v'], 'n sitten v');
  assert.deepEqual(lvSeq([45, 30]).out, ['v', null], 'v sitten n');
  assert.deepEqual(lvSeq([15, 15, 15, 15, 15]).out, ['h', null, null, null, 'h'], 'sama luokka: 2 h raja');
  assert.deepEqual(lvSeq([15, 30, 45, 45]).out, ['h', 'n', 'v', null], 'voimistuminen h -> n -> v');
  // Kaksi luokkaa samassa ruudussa: tila pitää kummankin ajan
  const {st} = lvSeq([15, 45]);
  assert.ok(st[cell.key].lv.h && st[cell.key].lv.v && !st[cell.key].lv.n);
  assert.equal(F.levelQuiet(C, st[cell.key], 'h', NIGHT + 60 * 60e3, 2 * 3600e3), true, 'v estää h:n');
  assert.equal(F.levelQuiet(C, {lv: {h: new Date(NIGHT).toISOString()}}, 'n', NIGHT + 60e3, 2 * 3600e3), false, 'h ei estä n:ää');
});
test('päätös 56: Bz-luokat −1,0 / −2,2 / −3,5 nT; siirtymä luokittain, voimistuminen sallitaan', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3, g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const G = {harmonie: g, icon_eu: g, ecmwf: g, edited: g};
  const lvOf = bz => F.comingLevel(C, {mag: mag(now, bz, 2)}, new Date(now));
  assert.deepEqual([-0.9, -1.0, -2.19, -2.2, -3.49, -3.5].map(lvOf), ['', 'h', 'h', 'n', 'n', 'v']);
  assert.equal(F.comingLevel(C, {mag: magRows(now, 5, -8)}, new Date(now)), '', 'etelässä alle 15 min: ei luokkaa');
  assert.equal(F.comingLevel(C, {mag: []}, new Date(now)), null, 'ei tuoretta Bz:aa: tuntematon');
  // Bz pohjoisessa (tila tunnettu) -> Herkkä-siirtymä -> h; voimistuu -3,6 -> n- ja v-siirtymä -> v (sallittu, tiukempi)
  let st = {}, r;
  r = F.evaluateCells(C, bzData(now - 1800e3, mag(now - 1800e3, 2, 2), {grids: G}), [cell], st, new Date(now - 1800e3)); st = r.state;
  r = F.evaluateCells(C, bzData(now, mag(now, -1.5, 2), {grids: G}), [cell], st, new Date(now)); st = r.state;
  assert.deepEqual(r.alerts.map(a => [a.trig, a.lv]), [['bz', 'h']]);
  assert.equal(r.alerts[0].report.south >= 15, true); assert.equal(r.alerts[0].report.lv, 'h');
  r = F.evaluateCells(C, bzData(now + 900e3, mag(now + 900e3, -3.6, 2), {grids: G}), [cell], st, new Date(now + 900e3)); st = r.state;
  assert.deepEqual(r.alerts.map(a => [a.trig, a.lv]), [['bz', 'v']], 'voimistuminen Varmaan lähtee 2 h sisällä');
  // Laantuu -1,5:een ja voimistuu uudelleen -3,6:een: v-siirtymä, mutta v lähti alle 2 h sitten -> estetty
  r = F.evaluateCells(C, bzData(now + 1800e3, mag(now + 1800e3, -1.5, 2), {grids: G}), [cell], st, new Date(now + 1800e3)); st = r.state;
  r = F.evaluateCells(C, bzData(now + 2700e3, mag(now + 2700e3, -3.6, 2), {grids: G}), [cell], st, new Date(now + 2700e3)); st = r.state;
  assert.equal(r.alerts.length, 0, 'sama luokka 2 h sisällä');
  assert.deepEqual(r.diag.sentLv, {h: 0, n: 0, v: 0});
});
test('päätös 56: Bz suoraan Varmaan: kaikki luokat aseistuvat, yksi viesti v-aiheeseen, aseistus kuluu kaikilta', () => {
  const now = NIGHT, t0 = Math.floor(now / 3600e3) * 3600e3, g = grid(t0 - 3600e3, 24, i => i <= 1 ? 100 : 0);
  const G = {harmonie: g, icon_eu: g, ecmwf: g, edited: g};
  const prev = {[cell.key]: {coming: {h: {on: false}, n: {on: false}, v: {on: false}}}};
  const r = F.evaluateCells(C, bzData(now, mag(now, -5, 2), {grids: G}), [cell], prev, new Date(now));
  assert.deepEqual(r.alerts.map(a => [a.trig, a.lv]), [['bz', 'v']]);
  const c = r.state[cell.key].coming;
  assert.deepEqual([c.h.armed, c.n.armed, c.v.armed], [null, null, null]);
  assert.deepEqual(r.diag.sentLv, {h: 0, n: 0, v: 1});
});
