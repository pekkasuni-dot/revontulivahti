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

KERROKSET (2026-10-24): kokonaispilvisyyden (TotalCloudCover) lisaksi matala,
keski- ja ylapilvisyys (LowCloudCover, MediumCloudCover, HighCloudCover) ->
askeltiedostoon valsLow/valsMid/valsHigh (PNG, kuten ICON-EU) ja metaan
hasLayers=true. Kukin kentta haetaan omalla pyynnollaan (muistin kaytto pysyy
yhden kentan kokoisena, ~160 Mt float32). Jos jokin kerros puuttuu tai on
virheellinen, julkaistaan vain kokonaispilvisyys (hasLayers=false, ::warning)
- ei koskaan puolikasta kerrosdataa. Ks. MUISTIO-selvitykset.md.

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
import run_guard   # keskeneräinen ajo (KATSELMOINTI 1.13)
from grid_resample import Resampler   # keskitetty harvennus (2026-10-23)
import cloud_png   # askelkentät PNG:nä (2026-10-24)

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

LAYERS = {"valsLow": "LowCloudCover", "valsMid": "MediumCloudCover", "valsHigh": "HighCloudCover"}


def fetch_param(param, prefer=None):
    """Lataa yhden parametrin kaikki askeleet. Palauttaa (DataArray ladattuna).
    prefer = GRIB-muuttujan nimi (tcc); muuten yksinäinen datamuuttuja."""
    url = (
        f"{BASE_URL}?producer=harmonie_scandinavia_surface&param={param}"
        f"&bbox={BBOX}&starttime={iso(start)}&endtime={iso(end)}"
        f"&format=grib2&projection=EPSG:4326&levels=0&timestep=60"
    )
    print(f"Haetaan HARMONIE {param}, {iso(start)} - {iso(end)}, bbox={BBOX}...")
    tmp = tempfile.mktemp(suffix=".grib2")
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                with open(tmp, "wb") as f:
                    f.write(r.read())
            break
        except Exception as e:
            if attempt == 2:
                raise RuntimeError(f"HARMONIE-lataus ({param}) epaonnistui: {e}")
            print(f"  ...yritys {attempt+1} epaonnistui ({e}), yritetaan uudelleen")
            time.sleep(5)
    print(f"Ladattu: {os.path.getsize(tmp)/1e6:.1f} MB")
    try:
        ds_list = cfgrib.open_datasets(tmp)
        names = [(n, d) for d in ds_list for n in d.data_vars]
        print(f"  GRIB-muuttujat: {[n for n, _ in names]}")
        pick = next(((n, d) for n, d in names if n == prefer), None) if prefer else None
        if pick is None:
            if len(names) != 1:
                raise RuntimeError(f"{param}: odotettiin yksi muuttuja, saatiin {[n for n, _ in names]}")
            pick = names[0]
        return pick[1][pick[0]].load()
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


print("Puretaan GRIB2...")
try:
    da = fetch_param("TotalCloudCover", prefer="tcc")
    data = da.values                      # (step, lat, lon), arvot 0-100 (FMI antaa suoraan %)
    lat_native = da.latitude.values        # nouseva, S->N (tarkistettu GRIB_jScansPositively=1)
    lon_native = da.longitude.values       # nouseva, W->E
    steps = da["step"].values if "step" in da.coords else None
    valid_times = da.valid_time.values if "valid_time" in da.coords else None
    del da
    print(f"Dimensiot: {data.shape}  (step, lat, lon)")
except Exception as e:
    die(f"GRIB2-parsinta epaonnistui: {e}")

