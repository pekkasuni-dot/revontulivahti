#!/usr/bin/env python3
"""
Hakee Ilmatieteen laitoksen EDITOIDUN ennusteen (meteorologien ennuste,
tuottaja `pal_skandinavia`) kokonaispilvisyyden Tänä yönä -välilehteä varten
(2026-10-26, MUISTIO-selvitykset.md "MNWC-lähiennuste" / vaihtoehto A) ja
kirjoittaa data/clouds-edited-meta.json + data/clouds-edited-stepNN.json.

Miksi: editoitu ennuste päivittyy päivällä tunnin, illalla ja yöllä 2 tunnin
välein, ja ajo on haettavissa ~30 min (11-55 min) ajon jälkeen. HARMONIE on
3-6 h vanha. Yöseurannassa 25.-26.10. editoitu osui rikkonaiseen pilveen
(Lyngen) paremmin.

AJO NIMELTÄ: FMI:n palvelimet palauttivat mittauksessa välillä vanhemman ajon
kuin edellisellä haulla (kuormantasaus). Siksi:
  1. uusin ajo (origintime) kysytään /timeseries-rajapinnalta useamman kerran
     ja valitaan suurin,
  2. jos se ei ole uudempi kuin jo julkaistu ajo (PREV_META, gh-pagesin
     clouds-edited-meta.json), edellinen jää voimaan (run_guard.keep_previous),
  3. hila haetaan /download-rajapinnalta `origintime`-parametrilla,
  4. GRIBin viiteaika tarkistetaan: jos palvelin palautti eri ajon, ei julkaista.

Hila natiivina (0,0667 x 0,0662 deg, ~7 km N-S): EI harvennusta - Resampler
levittäisi NaN-arvot (vinon malli-alueen kulmat) koko hilaan. NaN -> 255 PNG:ssä
(cloud_png.encode_masked), selain tulkitsee arvon > 100 puuttuvaksi.

Ei vaikuta hälytyksiin (kenttätesti 6.11. asti): alerts/ ei lue tätä tiedostoa.
Vaatii: cfgrib, xarray, numpy, Pillow + libeccodes (kuten muut putket). Ei avainta.
"""
import datetime, glob, json, os, sys, tempfile, time, urllib.parse, urllib.request
import numpy as np
from model_areas import EDITED_BBOX
import run_guard
import cloud_png

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}", file=sys.stderr)
    sys.exit(1)

MODEL = "edited"
PRODUCER = "pal_skandinavia"
BBOX = EDITED_BBOX
HOURS_BACK = 1          # edellinen tasatunti mukaan (kuluva tunti interpoloidaan)
HOURS_AHEAD = 18        # Tänä yönä: enintään NIGHT_CFG.maxHours (16 h) + marginaali
ORIGIN_PROBES = 3       # uusimman ajon kysely näin monta kertaa (palvelimet eivät ole yhdenmukaisia)
PROBE_POINTS = ["68.0,25.0", "69.7,20.6", "65.0,25.5"]
OUT_DIR = "data"
CLEAN = [f"{OUT_DIR}/clouds-{MODEL}-*.json"]


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": "revontulivahti (github.com/pekkasuni-dot/revontulivahti)"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_origin(s):
    """FMI:n origintime ('20261025T154000' tai ISO) -> UTC datetime."""
    s = str(s).strip().replace("-", "").replace(":", "").replace("Z", "")
    return datetime.datetime.strptime(s[:15], "%Y%m%dT%H%M%S").replace(tzinfo=datetime.timezone.utc)


def latest_origin():
    """Uusin ajo: suurin useasta /timeseries-kyselystä (eri pisteet, eri kerrat)."""
    seen = []
    for k in range(ORIGIN_PROBES):
        q = urllib.parse.urlencode({"producer": PRODUCER, "param": "origintime", "latlon": PROBE_POINTS[k % len(PROBE_POINTS)],
                                    "format": "json", "tz": "UTC", "timesteps": 1})
        try:
            rows = json.loads(get("https://opendata.fmi.fi/timeseries?" + q, 30))
            seen.append(parse_origin(rows[0]["origintime"]))
        except Exception as e:
            print(f"  origintime-kysely {k+1} epäonnistui: {str(e)[:120]}")
        if k < ORIGIN_PROBES - 1:
            time.sleep(2)
    print("  palvelimien ilmoittamat ajot: " + (", ".join(sorted({iso(o) for o in seen})) or "-"))
    return max(seen) if seen else None


def prev_run():
    """Jo julkaistun ajon origintime (ms) gh-pagesilta haetusta metasta, tai None."""
    p = os.environ.get("PREV_META", "")
    if not p or not os.path.exists(p):
        return None
    try:
        with open(p) as f:
            return int(json.load(f).get("run"))
    except Exception:
        return None


now = datetime.datetime.now(datetime.timezone.utc).replace(minute=0, second=0, microsecond=0)
start = now - datetime.timedelta(hours=HOURS_BACK)
end = now + datetime.timedelta(hours=HOURS_AHEAD)

print("Haetaan editoidun ennusteen uusin ajo...")
origin = latest_origin()
if origin is None:
    run_guard.keep_previous(MODEL, "uusinta ajoa (origintime) ei saatu", CLEAN)
origin_ms = int(origin.timestamp() * 1000)
prev = prev_run()
print(f"  uusin ajo {iso(origin)}, julkaistu {iso(datetime.datetime.fromtimestamp(prev/1000, datetime.timezone.utc)) if prev else '-'}")
if prev is not None and origin_ms <= prev:
    run_guard.keep_previous(MODEL, f"ei uutta ajoa (uusin {iso(origin)} ei ole uudempi kuin julkaistu)", CLEAN)
