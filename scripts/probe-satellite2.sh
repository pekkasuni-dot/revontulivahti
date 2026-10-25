#!/bin/bash
# VÄLIAIKAINEN: julkiset (avaimettomat) metatiedot. Ei latauksia, ei avaimia.
set -u
pip install -q pypdf >/dev/null 2>&1
A=https://api.eumetsat.int/data
echo "=== Data Store: kokoelmat (cloud/pps/ears/mtg l2)"
curl -sS -m 60 -H "Accept: application/json" "$A/browse/collections?format=json" -o cols.json; head -c 300 cols.json; echo
python3 - <<'PY'
import json,re
t=open('cols.json').read()
try:
    d=json.loads(t)
    def walk(o):
        if isinstance(o,dict):
            ti=o.get('title') or ''
            if ti and re.search(r'cloud|pps|ears|nwc',ti,re.I): print('  ',o.get('href') or o.get('id'),'|',ti)
            for v in o.values(): walk(v)
        elif isinstance(o,list):
            for v in o: walk(v)
    walk(d)
except Exception as e: print('ei json',e)
PY
for C in EO:EUM:DAT:0678; do
  echo "=== $C kuvaus (raaka)"
  curl -sS -m 60 -H "Accept: application/json" "$A/browse/collections/$C?format=json" | head -c 3000; echo
  echo "--- yksi tuote kokonaan"
  curl -sS -m 60 "$A/search-products/1.0.0/os?pi=$C&format=json&si=0&c=1" | head -c 3500; echo
done
echo "=== Datapolitiikka 2026-01"
curl -sS -m 60 -o dp.pdf "https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf"
python3 - <<'PY'
from pypdf import PdfReader
import re
t='\n'.join(p.extract_text() or '' for p in PdfReader('dp.pdf').pages)
for l in t.split('\n'):
    if re.search(r'core|level 2|level-2|derived|advanced image|hourly|latency|contains|cc by',l,re.I): print('  ',l.strip()[:220])
PY
echo "=== MET Norway thredds (raaka)"
for u in "https://thredds.met.no/thredds/catalog/remotesensingsatellite/catalog.html" "https://thredds.met.no/thredds/catalog/remotesensingsatellite/polar-swath/catalog.html" "https://thredds.met.no/thredds/catalog/catalog.html"; do
  echo "--- $u"; curl -sS -m 60 -w "\nHTTP %{http_code}\n" "$u" | sed 's/<[^>]*>/ /g' | tr -s ' ' | grep -v '^ *$' | head -45
done
echo VALMIS
