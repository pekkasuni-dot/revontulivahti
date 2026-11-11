#!/usr/bin/env node
// Hälytysten testi-ilmoitus FCM:llä (11.11.2026: oikean hälytyksen muodossa). Rakentaa viestin SAMALLA funktiolla kuin
// hälytysajo (alerts/fcm.js alertMessages): tulos + näkyvyys-%, mallien yksimielisyys, Kp-haarukka (päätös 36),
// iOS-kategoria RV_FEEDBACK ja Androidin data-viesti palautepainikkeineen, tyyppi, ruutu, lähetysaika, tunniste ja
// allekirjoitus (PALAUTE_AVAIN_FCM) -> palautepainikkeen vastaus tallentuu Workeriin. Otsikon perässä "(testi)".
//   FCM_SERVICE_ACCOUNT=... PALAUTE_AVAIN_FCM=... node scripts/fcm-test.mjs --lat 64.75 --lon 25.5 \
//     [--lang all|fi|en|zh] [--type now|coming] [--pct 62] [--survey] [--dry]
// --survey: lippu data.survey = '1' -> sovellus näyttää varakyselyn napautuksesta aikaikkunasta riippumatta
// (vain testiviestit; oikeat hälytykset eivät käytä lippua).
// --dry: tulostaa viestit lähettämättä (ei tarvitse avainta). Avaimia ei koskaan tulosteta.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../aurora-core.js');
const texts = require('../alert-texts.js');
const alerts = require('../alerts/fcm-alerts.js');
const fcm = require('../alerts/fcm.js');

const GHA = !!process.env.GITHUB_ACTIONS;
const warn = m => console.log((GHA ? '::warning::' : 'VAROITUS: ') + m);
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] != null ? process.argv[i + 1] : d; };
const DEFAULT = {lat: 65.01, lon: 25.47};   // työnkulun oletus (Oulu, ruutu 310_205)
const lat = parseFloat(arg('lat', String(DEFAULT.lat))), lon = parseFloat(arg('lon', String(DEFAULT.lon)));
const lang = arg('lang', 'all'), dry = process.argv.includes('--dry');
// Päätös 42: tyypit now ja coming (sama ilmoitus); vanha tonight / --view -> now.
let type = arg('type', 'now');
if(type === 'tonight'){ warn('Tänä yönä -hälytys on poistettu (päätös 42) -> lähetetään tyyppinä now.'); type = 'now'; }
if(!alerts.TYPES.includes(type)){ console.log('::error::Tuntematon tyyppi ' + type + ' (now, coming)'); process.exit(1); }
const pct = Math.max(0, Math.min(100, parseFloat(arg('pct', '62'))));

const c = core.alertCell(lat, lon);
if(!c){ console.log('::error::Virheellinen sijainti ' + lat + ', ' + lon); process.exit(1); }
const cell = {...c, tz: core.cellTimeZone(c.center.lat, c.center.lon), mlat: core.magLat(c.center.lat, c.center.lon)};
const langs = lang === 'all' ? null : [core.alertLang(lang)];
const now = new Date(), sentAt = now.toISOString();
// Testihälytys kiinteillä arvoilla (sääraportti päätös 42). Yö = kiinteä '2000-01-01': tunniste ei voi osua samaan kuin
// oikea hälytys (Worker hyväksyy yhden vastauksen per hälytys per laite), mutta täyttää muodon tyyppi-ruutu-VVVV-KK-PP.
const at = new Date(now.getTime() + (type === 'coming' ? 45 : 0) * 60e3).toISOString();
const alert = {type, cell, night: '2000-01-01', pct, ok: 2, avail: 3, models: {}, kp: [3.7, 3.7], best: null,
  report: {pct, at, cloud: 20, ok: 2, avail: 3, bz: -6.4, bt: 8.2, kp: 3.7}};
const SUFFIX = {fi: '(testi)', en: '(test)', zh: '（测试）'};
const key = process.env.PALAUTE_AVAIN_FCM || '';
const msgs = await fcm.alertMessages({core, texts, alerts, alert, sentAt, key, langs,
  titleSuffix: l => SUFFIX[texts.alertLangOf(l)] || SUFFIX.en});
const survey = process.argv.includes('--survey');
if(survey) for(const m of msgs) m.message.data.survey = '1';   // FCM data -> iOS:n userInfo ja Androidin Intent-lisätieto

const topics = msgs.map(m => m.message.topic);
console.log('══════════════════════════════════════════════');
console.log(`Ruutu ${cell.key}  (${cell.lat0}–${cell.lat0 + core.ALERT_CELL.dLat} °N, ${cell.lon0}–${cell.lon0 + core.ALERT_CELL.dLon} °E, ${cell.tz})`);
console.log(`Sijainti ${lat}, ${lon}  ->  aihe(et): ${topics.join(', ')}`);
console.log(`Tyyppi ${type}, näkyvyys ${pct} %, tunniste ${alert.type}-${cell.key}-${alert.night}` + (survey ? ', kysely pakotettu' : ''));
console.log('══════════════════════════════════════════════');
if(lat === DEFAULT.lat && lon === DEFAULT.lon)
  warn(`Oletuskoordinaatit (${DEFAULT.lat}, ${DEFAULT.lon}) -> ruutu ${cell.key}. Varmista, että puhelimesi on tilannut juuri tämän ruudun (Asetukset > Revontulihälytykset, testitilassa "Tilattuja alueita").`
    + (process.env.GITHUB_REF === 'refs/heads/main' ? ' Ajo on mainista: anna lat/lon Run workflow -kentissä.' : ''));
if(!key) warn('PALAUTE_AVAIN_FCM puuttuu: viesti lähtee ilman allekirjoitusta, palautepainikkeen vastaus hylätään Workerissa (403).');
for(const m of msgs) console.log(`  [${m.message.topic}] ${m.message.data.title} | ${m.message.data.body}`);
if(dry){ for(const m of msgs) console.log(JSON.stringify(m)); process.exit(0); }

const raw = process.env.FCM_SERVICE_ACCOUNT;
if(!raw){ console.log('::error::Salaisuus FCM_SERVICE_ACCOUNT puuttuu (OHJE-fcm.md)'); process.exit(1); }
const sa = fcm.parseServiceAccount(raw);
const token = await fcm.accessToken(sa);
let fails = 0;
for(const m of msgs){
  try{ const name = await fcm.send(sa, m, {token}); console.log(`OK ${m.message.topic} -> ${name.split('/').pop()}`); }
  catch(e){ fails++; console.log(`::error::${m.message.topic}: ${e.message}`); }
}
process.exit(fails ? 1 : 0);
