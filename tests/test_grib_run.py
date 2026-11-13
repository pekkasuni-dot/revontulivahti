import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import numpy as np
import grib_run as G

R = np.datetime64("2026-11-12T18:00:00", "ns")


class GribRun(unittest.TestCase):
    def test_scalar(self):
        self.assertEqual(G.run_ms(R), 1794506400000)
        self.assertEqual(G.run_iso(1794506400000), "2026-11-12T18:00:00+00:00")

    def test_same_value_all_steps(self):
        self.assertEqual(G.run_ms(np.array([R, R, R])), 1794506400000)

    def test_missing_or_mixed_runs(self):
        self.assertIsNone(G.run_ms(None))
        self.assertIsNone(G.run_ms(np.array([R, R + np.timedelta64(3, "h")])), "eri ajot -> ei tunnistetta")
        self.assertIsNone(G.run_ms(np.array(["NaT"], dtype="datetime64[ns]")))

    def test_origintime(self):
        self.assertEqual(G.origin_ms("20261112T180000"), 1794506400000)
        self.assertIsNone(G.origin_ms(None))
        self.assertIsNone(G.origin_ms("x"))


if __name__ == "__main__":
    unittest.main()
