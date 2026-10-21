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


def channel_titles(channel_id, limit=15):
    """[(videoId, otsikko)] kanavan /streams-sivulta sivujarjestyksessa."""
    return [(v, oembed(v).get("title") or "") for v in channel_video_ids(channel_id, limit=limit)]


def resolve_camera(streams, title_pattern, current_id=None):
    """Valitsee kanavan /streams-listasta (channel_titles) UUSIMMAN videon,
    jonka otsikko osuu kuvioon ja jonka _live-pikkukuva on olemassa.

    EI kayteta katselusivun isLiveNow-tietoa: GitHub Actionsista YouTube
    vastaa katselusivuihin HTTP 429 (todettu 2026-10-15), joten tieto puuttuu
    aina. /streams-sivu listaa kaynnissa olevan lahetyksen ensin ja
    paattyneet sen jalkeen uusin ensin - uusin osuma on siis nykyinen.
    Palauttaa {'videoId', 'title', 'reason', 'candidates'}; ilman osumaa
    pidetaan nykyinen ID."""
    rx = re.compile(title_pattern, re.I)
    cands = [{"videoId": v, "title": t} for v, t in streams if rx.search(t)]
    for c in cands:
        st, _ = thumb_status(c["videoId"])
        if st == 200:
            reason = "nykyinen on uusin" if c["videoId"] == current_id else "kanavalla uudempi lahetys"
            return {"videoId": c["videoId"], "title": c["title"], "reason": reason,
                    "candidates": cands}
    return {"videoId": current_id, "reason": "ei osumaa jolla _live-kuva", "candidates": cands}


def _walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from _walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from _walk(v)


LIVE_MARKERS = ("BADGE_STYLE_TYPE_LIVE_NOW", "THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE",
                '"style": "LIVE"', "watching", "katsoo", "UPCOMING", "Streamed", "ago")


def initial_data(html):
    s = html.decode("utf-8", "replace") if isinstance(html, bytes) else html
    m = re.search(r"(?:var ytInitialData|window\[\"ytInitialData\"\])\s*=\s*(\{.*?\});\s*</script>", s, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:
        return None


def streams_live_flags(channel_id, limit=15):
    """DIAGNOSTIIKKA (2026-10-21): kanavan /streams-sivun videot ja niiden
    live-merkit ytInitialDatasta: [(videoId, [merkit])]. Kalibroidaan
    oikealla datalla ennen kuin 'ei lahetysta' -paatos rakennetaan."""
    html, st, _ = get(f"https://www.youtube.com/channel/{channel_id}/streams")
    if html is None:
        return {"status": st, "videos": []}
    d = initial_data(html)
    if d is None:
        return {"status": st, "videos": [], "note": "ytInitialData puuttuu"}
    out, seen = [], set()
    for o in _walk(d):
        vid = o.get("videoId") if isinstance(o.get("videoId"), str) else None
        if not vid and o.get("contentType") == "LOCKUP_CONTENT_TYPE_VIDEO":
            vid = o.get("contentId")
        if not vid or vid in seen or len(vid) != 11 or not ("thumbnail" in o or "contentImage" in o or "title" in o):
            continue
        seen.add(vid)
        txt = json.dumps(o, ensure_ascii=False)
        marks = [mk for mk in LIVE_MARKERS if mk in txt]
        # Lyhyt ote aikatekstista/katsojamaarasta diagnostiikkaan.
        snip = re.findall(r'"(?:text|simpleText|content)": "([^"]{0,40}(?:watching|katsoo|Streamed|ago|LIVE|Scheduled)[^"]{0,20})"', txt)
        out.append((vid, marks, snip[:3]))
        if len(out) >= limit:
            break
    return {"status": st, "videos": out}


def live_page_markers(channel_id):
    """DIAGNOSTIIKKA: /channel/<id>/live -sivun merkit."""
    html, st, final = get(f"https://www.youtube.com/channel/{channel_id}/live")
    if html is None:
        return {"status": st}
    s = html.decode("utf-8", "replace")
    marks = [mk for mk in ('"isLiveNow":true', '"isLiveNow":false', '"isLive":true', "LIVE_STREAM_OFFLINE",
                           "liveBroadcastDetails", "videoDetails", "canonical", "consent", "LOGIN_REQUIRED",
                           "This live stream", "offline") if mk in s]
    m = re.search(r'"videoDetails":\{"videoId":"([\w-]{11})"', s)
    c = re.search(r'<link rel="canonical" href="([^"]+)"', s)
    return {"status": st, "final": final, "bytes": len(s), "markers": marks,
            "videoId": m.group(1) if m else None, "canonical": c.group(1) if c else None}
