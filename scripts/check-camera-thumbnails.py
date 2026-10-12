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

MUKAUTETUN (ei-live) PIKKUKUVAN TUNNISTUS (2026-10, OSA 2): osa kanavista
asettaa striiminsa "_live"-pikkukuvan tilalle KIINTEAN, kasin valitun
mainoskuvan (esim. Posio: teksti "LIVE from Lapland") - tallainen kuva ei
koskaan muutu, vaikka striimi olisi oikeasti kaynnissa, ja on oppaalle
hyodyton/harhaanjohtava taivaan tilan arviointiin.

HUOM - KORJATTU VIRHEARVIO (havaittu OIKEASTI pitkaaikaisseurannassa,
EI koodikatselmoinnilla): alunperin `hqdefault_live.jpg`=`hqdefault.jpg`
(VALITON yhden hetken vertailu) riitti yksinaan merkitsemaan kameran
mukautetuksi. Tama antoi VAARAN POSITIIVISEN Starlapland Sodankyla
-kameralle: ensimmainen tarkistus osui hetkeen jolloin molemmat
osoitteet sattuivat palauttamaan saman (todennakoisesti tuore, molemmat
ajoittain synkassa) kuvan, mutta ~10 min myohemmin live-versio OLI
muuttunut eika enaa tasmannyt ei-live-versioon - kamera on siis
OIKEASTI live, ei mukautettu. Johtopaatos: yhden hetken "samat tavut"
EI riita, koska YouTube voi silloin talloin generoida molemmat
versiot samasta tuoreesta kehyksesta ilman etta kanava on asettanut
kiintean ohituskuvaa.

Tunnistus perustuu NYT KAHTEEN signaaliin, MOLEMMAT vaativat PYSYVYYTTA
ajan yli (ei yhden hetken tarkistusta):
1. PITKITTAINEN (ensisijainen): live-pikkukuvan OMA tiiviste ei ole
   muuttunut vahintaan CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS ajan siita
   kun kameraa alettiin seurata.
2. TUKEVA: live==ei-live on pysynyt SAMANA jatkuvasti vahintaan
   CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS ajan (`liveEqualsNonLiveSinceMs`-
   kentta nollataan heti kun ne eroavat edes kerran) - EI yksittaista
   tarkistushetkea.
Jompikumpi PYSYVA signaali riittaa merkitsemaan `isCustomThumbnail:true`.

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
CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS = 20 * 60 * 1000  # 20 min - ks. yllaoleva PITKITTAINEN-signaali


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
    """Palauttaa (live: bool, sha256-tiiviste tai None, koko tai None,
    live_equals_nonlive: bool tai None jos ei-live-kuvaa ei saatu haettua)."""
    live_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault_live.jpg"
    nonlive_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    data, status = fetch_bytes(live_url)
    data2, status2 = fetch_bytes(nonlive_url)
    nonlive_hash = hashlib.sha256(data2).hexdigest() if (data2 is not None and status2 == 200) else None

    if data is not None and status == 200:
        live_hash = hashlib.sha256(data).hexdigest()
        live_equals_nonlive = (nonlive_hash is not None and live_hash == nonlive_hash)
        return True, live_hash, len(data), live_equals_nonlive
    # Varapolku: ei-live-pikkukuva (nain erotamme "striimi ei kaynnissa" -tilan -
    # HUOM: tama on PAATELTY kaytos (ks. MUISTIO), ei virallisesti dokumentoitu
    # YouTuben toimesta - "_live"-pikkukuvavariantin oletetaan haviavan/palaavan
    # 404:aan kun striimi ei ole aktiivinen.
    if nonlive_hash is not None:
        return False, nonlive_hash, len(data2), None
    return False, None, None, None


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
        live, sha, size, live_equals_nonlive = check_youtube_camera(vid)

        prev = prev_status.get(cid, {})
        changed = (sha is not None) and (sha != prev.get("hash"))
        last_changed = now_ms if (changed or "lastChanged" not in prev) else prev["lastChanged"]
        # firstSeenAt puuttuu vanhasta (ennen OSA 2:ta kirjoitetusta) tiedostosta -
        # kayta silloin edellista lastChecked:ia parempana arviona kuin now_ms,
        # jotta skeeman paivitys ei nollaa pitkittaista havaintoikkunaa turhaan.
        first_seen = prev.get("firstSeenAt", prev.get("lastChecked", now_ms))

        # live==nonlive -signaali: nollaa heti kun ne eroavat edes kerran -
        # vain YHTAJAKSOINEN tasmaaminen riittavan pitkaan lasketaan merkiksi.
        if live_equals_nonlive:
            live_equals_nonlive_since = prev.get("liveEqualsNonLiveSinceMs") or now_ms
        else:
            live_equals_nonlive_since = None

        unchanged_duration_ms = now_ms - last_changed
        observed_long_enough = (now_ms - first_seen) >= CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS
        longitudinal_static = observed_long_enough and unchanged_duration_ms >= CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS
        equal_persisted = (live_equals_nonlive_since is not None
                            and (now_ms - live_equals_nonlive_since) >= CUSTOM_THUMBNAIL_MIN_OBSERVATION_MS)
        is_custom_thumbnail = longitudinal_static or equal_persisted

        new_status[cid] = {
            "lastChecked": now_ms,
            "lastChanged": last_changed,
            "firstSeenAt": first_seen,
            "hash": sha,
            "live": live,
            "sizeBytes": size,
            "liveEqualsNonLive": live_equals_nonlive,
            "liveEqualsNonLiveSinceMs": live_equals_nonlive_since,
            "isCustomThumbnail": is_custom_thumbnail,
        }
        age_min = (now_ms - last_changed) / 60000
        print(f"  live={live} muuttui={changed} ika_min={age_min:.1f} koko={size} "
              f"live==nonlive={live_equals_nonlive} mukautettu_kuva={is_custom_thumbnail}")

    result = {"generated": now_ms, "staleThresholdMs": STALE_THRESHOLD_MS, "cameras": new_status}
    os.makedirs("data", exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=0)
    print(f"OK: {STATUS_FILE} paivitetty ({len(new_status)} kameraa)")


if __name__ == "__main__":
    main()
