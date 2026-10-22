/* ══════════════════════════════════════════════════════════════
   REVONTULIHÄLYTYKSET (2026-10, vaihe 1: kuivaharjoitus, ei ilmoituksia)
   ──────────────────────────────────────────────────────────────
   Päättelee kolme hälytystyyppiä paikalle. Kaikki laskenta (näkyvyysindeksi,
   pilvisyys, pimeys, Bz-trendi ja Tulossa-vihje, Kp, Tänä yönä) tulee
   aurora-core.js:stä - SAMAT funktiot kuin sovelluksessa, ei kopioita.
   Ei Node- eikä selainriippuvuuksia: sama moduuli toimii GitHub Actionsissa
   (scripts/alert-dryrun.mjs) ja myöhemmin Cloudflare Workerissa (tuotanto).

   Tyypit:
   - now      "Revontulia nyt": näkyvyysindeksi (Nyt-välilehden luku) >= raja.
   - coming   "Tulossa": Tulossa-vihje päällä (Bz etelään riittävän pitkään,
              sama logiikka kuin sovelluksessa) JA Bz <= coming.bzMax JA
              Bt >= coming.btMin JA paikka ulottuvilla (Kp nyt + kpMargin >=
              paikan Kp-raja, kpRequired) JA paikassa pimeää (aurinko alle
              SUN_DARK_DEG) JA pilvisyys alle rajan. Lähtee vain SIIRTYMÄSTÄ:
              ehto täyttyy nyt mutta ei edellisellä ajolla.
   - tonight  "Tänä yönä": kerran päivässä klo TONIGHT_HOUR paikallista aikaa,
              jos Tänä yönä -välilehden paras arvo (yön suurin näkyvyys) >= raja.
   Toiston esto (Revontulia nyt): sama paikka + taso aikaisintaan repeatMin edellisestä
   JA vasta kun arvo on välillä laskenut rajan alle (uudelleenviritys).
   Tulossa: siirtymä (ks. yllä) + repeatMin. Tänä yönä: yksi tarkistus vuorokaudessa (ei uudelleenviritystä tarvita).
   Säännöt ja perustelut: MUISTIO-halytykset.md.
   ══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

/* ── Säätövakiot ── */
const ALERT_CFG = {
  // Herkkyystasot: pienempi raja = enemmän hälytyksiä.
  levels: {
    herkka:   {nowIdxMin: 20, comingCloudMax: 80, tonightMin: 20},
    normaali: {nowIdxMin: 35, comingCloudMax: 60, tonightMin: 40},
    varma:    {nowIdxMin: 55, comingCloudMax: 40, tonightMin: 60},
  },
  // Tulossa (kaikille tasoille yhteiset): Bz:n liukuva keskiarvo vähintään
  // näin paljon etelään (nT), Bt vähintään (nT), ja paikka ulottuvilla:
  // Kp nyt + kpMargin >= paikan Kp-raja (aurora-core.js kpRequired).
  coming: {bzMax: -5, btMin: 6, kpMargin: 1},
  repeatMin: 30,        // sama tyyppi samalle paikalle aikaisintaan näin monen min päästä
  tonightHour: 15,      // Tänä yönä -tarkistus tästä tunnista alkaen (paikallista aikaa)
};
// Lähteet (samat kuin sovelluksessa). Pilvet: valmis ECMWF-hila GitHub Pagesilta
// (sovelluksen oletusmalli, 0-48 h, kattaa kaikki testipaikat).
const SOURCES = {
  ovation: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
  kpObs: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  kpForecast: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
  kpRt: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  mag: ['https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',
        'https://services.swpc.noaa.gov/products/solar-wind/mag-1-day.json'],
  clouds: 'https://pekkasuni-dot.github.io/revontulivahti/data/clouds-ecmwf.json',
};
const LEVELS = Object.keys(ALERT_CFG.levels);
const TYPES = ['now', 'coming', 'tonight'];
const TYPE_NAMES = {now: 'Revontulia nyt', coming: 'Tulossa', tonight: 'Tänä yönä'};
const LEVEL_NAMES = {herkka: 'herkkä', normaali: 'normaali', varma: 'varma'};

// Paikallinen päivä ja tunti IANA-aikavyöhykkeellä (Intl, toimii Nodessa ja Workerissa).
function localParts(date, tz){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', hourCycle: 'h23'}).formatToParts(date).map(x => [x.type, x.value]));
  return {day: p.year + '-' + p.month + '-' + p.day, hour: +p.hour};
}

