#!/usr/bin/env python3
"""
Hakee ECMWF Open Data -tuuliennusteen (U/V-komponentit) NELJALLE korkeudelle
(pinta 10 m, 850/500/300 hPa) ja kirjoittaa data/wind-ecmwf-<taso>.json
(yksi tiedosto per taso, EI laiskaa per-askel-latausta - ks. alla miksi).

Vahvistettu OIKEALLA hakupyynnolla (ei oletettu):
- Pinta: param=["10u","10v"] (ei levtype/levelist, ECMWF paattelee sfc:n
  automaattisesti) -> muuttujat u10/v10.
- Painepinnat: param=["u","v"], levtype="pl", levelist=[850,500,300] ->
  muuttujat u/v, ulottuvuus isobaricInhPa=[850,500,300] - KAIKKI KOLME
  tasoa tulevat YHDESSA GRIB-tiedostossa/haussa (ei tarvita 3 erillista
  hakua) - ks. check_ecmwf_wind.py-testiajo (ei commitoitu, scratchpad).

ALUE: model_areas.py:n ECMWF_LON0/LAT0/LON1/LAT1 - TASMALLEEN sama alue
kuin fetch-clouds.py (30 W-60 E, 55-85 N) - vaatimus "tuulen ja pilvien
pitaa osua tarkalleen paallekkain".

HORISONTTI: SAMAT 17 aika-askelta (0-48 h, 3 h valein) kuin pilvi-ECMWF
(STEPS tuotu kirjaimellisesti samalla kaavalla) - vaatimus "tuuli seuraa
valitun mallin omia aika-askeleita, kuten pilvet".

EI LAISKAA LATAUSTA (toisin kuin ICON-EU/HARMONIE-tuuli): ECMWF:n pilvi-
versiokin on EI-laiska (yksi tiedosto per malli, 17 askelta on riittavan
pieni kerralla ladattavaksi, ks. CLOUD_MODELS.ecmwf.lazy=false
index.html:ssa) - sama periaate sovellettu tahan, kokoarvio ~1,3 Mt/taso
(ks. ajon lopussa tulostettu oikea koko).

Vaatii: ecmwf-opendata, cfgrib, xarray, numpy.
"""

import json, os, sys, tempfile, time
import numpy as np
from model_areas import ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1

STEPS = list(range(0, 49, 3))  # sama kuin fetch-clouds.py: [0,3,...,48] -> 17 askelta

try:
    from ecmwf.opendata import Client
    import cfgrib
except ImportError as e:
    print(f"VIRHE: Paketti puuttuu: {e}\nAsenna: pip install ecmwf-opendata cfgrib xarray numpy", file=sys.stderr)
    sys.exit(1)


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


SOURCES_TRY = ["ecmwf", "azure", "aws"]  # sama varalahdeketju kuin fetch-clouds.py


def retrieve_with_fallback(**kwargs):
    tmp = tempfile.mktemp(suffix=".grib2")
    last_err = None
    for src in SOURCES_TRY:
        try:
            Client(source=src, maximum_retries=3, retry_after=20).retrieve(target=tmp, **kwargs)
            print(f"  Ladattu lahteesta '{src}': {os.path.getsize(tmp)/1e6:.1f} MB")
            return tmp, src
        except Exception as e:
            print(f"  Lahde '{src}' epaonnistui: {e}", file=sys.stderr)
            last_err = e
            try: os.unlink(tmp)
            except Exception: pass
    die(f"Lataus epaonnistui kaikista lahteista ({', '.join(SOURCES_TRY)}): {last_err}")


def crop_grid(lats_all, lons_all):
    """Palauttaa (lat_idx N->S, lats_NS, lon_idx W->E, lons_out) samalla
       logiikalla kuin fetch-clouds.py (pituusasteen normalisointi ENSIN,
       ei oleteta natiivikonventiota - ks. CLAUDE.md)."""
    lat_mask = (lats_all >= ECMWF_LAT0) & (lats_all <= ECMWF_LAT1)
    lat_idx = np.where(lat_mask)[0]
    lats_NS = lats_all[lat_idx]
    lons_norm = ((lons_all + 180.0) % 360.0) - 180.0
    lon_mask = (lons_norm >= ECMWF_LON0) & (lons_norm <= ECMWF_LON1)
    lon_idx_raw = np.where(lon_mask)[0]
    lons_signed = lons_norm[lon_idx_raw]
    order = np.argsort(lons_signed)
    lon_idx = lon_idx_raw[order]
    lons_out = lons_signed[order]
    return lat_idx, lats_NS, lon_idx, lons_out


