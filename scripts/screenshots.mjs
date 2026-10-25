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
//      viikko, viikko-yo2, viikko-yo5 (7 vrk -lista ja tuntinäkymä), yo-kaavio (Tänä yönä V2),
//      malli-kiinni, malli-auki, malli-pilvi (säämallin pikavalinta)
//      tasot, kerros-valikko, kerros-yla, kerros-tuuli, kerros-ecmwf, kerros-puuttuu (tasovalikko ja pilvikerrokset),
//      sumu-valikko, sumu, sumu-sat, sumu-ecmwf (sumutaso)
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
  // Tasovalikko (2026-10-24, ☰): sama kuin "saa" ja "karttapohja" ennen.
  saa:       async page => { await openLayers(page); },
  tasot:     async page => { await openLayers(page); },
  info:      async page => { await page.click('#infoBar'); },
  'info-koko': async page => { await page.click('#infoBar'); await page.waitForTimeout(400); await page.evaluate(() => document.getElementById('info').classList.add('full')); },
  // Infoikkuna, kytkin ilman valittua pistettä: "Valittu piste" himmeä ja
  // sen napautuksen vihje koordinaattirivillä.
  infovihje: async page => {
    await page.evaluate(() => { if(state.point) clearPoint(); });
    await page.click('#infoBar');
    await page.waitForTimeout(400);
    await page.click('#locPointBtn', {force: true});   // aria-disabled -> force
  },
  asetukset: async page => { await openLayers(page); await lmClick(page, 'settings'); },
  karttapohja: async page => { await openLayers(page); },
  // Tuulianimaatio näkyviin: tuuli päälle, pilvet pois (hiukkaset erottuvat), valikko kiinni.
  tuuli:     async page => { await layersOn(page, {wind: true, clouds: false}); },
  // Tuulilippu näyttää valitun korkeuden ("Tuuli 5,5 km").
  'tuuli-lippu': async page => {
    await openLayers(page); await lmClick(page, 'wind', '500'); await page.click('#menuBtn'); await page.waitForTimeout(800);
    await pointLeft(page);
  },
  lahteet:   async page => { await openLayers(page); await lmClick(page, 'about'); },   // näkymä paneelin sisällä
  // Selite tasovalikon päällä (pilvet), paneeli jää auki.
  // Tietoa tasoista -näkymä otsikon i-napista (2026-10-25).
  'tasot-info': async page => { await openLayers(page); await page.click('#lmInfoBtn'); await page.waitForTimeout(300); },
  // Sama vieritettynä Pilvet ja sumu -osioon (2026-10-25).
  'tasot-info-pilvet': async page => { await openLayers(page); await page.click('#lmInfoBtn'); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.lmi-h[data-lmi="clouds"]').scrollIntoView({block: 'start'})); await page.waitForTimeout(200); },
  // Pikapalkki piilotettuna (asetus "Näytä pikapalkki" pois): vain oma sijainti näkyy.
  'pikapalkki-pois': async page => {
    await openLayers(page); await lmClick(page, 'settings'); await page.click('#quickbarSwitch'); await page.waitForTimeout(200);
    await page.click('#menuBtn'); await page.waitForTimeout(400);
  },
  satelliitti: async page => {
    await openLayers(page); await lmClick(page, 'style', 'satellite');
    await page.click('#menuBtn');   // sulje valikko
  },
  // Kamerat (2026-10): kolme korttityyppiä, ei-aktiiviset ja kartta (--offline --kameratila).
  'kamera-still': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('longyearbyen-kho')); await page.waitForTimeout(800); },
  'kamera-kuva':  async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('levi')); },
  'kamera-video': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('kilpisjarvi')); },
  'kamera-off':   async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('posio')); },
  'kamera-vanha': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('aikhal')); await page.click('#cameraCardHeavy'); await page.waitForTimeout(800); },
  'kamera-eikuvaa': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('gillam')); await page.waitForTimeout(800); },
  'kamera-abisko': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('abisko-aurora-sky-station')); await page.waitForTimeout(800); },
  'kamera-raskas': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('isle-royale')); await page.waitForTimeout(800); },
  'kamerat-ruudukko': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraGrid()); await page.waitForTimeout(1200); },
  'kamerat-kartta': async page => {
    await kokeiluCams(page);
    // Still-kuvien tila (tuore / ei lataudu / vanha) testiä varten: ladataan kerran.
    await page.evaluate(() => Promise.all(state.cameras.filter(c => c.type === 'still').map(c => new Promise(r => loadStill(c, new Image(), r)))));
    if(await page.evaluate(() => state.auroraOn)) await page.click('#auroraBtn');   // revontulikerros pois, ikonit erottuvat
    await page.evaluate(() => closeMenu());
    await page.evaluate(() => map.jumpTo({center: [25, 67.4], zoom: map.getContainer().clientWidth < 700 ? 4.9 : 5.6}));
    await page.waitForTimeout(1500);
  },
  kamera:    async page => {
    await page.waitForFunction(() => typeof state !== 'undefined' && state.cameras && state.cameras.length, null, {timeout: 15000})
      .catch(() => page.click('#camerasBtn'));
    await page.waitForFunction(() => state.cameras && state.cameras.length, null, {timeout: 15000});
    await page.evaluate(() => openCameraCard(state.cameras[0].id));
  },
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
  // Koko Tänä yönä -välilehti yhtenä kuvana (2026-10-24): infoikkuna koko
  // näytölle, ikkunan korkeutta kasvatetaan niin, ettei sisältöä tarvitse vierittää.
  // Tulostaa vieritettävän osuuden (px) alkuperäisellä näytön korkeudella.
  'yo-koko':       async page => {
    await page.click('#infoBar'); await page.waitForTimeout(500);
    await page.click('#tabBtnNight'); await page.waitForTimeout(800);
    await page.click('#nightVerSeg button:nth-child(2)'); await page.waitForTimeout(600);
    await page.evaluate(() => $('info').classList.add('full')); await page.waitForTimeout(500);
    const m = await page.evaluate(() => { const b = document.querySelector('#info .is-body');
      return {scroll: b.scrollHeight, client: b.clientHeight, chart: $('nightChart').getBoundingClientRect().height}; });
    console.log('YO-KOKO: sisältö ' + m.scroll + ' px, näkyvissä ' + m.client + ' px, vieritettävää ' + (m.scroll - m.client) + ' px, kaavio ' + Math.round(m.chart) + ' px');
    const vp = page.viewportSize();
    await page.setViewportSize({width: vp.width, height: vp.height + Math.max(0, m.scroll - m.client)});
    await page.waitForTimeout(600);
  },
  // Säämallin pikavalinta (2026-10-24): kiinni, auki, auki vaalean (100 %) pilven päällä.
  'malli-kiinni':  async page => { await cloudsOn(page); },
  'malli-auki':    async page => { await cloudsOn(page); await page.click('#modelSrcBtn'); await page.waitForTimeout(300); },
  // Valittu piste 72 °N (ICON-EU:n alueen ulkopuolella) -> ICON-EU himmeänä.
  'malli-himmea':  async page => { await cloudsOn(page); await page.evaluate(() => setPoint(72, 25)); await page.waitForTimeout(400);
    await page.click('#modelSrcBtn'); await page.waitForTimeout(300); },
  'malli-pilvi':   async page => {
    await cloudsOn(page);
    // Siirretään kartan vaalein pilvialue valikon alle.
    await page.evaluate(() => map.panBy([-innerWidth * 0.55, -innerHeight * 0.12], {duration: 0}));
    await page.waitForTimeout(800);
    await page.click('#modelSrcBtn'); await page.waitForTimeout(300);
  },
  // Pilvikerrokset (2026-10-24, tasovalikko): HARMONIE valikko auki / yläpilvet + lippu /
  // pilvet + tuuli + korkeusvalitsin / ECMWF yläpilvet / kerrostiedosto puuttuu ("Ei saatavilla").
  'kerros-valikko': async page => { await model(page, 'harmonie'); await cloudsOn(page); await openLayers(page); },
  'kerros-yla':     async page => { await model(page, 'harmonie'); await cloudLayer(page, 'high'); await pointLeft(page); },
  'kerros-tuuli':   async page => { await model(page, 'harmonie'); await cloudsOn(page); await layersOn(page, {wind: true, clouds: true}); },
  'kerros-ecmwf':   async page => { await cloudLayer(page, 'high'); await pointLeft(page); },
  'kerros-puuttuu': async page => { await model(page, 'icon_eu'); await cloudsOn(page); await openLayers(page);
    await lmClick(page, 'cloud', 'high'); await page.waitForTimeout(1500); },
  // Sumu (2026-10-25): valintaruudukko, sumu kartalla (molemmat pohjat) + lippu, ECMWF-tila.
  // Omat paikat (2026-10-25): tyhjä lista, lista, tähdet kartalla + tallennettu lippu, tallennus- ja poistodialogi.
  'paikat-tyhja':   async page => { await page.click('#placesBtn'); await page.waitForTimeout(600); },
  'paikat-lista':   async page => { await seedPlaces(page); await page.click('#placesBtn'); await page.waitForTimeout(600); },
  'paikat-kartta':  async page => { await seedPlaces(page);
                                     await page.evaluate(() => { map.jumpTo({center: [24, 68.4], zoom: map.getContainer().clientWidth < 700 ? 4.6 : 5.4}); setPoint(67.8, 24.8); });
                                     await page.waitForTimeout(1200); },
  'paikat-tallenna': async page => { await page.evaluate(() => { map.jumpTo({center: [24, 66.2], zoom: 5}); setPoint(66.5, 25.7); });
                                     await page.waitForTimeout(500); await page.click('.cf-star'); await page.waitForTimeout(1500); },
  'paikat-poisto':  async page => { await seedPlaces(page); await page.click('#placesBtn'); await page.waitForTimeout(500);
                                     await page.click('.pl-row:nth-child(2) [data-act="del"]'); await page.waitForTimeout(500); },
  // Toimintatesti (ei kuvaksi): pitkä painallus -> tallennus -> uudelleenlataus, nimen muutos, poisto, raja 50, viallinen data.
  // WebGL-kontekstin menetys ja palautus (2026-10-25): WEBGL_lose_context simuloi iOS:n
  // taustalta paluuta. Tarkistaa, että pilvet, tuuli ja pohjakartta palautuvat ilman
  // sivun uudelleenlatausta. Kuva otetaan palautuksen jälkeen.
  'webgl-palautus': async page => {
    const fail = m => { throw new Error('webgl-palautus: ' + m); };
    await cloudsOn(page);
    if(!await page.evaluate(() => state.windOn)) await page.click('#windBtn');
    await page.evaluate(() => { map.jumpTo({center: [24, 66], zoom: 4.6}); window.__noReload = 1; });
    await page.waitForTimeout(2500);
    const snap = () => page.evaluate(() => ({labels: map.queryRenderedFeatures().filter(f => /label/.test(f.layer.id)).length, cwg: CWG.ready, wpg: WPG.ready, wpgCount: WPG.count, prog: !!CWG.program,
      clouds: !!map.getLayer('clouds-webgl'), wind: !!map.getLayer('wind-particles'), tiles: map.areTilesLoaded(),
      lost: map.painter.context.gl.isContextLost(), restores: GL_CTX.restores, alive: window.__noReload === 1}));
    const before = await snap();
    if(!before.cwg || !before.wpg || !before.clouds || !before.wind) fail('lähtötila: ' + JSON.stringify(before));
    await page.screenshot({path: OUT + '/webgl-ennen-' + page.viewportSize().width + '.png'});
    if(process.env.WEBGL_NOFIX) await page.evaluate(() => map.off('webglcontextrestored', recoverGLContext));   // vertailu ilman korjausta
    await page.evaluate(() => { window.__ext = map.painter.context.gl.getExtension('WEBGL_lose_context'); window.__ext.loseContext(); });
    await page.waitForTimeout(800);
    const lost = await snap();
    if(!lost.lost) fail('konteksti ei menetetty');
    await page.screenshot({path: OUT + '/webgl-menetetty-' + page.viewportSize().width + '.png'});
    await page.evaluate(() => window.__ext.restoreContext());
    await page.waitForTimeout(6000);
    const after = await snap();
    console.log('  webgl ennen ' + JSON.stringify(before) + '\n  webgl menetetty ' + JSON.stringify(lost) + '\n  webgl palautettu ' + JSON.stringify(after));
    if(after.lost || !after.alive || after.restores !== 1) fail('palautus: ' + JSON.stringify(after));
    if(!after.cwg || !after.prog || !after.wpg || !after.clouds || !after.wind || !(after.wpgCount > 0) || after.labels < before.labels) fail('tasot eivät palanneet: ' + JSON.stringify(after));
  },
  'paikat-toiminta': async page => {
    const fail = m => { throw new Error('paikat-toiminta: ' + m); };
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('rv-places') || 'null'));
    await page.evaluate(() => map.jumpTo({center: [25.7, 66.5], zoom: 6}));
    await page.waitForTimeout(800);
    const r = await page.locator('#map').boundingBox(), cx = r.x + r.width/2, cy = r.y + r.height/2;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
    await page.waitForTimeout(400);
    if(!await page.evaluate(() => document.body.classList.contains('pl-dlg'))) fail('pitkä painallus ei avannut dialogia');
    await page.fill('#placeDlgInput', 'Testipaikka'); await page.click('#placeDlgOk'); await page.waitForTimeout(300);
    let s = await stored();
    if(!s || s.v !== 1 || s.places.length !== 1 || s.places[0].name !== 'Testipaikka') fail('tallennus: ' + JSON.stringify(s));
    await page.reload(); await page.waitForFunction(() => window.map && map.loaded && map.loaded(), null, {timeout: 20000});
    await page.waitForTimeout(1500);
    if(await page.evaluate(() => places.list.length) !== 1) fail('ei säilynyt uudelleenlatauksessa');
    if(await page.evaluate(() => (map.getSource('places')?._data?.features || []).length) !== 1) fail('tähti puuttuu kartalta');
    // Nimen muutos ja poisto listasta
    await page.click('#placesBtn'); await page.waitForTimeout(500);
    await page.click('.pl-row [data-act="rename"]'); await page.waitForTimeout(300);
    await page.fill('#placeDlgInput', 'Uusi nimi'); await page.press('#placeDlgInput', 'Enter'); await page.waitForTimeout(300);
    s = await stored(); if(s.places[0].name !== 'Uusi nimi') fail('nimen muutos');
    await page.click('.pl-row [data-act="del"]'); await page.waitForTimeout(300); await page.click('#placeDlgOk'); await page.waitForTimeout(300);
    s = await stored(); if(s.places.length !== 0) fail('poisto');
    // Raja 50
    await page.evaluate(() => { const l = []; for(let i = 0; i < 50; i++) l.push({id: 'p' + i, name: 'P' + i, lat: 60 + i*0.1, lon: 25, createdAt: 1, updatedAt: 1});
      localStorage.setItem('rv-places', JSON.stringify({v: 1, places: l})); });
    await page.reload(); await page.waitForTimeout(2500);
    await page.evaluate(() => openPlaceSave(64, 27)); await page.waitForTimeout(300);
    if(await page.evaluate(() => document.body.classList.contains('pl-dlg'))) fail('raja 50 ei estänyt');
    // Viallinen data -> varmuuskopio, tyhjä lista, ei kaadu
    await page.evaluate(() => localStorage.setItem('rv-places', '{rikki'));
    await page.reload(); await page.waitForTimeout(2500);
    const bad = await page.evaluate(() => ({len: places.list.length, bak: localStorage.getItem('rv-places-viallinen')}));
    if(bad.len !== 0 || bad.bak !== '{rikki') fail('viallinen data: ' + JSON.stringify(bad));
  },
  'sumu-valikko':   async page => { await model(page, 'harmonie'); await cloudsOn(page); await openLayers(page);
    await lmClick(page, 'cloud', 'fog'); await page.waitForTimeout(1200); },
  'sumu':           async page => { await fogView(page); },
  'sumu-sat':       async page => { await openLayers(page); await lmClick(page, 'style', 'satellite'); await page.click('#menuBtn'); await page.waitForTimeout(1500); await fogView(page); },
  'sumu-ecmwf':     async page => { await cloudsOn(page); await openLayers(page); },
  // Puuttuva data (2026-10-25): Sumu valittuna, malliksi ECMWF -> valinta säilyy himmeänä, lippu "ei saatavilla".
  'sumu-valittu-ecmwf': async page => { await fogView(page); await model(page, 'ecmwf'); await page.waitForTimeout(1200);
    await page.evaluate(() => updateFlag()); await page.waitForTimeout(300); },
  'sumu-valittu-ecmwf-valikko': async page => { await fogView(page); await model(page, 'ecmwf'); await openLayers(page); },
  // 7 vrk (2026-10): lista ja yön 2 / yön 5 tuntinäkymä.
  viikko:          async page => { await openWeek(page); },
  // Tänä yönä V2-kaavio (2026-10-24, selitteet kaavion vasemmassa reunassa).
  'yo-kaavio':     async page => {
    await page.click('#infoBar');
    await page.waitForTimeout(500);
    await page.click('#tabBtnNight');
    await page.waitForTimeout(800);
    await page.click('#nightVerSeg button:nth-child(2)');
    await page.waitForTimeout(800);
    await page.evaluate(() => { $('info').classList.add('full'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => $('nightChartWrap').scrollIntoView({block: 'end'}));
    await page.waitForTimeout(300);
  },
  'viikko-yo2':    async page => { await openWeek(page); await page.click('#weekList .wk-row[data-k="1"]'); await page.waitForTimeout(600); },
  'viikko-yo5':    async page => { await openWeek(page); await page.click('#weekList .wk-row[data-k="4"]'); await page.waitForTimeout(600); },
  // Aikajana (2026-10-22): pilvet päälle, levossa ja vedon aikana (pallo
  // pidetään pohjassa ~40 %:n kohdalla, peukalon paikka).
  aikajana:        async page => { await cloudsOn(page); },
  'aikajana-veto': async page => {
    await cloudsOn(page);
    const b = await page.locator('#timeSlider').boundingBox();
    const y = b.y + b.height/2;
    await page.mouse.move(b.x + 9, y);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width*0.4, y, {steps: 8});
  },
  // Mallin alueen raja ja lipun "ei dataa" (2026-10-23): tuuli päällä (pilvet
  // pois / päällä), piste alueen ulkopuolella. Käytä esim. --model=icon_eu
  // --views=25.8,70.6,6 (Nordkapp ICON-EU:n pohjoisrajan yläpuolella).
  'raja-tuuli':        async page => { await layersOn(page, {wind: true, clouds: false}); await pointAt(page); },
  'raja-tuuli-pilvet': async page => { await layersOn(page, {wind: true, clouds: true}); await pointAt(page); },
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
async function layersOn(page, {wind, clouds}){
  if(await page.evaluate(() => state.cloudsOn) !== clouds) await page.click('#cloudsBtn');
  if(await page.evaluate(() => state.windOn) !== wind){
    await openLayers(page);
    await page.click('#lmBody .lm-swbtn[data-act="windToggle"]'); await page.waitForTimeout(300);
    await page.click('#menuBtn');
  }
  await page.waitForTimeout(1200);
}
// Tasovalikko (2026-10-24): ☰ auki ja rivin napautus (data-act / data-v).
async function openLayers(page){
  if(await page.evaluate(() => state.openMenu !== 'layerMenu')) await page.click('#menuBtn');
  await page.waitForTimeout(400);
}
async function lmClick(page, act, v){
  await page.click('#lmBody [data-act="' + act + '"]' + (v ? '[data-v="' + v + '"]' : '') + ':not(.lm-grow)');
  await page.waitForTimeout(300);
}
async function model(page, id){ await page.evaluate(m => switchCloudModel(m), id); await page.waitForTimeout(600); }
async function cloudLayer(page, l){
  await openLayers(page); await lmClick(page, 'cloud', l); await page.click('#menuBtn'); await page.waitForTimeout(400);
}
async function seedPlaces(page){
  await page.evaluate(() => {
    let l = [];
    for(const [name, lat, lon] of [['Kilpisjärvi', 69.05, 20.79], ['Levi', 67.8, 24.8], ['Utsjoki, Kevo', 69.76, 27.01],
      ['Rovaniemi Apukka', 66.58, 25.98], ['Mökki Pallaksella', 68.06, 24.05]]) l = AuroraCore.placesAdd(l, {name, lat, lon}).places;
    savePlaces(l);
  });
  await page.waitForTimeout(400);
}
async function fogView(page){
  await model(page, 'harmonie'); await cloudLayer(page, 'fog');
  await page.evaluate(() => map.jumpTo({center: [24, 63.2], zoom: map.getContainer().clientWidth < 700 ? 4.6 : 5.4}));
  await page.waitForTimeout(1500);
  await page.evaluate(() => setPoint(63.4, 21.0));
  await page.waitForTimeout(1200);
}
async function pointLeft(page){
  await page.evaluate(() => { const c = map.getCenter(), b = map.getBounds(); setPoint(c.lat, b.getWest() + (c.lng - b.getWest()) * 0.4); });
  await page.waitForTimeout(900);
}
// Piste: --point=lat,lon (oletus Nordkapp 71,17 N 25,78 E).
async function pointAt(page){
  const [lat, lon] = (typeof args.point === 'string' ? args.point : '71.17,25.78').split(',').map(Number);
  await page.evaluate(([la, lo]) => setPoint(la, lo), [lat, lon]);
  await page.waitForTimeout(600);
}
async function cloudsOn(page){
  if(!await page.evaluate(() => state.cloudsOn)) await page.click('#cloudsBtn');
  await page.waitForTimeout(500);
}
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
// --kameratila: offline-tilassa kameroiden tila testiä varten (Posio ja Utsjoki
// ilman lähetystä, Aikhalin kuva 2 h vanha, Porjus ei lataudu).
const KOKEILU = !!args.kameratila;
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
// --model=icon_eu|harmonie: valittu malli (localStorage) ja offline-testidata
// rajattuna mallin alueelle (alueen raja, "ei dataa").
const MODEL = args.model || null;
if(MODEL && !fx.MODEL_BOX[MODEL]){ console.error('Tuntematon --model: ' + MODEL); process.exit(1); }
const clouds = OFFLINE ? (MODEL && MODEL !== 'ecmwf' ? fx.cropClouds(fx.cloudsFixture(), fx.MODEL_BOX[MODEL]) : fx.cloudsFixture()) : null;
const offlineBodies = OFFLINE ? {
  clouds: JSON.stringify(clouds), wind: JSON.stringify(fx.windFixture(clouds.times, MODEL && MODEL !== 'ecmwf' ? fx.MODEL_BOX[MODEL] : null)),
  ovation: JSON.stringify(fx.ovationFixture()), mag: JSON.stringify(fx.magFixture()),
  sw: JSON.stringify(fx.solarWindFixture()), power: fx.hemiPowerFixture(), kp: JSON.stringify(fx.kpFixture()),
  kpFc: JSON.stringify(fx.kpForecastFixture()), prop: JSON.stringify(fx.propagatedFixture()),
} : null;
async function kokeiluCams(page){
  if(!(await page.evaluate(() => state.camerasOn))) await page.click('#camerasBtn');
  await page.waitForFunction(() => state.cameras && state.cameras.some(c => c.type === 'still'), null, {timeout: 15000});
  await page.evaluate(() => closeMenu());
}
// Synteettinen kaikkitaivaskuva (pyöreä kalansilmä + revontulikaari) still-kameroille.
const STILL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">' +
  '<rect width="480" height="480" fill="#000"/><defs><radialGradient id="s"><stop offset="0" stop-color="#14233d"/><stop offset="1" stop-color="#05080f"/></radialGradient></defs>' +
  '<circle cx="240" cy="240" r="225" fill="url(#s)"/><path d="M40 300C140 180 330 160 440 250" stroke="#46f0a0" stroke-width="34" fill="none" opacity=".55"/>' +
  '<path d="M60 260C160 150 320 140 420 210" stroke="#b0ffcf" stroke-width="8" fill="none" opacity=".5"/>' +
  '<text x="240" y="420" font-family="sans-serif" font-size="16" fill="#8a9" text-anchor="middle">offline-testikuva (still)</text></svg>';
// Kameroiden tila testiä varten (--kameratila): kaksi YouTube-kameraa ilman lähetystä, Aikhalin kuva 2 h vanha.
function kokeiluStatus(){
  const now = Date.now(), cams = {};
  for(const id of ['posio', 'utsjoki']) cams[id] = {broadcast: 'none', broadcastCheckedAt: now - 10*60e3, lastChecked: now - 5*60e3};
  // Still: palvelinpuolen tarkistuksen muoto (check-camera-thumbnails.py still_status).
  cams['aikhal'] = {type: 'still', lastChecked: now - 5*60e3, imageChangedAt: now - 2*3600e3, placeholder: false, offline: false};
  cams['gillam'] = {type: 'still', lastChecked: now - 5*60e3, imageChangedAt: null, placeholder: true, offline: true};
  return JSON.stringify({cameras: cams, staleThresholdMs: 1800000});
}
// Offline-korvike kameran pikkukuvalle (yötaivas + revontulikaista).
const THUMB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1430"/><stop offset="1" stop-color="#1c2b3a"/></linearGradient></defs>' +
  '<rect width="480" height="360" fill="url(#g)"/><path d="M0 150C120 90 260 190 480 110v40C260 230 120 130 0 190z" fill="#3df5a2" opacity=".45"/>' +
  '<rect y="300" width="480" height="60" fill="#0a0f14"/><text x="240" y="345" font-family="sans-serif" font-size="16" fill="#8a9" text-anchor="middle">offline-testikuva</text></svg>';
const ML_DIST = path.join(ROOT, 'node_modules', 'maplibre-gl', 'dist');

async function routeOnline(route){
  const u = new URL(route.request().url());
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
  if(KOKEILU && url.startsWith(BASE + 'data/camera-status.json')) return json(kokeiluStatus());
  if(KOKEILU && /jokkmokk\.jp/.test(url)) return route.fulfill({status: 404, body: ''});   // ei lataudu
  // Still-kameroiden kuvat: synteettinen kaikkitaivaskuva (ei verkkoa).
  if(/sgo\.fi|ursa\.fi|kho\.unis\.no|jokkmokk\.jp|starvisor\.net|ucalgary\.ca|nps\.gov|jtvnw\.net/.test(url))
    return route.fulfill({body: STILL_SVG, contentType: 'image/svg+xml'});
  const wm = url.match(/\/data\/wind-(?:ecmwf|icon_eu|harmonie)-\w+?(-meta|-step(\d+))?\.json/);
  if(wm && wm[1] === '-meta'){ const {u, v, ...m} = JSON.parse(b.wind); return json(JSON.stringify(m)); }
  if(wm && wm[2]){ const w = JSON.parse(b.wind), N = w.nlat*w.nlon, i = +wm[2], sl = x => Buffer.from(x, 'base64').subarray(i*N, (i+1)*N).toString('base64');
    return json(JSON.stringify({u: sl(w.u), v: sl(w.v)})); }
  if(/\/data\/wind-(ecmwf|icon_eu|harmonie)-/.test(url)) return json(b.wind);
  if(/\/data\/clouds-(ecmwf|icon_eu|harmonie)\.json/.test(url)) return json(b.clouds);
  if(/\/data\/clouds-(icon_eu|harmonie)-meta\.json/.test(url)) return json(JSON.stringify(fx.cloudsMetaFog(clouds)));
  if(/\/data\/clouds-ecmwf-meta\.json/.test(url)) return json(JSON.stringify(fx.cloudsMetaLayers(clouds)));
  const cf = url.match(/\/data\/clouds-(?:icon_eu|harmonie)-fog-step(\d+)\.json/);
  if(cf) return json(JSON.stringify(fx.cloudsFogStep(clouds, +cf[1])));
  // ICON-EU:n kerrostiedostot puuttuvat tarkoituksella (tila kerros-puuttuu: "Ei saatavilla").
  if(/\/data\/clouds-icon_eu-layers-step/.test(url)) return route.fulfill({status: 404, body: ''});
  const cl = url.match(/\/data\/clouds-(?:ecmwf|harmonie)-layers-step(\d+)\.json/);
  if(cl) return json(JSON.stringify(fx.cloudsLayerStep(clouds, +cl[1])));
  const cs = url.match(/\/data\/clouds-(?:ecmwf|icon_eu|harmonie)-step(\d+)\.json/);
  if(cs) return json(JSON.stringify(fx.cloudsStep(clouds, +cs[1])));
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
    if(MODEL) await ctx.addInitScript(m => { try{ localStorage.setItem('rv-cloud-model', m); }catch(e){} }, MODEL);
    if(SIM_TIME) await ctx.clock.install({time: SIM_TIME});
    if(OFFLINE){
      // OpenFreeMapin glyyfit eivät ole saatavilla -> kaikki merkit piirretään paikallisesti.
      await ctx.addInitScript(() => {
        let ml;
        Object.defineProperty(window, 'maplibregl', {configurable: true, get(){ return ml; }, set(v){
          ml = v; const Orig = v.Map;
          v.Map = class extends Orig { constructor(o){ super(Object.assign({localIdeographFontFamily: 'sans-serif'}, o));
            const patch = () => { const gm = this.style && this.style.glyphManager; if(gm) gm._doesCharSupportLocalGlyph = () => true; };
            patch(); this.on('styledata', patch); } };   // myös tyylinvaihdon jälkeen (uusi glyphManager)
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
