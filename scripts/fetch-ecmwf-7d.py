#!/usr/bin/env python3
"""
7 vrk -valilehden ECMWF-data (2026-10): kokonaispilvisyys, 2 m lampotila ja
10 m tuulen nopeus ~9 vrk eteenpain PIENINA RUUTUTIEDOSTOINA pistekyselya
varten (selain hakee vain sen ruudun, jossa infoikkunan sijainti on).

Miksi ruudut eika yksi hila: 7 vrk -lista tarvitsee yhden pisteen aikasarjan
koko horisontilta. Koko alueen hila 61 askeleella olisi useita megatavuja
(ECMWF:n 48 h:n pilvitiedosto on jo ~2 Mt), ruutu on ~30 kt.

Horisontti: ECMWF HRES 00/12 UTC -ajot: 0-144 h 3 h valein, 150-360 h 6 h
valein (06/18-ajot vain 90 h:iin). STEPS ulottuu 216 h:iin: 7. yo paattyy
nykyhetkesta ~7 vrk + 12 h, ja julkaistu ajo on enintaan ~20 h vanha.
Client.retrieve() ilman date-parametria valitsee UUSIMMAN ajon, jossa KAIKKI
pyydetyt askeleet ovat olemassa (Client.latest HEAD-pyynnoin) -> aina
00/12-ajo, koska 06/18-ajoissa ei ole askelia > 90 h.

Alue: model_areas.py ECMWF (55-85 N, 30 W-60 E), 0,25 deg. Ruutu 2,5 x 2,5
deg = 11 x 11 pistetta (reunarivi/-sarake JAETTU naapuriruudun kanssa, jotta
bilineaarinen interpolointi toimii ruudun sisalla ilman naapuria).
Tiedostot: data/e7d-<rivi>-<sarake>.json (rivi 0 = 55 N, sarake 0 = 30 W),
litteana data/-kansioon (publish-pages kopioi vain data/*.json).

Koodaus (tavu per arvo, base64, jarjestys [askel][rivi S->N][sarake W->E]):
  tcc: 0..100 (%)       t2m: (C + 60) * 2  -> -60..+67,5 C, 0,5 C tarkkuus
  ws:  m/s * 4 -> 0..63,75 m/s, 0,25 m/s tarkkuus
Vaatii: ecmwf-opendata, cfgrib, xarray, numpy.
"""

import base64, json, os, sys, tempfile, time
import numpy as np
from model_areas import ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1
import run_guard   # keskeneräinen ajo (KATSELMOINTI 1.13)

STEPS = list(range(0, 145, 3)) + list(range(150, 217, 6))   # 49 + 12 = 61 askelta
TILE = 2.5
D = 0.25
N = int(round(TILE / D)) + 1                                 # 11 pistetta per akseli
PARAMS = ["tcc", "2t", "10u", "10v"]
SOURCES_TRY = ["ecmwf", "aws"]                      # sama ketju kuin fetch-clouds.py
T2M_OFF, T2M_SCALE, WS_SCALE = 60.0, 2.0, 4.0


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


def crop(frame, lats_all, lons_all):
    """(lat N->S tai S->N, lon 0..360 tai -180..180) -> alue S->N, W->E.
       Pituusasteet normalisoidaan ENSIN (ks. CLAUDE.md, GRIB2-konventio)."""
    lat_idx = np.where((lats_all >= ECMWF_LAT0 - 1e-6) & (lats_all <= ECMWF_LAT1 + 1e-6))[0]
    lat_idx = lat_idx[np.argsort(lats_all[lat_idx])]                 # S->N
    lons_norm = ((lons_all + 180.0) % 360.0) - 180.0
    lon_idx = np.where((lons_norm >= ECMWF_LON0 - 1e-6) & (lons_norm <= ECMWF_LON1 + 1e-6))[0]
    lon_idx = lon_idx[np.argsort(lons_norm[lon_idx])]                # W->E
    return frame[..., lat_idx, :][..., lon_idx], lats_all[lat_idx], lons_norm[lon_idx]


def encode(tcc, t2m_k, ws):
    """Fysikaaliset arvot -> tavut (rajattu ENNEN uint8-muunnosta, ei kiertoa)."""
    b_tcc = np.clip(np.round(tcc * 100.0), 0, 100).astype(np.uint8)
    b_t2m = np.clip(np.round((t2m_k - 273.15 + T2M_OFF) * T2M_SCALE), 0, 255).astype(np.uint8)
    b_ws = np.clip(np.round(ws * WS_SCALE), 0, 255).astype(np.uint8)
    return b_tcc, b_t2m, b_ws


