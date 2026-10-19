/*
 * AuroraAwesome – kameroiden välipalvelin (Cloudflare Worker)
 * ─────────────────────────────────────────────────────────────
 * Miksi: YouTube Data API tarvitsee API-avaimen, eikä sitä saa upottaa
 * julkiseen koodiin (repo on julkinen, YouTuben ehdot kieltävät). Avain on
 * Workerin secretinä (YOUTUBE_API_KEY), EI repossa eikä selaimessa.
 *
 * Toiminta:
 *  - scheduled() (cron 5 min välein) kysyy YouTube Data API:lta kameroiden
 *    tilan ja tallentaa valmiin vastauksen KV:hen. Kiintiönkulutus EI riipu
 *    käyttäjämäärästä: selainten pyynnöt eivät koskaan kutsu YouTubea.
 *  - fetch() (GET /cameras) palauttaa KV:n valmiin JSONin.
 *  - Worker EI välitä eikä tallenna kuvia. Vastauksessa on API:n palauttama
 *    pikkukuvan URL, jonka selain lataa suoraan YouTubelta.
 *  - VAIN virallinen API (videos.list, playlistItems.list, search.list).
 *    Ei RSS:ää, /live-osoitteita eikä sivujen lukemista.
 *
 * Tunnistus (ks. MUISTIO-webkamerat.md osa 12):
 *  - Käynnissä/aiemmin käynnissä olleet kamerat: videos.list joka ajolla
 *    (5 min). Yksi kutsu kattaa kaikki ID:t (<= 50) = 1 yksikkö.
 *  - Kamera näkyy (live:true), kun liveBroadcastContent == "live". Se
 *    piilotetaan vasta KAHDEN peräkkäisen "ei live" -tuloksen jälkeen.
 *  - Uusi video-ID (lähetys käynnistetty uudelleen): kanavan uploads-
 *    soittolista (playlistItems.list, 1 yks.) + videos.list (1 yks.),
 *    osuma otsikkokuviolla (cameras.json titleMatch). search.list
 *    eventType=live (100 yks.) vain varalla, harvoin.
 *  - Sammuneet kamerat: tarkistus 20 min välein, vain kun aurinko on
 *    kameran kohdalla horisontin alla. Päivällä ei lainkaan.
 *  - Kiintiö: kova raja DAILY_BUDGET (oletus 5000 = 50 % 10 000:sta).
 */

const API = 'https://www.googleapis.com/youtube/v3/';

export const DEFAULTS = {
  OFFLINE_INTERVAL_MS: 20 * 60e3,      // sammuneen kanavan tarkistusväli (pimeällä)
  SEARCH_INTERVAL_MS: 12 * 3600e3,     // search.list kanavaa kohden enintään näin usein
  SEARCH_AFTER_OFFLINE_MS: 60 * 60e3,  // varahaku vasta kun kamera ollut poissa näin kauan
  MISSES_TO_HIDE: 2,                   // välkkymisen esto
  DAILY_BUDGET: 5000,                  // kova raja (50 % 10 000:sta)
  SEARCH_BUDGET: 3000,                 // search.list vain jos päivän kulutus alle tämän
  CONFIG_TTL_MS: 60 * 60e3,            // cameras.json haetaan uudelleen tunnin välein
};

/* ── apufunktiot ─────────────────────────────────────────────── */

// YouTuben kiintiö nollautuu Tyynenmeren ajan keskiyöllä.
export function quotaDay(now){
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles'}).format(new Date(now));
}

// Auringon korkeus asteina (NOAA:n yksinkertaistettu kaava, tarkkuus ~1°
// riittää: tarkoitus on vain jättää päiväsaika tarkistamatta).
export function sunElevation(lat, lon, now){
  const d = new Date(now);
  const rad = Math.PI / 180;
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = (now - start) / 864e5;                       // murto-osainen päivä
  const g = 2 * Math.PI / 365 * doy;
  const decl = 0.006918 - 0.399912*Math.cos(g) + 0.070257*Math.sin(g) - 0.006758*Math.cos(2*g)
    + 0.000907*Math.sin(2*g) - 0.002697*Math.cos(3*g) + 0.00148*Math.sin(3*g);
  const eqt = 229.18 * (0.000075 + 0.001868*Math.cos(g) - 0.032077*Math.sin(g)
    - 0.014615*Math.cos(2*g) - 0.040849*Math.sin(2*g));    // minuutteja
  const utcMin = d.getUTCHours()*60 + d.getUTCMinutes() + d.getUTCSeconds()/60;
  const tst = utcMin + eqt + 4*lon;                        // todellinen aurinkoaika
  const ha = (tst/4 - 180) * rad;
  const cosZ = Math.sin(lat*rad)*Math.sin(decl) + Math.cos(lat*rad)*Math.cos(decl)*Math.cos(ha);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZ))) / rad;
}
export const isDark = (cam, now) => sunElevation(cam.lat, cam.lon, now) < 0;

