"""Sumutason koehaku (2026-10-25, VÄLIAIKAINEN tutkimustyökalu, ei julkaise mitään).

Selvittää jokaiselle mallille, löytyykö näkyvyys- tai sumuparametri samasta
lähteestä kuin nykyinen pilvihaku, ja mittaa PNG-askeltiedoston koon samalla
alueella ja resoluutiolla kuin pilvitiedostot. Tulos lokiin ja probe-out/.
Ajetaan työnkulusta .github/workflows/fog-probe.yml (poistetaan ennen
mainiin yhdistämistä).
"""
import base64, bz2, datetime, gzip, io, json, os, sys, tempfile, urllib.request

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from model_areas import ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1, ICON_EU_LAT0, ICON_EU_LAT1, HARMONIE_BBOX

OUT = "probe-out"
os.makedirs(OUT, exist_ok=True)
RESULT = {}


def get(url, timeout=90):
    req = urllib.request.Request(url, headers={"User-Agent": "revontulivahti-fog-probe"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def head_ok(url):
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception:
        return False


def open_grib(raw):
    import cfgrib
    tmp = tempfile.mktemp(suffix=".grib2")
    open(tmp, "wb").write(raw)
    ds = cfgrib.open_datasets(tmp)
    out = []
    for d in ds:
        for n in d.data_vars:
            da = d[n].load()
            out.append((n, da))
    return out


def png_b64(a):
    buf = io.BytesIO()
    Image.fromarray(np.ascontiguousarray(a, dtype=np.uint8), mode="L").save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def sizes(name, vis_m, stride):
    """vis_m = 2D näkyvyys metreinä (nlat x nlon). Mittaa kaksi koodausta:
    A) luokat 0/1/2 (yli 5 km / 1-5 km / alle 1 km), B) näkyvyys 100 m portain 0-100 (0-10 km)."""
    v = np.asarray(vis_m, dtype=float)[::stride, ::stride]
    cls = np.where(v < 1000, 2, np.where(v < 5000, 1, 0)).astype(np.uint8)
    q = np.clip(np.round(v / 100.0), 0, 100).astype(np.uint8)
    res = {}
    for key, arr in (("luokat", cls), ("vis100m", q)):
        b64 = png_b64(arr)
        js = json.dumps({"t0": 0, "vis": b64}).encode()
        res[key] = {"pngB64_kt": round(len(b64) / 1024, 1), "json_gzip_kt": round(len(gzip.compress(js, 6)) / 1024, 1)}
    tot = v.size
    res["hila"] = list(v.shape)
    res["osuus_sumu_<1km_%"] = round(100 * float((v < 1000).sum()) / tot, 2)
    res["osuus_utu_1-5km_%"] = round(100 * float(((v >= 1000) & (v < 5000)).sum()) / tot, 2)
    res["vis_min_max_m"] = [round(float(np.nanmin(v))), round(float(np.nanmax(v)))]
    print(f"  {name}: {json.dumps(res, ensure_ascii=False)}")
    Image.fromarray((cls * 120).astype(np.uint8)[::-1], mode="L").save(f"{OUT}/{name}-luokat.png")
    return res


# ── HARMONIE (FMI opendata /download) ──────────────────────────────────────
def probe_harmonie():
    r = {}
    now = datetime.datetime.now(datetime.timezone.utc).replace(minute=0, second=0, microsecond=0)
    t = (now + datetime.timedelta(hours=6)).strftime("%Y-%m-%dT%H:%M:%SZ")
    for param in ("Visibility", "FogIntensity", "Fog"):
        url = (f"https://opendata.fmi.fi/download?producer=harmonie_scandinavia_surface&param={param}"
               f"&bbox={HARMONIE_BBOX}&starttime={t}&endtime={t}&format=grib2&projection=EPSG:4326&levels=0&timestep=60")
        try:
            raw = get(url)
            print(f"HARMONIE {param}: {len(raw)/1e6:.2f} MB")
            vs = open_grib(raw)
            print(f"  muuttujat: {[(n, da.attrs.get('GRIB_units'), da.attrs.get('GRIB_name'), da.shape) for n, da in vs]}")
            n, da = vs[0]
            a = np.squeeze(da.values)
            print(f"  arvot min {np.nanmin(a):.1f} max {np.nanmax(a):.1f} NaN {int(np.isnan(a).sum())}/{a.size}")
            r[param] = {"ok": True, "units": da.attrs.get("GRIB_units"), "name": da.attrs.get("GRIB_name")}
            if param == "Visibility":
                lat = da.latitude.values
                if lat[0] > lat[-1]:
                    a = a[::-1]
                r[param]["koko"] = sizes("harmonie", np.nan_to_num(a, nan=99999), 2)
        except Exception as e:
            print(f"HARMONIE {param}: EI ({str(e)[:200]})")
            r[param] = {"ok": False, "err": str(e)[:200]}
    return r


# ── ICON-EU (DWD opendata) ─────────────────────────────────────────────────
def probe_icon():
    r = {}
    base = "https://opendata.dwd.de/weather/nwp/icon-eu/grib"
    now = datetime.datetime.now(datetime.timezone.utc)
    runs = []
    for back in range(0, 30, 3):
        c = (now - datetime.timedelta(hours=back)).replace(minute=0, second=0, microsecond=0)
        c = c - datetime.timedelta(hours=c.hour % 3)
        if c.hour % 6 == 0 and c not in runs:
            runs.append(c)
    hh = runs[0].hour
    try:
        listing = get(f"{base}/{hh:02d}/").decode("utf-8", "replace")
        dirs = sorted(set(x.split('/')[0] for x in listing.split('href="')[1:] if x.split('"')[0].endswith('/')))
        print(f"ICON-EU {hh:02d}: hakemistoja {len(dirs)}: {dirs}")
        r["hakemistot"] = dirs
    except Exception as e:
        print(f"ICON-EU listaus EI: {e}")
        r["hakemistot"] = None
    for field in ("vis", "VIS"):
        for run in runs[:4]:
            ts = run.strftime("%Y%m%d%H")
            url = f"{base}/{run.hour:02d}/{field.lower()}/icon-eu_europe_regular-lat-lon_single-level_{ts}_006_{field.upper()}.grib2.bz2"
            if not head_ok(url):
                continue
            raw = bz2.decompress(get(url))
            vs = open_grib(raw)
            n, da = vs[0]
            print(f"ICON-EU VIS ajo {ts}: {n} {da.attrs.get('GRIB_units')} {da.attrs.get('GRIB_name')} {da.shape}")
            lat, a = da.latitude.values, da.values
            if lat[0] > lat[-1]:
                lat, a = lat[::-1], a[::-1]
            m = (lat >= ICON_EU_LAT0 - 1e-6) & (lat <= ICON_EU_LAT1 + 1e-6)
            r["VIS"] = {"ok": True, "url": url, "units": da.attrs.get("GRIB_units"), "koko": sizes("icon_eu", a[m], 1)}
            return r
    print("ICON-EU VIS: ei löytynyt yhdestäkään neljästä viimeisestä ajosta")
    r["VIS"] = {"ok": False}
    return r


# ── ECMWF (Open Data) ──────────────────────────────────────────────────────
def probe_ecmwf():
    r = {}
    now = datetime.datetime.now(datetime.timezone.utc)
    idx = None
    for back in range(0, 48, 6):
        c = now - datetime.timedelta(hours=back)
        hh = (c.hour // 12) * 12
        d = c.strftime("%Y%m%d")
        url = f"https://data.ecmwf.int/forecasts/{d}/{hh:02d}z/ifs/0p25/oper/{d}{hh:02d}0000-6h-oper-fc.index"
        try:
            idx = get(url).decode()
            print(f"ECMWF index: {url}")
            break
        except Exception:
            continue
    if idx:
        params = sorted(set(json.loads(l).get("param") for l in idx.splitlines() if l.strip()))
        print(f"ECMWF Open Data -parametrit ({len(params)}): {params}")
        r["parametrit"] = params
        r["vis_listassa"] = "vis" in params
    try:
        from ecmwf.opendata import Client
        tmp = tempfile.mktemp(suffix=".grib2")
        Client(source="ecmwf").retrieve(step=6, type="fc", param="vis", target=tmp)
        vs = open_grib(open(tmp, "rb").read())
        n, da = vs[0]
        lat, lon, a = da.latitude.values, da.longitude.values, da.values
        lon = ((lon + 180) % 360) - 180
        order = np.argsort(lon); lon, a = lon[order], a[:, order]
        if lat[0] > lat[-1]:
            lat, a = lat[::-1], a[::-1]
        mlat = (lat >= ECMWF_LAT0) & (lat <= ECMWF_LAT1)
        mlon = (lon >= ECMWF_LON0) & (lon <= ECMWF_LON1)
        print(f"ECMWF vis: {n} {da.attrs.get('GRIB_units')} {da.attrs.get('GRIB_name')}")
        r["vis"] = {"ok": True, "units": da.attrs.get("GRIB_units"), "koko": sizes("ecmwf", a[mlat][:, mlon], 1)}
    except Exception as e:
        print(f"ECMWF vis: EI ({str(e)[:300]})")
        r["vis"] = {"ok": False, "err": str(e)[:300]}
    return r


for name, fn in (("harmonie", probe_harmonie), ("icon_eu", probe_icon), ("ecmwf", probe_ecmwf)):
    print(f"\n===== {name} =====")
    try:
        RESULT[name] = fn()
    except Exception as e:
        print(f"{name}: kaatui {e}")
        RESULT[name] = {"virhe": str(e)}

json.dump(RESULT, open(f"{OUT}/tulos.json", "w"), indent=1, ensure_ascii=False)
print("\nTULOS " + json.dumps(RESULT, ensure_ascii=False)[:6000])
