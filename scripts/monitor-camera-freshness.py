#!/usr/bin/env python3
"""
Erillinen, kehittajan kasin ajama DIAGNOSTIIKKATYOKALU (ei ajeta GH
Actionsilla) - tarkistaa data/cameras.json:in YouTube-kameroiden live-
pikkukuvien TODELLISEN paivitystiheyden ajan kuluessa, kirjaamalla jokaisen
tarkistuksen tulos (tiiviste, koko, live-tila, muuttuiko edellisesta) omaan
lokitiedostoonsa analysointia varten.

ERO check-camera-thumbnails.py:hen: tama skripti EI paivita
data/camera-status.json:ia (tuotantotila) vaan kirjoittaa oman, yksityis-
kohtaisemman JSONL-lokin (yksi JSON-rivi per tarkistuskierros per kamera),
jotta paivitystiheyden TODELLINEN kaytos voidaan analysoida jalkikateen
(esim. "kuinka monta minuuttia kului ensimmaiseen havaittuun muutokseen").

Kaytto:
  python3 scripts/monitor-camera-freshness.py [--interval-min 15] [--hours 24] [--log polku.jsonl]

Oletusarvot vastaavat tehtavananon esimerkkia (15 min / 24 h), mutta
molemmat ovat saadettavissa - esim. nopeampaan alkutestaukseen
"--interval-min 2 --hours 1".
"""

import argparse, hashlib, json, sys, time
import urllib.request, urllib.error

# HUOM: check-camera-thumbnails.py:n tarkistuslogiikka on KOPIOITU (ei
# tuotu import-lauseella) - Python ei salli tavuviivallisten tiedostonimien
# importtausta moduulina, ja tama skripti on tarkoituksella itsenainen
# diagnostiikkatyokalu, ei tuotantoputken osa.

def fetch_bytes(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "revontulivahti-camera-monitor/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.status
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception as e:
        print(f"  Haku epaonnistui ({url}): {e}", file=sys.stderr)
        return None, None


def check_youtube_camera(video_id):
    live_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault_live.jpg"
    data, status = fetch_bytes(live_url)
    if data is not None and status == 200:
        return True, hashlib.sha256(data).hexdigest(), len(data)
    fallback_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    data2, status2 = fetch_bytes(fallback_url)
    if data2 is not None and status2 == 200:
        return False, hashlib.sha256(data2).hexdigest(), len(data2)
    return False, None, None


def load_cameras():
    with open("data/cameras.json", encoding="utf-8") as f:
        return [c for c in json.load(f)["cameras"] if c.get("type") == "youtube"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--interval-min", type=float, default=15.0)
    ap.add_argument("--hours", type=float, default=24.0)
    ap.add_argument("--log", default="camera-freshness-log.jsonl")
    args = ap.parse_args()

    cameras = load_cameras()
    end_time = time.time() + args.hours * 3600
    last_hash = {}
    round_num = 0

    print(f"Seuranta kaynnissa: {len(cameras)} kameraa, {args.interval_min} min valein, "
          f"{args.hours} h ajan. Loki: {args.log}", flush=True)

    with open(args.log, "a", encoding="utf-8") as logf:
        while time.time() < end_time:
            round_num += 1
            round_start = time.time()
            for cam in cameras:
                cid = cam["id"]
                vid = cam["youtube"]["videoId"]
                live, sha, size = check_youtube_camera(vid)
                changed = sha is not None and last_hash.get(cid) is not None and sha != last_hash.get(cid)
                is_first = cid not in last_hash
                if sha is not None:
                    last_hash[cid] = sha
                entry = {
                    "round": round_num,
                    "t": int(time.time() * 1000),
                    "camera": cid,
                    "live": live,
                    "hash": sha,
                    "sizeBytes": size,
                    "changedFromPrevious": None if is_first else changed,
                }
                logf.write(json.dumps(entry) + "\n")
                print(f"  [kierros {round_num}] {cid}: live={live} koko={size} "
                      f"muuttui={'(ensimmainen)' if is_first else changed}", flush=True)
            logf.flush()
            elapsed = time.time() - round_start
            sleep_s = max(0, args.interval_min * 60 - elapsed)
            if time.time() + sleep_s < end_time:
                time.sleep(sleep_s)
            else:
                break
    print("Seuranta paattyi.", flush=True)


if __name__ == "__main__":
    main()
