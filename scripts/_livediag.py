# TILAPÄINEN diagnostiikka (poistetaan ennen yhdistämistä): kanavien live-merkit.
import json, sys
sys.path.insert(0, "scripts")
import youtube_live as yl
cams = [c for c in json.load(open("data/cameras.json"))["cameras"] if c.get("type") == "youtube"]
extra = {"apukka": "wT8Zhh9MBEE", "luosto": "dyRSvHGGvA8", "utsjoki-uusi": "ePFfaAgZS-Y"}
chans = {}
for c in cams:
    chans.setdefault(c["youtube"]["channelId"], []).append(c["id"] + ":" + c["youtube"]["videoId"])
for k, v in extra.items():
    oe = yl.oembed(v)
    ch = yl.channel_id_of(oe["author_url"]) if oe.get("author_url") else None
    print(f"[kandidaatti] {k} {v} kanava={ch} _live={yl.thumb_status(v)[0]} {oe}")
    if ch:
        chans.setdefault(ch, []).append(k + ":" + v)
for ch, who in chans.items():
    print(f"\n=== {ch} {who}")
    print("  live-sivu:", yl.live_page_markers(ch))
    f = yl.streams_live_flags(ch)
    print("  streams status:", f.get("status"), f.get("note"))
    for v, mk, sn in f.get("videos", []):
        print(f"  {v} _live={yl.thumb_status(v)[0]} merkit={mk} ote={sn} | {yl.oembed(v).get('title')}")
# Raakaote yhdestä renderöijästä rakenteen näkemiseksi
html, st, _ = yl.get("https://www.youtube.com/channel/UC-whuqv4HIi1O9hh9CHpPJg/streams")
d = yl.initial_data(html) if html else None
if d:
    for o in yl._walk(d):
        if o.get("contentType") == "LOCKUP_CONTENT_TYPE_VIDEO" or "videoRenderer" in o:
            print("\nRAAKA:", json.dumps(o, ensure_ascii=False)[:3000]); break
