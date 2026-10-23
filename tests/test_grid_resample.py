"""Hilan keskitetty harvennus (scripts/grid_resample.py, 2026-10-23).
Ajo: python3 -m unittest discover -s tests -p "test_*.py"   (numpy)"""
import os, sys, unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import grid_resample as gr  # noqa: E402

# Natiivihilat kuten oikeassa datassa (gh-pages 2026-10-23).
HARMONIE_LAT = 55 + 0.0225 * np.arange(823)      # 55 ... 73,50
HARMONIE_LON = -1 + 0.0225 * np.arange(1601)     # -1 ... 35
ICON_LAT = 55 + 0.0625 * np.arange(249)          # 55 ... 70,5
ICON_LON = -23.5 + 0.0625 * np.arange(1377)      # -23,5 ... 62,5


def sample(meta, field, lat, lon):
    """Sovelluksen tulkinta: arvo k on pisteessä lat0 + k*dlat (bilineaarinen)."""
    fr = (lat - meta['lat0']) / meta['dlat']
    fc = (lon - meta['lon0']) / meta['dlon']
    r0 = min(int(np.floor(fr)), meta['nlat'] - 2); c0 = min(int(np.floor(fc)), meta['nlon'] - 2)
    a, b = fr - r0, fc - c0
    return (field[r0, c0] * (1 - a) * (1 - b) + field[r0, c0 + 1] * (1 - a) * b
            + field[r0 + 1, c0] * a * (1 - b) + field[r0 + 1, c0 + 1] * a * b)


class Resample(unittest.TestCase):
    def test_lineaarinen_kentta_sailyy_kaikkialla_myos_reunoilla(self):
        # f = lat + 2*lon: keskitetty harvennus ei siirrä arvoja -> sama f
        # harvennetun pisteen koordinaatissa (vanha kulmamerkintä: virhe ~1,5 askelta).
        for lat, lon, s in ((HARMONIE_LAT, HARMONIE_LON, 4), (HARMONIE_LAT, HARMONIE_LON, 2), (ICON_LAT, ICON_LON, 2)):
            f = lat[:, None] + 2 * lon[None, :]
            R = gr.Resampler(lat, lon, s)
            out = R(f)
            expect = R.lat[:, None] + 2 * R.lon[None, :]
            # Jäännös < 0,0001° (~10 m): ikkunan reuna leikkaa natiivisoluja, kun
            # askel ei ole kokonaisluku (HARMONIE-tuuli 822/206 = 3,99).
            self.assertLess(np.abs(out - expect).max(), 1e-4, f"stride {s}")

    def test_tunnettu_huippu_loytyy_oikeasta_kohdasta(self):
        # Yksittäinen arvo natiivipisteessä (70,0225 N, 20,0 E): harvennuksen
        # jälkeen suurin arvo on siinä harvennetussa pisteessä, joka on lähinnä
        # sitä (vanha kulmamerkintä: 1,5 natiiviaskelta etelään/länteen).
        i, j = 667, 933   # 55 + 667*0,0225 = 70,0075; -1 + 933*0,0225 = 19,9925
        f = np.zeros((len(HARMONIE_LAT), len(HARMONIE_LON))); f[i, j] = 100.0
        R = gr.Resampler(HARMONIE_LAT, HARMONIE_LON, 4)
        out = R(f)
        k, l = np.unravel_index(np.argmax(out), out.shape)
        self.assertLess(abs(R.lat[k] - HARMONIE_LAT[i]), R.meta()['dlat'] / 2 + 1e-9)
        self.assertLess(abs(R.lon[l] - HARMONIE_LON[j]), R.meta()['dlon'] / 2 + 1e-9)

    def test_tunnettu_arvo_tunnetussa_pisteessa(self):
        # Lämmin "saari" 69,0-69,5 N / 25,0-26,0 E (100), muualla 0: sovelluksen
        # näytteistys saaren keskellä = 100, kaukana = 0, reuna osuu oikeaan kohtaan.
        f = np.where((HARMONIE_LAT[:, None] >= 69.0) & (HARMONIE_LAT[:, None] <= 69.5)
                     & (HARMONIE_LON[None, :] >= 25.0) & (HARMONIE_LON[None, :] <= 26.0), 100.0, 0.0)
        R = gr.Resampler(HARMONIE_LAT, HARMONIE_LON, 4); m = R.meta(); out = R(f)
        self.assertAlmostEqual(sample(m, out, 69.25, 25.5), 100.0, places=6)
        self.assertAlmostEqual(sample(m, out, 66.0, 25.5), 0.0, places=6)
        # Puolivälin raja (50) saaren etelä- ja länsireunalla: alle puoli harvennettua askelta oikeasta.
        lats = np.linspace(68.8, 69.2, 4001)
        cross = lats[np.argmin(np.abs([sample(m, out, la, 25.5) - 50 for la in lats]))]
        self.assertLess(abs(cross - (69.0 - 0.0225 / 2)), m['dlat'] / 2)

    def test_pilvien_ja_tuulen_rajat_samat(self):
        # Sama natiivihila, eri harvennus (HARMONIE pilvet 2, tuuli 4; ICON-EU 1 / 2).
        for lat, lon, s_c, s_w in ((HARMONIE_LAT, HARMONIE_LON, 2, 4), (ICON_LAT, ICON_LON, 1, 2)):
            c, w = gr.Resampler(lat, lon, s_c).meta(), gr.Resampler(lat, lon, s_w).meta()
            for k in ('lat0', 'lat1', 'lon0', 'lon1'):
                self.assertAlmostEqual(c[k], w[k], places=9, msg=k)
            self.assertAlmostEqual(c['lat1'], float(lat[-1]), places=9)

    def test_vali_vastaa_rajoja(self):
        m = gr.Resampler(HARMONIE_LAT, HARMONIE_LON, 4).meta()
        self.assertAlmostEqual(m['lat0'] + (m['nlat'] - 1) * m['dlat'], m['lat1'], places=9)
        self.assertAlmostEqual(m['lon0'] + (m['nlon'] - 1) * m['dlon'], m['lon1'], places=9)
        self.assertEqual((m['nlat'], m['nlon']), (207, 401))
        self.assertEqual(gr.out_count(823, 2), 412)

    def test_stride_1_ei_muutu(self):
        f = np.random.default_rng(1).random((len(ICON_LAT), 50))
        R = gr.Resampler(ICON_LAT, ICON_LON[:50], 1)
        np.testing.assert_array_equal(R(f), f)


if __name__ == "__main__":
    unittest.main()
