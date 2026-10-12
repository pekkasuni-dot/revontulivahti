#!/usr/bin/env python3
"""
Hakee tuulen U/V-komponentit Ilmatieteenlaitoksen (FMI) HARMONIE-mallista
(opendata.fmi.fi) yhdelle korkeudelle ja kirjoittaa data/wind-<level>.json.

Kaytto: python3 scripts/fetch-wind.py <surface|850|500|300>

Lahde sama kuin pilvien HARMONIE-malli (ks. fetch-clouds-harmonie.py) -
samat stored queryt (fmi::forecast::harmonie::surface::grid /
...::pressure::grid), samat parametrit WindUMS/WindVMS. Pinta = 10 m
(GRIB-tyyppi heightAboveGround, muuttujat u10/v10). Painepinnat 850/500/300 hPa
(GRIB-tyyppi isobaricInhPa, muuttujat u/v).

Pakkaus: arvot kvantisoidaan tavuiksi (0-255) kiintealueelle [-80,80] m/s
(kattaa myos 300 hPa:n suihkuvirtauksen) ja koodataan base64-merkkijonoksi -
paljon tiiviimpi kuin JSON-lukutaulukko (ks. tehtavan vaatimus "pakattuna
tiiviisti"). Selain purkaa: arvo = tavu/255*(max-min)+min.

Hila ja alinaytteistys sama alinaytteistyssuhde kuin fetch-clouds-
harmonie.py:ssa (STRIDE=2, ~5 km) - mutta ERI (laajempi) bbox, ks. alla.

ALUE: HARMONIE Scandinavia -mallin oma natiivi kattavuus on huomattavasti
laajempi kuin alun perin kaytetty Suomi-rajaus (todennettu lataamalla
natiivi GRIB2 KOKONAAN ilman bbox-rajoitusta: lat 49,77-75,23 N,
lon -18,12 - 54,24 E). TAMA EI KUITENKAAN ole suorakulmainen alue
EPSG:4326-projektiossa - natiivihila on ilmeisesti kierretty/vino
(todennakoisesti Lambert-projektio uudelleenprojisoituna), ja FMI:n
palauttama lat/lon-"laatikko" sisaltaa NaN-arvoja reunoilla (todennettu:
~37 % soluista NaN koko laatikossa, kaikki 4 kulmaa NaN). Erityisesti
pohjoisessa (>~74 N) kelvollinen pituusastealue kapenee nopeasti
(74,64 N: lon -1,9..31,9 -> 75,09 N: lon 6,8..23,2).

Etsin suurimman NaN-VAPAAN suorakulmion leikkaamalla natiivialueen
pilvitason (ECMWF) alueeseen 30 W-60 E, 55-75 N ("enintaan pilvitason
alueelle" -vaatimus) ja tarkistamalla jokaisen rivin/sarakkeen NaN-
tilanteen: lat 55-75 N -> kelvollinen lon-alue kapenee vain 3,9..26,1:ksi
(74-75 N rajoittaa). Lat-ylaraja 73,5 N:aan pudottamalla kelvollinen
lon-alue laajenee -1..35:een asti JA pysyy samana koko 55-73,5 N:n
matkalla (todennettu: 0 NaN-solua koko laatikossa, molemmilla
testatuilla aika-askeleilla). BBOX alla = "-1,55,35,73.5" - HUOMATTAVASTI
laajempi kuin Suomi-rajaus, mutta EI ulotu pilvitason koko alueeseen
(75 N / -30..60 E), koska HARMONIEn oma kattavuus ei sita salli NaN-
vapaasti. Ks. MUISTIO-korkeudet-tuuli.md "Tuulialueen laajennus" -osio
taydellisesta analyysista ja ehdotuksesta reuna-alueiden taydentamisesta
ICON-EU:lla (EI toteutettu, odottaa lupaa).
"""

import base64, datetime, json, os, sys, tempfile, time, urllib.request
import numpy as np

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

