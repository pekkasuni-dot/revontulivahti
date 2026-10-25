"""VÄLIAIKAINEN: FMI:n editoitu ennuste (pal_skandinavia) vs. HARMONIE vs. MTG IR; hila, askel, kattavuus, PNG-koko."""
import datetime as D, io, os, re, urllib.request
import numpy as np, xarray as xr
from PIL import Image
OUT = 'ed-out'; os.makedirs(OUT, exist_ok=True)
def get(u, t=180):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'revontulivahti-koehaku'}), timeout=t) as r: return r.read()
iso = lambda t: t.strftime('%Y-%m-%dT%H:%M:%SZ')
now = D.datetime.now(D.timezone.utc); H0 = now.replace(minute=0, second=0, microsecond=0)
past = H0 - D.timedelta(hours=1)          # vertailutunti (IR saatavilla)
PLACES = {'Oulu': (65.03, 25.41), 'Rovaniemi': (66.578, 26.015), 'Kilpisjärvi': (69.05, 20.79), 'Lyngen': (69.75, 20.6),
          'Levi': (67.8, 24.8), 'Sodankylä': (67.42, 26.6), 'Utsjoki': (69.908, 27.027)}
print('nyt', iso(now), 'vertailutunti', iso(past))
def dl(producer, bbox, t0, t1, fn, extra=''):
    u = (f'https://opendata.fmi.fi/download?producer={producer}&param=TotalCloudCover&bbox={bbox}&starttime={iso(t0)}&endtime={iso(t1)}'
         f'&format=grib2&projection=EPSG:4326&timestep=60{extra}')
    b = get(u); open(fn, 'wb').write(b); print(f'  {producer} {bbox} {len(b)/1024:.0f} kt')
    d = xr.open_dataset(fn, engine='cfgrib', backend_kwargs={'indexpath': ''}); a = d[list(d.data_vars)[0]]
    return d, a
# 1) Koko alue: kattavuus ja hila
d, a = dl('pal_skandinavia', '-9.1,52.7,45.35,72.64', H0, H0 + D.timedelta(hours=1), '/tmp/full.grib2')
print(d)
la, lo = d.latitude.values, d.longitude.values
print('  hila lat', la.min(), la.max(), 'dlat', np.diff(la)[:3], 'lon', lo.min(), lo.max(), 'dlon', np.diff(lo)[:3])
v = a.values[0] if a.ndim == 3 else a.values
print('  NaN-osuus koko alue', float(np.isnan(v).mean()))
for nm, (p, q) in PLACES.items():
    i = np.abs(la - p).argmin(); j = np.abs(lo - q).argmin(); print(f'  {nm}: {v[i, j]}')
# pohjoisraja: rivien NaN-osuus 69-72.6
for L in (69, 70, 71, 72, 72.5):
    i = np.abs(la - L).argmin(); row = v[i]; sel = (lo > 14) & (lo < 32); print(f'  lat {L}: NaN {np.isnan(row[sel]).mean():.2f}')
# 2) Lappi: aika-askeleet seuraavat 30 h + menneet 3 h
LB = '14,65,32,71.5'
d, a = dl('pal_skandinavia', LB, H0 - D.timedelta(hours=3), H0 + D.timedelta(hours=30), '/tmp/lap.grib2')
vt = [str(x)[:16] for x in np.ravel(a.valid_time.values)] if 'valid_time' in a.coords else []
print('  editoitu aika-askeleet', len(vt), vt[:5], '...', vt[-3:])
print('  ajoajat', np.unique(d.time.values) if 'time' in d.coords else '-')
dh, ah = dl('harmonie_scandinavia_surface', LB, H0 - D.timedelta(hours=3), H0 + D.timedelta(hours=30), '/tmp/har.grib2', '&levels=0')
vth = [str(x)[:16] for x in np.ravel(ah.valid_time.values)]
print('  HARMONIE askeleet', len(vth), vth[:3], '...', vth[-2:], 'ajo', str(dh.time.values)[:16])
def at(dd, aa, t, p, q):
    k = [str(x)[:16] for x in np.ravel(aa.valid_time.values)].index(t.strftime('%Y-%m-%dT%H:%M'))
    f = aa.values[k] if aa.ndim == 3 else aa.values
    f = f * (100 if np.nanmax(f) <= 1.5 else 1)
    return float(f[np.abs(dd.latitude.values - p).argmin(), np.abs(dd.longitude.values - q).argmin()]), f
