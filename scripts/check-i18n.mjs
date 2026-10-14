// Käännösavainten tarkistus (2026-10): node scripts/check-i18n.mjs
// 1) jokaisella kielellä (kaikki I18N-kielet) samat avaimet,
// 2) jokainen index.html:ssä kiinteänä käytetty avain (t('x'), data-i18n="x",
//    data-i18n-aria, data-i18n-title) löytyy i18n.js:stä,
// 3) jokaisen käännöksen paikkamerkit ovat samat kuin englanninkielisessä.
// Dynaamisesti kootut avaimet (t('verdict.' + k + '.title')) jäävät tarkistamatta.
// Palauttaa virhekoodin 1, jos jotain puuttuu.
import fs from 'fs';
import vm from 'vm';
const root = new URL('..', import.meta.url);
const src = fs.readFileSync(new URL('i18n.js', root), 'utf8');
const ctx = {navigator: {languages: []}, localStorage: {getItem: () => null, setItem() {}}, document: {}};
vm.runInNewContext(src + '\n;this.__I18N = I18N;', ctx);
const I18N = ctx.__I18N;
const langs = Object.keys(I18N);
const all = new Set(langs.flatMap(l => Object.keys(I18N[l])));
let bad = 0;
for (const l of langs) {
  const miss = [...all].filter(k => !(k in I18N[l]));
  if (miss.length) { bad++; console.log(`${l}: puuttuu ${miss.length}: ${miss.join(', ')}`); }
}
// 3) paikkamerkit ({h}, {model} ...) samat kuin englanniksi
const vars = v => [...String(v).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
for (const l of langs) for (const k of Object.keys(I18N[l])) {
  if (k in I18N.en && vars(I18N[l][k]) !== vars(I18N.en[k])) { bad++; console.log(`${l}: ${k} paikkamerkit {${vars(I18N[l][k])}} != en {${vars(I18N.en[k])}}`); }
}
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const used = new Set();
for (const re of [/\bt\('([\w.-]+)'[,)]/g, /data-i18n(?:-aria|-title)?="([\w.-]+)"/g])
  for (const m of html.matchAll(re)) used.add(m[1]);
const undef = [...used].filter(k => !all.has(k));
if (undef.length) { bad++; console.log(`index.html käyttää määrittelemättömiä avaimia: ${undef.join(', ')}`); }
console.log(bad ? 'VIRHE' : `OK: ${langs.join('/')} - ${all.size} avainta, ${used.size} kiinteää käyttöä index.html:ssä`);
process.exit(bad ? 1 : 0);
