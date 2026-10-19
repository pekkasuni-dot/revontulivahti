#!/usr/bin/env node
// Kuvakaappaukset testikoista (ks. CLAUDE.md "Testikoot").
//
//   npm run screenshots                     kaikki testikoot, kaikki tilat
//   npm run screenshots -- --quick          vähimmäissetti: 360x640, 430x932, työpöytä
//   npm run screenshots -- --landscape      lisäksi vaakanäkymä 844x390
//   npm run screenshots -- --sizes=360x640,1440x900 --states=kartta,info
//      tilat: kartta, saa, info, asetukset (oletus) + infovihje, karttapohja, kamera, kaynnistys,
//      lahteet (Tietoja ja lähteet -ikkuna auki), satelliitti, tuuli,
//      nyt (avaruussäälaatikot), kaavio-bz, kaavio-kp, kaavio-vanha (historiakaaviot),
//      tiheys-keski, tiheys-oikea, tiheys-vasen, bz-saapunut, kp24-nyt, kp3-nyt,
//      kp3-arvio, kp3-ennuste, gw-24h (arvoikkuna), pilvi-nyt (pilvisyyskaavio),
//      viikko, viikko-yo2, viikko-yo5 (7 vrk -lista ja tuntinäkymä)
//   npm run screenshots -- --time=2026-10-19T03:30+03:00   simuloitu kello
//   npm run screenshots -- --states=tuuli --views=25.5,67.5,4/25.5,67.5,6   (lon,lat,zoom)
//   npm run screenshots -- --lang=en        käyttöliittymän kieli (fi, en, zh, es, fr)
//   npm run screenshots -- --offline        synteettinen data, ei verkkoa (ks. alla)
//   npm run screenshots -- --no-safe-area   ilman loven/kotipalkin simulointia
//
// Tallentaa docs/kuvakaappaukset/<päivämäärä>/ (ei repossa, .gitignore):
//   <koko>-<tila>.png  + yhteenveto-<tila>.png (kaikki koot rinnakkain).
//
// Toiminta: palvelee repon juurta paikallisesti ja avaa sen Playwrightin
// Chromiumilla. Oletuksena oikea verkko (pohjakartta, NOAA, CDN); data/-
// tiedostot, joita ei ole paikallisesti (botin data on vain gh-pagesilla),
// haetaan julkaistulta sivulta. --offline korvaa kaiken ulkoisen synteettisellä
// datalla (pohjakartta = tyhjä tausta + maiden nimet) - asettelun tarkistukseen
// ympäristössä, josta ei pääse verkkoon.
//
// Service Worker estetään (ei välimuistia ajojen välillä). Lovi/Dynamic Island ja
// kotipalkki simuloidaan Chromiumin CDP-komennolla Emulation.setSafeAreaInsetsOverride
// (env(safe-area-inset-*) saa arvot SAFE_AREA-taulukosta). Kaikki on simulaatiota:
// kosketuseleet, paikannus ja oikea kotipalkki tarkistetaan oikealla puhelimella.
//
// Ensimmäisellä kerralla omalla koneella: npm install && npx playwright install chromium

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fx from './screenshots/offline-fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES_URL = 'https://pekkasuni-dot.github.io/revontulivahti/';

