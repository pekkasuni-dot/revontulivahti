#!/usr/bin/env python3
"""
Testi: päivittyykö YouTube Data API:n palauttama pikkukuva? (MUISTIO-webkamerat.md osa 12)

Hakee jokaisen kameran pikkukuvan ROUNDS kertaa INTERVAL_MIN minuutin välein
ja vertaa kuvia. Kuvat haetaan VAIN API:n (videos.list) palauttamista
osoitteista - ei rakennettuja URL:eja, ei sivujen lukemista.

Ympäristömuuttujat:
  YOUTUBE_API_KEY  (pakollinen, GitHubin secret - EI tulosteta koskaan)
  ROUNDS           kierrokset (oletus 3)
  INTERVAL_MIN     väli minuutteina (oletus 15)
  START_UTC        "HH:MM" - odota tähän UTC-aikaan, jos se on vielä edessä (valinnainen)
  OUT              tuloskansio (oletus thumbtest)

Muutoksen kriteeri (sama kuin aiemmissa yöajoissa, ks. muistion osa 9):
  kuva on ENNEN NÄKEMÄTÖN (SHA-256) JA harmaasävyvertailussa >= 0,05 %
  pikseleistä muuttui >= 3 tasoa. Päivittyy = muuttui jokaisella vertailulla.
"""
import hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta

API = "https://www.googleapis.com/youtube/v3/"
KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
ROUNDS = int(os.environ.get("ROUNDS") or 3)
INTERVAL = float(os.environ.get("INTERVAL_MIN") or 15)
OUT = os.environ.get("OUT") or "thumbtest"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
units = 0

try:
    from PIL import Image, ImageChops
except ImportError:
    Image = None


def yt(method, cost, **params):
    global units
    params["key"] = KEY
    url = API + method + "?" + urllib.parse.urlencode(params)
    units += cost
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # Virheilmoitukseen EI saa päätyä URL:ia (sisältää avaimen).
        body = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"{method}: HTTP {e.code} {body}")


def videos(ids):
    out = {}
    for i in range(0, len(ids), 50):
        j = yt("videos", 1, part="snippet,liveStreamingDetails", id=",".join(ids[i:i+50]), maxResults=50)
        for it in j.get("items", []):
            out[it["id"]] = it
    return out


def best_thumb(th):
    for k in ("maxres", "standard", "high", "medium", "default"):
        if th.get(k, {}).get("url"):
            return k, th[k]["url"]
    return None, None


def resolve(cams):
    """Nykyinen live-video jokaiselle kameralle: ensin cameras.json-ID, sitten kanavan uploads-lista."""
    cur = videos([c["youtube"]["videoId"] for c in cams])
    res = {}
    missing = []
    for c in cams:
        it = cur.get(c["youtube"]["videoId"])
        if it and it["snippet"].get("liveBroadcastContent") == "live":
            res[c["id"]] = it
        else:
            missing.append(c)
    for ch in sorted({c["youtube"]["channelId"] for c in missing}):
        pl = yt("playlistItems", 1, part="contentDetails", playlistId="UU" + ch[2:], maxResults=50)
        ids = [i["contentDetails"]["videoId"] for i in pl.get("items", [])]
        cand = [v for v in videos(ids).values() if v["snippet"].get("liveBroadcastContent") == "live"] if ids else []
        for c in [c for c in missing if c["youtube"]["channelId"] == ch]:
            rx = re.compile(c["youtube"].get("titleMatch") or ".", re.I)
            hit = next((v for v in cand if rx.search(v["snippet"].get("title", ""))), None)
            if hit:
                res[c["id"]] = hit
    return res


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "AuroraAwesome-thumbtest/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def pixel_diff(a, b):
    """Osuus pikseleistä, jotka muuttuivat >= 3 harmaasävytasoa (0..1). None jos Pillow puuttuu."""
    if Image is None:
        return None
    ia = Image.open(io.BytesIO(a)).convert("L")
    ib = Image.open(io.BytesIO(b)).convert("L").resize(ia.size)
    d = ImageChops.difference(ia, ib)
    hist = d.histogram()
    return sum(hist[3:]) / float(ia.size[0] * ia.size[1])


