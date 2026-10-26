// VÄLIAIKAINEN koehaku (poistetaan ennen yhdistämistä): ennustevertailulokin lähteet.
const UA = {'User-Agent': 'revontulivahti (github.com/pekkasuni-dot/revontulivahti)'};
async function get(url){ const r = await fetch(url, {headers: UA}); const t = await r.text(); return {status: r.status, t}; }
const show = (name, r, n = 600) => console.log(`\n=== ${name}: HTTP ${r.status}, ${r.t.length} merkkiä\n${r.t.slice(0, n)}`);
const TS = 'https://opendata.fmi.fi/timeseries?';
const q = o => new URLSearchParams(o).toString();
// 1. Pisteennusteet ja horisontti
for(const producer of ['pal_skandinavia', 'harmonie_scandinavia_surface']){
  const r = await get(TS + q({producer, param: 'time,origintime,TotalCloudCover', latlons: '67.42,26.6,69.75,20.6', format: 'json', tz: 'UTC', starttime: 'now', endtime: '+12d', timestep: '60'}));
  show(producer + ' (2 pistettä)', r, 400);
  try{ const j = JSON.parse(r.t); const a = Array.isArray(j) ? j : Object.values(j).flat();
    console.log('rivejä', a.length, 'ensimmäinen', JSON.stringify(a[0]), 'viimeinen', JSON.stringify(a[a.length - 1])); }catch(e){ console.log('JSON-virhe', e.message); }
}
// Vanhempi ajo nimellä (origintime) - toimiiko pisteelle?
{ const r = await get(TS + q({producer: 'pal_skandinavia', param: 'time,origintime,TotalCloudCover', latlon: '67.42,26.6', format: 'json', tz: 'UTC', timesteps: '3', origintime: new Date(Date.now() - 6*3600e3).toISOString().slice(0, 13) + ':40:00Z'}));
  show('pal origintime -6h', r, 400); }
// 2. Havainnot: timeseries
for(const producer of ['observations_fmi', 'opendata', 'fmi']){
  const r = await get(TS + q({producer, fmisid: '101932', param: 'time,TotalCloudCover,n_man', format: 'json', tz: 'UTC', starttime: '-3h', endtime: 'now', timestep: '60'}));
  show('obs timeseries ' + producer, r, 300);
}
// 3. Havainnot: WFS, kaikki asemat bboxissa, n_man (oktaa)
{ const r = await get('https://opendata.fmi.fi/wfs?' + q({service: 'WFS', version: '2.0.0', request: 'getFeature', storedquery_id: 'fmi::observations::weather::multipointcoverage',
    bbox: '19,64.5,30,70.2', parameters: 'n_man', timestep: '60', starttime: new Date(Date.now() - 3*3600e3).toISOString().slice(0, 13) + ':00:00Z'}));
  show('WFS multipointcoverage n_man', r, 300);
  const names = [...r.t.matchAll(/<gml:name>([^<]+)<\/gml:name>/g)].map(m => m[1]);
  const ids = [...r.t.matchAll(/<gml:identifier codeSpace="[^"]*">(\d+)<\/gml:identifier>/g)].map(m => m[1]);
  const pos = [...r.t.matchAll(/<gml:pos>([^<]+)<\/gml:pos>/g)].map(m => m[1].trim());
  console.log('asemia', ids.length);
  ids.forEach((id, i) => console.log(id, names[i * 3] || names[i], pos[i]));
  const vals = r.t.match(/<gml:doubleOrNilReasonTupleList>([\s\S]*?)<\/gml:doubleOrNilReasonTupleList>/);
  console.log('arvot:', vals ? vals[1].trim().split(/\s+/).join(' ').slice(0, 1500) : '-');
  const pts = r.t.match(/<gmlcov:positions>([\s\S]*?)<\/gmlcov:positions>/);
  console.log('pisteet:', pts ? pts[1].trim().split(/\n/).slice(0, 60).map(s => s.trim()).join(' | ').slice(0, 3000) : '-');
}
// 4. METAR (Tromssa, Sørkjosen, Bardufoss + suomalaiset kentät)
{ const r = await get('https://aviationweather.gov/api/data/metar?' + q({ids: 'ENTC,ENSR,ENDU,EFRO,EFKT,EFIV,EFOU,EFSO,EFET', hours: '2', format: 'json'}));
  show('METAR', r, 300);
  try{ for(const m of JSON.parse(r.t)) console.log(m.icaoId, m.reportTime, JSON.stringify(m.clouds), m.rawOb); }catch(e){ console.log(e.message); } }
// 5. MET Norway Frost ilman avainta (odotus: 401)
{ const r = await get('https://frost.met.no/observations/v0.jsonld?sources=SN90450&elements=cloud_area_fraction&referencetime=latest'); show('Frost ilman avainta', r, 200); }