def write_level(level_key, label, altitude_text, u_raw, v_raw, lats_all, lons_all, init_ms):
    lat_idx, lats_NS, lon_idx, lons_out = crop_grid(lats_all, lons_all)
    nlat, nlon = len(lat_idx), len(lon_idx)
    times_ms = [init_ms + s * 3_600_000 for s in STEPS]

    def crop_and_quantize(raw):
        out = []
        for i_step in range(len(STEPS)):
            frame = raw[i_step]
            frame_sub = frame[np.ix_(lat_idx, lon_idx)][::-1, :]  # N->S -> S->N
            out.append(frame_sub)
        return np.stack(out)  # (step, nlat, nlon) S->N

    u_crop = crop_and_quantize(u_raw)
    v_crop = crop_and_quantize(v_raw)

    vmin, vmax = -80.0, 80.0
    import base64
    def quantize(arr):
        frac = np.clip((arr - vmin) / (vmax - vmin), 0, 1)
        return (np.round(frac * 255)).astype(np.uint8)

    u_bytes = quantize(u_crop).tobytes()
    v_bytes = quantize(v_crop).tobytes()

    result = {
        "generated": int(time.time() * 1000),
        "model": "ecmwf",
        "level": level_key,
        "levelLabel": label,
        "altitudeText": altitude_text,
        "lat0": float(lats_NS[-1]), "lat1": float(lats_NS[0]),
        "lon0": float(lons_out[0]), "lon1": float(lons_out[-1]),
        "nlat": nlat, "nlon": nlon,
        "dlat": 0.25, "dlon": 0.25,
        "times": times_ms,
        "vmin": vmin, "vmax": vmax,
        "u": base64.b64encode(u_bytes).decode("ascii"),
        "v": base64.b64encode(v_bytes).decode("ascii"),
    }
    os.makedirs("data", exist_ok=True)
    outpath = f"data/wind-ecmwf-{level_key}.json"
    with open(outpath, "w") as f:
        json.dump(result, f)
    size_kb = os.path.getsize(outpath) / 1024
    print(f"OK: {level_key}: {len(STEPS)} aikaa x {nlat}x{nlon} -> {outpath} ({size_kb:.0f} KB)")

    # Askeltiedostot (2026-10-22, kuten ICON-EU/HARMONIE ja ECMWF-pilvet):
    # sovellus lataa metan + 1-2 askelta koko tiedoston sijaan. Koko
    # tiedosto (yllä) jää varalle siirtymävaiheeseen.
    N = nlat * nlon
    for i_step in range(len(STEPS)):
        with open(f"data/wind-ecmwf-{level_key}-step{i_step:02d}.json", "w") as f:
            json.dump({"t0": times_ms[0],   # ajon tunniste (KATSELMOINTI 1.3)
                       "u": base64.b64encode(u_bytes[i_step*N:(i_step+1)*N]).decode("ascii"),
                       "v": base64.b64encode(v_bytes[i_step*N:(i_step+1)*N]).decode("ascii")}, f)
    meta = {k: v for k, v in result.items() if k not in ("u", "v")}
    meta["stepCount"] = len(STEPS)
    with open(f"data/wind-ecmwf-{level_key}-meta.json", "w") as f:
        json.dump(meta, f)
    step_kb = os.path.getsize(f"data/wind-ecmwf-{level_key}-step00.json") / 1024
    print(f"   + meta + {len(STEPS)} askelta x ~{step_kb:.0f} KB")


# ── Pinta: 10u/10v ──────────────────────────────────────────────────
print(f"Haetaan ECMWF-tuuli: pinta (10u/10v), {len(STEPS)} askelta...")
tmp_sfc, src_sfc = retrieve_with_fallback(step=STEPS, type="fc", param=["10u", "10v"])
try:
    ds_list = cfgrib.open_datasets(tmp_sfc)
    ds = next((d for d in ds_list if "u10" in d.data_vars and "v10" in d.data_vars), None)
    if ds is None:
        die(f"u10/v10 ei loytynyt. Saatavilla: {[list(d.data_vars) for d in ds_list]}")
    u10 = ds["u10"].load()
    v10 = ds["v10"].load()
    init_ms = int(np.datetime64(ds.time.values, "ms").astype("int64"))
    write_level("surface", "Pinta (10 m)", "10 m",
                u10.values, v10.values, u10.latitude.values, u10.longitude.values, init_ms)
except Exception as e:
    die(f"Pinta-GRIB2-parsinta epaonnistui: {e}")
finally:
    try: os.unlink(tmp_sfc)
    except Exception: pass

# ── Painepinnat: u/v @ 850/500/300 hPa (YKSI haku, kaikki 3 tasoa) ──
print(f"Haetaan ECMWF-tuuli: painepinnat 850/500/300 hPa, {len(STEPS)} askelta...")
tmp_pl, src_pl = retrieve_with_fallback(step=STEPS, type="fc", param=["u", "v"],
                                         levtype="pl", levelist=[850, 500, 300])
try:
    ds_list = cfgrib.open_datasets(tmp_pl)
    ds = next((d for d in ds_list if "u" in d.data_vars and "v" in d.data_vars), None)
    if ds is None:
        die(f"u/v (pl) ei loytynyt. Saatavilla: {[list(d.data_vars) for d in ds_list]}")
    u_pl = ds["u"].load()
    v_pl = ds["v"].load()
    init_ms = int(np.datetime64(ds.time.values, "ms").astype("int64"))
    level_labels = {850: ("850 hPa (~1,5 km)", "~1,5 km"),
                     500: ("500 hPa (~5,5 km)", "~5,5 km"),
                     300: ("300 hPa (~9 km)", "~9 km")}
    levels_available = [int(lv) for lv in u_pl.isobaricInhPa.values]
    print(f"  isobaricInhPa: {levels_available}")
    for lv in (850, 500, 300):
        if lv not in levels_available:
            print(f"  VAROITUS: {lv} hPa ei saatavilla ECMWF-haussa, ohitetaan", file=sys.stderr)
            continue
        label, alt = level_labels[lv]
        u_lv = u_pl.sel(isobaricInhPa=lv).values
        v_lv = v_pl.sel(isobaricInhPa=lv).values
        write_level(str(lv), label, alt, u_lv, v_lv,
                    u_pl.latitude.values, u_pl.longitude.values, init_ms)
except Exception as e:
    die(f"Painepinta-GRIB2-parsinta epaonnistui: {e}")
finally:
    try: os.unlink(tmp_pl)
    except Exception: pass

print(f"Lahteet kaytetty: pinta={src_sfc}, painepinnat={src_pl}")
