#!/usr/bin/env python3
"""
Hakee DWD ICON-EU -pilviennusteen SUORAAN DWD:n avoimesta datasta
(opendata.dwd.de, GRIB2) ja kirjoittaa data/clouds-icon_eu-meta.json +
data/clouds-icon_eu-step<NN>.json (00..30, yksi tiedosto per aika-askel).

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

ENNUSTEHORISONTTI (2026-10, laajennus 12h->30h): todennettu DWD:n
hakemistolistauksesta etta ICON-EU julkaisee TUNNEITTAISIA askeleita
0-78 h asti (3 h valein vasta 78-120 h) - 30 h on siis reilusti tuntitiheyden
sisalla, ei tarvitse harventaa. STEPS=0..30 (31 askelta) kattaa aikajanan
uuden 24 h nayttokaton + ~6 h turvamarginaalin (ks. CLAUDE.md).

TIEDOSTOMUOTO (2026-10, muutos): yksi iso tiedosto (13-31 askelta kerralla)
olisi kasvanut ~4,3 Mt:sta ~10 Mt:iin pelkalla horisontin pidennyksella -
selain ei saisi enaa ladata koko tiedostoa vain nahdakseen "nyt"-hetken.
Jaettu META-tiedostoon (hila + aika-akseli, ei arvoja) ja yhteen JSON-
tiedostoon PER aika-askel (vain kyseisen hetken vals/valsLow/valsMid/
valsHigh) - selain lataa jatkossa vain 1-2 askelta kerrallaan
(index.html: ensureCloudStepLoaded()), ei koko ennustetta.

KENTTIEN PAKKAUS (2026-10, muutos resoluution noston yhteydessa):
natiivi ~7 km -resoluutio (STRIDE=1, ks. alla) nelinkertaistaa pisteiden
maaran edelliseen 0,25 asteeseen (STRIDE=4) verrattuna - plain JSON-
lukutaulukkona tama olisi OIKEASTI MITATTU ~5,2 Mt/askel (4 kenttaa).
Jokainen kentta pakataan nyt sen sijaan HARMAASAVY-PNG:na (yksi tavu/
pikseli, PIL/Pillow) + base64-merkkijonona JSONin sisalla - PNG:n oma
DEFLATE-pakkaus hyodyntaa pilvikenttien tyypillisesti laajat tasaiset
alueet (iso pilveton/pilvinen alue) paljon tehokkaammin kuin JSONin
pilkkumerkein erotetut desimaaliluvut. Mitattu OIKEASTI samalla
hilakoolla: ~464 KB/askel (4 kenttaa) - n. 11,5x pienempi kuin plain
JSON, reilusti alle 1 Mt -tavoitteen. Pikseliarvo ON SUORAAN pilvi-%
(0-100), EI venytetty 0-255:aan - selaimen Canvas-API lukee taman
takaisin muuttumattomana (ks. index.html: decodePngField()).

Vaatii: cfgrib, xarray, numpy, Pillow (sama kuin ECMWF-putki + Pillow
PNG-pakkausta varten) + apt-paketti libeccodes-dev CI:ssa.
"""

import base64, bz2, datetime, glob, io, json, os, sys, tempfile, time
import urllib.request
import numpy as np
from PIL import Image
from model_areas import ICON_EU_LAT0, ICON_EU_LAT1
import run_guard   # keskeneräinen ajo (KATSELMOINTI 1.13)

try:
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)

BASE = "https://opendata.dwd.de/weather/nwp/icon-eu/grib"
FIELDS = {"vals": "CLCT", "valsLow": "CLCL", "valsMid": "CLCM", "valsHigh": "CLCH"}
STEPS = list(range(0, 31))         # 0-30 h tunneittain (ks. docstring: 24 h nayttokatto + ~6 h marginaali)
RUN_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]   # DWD julkaisee ICON-EU:n 8x vrk (todennettu hakemistolistauksella)

# Tavoitehila: sama lat-alue kuin ECMWF (55-75 N) niin pitkalle kuin ICON-EU:n
# oma kattavuus (max 70,5 N) sen sallii; lon = DWD:n koko natiivialue.
# Vakiot tuotu model_areas.py:sta - SAMA tuuli-ICON-EU:n (fetch-wind-icon_eu.py)
# kanssa, jotta pilvi- ja tuulitaso eivat voi erkaantua toisistaan.
TARGET_LAT0, TARGET_LAT1 = ICON_EU_LAT0, ICON_EU_LAT1
# RESOLUUTIO (2026-10, muutos): STRIDE=1 = NATIIVI 0,0625 deg (~7 km) -
# EI enaa lohkokeskiarvotettu 0,25 asteeseen (~28 km, STRIDE=4). Syy:
# 28 km hukkasi ICON-EU:n oman 7 km mallitarkkuuden kokonaan (kayttaja:
# "mallin 7 km tarkkuudesta ei ole hyotya"). Jarkeva nyt kun data
# julkaistaan gh-pages-haaraan ilman kasvavaa git-historiaa (ks.
# julkaisuarkkitehtuurin korjaus, CLAUDE.md) - tiedostokoko ei ole enaa
# yhta kriittinen kuin suoran main-committoinnin aikana. Mitattu
# OIKEASTI ennen/jalkeen -koot: ks. CLAUDE.md/MUISTIO-mallit.md.
STRIDE = 1

