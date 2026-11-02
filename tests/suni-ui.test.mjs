// Yhteinen UI-kit suni-ui (päätös 31): kopio vendor/suni-ui/ = sovittu versio. Päivitys: suni-ui-reposta
// `node scripts/sync.mjs ../revontulivahti`, sitten nosta SUNI_UI tähän (ja Eräkarttoihin samaan versioon).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const SUNI_UI = '0.1.1';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('vendor/suni-ui on sovittu versio', () => {
  assert.equal(read('vendor/suni-ui/VERSION').trim(), SUNI_UI);
  assert.match(read('vendor/suni-ui/suni-ui.js'), new RegExp("VERSION: '" + SUNI_UI.replace(/\./g, '\\.') + "'"));
});
test('index.html lataa kitin ennen omia tyylejä, teema aurora', () => {
  const h = read('index.html');
  const css = h.indexOf('vendor/suni-ui/suni-ui.css'), theme = h.indexOf('vendor/suni-ui/themes/aurora.css'),
    js = h.indexOf('vendor/suni-ui/suni-ui.js'), style = h.indexOf('<style>');
  assert.ok(css > 0 && theme > css && js > 0 && style > theme && style > js);
});
test('service worker ja julkaisu sisältävät kitin', () => {
  assert.match(read('sw.js'), /vendor\/suni-ui\/suni-ui\.css/);
  assert.match(read('.github/actions/publish-pages/action.yml'), /cp -r vendor/);
  assert.match(read('scripts/build-app.mjs'), /'vendor'/);
});
