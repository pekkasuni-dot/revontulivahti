#!/usr/bin/env node
// Hälytysten testi-ilmoitus FCM:llä (2026-11-02, vaihe 1): yksi viesti sijaintiruudun aiheeseen per kieli.
//   FCM_SERVICE_ACCOUNT='<palvelutilin JSON>' node scripts/fcm-test.mjs --lat 65.01 --lon 25.47 [--lang fi] [--view night] [--dry]
// --dry: tulostaa viestit lähettämättä (ei tarvitse avainta). Avainta ei koskaan tulosteta.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../aurora-core.js');
const fcm = require('../alerts/fcm.js');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const lat = parseFloat(arg('lat', '65.01')), lon = parseFloat(arg('lon', '25.47'));
const lang = arg('lang', 'all'), view = arg('view', 'night'), dry = process.argv.includes('--dry');
const langs = lang === 'all' ? null : [core.alertLang(lang)];
const msgs = fcm.testMessages(core, lat, lon, {langs, view});
const cell = core.alertCell(lat, lon);
console.log(`Ruutu ${cell.key} (${cell.lat0}..${cell.lat0 + core.ALERT_CELL.dLat} °N, ${cell.lon0}..${cell.lon0 + core.ALERT_CELL.dLon} °E), näkymä ${view}`);
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
