# TILAPÄINEN (poistetaan ennen yhdistämistä): kameroiden sijaintien geokoodaus (OSM Nominatim).
import json, time, urllib.request, urllib.parse
Q = ["Tutkijantie 28, Rovaniemi", "Apukka Resort, Rovaniemi", "Kultakero, Pelkosenniemi", "Pyhä Dreams, Pyhätunturi",
     "Pyhätunturi", "Ukko-Luosto", "Luosto, Sodankylä", "Aurora Chalet Luosto", "Utsjoki"]
for q in Q:
    u = "https://nominatim.openstreetmap.org/search?format=json&limit=3&q=" + urllib.parse.quote(q)
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "revontulivahti-geocode/1.0 (github.com/pekkasuni-dot/revontulivahti)"}), timeout=20)
        for x in json.load(r): print(f"{q:32s} {x['lat'][:8]} {x['lon'][:8]} {x.get('type')} | {x['display_name'][:90]}")
    except Exception as e: print(q, "VIRHE", e)
    time.sleep(1.2)
