// Käännösavainten tarkistus (2026-10): node scripts/check-i18n.mjs
// 1) jokaisella kielellä (fi/en/zh-Hans) samat avaimet,
// 2) jokainen index.html:ssä kiinteänä käytetty avain (t('x'), data-i18n="x",
//    data-i18n-aria, data-i18n-title) löytyy i18n.js:stä.
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
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const used = new Set();
for (const re of [/\bt\('([\w.-]+)'[,)]/g, /data-i18n(?:-aria|-title)?="([\w.-]+)"/g])
  for (const m of html.matchAll(re)) used.add(m[1]);
const undef = [...used].filter(k => !all.has(k));
if (undef.length) { bad++; console.log(`index.html käyttää määrittelemättömiä avaimia: ${undef.join(', ')}`); }
console.log(bad ? 'VIRHE' : `OK: ${langs.join('/')} - ${all.size} avainta, ${used.size} kiinteää käyttöä index.html:ssä`);
process.exit(bad ? 1 : 0);
