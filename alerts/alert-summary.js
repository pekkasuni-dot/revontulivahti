/* Revontulihälytysten kuivaharjoituksen YHTEENVETO (2026-10).
   Lokirivit (scripts/alert-dryrun.mjs) -> Markdown: jokainen yö (klo 12-12
   Suomen aikaa) aikajanana paikoittain: tunneittain suurin näkyvyys ja
   hälytysmerkit, sekä luettelo hälytyksistä, joita OLISI lähetetty. Vertaa
   havaintoihin ja revontulikameroihin. Ei Node-riippuvuuksia. */
(function(root){
'use strict';
const TZ = 'Europe/Helsinki';
const TYPE = {now: 'Revontulia nyt', coming: 'Tulossa', tonight: 'Tänä yönä'};
const MARK = {now: 'N', coming: 'T', tonight: 'Y'};
const LVL = {herkka: 'herkkä', normaali: 'normaali', varma: 'varma'};
const LVL_ORDER = ['herkka', 'normaali', 'varma'];

const fmt = (d, o) => new Intl.DateTimeFormat('fi-FI', {timeZone: TZ, ...o}).format(d);
const hm = d => fmt(d, {hour: '2-digit', minute: '2-digit'});
const parts = d => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit',
  day: '2-digit', hour: '2-digit', hourCycle: 'h23'}).formatToParts(d).map(x => [x.type, x.value]));
// Yön tunniste: paikallinen päivä, jona yö alkaa (klo 12 jälkeen sama päivä, ennen edellinen).
function nightKey(d){
  const p = parts(d);
  if(+p.hour >= 12) return p.year + '-' + p.month + '-' + p.day;
  const y = new Date(d.getTime() - 12 * 3600e3), q = parts(y);
  return q.year + '-' + q.month + '-' + q.day;
}
const HOURS = [18,19,20,21,22,23,0,1,2,3,4,5,6,7];

