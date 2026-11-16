#!/usr/bin/env python3
"""Kuntaraja-aineisto omien paikkojen nimiehdotukseen (päätös 59, 2026-11-16).

Tuottaa data/kunnat.json: Suomen, Ruotsin ja Norjan kuntien yleistetyt rajat yhtenä
tiedostona. Sovellus päättelee siitä puhelimessa, missä kunnassa tallennettava paikka on
(AuroraCore.kuntaAt). Koordinaatteja ei lähetetä millekään palvelulle.

Lähteet (avoimia, kaupallinen käyttö sallittu):
  FI  Tilastokeskus, kuntarajat 1:1 000 000 (pohja: Maanmittauslaitoksen kuntajako), CC BY 4.0
      WFS geo.stat.fi, taso tilastointialueet:kunta1000k_<vuosi>
  SE  SCB, Digitala gränser, kommuner (pohja: Lantmäteriet), CC0
      https://www.scb.se/.../digitala-granser/ (shape, SWEREF 99 TM)
  NO  Kartverket, Administrative enheter kommuner, CC BY 4.0
      Geonorge-latauspalvelu (GeoJSON, koko maa)

Aja uudelleen kuntaliitosten jälkeen: .github/kuntarajat.env-muutos claude/**-haaralla käynnistää
työnkulun kuntarajat.yml, joka ajaa tämän ja kommitoi tuloksen haaraan. Lisää sen jälkeen
sovelluksen KUNNAT.version (index.html), jotta puhelimet hakevat uuden tiedoston.

Yleistys: shapely.coverage_simplify (Visvalingam-Whyatt, naapurikuntien yhteiset rajat
pysyvät yhteisinä -> ei rakoja eikä päällekkäisyyksiä maan sisällä), metreinä EPSG:3035:ssa.
Pienet saaret (< MIN_PART_M2) pudotetaan. Koordinaatit kokonaislukuina 1/Q asteen tarkkuudella,
renkaat delta-koodattuina. Tarkkuus mitataan satunnaispisteillä alkuperäistä rajaa vasten (loki).

Käyttö: python3 scripts/build-kunnat.py [--tolerance 120] [--out data/kunnat.json]
        [--fixtures tests/fixtures/kunnat-rajapisteet.json] [--cache-dir .kunnat-cache]
"""
import argparse, datetime, gzip, io, json, math, os, random, re, sys, urllib.request, zipfile

import shapefile                      # pyshp
import shapely
from shapely.geometry import shape, Polygon, MultiPolygon, Point, LineString
from shapely.ops import transform
from pyproj import Transformer

UA = {'User-Agent': 'revontulivahti-kuntarajat/1 (+https://github.com/pekkasuni-dot/revontulivahti)'}
Q = 10000                  # koordinaatit 1/Q asteen kokonaislukuina (0,0001° = 11 m)
MIN_PART_M2 = 200_000      # saaret ja muut osat alle 0,2 km² pois (paikannimi ilman kuntaa)

# Suomen ruotsinkieliset enemmistökunnat (Tilastokeskus, kuntien kielisuhteet): ensisijainen nimi
# ruotsiksi. Kuntanumerot. Ahvenanmaa kokonaan + mantereen ruotsinkieliset enemmistökunnat.
FI_SWEDISH_MAJORITY = {
    # Ahvenanmaa
    '035', '043', '060', '062', '065', '076', '170', '295', '318', '417', '438', '478', '736', '766', '771', '941',
    # Pohjanmaa, Uusimaa, Varsinais-Suomi
    '149',  # Ingå (Inkoo)
    '280',  # Korsnäs
    '287',  # Kristinestad (Kristiinankaupunki)
    '288',  # Kronoby (Kruunupyy)
    '322',  # Kimitoön (Kemiönsaari)
    '440',  # Larsmo (Luoto)
    '445',  # Pargas (Parainen)
    '475',  # Malax (Maalahti)
    '499',  # Korsholm (Mustasaari)
    '545',  # Närpes (Närpiö)
    '598',  # Jakobstad (Pietarsaari)
    '599',  # Pedersöre
    '710',  # Raseborg (Raasepori)
    '893',  # Nykarleby (Uusikaarlepyy)
    '946',  # Vörå (Vöyri)
}