ntimes, n_lat_native, n_lon_native = data.shape
# FMI palauttaa tuoreimman saatavilla olevan datan: jos uusin ajo on vielä
# keskeneräinen, askelia voi olla vähemmän -> ei julkaista (KATSELMOINTI 1.13).
try: run_guard.require_steps(ntimes, HOURS_AHEAD + 1)
except run_guard.IncompleteRun as e: run_guard.keep_previous(MODEL, str(e), [f"{OUT_DIR}/clouds-{MODEL}-*.json"])
# Harvennus keskitetysti (grid_resample.py): arvo hilapisteen kohdalla, hila
# natiivin päästä päähän (ennen: lohkon keskiarvo lohkon lounaiskulmassa).
RS = Resampler(lat_native, lon_native, STRIDE)
lat_out, lon_out = RS.lat, RS.lon
nlat, nlon = len(lat_out), len(lon_out)
print(f"Hila: natiivi {n_lat_native}x{n_lon_native} -> keskitetty {nlat}x{nlon} "
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

def layer_scale(units, vmax):
    """Kerroin, jolla kenttä muutetaan prosenteiksi: '%' -> 1, osuus (0-1) -> 100."""
    u = units.strip().lower()
    if u in ("%", "percent"):
        return 1.0
    if u in ("(0 - 1)", "0-1", "1", "fraction", "proportion"):
        return 100.0
    return 100.0 if vmax <= 1.0 + 1e-6 else 1.0


def to_pct(arr):
    """(step, lat, lon) natiivi -> harvennettu uint8 0-100 joka askeleelle."""
    return [np.clip(np.round(RS(arr[i])), 0, 100).astype(np.uint8) for i in range(arr.shape[0])]

fields = {"vals": to_pct(data)}
del data

# Kerrokset: sama hila ja samat askeleet kuin kokonaispilvisyydellä, muuten ei julkaista.
layers = {}
try:
    for key, param in LAYERS.items():
        la = fetch_param(param)
        arr = la.values
        lt = la.valid_time.values if "valid_time" in la.coords else None
        if arr.shape != (ntimes, n_lat_native, n_lon_native):
            raise RuntimeError(f"{param}: muoto {arr.shape} != {(ntimes, n_lat_native, n_lon_native)}")
        if lt is not None and [int(np.datetime64(t, "ms").astype("int64")) for t in lt] != times_ms:
            raise RuntimeError(f"{param}: aika-akseli eri kuin TotalCloudCover")
        if not (np.allclose(la.latitude.values, lat_native) and np.allclose(la.longitude.values, lon_native)):
            raise RuntimeError(f"{param}: hila eri kuin TotalCloudCover")
        if np.isnan(arr).any():
            raise RuntimeError(f"{param}: NaN-arvoja ({int(np.isnan(arr).sum())})")
        # Yksikkö (todettu 2026-10-24 oikeasta ajosta): kerrokset tulevat
        # OSUUTENA 0-1, kokonaispilvisyys prosentteina 0-100 -> skaalaus GRIBin
        # yksikön mukaan (varalla arvoalue). Tallennetaan aina 0-100 %.
        units = str(la.attrs.get("GRIB_units", la.attrs.get("units", "")))
        scale = layer_scale(units, float(np.nanmax(arr)))
        print(f"  {param}: yksikkö '{units}', arvot {float(np.nanmin(arr)):.2f}-{float(np.nanmax(arr)):.2f} -> x{scale:g}")
        layers[key] = to_pct(arr * scale)
        del la, arr
    fields.update(layers)
    has_layers = True
except Exception as e:
    print(f"::warning title=HARMONIE-kerrokset puuttuvat::{e} - julkaistaan vain kokonaispilvisyys")
    has_layers = False

os.makedirs(OUT_DIR, exist_ok=True)
step_sizes_kb = []

for i_step in range(ntimes):
    step_path = f"{OUT_DIR}/clouds-{MODEL}-step{i_step:02d}.json"
    # Kentät harmaasävy-PNG:nä (base64), scripts/cloud_png.py (2026-10-24).
    step = {"t0": times_ms[0]}   # t0 = ajon tunniste, ks. MUISTIO-lataus.md
    for key, frames in fields.items():
        step[key] = cloud_png.encode(frames[i_step])
    with open(step_path, "w") as f:
        json.dump(step, f)
    step_sizes_kb.append(os.path.getsize(step_path) / 1024)

meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    **RS.meta(),   # lat0/lat1/lon0/lon1, nlat/nlon, dlat = (lat1-lat0)/(nlat-1) tarkasti
    "hasLayers": has_layers,
    "times": times_ms,
    "stepCount": ntimes,
}
meta_path = f"{OUT_DIR}/clouds-{MODEL}-meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f)

total_kb = sum(step_sizes_kb) + os.path.getsize(meta_path) / 1024
print(f"OK: {ntimes} askelta x {nlat}x{nlon}, kerrokset {'kyllä' if has_layers else 'EI'} -> {meta_path} + {ntimes} step-tiedostoa "
      f"(yht. ~{total_kb:.0f} KB, keskim. ~{total_kb/ntimes:.0f} KB/askel)")
