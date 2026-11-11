// Ominaisuuksien rajaus (features.js, 2026-10-28): maksut pois -> kaikki auki;
// maksumuuri päällä -> ilmainen taso rajattu, Pro avaa kaiken.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const F = createRequire(import.meta.url)('../features.js');

test('maksut eivät ole käytössä: kaikki auki, rajat Pron', () => {
  assert.equal(F.PAYWALL_ENABLED, false);
  assert.equal(F.isPro(), true);
  for(const {id} of F.list()) assert.equal(F.canUse(id), true, id);
  for(const m of ['ecmwf', 'harmonie', 'icon_eu', 'edited']) assert.equal(F.canUseModel(m), true, m);
  assert.equal(F.limit('places'), 50);   // sama kuin AuroraCore.PLACES_CFG.max ennen
});

test('maksumuuri päällä, ei tilausta: vain ilmaiset', () => {
  F._setPaywallForTest(true);
  F.setEntitlement({pro: false});
  try{
    assert.equal(F.isPro(), false);
    assert.equal(F.canUse('auroraMap'), true);
    assert.equal(F.canUse('cloudsTotal'), true);
    assert.equal(F.canUse('cloudLayers'), false);
    assert.equal(F.canUse('fog'), false);
    assert.equal(F.canUse('windSurface'), true);
    assert.equal(F.canUse('windLevels'), false);
    assert.equal(F.canUseModel('ecmwf'), true);
    assert.equal(F.canUseModel('harmonie'), false);
    assert.equal(F.canUseModel('edited'), false);
    assert.equal(F.limit('places'), 2);   // päätös 45
    assert.equal(F.canUse('alerts'), false);   // hälytykset Pro (päätös 30)
    assert.equal(F.canUse('alertQuiet'), false);   // hiljaiset tunnit Pro (päätös 45)
    assert.equal(F.canUse('satelliteClouds'), false);
    assert.equal(F.canUse('modelEditedNight'), true);
  }finally{ F._setPaywallForTest(false); F.setEntitlement(null); }
});

test('maksumuuri päällä + Pro: kaikki auki', () => {
  F._setPaywallForTest(true);
  F.setEntitlement({pro: true, source: 'test'});
  try{
    for(const {id} of F.list()) assert.equal(F.canUse(id), true, id);
    assert.equal(F.limit('places'), 50);
  }finally{ F._setPaywallForTest(false); F.setEntitlement(null); }
});

test('tuntematon tunniste ei lukitse, jokaisella ominaisuudella taso ja tila', () => {
  F._setPaywallForTest(true);
  try{ assert.equal(F.canUse('eiOle'), true); }finally{ F._setPaywallForTest(false); }
  for(const f of F.list()){
    assert.ok(['free', 'pro'].includes(f.tier), f.id);
    assert.ok(['live', 'planned', 'fieldtest'].includes(f.status), f.id);
  }
});

test('testitila: free lukitsee, pro ja open avaavat', () => {
  try{
    assert.equal(F.setTestMode('free'), 'free');
    assert.equal(F.isPro(), false);
    assert.equal(F.canUse('cloudLayers'), false);
    assert.equal(F.canUseModel('harmonie'), false);
    assert.equal(F.canUseModel('ecmwf'), true);
    assert.equal(F.limit('places'), 2);
    F.setTestMode('pro');
    assert.equal(F.isPro(), true);
    assert.equal(F.limit('places'), 50);
    F.setTestMode('open');
    assert.equal(F.isPro(), true);
    assert.equal(F.setTestMode('outo'), 'open');
  }finally{ F.setTestMode('open'); }
});

test('Pro-tilaus (kyltti): vain Pro-tilassa tai oikealla tilauksella', () => {
  try{
    assert.equal(F.hasProSubscription(), false);   // Auki: kaikki käytössä, mutta ei tilausta
    F.setTestMode('pro'); assert.equal(F.hasProSubscription(), true);
    F.setTestMode('free'); assert.equal(F.hasProSubscription(), false);
    F.setTestMode('open'); F._setPaywallForTest(true); F.setEntitlement({pro: true});
    assert.equal(F.hasProSubscription(), true);
  }finally{ F.setTestMode('open'); F._setPaywallForTest(false); F.setEntitlement(null); }
});

test('päätös 45: rekisteri', () => {
  assert.equal(F.LIMITS.places.free, 2);
  assert.equal(F.FEATURES.alertQuiet.tier, 'pro');
  assert.equal(F.FEATURES.satelliteClouds.status, 'live');
  assert.equal(F.FEATURES.satelliteClouds.tier, 'pro');
  assert.equal(F.FEATURES.history, undefined);
  assert.equal(F.FEATURES.basemapSatellite, undefined);
});

test('meteorologien ennuste: Tänä yönä ilmaisille, kartan malliksi Pro', () => {
  try{
    assert.equal(F.nightModel('ecmwf'), 'ecmwf');   // maksut pois: kartan malli
    assert.equal(F.nightModel('harmonie'), 'harmonie');
    F.setTestMode('free');
    assert.equal(F.nightModel('ecmwf'), F.NIGHT_FREE_MODEL);
    assert.equal(F.NIGHT_FREE_MODEL, 'edited');
    assert.equal(F.canUseModel('edited'), false);   // kartan malliksi ei
    F.setTestMode('pro');
    assert.equal(F.nightModel('icon_eu'), 'icon_eu');
    assert.equal(F.nightModel('ecmwf'), 'ecmwf');
  }finally{ F.setTestMode('open'); }
});

test('paikkaraja: yli rajan säilyy, tuodut eivät kuulu rajaan', () => {
  const own = n => Array.from({length: n}, (_, i) => ({id: 'p' + i}));
  const imp = n => Array.from({length: n}, (_, i) => ({id: 'i' + i, source: 'import'}));
  try{
    F.setTestMode('free');
    assert.equal(F.canAddPlace(own(1)), true);
    assert.equal(F.canAddPlace(own(2)), false);
    assert.equal(F.canAddPlace(own(5)), false);   // Pron jälkeen 5 paikkaa: säilyvät, uutta ei
    assert.equal(F.placesCounted([...own(1), ...imp(10)]), 1);
    assert.equal(F.canAddPlace([...own(1), ...imp(10)]), true);
    F.setTestMode('pro');
    assert.equal(F.canAddPlace(own(5)), true);
    assert.equal(F.canAddPlace(own(50)), false);
  }finally{ F.setTestMode('open'); }
});

test('päätös 46: tuotteet ja etuluettelo', () => {
  assert.deepEqual(F.PRODUCTS.map(p => [p.period, p.price, p.renews]), [['pass7d', 3.99, false], ['m6', 9.99, true], ['y1', 17.99, true]]);
  for(const p of F.PRODUCTS) assert.equal(p.currency, 'EUR');
  const b = F.proBenefits();
  for(const id of b){ assert.equal(F.FEATURES[id].tier, 'pro', id); assert.ok(['live', 'fieldtest'].includes(F.FEATURES[id].status), id); }
  assert.equal(b[0], 'alerts');   // fieldtest, ensimmäisenä
  assert.ok(b.includes('satelliteClouds'));
  assert.ok(!b.includes('alertQuiet') && !b.includes('alertThresholds'));   // planned
});
