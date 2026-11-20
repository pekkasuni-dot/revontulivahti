#!/bin/bash
# Väliaikainen KHO-tutkimus: sivujen tekstit lokiin, kuvien otsakkeet + tiivisteet kierroksittain.
set -u
OUT=kho-out; mkdir -p "$OUT/pages" "$OUT/img"
UA="Mozilla/5.0 (research probe)"
pages="https://kho.unis.no/ https://kho.unis.no/WebCameras.html https://kho.unis.no/data/SonyA7s.html https://aurora.unis.no/data/SonyA7s.html https://kho.unis.no/Quicklooks.html https://kho.unis.no/Data.html https://kho.unis.no/DataPolicy.html https://kho.unis.no/Rules.html https://kho.unis.no/Instruments.html https://kho.unis.no/nordlysstasjon/Webcam.htm"
i=0
for u in $pages; do
  i=$((i+1)); f="$OUT/pages/p$i.html"
  code=$(curl -sSL -A "$UA" -m 30 -o "$f" -w '%{http_code} %{url_effective}' "$u")
  echo "=== PAGE $u -> $code"
done
# Linkit kaikilta sivuilta
echo "=== LINKS"
cat "$OUT"/pages/*.html 2>/dev/null | grep -oiE '(href|src)="[^"]+"' | sort -u | head -400
for f in "$OUT"/pages/*.html; do
  echo "=== TEXT $f"
  python3 - "$f" <<'PY'
import sys,re,html
t=open(sys.argv[1],errors='ignore').read()
t=re.sub(r'(?is)<(script|style).*?</\1>',' ',t)
t=re.sub(r'(?s)<[^>]+>',' ',t); t=html.unescape(t)
t=re.sub(r'[ \t\r]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t)
print(t[:6000])
PY
done
# Kuvaehdokkaat: sivujen kuvat + arvaukset
imgs=$(cat "$OUT"/pages/*.html 2>/dev/null | grep -oiE 'src="[^"]+\.(jpg|jpeg|png|gif)[^"]*"' | sed -E 's/^src="//I;s/"$//' | sort -u)
cand=""
for s in $imgs; do
  case "$s" in http*) cand="$cand $s";; /*) cand="$cand https://kho.unis.no$s";; *) cand="$cand https://kho.unis.no/$s";; esac
done
for n in 1 2 3 4 5 6; do cand="$cand https://kho.unis.no/SD/pics/cam$n.jpg"; done
cand="$cand https://kho.unis.no/Quicklooks/kho_sony.jpg https://kho.unis.no/Quicklooks/kho_sony_keo.jpg ${EXTRA_URLS:-}"
cand=$(echo $cand | tr ' ' '\n' | sort -u)
echo "=== CANDIDATES"; echo "$cand"
for r in $(seq 1 "$ROUNDS"); do
  echo "=== ROUND $r $(date -u +%FT%TZ)"
  for u in $cand; do
    k=$(echo "$u" | sed 's#https\?://##;s#[/?&=]#_#g')
    h=$(curl -sS -A "$UA" -m 30 -D - -o "$OUT/img/$k.$r" -w 'CODE=%{http_code} SIZE=%{size_download} TYPE=%{content_type}' "$u" 2>&1 | grep -iE '^(last-modified|CODE=)' | tr '\r\n' '  ')
    sha=$(sha256sum "$OUT/img/$k.$r" 2>/dev/null | cut -c1-12)
    echo "$u | $h | sha=$sha"
  done
  [ "$r" -lt "$ROUNDS" ] && sleep $((INTERVAL_MIN*60))
done
# Säilytä vain ensimmäinen ja viimeinen kuva per osoite
cd "$OUT/img" && for f in *.1; do b=${f%.1}; ls "$b".* | sort -t. -k2 -n | sed '1d;$d' | xargs -r rm -f; done
exit 0
