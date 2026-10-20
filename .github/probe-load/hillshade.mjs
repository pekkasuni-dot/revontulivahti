// Tilapäinen vertailu (poistetaan ennen yhdistämistä): maaston varjostuksen
// korkeustiilien enimmäistarkkuus (sourceMaxZoom) 11 (nyt) / 10 / 8.
// Sama näkymä kolmella arvolla rinnakkain, pilvet ja revontulet pois.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'http://localhost:8080/';
const VARIANTS = [11, 10, 8];
const PLACES = [['lofootit', 68.20, 14.20], ['harstad', 68.80, 16.55]];
const ZOOMS = [5, 7, 10, 13];
const html = fs.readFileSync('index.html', 'utf8');
const results = [];
fs.mkdirSync('hs', {recursive: true});
const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
for(const [place, lat, lon] of PLACES) for(const z of ZOOMS) for(const v of VARIANTS){
  const ctx = await browser.newContext({viewport: {width: 390, height: 600}, deviceScaleFactor: 2, locale: 'fi-FI', serviceWorkers: 'block'});
  await ctx.addInitScript(() => { try{ localStorage.setItem('rv-lang', 'fi'); }catch(e){} });
  let bytes = 0, n = 0;
  await ctx.route(BASE + 'index.html', r => r.fulfill({contentType: 'text/html', body: html.replace(/sourceMaxZoom: 11,/, `sourceMaxZoom: ${v},`)}));
  await ctx.route(BASE, r => r.fulfill({contentType: 'text/html', body: html.replace(/sourceMaxZoom: 11,/, `sourceMaxZoom: ${v},`)}));
  const page = await ctx.newPage();
  page.on('response', async res => { if(res.url().includes('elevation-tiles')){ try{ const b = await res.body(); bytes += b.length; n++; }catch(e){} } });
  await page.goto(BASE + 'index.html', {waitUntil: 'load', timeout: 120000});
  await page.waitForFunction(() => typeof map !== 'undefined' && map && map.loaded && map.loaded(), null, {timeout: 60000});
  await page.evaluate(() => { if(state.cloudsOn) toggleClouds(); if(state.auroraOn) toggleAurora(); startSecondaryLoads(); });
  await page.addStyleTag({content: 'body > :not(#map){display:none !important} .maplibregl-control-container{display:none !important}'});
  bytes = 0; n = 0;
  await page.evaluate(([lat, lon, z]) => map.jumpTo({center: [lon, lat], zoom: z}), [lat, lon, z]);
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => map.areTilesLoaded(), null, {timeout: 90000}).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({path: `hs/${place}-z${z}-mz${v}.png`});
  results.push({place, z, v, kt: Math.round(bytes/1024), tiles: n});
  console.log(place, 'z' + z, 'maxzoom', v, ':', Math.round(bytes/1024), 'kt', n, 'tiiltä');
  await ctx.close();
}
await browser.close();
fs.writeFileSync('hs/tulokset.json', JSON.stringify(results, null, 1));