// Testikoot (pystynäkymä) - sama lista kuin CLAUDE.md:ssä.
// insets = oletettu safe-area asennettuna sovelluksena (pahin tapaus):
// iPhone 14 -luokka 47/34, Dynamic Island 59/34, Android tilapalkki 24 +
// eleviiva 16, iPad 24/20. Selaimen välilehdessä arvot ovat yleensä pienemmät.
const SIZES = [
  {id: 'pieni-puhelin', w: 360,  h: 640,  mobile: true,  insets: {top: 24, bottom: 0,  left: 0, right: 0}},
  {id: 'iphone',        w: 390,  h: 844,  mobile: true,  insets: {top: 47, bottom: 34, left: 0, right: 0}},
  {id: 'iso-iphone',    w: 430,  h: 932,  mobile: true,  insets: {top: 59, bottom: 34, left: 0, right: 0}},
  {id: 'android',       w: 412,  h: 915,  mobile: true,  insets: {top: 24, bottom: 16, left: 0, right: 0}},
  {id: 'tabletti',      w: 820,  h: 1180, mobile: true,  insets: {top: 24, bottom: 20, left: 0, right: 0}},
  {id: 'tyopoyta',      w: 1440, h: 900,  mobile: false, insets: {top: 0,  bottom: 0,  left: 0, right: 0}},
];
const LANDSCAPE = {id: 'vaaka', w: 844, h: 390, mobile: true, insets: {top: 0, bottom: 21, left: 47, right: 47}};
const QUICK = ['pieni-puhelin', 'iso-iphone', 'tyopoyta'];

