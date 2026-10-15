#!/usr/bin/env python3
"""
Kehittajan TUTKIMUSTYOKALU (ei tuotantoputken osa): testaa UUSIEN
kamerakandidaattien YouTube-pikkukuvat ennen kuin niita lisataan
data/cameras.json:iin. Ajetaan GitHub Actionsilla (.github/workflows/
camera-probe.yml), koska Claude-kehitysymparistosta ei ole yhteytta
YouTubeen.

Vaiheet:
1. Selvittaa kanavien NYKYISEN livelahetyksen video-ID:n
   (https://www.youtube.com/channel/<UC..>/live -> canonical-linkki) ja
   hakee kanavan /streams-sivun videot (Samimaka: "Oulu Cam" -otsikot).
2. Hakee jokaisen ID:n oEmbed-otsikon/kanavan.
3. Seuraa hqdefault_live.jpg:ta N kierrosta valein ja vertaa jokaista
   kierrosta edelliseen HERKASTI (yokuvat ovat tummia ja muuttuvat vahan):
   - SHA-256 (mika tahansa tavuero),
   - pikselivertailu harmaasavyna (Pillow): keskimaarainen itseisero ja
     niiden pikseleiden osuus, jotka muuttuivat >= PIX_DELTA tasoa.
     hqdefault-kuvan mustat letterbox-palkit (ylä/ala 45 px) rajataan pois.
   "Muuttui" = tiiviste eri JA muuttuneita pikseleita >= CHANGED_FRAC
   (pelkka uudelleenpakkaus samasta kuvasta ei riita).
   Lisaksi kirjataan, onko live == ei-live (hqdefault.jpg) tavu tavulta.

Kuvien tavuja EI tallenneta repoon; workflow lataa ne vain artifactiksi
(1 pv sailytys) silmamaaraista tarkistusta varten.

Kaytto: python3 scripts/probe-camera-candidates.py --rounds 9 --interval-min 15 --out probe-out
"""

import argparse, hashlib, io, json, os, re, sys, time
import urllib.request, urllib.error, urllib.parse

from PIL import Image, ImageChops

# Tunnetut video-ID:t (tehtavananto 2026-10). Viitteet: Levi/Sodankyla
# (rKfecmmzzw0 / dnlQtDad6Dk) mukana vertailuna.
VIDEOS = {
    "starlapland-kilpisjarvi-north": "ccTVAhJU5lg",
    "starlapland-levi-north": "rKfecmmzzw0",
    "starlapland-kalajoki-pakka": "vsJBqHwnK9w",
    "rovaniemi-apukka": "bOEvPL206Hc",
    "inari": "P5Txi7u6tBs",
    "ref-sodankyla": "dnlQtDad6Dk",
}
# Kanavat, joiden nykyinen live-ID selvitetaan.
CHANNELS = {
    "utsjoki-aurora-holidays": "UC7sG1cQ5TFIJarNQa2SSfGw",
    "utsjoki-aurora-service-tours": "UCrEfDv09Q2suoiSDt1hZIlg",
    "kilpisjarvi-kilpissafarit": "UCkth9Lyr4AU8t10b0KdbtmA",
}
# Samimaka: kanava selvitetaan aiemmin loydetyn videon oEmbedista.
SAMIMAKA_SEED = "TfUjL4GRzcU"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
PIX_DELTA = 3          # harmaasavytasoa (0-255) - herkka, yokuvat ovat tummia
CHANGED_FRAC = 0.0005  # 0,05 % pikseleista (~65 px rajatusta 480x270-kuvasta)


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept-Language": "en-US,en;q=0.8",
        # Ohittaa EU-evastesuostumussivun, jos runner sattuu sille.
        "Cookie": "CONSENT=YES+cb; SOCS=CAI"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read(), r.status
    except urllib.error.HTTPError as e:
        return None, e.code
    except Exception as e:
        print(f"  haku epaonnistui {url}: {e}", file=sys.stderr)
        return None, None


