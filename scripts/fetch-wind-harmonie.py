#!/usr/bin/env python3
"""
Hakee tuulen U/V-komponentit Ilmatieteenlaitoksen (FMI) HARMONIE-mallista
(opendata.fmi.fi) yhdelle korkeudelle ja kirjoittaa
data/wind-harmonie-<taso>-meta.json + data/wind-harmonie-<taso>-step00..30.json.

Kaytto: python3 scripts/fetch-wind-harmonie.py <surface|850|500|300>

Lahde sama kuin pilvien HARMONIE-malli (ks. fetch-clouds-harmonie.py) -
samat stored queryt (fmi::forecast::harmonie::surface::grid /
...::pressure::grid), samat parametrit WindUMS/WindVMS. Pinta = 10 m
(GRIB-tyyppi heightAboveGround, muuttujat u10/v10). Painepinnat 850/500/300 hPa
(GRIB-tyyppi isobaricInhPa, muuttujat u/v).

ALUE (2026-10, MUUTOS): BBOX tuodaan NYT model_areas.py:sta (HARMONIE_BBOX,
"19,59,32,70") - TASMALLEEN sama alue kuin fetch-clouds-harmonie.py kayttaa.
Aiemmin (ks. git-historia, MUISTIO-korkeudet-tuuli.md "Tuulialueen laajennus")
tuuli kaytti PALJON laajempaa aluetta ("-1,55,35,73.5", suurin NaN-vapaa
suorakulmio) kuin pilvi-HARMONIE - tama PERUTTIIN koska vaatimus "tuulen ja
pilvien pitaa olla TASMALLEEN samalla alueella niin etta pyorteet/rintamat
osuvat yhteen" on tarkeampi kuin "mahdollisimman laaja tuulialue". Pienempi,
pilvien kanssa yhteinen bbox on HYVIN sisalla NaN-vapaalla alueella (sama
natiivihila, ks. fetch-wind.py:n vanha NaN-analyysi tai MUISTIO) - ei
uutta NaN-riskia.

HORISONTTI: 0-30 h tunneittain (31 askelta), sama kuin pilvi-HARMONIE
(ks. fetch-clouds-harmonie.py "ennustehorisontti"-docstring) - vaatimus
"tuuli seuraa valitun mallin omia aika-askeleita, kuten pilvet".

TIEDOSTOMUOTO: meta (hila+aika-akseli) + yksi tiedosto per aika-askel,
sama periaate kuin pilvi-HARMONIEssa - selain lataa vain 1-2 askelta
kerrallaan (ks. index.html:n ensureWindStepLoaded()).

Pakkaus: arvot kvantisoidaan tavuiksi (0-255) kiintealueelle [-80,80] m/s
(kattaa myos 300 hPa:n suihkuvirtauksen) ja koodataan base64-merkkijonoksi -
paljon tiiviimpi kuin JSON-lukutaulukko. Selain purkaa: arvo = tavu/255*(max-min)+min.

RESOLUUTIO (2026-10, MUUTOS alueen laajennuksen yhteydessa): STRIDE=4
(~10 km) - HARVEMPI kuin pilvi-HARMONIEn STRIDE=2 (~5 km). Syy: alueen
laajennus Suomesta koko Skandinaviaan (ks. model_areas.py HARMONIE_BBOX)
kasvatti pistemaaraa ~4,7x; tuulelle 10 km on riittava tarkkuus
nuolille/hiukkasanimaatiolle (ei tarvitse samaa tarkkuutta kuin pilvi-
rajojen piirtoon), ja STRIDE=2->4 NELJANTAA pistemaaran (puolittaa
molemmat akselit) - kumoaa karkeasti alueen laajennuksen tiedostokoon
kannalta. EI sidottu pilvien STRIDEen koodissa (sampleWindAt() lukee
tuuli- ja pilvihilat TAYSIN erillisina, oma lat/lon-metadatansa
kummallakin) - turvallinen muuttaa itsenaisesti.

Vaatii: cfgrib, xarray, numpy. Ei vaadi API-avainta.
"""

import base64, datetime, json, os, sys, tempfile, time, urllib.request
import numpy as np
from model_areas import HARMONIE_BBOX
import run_guard   # keskeneräinen ajo (KATSELMOINTI 1.13)

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

