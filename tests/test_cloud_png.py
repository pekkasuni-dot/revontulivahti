"""Pilvikentän PNG-pakkaus (scripts/cloud_png.py, 2026-10-24).
Ajo: python3 -m unittest discover -s tests -p "test_*.py"   (numpy, Pillow)"""
import json, os, sys, unittest

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import cloud_png  # noqa: E402

FIXTURE = os.path.join(os.path.dirname(__file__), 'fixtures', 'cloud-png-sample.json')


class CloudPng(unittest.TestCase):
    def test_haviöton_mallien_hilakoot(self):
        # Oikeat hilakoot: ECMWF 121x361, HARMONIE 412x802 (leveys ei jaollinen 4:llä).
        rng = np.random.default_rng(1)
        for nlat, nlon in [(121, 361), (412, 802), (1, 1), (7, 3)]:
            a = rng.integers(0, 101, size=(nlat, nlon))
            b = cloud_png.decode(cloud_png.encode(a))
            self.assertEqual(b.shape, (nlat, nlon))
            np.testing.assert_array_equal(b, a)

    def test_aariarvot_ja_rivijarjestys(self):
        a = np.zeros((3, 4), dtype=np.uint8)
        a[0, 0] = 100        # ensimmäinen piste (etelä-länsi) = taulukon ensimmäinen arvo
        a[2, 3] = 1          # viimeinen piste
        b = cloud_png.decode(cloud_png.encode(a))
        self.assertEqual(b.flatten().tolist(), a.flatten().tolist())

    def test_nakyvyys_koodaus(self):
        # Sumutaso: 0-5 km 50 m portain, yli 5 km ja NaN = 100.
        v = np.array([[0, 24, 26, 999, 1000, 4999, 5000, 75000, np.nan]])
        self.assertEqual(cloud_png.visibility_to_code(v).tolist(), [[0, 0, 1, 20, 20, 100, 100, 100, 100]])
        b = cloud_png.decode(cloud_png.encode_visibility(v))
        self.assertEqual(b.tolist(), [[0, 0, 1, 20, 20, 100, 100, 100, 100]])

    def test_virheellinen_alue(self):
        with self.assertRaises(ValueError):
            cloud_png.encode(np.array([[101]]))
        with self.assertRaises(ValueError):
            cloud_png.encode(np.array([1, 2, 3]))

    def test_oikea_data_sama_kuin_json(self):
        # Ote oikeasta gh-pages-datasta (HARMONIE ja ECMWF 2026-10-24): plain JSON
        # -arvot ja samasta kentästä tehty PNG -> purku täsmälleen sama.
        fx = json.load(open(FIXTURE))
        for c in fx['cases']:
            a = np.array(c['vals'], dtype=np.uint8).reshape(c['nlat'], c['nlon'])
            np.testing.assert_array_equal(cloud_png.decode(c['png']), a)
            self.assertEqual(cloud_png.encode(a), c['png'])   # sama koodaus kuin hakuskripteissä


if __name__ == '__main__':
    unittest.main()