# Rajapisteparit testeihin (tests/kunnat.test.mjs): kunta A, kunta B, maa. Pisteet lasketaan
# alkuperäisestä (yleistämättömästä) aineistosta yhteisen rajan keskeltä 250 m ja 600 m kummallekin puolelle.
BORDER_PAIRS = [
    ('FI', 'Rovaniemi', 'Ranua'), ('FI', 'Helsinki', 'Espoo'), ('FI', 'Inari', 'Utsjoki'),
    ('SE', 'Kiruna', 'Gällivare'), ('SE', 'Stockholm', 'Solna'),
    ('NO', 'Tromsø', 'Balsfjord'), ('NO', 'Oslo', 'Bærum'),
]


def log(*a):
    print(*a, flush=True)


def http_get(url, data=None, headers=None, timeout=180):
    h = dict(UA)
    if headers: h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def cached(cache_dir, name, fn):
    if cache_dir:
        p = os.path.join(cache_dir, name)
        if os.path.exists(p):
            with open(p, 'rb') as f: return f.read()
    b = fn()
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        with open(os.path.join(cache_dir, name), 'wb') as f: f.write(b)
    return b


def polys_only(g):
    """Vain (moni)monikulmio-osat, korjattuna."""
    if g is None or g.is_empty: return None
    if not g.is_valid: g = shapely.make_valid(g)
    parts = []
    def walk(x):
        if isinstance(x, Polygon):
            if not x.is_empty: parts.append(x)
        elif isinstance(x, MultiPolygon):
            parts.extend(p for p in x.geoms if not p.is_empty)
        elif hasattr(x, 'geoms'):
            for y in x.geoms: walk(y)
    walk(g)
    if not parts: return None
    return parts[0] if len(parts) == 1 else MultiPolygon(parts)


# ── Suomi: Tilastokeskus WFS ──
def fetch_fi(cache_dir):
    base = 'https://geo.stat.fi/geoserver/tilastointialueet/wfs'
    caps = cached(cache_dir, 'fi-caps.xml', lambda: http_get(base + '?service=WFS&version=2.0.0&request=GetCapabilities')).decode('utf-8', 'replace')
    layers = sorted(set(re.findall(r'tilastointialueet:(kunta1000k_\d{4})', caps)))
    log('FI: kuntatasot', layers)
    if not layers: raise SystemExit('FI: kunta1000k-tasoja ei löytynyt GetCapabilitiesista')
    layer = layers[-1]       # uusin vuosi
    url = (base + '?service=WFS&version=2.0.0&request=GetFeature&typeNames=tilastointialueet:' + layer +
           '&outputFormat=application/json&srsName=EPSG:4326')
    fc = json.loads(cached(cache_dir, 'fi.json', lambda: http_get(url)))
    feats = fc['features']
    log('FI:', layer, len(feats), 'kuntaa, kentät', sorted(feats[0]['properties'].keys()))
    out = []
    for f in feats:
        p = f['properties']
        code = str(p.get('kunta')).zfill(3)
        fi, sv = (p.get('nimi') or '').strip(), (p.get('namn') or '').strip()
        name = sv if code in FI_SWEDISH_MAJORITY and sv else fi
        alt = [n for n in (fi, sv) if n and n != name]
        g = shape(f['geometry'])
        # GeoServer EPSG:4326 + WFS 2.0 voi palauttaa akselit lat,lon -> tunnista ja käännä.
        out.append(dict(c='FI', code=code, n=name, a=alt, g=g))
    sample = out[0]['g'].representative_point()
    if sample.x > 50:   # x = leveysaste -> akselit käännetty
        log('FI: akselit lat,lon -> käännetään')
        for m in out: m['g'] = transform(lambda x, y, z=None: (y, x), m['g'])
    return out, 'Tilastokeskus ' + layer + ' (CC BY 4.0)'


