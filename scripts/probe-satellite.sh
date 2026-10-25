#!/bin/bash
# VÄLIAIKAINEN: satelliittilähteiden koehaku, 2. kierros (ks. .github/workflows/sat-probe.yml).
set -u
mkdir -p sat-out; cd sat-out
UA="AuroraAwesome/0.1 github.com/pekkasuni-dot/revontulivahti"
echo "Nyt (UTC): $(date -u +%FT%TZ)"
pip install -q pypdf pillow numpy >/dev/null 2>&1
curl -sS -m 60 -o policy.pdf "https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf"
python3 - <<'PY'
import re
from pypdf import PdfReader
t='\n'.join(p.extract_text() or '' for p in PdfReader('policy.pdf').pages)
t=re.sub(r'[ \t]+',' ',t)
print('POLICY merkkejä',len(t))
for kw in ('Core','Recommended','Hourly','hourly','sub-hourly','timeliness','CC-BY','Derived','commercial','licence'):
    for m in list(re.finditer(kw,t))[:3]:
        print('---',kw,':',re.sub(r'\s+',' ',t[max(0,m.start()-300):m.start()+400]))
PY
# MET: viimeisimmät europe-IR-ajat (päivitysväli)
curl -sS -m 60 -A "$UA" "https://api.met.no/weatherapi/geosatellite/1.4/available.json?area=europe&type=infrared&size=normal" -o met.json
python3 -c "
import json;d=json.load(open('met.json'));ts=sorted(set(p['value'] for q in d for p in q['parameters'] if p['name']=='time') if isinstance(d,list) else [])
print('MET europe IR aikoja',len(ts),'viimeiset',ts[-6:])" 2>&1 | head -3
head -c 600 met.json; echo
# Lapin kattavuus: WMS 5-32E, 60-71N, rivien datan osuus
B=556597,8399738,3562224,11402272
for L in mtg_fd:ir105_hrfi msg_fes:ir108 mtg_fd:rgb_fog msg_fes:rgb_microphysics; do
  f="w_${L//:/_}.png"
  curl -sS -m 90 -o "$f" -w "$L HTTP %{http_code} %{size_download} B %{time_total}s\n" "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=$B&width=512&height=512&format=image/png&transparent=true"
  python3 - "$f" <<'PY'
import sys,math
from PIL import Image
import numpy as np
im=Image.open(sys.argv[1]).convert('RGBA'); a=np.array(im)
y0,y1=8399738,11402272
def row(lat):
    y=6378137*math.log(math.tan(math.pi/4+math.radians(lat)/2)); return int((y1-y)/(y1-y0)*a.shape[0])
for lat in (60,65,68,70,71):
    r=a[min(max(row(lat),0),a.shape[0]-1)]
    vis=(r[:,3]>0)&(r[:,:3].sum(1)>0)
    print(f'  {lat}N: dataa {vis.mean()*100:.0f}% sarakkeista, keskiarvo RGB {r[vis,:3].mean(0).round() if vis.any() else None}')
PY
done
# Hourly-aika (Core): TIME tasatunti
T=$(date -u +%Y-%m-%dT%H:00:00Z -d '-1 hour')
curl -sS -m 90 -o hourly.png -w "mtg ir105 TIME=$T HTTP %{http_code} %{content_type} %{size_download} B\n" "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=mtg_fd:ir105_hrfi&styles=&crs=EPSG:3857&bbox=$B&width=512&height=512&format=image/png&transparent=true&time=$T"
# EUMETView-tasojen Abstract/Attribution
curl -sS -m 60 -o caps.xml "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
python3 - <<'PY'
import re
t=open('caps.xml',errors='replace').read()
for n in ('mtg_fd:ir105_hrfi','mtg_fd:rgb_fog','msg_fes:rgb_microphysics'):
    i=t.find('<Name>'+n+'</Name>'); seg=t[i:i+5000]
    ab=re.search(r'<Abstract>(.*?)</Abstract>',seg,re.S); at=re.search(r'<Attribution>(.*?)</Attribution>',seg,re.S)
    print(n,'| abstract:',(ab.group(1)[:500] if ab else None),'| attribution:',(re.sub(r'\s+',' ',at.group(1))[:300] if at else None))
PY
echo VALMIS
