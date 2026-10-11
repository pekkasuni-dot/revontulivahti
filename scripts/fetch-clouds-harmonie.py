#!/usr/bin/env python3
"""
Hakee Ilmatieteenlaitoksen (FMI) HARMONIE-mallin pilvisyysennusteen avoimesta
WFS/download-rajapinnasta (opendata.fmi.fi) ja kirjoittaa data/clouds-harmonie.json.

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

Vaatii: cfgrib, xarray, numpy (sama kuin muut putket) + apt-paketti
libeccodes-dev CI:ssa. Ei vaadi API-avainta.
"""

import datetime, json, os, sys, tempfile, time, urllib.request, urllib.error
import numpy as np

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

# Suomi + pieni marginaali - FMI:n HARMONIE Scandinavia -tuotteen luonnollinen
# oletusalue tallan tuotteen kohdalla (testattu: suurempi bbox tuotti
# moninkertaisen, epakaytannollisen tiedoston).
BBOX = "19,59,32,70"
HOURS_AHEAD = 12          # 0-12 h, sama kaytanto kuin ICON-EU:lla
STRIDE = 2                # 2x2-lohkokeskiarvo: ~0,0225 deg -> ~0,045 deg (~5 km)
BASE_URL = "https://opendata.fmi.fi/download"


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

vals = []
for i_step in range(ntimes):
    frame = data[i_step]
    out = np.empty((nlat, nlon))
    for i in range(nlat):
        r0, r1 = i * STRIDE, min(i * STRIDE + STRIDE, n_lat_native)
        for j in range(nlon):
            c0, c1 = j * STRIDE, min(j * STRIDE + STRIDE, n_lon_native)
            out[i, j] = frame[r0:r1, c0:c1].mean()
    pct = np.clip(np.round(out), 0, 100).astype(np.int16)
    vals.extend(pct.flatten().tolist())

result = {
    "generated": int(time.time() * 1000),
    "model": "harmonie",
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 5) if nlat > 1 else 0.045,
    "dlon": round(float(lon_out[1] - lon_out[0]), 5) if nlon > 1 else 0.045,
    "times": times_ms,
    "vals": vals,
}

os.makedirs("data", exist_ok=True)
with open("data/clouds-harmonie.json", "w") as f:
    json.dump(result, f)

size_kb = os.path.getsize("data/clouds-harmonie.json") / 1024
print(f"OK: {ntimes} aikaa x {nlat}x{nlon} = {len(vals)} arvoa -> "
      f"data/clouds-harmonie.json ({size_kb:.0f} KB)")