# ── Ruotsi: SCB Digitala gränser ──
def fetch_se(cache_dir):
    page_url = 'https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/digitala-granser/'
    html = cached(cache_dir, 'se-page.html', lambda: http_get(page_url)).decode('utf-8', 'replace')
    links = sorted(set(re.findall(r'href="([^"]+\.zip)"', html, re.I)))
    log('SE: zip-linkit', links)
    # Sivulla yksi shape-zip kaikille indelningeille (län, kommuner, regioner) -> kommunfil zipin sisältä.
    cand = [l for l in links if re.search(r'shape', l, re.I)] or [l for l in links if re.search(r'kommun', l, re.I)]
    if not cand: raise SystemExit('SE: shape-zipiä ei löytynyt sivulta ' + page_url)
    url = cand[-1]
    if url.startswith('/'): url = 'https://www.scb.se' + url
    log('SE: lataus', url)
    z = zipfile.ZipFile(io.BytesIO(cached(cache_dir, 'se.zip', lambda: http_get(url))))
    # Zipin sisällä voi olla zippejä (yksi per indelning).
    names = z.namelist()
    log('SE: zip', names)
    inner = [n for n in names if n.lower().endswith('.zip') and re.search(r'kommun', n, re.I)]
    if inner:
        z = zipfile.ZipFile(io.BytesIO(z.read(inner[0])))
        names = z.namelist()
        log('SE: sisempi zip', inner[0], names)
    shps = [n for n in names if n.lower().endswith('.shp')]
    shp = next((n for n in shps if re.search(r'kommun', n, re.I)), None)
    if not shp: raise SystemExit('SE: kommun-shp puuttuu: ' + str(shps))
    stem = shp[:-4]
    def part(ext):
        for n in names:
            if n.lower() == (stem + ext).lower(): return io.BytesIO(z.read(n))
        return None
    cpg = part('.cpg')
    enc = cpg.read().decode().strip() if cpg else 'latin1'
    if enc.upper() in ('UTF-8', 'UTF8'): enc = 'utf-8'
    prj = part('.prj').read().decode('latin1') if part('.prj') else ''
    log('SE: koodaus', enc, '| prj', prj[:80])
    r = shapefile.Reader(shp=part('.shp'), dbf=part('.dbf'), shx=part('.shx'), encoding=enc)
    fields = [f[0] for f in r.fields[1:]]
    log('SE: kentät', fields)
    kf = next(f for f in fields if f.lower() in ('knnamn', 'kommunnamn', 'namn'))
    cf = next((f for f in fields if f.lower() in ('knkod', 'kommunkod', 'kod')), None)
    tr = Transformer.from_crs('EPSG:3006', 'EPSG:4326', always_xy=True)
    out = []
    for sr in r.iterShapeRecords():
        g = shape(sr.shape.__geo_interface__)
        g = transform(tr.transform, g)
        out.append(dict(c='SE', code=str(sr.record[cf]) if cf else '', n=str(sr.record[kf]).strip(), a=[], g=g))
    log('SE:', len(out), 'kommunia')
    return out, 'SCB Digitala gränser, kommuner (CC0)'


# ── Norja: Kartverket / Geonorge ──
NO_UUID = '041f1e6e-bdbc-4091-b48f-8a5990f3cc5b'


def no_download_url(cache_dir):
    # 1) Atom-syöte (staattinen luettelo tiedostoista)
    for feed in ['https://nedlasting.geonorge.no/geonorge/ATOM-feeds/AdministrativeEnheterKommuner_AtomFeedGEOJSON.xml',
                 'https://nedlasting.geonorge.no/geonorge/ATOM-feeds/AdministrativeEnheterKommuner_AtomFeedGeoJSON.xml']:
        try:
            x = http_get(feed).decode('utf-8', 'replace')
            hrefs = re.findall(r'href="([^"]+\.zip)"', x)
            log('NO: atom', feed, len(hrefs), 'linkkiä', hrefs[:6])
            pick = [h for h in hrefs if re.search(r'0000|Norge', h) and '4258' in h] or [h for h in hrefs if re.search(r'0000|Norge', h)]
            if pick: return pick[0]
        except Exception as e:
            log('NO: atom ei vastannut', feed, e)
    # 2) Geonorge-latausrajapinta (tilaus)
    try:
        areas = json.loads(http_get('https://nedlasting.geonorge.no/api/codelists/area/' + NO_UUID))
        land = next(a for a in areas if a.get('type') == 'landsdekkende')
        log('NO: alue', land.get('code'), land.get('name'), 'projektiot', [p.get('code') for p in land.get('projections', [])],
            'formaatit', [f.get('name') for f in land.get('formats', [])])
        proj = next((p for p in land['projections'] if p.get('code') == '4258'), land['projections'][0])
        fmt = next(f for f in land['formats'] if 'json' in f.get('name', '').lower())
        body = {'email': '', 'orderLines': [{'metadataUuid': NO_UUID,
                'areas': [{'code': land['code'], 'name': land.get('name'), 'type': land['type']}],
                'projections': [{'code': proj['code'], 'name': proj.get('name'), 'codespace': proj.get('codespace')}],
                'formats': [{'name': fmt['name']}]}]}
        res = json.loads(http_get('https://nedlasting.geonorge.no/api/order', data=json.dumps(body).encode(),
                                  headers={'Content-Type': 'application/json'}))
        files = res.get('files') or []
        log('NO: tilaus', [f.get('name') for f in files])
        if files: return files[0]['downloadUrl']
    except Exception as e:
        log('NO: tilausrajapinta epäonnistui', e)
    raise SystemExit('NO: latauslinkkiä ei löytynyt')


