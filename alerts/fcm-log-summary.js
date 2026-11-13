/* Hälytysajon lokin yhteenveto (2026-11-13): kuinka lähellä kukin ehto on käynyt rajaansa, yö kerrallaan.
   Lähde: tila-haaran halytys-fcm-tila logs/YYYY-MM-DD.jsonl (scripts/alert-fcm.mjs). Puhdas funktio -> testattavissa.
   Yö = paikallinen ilta (Europe/Helsinki) klo 12-12: ajo ennen klo 12 kuuluu edelliseen yöhön.
   Bz-osat (diag.bzv) ja Nyt-maksimi (diag.nowMax) kirjataan 13.11.2026 alkaen; vanhemmissa riveissä "–". */
(function(root){
'use strict';
const nightOf = iso => { const d = new Date(Date.parse(iso) - 12 * 3600e3);
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d); };
const minN = (a, b) => b == null ? a : a == null ? b : Math.min(a, b);
const maxN = (a, b) => b == null ? a : a == null ? b : Math.max(a, b);

function summarize(records, {kpMin = 2.5, goodMin = 40, near = 30} = {}){
  const nights = new Map();
  for(const r of records){
    if(!r || !r.run) continue;
    const k = nightOf(r.run), d = r.diag || null;
    if(!nights.has(k)) nights.set(k, {night: k, runs: 0, diagRuns: 0, bzRuns: 0, bzMean: null, southMax: null, btMax: null,
      bzOk: 0, southOk: 0, btOk: 0, bzAll: 0, kpMax: null, kpOk: 0, nowMax: null, nowRuns: 0, nowOk: 0, nowNear: 0,
      sent: {now: 0, bz: 0, kp: 0}, errors: 0, limits: null});
    const n = nights.get(k);
    n.runs++; if(r.errors && r.errors.length) n.errors++;
    for(const a of r.alerts || []) if(a.trig && n.sent[a.trig] != null) n.sent[a.trig]++;
    if(!d) continue;
    n.diagRuns++;
    if(d.kp != null){ n.kpMax = maxN(n.kpMax, d.kp); if(d.kp >= kpMin) n.kpOk++; }
    const b = d.bzv;
    if(b && b.fresh && b.mean != null){
      const L = b.limits; n.limits = L; n.bzRuns++;
      n.bzMean = minN(n.bzMean, b.mean); n.southMax = maxN(n.southMax, b.southMin); n.btMax = maxN(n.btMax, b.bt);
      const ok1 = b.mean <= L.bzMax, ok2 = b.southMin >= L.southMin, ok3 = b.bt != null && b.bt >= L.btMin;
      n.bzOk += ok1; n.southOk += ok2; n.btOk += ok3; n.bzAll += ok1 && ok2 && ok3;
    }
    if(d.nowMax){
      n.nowRuns++;
      if(!n.nowMax || d.nowMax.value > n.nowMax.value) n.nowMax = {...d.nowMax, run: r.run};
      if(d.nowMax.value >= goodMin) n.nowOk++;
      if(d.nowMax.value >= near) n.nowNear++;
    }
  }
  return [...nights.values()].sort((a, b) => a.night < b.night ? -1 : 1);
}

const f = (v, u = '') => v == null ? '–' : (Math.round(v * 10) / 10).toString().replace('.', ',') + u;
function toMarkdown(rows, {kpMin = 2.5, goodMin = 40} = {}){
  const L = (rows.find(r => r.limits) || {}).limits || {bzMax: -5, southMin: 20, btMin: 6};
  const out = ['# Hälytysehdot: kuinka lähellä rajoja', '',
    `Rajat: Bz 10 min keskiarvo <= ${L.bzMax} nT, etelässä >= ${L.southMin} min, Bt >= ${L.btMin} nT (kaikki yhtä aikaa = Bz-ehto); ` +
    `Kp nyt >= ${f(kpMin)}; Nyt >= ${goodMin} % (mallisääntö). Yö = Suomen aikaa klo 12-12. Luvut: paras lukema / ajot, joissa raja täyttyi.`, '',
    '| Yö | Ajoja | Bz pienin | Etelässä pisin | Bt suurin | Bz-osat täyttyi (Bz/aika/Bt/kaikki) | Kp suurin (≥ raja) | Nyt paras (ruutu) | Nyt ≥ 40 / ≥ 30 | Hälytykset Nyt/Bz/Kp | Virheajoja |',
    '|---|---|---|---|---|---|---|---|---|---|---|'];
  for(const n of rows){
    const bz = n.bzRuns ? `${n.bzOk}/${n.southOk}/${n.btOk}/${n.bzAll} (${n.bzRuns})` : '–';
    out.push(`| ${n.night} | ${n.runs} | ${f(n.bzMean, ' nT')} | ${f(n.southMax, ' min')} | ${f(n.btMax, ' nT')} | ${bz} | ${f(n.kpMax)} (${n.kpOk}) | ` +
      `${n.nowMax ? n.nowMax.value + ' % (' + n.nowMax.cell + ')' : '–'} | ${n.nowRuns ? n.nowOk + ' / ' + n.nowNear : '–'} | ` +
      `${n.sent.now}/${n.sent.bz}/${n.sent.kp} | ${n.errors} |`);
  }
  return out.join('\n') + '\n';
}

const api = {nightOf, summarize, toMarkdown};
root.FcmLogSummary = api;
if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
