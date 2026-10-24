#!/usr/bin/env node
// Pilvidatan latausmittaus (2026-10-24, MUISTIO-lataus.md "PNG kaikille malleille").
//
//   node scripts/measure-cloud-load.mjs --data=<kansio> [--model=harmonie] [--runs=3]
//
// Palvelee sovelluksen paikallisesti ja <kansio>/clouds-*.json -tiedostot gzip-
// pakattuina (kuten GitHub Pages). Chromium hidastetaan "Slow 4G" -tasolle
// (Lighthousen mobiiliprofiili: 1,6 Mbit/s alas, 750 kbit/s ylös, RTT 150 ms,
// CPU 4x hitaampi). Mittaa ajan sivun avauksesta siihen, kun valitun mallin
// nykyhetken askel on purettu muistiin (= pilvikuva voidaan piirtää heti), sekä
// ladattujen pilvitiedostojen koon (siirretyt tavut, gzip). Muu ulkoinen data
// korvataan scripts/screenshots/offline-fixtures.mjs:n synteettisellä datalla.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fx from './screenshots/offline-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if(!args.data){ console.error('Anna --data=<kansio>'); process.exit(1); }
const DATA = path.resolve(args.data), MODEL = args.model || 'harmonie', RUNS = +(args.runs || 3);
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml'};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = /^data\/clouds-/.test(rel) ? path.join(DATA, rel.slice(5)) : path.join(ROOT, rel);
  if(!fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); return res.end(); }
  const body = fs.readFileSync(file), type = MIME[path.extname(file)] || 'application/octet-stream';
  if(/gzip/.test(req.headers['accept-encoding'] || '') && /json|javascript|html|css/.test(type)){
    res.writeHead(200, {'Content-Type': type, 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store'});
    return res.end(zlib.gzipSync(body, {level: 6}));
  }
  res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'}); res.end(body);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const json = (route, o) => route.fulfill({body: typeof o === 'string' ? o : JSON.stringify(o), contentType: 'application/json'});
function routeOther(route){
  const url = route.request().url();
  if(url.startsWith(BASE)) return route.continue();
  if(url.includes('ovation_aurora_latest')) return json(route, fx.ovationFixture());
  if(url.includes('planetary-k-index-forecast')) return json(route, fx.kpForecastFixture());
  if(url.includes('planetary-k-index')) return json(route, fx.kpFixture());
  if(url.includes('rtsw_mag_1m')) return json(route, fx.magFixture());
  if(url.includes('rtsw_wind_1m')) return json(route, fx.solarWindFixture());
  if(url.includes('tiles.openfreemap.org/planet') && !url.includes('.pbf'))
    return json(route, {tilejson: '2.2.0', tiles: [BASE + '__tiles/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14});
  return route.fulfill({status: 404, body: ''});
}

const browser = await chromium.launch();
const results = [];
for(let run = 0; run < RUNS; run++){
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, serviceWorkers: 'block'});
  await ctx.addInitScript(m => { try{ localStorage.setItem('rv-cloud-model', m); }catch(e){} }, MODEL);
  await ctx.route('**/*', routeOther);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150,
    downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const sizes = new Map();
  cdp.on('Network.loadingFinished', e => sizes.set(e.requestId, e.encodedDataLength));
  const urls = new Map();
  cdp.on('Network.responseReceived', e => urls.set(e.requestId, e.response.url));
  await page.goto(BASE + 'index.html', {waitUntil: 'commit'});
  const t = await page.waitForFunction(() => {
    const g = typeof state !== 'undefined' && state.cloudGrid;
    if(!g || !g.steps || !g.steps.size) return false;
    return performance.now();
  }, null, {timeout: 120000, polling: 50});
  const ms = await t.jsonValue();
  const files = [...urls].filter(([id, u]) => /clouds-/.test(u)).map(([id, u]) => ({file: u.split('/').pop().split('?')[0], bytes: sizes.get(id) || 0}));
  results.push({ms: Math.round(ms), files});
  await ctx.close();
}
await browser.close(); server.close();
const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
console.log(`MALLI ${MODEL}, data ${path.basename(DATA)}: aika pilvikuvaan ${results.map(r => r.ms).join(' / ')} ms (ka. ${avg} ms)`);
for(const f of results[0].files) console.log(`  ${f.file}: ${(f.bytes / 1024).toFixed(1)} kt siirretty`);