def no_name(p):
    """(ensisijainen nimi, muut nimet). Kartverketin kommunenavn on norjankielinen nimi;
    saamen/kveenin nimet (navn-luettelo, jos mukana) muiksi nimiksi."""
    name = str(p.get('kommunenavn') or (p.get('navn') if isinstance(p.get('navn'), str) else '') or '').strip()
    alt = []
    lst = p.get('navn') if isinstance(p.get('navn'), list) else None
    if lst:
        nor = [x for x in lst if x.get('sprak') in ('nor', 'nob', 'nno')]
        if not name and nor: name = nor[0].get('navn', '').strip()
        alt = [x.get('navn', '').strip() for x in lst if x.get('navn') and x.get('navn').strip() != name]
    if ' - ' in name:   # "Guovdageaidnu - Kautokeino": norjankielinen viimeisenä, muut vaihtoehtoisiksi
        parts = [s.strip() for s in name.split(' - ')]
        alt = parts[:-1] + alt
        name = parts[-1]
    return name, [a for a in dict.fromkeys(alt) if a and a != name]


def find_polygon_collections(obj, path=''):
    if isinstance(obj, dict):
        if obj.get('type') == 'FeatureCollection' and obj.get('features'):
            yield path, obj
        for k, v in obj.items():
            yield from find_polygon_collections(v, path + '/' + k)


def fetch_no(cache_dir):
    url = no_download_url(cache_dir)
    log('NO: lataus', url)
    z = zipfile.ZipFile(io.BytesIO(cached(cache_dir, 'no.zip', lambda: http_get(url, timeout=600))))
    log('NO: zip', z.namelist())
    jn = [n for n in z.namelist() if n.lower().endswith(('.geojson', '.json'))][0]
    data = json.loads(z.read(jn))
    crs = json.dumps(data.get('crs', ''))[:120]
    log('NO: crs', crs, '| avaimet', list(data.keys())[:10])
    feats = []
    for path, fc in find_polygon_collections(data):
        types = {}
        for f in fc['features']:
            t = (f.get('geometry') or {}).get('type'); types[t] = types.get(t, 0) + 1
        log('NO: kokoelma', path or '/', types)
        feats += [f for f in fc['features'] if (f.get('geometry') or {}).get('type') in ('Polygon', 'MultiPolygon')]
    if not feats: raise SystemExit('NO: kuntamonikulmioita ei löytynyt')
    log('NO: monikulmion kentät', {k: v for k, v in feats[0]['properties'].items()})
    def prop(p, key):   # kentät voivat olla litistettyjä ("a.b.kommunenummer")
        if key in p: return p[key]
        for k, v in p.items():
            if k.split('.')[-1] == key: return v
        return None
    best = {'features': feats}
    epsg = re.search(r'EPSG::?(\d+)', crs)
    tr = None
    if epsg and epsg.group(1) not in ('4258', '4326'):
        tr = Transformer.from_crs('EPSG:' + epsg.group(1), 'EPSG:4326', always_xy=True)
        log('NO: muunnos EPSG:' + epsg.group(1), '-> 4326')
    by = {}
    for f in best['features']:
        p = f['properties']
        g = shape(f['geometry'])
        if tr: g = transform(tr.transform, g)
        code = str(prop(p, 'kommunenummer'))
        name, alt = no_name({'kommunenavn': prop(p, 'kommunenavn'), 'navn': prop(p, 'navn')})
        if code in by:   # sama kunta useana kohteena -> yhdistetään
            by[code]['g'] = by[code]['g'].union(g)
        else:
            by[code] = dict(c='NO', code=code, n=name, a=alt, g=g)
    out = list(by.values())
    log('NO:', len(out), 'kommunea, esim.', [(m['n'], m['a']) for m in out if m['a']][:8])
    return out, 'Kartverket, Administrative enheter kommuner (CC BY 4.0)'


