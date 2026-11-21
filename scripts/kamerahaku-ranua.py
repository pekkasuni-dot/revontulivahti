#!/usr/bin/env python3
"""VÄLIAIKAINEN tutkimus (poistetaan ennen yhdistämistä): livekamerat Ranua / Kemi /
Pudasjärvi -alueelta. Tulos out/tulos.json + out/YHTEENVETO.md (ei raakaa HTML:ää)."""
import json, os, re, sys, html as H, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
import youtube_live as yl

QUERIES = ["Ranua live", "Ranua webcam", "Ranua revontulet live", "Ranua northern lights live",
  "Ranua Zoo live", "Ranuan eläinpuisto live", "Ranua Resort live", "Kemi live", "Kemi webcam",
  "Kemi northern lights live", "Kemi revontulet", "Tornio live", "Tornio webcam", "Tornio kaupungintalo live",
  "Haparanda live cam", "Keminmaa live", "Simo live", "Pudasjärvi live", "Pudasjärvi webcam",
  "Syöte live", "Iso-Syöte webcam", "Syöte revontulet", "Posio live", "Taivalkoski live",
  "Tervola live", "Rovaniemi northern lights live", "Rovaniemi aurora live cam",
  "Lapland northern lights live 24/7", "revontulet live kamera", "aurora live cam Finland",
  "Oulu northern lights live", "Ii live kamera", "Kuusamo northern lights live", "Ruka live webcam"]
PAGES = ["https://www.starlapland.fi/live/", "https://www.starlapland.fi/",
  "https://www.tornio.fi/?p=79469", "https://www.isosyote.fi/", "https://www.syote.fi/",
  "https://ranuaresort.com/", "https://ranuazoo.com/", "https://www.ranua.fi/",
  "https://www.skylinewebcams.com/en/webcam/finland/lapland/tornio/tornio.html",
  "https://webcams.org.ru/ranua.htm", "https://www.see.cam/fi/16/pudasjarvi",
  "https://auroraalert.fi/", "https://www.visitkemi.fi/", "https://www.pudasjarvi.fi/",
  "https://aurorago.app/en/webcams", "https://www.aurorawebcams.com/"]
KW = re.compile(r"ranua|kemi|tornio|haparanda|pudasj|syöte|syote|posio|simo|keminmaa|tervola|taivalkoski|rovaniemi|ii\b|oulu|kuusamo|ruka", re.I)

def search(q, live):
    url = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(q) + ("&sp=EgJAAQ%253D%253D" if live else "")
    data, st, _ = yl.get(url)
    if data is None: return {"status": st, "ids": []}
    s = data.decode("utf-8", "replace")
    ids = []
    for m in re.finditer(r'"videoRenderer":\{"videoId":"([\w-]{11})"', s):
        if m.group(1) not in ids: ids.append(m.group(1))
    return {"status": st, "ids": ids[:15], "liveBadges": s.count("BADGE_STYLE_TYPE_LIVE_NOW")}

def page(url):
    data, st, final = yl.get(url)
    out = {"status": st, "final": final}
    if data is None: return out
    s = data.decode("utf-8", "replace")
    m = re.search(r"<title[^>]*>(.*?)</title>", s, re.S | re.I)
    out["title"] = H.unescape(m.group(1).strip())[:200] if m else None
    out["youtube"] = sorted(set(re.findall(r"(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=|live/)|youtu\.be/)([\w-]{11})", s)))
    out["channels"] = sorted(set(re.findall(r"youtube\.com/(?:channel/UC[\w-]{22}|@[\w.-]+)", s)))[:30]
    out["iframes"] = sorted(set(re.findall(r'<iframe[^>]+src="([^"]+)"', s)))[:30]
    out["camlinks"] = sorted(set(u for u in re.findall(r'(?:href|src)="([^"]+)"', s) if re.search(r"cam|live|stream|m3u8|kamera", u, re.I)))[:60]
    txt = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S | re.I)
    txt = H.unescape(re.sub(r"<[^>]+>", " ", txt)); txt = re.sub(r"\s+", " ", txt)
    snips = []
    for m in KW.finditer(txt):
        a = max(0, m.start() - 80); snips.append(txt[a:m.end() + 120])
        if len(snips) >= 15: break
    out["snippets"] = snips
    return out

res = {"search": {}, "videos": {}, "pages": {}, "starlapland": None}
allids = []
for q in QUERIES:
    for live in (True, False):
        r = search(q, live); res["search"][q + (" [live]" if live else "")] = r
        allids += [i for i in r["ids"] if i not in allids]
print("hakuja", len(res["search"]), "videoita", len(allids))
for v in allids:
    o = yl.oembed(v); o["thumb"] = yl.thumb_status(v)[0]; res["videos"][v] = o
for u in PAGES:
    res["pages"][u] = page(u)
cid = yl.channel_id_of("https://www.youtube.com/@Starlapland")
res["starlapland"] = {"channel": cid, "streams": yl.channel_streams(cid, limit=40) if cid else None}
# lisätään sivuilta löytyneet videot
for p in res["pages"].values():
    for v in p.get("youtube", []):
        if v not in res["videos"]:
            o = yl.oembed(v); o["thumb"] = yl.thumb_status(v)[0]; res["videos"][v] = o
os.makedirs("out", exist_ok=True)
json.dump(res, open("out/tulos.json", "w"), ensure_ascii=False, indent=1)
L = ["# Kamerahaku Ranua/Kemi/Pudasjärvi", "", "## Osuvat videot (nimi tai kanava sisältää alueen)"]
for v, o in res["videos"].items():
    t = f"{o.get('title')} — {o.get('author')}"
    if KW.search(t or ""): L.append(f"- `{v}` {t} (oEmbed {o.get('error','200')}, live-kuva {o['thumb']})")
L += ["", "## Starlapland /streams"]
for s in (res["starlapland"]["streams"] or []): L.append(f"- `{s['videoId']}` live={s['live']} {s['title']}")
L += ["", "## Sivut"]
for u, p in res["pages"].items():
    L.append(f"- {u}: {p.get('status')} {p.get('title')} yt={p.get('youtube')} iframes={p.get('iframes')}")
open("out/YHTEENVETO.md", "w").write("\n".join(L) + "\n")
print("\n".join(L))
