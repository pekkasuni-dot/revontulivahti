#!/usr/bin/env python3
"""
Hakee Ilmatieteenlaitoksen (FMI) HARMONIE-mallin pilvisyysennusteen avoimesta
WFS/download-rajapinnasta (opendata.fmi.fi) ja kirjoittaa
data/clouds-harmonie-meta.json + data/clouds-harmonie-step<NN>.json
(00..30, yksi tiedosto per aika-askel).

HARMONIE Scandinavia -malli on tarkin tarjolla oleva ilmainen vaihtoehto
Suomen alueelle: natiiviresoluutio noin 0,0225 astetta (~2,5 km), paljon
tarkempi kuin ICON-EU (~7 km) tai ECMWF (~28 km). Tassa alinaytteistetaan
2x2-lohkokeskiarvolla (~5 km) tiedostokoon pitamiseksi kohtuullisena
mobiilikayttoon - natiivi 2,5 km olisi n. 4x suurempi tiedosto.

Toisin kuin ECMWF/ICON-EU, FMI:n /download-rajapinta palauttaa YHDELLA
HTTP-kutsulla jo valmiiksi kaikki pyydetyt aika-askeleet yhtena GRIB2-
tiedostona - ei tarvita WFS:n GML-kuorta eika erillisia tiedostoja per
askel/kentta.

v1: vain kokonaispilvisyys (TotalCloudCover), ei matala/keski/yla-erittelya
(hasLayers=false, sama yksinkertaistus kuin ECMWF:lla) - tiedostokoon ja
pyyntomaaran pitamiseksi kohtuullisena. Voidaan laajentaa myohemmin.

ENNUSTEHORISONTTI (2026-10, laajennus 12h->30h): todennettu oikealla
testihaulla (60 h ikkuna) etta FMI:n HARMONIE Scandinavia -tuote palauttaa
TUNNEITTAISIA aika-askeleita vahintaan 60 h eteenpain ilman aukkoja -
30 h on siis reilusti tuntitiheyden sisalla. HOURS_AHEAD=30 kattaa
aikajanan uuden 24 h nayttokaton + ~6 h turvamarginaalin (ks. CLAUDE.md).
FMI:n oma dokumentaatio (DescribeStoredQueries-vastaus) kertoo mallin
paivittyvan "every 6 hours" - rajapinnassa EI ole origintime-parametria
(toisin kuin DWD:lla), joten julkaisuviivetta ei voitu todentaa yhta
tarkasti kuin ICON-EU:lle - ks. CLAUDE.md/MUISTIO "Ei pystytty todentamaan"
-kohta ja siita tehty paatos (hakutiheys nostettu varmuuden vuoksi).

TIEDOSTOMUOTO (2026-10, muutos): yksi iso tiedosto olisi kasvanut
~3,8 Mt:sta ~9 Mt:iin pelkalla horisontin pidennyksella - jaettu META-
tiedostoon (hila + aika-akseli) ja yhteen tiedostoon PER aika-askel,
sama periaate kuin fetch-clouds-icon_eu.py:ssa (ks. sen docstring).

Vaatii: cfgrib, xarray, numpy (sama kuin muut putket) + apt-paketti
libeccodes-dev CI:ssa. Ei vaadi API-avainta.
"""

import datetime, json, os, sys, tempfile, time, urllib.request, urllib.error
import numpy as np
from model_areas import HARMONIE_BBOX

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

# Suomi + pieni marginaali - FMI:n HARMONIE Scandinavia -tuotteen luonnollinen
# oletusalue tallan tuotteen kohdalla (testattu: suurempi bbox tuotti
# moninkertaisen, epakaytannollisen tiedoston). Vakio tuotu model_areas.py:sta
# - SAMA tuuli-HARMONIEn (fetch-wind-harmonie.py) kanssa.
BBOX = HARMONIE_BBOX
HOURS_AHEAD = 30         # 0-30 h (ks. docstring: 24 h nayttokatto + ~6 h marginaali)
STRIDE = 2                # 2x2-lohkokeskiarvo: ~0,0225 deg -> ~0,045 deg (~5 km)
BASE_URL = "https://opendata.fmi.fi/download"
OUT_DIR = "data"
MODEL = "harmonie"


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


now = datetime.datetime.now(datetime.timezone.utc).replace(minute=0, second=0, microsecond=0)
start = now
end = now + datetime.timedelta(hours=HOURS_AHEAD)

url = (
    f"{BASE_URL}?producer=harmonie_scandinavia_surface&param=TotalCloudCover"
    f"&bbox={BBOX}&starttime={iso(start)}&endtime={iso(end)}"
    f"&format=grib2&projection=EPSG:4326&levels=0&timestep=60"
)
print(f"Haetaan HARMONIE, {iso(start)} - {iso(end)}, bbox={BBOX}...")

