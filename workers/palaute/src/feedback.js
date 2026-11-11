// Palautteen tarkistus (päätös 36): vain tyyppi, ruututunniste, lähetysaika, vastaus ja kanava tallennetaan.
// Ei koordinaatteja, ei laitetunnusta tallenteeseen (päätökset 14 ja 15). Puhdas moduuli (tests/palaute-worker.test.mjs).
export const TYPES = ['now', 'coming', 'tonight'];
// Päätös 41 (11.11.2026): sovellus lähettää seen / notSeen / ei_katsonut (napit ja kysely) + skipped (kyselyn X).
// Vanhat cloudy (Pilvessä) ja unknown (En tiedä) hyväksytään yhä vanhoilta sovellusversioilta ja jonossa olevilta vastauksilta.
export const ANSWERS = ['seen', 'notSeen', 'ei_katsonut', 'cloudy', 'unknown', 'skipped'];
export const CHANNELS = ['button', 'sheet'];
export const LIMITS = {ipPerDay: 60, maxAgeH: 36, bodyMax: 1024};
const CELL_RE = /^\d{1,3}_\d{1,3}$/, NIGHT_RE = /^\d{4}-\d\d-\d\d$/, SIG_RE = /^[A-Za-z0-9_-]{16,32}$/, DEV_RE = /^[A-Za-z0-9_-]{8,64}$/;

// Tarkistaa rungon. Palauttaa {ok, record, aid, dev} tai {ok:false, error}.
export function parseFeedback(body, now = Date.now()){
  let b;
  try{ b = typeof body === 'string' ? JSON.parse(body) : body; }catch(e){ return {ok: false, error: 'json'}; }
  if(!b || typeof b !== 'object') return {ok: false, error: 'json'};
  const {type, cell, sentAt, answer, channel, aid, sig, dev} = b;
  if(!TYPES.includes(type)) return {ok: false, error: 'type'};
  if(!CELL_RE.test(String(cell))) return {ok: false, error: 'cell'};
  if(!ANSWERS.includes(answer)) return {ok: false, error: 'answer'};
  if(!CHANNELS.includes(channel)) return {ok: false, error: 'channel'};
  if(answer === 'unknown' && channel !== 'sheet') return {ok: false, error: 'answer'};   // En tiedä vain kyselyssä
  if(answer === 'skipped' && channel !== 'sheet') return {ok: false, error: 'answer'};   // X = ohitettu, vain kysely
  const t = Date.parse(sentAt);
  if(!Number.isFinite(t) || t > now + 5 * 60e3 || now - t > LIMITS.maxAgeH * 3600e3) return {ok: false, error: 'sentAt'};
  const parts = String(aid || '').split('-');
  if(parts[0] !== type || parts[1] !== cell || !NIGHT_RE.test(parts.slice(2).join('-'))) return {ok: false, error: 'aid'};
  if(!SIG_RE.test(String(sig || ''))) return {ok: false, error: 'sig'};
  if(!DEV_RE.test(String(dev || ''))) return {ok: false, error: 'dev'};
  return {ok: true, aid, sig, dev, record: {type, cell, sentAt: new Date(t).toISOString(), answer, channel}};
}

const b64url = u8 => { let s = ''; for(const x of u8) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
// Sama allekirjoitus kuin alerts/fcm.js signAlert (HMAC-SHA256(avain, aid|sentAt), 16 tavua base64url).
export async function expectedSig(key, aid, sentAt){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(aid + '|' + sentAt))).slice(0, 16));
}
export async function sha256b64(s){
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).slice(0, 12));
}
// Vakioaikainen vertailu.
export function sameStr(a, b){
  if(a.length !== b.length) return false;
  let d = 0; for(let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
