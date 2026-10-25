#!/bin/bash
# VÄLIAIKAINEN: yökäyttöiset RGB-tuotteet EUMETViewissä (värit, aikaväli, viive).
set -u
mkdir -p sat-out; cd sat-out
pip install -q pillow numpy >/dev/null 2>&1
date -u
curl -sS -m 90 -o caps.xml "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
LAYERS="mtg_fd:rgb_fog msg_fes:rgb_fog msg_fes:rgb_airmass mtg_fd:rgb_geocolour mtg_fd:rgb_airmass mtg_fd:rgb_nightmicrophysics"
python3 - $LAYERS <<'PY'
import re,sys
t=open('caps.xml',errors='replace').read()
for n in sys.argv[1:]:
    i=t.find('<Name>'+n+'</Name>')
    if i<0: print(n,'EI LÖYDY'); continue
    seg=t[i-200:i+6000]
    ti=re.search(r'<Title>([^<]+)</Title>',t[i:i+3000]); ab=re.search(r'<Abstract>([^<]*)</Abstract>',t[i:i+6000])
    dm=re.search(r'<Dimension name="time"[^>]*>([^<]+)</Dimension>',t[i:i+6000])
    d=dm.group(1) if dm else '?'
    print('==',n,'|',ti.group(1) if ti else '?','| aika:',d[:40],'...',d[-45:])
    print('   ',(ab.group(1) if ab else '')[:900].replace('\n',' '))
PY
# 0-40 E, 55-72 N (EPSG:3857)
B=0,7361866,4452780,11753184
for L in $LAYERS; do
  f="${L//:/_}.png"
  curl -sS -m 120 -o "$f" -w "$L HTTP %{http_code} %{content_type} %{size_download} B %{time_total}s\n" \
    "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=$B&width=600&height=600&format=image/png&transparent=true"
  python3 - "$f" <<'PY'
import sys, numpy as np
from PIL import Image
try: im=Image.open(sys.argv[1])
except Exception as e: print('  ei kuva',e); sys.exit()
a=np.array(im.convert('RGBA'))
f=a.reshape(-1,4); print('  mode',im.mode,'alfa>0 %.1f%%'%(100*(f[:,3]>0).mean()))
# Lappi/Pohjois-Suomi ~ 20-30E, 66-70N -> pikselialue
def px(lon,lat):
    import math
    x=(lon/40)*600; y=(math.log(math.tan(math.pi/4+math.radians(lat)/2))*6378137-7361866)/(11753184-7361866)
    return int(x),int(600-y*600)
x0,y0=px(20,70); x1,y1=px(30,62)
s=a[y0:y1,x0:x1].reshape(-1,4)
q=(s[:,:3]//32)*32
u,c=np.unique(q,axis=0,return_counts=True); o=np.argsort(-c)
print('  Suomi 20-30E 62-70N, värit (32-portain):')
for i in o[:10]: print('   ',tuple(u[i]),f'{100*c[i]/len(s):.1f}%')
print('  keskiarvo RGB',s[:,:3].mean(0).round(1))
PY
done
echo VALMIS
