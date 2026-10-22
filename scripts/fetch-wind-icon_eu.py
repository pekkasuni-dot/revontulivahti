#!/usr/bin/env python3
"""
Hakee DWD ICON-EU -tuuliennusteen (U/V-komponentit) NELJALLE korkeudelle
(pinta 10 m, 850/500/300 hPa) SUORAAN DWD:n avoimesta datasta
(opendata.dwd.de, GRIB2) ja kirjoittaa per taso
data/wind-icon_eu-<taso>-meta.json + data/wind-icon_eu-<taso>-step00..30.json.

Vahvistettu OIKEALLA hakemistolistauksella (ei oletettu):
- Pinta: hakemistot u_10m/v_10m, tiedostot
  icon-eu_europe_regular-lat-lon_single-level_<run>_<step>_U_10M.grib2.bz2
  (ja _V_10M) - sama "single-level"-rakenne kuin pilvien CLCT.
- Painepinnat: hakemistot u/v SISALTAVAT SEKA "model-level" (hybridipinnat,
  EI haluttuja) etta "pressure-level" (hPa-tasot, NAMA halutaan) -tiedostoja
  SAMASSA hakemistossa - tiedostonimi sisaltaa tyypin ("pressure-level")
  ja hPa-arvon: icon-eu_europe_regular-lat-lon_pressure-level_<run>_<step>_
  <hPa>_U.grib2.bz2. Todennettu etta 850/500/300 hPa ovat kaikki saatavilla,
  tunneittain 0-78 h asti (sama kuin CLCT).

ALUE: model_areas.py:n ICON_EU_LAT0/LAT1 (55-70,5 N, sama kuin pilvi-ICON-EU),
pituusaste = DWD:n koko natiivialue (ei rajata, sama kuin pilvi-ICON-EU) -
TASMALLEEN sama alue kuin fetch-clouds-icon_eu.py.

HORISONTTI: 0-30 h tunneittain (31 askelta), sama kuin pilvi-ICON-EU.

TIEDOSTOMUOTO: meta + per-askel-tiedostot, sama periaate kuin pilvi-
ICON-EU:ssa (ks. fetch-clouds-icon_eu.py:n docstring) - selain lataa
vain 1-2 askelta kerrallaan.

Vaatii: cfgrib, xarray, numpy + apt-paketti libeccodes-dev CI:ssa.
"""

import base64, bz2, datetime, glob, json, os, sys, tempfile, time
import urllib.request
import numpy as np
from model_areas import ICON_EU_LAT0, ICON_EU_LAT1

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

BASE = "https://opendata.dwd.de/weather/nwp/icon-eu/grib"
STEPS = list(range(0, 31))         # 0-30 h tunneittain, sama kuin pilvi-ICON-EU
RUN_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]

TARGET_LAT0, TARGET_LAT1 = ICON_EU_LAT0, ICON_EU_LAT1
# RESOLUUTIO (2026-10, muutos samassa yhteydessa kuin pilvi-ICON-EU:n
# noston natiiviin ~7 km:iin, ks. fetch-clouds-icon_eu.py): tuuli
# jatetaan TARKOITUKSELLA karkeammaksi kuin pilvi - "~10-15 km riittaa"
# (kayttajan pyynto) - STRIDE=2 = natiivi 0,0625 deg * 2 = 0,125 deg
# (~13,9 km), karkeampi kuin pilvien STRIDE=1 mutta tarkempi kuin
# vanha yhteinen STRIDE=4 (~28 km).
STRIDE = 2
VRANGE = (-80.0, 80.0)
OUT_DIR = "data"
MODEL = "icon_eu"

# (dir, tiedostotyyppi, hPa-arvo tai None pinnalle)
LEVELS = {
    "surface": {"label": "Pinta (10 m)", "altitude_text": "10 m",
                "u_dir": "u_10m", "v_dir": "v_10m", "u_code": "U_10M", "v_code": "V_10M",
                "kind": "single-level", "hpa": None},
    "850": {"label": "850 hPa (~1,5 km)", "altitude_text": "~1,5 km",
            "u_dir": "u", "v_dir": "v", "u_code": "U", "v_code": "V",
            "kind": "pressure-level", "hpa": 850},
    "500": {"label": "500 hPa (~5,5 km)", "altitude_text": "~5,5 km",
            "u_dir": "u", "v_dir": "v", "u_code": "U", "v_code": "V",
            "kind": "pressure-level", "hpa": 500},
    "300": {"label": "300 hPa (~9 km)", "altitude_text": "~9 km",
            "u_dir": "u", "v_dir": "v", "u_code": "U", "v_code": "V",
            "kind": "pressure-level", "hpa": 300},
}


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


