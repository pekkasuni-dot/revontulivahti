#!/usr/bin/env node
// Sovelluskuvakkeet ja käynnistyskuva (2026-10-27) icons/logo.svg:n piirroksesta:
// assets/*.png (lähdekuvat @capacitor/assets-työkalulle), sitten
//   npx capacitor-assets generate --ios --android
// iOS-kuvake: koko neliö taustana (Apple pyöristää itse, ei läpinäkyvyyttä).
// Android: adaptiivinen kuvake (etuala 66 %:n turva-alueella + tausta) ja käynnistyskuva.
import {chromium} from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync('icons/logo.svg', 'utf8');
const inner = svg.replace(/^[\s\S]*?<defs>/, '<defs>').replace(/<\/svg>\s*$/, '');
const defs = inner.match(/<defs>[\s\S]*?<\/defs>/)[0];
const mark = inner.replace(/<defs>[\s\S]*?<\/defs>/, '').replace(/<rect[^>]*\/>/, '').replace(/<!--[\s\S]*?-->/g, '');
const bg = '<rect width="64" height="64" fill="url(#b)"/>';
// Kuvio keskitettynä: s = osuus kuvan leveydestä.
const scaled = s => `<g transform="translate(${32 - 32 * s} ${32 - 32 * s}) scale(${s})">${mark}</g>`;
const page = (body, size, bgColor = 'transparent') =>
  `<html><body style="margin:0;background:${bgColor}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">${defs}${body}</svg></body></html>`;
const jobs = [
  ['assets/icon-only.png', page(bg + scaled(0.86), 1024)],
  ['assets/icon-foreground.png', page(scaled(0.62), 1024)],
  ['assets/icon-background.png', page(bg, 1024)],
  ['assets/splash.png', page('<rect width="64" height="64" fill="#0A1224"/>' + `<g transform="translate(26 26) scale(.1875)">${defs}<rect width="64" height="64" rx="15" fill="url(#b)"/>${mark}</g>`, 2732)],
];
jobs.push(['assets/splash-dark.png', jobs[3][1]]);
const b = await chromium.launch();
for(const [file, html] of jobs){
  const size = /2732/.test(html) ? 2732 : 1024;
  const p = await b.newPage({viewport: {width: size, height: size}});
  await p.setContent(html);
  await p.screenshot({path: file, omitBackground: file.includes('foreground'), clip: {x: 0, y: 0, width: size, height: size}});
  await p.close();
  console.log(file);
}
await b.close();
