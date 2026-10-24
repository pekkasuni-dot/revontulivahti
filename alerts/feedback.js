/* Kenttäpalaute (2026-10-24): PALAUTE.md lokihaarassa halytys-loki-2.
   Rivi per vastaus (kaikki säilyvät, myös saman hälytyksen useat vastaukset).
   Kirjaaja: scripts/alert-feedback.mjs (työnkulku palaute.yml, jonka Worker
   käynnistää). Lukija: loppuraportti (alerts/alert-report.js). */
(function(root){
'use strict';
const ANSWERS = {nakyi: 'Näkyi', ei: 'Ei näkynyt', pilvessa: 'Pilvessä'};
const WHO = {pekka: 'Pekka', opas: 'opas'};
const TYPES = {now: 'Revontulia nyt', coming: 'Tulossa', tonight: 'Tänä yönä'};
const HEADER = '| Aika (Suomi) | Hälytys | Paikka | Tyyppi | Vastaus | Vastaaja |';
const INTRO = '# Kenttäpalaute\n\n'
  + 'Hälytysilmoitusten napit (Näkyi / Ei näkynyt / Pilvessä) kirjaavat rivin tähän automaattisesti. '
  + 'Vastaaja on vain Pekka tai opas, muita tietoja ei tallenneta. Testi-ilmoitusten (testi-…) '
  + 'palautteet eivät ole mukana loppuraportissa. Älä muokkaa riviä käsin.\n\n';

// Tunniste -> {placeId, type} (testi -> null).
function parseId(id){
  const m = /^\d{8}T\d{4}-([a-z0-9_]+)-(now|coming|tonight)$/.exec(id || '');
  return m ? {placeId: m[1], type: m[2]} : null;
}
function fmtNow(d){
  return new Intl.DateTimeFormat('fi-FI', {timeZone: 'Europe/Helsinki', day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(d).replace(' klo', '');
}
// Uusi rivi tiedoston loppuun (luo pohjan, jos puuttuu).
function appendRow(md, row){
  let s = md && md.includes(HEADER) ? md : INTRO + HEADER + '\n|---|---|---|---|---|---|\n';
  if(!s.endsWith('\n')) s += '\n';
  return s + row + '\n';
}
function rowFor(id, answer, who, places, now){
  const p = parseId(id), place = p && (places || []).find(x => x.id === p.placeId);
  return '| ' + fmtNow(now) + ' | ' + id + ' | ' + (place ? place.name : (p ? p.placeId : 'testi')) + ' | '
    + (p ? TYPES[p.type] : 'testi') + ' | ' + ANSWERS[answer] + ' | ' + WHO[who] + ' |';
}
// PALAUTE.md -> [{id, placeId, type, answer ('nakyi'|'ei'|'pilvessa'), who}] (ei testejä).
function parseFeedback(md){
  const back = Object.fromEntries(Object.entries(ANSWERS).map(([k, v]) => [v, k]));
  const out = [];
  for(const line of String(md || '').split('\n')){
    const c = line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    if(c.length < 6) continue;
    const p = parseId(c[1]);
    if(!p || !back[c[4]]) continue;
    out.push({id: c[1], placeId: p.placeId, type: p.type, answer: back[c[4]], who: c[5]});
  }
  return out;
}
// Loppuraportin osio (2026-10-24): kenttäpalaute paikoittain ja hälytystyypeittäin
// sekä mallien pilvisyys niissä hälytyksissä, joihin vastattiin.
// recs = lokirivit (record.sent = lähetetyt), fb = parseFeedback(PALAUTE.md).
const MODELS = [['ecmwf', 'ECMWF'], ['icon_eu', 'ICON-EU'], ['harmonie', 'HARMONIE']];
function reportSection(recs, fb, places){
  const sent = [];
  for(const r of recs) for(const s of r.sent || []){
    if(!Object.values(s.to || {}).some(v => v === 'ok')) continue;
    const p = (r.places || []).find(x => x.id === s.place);
    sent.push({id: s.id, place: s.place, type: s.t, run: r.run, clouds: p && p.clouds, cloudModel: r.cloudModel});
  }
  let md = '## Kenttäpalaute (ntfy)\n\n';
  if(!sent.length) return md + '_Ei lähetettyjä ilmoituksia._\n\n';
  const byId = new Map();
  for(const f of fb || []){ if(!byId.has(f.id)) byId.set(f.id, []); byId.get(f.id).push(f); }
  const name = id => ((places || []).find(p => p.id === id) || {name: id}).name;
  // Taulukon rivi: lähetetyt, vastaukset (kaikki napit, myös useat vastaajat) ja ilman vastausta jääneet hälytykset.
  const row = (label, list) => {
    const ans = list.flatMap(s => byId.get(s.id) || []);
    const c = k => ans.filter(a => a.answer === k).length;
    return '| ' + label + ' | ' + list.length + ' | ' + c('nakyi') + ' | ' + c('ei') + ' | ' + c('pilvessa') + ' | ' + list.filter(s => !byId.has(s.id)).length + ' |\n';
  };
  const head = (h) => '| ' + h + ' | Lähetetty | Näkyi | Ei näkynyt | Pilvessä | Ei vastausta |\n|---|--:|--:|--:|--:|--:|\n';
  md += 'Ilmoitukset tasolla normaali, palaute napeista (PALAUTE.md). Vastaukset = kaikki napin painallukset '
    + '(Pekka ja opas erikseen); "ei vastausta" = hälytykset, joihin kukaan ei vastannut.\n\n';
  md += head('Paikka');
  for(const p of places || []){ const l = sent.filter(s => s.place === p.id); if(l.length) md += row(p.name, l); }
  md += row('**Yhteensä**', sent) + '\n' + head('Tyyppi');
  for(const [t, n] of Object.entries(TYPES)){ const l = sent.filter(s => s.type === t); if(l.length) md += row(n, l); }
  md += '\n';
  // Mallien pilvisyys vastatuissa hälytyksissä.
  const answered = sent.filter(s => byId.has(s.id));
  md += '### Mallien pilvisyys vastatuissa hälytyksissä\n\n';
  if(!answered.length) return md + '_Ei vastattuja hälytyksiä._\n\n';
  const pct = v => v == null ? '–' : v + ' %';
  md += 'Pilvisyys hälytyshetkellä paikan kohdalla (hälytykset laskettiin ' + (answered[0].cloudModel === 'harmonie' ? 'HARMONIElla' : answered[0].cloudModel) + ').\n\n'
    + '| Hälytys | Vastaukset | ' + MODELS.map(m => m[1]).join(' | ') + ' |\n|---|---|' + MODELS.map(() => '--:').join('|') + '|\n';
  for(const s of answered){
    const a = byId.get(s.id).map(x => ANSWERS[x.answer] + ' (' + x.who + ')').join(', ');
    md += '| ' + name(s.place) + ' ' + TYPES[s.type] + ' ' + new Intl.DateTimeFormat('fi-FI', {timeZone: 'Europe/Helsinki', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(s.run))
      + ' | ' + a + ' | ' + MODELS.map(([k]) => pct(s.clouds && s.clouds[k])).join(' | ') + ' |\n';
  }
  // Keskiarvot vastauksittain: osuiko malli pilvisyyteen (Pilvessä vs. Näkyi).
  md += '\n| Vastaus | Hälytyksiä | ' + MODELS.map(m => m[1] + ' ka.').join(' | ') + ' |\n|---|--:|' + MODELS.map(() => '--:').join('|') + '|\n';
  for(const [k, lbl] of Object.entries(ANSWERS)){
    const l = answered.filter(s => byId.get(s.id).some(x => x.answer === k));
    if(!l.length) continue;
    const avg = m => { const v = l.map(s => s.clouds && s.clouds[m]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + ' %' : '–'; };
    md += '| ' + lbl + ' | ' + l.length + ' | ' + MODELS.map(([m]) => avg(m)).join(' | ') + ' |\n';
  }
  return md + '\n';
}

const Feedback = {ANSWERS, WHO, TYPES, HEADER, parseId, appendRow, rowFor, parseFeedback, reportSection};
root.AlertFeedback = Feedback;
if(typeof module !== 'undefined' && module.exports) module.exports = Feedback;
})(typeof globalThis !== 'undefined' ? globalThis : this);
