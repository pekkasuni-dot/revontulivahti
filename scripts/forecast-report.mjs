#!/usr/bin/env node
// Ennustevertailun raportti (2026-10-27): lukee <dir>/logs/*.jsonl ja kirjoittaa
// <dir>/RAPORTTI.md + status.json. Ajetaan jokaisen lokiajon lopuksi
// (forecast-log.mjs), käsin: node scripts/forecast-report.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PLACES, LEADS, SRC_NAME, pairs, stats} from './vertailu/core.mjs';

export function readRows(dir){
  const d = path.join(dir, 'logs');
  if(!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.jsonl')).sort()
    .flatMap(f => fs.readFileSync(path.join(d, f), 'utf8').split('\n').filter(Boolean).map(l => { try{ return JSON.parse(l); }catch(e){ return null; } }))
    .filter(Boolean);
}

const fmt = (v, d = 0) => v == null ? '–' : v.toFixed(d).replace('.', ',');
const CLS_NAME = {selkea: 'selkeä', puoli: 'puolipilvinen', pilvi: 'pilvinen'};
const GROUPS = [
  {id: 'all',   name: 'Kaikki yöt',                     f: p => true},
  {id: 'clear', name: 'Selkeät ja puolipilviset yöt',   f: p => p.cls === 'selkea' || p.cls === 'puoli'},
  {id: 'cloud', name: 'Pilviset yöt',                   f: p => p.cls === 'pilvi'},
];
const COLS = ['edited', 'harmonie', 'ecmwf', 'app7d'];

// Keräyksen tila: selkeät/puolipilviset yöt = eri öitä, joina vähintään yhdellä paikalla
// havaittu yön keskiarvo <= 5/8.
export function collectStatus(ns){
  const clearDates = [...new Set([...ns.values()].filter(n => n.cls === 'selkea' || n.cls === 'puoli').map(n => n.night))].sort();
  return {nights: new Set([...ns.values()].map(n => n.night)).size, placeNights: ns.size, clearDates};
}

export function reportMarkdown(rows, {minEnd, maxEnd, now = Date.now()} = {}){
  const {pairs: P, nights: ns} = pairs(rows);
  const st = collectStatus(ns);
  const today = new Date(now).toISOString().slice(0, 10);
  const enough = st.clearDates.length >= 3;
  let done = false, doneReason = '';
  if(maxEnd && today > maxEnd){ done = true; doneReason = 'enimmäisaika ' + maxEnd + ' täynnä'; }
  else if(minEnd && today > minEnd && enough){ done = true; doneReason = 'vähintään 3 viikkoa ja 3 selkeää/puolipilvistä yötä'; }

  const L = [];
  L.push('# Ennustevertailu: pilvisyys Lapissa yöllä', '');
  L.push('> **Huom:** vertailukohtana ovat automaattiasemat (FMI:n asemat ja Sørkjosenin METAR). Niiden ' +
    'pilvikorkeusmittari näkee vain suoraan ylöspäin ja voi jättää ohuen yläpilven (harso) huomaamatta -> ' +
    'havaittu pilvisyys voi olla todellista pienempi ja ennuste näyttää "liian pilviseltä" erityisesti selkeinä öinä.', '');
  L.push(`Päivitetty ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC. Lokiajoja ${rows.length}` +
    (rows.length ? `, ${rows[0].t.slice(0, 10)} – ${rows[rows.length - 1].t.slice(0, 10)}` : '') + '.', '');
  L.push(`**Tila:** öitä ${st.nights} (paikka-öitä ${st.placeNights}), selkeitä tai puolipilvisiä öitä ${st.clearDates.length}` +
    (st.clearDates.length ? ` (${st.clearDates.join(', ')})` : '') + '. ' +
    (done ? `Keräys päättynyt: ${doneReason}.` : `Keräys jatkuu (vähintään ${minEnd || '3 viikkoa'} asti ja kunnes 3 selkeää/puolipilvistä yötä, enintään ${maxEnd || '–'}).`), '');
  L.push('Vertailu: ennuste kohdetunnille vs. lähimmän aseman havainto samalta tunnilta. **MAE** = keskimääräinen virhe ' +
    'prosenttiyksikköinä (pienempi parempi), **osuma** = sama luokka (selkeä ≤ 2/8, puolipilvinen 3–5/8, pilvinen ≥ 6/8), ' +
    '**harha** = ennuste − havainto (+ = ennuste liian pilvinen). Yön luokka havaintojen keskiarvosta klo 18–06. ' +
    `"${SRC_NAME.app7d}" = mitä 7 vrk -välilehti nyt näyttää HARMONIE valittuna (HARMONIE alle 30 h, sen jälkeen ECMWF).`, '');

  for(const g of GROUPS){
    const gp = P.filter(g.f);
    L.push(`## ${g.name}`, '');
    if(!gp.length){ L.push('Ei vielä vertailupareja.', ''); continue; }
    L.push('| Pituus | ' + COLS.map(c => SRC_NAME[c]).join(' | ') + ' |', '|---|' + COLS.map(() => '---').join('|') + '|');
    for(const lead of LEADS){
      const cells = COLS.map(c => {
        const s = stats(gp.filter(p => p.src === c && p.lead === lead));
        return s.n ? `MAE ${fmt(s.mae)} · osuma ${fmt(s.hit)} % · harha ${s.bias >= 0 ? '+' : ''}${fmt(s.bias)} (n ${s.n})` : '–';
      });
      L.push(`| ${lead} h | ${cells.join(' | ')} |`);
    }
    L.push('');
  }

  // Paikoittain: MAE kaikilla pituuksilla yhteensä.
  L.push('## Paikoittain (kaikki pituudet, MAE / n)', '');
  L.push('| Paikka | Havainto | ' + COLS.map(c => SRC_NAME[c]).join(' | ') + ' |', '|---|---|' + COLS.map(() => '---').join('|') + '|');
  for(const pl of PLACES){
    const cells = COLS.map(c => { const s = stats(P.filter(p => p.place === pl.id && p.src === c)); return s.n ? fmt(s.mae) + ' / ' + s.n : '–'; });
    L.push(`| ${pl.name} | ${pl.obs.name} | ${cells.join(' | ')} |`);
  }
  L.push('');

  // Suositusluonnos: editoitu vs. nykyinen 7 vrk 24/48/72 h, selkeät/puolipilviset yöt ensin.
  L.push('## Editoitu koko 7 vrk:lle? (laskettu ehdotus, lopullinen arvio käsin)', '');
  const cmp = (filter, lead) => {
    const e = stats(P.filter(p => filter(p) && p.src === 'edited' && p.lead === lead));
    const a = stats(P.filter(p => filter(p) && p.src === 'app7d' && p.lead === lead));
    return {e, a, diff: e.n && a.n ? a.mae - e.mae : null};
  };
  for(const g of GROUPS.slice(0, 2)){
    const parts = [24, 48, 72].map(lead => {
      const c = cmp(g.f, lead);
      return c.diff == null ? `${lead} h: ei pareja` : `${lead} h: editoitu ${fmt(c.e.mae)} vs. nykyinen ${fmt(c.a.mae)} (${c.diff > 0 ? 'editoitu parempi' : c.diff < 0 ? 'nykyinen parempi' : 'tasan'} ${fmt(Math.abs(c.diff))} %-yks., n ${Math.min(c.e.n, c.a.n)})`;
    });
    L.push(`- **${g.name}:** ` + parts.join('; '));
  }
  L.push('', 'Nyrkkisääntö: editoitu kannattaa koko 7 vrk:lle, jos se on selkeinä/puolipilvisinä öinä vähintään yhtä hyvä ' +
    '24–72 h:n pituuksilla eikä selvästi huonompi pilvisinä öinä (ero > 5 %-yks.). Pienillä n-määrillä (alle ~30 paria) tulos on suuntaa-antava.', '');

  // Yöt.
  L.push('## Yöt (havaittu keskiarvo klo 18–06)', '');
  const byNight = new Map();
  for(const n of ns.values()){ if(!byNight.has(n.night)) byNight.set(n.night, []); byNight.get(n.night).push(n); }
  L.push('| Yö | ' + PLACES.map(p => p.name).join(' | ') + ' |', '|---|' + PLACES.map(() => '---').join('|') + '|');
  for(const night of [...byNight.keys()].sort()){
    const m = new Map(byNight.get(night).map(n => [n.place, n]));
    L.push(`| ${night} | ` + PLACES.map(p => { const n = m.get(p.id); return n ? `${fmt(n.mean)} % ${CLS_NAME[n.cls]}` : '–'; }).join(' | ') + ' |');
  }
  L.push('', 'Lähteet: IL editoitu (pal_skandinavia) ja HARMONIE FMI:n avoimen datan pisteennusteena; ECMWF sovelluksen 7 vrk -ruuduista; ' +
    'havainnot FMI:n asemilta (n_man, oktaa) ja Lyngenille Sørkjosenin METAR (automaattinen: näkee vain ceilometrin yläpuolelta, CAVOK/NCD = 0 %).');
  return {md: L.join('\n') + '\n', status: {...st, clearNights: st.clearDates.length, done, doneReason, updated: new Date(now).toISOString()}};
}

export function writeReport(dir, opts = {}){
  const rows = readRows(dir);
  const {md, status} = reportMarkdown(rows, opts);
  fs.writeFileSync(path.join(dir, 'RAPORTTI.md'), md);
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify(status, null, 1) + '\n');
  return status;
}

if(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])){
  const dir = process.argv[2] || 'ennuste-loki';
  const s = writeReport(dir, {minEnd: process.argv[3], maxEnd: process.argv[4]});
  console.log(`RAPORTTI.md: öitä ${s.nights}, selkeitä/puolipilvisiä ${s.clearNights}${s.done ? ', valmis' : ''}`);
}
