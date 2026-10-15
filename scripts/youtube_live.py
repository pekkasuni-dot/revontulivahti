"""
YouTube-livelahetysten tunnistus ilman API-avainta (jaettu moduuli:
check-camera-thumbnails.py ja probe-camera-candidates.py). Alaviiva
nimessa, jotta tiedoston voi importata (ks. CLAUDE.md, tavuviivalliset
skriptinimet).

Miksi tarvitaan: kanavat aloittavat ajoittain UUDEN lahetyksen uudella
video-ID:lla (todettu 2026-10: Posio iOmco6eIa-0 -> HuCjMGI8fKg). Vanhan,
paattyneen lahetyksen pikkukuva ei muutu enaa koskaan, mika naytti
"kiintealta kansikuvalta". Kamera tunnistetaan siksi kanavan ID:n ja
otsikkokuvion perusteella, ja video-ID haetaan kanavan /streams-sivulta.
"""

import json, re, sys
import urllib.request, urllib.error, urllib.parse

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def get(url, timeout=25):
    """Palauttaa (tavut tai None, HTTP-tila, lopullinen URL)."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept-Language": "en-US,en;q=0.8",
        # Ohittaa EU-evastesuostumussivun, jos runner sattuu sille.
        "Cookie": "CONSENT=YES+cb; SOCS=CAI"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.status, r.geturl()
    except urllib.error.HTTPError as e:
        return None, e.code, url
    except Exception as e:
        print(f"  haku epaonnistui {url}: {e}", file=sys.stderr)
        return None, None, url


def oembed(vid):
    data, st, _ = get("https://www.youtube.com/oembed?format=json&url="
                      + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}"))
    if data is None:
        return {"error": st}
    try:
        j = json.loads(data)
        return {"title": j.get("title"), "author": j.get("author_name"),
                "author_url": j.get("author_url")}
    except Exception:
        return {"error": "json"}


def channel_id_of(url):
    """Kanavan UC-tunniste kahvasivulta (@nimi) tai videosivulta."""
    html, _, _ = get(url)
    if html is None:
        return None
    s = html.decode("utf-8", "replace")
    for pat in (r'"externalId":"(UC[\w-]{22})"', r'<meta itemprop="identifier" content="(UC[\w-]{22})"',
                r'"channelId":"(UC[\w-]{22})"', r'youtube\.com/channel/(UC[\w-]{22})'):
        m = re.search(pat, s)
        if m:
            return m.group(1)
    return None


def watch_info(vid):
    """Katselusivun tila: {'isLiveNow': True/False/None, 'markers': [...]}.
    isLiveNow on None, jos sivulla ei ole liveBroadcastDetails-tietoa
    (todettu savutestissa myos tunnetusti live-striimeille - syy kirjataan
    'markers'-kenttaan diagnostiikkaa varten)."""
    html, st, _ = get(f"https://www.youtube.com/watch?v={vid}")
    if html is None:
        return {"isLiveNow": None, "markers": [f"HTTP {st}"]}
    s = html.decode("utf-8", "replace")
    markers = [m for m in ("liveBroadcastDetails", "isLiveContent\":true", "LOGIN_REQUIRED",
                           "confirm you", "consent.youtube", "UNPLAYABLE", "LIVE_STREAM_OFFLINE")
               if m in s]
    live = True if '"isLiveNow":true' in s else (False if '"isLiveNow":false' in s else None)
    return {"isLiveNow": live, "markers": markers, "bytes": len(s)}


def channel_video_ids(channel_id, tab="streams", limit=20):
    """Kanavan valilehden videoID:t sivujarjestyksessa (uusin/kaynnissa
    oleva ensin). YouTuben sivurakenne vaihtelee, joten poimitaan vain
    kaikki videoId-arvot."""
    html, _, _ = get(f"https://www.youtube.com/channel/{channel_id}/{tab}")
    if html is None:
        return []
    out = []
    for m in re.finditer(r'"videoId":"([\w-]{11})"', html.decode("utf-8", "replace")):
        if m.group(1) not in out:
            out.append(m.group(1))
            if len(out) >= limit:
                break
    return out


def live_redirect(channel_id):
    """Mihin /channel/<id>/live ohjaa: watch-ID canonical-linkista tai None."""
    html, st, final = get(f"https://www.youtube.com/channel/{channel_id}/live")
    if html is None:
        return {"status": st, "final": final, "videoId": None}
    s = html.decode("utf-8", "replace")
    m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/watch\?v=([\w-]{11})"', s)
    m2 = re.search(r'"videoDetails":\{"videoId":"([\w-]{11})"', s)
    return {"status": st, "final": final,
            "videoId": m.group(1) if m else (m2.group(1) if m2 else None)}


def thumb_status(vid, name="hqdefault_live"):
    data, st, _ = get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg")
    return st, data


def resolve_camera(channel_id, title_pattern, current_id=None, limit=20):
    """Etsii kanavan /streams-sivulta uusimman videon, jonka otsikko osuu
    kuvioon. Palauttaa {'videoId', 'title', 'reason', 'candidates'}.
    Varovainen: vaihtaa ID:n vain jos (a) nykyinen lahetys on paattynyt
    (_live-kuva 404 tai isLiveNow False) TAI (b) uusi ehdokas on varmasti
    kaynnissa (isLiveNow True) ja tulee sivulla ennen nykyista. Muuten
    pidetaan nykyinen - vaarin vaihdettu ID olisi pahempi kuin vanha."""
    rx = re.compile(title_pattern, re.I)
    cands = []
    for vid in channel_video_ids(channel_id, limit=limit):
        t = oembed(vid).get("title") or ""
        if rx.search(t):
            cands.append({"videoId": vid, "title": t})
    if not cands:
        return {"videoId": current_id, "reason": "ei osumia otsikolla", "candidates": []}
    first = cands[0]
    if first["videoId"] == current_id:
        return {"videoId": current_id, "title": first["title"], "reason": "nykyinen on uusin",
                "candidates": cands}
    cur_ended = False
    if current_id:
        st, _ = thumb_status(current_id)
        cur_ended = st == 404 or watch_info(current_id)["isLiveNow"] is False
    new_live = watch_info(first["videoId"])["isLiveNow"]
    if current_id is None or cur_ended or new_live is True:
        why = ("nykyinen paattynyt" if cur_ended else
               "uusi kaynnissa (isLiveNow)" if new_live else "ei aiempaa ID:ta")
        return {"videoId": first["videoId"], "title": first["title"], "reason": why,
                "candidates": cands}
    return {"videoId": current_id, "reason": "uudempi ehdokas ei varmasti kaynnissa, pidetaan nykyinen",
            "candidates": cands}
