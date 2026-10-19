// Workerin logiikkatestit simuloidulla YouTube Data API:lla (ei verkkoa, ei avainta).
// Ajo: cd worker && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runUpdate, publicPayload, isShown, sunElevation, quotaDay} from '../src/index.js';

const KEY = 'TESTIAVAIN_EI_OIKEA';

// Simuloitu YouTube: videos[id] = {title, channelId, lbc, start}
function fakeYouTube(videos, uploads){
  const calls = [];
  const f = async (url) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get('key'), KEY);
    const method = u.pathname.split('/').pop();
    calls.push(method);
    let items = [];
    if(method === 'videos'){
      items = u.searchParams.get('id').split(',').filter(id => videos[id]).map(id => ({
        id, snippet: {title: videos[id].title, channelTitle: 'Kanava ' + videos[id].channelId.slice(-3),
          liveBroadcastContent: videos[id].lbc,
          thumbnails: {high: {url: `https://i.ytimg.com/vi/${id}/hqdefault_live.jpg`, width: 480, height: 360},
                       maxres: {url: `https://i.ytimg.com/vi/${id}/maxresdefault_live.jpg`, width: 1280, height: 720}}},
        liveStreamingDetails: {actualStartTime: videos[id].start || '2026-01-01T00:00:00Z'}}));
    } else if(method === 'playlistItems'){
      const ch = 'UC' + u.searchParams.get('playlistId').slice(2);
      items = (uploads[ch] || []).map(v => ({contentDetails: {videoId: v}}));
    } else if(method === 'search'){
      const ch = u.searchParams.get('channelId');
      items = Object.entries(videos).filter(([, v]) => v.channelId === ch && v.lbc === 'live').map(([id]) => ({id: {videoId: id}}));
    }
    return {ok: true, status: 200, json: async () => ({items})};
  };
  f.calls = calls;
  return f;
}

const CH = 'UC-whuqv4HIi1O9hh9CHpPJg';
const config = {cameras: [
  {id: 'levi', type: 'youtube', lat: 67.8, lon: 24.8, youtube: {videoId: 'rKfecmmzzw0', channelId: CH, titleMatch: 'Levi, Finland\\. North'}},
  {id: 'kalajoki', type: 'youtube', lat: 64.26, lon: 23.95, youtube: {videoId: 'vsJBqHwnK9w', channelId: CH, titleMatch: 'Kalajoki'}},
]};
// 19.10.2026 klo 20 Suomen aikaa = 17 UTC (pimeää)
const NIGHT = Date.UTC(2026, 9, 19, 17, 0);

test('aurinko: Levi pimeä illalla, valoisa keskipäivällä', () => {
  assert.ok(sunElevation(67.8, 24.8, NIGHT) < 0);
  assert.ok(sunElevation(67.8, 24.8, Date.UTC(2026, 9, 19, 10, 0)) > 0);
  assert.equal(quotaDay(Date.UTC(2026, 9, 19, 5, 0)), '2026-10-18');   // PT vielä edellinen päivä
});

test('live -> sammuu -> piilotetaan vasta 2. hudilla -> uusi ID löytyy uploads-listasta', async () => {
  const videos = {
    rKfecmmzzw0: {title: 'Northern Light Live Levi, Finland. North view', channelId: CH, lbc: 'live'},
    vsJBqHwnK9w: {title: 'Kalajoki Finland Live', channelId: CH, lbc: 'live'},
  };
  const uploads = {[CH]: ['old1', 'rKfecmmzzw0', 'vsJBqHwnK9w']};
  const yt = fakeYouTube(videos, uploads);
  const state = {};
  let t = NIGHT;
  await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.ok(isShown(state.cameras.levi) && isShown(state.cameras.kalajoki));
  assert.deepEqual(yt.calls, ['videos']);
  const p = publicPayload(state, config);
  assert.match(p.cameras.levi.thumbnail.url, /maxresdefault_live/);

  // Levin lähetys päättyy
  videos.rKfecmmzzw0.lbc = 'none';
  yt.calls.length = 0;
  t += 5 * 60e3;
  await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.equal(state.cameras.levi.missCount, 1);
  assert.ok(isShown(state.cameras.levi), '1. huti: ikoni jää näkyviin (välkkymisen esto)');
  assert.deepEqual(yt.calls, ['videos', 'playlistItems', 'videos'], '1. huti -> heti uploads-haku');

  t += 5 * 60e3;
  yt.calls.length = 0;
  await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.ok(!isShown(state.cameras.levi), '2. huti: piilotetaan');
  assert.equal(publicPayload(state, config).cameras.levi.thumbnail, null, 'ei vanhaa kuvaa');
  assert.deepEqual(yt.calls, ['videos'], 'uploads-hakua ei toisteta ennen 20 min');

  // Uudelleenkäynnistys uudella ID:llä (tulee uploads-listan alkuun)
  videos.NEWLEVI0001 = {title: 'Northern Light Live Levi, Finland. North view', channelId: CH, lbc: 'live', start: '2026-10-19T17:12:00Z'};
  uploads[CH].unshift('NEWLEVI0001');
  t += 15 * 60e3;   // 15 min edellisestä tarkistuksesta: sammunutta ei vielä tarkisteta
  yt.calls.length = 0;
  await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.ok(!isShown(state.cameras.levi));
  t += 5 * 60e3;   // 20 min -> tarkistus
  yt.calls.length = 0;
  await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.equal(state.cameras.levi.videoId, 'NEWLEVI0001');
  assert.ok(isShown(state.cameras.levi), 'palaa ilman sivun latausta');
  assert.ok(!yt.calls.includes('search'), 'search.list ei tarvittu');
});

