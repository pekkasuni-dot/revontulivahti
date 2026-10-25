#!/bin/bash
# VÄLIAIKAINEN: löytyykö MNWC FMI:n avoimesta datasta (WFS, download) tai MET Norwayn thredds:stä.
set -u
W="https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0"
echo "=== FMI: kaikki forecast-kyselyt"
curl -sS -m 90 "$W&request=listStoredQueries" | grep -oE 'id="[^"]+"' | grep -i forecast | sort
echo "=== FMI: kuvaukset joissa nowcast/mnwc/lähiennuste"
curl -sS -m 90 "$W&request=describeStoredQueries" -o d.xml
python3 - <<'PY'
import re
t=open('d.xml',errors='replace').read()
for m in re.finditer(r'<StoredQueryDescription[^>]*id="([^"]+)"[^>]*>(.*?)</StoredQueryDescription>',t,re.S):
    i,b=m.groups()
    if re.search(r'nowcast|mnwc|lähiennuste|nwc',b,re.I) or re.search(r'nowcast|mnwc',i,re.I):
        ti=re.search(r'<Title>([^<]*)',b); ab=re.search(r'<Abstract>([^<]*)',b)
        print(' ',i,'|',ti and ti.group(1),'|',(ab.group(1) if ab else '')[:400].replace('\n',' '))
        for p in re.findall(r'<Parameter name="([^"]+)"',b)[:30]: print('     param',p)
PY
echo "=== FMI download: tuottajakokeilut"
for P in mnwc mnwc_scandinavia mnwc_scandinavia_surface mnwc_surface nowcast nowcast_scandinavia_surface mnwcfmi mnwc_fmi meps_scandinavia_surface meps_surface harmonie_scandinavia_surface edited fmi_nowcast; do
  curl -sS -m 40 -o t.bin -w "  $P HTTP %{http_code} %{content_type} %{size_download}\n" \
   "https://opendata.fmi.fi/download?producer=$P&param=TotalCloudCover&bbox=24,66,26,67&format=grib2&projection=EPSG:4326&levels=0&timestep=60"
  [ -s t.bin ] && head -c 300 t.bin | strings | head -2
done
echo "=== FMI WFS getFeature: grid-kyselyt fileReference -> tuottajanimet"
for Q in fmi::forecast::harmonie::surface::grid fmi::forecast::meps::surface::grid; do
  curl -sS -m 90 "$W&request=getFeature&storedquery_id=$Q&parameters=TotalCloudCover" | grep -oE '<omso:fileReference>[^<]+|<gml:timePosition>[^<]+|<gml:beginPosition>[^<]+|<gml:endPosition>[^<]+' | sed 's/&amp;/\&/g' | head -6
done
echo "=== FMI meta/producers-hakuja"
for U in "https://opendata.fmi.fi/meta?producer=mnwc" "https://opendata.fmi.fi/download?producer=mnwc" "https://opendata.fmi.fi/timeseries?producer=mnwc&param=TotalCloudCover,origintime&place=Rovaniemi&format=json" "https://opendata.fmi.fi/timeseries?producer=mnwc_scandinavia_surface&param=TotalCloudCover&place=Rovaniemi&format=json"; do
  curl -sS -m 40 "$U" -w "\n  <- $U HTTP %{http_code}\n" | head -c 600; echo
done
echo "=== MET Norway thredds: katalogit (nowcast/mnwc)"
curl -sS -m 60 "https://thredds.met.no/thredds/catalog/catalog.xml" | grep -oE '(xlink:title|name|xlink:href)="[^"]+"' | head -120
for C in mepslatest mnwc nowcast metpplatest; do
  echo "--- $C"; curl -sS -m 60 "https://thredds.met.no/thredds/catalog/$C/catalog.xml" | grep -oE 'name="[^"]+"' | grep -iE "nwc|nowcast|mnwc|det_" | sort | tail -8
done
echo VALMIS
