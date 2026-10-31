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
  // Satelliittipohja (2026-10-28, tiekartta-kuvat: --views zoomeille).
  satelliitti: async page => { await page.evaluate(() => switchMapStyle('satellite')); await page.waitForTimeout(2500); },
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
  // YouTube-upotus oman sivun kautta (2026-10-27): iframe -> embed/youtube.html?id=..., joka upottaa
  // youtube-nocookie.com-soittimen; vain kelvollinen tunnus hyväksytään.
  'kamera-upotus': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('kilpisjarvi')); await page.waitForTimeout(600);
    await page.click('#cameraCardPlay'); await page.waitForTimeout(1200);
    const src = await page.evaluate(() => document.querySelector('#cameraCardThumbWrap iframe')?.getAttribute('src') || '');
    if(!/^embed\/youtube\.html\?id=[A-Za-z0-9_-]{11}$/.test(src)) throw new Error('kamera-upotus: src ' + src);
    const fr = page.frames().find(f => f.url().includes('embed/youtube.html'));
    const inner = fr && await fr.evaluate(() => document.querySelector('iframe')?.src || '');
    if(!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}\?/.test(inner || '')) throw new Error('kamera-upotus: sisäsoitin ' + inner);
    const bad = await page.evaluate(async () => { const f = document.createElement('iframe'); f.src = 'embed/youtube.html?id=https://evil.example/x';
      document.body.appendChild(f); await new Promise(r => f.onload = r); const n = f.contentDocument.querySelectorAll('iframe').length; f.remove(); return n; });
    if(bad !== 0) throw new Error('kamera-upotus: väärä tunnus hyväksyttiin');
  },
  'kamerat-ruudukko': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraGrid()); await page.waitForTimeout(1200); },
  'kamerat-kartta': async page => {
    await kokeiluCams(page);
    // Still-kuvien tila (tuore / ei lataudu / vanha) testiä varten: ladataan kerran.
    await page.evaluate(() => Promise.all(state.cameras.filter(c => c.type === 'still').map(c => new Promise(r => loadStill(c, new Image(), r)))));
    if(await page.evaluate(() => state.auroraOn)) await page.evaluate(() => toggleAurora());   // revontulikerros pois, ikonit erottuvat
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
  // Säämalli (2026-10-27): meteorologien ennuste kartalla (kerrokset, sumu ja ylätuulet "Ei saatavilla"),
  // säämallivalikko Tänä yönä -välilehden ja 7 vrk:n lähdetekstistä.
  'meteorologit-kartta': async page => { await model(page, 'edited'); await cloudsOn(page); await layersOn(page, {wind: true, clouds: true}); await page.waitForTimeout(600); await openLayers(page); await page.waitForTimeout(500); },
  'meteorologit-lippu': async page => { await model(page, 'edited'); await cloudsOn(page); await pointLeft(page); },
  'malli-yo':      async page => { await page.click('#infoBar'); await page.waitForTimeout(500); await page.click('#tabBtnNight'); await page.waitForTimeout(800);
    await page.evaluate(() => { $('info').classList.add('full'); document.querySelector('#nightSum .nt-src-btn').scrollIntoView({block: 'center'}); }); await page.waitForTimeout(400);
    await page.click('#nightSum .nt-src-btn'); await page.waitForTimeout(400); },
  'malli-viikko':  async page => { await openWeek(page); await page.evaluate(() => { $('info').classList.add('full'); document.querySelector('#weekSum .nt-src-btn').scrollIntoView({block: 'center'}); });
    await page.waitForTimeout(400); await page.click('#weekSum .nt-src-btn'); await page.waitForTimeout(400); },
  // Puuttuva data (2026-10-28): koko yö ilman pilvidataa (piste HARMONIEn alueen
  // ulkopuolella) ja osittain puuttuva (yön jälkimmäinen puolisko ilman pilvidataa).
  'yo-eidataa':    async page => { await model(page, 'harmonie'); await page.evaluate(() => { state.cloudGrid.lat1 = Math.min(state.cloudGrid.lat1, 73.5); setPoint(74.51, 40.74); }); await page.waitForTimeout(400);
    await page.evaluate(() => { if(!state.infoOpen) setInfoOpen(true); }); await page.waitForTimeout(500); await page.click('#tabBtnNight'); await page.waitForTimeout(800);
    await page.evaluate(() => { $('info').classList.add('full'); $('nightChart').scrollIntoView({block: 'end'}); }); await page.waitForTimeout(500); },
  'nyt-eidataa':   async page => { await model(page, 'harmonie'); await page.evaluate(() => { state.cloudGrid.lat1 = Math.min(state.cloudGrid.lat1, 73.5); setPoint(74.51, 40.74); }); await page.waitForTimeout(400);
    await page.evaluate(() => { if(!state.infoOpen) setInfoOpen(true); $('info').classList.add('full'); }); await page.waitForTimeout(800); },
  'viikko-eidataa': async page => { await model(page, 'harmonie'); await page.evaluate(() => { state.cloudGrid.lat1 = Math.min(state.cloudGrid.lat1, 73.5); setPoint(74.51, 40.74); }); await page.waitForTimeout(400);
    await page.evaluate(() => { if(!state.infoOpen) setInfoOpen(true); $('info').classList.add('full'); }); await page.waitForTimeout(500);
    await page.click('#tabBtn7d'); await page.waitForTimeout(1000); },
  'yo-osittain':   async page => { await page.evaluate(() => { const orig = nightCloud, cut = Date.now() + 4.5*3600e3;
      window.nightCloud = (lat, lon, d) => d.getTime() > cut ? null : orig(lat, lon, d); });
    await page.click('#infoBar'); await page.waitForTimeout(500); await page.click('#tabBtnNight'); await page.waitForTimeout(800);
    await page.evaluate(() => $('info').classList.add('full')); await page.waitForTimeout(500); },
  'kerros-valikko': async page => { await model(page, 'harmonie'); await cloudsOn(page); await openLayers(page); },
  'kerros-yla':     async page => { await model(page, 'harmonie'); await cloudLayer(page, 'high'); await pointLeft(page); },
  'kerros-tuuli':   async page => { await model(page, 'harmonie'); await cloudsOn(page); await layersOn(page, {wind: true, clouds: true}); },
  'kerros-ecmwf':   async page => { await cloudLayer(page, 'high'); await pointLeft(page); },
  'kerros-puuttuu': async page => { await model(page, 'icon_eu'); await cloudsOn(page); await openLayers(page);
    await lmClick(page, 'cloud', 'high'); await page.waitForTimeout(1500); },
  // Sumu (2026-10-25): valintaruudukko, sumu kartalla (molemmat pohjat) + lippu, ECMWF-tila.
  // Omat paikat (2026-10-25): tyhjä lista, lista, tähdet kartalla + tallennettu lippu, tallennus- ja poistodialogi.
  'paikat-tyhja':   async page => { await page.evaluate(() => openPlacesView()); await page.waitForTimeout(600); },
  'paikat-lista':   async page => { await seedPlaces(page); await page.evaluate(() => openPlacesView()); await page.waitForTimeout(600); },
  'paikat-kartta':  async page => { await seedPlaces(page);
                                     await page.evaluate(() => { map.jumpTo({center: [24, 68.4], zoom: map.getContainer().clientWidth < 700 ? 4.6 : 5.4}); setPoint(67.8, 24.8); });
                                     await page.waitForTimeout(1200); },
  'paikat-tallenna': async page => { await page.evaluate(() => { map.jumpTo({center: [24, 66.2], zoom: 5}); setPoint(66.5, 25.7); });
                                     await page.waitForTimeout(500); await page.click('.cf-star'); await page.waitForTimeout(1500); },
  'paikat-poisto':  async page => { await seedPlaces(page); await page.evaluate(() => openPlacesView()); await page.waitForTimeout(500);
                                     await page.click('.pl-row:nth-child(2) [data-act="del"]'); await page.waitForTimeout(500); },
  // Toimintatesti (ei kuvaksi): pitkä painallus -> tallennus -> uudelleenlataus, nimen muutos, poisto, raja 50, viallinen data.
  // WebGL-kontekstin menetys ja palautus (2026-10-25): WEBGL_lose_context simuloi iOS:n
  // taustalta paluuta. Tarkistaa, että pilvet, tuuli ja pohjakartta palautuvat ilman
  // sivun uudelleenlatausta. Kuva otetaan palautuksen jälkeen.
  'webgl-palautus': async page => {
    const fail = m => { throw new Error('webgl-palautus: ' + m); };
    await cloudsOn(page);
    if(!await page.evaluate(() => state.windOn)) await page.evaluate(() => setWindOn(true));
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
  // Reittiohjeet (2026-10-28): lippu + paikkalista selaimessa (window.open), iPhone-sovellus
  // simuloidulla AppLauncherilla (Google Maps asennettu -> valintaikkuna, valinta muistetaan),
  // Android-sovellus (geo:-linkki). Kuva: reitti-ios = valintaikkuna auki.
  'reitti-lippu':   async page => { await seedPlaces(page); await page.evaluate(() => { map.jumpTo({center: [23, 67.8], zoom: 6}); setPoint(67.8, 24.8); }); await page.waitForTimeout(600);
    await page.evaluate(() => { window.__open = []; window.open = u => { window.__open.push(u); }; });
    await page.click('.rv-cloudflag .cf-nav'); const o = await page.evaluate(() => window.__open);
    if(!o.length || !o[0].startsWith('https://www.google.com/maps/dir/?api=1&destination=67.800000,24.800000')) throw new Error('reitti-lippu: ' + JSON.stringify(o)); },
  'reitti-lista':   async page => { await seedPlaces(page); await page.evaluate(() => openPlacesView()); await page.waitForTimeout(600); },
  'reitti-android': async page => { await seedPlaces(page); await page.evaluate(() => setPoint(67.8, 24.8)); await page.waitForTimeout(400);
    await page.click('.rv-cloudflag .cf-nav'); await page.waitForTimeout(200);
    const o = await page.evaluate(() => window.__open);
    if(o.length !== 1 || o[0] !== 'geo:67.800000,24.800000?q=67.800000,24.800000(Levi)') throw new Error('reitti-android: ' + JSON.stringify(o)); },
  'reitti-ios':     async page => {
    const fail = m => { throw new Error('reitti-ios: ' + m); };
    await seedPlaces(page); await page.evaluate(() => setPoint(67.8, 24.8)); await page.waitForTimeout(400);
    await page.click('.rv-cloudflag .cf-nav'); await page.waitForTimeout(300);
    if(!await page.evaluate(() => document.body.classList.contains('pl-dlg'))) fail('valintaikkuna ei auennut');
    const labels = await page.$$eval('#placeDlgChoices button', bs => bs.map(b => b.textContent));
    if(labels.length !== 2) fail('valinnat ' + labels);
    await page.click('#placeDlgChoices button:nth-child(2)'); await page.waitForTimeout(200);
    let o = await page.evaluate(() => window.__open);
    if(o[0] !== 'comgooglemaps://?daddr=67.800000,24.800000&directionsmode=driving') fail('google ' + JSON.stringify(o));
    if(await page.evaluate(() => localStorage.getItem('rv-nav-app')) !== 'google') fail('ei muistettu');
    await page.click('.rv-cloudflag .cf-nav'); await page.waitForTimeout(300);
    if(await page.evaluate(() => document.body.classList.contains('pl-dlg'))) fail('kysyi uudelleen');
    o = await page.evaluate(() => window.__open);
    if(o.length !== 2) fail('toinen avaus ' + JSON.stringify(o));
    if(await page.evaluate(() => $('navRow').hidden)) fail('asetusrivi piilossa');
    await page.evaluate(() => { localStorage.removeItem('rv-nav-app'); navApp = null; });
    await page.click('.rv-cloudflag .cf-nav'); await page.waitForTimeout(400);
  },
  // Pro-testikytkin (2026-10-28): pro-*-tilat ladataan testikäännöksenä (data-testbuild, kytkin asetuksissa).
  'pro-asetukset': async page => { await openLayers(page); await lmClick(page, 'settings'); },
  'pro-ilmainen': async page => {
    await page.evaluate(() => { setProTestMode('free'); if(!state.cloudsOn) toggleClouds(); if(!state.windOn) setWindOn(true); });
    await openLayers(page);
  },
  'pro-ikkuna': async page => {
    await page.evaluate(() => { setProTestMode('free'); if(!state.cloudsOn) toggleClouds(); });
    await openLayers(page); await lmClick(page, 'cloud', 'low');
    await page.click('#proSheetTry'); await page.waitForTimeout(300);
  },
  // Alareunan suojakaista (2026-10-28) väritettynä + tarkistus: kaista ei peitä alapalkkia eikä aikajanaa.
  'suojakaista': async page => {
    await page.evaluate(() => { document.body.classList.add('edge-guard-show'); if(!state.cloudsOn) toggleClouds(); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const g = document.getElementById('edgeGuard').getBoundingClientRect();
      const hit = id => { const b = document.getElementById(id).getBoundingClientRect();
        const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!el && (el.id === id || !!el.closest('#' + id)); };
      const below = document.elementFromPoint(innerWidth - 20, innerHeight - 4);
      return {h: g.height, bar: hit('infoBar'), tl: hit('timeline'), guard: below && below.id === 'edgeGuard'};
    });
    if(r.h < 20 || !r.bar || !r.tl || !r.guard) throw new Error('suojakaista: ' + JSON.stringify(r));
    // Veto ylös kaistalta (kuten sovellusten vaihtoele) ei liikuta karttaa; sama veto kartalta liikuttaa.
    const vp = page.viewportSize(), center = () => page.evaluate(() => map.getCenter().lat);
    const drag = async (x, y0) => { await page.mouse.move(x, y0); await page.mouse.down();
      for(let i = 1; i <= 8; i++) await page.mouse.move(x, y0 - i * 25); await page.mouse.up(); await page.waitForTimeout(400); };
    const c0 = await center(); await drag(vp.width - 20, vp.height - 6);
    if(Math.abs(await center() - c0) > 1e-6) throw new Error('suojakaista: kartta liikkui kaistalta');
    const c1 = await center(); await drag(vp.width / 2, vp.height / 2);
    if(Math.abs(await center() - c1) < 1e-4) throw new Error('suojakaista: kartta ei liikkunut kartalta (testi ei toimi)');
  },
  'pro-kyltti': async page => { await page.evaluate(() => setProTestMode('pro')); await page.waitForTimeout(300); },
  'pro-mallit': async page => {
    await page.evaluate(() => setProTestMode('free'));
    await page.click('#modelSrcBtn'); await page.waitForTimeout(400);
  },
  'pro-toiminta': async page => {
    const fail = m => { throw new Error('pro-toiminta: ' + m); };
    const ev = f => page.evaluate(f);
    if(!await page.locator('#proTestRow').isVisible().catch(() => false)){
      await openLayers(page); await lmClick(page, 'settings');
    }
    if(await ev(() => document.getElementById('proTestRow').hidden)) fail('kytkin ei näy testikäännöksessä');
    if(await ev(() => Features.getTestMode()) !== 'open') fail('oletus ei ole Auki');
    // Ilmainen: HARMONIE valittuna -> palaa ECMWF:ään, lukitut avaavat alaikkunan
    await ev(() => switchCloudModel('harmonie')); await page.waitForTimeout(600);
    await page.click('#proTestSeg [role=radio]:nth-child(2)'); await page.waitForTimeout(800);
    if(await ev(() => Features.getTestMode()) !== 'free') fail('Ilmainen ei valittunut');
    if(await ev(() => !document.getElementById('proChip').hidden)) fail('Pro-kyltti näkyy Ilmainen-tilassa');
    if(await ev(() => state.cloudModel) !== 'ecmwf') fail('malli ei palannut ECMWF:ään');
    await ev(() => switchCloudModel('harmonie')); await page.waitForTimeout(300);
    if(await ev(() => state.cloudModel) !== 'ecmwf') fail('lukittu malli vaihtui');
    if(!await ev(() => document.body.classList.contains('pro-sheet'))) fail('alaikkuna ei avautunut (malli)');
    await page.click('#proSheetTry');
    if(await page.textContent('#proSheetMsg') !== 'Ostot eivät ole vielä käytössä') fail('ostoteksti');
    await page.click('#proSheetClose');
    await ev(() => setCloudLayer('high'));
    if(await ev(() => state.cloudLayer) !== 'total') fail('lukittu pilvikerros valittiin');
    await ev(() => { closeProSheet(); setWindLevel('500'); });
    if(await ev(() => state.windLevel) !== 'surface') fail('lukittu tuulikorkeus valittiin');
    await ev(() => closeProSheet());
    // Paikat: 3 ilmaiseksi, 4. avaa alaikkunan
    await ev(() => { const l = []; for(let i = 0; i < 3; i++) l.push({id: 'p' + i, name: 'P' + i, lat: 60 + i, lon: 25, createdAt: 1, updatedAt: 1}); savePlaces(l); });
    await ev(() => openPlaceSave(64, 27)); await page.waitForTimeout(300);
    if(await ev(() => document.body.classList.contains('pl-dlg'))) fail('4. paikka ei estynyt');
    if(!await ev(() => document.body.classList.contains('pro-sheet'))) fail('alaikkuna ei avautunut (paikat)');
    await ev(() => closeProSheet());
    // Säilyy uudelleenkäynnistyksessä
    await page.reload(); await page.waitForFunction(() => window.map && map.loaded && map.loaded(), null, {timeout: 20000});
    await page.waitForTimeout(1500);
    if(await ev(() => Features.getTestMode()) !== 'free') fail('tila ei säilynyt');
    // Pro: kaikki auki
    await ev(() => setProTestMode('pro'));
    await ev(() => switchCloudModel('harmonie')); await page.waitForTimeout(600);
    if(await ev(() => state.cloudModel) !== 'harmonie') fail('Pro: malli ei vaihtunut');
    if(await ev(() => document.getElementById('proChip').hidden)) fail('Pro-kyltti ei näy Pro-tilassa');
    if(await ev(() => document.body.classList.contains('pro-sheet'))) fail('Pro: alaikkuna avautui');
    await ev(() => { setProTestMode('open'); switchCloudModel('ecmwf'); savePlaces([]); });
    await openLayers(page); await lmClick(page, 'settings');
  },
  // Tähtinappi kuten kameranappi (2026-10-29): napautus piilottaa/näyttää tähdet, päälle kytkettäessä rivi -> lista.
  'paikat-nappi': async page => {
    const fail = m => { throw new Error('paikat-nappi: ' + m); };
    await seedPlaces(page); await page.waitForTimeout(800);
    const vis = () => page.evaluate(() => map.getLayoutProperty('places-star', 'visibility') || 'visible');
    if(await vis() !== 'visible' || !(await page.evaluate(() => $('placesBtn').classList.contains('on')))) fail('oletus: tähdet päällä');
    await page.click('#placesBtn'); await page.waitForTimeout(400);
    if(await vis() !== 'none' || await page.evaluate(() => $('placesMenu').classList.contains('open'))) fail('pois: tähdet piiloon, ei riviä');
    await page.reload(); await page.waitForFunction(() => window.map && map.loaded && map.loaded(), null, {timeout: 20000}); await page.waitForTimeout(1500);
    if(await vis() !== 'none') fail('tila ei säilynyt');
    await page.click('#placesBtn'); await page.waitForTimeout(400);
    if(await vis() !== 'visible' || !(await page.evaluate(() => $('placesMenu').classList.contains('open')))) fail('päälle: tähdet + rivi');
    if(await page.evaluate(() => $('menuBtn').getAttribute('aria-expanded')) === 'true') fail('☰ ruksina vaikka vain rivi auki');
    const rb = await page.locator('#placesMenu').boundingBox(), bb = await page.locator('#placesBtn').boundingBox();
    if(!rb || Math.abs((rb.y + rb.height / 2) - (bb.y + bb.height / 2)) > 3 || rb.x + rb.width > bb.x) fail('rivi ei napin vasemmalla samalla korkeudella ' + JSON.stringify([rb, bb]));
    await page.screenshot({path: OUT + '/paikat-rivi-' + page.viewportSize().width + '.png'});
    await page.click('#placesListOpenBtn'); await page.waitForTimeout(600);
    if(!(await page.evaluate(() => placesViewOpen()))) fail('listanappi ei avannut listaa');
    console.log('paikat-nappi: OK');
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
    await page.evaluate(() => openPlacesView()); await page.waitForTimeout(500);
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
  // Omat paikat sovelluksessa (2026-10-27): tallennus Preferencesiin, ei localStorageen;
  // vanhat localStorage-paikat siirtyvät ensimmäisellä käynnistyksellä.
  // Lippu ei jää nappisarakkeen alle (2026-10-27): piste oikeassa reunassa pilvinapin korkeudella.
  'lippu-reuna': async page => {
    await page.waitForTimeout(800);
    const b = await page.locator('#cloudsBtn').boundingBox(), vw = page.viewportSize().width;
    await page.mouse.click(b.x - 20, b.y + b.height / 2); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const f = state.flagEl.getBoundingClientRect(); let l = 1e9;
      for(const id of ['menuBtn', ...BTN_STACK.map(x => x.id)]){ const e = document.getElementById(id); const q = e && e.getBoundingClientRect(); if(q && q.width) l = Math.min(l, q.left); }
      const h = document.querySelector('header').getBoundingClientRect();
      return {flagRight: f.right, flagLeft: f.left, flagTop: f.top, btnLeft: l, headBottom: h.bottom, headRight: h.right}; });
    const underHead = r.flagLeft < r.headRight && r.flagTop < r.headBottom + 7;
    if(!(r.btnLeft < vw && r.flagRight <= r.btnLeft - 7 && r.flagLeft >= 0 && !underHead)) throw new Error('lippu-reuna: ' + JSON.stringify(r));
  },
  'paikat-natiivi': async page => {
    const fail = m => { throw new Error('paikat-natiivi: ' + m); };
    if(!await page.evaluate(() => PLACES_STORE.native)) fail('PLACES_STORE ei natiivi');
    await page.evaluate(() => { localStorage.removeItem('cap-pref:rv-places');
      localStorage.setItem('rv-places', JSON.stringify({v: 1, places: [{id: 'a', name: 'Vanha', lat: 66, lon: 25, createdAt: 1, updatedAt: 1}]})); });
    await page.reload(); await page.waitForFunction(() => window.map && map.loaded && map.loaded(), null, {timeout: 20000}); await page.waitForTimeout(1500);
    let st = await page.evaluate(() => ({n: places.list.length, pref: localStorage.getItem('cap-pref:rv-places')}));
    if(st.n !== 1 || !st.pref || !st.pref.includes('Vanha')) fail('siirto: ' + JSON.stringify(st));
    await page.evaluate(() => localStorage.removeItem('rv-places'));
    await page.evaluate(() => openPlaceSave(64, 27)); await page.waitForTimeout(300);
    await page.fill('#placeDlgInput', 'Uusi'); await page.click('#placeDlgOk'); await page.waitForTimeout(400);
    st = await page.evaluate(() => ({pref: JSON.parse(localStorage.getItem('cap-pref:rv-places')), ls: localStorage.getItem('rv-places')}));
    if(st.pref.places.length !== 2 || st.ls !== null) fail('tallennus: ' + JSON.stringify(st));
    await page.reload(); await page.waitForFunction(() => window.map && map.loaded && map.loaded(), null, {timeout: 20000}); await page.waitForTimeout(1500);
    if(await page.evaluate(() => places.list.map(p => p.name).join(',')) !== 'Vanha,Uusi') fail('ei säilynyt');
    await page.evaluate(() => openPlacesView()); await page.waitForTimeout(500);
  },
  'sumu-valikko':   async page => { await model(page, 'harmonie'); await cloudsOn(page); await openLayers(page);
    await lmClick(page, 'cloud', 'fog'); await page.waitForTimeout(1200); },
  'sumu':           async page => { await fogView(page); },
  'sumu-sat':       async page => { await openLayers(page); await lmClick(page, 'style', 'satellite'); await page.click('#menuBtn'); await page.waitForTimeout(1500); await fogView(page); },
  'sumu-ecmwf':     async page => { await cloudsOn(page); await openLayers(page); },
  // Satelliittitaso (KOKEILU 2026-10-25): valikko ja kartta (infrapuna / pilvimaski), animaatio pysäytetty uusimpaan.
  'sat-valikko':    async page => { await openLayers(page); await page.evaluate(() => { if(!state.cloudsOn) toggleClouds(); setCloudLayer('sat'); }); await page.waitForTimeout(2500); },
  'sat-ir':         async page => { await satView(page); },
  // Satelliittitila (2026-10-31): aikajana, ajankohta ja mallivalinta piiloon, kuvan aika aikajanan paikalla,
  // ei mallin aluerajaa; takaisin Pilviin -> aikajana samassa paikassa kuin ennen.
  'sat-tila':       async page => {
    await page.evaluate(() => { if(!state.cloudsOn) toggleClouds(); setCloudLayer('total'); });
    const before = await page.evaluate(() => JSON.stringify(document.getElementById('timeline').getBoundingClientRect()));
    await satView(page);
    const r = await page.evaluate(() => {
      const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none' && !e.hidden; };
      const chip = document.getElementById('satChip').getBoundingClientRect(), row = document.getElementById('tlRow').getBoundingClientRect();
      const b = map.getSource('cloud-bounds') && map.getSource('cloud-bounds')._data;
      return {mode: document.body.classList.contains('sat-mode'), tl: vis('timeline'), lbl: vis('timeLbl'), model: vis('modelSrcBtn'), chip: vis('satChip'),
        chipTxt: document.getElementById('satTxt').textContent, chipBottom: chip.bottom, rowBottom: row.bottom, bounds: b ? b.features.length : -1};
    });
    if(!r.mode || r.tl || r.lbl || r.model || !r.chip || r.bounds !== 0 || Math.abs(r.chipBottom - r.rowBottom) > 1)
      throw new Error('sat-tila: ' + JSON.stringify(r));
    console.log('sat-tila: OK ' + r.chipTxt);
    await page.screenshot({path: process.env.SS_PATH_EXTRA || '/dev/null'}).catch(() => {});
    await page.evaluate(() => setCloudLayer('total')); await page.waitForTimeout(400);
    const after = await page.evaluate(() => JSON.stringify(document.getElementById('timeline').getBoundingClientRect()));
    const ok2 = await page.evaluate(() => !document.body.classList.contains('sat-mode') && getComputedStyle(document.getElementById('timeline')).display !== 'none' && document.getElementById('satChip').hidden);
    if(before !== after || !ok2) throw new Error('sat-tila: aikajana ei palannut ' + before + ' -> ' + after);
    console.log('sat-tila: aikajana palasi samaan kohtaan');
    await satView(page);
  },
  // Ruksi kulman ympyrän keskellä (2026-10-31): X:n keskikohta --sheet-r (22 px) ikkunan ylä- ja oikeasta reunasta.
  'ruksi-kamera':   async page => { await kokeiluCams(page); await page.evaluate(() => openCameraCard('levi')); await page.waitForTimeout(600);
    await checkClose(page, '#cameraCard', '#cameraCardClose'); },
  'ruksi-kaavio':   async page => { await page.click('#infoBar'); await page.waitForTimeout(500); await page.evaluate(() => openSwChart('bz')); await page.waitForTimeout(600);
    await checkClose(page, '#info', '#scClose'); },
  'ruksi-selitys':  async page => { await page.click('#infoBar'); await page.waitForTimeout(500); await page.evaluate(() => openGlossary('idx')); await page.waitForTimeout(600);
    await checkClose(page, '#info', '#glClose'); },
  'ruksi-info':     async page => { await glassMap(page); await page.click('#infoBar'); await page.waitForTimeout(700);
    await checkClose(page, '#info', '#infoClose'); },
  'ruksi-tasot':    async page => { await glassMap(page); await page.click('#menuBtn'); await page.waitForTimeout(700);
    await checkClose(page, '#layerMenu', '#lmClose'); },
  'pro-ikkuna-kulma': async page => { await page.evaluate(() => { Features.setTestMode('free'); openProSheet('cloudLayers'); }); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const b = document.getElementById('proSheet').getBoundingClientRect(); return {r: getComputedStyle(document.getElementById('proSheet')).borderRadius, right: innerWidth - b.right}; });
    console.log('pro-ikkuna-kulma: ' + JSON.stringify(r)); },
  // Koko Fennoskandia kerralla (pohjoisraja näkyviin).
  'sat-ir-laaja':   async page => { await satView(page); await page.evaluate(() => map.jumpTo({center: [22, 67], zoom: 3.2})); await page.waitForTimeout(1200); },
  // Kuvan alueen ulkopuoli viivoitettuna + lippu "Ei satelliittidataa tällä alueella".
  'sat-raja':       async page => { await satView(page); await page.evaluate(() => map.jumpTo({center: [0, 64], zoom: 3.6}));
                                     await page.evaluate(() => setPoint(63, -5)); await page.waitForTimeout(900); },
  // Puuttuva data (2026-10-25): Sumu valittuna, malliksi ECMWF -> valinta säilyy himmeänä, lippu "ei saatavilla".
  'sumu-valittu-ecmwf': async page => { await fogView(page); await model(page, 'ecmwf'); await page.waitForTimeout(1200);
    await page.evaluate(() => updateFlag()); await page.waitForTimeout(300); },
  'sumu-valittu-ecmwf-valikko': async page => { await fogView(page); await model(page, 'ecmwf'); await openLayers(page); },
  // 7 vrk (2026-10): lista ja yön 2 / yön 5 tuntinäkymä.
  viikko:          async page => { await openWeek(page); },
  // Tänä yönä V2-kaavio (2026-10-24, selitteet kaavion vasemmassa reunassa).
  // Haptinen palaute (2026-10-27, simuloitu sovellus): naksahdus vain uuteen tuntiin siirryttäessä.
  // Natiivi tasovalikko (2026-10-28): simuloitu iOS-lisäosa LayerSheet kirjaa kutsut window.__ls:ään.
  'natiivi-lm': async page => {
    const fail = m => { throw new Error('natiivi-lm: ' + m); };
    const ls = () => page.evaluate(() => { const h = window.__ls.slice(); window.__ls.length = 0; return h; });
    // 2026-10-30: natiivi vain kokeilukytkimellä (rv-lm-native).
    await page.evaluate(() => { localStorage.setItem('rv-lm-native', '1'); renderProTest(); });
    await page.click('#infoBar'); await page.waitForTimeout(900);
    await page.evaluate(() => $('info').classList.remove('full')); await page.waitForTimeout(600);   // puolikas: ☰ näkyy
    await page.click('#menuBtn'); await page.waitForTimeout(4000);   // ☰ avaa natiivin, infoikkuna sulkeutuu
    let h = await ls();
    const pr = h.find(c => c.fn === 'present');
    if(!pr) fail('☰ ei avannut natiivia ikkunaa: ' + JSON.stringify(h.map(c => c.fn)));
    if(await page.evaluate(() => state.infoOpen)) fail('infoikkuna jäi auki');
    if(await page.evaluate(() => $('layerMenu').classList.contains('open'))) fail('HTML-valikko aukesi myös');
    if(await page.evaluate(() => $('menuBtn').getAttribute('aria-expanded')) !== 'true') fail('☰ aria-expanded ei true');
    if(await page.evaluate(() => getComputedStyle(document.querySelector('#menuBtn .mb-l1')).transform) !== 'none') fail('☰ muuttui X:ksi');
    const st = pr.arg.state;
    if(st.groups.map(g => g.id).join() !== 'aurora,clouds,windToggle,cameras,style') fail('ryhmät ' + st.groups.map(g => g.id));
    for(const k of ['aurora', 'cloud:low', 'cloud:fog', 'wind', 'style:general']) if(!st.icons[k] || !st.icons[k].png) fail('kuvake puuttuu ' + k);
    if(!st.settings.some(r => r.type === 'seg' && r.id === 'clockSeg')) fail('asetukset puuttuvat');
    if(!st.about.items.length || !st.info.length) fail('tietoja/info puuttuu');
    const aur = await page.evaluate(() => state.auroraOn);
    await page.evaluate(() => window.__lsEmit('action', {act: 'aurora', v: ''})); await page.waitForTimeout(900);
    if(await page.evaluate(() => state.auroraOn) === aur) fail('revontulikytkin ei toiminut');
    h = await ls();
    const up = h.filter(c => c.fn === 'update').pop();
    if(!up || up.arg.state.groups[0].on === aur) fail('tila ei päivittynyt natiiviin');
    await page.evaluate(() => window.__lsEmit('action', {act: 'wind', v: '500'})); await page.waitForTimeout(300);
    if(!(await page.evaluate(() => state.windLevel === '500'))) fail('tuulikorkeus ei vaihtunut');
    await page.evaluate(() => window.__lsEmit('action', {act: 'seg', v: 'clockSeg:1'})); await page.waitForTimeout(900);
    if(await page.evaluate(() => UNITS.clock) !== '12') fail('kellonaika-asetus ei vaihtunut');
    h = await ls();
    const up2 = h.filter(c => c.fn === 'update').pop();
    if(!up2 || up2.arg.state.settings.find(r => r.id === 'clockSeg').value !== '1') fail('asetus ei päivittynyt natiiviin');
    await page.evaluate(() => window.__lsEmit('action', {act: 'seg', v: 'clockSeg:0'})); await page.waitForTimeout(300);
    // Kartan napautus sulkee natiivin ikkunan (ei valitse pistettä).
    await page.mouse.click(180, 300); await page.waitForTimeout(900);
    h = await ls();
    if(!h.some(c => c.fn === 'dismiss')) fail('kartan napautus ei sulkenut');
    // Kokeilukytkin pois (2026-10-30) -> HTML-alaikkuna (oletus).
    await page.evaluate(() => $('lmSheetSwitch').click()); await page.waitForTimeout(200);
    await page.click('#menuBtn'); await page.waitForTimeout(900);
    h = await ls();
    if(h.some(c => c.fn === 'present') || !(await page.evaluate(() => $('layerMenu').classList.contains('open')))) fail('kytkin pois: HTML-valikko ei auennut');
    if(!(await page.evaluate(() => document.body.classList.contains('lm-sheet')))) fail('kytkin pois: ei alaikkuna');
    console.log('natiivi-lm: OK');
  },
  // HTML-alaikkuna (2026-10-28, Android/verkko): puolikas, veto koko näytölle ja alas kiinni, infoikkuna poissulkeva.
  // Valitun pillerin napautus kytkee ryhmän pois / takaisin (2026-10-30).
  'pilleri-pois': async page => {
    const fail = m => { throw new Error('pilleri-pois: ' + m); };
    const pill = (act, v) => page.evaluate(([a, v]) => { const b = document.querySelector('#lmBody .lm-pill[data-act="' + a + '"][data-v="' + v + '"]'); b.click(); }, [act, v]);
    const st = () => page.evaluate(() => ({co: state.cloudsOn, cl: state.cloudLayer, wo: state.windOn, wl: state.windLevel,
      cloudOff: document.querySelector('#lmBody .lm-pill[data-act="cloud"]').closest('.lm-pills').classList.contains('off'),
      cloudSel: document.querySelector('#lmBody .lm-pill.sel[data-act="cloud"]').dataset.v,
      windOff: document.querySelector('#lmBody .lm-pill[data-act="wind"]').closest('.lm-pills').classList.contains('off')}));
    await page.evaluate(() => { if(!state.cloudsOn) toggleClouds(); if(!state.windOn) setWindOn(true); setCloudLayer('total'); updateActionStates(); });
    await page.click('#menuBtn'); await page.waitForTimeout(1100);
    let s = await st(); if(!s.co || s.cloudOff) fail('alku ' + JSON.stringify(s));
    await pill('cloud', 'total'); await page.waitForTimeout(300); s = await st();
    if(s.co || !s.cloudOff || s.cloudSel !== 'total') fail('valittu pilleri ei kytkenyt pois / valinta ei säilynyt ' + JSON.stringify(s));
    await page.screenshot({path: OUT + '/pilleri-pois-' + page.viewportSize().width + '.png'});
    await pill('cloud', 'total'); await page.waitForTimeout(300); s = await st();
    if(!s.co || s.cloudOff || s.cl !== 'total') fail('himmeä valittu ei kytkenyt takaisin ' + JSON.stringify(s));
    await pill('cloud', 'total'); await page.waitForTimeout(300);
    await pill('cloud', 'low'); await page.waitForTimeout(300); s = await st();
    if(!s.co || s.cl !== 'low') fail('muu pilleri ei kytkenyt päälle + vaihtanut ' + JSON.stringify(s));
    await pill('wind', 'surface'); await page.waitForTimeout(300); s = await st();
    if(s.wo || !s.windOff || s.wl !== 'surface') fail('tuulen valittu pilleri ei kytkenyt pois ' + JSON.stringify(s));
    await pill('wind', 'surface'); await page.waitForTimeout(300); s = await st();
    if(!s.wo || s.windOff) fail('tuuli ei palannut ' + JSON.stringify(s));
    if(!(await page.evaluate(() => $('cloudsBtn').classList.contains('on')))) fail('pikapalkin pilvinappi ei synkassa');
    console.log('pilleri-pois: OK');
  },
  // Lasi-ikkunat (2026-10-30): revontulet + pilvet päällä kartalla, infoikkuna ja tasovalikko puoli-/täyskorkeudella.
  // 2026-10-31: ikkunat avautuvat täyteen korkeuteen; puolikas = .full pois.
  'lasi-info-puoli': async page => { await glassMap(page); await page.click('#infoBar'); await page.waitForTimeout(500);
    await page.evaluate(() => $('info').classList.remove('full')); await page.waitForTimeout(700); },
  'lasi-info-koko':  async page => { await glassMap(page); await page.click('#infoBar'); await page.waitForTimeout(500);
    await page.click('#tabBtnNight'); await page.waitForTimeout(900); },
  'lasi-tasot-puoli': async page => { await glassMap(page); await page.click('#menuBtn'); await page.waitForTimeout(500);
    await page.evaluate(() => $('layerMenu').classList.remove('full')); await page.waitForTimeout(700); },
  'lasi-tasot-koko': async page => { await glassMap(page); await page.click('#menuBtn'); await page.waitForTimeout(900); },
  // Ikkunauudistus (2026-10-30, päätökset 8 ja 26): kolme ikkunatyyppiä puolikkaana ja täytenä; jokaisessa
  // tarkistetaan geometria (sheetGeom) ja X (checkClose: sama paikka, ei osu sisältöön).
  'ikkuna-tasot-koko':  async page => { await glassMap(page); await openSheet(page, 'tasot', true); },
  'ikkuna-nyt-puoli':   async page => { await glassMap(page); await openSheet(page, 'info', false); },
  'ikkuna-nyt-koko':    async page => { await glassMap(page); await openSheet(page, 'info', true); },
  'ikkuna-yo-puoli':    async page => { await glassMap(page); await openSheet(page, 'info', false, '#tabBtnNight'); },
  'ikkuna-yo-koko':     async page => { await glassMap(page); await openSheet(page, 'info', true, '#tabBtnNight'); },
  'ikkuna-viikko-puoli': async page => { await glassMap(page); await openSheet(page, 'info', false, '#tabBtn7d'); },
  'ikkuna-viikko-koko': async page => { await glassMap(page); await openSheet(page, 'info', true, '#tabBtn7d'); },
  // Kamerakortti: sisällön korkuinen (ei vieritystä), ei kahvaa; Kaikki kamerat aina täysi (2026-10-31).
  'ikkuna-kamera': async page => { await kokeiluCams(page); await openSheet(page, 'kamera', false);
    const r = await page.evaluate(() => { const c = $('cameraCard'), b = c.querySelector('.rv-modal-body');
      return {grip: !!c.querySelector('.is-grip-zone'), over: b.scrollHeight - b.clientHeight, cardH: c.offsetHeight, max: sheetMaxH()}; });
    if(r.grip || r.over > 1 || r.cardH > r.max + 1) throw new Error('ikkuna-kamera: ' + JSON.stringify(r));
    await page.mouse.click(100, 140); await page.waitForTimeout(700);
    if(!(await page.evaluate(() => $('cameraCardBackdrop').classList.contains('open')))) throw new Error('ikkuna-kamera: kartan napautus sulki kortin');
    console.log('ikkuna-kamera: OK ' + JSON.stringify(r)); },
  // Kamerakortti ja Kaikki kamerat (2026-10-31): sama lasitausta kuin infoikkunassa, avautuu alhaalta liukuen.
  'ikkuna-kamera-lasi': async page => { await kokeiluCams(page);
    const fail = m => { throw new Error('ikkuna-kamera-lasi: ' + m); };
    const look = sel => page.evaluate(s => { const cs = getComputedStyle(document.querySelector(s));
      return {bg: cs.backgroundColor, blur: cs.backdropFilter || cs.webkitBackdropFilter, border: cs.borderTopColor}; }, sel);
    const info = await look('#info');
    for(const [open, sel] of [[() => openCameraCard('levi'), '#cameraCard'], [() => openCameraGrid(), '#cameraGridSheet']]){
      await page.evaluate(open);
      const t0 = await page.evaluate(s => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m42, sel);
      await page.waitForTimeout(900);
      const t1 = await page.evaluate(s => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m42, sel);
      const l = await look(sel);
      if(l.bg !== info.bg || l.blur !== info.blur || l.border !== info.border) fail(sel + ' tausta ' + JSON.stringify({l, info}));
      if(!(t0 > 20) || Math.abs(t1) > 0.5) fail(sel + ' ei liukunut: alussa ' + t0 + ', lopussa ' + t1);
      console.log('ikkuna-kamera-lasi: ' + sel + ' OK (siirtymä ' + Math.round(t0) + ' -> ' + t1 + ')');
      await page.evaluate(() => { closeCameraCard(); closeCameraGrid(); }); await page.waitForTimeout(500);
    }
  },
  'ikkuna-ruudukko': async page => { await kokeiluCams(page); await page.evaluate(() => openCameraGrid()); await page.waitForTimeout(900);
    if(await page.evaluate(() => innerWidth < 700)) await sheetGeom(page, '#cameraGridSheet', true);
    await checkClose(page, '#cameraGridSheet', '#cameraGridClose');
    await page.click('#cameraGridSheet .is-grip-zone'); await page.waitForTimeout(700);
    if(await page.evaluate(() => $('cameraGridBackdrop').classList.contains('open'))) throw new Error('ikkuna-ruudukko: kahva ei sulkenut');
    console.log('ikkuna-ruudukko: OK'); },
  // Infoikkunan päälle avautuvat näkymät (2026-10-31): samassa ikkunassa, taaksepäin = edellinen, X = kaikki kiinni.
  'ikkuna-kaavio': async page => { await glassMap(page); await openSheet(page, 'info', true);
    const fail = m => { throw new Error('ikkuna-kaavio: ' + m); };
    const st = () => page.evaluate(() => ({info: state.infoOpen, chart: !!swc.key, gl: gl.open, sub: $('info').classList.contains('sub-open')}));
    await page.evaluate(() => openSwChart('bz')); await page.waitForTimeout(700);
    await checkClose(page, '#info', '#scClose');
    await page.screenshot({path: page.__shot ? page.__shot('kaavio') : undefined}).catch(() => {});
    await page.click('#scInfo'); await page.waitForTimeout(700);
    await checkClose(page, '#info', '#glClose');
    await page.screenshot({path: page.__shot ? page.__shot('selitys') : undefined}).catch(() => {});
    await page.click('#glBack'); await page.waitForTimeout(600);
    let r = await st(); if(!r.info || !r.chart || r.gl) fail('selitysten taaksepäin ' + JSON.stringify(r));
    await page.click('#scBack'); await page.waitForTimeout(600);
    r = await st(); if(!r.info || r.chart || r.sub) fail('kaavion taaksepäin ' + JSON.stringify(r));
    await page.evaluate(() => openSwChart('kp')); await page.waitForTimeout(500);
    await page.click('#scInfo'); await page.waitForTimeout(500);
    await page.click('#glClose'); await page.waitForTimeout(800);
    r = await st(); if(r.info || r.chart || r.gl) fail('X ei sulkenut kaikkea ' + JSON.stringify(r));
    console.log('ikkuna-kaavio: OK'); },

  // Raahaus: kesken vedon (puolikkaan ja täyden välissä) sivurako ja kulmasäde välissä (SHEET.liveWidth).
  'ikkuna-raahaus': async page => { await glassMap(page); await openSheet(page, 'info', false);
    // Hiiri (ei kosketuksen implisiittistä kaappausta): aloitus otsikkorivin keskeltä, ensimmäiset askeleet rivin sisällä.
    const g = await page.locator('#info .is-head .sheet-head').boundingBox(), H = await page.evaluate(() => innerHeight);
    const x0 = g.x + 70, y0 = g.y + g.height / 2;
    await page.mouse.move(x0, y0); await page.mouse.down();
    for(let i = 1; i <= 30; i++){ await page.mouse.move(x0, y0 - H * 0.2 * i / 30); await page.waitForTimeout(25); }
    await page.waitForTimeout(200);
    const mid = await page.evaluate(() => { const r = $('info').getBoundingClientRect(); return {left: r.left, rad: parseFloat(getComputedStyle($('info')).borderTopLeftRadius)}; });
    await page.screenshot({path: page.__shot ? page.__shot('kesken') : undefined}).catch(() => {});
    await page.mouse.up(); await page.waitForTimeout(800);
    if(!(mid.left > 0.5 && mid.left < 8.5 && mid.rad < 35 && mid.rad > 28)) throw new Error('ikkuna-raahaus: leveys ei seurannut ' + JSON.stringify(mid));
    console.log('ikkuna-raahaus: kesken vedon ' + JSON.stringify(mid)); },
  // Kosketusveto (CDP-kosketustapahtumat kuten puhelimessa): infoikkuna ja tasovalikko täydestä alas -> kiinni.
  'ikkuna-kosketusveto': async page => {
    const fail = m => { throw new Error('ikkuna-kosketusveto: ' + m); };
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (x, y0, y1, steps = 12, ms = 16) => {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y: y0}]});
      for(let i = 1; i <= steps; i++){ await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y0 + (y1 - y0) * i / steps}]}); await page.waitForTimeout(ms); }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); await page.waitForTimeout(900);
    };
    const H = await page.evaluate(() => innerHeight);
    for(const [name, open, sel, isOpen] of [
      ['info', () => page.evaluate(() => setInfoOpen(true)), '#info', () => page.evaluate(() => state.infoOpen)],
      ['tasot', () => page.click('#menuBtn'), '#layerMenu', () => page.evaluate(() => state.openMenu === 'layerMenu')]]){
      await open(); await page.waitForTimeout(900);
      const hs = sel === '#info' ? '#info .is-head .sheet-head' : sel + ' .sheet-head';
      const g = await page.locator(hs).boundingBox();
      const x = g.x + 80, y = g.y + g.height / 2;
      await swipe(x, y, y + H * 0.85, 14, 30);   // hidas veto lähes alas
      const r1 = await isOpen(), half = await page.evaluate(s => !document.querySelector(s).classList.contains('full'), sel);
      // 2026-10-31: infoikkuna täydestä -> puolikas, puolikkaasta -> kiinni; tasovalikko -> kiinni.
      if(name === 'info'){
        if(!r1 || !half) fail('info: veto täydestä ei vienyt puolikkaaseen');
        const g2 = await page.locator(hs).boundingBox(); await swipe(g2.x + 80, g2.y + 20, g2.y + 20 + H * 0.3, 5, 10);
        if(await isOpen()) fail('info: veto puolikkaasta ei sulkenut');
      } else if(r1) fail(name + ': veto ei sulkenut');
      console.log('ikkuna-kosketusveto: ' + name + ' OK');
    }
  },
  // Infoikkuna auki + kartan napautus -> ikkuna pysyy auki ja vaihtuu Valittu piste -tilaan (säilytettävä toiminta).
  'ikkuna-karttanapautus': async page => { await glassMap(page); await openSheet(page, 'info', false);
    await page.evaluate(() => { state.infoMode = 'own'; renderInfo(); });
    await page.mouse.click(120, 160); await page.waitForTimeout(1100);
    const r = await page.evaluate(() => ({open: state.infoOpen, mode: state.infoMode, point: !!state.point}));
    if(!r.open || r.mode !== 'point' || !r.point) throw new Error('ikkuna-karttanapautus: ' + JSON.stringify(r));
    console.log('ikkuna-karttanapautus: OK ' + JSON.stringify(r)); },
  // Yläpalkki (2026-10-31): logonappi PRO-merkillä (testitila Pro) ja ilman.
  // Oman sijainnin ikoni (2026-10-31): pois (sijainti ei tiedossa) ja päällä (simuloitu sijainti).
  'sijainti-ikoni':  async page => { await page.evaluate(() => { state.ownLoc = {lat: 66.5, lon: 25.7}; setOwnLocState('ok'); drawOwnMarker(); }); await page.waitForTimeout(400); },
  'logo-pro':        async page => { await glassMap(page); await page.evaluate(() => { Features.setTestMode('pro'); renderProChip(); }); await page.waitForTimeout(300); },
  'logo-tietoja':    async page => { await glassMap(page); await page.evaluate(() => openAboutView()); await page.waitForTimeout(900); },
  // Aika-akseli 12 h -muodossa (2026-10-30): merkinnät eivät saa mennä päällekkäin 360 px:ssä.
  'lasi-yo-12h': async page => { await page.evaluate(() => setUnit('clock', '12')); await glassMap(page); await page.click('#infoBar'); await page.waitForTimeout(500);
    await page.click('#tabBtnNight'); await page.waitForTimeout(900);
    const ok = await page.evaluate(() => { const r = [...document.querySelectorAll('#nightChart .ch-axis')].map(e => e.getBoundingClientRect());
      return r.every((a, i) => i === 0 || a.left >= r[i-1].right + 2); });
    if(!ok) throw new Error('lasi-yo-12h: aika-akselin merkinnät päällekkäin'); console.log('lasi-yo-12h: akseli OK'); },
  'alaikkuna-toiminta': async page => {
    const fail = m => { throw new Error('alaikkuna: ' + m); };
    const box = () => page.evaluate(() => { const r = $('layerMenu').getBoundingClientRect(), m = $('menus').getBoundingClientRect(), cs = getComputedStyle($('layerMenu')); return {top: r.top, bottom: r.bottom, h: r.height, H: innerHeight, open: $('layerMenu').classList.contains('open'), tf: cs.transform, mt: m.top, mb: m.bottom, par: $('layerMenu').parentElement.id, pos: cs.position}; });
    await page.click('#infoBar'); await page.waitForTimeout(1100);
    await page.evaluate(() => $('info').classList.remove('full')); await page.waitForTimeout(500);   // puolikas: ☰ näkyy
    await page.click('#menuBtn'); await page.waitForTimeout(1100);   // ☰ avaa tasovalikon, infoikkuna sulkeutuu
    await page.waitForFunction(() => getComputedStyle($('layerMenu')).transform === 'none', null, {timeout: 5000}).catch(() => {});
    let b = await box();
    // 2026-10-30 (päätös 8): avautuu täyteen korkeuteen, ei alarakoa (ikkuna jatkuu näytön alareunaan).
    const gap = b.H - b.bottom;
    if(!b.open || Math.abs(gap) > 1 || !(await page.evaluate(() => $('layerMenu').classList.contains('full')))) fail('ei täyskorkeana ' + JSON.stringify(b));
    if(await page.evaluate(() => state.infoOpen)) fail('infoikkuna jäi auki');
    const g = await page.locator('#lmGrip').boundingBox();
    const drag = async (dy, steps = 8) => { await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
      for(let i = 1; i <= steps; i++){ await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + dy * i / steps); await page.waitForTimeout(40); }
      await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(1100); };
    // 2026-10-31: tasovalikko aina täysi tai kiinni. Lyhyt hidas veto -> takaisin täyteen, pitkä -> kiinni.
    await drag(b.H * 0.12, 16);
    b = await box();
    if(!b.open || !(await page.evaluate(() => $('layerMenu').classList.contains('full'))) || Math.abs(b.H - b.bottom) > 1) fail('lyhyt veto ei palannut täyteen ' + JSON.stringify(b));
    const g2 = await page.locator('#lmGrip').boundingBox(); Object.assign(g, g2);
    await drag(b.H * 0.4, 16);
    b = await box();
    if(b.open) fail('veto alas ei sulkenut');
    await page.click('#menuBtn'); await page.waitForTimeout(1100);
    await page.click('#lmGrip'); await page.waitForTimeout(900);
    if((await box()).open) fail('kahvan napautus ei sulkenut');
    await page.click('#menuBtn'); await page.waitForTimeout(1100);
    await page.screenshot({path: page.__shot ? page.__shot('x') : undefined}).catch(() => {});
    await page.evaluate(() => setInfoOpen(true)); await page.waitForTimeout(1100);   // alapalkki on alaikkunan alla
    if(await page.evaluate(() => state.openMenu)) fail('infoikkunan avaus ei sulkenut tasovalikkoa');
    await page.evaluate(() => setInfoOpen(false)); await page.waitForTimeout(300);
    await page.click('#menuBtn'); await page.waitForTimeout(1100);
    if(await page.evaluate(() => getComputedStyle(document.querySelector('#menuBtn .mb-l1')).transform) !== 'none') fail('☰ muuttui X:ksi');
    await page.click('#lmClose'); await page.waitForTimeout(700);
    if(await page.evaluate(() => state.openMenu)) fail('X ei sulkenut');
    console.log('alaikkuna-toiminta: OK');
  },
  // Haptiikka napeissa (2026-10-31, päätös 25): kaikki kytkimet, X, välilehdet ja ikkunan napsahdus -> palaute;
  // pikapalkki, pillerit ja Oma sijainti / Valittu piste -> ei; "haptiikka pois" hiljentää kaiken.
  'haptiikka-napit': async page => {
    const fail = m => { throw new Error('haptiikka-napit: ' + m); };
    const hap = () => page.evaluate(() => { const h = window.__hap.slice(); window.__hap.length = 0; return h; });
    const sel = h => h.filter(x => x === 'selectionChanged').length, imp = h => h.filter(x => x === 'impact').length;
    const expect = async (what, want) => { await page.waitForTimeout(250); const h = await hap();
      const got = want === 'sel' ? sel(h) === 1 && !imp(h) : want === 'imp' ? imp(h) === 1 && !sel(h) : h.length === 0;
      if(!got) fail(what + ': odotettiin ' + want + ', saatiin ' + JSON.stringify(h)); console.log('haptiikka-napit: ' + what + ' OK'); };
    await page.waitForTimeout(400); await hap();
    await page.click('#cloudsBtn'); await expect('pikapalkki', 'none');
    await page.click('#menuBtn'); await page.waitForTimeout(800); await hap();
    for(const act of ['aurora', 'cameras', 'windToggle', 'clouds']){
      await page.click('#lmBody .lm-swbtn[data-act="' + act + '"]'); await expect('kytkin ' + act, 'sel');
      await page.click('#lmBody .lm-row.lm-grow[data-act="' + act + '"]'); await expect('kytkinrivi ' + act, 'sel');
    }
    await page.click('#lmBody .lm-pill[data-act="cloud"]:not(.sel)'); await expect('pilleri', 'none');
    await page.click('#lmBody [data-act="settings"]'); await page.waitForTimeout(400); await hap();
    await page.click('#quickbarSwitch'); await expect('asetuskytkin', 'sel');
    await page.click('#quickbarSwitch'); await hap();
    await page.click('#lmClose'); await expect('X tasovalikko', 'imp');
    await page.evaluate(() => setInfoOpen(true)); await page.waitForTimeout(800); await hap();
    await page.click('#tabBtnNight'); await expect('välilehti', 'sel');
    await page.click('#tabBtnNight'); await expect('sama välilehti', 'none');
    await page.evaluate(() => { setPoint(66, 25); state.infoMode = 'own'; renderInfo(); }); await page.waitForTimeout(300); await hap();
    await page.click('#locPointBtn'); await expect('Oma sijainti / Valittu piste', 'none');
    await page.click('#infoGrip'); await expect('kahva (napsahdus)', 'imp');
    await page.click('#infoClose'); await expect('X infoikkuna', 'imp');
    await page.evaluate(() => { hapticsOn = false; }); await page.click('#menuBtn'); await page.waitForTimeout(700); await hap();
    await page.click('#lmBody .lm-swbtn[data-act="aurora"]'); await page.click('#lmClose'); await expect('haptiikka pois', 'none');
  },
  // Tilakuvat (päätös 27): pikapalkki, X, välilehtien alleviivaus, kytkimet; alleviivaus valitun välilehden kohdalla.
  'napit-ilme': async page => { await glassMap(page); await page.evaluate(() => { if(!state.camerasOn) toggleCameras(); }); await page.waitForTimeout(600);
    await page.click('#infoBar'); await page.waitForTimeout(600); await page.evaluate(() => $('info').classList.remove('full'));
    await page.click('#tabBtnNight'); await page.waitForTimeout(900);
    const r = await page.evaluate(() => { const i = $('tabInd').getBoundingClientRect(), b = $('tabBtnNight').getBoundingClientRect(); return {il: i.left, iw: i.width, bl: b.left, bw: b.width}; });
    if(Math.abs(r.il - r.bl) > 1 || Math.abs(r.iw - r.bw) > 1) throw new Error('napit-ilme: alleviivaus väärässä kohdassa ' + JSON.stringify(r));
    console.log('napit-ilme: alleviivaus OK'); },
  // Kontrasti (päätös 27): pikapalkki valkoisen pilven ja satelliittikuvan päällä, kamerat päällä (aktiivinen rengas).
  'napit-pilvi': async page => { await glassMap(page); await page.evaluate(() => { if(!state.camerasOn) toggleCameras(); map.jumpTo({center: [18, 67], zoom: 4.2}); }); await page.waitForTimeout(1200); },
  'napit-sat': async page => { await satView(page); await page.evaluate(() => { if(!state.camerasOn) toggleCameras(); }); await page.waitForTimeout(800); },
  'napit-kytkimet': async page => { await glassMap(page); await page.click('#menuBtn'); await page.waitForTimeout(900);
    const k = await page.evaluate(() => { const t = document.querySelector('#lmBody .sw-track').getBoundingClientRect(), n = document.querySelector('#lmBody .sw-knob').getBoundingClientRect(); return {tw: t.width, th: t.height, kw: n.width}; });
    if(k.tw !== 51 || k.th !== 31 || k.kw !== 27) throw new Error('napit-kytkimet: koko ' + JSON.stringify(k));
    console.log('napit-kytkimet: koko OK ' + JSON.stringify(k)); },
  'haptiikka': async page => {
    const fail = m => { throw new Error('haptiikka: ' + m); };
    const hap = () => page.evaluate(() => { const h = window.__hap.slice(); window.__hap.length = 0; return h; });
    const count = (h, fn) => h.filter(x => x === fn).length;
    if(await page.evaluate(() => $('hapticsSwitch').hidden)) fail('kytkin piilossa sovelluksessa');
    await hap();
    // Aikajana: 0 -> 0,5 (sama tunti) -> 1 -> 1,4 -> 2 -> change
    await page.evaluate(() => { const sl = $('timeSlider'); sl.step = 'any'; });
    for(const v of [0.5, 1, 1.4, 2]){ await page.evaluate(v => { const sl = $('timeSlider'); sl.value = v; sl.dispatchEvent(new Event('input', {bubbles: true})); }, v); await page.waitForTimeout(60); }
    await page.evaluate(() => $('timeSlider').dispatchEvent(new Event('change', {bubbles: true})));
    let h = await hap();
    if(count(h, 'selectionChanged') !== 2 || count(h, 'selectionStart') !== 1 || count(h, 'selectionEnd') !== 1) fail('aikajana ' + h.join(','));
    // Tänä yönä -kaavio: veto vasemmalta oikealle, sitten liike saman tunnin sisällä.
    await page.click('#infoBar'); await page.waitForTimeout(500); await page.click('#tabBtnNight'); await page.waitForTimeout(800);
    await page.evaluate(() => { $('info').classList.add('full'); $('nightChartWrap').scrollIntoView({block: 'center'}); }); await page.waitForTimeout(400);
    const r = await page.locator('#nightChartWrap svg').boundingBox(), y = r.y + r.height * 0.4;
    await hap();
    await page.mouse.move(r.x + 40, y); await page.mouse.down();
    for(let x = r.x + 40; x <= r.x + r.width - 10; x += 4){ await page.mouse.move(x, y); await page.waitForTimeout(45); }
    h = await hap();
    const hours = await page.evaluate(() => { const n = state.night || null; return n && n.hours ? n.hours.length : null; });
    const ticks = count(h, 'selectionChanged');
    if(ticks < 3) fail('kaavio: liian vähän naksahduksia ' + ticks + ' (tunteja ' + hours + ')');
    for(let k = 0; k < 4; k++){ await page.mouse.move(r.x + r.width - 10 + (k % 2), y); await page.waitForTimeout(45); }
    h = await hap(); if(count(h, 'selectionChanged') !== 0) fail('naksahdus saman tunnin sisällä');
    await page.mouse.up(); await page.waitForTimeout(100);
    h = await hap(); if(count(h, 'selectionEnd') !== 1) fail('ei lopetusta: ' + h.join(','));
    // Kytkin pois -> ei kutsuja.
    await page.evaluate(() => { hapticsOn = false; const sl = $('timeSlider'); sl.value = 5; sl.dispatchEvent(new Event('input', {bubbles: true})); });
    h = await hap(); if(h.length) fail('kytkin pois, silti ' + h.join(','));
  },
  'yo-kaavio':     async page => {
    await page.click('#infoBar');
    await page.waitForTimeout(500);
    await page.click('#tabBtnNight');
    await page.waitForTimeout(800);
    await page.waitForTimeout(800);
    await page.evaluate(() => { $('info').classList.add('full'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => $('nightChartWrap').scrollIntoView({block: 'end'}));
    await page.waitForTimeout(300);
  },
  'viikko-yo1':    async page => { await openWeek(page); await page.click('#weekList .wk-row[data-k="0"]'); await page.waitForTimeout(600); },
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
async function glassMap(page){
  await cloudsOn(page);
  await page.evaluate(() => { if(!state.auroraOn) toggleAurora(); map.jumpTo({center: [25, 67.5], zoom: map.getContainer().clientWidth < 700 ? 4.2 : 5}); });
  await page.waitForTimeout(1200);
}
// X (päätös 26, 2026-10-30): keskikohta 1 (reunaviiva) + 12 + 22 = 35 px ikkunan ylä- ja oikeasta reunasta kaikissa alaikkunoissa
// (puhelimella; ei riipu kulmasäteestä eikä koosta), X otsikkorivin sisällä eikä osu mihinkään muuhun näkyvään.
// Muut ikkunat (kaaviot, selitykset): vanha sääntö, keskikohta = kulmasäde.
const SHEET_BOXES = ['#info', '#layerMenu', '#cameraCard', '#cameraGridSheet'];
async function checkClose(page, boxSel, btnSel){
  const r = await page.evaluate(([bs, cs]) => {
    const box = document.querySelector(bs), btn = document.querySelector(cs);
    if(!box || !btn) return {err: 'ei löydy ' + bs + ' / ' + cs};
    const b = box.getBoundingClientRect(), c = btn.getBoundingClientRect();
    const head = btn.closest('.sheet-head'), h = head && head.getBoundingClientRect();
    // Päällekkäisyys: näkyvät lehtielementit ikkunassa, jotka eivät ole X tai otsikkorivin kahva/otsikko.
    const hits = [];
    for(const el of box.querySelectorAll('button, a, input, p, span, h2, h3, h4, svg, img, [role="radio"], [role="tab"]')){
      if(btn.contains(el) || el.contains(btn) || (head && head.contains(el) && el.closest('.is-grip-zone'))) continue;
      const e0 = el.getBoundingClientRect();
      // Vierivän säiliön ulkopuolelle vierinyt osa ei näy: leikataan säiliön alueeseen.
      let sc = el.parentElement; while(sc && sc !== box && !/(auto|scroll|hidden)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
      const cr = sc && sc !== box ? sc.getBoundingClientRect() : e0;
      const e = {left: Math.max(e0.left, cr.left), right: Math.min(e0.right, cr.right), top: Math.max(e0.top, cr.top), bottom: Math.min(e0.bottom, cr.bottom)};
      e.width = e.right - e.left; e.height = e.bottom - e.top;
      if(e.width <= 0 || e.height <= 0 || !e0.width || !e0.height || getComputedStyle(el).visibility === 'hidden' || el.closest('[hidden]')) continue;
      const cx = (c.left + c.right) / 2, cy = (c.top + c.bottom) / 2, rr = 18;   // näkyvä ympyrä
      if(e.right > cx - rr && e.left < cx + rr && e.bottom > cy - rr && e.top < cy + rr) hits.push((el.id || el.className.baseVal || el.className || el.tagName) + '');
    }
    return {radius: parseFloat(getComputedStyle(box).borderTopRightRadius), top: (c.top + c.bottom) / 2 - b.top, right: b.right - (c.left + c.right) / 2,
      size: c.width, inHead: !!h && c.top >= h.top - 0.5 && c.bottom <= h.bottom + 0.5, hits};
  }, [boxSel, btnSel]);
  if(r.err) throw new Error('ruksi ' + btnSel + ': ' + r.err);
  const sheet = SHEET_BOXES.includes(boxSel) && (await page.evaluate(() => innerWidth < 700) || boxSel === '#layerMenu');
  if(sheet){
    if(Math.abs(r.top - 35) > 1 || Math.abs(r.right - 35) > 1 || r.size !== 44 || !r.inHead || r.hits.length) throw new Error('ruksi ' + btnSel + ': ' + JSON.stringify(r));
  } else if(Math.abs(r.top - r.radius) > 1 || Math.abs(r.right - r.radius) > 1) throw new Error('ruksi ' + btnSel + ': ' + JSON.stringify(r));
  console.log('ruksi ' + btnSel + ' OK: ' + JSON.stringify(r));
}
// Alaikkunan geometria (päätös 8): puolikas = sivuraot 9 px, ei alarakoa, alakulmat suorat, yläkulmat 35 px;
// täysi = ei rakoja, yläreuna turva-alueen alla, yläkulmat 28 px.
async function sheetGeom(page, sel, full){
  const g = await page.evaluate(s => { const el = document.querySelector(s), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:env(safe-area-inset-top);left:0;height:0';
    document.body.appendChild(probe); const st = probe.getBoundingClientRect().top; probe.remove();
    return {left: r.left, right: innerWidth - r.right, bottom: innerHeight - r.bottom, top: r.top, safeTop: st,
      rTop: parseFloat(cs.borderTopLeftRadius), rBot: parseFloat(cs.borderBottomLeftRadius), full: el.classList.contains('full')}; }, sel);
  const ok = full ? ((g.full || sel === '#cameraGridSheet') && g.left < 0.5 && g.right < 0.5 && Math.abs(g.bottom) < 1 && Math.abs(g.top - g.safeTop) < 1 && Math.abs(g.rTop - 28) < 0.5 && g.rBot === 0)
                  : (!g.full && Math.abs(g.left - 9) < 0.5 && Math.abs(g.right - 9) < 0.5 && Math.abs(g.bottom) < 1 && Math.abs(g.rTop - 35) < 0.5 && g.rBot === 0);
  if(!ok) throw new Error('geometria ' + sel + (full ? ' täysi: ' : ' puolikas: ') + JSON.stringify(g));
  console.log('geometria ' + sel + (full ? ' täysi' : ' puolikas') + ' OK');
}
async function openSheet(page, kind, full, tab){
  const [sel, x] = {tasot: ['#layerMenu', '#lmClose'], info: ['#info', '#infoClose'], kamera: ['#cameraCard', '#cameraCardClose']}[kind];
  if(kind === 'tasot') await page.click('#menuBtn');
  if(kind === 'info') await page.click('#infoBar');
  if(kind === 'kamera') await page.evaluate(() => openCameraCard('levi'));
  await page.waitForTimeout(700);
  if(tab){ await page.click(tab); await page.waitForTimeout(700); }
  await page.evaluate(([s, f]) => document.querySelector(s).classList.toggle('full', f), [sel, full]);
  await page.waitForTimeout(800);
  if(await page.evaluate(() => innerWidth < 700)) await sheetGeom(page, sel, full);
  await checkClose(page, sel, x);
}
async function satView(page){
  await page.evaluate(() => { if(state.auroraOn) toggleAurora(); });
  await page.evaluate(() => { if(!state.cloudsOn) toggleClouds(); setCloudLayer('sat'); });
  await page.evaluate(() => map.jumpTo({center: [22, 65.5], zoom: map.getContainer().clientWidth < 700 ? 3.9 : 4.6}));
  await page.waitForFunction(() => !!satImg.frame, null, {timeout: 20000}).catch(() => {});
  await page.waitForTimeout(1200);
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
let EDITED_FX_CACHE = null;
const EDITED_FX = {get meta(){ return (EDITED_FX_CACHE ||= fx.editedFixture()).meta; }, step: i => (EDITED_FX_CACHE ||= fx.editedFixture()).step(i)};
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
// --ilme=suni (2026-10-27): Suni-ilme (?ilme=suni); oletus nykyinen ilme.
const PAGE_QS = args.ilme ? '?ilme=' + encodeURIComponent(args.ilme) : '';

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
  // Editoitu ennuste (2026-10-26): --edited=0 -> puuttuu (Tänä yönä valitulla mallilla).
  if(/\/data\/clouds-edited-/.test(url)){
    if(args.edited === '0') return route.fulfill({status: 404, body: ''});
    const em = url.match(/clouds-edited-step(\d+)\.json/);
    return json(JSON.stringify(em ? EDITED_FX.step(+em[1]) : EDITED_FX.meta));
  }
  if(KOKEILU && url.startsWith(BASE + 'data/camera-status.json')) return json(kokeiluStatus());
  if(KOKEILU && /jokkmokk\.jp/.test(url)) return route.fulfill({status: 404, body: ''});   // ei lataudu
  // Still-kameroiden kuvat: synteettinen kaikkitaivaskuva (ei verkkoa).
  if(/sgo\.fi|ursa\.fi|kho\.unis\.no|jokkmokk\.jp|starvisor\.net|ucalgary\.ca|nps\.gov|jtvnw\.net/.test(url))
    return route.fulfill({body: STILL_SVG, contentType: 'image/svg+xml'});
  const wm = url.match(/\/data\/wind-(?:ecmwf|icon_eu|harmonie|edited)-\w+?(-meta|-step(\d+))?\.json/);
  if(wm && wm[1] === '-meta'){ const {u, v, ...m} = JSON.parse(b.wind); return json(JSON.stringify(m)); }
  if(wm && wm[2]){ const w = JSON.parse(b.wind), N = w.nlat*w.nlon, i = +wm[2], sl = x => Buffer.from(x, 'base64').subarray(i*N, (i+1)*N).toString('base64');
    return json(JSON.stringify({u: sl(w.u), v: sl(w.v)})); }
  if(/\/data\/wind-(ecmwf|icon_eu|harmonie|edited)-/.test(url)) return json(b.wind);
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
  // Satelliittitaso (kokeilu): EUMETView synteettisenä.
  if(url.includes('view.eumetsat.int') && /GetCapabilities/.test(url)) return route.fulfill({body: fx.satCaps(), contentType: 'text/xml', headers: {'access-control-allow-origin': '*'}});
  if(url.includes('view.eumetsat.int') && /GetMap/.test(url)){
    // --satdir=kansio: oikeat EUMETView-kuvat (koehaun tallentamat <taso>.png), muuten synteettinen.
    const real = args.satdir && path.join(String(args.satdir), new URL(url).searchParams.get('layers').replace(':', '_') + '.png');
    const body = real && fs.existsSync(real) ? fs.readFileSync(real) : fx.satPng(url);
    return route.fulfill({body, contentType: 'image/png', headers: {'access-control-allow-origin': '*'}});
  }
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
    // Sovellus (Capacitor) simuloituna: Preferences-plugin tallentaa avaimeen 'cap-pref:<avain>'
    // (eri kuin sivun oma localStorage-avain) -> testi näkee, kumpaan tallennus menee.
    // Haptics-plugin kirjaa kutsut window.__hap-listaan (tila haptiikka).
    if(state === 'paikat-natiivi' || state === 'haptiikka' || state === 'haptiikka-napit') await ctx.addInitScript(() => {
      window.__hap = [];
      const rec = name => new Proxy({}, {get: (o, fn) => async arg => { window.__hap.push(fn); }});
      window.Capacitor = {isNativePlatform: () => true, registerPlugin: name => name === 'Haptics' ? rec(name) : name !== 'Preferences' ? {} : {
        get: async ({key}) => ({value: localStorage.getItem('cap-pref:' + key)}),
        set: async ({key, value}) => { localStorage.setItem('cap-pref:' + key, value); }}};
    });
    if(state === 'natiivi-lm') await ctx.addInitScript(() => {
      window.__ls = []; const lis = {};
      window.__lsEmit = (ev, data) => (lis[ev] || []).forEach(f => f(data));
      const sheet = {present: async arg => { window.__ls.push({fn: 'present', arg}); }, update: async arg => { window.__ls.push({fn: 'update', arg}); },
        dismiss: async () => { window.__ls.push({fn: 'dismiss'}); window.__lsEmit('closed', {}); },
        addListener: (ev, f) => { (lis[ev] = lis[ev] || []).push(f); return {remove(){}}; }};
      window.Capacitor = {isNativePlatform: () => true, getPlatform: () => 'ios', isPluginAvailable: n => n === 'LayerSheet',
        registerPlugin: name => name === 'LayerSheet' ? sheet : name !== 'Preferences' ? {} : {
          get: async ({key}) => ({value: localStorage.getItem('cap-pref:' + key)}),
          set: async ({key, value}) => { localStorage.setItem('cap-pref:' + key, value); }}};
    });
    if(state === 'reitti-ios' || state === 'reitti-android') await ctx.addInitScript(plat => {
      window.__open = [];
      const launcher = {canOpenUrl: async ({url}) => ({value: url.startsWith('comgooglemaps')}),
        openUrl: async ({url}) => { window.__open.push(url); return {completed: true}; }};
      window.Capacitor = {isNativePlatform: () => true, getPlatform: () => plat,
        registerPlugin: name => name === 'AppLauncher' ? launcher : name !== 'Preferences' ? {} : {
          get: async ({key}) => ({value: localStorage.getItem('cap-pref:' + key)}),
          set: async ({key, value}) => { localStorage.setItem('cap-pref:' + key, value); }}};
    }, state === 'reitti-ios' ? 'ios' : 'android');
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
    // Testikäännös (--testbuild tai pro-*-tila): kuten scripts/build-app.mjs APP_TEST_BUILD=1.
    if(args.testbuild || state.startsWith('pro-') || state === 'natiivi-lm') await ctx.route(/\/index\.html(\?|$)/, async r => {
      const resp = await r.fetch();
      r.fulfill({response: resp, body: (await resp.text()).replace('<html lang="fi">', '<html lang="fi" data-testbuild="1">')});
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // MapLibren tyylivirheet (esim. väärä suodatin) näkyvät vain konsolissa.
    page.on('console', m => { if(m.type() === 'error' && /layers\.|style|filter|expression/i.test(m.text())) errors.push('konsoli: ' + m.text().slice(0, 300)); });
    if(SAFE_AREA){
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', {insets: size.insets}).catch(e => problems.push(`safe-area: ${e.message}`));
    }
    if(state === 'kaynnistys'){
      await page.goto(BASE + 'index.html' + PAGE_QS, {waitUntil: 'domcontentloaded'});
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
    await page.goto(BASE + 'index.html' + PAGE_QS);
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
