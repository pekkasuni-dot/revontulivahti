// Ajastimen aikataulu (2026-10-23): mikä työnkulku käynnistetään millä
// 5 min herätyksellä. Kaikki ajat UTC. Muuta välit TÄÄLLÄ (säätövakio).
//
//   every + offset: minuutit vuorokauden alusta, joilla (min - offset) % every == 0
//   hours + minute: tiettyinä tunteina tietyllä minuutilla
//
// Minuuttien on oltava 5:llä jaollisia (Worker herää */5). Mallien ajat =
// entiset GitHub-cronit pyöristettynä seuraavaan 5 minuuttiin (julkaisuviiveen
// perustelut työnkulkujen kommenteissa). GitHubin omat cronit jäävät
// harvennettuina varalle; niiden vahti (.github/actions/ajastin-vahti,
// max-age-min työnkulussa) ohittaa varaajon, jos ajastin käynnisti
// työnkulun hiljattain -> ei tuplia.
export const SCHEDULE = [
  {wf: 'alert-dryrun.yml',       every: 15, offset: 5},                                       // hälytykset (kuivaharjoitus)
  {wf: 'camera-status.yml',      every: 10, offset: 0},                                       // kameroiden tila
  {wf: 'pilvidata-ecmwf.yml',    hours: [1, 7, 13, 19], minute: 15},                          // ECMWF 4x vrk
  {wf: 'wind-ecmwf.yml',         hours: [1, 7, 13, 19], minute: 20},
  {wf: 'ecmwf-7d.yml',           hours: [8, 20], minute: 25},                                 // ECMWF 7 vrk 2x vrk
  {wf: 'pilvidata-harmonie.yml', hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 25},           // HARMONIE 3 h
  {wf: 'wind-harmonie.yml',      hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 35},
  {wf: 'pilvidata-icon_eu.yml',  hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 55},           // ICON-EU 3 h (DWD ~2 h 45 min viive)
  {wf: 'wind-icon_eu.yml',       hours: [2, 5, 8, 11, 14, 17, 20, 23], minute: 55},
];

// Herätyksen nimellisaika (ms) -> työnkulut, jotka käynnistetään.
// Cloudflaren scheduledTime on cronin nimellisaika, ei todellinen herätys.
export function dueWorkflows(timeMs, schedule = SCHEDULE){
  const d = new Date(timeMs);
  const h = d.getUTCHours(), m = Math.floor(d.getUTCMinutes() / 5) * 5, mod = h * 60 + m;
  return schedule.filter(s => s.every
    ? (mod - (s.offset || 0)) % s.every === 0 && mod >= (s.offset || 0)
    : s.hours.includes(h) && s.minute === m).map(s => s.wf);
}

// Ajossa oleva tai jonossa oleva ajo (mainilla) -> ei käynnistetä uutta
// (työnkulkujen cancel-in-progress perisi muuten keskeneräisen ajon).
export const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
export function hasActiveRun(runsJson){
  return (runsJson.workflow_runs || []).some(r => ACTIVE.has(r.status));
}
