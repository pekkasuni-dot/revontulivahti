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
   - tonight: yön suurin ennustettu näkyvyys-% (computeNight, Kp-ennuste), kerran klo 16 ruudun aikavyöhykkeellä,
              kalibroimaton.
   Mallit: vähintään puolet saatavilla olevista (pyöristys ylös) ylittää rajan mallikohtaisella näkyvyys-%:lla.
   Puuttuva malli ei ole nolla (ei lasketa saatavilla oleviin). now/coming: 3 mallia, tonight: 4 (+ IL editoitu).
   Ruudun pilvisyys = hilapisteiden 25. persentiili (selkeämpi osa). Yö = klo 15–07 paikallista. Enintään yksi
   kutakin tyyppiä yössä ruutua kohti. now ja coming vain pimeäaikana (aurinko alle −6° ruudun keskipisteessä).
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
  models: {now: ['harmonie', 'icon_eu', 'ecmwf'], tonight: ['harmonie', 'icon_eu', 'ecmwf', 'edited']},
  maxAgeH: {harmonie: 9, icon_eu: 12, ecmwf: 20, edited: 6},   // vanhempi ajo = malli ei saatavilla
  coming: {bzMax: -5, btMin: 6, kpMargin: 1, leadMin: [30, 45, 60], repeatMin: 30},
};
const TYPES = ['now', 'coming', 'tonight'];

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
  for(const cell of cells){
    const night = C.alertNightKey(now, cell.tz);
    const s = st[cell.key] || {};
    if(night && s.night !== night){ s.night = night; s.sent = {}; }   // uusi yö: tyyppikohtaiset rajat nollautuvat
    if(!night){ if(Object.keys(s).length) st[cell.key] = s; continue; }
    s.sent = s.sent || {};
    const sun = C.sunAltitude(now, cell.center.lat, cell.center.lon), dark = sun < C.SUN_DARK_DEG;
    const p = data.ovation ? C.ovationProbAt(data.ovation.grid, cell.center.lat, cell.center.lon) : null;
    // Nyt
    if(dark && !s.sent.now && p != null){
      const vals = cellVis(C, data.grids, ptsOf, cell, p, now, cfg.models.now), mj = majority(vals, cfg.goodMin);
      if(mj.ok){
        s.sent.now = now.toISOString();
        alerts.push({type: 'now', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: vals,
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null});
      }
    }
    // Tulossa (Bz-laukaisin, siirtymä + toistoväli; tila säilyy tuntemattomassa)
    const trig = comingTrigger(C, data, cell, now, cfg);
    s.coming = s.coming || {};
    if(trig != null){
      const was = s.coming.on;
      s.coming.on = trig;
      if(trig && was === false) s.coming.armed = now.toISOString();   // Bz käänsi: tarkistus alkaa
      if(!trig) s.coming.armed = null;
    }
    if(dark && s.coming.armed && trig && !s.sent.coming && !s.sent.now && p != null){
      const recent = s.coming.last && now.getTime() - Date.parse(s.coming.last) < cfg.coming.repeatMin * 60e3;
      if(!recent){
        const per = {};
        for(const m of cfg.models.now){
          let best = null;
          for(const lm of cfg.coming.leadMin){
            const v = cellVis(C, data.grids, ptsOf, cell, p, new Date(now.getTime() + lm * 60e3), [m])[m];
            if(v != null && (best == null || v > best)) best = v;
          }
          per[m] = best;
        }
        const mj = majority(per, cfg.goodMin);
        if(mj.ok){
          s.sent.coming = now.toISOString(); s.coming.last = now.toISOString();
          alerts.push({type: 'coming', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: per,
            kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null});
        }
      }
    }
    // Tänä yönä: kerran klo 16 jälkeen (ruudun aikavyöhyke)
    const lp = C.localParts(now, cell.tz);
    if(lp.hour >= C.ALERT_NIGHT.tonightHour && s.tonight !== night && night === lp.day){
      const per = {}, nights = {};
      let anyData = false;
      for(const m of cfg.models.tonight){
        const g = data.grids[m];
        if(!g){ per[m] = null; continue; }
        const pts = ptsOf(m, cell);
        const n = C.computeNight(cell.center.lat, cell.center.lon, now, {
          cloudAt: (la, lo, d) => { const v = C.cellCloudPct(g, pts, d, cfg.cloudQ); return v == null ? null : {pct: Math.round(v), factor: C.cloudTransmit(v)}; },
          kpBlockAt: d => data.kp ? C.kpBlockAt(data.kp, d, now.getTime()) : null,
        });
        const ok = n.kind === 'ok' && n.hours.some(h => h.chance != null);
        per[m] = ok ? (n.best ? n.best.max : 0) : null;
        if(ok){ nights[m] = n; anyData = true; }
      }
      if(anyData){
        s.tonight = night;
        const mj = majority(per, cfg.goodMin);
        if(mj.ok){
          const src = Object.keys(per).find(m => per[m] === mj.value && nights[m]);
          const n = nights[src], kps = n.hours.map(h => h.aur && h.aur.kp).filter(x => x != null);
          const run = n.best && n.best.runs[0];
          s.sent.tonight = now.toISOString();
          alerts.push({type: 'tonight', cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, models: per,
            kp: kps.length ? [Math.min(...kps), Math.max(...kps)] : null, best: run ? [run.from, run.to] : null});
        }
      }
    }
    st[cell.key] = s;
  }
  // Vanhat ruudut pois (ei yötä eikä mitään voimassa)
  for(const k of Object.keys(st)) if(!st[k].night && !(st[k].coming && st[k].coming.armed)) delete st[k];
  return {alerts, state: st};
}

// Ilmoituksen tekstit kielelle (alert-texts.js). a = evaluateCells-hälytys.
function alertTexts(T, a, lang){
  const pct = T.pct(lang, a.pct);
  const mk = T.modelsKey(a.ok, a.avail);
  const kpr = a.kp ? T.kpRange(a.kp[0], a.kp[1]) : null;
  const loc = {fi: 'fi-FI', en: 'en-GB', zh: 'zh-CN'}[T.alertLangOf(lang)] || 'en-GB';
  const clock = d => new Intl.DateTimeFormat(loc, {timeZone: a.cell.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(d));
  const vars = {pct, models: mk ? T.text(lang, mk) : '', kp: kpr ? T.text(lang, 'kp', {range: kpr}) : '',
    from: a.best ? clock(a.best[0]) : '', to: a.best ? clock(a.best[1]) : ''};
  return {title: T.text(lang, a.type + '.title', vars), body: T.text(lang, a.type + '.body', vars)};
}
// Hälytyksen tunniste (palaute): tyyppi, ruutu, yö. Ei käyttäjä- eikä sijaintitietoa.
const alertId = a => a.type + '-' + a.cell.key + '-' + a.night;

const FcmAlerts = {FCM_ALERT_CFG, TYPES, needModels, majority, regionCells, cellVis, comingTrigger, evaluateCells, alertTexts, alertId};
root.FcmAlerts = FcmAlerts;
if(typeof module !== 'undefined' && module.exports) module.exports = FcmAlerts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
