/* ══════════════════════════════════════════════════════════════
   Revontulihälytykset ruututasolla, vaihe 2 = Aurora Dev -testi (päätökset 34 ja 36, 7.11.2026)
   ──────────────────────────────────────────────────────────────
   Palvelin arvioi jokaisen sijaintiruudun (0,5° × 1°, aurora-core.js ALERT_CELL) alueella REGION ja lähettää
   hälytyksen ruudun FCM-aiheisiin (al1_<fi|en|zh>_<i>_<j>). Palvelin ei tiedä käyttäjiä eikä koordinaatteja.
   Tyypit (raja kaikilla näkyvyys-% >= VIS_CLASSES.good = 40 %, "hyvä"):
   - now:     nykyhetken näkyvyys-% = OVATION × läpäisy(pilvisyys) × pimeys.
   - coming:  Bz laukaisee tarkistuksen (siirtymä: Bz-ehto ei voimassa edellisellä ajolla -> voimassa; ehto ennallaan:
              Bz <= −5 nT vähintään 20 min, Bt >= 6 nT, Kp nyt + 1 >= paikan Kp-raja). Niin kauan kuin ehto pysyy
              voimassa, hälytys lähtee, kun ennustettu näkyvyys-% 30–60 min eteenpäin (suurin hetkistä +30/+45/+60 min)
              >= 40 %. Bz ei ole prosentti eikä kerroin. Ei lähde, jos now on jo lähtenyt samana yönä.
   - Tänä yönä -hälytys POISTETTU (päätös 42, 11.11.2026); Tänä yönä -välilehti sovelluksessa säilyy.
   Päätös 42: Nyt ja Tulossa lähettävät SAMAN ilmoituksen (alertTexts); tyyppi kulkee datassa vain palautetta varten.
   Tiheysraja: enintään yksi hälytys ruutua kohti FCM_ALERT_CFG.minGapH (2 h) aikana (tila s.last), korvaa
   "yksi kutakin tyyppiä yössä". Tulossa vain Bz-siirtymästä (armed nollautuu lähetyksessä).
   Mallit: vähintään puolet saatavilla olevista (pyöristys ylös) ylittää rajan mallikohtaisella näkyvyys-%:lla.
   Puuttuva malli ei ole nolla (ei lasketa saatavilla oleviin). 3 mallia (HARMONIE, ICON-EU, ECMWF).
   Ruudun pilvisyys = hilapisteiden 25. persentiili (selkeämpi osa). Yö = klo 15–07 paikallista (tunnisteen yö).
   now ja coming vain pimeäaikana (aurinko alle −6° ruudun keskipisteessä).
   Hälytyksen report (päätös 42): sääraportin arvot ilmoituksen dataan (näkyvyys-%, arvioitu aika, pilvisyys,
   mallit ok/avail, Bz, Bt, Kp); sovellus näyttää ne napautuksesta.
   Ilmoituksen luku = suurin arvo, jonka vähintään vaadittu määrä malleja saavuttaa.
   Puhtaita funktioita (data argumentteina) -> testattavissa (tests/fcm-alerts.test.mjs). Ajo: scripts/alert-fcm.mjs.
   ══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const C0 = root.AuroraCore || (typeof require === 'function' ? require('../aurora-core.js') : null);

const FCM_ALERT_CFG = {
  goodMin: C0.VIS_CLASSES.good,
  cloudQ: 0.25,                       // ruudun pilvisyys: 25. persentiili
  region: {lat0: 58, lat1: 72, lon0: -1, lon1: 35},   // arvioitavat ruudut (HARMONIEn alue, revontulivyöhyke)
  models: {now: ['harmonie', 'icon_eu', 'ecmwf']},   // päätös 42: Tänä yönä (4 mallia) poistettu
  minGapH: 2,                         // päätös 42: enintään yksi hälytys ruutua kohti 2 tunnin aikana
  maxAgeH: {harmonie: 9, icon_eu: 12, ecmwf: 20, edited: 6},   // vanhempi ajo = malli ei saatavilla
  coming: {bzMax: -5, btMin: 6, kpMargin: 1, leadMin: [30, 45, 60], repeatMin: 30},
};
const TYPES = ['now', 'coming'];   // päätös 42: tonight poistettu

// Vaadittu mallimäärä: puolet saatavilla olevista, pyöristys ylös (1 -> 1, 2 -> 1, 3 -> 2, 4 -> 2).
const needModels = n => Math.ceil(n / 2);
// Mallikohtaiset arvot {malli: % | null} -> {ok, avail, need, value}. value = suurin luku, jonka vähintään
// need mallia saavuttaa (= need:nneksi suurin arvo).
function majority(vals, goodMin = FCM_ALERT_CFG.goodMin){
  const v = Object.values(vals).filter(x => x != null && Number.isFinite(x)).sort((a, b) => b - a);
  const avail = v.length, need = needModels(avail);
  if(!avail) return {ok: false, avail: 0, need: 0, value: null, count: 0};
  const count = v.filter(x => x >= goodMin).length, value = v[need - 1];
  return {ok: count >= need, avail, need, value, count};
}

// Arvioitavat ruudut (alueen ruudut keskipisteineen ja aikavyöhykkeineen).
function regionCells(C, region = FCM_ALERT_CFG.region){
  const cfg = C.ALERT_CELL, out = [];
  for(let lat = region.lat0; lat < region.lat1 - 1e-9; lat += cfg.dLat)
    for(let lon = region.lon0; lon < region.lon1 - 1e-9; lon += cfg.dLon){
      const c = C.alertCell(lat + cfg.dLat / 2, lon + cfg.dLon / 2);
      out.push({...c, tz: C.cellTimeZone(c.center.lat, c.center.lon), mlat: C.magLat(c.center.lat, c.center.lon)});
    }
  return out;
}

// Mallikohtainen näkyvyys-% ruudussa hetkellä t (OVATION p hetkeltä now; pilvet ja pimeys hetkeltä t).
function cellVis(C, grids, ptsOf, cell, p, t, models){
  const df = C.darknessFactor(C.sunAltitude(t, cell.center.lat, cell.center.lon));
  const out = {};
  for(const m of models){
    const g = grids[m];
    const cl = g ? C.cellCloudPct(g, ptsOf(m, cell), t, FCM_ALERT_CFG.cloudQ) : null;
    out[m] = cl == null || p == null ? null : C.visibilityIndex(p, C.cloudTransmit(cl), df);
  }
  return out;
}

// Mallikohtainen pilvisyys-% ruudussa hetkellä t (sääraporttia varten).
function cellClouds(C, grids, ptsOf, cell, t, models){
  const out = {};
  for(const m of models){ const g = grids[m]; out[m] = g ? C.cellCloudPct(g, ptsOf(m, cell), t, FCM_ALERT_CFG.cloudQ) : null; }
  return out;
}
const median = v => { const a = v.filter(x => x != null && Number.isFinite(x)).sort((x, y) => x - y); if(!a.length) return null;
  const k = a.length >> 1; return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2; };
// Vanha tila (ennen päätöstä 42: s.sent {now, coming, tonight}, s.tonight) -> s.last = viimeisin Nyt/Tulossa-lähetys.
function migrateCell(s){
  if(s.sent){ const t = [s.last, s.sent.now, s.sent.coming].filter(Boolean).map(Date.parse).filter(Number.isFinite);
    if(t.length) s.last = new Date(Math.max(...t)).toISOString(); }
  delete s.sent; delete s.tonight;
  return s;
}

// Tulossa-ehto (Bz-laukaisin) ruudun keskipisteessä. null = tuntematon (data puuttuu/vanha).
function comingTrigger(C, data, cell, now, cfg = FCM_ALERT_CFG){
  const hint = C.bzHint(data.mag, now.getTime());
  if(!hint.trend || !hint.fresh) return null;
  const bt = hint.btRow ? hint.btRow.bt : null;
  if(bt == null || now.getTime() - hint.btRow.t > C.BZ.staleMin * 60e3) return null;
  const kp = data.kp ? C.kpNowInfo(data.kp, now.getTime()) : null;
  if(!kp) return null;
  const K = cfg.coming;
  return !!(hint.show && hint.trend.mean <= K.bzMax && bt >= K.btMin && kp.kp + K.kpMargin >= C.kpRequired(cell.mlat));
}

// Yhden ajon arvio. data = {ovation, mag, kp, grids: {malli: hila}}, prev = tila (ruutu -> {...}).
// Palauttaa {alerts: [...], state}. alerts: {type, cell, night, pct, ok, avail, kp: [lo, hi], best: [from, to]|null, models}.
function evaluateCells(C, data, cells, prev, now, cfg = FCM_ALERT_CFG){
  const st = JSON.parse(JSON.stringify(prev || {})), alerts = [];
  const ptsCache = new Map();
  const ptsOf = (m, cell) => {
    const k = m + ':' + cell.key;
    if(!ptsCache.has(k)) ptsCache.set(k, C.cellGridPoints(data.grids[m], cell));
    return ptsCache.get(k);
  };
  const kpNow = data.kp ? C.kpNowInfo(data.kp, now.getTime()) : null;
  const hint = data.mag ? C.bzHint(data.mag, now.getTime()) : null;
  const r1 = x => x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
  const sw = {bz: hint && hint.fresh && hint.magRow ? r1(hint.magRow.bz) : null,
    bt: hint && hint.btRow && now.getTime() - hint.btRow.t <= C.BZ.staleMin * 60e3 ? r1(hint.btRow.bt) : null,
    kp: kpNow ? r1(kpNow.kp) : null};
  // Sääraportti: arvot lähetyshetkeltä, pilvisyys = saatavilla olevien mallien mediaani hetkellä at.
  const report = (cell, mj, at) => ({pct: mj.value, at: at.toISOString(),
    cloud: (v => v == null ? null : Math.round(v))(median(Object.values(cellClouds(C, data.grids, ptsOf, cell, at, cfg.models.now)))),
    ok: mj.count, avail: mj.avail, ...sw});
  const gapMs = cfg.minGapH * 3600e3;
  for(const cell of cells){
    const night = C.alertNightKey(now, cell.tz);
    const s = migrateCell(st[cell.key] || {});
    if(night) s.night = night;
    if(!night){ if(Object.keys(s).length) st[cell.key] = s; continue; }
    const sun = C.sunAltitude(now, cell.center.lat, cell.center.lon), dark = sun < C.SUN_DARK_DEG;
    const p = data.ovation ? C.ovationProbAt(data.ovation.grid, cell.center.lat, cell.center.lon) : null;
    const quiet = s.last && now.getTime() - Date.parse(s.last) < gapMs;   // tiheysraja 2 h (päätös 42)
    let sent = false;
    // Nyt
    if(dark && !quiet && p != null){
      const vals = cellVis(C, data.grids, ptsOf, cell, p, now, cfg.models.now), mj = majority(vals, cfg.goodMin);
      if(mj.ok){
        s.last = now.toISOString(); sent = true;
        alerts.push({type: 'now', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: vals,
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null, report: report(cell, mj, now)});
      }
    }
    // Tulossa (Bz-laukaisin, siirtymä; tila säilyy tuntemattomassa). Lähetys kuluttaa siirtymän (armed = null).
    const trig = comingTrigger(C, data, cell, now, cfg);
    s.coming = s.coming || {};
    if(trig != null){
      const was = s.coming.on;
      s.coming.on = trig;
      if(trig && was === false) s.coming.armed = now.toISOString();   // Bz käänsi: tarkistus alkaa
      if(!trig) s.coming.armed = null;
    }
    if(sent && s.coming.armed) s.coming.armed = null;   // Nyt lähti samassa ajossa -> sama ilmoitus, ei toista
    if(dark && !quiet && !sent && s.coming.armed && trig && p != null){
      const per = {}, at = {};
      for(const m of cfg.models.now){
        let best = null;
        for(const lm of cfg.coming.leadMin){
          const v = cellVis(C, data.grids, ptsOf, cell, p, new Date(now.getTime() + lm * 60e3), [m])[m];
          if(v != null && (best == null || v > best)){ best = v; at[m] = lm; }
        }
        per[m] = best;
      }
      const mj = majority(per, cfg.goodMin);
      if(mj.ok){
        s.last = now.toISOString(); s.coming.armed = null;
        const lead = Object.keys(per).find(m => per[m] === mj.value) || cfg.models.now[0];
        alerts.push({type: 'coming', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: per,
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null,
          report: report(cell, mj, new Date(now.getTime() + (at[lead] || cfg.coming.leadMin[0]) * 60e3))});
      }
    }
    st[cell.key] = s;
  }
  // Vanhat ruudut pois (ei yötä eikä mitään voimassa)
  for(const k of Object.keys(st)) if(!st[k].night && !(st[k].coming && st[k].coming.armed) && !st[k].last) delete st[k];
  return {alerts, state: st};
}

// Ilmoituksen tekstit kielelle (alert-texts.js). Päätös 42: sama teksti Nyt ja Tulossa (yleinen + näkyvyys-%).
function alertTexts(T, a, lang){
  const vars = {pct: T.pct(lang, a.pct)};
  return {title: T.text(lang, 'title', vars), body: T.text(lang, 'body', vars)};
}
// Ajon esitarkistus (päätös 38): tarvitaanko dataa lainkaan? dark = ruutuja, joissa aurinko alle -6°. 0 -> ajo poistuu.
// Päätös 42: Tänä yönä -ikkunaa ei enää ole (tonight aina 0, kenttä säilyy lokin yhteensopivuuden vuoksi).
function runNeed(C, cells, prev, now){
  let dark = 0;
  for(const c of cells) if(C.sunAltitude(now, c.center.lat, c.center.lon) < C.SUN_DARK_DEG) dark++;
  return {dark, tonight: 0, run: dark > 0};
}
// Hälytyksen tunniste (palaute): tyyppi, ruutu, yö. Ei käyttäjä- eikä sijaintitietoa.
const alertId = a => a.type + '-' + a.cell.key + '-' + a.night;

const FcmAlerts = {FCM_ALERT_CFG, TYPES, needModels, majority, regionCells, cellVis, cellClouds, migrateCell, comingTrigger, evaluateCells, alertTexts, alertId, runNeed};
root.FcmAlerts = FcmAlerts;
if(typeof module !== 'undefined' && module.exports) module.exports = FcmAlerts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
