/* ══════════════════════════════════════════════════════════════
   Revontulihälytykset ruututasolla, vaihe 2 = Aurora Dev -testi (päätökset 34 ja 36, 7.11.2026)
   ──────────────────────────────────────────────────────────────
   Palvelin arvioi jokaisen sijaintiruudun (0,5° × 1°, aurora-core.js ALERT_CELL) alueella REGION ja lähettää
   hälytyksen ruudun FCM-aiheisiin (al1_<fi|en|zh>_<i>_<j>). Palvelin ei tiedä käyttäjiä eikä koordinaatteja.
   Tyypit (raja kaikilla näkyvyys-% >= VIS_CLASSES.good = 40 %, "hyvä"):
   - now:     nykyhetken näkyvyys-% = OVATION × läpäisy(pilvisyys) × pimeys.
   - coming:  Bz laukaisee tarkistuksen (siirtymä: Bz-ehto ei voimassa edellisellä ajolla -> voimassa; ehto:
              Bz <= −5 nT vähintään 20 min, Bt >= 6 nT; Kp-ehto poistettu päätöksellä 49). Niin kauan kuin ehto pysyy
              voimassa, hälytys lähtee, kun pilvisääntö täyttyy 30–60 min eteenpäin (paras hetkistä +30/+45/+60 min;
              päätös 49, ennen näkyvyys-% >= 40 %). Bz ei ole prosentti eikä kerroin. Ei lähde, jos now on jo lähtenyt samana yönä.
   - Tänä yönä -hälytys POISTETTU (päätös 42, 11.11.2026); Tänä yönä -välilehti sovelluksessa säilyy.
   PÄÄTÖS 49 (12.11.2026): kolme ehtoa, mikä tahansa riittää (yksi ilmoitus, tiheysraja 2 h):
   1. Nyt (trig 'now', tyyppi now): ennallaan, näkyvyys-% >= 40 mallisäännöllä.
   2. Bz (trig 'bz', tyyppi coming): Bz-laukaisin ILMAN Kp-ehtoa (sama kuin sovelluksen BZ.hint), siirtymästä; ehtona pimeys +
      pilvisääntö (mallin läpäisykerroin × 100 >= 40, mallisääntö) +30..+60 min, EI enää näkyvyys-% >= 40.
   3. Kp (trig 'kp', tyyppi now): havaittu Kp nyt >= kp.min (2,5) + pimeys + pilvisääntö nyt; laukeaa, kun yhdistelmä
      muuttuu todeksi (tila s.kpc.on), ei joka ajolla. Tiheysrajan aikana siirtymä lykkääntyy.
   Bz- ja Kp-ilmoituksen luku = näkyvyys-% (OVATION × läpäisy × pimeys, mallisäännön arvo) kuten Nyt -> voi olla alle 40 %.
   Päätös 42: Nyt ja Tulossa lähettävät SAMAN ilmoituksen (alertTexts); tyyppi kulkee datassa vain palautetta varten.
   Tiheysraja: enintään yksi hälytys ruutua kohti FCM_ALERT_CFG.minGapH (2 h) aikana (tila s.last), korvaa
   "yksi kutakin tyyppiä yössä". Tulossa vain Bz-siirtymästä (armed nollautuu lähetyksessä).
   Mallit: vähintään puolet saatavilla olevista (pyöristys ylös) ylittää rajan mallikohtaisella näkyvyys-%:lla.
   Puuttuva malli ei ole nolla (ei lasketa saatavilla oleviin). Nyt: 4 mallia (HARMONIE, ICON-EU, ECMWF, IL editoitu,
   päätös 48, 12.11.2026) -> 2/4 riittää; IL:n alueen ulkopuolella (länsi, < 4 °E) tai IL vanha (> 6 h) 3 mallia ja 2/3.
   Bz ja Kp: samat 4 mallia (päätös 49 täsmennys). IL-erot lokiin (ilDiff) ennustevertailua varten.
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
  // Päätös 48: IL editoitu mukaan Nyt-hälytykseen; päätös 49 täsmennys 12.11.: samat 4 mallia Bz- ja Kp-ehdolle.
  models: {now: ['harmonie', 'icon_eu', 'ecmwf', 'edited']},
  minGapH: 2,                         // päätös 42: enintään yksi hälytys ruutua kohti 2 tunnin aikana
  maxAgeH: {harmonie: 9, icon_eu: 12, ecmwf: 20, edited: 6},   // vanhempi ajo = malli ei saatavilla
  // Päätös 49: Tulossa ilman Kp-ehtoa (ennen kpMargin 1: Kp nyt + 1 >= paikan raja).
  coming: {bzMax: -5, btMin: 6, leadMin: [30, 45, 60], repeatMin: 30},
  kp: {min: 2.5},                     // päätös 49: Kp-ehto, havaittu Kp nyt >= 2,5 kaikille leveysasteille, vain siirtymästä
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
  const K = cfg.coming;
  // Päätös 49: Kp-ehto (Kp nyt + 1 >= paikan raja) poistettu -> ehto ei riipu ruudusta (sama kuin sovelluksen BZ.hint).
  return !!(hint.show && hint.trend.mean <= K.bzMax && bt >= K.btMin);
}
// Seurattavat ruudut (päätös 49 täsmennys): ajokohtaiset arvot lokiin, vaikka hälytystä ei lähde. Vain ruututunnisteet.
// Oulu 310_205, Rovaniemi (keskusta) 313_205, Kilpisjärvi 318_200, Utsjoki 319_207.
const WATCH_CELLS = ['310_205', '313_205', '318_200', '319_207'];
// Päätös 49: Kp-ehto. Havaittu Kp nyt (kpNowInfo: reaaliaikainen arvio tai viimeisin mitattu jakso) >= kp.min.
// null = Kp ei tiedossa (tila säilyy).
function kpCondition(C, data, now, cfg = FCM_ALERT_CFG){
  const k = data.kp ? C.kpNowInfo(data.kp, now.getTime()) : null;
  return k ? {kp: k.kp, on: k.kp >= cfg.kp.min} : null;
}
// Päätös 49: pilvisääntö Bz- ja Kp-ehdoille = Nyt-hälytyksen mallisääntö (majority, vähintään ceil(saatavilla/2) mallia),
// mallin arvona ruudun 25. persentiilin pilvisyyden läpäisykerroin × 100 (EI pyöristetä); raja sama goodMin (40).
// Kerroin = CLOUD_TRANSMIT-taulukon paloittain lineaarinen interpolointi välillä [30 %, 0,9] – [80 %, 0,1]:
// 0,9 − 0,016 × (pilvisyys − 30) >= 0,40  <=>  pilvisyys <= 61,25 %. Pimeys on oma ehtonsa.
function cellCloudFactor(C, grids, ptsOf, cell, t, models){
  const out = {}, cl = cellClouds(C, grids, ptsOf, cell, t, models);
  for(const m of models){ const f = C.cloudTransmit(cl[m]); out[m] = f == null ? null : f * 100; }
  return out;
}

// Yhden ajon arvio. data = {ovation, mag, kp, grids: {malli: hila}}, prev = tila (ruutu -> {...}).
// Palauttaa {alerts: [...], state, ilDiff: [...], diag}. alert.trig = 'now' | 'bz' | 'kp' (päätös 49).
// alerts: {type, cell, night, pct, ok, avail, kp: [lo, hi], best: [from, to]|null, models}.
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
  const report = (cell, mj, at, models, trig) => ({pct: mj.value, at: at.toISOString(), trig,
    cloud: (v => v == null ? null : Math.round(v))(median(Object.values(cellClouds(C, data.grids, ptsOf, cell, at, models)))),
    ok: mj.count, avail: mj.avail, ...sw});
  const gapMs = cfg.minGapH * 3600e3;
  // Päätös 49: Bz- ja Kp-ehto eivät riipu ruudusta -> lasketaan kerran ajossa.
  const bzTrig = data.mag ? comingTrigger(C, data, null, now, cfg) : null, kpc = kpCondition(C, data, now, cfg);
  const dg = {kp: kpc ? kpc.kp : null, kpOn: kpc ? kpc.on : null, bz: bzTrig, dark: 0, cloudPass: 0,
    sent: {now: 0, bz: 0, kp: 0}, kpConsumed: 0, kpDeferred: 0, watch: {}};
  const r0 = x => x == null || !Number.isFinite(x) ? null : Math.round(x);
  const rObj = o => o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r0(v)])) : null;
  const comingModels = cfg.models.now;   // päätös 49 täsmennys: Bz arvioi samat 4 mallia kuin Nyt ja Kp
  // Päätös 48: ruudut, joissa IL:n tulos (>= raja) poikkeaa muiden mallien enemmistöstä -> loki (vaihtoehdot C ja E).
  const ilDiff = [], others = cfg.models.now.filter(m => m !== 'edited');
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
    const vals = dark && p != null ? cellVis(C, data.grids, ptsOf, cell, p, now, cfg.models.now) : null;
    if(vals && vals.edited != null){
      const rest = {}; for(const m of others) rest[m] = vals[m];
      const m3 = majority(rest, cfg.goodMin), ilOk = vals.edited >= cfg.goodMin;
      if(m3.avail && ilOk !== m3.ok){
        const mj4 = majority(vals, cfg.goodMin), cl = cellClouds(C, data.grids, ptsOf, cell, now, cfg.models.now);
        ilDiff.push({cell: cell.key, il: vals.edited, ilCloud: cl.edited == null ? null : Math.round(cl.edited), vis: vals,
          cloud: Object.fromEntries(Object.entries(cl).map(([k, v]) => [k, v == null ? null : Math.round(v)])),
          p: Math.round(p), ok3: m3.ok, ok4: mj4.ok, count: mj4.count, avail: mj4.avail, quiet: !!quiet});
      }
    }
    if(dark && !quiet && p != null){
      const mj = majority(vals, cfg.goodMin);
      if(mj.ok){
        s.last = now.toISOString(); sent = true; dg.sent.now++;
        alerts.push({type: 'now', trig: 'now', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: vals,
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null, report: report(cell, mj, now, cfg.models.now, 'now')});
      }
    }
    // Pilvisääntö nyt (Kp-ehto ja diagnostiikka): 4 mallia kuten Nyt.
    const cfNow = dark ? cellCloudFactor(C, data.grids, ptsOf, cell, now, cfg.models.now) : null;
    const cloudNow = cfNow ? majority(cfNow, cfg.goodMin) : null;
    if(dark){ dg.dark++; if(cloudNow.ok) dg.cloudPass++; }
    // Bz / Tulossa (siirtymä; tila säilyy tuntemattomassa). Lähetys kuluttaa siirtymän (armed = null).
    s.coming = s.coming || {};
    if(bzTrig != null){
      const was = s.coming.on;
      s.coming.on = bzTrig;
      if(bzTrig && was === false) s.coming.armed = now.toISOString();   // Bz käänsi: tarkistus alkaa
      if(!bzTrig) s.coming.armed = null;
    }
    if(sent && s.coming.armed) s.coming.armed = null;   // Nyt lähti samassa ajossa -> sama ilmoitus, ei toista
    if(dark && !quiet && !sent && s.coming.armed && bzTrig && p != null){
      // Päätös 49: ehtona pimeys + pilvisääntö (läpäisykerroin), ei näkyvyys-% >= 40. Malli kohden paras hetki
      // +30/+45/+60 min = suurin läpäisykerroin; ilmoitettu luku = näkyvyys-% (OVATION × läpäisy × pimeys) samalta hetkeltä,
      // mallisäännön arvo (majority.value) kuten Nyt.
      const per = {}, cf = {}, at = {};
      for(const m of comingModels){
        let best = null, bv = null, bl = null;
        for(const lm of cfg.coming.leadMin){
          const t = new Date(now.getTime() + lm * 60e3);
          const f = cellCloudFactor(C, data.grids, ptsOf, cell, t, [m])[m];
          if(f != null && (best == null || f > best)){ best = f; bl = lm; bv = cellVis(C, data.grids, ptsOf, cell, p, t, [m])[m]; }
        }
        cf[m] = best; per[m] = bv; if(bl != null) at[m] = bl;
      }
      const cj = majority(cf, cfg.goodMin), mj = majority(per, cfg.goodMin);
      if(cj.ok){
        s.last = now.toISOString(); s.coming.armed = null; sent = true; dg.sent.bz++;
        const lead = Object.keys(per).find(m => per[m] === mj.value) || comingModels[0];
        alerts.push({type: 'coming', trig: 'bz', cell, night, pct: mj.value, ok: cj.count, avail: cj.avail, models: per, clouds: rObj(cf),
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null,
          report: {...report(cell, mj, new Date(now.getTime() + (at[lead] || cfg.coming.leadMin[0]) * 60e3), comingModels, 'bz'),
            ok: cj.count, avail: cj.avail}});
      }
    }
    // Kp-ehto (päätös 49): laukeaa, kun "Kp >= 2,5 + pimeää + pilvisääntö" muuttuu todeksi (edellinen ajo ei voimassa).
    // Tila s.kpc.on = ehto voimassa ja käsitelty. Tiheysraja lykkää (on jää falseksi -> lähtee rajan jälkeen, jos yhä voimassa).
    s.kpc = s.kpc || {};
    if(kpc != null){
      const full = !!(kpc.on && dark && cloudNow && cloudNow.ok && p != null);
      if(!full) s.kpc.on = false;
      else if(s.kpc.on !== true){
        if(sent){ s.kpc.on = true; dg.kpConsumed++; }       // Nyt tai Bz lähti samassa ajossa -> yksi ilmoitus
        else if(!quiet){
          const mj = majority(vals, cfg.goodMin);
          s.last = now.toISOString(); s.kpc.on = true; sent = true; dg.sent.kp++;
          alerts.push({type: 'now', trig: 'kp', cell, night, pct: mj.value, ok: cloudNow.count, avail: cloudNow.avail, models: vals,
            clouds: rObj(cfNow), kp: [kpc.kp, kpc.kp], best: null,
            report: {...report(cell, mj, now, cfg.models.now, 'kp'), ok: cloudNow.count, avail: cloudNow.avail}});
        } else dg.kpDeferred++;
      }
    }
    if(WATCH_CELLS.includes(cell.key)){
      const mjN = vals ? majority(vals, cfg.goodMin) : null;
      dg.watch[cell.key] = {dark, df: Math.round(C.darknessFactor(sun) * 100) / 100, ovation: r0(p), quiet: !!quiet,
        vis: rObj(vals), cloud: dark ? rObj(cellClouds(C, data.grids, ptsOf, cell, now, cfg.models.now)) : null, cf: rObj(cfNow),
        now: mjN ? {ok: mjN.ok, count: mjN.count, avail: mjN.avail, value: mjN.value} : null,
        cloudRule: cloudNow ? {ok: cloudNow.ok, count: cloudNow.count, avail: cloudNow.avail} : null,
        bzArmed: !!s.coming.armed, kpOn: s.kpc.on ?? null, sent: sent ? alerts[alerts.length - 1].trig : null};
    }
    st[cell.key] = s;
  }
  // Vanhat ruudut pois (ei yötä eikä mitään voimassa)
  for(const k of Object.keys(st)) if(!st[k].night && !(st[k].coming && st[k].coming.armed) && !st[k].last) delete st[k];
  return {alerts, state: st, ilDiff, diag: dg};
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

const FcmAlerts = {FCM_ALERT_CFG, WATCH_CELLS, TYPES, needModels, majority, regionCells, cellVis, cellClouds, migrateCell, comingTrigger, kpCondition, cellCloudFactor, evaluateCells, alertTexts, alertId, runNeed};
root.FcmAlerts = FcmAlerts;
if(typeof module !== 'undefined' && module.exports) module.exports = FcmAlerts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
