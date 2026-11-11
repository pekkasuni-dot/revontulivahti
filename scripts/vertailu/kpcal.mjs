// Näkyvyys-%:n kalibrointi (päätös 47, 2026-11-11): Kp-ennusteella laskettu revontulien arvio (kpVisibility)
// vs. OVATION (Nyt-välilehden lähde, vertailutaso). Puhtaat apufunktiot lokiin ja taulukkoon.
// Testit: tests/kpcal.test.mjs. Ks. ARCHITECTURE.md päätös 47.
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../../aurora-core.js');

// Kalibrointipaikat: ennustevertailun paikat + etelän vyöhyke (Helsingin seudulta dataa vain 3 yöltä 21.-23.10.).
export const CAL_PLACES = [
  {id: 'helsinki', lat: 60.17, lon: 24.94}, {id: 'tampere', lat: 61.50, lon: 23.76}, {id: 'jyvaskyla', lat: 62.24, lon: 25.75},
  {id: 'oulu', lat: 65.03, lon: 25.41}, {id: 'rovaniemi', lat: 66.578, lon: 26.015}, {id: 'levi', lat: 67.8, lon: 24.8},
  {id: 'sodankyla', lat: 67.42, lon: 26.6}, {id: 'kilpisjarvi', lat: 69.05, lon: 20.79}, {id: 'utsjoki', lat: 69.908, lon: 27.027},
  {id: 'lyngen', lat: 69.75, lon: 20.6}, {id: 'tromssa', lat: 69.65, lon: 18.96},
];
// Ryhmät: Kp-luokat ja geomagneettiset leveysvyöhykkeet.
export const KP_CLASSES = ['0–1', '2', '3', '4', '5+'];
export const ZONES = ['etelä (< 62°)', 'keski (62–65°)', 'pohjoinen (≥ 65°)'];
export const kpClass = kp => kp < 2 ? 0 : kp < 3 ? 1 : kp < 4 ? 2 : kp < 5 ? 3 : 4;
export const zoneOf = mlat => mlat < 62 ? 0 : mlat < 65 ? 1 : 2;
export const MIN_PAIRS = 30;   // tätä pienempi ryhmä -> lähimmän ryhmän arvo, epävarma

// Yhden ajon rivi: OVATION paikoittain + Kp nyt + Kp-ennusteen 3 h jaksot (etukäteen tehty ennuste).
export function logRow(now, {ovation, kp}){
  const kpNow = kp ? C.kpNowInfo(kp, now) : null;
  const row = {t: new Date(now).toISOString(), ovObs: ovation ? ovation.time.toISOString() : null,
    ovFc: ovation ? ovation.forecast.toISOString() : null,
    kpNow: kpNow ? {kp: kpNow.kp, kind: kpNow.kind} : null,
    kpFc: (kp && kp.forecast || []).filter(r => r.t.getTime() + 3 * 3600e3 > now).map(r => [r.t.toISOString(), r.kp]),
    places: {}};
  for(const p of CAL_PLACES){
    const mlat = Math.round(C.magLat(p.lat, p.lon) * 10) / 10;
    const ov = ovation ? Math.round(C.ovationProbAt(ovation.grid, p.lat, p.lon)) : null;
    const dark = C.darknessFactor(C.sunAltitude(new Date(now), p.lat, p.lon));
    row.places[p.id] = {ov, mlat, dark: Math.round(dark * 100) / 100};
  }
  return row;
}

// Parit: kenttätestin loki (places[] {aurora, kp, mlat, isDark}) ja tämä loki (places{} + kpNow).
// Palauttaa [{t, id, kp, mlat, ov}] vain pimeältä ajalta. Kp = sen hetken Kp (kuvauksen virhe Kp -> OVATION).
export function pairsFrom(rows){
  const out = [];
  for(const r of rows){
    if(Array.isArray(r.places)){
      for(const p of r.places) if(p.isDark && p.aurora != null && p.kp != null && p.mlat != null)
        out.push({t: r.run, id: p.id, kp: p.kp, mlat: p.mlat, ov: p.aurora});
    } else if(r.places && r.kpNow){
      for(const [id, p] of Object.entries(r.places)) if(p.dark >= 0.99 && p.ov != null)
        out.push({t: r.t, id, kp: r.kpNow.kp, mlat: p.mlat, ov: p.ov});
    }
  }
  return out;
}
// Etukäteen tehdyt parit tästä lokista: ennuste ajolta t0 tunnille H (lead = H - t0) vs. OVATION tunnilla H.
export function aheadPairs(rows, leads = [1, 3, 6, 12, 24]){
  const H = 3600e3, byHour = new Map();
  for(const r of rows) if(r.places && !Array.isArray(r.places)) byHour.set(Math.floor(Date.parse(r.t) / H) * H, r);
  const out = [];
  for(const [h, r] of byHour) for(const L of leads){
    const r0 = byHour.get(h - L * H); if(!r0 || !r0.kpFc) continue;
    const blk = r0.kpFc.find(([s]) => h >= Date.parse(s) && h < Date.parse(s) + 3 * H); if(!blk) continue;
    for(const [id, p] of Object.entries(r.places)) if(p.dark >= 0.99 && p.ov != null)
      out.push({t: r.t, id, lead: L, kpFc: blk[1], kpNow: r.kpNow && r.kpNow.kp, mlat: p.mlat, ov: p.ov});
  }
  return out;
}

const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
// Taulukko: OVATIONin keskiarvo ryhmittäin + parien määrä; alle MIN_PAIRS -> lähin ryhmä (epävarma).
export function calTable(pairs){
  const cell = ZONES.map(() => KP_CLASSES.map(() => []));
  for(const x of pairs) cell[zoneOf(x.mlat)][kpClass(x.kp)].push(x);
  const raw = cell.map(r => r.map(a => ({n: a.length, ov: mean(a.map(x => x.ov)),
    kv: mean(a.map(x => C.kpVisibility(x.kp, x.mlat).p)), kp: mean(a.map(x => x.kp)), mlat: mean(a.map(x => x.mlat))})));
  const ok = (z, k) => raw[z] && raw[z][k] && raw[z][k].n >= MIN_PAIRS;
  const table = raw.map((r, z) => r.map((c, k) => {
    if(ok(z, k)) return {...c, val: c.ov, unsure: false};
    // lähin ryhmä: viereinen vyöhyke samalla Kp-luokalla keskivyöhykettä kohti, sitten viereinen Kp-luokka
    for(const [z2, k2] of [[1, k], [z, k - 1], [z, k + 1]]) if(ok(z2, k2))
      return {...c, val: raw[z2][k2].ov, unsure: true, from: ZONES[z2] + ' Kp ' + KP_CLASSES[k2]};
    return {...c, val: c.ov, unsure: true, from: 'oma'};
  }));
  return {table, raw};
}
