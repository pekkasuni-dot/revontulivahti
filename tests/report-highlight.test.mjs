// Päätös 63 (20.11.2026): raportin korostus käyttäjän herkkyysluokan mukaan (AuroraCore.alertReportHighlight).
import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../aurora-core.js';

const S = C.ALERT_SENS;
for(const lv of S.levels){
  test('Mahdollisuus, luokka ' + lv + ': alla / tasan / yli', () => {
    const lim = S.now[lv], h = pct => C.alertReportHighlight({pct}, {now: lv, bz: 'h'}).pct;
    assert.equal(h(lim - 1), false); assert.equal(h(lim), true); assert.equal(h(lim + 1), true);
  });
  test('Bz, luokka ' + lv + ': alla / tasan / yli', () => {
    const lim = S.bz[lv], h = bzm => C.alertReportHighlight({bzm}, {now: 'h', bz: lv}).bz;
    assert.equal(h(Math.round((lim + 0.1) * 10) / 10), false);   // heikompi kuin raja
    assert.equal(h(lim), true);                                   // tasan rajalla (sama EPS kuin palvelimella)
    assert.equal(h(Math.round((lim - 0.1) * 10) / 10), true);
  });
}
test('esimerkki: 18 % ja −2,9 nT', () => {
  const r = {pct: 18, bzm: -2.9}, f = lv => C.alertReportHighlight(r, {now: lv, bz: lv});
  assert.deepEqual(f('h'), {pct: true, bz: true});
  assert.deepEqual(f('n'), {pct: false, bz: true});
  assert.deepEqual(f('v'), {pct: false, bz: false});
});
test('Bz-hälytys: 8 % ja −1,6 nT Herkällä -> vain Bz', () => {
  assert.deepEqual(C.alertReportHighlight({pct: 8, bzm: -1.6}, {now: 'h', bz: 'h'}), {pct: false, bz: true});
});
test('ei valintaa / tuntematon luokka -> Herkkä', () => {
  for(const s of [undefined, null, {}, {now: 'x', bz: 7}]) assert.deepEqual(C.alertReportHighlight({pct: 12, bzm: -1.0}, s), {pct: true, bz: true});
});
test('puuttuvat arvot eivät korostu', () => {
  assert.deepEqual(C.alertReportHighlight({}, {now: 'h', bz: 'h'}), {pct: false, bz: false});
  assert.deepEqual(C.alertReportHighlight(null, null), {pct: false, bz: false});
  assert.deepEqual(C.alertReportHighlight({pct: null, bzm: null}, {}), {pct: false, bz: false});
});
test('päätös 63 täydennys: keskiarvo rajalla mutta minuuttiarvo ei -> korostuu; vanha hälytys (vain minuuttiarvo) -> ei', () => {
  assert.equal(C.alertReportHighlight({bz: -0.4, bzm: -1.2}, {bz: 'h'}).bz, true);
  assert.equal(C.alertReportHighlight({bz: -5.0}, {bz: 'h'}).bz, false);
});
