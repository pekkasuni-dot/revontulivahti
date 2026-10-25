#!/bin/bash
# VÄLIAIKAINEN: (1) MTG FCI CLM -kokoelman kuvaus (leveyspiiriraja?), (2) FMI MNWC pilvisyys.
set -u
A=https://api.eumetsat.int/data
echo "=== EO:EUM:DAT:0678 kuvaus"
for u in "$A/browse/1.0.0/collections/EO%3AEUM%3ADAT%3A0678?format=json" "$A/browse/collections/EO%3AEUM%3ADAT%3A0678?format=json"; do
  curl -sS -m 60 "$u" -o c.json -w "$u HTTP %{http_code}\n"; python3 - <<'PY'
import json,re
try: d=json.load(open('c.json'))
except Exception: print(open('c.json').read()[:300]); raise SystemExit
def walk(o,k=''):
    if isinstance(o,dict):
        for a,b in o.items(): walk(b,a)
    elif isinstance(o,list):
        for b in o: walk(b,k)
    elif isinstance(o,str) and len(o)>40: print(f'  [{k}] {o[:2500]}')
walk(d)
PY
done
curl -sS -m 60 "https://user.eumetsat.int/catalogue/EO:EUM:DAT:0678" | sed 's/<[^>]*>/ /g' | tr -s ' \n' | grep -i -E "latitud|67|viewing|zenith|limit|north" | head -20
echo "=== FMI WFS: MNWC-tallennetut kyselyt"
curl -sS -m 90 "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=describeStoredQueries" -o sq.xml
python3 - <<'PY'
import re
t=open('sq.xml',errors='replace').read()
for m in re.finditer(r'<StoredQueryDescription id="([^"]+)">(.*?)</StoredQueryDescription>',t,re.S):
    i,b=m.groups()
    if 'mnwc' in i.lower() or 'nowcast' in i.lower():
        ti=re.search(r'<Title>([^<]*)</Title>',b); ab=re.search(r'<Abstract>([^<]*)</Abstract>',b,re.S)
        print(' ',i,'|',ti.group(1) if ti else '','|',(ab.group(1).strip()[:500] if ab else '').replace('\n',' '))
PY
echo "=== MNWC pistesarja Inari: TotalCloudCover (ajo, aika-askeleet)"
curl -sS -m 60 "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::mnwc::surface::point::multipointcoverage&place=Inari&parameters=TotalCloudCover,LowCloudCover" -o p.xml -w "HTTP %{http_code}\n"
grep -oE "<(gml:beginPosition|gml:endPosition|omso:resultTime|gml:timePosition)>[^<]+" p.xml | sort | uniq | head -10
grep -oE "<om:resultTime>.{0,200}" p.xml | head -2
python3 - <<'PY'
import re
t=open('p.xml',errors='replace').read()
v=re.search(r'<gml:doubleOrNilReasonTupleList>(.*?)</gml:doubleOrNilReasonTupleList>',t,re.S)
pos=re.search(r'<gmlcov:positions>(.*?)</gmlcov:positions>',t,re.S)
if v and pos:
    P=pos.group(1).split(); V=v.group(1).split()
    print('  ensimmäiset/viimeiset:',[(P[i*3+2],V[i*2],V[i*2+1]) for i in (0,1,2,-1)] if len(P)>9 else (P,V))
else: print(t[:1500])
PY
echo "=== MNWC grid: tiedostoviitteet (tuottaja, alue, ajo)"
curl -sS -m 90 "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::mnwc::surface::grid&parameters=TotalCloudCover" -o g.xml -w "HTTP %{http_code}\n"
grep -oE "<omso:fileReference>[^<]+|<gml:lowerCorner>[^<]+|<gml:upperCorner>[^<]+|<gml:timePosition>[^<]+|<gml:beginPosition>[^<]+|<gml:endPosition>[^<]+" g.xml | sed 's/&amp;/\&/g' | sort -u | head -20
grep -c "<wfs:member>" g.xml
REF=$(grep -oE "<omso:fileReference>[^<]+" g.xml | head -1 | sed 's/<omso:fileReference>//; s/&amp;/\&/g')
echo "--- lataus: $REF"
if [ -n "$REF" ]; then
  U=$(echo "$REF" | sed -E 's/format=[a-z0-9]+/format=grib2/; s/&bbox=[^&]*//')"&bbox=5,55,35,72.5&projection=EPSG:4326"
  echo "$U"
  curl -sS -m 120 -o mnwc.grib2 "$U" -w "HTTP %{http_code} %{size_download} B\n"
  pip install -q eccodes cfgrib xarray numpy >/dev/null 2>&1
  python3 - <<'PY'
import xarray as xr, numpy as np
try:
    ds=xr.open_dataset('mnwc.grib2',engine='cfgrib')
    print(ds)
    v=list(ds.data_vars)[0]; a=ds[v]
    lat=ds.latitude.values; print('  lat',float(lat.min()),float(lat.max()),'lon',float(ds.longitude.min()),float(ds.longitude.max()))
    x=a.values; print('  NaN-osuus',float(np.isnan(x).mean()),'min/max',float(np.nanmin(x)),float(np.nanmax(x)))
    if 'step' in a.dims: print('  askeleet',a.step.values[:5]/3.6e12)
except Exception as e: print('lukuvirhe',e)
PY
fi
echo VALMIS