// Lähtödata (kaikki aurora-core.js:n muodossa):
//   data = {ovation: parseOvation(), cloudGrid: buildCloudGridFull(),
//           mag: swRows(.., SW_FIELDS.mag), kp: {rt, obsRows, obs, forecast}}
// Palauttaa paikan mittarit nykyhetkellä (+ Tänä yönä, jos withNight).
function placeMetrics(C, data, place, now, withNight){
  const {lat, lon} = place;
  const g = data.cloudGrid, getStep = g ? (i => C.resolveStep(g, i)) : null;
  const sunAlt = C.sunAltitude(now, lat, lon);
  const df = C.darknessFactor(sunAlt);
  const aurora = data.ovation ? C.ovationProbAt(data.ovation.grid, lat, lon) : null;
  const cloud = g ? C.cloudPct(g, getStep, lat, lon, now) : null;
  const cf = g ? C.cloudVisibilityFactor(g, getStep, lat, lon, now) : null;
  // Sama kaava kuin Nyt-välilehti (renderNow): ilman OVATIONia ei indeksiä.
  const idx = aurora == null ? null : C.visibilityIndex(aurora, cf, df);
  const hint = C.bzHint(data.mag, now.getTime());
  const kpNow = data.kp ? C.kpNowInfo(data.kp, now.getTime()) : null;
  const mlat = C.magLat(lat, lon);
  const m = {
    idx, aurora: aurora == null ? null : Math.round(aurora), cloud,
    cf: cf == null ? null : +cf.toFixed(3), dark: +df.toFixed(3), sunAlt: +sunAlt.toFixed(1),
    isDark: sunAlt < C.SUN_DARK_DEG,
    bz: hint.trend ? {mean: +hint.trend.mean.toFixed(1), southMin: hint.trend.southMin,
      bt: hint.btRow ? hint.btRow.bt : null, fresh: hint.fresh, hint: hint.show} : null,
    kp: kpNow ? kpNow.kp : null,
    mlat: +mlat.toFixed(1), kpReq: +C.kpRequired(mlat).toFixed(1),
  };
  if(withNight){
    // Tänä yönä: sama computeNight kuin sovelluksessa. Pilvet hilasta (kaikki
    // askeleet ladattu), Kp kuluvalle jaksolle nyt-arvo, muille ennuste.
    const n = C.computeNight(lat, lon, now, {
      cloudAt: (la, lo, d) => g ? C.hourCloud(g, getStep, i => g.steps.has(i), la, lo, d) : undefined,
      kpBlockAt: d => data.kp ? C.kpBlockAt(data.kp, d, now.getTime()) : null,
    });
    m.night = n.kind !== 'ok' ? {kind: n.kind, max: null}
      : {kind: 'ok', max: n.best ? n.best.max : (n.hours.every(h => h.chance == null) ? null : 0), from: n.start.toISOString(), to: n.end.toISOString(),
         best: n.best ? n.best.runs.map(r => [r.from.toISOString(), r.to.toISOString()]) : [],
         hoursNoData: n.hours.filter(h => h.chance == null).length};
  }
  return m;
}

// Yksi tyyppi + taso: ehto ja syy. value = verrattu luku, limit = raja.
function condition(type, m, L, cfg = ALERT_CFG){
  if(type === 'now'){
    if(m.idx == null) return {on: false, reason: m.aurora == null ? 'ei OVATION-dataa' : 'ei pilvidataa (mallin alueen ulkopuolella tai puuttuu)'};
    return {on: m.idx >= L.nowIdxMin, value: m.idx, limit: L.nowIdxMin,
      reason: 'näkyvyys ' + m.idx + ' % ' + (m.idx >= L.nowIdxMin ? '>=' : '<') + ' ' + L.nowIdxMin + ' %'};
  }
  if(type === 'coming'){
    if(!m.bz) return {on: false, reason: 'ei Bz-dataa'};
    if(!m.bz.hint) return {on: false, reason: 'ei Tulossa-vihjettä (Bz ' + m.bz.mean + ' nT, etelään ' + m.bz.southMin + ' min' + (m.bz.fresh ? '' : ', data vanhaa') + ')'};
    const K = cfg.coming;
    if(m.bz.mean > K.bzMax) return {on: false, reason: 'Bz ' + m.bz.mean + ' nT > ' + K.bzMax + ' nT'};
    if(m.bz.bt == null || m.bz.bt < K.btMin) return {on: false, reason: 'Bt ' + (m.bz.bt ?? '–') + ' nT < ' + K.btMin + ' nT'};
    if(m.kp == null) return {on: false, reason: 'ei Kp-dataa'};
    const kpTxt = 'Kp ' + m.kp.toFixed(1) + ' + ' + K.kpMargin;
    if(m.kp + K.kpMargin < m.kpReq) return {on: false, reason: 'ei ulottuvilla (' + kpTxt + ' < paikan Kp-raja ' + m.kpReq + ')'};
    if(!m.isDark) return {on: false, reason: 'ei pimeää (aurinko ' + m.sunAlt + '°)'};
    if(m.cloud == null) return {on: false, reason: 'ei pilvidataa'};
    const ok = m.cloud < L.comingCloudMax;
    return {on: ok, value: m.cloud, limit: L.comingCloudMax,
      reason: 'Bz ' + m.bz.mean + ' nT etelään ' + m.bz.southMin + ' min, Bt ' + m.bz.bt + ' nT, ' + kpTxt + ' >= Kp-raja ' + m.kpReq
        + ', pilvisyys ' + m.cloud + ' % ' + (ok ? '<' : '>=') + ' ' + L.comingCloudMax + ' %'};
  }
  // tonight
  if(!m.night) return {on: false, reason: 'ei tarkistusaika'};
  if(m.night.kind !== 'ok') return {on: false, reason: 'ei pimeää yötä'};
  if(m.night.max == null) return {on: false, reason: 'ei dataa yön tunneille (yritetään seuraavassa ajossa)'};
  const ok = m.night.max >= L.tonightMin;
  return {on: ok, value: m.night.max, limit: L.tonightMin,
    reason: 'yön paras ' + m.night.max + ' % ' + (ok ? '>=' : '<') + ' ' + L.tonightMin + ' %'};
}