// Tilat: mitä avataan ennen kuvaa. Oletuksena DEFAULT_STATES; lisäksi
// karttapohja (valikko auki), kamera (ensimmäisen kameran kortti) ja
// kaynnistys (OSM-maininta logon alla, kuvataan 1,5 s latauksen alusta).
const STATES = {
  kartta:    async () => {},
  saa:       async page => { await page.click('#weatherBtn'); },
  info:      async page => { await page.click('#infoBar'); },
  // Infoikkuna, kytkin ilman valittua pistettä: "Valittu piste" himmeä ja
  // sen napautuksen vihje koordinaattirivillä.
  infovihje: async page => {
    await page.evaluate(() => { if(state.point) clearPoint(); });
    await page.click('#infoBar');
    await page.waitForTimeout(400);
    await page.click('#locPointBtn', {force: true});   // aria-disabled -> force
  },
  asetukset: async page => { await page.click('#settingsBtn'); },
  karttapohja: async page => { await page.click('#mapStyleBtn'); },
  // Tuulianimaatio näkyviin: tuuli päälle, pilvet pois (hiukkaset erottuvat), valikko kiinni.
  tuuli:     async page => {
    await page.click('#weatherBtn');
    await page.click('#windOptBtn');
    if(await page.evaluate(() => state.cloudsOn)) await page.click('#cloudOptBtn');
    await page.click('#weatherBtn');
  },
  lahteet:   async page => {
    await page.click('#settingsBtn');
    await page.click('#aboutBtn');   // lasimainen "Tietoja ja lähteet" -ikkuna asetusten päällä
  },
  satelliitti: async page => {
    await page.click('#mapStyleBtn');
    await page.click('#mapStylePanel [data-style="satellite"]');
    await page.mouse.click(10, 300);   // sulje valikko (kartan napautus)
  },
  kamera:    async page => {
    await page.waitForFunction(() => typeof state !== 'undefined' && state.cameras && state.cameras.length, null, {timeout: 15000})
      .catch(() => page.click('#camerasBtn'));
    await page.waitForFunction(() => state.cameras && state.cameras.length, null, {timeout: 15000});
    await page.evaluate(() => openCameraCard(state.cameras[0].id));
  },
  // Kamerat Workerin kautta (simuloitu): kartalla vain live-kamerat, "kuva"-
  // kortti (Levi), "soitin"-kortti (Posio), ei live (Lyngen North), päättyi (Levi).
  'kamerat-kartta': async page => { await camApi(page); await page.mouse.click(10, 400); },
  'kamera-kuva':    async page => { await camApi(page); await page.evaluate(() => openCameraCard('levi')); await page.waitForTimeout(500); },
  'kamera-soitin':  async page => { await camApi(page); await page.evaluate(() => openCameraCard('posio')); await page.waitForTimeout(500); },
  'kamera-eilive':  async page => { await camApi(page); await page.evaluate(() => openCameraCard('lyngen-north')); },
  'kamera-paattyi': async page => {
    await camApi(page);
    await page.evaluate(() => openCameraCard('levi'));
    await page.evaluate(async () => { CAMERA_API.url += '?ended=levi'; await refreshCameraLive(); });
  },
  'kamerat-kaikki': async page => { await camApi(page); await page.evaluate(() => openCameraGrid()); await page.waitForTimeout(500); },
  // Nyt-välilehti vieritettynä avaruussäähän (kaavion avaavien laatikoiden kuvakkeet).
  nyt:       async page => {
    await page.click('#infoBar');
    await page.waitForTimeout(600);
    await page.evaluate(() => document.getElementById('swGrid').scrollIntoView({block: 'center'}));
  },
  // Avaruussään historiakaaviot (2026-10). kaavio-bz: 6 h, tarkastelu käynnissä
  // (painallus pidetään pohjassa kuvan ajan) ja "Saapunut Maahan" -viiva.
  'kaavio-bz': async page => {
    await openChart(page, 'bz');
    const b = await page.locator('#scChart').boundingBox();
    await page.mouse.move(b.x + b.width*0.55, b.y + b.height*0.5);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.move(b.x + b.width*0.62, b.y + b.height*0.5, {steps: 4});
  },
  // Kp 3 vrk: mitattu ja ennuste eroteltuina "Nyt"-viivalla.
  'kaavio-kp': async page => { await openChart(page, 'kp'); await page.click('#scRange button:nth-child(2)'); },
  // Mittauskatko (fixtuurin aukko) ja vanhentunut data: viimeiset 40 min poistettu.
  'kaavio-vanha': async page => {
    await page.click('#infoBar');
    await page.waitForFunction(() => swx.mag && swx.mag.length);
    await page.evaluate(() => { const cut = Date.now() - 40*60e3; swx.mag = swx.mag.filter(r => r.t < cut); renderSpaceWx(); });
    await page.evaluate(() => openSwChart('bz'));
    await page.click('#scRange button:nth-child(3)');
  },
  // Kaavioiden arvoikkuna (3. kierros): tiheys keskellä ja reunoilla, Bz
  // "Saapunut Maahan" -viivalla, Kp "Nyt"-viivalla / arviojaksolla
  // / ennusteessa, GW 24 h (käytä --time=...T03:30+03:00 nähdäksesi datan alun).
  'tiheys-keski':  async page => { await openChart(page, 'density'); await scrubAt(page, .5); },
  'tiheys-oikea':  async page => { await openChart(page, 'density'); await scrubAt(page, .995); },
  'tiheys-vasen':  async page => { await openChart(page, 'density'); await scrubAt(page, .1, 1); },
  'bz-saapunut':   async page => { await openChart(page, 'bz'); await scrubAt(page, markAt('Saapunut')); },
  'kp24-nyt':      async page => { await openChart(page, 'kp'); await scrubAt(page, .999); },
  'kp3-nyt':       async page => { await openChart(page, 'kp', 2); await scrubAt(page, () => document.querySelector('#scChart .ch-mark').getBoundingClientRect().left); },
  'kp3-arvio':     async page => { await openChart(page, 'kp', 2); await scrubAt(page, () => { const r = document.querySelector('#scChart .ch-step.est').getBoundingClientRect(); return r.left + r.width*0.25; }); },
  'kp3-ennuste':   async page => { await openChart(page, 'kp', 2); await scrubAt(page, () => { const r = document.querySelector('#scChart .ch-step.fc').getBoundingClientRect(); return r.left + r.width*0.6; }); },
  // Pilvisyyskaavio (2026-10): Nyt-ruudun Pilvisyys-laatikosta, tarkastelu "Nyt"-viivalla.
  'pilvi-nyt':     async page => {
    await page.click('#infoBar');
    await page.waitForTimeout(800);
    await page.click('#cloudChip');
    await page.waitForTimeout(1200);
    await scrubAt(page, markAt('Nyt'));
  },
  'gw-24h':        async page => { await openChart(page, 'power', 3); },
  // 7 vrk (2026-10): lista ja yön 2 / yön 5 tuntinäkymä.
  viikko:          async page => { await openWeek(page); },
  'viikko-yo2':    async page => { await openWeek(page); await page.click('#weekList .wk-row[data-k="1"]'); await page.waitForTimeout(600); },
  'viikko-yo5':    async page => { await openWeek(page); await page.click('#weekList .wk-row[data-k="4"]'); await page.waitForTimeout(600); },
  // Käynnistys kuvataan heti latauksen alussa (ks. kuvaussilmukka), ei tilafunktiolla.
  kaynnistys: null,
};
// Tarkastelu: vaakasuora veto aktivoi heti ja pito jää päälle kuvan ajaksi.
// at = osuus kaavion leveydestä tai sivulla ajettava funktio, joka palauttaa x:n.
async function scrubAt(page, at, dir = -1){
  const b = await page.locator('#scChart').boundingBox();
  const x = typeof at === 'number' ? b.x + b.width*at : await page.evaluate(at);
  const y = b.y + b.height*0.6;
  await page.mouse.move(x + dir*20, y);
  await page.mouse.down();
  await page.mouse.move(x, y, {steps: 5});
}
// Merkintäviivan x tekstin alun perusteella (esim. "Saapunut Maahan", "Nyt").
const markAt = label => new Function(`const i = [...document.querySelectorAll('#scChart .ch-marklab')].findIndex(e => e.textContent.startsWith(${JSON.stringify(label)}));
  return document.querySelectorAll('#scChart .ch-mark')[Math.max(0, i)].getBoundingClientRect().left;`);
