"""VÄLIAIKAINEN koehaku: MET Nordic -analyysin cloud_area_fraction (thredds.met.no).
Kattavuus Lappi/Pohjois-Norja, menetelmä (metatiedot), viive, PNG-koko, vertailu HARMONIE + MTG IR."""
import datetime as D, io, json, os, re, urllib.request, sys
import numpy as np, xarray as xr
from PIL import Image
OUT = 'mn-out'; os.makedirs(OUT, exist_ok=True)
T = 'https://thredds.met.no/thredds'
UA = {'User-Agent': 'revontulivahti-koehaku (github.com/pekkasuni-dot/revontulivahti)'}
def get(u, t=120):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t) as r: return r.read()
now = D.datetime.now(D.timezone.utc); print('nyt', now.isoformat())

# 1) Katalogi: tiedostot + muokkausajat -> viive
cat = get(f'{T}/catalog/metpplatest/catalog.xml').decode()
rows = []
for m in re.finditer(r'<dataset name="(met_analysis_1_0km_nordic_(\d{8}T\d{2})Z\.nc)"(.*?)</dataset>', cat, re.S):
    name, stamp, body = m.groups()
    nom = D.datetime.strptime(stamp, '%Y%m%dT%H').replace(tzinfo=D.timezone.utc)
    mod = re.search(r'<date type="modified">([^<]+)</date>', body); size = re.search(r'<dataSize units="([^"]+)">([^<]+)<', body)
    modt = D.datetime.fromisoformat(mod.group(1).replace('Z', '+00:00')) if mod else None
    rows.append((nom, name, modt, size.groups() if size else None))
rows.sort()
print(f'analyysejä katalogissa {len(rows)}: {rows[0][0]:%d.%m %H} - {rows[-1][0]:%d.%m %H} UTC')
lat = []
for nom, name, modt, size in rows:
    l = (modt - nom).total_seconds() / 60 if modt else None
    lat.append(l); print(f'  {nom:%d.%m %H}Z muokattu {modt:%H:%M} viive {l:.0f} min koko {size}' if modt else f'  {nom} ei aikaa')
open(f'{OUT}/viive.txt', 'w').write('\n'.join(f'{r[0]:%Y-%m-%dT%H} {l}' for r, l in zip(rows, lat)))

# 2) Metatiedot (menetelmä, lisenssi)
def opendap(name): return f'{T}/dodsC/metpplatest/{name}'
ds = xr.open_dataset(opendap(rows[-1][1]))
print('=== globaalit attribuutit')
for k, v in ds.attrs.items(): print(f'  {k}: {str(v)[:600]}')
print('=== cloud_area_fraction attribuutit')
for k, v in ds['cloud_area_fraction'].attrs.items(): print(f'  {k}: {str(v)[:400]}')
la = ds['latitude'].values; lo = ds['longitude'].values; land = ds['land_area_fraction'].values
print('  hila', la.shape, 'lat', float(la.min()), float(la.max()), 'lon', float(lo.min()), float(lo.max()))

# 3) Kattavuus Lappi + Pohjois-Norja ja yöanalyysit
box = (la > 65) & (la < 71.5) & (lo > 14) & (lo < 32)
def load(name):
    d = xr.open_dataset(opendap(name)); a = d['cloud_area_fraction'].isel(time=0).values.astype('float32'); d.close(); return a
picks = {}
for nom, name, *_ in rows:
    if nom.hour in (0, 3, 21) or nom == rows[-1][0]: picks[nom] = name
picks = dict(sorted(picks.items())[-5:])
fields = {}
for nom, name in picks.items():
    a = load(name); fields[nom] = a
    v = a[box]; fin = np.isfinite(v)
    print(f'  {nom:%d.%m %H}Z: Lapin laatikko pisteitä {box.sum()}, arvo {fin.mean()*100:.1f} %, min/max {np.nanmin(v):.2f}/{np.nanmax(v):.2f}, '
          f'keskiarvo {np.nanmean(v)*100:.0f} %, eri arvoja {len(np.unique(np.round(v[fin], 3)))}')
# reunat: kattaako Pohjois-Norjan / Varanginniemen / Huippuvuoret?
for nm, (la0, lo0) in {'Nordkapp': (71.17, 25.78), 'Kirkenes': (69.73, 30.05), 'Tromssa': (69.65, 18.96), 'Utsjoki': (69.91, 27.03),
                       'Kilpisjärvi': (69.05, 20.79), 'Murmansk': (68.97, 33.08), 'Huippuvuoret': (78.2, 15.6)}.items():
    dist = (la - la0) ** 2 + ((lo - lo0) * np.cos(np.radians(la0))) ** 2; j = np.unravel_index(dist.argmin(), dist.shape)
    a = fields[max(fields)]
    print(f'  {nm}: lähin hilapiste {np.sqrt(dist[j])*111:.1f} km päässä, arvo {a[j]}')