if datetime.datetime.now(datetime.timezone.utc) - origin > datetime.timedelta(hours=6):
    print(f"::warning title=Editoitu ennuste vanha::uusin ajo {iso(origin)} yli 6 h vanha")

url = ("https://opendata.fmi.fi/download?" + urllib.parse.urlencode({
    "producer": PRODUCER, "param": "TotalCloudCover", "bbox": BBOX, "origintime": iso(origin),
    "starttime": iso(start), "endtime": iso(end), "timestep": 60, "format": "grib2", "projection": "EPSG:4326"}))
print(f"Haetaan hila: ajo {iso(origin)}, {iso(start)} - {iso(end)}, bbox={BBOX}")
tmp = tempfile.mktemp(suffix=".grib2")
for attempt in range(3):
    try:
        with open(tmp, "wb") as f:
            f.write(get(url))
        break
    except Exception as e:
        if attempt == 2:
            run_guard.keep_previous(MODEL, f"lataus epäonnistui: {str(e)[:150]}", CLEAN)
        print(f"  ...yritys {attempt+1} epäonnistui ({str(e)[:100]}), uusi yritys")
        time.sleep(5)
print(f"Ladattu {os.path.getsize(tmp)/1e3:.0f} kt")

try:
    ds_list = cfgrib.open_datasets(tmp, backend_kwargs={"indexpath": ""})
    names = [(n, d) for d in ds_list for n in d.data_vars]
    print(f"  GRIB-muuttujat: {[n for n, _ in names]}")
    if len(names) != 1:
        raise RuntimeError(f"odotettiin yksi muuttuja, saatiin {[n for n, _ in names]}")
    da = names[0][1][names[0][0]].load()
finally:
    for f in [tmp] + glob.glob(tmp + ".*.idx"):
        try:
            os.unlink(f)
        except Exception:
            pass

# Ajon tarkistus: GRIBin viiteaika (time) = pyydetty ajo. Editoidun ennusteen
# viiteaika voi olla pyöristetty tasatuntiin -> hyväksytään alle tunnin ero, ei
# vanhempaa kuin pyydetyn ajon tunti.
ref = da["time"].values if "time" in da.coords else None
ref_dt = datetime.datetime.fromtimestamp(int(np.datetime64(ref, "s").astype("int64")), datetime.timezone.utc) if ref is not None else None
print(f"  GRIBin viiteaika {iso(ref_dt) if ref_dt else '-'} (pyydetty {iso(origin)})")
if ref_dt is None or abs((ref_dt - origin).total_seconds()) >= 3600:
    run_guard.keep_previous(MODEL, f"palvelin palautti eri ajon (viiteaika {iso(ref_dt) if ref_dt else '-'}, pyydetty {iso(origin)})", CLEAN)

data = np.asarray(da.values, dtype=float)                  # (step, lat, lon) %
lat = np.asarray(da.latitude.values, dtype=float)
lon = np.asarray(da.longitude.values, dtype=float)
if data.ndim == 2:
    data = data[None]
if lat[0] > lat[-1]:                                       # rivit etelästä pohjoiseen
    lat = lat[::-1]; data = data[:, ::-1, :]
if lon[0] > lon[-1]:
    lon = lon[::-1]; data = data[:, :, ::-1]
vt = da.valid_time.values if "valid_time" in da.coords else None
times_ms = [int(np.datetime64(t, "ms").astype("int64")) for t in np.atleast_1d(vt)] if vt is not None else []
ntimes, nlat, nlon = data.shape
if len(times_ms) != ntimes:
    run_guard.keep_previous(MODEL, f"aika-akseli ({len(times_ms)}) ei täsmää askeliin ({ntimes})", CLEAN)
try:
    run_guard.require_steps(ntimes, HOURS_BACK + HOURS_AHEAD + 1)
except run_guard.IncompleteRun as e:
    run_guard.keep_previous(MODEL, str(e), CLEAN)
nan_share = float(np.isnan(data).mean())
if nan_share > 0.5:
    run_guard.keep_previous(MODEL, f"liikaa puuttuvaa dataa ({nan_share:.0%})", CLEAN)
if np.nanmax(data) <= 1.0 + 1e-6:                         # osuus 0-1 -> %
    data = data * 100
print(f"Hila {nlat}x{nlon}, lat {lat[0]:.3f}-{lat[-1]:.3f}, lon {lon[0]:.3f}-{lon[-1]:.3f}, NaN {nan_share:.1%}")

os.makedirs(OUT_DIR, exist_ok=True)
sizes = []
for i in range(ntimes):
    p = f"{OUT_DIR}/clouds-{MODEL}-step{i:02d}.json"
    with open(p, "w") as f:
        json.dump({"t0": origin_ms, "vals": cloud_png.encode_masked(data[i])}, f)   # t0 = ajon tunniste (origintime)
    sizes.append(os.path.getsize(p) / 1024)
meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "producer": PRODUCER,
    "run": origin_ms,                     # origintime = ajon tunniste (askeleiden t0)
    "lat0": float(lat[0]), "lat1": float(lat[-1]), "lon0": float(lon[0]), "lon1": float(lon[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": float((lat[-1] - lat[0]) / (nlat - 1)), "dlon": float((lon[-1] - lon[0]) / (nlon - 1)),
    "missing": cloud_png.MISSING,         # arvo > 100 = ei dataa
    "times": times_ms,
    "stepCount": ntimes,
}
with open(f"{OUT_DIR}/clouds-{MODEL}-meta.json", "w") as f:
    json.dump(meta, f)
print(f"OK: ajo {iso(origin)}, {ntimes} askelta, yht. ~{sum(sizes):.0f} kt (keskim. {sum(sizes)/ntimes:.0f} kt/askel)")
