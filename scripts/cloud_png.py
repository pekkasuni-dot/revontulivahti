"""Pilvikentän pakkaus harmaasävy-PNG:ksi (2026-10-24, kaikki mallit).

Pikseliarvo ON SUORAAN pilvisyys-% 0-100 (ei venytetty 0-255:aan), yksi tavu
per hilapiste, rivit etelästä pohjoiseen samassa järjestyksessä kuin aiempi
JSON-lukutaulukko (rivi = leveyspiiri, sarake = pituuspiiri). Häviötön: purku
antaa täsmälleen samat kokonaisluvut kuin plain JSON (testi
tests/test_cloud_png.py). Selain purkaa kentän tyypistä tunnistaen
(merkkijono = PNG, taulukko = vanha muoto): index.html decodePngField(),
alerts/cloud-models.js decodeField(). ICON-EU käytti tätä muotoa jo ennestään
(fetch-clouds-icon_eu.py), nyt myös ECMWF:n ja HARMONIEn askeltiedostot.
Ks. MUISTIO-lataus.md "PNG kaikille malleille".
"""
import base64, io
import numpy as np
from PIL import Image


def encode(pct2d):
    """2D-taulukko (nlat x nlon) pilvisyys-% -> base64-merkkijono (PNG)."""
    a = np.asarray(pct2d)
    if a.ndim != 2:
        raise ValueError("pilvikentän pitää olla 2D (nlat x nlon)")
    if a.size and (a.min() < 0 or a.max() > 100):
        raise ValueError("pilvisyys-% pitää olla 0-100")
    buf = io.BytesIO()
    Image.fromarray(np.ascontiguousarray(a, dtype=np.uint8), mode="L").save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def decode(b64):
    """base64-PNG -> 2D uint8-taulukko (testejä ja tarkistuksia varten)."""
    return np.array(Image.open(io.BytesIO(base64.b64decode(b64))), dtype=np.uint8)


# Sumutaso (2026-10-25): näkyvyys metreinä -> 0-100 = 0-5 km 50 m portain,
# 100 = 5 km tai enemmän (ei sumua/utua). Sama PNG-muoto kuin pilvillä.
FOG_STEP_M = 50
FOG_MAX_M = 5000


def visibility_to_code(vis_m):
    """Näkyvyys (m, 2D) -> uint8 0-100 (round(vis/50), yli 5 km = 100). NaN = 100."""
    v = np.nan_to_num(np.asarray(vis_m, dtype=float), nan=FOG_MAX_M)
    return np.clip(np.round(v / FOG_STEP_M), 0, FOG_MAX_M // FOG_STEP_M).astype(np.uint8)


def encode_visibility(vis_m):
    """Näkyvyys (m, 2D) -> base64-PNG (arvo = näkyvyys / 50 m, enintään 100)."""
    return encode(visibility_to_code(vis_m))
