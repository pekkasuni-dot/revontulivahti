/* Revontulihälytysten toimitus Firebase Cloud Messagingilla (2026-11-02, päätökset 29 ja 30, vaihe 1).
   - Lähetys AIHEESEEN (topic) = sijaintiruutu + kieli (aurora-core.js ALERT_CELL / alertTopic). Palvelin ei tiedä
     laitteita, paikkoja eikä koordinaatteja: puhelin tilaa ruutunsa aiheen itse (index.html alertsSync).
   - Tunnistus: Googlen palvelutili (FCM_SERVICE_ACCOUNT, JSON) -> OAuth2-tunnus (JWT RS256, WebCrypto) ->
     FCM HTTP v1 (projects/<id>/messages:send). Avain VAIN salaisuuksissa (päätös 18), ei lokiin.
   - WebCrypto (globalThis.crypto.subtle) -> sama koodi Nodessa (20+) ja Cloudflare Workerissa (vaihe 2).
   - Viestin data {rv:'1', ver, cell, view}: sovellus avaa napautuksesta oikean paikan ja välilehden (alertsOpen).
   EI hälytyslogiikkaa: milloin ja kenelle lähetetään (kynnykset, ajastus, tiheysraja) on vaihe 2 (7.11. jälkeen).
   Testi: scripts/fcm-test.mjs + .github/workflows/fcm-testi.yml. Ks. OHJE-fcm.md. */