if len(sys.argv) != 2 or sys.argv[1] not in LEVELS:
    die(f"Kaytto: python3 {sys.argv[0]} <{'|'.join(LEVELS)}>")

level_key = sys.argv[1]
cfg = LEVELS[level_key]


def url_for(run_dt, field_dir, field_code, step, hpa):
    hh = f"{run_dt.hour:02d}"
    ts = run_dt.strftime("%Y%m%d%H")
    if cfg["kind"] == "single-level":
        fname = f"icon-eu_europe_regular-lat-lon_single-level_{ts}_{step:03d}_{field_code}.grib2.bz2"
    else:
        fname = f"icon-eu_europe_regular-lat-lon_pressure-level_{ts}_{step:03d}_{hpa}_{field_code}.grib2.bz2"
    return f"{BASE}/{hh}/{field_dir}/{fname}"


def url_exists(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception:
        return False


def pick_latest_run():
    """SAMA logiikka kuin fetch-clouds-icon_eu.py (testataan CLCT-step0:lla,
       jotta pilvi- ja tuulihaku valitsevat sama tavalla todennakoisimmin
       saman ajon - HUOM: jos ne ajetaan eri GH Actions -tyonkuluissa eri
       hetkina, pieni riski etta valitsevat ERI ajon jos uusi juuri
       julkaistiin niiden valissa - ks. MUISTIO, tiedossa oleva rajoite)."""
    now = datetime.datetime.now(datetime.timezone.utc).replace(
        minute=0, second=0, microsecond=0)
    for back in range(0, 8):
        cand = now - datetime.timedelta(hours=now.hour % 3)
        cand -= datetime.timedelta(hours=3 * back)
        if cand.hour not in RUN_HOURS:
            continue
        test_url = f"{BASE}/{cand.hour:02d}/clct/icon-eu_europe_regular-lat-lon_single-level_{cand.strftime('%Y%m%d%H')}_000_CLCT.grib2.bz2"
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

os.makedirs(OUT_DIR, exist_ok=True)


def quantize(block_mean_val, vmin, vmax):
    frac = (block_mean_val - vmin) / (vmax - vmin)
    return int(np.clip(round(frac * 255), 0, 255))


step_sizes_kb = []
for step_idx, step in enumerate(STEPS):
    print(f"Askel {step:03d} h ...")
    field_bytes = {}
    for comp, field_dir, field_code in (("u", cfg["u_dir"], cfg["u_code"]),
                                          ("v", cfg["v_dir"], cfg["v_code"])):
        raw = download_grib(url_for(run, field_dir, field_code, step, cfg["hpa"]))
        data, lat_native, lon_native = parse_grib(raw)

        if not grid_computed:
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

        out_bytes = bytearray(nlat * nlon)
        k = 0
        for i in range(nlat):
            r0 = lat_block0 + i*STRIDE
            r1 = min(r0 + STRIDE, lat_block0 + n_lat_native)
            for j in range(nlon):
                c0 = j*STRIDE
                c1 = min(c0 + STRIDE, n_lon_native)
                out_bytes[k] = quantize(data[r0:r1, c0:c1].mean(), *VRANGE)
                k += 1
        field_bytes[comp] = bytes(out_bytes)

    step_path = f"{OUT_DIR}/wind-{MODEL}-{level_key}-step{step_idx:02d}.json"
    with open(step_path, "w") as f:
        json.dump({"t0": int(run.timestamp() * 1000) + STEPS[0] * 3_600_000,   # ajon tunniste = metan times[0]
                   "u": base64.b64encode(field_bytes["u"]).decode("ascii"),
                    "v": base64.b64encode(field_bytes["v"]).decode("ascii")}, f)
    step_sizes_kb.append(os.path.getsize(step_path) / 1024)

times_ms = [int(run.timestamp() * 1000) + s * 3_600_000 for s in STEPS]

meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "level": level_key,
    "levelLabel": cfg["label"],
    "altitudeText": cfg["altitude_text"],
    "run": run.isoformat(),
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 4) if nlat > 1 else 0.25,
    "dlon": round(float(lon_out[1] - lon_out[0]), 4) if nlon > 1 else 0.25,
    "vmin": VRANGE[0], "vmax": VRANGE[1],
    "times": times_ms,
    "stepCount": len(STEPS),
}
meta_path = f"{OUT_DIR}/wind-{MODEL}-{level_key}-meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f)

total_kb = sum(step_sizes_kb) + os.path.getsize(meta_path) / 1024
print(f"OK: {level_key}: {len(STEPS)} askelta x {nlat}x{nlon} -> {meta_path} + {len(STEPS)} step-tiedostoa "
      f"(yht. ~{total_kb:.0f} KB, keskim. ~{total_kb/len(STEPS):.0f} KB/askel)")
