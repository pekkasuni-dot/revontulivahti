#!/usr/bin/env python3
"""
Hakee DWD ICON-EU -pilviennusteen SUORAAN DWD:n avoimesta datasta
(opendata.dwd.de, GRIB2) ja kirjoittaa data/clouds-icon_eu.json.

Korvaa aiemman Open-Meteo-pohjaisen version: Open-Meteon ilmainen rajapinta
on vain ei-kaupalliseen kayttoon, on pistekohtainen (ei tarjoa valmista
hilaa) ja sen vapaa kayttokiintio osoittautui rajoittavaksi monipistehaulle
(ks. MUISTIO-mallit.md, "VAIHE 0/2"). DWD:n avoin data on GRIB2-tiedostoina
valmiina koko Euroopan hilana ("regular-lat-lon", EI kierretty projektio),
0,0625 asteen resoluutiolla - sama periaate kuin ECMWF-putki
(scripts/fetch-clouds.py), mutta DWD jakaa kentat/aika-askeleet erillisina
tiedostoina sen sijaan etta yksi haku palauttaisi kaikki.

Hiladata leikataan samalle leveysastealueelle kuin ECMWF (55-75 N) siina
maarin kuin ICON-EU:n oma kattavuus sen sallii - ICON-EU:n pohjoisraja on
70,5 N (ks. MUISTIO-mallit.md), ei 75 N asti kuten ECMWF:lla. Pituusaste
kaytetaan DWD:n koko natiivialue (-23,5 ... 62,5 E) - paljon enemman kuin
edellisen Open-Meteo-version Suomi-rajaus, joka aiheutti kapean
"suorakaide"-ongelman (VAIHE 1 -diagnoosin loyto 1).

Vaatii: cfgrib, xarray, numpy (sama kuin ECMWF-putki) + apt-paketti
libeccodes-dev CI:ssa.
"""

import bz2, datetime, glob, json, os, sys, tempfile, time
import urllib.request
import numpy as np

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

BASE = "https://opendata.dwd.de/weather/nwp/icon-eu/grib"
FIELDS = {"vals": "CLCT", "valsLow": "CLCL", "valsMid": "CLCM", "valsHigh": "CLCH"}
STEPS = list(range(0, 13))         # 0-12 h tunneittain - reilusti aikajanan 10 h -maksimin yli
RUN_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]   # DWD julkaisee ICON-EU:n 8x vrk

# Tavoitehila: sama lat-alue kuin ECMWF (55-75 N) niin pitkalle kuin ICON-EU:n
# oma kattavuus (max 70,5 N) sen sallii; lon = DWD:n koko natiivialue.
TARGET_LAT0, TARGET_LAT1 = 55.0, 70.5
STRIDE = 4   # natiivi 0,0625 deg * 4 = 0,25 deg (sama tihe kuin ECMWF:n dlat)


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


def url_for(run_dt, field_code, step):
    hh = f"{run_dt.hour:02d}"
    ts = run_dt.strftime("%Y%m%d%H")
    fname = f"icon-eu_europe_regular-lat-lon_single-level_{ts}_{step:03d}_{field_code}.grib2.bz2"
    return f"{BASE}/{hh}/{field_code.lower()}/{fname}"


