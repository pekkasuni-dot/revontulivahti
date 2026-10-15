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

from PIL import Image, ImageChops

import youtube_live as yl

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
# Kilpissafarit: savutestissa kanavalla vain 2014-2016 tallenteita ->
# testataan silti uusin, jotta tulos on kirjattu.
# Kahvalla tunnetut kanavat: Apukka (bOEvPL206Hc palautti 404 eli
# lahetys on paattynyt -> nykyinen ID kanavalta) ja Starlapland (kaikki
# saman yllapitajan striimit vertailuun).
HANDLES = {
    "rovaniemi-apukka-live": "@apukkaresortrovaniemi",
    "starlapland-live": "@Starlapland",
}
# Samimaka: kanava selvitetaan aiemmin loydetyn videon oEmbedista.
SAMIMAKA_SEED = "TfUjL4GRzcU"

PIX_DELTA = 3          # harmaasavytasoa (0-255) - herkka, yokuvat ovat tummia
CHANGED_FRAC = 0.0005  # 0,05 % pikseleista (~65 px rajatusta 480x270-kuvasta)

# Posion uusi lahetys (kayttajan havainto 2026-10: kamera paalla, mutta
# cameras.json osoitti paattyneeseen iOmco6eIa-0:aan).
EXTRA_VIDEOS = {"posio-uusi": "HuCjMGI8fKg"}


def get(url, timeout=25):
    data, st, _ = yl.get(url, timeout)
    return data, st


oembed = yl.oembed


def channel_live_id(base):
    """base = https://www.youtube.com/channel/UC.. tai /@kahva."""
    html, st = get(base.rstrip("/") + "/live")
    if html is None:
        return None, f"HTTP {st}"
    s = html.decode("utf-8", "replace")
    m = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/watch\?v=([\w-]{11})"', s)
    if m:
        return m.group(1), "canonical"
    return None, "ei watch-canonicalia"


def is_live_now(vid):
    """Ks. youtube_live.watch_info: isLiveNow oli savutestissa None myos
    tunnetusti live-striimeille, joten tulosta EI kayteta yksinaan."""
    return yl.watch_info(vid)["isLiveNow"]


def pick_streams(streams, limit):
    """isLiveNow ei ole luotettava (savutesti 3: tunnetusti live Levi ja
    Sodankyla -> None), joten valitaan uusin video kustakin eri otsikosta
    (/streams listaa kaynnissa olevan ensin) ja annetaan pikkukuvatestin
    ratkaista. isLiveNow=False pudotetaan."""
    out, titles = [], set()
    for vid, title, live in streams:
        if live is False or title in titles:
            continue
        titles.add(title)
        out.append(vid)
        if len(out) >= limit:
            break
    return out


def channel_streams(base, limit=15):
    """Kanavan /streams-sivun videot: [(id, otsikko oEmbedista, isLiveNow)].
    YouTuben sivurakenne vaihtelee (videoRenderer / lockupViewModel), joten
    poimitaan vain kaikki videoId:t jarjestyksessa ja otsikot oEmbedilla.
    _live-pikkukuva palauttaa 404 paattyneelle lahetykselle (todettu
    Apukka bOEvPL206Hc), mutta 200 EI todista kaynnissa olevaa lahetysta."""
    html, st = get(base.rstrip("/") + "/streams")
    if html is None:
        return []
    s = html.decode("utf-8", "replace")
    out, seen = [], set()
    for m in re.finditer(r'"videoId":"([\w-]{11})"', s):
        vid = m.group(1)
        if vid in seen:
            continue
        seen.add(vid)
        out.append((vid, oembed(vid).get("title", "?"), is_live_now(vid)))
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


