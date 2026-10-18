"""Tilapäinen tutkimustyökalu: NOAA SWPC -tiedostojen muoto, pituus ja CORS.
Ajetaan GitHub Actionsissa (.github/workflows/noaa-probe.yml), ei julkaise mitään."""
import json, urllib.request, datetime
B = 'https://services.swpc.noaa.gov/'
URLS = ['json/rtsw/rtsw_mag_1m.json', 'json/rtsw/rtsw_wind_1m.json',
        'products/solar-wind/mag-1-day.json', 'products/solar-wind/plasma-1-day.json',
        'products/solar-wind/mag-7-day.json', 'products/solar-wind/plasma-7-day.json',
        'products/solar-wind/mag-2-hour.json', 'products/solar-wind/plasma-2-hour.json',
        'products/geospace/propagated-solar-wind.json', 'products/geospace/propagated-solar-wind-1-hour.json',
        'json/rtsw/rtsw_ephemerides_1h.json',
        'text/aurora-nowcast-hemi-power.txt', 'products/noaa-planetary-k-index.json',
        'products/noaa-planetary-k-index-forecast.json', 'json/planetary_k_index_1m.json']
for u in URLS:
    print('=' * 70); print(u)
    try:
        req = urllib.request.Request(B + u, headers={'Origin': 'https://pekkasuni-dot.github.io', 'User-Agent': 'probe'})
        r = urllib.request.urlopen(req, timeout=30)
        body = r.read().decode('utf-8', 'replace')
        print('HTTP', r.status, 'bytes', len(body), 'ACAO', r.headers.get('Access-Control-Allow-Origin'),
              'cache', r.headers.get('Cache-Control'))
        if u.endswith('.json'):
            d = json.loads(body)
            print('type', type(d).__name__, 'len', len(d))
            if isinstance(d, list) and d:
                print('first', json.dumps(d[0])[:400]); print('second', json.dumps(d[1] if len(d) > 1 else None)[:400])
                print('last', json.dumps(d[-1])[:400])
                if isinstance(d[0], dict):
                    keys = sorted({k for x in d for k in x}); print('keys', keys)
                    if 'source' in keys: print('sources', sorted({str(x.get('source')) for x in d}))
                    if 'active' in keys: print('active', sum(1 for x in d if x.get('active')))
                    tt = [x.get('time_tag') for x in d if x.get('time_tag')]
                    if tt: print('time range', min(tt), max(tt), 'n', len(tt), 'unique', len(set(tt)))
                    if 'observed' in keys: print('observed', sorted({str(x.get('observed')) for x in d}))
                elif isinstance(d[0], list):
                    tt = [x[0] for x in d[1:]]; print('time range', tt[0], tt[-1], 'n', len(tt))
            elif isinstance(d, dict): print('keys', list(d)[:20])
        else:
            lines = body.splitlines(); print('lines', len(lines))
            print('\n'.join(lines[:25])); print('...'); print('\n'.join(lines[-5:]))
    except Exception as e:
        print('ERROR', repr(e))
print('now', datetime.datetime.utcnow().isoformat())
