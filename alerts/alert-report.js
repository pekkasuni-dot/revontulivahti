/* Revontulihälytysten kuivaharjoituksen LOPPURAPORTTI (2026-10).
   Lokirivit (scripts/alert-dryrun.mjs) + omat havainnot (HAVAINNOT.md) ->
   Markdown: koko jakso, yöt, hälytysmäärät, vertailu havaintoihin ja
   EHDOTUKSET rajoihin (vain tekstinä - koodia ei muuteta). Kirjoitetaan
   kuivaharjoituksen viimeisenä päivänä (väliaikainen) ja ensimmäisessä
   ajossa päättymisen jälkeen (lopullinen). Ei Node-riippuvuuksia. */
(function(root){
'use strict';
const S = root.AlertSummary || (typeof require !== 'undefined' ? require('./alert-summary.js') : null);
const {TYPE, LVL, LVL_ORDER, nightKey} = S;
const TZ = 'Europe/Helsinki';
const FINAL_MARK = '<!-- lopullinen -->';
const fmt = (d, o) => new Intl.DateTimeFormat('fi-FI', {timeZone: TZ, ...o}).format(d);
const dayLbl = k => { const [y, m, d] = k.split('-').map(Number); return fmt(new Date(Date.UTC(y, m - 1, d, 12)), {weekday: 'short', day: 'numeric', month: 'numeric'}); };
const nf = (x, dec = 1) => x == null || !isFinite(x) ? '–' : x.toFixed(dec).replace('.', ',');
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const norm = x => String(x || '').trim().toLowerCase();

// opts: {places, observations, cfg (ALERT_CFG), start, end ('VVVV-KK-PP'), final, now}
function buildReport(records, opts){
  const places = opts.places || [], obs = opts.observations || [], cfg = opts.cfg;
  const now = opts.now || new Date();
  const recs = records.slice().sort((a, b) => a.run < b.run ? -1 : 1);
  const placeOf = o => places.find(p => norm(o.place) === norm(p.name) || norm(o.place) === norm(p.id));

  // ── Yöt: paikka -> mittarit ──
  const nights = new Map();
  for(const r of recs){
    const k = nightKey(new Date(r.run));
    if(!nights.has(k)) nights.set(k, {k, runs: 0, kpMax: null, bzMin: null, hintRuns: 0, errRuns: 0, p: {}});
    const n = nights.get(k);
    n.runs++;
    if(r.errors && r.errors.length) n.errRuns++;
    let hint = false;
    for(const p of r.places){
      const q = n.p[p.id] = n.p[p.id] || {idxMax: null, clouds: [], fires: {}, tonight: null};
      if(p.idx != null) q.idxMax = Math.max(q.idxMax ?? 0, p.idx);
      if(p.isDark && p.cloud != null) q.clouds.push(p.cloud);
      if(p.kp != null) n.kpMax = Math.max(n.kpMax ?? -1, p.kp);
      if(p.bz && p.bz.fresh) n.bzMin = Math.min(n.bzMin ?? 99, p.bz.mean);
      if(p.bz && p.bz.hint) hint = true;
      if(p.night && p.night.max != null) q.tonight = p.night.max;
      for(const a of p.alerts || []) if(a.fire){
        const key = a.t + ':' + a.l;
        q.fires[key] = (q.fires[key] || 0) + 1;
      }
    }
    if(hint) n.hintRuns++;
  }
  const keys = [...nights.keys()].sort();
  const fired = (q, t, l) => q ? (q.fires[t + ':' + l] || 0) : 0;
  const anyFired = (q, l) => fired(q, 'now', l) + fired(q, 'coming', l) + fired(q, 'tonight', l);

  // ── Ajot ja aukot ──
  const t0 = recs.length ? Date.parse(recs[0].run) : null, t1 = recs.length ? Date.parse(recs[recs.length - 1].run) : null;
  const expected = recs.length ? Math.round((t1 - t0) / 900e3) + 1 : 0;
  let gapMin = 0, gapMax = 0;
  for(let i = 1; i < recs.length; i++){
    const g = (Date.parse(recs[i].run) - Date.parse(recs[i - 1].run)) / 60e3;
    if(g > 25){ gapMin += g - 15; gapMax = Math.max(gapMax, g); }
  }
  const errRuns = recs.filter(r => r.errors && r.errors.length).length;

  let md = '# Revontulihälytysten kuivaharjoitus – loppuraportti\n\n' + (opts.final ? FINAL_MARK + '\n' : '');
  md += (opts.final ? '**Lopullinen.**' : '**Väliaikainen** – päivittyy jokaisessa ajossa kuivaharjoituksen viimeisen päivän loppuun; lopullinen versio kirjoitetaan ensimmäisessä ajossa sen jälkeen.')
    + ' Laadittu ' + fmt(now, {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}) + ' (Suomen aikaa).\n\n'
    + 'Ilmoituksia ei lähetetty. **Rajojen säätö alla on vain ehdotuksia – koodia ei ole muutettu.**\n\n';
  if(!recs.length) return md + '_Ei ajoja._\n';

  md += '## Jakso\n\n'
    + '- ' + fmt(new Date(t0), {day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'}) + ' – '
    + fmt(new Date(t1), {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}) + ', öitä ' + keys.length + '\n'
    + '- Ajoja ' + recs.length + ' (15 min välein olisi ' + expected + ', ' + nf(100 * recs.length / Math.max(1, expected), 0) + ' %)'
    + (gapMax ? '; pisin aukko ' + Math.round(gapMax) + ' min (GitHub Actionsin viive, ks. MUISTIO-halytykset.md)' : '') + '\n'
    + '- Datavirheitä ' + errRuns + ' ajossa\n'
    + '- Omia havaintoja ' + obs.length + ' (näkyi / ei: ' + obs.filter(o => o.seen === true).length + ' / ' + obs.filter(o => o.seen === false).length + ')\n\n';

  // ── Tilanne: aktiivisuus ja pilvisyys ──
  const kpAll = keys.map(k => nights.get(k).kpMax).filter(x => x != null);
  const kpTop = kpAll.length ? Math.max(...kpAll) : null;
  const activeNights = keys.filter(k => (nights.get(k).kpMax ?? 0) >= 4).length;
  const hintNights = keys.filter(k => nights.get(k).hintRuns > 0).length;
  md += '## Tilanne jaksolla\n\n'
    + '- Suurin Kp ' + nf(kpTop) + '; öitä, joina Kp >= 4: ' + activeNights + ' / ' + keys.length + '\n'
    + '- Tulossa-vihje (Bz etelään) päällä ' + hintNights + ' yönä\n'
    + '- Pilvisyys pimeällä (öiden keskiarvo): ' + places.map(pl => {
        const c = keys.flatMap(k => (nights.get(k).p[pl.id] || {clouds: []}).clouds);
        return pl.name + ' ' + nf(mean(c), 0) + ' %';
      }).join(', ') + '\n\n';

  // ── Yöt ──
  md += '## Yöt\n\nSolu: suurin näkyvyys % · pilvisyys pimeällä % · hälytykset normaalitasolla (N = nyt, T = tulossa, Y = tänä yönä). Havainnot HAVAINNOT.md:stä.\n\n'
    + '| Yö | Kp | Bz | ' + places.map(p => p.name).join(' | ') + ' | Havainnot |\n|---|--:|--:|' + places.map(() => '---').join('|') + '|---|\n';
  for(const k of keys){
    const n = nights.get(k);
    const cells = places.map(pl => {
      const q = n.p[pl.id];
      if(!q) return '–';
      const marks = ['now', 'coming', 'tonight'].map(t => fired(q, t, 'normaali') ? {now: 'N', coming: 'T', tonight: 'Y'}[t] : '').join('');
      return (q.idxMax ?? '–') + ' · ☁' + nf(mean(q.clouds), 0) + (marks ? ' **' + marks + '**' : '');
    });
    const o = obs.filter(x => x.night === k).map(x => (x.place || '?') + ': ' + x.text).join('; ');
    md += '| ' + dayLbl(k) + ' | ' + nf(n.kpMax) + ' | ' + nf(n.bzMin) + ' | ' + cells.join(' | ') + ' | ' + (o || ' ') + ' |\n';
  }

  // ── Hälytysmäärät ──
  md += '\n## Hälytykset, jotka olisivat lähteneet\n\nMäärä koko jaksolla: herkkä / normaali / varma.\n\n'
    + '| Paikka | Revontulia nyt | Tulossa | Tänä yönä |\n|---|--:|--:|--:|\n';
  const tot = {};
  for(const pl of places){
    const row = ['now', 'coming', 'tonight'].map(t => LVL_ORDER.map(l => {
      const c = keys.reduce((s, k) => s + fired(nights.get(k).p[pl.id], t, l), 0);
      tot[t + ':' + l] = (tot[t + ':' + l] || 0) + c;
      return c;
    }).join(' / '));
    md += '| ' + pl.name + ' | ' + row.join(' | ') + ' |\n';
  }
  md += '| **Yhteensä** | ' + ['now', 'coming', 'tonight'].map(t => LVL_ORDER.map(l => tot[t + ':' + l]).join(' / ')).join(' | ') + ' |\n\n';

  // ── Vertailu havaintoihin ──
  const judged = obs.filter(o => o.seen != null && placeOf(o));
  md += '## Vertailu havaintoihin\n\n';
  if(!judged.length){
    md += '_Ei vertailukelpoisia havaintoja (näkyikö kyllä/ei + testipaikan nimi). Osumatarkkuutta ei voi arvioida._\n\n';
  } else {
    md += 'Havaintoyöt, joilla paikka on testipaikka ja näkyikö = kyllä/ei (' + judged.length + '). '
      + '**Osuma** = hälytys ja näkyi, **turha** = hälytys mutta ei näkynyt, **ohi** = näkyi ilman hälytystä, **hiljaa** = ei hälytystä eikä näkynyt.\n\n'
      + '| Tyyppi | Taso | Osuma | Turha | Ohi | Hiljaa |\n|---|---|--:|--:|--:|--:|\n';
    for(const t of ['now', 'coming', 'tonight', 'any']) for(const l of LVL_ORDER){
      const c = {hit: 0, false: 0, miss: 0, quiet: 0};
      for(const o of judged){
        const q = (nights.get(o.night) || {p: {}}).p[placeOf(o).id];
        const f = t === 'any' ? anyFired(q, l) > 0 : fired(q, t, l) > 0;
        c[f ? (o.seen ? 'hit' : 'false') : (o.seen ? 'miss' : 'quiet')]++;
      }
      md += '| ' + (t === 'any' ? 'mikä tahansa' : TYPE[t]) + ' | ' + LVL[l] + ' | ' + c.hit + ' | ' + c.false + ' | ' + c.miss + ' | ' + c.quiet + ' |\n';
    }
    md += '\n';
  }

  // ── Ehdotukset ──
  md += '## Ehdotukset rajoihin (ei toteutettu)\n\n';
  const sug = [];
  const L = cfg.levels, K = cfg.coming;
  if(activeNights === 0) sug.push('Jakso oli **hiljainen** (Kp ei kertaakaan >= 4). Rajojen säätöön on vähän näyttöä – harkitse kuivaharjoituksen jatkamista (END_DATE työnkulussa).');
  const cloudAll = keys.flatMap(k => places.flatMap(pl => (nights.get(k).p[pl.id] || {clouds: []}).clouds));
  if(mean(cloudAll) != null && mean(cloudAll) >= 70) sug.push('Jakso oli **pilvinen** (pimeän ajan pilvisyys keskimäärin ' + nf(mean(cloudAll), 0) + ' %). Havaintoja on vähän – harkitse jatkamista.');
  if(recs.length < 0.8 * expected) sug.push('Ajoista puuttui ' + nf(100 - 100 * recs.length / expected, 0) + ' % (Actionsin viive). Tuotannossa Cloudflare Worker (ks. MUISTIO-halytykset.md).');
  // Revontulia nyt: havaittujen öiden näkyvyys vs. raja
  const seenIdx = judged.filter(o => o.seen).map(o => ({o, v: ((nights.get(o.night) || {p: {}}).p[placeOf(o).id] || {}).idxMax})).filter(x => x.v != null);
  const notIdx = judged.filter(o => !o.seen).map(o => ({o, v: ((nights.get(o.night) || {p: {}}).p[placeOf(o).id] || {}).idxMax})).filter(x => x.v != null);
  if(seenIdx.length){
    const lo = Math.min(...seenIdx.map(x => x.v));
    if(lo < L.normaali.nowIdxMin) sug.push('**Revontulia nyt:** öinä, joina revontulia näkyi, suurin näkyvyys oli pienimmillään ' + lo + ' % (< normaalin raja ' + L.normaali.nowIdxMin + ' %). Harkitse normaalin rajaa noin ' + Math.max(5, Math.floor(lo / 5) * 5) + ' %:iin.');
    else sug.push('**Revontulia nyt:** kaikkina näkyneinä öinä näkyvyys ylitti normaalin rajan (pienin ' + lo + ' %) – raja ei ohittanut havaintoja.');
  }
  const falseNow = notIdx.filter(x => x.v >= L.normaali.nowIdxMin);
  if(falseNow.length) sug.push('**Revontulia nyt:** ' + falseNow.length + ' turhaa yötä normaalilla (näkyvyys jopa ' + Math.max(...falseNow.map(x => x.v)) + ' %, ei näkynyt). Jos syy ei ole paikallinen (valosaaste, kuu, pilvet joita malli ei nähnyt), harkitse rajan nostoa.');
  // Tulossa: määrä per paikka-yö
  const comingN = keys.reduce((s, k) => s + places.reduce((t, pl) => t + fired(nights.get(k).p[pl.id], 'coming', 'normaali'), 0), 0);
  const placeNights = keys.length * places.length;
  if(comingN === 0) sug.push('**Tulossa:** ei lähtenyt kertaakaan normaalilla tasolla' + (hintNights ? ' (vihje päällä ' + hintNights + ' yönä - ehdot pilvisyys/pimeys/ulottuvuus rajasivat)' : ' (Bz ei kääntynyt riittävästi etelään)') + '. Ei näyttöä säätöön.');
  else {
    const per = comingN / placeNights;
    sug.push('**Tulossa:** ' + comingN + ' hälytystä normaalilla (' + nf(per, 2) + ' per paikka-yö).'
      + (per > 1 ? ' Paljon – harkitse Bz-rajan kiristämistä (nyt ' + K.bzMax + ' nT -> esim. ' + (K.bzMax - 2) + ' nT) tai Kp-marginaalin pienentämistä (nyt ' + K.kpMargin + ').' : ' Määrä kohtuullinen.'));
    const hel = places.find(p => p.id === 'helsinki');
    if(hel){
      const h = keys.reduce((s, k) => s + fired(nights.get(k).p.helsinki, 'coming', 'normaali'), 0);
      if(h) sug.push('**Tulossa / Helsinki:** ' + h + ' hälytystä. Vertaa havaintoihin; jos ei näkynyt, pienennä Kp-marginaalia (nyt ' + K.kpMargin + ').');
    }
  }
  // Tänä yönä
  const tonightJ = judged.map(o => ({o, v: ((nights.get(o.night) || {p: {}}).p[placeOf(o).id] || {}).tonight})).filter(x => x.v != null);
  if(tonightJ.length){
    const yes = tonightJ.filter(x => x.o.seen).map(x => x.v), no = tonightJ.filter(x => !x.o.seen).map(x => x.v);
    sug.push('**Tänä yönä:** yön paras arvo oli näkyneinä öinä ' + (yes.length ? nf(Math.min(...yes), 0) + '–' + nf(Math.max(...yes), 0) + ' %' : '–')
      + ', ei näkyneinä ' + (no.length ? nf(Math.min(...no), 0) + '–' + nf(Math.max(...no), 0) + ' %' : '–') + ' (normaalin raja ' + L.normaali.tonightMin + ' %).');
  }
  if(!judged.length) sug.push('Ilman kyllä/ei-havaintoja ehdotukset perustuvat vain hälytysmääriin. Täytä HAVAINNOT.md, raportti päivittyy (myös lopullisen jälkeen voi ajaa: `node scripts/alert-dryrun.mjs --out <loki> --final`).');
  md += sug.map(x => '- ' + x).join('\n') + '\n\n'
    + '<sub>Nykyiset rajat: ' + LVL_ORDER.map(l => LVL[l] + ' nyt ' + L[l].nowIdxMin + ' % / tulossa pilvet < ' + L[l].comingCloudMax + ' % / tänä yönä ' + L[l].tonightMin + ' %').join('; ')
    + '; Tulossa Bz <= ' + K.bzMax + ' nT, Bt >= ' + K.btMin + ' nT, Kp-marginaali ' + K.kpMargin + '.</sub>\n';
  return md;
}

const AlertReport = {buildReport, FINAL_MARK};
root.AlertReport = AlertReport;
if(typeof module !== 'undefined' && module.exports) module.exports = AlertReport;
})(typeof globalThis !== 'undefined' ? globalThis : this);
