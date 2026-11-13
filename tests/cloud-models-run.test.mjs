// Laiskan mallin ajotunniste (2026-11-12): IL (editoitu) askeleen t0 = origintime = meta.run, ei ensimmäinen aika-askel.
// Ennen korjausta hälytysajo hylkäsi IL:n joka ajossa ("askel N eri ajosta kuin meta"). Tiedostomuoto kuten
// scripts/fetch-clouds-edited.py: meta {run, times, lat0..lon1, nlat, nlon, missing: 255} + askel {t0, vals: PNG base64}.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import C from '../aurora-core.js';
import CM from '../alerts/cloud-models.js';
import F from '../alerts/fcm-alerts.js';

const inflate = b => new Uint8Array(zlib.inflateSync(b));
// Harmaasävy-PNG (8 bit) base64:nä, kuten cloud_png.encode_masked.
function png(w, h, f){
  const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length); crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0); return Buffer.concat([len, t, data, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc((w + 1) * h); for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = f(x, y);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const NOW = Date.parse('2026-11-12T20:05:00Z'), RUN = Date.parse('2026-11-12T19:40:00Z'), T0 = Date.parse('2026-11-12T19:00:00Z');
// IL-tyyppinen data: ruutu 69,0-69,5 N / 20-21 E (Kilpisjärvi 318_200), länsiosa (lon < 20,4) ei dataa (255).
function ilFiles({run = RUN, stepT0 = run, val = 20} = {}){
  const meta = {model: 'edited', run, lat0: 68.5, lat1: 70, lon0: 19.5, lon1: 21.5, nlat: 16, nlon: 21, missing: 255,
    times: Array.from({length: 8}, (_, i) => T0 + i * 3600e3)};
  const files = {'clouds-edited-meta.json': meta};
  for(let i = 0; i < 8; i++) files['clouds-edited-step' + String(i).padStart(2, '0') + '.json'] =
    {t0: stepT0, vals: png(meta.nlon, meta.nlat, x => x < 9 ? 255 : val)};
  return files;
}
const getter = files => async u => { const k = u.split('/').pop(); if(!(k in files)) throw new Error('404 ' + k); return JSON.parse(JSON.stringify(files[k])); };
const load = files => CM.loadLazyGrid(C, 'edited', [new Date(NOW), new Date(NOW + 3600e3)], getter(files), inflate, 'x/');

test('IL: oikea ajo (t0 = meta.run, ei ensimmäinen aika-askel) latautuu', async () => {
  const g = await load(ilFiles());
  assert.equal(g.run.getTime(), RUN); assert.notEqual(RUN, T0, 'testi kattaa juuri tämän eron');
  assert.ok(g.steps.size >= 2);
  const cell = {...C.alertCell(69.05, 20.79)}; assert.equal(cell.key, '318_200');
  const cl = C.cellCloudPct(g, C.cellGridPoints(g, cell), new Date(NOW), 0.25);
  assert.ok(Math.abs(cl - 20) < 1e-4, 'NaN-pisteet ohitetaan, arvo 20 %');
});

test('IL: askel eri ajosta hylätään (vanha ajo, uudempi ajo, ensimmäinen aika-askel)', async () => {
  await assert.rejects(load(ilFiles({stepT0: RUN - 3600e3})), /eri ajosta/);
  await assert.rejects(load(ilFiles({stepT0: RUN + 3600e3})), /eri ajosta/);
  await assert.rejects(load(ilFiles({stepT0: T0})), /eri ajosta/, 'metassa run -> t0:n pitää olla run');
});

test('stepRunOk: run-kenttä (ms tai ISO) ensin, ilman run-kenttää ensimmäinen aika-askel; t0 puuttuu -> kelpaa', () => {
  const times = [T0, T0 + 3600e3];
  assert.equal(CM.stepRunOk({run: RUN, times}, RUN), true);
  assert.equal(CM.stepRunOk({run: RUN, times}, T0), false);
  assert.equal(CM.stepRunOk({run: '2026-11-12T19:00:00+00:00', times}, T0), true, 'ICON-EU: run ISO = 1. aika');
  assert.equal(CM.stepRunOk({times}, T0), true, 'HARMONIE: ei run-kenttää');
  assert.equal(CM.stepRunOk({times}, T0 - 3600e3), false);
  assert.equal(CM.stepRunOk({run: RUN, times}, null), true);
});

test('IL: ikäraja 6 h pitää', async () => {
  const g = await load(ilFiles({run: NOW - 6.5 * 3600e3}));
  assert.equal(CM.gridFresh(g, new Date(NOW), F.FCM_ALERT_CFG.maxAgeH.edited).ok, false);
  const g2 = await load(ilFiles({run: NOW - 5.5 * 3600e3}));
  assert.equal(CM.gridFresh(g2, new Date(NOW), F.FCM_ALERT_CFG.maxAgeH.edited).ok, true);
});

test('IL ladattuna: 4 mallia lokissa ja seurantaruudussa; länsiosa ilman IL-dataa = 3 mallia (2/3)', async () => {
  const il = await load(ilFiles({val: 0}));
  // Muut mallit: selkeä tasainen hila samalla alueella.
  const flat = {lat0: 68.5, lat1: 70, lon0: 18, lon1: 22, nlat: 16, nlon: 41, dlat: 0.1, dlon: 0.1,
    times: Array.from({length: 8}, (_, i) => new Date(T0 + i * 3600e3)), steps: new Map(), run: new Date(T0)};
  for(let i = 0; i < 8; i++) flat.steps.set(i, {vals: new Float32Array(16 * 41).fill(0)});
  const mk = (lat, lon) => { const c = C.alertCell(lat, lon); return {...c, tz: C.cellTimeZone(c.center.lat, c.center.lon), mlat: C.magLat(c.center.lat, c.center.lon)}; };
  const ki = mk(69.05, 20.79), west = mk(69.05, 19.6);   // 318_200 ja 318_199 (IL-data puuttuu: lon < 20,4)
  const ov = new Float32Array(181 * 360); for(let la = 60; la <= 75; la++) for(let lo = 0; lo < 360; lo++) ov[(la + 90) * 360 + lo] = 60;
  const data = {ovation: {grid: ov}, mag: null, kp: null, grids: {harmonie: flat, icon_eu: flat, ecmwf: flat, edited: il}};
  const r = F.evaluateCells(C, data, [ki, west], {}, new Date(NOW));
  const a = Object.fromEntries(r.alerts.map(x => [x.cell.key, x]));
  assert.equal(a['318_200'].avail, 4); assert.equal(a['318_200'].models.edited, 60, 'IL:n arvo mukana');
  assert.equal(a[west.key].avail, 3); assert.equal(a[west.key].models.edited, null);
  const w = r.diag.watch['318_200'];
  assert.equal(w.vis.edited, 60); assert.equal(w.cloud.edited, 0); assert.equal(w.now.avail, 4); assert.equal(w.cloudRule.avail, 4);
});

// ── HARMONIE (2026-11-12): meta.run = GRIB-ajo (ISO), askelten t0 = ajo; siirtymä vanhasta muodosta ──
const H_RUN = Date.parse('2026-11-12T18:00:00Z'), H_FIRST = Date.parse('2026-11-12T21:00:00Z');
function hFiles({metaRun = true, stepT0 = H_RUN, kind = 'run'} = {}){
  const meta = {model: 'harmonie', lat0: 68.5, lat1: 70, lon0: 19.5, lon1: 21.5, nlat: 16, nlon: 21,
    times: Array.from({length: 8}, (_, i) => H_FIRST + i * 3600e3), stepCount: 8};
  if(metaRun) meta.run = '2026-11-12T18:00:00+00:00';
  const files = {'clouds-harmonie-meta.json': meta};
  for(let i = 0; i < 8; i++) files['clouds-harmonie-step' + String(i).padStart(2, '0') + '.json'] = {t0: stepT0, ...(kind ? {t0Kind: kind} : {}), vals: png(21, 16, () => 40)};
  return files;
}
const H_NOW = H_FIRST + 1800e3;
const hLoad = files => CM.loadLazyGrid(C, 'harmonie', [new Date(H_NOW)], getter(files), inflate, 'x/');

test('HARMONIE: uusi muoto (run ISO + t0 = ajo) ja vanha muoto (ei run, t0 = 1. aika-askel) latautuvat', async () => {
  const g = await hLoad(hFiles());
  assert.equal(g.runId.getTime(), H_RUN); assert.ok(g.steps.size >= 1);
  const old = await hLoad(hFiles({metaRun: false, stepT0: H_FIRST, kind: null}));
  assert.equal(old.runId, null); assert.ok(old.steps.size >= 1);
});

test('HARMONIE: sekamuoto - uusi meta + vanha askel kelpaa, vanha meta + uusi askel hylätään', async () => {
  assert.ok((await hLoad(hFiles({stepT0: H_FIRST, kind: null}))).steps.size >= 1, 'siirtymä: vanha askel, sama aika-akseli');
  await assert.rejects(hLoad(hFiles({metaRun: false, stepT0: H_RUN})), /eri ajosta/, 'aika-akseli ei varmistu');
});

test('HARMONIE: eri ajon askel hylätään (vanhempi ja uudempi ajo)', async () => {
  await assert.rejects(hLoad(hFiles({stepT0: H_RUN - 3 * 3600e3})), /eri ajosta/);
  await assert.rejects(hLoad(hFiles({stepT0: H_RUN + 3 * 3600e3})), /eri ajosta/, 'uudempi ajo 21 UTC = 1. aika-askel, silti hylätään');
  await assert.rejects(hLoad(hFiles({metaRun: false, stepT0: H_FIRST - 3600e3, kind: null})), /eri ajosta/);
  await assert.rejects(hLoad(hFiles({metaRun: false, stepT0: H_FIRST})), /eri ajosta/, 'vanha meta + uusi askel (merkintä) hylätään');
});

test('HARMONIE: hälytyksen ikäraja edelleen 1. aika-askeleesta (logiikka ennallaan), sekamuoto ei koske muita malleja', async () => {
  const g = await hLoad(hFiles());
  assert.equal(g.run.getTime(), H_FIRST, 'g.run = 1. aika-askel kuten ennen');
  assert.equal(CM.stepRunOk({run: RUN, times: [T0]}, T0), false, 'IL: 1. aika-askel ei kelpaa (ei legacy-tilaa)');
  assert.equal(CM.stepRunOk({run: H_RUN, times: [H_FIRST]}, H_FIRST, true), true);
});