def write_tiles(b_tcc, b_t2m, b_ws, lats, lons, times_ms, run_ms, src, outdir="data"):
    """b_*: (step, lat S->N, lon W->E) tavuina. Kirjoittaa kaikki ruudut."""
    nlat, nlon = len(lats), len(lons)
    if abs(lats[0] - ECMWF_LAT0) > 1e-6 or abs(lons[0] - ECMWF_LON0) > 1e-6:
        die(f"Odottamaton hilan alku: lat {lats[0]}, lon {lons[0]}")
    if np.any(np.abs(np.diff(lats) - D) > 1e-6) or np.any(np.abs(np.diff(lons) - D) > 1e-6):
        die("Hila ei ole tasavalinen 0,25 deg")
    rows = (nlat - 1) // (N - 1)
    cols = (nlon - 1) // (N - 1)
    os.makedirs(outdir, exist_ok=True)
    total = 0
    for r in range(rows):
        for c in range(cols):
            i0, j0 = r * (N - 1), c * (N - 1)
            sl = (slice(None), slice(i0, i0 + N), slice(j0, j0 + N))
            tile = {
                "run": run_ms, "generated": int(time.time() * 1000), "source": src,
                "lat0": float(lats[i0]), "lon0": float(lons[j0]), "d": D, "n": N,
                "times": times_ms,
                "t2mOff": T2M_OFF, "t2mScale": T2M_SCALE, "wsScale": WS_SCALE,
                "tcc": base64.b64encode(np.ascontiguousarray(b_tcc[sl]).tobytes()).decode("ascii"),
                "t2m": base64.b64encode(np.ascontiguousarray(b_t2m[sl]).tobytes()).decode("ascii"),
                "ws": base64.b64encode(np.ascontiguousarray(b_ws[sl]).tobytes()).decode("ascii"),
            }
            path = os.path.join(outdir, f"e7d-{r}-{c}.json")
            with open(path, "w") as f:
                json.dump(tile, f, separators=(",", ":"))
            total += os.path.getsize(path)
    print(f"OK: {rows} x {cols} ruutua, {len(times_ms)} askelta, yht. {total/1e6:.1f} Mt "
          f"(~{total/rows/cols/1024:.0f} kt/ruutu)")
    return rows, cols


def main():
    try:
        from ecmwf.opendata import Client
        import cfgrib
    except ImportError as e:
        die(f"Paketti puuttuu: {e}\nAsenna: pip install ecmwf-opendata cfgrib xarray numpy")

    tmp = tempfile.mktemp(suffix=".grib2")
    src_used, last_err = None, None
    for src in SOURCES_TRY:
        print(f"Ladataan ECMWF lahteesta '{src}': {PARAMS}, {len(STEPS)} askelta (0-{STEPS[-1]} h)...")
        try:
            Client(source=src, maximum_retries=3, retry_after=20).retrieve(
                step=STEPS, type="fc", param=PARAMS, target=tmp)
            src_used = src
            print(f"Ladattu: {os.path.getsize(tmp)/1e6:.0f} Mt")
            break
        except Exception as e:
            print(f"Lahde '{src}' epaonnistui: {e}", file=sys.stderr)
            last_err = e
            try: os.unlink(tmp)
            except Exception: pass
    if src_used is None:
        die(f"Lataus epaonnistui kaikista lahteista: {last_err}")

    try:
        ds_list = cfgrib.open_datasets(tmp)
        def var(name):
            for d in ds_list:
                if name in d.data_vars:
                    return d[name]
            die(f"{name} ei loydy. Saatavilla: {[list(d.data_vars) for d in ds_list]}")
        da_tcc, da_t2m, da_u, da_v = var("tcc"), var("t2m"), var("u10"), var("v10")
        run_ms = int(np.datetime64(da_tcc.time.values, "ms").astype("int64"))
        step_h = [int(np.round(s / np.timedelta64(1, "h"))) for s in da_tcc.step.values]
        for da in (da_t2m, da_u, da_v):
            sh = [int(np.round(s / np.timedelta64(1, "h"))) for s in da.step.values]
            if sh != step_h:
                die(f"Askeleet eroavat muuttujien valilla: {sh[:5]}... vs {step_h[:5]}...")
        if step_h != STEPS:
            die(f"Askeleet eivat vastaa pyyntoa: {step_h}")
        lats_all, lons_all = da_tcc.latitude.values, da_tcc.longitude.values
        tcc, lats, lons = crop(da_tcc.load().values, lats_all, lons_all)
        t2m, _, _ = crop(da_t2m.load().values, lats_all, lons_all)
        u, _, _ = crop(da_u.load().values, lats_all, lons_all)
        v, _, _ = crop(da_v.load().values, lats_all, lons_all)
    finally:
        try: os.unlink(tmp)
        except Exception: pass

    try: run_guard.require_steps(min(a.shape[0] for a in (tcc, t2m, u, v)), len(STEPS))
    except run_guard.IncompleteRun as e: run_guard.keep_previous("ecmwf 7 vrk", str(e), ["data/e7d-*.json"])
    for name, arr in (("tcc", tcc), ("t2m", t2m), ("u10", u), ("v10", v)):
        bad = int(np.isnan(arr).sum())
        if bad:
            die(f"{name}: {bad} NaN-arvoa alueella")
    print(f"Ajo {np.datetime64(run_ms, 'ms')} UTC, hila {tcc.shape} (step, lat, lon), "
          f"t2m {t2m.min()-273.15:.1f}..{t2m.max()-273.15:.1f} C, tcc {tcc.min():.2f}..{tcc.max():.2f}")
    if tcc.max() > 1.5:   # varmuuden vuoksi: jos lahde antaa prosentteina
        print("tcc prosentteina -> jaetaan 100:lla")
        tcc = tcc / 100.0
    ws = np.hypot(u, v)
    times_ms = [run_ms + s * 3_600_000 for s in STEPS]
    write_tiles(*encode(tcc, t2m, ws), lats, lons, times_ms, run_ms, src_used)


if __name__ == "__main__":
    main()
