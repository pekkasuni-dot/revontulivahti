/* Revontulihälytysten kuivaharjoituksen YHTEENVETO (2026-10).
   Lokirivit (scripts/alert-dryrun.mjs) -> Markdown: jokainen yö (klo 12-12
   Suomen aikaa) aikajanana paikoittain: tunneittain suurin näkyvyys ja
   hälytysmerkit, sekä luettelo hälytyksistä, joita OLISI lähetetty. Vertaa
   havaintoihin ja revontulikameroihin. Ei Node-riippuvuuksia. */
(function(root){
'use strict';
const K = root.Keograms || (typeof require !== 'undefined' ? require('./keograms.js') : null);
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

// Omat havainnot (HAVAINNOT.md, käyttäjä muokkaa käsin). Taulukon rivit
// "| päivä | paikka | näkyikö | pilvisyys | kommentti |" (vanha muoto
// "| päivä | paikka | havainto |" käy myös). Päivä = yön alkupäivä
// (P.K.VVVV tai VVVV-KK-PP). Tyhjät pohjarivit ohitetaan.
// Palauttaa [{night, place, seen, sky, note, text}]; seen = true/false/null.
function isoDay(d){
  let m;
  if((m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return /^\d{4}-\d\d-\d\d$/.test(d) ? d : null;
}
function parseSeen(x){
  const v = String(x || '').trim().toLowerCase();
  if(!v) return null;
  if(/^(k|y|x|✓|✅|on|näkyi)/.test(v)) return true;    // kyllä, yes, x
  if(/^(e|n|-|–|❌)/.test(v)) return false;             // ei, no
  return null;
}
function parseObservations(md){
  const out = [];
  for(const line of String(md || '').split('\n')){
    const t = line.trim();
    if(!t.startsWith('|')) continue;
    const c = t.replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    const night = isoDay(c[0] || '');
    if(!night) continue;
    let seen = null, sky = '', note = '';
    if(c.length >= 5){ seen = parseSeen(c[2]); sky = c[3]; note = c.slice(4).join(' | ').trim(); if(seen == null && c[2]) note = (c[2] + ' ' + note).trim(); }
    else { note = (c[2] || '').trim(); seen = parseSeen(note); }
    if(seen == null && !sky && !note) continue;
    const text = [seen == null ? '' : seen ? 'näkyi' : 'ei näkynyt', sky, note].filter(Boolean).join(' · ');
    out.push({night, place: c[1] || '', seen, sky, note, text});
  }
  return out;
}
// Pohja: yksi rivi per kuivaharjoituksen yö (start..end, VVVV-KK-PP).
const OBS_HEADER = '| Päivä | Paikka | Näkyikö | Pilvisyys | Kommentti |';
const listFi = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' tai ' + names[names.length - 1];
// Ohjeteksti taulukon yläpuolella; paikat testipaikoista (places).
function obsIntro(places){
  const names = (places && places.length ? places : [{name: 'Oulu'}, {name: 'Rovaniemi'}, {name: 'Kilpisjärvi'}, {name: 'Helsinki'}]).map(p => p.name);
  return '# Omat havainnot\n\n'
    + 'Täytä rivi, kun tiedät näkyikö revontulia (itse tai kamerasta). Muokkaa GitHubissa kynäkuvakkeesta ja '
    + 'tallenna (Commit changes). Havainto näkyy YHTEENVETO.md:ssä seuraavan ajon jälkeen (15 min) ja '
    + 'loppuraportissa (LOPPURAPORTTI.md).\n\n'
    + '- **Päivä** = yön alkupäivä (yö 23.–24.10. → 23.10.2026). Valmiina joka yölle jokaiselle paikalle.\n'
    + '- **Paikka** = ' + listFi(names) + ' (vertailu hälytyksiin; paikat ovat sovelluksen revontulikameroiden '
    + 'kohdalla, Helsinki vertailuna). Muu paikka tai kamera käy myös, se näkyy erikseen.\n'
    + '- **Näkyikö** = kyllä / ei (tyhjä = ei tietoa)\n'
    + '- **Pilvisyys** = esim. selkeä / puolipilvinen / pilvinen\n'
    + '- **Kommentti** = vapaa teksti, esim. "heikkoa klo 22–23", "kamera Levi"\n\n'
    + 'Täytä ne rivit, joista tiedät; tyhjiä rivejä ei huomioida. Muu paikka tai toinen havainto samasta paikasta: lisää rivi.\n\n';
}
function nightDays(start, end){
  const days = [];
  if(start && end) for(let t = Date.parse(start + 'T12:00:00Z'); t <= Date.parse(end + 'T12:00:00Z'); t += 86400e3){
    const d = new Date(t);
    days.push(d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCFullYear());
  }
  return days;
}
// Taulukko: joka yölle rivi jokaiselle testipaikalle (2026-10-23). Käyttäjän
// täyttämät rivit (oldRows = taulukon raakarivit) säilyvät: saman yön ja
// paikan rivi korvaa pohjarivin, muut täytetyt rivit (muu paikka, kopioidut
// rivit, jakson ulkopuoliset päivät) jäävät yön rivien perään / loppuun.
// Tyhjät rivit (ei näkyikö/pilvisyys/kommenttia) pudotetaan ja luodaan uudelleen.
function obsTable(start, end, places, oldLines){
  const norm = x => String(x || '').trim().toLowerCase();
  const filled = (oldLines || []).map(line => {
    const c = line.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
    return {line: line.trim(), night: isoDay(c[0] || ''), place: c[1] || '', empty: !(c.slice(2).some(Boolean))};
  }).filter(r => r.night && !r.empty);
  const names = (places || []).map(p => p.name);
  const used = new Set();
  let out = OBS_HEADER + '\n|---|---|---|---|---|\n';
  for(const d of nightDays(start, end)){
    const iso = isoDay(d);
    for(const n of names){
      const mine = filled.filter((r, i) => !used.has(i) && r.night === iso && norm(r.place) === norm(n));
      if(mine.length) for(const r of mine){ used.add(filled.indexOf(r)); out += r.line + '\n'; }
      else out += '| ' + d + ' | ' + n + ' | | | |\n';
    }
    filled.forEach((r, i) => { if(!used.has(i) && r.night === iso){ used.add(i); out += r.line + '\n'; } });
  }
  filled.forEach((r, i) => { if(!used.has(i)) out += r.line + '\n'; });
  return out;
}
const tableLines = md => String(md || '').split('\n').filter(l => /^\s*\|/.test(l) && isoDay((l.trim().replace(/^\|/, '').split('|')[0] || '').trim()));
function obsTemplate(start, end, oldRows, places){
  // oldRows: vanhan muodon havainnot ({night, place, note}) -> rivimuotoon
  const old = (oldRows || []).map(o => '| ' + o.night + ' | ' + o.place + ' | | | ' + o.note + ' |');
  return obsIntro(places) + obsTable(start, end, places, old);
}
// Uusi pohja, jos tiedostoa ei ole tai se on vanhaa muotoa (vanhat rivit
// säilyvät). Nykymuodossa ohjeteksti ja taulukon pohjarivit (yö x paikka)
// päivitetään; käyttäjän täyttämät rivit säilyvät sellaisinaan.
// Palauttaa uuden sisällön tai null (ei muutosta).
function ensureObsTemplate(md, start, end, places){
  if(md && md.includes(OBS_HEADER)){
    const next = obsIntro(places) + obsTable(start, end, places, tableLines(md));
    return next === md ? null : next;
  }
  return obsTemplate(start, end, md ? parseObservations(md) : [], places);
}

// Testipaikkojen tunniste lokiriviin (record.placeSet): id:t pilkuin.
const placeSetId = places => places.map(p => p.id).join(',');
// Mistä ajosta alkaen nykyiset paikat ovat mukana. null = kaikki ajot
// samoilla paikoilla. Muuten {since (ISO), added, removed} (nimet).
function placeChange(records, places){
  const cur = placeSetId(places);
  const recs = records.slice().sort((a, b) => a.run < b.run ? -1 : 1);
  const first = recs.findIndex(r => r.placeSet === cur);
  if(first <= 0) return first === 0 ? null : (recs.length ? {since: null, added: [], removed: []} : null);
  const oldIds = new Map();
  for(const r of recs.slice(0, first)) for(const p of r.places || []) oldIds.set(p.id, p.name);
  return {since: recs[first].run,
    added: places.filter(p => !oldIds.has(p.id)).map(p => p.name),
    removed: [...oldIds].filter(([id]) => !places.some(p => p.id === id)).map(([, n]) => n)};
}
function placeChangeText(ch){
  if(!ch) return '';
  if(!ch.since) return '**Testipaikat:** nykyiset paikat (kameroiden kohdalla) eivät ole vielä olleet mukana yhdessäkään ajossa.\n\n';
  return '**Testipaikat vaihtuivat** ajosta ' + fmt(new Date(ch.since), {day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit'})
    + ' (Suomen aikaa) alkaen: paikat ovat nyt revontulikameroiden kohdalla (Oulu, Rovaniemi ja Kilpisjärvi siirtyivät kameran kohdalle)'
    + (ch.added.length ? '; uudet ' + ch.added.join(', ') : '') + (ch.removed.length ? '; pois ' + ch.removed.join(', ') : '')
    + '. Uusien paikkojen solut ovat sitä ennen –.\n\n';
}

function buildSummary(records, opts = {}){
  const places = opts.places || [];
  const nightsN = opts.nights || Infinity;   // oletus: kaikki yöt
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
    + 'herkkä/varma luettelossa). – = ei ajoa. **Oma havainto** tulee tiedostosta HAVAINNOT.md (muokkaa käsin).\n\n'
    + (opts.end ? 'Kuivaharjoituksen kaikki yöt, uusin ensin (päättyy ' + opts.end.split('-').reverse().map(Number).join('.') + '). Koko jakson tilastot ja ehdotukset: LOPPURAPORTTI.md (viimeisenä päivänä).\n\n' : '')
    + placeChangeText(placeChange(records, places))
    + (opts.keograms ? '**Keogrammit:** joka yön kohdalla linkit FMI:n (Muonio, Kilpisjärvi, Kevo, Sodankylä) ja IRF:n (Kiiruna) kaikkitaivaskameroiden koko yön kuviin – vain julkaistut (tarkistetaan aamulla klo ' + (K.CHECK.morningUtc + 3) + ' jälkeen Suomen kesäaikaa). ' + K.SGO_NOTE + '\n\n' : '');
  if(!keys.length) return md + '_Ei vielä ajoja._\n';
  for(const k of keys){
    const recs = byNight.get(k).sort((a, b) => a.run < b.run ? -1 : 1);
    const [y, mo, da] = k.split('-').map(Number);
    const d0 = new Date(Date.UTC(y, mo - 1, da, 12));
    md += '## Yö ' + fmt(d0, {weekday: 'short', day: 'numeric', month: 'numeric'}) + ' → '
      + fmt(new Date(d0.getTime() + 86400e3), {weekday: 'short', day: 'numeric', month: 'numeric'}) + '\n\n';
    if(opts.keograms){
      const kl = K.keogramLine(opts.keograms, k);
      md += '**Keogrammit:** ' + (kl || '_tarkistetaan yön jälkeen aamulla_') + '\n\n';
    }
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
    if(other.length) md += '\nMuut havainnot: ' + other.map(o => (o.place || 'paikka ?') + ': ' + o.text).join(' · ') + '\n';
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

const AlertSummary = {buildSummary, nightKey, parseObservations, parseSeen, obsTemplate, obsTable, ensureObsTemplate, obsIntro, placeSetId, placeChange, placeChangeText, OBS_HEADER, TYPE, LVL, LVL_ORDER, HOURS, parts};
root.AlertSummary = AlertSummary;
if(typeof module !== 'undefined' && module.exports) module.exports = AlertSummary;
})(typeof globalThis !== 'undefined' ? globalThis : this);
