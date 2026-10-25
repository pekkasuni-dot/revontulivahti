#!/bin/bash
# VÄLIAIKAINEN: EUMETView IR- ja pilvimaskikuvien pikseliarvot (värit -> läpinäkyvyys).
set -u
mkdir -p sat-out; cd sat-out
pip install -q pillow numpy >/dev/null 2>&1
B=0,7361866,4452780,11753184   # 0-40 E, 55-72 N (EPSG:3857)
for L in mtg_fd:ir105_hrfi msg_fes:clm msg_fes:ir108; do
  f="${L//:/_}.png"
  curl -sS -m 120 -o "$f" -w "$L HTTP %{http_code} %{content_type} %{size_download} B %{time_total}s\n" \
    "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=$B&width=800&height=800&format=image/png&transparent=true"
  python3 - "$f" <<'PY'
import sys, numpy as np
from PIL import Image
im=Image.open(sys.argv[1]); print('  mode',im.mode,im.size, 'palette' if im.mode=='P' else '')
a=np.array(im.convert('RGBA')).reshape(-1,4)
u,c=np.unique(a,axis=0,return_counts=True)
o=np.argsort(-c)
print('  eri värejä',len(u))
for i in o[:14]: print('   ',tuple(u[i]),f'{100*c[i]/len(a):.1f}%')
g=a[:,:3].mean(1); print('  harmaa min/mediaani/max',g.min(),np.median(g),g.max(),' alfa min/max',a[:,3].min(),a[:,3].max())
PY
done
echo "--- legendat"
for L in msg_fes:clm mtg_fd:ir105_hrfi; do
  curl -sS -m 60 -o "leg_${L//:/_}.png" -w "$L legend HTTP %{http_code} %{content_type} %{size_download}\n" "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetLegendGraphic&format=application/json&layer=$L"
  head -c 1500 "leg_${L//:/_}.png"; echo
done
curl -sS -m 60 -o caps.xml "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
python3 - <<'PY'
import re
t=open('caps.xml',errors='replace').read()
for n in ('msg_fes:clm','mtg_fd:ir105_hrfi'):
    i=t.find('<Name>'+n+'</Name>'); seg=t[i:i+8000]
    print(n,'styles:',re.findall(r'<Style>\s*<Name>([^<]+)</Name>',seg)[:8])
PY
echo VALMIS
