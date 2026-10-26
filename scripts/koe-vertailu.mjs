// VÄLIAIKAINEN koehaku (poistetaan ennen yhdistämistä): pisteennusteiden horisontti.
const UA = {'User-Agent': 'revontulivahti (github.com/pekkasuni-dot/revontulivahti)'};
const iso = ms => new Date(ms).toISOString().slice(0, 19) + 'Z';
const h0 = Math.floor(Date.now() / 3600e3) * 3600e3;
for(const producer of ['pal_skandinavia', 'harmonie_scandinavia_surface']){
  const q = new URLSearchParams({producer, param: 'time,origintime,TotalCloudCover', latlon: '67.42,26.6', format: 'json', tz: 'UTC',
    starttime: iso(h0), endtime: iso(h0 + 240 * 3600e3), timestep: '60'});
  const r = await fetch('https://opendata.fmi.fi/timeseries?' + q, {headers: UA}); const t = await r.text();
  try{ const a = JSON.parse(t), ok = a.filter(x => x.TotalCloudCover != null);
    console.log(producer, 'rivejä', a.length, 'arvoja', ok.length, 'ensimmäinen', JSON.stringify(a[0]), 'viimeinen arvo', JSON.stringify(ok[ok.length - 1]));
  }catch(e){ console.log(producer, r.status, t.slice(0, 200)); }
}
