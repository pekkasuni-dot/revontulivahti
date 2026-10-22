#!/usr/bin/env python3
"""
Hakee ECMWF Open Data -pilviennusteen (total cloud cover) ja kirjoittaa data/clouds-ecmwf.json.
Alue: 55-75 N, 30 W - 60 E (Eurooppa/Pohjois-Atlantti). Resoluutio: 0.25 deg
taysi natiiviresoluutio molemmilla akseleilla (ei alinaytteistysta - ECMWF
Open Data ei tarjoa tatakaan tarkempaa ilmaiseksi). 17 aikahorisonttia
(0-48 h, 3 h valin). Ajetaan GitHub Actionsissa 4 kertaa vuorokaudessa
ECMWF-malliajojen jalkeen.
"""

import json, os, sys, time, tempfile
import numpy as np
from model_areas import ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1

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

# Lataus: ensisijainen lahde ECMWF:n oma portaali, lyhyella uudelleenyrityksella
# (kirjaston oma oletus 500 yritysta x 120 s olisi voinut kestaa tuntikausia
# havaitun 429-ruuhkan aikana). Jos paaportaali ei vastaa muutaman nopean
# yrityksen jalkeen, vaihdetaan viralliseen peilipalvelimeen (Azure, sitten AWS)
# - ECMWF:n oma dokumentaatio/virheviesti suosittelee tata samaa.
SOURCES_TRY = ["ecmwf", "azure", "aws"]
used_source = None
last_err = None
for src in SOURCES_TRY:
    print(f"Ladataan ECMWF Open Data lahteesta '{src}' ({len(STEPS)} aikahorisonttia, "
          f"step={STEPS[0]}-{STEPS[-1]} h)...")
    try:
        Client(source=src, maximum_retries=3, retry_after=20).retrieve(
            step=STEPS, type="fc", param="tcc", target=tmp)
        used_source = src
        print(f"Ladattu lahteesta '{src}': {os.path.getsize(tmp)/1e6:.1f} MB")
        break
    except Exception as e:
        print(f"Lahde '{src}' epaonnistui: {e}", file=sys.stderr)
        last_err = e
        try: os.unlink(tmp)
        except: pass

if used_source is None:
    die(f"ECMWF-lataus epaonnistui kaikista lahteista ({', '.join(SOURCES_TRY)}): {last_err}")

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

# Latitudes ECMWF_LAT0-ECMWF_LAT1 (ks. model_areas.py), kaikki pisteet ->
# 0.25 deg natiivi resoluutio
lat_mask    = (lats_all >= ECMWF_LAT0) & (lats_all <= ECMWF_LAT1)
lat_idx_all = np.where(lat_mask)[0]
lat_idx     = lat_idx_all               # kaikki pisteet (N->S jarjestyksessa)
lats_NS     = lats_all[lat_idx]        # [85.0, 84.75, ..., 55.0]

# Pituusasteet: rajataan ECMWF_LON0-ECMWF_LON1 (ks. model_areas.py), TAYSI
# 0.25 deg natiiviresoluutio (ei alinaytteistysta). Natiivihilan konventio
# (0..359.75 vai -180..179.75) on VAIHDELLEEN lahteen mukaan havaintojen
# perusteella - normalisoidaan ensin -180..180-valille ettei tarvitse
# olettaa kumpaa konventiota kulloinenkin GRIB-vastaus kayttaa.
lons_norm     = ((lons_all + 180.0) % 360.0) - 180.0
lon_mask      = (lons_norm >= ECMWF_LON0) & (lons_norm <= ECMWF_LON1)
lon_idx_raw   = np.where(lon_mask)[0]
lons_signed   = lons_norm[lon_idx_raw]
order         = np.argsort(lons_signed)
lon_idx       = lon_idx_raw[order]
lons_out      = lons_signed[order]

nlat = len(lat_idx)   # 121 (0.25 deg, 55-85 N)
nlon = len(lon_idx)   # 361 (0.25 deg, 30 W - 60 E)

# Aikaleimät (ms)
init_ms  = int(np.datetime64(init_time, "ms").astype("int64"))
times_ms = [init_ms + s * 3_600_000 for s in STEPS]

# Arvotaulukko (step, lat S->N, lon W->E)
vals = []
for i_step in range(len(STEPS)):
    frame     = tcc_raw[i_step]                       # numpy (lat N->S, lon 0->360)
    frame_sub = frame[np.ix_(lat_idx, lon_idx)]       # (nlat N->S, nlon)
    frame_SN  = frame_sub[::-1, :]                    # kaannetaan S->N
    pct       = np.clip(np.round(frame_SN * 100), 0, 100).astype(np.int8)
    vals.extend(pct.flatten().tolist())

# Kirjoita JSON
result = {
    "generated": int(time.time() * 1000),
    "source": used_source,   # mista lahteesta data todella haettiin (ecmwf/azure/aws)
    "lat0": float(lats_NS[-1]),   # 55.0
    "lat1": float(lats_NS[0]),    # 85.0
    "lon0": float(lons_out[0]),   # -30.0
    "lon1": float(lons_out[-1]),  # 60.0
    "nlat": nlat,
    "nlon": nlon,
    "dlat": 0.25,
    "dlon": 0.25,
    "times": times_ms,
    "vals": vals,
}

os.makedirs("data", exist_ok=True)
with open("data/clouds-ecmwf.json", "w") as f:
    json.dump(result, f)

# Askeltiedostot (2026-10-22): sovellus lataa ECMWF:n kuten ICON-EU/HARMONIE
# - pieni meta + yksi tiedosto per aika-askel (ks. MUISTIO-lataus.md kohta 6).
# Koko tiedosto (yllä) jää hälytysajolle (alerts/aurora-alerts.js) ja
# varalle (sovellus lukee sen, jos metaa ei vielä ole).
N = nlat * nlon
for i_step in range(len(STEPS)):
    with open(f"data/clouds-ecmwf-step{i_step:02d}.json", "w") as f:
        json.dump({"t0": times_ms[0], "vals": vals[i_step * N:(i_step + 1) * N]}, f)   # t0 = ajon tunniste
meta = {k: v for k, v in result.items() if k != "vals"}
meta.update({"model": "ecmwf", "run": init_ms, "hasLayers": False, "stepCount": len(STEPS)})
with open("data/clouds-ecmwf-meta.json", "w") as f:
    json.dump(meta, f)
step_kb = os.path.getsize("data/clouds-ecmwf-step00.json") / 1024
print(f"Askeltiedostot: {len(STEPS)} x ~{step_kb:.0f} KB + data/clouds-ecmwf-meta.json")

size_kb = os.path.getsize("data/clouds-ecmwf.json") / 1024
print(f"OK: {len(STEPS)} aikaa x {nlat}x{nlon} = {len(vals)} arvoa -> data/clouds-ecmwf.json ({size_kb:.0f} KB)")
print(f"Alue: {result['lat0']} N - {result['lat1']} N, {result['lon0']} E - {result['lon1']} E")
print(f"Lahde: {used_source}")
