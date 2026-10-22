"""Keskeneräinen mallinajo (scripts/run_guard.py, KATSELMOINTI 1.13).
Ajo: python3 -m unittest discover -s tests -p "test_*.py"   (vain stdlib)"""
import contextlib, io, os, sys, tempfile, unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
import run_guard  # noqa: E402

STEPS = list(range(31))
FIELDS = ["CLCT", "CLCL", "CLCM", "CLCH"]


def url_for(run, field, step):   # sama muoto kuin fetch-clouds-icon_eu.py
    return f"https://opendata.dwd.de/weather/nwp/icon-eu/grib/{run[-2:]}/{field.lower()}/icon-eu_europe_regular-lat-lon_single-level_{run}_{step:03d}_{field}.grib2.bz2"


def fake_dwd(published):
    """published = {ajo: julkaistut askeleet}: kuten DWD, joka julkaisee askeleet järjestyksessä."""
    files = {url_for(r, f, s) for r, steps in published.items() for f in FIELDS for s in steps}
    return lambda url: url in files


def touch(path):
    with open(path, "w") as f:
        f.write("{}")


def all_urls(run):
    return [url_for(run, f, s) for f in FIELDS for s in STEPS]


class PickCompleteRun(unittest.TestCase):
    def test_uusin_keskenerainen_kaytetaan_edellista_taydellista(self):
        # 21.10. klo 23.44 -tilanne: 18 UTC -ajosta julkaistu vasta askeleet 0-20.
        exists = fake_dwd({"2026102218": range(0, 21), "2026102215": STEPS})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            run = run_guard.pick_complete_run(["2026102218", "2026102215"], all_urls, exists, log=print)
        self.assertEqual(run, "2026102215")
        self.assertIn("::notice title=Uusin ajo keskeneräinen::", out.getvalue())
        self.assertIn("40/124 puuttuu", out.getvalue())   # askeleet 21-30 x 4 kenttää

    def test_vain_yksi_kentta_puuttuu_viimeisesta_askeleesta(self):
        files = set(all_urls("2026102218")) - {url_for("2026102218", "CLCH", 30)}
        files |= set(all_urls("2026102215"))
        with contextlib.redirect_stdout(io.StringIO()):
            run = run_guard.pick_complete_run(["2026102218", "2026102215"], all_urls, lambda u: u in files)
        self.assertEqual(run, "2026102215")

    def test_taydellinen_uusin_ajo_valitaan_heti(self):
        exists = fake_dwd({"2026102218": STEPS, "2026102215": STEPS})
        self.assertEqual(run_guard.pick_complete_run(["2026102218", "2026102215"], all_urls, exists, log=lambda *a: None), "2026102218")

    def test_ei_taydellista_ajoa_mutta_osittainen_on(self):
        exists = fake_dwd({"2026102218": range(0, 5)})
        with self.assertRaises(run_guard.IncompleteRun):
            run_guard.pick_complete_run(["2026102218", "2026102215"], all_urls, exists, log=lambda *a: None)

    def test_ei_mitaan_loydy_on_virhe(self):
        with self.assertRaises(LookupError):
            run_guard.pick_complete_run(["2026102218"], all_urls, lambda u: False, log=lambda *a: None)


class RequireStepsAndKeepPrevious(unittest.TestCase):
    def test_harmonie_vajaa_askelmaara(self):
        # FMI palautti keskeneräisestä ajosta 20 askelta 31:stä.
        with self.assertRaises(run_guard.IncompleteRun):
            run_guard.require_steps(20, 31)
        run_guard.require_steps(31, 31)   # täysi ajo: ei poikkeusta

    def test_keep_previous_poistaa_osittaiset_ja_lopettaa_onnistuneesti(self):
        with tempfile.TemporaryDirectory() as d:
            for i in range(3):
                touch(os.path.join(d, f"clouds-icon_eu-step{i:02d}.json"))
            keep = os.path.join(d, "clouds-ecmwf-meta.json")   # toisen mallin tiedosto säilyy
            touch(keep)
            out = io.StringIO()
            with contextlib.redirect_stdout(out), self.assertRaises(SystemExit) as cm:
                run_guard.keep_previous("icon_eu", "vain 20/31 aika-askelta", [os.path.join(d, "clouds-icon_eu-*.json")])
            self.assertEqual(cm.exception.code, 0, "ei virhettä työnkulussa")
            self.assertEqual(sorted(os.listdir(d)), ["clouds-ecmwf-meta.json"])
            self.assertIn("::notice title=Keskeneräinen ajo::icon_eu: vain 20/31 aika-askelta", out.getvalue())
            self.assertIn("poistettu 3 osittaista tiedostoa", out.getvalue())


if __name__ == "__main__":
    unittest.main()
