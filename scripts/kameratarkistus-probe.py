#!/usr/bin/env python3
"""VÄLIAIKAINEN kameratarkistus (poistetaan ennen yhdistämistä).
Osa 1: kaikki data/cameras.json-kamerat, ROUNDS kierrosta -> tiivisteet, upotuksen tila, kanavan live-ID:t.
Osa 2: YouTube-haut, liveauroracams.com, SpaceWeatherLive + ehdokkaat (EXTRA_YT, EXTRA_IMG).
Tulos out/report.json + pienet kuvat out/img/."""
import hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request, urllib.error
sys.path.insert(0, "scripts")
import youtube_live as yl
from PIL import Image

OUT = "out"; os.makedirs(f"{OUT}/img", exist_ok=True); os.makedirs(f"{OUT}/pages", exist_ok=True)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
ROUNDS = int(os.environ.get("ROUNDS", "6")); INTERVAL = float(os.environ.get("INTERVAL_MIN", "10"))
rep = {"start": time.strftime("%FT%TZ", time.gmtime()), "cams": {}, "cands": {}, "search": {}, "pages": {}}

def get(url, timeout=30, data=None, headers=None):
    h = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.8", "Cookie": "CONSENT=YES+cb; SOCS=CAI"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.status, dict(r.headers), r.geturl()
    except urllib.error.HTTPError as e:
        return None, e.code, dict(e.headers or {}), url
    except Exception as e:
        return None, f"ERR {type(e).__name__}: {e}"[:120], {}, url

def save_thumb(key, data, tag):
    try:
        im = Image.open(io.BytesIO(data)); sz = im.size
        im.thumbnail((640, 640)); im.convert("RGB").save(f"{OUT}/img/{key}.{tag}.jpg", quality=80)
        return sz
    except Exception as e:
        return f"img? {e}"[:60]

def oembed_status(vid):
    d, st, _, _ = get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}"))
    j = {}
    if d:
        try: j = json.loads(d)
        except Exception: pass
    return {"status": st, "title": j.get("title"), "author": j.get("author_name"), "author_url": j.get("author_url")}

def embed_check(vid):
    """Upotussivu + innertube-pelaaja (WEB_EMBEDDED_PLAYER) -> playabilityStatus."""
    r = {}
    d, st, _, _ = get(f"https://www.youtube.com/embed/{vid}")
    r["embedPage"] = st
    if d:
        s = d.decode("utf-8", "replace")
        r["embedMarkers"] = [m for m in ('"playableInEmbed":true', '"playableInEmbed":false', "UNPLAYABLE", "LOGIN_REQUIRED",
                                         "errorScreen", "LIVE_STREAM_OFFLINE", '"isLive":true', "Video unavailable") if m in s]
    body = json.dumps({"videoId": vid, "context": {"client": {"clientName": "WEB_EMBEDDED_PLAYER", "clientVersion": "1.20241201.00.00",
                       "hl": "en"}, "thirdParty": {"embedUrl": "https://pekkasuni-dot.github.io/"}}}).encode()
    d, st, _, _ = get("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", data=body,
                      headers={"Content-Type": "application/json", "Origin": "https://www.youtube.com"})
    r["player"] = st
    if d:
        try:
            j = json.loads(d); ps = j.get("playabilityStatus", {})
            r["playStatus"] = ps.get("status"); r["playReason"] = (ps.get("reason") or "")[:100]
            r["playableInEmbed"] = ps.get("playableInEmbed")
            vd = j.get("videoDetails", {})
            r["isLive"] = vd.get("isLive"); r["isLiveContent"] = vd.get("isLiveContent"); r["channel"] = vd.get("author")
        except Exception as e:
            r["playerErr"] = str(e)[:60]
    return r

def yt_thumb(vid):
    d, st, h, _ = get(f"https://i.ytimg.com/vi/{vid}/hqdefault_live.jpg")
    return d, st

def still(url):
    d, st, h, fin = get(url, timeout=40)
    return d, st, h.get("Last-Modified") or h.get("last-modified"), fin

