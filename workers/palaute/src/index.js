// Aurora-palaute (päätös 36): POST /v1/palaute {type, cell, sentAt, answer, channel, aid, sig, dev}.
// Väärinkäytön esto: (1) vain palvelimen allekirjoittamat hälytykset (sig = HMAC(PALAUTE_AVAIN_FCM, aid|sentAt));
// (2) yksi vastaus hälytystä kohti laitetta kohti (dev = sovelluksen satunnainen asennustunniste, tallennetaan vain
// tiivisteenä estoavaimeen 3 vrk, EI tallenteeseen); (3) enintään LIMITS.ipPerDay vastausta IP-tiivisteeltä vuorokaudessa;
// (4) runko enintään 1 kt, vastaus ei paljasta syytä tarkemmin kuin koodi. Tallenne KV:hen: p:<päivä>:<uuid>.
import {parseFeedback, expectedSig, sha256b64, sameStr, LIMITS} from './feedback.js';

const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type'};
const json = (status, obj) => new Response(JSON.stringify(obj), {status, headers: {'content-type': 'application/json', ...CORS}});

export async function handle(request, env, now = Date.now()){
  const url = new URL(request.url);
  if(request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS});
  if(url.pathname !== '/v1/palaute' || request.method !== 'POST') return json(404, {ok: false});
  if(!env.PALAUTE_AVAIN_FCM || !env.PALAUTE) return json(503, {ok: false, error: 'config'});
  const text = await request.text();
  if(text.length > LIMITS.bodyMax) return json(413, {ok: false, error: 'size'});
  const p = parseFeedback(text, now);
  if(!p.ok) return json(400, {ok: false, error: p.error});
  if(!sameStr(p.sig, await expectedSig(env.PALAUTE_AVAIN_FCM, p.aid, p.record.sentAt))) return json(403, {ok: false, error: 'sig'});
  const day = new Date(now).toISOString().slice(0, 10);
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const ipKey = 'ip:' + day + ':' + await sha256b64(ip);
  const n = +(await env.PALAUTE.get(ipKey) || 0);
  if(n >= LIMITS.ipPerDay) return json(429, {ok: false, error: 'rate'});
  const dupKey = 'd:' + p.aid + ':' + await sha256b64(p.dev);
  if(await env.PALAUTE.get(dupKey)) return json(200, {ok: true, duplicate: true});
  await env.PALAUTE.put(dupKey, '1', {expirationTtl: 3 * 86400});
  await env.PALAUTE.put(ipKey, String(n + 1), {expirationTtl: 2 * 86400});
  await env.PALAUTE.put('p:' + day + ':' + crypto.randomUUID(), JSON.stringify(p.record));
  return json(200, {ok: true});
}
export default {fetch: (request, env) => handle(request, env)};
