#!/usr/bin/env python3
"""
Hakee ECMWF Open Data -pilviennusteen (total cloud cover) ja kirjoittaa data/clouds.json.
Alue: 55-75 N, koko maailma. Resoluutio: 0.5x0.5 deg. 17 aikahorisonttia (0-48 h, 3 h valin).
Ajetaan GitHub Actionsissa 4 kertaa vuorokaudessa ECMWF-malliajojen jalkeen.
"""

import json, os, sys, time, tempfile
import numpy as np

STEPS = list(range(0, 49, 3))  # [0, 3, 6, ..., 48] -> 17 aikahorisonttia

def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)

try:
    from ecmwf.opendata import Client
    import cfgrib
except ImportError as e:
    die(f"Paketti puuttuu: {e}\nAsenna: pip install ecmwf-opendata cfgrib xarray numpy")

tmp = tempfile.mktemp(suffix=".grib2")

# Lataus
print(f"Ladataan ECMWF Open Data, {len(STEPS)} aikahorisonttia (step={STEPS[0]}-{STEPS[-1]} h)...")
try:
    Client(source="ecmwf").retrieve(step=STEPS, type="fc", param="tcc", target=tmp)
    print(f"Ladattu: {os.path.getsize(tmp)/1e6:.1f} MB")
except Exception as e:
    try: os.unlink(tmp)
    except: pass
    die(f"ECMWF-lataus epaonnistui: {e}")

# Parsinta - ladataan kaikki data muistiin ennen tiedoston poistoa (cfgrib on lazy)
print("Puretaan GRIB2...")
tcc_raw = lats_all = lons_all = init_time = None
try:
    ds_list = cfgrib.open_datasets(tmp)
    ds = next((d for d in ds_list if "tcc" in d.data_vars), None)
    if ds is None:
        die(f"tcc-muuttujaa ei loydy. Saatavilla: {[list(d.data_vars) for d in ds_list]}")
    da      = ds["tcc"]
    tcc_raw  = da.load().values         # numpy (step, lat, lon), arvot 0.0-1.0
    lats_all = da.latitude.values       # laskeva: 90 -> -90
    lons_all = da.longitude.values      # nouseva: 0 -> 359.75
    init_time = ds.time.values
    print(f"Dimensiot: {tcc_raw.shape}  (step, lat, lon)")
except Exception as e:
    die(f"GRIB2-parsinta epaonnistui: {e}")
finally:
    try: os.unlink(tmp)
    except: pass

# Latitudes 55-75 N, joka toinen -> 0.5 deg resoluutio
lat_mask    = (lats_all >= 55.0) & (lats_all <= 75.0)
lat_idx_all = np.where(lat_mask)[0]
lat_idx     = lat_idx_all[::2]         # joka toinen (N->S jarjestyksessa)
lats_NS     = lats_all[lat_idx]        # [75.0, 74.5, ..., 55.0]

# Longtitudit: rullaa 180->-180, joka toinen -> 0.5 deg resoluutio
roll_start = int(np.searchsorted(lons_all, 180.0))
n_lon      = len(lons_all)
rolled_idx = np.array([(roll_start + i) % n_lon for i in range(n_lon)])
lon_idx    = rolled_idx[::2]           # 720 pistetta
lons_raw   = lons_all[lon_idx]
lons_out   = np.where(lons_raw >= 180, lons_raw - 360, lons_raw)  # -180 -> 179.5

nlat = len(lat_idx)   # 41
nlon = len(lon_idx)   # 720

# Aikaleimät (ms)
init_ms  = int(np.datetime64(init_time, "ms").astype("int64"))
times_ms = [init_ms + s * 3_600_000 for s in STEPS]

# Arvotaulukko (step, lat S->N, lon W->E)
vals = []
for i_step in range(len(STEPS)):
    frame     = tcc_raw[i_step]                       # numpy (lat N->S, lon 0->360)
    frame_sub = frame[np.ix_(lat_idx, lon_idx)]       # (41 lat N->S, 720 lon)
    frame_SN  = frame_sub[::-1, :]                    # kaannetaan S->N
    pct       = np.clip(np.round(frame_SN * 100), 0, 100).astype(np.int8)
    vals.extend(pct.flatten().tolist())

# Kirjoita JSON
result = {
    "generated": int(time.time() * 1000),
    "lat0": float(lats_NS[-1]),   # 55.0
    "lat1": float(lats_NS[0]),    # 75.0
    "lon0": float(lons_out[0]),   # -180.0
    "lon1": float(lons_out[-1]),  # 179.5
    "nlat": nlat,
    "nlon": nlon,
    "dlat": 0.5,
    "dlon": 0.5,
    "times": times_ms,
    "vals": vals,
}

os.makedirs("data", exist_ok=True)
with open("data/clouds.json", "w") as f:
    json.dump(result, f)

size_kb = os.path.getsize("data/clouds.json") / 1024
print(f"OK: {len(STEPS)} aikaa x {nlat}x{nlon} = {len(vals)} arvoa -> data/clouds.json ({size_kb:.0f} KB)")
print(f"Alue: {result['lat0']} N - {result['lat1']} N, {result['lon0']} E - {result['lon1']} E")