test('päivällä sammunutta kameraa ei tarkisteta', async () => {
  const videos = {rKfecmmzzw0: {title: 'Levi, Finland. North', channelId: CH, lbc: 'none'},
                  vsJBqHwnK9w: {title: 'Kalajoki', channelId: CH, lbc: 'none'}};
  const yt = fakeYouTube(videos, {[CH]: []});
  const state = {};
  const noon = Date.UTC(2026, 9, 19, 10, 0);
  await runUpdate({config, state, now: noon, key: KEY, fetch: yt});
  assert.deepEqual(yt.calls, []);
});

test('upcoming = ei näytetä', async () => {
  const videos = {rKfecmmzzw0: {title: 'Levi, Finland. North', channelId: CH, lbc: 'upcoming'},
                  vsJBqHwnK9w: {title: 'Kalajoki', channelId: CH, lbc: 'live'}};
  const state = {};
  await runUpdate({config, state, now: NIGHT, key: KEY, fetch: fakeYouTube(videos, {[CH]: []})});
  assert.ok(!isShown(state.cameras.levi));
  assert.ok(isShown(state.cameras.kalajoki));
});

test('search.list vain varalla: kamera poissa yli tunnin eikä löydy uploadsista', async () => {
  const videos = {rKfecmmzzw0: {title: 'Levi, Finland. North', channelId: CH, lbc: 'none'},
                  vsJBqHwnK9w: {title: 'Kalajoki', channelId: CH, lbc: 'live'}};
  const yt = fakeYouTube(videos, {[CH]: ['vsJBqHwnK9w']});
  const state = {};
  let t = NIGHT;
  for(let i = 0; i < 12; i++, t += 5 * 60e3) await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.equal(yt.calls.filter(c => c === 'search').length, 0);
  // Levi alkaa uudella ID:llä, jota EI ole uploads-listassa (esim. lista ei vielä päivittynyt)
  videos.HIDDENLEVI1 = {title: 'Levi, Finland. North view', channelId: CH, lbc: 'live'};
  for(let i = 0; i < 12; i++, t += 5 * 60e3) await runUpdate({config, state, now: t, key: KEY, fetch: yt});
  assert.equal(yt.calls.filter(c => c === 'search').length, 1, 'search enintään kerran 12 h');
  assert.equal(state.cameras.levi.videoId, 'HIDDENLEVI1');
});

test('exclude: pois jätetyn kanavan kameroita ei haeta eikä palauteta', async () => {
  const videos = {rKfecmmzzw0: {title: 'Levi, Finland. North', channelId: CH, lbc: 'live'}};
  const yt = fakeYouTube(videos, {});
  const state = {};
  await runUpdate({config: {...config, excludeChannels: [CH]}, state, now: NIGHT, key: KEY, fetch: yt});
  assert.deepEqual(yt.calls, []);
  assert.deepEqual(Object.keys(publicPayload(state, config).cameras), []);
});

// Kiintiölaskelma: oikea cameras.json, kokonainen vuorokausi 5 min välein.
async function simulateDay(scenario){
  const cfg = JSON.parse(readFileSync(new URL('../../data/cameras.json', import.meta.url)));
  const videos = {}, uploads = {};
  for(const c of cfg.cameras){
    const ch = c.youtube.channelId;
    videos[c.youtube.videoId] = {title: c.youtube.titleMatch.replace(/\\/g, '').replace(/\.\*/g, ' '), channelId: ch,
      lbc: scenario === 'all-live' ? 'live' : 'none'};
    (uploads[ch] ||= []).push(c.youtube.videoId);
  }
  const yt = fakeYouTube(videos, uploads);
  const state = {};
  const start = Date.UTC(2026, 11, 21, 8, 0);   // talvipäivänseisaus = pisin pimeä (pahin tapaus)
  for(let t = start; t < start + 864e5; t += 5 * 60e3){
    await runUpdate({config: cfg, state, now: t, key: KEY, fetch: yt});
  }
  return {units: state.quota.used + (state.quotaPrev || 0), calls: yt.calls};
}

test('kiintiö: kaikki live koko päivän (tavallinen tapaus)', async () => {
  const {calls} = await simulateDay('all-live');
  const units = calls.filter(c => c !== 'search').length + calls.filter(c => c === 'search').length * 100;
  console.log('  kaikki live:', units, 'yks./vrk', countBy(calls));
  assert.ok(units <= 300);
});

test('kiintiö: kaikki sammuneet koko yön (pahin tapaus) < 50 %', async () => {
  const {calls} = await simulateDay('all-off');
  const units = calls.filter(c => c !== 'search').length + calls.filter(c => c === 'search').length * 100;
  console.log('  kaikki sammuneet:', units, 'yks./vrk', countBy(calls));
  assert.ok(units <= 5000);
});

function countBy(a){ const o = {}; for(const x of a) o[x] = (o[x] || 0) + 1; return o; }
