#!/bin/bash
# VÄLIAIKAINEN: (1) MTG FCI CLM -tuotteen kattavuusalue (footprint) Data Storesta, (2) FMI MNWC.
set -u
A=https://api.eumetsat.int/data
echo "=== CLM 0678: yhden tuotteen geometria"
curl -sS -m 60 "$A/search-products/1.0.0/os?pi=EO:EUM:DAT:0678&format=json&si=0&c=1" -o s.json
python3 - <<'PY'
import json
d=json.load(open('s.json')); f=d['features'][0]
g=f.get('geometry'); print('  geometria:', json.dumps(g)[:1500])
p=f['properties']; print('  bbox:', f.get('bbox')); print('  acquisition:', json.dumps(p.get('acquisitionInformation'))[:600]); print('  productInformation:', json.dumps(p.get('productInformation'))[:600])
print('  extra:', json.dumps(p.get('extraInformation'))[:800])
for l in (p.get('links') or {}).get('sip-entries',[])[:20]: print('   entry', l.get('title'))
PY
echo "=== Sama MSG CLM:lle (EO:EUM:DAT:MSG:CLM) ja rajattuna pohjoiseen (bbox 20,68,30,70)"
for Q in "pi=EO:EUM:DAT:MSG:CLM" "pi=EO:EUM:DAT:0678&bbox=20,68,30,70" "pi=EO:EUM:DAT:0678&bbox=20,60,30,62"; do
  curl -sS -m 60 "$A/search-products/1.0.0/os?$Q&format=json&si=0&c=1" | python3 -c "import json,sys; d=json.load(sys.stdin); print('  $Q -> tuloksia', d.get('totalResults'), json.dumps(d['features'][0].get('geometry'))[:300] if d.get('features') else '')"
done
echo "=== FMI WFS: tallennetut kyselyt (mnwc/meps/nowcast/harmonie)"
curl -sS -m 90 "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=listStoredQueries" -o ls.xml
grep -oE 'id="[^"]+"' ls.xml | grep -iE "mnwc|meps|nowcast|harmonie|cloud|analysis" | head -40
echo "=== FMI download: tuottajia kokeiltavaksi"
for P in mnwc_scandinavia_surface mnwc mnwc_surface meps_scandinavia_surface harmonie_scandinavia_surface; do
  curl -sS -m 60 -o t.bin -w "  $P HTTP %{http_code} %{content_type} %{size_download} B\n" \
   "https://opendata.fmi.fi/download?producer=$P&param=TotalCloudCover&bbox=20,66,30,70&format=grib2&projection=EPSG:4326&levels=0&timestep=60"
  [ -s t.bin ] && head -c 200 t.bin | strings | head -3
done
echo VALMIS
