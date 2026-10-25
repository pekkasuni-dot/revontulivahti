#!/bin/bash
# VÄLIAIKAINEN: editoitu ennuste (tiedostoviite, tuottaja, pilvisyys) + MET Norway thredds-sääennusteet.
set -u
W="https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0"
curl -sS -m 90 "$W&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::grid&parameters=TotalCloudCover" -o e.xml
echo "=== edited: tiedostoviitteet ja ajat"
grep -oE 'fileReference>[^<]+' e.xml | sed 's/&amp;/\&/g' | head -4
grep -oE '<gml:(timePosition|beginPosition|endPosition|lowerCorner|upperCorner)>[^<]+' e.xml | sort -u
REF=$(grep -oE 'fileReference>[^<]+' e.xml | tail -1 | sed 's/fileReference>//; s/&amp;/\&/g')
P=$(echo "$REF" | grep -oE 'producer=[^&]+' | cut -d= -f2); echo "tuottaja: $P"
echo "=== edited: pilvisyys Rovaniemi/Utsjoki/Kilpisjärvi (timeseries, origintime)"
for PL in Rovaniemi Utsjoki Kilpisjärvi; do
  curl -sS -m 60 "https://opendata.fmi.fi/timeseries?producer=$P&param=time,origintime,TotalCloudCover&place=$PL&format=json&timesteps=6" -w "  <- $PL HTTP %{http_code}\n" | head -c 700; echo
done
echo "=== edited: koko alue (grib bbox ilman rajausta) ja aika-askel"
curl -sS -m 120 -o ed.grib2 "$(echo "$REF" | sed -E 's/&bbox=[^&]*//')" -w "HTTP %{http_code} %{size_download}\n"
pip install -q eccodes cfgrib xarray >/dev/null 2>&1
python3 - <<'PY'
import xarray as xr, numpy as np
try:
    d=xr.open_dataset('ed.grib2',engine='cfgrib'); v=list(d.data_vars)[0]; a=d[v]
    print(d); print('lat',float(d.latitude.min()),float(d.latitude.max()),'lon',float(d.longitude.min()),float(d.longitude.max()))
    vt=a.valid_time.values if 'valid_time' in a.coords else None
    if vt is not None and np.size(vt)>1: print('askeleet', [str(x)[:16] for x in np.ravel(vt)[:6]], '...', str(np.ravel(vt)[-1])[:16], 'n', np.size(vt))
    print('NaN-osuus', float(np.isnan(a.values).mean()), 'max', float(np.nanmax(a.values)))
except Exception as e: print('lukuvirhe', e)
PY
echo "=== MET Norway thredds: sääennusteiden katalogi"
curl -sS -m 60 "https://thredds.met.no/thredds/catalog/metno.xml" -w "\nHTTP %{http_code}\n" | grep -oE '(xlink:title|xlink:href)="[^"]+"|HTTP [0-9]+' | head -80
echo VALMIS
