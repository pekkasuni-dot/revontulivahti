// AuroraAwesome-satelliitti (Cloudflare Worker, 2026-10-30), ks. wrangler.toml.
// scheduled: 5 min välein tarkistaa EUMETViewin uusimman kuva-ajan; jos R2:ssa ei vielä ole sitä,
// hakee GetMap-kuvan (PNG, ~1 Mt) ja tallentaa R2:een avaimilla ir105/latest.png + ir105/latest.json.
// fetch: /sat/ir105/latest.json ja /sat/ir105/latest.png (CORS *, cache 60 s). Muut polut 404.
import {CAPS, geom, latestTime, pickTime, wmsUrl} from './sat.js';

const KEY_PNG = 'ir105/latest.png', KEY_META = 'ir105/latest.json';
const HEADERS = {'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60'};

async function update(env){
  const layer = env.SAT_LAYER, bbox = env.SAT_BBOX.split(',').map(Number), width = +env.SAT_WIDTH;
  const caps = await fetch(CAPS, {cf: {cacheTtl: 120}});
  if(!caps.ok) return 'GetCapabilities ' + caps.status;
  const avail = latestTime(await caps.text(), layer);
  if(!avail) return 'aikaulottuvuutta ei löytynyt: ' + layer;
  const time = pickTime(avail, Date.now());
  const prev = await env.SAT_BUCKET.get(KEY_META);
  if(prev){ const j = await prev.json(); if(j.time === time.toISOString()) return 'ennallaan ' + j.time; }
  const g = geom(bbox, width);
  const r = await fetch(wmsUrl(layer, time, g));
  if(!r.ok || !/image/.test(r.headers.get('content-type') || '')) return 'GetMap ' + r.status;
  const png = await r.arrayBuffer();
  if(png.byteLength < 1000) return 'GetMap: tyhjä kuva';
  await env.SAT_BUCKET.put(KEY_PNG, png, {httpMetadata: {contentType: 'image/png'}});
  await env.SAT_BUCKET.put(KEY_META, JSON.stringify({time: time.toISOString(), fetchedAt: new Date().toISOString(),
    layer, bbox, width: g.width, height: g.height, bytes: png.byteLength,
    license: 'Contains modified EUMETSAT Meteosat data 2026 (CC BY 4.0)'}), {httpMetadata: {contentType: 'application/json'}});
  return 'haettu ' + time.toISOString() + ' (' + Math.round(png.byteLength / 1024) + ' kt)';
}

export default {
  async fetch(request, env){
    const path = new URL(request.url).pathname;
    const key = path === '/sat/ir105/latest.json' ? KEY_META : path === '/sat/ir105/latest.png' ? KEY_PNG : null;
    if(!key) return new Response('Not found', {status: 404});
    const obj = await env.SAT_BUCKET.get(key);
    if(!obj) return new Response('Ei kuvaa vielä', {status: 404, headers: HEADERS});
    return new Response(obj.body, {headers: {...HEADERS, 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Last-Modified': obj.uploaded.toUTCString()}});
  },
  async scheduled(controller, env){
    try{ console.log(new Date(controller.scheduledTime).toISOString() + ' satelliitti: ' + await update(env)); }
    catch(e){ console.error('satelliitti: virhe ' + e.message); }
  },
};
