#!/usr/bin/env python3
"""Actions-artefaktien siivous (päätös 32, 2026-11-04).

Ajetaan työnkulussa artefaktit-siivous.yml. Käyttää VAIN GITHUB_TOKENia ja koskee VAIN artefakteihin
(ei välimuisteihin, ajoihin, haaroihin eikä gh-pagesiin). Vain Pythonin standardikirjasto.

  python3 artefaktit.py            # poista + yhteenveto
  DRY_RUN=1 python3 artefaktit.py  # pelkkä yhteenveto (mitä poistettaisiin)
  VERBOSE=1                        # lisäksi koko artefaktilista

Poistaa artefaktin vain, jos sen ajon status on 'completed' (queued/waiting/in_progress/pending/requested
ohitetaan aina). Sovelluspaketit (KEEP_PREFIXES, oletus 'aurora-' = APK/AAB, 'camera-probe-') jätetään
omalle retention-days-ajalleen (3 vrk), jotta ne ehtii ladata. Poiston virhe ei kaada ajoa.
"""
import json, os, time, urllib.request, urllib.error
from collections import Counter

REPO = os.environ['GITHUB_REPOSITORY']
TOKEN = os.environ['GITHUB_TOKEN']
API = os.environ.get('GITHUB_API_URL', 'https://api.github.com')
DRY = os.environ.get('DRY_RUN') == '1'
VERBOSE = os.environ.get('VERBOSE') == '1'
KEEP = [p for p in os.environ.get('KEEP_PREFIXES', 'aurora-,camera-probe-').split(',') if p]


def req(method, path):
    r = urllib.request.Request(API + path, method=method, headers={
        'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'})
    for i in range(3):
        try:
            with urllib.request.urlopen(r, timeout=20) as f:
                body = f.read()
                return f.status, (json.loads(body) if body else None)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and i < 2:
                time.sleep(2 * (i + 1)); continue
            return e.code, None
        except Exception:
            if i < 2:
                time.sleep(2 * (i + 1)); continue
            return 0, None
    return 0, None


def artifacts():
    out, page = [], 1
    while True:
        st, d = req('GET', f'/repos/{REPO}/actions/artifacts?per_page=100&page={page}')
        if st != 200 or not d:
            break
        items = d.get('artifacts') or []
        out += items
        if len(items) < 100:
            break
        page += 1
    return [a for a in out if not a.get('expired')]


RUN_STATUS = {}
def run_status(run_id):
    if run_id not in RUN_STATUS:
        st, d = req('GET', f'/repos/{REPO}/actions/runs/{run_id}')
        RUN_STATUS[run_id] = (d or {}).get('status') if st == 200 else None
    return RUN_STATUS[run_id]


def mb(b):
    return f'{b / 1e6:.1f}'.replace('.', ',')


def main():
    t0 = time.time()
    before = artifacts()
    deleted, freed, skipped, failed, rows = 0, 0, Counter(), [], []
    for a in before:
        run_id = (a.get('workflow_run') or {}).get('id')
        status = run_status(run_id) if run_id else None
        action = 'poistettu'
        if any(a['name'].startswith(p) for p in KEEP):
            action = 'ohitettu: sovelluspaketti (säilyy retention-days)'
        elif status is None:
            action = 'ohitettu: ajon tila ei tiedossa'
        elif status != 'completed':
            action = f'ohitettu: ajo {status}'
        elif DRY:
            action = 'poistettaisiin (DRY_RUN)'
        else:
            st, _ = req('DELETE', f"/repos/{REPO}/actions/artifacts/{a['id']}")
            if st == 204:
                deleted += 1; freed += a['size_in_bytes']
            else:
                action = f'virhe: HTTP {st}'
                failed.append(a)
                print(f"::warning::Artefaktin {a['name']} ({a['id']}) poisto epäonnistui: HTTP {st}")
        if action.startswith('ohitettu'):
            skipped[action.split(': ', 1)[1]] += 1
        if action.startswith('poistettaisiin'):
            skipped['DRY_RUN, ei poistettu'] += 1
        rows.append((a, status, action))

    after = before if DRY else artifacts()
    size = lambda xs: sum(x['size_in_bytes'] for x in xs)
    md = ['## Artefaktien siivous' + (' (DRY_RUN, ei poistoja)' if DRY else ''), '',
          '| | Kpl | Mt |', '|---|---:|---:|',
          f'| Ennen | {len(before)} | {mb(size(before))} |',
          f'| Poistettu | {deleted} | {mb(freed)} |',
          f'| Jälkeen | {len(after)} | {mb(size(after))} |', '']
    if skipped:
        md += ['Ohitettu:', ''] + [f'- {n} kpl: {why}' for why, n in skipped.most_common()] + ['']
    if failed:
        md += [f'Poisto epäonnistui {len(failed)} kpl (ajo jatkui, ks. varoitukset).', '']
    md.append(f'Kesto {time.time() - t0:.1f} s, ajoja tarkistettu {len(RUN_STATUS)}.')
    if VERBOSE:
        md += ['', '### Kaikki artefaktit', '', '| Nimi | Mt | Ajo | Ajon tila | Toimenpide |',
               '|---|---:|---:|---|---|']
        for a, status, action in sorted(rows, key=lambda r: -r[0]['size_in_bytes']):
            md.append(f"| {a['name']} | {mb(a['size_in_bytes'])} | {(a.get('workflow_run') or {}).get('id', '?')} "
                      f"| {status or '?'} | {action} |")
    text = '\n'.join(md) + '\n'
    print(text)
    s = os.environ.get('GITHUB_STEP_SUMMARY')
    if s:
        with open(s, 'a') as f:
            f.write(text)


if __name__ == '__main__':
    main()