async function openWeek(page){
  await page.click('#infoBar');
  await page.waitForTimeout(500);
  await page.click('#tabBtn7d');
  await page.waitForTimeout(1500);
}
async function openChart(page, key, range){
  await page.click('#infoBar');
  await page.waitForFunction(() => typeof swx !== 'undefined' && swx.mag && swx.mag.length, null, {timeout: 15000});
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('swGrid').scrollIntoView({block: 'center'}));
  await page.click(`#swGrid [data-chart="${key}"]`);
  await page.waitForTimeout(800);
  if(range){ await page.click(`#scRange button:nth-child(${range})`); await page.waitForTimeout(300); }
}
// Oletuksena kuvattavat tilat (muut: --states=...).
const DEFAULT_STATES = ['kartta', 'saa', 'info', 'asetukset'];

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));
const OFFLINE = !!args.offline;
// --time=2026-10-19T03:30+03:00 : simuloitu kello (sivu + offline-fixtuurit).
const SIM_TIME = typeof args.time === 'string' ? new Date(args.time) : null;
if(SIM_TIME && isNaN(SIM_TIME)){ console.error('Virheellinen --time'); process.exit(1); }
if(SIM_TIME) fx.setNow(SIM_TIME.getTime());
// --views=lon,lat,zoom/lon,lat,zoom/... : jokaisesta tilasta kuva jokaisesta
// näkymästä (tiedostonimeen -z<zoom>), esim. tuulianimaation zoomitasot.
const VIEWS = typeof args.views === 'string'
  ? args.views.split('/').map(v => { const [lon, lat, zoom] = v.split(',').map(Number); return {lon, lat, zoom}; })
  : [null];
const SAFE_AREA = !args['no-safe-area'];
const LANG = args.lang || 'fi';

let sizes = SIZES;
if(args.quick) sizes = SIZES.filter(s => QUICK.includes(s.id));
if(typeof args.sizes === 'string'){
  const want = args.sizes.split(',');
  sizes = [...SIZES, LANDSCAPE].filter(s => want.includes(s.id) || want.includes(`${s.w}x${s.h}`));
}
if(args.landscape && !sizes.includes(LANDSCAPE)) sizes = [...sizes, LANDSCAPE];
const states = typeof args.states === 'string' ? args.states.split(',') : DEFAULT_STATES;
for(const s of states) if(!(s in STATES)){ console.error(`Tuntematon tila: ${s} (${Object.keys(STATES).join(', ')})`); process.exit(1); }
if(!sizes.length){ console.error('Ei yhtään kokoa valittuna.'); process.exit(1); }

