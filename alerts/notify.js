/* Hälytysilmoitukset ntfy.sh:lla (2026-10-24, kenttätesti).
   - Ilmoitus vain lähteneistä (fire) hälytyksistä tasolla ALERT_CFG.sendLevel.
   - Vastaanottajat paikoittain: test-places.json `notify` (pekka / opas).
     Kanavien (topic) nimet tulevat ympäristömuuttujista NTFY_TOPIC_PEKKA /
     NTFY_TOPIC_OPAS (GitHubin salaisuudet) - EIVÄT koodissa eivätkä lokissa.
   - Palautenapit (ntfy action buttons, http POST) -> Cloudflare Worker
     (workers/ajastin, /palaute). Osoitteessa hälytyksen tunniste, vastaus,
     vastaaja ja allekirjoitus HMAC-SHA256(PALAUTE_AVAIN, "tunniste|vastaaja"):
     Worker hyväksyy vain tämän ajon itse allekirjoittamat tunnisteet.
   Ei henkilötietoja: viestissä vain paikka, hälytystyyppi, luvut ja kellonaika.
   Tuotannossa ntfy korvataan omalla Web Push -toteutuksella (MUISTIO-halytykset.md). */
(function(root){
'use strict';

const NTFY_URL = 'https://ntfy.sh';
const APP_URL = 'https://pekkasuni-dot.github.io/revontulivahti/';
const RECIPIENTS = {pekka: 'NTFY_TOPIC_PEKKA', opas: 'NTFY_TOPIC_OPAS'};   // vastaaja -> ympäristömuuttujan nimi
const WHO_NAMES = {pekka: 'Pekka', opas: 'opas'};
// Palautteen arvot (osoitteessa) ja napit.
const ANSWERS = {nakyi: 'Näkyi', ei: 'Ei näkynyt', pilvessa: 'Pilvessä'};
const MODEL_NAMES = {ecmwf: 'ECMWF', icon_eu: 'ICON-EU', harmonie: 'HARMONIE'};
const TYPE_TITLES = {now: 'Revontulia nyt', coming: 'Tulossa', tonight: 'Tänä yönä'};

const nf = (x, d = 0) => new Intl.NumberFormat('fi-FI', {maximumFractionDigits: d, minimumFractionDigits: d}).format(x);
const clock = (d, tz) => new Intl.DateTimeFormat('fi-FI', {timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(d);
const hourOf = (d, tz) => +new Intl.DateTimeFormat('en-GB', {timeZone: tz, hour: '2-digit', hourCycle: 'h23'}).format(d);

// Hälytyksen tunniste: ajon minuutti (UTC) + paikka + tyyppi, esim. 20261024T1915-levi-now.
function alertId(run, placeId, type){
  return run.toISOString().slice(0, 16).replace(/[-:]/g, '') + '-' + placeId + '-' + type;
}
const ID_RE = /^(testi-[a-z0-9-]{1,40}|\d{8}T\d{4}-[a-z0-9_]{2,30}-(now|coming|tonight))$/;

// Kameran linkki (sama sääntö kuin sovelluksen camWatchUrl): kanavan live-
// osoite, paitsi monikamerakanavilla (liveUrl:false) nykyinen video.
function cameraUrl(cam, status){
  if(!cam || !cam.youtube) return null;
  const y = cam.youtube, vid = (status && status.videoId) || y.videoId;
  if(y.channelId && y.liveUrl !== false) return 'https://www.youtube.com/channel/' + y.channelId + '/live';
  return vid ? 'https://www.youtube.com/watch?v=' + vid : null;
}

// Viestin teksti, paikkakunta ensin. m = paikan mittarit (placeMetrics).
function messageText(place, type, m, model, run){
  const parts = [place.name + ': ' + TYPE_TITLES[type]];
  if(type === 'now') parts.push('näkyvyys ' + m.idx + ' %');
  if(type === 'coming'){
    parts.push('Bz ' + nf(m.bz.mean, 1).replace('-', '−') + ' nT etelään ' + m.bz.southMin + ' min');
    if(m.cloud != null) parts.push('pilvisyys ' + m.cloud + ' %');
  }
  if(type === 'tonight'){
    const b = m.night && m.night.best && m.night.best[0];
    parts.push('paras näkyvyys ' + m.night.max + ' %' + (b ? ' klo ' + hourOf(new Date(b[0]), place.tz) + '–' + hourOf(new Date(b[1]), place.tz) : ''));
  }
  parts.push(MODEL_NAMES[model] || model);
  parts.push('klo ' + clock(run, place.tz));
  return parts.join(' · ');
}

// Lähetettävät ilmoitukset tästä ajosta. evaluated = evaluateAll().places,
// opts: {places, cfg, run, model, cameras (id -> kamera), cameraStatus (id -> tila)}.
function buildNotifications(evaluated, opts){
  const out = [];
  for(const p of evaluated){
    const place = opts.places.find(x => x.id === p.id);
    if(!place || !(place.notify || []).length) continue;
    for(const a of p.alerts){
      if(!a.fire || a.level !== opts.cfg.sendLevel) continue;
      const cam = place.cameraLink && opts.cameras ? opts.cameras[place.camera] : null;
      const camUrl = cam ? cameraUrl(cam, opts.cameraStatus && opts.cameraStatus[place.camera]) : null;
      const text = messageText(place, a.type, p.metrics, opts.model, opts.run);
      out.push({id: alertId(opts.run, place.id, a.type), place: place.id, type: a.type, to: place.notify.slice(),
        message: text + (camUrl ? '\nKamera: ' + camUrl : ''), click: camUrl || APP_URL,
        priority: a.type === 'tonight' ? 3 : 4});
    }
  }
  return out;
}

// HMAC-SHA256 heksana (24 merkkiä). WebCrypto: toimii Node 20:ssä ja Workerissa.
async function sign(key, text){
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
async function verify(key, text, sig){
  if(!key || typeof sig !== 'string' || sig.length !== 24) return false;
  const want = await sign(key, text);
  let d = 0; for(let i = 0; i < 24; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

// ntfy-julkaisun runko (JSON-julkaisu: UTF-8 otsikko ja napit kunnolla).
async function ntfyBody(n, who, topic, feedback){
  const body = {topic, title: 'AuroraAwesome · kenttätesti', message: n.message, click: n.click,
    priority: n.priority, tags: ['milky_way']};
  if(feedback && feedback.url && feedback.key){
    const s = await sign(feedback.key, n.id + '|' + who);
    const u = v => feedback.url.replace(/\/$/, '') + '/palaute?h=' + encodeURIComponent(n.id) + '&v=' + v + '&k=' + who + '&s=' + s;
    body.actions = Object.entries(ANSWERS).map(([v, label]) => ({action: 'http', label, url: u(v), method: 'POST', clear: true}));
  }
  return body;
}

// Lähetys. env: {NTFY_TOPIC_PEKKA, NTFY_TOPIC_OPAS}; feedback: {url, key}.
// Palauttaa lokiin tulevat tiedot ILMAN kanavien nimiä.
async function sendAll(list, env, feedback, fetchFn = fetch){
  const log = [];
  for(const n of list){
    const res = {id: n.id, place: n.place, t: n.type, to: {}, buttons: !!(feedback && feedback.url && feedback.key)};
    for(const who of n.to){
      const topic = env[RECIPIENTS[who]];
      if(!topic){ res.to[who] = 'ei kanavaa'; continue; }
      try{
        const r = await fetchFn(NTFY_URL, {method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(await ntfyBody(n, who, topic, feedback))});
        res.to[who] = r.ok ? 'ok' : 'HTTP ' + r.status;
      }catch(e){ res.to[who] = 'virhe: ' + String(e.message || e).replaceAll(topic, '***'); }
    }
    log.push(res);
  }
  return log;
}

const Notify = {NTFY_URL, APP_URL, RECIPIENTS, WHO_NAMES, ANSWERS, TYPE_TITLES, ID_RE, alertId, cameraUrl, messageText,
  buildNotifications, sign, verify, ntfyBody, sendAll};
root.AlertNotify = Notify;
if(typeof module !== 'undefined' && module.exports) module.exports = Notify;
})(typeof globalThis !== 'undefined' ? globalThis : this);