// Paras saatavilla oleva pikkukuva API:n palauttamista.
const THUMB_ORDER = ['maxres', 'standard', 'high', 'medium', 'default'];
export function bestThumb(thumbs){
  for(const k of THUMB_ORDER) if(thumbs && thumbs[k] && thumbs[k].url) return {key: k, ...thumbs[k]};
  return null;
}

const uploadsPlaylist = channelId => 'UU' + channelId.slice(2);

/* ── YouTube-kutsut (kiintiö kirjataan jokaisesta) ───────────── */

class Quota {
  constructor(state, now, budget){
    const day = quotaDay(now);
    if(!state.quota || state.quota.day !== day) state.quota = {day, used: 0, calls: {}};
    this.q = state.quota; this.budget = budget;
  }
  can(cost, limit = this.budget){ return this.q.used + cost <= limit; }
  add(name, cost){ this.q.used += cost; this.q.calls[name] = (this.q.calls[name] || 0) + 1; }
}

async function yt(ctx, method, params, cost){
  if(!ctx.quota.can(cost)) throw new Error('budget');
  const u = new URL(API + method);
  for(const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', ctx.key);
  ctx.quota.add(method, cost);                            // kirjataan myös virheelliset kutsut
  const r = await ctx.fetch(u.toString(), {headers: {accept: 'application/json'}});
  if(!r.ok){
    // Virheviestissä EI saa näkyä avainta -> vain metodi ja tila.
    let reason = '';
    try{ const j = await r.json(); reason = j.error?.errors?.[0]?.reason || j.error?.message || ''; }catch(e){}
    throw new Error(`${method} HTTP ${r.status} ${reason}`);
  }
  return r.json();
}

// videos.list: enintään 50 ID:tä per kutsu, 1 yksikkö per kutsu.
async function videosList(ctx, ids){
  const out = new Map();
  for(let i = 0; i < ids.length; i += 50){
    const j = await yt(ctx, 'videos', {part: 'snippet,liveStreamingDetails', id: ids.slice(i, i+50).join(','), maxResults: 50}, 1);
    for(const it of j.items || []) out.set(it.id, it);
  }
  return out;
}

/* ── kameran tilan päivitys ──────────────────────────────────── */

function applyVideo(st, item, now){
  const sn = item.snippet || {};
  st.lbc = sn.liveBroadcastContent || 'none';
  st.title = sn.title || st.title || '';
  st.channelTitle = sn.channelTitle || st.channelTitle || '';
  st.checkedAt = now;
  if(st.lbc === 'live'){
    st.thumbnails = sn.thumbnails || {};
    st.missCount = 0;
    st.everLive = true;
    st.lastLiveAt = now;
    st.liveSince = item.liveStreamingDetails?.actualStartTime || st.liveSince || null;
    st.offlineSince = null;
  }
}
function markMiss(st, now, lbc){
  st.lbc = lbc;
  st.checkedAt = now;
  st.missCount = (st.missCount || 0) + 1;
  if(st.missCount >= 1 && !st.offlineSince) st.offlineSince = now;
}
export const isShown = (st, misses = DEFAULTS.MISSES_TO_HIDE) => !!(st && st.everLive && (st.missCount || 0) < misses);

// Etsii kanavan video-ehdokkaista kunkin kameran käynnissä olevan lähetyksen.
function matchCandidates(cams, items){
  const found = new Map();
  const live = [...items.values()].filter(it => it.snippet?.liveBroadcastContent === 'live');
  // Uusin ensin (actualStartTime), jotta vanha unohtunut lähetys ei voita.
  live.sort((a, b) => (Date.parse(b.liveStreamingDetails?.actualStartTime || 0) || 0)
                    - (Date.parse(a.liveStreamingDetails?.actualStartTime || 0) || 0));
  for(const cam of cams){
    let re;
    try{ re = new RegExp(cam.youtube.titleMatch || '.', 'i'); }catch(e){ continue; }
    const used = new Set(found.values());
    const hit = live.find(it => !used.has(it.id) && re.test(it.snippet.title || ''));
    if(hit) found.set(cam.id, hit.id);
  }
  return found;
}

/* ── yksi päivityskierros ────────────────────────────────────── */

export async function runUpdate({config, state, now, key, fetch: fetchImpl, opts = {}, log = () => {}}){
  const o = {...DEFAULTS, ...opts};
  state.cameras ||= {}; state.channels ||= {};
  const ctx = {key, fetch: fetchImpl, quota: new Quota(state, now, o.DAILY_BUDGET)};
  const excluded = new Set(config.excludeChannels || []);
  const cams = (config.cameras || []).filter(c => c.type === 'youtube' && c.youtube && !excluded.has(c.youtube.channelId));
  const errors = [];

  for(const c of cams){
    const st = state.cameras[c.id] ||= {videoId: c.youtube.videoId, missCount: 0, everLive: false};
    // Käsin muutettu cameras.json-ID voittaa (kuten ennen camera-status.json:ssa).
    if(st.configVideoId !== c.youtube.videoId){
      st.configVideoId = c.youtube.videoId; st.videoId = c.youtube.videoId;
      st.everLive = false; st.missCount = 0;
    }
  }
  // Poistetut/pois jätetyt kamerat pois tilasta.
  for(const id of Object.keys(state.cameras)) if(!cams.some(c => c.id === id)) delete state.cameras[id];

  // 1) Mitkä tarkistetaan tällä kierroksella?
  const due = cams.filter(c => {
    const st = state.cameras[c.id];
    if(st.everLive && st.missCount < o.MISSES_TO_HIDE) return true;          // näkyvä tai 1. huti
    if(!isDark(c, now)) return false;                                         // päivällä ei
    return !st.checkedAt || now - st.checkedAt >= o.OFFLINE_INTERVAL_MS;
  });

  let items = new Map();
  if(due.length){
    try{ items = await videosList(ctx, [...new Set(due.map(c => state.cameras[c.id].videoId))]); }
    catch(e){ errors.push(String(e.message)); due.length = 0; }
  }
  const missed = [];
  for(const c of due){
    const st = state.cameras[c.id];
    const it = items.get(st.videoId);
    if(it && it.snippet?.liveBroadcastContent === 'live') applyVideo(st, it, now);
    else{
      if(it) applyVideo(st, it, now);
      markMiss(st, now, it ? (it.snippet?.liveBroadcastContent || 'none') : 'missing');
      missed.push(c);
    }
  }

  // 2) Uuden video-ID:n haku kanavan uploads-soittolistasta (2 yks./kanava).
  const byChannel = new Map();
  for(const c of missed){
    const ch = c.youtube.channelId;
    if(!ch || !/^UC[\w-]{22}$/.test(ch)) continue;
    if(!byChannel.has(ch)) byChannel.set(ch, []);
    byChannel.get(ch).push(c);
  }
  for(const [ch, chCams] of byChannel){
    const chst = state.channels[ch] ||= {};
    const firstMiss = chCams.some(c => state.cameras[c.id].missCount === 1);   // juuri katkennut -> heti
    const discoveryDue = !chst.lastDiscovery || now - chst.lastDiscovery >= o.OFFLINE_INTERVAL_MS;
    if(!firstMiss && !discoveryDue) continue;
    let found = new Map();
    try{
      chst.lastDiscovery = now;
      const pl = await yt(ctx, 'playlistItems', {part: 'contentDetails', playlistId: uploadsPlaylist(ch), maxResults: 50}, 1);
      const ids = (pl.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
      if(ids.length) found = matchCandidates(chCams, await videosList(ctx, ids));
      chst.lastDiscoveryResult = found.size;
      // Varahaku search.list (100 yks.): vain jos kamera on ollut poissa yli tunnin,
      // kanavaa ei ole haettu 12 tuntiin ja päivän kulutus on alle SEARCH_BUDGETin.
      const longOff = chCams.filter(c => !found.has(c.id) && state.cameras[c.id].offlineSince
        && now - state.cameras[c.id].offlineSince >= o.SEARCH_AFTER_OFFLINE_MS);
      if(longOff.length && (!chst.lastSearch || now - chst.lastSearch >= o.SEARCH_INTERVAL_MS)
         && ctx.quota.can(101, o.SEARCH_BUDGET)){
        chst.lastSearch = now;
        const sr = await yt(ctx, 'search', {part: 'id', channelId: ch, eventType: 'live', type: 'video', maxResults: 25}, 100);
        const sids = (sr.items || []).map(i => i.id?.videoId).filter(Boolean);
        if(sids.length){
          const m = matchCandidates(longOff, await videosList(ctx, sids));
          for(const [k, v] of m) found.set(k, v);
        }
        chst.lastSearchResult = sids.length;
      }
    }catch(e){ errors.push(String(e.message)); }
    if(found.size){
      // Haetaan löydetyt vielä kerran videos.listillä (thumbnails ym. samassa muodossa).
      let vi = new Map();
      try{ vi = await videosList(ctx, [...new Set(found.values())]); }catch(e){ errors.push(String(e.message)); }
      for(const [camId, vid] of found){
        const st = state.cameras[camId], it = vi.get(vid);
        if(!it) continue;
        if(st.videoId !== vid) log(`${camId}: uusi video-ID ${st.videoId} -> ${vid}`);
        st.videoId = vid;
        applyVideo(st, it, now);
      }
    }
  }

  state.updatedAt = now;
  state.errors = errors;
  return state;
}

// Julkinen vastaus selaimelle (ei sisäistä kirjanpitoa).
export function publicPayload(state, config, opts = {}){
  const o = {...DEFAULTS, ...opts};
  const cameras = {};
  for(const [id, st] of Object.entries(state.cameras || {})){
    const live = isShown(st, o.MISSES_TO_HIDE);
    const th = live ? bestThumb(st.thumbnails) : null;
    cameras[id] = {
      live,
      liveBroadcastContent: st.lbc || null,
      videoId: st.videoId,
      title: st.title || null,
      channelTitle: st.channelTitle || null,
      thumbnail: th ? {url: th.url, width: th.width || null, height: th.height || null, size: th.key} : null,
      thumbnails: live ? (st.thumbnails || null) : null,
      checkedAt: st.checkedAt || null,       // viimeisin tarkistus
      updatedAt: live ? st.lastLiveAt : null, // viimeisin "live"-vahvistus = kuvan URL:n haku
      liveSince: live ? st.liveSince : null,
    };
  }
  return {
    generatedAt: state.updatedAt || null,
    quota: state.quota ? {day: state.quota.day, used: state.quota.used, budget: o.DAILY_BUDGET} : null,
    excludeChannels: config?.excludeChannels || [],
    cameras,
  };
}

/* ── Cloudflare-käsittelijät ─────────────────────────────────── */

function numOpts(env){
  const o = {};
  for(const k of Object.keys(DEFAULTS)) if(env[k] != null && env[k] !== '' && !isNaN(+env[k])) o[k] = +env[k];
  return o;
}

async function loadConfig(env, state, now){
  if(state.config && now - (state.configAt || 0) < DEFAULTS.CONFIG_TTL_MS) return state.config;
  try{
    const r = await fetch(env.CAMERAS_URL + '?t=' + Math.floor(now / 600e3), {headers: {accept: 'application/json'}});
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    state.config = {excludeChannels: j.excludeChannels || [], cameras: (j.cameras || []).map(c => ({
      id: c.id, type: c.type, lat: c.lat, lon: c.lon,
      youtube: c.youtube && {videoId: c.youtube.videoId, channelId: c.youtube.channelId, titleMatch: c.youtube.titleMatch},
    }))};
    state.configAt = now;
  }catch(e){ console.log('cameras.json ei latautunut, käytetään edellistä:', e.message); }
  return state.config || {cameras: []};
}

async function update(env){
  const now = Date.now();
  const state = (await env.CAM_KV.get('state', 'json')) || {};
  const config = await loadConfig(env, state, now);
  const opts = numOpts(env);
  await runUpdate({config, state, now, key: env.YOUTUBE_API_KEY, fetch: (u, i) => fetch(u, i), opts, log: m => console.log(m)});
  if(state.errors.length) console.log('virheet:', state.errors.join(' | '));
  console.log(`kiintiö ${state.quota.day}: ${state.quota.used} yks.`, JSON.stringify(state.quota.calls));
  const payload = JSON.stringify(publicPayload(state, config, opts));
  await env.CAM_KV.put('state', JSON.stringify(state));
  await env.CAM_KV.put('public', payload);
  return payload;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-max-age': '86400',
};

export default {
  async scheduled(event, env, ctx){
    ctx.waitUntil(update(env));
  },
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    if(request.method === 'OPTIONS') return new Response(null, {headers: CORS});
    if(request.method !== 'GET') return new Response('Method not allowed', {status: 405, headers: CORS});
    if(url.pathname !== '/cameras') return new Response('AuroraAwesome camera status: GET /cameras\n', {headers: {...CORS, 'content-type': 'text/plain'}});
    let body = await env.CAM_KV.get('public');
    if(!body) body = await update(env);   // ensimmäinen pyyntö ennen ensimmäistä cron-ajoa
    return new Response(body, {headers: {
      ...CORS,
      'content-type': 'application/json; charset=utf-8',
      // Selaimen/CDN:n välimuisti 60 s - data päivittyy 5 min välein.
      'cache-control': 'public, max-age=60',
    }});
  },
};