cams = [] if os.environ.get("SKIP_CAMS") == "1" else json.load(open("data/cameras.json"))["cameras"]
EXTRA_YT = [x for x in os.environ.get("EXTRA_YT", "").split() if x]
EXTRA_IMG = [x for x in os.environ.get("EXTRA_IMG", "").split() if x]
DO_SEARCH = os.environ.get("DO_SEARCH", "1") == "1"

# --- Kerran: YouTube-kameroiden upotus + kanavat
chan = {}
for c in cams:
    if c.get("type") != "youtube": continue
    yt = c["youtube"]; vid = yt["videoId"]
    e = {"configVid": vid, "oembed": oembed_status(vid), "embed": embed_check(vid)}
    ch = yt.get("channelId")
    if ch:
        if ch not in chan:
            chan[ch] = {"streams": yl.channel_streams(ch), "liveRedirect": yl.live_redirect(ch)}
        st = chan[ch]["streams"] or []
        pat = re.compile(yt.get("titleMatch") or ".", re.I)
        e["channelMatches"] = [s for s in st if pat.search(s.get("title") or "")][:4]
        e["liveRedirect"] = chan[ch]["liveRedirect"]
    cur = next((m["videoId"] for m in e.get("channelMatches", []) if m.get("live")), None) or \
          next((m["videoId"] for m in e.get("channelMatches", [])), None) or vid
    e["currentVid"] = cur
    if cur != vid:
        e["oembedCurrent"] = oembed_status(cur); e["embedCurrent"] = embed_check(cur)
    rep["cams"][c["id"]] = e
    print("YT", c["id"], json.dumps(e, ensure_ascii=False)[:600], flush=True)
rep["channels"] = chan

# --- Osa 2: haut ja sivut
search_vids = {}
if DO_SEARCH:
    QUERIES = ["revontulet live", "revontulikamera", "aurora live cam finland", "norrsken live", "norrsken webbkamera",
               "nordlys live", "nordlys webkamera", "aurora live cam norway", "aurora live cam iceland", "norðurljós beint",
               "northern lights live", "aurora borealis live cam", "northern lights live camera lapland",
               "aurora live cam sweden", "aurora live cam svalbard", "aurora live cam alaska", "aurora live cam canada",
               "all sky camera live aurora", "northern lights live tromsø", "lapland live cam"]
    for q in QUERIES:
        d, st, _, _ = get("https://www.youtube.com/results?search_query=" + urllib.parse.quote(q) + "&sp=EgJAAQ%253D%253D")
        res = []
        if d:
            s = d.decode("utf-8", "replace")
            m = re.search(r"var ytInitialData = (\{.*?\});</script>", s, re.S)
            if m:
                try:
                    for o in yl._walk(json.loads(m.group(1))):
                        if isinstance(o, dict) and "videoRenderer" in o:
                            v = o["videoRenderer"]
                            t = "".join(r.get("text", "") for r in v.get("title", {}).get("runs", []))
                            own = "".join(r.get("text", "") for r in v.get("ownerText", {}).get("runs", []))
                            chid = None
                            for r in v.get("ownerText", {}).get("runs", []):
                                chid = r.get("navigationEndpoint", {}).get("browseEndpoint", {}).get("browseId") or chid
                            live = "BADGE_STYLE_TYPE_LIVE_NOW" in json.dumps(v)
                            res.append({"videoId": v.get("videoId"), "title": t, "owner": own, "channelId": chid, "live": live})
                except Exception as ex:
                    res.append({"err": str(ex)[:80]})
        rep["search"][q] = {"status": st, "results": res}
        for r in res:
            if r.get("videoId"): search_vids.setdefault(r["videoId"], r)
        print("SEARCH", q, st, len(res), flush=True)
        time.sleep(2)

PAGES = ([] if os.environ.get("SKIP_BASE_PAGES") == "1" else ["https://www.liveauroracams.com/", "https://liveauroracams.com/sitemap.xml",
         "https://www.spaceweatherlive.com/en/auroral-activity/aurora-webcams.html",
         "https://www.spaceweatherlive.com/en/auroral-activity/webcams.html",
         "https://www.spaceweatherlive.com/en/auroral-activity.html"]) + [x for x in os.environ.get("EXTRA_PAGES", "").split() if x]