def oembed(vid):
    data, st = get("https://www.youtube.com/oembed?format=json&url="
                   + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}"))
    if data is None:
        return {"error": st}
    try:
        j = json.loads(data)
        return {"title": j.get("title"), "author": j.get("author_name"),
                "author_url": j.get("author_url")}
    except Exception:
        return {"error": "json"}


def channel_live_id(base):
    """base = https://www.youtube.com/channel/UC.. tai /@kahva."""
    html, st = get(base.rstrip("/") + "/live")
    if html is None:
        return None, f"HTTP {st}"
    s = html.decode("utf-8", "replace")
    m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/watch\?v=([\w-]{11})"', s)
    if m:
        live_now = '"isLiveNow":true' in s or '"isLive":true' in s
        return m.group(1), "live" if live_now else "canonical (ei isLiveNow-merkintaa)"
    return None, "ei livelahetysta (canonical = kanava)"


def channel_streams(base, limit=15):
    """Kanavan /streams-sivun videot: [(id, otsikko, live_nyt)]."""
    html, st = get(base.rstrip("/") + "/streams")
    if html is None:
        return []
    s = html.decode("utf-8", "replace")
    out, seen = [], set()
    for m in re.finditer(r'"videoRenderer":\{"videoId":"([\w-]{11})"', s):
        vid = m.group(1)
        if vid in seen:
            continue
        seen.add(vid)
        chunk = s[m.end():m.end() + 6000]
        t = re.search(r'"title":\{"runs":\[\{"text":"(.*?)"\}', chunk)
        live = "BADGE_STYLE_TYPE_LIVE_NOW" in chunk or '"style":"LIVE"' in chunk
        out.append((vid, json.loads('"' + t.group(1) + '"') if t else "?", live))
        if len(out) >= limit:
            break
    return out


def thumb(vid, name):
    return get(f"https://i.ytimg.com/vi/{vid}/{name}.jpg")


def gray_crop(b):
    im = Image.open(io.BytesIO(b)).convert("L")
    w, h = im.size
    if (w, h) == (480, 360):  # 16:9-sisalto 4:3-kuvassa -> mustat palkit pois
        im = im.crop((0, 45, 480, 315))
    return im


def compare(a, b):
    ia, ib = gray_crop(a), gray_crop(b)
    if ia.size != ib.size:
        return {"sizeDiffers": True, "meanAbs": None, "fracChanged": 1.0}
    d = ImageChops.difference(ia, ib)
    hist = d.histogram()
    n = ia.size[0] * ia.size[1]
    mean_abs = sum(i * c for i, c in enumerate(hist)) / n
    frac = sum(hist[PIX_DELTA:]) / n
    return {"meanAbs": round(mean_abs, 3), "fracChanged": round(frac, 5)}


