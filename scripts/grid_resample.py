"""Hilan harvennus keskitetysti (2026-10-23).

Periaate (sama kaikille malleille ja sovellukselle): hilan arvo k kuvaa
PISTETTÄ lat0 + k*dlat (ei ruudun kulmaa). Harvennettu arvo on keskiarvo
natiivipisteistä, joiden keskikohta on harvennetun pisteen ympärillä
(ikkuna +-puoli askelta, natiivisolut painotettu päällekkäisyyden
mukaan). Reunoilla ikkuna kapenee SYMMETRISESTI, jotta arvo pysyy
pisteen kohdalla. Harvennettu hila alkaa ja päättyy natiivihilan
ensimmäiseen ja viimeiseen pisteeseen -> alueen rajat = datan todelliset
rajat, ja pilvet ja tuuli (eri harvennus, sama natiivihila) saavat samat
rajat.

Aiempi tapa (2026-10 asti): STRIDE x STRIDE -lohkon keskiarvo merkittiin
lohkon ENSIMMÄISEN (etelä-/länsireunan) natiivipisteen kohdalle ->
arvot (STRIDE-1)/2 natiiviaskelta liian etelässä/lännessä, ja viimeinen
osittainen lohko jäi lyhyemmäksi kuin alue (HARMONIE-tuuli 73,455 vs.
73,50 N). Ks. MUISTIO-mallit.md "Hilan keskitys".

Vain numpy. Testi: tests/test_grid_resample.py.
"""
import math

import numpy as np


def out_count(n, stride):
    """Harvennetun akselin pisteiden määrä: askel <= stride natiiviaskelta,
    ensimmäinen ja viimeinen piste natiivihilan päissä."""
    if stride <= 1 or n <= 1:
        return n
    return math.ceil((n - 1) / stride) + 1


def axis_weights(n, m):
    """(m, n) painomatriisi: harvennettu piste k = sum_j W[k, j] * natiivi[j].
    Piste k on natiivi-indeksissä c = k*(n-1)/(m-1); ikkuna c +- h,
    h = puoli harvennettua askelta, reunoilla h kapenee symmetrisesti."""
    if m == n:
        return np.eye(n)
    if m < 2:
        raise ValueError("vähintään 2 pistettä")
    step = (n - 1) / (m - 1)
    W = np.zeros((m, n))
    edges_lo = np.arange(n) - 0.5   # natiivisolu j kattaa [j-0.5, j+0.5]
    edges_hi = edges_lo + 1.0
    for k in range(m):
        c = k * step
        h = min(step / 2.0, c + 0.5, (n - 0.5) - c)
        lo, hi = c - h, c + h
        w = np.clip(np.minimum(edges_hi, hi) - np.maximum(edges_lo, lo), 0.0, None)
        W[k] = w / w.sum()
    return W


def out_coords(native, m):
    """Harvennetun akselin koordinaatit: tasavälein natiivin päästä päähän."""
    native = np.asarray(native, dtype=float)
    if m == len(native):
        return native.copy()
    return np.linspace(native[0], native[-1], m)


class Resampler:
    """Harventaa (lat, lon)-kenttiä samoilla painoilla (lasketaan kerran)."""

    def __init__(self, lat_native, lon_native, stride):
        self.lat = out_coords(lat_native, out_count(len(lat_native), stride))
        self.lon = out_coords(lon_native, out_count(len(lon_native), stride))
        self.Wlat = axis_weights(len(lat_native), len(self.lat))
        self.Wlon = axis_weights(len(lon_native), len(self.lon))

    def __call__(self, field):
        """field (nlat_native, nlon_native) -> (nlat, nlon)."""
        return self.Wlat @ np.asarray(field, dtype=float) @ self.Wlon.T

    def meta(self):
        """Hilan kentät meta-tiedostoon: dlat/dlon = (lat1-lat0)/(n-1) tarkasti."""
        nlat, nlon = len(self.lat), len(self.lon)
        return {
            "lat0": float(self.lat[0]), "lat1": float(self.lat[-1]),
            "lon0": float(self.lon[0]), "lon1": float(self.lon[-1]),
            "nlat": nlat, "nlon": nlon,
            "dlat": float((self.lat[-1] - self.lat[0]) / (nlat - 1)) if nlat > 1 else 0.0,
            "dlon": float((self.lon[-1] - self.lon[0]) / (nlon - 1)) if nlon > 1 else 0.0,
        }
