# Revontulivahti (MVP)

**Sovellus:** https://pekkasuni-dot.github.io/revontulivahti/

Mobiili edellä rakennettu PWA-karttasovellus: revontulien näkyvyysindeksi, joka yhdistää revontuliaktiivisuuden (NOAA OVATION + Kp), pilvisyyden (Open-Meteo, kerroksittain) ja pimeyden (auringon korkeus, lasketaan selaimessa).

## Sisältö

| Tiedosto | Tarkoitus |
|---|---|
| `index.html` | Koko sovellus (kartta, laskenta, käyttöliittymä) |
| `manifest.webmanifest` | PWA-asennus (kotivalikkoon lisääminen) |
| `sw.js` | Service worker: sovelluksen runko toimii offline, data haetaan aina verkosta |
| `icons/` | Sovelluskuvakkeet |

## Julkaisu GitHub Pagesiin (ilmainen)

**HUOM (2026-10, korjattu repon kasvu):** Pages-lähde on `gh-pages`-haara,
EI `main`. `main` sisältää vain sovelluskoodin (ei dataa) — data-
työnkulut (pilvidata-\*/wind-\*/camera-status) julkaisevat haetun datan
suoraan `gh-pages`-haaraan yhtenä tiivistettynä committina kerrallaan
(ks. `.github/actions/publish-pages`, `CLAUDE.md`). `main`:in commitointi
olisi kasvattanut repon kokoa rajatta (satoja megatavuja/vrk).

1. Luo uusi julkinen repositorio GitHubissa, esim. `revontulivahti`.
2. Lataa kaikki tämän kansion tiedostot `main`-haaraan (myös `icons/`-kansio).
3. Repon asetuksissa: **Settings → Pages → Source: Deploy from a branch → gh-pages / (root) → Save**.
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
- **ECMWF Open Data** (`data.ecmwf.int`) — globaali pilviennuste (IFS, TCC-kenttä), 0,25° × 0,5° ruudukko, 55–75 °N, 48 h, 3 h askelväli. **Lisenssi: CC BY 4.0 — lähde on mainittava.** Hakee GitHub Actions (`scripts/fetch-clouds.py`) 4× vrk ja tallentaa `data/clouds-ecmwf.json`-tiedostoon. (Ks. myös `MUISTIO-mallit.md` — sovelluksessa on tätä kirjoitettaessa valittavana myös ICON-EU-malli.)
- **Open-Meteo** (`api.open-meteo.com`) — tuntikohtainen pilvisyys kerroksittain (ala/keski/ylä) valitulle pisteelle. Ilmainen ei-kaupalliseen käyttöön 10 000 kutsua/vrk; kaupallinen lisenssi alkaen ~29 €/kk kun ansainta alkaa.
- **Esri Canvas -taustakartat** (tumma: `World_Dark_Gray_Base/Reference`; vaalea: yksivärinen `#8f7f44`-pohja + `World_Light_Gray_Reference`-nimitaso) ja **Esri World Imagery** (satelliitti) — avaimettomat, ilmaiset `server.arcgisonline.com`-tiilipalvelut, attribuutio pakollinen (on mukana). Aiemmin käytetty CARTOn `basemaps.cartocdn.com`-tiilet alkoivat vaatia API-avaimen, vaihdettu siksi pois. Isommilla käyttäjämäärillä vaihdetaan esim. MML:n avoimiin taustakarttoihin tai omaan tiilipalveluun.

## Miten indeksi lasketaan

```
näkyvyys = revontulitodennäköisyys × pilvettömyys × pimeys
```

- **Revontulet:** "Nyt"-tilassa suoraan OVATION-hilasta valitun pisteen kohdalta (+ katsotaan hieman pohjoisemmaksi, koska ovaali voi näkyä horisontissa). Tulevat tunnit: karkea arvio Kp-ennusteesta ja pisteen geomagneettisesta leveysasteesta — merkitty käyttöliittymässä arvioksi (*).
- **Pilvettömyys:** alapilvet painolla 0,95, keskipilvet 0,65, yläpilvet 0,30 (ohuen yläpilven läpi revontulet erottuvat osittain).
- **Pimeys:** auringon korkeus lasketaan selaimessa; yli −6° = liian valoisaa, alle −12° = täysi pimeys, välissä liukuma. Heinäkuussa Oulun korkeudella indeksi on rehellisesti 0 — sovellus kertoo sen ja mainitsee kauden alkavan elo–syyskuussa.

