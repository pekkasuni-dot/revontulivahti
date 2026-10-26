"""VÄLIAIKAINEN: Cloudflare-ajastimen herätykset ja lokit kameroiden väliin jääneiden ajojen ympäriltä.
Ei tulosta salaisuuksia (avain vain otsakkeessa)."""
import json, os, urllib.request, datetime as D
T, A = os.environ.get('CF_TOKEN', ''), os.environ.get('CF_ACCOUNT', '')
if not T or not A: print('SALAISUUS PUUTTUU'); raise SystemExit(0)
API = 'https://api.cloudflare.com/client/v4'
def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + T, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}
MISSED = ['2026-10-23T16:30:00Z', '2026-10-24T01:10:00Z', '2026-10-24T19:50:00Z', '2026-10-24T20:00:00Z']
def iso(s): return D.datetime.fromisoformat(s.replace('Z', '+00:00'))
# 0) Avaimen oikeudet (vain nimet)
st, j = call('GET', '/user/tokens/verify'); print('TOKEN verify', st, j.get('result', {}).get('status'))
# 1) GraphQL: ajastetut herätykset
q = '''query($a:String!,$f:Time!,$t:Time!){viewer{accounts(filter:{accountTag:$a}){
 workersInvocationsScheduled(limit:50, orderBy:[datetime_ASC], filter:{datetime_geq:$f, datetime_leq:$t}){
   scriptName cron status datetime scheduledDatetime cpuTimeUs }}}}'''
for m in MISSED:
    t = iso(m); f = (t - D.timedelta(minutes=12)).strftime('%Y-%m-%dT%H:%M:%SZ'); to = (t + D.timedelta(minutes=12)).strftime('%Y-%m-%dT%H:%M:%SZ')
    st, j = call('POST', '/graphql', {'query': q, 'variables': {'a': A, 'f': f, 't': to}})
    errs = j.get('errors'); print(f'GQL {m} http {st}', 'VIRHE ' + json.dumps(errs)[:300] if errs else '')
    try:
        for r in j['data']['viewer']['accounts'][0]['workersInvocationsScheduled']:
            print('  HERÄTYS', r.get('scheduledDatetime'), 'todellinen', r.get('datetime'), r.get('status'), r.get('cron'), r.get('scriptName'), 'cpu', r.get('cpuTimeUs'))
    except Exception as e: print('  (ei dataa)', str(e)[:100])
# 2) Workers Logs (observability telemetry query)
for m in MISSED:
    t = iso(m); f = int((t - D.timedelta(minutes=12)).timestamp() * 1000); to = int((t + D.timedelta(minutes=12)).timestamp() * 1000)
    body = {'queryId': 'kamera-' + m, 'timeframe': {'from': f, 'to': to}, 'view': 'events', 'limit': 50,
            'parameters': {'datasets': ['cloudflare-workers'], 'filters': [], 'calculations': [], 'groupBys': []}}
    st, j = call('POST', f'/accounts/{A}/workers/observability/telemetry/query', body)
    print(f'LOGS {m} http {st}', '' if j.get('success') else 'VIRHE ' + json.dumps(j.get('errors'))[:300])
    try:
        ev = j['result']['events']['events']
        for e in ev:
            src = e.get('source') or {}; msg = src.get('message') if isinstance(src, dict) else src
            print('  LOKI', e.get('timestamp'), str(msg)[:400])
        if not ev: print('  (ei tapahtumia)')
    except Exception as ex: print('  (ei luettavissa)', str(ex)[:100], json.dumps(j.get('result'))[:300])
