// Ajastimen aikataulu (2026-10-23): mikä työnkulku käynnistetään millä
// 5 min herätyksellä. Kaikki ajat UTC. Muuta välit TÄÄLLÄ (säätövakio).
//
//   every + offset: minuutit vuorokauden alusta, joilla (min - offset) % every == 0
//   hours + minute: tiettyinä tunteina tietyllä minuutilla
//
// Minuuttien on oltava 5:llä jaollisia (Worker herää */5). Mallien ajat =
// entiset GitHub-cronit pyöristettynä seuraavaan 5 minuuttiin (julkaisuviiveen
// perustelut työnkulkujen kommenteissa). GitHubin omat cronit jäävät
// varalle (ennallaan; harvennus erikseen, kun ajastin on toiminut >= 3 vrk);
// niiden vahti (.github/actions/ajastin-vahti,
// max-age-min työnkulussa) ohittaa varaajon, jos ajastin käynnisti
// työnkulun hiljattain -> ei tuplia.
export const SCHEDULE = [
  // 2026-11-11: alert-dryrun.yml (ntfy-kuivaharjoitus, päättyi 6.11.) poistettu; tilalle FCM-hälytysajo 30 min (päätös 38).
  // alert-fcm.yml:n oma varajastus (cron xx.17) + vahti 60 min jäävät; concurrency-ryhmä alert-fcm sarjoittaa ajot.
  {wf: 'alert-fcm.yml',          every: 30, offset: 5},                                       // hälytysajo (FCM) xx.05 ja xx.35
  // Päätös 55 (2026-11-15): kamerat 15 min, kun jollain kameralla on pimeää (aurinko < CAMERA_DARK_DEG),
  // muuten tasatunnein (lightEvery). Ennen 10 min. Ks. cameraAreaDark() alla ja OHJE-ajastin.md.
  {wf: 'camera-status.yml',      every: 15, offset: 0, lightEvery: 60},                    // kameroiden tila
  {wf: 'pilvidata-ecmwf.yml',    hours: [1, 7, 13, 19], minute: 15},                          // ECMWF 4x vrk
  {wf: 'wind-ecmwf.yml',         hours: [1, 7, 13, 19], minute: 20},
  {wf: 'ecmwf-7d.yml',           hours: [8, 20], minute: 25},                                 // ECMWF 7 vrk 2x vrk
  {wf: 'pilvidata-harmonie.yml', hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 25},           // HARMONIE 3 h
  {wf: 'wind-harmonie.yml',      hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 35},
  {wf: 'pilvidata-icon_eu.yml',  hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 55},           // ICON-EU 3 h (DWD ~2 h 45 min viive)
  {wf: 'wind-icon_eu.yml',       hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 55},
  {wf: 'pilvidata-edited.yml',   every: 60, offset: 25},                                      // FMI editoitu (Tänä yönä), tunnin välein xx.25
  {wf: 'ennustevertailu.yml',    every: 60, offset: 30},                                      // ennustevertailuloki xx.30 (2026-10-27, väliaikainen, MUISTIO-selvitykset.md)
];

