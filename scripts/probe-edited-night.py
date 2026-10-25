"""VÄLIAIKAINEN: tunneittain 7 paikkaa: editoitu ennuste (origintime + seuraavat 12 h), HARMONIE samat tunnit,
MTG IR edelliseltä tasatunnilta. Lokiriveinä (SARJA/IR) myöhempää analyysia varten. Argumentti = kierrosten määrä."""
import datetime as D, io, json, sys, time, urllib.request, urllib.parse
PLACES = {'Oulu': (65.03, 25.41), 'Rovaniemi': (66.578, 26.015), 'Kilpisjarvi': (69.05, 20.79), 'Lyngen': (69.75, 20.6),
          'Levi': (67.8, 24.8), 'Sodankyla': (67.42, 26.6), 'Utsjoki': (69.908, 27.027)}
def get(u, t=90):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'revontulivahti-koehaku'}), timeout=t) as r: return r.read()
def ts(producer, lat, lon, t0, n):
    q = dict(producer=producer, param='time,origintime,TotalCloudCover', latlon=f'{lat},{lon}', format='json', tz='UTC',
             starttime=t0.strftime('%Y-%m-%dT%H:%M:%SZ'), timesteps=n, timestep=60)
    try: return json.loads(get('https://opendata.fmi.fi/timeseries?' + urllib.parse.urlencode(q)))
    except Exception as e: return str(e)[:120]
try:
    import numpy as np; from PIL import Image
except Exception:
    import subprocess; subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'numpy', 'pillow']); import numpy as np; from PIL import Image
N = int(sys.argv[1]) if len(sys.argv) > 1 else 5
for k in range(N):
    now = D.datetime.now(D.timezone.utc); h0 = now.replace(minute=0, second=0, microsecond=0)
    for prod, tag in (('pal_skandinavia', 'EDITOITU'), ('harmonie_scandinavia_surface', 'HARMONIE')):
        for nm, (p, q) in PLACES.items():
            r = ts(prod, p, q, h0 - D.timedelta(hours=1), 14)
            if isinstance(r, list):
                print(f'SARJA {now:%H:%M} {tag} {nm} ' + ' '.join(f"{x['time'][9:11]}={x['TotalCloudCover']}@{x['origintime'][9:13]}" for x in r))
            else: print(f'SARJA {now:%H:%M} {tag} {nm} VIRHE {r}')
    t = h0 - D.timedelta(hours=1)
    try:
        b = get('https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=mtg_fd:ir105_hrfi&styles='
                f'&crs=EPSG:4326&bbox=64,14,71.5,32&width=900&height=375&format=image/png&time={t:%Y-%m-%dT%H:%M:%SZ}')
        a = np.array(Image.open(io.BytesIO(b)).convert('L')).astype(float)
        vals = []
        for nm, (p, q) in PLACES.items():
            y = int((71.5 - p) / 7.5 * 375); x = int((q - 14) / 18 * 900); vals.append(f'{nm}={a[y-3:y+4, x-3:x+4].mean():.0f}')
        print(f'IR {now:%H:%M} kuva {t:%d.%m %H}UTC ' + ' '.join(vals))
    except Exception as e: print(f'IR {now:%H:%M} VIRHE {str(e)[:120]}')
    sys.stdout.flush()
    if k < N - 1: time.sleep(3600 - (time.time() % 3600) + 2700 if k == 0 else 3600)   # kierrokset noin xx.45 UTC
