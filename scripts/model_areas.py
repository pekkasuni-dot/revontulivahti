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
# Sama alue jota pilvi-HARMONIE on kayttanyt alusta asti (Suomi + pieni
# marginaali). HUOM: tuulihaku kaytti VALIAIKAISESTI laajempaa aluetta
# (ks. MUISTIO-korkeudet-tuuli.md "Tuulialueen laajennus") ennen tata
# tehtavaa, mutta se laajennus PERUTTIIN tassa koska vaatimus "sama alue
# kuin pilvilla" on tarkeampi kuin "mahdollisimman laaja alue" - eri
# alueet pilvella/tuulella olisi johtanut juuri siihen ongelmaan jota
# tama koko tehtava yrittaa korjata (tasot eivat osu paallekkain).
HARMONIE_BBOX = "19,59,32,70"
