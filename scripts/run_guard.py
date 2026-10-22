"""Keskeneräinen mallinajo (2026-10-22, KATSELMOINTI 1.13).

Hakuskriptit julkaisevat mallin ajon vasta, kun KAIKKI sen askeleet ovat
saatavilla. Jos uusin ajo on vielä keskeneräinen:
  - ICON-EU (DWD, ajot hakemistoissa): käytetään uusinta TÄYDELLISTÄ ajoa
    (pick_complete_run). Sama kuin ECMWF:n ecmwf-opendata-kirjaston latest(),
    joka tarkistaa kaikki pyydetyt askeleet.
  - HARMONIE (FMI /download, ei ajonvalintaa) ja varmistuksena kaikki muut:
    askelmäärä tarkistetaan purun jälkeen (require_steps). Vajaa ajo ->
    keep_previous(): EI tiedostoja, poistetaan jo kirjoitetut, lokiin
    merkintä ja exit 0 -> työnkulku ei kaadu, publish ei julkaise mitään ja
    edellinen täydellinen ajo säilyy gh-pagesilla. Seuraava ajokerta yrittää
    uudelleen.
Vain stdlib - testataan ilman riippuvuuksia (tests/test_run_guard.py).
"""
import glob
import os
import sys
from concurrent.futures import ThreadPoolExecutor


class IncompleteRun(Exception):
    """Ajo ei ole (vielä) kokonaan julkaistu."""


def missing_urls(urls, exists, workers=16):
    """Palauttaa listan puuttuvista osoitteista (HEAD rinnakkain)."""
    urls = list(urls)
    with ThreadPoolExecutor(max_workers=workers) as ex:
        ok = list(ex.map(exists, urls))
    return [u for u, k in zip(urls, ok) if not k]


def pick_complete_run(candidates, urls_for, exists, log=print):
    """candidates = ajot uusimmasta vanhimpaan. Palauttaa uusimman ajon, jonka
    KAIKKI tiedostot (urls_for(ajo)) ovat olemassa. Ohitetut keskeneräiset
    ajot kirjataan lokiin. Jos yksikään ajo ei ole täydellinen mutta jokin on
    osittain julkaistu -> IncompleteRun; jos mitään ei löydy -> LookupError."""
    partial = []
    for run in candidates:
        urls = list(urls_for(run))
        miss = missing_urls(urls, exists)
        if not miss:
            if partial:
                notice('Uusin ajo keskeneräinen', ', '.join(f"{r} ({m}/{n} puuttuu)" for r, m, n in partial)
                       + f" -> käytetään edellistä täydellistä ajoa {run}")
            return run
        log(f"  Ajo {run}: {len(miss)}/{len(urls)} tiedostoa puuttuu (esim. {miss[0]})")
        if len(miss) < len(urls):
            partial.append((run, len(miss), len(urls)))
    if partial:
        raise IncompleteRun(f"ei täydellistä ajoa; osittain julkaistu: {partial[0][0]}")
    raise LookupError("yhtään ajoa ei löytynyt")


def require_steps(got, expected, what="aika-askelta"):
    """Vajaa askelmäärä -> IncompleteRun."""
    if got < expected:
        raise IncompleteRun(f"vain {got}/{expected} {what}")


def notice(title, msg):
    # GitHub Actionsin merkintä (näkyy ajon yhteenvedossa), ei virhe.
    print(f"::notice title={title}::{msg}", flush=True)


def keep_previous(model, reason, cleanup=()):
    """Ei julkaista: poistaa tämän ajon jo kirjoitetut tiedostot, kirjaa
    merkinnän ja lopettaa onnistuneesti (exit 0)."""
    removed = 0
    for pattern in cleanup:
        for f in glob.glob(pattern):
            os.remove(f)
            removed += 1
    notice('Keskeneräinen ajo',
           f"{model}: {reason}. Edellinen täydellinen ajo säilyy julkaistuna; "
           f"yritetään uudelleen seuraavalla ajokerralla."
           + (f" (poistettu {removed} osittaista tiedostoa)" if removed else ""))
    sys.exit(0)
