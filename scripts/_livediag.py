# TILAPÄINEN (poistetaan ennen yhdistämistä): tuotannon check-camera-thumbnails.py
# kuivana (gh-pagesin edellinen tila, ei julkaisua) -> lähetyksen tila ja ID:t.
import json, os, subprocess
subprocess.run("git fetch -q origin gh-pages --depth=1 && git show origin/gh-pages:data/camera-status.json > data/camera-status.json", shell=True)
subprocess.run(["python3", "scripts/check-camera-thumbnails.py"], check=True)
for k, v in json.load(open("data/camera-status.json"))["cameras"].items():
    print(f"TULOS {k:17s} {v['videoId']} lahetys={v.get('broadcast')} live={v['live']} | {v.get('resolveNote')}")