tmp = tempfile.mktemp(suffix=".grib2")
for attempt in range(3):
    try:
        with urllib.request.urlopen(url, timeout=90) as r:
            with open(tmp, "wb") as f:
                f.write(r.read())
        break
    except Exception as e:
        if attempt == 2:
            die(f"HARMONIE-lataus epaonnistui: {e}")
        print(f"  ...yritys {attempt+1} epaonnistui ({e}), yritetaan uudelleen")
        time.sleep(5)

print(f"Ladattu: {os.path.getsize(tmp)/1e6:.1f} MB")

print("Puretaan GRIB2...")
try:
    ds_list = cfgrib.open_datasets(tmp)
    ds = next((d for d in ds_list if "tcc" in d.data_vars), None)
    if ds is None:
        die(f"tcc-muuttujaa ei loydy. Saatavilla: {[list(d.data_vars) for d in ds_list]}")
    da = ds["tcc"].load()
    data = da.values                      # (step, lat, lon), arvot 0-100 (FMI antaa suoraan %)
    lat_native = da.latitude.values        # nouseva, S->N (tarkistettu GRIB_jScansPositively=1)
    lon_native = da.longitude.values       # nouseva, W->E
    steps = ds["step"].values if "step" in ds.coords else None
    valid_times = da.valid_time.values if "valid_time" in da.coords else None
    print(f"Dimensiot: {data.shape}  (step, lat, lon)")
except Exception as e:
    die(f"GRIB2-parsinta epaonnistui: {e}")
finally:
    try:
        os.unlink(tmp)
    except Exception:
        pass
    import glob
    for leftover in glob.glob(tmp + ".*.idx"):
        try:
            os.unlink(leftover)
        except Exception:
            pass

ntimes, n_lat_native, n_lon_native = data.shape
nlat = (n_lat_native + STRIDE - 1) // STRIDE
nlon = (n_lon_native + STRIDE - 1) // STRIDE
lat_out = lat_native[[min(i * STRIDE, n_lat_native - 1) for i in range(nlat)]]
lon_out = lon_native[[min(i * STRIDE, n_lon_native - 1) for i in range(nlon)]]
print(f"Hila: natiivi {n_lat_native}x{n_lon_native} -> lohkokeskiarvo {nlat}x{nlon} "
      f"(STRIDE={STRIDE}), lat {lat_out[0]:.3f}-{lat_out[-1]:.3f}, "
      f"lon {lon_out[0]:.3f}-{lon_out[-1]:.3f}")

if valid_times is not None:
    times_ms = [int(np.datetime64(t, "ms").astype("int64")) for t in valid_times]
else:
    # Varapolku: step on aikadelta alusta (yleensa min tai ns)
    times_ms = [int(start.timestamp() * 1000) + int(np.timedelta64(s, "m").astype(int)) * 60000
                for s in steps]

if ntimes != len(times_ms):
    die(f"Aika-askelten maara ({ntimes}) ei tasmaa times_ms-pituuteen ({len(times_ms)})")

os.makedirs(OUT_DIR, exist_ok=True)
step_sizes_kb = []

for i_step in range(ntimes):
    frame = data[i_step]
    out = np.empty((nlat, nlon))
    for i in range(nlat):
        r0, r1 = i * STRIDE, min(i * STRIDE + STRIDE, n_lat_native)
        for j in range(nlon):
            c0, c1 = j * STRIDE, min(j * STRIDE + STRIDE, n_lon_native)
            out[i, j] = frame[r0:r1, c0:c1].mean()
    pct = np.clip(np.round(out), 0, 100).astype(np.int16)
    step_path = f"{OUT_DIR}/clouds-{MODEL}-step{i_step:02d}.json"
    with open(step_path, "w") as f:
        json.dump({"t0": times_ms[0], "vals": pct.flatten().tolist()}, f)   # t0 = ajon tunniste, ks. MUISTIO-lataus.md
    step_sizes_kb.append(os.path.getsize(step_path) / 1024)

meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 5) if nlat > 1 else 0.045,
    "dlon": round(float(lon_out[1] - lon_out[0]), 5) if nlon > 1 else 0.045,
    "hasLayers": False,
    "times": times_ms,
    "stepCount": ntimes,
}
meta_path = f"{OUT_DIR}/clouds-{MODEL}-meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f)

total_kb = sum(step_sizes_kb) + os.path.getsize(meta_path) / 1024
print(f"OK: {ntimes} askelta x {nlat}x{nlon} -> {meta_path} + {ntimes} step-tiedostoa "
      f"(yht. ~{total_kb:.0f} KB, keskim. ~{total_kb/ntimes:.0f} KB/askel)")