def wait_start():
    s = os.environ.get("START_UTC", "").strip()
    if not s:
        return
    h, m = map(int, s.split(":"))
    now = datetime.now(timezone.utc)
    start = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if start > now and (start - now) < timedelta(hours=5):
        print(f"Odotetaan {start:%H:%M} UTC asti ({(start-now).seconds//60} min)...", flush=True)
        time.sleep((start - now).total_seconds())


def main():
    if not KEY:
        msg = ("YOUTUBE_API_KEY puuttuu (GitHub: Settings -> Secrets and variables -> Actions). "
               "Testiä ei ajettu.")
        print(msg)
        summ = os.environ.get("GITHUB_STEP_SUMMARY")
        if summ:
            open(summ, "a").write(msg + "\n")
        return 0
    cfg = json.load(open(os.path.join(ROOT, "data", "cameras.json"), encoding="utf-8"))
    excl = set(cfg.get("excludeChannels") or [])
    cams = [c for c in cfg["cameras"] if c.get("type") == "youtube" and c["youtube"]["channelId"] not in excl]
    os.makedirs(OUT, exist_ok=True)
    wait_start()

    rows = {c["id"]: {"cam": c, "rounds": []} for c in cams}
    for r in range(ROUNDS):
        if r:
            time.sleep(INTERVAL * 60)
        t = datetime.now(timezone.utc)
        live = resolve(cams)
        print(f"Kierros {r+1}/{ROUNDS} {t:%H:%M} UTC: live {len(live)}/{len(cams)}", flush=True)
        for c in cams:
            it = live.get(c["id"])
            rec = {"t": t.strftime("%H:%M"), "live": bool(it)}
            if it:
                size, url = best_thumb(it["snippet"].get("thumbnails", {}))
                rec.update(videoId=it["id"], size=size, title=it["snippet"].get("title"),
                           channel=it["snippet"].get("channelTitle"))
                try:
                    b = fetch(url)
                    rec["sha"] = hashlib.sha256(b).hexdigest()
                    rec["bytes"] = len(b)
                    fn = f"{c['id']}-k{r+1}.jpg"
                    open(os.path.join(OUT, fn), "wb").write(b)
                    rec["file"] = fn
                    rec["_data"] = b
                except Exception as e:
                    rec["error"] = str(e)[:120]
            rows[c["id"]]["rounds"].append(rec)

    # Vertailu
    lines = ["| Kamera | Näyttötapa nyt | Live | Muutoksia | Päivittyy | Pikkukuva | Esimerkkikuvat |",
             "|---|---|---|---|---|---|---|"]
    result = {}
    for cid, row in rows.items():
        rs = row["rounds"]
        imgs = [x for x in rs if x.get("_data")]
        seen, changes, comps = set(), 0, 0
        for i, x in enumerate(imgs):
            if i:
                comps += 1
                pd = pixel_diff(imgs[i-1]["_data"], x["_data"])
                x["diff"] = pd
                if x["sha"] not in seen and (pd is None or pd >= 0.0005):
                    changes += 1
            seen.add(x["sha"])
        live_n = sum(1 for x in rs if x["live"])
        if comps == 0:
            verdict = "ei live" if live_n == 0 else "ei voitu verrata"
        else:
            verdict = "kyllä" if changes == comps else ("ei" if changes == 0 else "osittain")
        result[cid] = {"verdict": verdict, "changes": changes, "comparisons": comps, "live": live_n,
                       "rounds": [{k: v for k, v in x.items() if k != "_data"} for x in rs]}
        size = imgs[0].get("size") if imgs else "-"
        files = ", ".join(x["file"] for x in imgs) or "-"
        lines.append(f"| {row['cam']['name']} | {row['cam'].get('nayttotapa', '?')} | {live_n}/{len(rs)} | "
                     f"{changes}/{comps} | **{verdict}** | {size} | {files} |")
    lines += ["", f"API-kiintiötä käytetty: {units} yksikköä. Kierroksia {ROUNDS}, väli {INTERVAL:g} min.",
              "Muutos = ennen näkemätön kuva JA >= 0,05 % pikseleistä muuttui >= 3 tasoa."]
    report = "\n".join(lines)
    print(report)
    open(os.path.join(OUT, "raportti.md"), "w", encoding="utf-8").write(report + "\n")
    json.dump(result, open(os.path.join(OUT, "tulos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    summ = os.environ.get("GITHUB_STEP_SUMMARY")
    if summ:
        open(summ, "a", encoding="utf-8").write("## Pikkukuvatesti\n\n" + report + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