# ── Yleistys, mittaus ja koodaus ──
TO_M = Transformer.from_crs('EPSG:4326', 'EPSG:3035', always_xy=True)
TO_DEG = Transformer.from_crs('EPSG:3035', 'EPSG:4326', always_xy=True)


def simplify_country(ms, tol):
    geoms = [polys_only(transform(TO_M.transform, m['g'])) for m in ms]
    for m, g in zip(ms, geoms): m['gm'] = g
    simp = shapely.coverage_simplify(geoms, tolerance=tol, simplify_boundary=True)
    for m, s in zip(ms, simp):
        s = polys_only(s)
        parts = [p for p in (s.geoms if isinstance(s, MultiPolygon) else [s])] if s else []
        keep = [p for p in parts if p.area >= MIN_PART_M2]
        if not keep and parts: keep = [max(parts, key=lambda p: p.area)]   # pieni kunta: suurin osa jää
        m['sm'] = MultiPolygon(keep) if len(keep) > 1 else (keep[0] if keep else None)


def quant_ring(coords):
    pts = []
    for x, y in coords:
        lon, lat = TO_DEG.transform(x, y)
        q = (round(lon * Q), round(lat * Q))
        if not pts or q != pts[-1]: pts.append(q)
    if len(pts) > 1 and pts[0] == pts[-1]: pts.pop()
    if len(pts) < 3: return None
    flat = [pts[0][0], pts[0][1]]
    for (ax, ay), (bx, by_) in zip(pts, pts[1:]): flat += [bx - ax, by_ - ay]
    return flat, pts


def encode(ms):
    out = []
    for m in ms:
        s = m['sm']
        if s is None: continue
        rings, allpts = [], []
        for p in (s.geoms if isinstance(s, MultiPolygon) else [s]):
            for ring in [p.exterior] + list(p.interiors):
                r = quant_ring(ring.coords)
                if r: rings.append(r[0]); allpts += r[1]
        if not rings: continue
        xs, ys = [a for a, _ in allpts], [b for _, b in allpts]
        e = {'n': m['n'], 'c': m['c'], 'b': [min(xs), min(ys), max(xs), max(ys)], 'r': rings}
        if m['a']: e['a'] = m['a']
        out.append(e)
        m['rings'] = rings
    return out


def pip_rings(rings, x, y):
    """Sama even-odd-sääntö kuin aurora-core.js kuntaAt (kokonaisluvut)."""
    inside = False
    for r in rings:
        n = len(r) // 2
        px, py = r[0], r[1]
        pts = [(px, py)]
        for i in range(1, n):
            px += r[2 * i]; py += r[2 * i + 1]; pts.append((px, py))
        j = n - 1
        for i in range(n):
            xi, yi = pts[i]; xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
            j = i
    return inside


def lookup(entries, lon, lat):
    x, y = lon * Q, lat * Q
    for e in entries:
        b = e['b']
        if b[0] <= x <= b[2] and b[1] <= y <= b[3] and pip_rings(e['r'], x, y): return e
    return None


def accuracy(ms, entries, country, n=3000, seed=59):
    """Satunnaispisteitä alkuperäisten kuntien sisältä: väärä kunta / ei kuntaa etäisyyden rajasta mukaan."""
    rnd = random.Random(seed)
    cms = [m for m in ms if m['c'] == country and m['gm'] is not None]
    wrong, none_ = [], []
    tot = 0
    # Painotus rajojen lähelle: puolet pisteistä alle 2 km rajasta.
    while tot < n:
        m = rnd.choice(cms)
        g = m['gm']
        minx, miny, maxx, maxy = g.bounds
        pt = Point(rnd.uniform(minx, maxx), rnd.uniform(miny, maxy))
        if not g.contains(pt): continue
        d = g.boundary.distance(pt)
        if tot % 2 == 0 and d > 2000: continue
        tot += 1
        lon, lat = TO_DEG.transform(pt.x, pt.y)
        e = lookup(entries, lon, lat)
        if e is None: none_.append(d)
        elif e['n'] != m['n']: wrong.append(d)
    def q(v):
        v = sorted(v); return {'n': len(v), 'max_m': round(v[-1]) if v else 0,
                               'yli_300m': sum(1 for x in v if x > 300), 'yli_1km': sum(1 for x in v if x > 1000)}
    log(f'{country}: tarkkuus {tot} pistettä (puolet alle 2 km rajasta): väärä kunta {q(wrong)}, ei kuntaa {q(none_)}')
    return {'pisteet': tot, 'vaara': q(wrong), 'ei_kuntaa': q(none_)}


