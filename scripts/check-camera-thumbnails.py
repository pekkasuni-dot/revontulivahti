#!/usr/bin/env python3
"""
Tarkistaa data/cameras.json:ssa listattujen YouTube-kameroiden live-
pikkukuvat ja paivittaa data/camera-status.json:in, jossa per kamera:
onko striimi tallan hetkella live, milloin kuva viimeksi TARKISTETTIIN,
ja milloin se viimeksi OIKEASTI MUUTTUI (tiivisteen - SHA-256 - vertailu
edelliseen tunnettuun tiivisteeseen).

MIKSI TAMA TARVITAAN (ei vain client-puolen JS-vertailu): i.ytimg.com EI
laheta Access-Control-Allow-Origin-otsaketta (todennettu oikealla HTTP-
kutsulla), joten selaimen JS EI VOI lukea kuvan tavuja/otsakkeita cross-
origin-rajoituksen takia (`fetch()` epaonnistuisi tai palauttaisi
lapinakymattoman/"opaque"-vastauksen, eika `<canvas>`-piirtokaan toimisi
ilman etta canvas "tahriintuu" turvasyista). Palvelinpuolen (tai taman
skriptin, joka EI ole selain) HTTP-kutsu EI ole CORS-rajoitettu - CORS on
puhtaasti SELAIMEN oma turvamekanismi. Talla ratkaisulla:
1. Selain nayttaa AINA suoran, tuoreen live-kuvan suoraan YouTubelta
   (EI kaappausta/tallennusta - kuvan TAVUJA ei koskaan tallenneta tahan
   repoon, vain pieni SHA-256-tiiviste + aikaleimat).
2. "Kuva muuttui viimeksi X sitten" -teksti selaimessa perustuu TAMAN
   skriptin OIKEASTI havaitsemaan muutokseen (data/camera-status.json:ista),
   ei pelkkaan olettamukseen paivitysvalista.

Kaytto: python3 scripts/check-camera-thumbnails.py
Ajetaan saannollisesti GitHub Actionsilla (ks. .github/workflows/
camera-status.yml) - EI vaadi API-avainta, kayttaa vain julkisia
i.ytimg.com-pikkukuvaosoitteita.
"""

import hashlib, json, os, sys, time
import urllib.request, urllib.error

CAMERAS_FILE = "data/cameras.json"
STATUS_FILE = "data/camera-status.json"
STALE_THRESHOLD_MS = 30 * 60 * 1000  # 30 min - sama raja kuin UI:ssa "Kamera ei paivity"


def die(msg):
    print(f"VIRHE: {msg}", file=sys.stderr)
    sys.exit(1)


def fetch_bytes(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "revontulivahti-camera-check/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.status
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception as e:
        print(f"  Haku epaonnistui ({url}): {e}", file=sys.stderr)
        return None, None


def check_youtube_camera(video_id):
    """Palauttaa (live: bool, sha256-tiiviste tai None, koko tai None)."""
    live_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault_live.jpg"
    data, status = fetch_bytes(live_url)
    if data is not None and status == 200:
        return True, hashlib.sha256(data).hexdigest(), len(data)
    # Varapolku: ei-live-pikkukuva (nain erotamme "striimi ei kaynnissa" -tilan -
    # HUOM: tama on PAATELTY kaytos (ks. MUISTIO), ei virallisesti dokumentoitu
    # YouTuben toimesta - "_live"-pikkukuvavariantin oletetaan haviavan/palaavan
    # 404:aan kun striimi ei ole aktiivinen.
    fallback_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    data2, status2 = fetch_bytes(fallback_url)
    if data2 is not None and status2 == 200:
        return False, hashlib.sha256(data2).hexdigest(), len(data2)
    return False, None, None


def main():
    if not os.path.exists(CAMERAS_FILE):
        die(f"{CAMERAS_FILE} puuttuu")
    with open(CAMERAS_FILE, encoding="utf-8") as f:
        cameras = json.load(f)["cameras"]

    prev_status = {}
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, encoding="utf-8") as f:
                prev_status = json.load(f).get("cameras", {})
        except Exception as e:
            print(f"VAROITUS: edellista {STATUS_FILE}:aa ei voitu lukea ({e}), aloitetaan tyhjasta", file=sys.stderr)

    now_ms = int(time.time() * 1000)
    new_status = {}

    for cam in cameras:
        cid = cam["id"]
        if cam.get("type") != "youtube":
            continue  # muun tyyppiset (tulevat tiedekamerat) eivat kayta tata tarkistusta
        vid = cam["youtube"]["videoId"]
        print(f"Tarkistetaan {cid} ({vid}) ...")
        live, sha, size = check_youtube_camera(vid)

        prev = prev_status.get(cid, {})
        changed = (sha is not None) and (sha != prev.get("hash"))
        last_changed = now_ms if (changed or "lastChanged" not in prev) else prev["lastChanged"]

        new_status[cid] = {
            "lastChecked": now_ms,
            "lastChanged": last_changed,
            "hash": sha,
            "live": live,
            "sizeBytes": size,
        }
        age_min = (now_ms - last_changed) / 60000
        print(f"  live={live} muuttui={changed} ika_min={age_min:.1f} koko={size}")

    result = {"generated": now_ms, "staleThresholdMs": STALE_THRESHOLD_MS, "cameras": new_status}
    os.makedirs("data", exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=0)
    print(f"OK: {STATUS_FILE} paivitetty ({len(new_status)} kameraa)")


if __name__ == "__main__":
    main()
