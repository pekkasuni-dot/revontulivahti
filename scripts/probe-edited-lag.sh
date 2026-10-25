#!/bin/bash
# VÄLIAIKAINEN: editoidun ennusteen uusin ajo (origintime) 10 min välein -> milloin uusi ajo ilmestyy.
N=${1:-33}
W="https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::edited::weather::scandinavia::grid&parameters=TotalCloudCover"
H="https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::forecast::harmonie::surface::grid&parameters=TotalCloudCover"
prev=""
for i in $(seq 1 $N); do
  now=$(date -u +%FT%H:%MZ)
  o=$(curl -sS -m 60 "$W" | grep -oE '<gml:timePosition>[^<]+' | sed 's/<gml:timePosition>//' | sort | tail -1)
  h=$(curl -sS -m 60 "$H" | grep -oE '<gml:timePosition>[^<]+' | sed 's/<gml:timePosition>//' | sort | tail -1)
  mark=""; [ "$o" != "$prev" ] && mark="  <- UUSI"; prev="$o"
  echo "VIIVE $now editoitu_uusin=$o harmonie_uusin=$h$mark"
  [ $i -lt $N ] && sleep 600
done
