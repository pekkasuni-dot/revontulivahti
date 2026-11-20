/* ══════════════════════════════════════════════════════════════
   Revontulihälytykset ruututasolla, vaihe 2 = Aurora Dev -testi (päätökset 34 ja 36, 7.11.2026)
   ──────────────────────────────────────────────────────────────
   Palvelin arvioi jokaisen sijaintiruudun (0,5° × 1°, aurora-core.js ALERT_CELL) alueella REGION ja lähettää
   hälytyksen ruudun FCM-aiheisiin (al1_<fi|en|zh>_<i>_<j>). Palvelin ei tiedä käyttäjiä eikä koordinaatteja.
   Tyypit (Nyt-raja FCM_ALERT_CFG.nowMin = 12 %, päätös 51; pilvisääntö goodMin = VIS_CLASSES.good = 40):
   - now:     nykyhetken näkyvyys-% = OVATION × läpäisy(pilvisyys) × pimeys.
   - coming:  Bz laukaisee tarkistuksen (siirtymä: Bz-ehto ei voimassa edellisellä ajolla -> voimassa; ehto:
              Bz:n 10 min keskiarvo <= −1,2 nT ja etelässä >= 15 min (päätös 52; ennen −5 nT, 20 min, Bt >= 6 nT). Niin kauan kuin ehto pysyy
              voimassa, hälytys lähtee, kun pilvisääntö täyttyy 30–60 min eteenpäin (paras hetkistä +30/+45/+60 min;
              päätös 49, ennen näkyvyys-% >= 40 %). Bz ei ole prosentti eikä kerroin. Ei lähde, jos now on jo lähtenyt samana yönä.
   - Tänä yönä -hälytys POISTETTU (päätös 42, 11.11.2026); Tänä yönä -välilehti sovelluksessa säilyy.
   PÄÄTÖS 49 (12.11.2026): kolme ehtoa, mikä tahansa riittää (yksi ilmoitus, tiheysraja 2 h):
   1. Nyt (trig 'now', tyyppi now): näkyvyys-% >= nowMin (12 %, päätös 51; ennen 40) mallisäännöllä.
   2. Bz (trig 'bz', tyyppi coming): Bz-laukaisin (päätös 52: −1,2 nT, 15 min, ei Bt), siirtymästä; ehtona pimeys +
      pilvisääntö (mallin läpäisykerroin × 100 >= 40, mallisääntö) +30..+60 min, EI enää näkyvyys-% >= 40.
      Päätös 57: lisäksi OVATION ruudussa >= coming.ovationMin (5 %); alle rajan siirtymä jää odottamaan.
   3. Kp-hälytys POISTETTU päätöksellä 52 (15.11.2026); Kp nyt vain diagnostiikkaan. Vanhat trig 'kp' -rivit lokissa säilyvät.
   Bz-ilmoituksen luku = näkyvyys-% (OVATION × läpäisy × pimeys, mallisäännön arvo) kuten Nyt -> voi olla alle 40 %.
   Päätös 42: Nyt ja Tulossa lähettävät SAMAN ilmoituksen (alertTexts); tyyppi kulkee datassa vain palautetta varten.
   PÄÄTÖS 56 (15.11.2026): herkkyysluokat h/n/v (aurora-core.js ALERT_SENS). Hälytys lähtee vain TIUKIMMAN ylittyneen
   luokan aiheeseen (al2_<kieli>_<i>_<j>_<now|bz>_<h|n|v>); puhelin tilaa oman luokkansa ja tiukemmat. Tiheysraja
   ruutu × luokka (tila s.lv = {h, n, v: viimeisin lähetys}): lähetys estetään, jos sama tai tiukempi luokka lähti
   minGapH (2 h) sisällä; voimistuminen h -> n -> v sallitaan. Bz-siirtymä luokittain (s.coming[l] = {on, armed}).
   Tulossa vain Bz-siirtymästä (armed nollautuu lähetyksessä luokille <= lähetetty luokka).
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
  goodMin: C0.VIS_CLASSES.good,       // 40: pilvisääntö (Bz/Kp, läpäisykerroin × 100) - EI Nyt-ehto (päätös 51)
  nowMin: C0.ALERT_SENS.now.h,        // päätös 51/56: Nyt-ehdon herkin raja (Herkkä 12 %) mallisäännöllä; luokat ALERT_SENS.now
  cloudQ: 0.25,                       // ruudun pilvisyys: 25. persentiili
  region: {lat0: 58, lat1: 72, lon0: -1, lon1: 35},   // arvioitavat ruudut (HARMONIEn alue, revontulivyöhyke)
  // Päätös 48: IL editoitu mukaan Nyt-hälytykseen; päätös 49 täsmennys 12.11.: samat 4 mallia Bz- ja Kp-ehdolle.
  models: {now: ['harmonie', 'icon_eu', 'ecmwf', 'edited']},
  minGapH: 2,                         // päätös 42/56: ruutu × luokka: ei lähetystä, jos sama tai tiukempi luokka lähti 2 h sisällä
  maxAgeH: {harmonie: 9, icon_eu: 12, ecmwf: 20, edited: 6},   // vanhempi ajo = malli ei saatavilla
  // Päätös 52 (15.11.2026): Bz-ehto = 10 min liukuva keskiarvo <= bzMax JA Bz etelässä (< 0) yhtäjaksoisesti >= southMin;
  // Bt-ehto poistettu (Bt vain lokiin). Vanha ehto (päätös 49) lokiin vertailuun: coming.old.
  // Päätös 56: herkin Bz-raja = ALERT_SENS.bz.h (−1,0 nT, ennen −1,2), luokat ALERT_SENS.bz; etelä 15 min kaikille.
  // Päätös 57 (16.11.2026): ovationMin = OVATION-vähimmäisarvo (%) ruudussa Bz-hälytykselle, sama kaikille luokille. Mittari
  // = ovationProbAt ruudun keskipisteessä ennen pilvi- ja pimeyskerrointa (sama luku kuin Nyt-ehdossa). Estetty ruutu odottaa
  // (siirtymä ei kulu) ja saa hälytyksen, kun OVATION nousee rajan yli Bz-ehdon ollessa voimassa. Ei koske Nyt-ehtoa.
  coming: {bzMax: C0.ALERT_SENS.bz.h, southMin: C0.ALERT_SENS.southMin, ovationMin: 5, leadMin: [30, 45, 60], repeatMin: 30,
    old: {bzMax: -5, southMin: 20, btMin: 6}},
  // Päätös 52: Kp-hälytys (päätös 49) POISTETTU; Kp nyt kirjataan vain diagnostiikkaan.
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
// Päätös 56: s.last (ruutu) -> s.lv.v: vanha al1-aihe tavoitti KAIKKI ruudun tilaajat kuten nyt Varma-aihe, joten se
// estää kaikki luokat 2 h (ei tuplailmoitusta siirtymässä). s.coming {on, armed} (raja −1,2 nT ~ Herkkä) -> s.coming.h;
// luokat n ja v alkavat tuntemattomasta (ei aseistusta ennen ensimmäistä siirtymää).
function migrateCell(s){
  if(s.sent){ const t = [s.last, s.sent.now, s.sent.coming].filter(Boolean).map(Date.parse).filter(Number.isFinite);
    if(t.length) s.last = new Date(Math.max(...t)).toISOString(); }
  delete s.sent; delete s.tonight;
  delete s.kpc;   // päätös 52: Kp-hälytyksen tila (päätös 49) pois
  if(s.last){ s.lv = s.lv || {};
    if(!s.lv.v || Date.parse(s.last) > Date.parse(s.lv.v)) s.lv.v = s.last; }
  delete s.last;
  if(s.coming && ('on' in s.coming || 'armed' in s.coming)) s.coming = {h: {on: s.coming.on, armed: s.coming.armed || null}};
  return s;
}
// Luokittainen tiheysraja (päätös 56): lähetys luokalla lv estetään, jos samaan ruutuun on lähtenyt saman tai
// tiukemman luokan hälytys gapMs sisällä. Voimistuminen (h -> n -> v) sallitaan.
function levelQuiet(C, s, lv, nowMs, gapMs){
  for(const l of C.ALERT_SENS.levels){
    if(!C.levelAtLeast(l, lv) || !(s.lv && s.lv[l])) continue;
    if(nowMs - Date.parse(s.lv[l]) < gapMs) return true;
  }
  return false;
}
// Lähetys luokalla lv: kirjataan luokan aika; saman ruudun Bz-aseistus kuluu luokille <= lv (he saivat ilmoituksen).
function markSent(C, s, lv, now){
  s.lv = s.lv || {}; s.lv[lv] = now.toISOString();
  for(const l of C.ALERT_SENS.levels) if(!C.levelAtLeast(l, lv) || l === lv) if(s.coming && s.coming[l]) s.coming[l].armed = null;
}

const BZ_EPS = 1e-9;
// Tulossa-ehto (Bz-laukaisin). null = tuntematon (Bz ei tuore). Päätös 52: oma ehto (ei enää sovelluksen BZ.hint),
// 10 min liukuva Bz <= coming.bzMax ja etelässä yhtäjaksoisesti >= coming.southMin; Bt ei ehto. Ei riipu ruudusta.
function comingTrigger(C, data, cell, now, cfg = FCM_ALERT_CFG){
  const hint = C.bzHint(data.mag, now.getTime());
  if(!hint.trend || !hint.fresh) return null;
  const K = cfg.coming;
  // EPS: liukuluvun keskiarvo (esim. −1,1999999999999997) ei saa pudottaa tasan rajalla olevaa arvoa pois.
  return hint.trend.mean <= K.bzMax + BZ_EPS && hint.trend.southMin >= K.southMin;
}
// Bz-luokka (päätös 56): tiukin luokka, jonka raja 10 min keskiarvo alittaa, kun etelässä >= southMin. null = tuntematon
// (ei tuoretta Bz:aa), '' = ei mitään luokkaa.
function comingLevel(C, data, now, cfg = FCM_ALERT_CFG){
  const hint = C.bzHint(data.mag, now.getTime());
  if(!hint.trend || !hint.fresh) return null;
  if(!(hint.trend.southMin >= cfg.coming.southMin)) return '';
  return C.bzLevel(hint.trend.mean) || '';
}
// Vanha Bz-ehto (päätös 49: -5 nT, 20 min, Bt >= 6 nT) vain lokiin vertailuun. null = tuntematon.
function comingTriggerOld(C, data, now, cfg = FCM_ALERT_CFG){
  const hint = C.bzHint(data.mag, now.getTime());
  if(!hint.trend || !hint.fresh) return null;
  const bt = hint.btRow && now.getTime() - hint.btRow.t <= C.BZ.staleMin * 60e3 ? hint.btRow.bt : null;
  if(bt == null) return null;
  const O = cfg.coming.old;
  return hint.trend.mean <= O.bzMax + BZ_EPS && hint.trend.southMin >= O.southMin && bt >= O.btMin;
}
// Seurattavat ruudut (päätös 49 täsmennys): ajokohtaiset arvot lokiin, vaikka hälytystä ei lähde. Vain ruututunnisteet.
// Oulu 310_205, Rovaniemi (keskusta) 313_205, Kilpisjärvi 318_200, Utsjoki 319_207.
const WATCH_CELLS = ['310_205', '313_205', '318_200', '319_207'];
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
  // Päätös 63 täydennys (20.11.2026): bzm = Bz:n 10 min liukuva keskiarvo (sama luku, jota Bz-ehto käyttää, bzTrend.mean);
  // raportti näyttää ja korostaa sen. bz (minuuttiarvo) jää dataan vanhojen versioiden takia.
  const sw = {bz: hint && hint.fresh && hint.magRow ? r1(hint.magRow.bz) : null,
    bzm: hint && hint.fresh && hint.trend ? r1(hint.trend.mean) : null,
    bt: hint && hint.btRow && now.getTime() - hint.btRow.t <= C.BZ.staleMin * 60e3 ? r1(hint.btRow.bt) : null,
    kp: kpNow ? r1(kpNow.kp) : null};
  // Sääraportti: arvot lähetyshetkeltä, pilvisyys = saatavilla olevien mallien mediaani hetkellä at.
  const report = (cell, mj, at, models, trig) => ({pct: mj.value, at: at.toISOString(), trig,
    cloud: (v => v == null ? null : Math.round(v))(median(Object.values(cellClouds(C, data.grids, ptsOf, cell, at, models)))),
    ok: mj.count, avail: mj.avail, ...sw});
  const gapMs = cfg.minGapH * 3600e3;
  // Päätös 49: Bz- ja Kp-ehto eivät riipu ruudusta -> lasketaan kerran ajossa.
  const bzTrig = data.mag ? comingTrigger(C, data, null, now, cfg) : null;
  const bzLv = data.mag ? comingLevel(C, data, now, cfg) : null;   // päätös 56: luokka (null tuntematon, '' ei mitään)
  const dg = {kp: kpNow ? r1(kpNow.kp) : null, bz: bzTrig, bzLv, bzOld: data.mag ? comingTriggerOld(C, data, now, cfg) : null,
    dark: 0, cloudPass: 0, sent: {now: 0, bz: 0}, sentLv: {h: 0, n: 0, v: 0}, watch: {},
    // Loki 13.11.: Bz-ehdon osat rajoineen (vain luku) ja Nyt-ehdon paras arvo koko alueelta.
    bzv: hint ? {mean: hint.trend ? r1(hint.trend.mean) : null, southMin: hint.trend ? hint.trend.southMin : null,
      bt: hint.btRow ? r1(hint.btRow.bt) : null, fresh: !!hint.fresh,
      limits: {bzMax: cfg.coming.bzMax, southMin: cfg.coming.southMin}, old: cfg.coming.old} : null,
    nowMax: null, nowNear: 0,
    // Päätös 57: OVATION-raja; blocked = ruudut, joissa Bz-hälytys olisi lähtenyt (pimeä + pilvisääntö), mutta OVATION < min.
    bzOvationMin: {min: cfg.coming.ovationMin, blocked: 0}};
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
    const quiet = levelQuiet(C, s, 'h', now.getTime(), gapMs);   // herkimmälläkin luokalla tiheysraja (loki/ilDiff)
    let sent = false;
    // Nyt
    const vals = dark && p != null ? cellVis(C, data.grids, ptsOf, cell, p, now, cfg.models.now) : null;
    if(vals && vals.edited != null){
      const rest = {}; for(const m of others) rest[m] = vals[m];
      const m3 = majority(rest, cfg.nowMin), ilOk = vals.edited >= cfg.nowMin;
      if(m3.avail && ilOk !== m3.ok){
        const mj4 = majority(vals, cfg.nowMin), cl = cellClouds(C, data.grids, ptsOf, cell, now, cfg.models.now);
        ilDiff.push({cell: cell.key, il: vals.edited, ilCloud: cl.edited == null ? null : Math.round(cl.edited), vis: vals,
          cloud: Object.fromEntries(Object.entries(cl).map(([k, v]) => [k, v == null ? null : Math.round(v)])),
          p: Math.round(p), ok3: m3.ok, ok4: mj4.ok, count: mj4.count, avail: mj4.avail, quiet: !!quiet});
      }
    }
    if(vals){   // Nyt-ehdon paras arvo (mallisäännön arvo) koko alueelta, myös tiheysrajan aikana
      const mx = majority(vals, cfg.nowMin);   // 15.11.: mallimäärä Nyt-rajalla (12 %), ei pilvisäännön 40:llä; arvo sama
      if(mx.value != null){
        if(mx.value >= cfg.goodMin - 10) dg.nowNear++;
        if(!dg.nowMax || mx.value > dg.nowMax.value)
          dg.nowMax = {value: mx.value, cell: cell.key, count: mx.count, avail: mx.avail, ovation: r0(p)};
      }
    }
    if(dark && p != null){
      const mj = majority(vals, cfg.nowMin);   // päätös 51: herkin Nyt-raja 12 %
      const lv = mj.ok ? C.nowLevel(mj.value) : null;   // päätös 56: tiukin ylittynyt luokka
      if(lv && !levelQuiet(C, s, lv, now.getTime(), gapMs)){
        s.coming = s.coming || {};
        markSent(C, s, lv, now); sent = true; dg.sent.now++; dg.sentLv[lv]++;
        alerts.push({type: 'now', trig: 'now', lv, cell, night, pct: mj.value, ok: mj.count, avail: mj.avail, ov: r0(p), models: vals,
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null, report: {...report(cell, mj, now, cfg.models.now, 'now'), lv}});
      }
    }
    // Pilvisääntö nyt (Kp-ehto ja diagnostiikka): 4 mallia kuten Nyt.
    const cfNow = dark ? cellCloudFactor(C, data.grids, ptsOf, cell, now, cfg.models.now) : null;
    const cloudNow = cfNow ? majority(cfNow, cfg.goodMin) : null;
    if(dark){ dg.dark++; if(cloudNow.ok) dg.cloudPass++; }
    // Bz / Tulossa (siirtymä; tila säilyy tuntemattomassa). Lähetys kuluttaa siirtymän (armed = null).
    // Päätös 56: siirtymä luokittain (s.coming[l] = {on, armed}); luokka l on päällä, kun Bz-luokka on vähintään l.
    s.coming = s.coming || {};
    if(bzLv != null) for(const l of C.ALERT_SENS.levels){
      const c = s.coming[l] || (s.coming[l] = {}), on = !!bzLv && C.levelAtLeast(bzLv, l), was = c.on;
      c.on = on;
      if(on && was === false) c.armed = now.toISOString();   // Bz käänsi tällä luokalla: tarkistus alkaa
      if(!on) c.armed = null;
    }
    // Tiukin aseistettu ja yhä voimassa oleva luokka, jota tiheysraja ei estä.
    let bzSendLv = null;
    for(const l of C.ALERT_SENS.levels) if(s.coming[l] && s.coming[l].armed && s.coming[l].on) bzSendLv = l;
    if(bzSendLv && levelQuiet(C, s, bzSendLv, now.getTime(), gapMs)) bzSendLv = null;
    if(dark && !sent && bzSendLv && p != null){
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
      if(cj.ok && !(p >= cfg.coming.ovationMin)) dg.bzOvationMin.blocked++;   // päätös 57: ei lähetystä, siirtymä ei kulu
      else if(cj.ok){
        markSent(C, s, bzSendLv, now); sent = true; dg.sent.bz++; dg.sentLv[bzSendLv]++;
        const lead = Object.keys(per).find(m => per[m] === mj.value) || comingModels[0];
        alerts.push({type: 'coming', trig: 'bz', lv: bzSendLv, cell, night, pct: mj.value, ok: cj.count, avail: cj.avail, ov: r0(p), models: per, clouds: rObj(cf),
          kp: kpNow ? [kpNow.kp, kpNow.kp] : null, best: null,
          report: {...report(cell, mj, new Date(now.getTime() + (at[lead] || cfg.coming.leadMin[0]) * 60e3), comingModels, 'bz'),
            ok: cj.count, avail: cj.avail, lv: bzSendLv, south: hint && hint.trend ? hint.trend.southMin : null}});
      }
    }
    if(WATCH_CELLS.includes(cell.key)){
      const mjN = vals ? majority(vals, cfg.nowMin) : null;
      dg.watch[cell.key] = {dark, df: Math.round(C.darknessFactor(sun) * 100) / 100, ovation: r0(p), quiet: !!quiet,
        vis: rObj(vals), cloud: dark ? rObj(cellClouds(C, data.grids, ptsOf, cell, now, cfg.models.now)) : null, cf: rObj(cfNow),
        now: mjN ? {ok: mjN.ok, count: mjN.count, avail: mjN.avail, value: mjN.value} : null,
        cloudRule: cloudNow ? {ok: cloudNow.ok, count: cloudNow.count, avail: cloudNow.avail} : null,
        bzArmed: C.ALERT_SENS.levels.filter(l => s.coming[l] && s.coming[l].armed).join('') || null,
        sent: sent ? alerts[alerts.length - 1].trig + ':' + alerts[alerts.length - 1].lv : null};
    }
    st[cell.key] = s;
  }
  // Vanhat ruudut pois (ei yötä eikä mitään voimassa)
  const anyArmed = s => !!(s.coming && C.ALERT_SENS.levels.some(l => s.coming[l] && s.coming[l].armed));
  const anyLv = s => !!(s.lv && Object.values(s.lv).some(Boolean));
  for(const k of Object.keys(st)) if(!st[k].night && !anyArmed(st[k]) && !anyLv(st[k])) delete st[k];
  return {alerts, state: st, ilDiff, diag: dg};
}

// Ilmoituksen tekstit kielelle (alert-texts.js). Päätös 42: sama teksti Nyt ja Tulossa (yleinen + näkyvyys-%).
function alertTexts(T, a, lang){
  const vars = {pct: T.pct(lang, a.pct)};
  // 18.11.2026: Bz-ennakkohälytys (coming) -> otsikon loppuun "pian" (title.coming); Nyt ennallaan.
  return {title: T.text(lang, a.type === 'coming' ? 'title.coming' : 'title', vars), body: T.text(lang, 'body', vars)};
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

const FcmAlerts = {FCM_ALERT_CFG, WATCH_CELLS, TYPES, needModels, majority, regionCells, cellVis, cellClouds, migrateCell, levelQuiet, comingTrigger, comingLevel, comingTriggerOld, cellCloudFactor, evaluateCells, alertTexts, alertId, runNeed};
root.FcmAlerts = FcmAlerts;
if(typeof module !== 'undefined' && module.exports) module.exports = FcmAlerts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
