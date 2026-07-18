# Revontulivahti (MVP)

Mobiili edellä rakennettu PWA-karttasovellus: revontulien näkyvyysindeksi, joka yhdistää revontuliaktiivisuuden (NOAA OVATION + Kp), pilvisyyden (Open-Meteo, kerroksittain) ja pimeyden (auringon korkeus, lasketaan selaimessa).

## Sisältö

| Tiedosto | Tarkoitus |
|---|---|
| `index.html` | Koko sovellus (kartta, laskenta, käyttöliittymä) |
| `manifest.webmanifest` | PWA-asennus (kotivalikkoon lisääminen) |
| `sw.js` | Service worker: sovelluksen runko toimii offline, data haetaan aina verkosta |
| `icons/` | Sovelluskuvakkeet |

## Julkaisu GitHub Pagesiin (ilmainen)

1. Luo uusi julkinen repositorio GitHubissa, esim. `revontulivahti`.
2. Lataa kaikki tämän kansion tiedostot repoon (myös `icons/`-kansio).
3. Repon asetuksissa: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
4. Muutaman minuutin päästä sovellus on osoitteessa `https://<käyttäjätunnus>.github.io/revontulivahti/`.
5. Avaa osoite puhelimella → selaimen valikosta "Lisää aloitusnäyttöön" → sovellus asentuu PWA:na.

HTTPS tulee GitHub Pagesista automaattisesti, mikä on edellytys paikannukselle ja service workerille.

## Paikallinen testaus

Suoraan tiedostosta avaaminen (`file://`) ei toimi kunnolla. Käynnistä kevyt palvelin kansiossa:

```
python -m http.server 8080
```

ja avaa `http://localhost:8080`. (Paikannus toimii localhostissa ilman HTTPS:ää.)

## Datalähteet ja niiden ehdot

- **NOAA SWPC** (`services.swpc.noaa.gov`) — OVATION-ovaali (päivittyy ~5 min välein, kattaa nykyhetken +30–90 min) ja Kp-indeksi ennusteineen. Yhdysvaltain valtion avointa dataa, ei avainta, ei käyttörajaa käytännössä.
- **Open-Meteo** (`api.open-meteo.com`) — tuntikohtainen pilvisyys kerroksittain (ala/keski/ylä). Ilmainen ei-kaupalliseen käyttöön 10 000 kutsua/vrk; kaupallinen lisenssi alkaen ~29 €/kk kun ansainta alkaa.
- **CARTO dark -taustakartta** — ilmainen pienimuotoiseen käyttöön, attribuutio pakollinen (on mukana). Isommilla käyttäjämäärillä vaihdetaan esim. MML:n avoimiin taustakarttoihin tai omaan tiilipalveluun.

## Miten indeksi lasketaan

```
näkyvyys = revontulitodennäköisyys × pilvettömyys × pimeys
```

- **Revontulet:** "Nyt"-tilassa suoraan OVATION-hilasta valitun pisteen kohdalta (+ katsotaan hieman pohjoisemmaksi, koska ovaali voi näkyä horisontissa). Tulevat tunnit: karkea arvio Kp-ennusteesta ja pisteen geomagneettisesta leveysasteesta — merkitty käyttöliittymässä arvioksi (*).
- **Pilvettömyys:** alapilvet painolla 0,95, keskipilvet 0,65, yläpilvet 0,30 (ohuen yläpilven läpi revontulet erottuvat osittain).
- **Pimeys:** auringon korkeus lasketaan selaimessa; yli −6° = liian valoisaa, alle −12° = täysi pimeys, välissä liukuma. Heinäkuussa Oulun korkeudella indeksi on rehellisesti 0 — sovellus kertoo sen ja mainitsee kauden alkavan elo–syyskuussa.

## Tietoinen rajaus MVP:ssä (seuraavat askeleet)

- Pilvisyys näkyy nyt vain valitun pisteen lukuina — Windy-tyylinen pilvirasteri aikakelauksella kartalle (FMI:n avoin WMS) on seuraava iso ominaisuus.
- Push-ilmoitukset ("näkyvyys ylitti kynnyksen sijainnissasi") vaativat pienen palvelinkomponentin — tehdään ennen kauppajulkaisua.
- Capacitor-paketointi Play-kauppaan ja App Storeen samasta koodipohjasta.
- FMI:n magnetometridata (paikallinen aktiivisuus) OVATIONin rinnalle.
