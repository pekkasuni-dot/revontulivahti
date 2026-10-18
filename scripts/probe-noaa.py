"""Tilapäinen tutkimustyökalu: NOAA SWPC -hakemistot (pallonpuoliskon teho, historia).
Ajetaan GitHub Actionsissa (.github/workflows/noaa-probe.yml), ei julkaise mitään."""
import re, urllib.request
B = 'https://services.swpc.noaa.gov/'
def get(u):
    r = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'probe', 'Origin': 'https://pekkasuni-dot.github.io'}), timeout=30)
    return r.status, r.headers.get('Access-Control-Allow-Origin'), r.read().decode('utf-8', 'replace')
for d in ['text/', 'json/', 'products/', 'json/ovation/', 'products/animations/', 'json/rtsw/', 'products/geospace/']:
    print('=' * 70, d)
    try:
        st, acao, body = get(B + d)
        names = re.findall(r'href="([^"?/][^"]*)"', body)
        print('HTTP', st, 'n', len(names))
        hits = [n for n in names if re.search(r'hemi|power|aurora|ovation|kp|k-index|wind|mag|plasma', n, re.I)]
        print('\n'.join(hits[:120]))
    except Exception as e:
        print('ERROR', repr(e))
for u in ['text/aurora-nowcast-hemi-power.txt', 'json/ovation_aurora_latest.json']:
    print('=' * 70, u)
    try:
        st, acao, body = get(B + u)
        print('HTTP', st, 'ACAO', acao, 'bytes', len(body)); print(body[:600] if u.endswith('.txt') else body[:300])
    except Exception as e:
        print('ERROR', repr(e))
