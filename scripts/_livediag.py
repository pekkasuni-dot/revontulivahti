# TILAPÄINEN (poistetaan ennen yhdistämistä): Inarin kameran (ePFfaAgZS-Y) kanava ja upotettavuus.
import re, sys
sys.path.insert(0, "scripts")
import youtube_live as yl
V = "ePFfaAgZS-Y"
for u in [f"https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={V}",
          f"https://www.youtube.com/oembed?format=json&url=https://youtu.be/{V}",
          f"https://www.youtube.com/embed/{V}", f"https://www.youtube-nocookie.com/embed/{V}",
          f"https://www.youtube.com/live/{V}", f"https://www.youtube.com/watch?v={V}"]:
    b, st, fin = yl.get(u)
    s = b.decode("utf-8", "replace") if b else ""
    ch = re.findall(r'(UC[\w-]{22})', s)[:3]
    marks = [m for m in ("playabilityStatus", '"status":"OK"', "UNPLAYABLE", "embeddable", '"playableInEmbed":true', '"playableInEmbed":false',
                         "LOGIN_REQUIRED", "isLiveNow\":true", "Video unavailable", "members", "ERROR") if m in s]
    t = re.search(r'"title":"([^"]{0,80})"', s); a = re.search(r'"(?:author|ownerChannelName)":"([^"]{0,60})"', s)
    print(st, u, "| kanavat", ch, "| merkit", marks, "| otsikko", t.group(1) if t else None, "| tekijä", a.group(1) if a else None, "|", s[:200] if st != 200 else "")
print("_live", yl.thumb_status(V)[0], "ei-live", yl.thumb_status(V, "hqdefault")[0])