# 4) PNG-koko: natiivi Lambert-hila (0-100 harmaa) ja Lapin rajaus
a = fields[max(fields)]
for tag, arr in (('koko hila', a), ('Lappi-rajaus', a[np.ix_(box.any(1), box.any(0))])):
    q = np.where(np.isfinite(arr), np.clip(np.round(arr * 100), 0, 100), 255).astype('uint8')
    b = io.BytesIO(); Image.fromarray(q[::-1]).save(b, 'PNG', optimize=True)
    print(f'  PNG {tag} {q.shape}: {len(b.getvalue())/1024:.0f} kt')

# 5) Vertailu samalta tunnilta: MET Nordic, HARMONIE, MTG IR
def harmonie(t):
    s = t.strftime('%Y-%m-%dT%H:%M:%SZ')
    u = (f'https://opendata.fmi.fi/download?producer=harmonie_scandinavia_surface&param=TotalCloudCover&bbox=14,65,32,71.5'
         f'&starttime={s}&endtime={s}&format=grib2&projection=EPSG:4326&levels=0&timestep=60')
    try:
        open('/tmp/h.grib2', 'wb').write(get(u))
        h = xr.open_dataset('/tmp/h.grib2', engine='cfgrib'); v = list(h.data_vars)[0]; f = h[v].squeeze()
        print(f'  HARMONIE {s}: ajo {str(h.time.values)[:16]} voimassa {str(f.valid_time.values)[:16]}')
        return f.longitude.values, f.latitude.values, f.values / (100 if float(np.nanmax(f.values)) > 1.5 else 1)
    except Exception as e: print('  HARMONIE', s, 'ei saatu:', e); return None
def mtg(t):
    s = t.strftime('%Y-%m-%dT%H:%M:%SZ')
    u = (f'https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=mtg_fd:ir105_hrfi&styles='
         f'&crs=EPSG:4326&bbox=65,14,71.5,32&width=900&height=325&format=image/png&time={s}')
    try: im = np.array(Image.open(io.BytesIO(get(u))).convert('L')); print('  MTG IR', s, im.shape); return im
    except Exception as e: print('  MTG', s, 'ei saatu:', e); return None
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
for nom in sorted(fields)[-2:]:
    mn = fields[nom]; hm = harmonie(nom); ir = mtg(nom)
    fig, ax = plt.subplots(1, 3, figsize=(15, 4.4), dpi=90)
    sub = (la > 64.5) & (la < 72) & (lo > 13) & (lo < 33)
    for k, (title) in enumerate([f'MET Nordic -analyysi {nom:%d.%m. %H} UTC', 'HARMONIE (ennuste, sama tunti)', 'MTG IR 10,5 µm (kylmä = vaalea)']):
        A = ax[k]; A.set_xlim(14, 32); A.set_ylim(65, 71.5); A.set_aspect(1 / np.cos(np.radians(68))); A.set_title(title, fontsize=10)
        A.set_facecolor('#888')
        A.contour(lo, la, land, levels=[0.5], colors='#ffcc00', linewidths=0.6)
    ys, xs = np.where(sub); sl = (slice(ys.min(), ys.max()+1), slice(xs.min(), xs.max()+1))
    ax[0].pcolormesh(lo[sl], la[sl], mn[sl], cmap='gray', vmin=0, vmax=1, shading='auto')
    if hm: ax[1].pcolormesh(hm[0], hm[1], hm[2], cmap='gray', vmin=0, vmax=1, shading='auto')
    if ir is not None: ax[2].imshow(ir, extent=(14, 32, 65, 71.5), cmap='gray', vmin=0, vmax=255, aspect=1 / np.cos(np.radians(68)))
    for A in ax: A.contour(lo, la, land, levels=[0.5], colors='#ffcc00', linewidths=0.6)
    fig.tight_layout(); fig.savefig(f'{OUT}/vertailu-{nom:%d-%H}.png'); plt.close(fig)
    if hm:
        from scipy.interpolate import RegularGridInterpolator as RGI
    print(f'  kuva vertailu-{nom:%d-%H}.png')
print('VALMIS')