const day = new Date().toLocaleDateString('sv-SE');   // YYYY-MM-DD paikallista aikaa
const OUT = path.join(ROOT, 'docs', 'kuvakaappaukset', day);
fs.mkdirSync(OUT, {recursive: true});

// --- Paikallinen staattinen palvelin ---
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.css': 'text/css'};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// --- Verkkoreititys ---
const clouds = OFFLINE ? fx.cloudsFixture() : null;
const offlineBodies = OFFLINE ? {
  clouds: JSON.stringify(clouds), wind: JSON.stringify(fx.windFixture(clouds.times)),
  ovation: JSON.stringify(fx.ovationFixture()), mag: JSON.stringify(fx.magFixture()),
  sw: JSON.stringify(fx.solarWindFixture()), power: fx.hemiPowerFixture(), kp: JSON.stringify(fx.kpFixture()),
  kpFc: JSON.stringify(fx.kpForecastFixture()), prop: JSON.stringify(fx.propagatedFixture()),
} : null;
// Offline-korvike kameran pikkukuvalle (yötaivas + revontulikaista).
const THUMB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1430"/><stop offset="1" stop-color="#1c2b3a"/></linearGradient></defs>' +
  '<rect width="480" height="360" fill="url(#g)"/><path d="M0 150C120 90 260 190 480 110v40C260 230 120 130 0 190z" fill="#3df5a2" opacity=".45"/>' +
  '<rect y="300" width="480" height="60" fill="#0a0f14"/><text x="240" y="345" font-family="sans-serif" font-size="16" fill="#8a9" text-anchor="middle">offline-testikuva</text></svg>';
const ML_DIST = path.join(ROOT, 'node_modules', 'maplibre-gl', 'dist');

// Simuloitu kameravälipalvelin (Worker, ks. worker/README.md): kamera-* -tilat
// asettavat CAMERA_API.url = MOCK_CAM_API. Live: kaikki paitsi Lyngen North ja
// Kilpisjärvi; "kamera-paattyi" sammuttaa Levin (?ended=levi).
const MOCK_CAM_API = 'https://camapi.test/cameras';
function mockCameraApi(url){
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cameras.json'), 'utf8'));
  const ended = new URL(url).searchParams.get('ended');
  const now = Date.now(), cameras = {};
  for(const c of cfg.cameras){
    const live = !['lyngen-north', 'kilpisjarvi', ended].includes(c.id);
    const th = 'https://i.ytimg.com/vi/' + c.youtube.videoId + '/maxresdefault_live.jpg';
    cameras[c.id] = {live, liveBroadcastContent: live ? 'live' : 'none', videoId: c.youtube.videoId,
      title: c.name + ' live', channelTitle: c.operator.split(' / ')[0],
      thumbnail: live ? {url: th, width: 1280, height: 720, size: 'maxres'} : null,
      thumbnails: live ? {high: {url: th.replace('maxresdefault', 'hqdefault'), width: 480, height: 360}} : null,
      checkedAt: now - 60e3, updatedAt: live ? now - 3 * 60e3 : null};
  }
  return JSON.stringify({generatedAt: now - 60e3, quota: {day: '', used: 312, budget: 5000}, excludeChannels: [], cameras});
}

// Kameratilat: simuloitu Worker käyttöön ja kamerataso päälle.
async function camApi(page){
  await page.evaluate(url => { CAMERA_API.url = url; state.camLiveAt = 0; }, MOCK_CAM_API);
  await page.click('#camerasBtn');
  await page.waitForFunction(() => state.cameras && state.camLive, null, {timeout: 15000});
  await page.waitForTimeout(700);   // häivytys
}

async function routeOnline(route){
  const u = new URL(route.request().url());
  if(route.request().url().startsWith(MOCK_CAM_API)) return route.fulfill({body: mockCameraApi(route.request().url()), contentType: 'application/json'});
  if(u.origin + '/' === BASE && u.pathname.startsWith('/data/') && !fs.existsSync(path.join(ROOT, u.pathname))){
    try{
      const resp = await route.fetch({url: PAGES_URL + u.pathname.slice(1)});
      return route.fulfill({response: resp});
    }catch(e){ return route.fulfill({status: 404, body: ''}); }
  }
  return route.continue();
}

