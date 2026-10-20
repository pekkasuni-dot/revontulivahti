// Tilapäinen (poistetaan ennen yhdistämistä): sama näkymä kuin käyttäjän Windy-kuvassa
// (Pohjois-Skandinavia, 1568 x 747). MapLibre-zoom = Leaflet-zoom - 1.
import { chromium } from 'playwright';
const BASE = 'http://localhost:8080/index.html';
const VIEWS = [['windy-nakyma', 17.33, 68.1, 5.25], ['z4.5', 17.33, 68.1, 4.5], ['z6', 17.33, 68.1, 6], ['z7', 17.33, 68.1, 7]];
const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
for(const [name, lon, lat, z] of VIEWS){
  const ctx = await browser.newContext({viewport: {width: 1568, height: 747}, locale: 'fi-FI', serviceWorkers: 'block'});
  const page = await ctx.newPage();
  await page.goto(BASE, {waitUntil: 'load', timeout: 120000});
  await page.waitForFunction(() => typeof state !== 'undefined' && state.secondaryLoads && map && map.loaded(), null, {timeout: 90000});
  await page.evaluate(() => { if(state.cloudsOn) toggleClouds(); if(state.auroraOn) toggleAurora(); });
  await page.evaluate(([lon, lat, z]) => map.jumpTo({center: [lon, lat], zoom: z}), [lon, lat, z]);
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => map.areTilesLoaded(), null, {timeout: 90000}).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({path: `${name}.png`});
  console.log(name, 'zoom', await page.evaluate(() => map.getZoom().toFixed(2)));
  await ctx.close();
}
await browser.close();
