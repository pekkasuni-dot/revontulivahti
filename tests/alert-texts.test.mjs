// Hälytysten jaettu tekstitiedosto (päätös 36): kielet, avaimet, paikkamerkit, prosenttimuoto, i18n-liitos.
import test from 'node:test';
import assert from 'node:assert/strict';
import T from '../alert-texts.js';
import C from '../aurora-core.js';

test('kielet = ALERT_CELL.langs; es/fr/tuntematon -> en; zh-Hans -> zh', () => {
  assert.deepEqual(T.LANGS, C.ALERT_CELL.langs);
  assert.equal(T.alertLangOf('zh-Hans'), 'zh'); assert.equal(T.alertLangOf('es'), 'en'); assert.equal(T.alertLangOf('fr'), 'en');
  assert.equal(C.alertLang('zh-Hans'), 'zh'); assert.equal(C.alertLang('es'), 'en'); assert.equal(C.alertLang('fr-FR'), 'en');
});
test('jokaisella kielellä samat avaimet ja paikkamerkit kuin englanniksi', () => {
  const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  for(const l of T.LANGS){
    assert.deepEqual(Object.keys(T.TEXTS[l]).sort(), Object.keys(T.TEXTS.en).sort(), l);
    for(const k of Object.keys(T.TEXTS.en)) assert.equal(vars(T.TEXTS[l][k]), vars(T.TEXTS.en[k]), l + ' ' + k);
  }
});
test('vain "hyvä": ei vahvempia sanoja', () => {
  const all = Object.values(T.TEXTS.fi).join(' ') + Object.values(T.TEXTS.en).join(' ');
  assert.doesNotMatch(all, /erinomai|loistav|excellent|great|amazing/i);
});
test('prosentti, Kp-haarukka ja mallisanat', () => {
  assert.equal(T.pct('fi', 62), '62 %'); assert.equal(T.pct('en', 61.6), '62%'); assert.equal(T.pct('zh-Hans', 5), '5%');
  assert.equal(T.kpRange(2.7, 2.7), '2–3'); assert.equal(T.kpRange(3, 3), '3'); assert.equal(T.kpRange(1.3, 4.7), '1–5');
  assert.equal(T.modelsKey(3, 3), 'models.all'); assert.equal(T.modelsKey(2, 3), 'models.most'); assert.equal(T.modelsKey(2, 4), 'models.half');
});
test('i18n-liitos: alert.*-avaimet kaikille sovelluksen kielille, es/fr englanniksi', () => {
  const I = {fi: {}, en: {}, 'zh-Hans': {}, es: {}, fr: {}};
  T.mergeInto(I);
  assert.equal(I.fi['alert.answer.seen'], 'Näkyi'); assert.equal(I['zh-Hans']['alert.answer.seen'], '看到了');
  assert.equal(I.es['alert.survey.tonight'], I.en['alert.survey.tonight']);
});