def brightness(b):
    im = gray_crop(b)
    h = im.histogram()
    return round(sum(i * c for i, c in enumerate(h)) / (im.size[0] * im.size[1]), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=9)
    ap.add_argument("--interval-min", type=float, default=15.0)
    ap.add_argument("--out", default="probe-out")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    report = {"started": int(time.time() * 1000), "resolve": {}, "cameras": {}}

    # 1. Kanavien live-ID:t
    cams = dict(VIDEOS)
    for key, ch in CHANNELS.items():
        base = f"https://www.youtube.com/channel/{ch}"
        vid, why = channel_live_id(base)
        streams = channel_streams(base)
        report["resolve"][key] = {"channel": ch, "liveId": vid, "note": why,
                                  "streams": streams}
        print(f"[kanava] {key} {ch}: live={vid} ({why})")
        for s in streams:
            print(f"    /streams: {s[0]} live={s[2]} {s[1]}")
        if vid:
            cams[key] = vid

    # Samimaka: kanava seed-videon oEmbedista, sitten "Oulu Cam" -striimit
    seed = oembed(SAMIMAKA_SEED)
    print(f"[samimaka] seed {SAMIMAKA_SEED}: {seed}")
    sam = {"seed": seed, "streams": []}
    if seed.get("author_url"):
        base = seed["author_url"]
        sam["liveId"], sam["note"] = channel_live_id(base)
        sam["streams"] = channel_streams(base, limit=30)
        for s in sam["streams"]:
            print(f"    /streams: {s[0]} live={s[2]} {s[1]}")
        n = 0
        for vid, title, live in sam["streams"]:
            if re.search(r"oulu\s*cam", title, re.I):
                n += 1
                cams[f"oulu-samimaka-{n}"] = vid
        if n == 0 and sam["liveId"]:
            cams["oulu-samimaka-live"] = sam["liveId"]
    report["resolve"]["samimaka"] = sam

    # 2. oEmbed + live==ei-live
    for key, vid in cams.items():
        report["cameras"][key] = {"videoId": vid, "oembed": oembed(vid), "rounds": []}
        print(f"[oembed] {key} {vid}: {report['cameras'][key]['oembed']}")

    # 3. Seuranta
    prev = {}
    for r in range(1, args.rounds + 1):
        t0 = time.time()
        stamp = time.strftime("%H:%MZ", time.gmtime(t0))
        for key, vid in cams.items():
            live, st = thumb(vid, "hqdefault_live")
            nonlive, _ = thumb(vid, "hqdefault")
            row = {"round": r, "t": int(t0 * 1000), "status": st}
            if live is not None and st == 200:
                row["sha"] = hashlib.sha256(live).hexdigest()[:16]
                row["size"] = len(live)
                row["liveEqNonLive"] = nonlive is not None and live == nonlive
                row["brightness"] = brightness(live)
                with open(os.path.join(args.out, f"{key}-r{r:02d}.jpg"), "wb") as f:
                    f.write(live)
                if key in prev:
                    c = compare(prev[key], live)
                    row.update(c)
                    row["changed"] = (row["sha"] != hashlib.sha256(prev[key]).hexdigest()[:16]
                                      and c["fracChanged"] >= CHANGED_FRAC)
                prev[key] = live
            report["cameras"][key]["rounds"].append(row)
            print(f"[{stamp} k{r}] {key:32s} st={st} koko={row.get('size')} "
                  f"kirk={row.get('brightness')} live==ei-live={row.get('liveEqNonLive')} "
                  f"ero={row.get('meanAbs')}/{row.get('fracChanged')} muuttui={row.get('changed')}",
                  flush=True)
        with open(os.path.join(args.out, "report.json"), "w") as f:
            json.dump(report, f, indent=1, ensure_ascii=False)
        if r < args.rounds:
            time.sleep(max(0, args.interval_min * 60 - (time.time() - t0)))

    # Yhteenveto
    print("\nYHTEENVETO (muutoksia / vertailuja; vertailuja = kierrokset - 1)")
    print("| kamera | ID | otsikko | muutoksia/vertailuja | live==ei-live kierroksia | kirkkaus |")
    for key, c in report["cameras"].items():
        rs = c["rounds"]
        comps = [x for x in rs if "changed" in x]
        ch = sum(1 for x in comps if x["changed"])
        eq = sum(1 for x in rs if x.get("liveEqNonLive"))
        br = [x.get("brightness") for x in rs if x.get("brightness") is not None]
        c["summary"] = {"changes": ch, "comparisons": len(comps), "liveEqNonLive": eq,
                        "fetched": sum(1 for x in rs if x.get("status") == 200)}
        print(f"| {key} | {c['videoId']} | {c['oembed'].get('title')} | {ch}/{len(comps)} | "
              f"{eq}/{len(rs)} | {br[:1]}..{br[-1:]} |")
    with open(os.path.join(args.out, "report.json"), "w") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
