#!/usr/bin/env python3
"""Artefaktien ja välimuistien raportti + siivous (2026-11-04).

Ajetaan työnkulussa artefaktit-siivous.yml (GITHUB_TOKEN, actions: write).
  python scripts/artefaktit.py raportti <otsikko>
  python scripts/artefaktit.py poista            # poistaa kaikki voimassa olevat artefaktit,
                                                 # paitsi alle MIN_AGE_MIN vanhat (käynnissä olevat ajot)
"""
import json, os, sys, time, urllib.request, urllib.error
from collections import defaultdict
from datetime import datetime, timezone

REPO = os.environ['GITHUB_REPOSITORY']
TOKEN = os.environ['GITHUB_TOKEN']
API = 'https://api.github.com'
MIN_AGE_MIN = int(os.environ.get('MIN_AGE_MIN', '60'))


def req(method, path):
    r = urllib.request.Request(API + path, method=method, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'})
    for i in range(4):
        try:
            with urllib.request.urlopen(r, timeout=30) as f:
                body = f.read()
                return f.status, (json.loads(body) if body else None)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 500, 502, 503) and i < 3:
                time.sleep(2 ** (i + 1)); continue
            return e.code, None
    return 0, None


def paged(path, key):
    out, page = [], 1
    while True:
        sep = '&' if '?' in path else '?'
        st, d = req('GET', f'{path}{sep}per_page=100&page={page}')
        if st != 200 or not d: break
        items = d.get(key) or []
        out += items
        if len(items) < 100: break
        page += 1
    return out


RUNS = {}
def run_info(run_id):
    if run_id not in RUNS:
        st, d = req('GET', f'/repos/{REPO}/actions/runs/{run_id}')
        RUNS[run_id] = d or {}
    return RUNS[run_id]


def mb(b): return f'{b / 1e6:.1f}'


def artifacts():
    return paged(f'/repos/{REPO}/actions/artifacts', 'artifacts')


def raportti(title):
    arts = artifacts()
    live = [a for a in arts if not a.get('expired')]
    by_wf = defaultdict(lambda: [0, 0])
    lines = []
    for a in sorted(live, key=lambda a: -a['size_in_bytes']):
        run = run_info(a['workflow_run']['id']) if a.get('workflow_run') else {}
        wf = (run.get('path') or '?').split('/')[-1].split('@')[0]
        by_wf[wf][0] += a['size_in_bytes']; by_wf[wf][1] += 1
        lines.append(f"| {a['name']} | {mb(a['size_in_bytes'])} | {wf} | {run.get('run_number','?')} "
                     f"| {a['workflow_run'].get('head_branch','?') if a.get('workflow_run') else '?'} "
                     f"| {a['created_at'][:16]} | {(a.get('expires_at') or '')[:10]} |")
    total = sum(a['size_in_bytes'] for a in live)
    st, cu = req('GET', f'/repos/{REPO}/actions/cache/usage')
    caches = paged(f'/repos/{REPO}/actions/caches', 'actions_caches')
    md = [f'## {title}', '',
          f'Voimassa olevia artefakteja **{len(live)}**, yhteensä **{mb(total)} Mt** '
          f'(lisäksi {len(arts) - len(live)} vanhentunutta, eivät vie tilaa).', '',
          '### Työnkuluittain', '', '| Työnkulku | Mt | Kpl | Osuus |', '|---|---:|---:|---:|']
    for wf, (b, n) in sorted(by_wf.items(), key=lambda x: -x[1][0]):
        md.append(f'| {wf} | {mb(b)} | {n} | {100 * b / total if total else 0:.0f} % |')
    md += ['', '### Välimuistit (actions/cache)', '',
           f"Yhteensä {(cu or {}).get('active_caches_count', '?')} kpl, "
           f"{mb((cu or {}).get('active_caches_size_in_bytes', 0))} Mt", '',
           '| Avain | Mt | Haara | Käytetty |', '|---|---:|---|---|']
    for c in caches:
        md.append(f"| {c['key'][:60]} | {mb(c['size_in_bytes'])} | {c['ref']} | {c['last_accessed_at'][:16]} |")
    md += ['', '### Artefaktit (suurin ensin)', '',
           '| Nimi | Mt | Työnkulku | Ajo | Haara | Luotu | Vanhenee |', '|---|---:|---|---:|---|---|---|']
    md += lines
    text = '\n'.join(md) + '\n'
    print(text)
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        with open(s, 'a') as f: f.write(text)
    print('JSON:' + json.dumps({'title': title, 'count': len(live), 'bytes': total,
                                'by_workflow': {k: v for k, v in by_wf.items()}}))


def poista():
    now = datetime.now(timezone.utc)
    ok = skip = fail = freed = 0
    for a in artifacts():
        if a.get('expired'): continue
        age = (now - datetime.fromisoformat(a['created_at'].replace('Z', '+00:00'))).total_seconds() / 60
        if age < MIN_AGE_MIN:
            skip += 1; print(f"ohitetaan (alle {MIN_AGE_MIN} min): {a['name']}"); continue
        st, _ = req('DELETE', f"/repos/{REPO}/actions/artifacts/{a['id']}")
        if st == 204: ok += 1; freed += a['size_in_bytes']
        else: fail += 1; print(f"virhe {st}: {a['name']} ({a['id']})")
    print(f'Poistettu {ok}, ohitettu {skip}, virheitä {fail}, vapautettu {mb(freed)} Mt')
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        with open(s, 'a') as f:
            f.write(f'\n## Poisto\n\nPoistettu {ok}, ohitettu {skip} (alle {MIN_AGE_MIN} min vanhat), '
                    f'virheitä {fail}, vapautettu {mb(freed)} Mt\n\n')
    if fail: sys.exit(1)


if __name__ == '__main__':
    if sys.argv[1] == 'raportti': raportti(' '.join(sys.argv[2:]) or 'Raportti')
    elif sys.argv[1] == 'poista': poista()
