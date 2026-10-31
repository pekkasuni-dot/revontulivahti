#!/usr/bin/env node
// Sovelluksen kuvakkeet YHDESTÄ lähdekuvasta (2026-10-27, ks. OHJE-kaupat.md "Kuvakkeen vaihto"):
//   assets/kuvake.png  1024 x 1024 PNG, ei läpinäkyvyyttä.
// Luo: iOS-kuvake + käynnistyskuva (ios/), Android-kuvakkeet (myös adaptiivinen) + käynnistyskuva
// (android/) sekä PWA-kuvakkeet icons/icon-192.png, icon-512.png ja icon-512-maskable.png.
// Android rajaa kuvakkeen ympyräksi tai pyöreäkulmaiseksi: tärkeä sisältö keskelle (halkaisija
// n. 60 % kuvan leveydestä). iOS pyöristää kulmat itse.
//   node scripts/app-icons.mjs [lähdekuva.png]
// Kehitysversion "Aurora Dev" kuvake (2026-10-31): sama kuva + DEV-nauha alareunassa ->
// ios/App/App/Assets.xcassets/AppIcon-Dev.appiconset (Xcode-konfiguraatio Dev). Luodaan aina;
// pelkkä Dev-kuvake (muut ennallaan): node scripts/app-icons.mjs --dev-only
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ARGS = process.argv.slice(2);
const DEV_ONLY = ARGS.includes('--dev-only');
const SRC = ARGS.find(a => !a.startsWith('--')) || 'assets/kuvake.png';
const TMP = 'build/app-icons';
const BG = '#0A1224';   // käynnistyskuvan tausta = sovelluksen tausta (manifest background_color)

const meta = await sharp(SRC).metadata();
if(meta.width !== 1024 || meta.height !== 1024) throw new Error(`${SRC}: koko ${meta.width} x ${meta.height}, pitää olla 1024 x 1024`);
if(meta.hasAlpha){
  const {channels} = await sharp(SRC).stats();
  if(channels[3].min < 255) throw new Error(`${SRC}: kuvassa on läpinäkyvyyttä (iOS-kuvake ei salli sitä)`);
}
const src = await sharp(SRC).removeAlpha().png().toBuffer();

// DEV-nauha: oranssi vaakakaista alareunassa, valkoinen "DEV" viivoina (ei fonttia -> sama tulos kaikkialla).
// Kaista pysyy iOS:n pyöristettyjen kulmien sisällä (alareunasta 120 px ylöspäin, kulmasäde ~225 px
// leikkaa vain kaistan päistä).
async function devIcon(){
  const W = 1024, Y0 = 704, H = 200, cy = Y0 + H / 2, h = 112, w = 80, sw = 26, g = 46;
  const x1 = (W - (3 * w + 2 * g)) / 2, x2 = x1 + w + g, x3 = x2 + w + g, t = cy - h / 2, b = cy + h / 2;
  const svg = `<svg width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="${Y0}" width="${W}" height="${H}" fill="#FF6A2B"/>
    <rect x="0" y="${Y0}" width="${W}" height="6" fill="#0B1630" opacity=".35"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="${sw}" stroke-linejoin="miter" stroke-linecap="square">
      <path d="M${x1} ${t} V${b} H${x1 + w * .45} Q${x1 + w} ${b} ${x1 + w} ${cy} Q${x1 + w} ${t} ${x1 + w * .45} ${t} Z"/>
      <path d="M${x2 + w} ${t} H${x2} V${b} H${x2 + w} M${x2} ${cy} H${x2 + w * .82}"/>
      <path d="M${x3} ${t} L${x3 + w / 2} ${b} L${x3 + w} ${t}" stroke-linecap="butt" stroke-linejoin="bevel"/>
    </g></svg>`;
  const dir = 'ios/App/App/Assets.xcassets/AppIcon-Dev.appiconset';
  fs.mkdirSync(dir, {recursive: true});
  await sharp(src).composite([{input: Buffer.from(svg)}]).removeAlpha().png({compressionLevel: 9})
    .toFile(path.join(dir, 'AppIcon-512@2x.png'));
  fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify({
    images: [{idiom: 'universal', size: '1024x1024', filename: 'AppIcon-512@2x.png', platform: 'ios'}],
    info: {author: 'xcode', version: 1}}, null, 2) + '\n');
  console.log('Dev-kuvake luotu: ' + dir);
}
await devIcon();
if(DEV_ONLY) process.exit(0);

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
