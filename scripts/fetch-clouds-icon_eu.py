#!/usr/bin/env python3
"""
Hakee DWD ICON-EU -pilviennusteen (Open-Meteo, &models=icon_eu) ja kirjoittaa
data/clouds-icon_eu.json. Alue rajattu Suomeen + reunamarginaali (ICON-EU:n
kattavuus ulottuu n. 70,5 N:aan asti, ks. MUISTIO-mallit.md), koska Open-Meteo
on pistekohtainen rajapinta eikä tarjoa valmista globaalia hilatiedostoa
(toisin kuin ECMWF Open Data -putki scripts/fetch-clouds.py).

Haetaan kokonaispilvisyys + matala/keski/ylä-erittely (ICON-EU tarjoaa
kaikki neljä), jotta alapaneelin näkyvyysindeksi voi käyttää samaa
korkeuspainotettua laskentaa kuin ECMWF-mallilla silloin kun sillä olisi
vastaava erittely.

Pisteet haetaan Open-Meteon monipistekyselyllä (pilkuin erotetut lat/lon-
listat palauttavat kaikki pisteet YHDELLÄ HTTP-kutsulla) erissä, jotta
yksittäinen kutsu ei kasva liian suureksi. Ei vaadi ulkoisia pip-paketteja
(pelkkä Python-standardikirjasto).
"""

import json, os, sys, time, urllib.request, urllib.error

# Suomi + marginaali. ICON-EU:n pohjoisraja n. 70,5 N - tarkistettu toimivaksi
# Utsjoella (69,9 N) käsin ennen tämän skriptin kirjoittamista.
LAT0, LAT1, DLAT = 59.0, 70.5, 0.5
LON0, LON1, DLON = 18.0, 32.0, 0.5
FORECAST_DAYS = 2          # 48 h, riittää reilusti aikajanan 10 h -maksimiin
MODEL = "icon_eu"
BATCH = 100                # pisteitä per HTTP-kutsu

def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)

def frange(a, b, step):
    n = round((b - a) / step) + 1
    return [round(a + i * step, 4) for i in range(n)]

lats = frange(LAT0, LAT1, DLAT)   # S -> N
lons = frange(LON0, LON1, DLON)   # W -> E
nlat, nlon = len(lats), len(lons)

# Pistelista S->N, W->E -jarjestyksessa (sama rakenne kuin ECMWF-putkessa)
points = [(la, lo) for la in lats for lo in lons]
print(f"Haetaan {len(points)} pistetta ({nlat}x{nlon}), malli={MODEL}...")

FIELDS = ["cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high"]
times_ms = None
total_by_point, low_by_point, mid_by_point, high_by_point = [], [], [], []

def fetch_batch(batch_points):
    lat_s = ",".join(str(p[0]) for p in batch_points)
    lon_s = ",".join(str(p[1]) for p in batch_points)
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat_s}&longitude={lon_s}"
        f"&hourly={','.join(FIELDS)}"
        f"&models={MODEL}&forecast_days={FORECAST_DAYS}&timezone=UTC"
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # Open-Meteon ilmaiskiintiö laskee monipistekyselyssä per PISTE, ei
            # per HTTP-kutsu (havaittu kokeilemalla: 600 pistetta/min -raja osui
            # tasan 6. erän jalkeen 100 pisteen erilla). 429 vaatii kokonaisen
            # minuutin palautumisajan, ei lyhytta uudelleenyritysta.
            if e.code == 429:
                if attempt == 2:
                    die(f"Open-Meteo-haku epaonnistui toistuvasti (429 Too Many Requests)")
                print("  ...429, odotetaan 65 s ennen uudelleenyritysta")
                time.sleep(65)
                continue
            if attempt == 2:
                die(f"Open-Meteo-haku epaonnistui ({e.code}): {e.reason}")
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            if attempt == 2:
                die(f"Open-Meteo-haku epaonnistui: {e}")
            time.sleep(2 * (attempt + 1))

for i in range(0, len(points), BATCH):
    batch = points[i:i+BATCH]
    if i > 0:
        time.sleep(12)   # pysytaan reilusti alle ~600 pistetta/min -kiintion
    data = fetch_batch(batch)
    rows = data if isinstance(data, list) else [data]
    if len(rows) != len(batch):
        die(f"Odotettiin {len(batch)} tulosta, saatiin {len(rows)}")
    for row in rows:
        h = row.get("hourly", {})
        if times_ms is None:
            times_ms = [int(__import__("datetime").datetime
                         .fromisoformat(t).replace(tzinfo=__import__("datetime").timezone.utc)
                         .timestamp() * 1000) for t in h["time"]]
        total_by_point.append(h.get("cloud_cover", []))
        low_by_point.append(h.get("cloud_cover_low", []))
        mid_by_point.append(h.get("cloud_cover_mid", []))
        high_by_point.append(h.get("cloud_cover_high", []))
    print(f"  ...{min(i+BATCH, len(points))}/{len(points)}")

ntimes = len(times_ms)

def clip_pct(v):
    if v is None:
        return 0
    return max(0, min(100, round(v)))

def build_vals(by_point):
    # Jarjestys: aika-major, sitten lat (S->N), sitten lon (W->E) - sama kuin ECMWF-putkessa
    out = []
    for t in range(ntimes):
        for p in range(len(points)):
            series = by_point[p]
            out.append(clip_pct(series[t]) if t < len(series) else 0)
    return out

result = {
    "generated": int(time.time() * 1000),
    "model": MODEL,
    "lat0": LAT0, "lat1": LAT1,
    "lon0": LON0, "lon1": LON1,
    "nlat": nlat, "nlon": nlon,
    "dlat": DLAT, "dlon": DLON,
    "times": times_ms,
    "vals": build_vals(total_by_point),
    "valsLow": build_vals(low_by_point),
    "valsMid": build_vals(mid_by_point),
    "valsHigh": build_vals(high_by_point),
}

os.makedirs("data", exist_ok=True)
with open("data/clouds-icon_eu.json", "w") as f:
    json.dump(result, f)

size_kb = os.path.getsize("data/clouds-icon_eu.json") / 1024
print(f"OK: {ntimes} aikaa x {nlat}x{nlon} = {len(result['vals'])} arvoa/kentta -> "
      f"data/clouds-icon_eu.json ({size_kb:.0f} KB)")
