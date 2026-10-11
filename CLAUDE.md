# Revontulivahti

## Mikä tämä on
PWA (Progressive Web App), joka näyttää kartalla revontulien
todennäköisyyden ja pilviennusteen Suomessa. Kohderyhmä:
revontulioppaat ja -harrastajat. Julkaistaan GitHub Pagesissa.

## Tekninen pino
- Puhdas selainsovellus, ei omaa palvelinta eikä tietokantaa.
- Kartta: MapLibre GL JS (WebGL).
- Data haetaan valmiiksi tiedostoiksi GitHub Actionsilla, selain
  lukee ne staattisina tiedostoina:
  - Pilvidata, useita malleja (ks. `CLOUD_MODELS`-rekisteri index.html:ssä,
    käyttäjä valitsee mallinvalitsimesta, kaikki pilvisyysnäytöt — kartta,
    klikkausmerkki, alapaneeli — lukevat AINA valitun mallin samasta hilasta):
    - **ECMWF IFS** (oletus): `scripts/fetch-clouds.py` → `data/clouds-ecmwf.json`.
      Alue 55-75 °N, 30 °W-60 °E, 0,25° resoluutio molemmilla akseleilla
      (ECMWF Open Data -ilmaisdatan paras saatavilla oleva tarkkuus),
      17 aika-askelta 3 h välein (0-48 h). ~2,05 Mt. Lähde: ensisijaisesti
      ECMWF:n oma portaali, lyhyellä uudelleenyrityksellä automaattinen
      varalähde (Azure → AWS) jos paaportaali ei vastaa — kaytetty lähde
      kirjataan JSON:iin (`source`-kentta) ja lokiin.
    - **ICON-EU (DWD)**: `scripts/fetch-clouds-icon_eu.py` → `data/clouds-icon_eu.json`,
      suoraan `opendata.dwd.de`:n GRIB2-tiedostoista (EI Open-Meteon kautta —
      kokeiltu, vaihdettu pois kaupallisen käytön rajoituksen ja kattavuus-
      ongelmien takia). Alue 55-70,5 °N (ICON-EU:n oma pohjoisraja, ei pääse
      75 °N:ään), koko natiivi pituusastealue, 0,25° (lohkokeskiarvo natiivista
      0,0625°:sta — EI yksittäisen pisteen poiminta, ks. alla), 13 askelta 1 h
      välein (0-12 h). ~4,1 Mt.
    - **HARMONIE (FMI)**: `scripts/fetch-clouds-harmonie.py` → `data/clouds-harmonie.json`,
      suoraan `opendata.fmi.fi`:n `/download`-rajapinnasta (yksi HTTP-kutsu
      palauttaa kaikki aika-askeleet kerralla). Tarkin malli: natiivi
      ~0,0225° (~2,5 km), alinäytteistetty 2×2-lohkokeskiarvolla ~0,045°:een
      (~5 km) tiedostokoon takia. Alue 59-70 °N, 19-32 °E (Suomi + pieni
      marginaali — FMI:n tuotteen luonnollinen jakelualue, ei ulotu esim.
      Tromssaan). 13 askelta 1 h välein (0-12 h). ~3,8 Mt. v1: vain
      kokonaispilvisyys, ei korkeuserittelyä (`hasLayers:false`).
    - Lisää malli = yksi määrittely `CLOUD_MODELS`-rekisteriin + oma
      fetch-skripti + oma GH Actions -workflow.
  - Revontulet: NOAA SWPC OVATION, ovation_aurora_latest.json
    (nowcast, päivittyy ~5 min välein)

## Opitut sudenkuopat (pilvihilan rakentaminen/piirto)
- **WebGL `UNPACK_ALIGNMENT`:** `texImage2D`-lataus LUMINANCE-tekstuurille
  olettaa oletuksena 4 tavun rivitäytteen. Jos hilan leveys (`nlon`) ei ole
  jaollinen 4:llä (esim. 345, 361, 290 — mutta EI esim. 720), kuva vääristyy
  kumulatiivisesti rivi riviltä. Korjaus: `gl.pixelStorei(gl.UNPACK_ALIGNMENT,1)`
  **joka kerta juuri ennen** `texImage2D`-kutsua (ei riitä kerran — MapLibre
  piirtää muita tasoja samalla kontekstilla välissä ja nollaa tilan).
- **GRIB2:n pituusastekonventio vaihtelee:** joskus natiivi 0..359,75,
  joskus -180..179,75 — näyttää riippuvan lähteestä/ajosta eikä ole
  luotettavasti pääteltävissä etukäteen. Kun hila rajataan osa-alueeseen
  (ei koko maailmaa), normalisoi pituusasteet ENSIN `((lon+180)%360)-180`
  -kaavalla ennen suodatusta/järjestämistä — älä oleta kumpaa konventiota
  kulloinen GRIB-vastaus käyttää.
- **Alinäytteistys = lohkokeskiarvo, ei pisteen poiminta:** kun natiivihila
  pelkistetään harvemmaksi (esim. ICON-EU 0,0625°→0,25°), laske aina
  STRIDE×STRIDE-lohkon KESKIARVO, ei poimi yksittäistä pistettä — yksittäisen
  pisteen poiminta aliasoi jyrkät rajat jopa 20 %-yksikön virheellä.
- Kaikki tämä on dokumentoitu yksityiskohtaisesti `MUISTIO-mallit.md`:ssä
  (mm. PNG-todennukset, synteettiset testikuviot, pistevertailut raakaan
  GRIB2-dataan) — katso se ennen pilvihilaan koskemista.

## Reunaehdot
- EI käyttäjätilejä eikä tietokantaa tässä vaiheessa. Pidetään
  kevyenä.
- EI maksullisia / API-avainta vaativia palveluita. Kaikki
  avoimista, avaimettomista lähteistä.
- OVATION-data on nowcast (vain nykyhetki) — sitä EI ekstrapoloida
  tulevaisuuteen.
- OVATION-kenttä piirretään raakadatana, ei interpolointia.

## Työtavat
- Älä koske main-haaraan suoraan. Tee muutokset omaan haaraan.
- Pieniä, selkeitä committeja per looginen muutos.
- Jos jokin on epäselvä, jätä se tekemättä ja merkitse
  koodikommentilla — älä arvaa.
- Älä muuta datan hakua (fetch-skriptit, Actions), ellei
  tehtävä sitä nimenomaan vaadi.
