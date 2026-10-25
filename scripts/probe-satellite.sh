#!/bin/bash
# VÄLIAIKAINEN: EUMETSATin pilvimaski-/pilvityyppituotteet (EUMETView WMS + Data Store -luettelo).
set -u
mkdir -p sat-out; cd sat-out
echo "Nyt (UTC): $(date -u +%FT%TZ)"
curl -sS -m 60 -o caps.xml "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
python3 - <<'PY'
import re
t=open('caps.xml',errors='replace').read()
for m in re.finditer(r'<Layer[^>]*>\s*<Name>([^<]+)</Name>\s*<Title>([^<]*)</Title>',t):
    n,ti=m.group(1),m.group(2)
    seg=t[m.end():m.end()+6000]
    d=re.search(r'<Dimension name="time"[^>]*>([^<]{0,400})',seg)
    tm=d.group(1).strip()[-70:] if d else '-'
    print(f'{n} | {ti} | {tm}')
print()
for n in ('mtg_fd:rgb_cloudtype','mtg_fd:rgb_cloudphase'):
    i=t.find('<Name>'+n+'</Name>'); seg=t[i:i+6000]
    ab=re.search(r'<Abstract>(.*?)</Abstract>',seg,re.S)
    print('ABSTRACT',n,':',re.sub(r'\s+',' ',ab.group(1))[:1200] if ab else None)
for m in re.finditer(r'<Name>([^<]*(?:clm|cma|cld|cloud_mask|cloudmask|ctype|ct_|nwc|cth|ctth)[^<]*)</Name>',t,re.I):
    n=m.group(1); seg=t[m.start():m.start()+6000]
    ab=re.search(r'<Abstract>(.*?)</Abstract>',seg,re.S)
    print('PILVITUOTE',n,':',re.sub(r'\s+',' ',ab.group(1))[:600] if ab else None)
PY
echo; echo "=== Data Store -luettelo (ilman avainta?) ==="
for q in "cloud%20mask" "cloud%20type" "FCI%20Level%202" "NWC%20SAF"; do
  echo "--- haku: $q"
  curl -sS -m 60 "https://api.eumetsat.int/data/browse/collections?format=json&q=$q" -o c.json -w "HTTP %{http_code}\n"
  python3 - <<'PY'
import json
try:
    d=json.load(open('c.json'))
except Exception as e:
    print('ei JSON:',open('c.json',errors='replace').read()[:300]); raise SystemExit
items=d.get('links') or d.get('collections') or d.get('features') or []
print('osumia',len(items))
for it in items[:25]:
    print(' ',{k:(str(v)[:140]) for k,v in it.items() if k in ('title','href','id','abstract')})
PY
done
for C in EO:EUM:DAT:0678 EO:EUM:DAT:0680 EO:EUM:DAT:0681 EO:EUM:DAT:MSG:CLM; do
  echo "--- kokoelma $C"
  curl -sS -m 60 "https://api.eumetsat.int/data/browse/collections/$C?format=json" -o k.json -w "HTTP %{http_code}\n"
  python3 -c "
import json
try:
  d=json.load(open('k.json'));print({k:str(v)[:300] for k,v in d.items() if k in ('title','abstract','timeliness','frequency','license','properties')})
except Exception as e: print(open('k.json',errors='replace').read()[:300])"
done
echo VALMIS