def border_fixtures(ms):
    """Rajapisteparit alkuperäisestä aineistosta (ks. BORDER_PAIRS)."""
    by = {(m['c'], m['n']): m for m in ms}
    out = []
    for c, a, b in BORDER_PAIRS:
        ma, mb = by.get((c, a)), by.get((c, b))
        if not ma or not mb:
            log('Rajapari puuttuu:', c, a, b); continue
        shared = ma['gm'].boundary.intersection(mb['gm'].boundary)
        lines = [g for g in getattr(shared, 'geoms', [shared]) if isinstance(g, LineString) and g.length > 0]
        if not lines:
            log('Ei yhteistä rajaa:', a, b); continue
        line = max(lines, key=lambda l: l.length)
        mid = line.interpolate(0.5, normalized=True)
        p1 = line.interpolate(max(0, line.project(mid) - 50)); p2 = line.interpolate(min(line.length, line.project(mid) + 50))
        dx, dy = p2.x - p1.x, p2.y - p1.y; L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        for d in (250, 600):
            for sgn in (1, -1):
                pt = Point(mid.x + sgn * nx * d, mid.y + sgn * ny * d)
                want = ma if ma['gm'].contains(pt) else mb if mb['gm'].contains(pt) else None
                if not want: continue
                dist = round(want['gm'].boundary.distance(pt))
                lon, lat = TO_DEG.transform(pt.x, pt.y)
                out.append({'maa': c, 'lat': round(lat, 6), 'lon': round(lon, 6), 'kunta': want['n'], 'rajasta_m': dist,
                            'pari': a + ' / ' + b})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tolerance', type=float, default=120.0, help='coverage_simplify-toleranssi metreinä')
    ap.add_argument('--out', default='data/kunnat.json')
    ap.add_argument('--fixtures', default='tests/fixtures/kunnat-rajapisteet.json')
    ap.add_argument('--report', default='')
    ap.add_argument('--cache-dir', default='')
    ap.add_argument('--only', default='FI,SE,NO')
    a = ap.parse_args()
    fetchers = {'FI': fetch_fi, 'SE': fetch_se, 'NO': fetch_no}
    ms, srcs = [], {}
    for c in a.only.split(','):
        part, src = fetchers[c](a.cache_dir)
        ms += part; srcs[c] = src
    for c in srcs:
        simplify_country([m for m in ms if m['c'] == c], a.tolerance)
    ms = [m for m in ms if m.get('sm') is not None and m['n']]
    ms.sort(key=lambda m: (m['c'], m['n']))
    entries = encode(ms)
    doc = {'v': 1, 'q': Q, 'built': datetime.date.today().isoformat(), 'tolerance_m': a.tolerance,
           'src': srcs, 'm': entries}
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw, 9)
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    with open(a.out, 'wb') as f: f.write(raw)
    nverts = sum(len(r) // 2 for e in entries for r in e['r'])
    log(f'Kirjoitettu {a.out}: {len(entries)} kuntaa, {nverts} pistettä, {len(raw)/1024:.0f} kt, gzip {len(gz)/1024:.0f} kt')
    rep = {'kuntia': len(entries), 'pisteita': nverts, 'kt': round(len(raw) / 1024), 'gzip_kt': round(len(gz) / 1024),
           'tolerance_m': a.tolerance, 'maat': {}}
    for c in srcs:
        rep['maat'][c] = accuracy(ms, entries, c)
        rep['maat'][c]['kuntia'] = sum(1 for e in entries if e['c'] == c)
    fx = border_fixtures(ms)
    for f in fx:
        e = lookup(entries, f['lon'], f['lat'])
        f['aineisto'] = e['n'] if e else None
        log('Rajapiste', f)
    if a.fixtures:
        os.makedirs(os.path.dirname(a.fixtures), exist_ok=True)
        with open(a.fixtures, 'w', encoding='utf-8') as fh:
            json.dump({'built': doc['built'], 'pisteet': fx}, fh, ensure_ascii=False, indent=1)
    log('RAPORTTI', json.dumps(rep, ensure_ascii=False))
    if a.report:
        with open(a.report, 'w', encoding='utf-8') as fh: json.dump(rep, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