// Päätös toiston eston kanssa. prev = edellinen tila (paikka -> tyyppi -> taso ->
// {armed, last}); palauttaa {alerts, state}. Ei muuta prev-oliota.
function decide(place, m, prev, now, cfg = ALERT_CFG){
  const t = now.getTime(), st = JSON.parse(JSON.stringify(prev || {})), alerts = [];
  const lp = localParts(now, place.tz);
  const ps = st[place.id] = st[place.id] || {};
  for(const type of TYPES){
    const ts = ps[type] = ps[type] || {};
    for(const lvl of LEVELS){
      const s = ts[lvl] = ts[lvl] || {armed: true, last: 0};
      const c = condition(type, m, cfg.levels[lvl], cfg);
      let fire = false, why = c.reason;
      if(type === 'coming'){
        // Siirtymä: ehto nyt päällä, edellisellä ajolla ei. Tuntematon
        // edellinen tila (ensimmäinen ajo) ei hälytä -> pitkään jatkunut
        // tila ei laukaise hälytystä käyttöönotossa.
        const was = s.prevOn;
        s.prevOn = !!c.on;
        if(c.on){
          if(was !== false) why += was ? ' - ei siirtymää (täyttyi jo edellisellä ajolla)' : ' - ei siirtymää (edellinen ajo tuntematon)';
          else if(t - s.last < cfg.repeatMin * 60e3) why += ' - estetty: alle ' + cfg.repeatMin + ' min edellisestä';
          else { fire = true; s.last = t; }
        }
      } else if(type === 'tonight'){
        if(m.night){
          if(c.on && s.day !== lp.day){ fire = true; s.day = lp.day; s.last = t; }
          else if(c.on) why += ' (jo hälytetty tänään)';
        }
      } else if(!c.on){
        s.armed = true;   // arvo laski rajan alle -> seuraava ylitys saa hälyttää
      } else if(!s.armed){
        why += ' - estetty: ei ole käynyt rajan alla edellisen hälytyksen jälkeen';
      } else if(t - s.last < cfg.repeatMin * 60e3){
        why += ' - estetty: alle ' + cfg.repeatMin + ' min edellisestä';
      } else {
        fire = true; s.armed = false; s.last = t;
      }
      alerts.push({type, level: lvl, on: !!c.on, fire, reason: why});
    }
  }
  return {alerts, state: st};
}

// Tänä yönä -tarkistus erääntyy kerran päivässä tonightHour:sta alkaen.
function tonightDue(place, prev, now, cfg = ALERT_CFG){
  const lp = localParts(now, place.tz);
  const day = prev && prev[place.id] && prev[place.id]._tonightChecked;
  return lp.hour >= cfg.tonightHour && day !== lp.day;
}
function markTonightChecked(place, st, now){
  (st[place.id] = st[place.id] || {})._tonightChecked = localParts(now, place.tz).day;
}

// Koko ajo: kaikki paikat. Palauttaa {places: [{..., metrics, alerts}], state}.
function evaluateAll(C, data, places, prevState, now, cfg = ALERT_CFG){
  let st = prevState || {};
  const out = [];
  for(const place of places){
    const due = tonightDue(place, st, now, cfg);
    const m = placeMetrics(C, data, place, now, due);
    const r = decide(place, m, st, now, cfg);
    st = r.state;
    // Ilman yön dataa tarkistus yritetään uudelleen seuraavassa ajossa.
    if(due && !(m.night && m.night.kind === 'ok' && m.night.max == null)) markTonightChecked(place, st, now);
    out.push({id: place.id, name: place.name, metrics: m, alerts: r.alerts});
  }
  return {places: out, state: st};
}

const AuroraAlerts = {ALERT_CFG, SOURCES, LEVELS, TYPES, TYPE_NAMES, LEVEL_NAMES, localParts,
  placeMetrics, condition, decide, tonightDue, evaluateAll};
root.AuroraAlerts = AuroraAlerts;
if(typeof module !== 'undefined' && module.exports) module.exports = AuroraAlerts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
