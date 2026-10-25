#!/bin/bash
# VÄLIAIKAINEN: EUMETView-tasojen viive (aikaulottuvuuden loppu vs. kello, 30 min) + oikeat kuvat.
set -u
mkdir -p sat-out; cd sat-out
pip install -q pillow numpy >/dev/null 2>&1
LAYERS="mtg_fd:ir105_hrfi msg_fes:clm mtg_fd:rgb_fog msg_fes:rgb_fog mtg_fd:rgb_geocolour"
CAPS="https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
curl -sS -m 90 -D caps-headers.txt -o caps.xml "$CAPS"; echo "--- caps-otsakkeet"; grep -iE "cache|age|expires|last-mod|etag|date" caps-headers.txt
for n in 0 1 2 3 4 5 6; do
  [ $n -gt 0 ] && { sleep 300; curl -sS -m 90 -o caps.xml "$CAPS"; }
  python3 - $LAYERS <<'PY' | tee -a viive.txt
import re,sys,datetime as D
t=open('caps.xml',errors='replace').read(); now=D.datetime.now(D.timezone.utc)
out=[now.strftime('%H:%M:%S')]
for n in sys.argv[1:]:
    i=t.find('<Name>'+n+'</Name>'); j=t.find('<Layer',i+10)
    m=re.search(r'<Dimension name="time"[^>]*>([^<]+)</Dimension>',t[i:j if j>0 else i+20000])
    w=re.search(r'<Dimension name="time"[^>]*>([^<]+)</Dimension>',t[i:i+8000])
    e=m.group(1).strip().split(',')[-1].split('/')[1] if m else None
    lag=(now-D.datetime.fromisoformat(e.replace('Z','+00:00'))).total_seconds()/60 if e else -1
    same='' if (m and w and m.group(1)==w.group(1)) else ' (8000-IKKUNA ERI!)'
    out.append(f'{n} {e[11:16] if e else "?"} viive {lag:.0f} min{same}')
print(' | '.join(out))
PY
done
B=-222639,7170156,4675419,11935769   # sovelluksen SAT.bbox -2..42 E, 54..72.5 N (EPSG:3857)
BN=0,7361866,4452780,16000000        # pohjoisraja: 0..40 E, 55..~81 N
python3 - <<'PY' > aika.txt
import re,datetime as D
t=open('caps.xml',errors='replace').read()
for n in ['mtg_fd:ir105_hrfi','msg_fes:clm','mtg_fd:rgb_fog']:
    i=t.find('<Name>'+n+'</Name>'); j=t.find('<Layer',i+10)
    e=re.search(r'<Dimension name="time"[^>]*>([^<]+)</Dimension>',t[i:j]).group(1).strip().split('/')[1]
    if n.startswith('mtg_fd:ir'): e=e[:14]+'00:00.000Z'
    print(n,e)
PY
cat aika.txt
while read L T; do
  f="${L//:/_}"; TT="${T/.000Z/Z}"
  curl -sS -m 120 -o "$f.png" -w "$L $TT HTTP %{http_code} %{content_type} %{size_download} B %{time_total}s\n" \
    "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=$B&width=1100&height=1070&format=image/png&transparent=true&time=$TT"
  curl -sS -m 120 -o "${f}_n.png" "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=$BN&width=400&height=1040&format=image/png&transparent=true&time=$TT"
  python3 - "${f}_n.png" "$L" <<'PY'
import sys,math,numpy as np
from PIL import Image
a=np.array(Image.open(sys.argv[1]).convert('RGBA')); H,W=a.shape[:2]
y0,y1=7361866,16000000
def lat(row): y=y1-(row+.5)/H*(y1-y0); return math.degrees(2*math.atan(math.exp(y/6378137))-math.pi/2)
for lon in (5,15,20,25,28,35):
    x=int(lon/40*W); col=a[:,x]; ok=np.where(col[:,3]>0)[0]
    g=col[:,:3].mean(1)
    print(f'  {sys.argv[2]} lon {lon}: dataa pohjoiseen asti {lat(ok.min()):.1f} N' if len(ok) else f'  lon {lon}: ei dataa',
          ' | harmaa 66N/70N/74N:', [int(g[int(r)]) for r in [next(i for i in range(H) if lat(i)<L) for L in (66,70,74)]])
PY
done < aika.txt
echo VALMIS