def diagnose_existing(report, cams):
    """cameras.json:in kamerat: kanavan ID, mihin /channel/<id>/live ohjaa,
    onko nykyinen lahetys kaynnissa ja onko kanavalla uudempi lahetys.
    Seurantaan otetaan nykyinen ID + uusimmat kanavan striimit."""
    with open("data/cameras.json", encoding="utf-8") as f:
        existing = [c for c in json.load(f)["cameras"] if c.get("type") == "youtube"]
    channels = {}
    for cam in existing:
        vid = cam["youtube"]["videoId"]
        oe = yl.oembed(vid)
        ch = cam["youtube"].get("channelId")
        if not ch and oe.get("author_url"):
            ch = channels.get(oe["author_url"]) or yl.channel_id_of(oe["author_url"])
            channels[oe["author_url"]] = ch
        st, _ = yl.thumb_status(vid)
        wi = yl.watch_info(vid)
        info = {"videoId": vid, "oembed": oe, "channelId": ch, "liveThumb": st, "watch": wi}
        print(f"[nykyinen] {cam['id']} {vid}: kanava={ch} _live={st} watch={wi} {oe}")
        if ch:
            info["liveRedirect"] = yl.live_redirect(ch)
            print(f"    /channel/{ch}/live -> {info['liveRedirect']}")
            info["streams"] = []
            for v in yl.channel_video_ids(ch, limit=12):
                t = yl.oembed(v).get("title")
                ts, _ = yl.thumb_status(v)
                w = yl.watch_info(v)
                info["streams"].append({"videoId": v, "title": t, "liveThumb": ts, "watch": w})
                print(f"    /streams: {v} _live={ts} isLiveNow={w['isLiveNow']} {w['markers']} {t}")
        report["existing"][cam["id"]] = info
        cams[f"nyk-{cam['id']}"] = vid
        # Kanavan uusimmat mahdollisesti kaynnissa olevat lahetykset mukaan
        # yotestiin (uudempi lahetys samalla tai muuttuneella otsikolla).
        n = 0
        for x in info.get("streams", []):
            if n >= 2 or x["videoId"] == vid:
                continue
            if x["liveThumb"] == 200 and x["watch"]["isLiveNow"] is not False \
                    and x["videoId"] not in cams.values():
                n += 1
                cams[f"uusi-{cam['id']}-{x['videoId']}"] = x["videoId"]
    return existing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=9)
    ap.add_argument("--interval-min", type=float, default=15.0)
    ap.add_argument("--out", default="probe-out")
    ap.add_argument("--only-existing", action="store_true",
                    help="vain cameras.json-kamerat + EXTRA_VIDEOS (ei uusia kanavia)")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    report = {"started": int(time.time() * 1000), "resolve": {}, "existing": {}, "cameras": {}}

    # 0. Nykyiset kamerat (vanhentuneet ID:t, kayttajan korjauspyynto 2026-10)
    cams = {}
    diagnose_existing(report, cams)
    cams.update(EXTRA_VIDEOS)
    if args.only_existing:
        CHANNELS.clear(); HANDLES.clear()
    else:
        for k, v in VIDEOS.items():
            if v not in cams.values():
                cams[k] = v

    # 1. Kanavien live-ID:t
    for key, ch in CHANNELS.items():
        base = f"https://www.youtube.com/channel/{ch}"
        vid, why = channel_live_id(base)
        streams = channel_streams(base)
        report["resolve"][key] = {"channel": ch, "liveId": vid, "note": why,
                                  "streams": streams}
        print(f"[kanava] {key} {ch}: live={vid} ({why})")
        for s in streams:
            print(f"    /streams: {s[0]} live={s[2]} {s[1]}")
        live_ids = pick_streams(streams, 3)
        if vid and vid not in live_ids:
            live_ids.insert(0, vid)
        for i, v in enumerate(live_ids):
            cams[key if i == 0 else f"{key}-{i + 1}"] = v

    for key, h in HANDLES.items():
        base = f"https://www.youtube.com/{h}"
        vid, why = channel_live_id(base)
        streams = channel_streams(base)
        report["resolve"][key] = {"channel": h, "liveId": vid, "note": why, "streams": streams}
        print(f"[kanava] {key} {h}: live={vid} ({why})")
        for st in streams:
            print(f"    /streams: {st[0]} live={st[2]} {st[1]}")
        # Kaynnissa olevat striimit, joita ei jo seurata (Apukka: nykyinen
        # ID; Starlapland: saman yllapitajan muut kamerat vertailuun).
        prefix = "apukka-" if "apukka" in key else "starlapland-"
        chosen = ([v for v, _, lv in streams if lv] if prefix == "starlapland-"
                  else pick_streams(streams, 1))
        for v in chosen:
            if v not in cams.values():
                cams[prefix + v] = v

    # Samimaka: kanava seed-videon oEmbedista, sitten "Oulu Cam" -striimit
    seed = oembed(SAMIMAKA_SEED) if not args.only_existing else {}
    print(f"[samimaka] seed {SAMIMAKA_SEED}: {seed}")
    sam = {"seed": seed, "streams": []}
    if seed.get("author_url"):
        base = seed["author_url"]
        sam["liveId"], sam["note"] = channel_live_id(base)
        sam["streams"] = channel_streams(base, limit=20)
        for s in sam["streams"]:
            print(f"    /streams: {s[0]} live={s[2]} {s[1]}")
        # "Oulu Cam 1 & 2": kanavalla ei ole nain nimettyja videoita
        # (savutesti 2) - Oulun kamerat ovat "Seaside Nallikari ... North"
        # ja "... Ouluzipline.fi Nallikari West" seka "livestream Finland
        # Oulu". Seurataan kaikki juuri nyt kaynnissa olevat.
        for vid in pick_streams(sam["streams"], 5):
            if vid not in cams.values():
                cams["oulu-samimaka-" + vid] = vid
    report["resolve"]["samimaka"] = sam

    # 2. oEmbed + live==ei-live
    for key, vid in cams.items():
        report["cameras"][key] = {"videoId": vid, "oembed": oembed(vid),
                                  "isLiveNow": is_live_now(vid), "rounds": []}
        print(f"[oembed] {key} {vid} isLiveNow={report['cameras'][key]['isLiveNow']}: "
              f"{report['cameras'][key]['oembed']}")

    # 3. Seuranta
    prev = {}
    seen = {}  # kamera -> joukko jo nahtyja tiivisteita
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
                # "Muuttui" = UUSI, ennen nakematon kuva joka eroaa edellisesta
                # herkassakin pikselivertailussa. Pelkka ero edelliseen EI
                # riita: CDN voi tarjota vuorotellen kahta vanhaa versiota
                # (todettu savutestissa: Levi 7715 <-> 7779 tavua).
                s_seen = seen.setdefault(key, set())
                if key in prev:
                    c = compare(prev[key], live)
                    row.update(c)
                    row["newImage"] = row["sha"] not in s_seen
                    row["changed"] = row["newImage"] and c["fracChanged"] >= CHANGED_FRAC
                s_seen.add(row["sha"])
                prev[key] = live
            report["cameras"][key]["rounds"].append(row)
            print(f"[{stamp} k{r}] {key:32s} st={st} koko={row.get('size')} "
                  f"kirk={row.get('brightness')} live==ei-live={row.get('liveEqNonLive')} "
                  f"ero={row.get('meanAbs')}/{row.get('fracChanged')} uusi={row.get('newImage')} muuttui={row.get('changed')}",
                  flush=True)
        with open(os.path.join(args.out, "report.json"), "w") as f:
            json.dump(report, f, indent=1, ensure_ascii=False)
        if r < args.rounds:
            time.sleep(max(0, args.interval_min * 60 - (time.time() - t0)))

    # Yhteenveto
    print("\nYHTEENVETO (muutoksia / vertailuja; vertailuja = kierrokset - 1)")
    print("| kamera | ID | isLiveNow | otsikko | muutoksia/vertailuja | eri kuvia | live==ei-live kierroksia | kirkkaus |")
    for key, c in report["cameras"].items():
        rs = c["rounds"]
        comps = [x for x in rs if "changed" in x]
        ch = sum(1 for x in comps if x["changed"])
        eq = sum(1 for x in rs if x.get("liveEqNonLive"))
        br = [x.get("brightness") for x in rs if x.get("brightness") is not None]
        c["summary"] = {"changes": ch, "comparisons": len(comps), "liveEqNonLive": eq,
                        "distinctImages": len(seen.get(key, ())),
                        "fetched": sum(1 for x in rs if x.get("status") == 200)}
        print(f"| {key} | {c['videoId']} | {c['isLiveNow']} | {c['oembed'].get('title')} | {ch}/{len(comps)} | "
              f"{len(seen.get(key, ()))} | {eq}/{len(rs)} | {br[:1]}..{br[-1:]} |")
    with open(os.path.join(args.out, "report.json"), "w") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
