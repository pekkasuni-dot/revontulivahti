#!/usr/bin/env python3
"""VÄLIAIKAINEN tutkimus (2026-11-12): onko HARMONIEn ajon tunniste luotettavasti saatavilla?
Tulostaa GRIB-viestien viiteajat (dataDate/dataTime) kaikilta aika-askelilta, /timeseries-rajapinnan
origintimen ja ensimmäisen aika-askeleen. Ei kirjoita mitään, ei julkaise. Poistetaan ennen yhdistämistä."""
import datetime, json, os, sys, tempfile, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from model_areas import HARMONIE_BBOX
import eccodes

def iso(dt): return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
def get(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "revontulivahti (github.com/pekkasuni-dot/revontulivahti)"})
    with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()

now = datetime.datetime.now(datetime.timezone.utc).replace(minute=0, second=0, microsecond=0)
end = now + datetime.timedelta(hours=30)
print("Ajohetki", iso(datetime.datetime.now(datetime.timezone.utc)), "| pyydetty", iso(now), "-", iso(end))

# 1) /timeseries origintime (kuten IL:n haku), kolme pistettä
for ll in ["69.0,21.0", "65.0,25.5", "60.2,24.9"]:
    for prod in ["harmonie_scandinavia_surface"]:
        q = urllib.parse.urlencode({"producer": prod, "param": "origintime,time", "latlon": ll, "format": "json", "tz": "UTC", "timesteps": 2})
        try: print("timeseries", prod, ll, json.loads(get("https://opendata.fmi.fi/timeseries?" + q, 30)))
        except Exception as e: print("timeseries", prod, ll, "VIRHE", str(e)[:200])

# 2) /download kuten tuotannossa (TotalCloudCover), viiteaika jokaisesta GRIB-viestistä
url = (f"https://opendata.fmi.fi/download?producer=harmonie_scandinavia_surface&param=TotalCloudCover"
       f"&bbox={HARMONIE_BBOX}&starttime={iso(now)}&endtime={iso(end)}&format=grib2&projection=EPSG:4326&levels=0&timestep=60")
tmp = tempfile.mktemp(suffix=".grib2")
open(tmp, "wb").write(get(url))
print("GRIB", os.path.getsize(tmp) // 1000, "kt")
refs, valid = set(), []
with open(tmp, "rb") as f:
    while True:
        h = eccodes.codes_grib_new_from_file(f)
        if h is None: break
        g = lambda k: eccodes.codes_get(h, k)
        ref = f"{g('dataDate')}T{g('dataTime'):04d}"
        refs.add(ref)
        valid.append((f"{g('validityDate')}T{g('validityTime'):04d}", ref, g('stepRange'), g('centre'), g('significanceOfReferenceTime') if eccodes.codes_is_defined(h, 'significanceOfReferenceTime') else None))
        eccodes.codes_release(h)
print("Viestejä", len(valid), "| eri viiteaikoja", sorted(refs))
for v in valid[:3] + valid[-2:]: print("  validity", v[0], "| viiteaika", v[1], "| step", v[2], "| centre", v[3], "| sigRefTime", v[4])
first = valid[0][0] if valid else None
if refs and first:
    r = datetime.datetime.strptime(sorted(refs)[-1], "%Y%m%dT%H%M").replace(tzinfo=datetime.timezone.utc)
    fv = datetime.datetime.strptime(first, "%Y%m%dT%H%M").replace(tzinfo=datetime.timezone.utc)
    print("Ensimmäinen aika-askel", iso(fv), "| viiteaika", iso(r), "| ero", (fv - r).total_seconds() / 3600, "h")