def url_exists(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception:
        return False


def pick_latest_run():
    """Etsii viimeisimman ajon, jolla step000/CLCT on julkaistu.
       DWD:n julkaisuviive on tyypillisesti ~2-3 h ajon jalkeen."""
    now = datetime.datetime.now(datetime.timezone.utc).replace(
        minute=0, second=0, microsecond=0)
    for back in range(0, 8):   # kokeilee enintaan 8 ajoa taaksepain (~24 h)
        cand = now - datetime.timedelta(hours=now.hour % 3)
        cand -= datetime.timedelta(hours=3 * back)
        if cand.hour not in RUN_HOURS:
            continue
        test_url = url_for(cand, "CLCT", 0)
        print(f"Kokeillaan ajoa {cand.isoformat()} ...")
        if url_exists(test_url):
            return cand
    die("Yhtakaan ICON-EU-ajoa ei loytynyt viimeisen 24 h ajalta")


def download_grib(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                comp = r.read()
            return bz2.decompress(comp)
        except Exception as e:
            if attempt == 2:
                die(f"Lataus epaonnistui ({url}): {e}")
            time.sleep(3 * (attempt + 1))


def parse_grib(raw_bytes):
    """Purkaa GRIB2-tavut tilapaistiedostoon (cfgrib vaatii tiedostopolun) ja
       palauttaa (data 2D numpy, lat 1D nouseva, lon 1D nouseva)."""
    tmp = tempfile.mktemp(suffix=".grib2")
    with open(tmp, "wb") as f:
        f.write(raw_bytes)
    try:
        ds_list = cfgrib.open_datasets(tmp)
        ds = ds_list[0]
        name = list(ds.data_vars)[0]
        da = ds[name].load()
        return da.values, da.latitude.values, da.longitude.values
    finally:
        # cfgrib luo rinnalle hakemistotiedoston nimella "<tmp>.<5-merkkinen hash>.idx"
        for leftover in [tmp] + glob.glob(tmp + ".*.idx"):
            try:
                os.unlink(leftover)
            except Exception:
                pass


run = pick_latest_run()
print(f"Kaytetaan ajoa: {run.isoformat()}")

grid_computed = False
lat_out = lon_out = None
nlat = nlon = None
lat_block0 = n_lat_native = n_lon_native = None
grids = {key: [] for key in FIELDS}   # key -> [step][flat lat*lon]

for step in STEPS:
    print(f"Askel {step:03d} h ...")
    for key, code in FIELDS.items():
        raw = download_grib(url_for(run, code, step))
        data, lat_native, lon_native = parse_grib(raw)

        if not grid_computed:
            # Indeksit lasketaan kerran (sama hila kaikilla kentilla/askeleilla).
            # lat_block0/lon_block0 = ensimmainen natiivi-indeksi jokaista
            # STRIDE x STRIDE -lohkoa kohden (lohkon KESKIARVO, ei yksittainen
            # piste - yksittaisen pisteen poiminta aliasoi jyrkat pilvirajat
            # vaarin, ks. MUISTIO-mallit.md VAIHE 2/4).
            lat_native_idx = [i for i, v in enumerate(lat_native)
                               if TARGET_LAT0 - 1e-6 <= v <= TARGET_LAT1 + 1e-6]
            lat_block0 = lat_native_idx[0]
            n_lat_native = len(lat_native_idx)
            n_lon_native = len(lon_native)
            nlat = (n_lat_native + STRIDE - 1) // STRIDE
            nlon = (n_lon_native + STRIDE - 1) // STRIDE
            lat_out = lat_native[[min(lat_block0 + i*STRIDE, len(lat_native)-1) for i in range(nlat)]]
            lon_out = lon_native[[min(i*STRIDE, n_lon_native-1) for i in range(nlon)]]
            print(f"  Hila: {nlat} x {nlon} (lohkokeskiarvo {STRIDE}x{STRIDE}), "
                  f"lat {lat_out[0]}-{lat_out[-1]}, lon {lon_out[0]}-{lon_out[-1]}")
            grid_computed = True

        # Lohkokeskiarvo: jokainen ulostulosolu = STRIDE x STRIDE natiivipisteen
        # keskiarvo (reunalohkot voivat olla kapeampia - sallittu, np.mean toimii).
        pct = np.empty((nlat, nlon))
        for i in range(nlat):
            r0 = lat_block0 + i*STRIDE
            r1 = min(r0 + STRIDE, lat_block0 + n_lat_native)
            for j in range(nlon):
                c0 = j*STRIDE
                c1 = min(c0 + STRIDE, n_lon_native)
                pct[i, j] = data[r0:r1, c0:c1].mean()
        pct = np.clip(np.round(pct), 0, 100).astype(np.int16)
        grids[key].append(pct.flatten().tolist())

times_ms = [int(run.timestamp() * 1000) + s * 3_600_000 for s in STEPS]

result = {
    "generated": int(time.time() * 1000),
    "model": "icon_eu",
    "run": run.isoformat(),
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 4) if nlat > 1 else 0.25,
    "dlon": round(float(lon_out[1] - lon_out[0]), 4) if nlon > 1 else 0.25,
    "times": times_ms,
    "vals": [v for step_vals in grids["vals"] for v in step_vals],
    "valsLow": [v for step_vals in grids["valsLow"] for v in step_vals],
    "valsMid": [v for step_vals in grids["valsMid"] for v in step_vals],
    "valsHigh": [v for step_vals in grids["valsHigh"] for v in step_vals],
}

os.makedirs("data", exist_ok=True)
with open("data/clouds-icon_eu.json", "w") as f:
    json.dump(result, f)

size_kb = os.path.getsize("data/clouds-icon_eu.json") / 1024
print(f"OK: {len(STEPS)} aikaa x {nlat}x{nlon} = {len(result['vals'])} arvoa/kentta -> "
      f"data/clouds-icon_eu.json ({size_kb:.0f} KB)")