BBOX = HARMONIE_BBOX           # sama alue kuin pilvi-HARMONIE, ks. yllaoleva docstring
HOURS_AHEAD = 30               # 0-30 h tunneittain, sama kuin pilvi-HARMONIE
STRIDE = 4                      # ~0,0225 deg -> ~0,09 deg (~10 km) - ks. docstring "RESOLUUTIO"
BASE_URL = "https://opendata.fmi.fi/download"
VRANGE = (-80.0, 80.0)          # kvantisointialue m/s (kattaa 300 hPa:n suihkuvirtauksen)
OUT_DIR = "data"
MODEL = "harmonie"

LEVELS = {
    "surface": {
        "producer": "harmonie_scandinavia_surface", "levels": "0",
        "label": "Pinta (10 m)", "altitude_text": "10 m",
    },
    "850": {
        "producer": "harmonie_scandinavia_pressure", "levels": "850",
        "label": "850 hPa (~1,5 km)", "altitude_text": "~1,5 km",
    },
    "500": {
        "producer": "harmonie_scandinavia_pressure", "levels": "500",
        "label": "500 hPa (~5,5 km)", "altitude_text": "~5,5 km",
    },
    "300": {
        "producer": "harmonie_scandinavia_pressure", "levels": "300",
        "label": "300 hPa (~9 km)", "altitude_text": "~9 km",
    },
}


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


if len(sys.argv) != 2 or sys.argv[1] not in LEVELS:
    die(f"Kaytto: python3 {sys.argv[0]} <{'|'.join(LEVELS)}>")

level_key = sys.argv[1]
cfg = LEVELS[level_key]


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


now = datetime.datetime.now(datetime.timezone.utc).replace(minute=0, second=0, microsecond=0)
start, end = now, now + datetime.timedelta(hours=HOURS_AHEAD)

url = (
    f"{BASE_URL}?producer={cfg['producer']}&param=WindUMS,WindVMS"
    f"&bbox={BBOX}&starttime={iso(start)}&endtime={iso(end)}"
    f"&format=grib2&projection=EPSG:4326&levels={cfg['levels']}&timestep=60"
)
print(f"Haetaan tuuli ({level_key}), {iso(start)} - {iso(end)}, bbox={BBOX}...")

tmp = tempfile.mktemp(suffix=".grib2")
for attempt in range(3):
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            with open(tmp, "wb") as f:
                f.write(r.read())
        break
    except Exception as e:
        if attempt == 2:
            die(f"Tuulen lataus epaonnistui ({level_key}): {e}")
        print(f"  ...yritys {attempt+1} epaonnistui ({e}), yritetaan uudelleen")
        time.sleep(5)

print(f"Ladattu: {os.path.getsize(tmp)/1e6:.1f} MB")

print("Puretaan GRIB2...")
try:
    ds_list = cfgrib.open_datasets(tmp)
    ds = ds_list[0]
    names = list(ds.data_vars)
    u_name = next((n for n in names if n in ("u", "u10")), None)
    v_name = next((n for n in names if n in ("v", "v10")), None)
    if u_name is None or v_name is None:
        die(f"U/V-muuttujia ei loydy. Saatavilla: {names}")
    u_da = ds[u_name].load()
    v_da = ds[v_name].load()
    u_data = u_da.values           # (step, lat, lon), m/s
    v_data = v_da.values
    lat_native = u_da.latitude.values
    lon_native = u_da.longitude.values
    valid_times = u_da.valid_time.values if "valid_time" in u_da.coords else None
    print(f"Dimensiot: {u_data.shape}  (step, lat, lon), muuttujat {u_name}/{v_name}")
except Exception as e:
    die(f"GRIB2-parsinta epaonnistui ({level_key}): {e}")
finally:
    import glob
    for leftover in [tmp] + glob.glob(tmp + ".*.idx"):
        try:
            os.unlink(leftover)
        except Exception:
            pass