BBOX = "-1,55,35,73.5"          # suurin todennettu NaN-vapaa suorakulmio HARMONIEn natiivialueella, ks. yllaoleva docstring
HOURS_AHEAD = 12
STRIDE = 2                      # ~0,0225 deg -> ~0,045 deg (~5 km), sama kuin pilvet
BASE_URL = "https://opendata.fmi.fi/download"
VRANGE = (-80.0, 80.0)          # kvantisointialue m/s (kattaa 300 hPa:n suihkuvirtauksen)

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
print(f"Haetaan tuuli ({level_key}), {iso(start)} - {iso(end)}...")

tmp = tempfile.mktemp(suffix=".grib2")
for attempt in range(3):
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
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
# BBOX yllä on todennettu NaN-vapaaksi, mutta jos malli vaihtaa toteutusta/
# domainia, halutaan selkea virhe TASSA, ei sekava virhe quantize()-funktiossa.
if np.isnan(u_data).any() or np.isnan(v_data).any():
    die(f"GRIB2-data ({level_key}) sisaltaa NaN-arvoja valitulla BBOX:lla "
        f"({BBOX}) - HARMONIEn natiivialue on muuttunut tai BBOX liian laaja. "
        f"Ks. fetch-wind.py:n docstring NaN-analyysista.")

ntimes, n_lat_native, n_lon_native = u_data.shape
nlat = (n_lat_native + STRIDE - 1) // STRIDE
nlon = (n_lon_native + STRIDE - 1) // STRIDE
lat_out = lat_native[[min(i * STRIDE, n_lat_native - 1) for i in range(nlat)]]
lon_out = lon_native[[min(i * STRIDE, n_lon_native - 1) for i in range(nlon)]]
print(f"Hila: natiivi {n_lat_native}x{n_lon_native} -> lohkokeskiarvo {nlat}x{nlon}")

if valid_times is not None:
    times_ms = [int(np.datetime64(t, "ms").astype("int64")) for t in valid_times]
else:
    times_ms = [int(start.timestamp() * 1000) + h * 3600000 for h in range(ntimes)]


def quantize(block_mean_val):
    vmin, vmax = VRANGE
    frac = (block_mean_val - vmin) / (vmax - vmin)
    return int(np.clip(round(frac * 255), 0, 255))


def block_average_and_quantize(data):
    out_bytes = bytearray(ntimes * nlat * nlon)
    k = 0
    for i_step in range(ntimes):
        frame = data[i_step]
        for i in range(nlat):
            r0, r1 = i * STRIDE, min(i * STRIDE + STRIDE, n_lat_native)
            for j in range(nlon):
                c0, c1 = j * STRIDE, min(j * STRIDE + STRIDE, n_lon_native)
                m = frame[r0:r1, c0:c1].mean()
                out_bytes[k] = quantize(m)
                k += 1
    return bytes(out_bytes)


print("Kvantisoidaan U...")
u_bytes = block_average_and_quantize(u_data)
print("Kvantisoidaan V...")
v_bytes = block_average_and_quantize(v_data)

result = {
    "generated": int(time.time() * 1000),
    "model": "harmonie",
    "level": level_key,
    "levelLabel": cfg["label"],
    "altitudeText": cfg["altitude_text"],
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 5) if nlat > 1 else 0.045,
    "dlon": round(float(lon_out[1] - lon_out[0]), 5) if nlon > 1 else 0.045,
    "times": times_ms,
    "vmin": VRANGE[0], "vmax": VRANGE[1],
    "u": base64.b64encode(u_bytes).decode("ascii"),
    "v": base64.b64encode(v_bytes).decode("ascii"),
}

os.makedirs("data", exist_ok=True)
outpath = f"data/wind-{level_key}.json"
with open(outpath, "w") as f:
    json.dump(result, f)

size_kb = os.path.getsize(outpath) / 1024
print(f"OK: {ntimes} aikaa x {nlat}x{nlon} -> {outpath} ({size_kb:.0f} KB)")
