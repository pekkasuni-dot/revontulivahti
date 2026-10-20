// Tilapäinen mittaus (poistetaan ennen yhdistämistä): käynnistyksen resurssit
// julkaistulta sivulta normaalilla yhteydellä ja hitaalla 3G:llä.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = 'https://pekkasuni-dot.github.io/revontulivahti/';
const PROFILES = {
  normal: null,
  fast3g: {latency: 150, downloadThroughput: 1.6e6/8, uploadThroughput: 750e3/8},   // DevTools "Fast 3G"
  slow3g: {latency: 400, downloadThroughput: 400e3/8, uploadThroughput: 400e3/8},   // DevTools "Slow 3G"
};
const cat = u => {
  if(u.includes('tiles.openfreemap.org') && /\.pbf/.test(u)) return 'kartta: vektoritiilet';
  if(u.includes('openfreemap')) return 'kartta: tyyli/tilejson/fontit';
  if(u.includes('elevation-tiles') || u.includes('terrarium')) return 'kartta: maastovarjostus';
  if(u.includes('arcgisonline') || u.includes('esri')) return 'kartta: satelliitti';
  if(/maplibre-gl/.test(u)) return 'kirjasto: MapLibre';
  if(u.includes('fonts.g')) return 'fontit: Google';
  if(/\/data\/clouds/.test(u)) return 'data: pilvet';
  if(/\/data\/wind/.test(u)) return 'data: tuuli';
  if(/\/data\/e7d/.test(u)) return 'data: ECMWF 7 vrk';
  if(/\/data\/camera/.test(u)) return 'data: kamerat';
  if(u.includes('ovation')) return 'NOAA: OVATION';
  if(u.includes('swpc.noaa.gov')) return 'NOAA: muut';
  if(u.includes('ytimg') || u.includes('youtube')) return 'YouTube';
  if(u.startsWith(URL)) return 'sovellus';
  return 'muu';
};
async function run(name, warm){
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fi-FI', timezoneId: 'Europe/Helsinki'});
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if(PROFILES[name]) await cdp.send('Network.emulateNetworkConditions', {offline: false, ...PROFILES[name]});
  const runs = [];
  for(const pass of warm ? ['kylmä', 'lämmin'] : ['kylmä']){
    const req = new Map(); let t0 = null;
    const onReq = e => { if(t0 === null) t0 = e.timestamp; req.set(e.requestId, {url: e.request.url, start: e.timestamp, type: e.type}); };
    const onResp = e => { const r = req.get(e.requestId); if(r){ r.status = e.response.status; r.sw = e.response.fromServiceWorker; r.disk = e.response.fromDiskCache; r.mime = e.response.mimeType; } };
    const onFin = e => { const r = req.get(e.requestId); if(r){ r.end = e.timestamp; r.bytes = e.encodedDataLength; } };
    const onFail = e => { const r = req.get(e.requestId); if(r){ r.end = e.timestamp; r.failed = e.errorText; } };
    cdp.on('Network.requestWillBeSent', onReq); cdp.on('Network.responseReceived', onResp);
    cdp.on('Network.loadingFinished', onFin); cdp.on('Network.loadingFailed', onFail);
    const wall0 = Date.now(); const marks = {};
    await page.goto(URL, {waitUntil: 'commit', timeout: 180000});
    const limit = name === 'slow3g' ? 150000 : 60000;
    while(Date.now() - wall0 < limit){
      const m = await page.evaluate(() => ({
        dom: document.readyState,
        lib: !!(typeof maplibregl !== "undefined"),
        map: !!(typeof map !== 'undefined' && map && map.loaded && map.loaded()),
        tiles: !!(typeof map !== 'undefined' && map && map.areTilesLoaded && map.areTilesLoaded()),
        clouds: !!(typeof state !== 'undefined' && state.cloudGrid && state.cloudGrid.steps && state.cloudGrid.steps.size),
        ovation: !!(typeof state !== 'undefined' && state.ovation),
        kp: !!(typeof state !== 'undefined' && (state.kpRt || state.kpObs)),
        toast: !!(document.getElementById('toast') && document.getElementById('toast').classList.contains('hide')),
      })).catch(() => ({}));
      for(const [k, v] of Object.entries(m)) if(v && v !== 'loading' && !(k in marks)) marks[k] = Date.now() - wall0;
      if(marks.toast && marks.tiles && Date.now() - wall0 > (marks.toast + 4000)) break;
      await page.waitForTimeout(250);
    }
    cdp.off('Network.requestWillBeSent', onReq); cdp.off('Network.responseReceived', onResp);
    cdp.off('Network.loadingFinished', onFin); cdp.off('Network.loadingFailed', onFail);
    const rows = [...req.values()].map(r => ({...r, cat: cat(r.url), s: +((r.start - t0)*1000).toFixed(0), e: r.end ? +((r.end - t0)*1000).toFixed(0) : null}));
    runs.push({pass, marks, rows});
    if(pass === 'kylmä' && warm) await page.waitForTimeout(3000);   // SW asentuu
  }
  await browser.close();
  return runs;
}
const out = {};
for(const [name, warm] of [['normal', true], ['fast3g', false], ['slow3g', true]]){
  out[name] = await run(name, warm);
  for(const r of out[name]){
    console.log(`\n===== ${name} / ${r.pass} =====`);
    console.log('virstanpylväät (ms):', JSON.stringify(r.marks));
    const by = {};
    for(const x of r.rows){ const c = by[x.cat] ||= {n: 0, kb: 0, first: Infinity, last: 0, fail: 0, sw: 0}; c.n++; c.kb += (x.bytes || 0)/1024; c.first = Math.min(c.first, x.s); c.last = Math.max(c.last, x.e || x.s); if(x.failed) c.fail++; if(x.sw) c.sw++; }
    console.log('luokka | pyyntöjä | kt (siirretty) | ensimmäinen alkaa ms | viimeinen valmis ms | epäonn. | SW');
    for(const [k, c] of Object.entries(by).sort((a, b) => a[1].first - b[1].first)) console.log(`${k} | ${c.n} | ${c.kb.toFixed(0)} | ${c.first} | ${c.last} | ${c.fail} | ${c.sw}`);
    const tot = r.rows.reduce((s, x) => s + (x.bytes || 0), 0)/1024;
    console.log('YHTEENSÄ kt', tot.toFixed(0), 'pyyntöjä', r.rows.length);
    console.log('suurimmat 12:');
    for(const x of [...r.rows].sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 12)) console.log(`  ${((x.bytes||0)/1024).toFixed(0)} kt  ${x.s}-${x.e} ms  ${x.url.replace(/\?.*/, '').slice(-90)}`);
    console.log('20 ensimmäistä pyyntöä:');
    for(const x of [...r.rows].sort((a, b) => a.s - b.s).slice(0, 20)) console.log(`  ${x.s}-${x.e} ms  ${((x.bytes||0)/1024).toFixed(0)} kt ${x.failed ? 'FAIL '+x.failed : ''} ${x.url.replace(/\?.*/, '').slice(-80)}`);
  }
}
fs.writeFileSync('mittaus.json', JSON.stringify(out));