for i, u in enumerate(PAGES):
    d, st, _, fin = get(u)
    info = {"status": st, "final": fin}
    if d:
        s = d.decode("utf-8", "replace"); open(f"{OUT}/pages/p{i}.html", "w").write(s)
        info["yt"] = sorted(set(re.findall(r"(?:youtube(?:-nocookie)?\.com/(?:embed|watch\?v=|live)/?|youtu\.be/)([\w-]{11})", s)))
        info["links"] = sorted(set(re.findall(r'(?:href|src|data-src)="([^"]+)"', s)))[:400]
        t = re.sub(r"(?is)<(script|style).*?</\1>", " ", s); t = re.sub(r"(?s)<[^>]+>", " ", t)
        info["text"] = re.sub(r"\s+", " ", t)[:5000]
        info["iframes"] = sorted(set(re.findall(r'<iframe[^>]+src="([^"]+)"', s)))
        info["imgs"] = sorted(set(re.findall(r'(https?://[^"\'\s>]+\.(?:jpe?g|png)(?:\?[^"\'\s>]*)?)', s)))[:200]
    rep["pages"][u] = info
    print("PAGE", u, st, len(info.get("yt", [])), flush=True)

page_vids = {v for p in rep["pages"].values() for v in p.get("yt", [])}
cand_vids = sorted((set(search_vids) | page_vids | set(EXTRA_YT)) - {c["youtube"]["videoId"] for c in cams if c.get("type") == "youtube"})
print("Ehdokasvideoita", len(cand_vids), flush=True)
for v in cand_vids:
    rep["cands"][v] = {"src": "search" if v in search_vids else ("page" if v in page_vids else "extra"),
                       "search": search_vids.get(v), "oembed": oembed_status(v), "embed": embed_check(v), "hashes": []}

# --- Kierrokset
for rnd in range(1, ROUNDS + 1):
    t = time.strftime("%FT%TZ", time.gmtime()); print("=== ROUND", rnd, t, flush=True)
    for c in cams:
        e = rep["cams"].setdefault(c["id"], {}); e.setdefault("rounds", [])
        if c.get("type") == "still":
            d, st, lm, fin = still(c["image"]["url"])
        else:
            vid = e.get("currentVid") or c["youtube"]["videoId"]
            d, st = yt_thumb(vid); lm = vid; fin = None
        sha = hashlib.sha256(d).hexdigest()[:12] if d else None
        e["rounds"].append({"t": t, "st": st, "sha": sha, "size": len(d) if d else None, "lm": lm})
        if d and rnd in (1, ROUNDS): e[f"dim{rnd}"] = save_thumb(c["id"], d, f"r{rnd}")
        print(c["id"], st, sha, len(d) if d else None, lm, flush=True)
    for v in cand_vids:
        if rnd not in (1, ROUNDS): continue
        d, st = yt_thumb(v); sha = hashlib.sha256(d).hexdigest()[:12] if d else None
        rep["cands"][v]["hashes"].append({"t": t, "st": st, "sha": sha})
        if d: save_thumb("yt_" + v, d, f"r{rnd}")
    for u in EXTRA_IMG:
        e = rep["cands"].setdefault(u, {"src": "extra-img", "hashes": []})
        d, st, lm, fin = still(u); sha = hashlib.sha256(d).hexdigest()[:12] if d else None
        e["hashes"].append({"t": t, "st": st, "sha": sha, "size": len(d) if d else None, "lm": lm})
        if d and rnd in (1, ROUNDS): e[f"dim{rnd}"] = save_thumb("img_" + re.sub(r"[^\w]+", "_", u)[-80:], d, f"r{rnd}")
    json.dump(rep, open(f"{OUT}/report.json", "w"), ensure_ascii=False, indent=1)
    if rnd < ROUNDS: time.sleep(INTERVAL * 60)
rep["end"] = time.strftime("%FT%TZ", time.gmtime())
json.dump(rep, open(f"{OUT}/report.json", "w"), ensure_ascii=False, indent=1)
print("VALMIS")
