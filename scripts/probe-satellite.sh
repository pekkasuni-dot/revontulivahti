#!/bin/bash
# VÄLIAIKAINEN: satelliittilähteiden koehaku (ks. .github/workflows/sat-probe.yml).
set -u
mkdir -p sat-out; cd sat-out
UA="AuroraAwesome/0.1 github.com/pekkasuni-dot/revontulivahti"
ORIGIN="https://pekkasuni-dot.github.io"
echo "Nyt (UTC): $(date -u +%FT%TZ)"
probe(){ # nimi url
  local n="$1" u="$2"
  echo; echo "===== $n ====="; echo "$u"
  curl -sS -m 60 -A "$UA" -H "Origin: $ORIGIN" -D "$n.hdr" -o "$n.body" -w "HTTP %{http_code}  %{content_type}  %{size_download} B  %{time_total}s\n" "$u" || echo "curl virhe"
  grep -iE '^(last-modified|expires|access-control-allow-origin|cache-control|date):' "$n.hdr" 2>/dev/null
  file "$n.body" 2>/dev/null | cut -c1-200
}
probe met_available "https://api.met.no/weatherapi/geosatellite/1.4/available"
head -c 3000 met_available.body; echo
probe met_avail_eu_ir "https://api.met.no/weatherapi/geosatellite/1.4/available?area=europe&type=infrared"
head -c 2000 met_avail_eu_ir.body; echo
probe met_eu_ir "https://api.met.no/weatherapi/geosatellite/1.4/?area=europe&type=infrared"
python3 -c "from PIL import Image;im=Image.open('met_eu_ir.body');print('kuva',im.format,im.size,im.mode)" 2>&1 | head -2
probe met_global_ir "https://api.met.no/weatherapi/geosatellite/1.4/?area=global&type=infrared"
python3 -c "from PIL import Image;im=Image.open('met_global_ir.body');print('kuva',im.format,im.size,im.mode)" 2>&1 | head -2
probe met_doc "https://api.met.no/weatherapi/geosatellite/1.4/documentation"
python3 - <<'PY'
import re,html
t=open('met_doc.body',errors='replace').read()
t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S); t=html.unescape(re.sub(r'<[^>]+>',' ',t)); t=re.sub(r'\s+',' ',t)
print(t[:6000])
PY
probe eumv_caps "https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities"
python3 - <<'PY'
import re
t=open('eumv_caps.body',errors='replace').read()
print('koko',len(t))
for tag in ('AccessConstraints','Fees'):
    m=re.search(rf'<{tag}>(.*?)</{tag}>',t,re.S); print(tag, (m.group(1)[:400] if m else None))
names=re.findall(r'<Layer[^>]*>\s*<Name>([^<]+)</Name>',t)
print('tasoja',len(names))
sel=[n for n in names if re.search(r'ir10|ir105|ir108|fog|night|micro|cloud|ir_',n,re.I)]
print('IR/fog/cloud-tasot:',sel[:80])
for n in sel[:12]:
    i=t.find('<Name>'+n+'</Name>'); seg=t[i:i+6000]
    d=re.search(r'<Dimension name="time"[^>]*>([^<]{0,300})',seg)
    print(n,'| time:',(d.group(1)[-120:] if d else None))
print('EPSG:3857' in t)
PY
for L in mtg_fd:ir105_hrfi mtg_fd:ir105 msg_fes:ir108 msg_fes:rgb_fog; do
  probe "eumv_${L//:/_}" "https://view.eumetsat.int/geoserver/wms?service=WMS&version=1.3.0&request=GetMap&layers=$L&styles=&crs=EPSG:3857&bbox=556597,8399738,3562224,11402272&width=1024&height=1024&format=image/png&transparent=true"
  head -c 300 "eumv_${L//:/_}.body" | tr -cd '[:print:]\n' | head -3; echo
done
probe gibs_caps "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml"
python3 - <<'PY'
import re
t=open('gibs_caps.body',errors='replace').read()
for key in ('Brightness_Temp_BandI5_Night','DayNightBand','BandM15_Night'):
    ids=sorted(set(re.findall(r'<ows:Identifier>([^<]*'+key+r'[^<]*)</ows:Identifier>',t)))
    print(key, ids[:10])
    for i in ids[:3]:
        k=t.find('<ows:Identifier>'+i+'</ows:Identifier>'); seg=t[k:k+4000]
        print(' ',i,'TMS:',re.findall(r'<TileMatrixSet>([^<]+)</TileMatrixSet>',seg)[:2],'default:',re.findall(r'<Default>([^<]+)</Default>',seg)[:1],'value:',[v[-60:] for v in re.findall(r'<Value>([^<]+)</Value>',seg)][:1])
PY
Y=$(date -u -d yesterday +%F)
probe gibs_wms "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=VIIRS_NOAA20_Brightness_Temp_BandI5_Night&CRS=EPSG:3857&BBOX=556597,8399738,3562224,11402272&WIDTH=1024&HEIGHT=1024&FORMAT=image/png&TIME=$Y"
probe eum_policy "https://www-cdn.eumetsat.int/files/2026-01/45173%20-%20Data_Policy.pdf"
(sudo apt-get install -y -qq poppler-utils >/dev/null 2>&1 && pdftotext eum_policy.body policy.txt && python3 - <<'PY'
import re
t=open('policy.txt',errors='replace').read()
for kw in ('Core','Recommended','timeliness','sub-hourly','hourly','CC-BY','delay','real time'):
    for m in list(re.finditer(kw,t))[:4]:
        print('---',kw,':',re.sub(r'\s+',' ',t[max(0,m.start()-250):m.start()+350]))
PY
) || echo "pdf-luku epäonnistui"
probe noaa_nowcoast "https://nowcoast.noaa.gov/geoserver/observations/satellite/ows?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
echo; echo VALMIS
