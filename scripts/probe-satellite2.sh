#!/bin/bash
# VÄLIAIKAINEN: julkiset (avaimettomat) metatiedot. Ei latauksia, ei avaimia.
set -u
sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1
A=https://api.eumetsat.int/data
echo "=== Data Store: kokoelmat, joissa Cloud + MTG/FCI"
curl -sS -m 60 "$A/browse/collections?format=json" -o cols.json
python3 - <<'PY'
import json
d=json.load(open('cols.json'))
L=d.get('links') or d.get('collections') or d
for c in (L if isinstance(L,list) else []):
    t=(c.get('title') or '')
    if any(k in t.lower() for k in ('cloud','pps','ears')) : print(' ',c.get('href','').split('/')[-1] or c.get('id'), '|', t)
PY
for C in EO:EUM:DAT:0678 EO:EUM:DAT:0800; do
  echo "=== $C kuvaus"
  curl -sS -m 60 "$A/browse/collections/$C?format=json" -o c.json
  python3 - <<'PY'
import json
d=json.load(open('c.json')); p=d.get('properties',d)
for k in ('title','abstract','timeliness','satellite','productLevel','license','rights','useLimitation','accessConstraint','updated','date','frequency','dataPolicy'):
    v=p.get(k)
    if v: print(f'  {k}: {str(v)[:700]}')
print('  avaimet:', list(p.keys())[:40])
PY
  echo "--- uusimmat tuotteet (aika, koko, julkaisu)"
  curl -sS -m 60 "$A/search-products/1.0.0/os?pi=$C&format=json&si=0&c=6" -o s.json
  python3 - <<'PY'
import json,datetime as D
d=json.load(open('s.json')); now=D.datetime.now(D.timezone.utc)
for f in d.get('features',[])[:6]:
    p=f.get('properties',{})
    end=(p.get('date') or '').split('/')[-1]
    pub=(p.get('updated') or p.get('published') or '')
    size=(p.get('productInformation',{}).get('size') or p.get('size'))
    try: lag=(now-D.datetime.fromisoformat(end.replace('Z','+00:00'))).total_seconds()/60
    except Exception: lag=-1
    print(' ',f.get('id','')[-90:], '| havainto loppui', end, f'| nyt-viive {lag:.0f} min | julkaistu', pub, '| koko', size)
print('  properties-avaimet:', list(d.get('features',[{}])[0].get('properties',{}).keys()))
PY
done
echo "=== EUMETView: mtg_fd- ja msg_fes-tasot, joissa cloud/clm/ct"
curl -sS -m 90 -o caps.xml "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
python3 - <<'PY'
import re
t=open('caps.xml',errors='replace').read()
for n,ti in re.findall(r'<Name>([^<]+)</Name>\s*<Title>([^<]+)</Title>',t):
    if re.search(r'cloud|clm|cth|\bct\b|cma',(n+' '+ti).lower()): print(' ',n,'|',ti)
PY
echo "=== Datapolitiikka 2026-01: Core-määritelmä"
curl -sS -m 60 -o dp.pdf "https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf" -w "HTTP %{http_code} %{size_download}\n"
pdftotext -layout dp.pdf dp.txt 2>/dev/null && grep -n -i -E "core|level 2|derived|advanced image|hourly|latency|attribution|contains" dp.txt | head -60
echo "=== MET Norway thredds"
for u in "https://thredds.met.no/thredds/catalog/remotesensingsatellite/catalog.html" "https://thredds.met.no/thredds/catalog/remotesensingsatellite/polar-swath/catalog.html" "https://thredds.met.no/thredds/catalog/remotesensing/catalog.html"; do
  echo "--- $u"; curl -sS -m 60 "$u" | grep -oE "<tt>[^<]+</tt>|href='[^']+catalog.html'" | sed "s/<[^>]*>//g" | head -40
done
echo "=== api.met.no geosatellite / polarsatellite"
curl -sS -m 30 -A "revontulivahti-selvitys github.com/pekkasuni-dot" "https://api.met.no/weatherapi/geosatellite/1.4/available.json" | head -c 800; echo
curl -sS -m 30 -A "revontulivahti-selvitys github.com/pekkasuni-dot" "https://api.met.no/weatherapi/polarsatellite/1.1/available.json" | head -c 800; echo
echo "=== SMHI NWC SAF PPS -demo"
curl -sS -m 30 "https://nwcsaf.smhi.se/pps_cloud_product_demonstration.php" | sed 's/<[^>]*>/ /g' | tr -s ' \n' | grep -i -E "cloud|copyright|update|minute|scandinavia" | head -20
echo VALMIS
