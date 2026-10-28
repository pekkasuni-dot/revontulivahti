#!/usr/bin/env node
// Capacitor-sovelluksen verkkosisältö (2026-10-27): kopioi sovelluskuoren www/-kansioon,
// josta `npx cap sync` paketoi sen iOS- ja Android-sovellukseen. Sovellus EI lataa sivua
// verkosta: index.html, skriptit, kuvakkeet, MapLibre (lib/) ja fontit ovat paketissa.
// Data (pilvet, tuuli, kamerat, 7 vrk) haetaan kuten verkkoversiossa, mutta julkaistulta
// GitHub Pages -sivulta (data-data-base, sama mekanismi kuin haaran esikatselussa).
// Service workeria ei rekisteröidä (data-native). Ks. OHJE-kaupat.md.
//   node scripts/build-app.mjs [--data-base URL]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'www');
const arg = process.argv.indexOf('--data-base');
const DATA_BASE = arg > 0 ? process.argv[arg + 1] : 'https://pekkasuni-dot.github.io/revontulivahti/';
// Samat tiedostot kuin verkkoversiossa (publish-pages), paitsi sw.js (ei service workeria).
const FILES = ['index.html', 'i18n.js', 'aurora-core.js', 'features.js', 'manifest.webmanifest'];
const DIRS = ['icons', 'lib', 'fonts'];

fs.rmSync(OUT, {recursive: true, force: true});
fs.mkdirSync(OUT, {recursive: true});
for(const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
for(const d of DIRS) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), {recursive: true});

const p = path.join(OUT, 'index.html');
const html = fs.readFileSync(p, 'utf8');
const tag = '<html lang="fi">';
if(!html.includes(tag)) throw new Error('index.html: <html lang="fi"> puuttuu');
// Capacitorin JS-ydin (registerPlugin): natiivisilta (native-bridge.js) EI sisällä sitä, joten
// ilman tätä Haptics- ja Preferences-lisäosat jäivät kytkemättä (2026-10-27: haptiikka ei toiminut,
// omat paikat menivät localStorageen). Ladataan ennen sovelluksen skriptejä.
fs.copyFileSync(path.join(ROOT, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(OUT, 'capacitor.js'));
const firstScript = '<script src="i18n.js"></script>';
if(!html.includes(firstScript)) throw new Error('index.html: i18n.js-skriptitagi puuttuu');
fs.writeFileSync(p, html
  .replace(tag, `<html lang="fi" data-data-base="${DATA_BASE}" data-native="1">`)
  .replace(firstScript, '<script src="capacitor.js"></script>\n' + firstScript));

const ver = (html.match(/APP_VERSION = 'v([\d.]+)'/) || [])[1];
if(!ver) throw new Error('APP_VERSION puuttuu');
fs.writeFileSync(path.join(OUT, 'app-version.txt'), ver + '\n');
let n = 0; const walk = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : n++); walk(OUT);
console.log(`www/: ${n} tiedostoa, versio ${ver}, data ${DATA_BASE}`);