# HARMONIEn natiivihila on vino/kierretty (ei suorakulmainen EPSG:4326:ssa) -
# BBOX on sama kuin pilvilla, todistetusti kaukana NaN-reunoista (ks. docstring),
# mutta jos malli vaihtaa toteutusta/domainia, halutaan selkea virhe TASSA.
if np.isnan(u_data).any() or np.isnan(v_data).any():
    die(f"GRIB2-data ({level_key}) sisaltaa NaN-arvoja valitulla BBOX:lla "
        f"({BBOX}) - HARMONIEn natiivialue on muuttunut tai BBOX liian laaja.")

ntimes, n_lat_native, n_lon_native = u_data.shape
# Vajaa ajo -> ei julkaista (KATSELMOINTI 1.13), ks. fetch-clouds-harmonie.py.
try: run_guard.require_steps(min(ntimes, v_data.shape[0]), HOURS_AHEAD + 1)
except run_guard.IncompleteRun as e: run_guard.keep_previous(f"{MODEL} {level_key}", str(e), [f"{OUT_DIR}/wind-{MODEL}-{level_key}-*.json"])
nlat = (n_lat_native + STRIDE - 1) // STRIDE
nlon = (n_lon_native + STRIDE - 1) // STRIDE
lat_out = lat_native[[min(i * STRIDE, n_lat_native - 1) for i in range(nlat)]]
lon_out = lon_native[[min(i * STRIDE, n_lon_native - 1) for i in range(nlon)]]
print(f"Hila: natiivi {n_lat_native}x{n_lon_native} -> lohkokeskiarvo {nlat}x{nlon}")

if valid_times is not None:
    times_ms = [int(np.datetime64(t, "ms").astype("int64")) for t in valid_times]
else:
    times_ms = [int(start.timestamp() * 1000) + h * 3600000 for h in range(ntimes)]

if ntimes != len(times_ms):
    die(f"Aika-askelten maara ({ntimes}) ei tasmaa times_ms-pituuteen ({len(times_ms)})")


def quantize(block_mean_val):
    vmin, vmax = VRANGE
    frac = (block_mean_val - vmin) / (vmax - vmin)
    return int(np.clip(round(frac * 255), 0, 255))


def block_average_and_quantize_one_step(frame):
    out_bytes = bytearray(nlat * nlon)
    k = 0
    for i in range(nlat):
        r0, r1 = i * STRIDE, min(i * STRIDE + STRIDE, n_lat_native)
        for j in range(nlon):
            c0, c1 = j * STRIDE, min(j * STRIDE + STRIDE, n_lon_native)
            out_bytes[k] = quantize(frame[r0:r1, c0:c1].mean())
            k += 1
    return bytes(out_bytes)


os.makedirs(OUT_DIR, exist_ok=True)
step_sizes_kb = []
for i_step in range(ntimes):
    u_bytes = block_average_and_quantize_one_step(u_data[i_step])
    v_bytes = block_average_and_quantize_one_step(v_data[i_step])
    step_path = f"{OUT_DIR}/wind-{MODEL}-{level_key}-step{i_step:02d}.json"
    with open(step_path, "w") as f:
        json.dump({"t0": times_ms[0],   # ajon tunniste (KATSELMOINTI 1.3)
                   "u": base64.b64encode(u_bytes).decode("ascii"),
                    "v": base64.b64encode(v_bytes).decode("ascii")}, f)
    step_sizes_kb.append(os.path.getsize(step_path) / 1024)
    print(f"Askel {i_step:02d} ...")

meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "level": level_key,
    "levelLabel": cfg["label"],
    "altitudeText": cfg["altitude_text"],
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 5) if nlat > 1 else 0.045,
    "dlon": round(float(lon_out[1] - lon_out[0]), 5) if nlon > 1 else 0.045,
    "vmin": VRANGE[0], "vmax": VRANGE[1],
    "times": times_ms,
    "stepCount": ntimes,
}
meta_path = f"{OUT_DIR}/wind-{MODEL}-{level_key}-meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f)

total_kb = sum(step_sizes_kb) + os.path.getsize(meta_path) / 1024
print(f"OK: {ntimes} askelta x {nlat}x{nlon} -> {meta_path} + {ntimes} step-tiedostoa "
      f"(yht. ~{total_kb:.0f} KB, keskim. ~{total_kb/ntimes:.0f} KB/askel)")