# 3) MTG IR vertailutunnilla
irb = get(f'https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=mtg_fd:ir105_hrfi&styles='
          f'&crs=EPSG:4326&bbox=65,14,71.5,32&width=900&height=325&format=image/png&time={iso(past)}')
ir = np.array(Image.open(io.BytesIO(irb)).convert('L')).astype(float)
def irat(p, q):
    y = int((71.5 - p) / 6.5 * 325); x = int((q - 14) / 18 * 900)
    return float(ir[max(0, y-3):y+4, max(0, x-3):x+4].mean())
rows = ['paikka | aika UTC | editoitu % | HARMONIE % | IR harmaa (0-255, vaalea=kylmä)']
for t in [past, H0 + D.timedelta(hours=3), H0 + D.timedelta(hours=6), H0 + D.timedelta(hours=9)]:
    for nm, (p, q) in PLACES.items():
        try: e, _ = at(d, a, t, p, q)
        except Exception: e = None
        try: h, _ = at(dh, ah, t, p, q)
        except Exception: h = None
        rows.append(f'{nm} | {t:%d.%m %H} | {e if e is None else round(e)} | {h if h is None else round(h)} | {round(irat(p, q)) if t == past else "-"}')
open(f'{OUT}/vertailu.txt', 'w').write('\n'.join(rows)); print('\n'.join(rows))
# 4) PNG-koko (Lappi, yksi askel, harmaa 0-100)
_, f = at(d, a, H0 + D.timedelta(hours=3), 68, 24)
q = np.where(np.isfinite(f), np.clip(np.round(f), 0, 100), 255).astype('uint8')
b = io.BytesIO(); Image.fromarray(q).save(b, 'PNG', optimize=True); print(f'  PNG Lappi {q.shape}: {len(b.getvalue())/1024:.1f} kt')
# 5) Kuva: editoitu / HARMONIE / IR vertailutunnilla
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
_, fe = at(d, a, past, 68, 24); _, fh = at(dh, ah, past, 68, 24)
fig, ax = plt.subplots(1, 3, figsize=(15, 4.4), dpi=90)
asp = 1 / np.cos(np.radians(68))
for A, img, ext, ttl in ((ax[0], fe, (d.longitude.min(), d.longitude.max(), d.latitude.min(), d.latitude.max()), f'Editoitu ennuste {past:%d.%m. %H} UTC'),
                         (ax[1], fh, (dh.longitude.min(), dh.longitude.max(), dh.latitude.min(), dh.latitude.max()), 'HARMONIE (sama tunti)')):
    A.imshow(img, extent=[float(x) for x in ext], origin='lower' if d.latitude.values[0] < d.latitude.values[-1] else 'upper', cmap='gray', vmin=0, vmax=100, aspect=asp)
    A.set_title(ttl, fontsize=10); A.set_xlim(14, 32); A.set_ylim(65, 71.5)
ax[2].imshow(ir, extent=(14, 32, 65, 71.5), cmap='gray', vmin=0, vmax=255, aspect=asp); ax[2].set_title('MTG IR 10,5 µm (kylmä = vaalea)', fontsize=10)
for A in ax:
    for nm, (p, q2) in PLACES.items(): A.plot(q2, p, 'o', color='#ffcc00', ms=4); A.text(q2 + .2, p + .1, nm, color='#ffcc00', fontsize=7)
fig.tight_layout(); fig.savefig(f'{OUT}/editoitu-{past:%d-%H}.png'); print('VALMIS')
