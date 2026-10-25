#!/bin/bash
# VÄLIAIKAINEN: MET Norway thredds (MNWC, MET Nordic -analyysi), CLM-pikakuva ilman avainta.
set -u
T=https://thredds.met.no/thredds
echo "=== thredds juurikatalogi: mnwc / metpp / nordic"
curl -sS -m 60 "$T/catalog/catalog.xml" | grep -oE '(title|xlink:title|name)="[^"]+"' | grep -iE "mnwc|nowcast|metpp|nordic|meps|analys|satell" | head -30
for C in metpplatest mnwc mnwclatest meps25epslatest; do
  echo "--- $C"; curl -sS -m 60 "$T/catalog/$C/catalog.xml" -w "\nHTTP %{http_code}\n" -o c.xml; tail -1 c.xml
  grep -oE 'name="[^"]+\.nc"' c.xml | head -400 | sed 's/name=//' > n.txt; wc -l < n.txt; grep -iE "cloud|analysis|mnwc|nowcast" n.txt | sort | tail -12
done
echo "=== metpplatest: uusin analyysi + muuttujat"
F=$(curl -sS -m 60 "$T/catalog/metpplatest/catalog.xml" | grep -oE 'urlPath="[^"]*analysis[^"]*nordic[^"]*\.nc"' | sed 's/urlPath="//; s/"//' | sort | tail -1)
echo "tiedosto: $F"
if [ -n "$F" ]; then
  curl -sS -m 60 "$T/dodsC/$F.das" | grep -E "^    [a-z_]+ \{|standard_name|units" | head -60
  curl -sS -m 60 "$T/dodsC/$F.dds" | head -30
  curl -sS -m 60 "$T/dodsC/$F.ascii?time" | tail -3
  echo "  nyt: $(date -u +%FT%TZ)"
fi
echo "=== mnwc-tiedostoja missä tahansa? (metpparchive / mnwcarchive)"
for C in mnwcarchive metpparchive; do curl -sS -m 30 -o /dev/null -w "  $C HTTP %{http_code}\n" "$T/catalog/$C/catalog.xml"; done
echo "=== CLM-pikakuva ilman avainta"
Q=$(curl -sS -m 60 "https://api.eumetsat.int/data/search-products/1.0.0/os?pi=EO:EUM:DAT:0678&format=json&si=0&c=1" | python3 -c "import json,sys; d=json.load(sys.stdin); f=d['features'][0]; print(f['id']); [print(l.get('href')) for l in f['properties']['links'].get('sip-entries',[]) if 'QCK' in (l.get('title') or '') and (l.get('title') or '').endswith('.png')]")
echo "$Q"
U=$(echo "$Q" | tail -1); curl -sS -m 60 -o q.png -w "  pikakuva HTTP %{http_code} %{content_type} %{size_download} B\n" "$U"
echo VALMIS
