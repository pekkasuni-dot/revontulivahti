"""
Yhteiset aluemaaritykset pilvi- JA tuulihaulle, per malli - YKSI lahde
totuudelle per malli, jotta pilvi- ja tuulitasot pysyvat AINA tasan
samalla alueella eivatka voi erkaantua toisistaan myohemmin (ks.
tehtavananto "Mallinvalitsin koskemaan myos tuulta", CLAUDE.md).

Tuo tama moduuli SEKA fetch-clouds-<malli>.py etta fetch-wind-<malli>.py
-skripteista - ALA kopioi naita lukuja erikseen kahteen paikkaan.

HUOM ICON-EU: pituusastetta EI rajata kiintealla vakiolla - molemmat
(pilvi- ja tuuli-) skriptit kayttavat DWD:n koko natiivia pituusastealuetta
sellaisenaan (luetaan GRIB-tiedostosta ajonaikaisesti), joten lon0/lon1
tasmaavat AUTOMAATTISESTI ilman erillista jaettua vakiota - vain
leveysasteraja (ICON_EU_LAT0/LAT1) on jaettu tassa.
"""

# ECMWF: koko bbox kiintea (lon0, lat0, lon1, lat1) - sama kuin alunperin
# pilville maaritelty alue (scripts/fetch-clouds.py).
ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1 = -30.0, 55.0, 60.0, 75.0

# ICON-EU: vain leveysasteraja jaettu (ks. docstring ylla) - ICON-EU:n oma
# pohjoisraja on 70,5 N, ei pääse ECMWF:n 75 N:ään asti.
ICON_EU_LAT0, ICON_EU_LAT1 = 55.0, 70.5

# HARMONIE: FMI:n /download-rajapinnan bbox-parametri (lon0,lat0,lon1,lat1).
# LAAJENNETTU (2026-10): koko Skandinavian kattava, HARMONIEn OMAN
# natiivialueen suurin NaN-vapaa suorakulmio (ks. MUISTIO-korkeudet-
# tuuli.md "Tuulialueen laajennus" - alue testattu/todennettu 0 NaN-
# solua). Aiemmin tuuli kaytti TATA LAAJAA aluetta, mutta pilvi-HARMONIE
# oli jaanyt vanhaan, kapeaan Suomi-rajaukseen ("19,59,32,70") - kun
# aluevakio sitten yhdistettiin yhteen paikkaan (model_areas.py), tuuli
# KAVENNETTIIN VAHINGOSSA pilvien vanhaan kapeaan alueeseen sen sijaan
# etta pilvet olisi LAAJENNETTU tuulen laajaan alueeseen. Korjattu:
# molemmat kayttavat nyt TATA laajaa aluetta - tiedostokoko kasvaa
# karkeasti alueen pinta-alan suhteessa (~4,6x, ks. MUISTIO), mutta
# "koko Skandinavia katettuna" on tarkeampi kuin tiedostokoko.
HARMONIE_BBOX = "-1,55,35,73.5"
