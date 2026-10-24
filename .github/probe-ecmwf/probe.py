# VÄLIAIKAINEN koehaku (2026-10-24): löytyvätkö lcc/mcc/hcc ECMWF Open Datasta?
# Ei julkaise mitään. Poistetaan ennen yhdistämistä.
import json, os, sys, gzip, tempfile, urllib.request
import numpy as np
sys.path.insert(0, "scripts")
from model_areas import ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1
import cloud_png
from ecmwf.opendata import Client
import cfgrib

c = Client(source="ecmwf")
run = c.latest(type="fc", step=24, param="tcc")
print("Uusin ajo:", run)
d, hh = run.strftime("%Y%m%d"), run.strftime("%H")
for src, base in [("ecmwf", "https://data.ecmwf.int/forecasts"),
                  ("azure", "https://ai4edataeuwest.blob.core.windows.net/ecmwf"),
                  ("aws", "https://ecmwf-forecasts.s3.eu-central-1.amazonaws.com")]:
    url = f"{base}/{d}/{hh}z/ifs/0p25/oper/{d}{hh}0000-24h-oper-fc.index"
    try:
        lines = urllib.request.urlopen(url, timeout=60).read().decode().splitlines()
        params = sorted({json.loads(l)["param"] for l in lines if l.strip()})
        print(f"[{src}] index {len(lines)} riviä, parametrit ({len(params)}):", params)
        for p in ("tcc", "lcc", "mcc", "hcc"):
            print(f"   {p}: {'LÖYTYY' if p in params else 'EI'}")
    except Exception as e:
        print(f"[{src}] index-haku epäonnistui: {e}")

tmp = tempfile.mktemp(suffix=".grib2")
for src in ["ecmwf", "azure", "aws"]:
    try:
        Client(source=src, maximum_retries=2, retry_after=10).retrieve(
            date=d, time=int(hh), step=[0, 24], type="fc", param=["tcc", "lcc", "mcc", "hcc"], target=tmp)
        print(f"Haku onnistui lähteestä {src}: {os.path.getsize(tmp)/1e6:.1f} Mt")
        break
    except Exception as e:
        print(f"Haku lähteestä {src} epäonnistui: {e}")
else:
    sys.exit(0)

found = {}
for ds in cfgrib.open_datasets(tmp):
    for v in ds.data_vars:
        da = ds[v]
        found[v] = da
        print(f"Muuttuja {v}: {da.attrs.get('GRIB_name')} yksikkö '{da.attrs.get('GRIB_units')}' "
              f"muoto {da.shape} min {float(da.min()):.3f} max {float(da.max()):.3f} NaN {int(np.isnan(da.values).sum())}")

def crop(da, i):
    lats, lons = da.latitude.values, da.longitude.values
    li = np.where((lats >= ECMWF_LAT0) & (lats <= ECMWF_LAT1))[0]
    ln = ((lons + 180) % 360) - 180
    lo = np.where((ln >= ECMWF_LON0) & (ln <= ECMWF_LON1))[0]
    lo = lo[np.argsort(ln[lo])]
    f = da.values[i] if da.ndim == 3 else da.values
    sub = f[np.ix_(li, lo)][::-1, :]
    scale = 1 if float(da.max()) > 1.5 else 100   # osuus 0-1 -> %
    return np.clip(np.round(sub * scale), 0, 100).astype(np.uint8)

for i, step in enumerate([0, 24]):
    sizes = {}
    lay = {"t0": 0}
    for v, key in (("lcc", "valsLow"), ("mcc", "valsMid"), ("hcc", "valsHigh"), ("tcc", "vals")):
        if v not in found: continue
        pct = crop(found[v], i)
        b64 = cloud_png.encode(pct)
        sizes[v] = len(b64)
        if key != "vals": lay[key] = b64
        print(f"  askel {step} h {v}: hila {pct.shape}, keskiarvo {pct.mean():.1f} %, PNG base64 {len(b64)/1024:.1f} kt")
    if len(lay) == 4:
        raw = json.dumps(lay).encode()
        print(f"  askel {step} h KERROSTIEDOSTO: {len(raw)/1024:.1f} kt raakana, {len(gzip.compress(raw, 6))/1024:.1f} kt gzip")
