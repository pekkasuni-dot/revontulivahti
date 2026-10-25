#!/bin/bash
# VÄLIAIKAINEN: MNWC muualla? FMI:n tuottajalistat, editoitu ennuste, MET Norwayn thredds-katalogi.
set -u
W="https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0"
echo "=== FMI: tuottajalistat"
for U in "https://opendata.fmi.fi/admin?what=producers" "https://opendata.fmi.fi/admin?what=qengine" "https://opendata.fmi.fi/timeseries?what=producers" "https://opendata.fmi.fi/download?what=producers"; do
  curl -sS -m 40 "$U" -w "\n  <- $U HTTP %{http_code}\n" | head -c 1500; echo
done
echo "=== FMI: edited::weather::scandinavia kuvaus"
curl -sS -m 90 "$W&request=describeStoredQueries&storedquery_id=fmi::forecast::edited::weather::scandinavia::grid" | sed 's/<[^>]*>/ /g' | tr -s ' \n' | head -c 2500; echo
echo "=== edited grid TotalCloudCover: fileReference, ajo, aikaväli"
curl -sS -m 90 "$W&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::grid&parameters=TotalCloudCover" -o e.xml -w "HTTP %{http_code}\n"
grep -oE '<omso:fileReference>[^<]+|<gml:timePosition>[^<]+|<gml:beginPosition>[^<]+|<gml:endPosition>[^<]+|<gml:lowerCorner>[^<]+|<gml:upperCorner>[^<]+' e.xml | sed 's/&amp;/\&/g' | sort -u | head
REF=$(grep -oE '<omso:fileReference>[^<]+' e.xml | head -1 | sed 's/<omso:fileReference>//; s/&amp;/\&/g')
echo "REF $REF"
echo "=== edited pistesarja Rovaniemi (origintime, aika-askel)"
curl -sS -m 60 "https://opendata.fmi.fi/timeseries?producer=pal_skandinavia&param=time,origintime,TotalCloudCover&place=Rovaniemi&format=json&starttime=now&timesteps=8" -w "\n HTTP %{http_code}\n" | head -c 800; echo
echo "=== MET Norway thredds metno.xml (sääennusteet)"
curl -sS -m 60 "https://thredds.met.no/thredds/metno.xml" | grep -oE '(xlink:title|name|xlink:href)="[^"]+"' | grep -v Service | head -80
echo VALMIS
