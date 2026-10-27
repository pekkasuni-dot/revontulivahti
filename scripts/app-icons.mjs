#!/usr/bin/env node
// Sovelluksen kuvakkeet YHDESTÄ lähdekuvasta (2026-10-27, ks. OHJE-kaupat.md "Kuvakkeen vaihto"):
//   assets/kuvake.png  1024 x 1024 PNG, ei läpinäkyvyyttä.
// Luo: iOS-kuvake + käynnistyskuva (ios/), Android-kuvakkeet (myös adaptiivinen) + käynnistyskuva
// (android/) sekä PWA-kuvakkeet icons/icon-192.png, icon-512.png ja icon-512-maskable.png.
// Android rajaa kuvakkeen ympyräksi tai pyöreäkulmaiseksi: tärkeä sisältö keskelle (halkaisija
// n. 60 % kuvan leveydestä). iOS pyöristää kulmat itse.
//   node scripts/app-icons.mjs [lähdekuva.png]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const SRC = process.argv[2] || 'assets/kuvake.png';
const TMP = 'build/app-icons';
const BG = '#0A1224';   // käynnistyskuvan tausta = sovelluksen tausta (manifest background_color)

const meta = await sharp(SRC).metadata();
if(meta.width !== 1024 || meta.height !== 1024) throw new Error(`${SRC}: koko ${meta.width} x ${meta.height}, pitää olla 1024 x 1024`);
if(meta.hasAlpha){
  const {channels} = await sharp(SRC).stats();
  if(channels[3].min < 255) throw new Error(`${SRC}: kuvassa on läpinäkyvyyttä (iOS-kuvake ei salli sitä)`);
}
const src = await sharp(SRC).removeAlpha().png().toBuffer();

fs.rmSync(TMP, {recursive: true, force: true});
fs.mkdirSync(TMP, {recursive: true});
await sharp(src).toFile(path.join(TMP, 'icon-only.png'));
// Adaptiivinen Android-kuvake: koko kuva taustakerroksena, läpinäkyvä etuala.
await sharp(src).toFile(path.join(TMP, 'icon-background.png'));
await sharp({create: {width: 1024, height: 1024, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}}).png().toFile(path.join(TMP, 'icon-foreground.png'));
// Käynnistyskuva: kuvake (pyöristetyt kulmat) keskellä tummalla taustalla.
const S = 2732, K = 512, R = Math.round(K * 0.225);
const rounded = await sharp(src).resize(K, K).composite([{input: Buffer.from(
  `<svg width="${K}" height="${K}"><rect width="${K}" height="${K}" rx="${R}" ry="${R}"/></svg>`), blend: 'dest-in'}]).png().toBuffer();
for(const f of ['splash.png', 'splash-dark.png'])
  await sharp({create: {width: S, height: S, channels: 3, background: BG}})
    .composite([{input: rounded, left: (S - K) / 2, top: (S - K) / 2}]).png().toFile(path.join(TMP, f));

// Capacitorin pohjan oletuskäynnistyskuvat pois (ei viitattu Contents.jsonissa).
const SPLASH_DIR = 'ios/App/App/Assets.xcassets/Splash.imageset';
for(const f of fs.existsSync(SPLASH_DIR) ? fs.readdirSync(SPLASH_DIR) : [])
  if(/^splash-2732x2732/.test(f)) fs.rmSync(path.join(SPLASH_DIR, f));
execFileSync('npx', ['capacitor-assets', 'generate', '--ios', '--android', '--assetPath', TMP,
  '--iconBackgroundColor', BG, '--splashBackgroundColor', BG, '--splashBackgroundColorDark', BG], {stdio: 'inherit'});

// PWA (verkkoversio): maskable-kuvakkeen turva-alue on keskimmäinen 80 %.
for(const [f, n] of [['icons/icon-192.png', 192], ['icons/icon-512.png', 512], ['icons/icon-512-maskable.png', 512]])
  await sharp(src).resize(n, n, {kernel: 'lanczos3'}).png({compressionLevel: 9}).toFile(f);
fs.rmSync(TMP, {recursive: true, force: true});
console.log('Kuvakkeet luotu: ios/, android/, icons/icon-192.png, icons/icon-512.png, icons/icon-512-maskable.png');
