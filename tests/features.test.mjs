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
    assert.equal(F.limit('places'), 3);
    assert.equal(F.limit('alertPlaces'), 0);
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
    assert.equal(F.limit('places'), 3);
    F.setTestMode('pro');
    assert.equal(F.isPro(), true);
    assert.equal(F.limit('places'), 50);
    F.setTestMode('open');
    assert.equal(F.isPro(), true);
    assert.equal(F.setTestMode('outo'), 'open');
  }finally{ F.setTestMode('open'); }
});