## Pilvikerros (v1.3)

Koko kartan pilvirasteri rakennetaan Open-Meteon ruudukosta: 323 pistettä (19×17, n. 58–71°N / 12–36°E, ~70–80 km silmäväli), 48 h tunneittain, haetaan viidessä erässä käynnistyksessä ja päivitetään tunnin välein. Rasteri interpoloidaan selaimessa (smoothstep-pehmennetty bilineaarinen, Mercator-korjattu, kontrastikäyrä ja reunahäivytys) ja aikakelaus liikuttaa pilviä välittömästi ilman uusia latauksia. Pilvinapista kerroksen saa pois päältä.

Kuormitushuomio: yksi sovelluksen avaus kuluttaa ~320 "kutsua" Open-Meteon 10 000/vrk ilmaiskiintiöstä — riittää nykykäyttöön, mutta käyttäjämäärien kasvaessa väliin tarvitaan oma välimuistipalvelin tai siirtymä FMI:n HARMONIE-rasteriin (WMS), joka on samalla tarkkuusparannus.

Päivitysmekanismi (v1.3): sovellus tarkkailee uutta versiota itse ja näyttää "Uusi versio saatavilla — päivitä" -napin; välimuistin käsintyhjennystä ei enää tarvita.

## Pilvidataputki ja pilvimallit (v1.9 → mallinvalitsin)

Pilviruudukkoa ei haeta käyttäjien selaimista, vaan GitHub Actions hakee sen etukäteen ja committaa esikäsitellyn hilatiedoston repoon. Jokaisella pilvimallilla on oma hakuskripti ja oma GH Actions -työnkulku (ks. `MUISTIO-mallit.md` tarkemmat perusteet, resoluutiot ja päivitysvälit):

| Malli | Skripti | Työnkulku | Tiedosto | Resoluutio |
|---|---|---|---|---|
| ECMWF IFS (oletus) | `scripts/fetch-clouds.py` | `pilvidata-ecmwf.yml` | `data/clouds-ecmwf.json` | 0,25° (~28 km) |
| ICON-EU (DWD, suoraan opendata.dwd.de) | `scripts/fetch-clouds-icon_eu.py` | `pilvidata-icon_eu.yml` | `data/clouds-icon_eu.json` | 0,25° (~7 km natiivi, lohkokeskiarvo) |
| HARMONIE (FMI, opendata.fmi.fi) | `scripts/fetch-clouds-harmonie.py` | `pilvidata-harmonie.yml` | `data/clouds-harmonie.json` | ~0,045° (~5 km, natiivi ~2,5 km) — tarkin |

Käyttäjä valitsee mallin sovelluksen "Pilvimalli"-valitsimesta (muistetaan localStoragessa). **Kaikki** pilvisyyttä näyttävät kohdat — kartan pilvitaso, klikkausmerkin prosenttiluku ja alapaneelin "Pilvetön taivas" -indeksi — lukevat aina valitun mallin samasta hilasta, eivät enää erillisistä/ristiriitaisista lähteistä.

Käyttöönotto vaatii kertaalleen per repo: **Settings → Actions → General → Workflow permissions → "Read and write permissions" → Save** (jotta työt saavat committata dataa), ja ensimmäinen ajo kummallekin käynnistetään **Actions-välilehti → kyseinen työnkulku → Run workflow**.

## Seuraavat askeleet

- FMI:n HARMONIE-pilvidata (WMS) korkearesoluutioisena vaihtoehtona nykyiselle ruudukolle.
- Push-ilmoitukset ("näkyvyys ylitti kynnyksen sijainnissasi") vaativat pienen palvelinkomponentin — tehdään ennen kauppajulkaisua.
- Capacitor-paketointi Play-kauppaan ja App Storeen samasta koodipohjasta.
- FMI:n magnetometridata (paikallinen aktiivisuus) OVATIONin rinnalle.