// Kameratahti (päätös 55, 2026-11-15). Raja: auringon korkeus -6° (sama kuin sovelluksen
// SUN_DARK_DEG / darknessFactor). Pimeää = aurinko alle rajan VÄHINTÄÄN YHDELLÄ kameralla.
// Päätöksen teksti mainitsee pohjoisimman ja eteläisimmän pisteen, mutta kamerat ulottuvat
// Siperiasta (111 °E) Kanadaan (-114 °E), joten kaksi pistettä ei kata pituusasteita: vuoden
// 15 min ruuduista 19 % on pimeitä jollain kameralla mutta valoisia kummassakin ääripisteessä
// (esim. 1.9.: 38 vs. 91 pimeää ruutua). Tarkoitus "15 min tahti alkaa, kun pimeys alkaa missä
// tahansa kamera-alueella" toteutuu vain kaikilla kameroilla. Lista = data/cameras.json
// (tests/ajastin.test.mjs tarkistaa, että ne täsmäävät). Uusi kamera -> lisää tähän.
export const CAMERA_DARK_DEG = -6;
export const CAMERA_POINTS = [
  [67.8, 24.8],   // levi,
  [69.05, 20.79],   // kilpisjarvi,
  [66.578, 26.015],   // apukka,
  [66.08, 28.17],   // posio,
  [69.75, 20.6],   // lyngen-north,
  [64.14, -21.9],   // aurora-reykjavik,
  [67.42, 26.6],   // sodankyla,
  [67.139, 26.896],   // luosto,
  [64.26, 23.95],   // kalajoki,
  [65.03, 25.41],   // oulu-nallikari,
  [69.908, 27.027],   // utsjoki,
  [64.19, -51.68],   // nuuk,
  [72.79, -56.13],   // upernavik,
  [69.24, -51.06],   // ilulissat,
  [62.254, 26.596],   // hankasalmi,
  [78.148, 16.043],   // longyearbyen-kho,
  [66.959, 19.81],   // porjus,
  [65.95, 111.51],   // aikhal,
  [60.006, -111.93],   // fort-smith,
  [56.35, -94.66],   // gillam,
  [62.45, -114.37],   // yellowknife-auroramax,
  [48.0, -88.9],   // isle-royale,
  [68.3617, 18.7234],   // abisko-aurora-sky-station,
  [67.79, 24.86],   // levi-iglut,
  [69.65, 18.96],   // tromso,
  [66.33, 22.84],   // overkalix,
  [65.87, -17.42],   // adaldalshraun,
  [64.26, -21.13],   // golden-circle,
  [69.87, 27.02],   // utsjoki-2,
  [58.73, -93.82],   // churchill,
  [64.84, -147.72],   // fairbanks-explore,
  [64.9, -147.5],   // fairbanks-aurora-camp,
  [60.72, -135.05],   // yukon-kaleido,
  [65.73, -19.11],   // holar,
  [66.8247, 24.8734],   // rattosjarvi,
  [71.11, 25.82],   // skarsvag,
  [65.846, 24.147],   // tornio,
  [65.614, 27.585],   // iso-syote,
  [66.5, 25.73],   // aurora-alert-realtime,
  [45.63, -72.96],   // st-hyacinthe,
  [67.841, 20.411],   // kiruna-irf
];

// Auringon korkeus asteina (sama kaava kuin aurora-core.js sunAltitude, testi vertaa).
export function sunAltitude(date, lat, lon){
  const rad = Math.PI / 180;
  const d = (date / 86400000) - 10957.5;
  const g = rad * (357.529 + 0.98560028 * d);
  const q = 280.459 + 0.98564736 * d;
  const L = rad * (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  const e = rad * (23.439 - 0.00000036 * d);
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const GMST = (18.697374558 + 24.06570982441908 * d) % 24;
  const LST = rad * ((GMST * 15 + lon) % 360);
  const H = LST - RA;
  return Math.asin(Math.sin(rad * lat) * Math.sin(dec) + Math.cos(rad * lat) * Math.cos(dec) * Math.cos(H)) / rad;
}
export function cameraAreaDark(timeMs, points = CAMERA_POINTS, deg = CAMERA_DARK_DEG){
  return points.some(([lat, lon]) => sunAltitude(timeMs, lat, lon) < deg);
}

// Herätyksen nimellisaika (ms) -> työnkulut, jotka käynnistetään.
// Cloudflaren scheduledTime on cronin nimellisaika, ei todellinen herätys.
export function dueWorkflows(timeMs, schedule = SCHEDULE){
  const d = new Date(timeMs);
  const h = d.getUTCHours(), m = Math.floor(d.getUTCMinutes() / 5) * 5, mod = h * 60 + m;
  const nominal = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m);
  let dark;   // lasketaan vain tarvittaessa
  const every = s => s.lightEvery && !(dark ??= cameraAreaDark(nominal)) ? s.lightEvery : s.every;
  return schedule.filter(s => s.every
    ? (mod - (s.offset || 0)) % every(s) === 0 && mod >= (s.offset || 0)
    : s.hours.includes(h) && s.minute === m).map(s => s.wf);
}

// Ajossa oleva tai jonossa oleva ajo (mainilla) -> ei käynnistetä uutta
// (työnkulkujen cancel-in-progress perisi muuten keskeneräisen ajon).
export const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
export function hasActiveRun(runsJson){
  return (runsJson.workflow_runs || []).some(r => ACTIVE.has(r.status));
}