OUT_DIR = "data"
MODEL = "icon_eu"
CLEANUP = [f"{OUT_DIR}/clouds-{MODEL}-*.json"]   # keskeneräinen ajo -> ei osittaisia tiedostoja


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


def candidate_runs():
    """Ajot uusimmasta vanhimpaan (enintään 8 ajoa ~24 h)."""
    now = datetime.datetime.now(datetime.timezone.utc).replace(
        minute=0, second=0, microsecond=0)
    out = []
    for back in range(0, 8):
        cand = now - datetime.timedelta(hours=now.hour % 3) - datetime.timedelta(hours=3 * back)
        if cand.hour in RUN_HOURS:
            out.append(cand)
    return out


def pick_latest_run():
    """Uusin ajo, jonka KAIKKI kentät ja askeleet on julkaistu (2026-10-22,
       KATSELMOINTI 1.13: ennen tarkistettiin vain CLCT-askel 000 -> osittain
       julkaistu ajo kaatoi haun). DWD:n julkaisuviive ~2 h 40-45 min."""
    try:
        return run_guard.pick_complete_run(
            candidate_runs(), lambda r: [url_for(r, code, s) for code in FIELDS.values() for s in STEPS], url_exists)
    except run_guard.IncompleteRun as e:
        run_guard.keep_previous(MODEL, str(e), CLEANUP)
    except LookupError:
        die("Yhtakaan ICON-EU-ajoa ei loytynyt viimeisen 24 h ajalta")


def download_grib(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                comp = r.read()
            return bz2.decompress(comp)
        except Exception as e:
            # 404 kesken latauksen = tiedosto poistui/ei vielä julkaistu -> ajo keskeneräinen.
            if getattr(e, "code", None) == 404:
                run_guard.keep_previous(MODEL, f"tiedosto puuttuu ({url})", CLEANUP)
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

os.makedirs(OUT_DIR, exist_ok=True)
step_sizes_kb = []

for step_idx, step in enumerate(STEPS):
    print(f"Askel {step:03d} h ...")
    step_result = {}
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

        if STRIDE == 1:
            # Natiivi resoluutio - EI lohkokeskiarvoa, suora vektoroitu
            # leikkaus (STRIDE>1:n sisakkainen Python-silmukka olisi
            # tuhottoman hidas nelinkertaistuneella pistemaaralla).
            pct = data[lat_block0:lat_block0 + n_lat_native, :n_lon_native]
        else:
            # Lohkokeskiarvo: jokainen ulostulosolu = STRIDE x STRIDE
            # natiivipisteen keskiarvo (reunalohkot voivat olla kapeampia -
            # sallittu, np.mean toimii).
            pct = np.empty((nlat, nlon))
            for i in range(nlat):
                r0 = lat_block0 + i*STRIDE
                r1 = min(r0 + STRIDE, lat_block0 + n_lat_native)
                for j in range(nlon):
                    c0 = j*STRIDE
                    c1 = min(c0 + STRIDE, n_lon_native)
                    pct[i, j] = data[r0:r1, c0:c1].mean()
        pct = np.clip(np.round(pct), 0, 100).astype(np.uint8)
        # Harmaasavy-PNG + base64 (ks. docstring "KENTTIEN PAKKAUS") -
        # pikseliarvo ON SUORAAN pilvi-% 0-100, EI venytetty 0-255:aan.
        buf = io.BytesIO()
        Image.fromarray(pct, mode="L").save(buf, format="PNG", optimize=True)
        step_result[key] = base64.b64encode(buf.getvalue()).decode("ascii")

    # Ajon tunniste (2026-10-22, KATSELMOINTI 1.3): t0 = metan times[0] (ms). Sovellus
    # ei yhdistä askelta, jonka t0 eroaa metasta (askeltiedoston nimi on sama joka ajossa).
    step_result["t0"] = int(run.timestamp() * 1000) + STEPS[0] * 3_600_000
    step_path = f"{OUT_DIR}/clouds-{MODEL}-step{step_idx:02d}.json"
    with open(step_path, "w") as f:
        json.dump(step_result, f)
    step_sizes_kb.append(os.path.getsize(step_path) / 1024)

times_ms = [int(run.timestamp() * 1000) + s * 3_600_000 for s in STEPS]

meta = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "run": run.isoformat(),
    "lat0": float(lat_out[0]), "lat1": float(lat_out[-1]),
    "lon0": float(lon_out[0]), "lon1": float(lon_out[-1]),
    "nlat": nlat, "nlon": nlon,
    "dlat": round(float(lat_out[1] - lat_out[0]), 4) if nlat > 1 else 0.25,
    "dlon": round(float(lon_out[1] - lon_out[0]), 4) if nlon > 1 else 0.25,
    "hasLayers": True,
    "times": times_ms,
    "stepCount": len(STEPS),
}
meta_path = f"{OUT_DIR}/clouds-{MODEL}-meta.json"
with open(meta_path, "w") as f:
    json.dump(meta, f)

total_kb = sum(step_sizes_kb) + os.path.getsize(meta_path) / 1024
print(f"OK: {len(STEPS)} askelta x {nlat}x{nlon} -> {meta_path} + {len(STEPS)} step-tiedostoa "
      f"(yht. ~{total_kb:.0f} KB, keskim. ~{total_kb/len(STEPS):.0f} KB/askel)")
