"""Mallin ajon tunniste GRIB-tiedostosta (2026-11-12, HARMONIE).

FMI:n /download palauttaa tuoreimman ajon, ja GRIB-viestien viiteaika (cfgrib-koordinaatti 'time' =
dataDate/dataTime) on ajon alkuhetki. Tutkimus 12.-13.11.2026: viiteaika sama kaikissa 31 viestissä ja
sama kuin /timeseries-rajapinnan origintime (18.00 ja 21.00 UTC); ensimmäinen aika-askel 3-4 h myöhemmin.
Ei viiteaikaa tai useita eri viiteaikoja -> None (ei keksitä: hakuskripti julkaisee vanhassa muodossa).
"""
import datetime

import numpy as np


def run_ms(time_values):
    """cfgrib-koordinaatin 'time' arvot -> ajo millisekunteina, tai None (puuttuu / useita eri arvoja)."""
    if time_values is None:
        return None
    vals = np.unique(np.atleast_1d(np.asarray(time_values, dtype="datetime64[ms]")))
    vals = vals[~np.isnat(vals)]
    if len(vals) != 1:
        return None
    return int(vals[0].astype("int64"))


def run_iso(ms):
    """Ajo ISO-merkkijonona samassa muodossa kuin ICON-EU:n meta (2026-11-12T18:00:00+00:00)."""
    return datetime.datetime.fromtimestamp(ms / 1000, tz=datetime.timezone.utc).isoformat()


def origin_ms(s):
    """FMI:n /timeseries origintime ('20261112T180000') -> ms, tai None."""
    try:
        d = datetime.datetime.strptime(str(s).strip()[:15], "%Y%m%dT%H%M%S").replace(tzinfo=datetime.timezone.utc)
        return int(d.timestamp() * 1000)
    except (TypeError, ValueError):
        return None