function routeOffline(route){
  const url = route.request().url(), b = offlineBodies;
  const json = body => route.fulfill({body, contentType: 'application/json'});
  if(url.includes('maplibre-gl') && url.endsWith('.js'))  return route.fulfill({path: path.join(ML_DIST, 'maplibre-gl.js'), contentType: 'text/javascript'});
  if(url.includes('maplibre-gl') && url.endsWith('.css')) return route.fulfill({path: path.join(ML_DIST, 'maplibre-gl.css'), contentType: 'text/css'});
  if(url.startsWith(BASE + 'data/cameras.json')) return route.continue();
  if(url.startsWith(MOCK_CAM_API)) return json(mockCameraApi(url));
  if(url.startsWith(BASE + 'data/wind-ecmwf-')) return json(b.wind);
  if(url.startsWith(BASE + 'data/clouds-ecmwf.json')) return json(b.clouds);
  if(url.includes('ovation_aurora_latest')) return json(b.ovation);
  if(url.includes('planetary-k-index-forecast')) return json(b.kpFc);
  if(url.includes('propagated-solar-wind')) return json(b.prop);
  if(url.includes('planetary-k-index')) return json(b.kp);
  if(url.includes('rtsw_mag_1m')) return json(b.mag);
  if(url.includes('rtsw_wind_1m')) return json(b.sw);
  if(url.includes('i.ytimg.com/vi/')) return route.fulfill({body: THUMB_SVG, contentType: 'image/svg+xml'});
  if(url.includes('hemi-power')) return route.fulfill({body: b.power, contentType: 'text/plain'});
  const e7 = url.match(/\/data\/e7d-(\d+)-(\d+)\.json/);
  if(e7) return json(fx.e7dFixture(+e7[1], +e7[2]));
  if(url.includes('27-day-outlook')) return route.fulfill({body: fx.kp27Fixture(), contentType: 'text/plain'});
  if(url.includes('tiles.openfreemap.org/planet') && !url.includes('.pbf'))
    return json(JSON.stringify({tilejson: '2.2.0', tiles: [BASE + '__tiles/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14}));
  const m = url.match(/__tiles\/(\d+)\/(\d+)\/(\d+)\.pbf/);
  if(m){ const t = fx.placeTile(+m[1], +m[2], +m[3]); return t ? route.fulfill({body: t, contentType: 'application/x-protobuf'}) : route.fulfill({status: 204, body: ''}); }
  if(url.startsWith(BASE)) return route.continue();
  return route.fulfill({status: 404, body: ''});
}

// --- Kuvaus ---
const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const LOCALES = {fi: 'fi-FI', en: 'en-GB', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR'};
const shots = [], problems = [];

for(const size of sizes){
  for(const state of states){
    const ctx = await browser.newContext({
      viewport: {width: size.w, height: size.h}, deviceScaleFactor: size.mobile ? 2 : 1,
      isMobile: size.mobile, hasTouch: size.mobile, serviceWorkers: 'block',
      locale: LOCALES[LANG] || 'fi-FI', timezoneId: 'Europe/Helsinki',
      permissions: ['geolocation'], geolocation: {latitude: 65.01, longitude: 25.47},   // Oulu
    });
    await ctx.addInitScript(l => { try{ localStorage.setItem('rv-lang', l); }catch(e){} }, LANG);
    if(SIM_TIME) await ctx.clock.install({time: SIM_TIME});
    if(OFFLINE){
      // OpenFreeMapin glyyfit eivät ole saatavilla -> kaikki merkit piirretään paikallisesti.
      await ctx.addInitScript(() => {
        let ml;
        Object.defineProperty(window, 'maplibregl', {configurable: true, get(){ return ml; }, set(v){
          ml = v; const Orig = v.Map;
          v.Map = class extends Orig { constructor(o){ super(Object.assign({localIdeographFontFamily: 'sans-serif'}, o));
            const gm = this.style && this.style.glyphManager; if(gm) gm._doesCharSupportLocalGlyph = () => true; } };
        }});
      });
    }
    await ctx.route('**/*', OFFLINE ? routeOffline : routeOnline);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if(SAFE_AREA){
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', {insets: size.insets}).catch(e => problems.push(`safe-area: ${e.message}`));
    }
    if(state === 'kaynnistys'){
      await page.goto(BASE + 'index.html', {waitUntil: 'domcontentloaded'});
      await page.waitForTimeout(1500);
      // Puhelimella OSM-maininta logon alla (leveällä näytöllä pysyvä kulmamaininta).
      const visible = await page.evaluate(() => { const e = document.getElementById('osmIntro'); return !!e && getComputedStyle(e).display !== 'none'; });
      if(size.w < 700 && !visible) problems.push(`${size.id}/kaynnistys: OSM-maininta ei näkynyt 1,5 s kohdalla`);
      const file = path.join(OUT, `${size.w}x${size.h}-${size.id}-${state}.png`);
      await page.screenshot({path: file});
      shots.push({size, state, file});
      console.log(`  ${path.relative(ROOT, file)}`);
      await ctx.close();
      continue;
    }
    await page.goto(BASE + 'index.html');
    await page.waitForFunction(() => document.getElementById('toast')?.classList.contains('hide'), null, {timeout: 30000})
      .catch(() => problems.push(`${size.id}/${state}: latausilmoitus ei poistunut 30 s:ssa`));
    await page.waitForTimeout(1200);
    try{ await STATES[state](page); }catch(e){ problems.push(`${size.id}/${state}: ${e.message.split('\n')[0]}`); }
    await page.waitForTimeout(1500);
    for(const view of VIEWS){
      const key = view ? `${state}-z${view.zoom}` : state;
      if(view){
        await page.evaluate(v => map.jumpTo({center: [v.lon, v.lat], zoom: v.zoom}), view);
        await page.waitForTimeout(3500);   // hiukkaset ja tiilet asettuvat
      }
      const file = path.join(OUT, `${size.w}x${size.h}-${size.id}-${key}.png`);
      await page.screenshot({path: file});
      shots.push({size, state: key, file});
      console.log(`  ${path.relative(ROOT, file)}`);
    }
    for(const e of errors) problems.push(`${size.id}/${state}: JS-virhe: ${e}`);
    await ctx.close();
  }
}

// --- Yhteenvetokuva per tila: kaikki koot rinnakkain samassa mittakaavassa ---
for(const state of [...new Set(shots.map(s => s.state))]){
  const row = shots.filter(s => s.state === state);
  if(row.length < 2) continue;
  const scale = 0.5, pad = 24;
  const cells = row.map(s => `<figure><img src="data:image/png;base64,${fs.readFileSync(s.file).toString('base64')}"
    style="width:${s.size.w*scale}px;height:${s.size.h*scale}px"><figcaption>${s.size.w} × ${s.size.h} ${s.size.id}</figcaption></figure>`).join('');
  const ctx = await browser.newContext({viewport: {width: 800, height: 600}, deviceScaleFactor: 2});
  const page = await ctx.newPage();
  await page.setContent(`<style>body{margin:0;padding:${pad}px;background:#222;font:14px sans-serif;color:#ddd;display:flex;gap:${pad}px;align-items:flex-start;width:max-content}
    figure{margin:0}img{display:block;outline:1px solid #555}figcaption{margin-top:6px}</style>${cells}`);
  const file = path.join(OUT, `yhteenveto-${state}.png`);
  await page.screenshot({path: file, fullPage: true});
  console.log(`  ${path.relative(ROOT, file)}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${shots.length} kuvaa -> ${path.relative(ROOT, OUT)}/ (${OFFLINE ? 'offline, synteettinen data' : 'oikea verkko'}, kieli ${LANG})`);
if(problems.length){ console.log('\nHuomiot:'); for(const p of [...new Set(problems)]) console.log('  - ' + p); }