// Omat havainnot (HAVAINNOT.md, käyttäjä muokkaa käsin): Markdown-taulukon
// rivit "| päivä | paikka | havainto |". Päivä = yön alkupäivä (VVVV-KK-PP
// tai P.K.VVVV). Palauttaa [{night, place, text}].
function parseObservations(md){
  const out = [];
  for(const line of String(md || '').split('\n')){
    const c = line.split('|').map(x => x.trim());
    if(c.length < 5 || c[0] !== '') continue;
    let d = c[1], m;
    if((m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) d = m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    if(!/^\d{4}-\d\d-\d\d$/.test(d) || !c[3]) continue;
    out.push({night: d, place: c[2], text: c[3]});
  }
  return out;
}
const OBS_TEMPLATE = '# Omat havainnot\n\n'
  + 'Merkitse tähän, näkyikö revontulia. Yhteenveto (YHTEENVETO.md) näyttää ne sarakkeessa **Oma havainto** '
  + 'seuraavassa ajossa (15 min sisällä). Muokkaa GitHubissa kynäkuvakkeesta ja tallenna (Commit changes).\n\n'
  + '- **Päivä** = yön alkupäivä (esim. yö 21.–22.10. → 2026-10-21 tai 21.10.2026)\n'
  + '- **Paikka** = testipaikan nimi (Oulu, Rovaniemi, Kilpisjärvi, Tromssa, Helsinki) tai muu paikka\n'
  + '- **Havainto** = vapaa teksti, esim. "kyllä, klo 22–23 heikkoa" / "ei, pilvessä" / "kamera: kirkasta klo 21"\n\n'
  + '| Päivä | Paikka | Havainto |\n|---|---|---|\n';

function buildSummary(records, opts = {}){
  const places = opts.places || [];
  const nightsN = opts.nights || 3;
  const now = opts.now || new Date();
  const obs = opts.observations || [];
  const norm = x => String(x).toLowerCase();
  const byNight = new Map();
  for(const r of records){
    const d = new Date(r.run), k = nightKey(d);
    if(!byNight.has(k)) byNight.set(k, []);
    byNight.get(k).push(r);
  }
  const keys = [...byNight.keys()].sort().reverse().slice(0, nightsN);
  let md = '# Revontulihälytykset – kuivaharjoitus\n\n'
    + 'Päivitetty ' + fmt(now, {weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'})
    + ' (Suomen aikaa). **Ilmoituksia ei lähetetä** – tämä näyttää, mitkä hälytykset *olisivat* lähteneet.\n\n'
    + 'Taulukko: tunnin suurin näkyvyys % (sama luku kuin sovelluksen Nyt-välilehdellä). '
    + 'Merkit: **N** = Revontulia nyt, **T** = Tulossa, **Y** = Tänä yönä (normaali-tasolla; '
    + 'herkkä/varma luettelossa). – = ei ajoa. **Oma havainto** tulee tiedostosta HAVAINNOT.md (muokkaa käsin).\n\n';
  if(!keys.length) return md + '_Ei vielä ajoja._\n';
  for(const k of keys){
    const recs = byNight.get(k).sort((a, b) => a.run < b.run ? -1 : 1);
    const [y, mo, da] = k.split('-').map(Number);
    const d0 = new Date(Date.UTC(y, mo - 1, da, 12));
    md += '## Yö ' + fmt(d0, {weekday: 'short', day: 'numeric', month: 'numeric'}) + ' → '
      + fmt(new Date(d0.getTime() + 86400e3), {weekday: 'short', day: 'numeric', month: 'numeric'}) + '\n\n';
    // Tuntitaulukko
    const nObs = obs.filter(o => o.night === k);
    md += '| Paikka | ' + HOURS.map(h => String(h).padStart(2, '0')).join(' | ') + ' | Oma havainto |\n|---|' + HOURS.map(() => '--:').join('|') + '|---|\n';
    for(const pl of places){
      const cells = HOURS.map(h => {
        let max = null, marks = new Set();
        for(const r of recs){
          if(+parts(new Date(r.run)).hour !== h) continue;
          const p = r.places.find(x => x.id === pl.id);
          if(!p) continue;
          if(p.idx != null) max = Math.max(max ?? 0, p.idx);
          for(const a of p.alerts || []) if(a.fire && a.l === 'normaali') marks.add(MARK[a.t]);
        }
        return max == null ? '–' : max + (marks.size ? ' **' + [...marks].join('') + '**' : '');
      });
      const own = nObs.filter(o => norm(o.place) === norm(pl.name) || norm(o.place) === norm(pl.id)).map(o => o.text).join('; ');
      md += '| ' + pl.name + ' | ' + cells.join(' | ') + ' | ' + (own || ' ') + ' |\n';
    }
    const other = nObs.filter(o => !places.some(pl => norm(o.place) === norm(pl.name) || norm(o.place) === norm(pl.id)));
    if(other.length) md += '\nMuut havainnot: ' + other.map(o => o.place + ': ' + o.text).join(' · ') + '\n';
    // Hälytysluettelo: sama ajo + paikka + tyyppi -> tasot yhdelle riville.
    const ev = [];
    for(const r of recs) for(const p of r.places){
      const byType = {};
      for(const a of p.alerts || []) if(a.fire) (byType[a.t] = byType[a.t] || []).push(a);
      for(const [t, list] of Object.entries(byType)){
        list.sort((a, b) => LVL_ORDER.indexOf(a.l) - LVL_ORDER.indexOf(b.l));
        ev.push('- ' + hm(new Date(r.run)) + ' **' + p.name + '** – ' + TYPE[t] + ' (' + list.map(a => LVL[a.l]).join(', ') + '): '
          + list[0].why + ' · pilvet ' + (p.cloud ?? '–') + ' %, aurinko ' + p.sunAlt + '°'
          + (p.bz ? ', Bz ' + p.bz.mean + ' nT / ' + p.bz.southMin + ' min' : ''));
      }
    }
    md += '\n**Hälytykset, jotka olisivat lähteneet** (' + ev.length + '):\n\n' + (ev.length ? ev.join('\n') : '_ei yhtään_') + '\n\n';
    // Ajot ja datan katkot
    const gaps = [];
    for(let i = 1; i < recs.length; i++){
      const gap = (new Date(recs[i].run) - new Date(recs[i-1].run)) / 60e3;
      if(gap > 25) gaps.push(hm(new Date(recs[i-1].run)) + '–' + hm(new Date(recs[i].run)) + ' (' + Math.round(gap) + ' min)');
    }
    const errs = recs.filter(r => r.errors && r.errors.length);
    md += '<sub>Ajoja ' + recs.length + (gaps.length ? ' · aukot: ' + gaps.join(', ') : '')
      + (errs.length ? ' · datavirheitä ' + errs.length + ' ajossa (esim. ' + errs[0].errors[0] + ')' : '') + '</sub>\n\n';
  }
  return md;
}

const AlertSummary = {buildSummary, nightKey, parseObservations, OBS_TEMPLATE};
root.AlertSummary = AlertSummary;
if(typeof module !== 'undefined' && module.exports) module.exports = AlertSummary;
})(typeof globalThis !== 'undefined' ? globalThis : this);