(function(root){
'use strict';

const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const ANDROID_CHANNEL = 'aurora';   // sama kuin index.html alertsInitNative + AndroidManifest

// Testi-ilmoituksen tekstit (vaihe 1). Varsinaiset hälytystekstit vaiheessa 2.
const TEST_TEXT = {
  fi: {title: 'Revontulihälytys (testi)', body: 'Testi-ilmoitus alueellesi. Napauta avataksesi Tänä yönä -näkymän.'},
  en: {title: 'Aurora alert (test)', body: 'Test notification for your area. Tap to open Tonight.'},
  zh: {title: '极光提醒（测试）', body: '你所在区域的测试通知。点击打开“今晚”。'},
};

function parseServiceAccount(json){
  let sa;
  try{ sa = typeof json === 'string' ? JSON.parse(json) : json; }catch(e){ throw new Error('FCM_SERVICE_ACCOUNT ei ole kelvollista JSONia'); }
  for(const k of ['project_id', 'client_email', 'private_key'])
    if(!sa || typeof sa[k] !== 'string' || !sa[k]) throw new Error('FCM_SERVICE_ACCOUNT: kenttä ' + k + ' puuttuu');
  return sa;
}
const b64url = buf => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for(const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlJson = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
function pemToDer(pem){
  const b = atob(String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
  const out = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
// Allekirjoitettu JWT OAuth2-tunnuksen pyyntöön (RFC 7523).
async function signJwt(sa, nowSec = Math.floor(Date.now() / 1000)){
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if(!subtle) throw new Error('WebCrypto puuttuu (Node 20+ tai Worker)');
  const key = await subtle.importKey('pkcs8', pemToDer(sa.private_key), {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['sign']);
  const head = b64urlJson({alg: 'RS256', typ: 'JWT'});
  const claims = b64urlJson({iss: sa.client_email, scope: SCOPE, aud: OAUTH_URL, iat: nowSec, exp: nowSec + 3600});
  const sig = await subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claims));
  return head + '.' + claims + '.' + b64url(sig);
}
async function accessToken(sa, fetchFn = fetch){
  const jwt = await signJwt(sa);
  const r = await fetchFn(OAUTH_URL, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt});
  const j = await r.json().catch(() => ({}));
  if(!r.ok || !j.access_token) throw new Error('OAuth2-tunnus epäonnistui: HTTP ' + r.status + ' ' + (j.error || '') + ' ' + (j.error_description || ''));
  return j.access_token;
}
// FCM HTTP v1 -viesti aiheeseen. data-arvot merkkijonoina (FCM vaatii).
// dataOnlyAndroid (hälytykset, päätös 36): Androidille data-viesti (title/body datassa), jonka sovellus näyttää itse
// palautepainikkeineen (android AlertMessagingService); iOS:lle näkyvä ilmoitus apns.aps.alert + kategoria RV_FEEDBACK.
function buildMessage({topic, title, body, data = {}, ttlSec = 3 * 3600, dataOnlyAndroid = false}){
  if(!/^[a-zA-Z0-9-_.~%]{1,900}$/.test(String(topic || ''))) throw new Error('virheellinen aihe: ' + topic);
  const d = {rv: '1'};
  for(const [k, v] of Object.entries(data)) if(v != null) d[k] = String(v);
  const aps = {sound: 'default', 'thread-id': 'rv-' + (d.cell || 'x'),
    // Palautepainikkeet (päätös 36): iOS-kategoria rekisteröidään sovelluksessa (AlertActions).
    ...(d.aid ? {category: FEEDBACK_CATEGORY} : {})};
  const apns = {headers: {'apns-priority': '10', 'apns-expiration': String(Math.floor(Date.now() / 1000) + ttlSec)}, payload: {aps}};
  if(dataOnlyAndroid){
    aps.alert = {title, body};
    return {message: {topic, data: {...d, title, body}, android: {priority: 'high', ttl: ttlSec + 's'}, apns}};
  }
  return {message: {topic, notification: {title, body}, data: d,
    android: {priority: 'high', ttl: ttlSec + 's', notification: {channel_id: ANDROID_CHANNEL, tag: 'rv-' + (d.cell || 'x')}}, apns}};
}
const FEEDBACK_CATEGORY = 'RV_FEEDBACK';
// Hälytystunnisteen allekirjoitus palautetta varten (päätös 36, väärinkäytön esto): vastaanotto-Worker hyväksyy vain
// palvelimen lähettämät hälytykset. HMAC-SHA256(avain, aid|sentAt), 16 tavua base64url. Avain VAIN salaisuuksissa
// (GitHub: PALAUTE_AVAIN_FCM, Cloudflare: sama arvo Workerin salaisuutena), ei repoon.
async function signAlert(key, aid, sentAt){
  const subtle = globalThis.crypto.subtle;
  const k = await subtle.importKey('raw', new TextEncoder().encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sig = await subtle.sign('HMAC', k, new TextEncoder().encode(aid + '|' + sentAt));
  return b64url(new Uint8Array(sig).slice(0, 16));
}
async function send(sa, msg, {token, fetchFn = fetch} = {}){
  const tok = token || await accessToken(sa, fetchFn);
  const r = await fetchFn('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(sa.project_id) + '/messages:send', {
    method: 'POST', headers: {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}, body: JSON.stringify(msg)});
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error('FCM-lähetys epäonnistui: HTTP ' + r.status + ' ' + ((j.error && (j.error.status + ' ' + j.error.message)) || ''));
  return j.name;   // projects/<id>/messages/<tunnus>
}
// Testiviestit ruudulle kaikilla (tai annetuilla) kielillä. core = AuroraCore.
function testMessages(core, lat, lon, {langs, view = 'night'} = {}){
  const cell = core.alertCell(lat, lon);
  if(!cell) throw new Error('virheellinen sijainti ' + lat + ', ' + lon);
  return (langs || core.ALERT_CELL.langs).map(l => {
    const tx = TEST_TEXT[l] || TEST_TEXT.en;
    return buildMessage({topic: core.alertTopic(cell, l), title: tx.title, body: tx.body,
      data: {ver: cell.ver, cell: cell.key, view, kind: 'test'}});
  });
}

root.AuroraFcm = {OAUTH_URL, SCOPE, ANDROID_CHANNEL, TEST_TEXT, FEEDBACK_CATEGORY, signAlert, parseServiceAccount, signJwt, accessToken, buildMessage, send, testMessages};
if(typeof module !== 'undefined' && module.exports) module.exports = root.AuroraFcm;
})(typeof globalThis !== 'undefined' ? globalThis : this);
