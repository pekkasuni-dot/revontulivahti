# Repon muuttaminen yksityiseksi – vaikutusselvitys
> Laadittu 2026-11-15 (haara `claude/awesome-planck-zu66l9`). Vain selvitys, ei koodimuutoksia.
> Pohja päätökselle ja ARCHITECTURE.md-kirjaukselle (vrt. päätös 33: repo on nyt julkinen Pagesin takia).

## Tiivistelmä
- **Sovellus ei hae mitään raw.githubusercontent.comista eikä api.github.comista.** Kaikki oma data tulee
  osoitteesta `pekkasuni-dot.github.io/revontulivahti/` (gh-pages). Jos repo on yksityinen eikä Pagesia ole,
  **kaikki säädata katkeaa** (pilvet, tuuli, sumu, kerrokset, 7 vrk, kamerat, YouTube-upotus, Dev-latain).
  NOAA, satelliitti (Worker + R2), karttapohja ja YouTube toimivat edelleen.
- GitHub Pro (4 $/kk) palauttaa Pagesin yksityisestä reposta. Pages-sivu on silloinkin julkinen, joten
  sovellus toimii ennallaan.
- **Actions-minuutit ovat ongelma:** nykyinen ajotapa vie arviolta **~25 400 min/kk** (datatyönkulut
  ~22 300 + iOS ×10 ~3 000). Pro antaa 3 000 min/kk ja Free 2 000 min/kk. Jos Pagesin oma julkaisutyönkulku
  laskutetaan (epävarma), kulutus on ~44 600 min/kk. Yksityisenä ylitys maksaisi ~135–330 $/kk, ja
  oletusbudjetilla (0 $) datahaut pysähtyisivät noin 3,5 päivässä.
- **Vaihtoehdot:** A (Pro, muu ennallaan) ≈ 60–185 $/kk, 0,5–3 päivää työtä;
  B (Cloudflare) ≈ 10–20 $/kk, 11–14 päivää työtä.
- **Pagesin kaista riittää** noin 1 000 päivittäiseen käyttäjään asti (tyypillinen käyttö ~90 GB/kk);
  10 000 käyttäjällä raja (100 GB/kk) ylittyy moninkertaisesti.
- Lisäksi katkeaa: käyttöehtojen ja tietosuojaselosteen linkit (`PRO_LINKS`, github.com/…/blob/…) ja
  Aurora Dev -APK:n pysyvä latauslinkki (Releases).

## 1. Ajonaikaiset hakuosoitteet

Merkintä "Katkeaa?" = katkeaako haku, jos repo on yksityinen **eikä Pagesia ole** (ei GitHub Proa).

### 1a. github.io (gh-pages)
Sovelluskuori on paketoitu kauppasovellukseen (`scripts/build-app.mjs`), mutta data haetaan aina
`DATA_BASE` = `https://pekkasuni-dot.github.io/revontulivahti/` + polku (`dataUrl()`, index.html).

| Osoite (polku DATA_BASEn alla) | Käyttö | Katkeaa? |
|---|---|---|
| `data/clouds-<malli>-meta.json`, `-stepNN.json` (ecmwf, harmonie, icon_eu, edited) | Pilvet kartalla, lippu, Nyt, Tänä yönä | **Kyllä** |
| `data/clouds-ecmwf.json` | Varapolku, jos metaa ei ole | **Kyllä** |
| `data/clouds-<malli>-layers-stepNN.json` | Ala-/keski-/yläpilvet (Pro) | **Kyllä** |
| `data/clouds-<malli>-fog-stepNN.json` (harmonie, icon_eu) | Sumu (Pro) | **Kyllä** |
| `data/wind-<malli>-<taso>-meta.json`, `-stepNN.json`, `wind-ecmwf-<taso>.json` | Tuulihiukkaset, lipun tuulirivi | **Kyllä** |
| `data/e7d-<r>-<c>.json` | 7 vrk -välilehti | **Kyllä** |
| `data/cameras.json`, `data/camera-status.json` | Kamerataso, kamerakortti | **Kyllä** |
| `embed/youtube.html?id=…` | YouTube-upotus sovelluksessa (virhe 153:n kierto) | **Kyllä** |
| `esikatselu/luettelo.json` + koko sovellus (main / `esikatselu/<haara>/`) | Aurora Dev -latain (`scripts/app-dev-loader.html`) | **Kyllä** (Dev-versio ei käynnisty) |
| Verkkoversio (index.html, sw.js, lib/, vendor/ …) | Vain kehitys ja testaus | **Kyllä** |

### 1b. github.com (ei raw eikä api)
| Osoite | Käyttö | Katkeaa? |
|---|---|---|
| `github.com/pekkasuni-dot/revontulivahti/blob/main/docs/luonnokset/KAYTTOEHDOT-luonnos.md` ja `…/TIETOSUOJASELOSTE-luonnos.md` (`PRO_LINKS`, index.html) | Pro-ikkunan käyttöehdot ja tietosuojaseloste | **Kyllä**, myös GitHub Prolla (yksityinen blob = 404). Pitää siirtää julkiseen osoitteeseen ennen julkaisua joka tapauksessa (Apple 3.1.2). |
| `github.com/…/releases/download/aurora-dev/aurora-dev.apk` (android-dev.yml, OHJE-kaupat.md) | Aurora Dev -APK:n latauslinkki puhelimeen | **Kyllä**, myös Prolla (yksityisen repon Releases vaatii kirjautumisen). |
| `raw.githubusercontent.com` | Ei käytössä missään ajonaikaisessa koodissa | – |
| `api.github.com` | Ei sovelluksessa. Vain ajastin-Worker (ks. 1c) | – |

### 1c. Cloudflare
| Osoite | Käyttö | Katkeaa? |
|---|---|---|
| `https://auroraawesome-satelliitti.pekka-suni.workers.dev/sat/ir105/latest.json` + `.png` (`SAT_API`) | Satelliittikuva; Worker hakee EUMETViewistä 5 min välein R2-säilöön `auroraawesome-sat` | Ei |
| `https://aurora-palaute.pekka-suni.workers.dev/v1/palaute` (`ALERT_FB`) | Hälytysten palaute, tallennus Workers KV `PALAUTE` | Ei |
| Ajastin-Worker `auroraawesome-ajastin` (cron */5) → `api.github.com/repos/…/actions/workflows/<wf>/runs` ja `/dispatches` | Käynnistää datatyönkulut ja `palaute.yml`:n | Ei: avain `GH_DISPATCH_TOKEN` on fine-grained ja rajattu tähän repoon (OHJE-ajastin.md), toimii myös yksityisessä repossa. Minuutit kuitenkin laskutetaan (ks. 2). |
| Ajastin `/palaute` (vanha ntfy-palaute) | Kenttätestin jäänne | Ei |

### 1d. Ulkoiset rajapinnat (sovellus suoraan)
Kaikki toimivat ennallaan, koska ne eivät riipu reposta.

| Lähde | Osoitteet |
|---|---|
| NOAA SWPC | `services.swpc.noaa.gov/json/ovation_aurora_latest.json`, `json/planetary_k_index_1m.json`, `json/rtsw/rtsw_mag_1m.json`, `rtsw_wind_1m.json`, `products/noaa-planetary-k-index.json`, `…-forecast.json`, `products/solar-wind/*` (vara), `products/geospace/propagated-solar-wind-1-hour.json`, `text/aurora-nowcast-hemi-power.txt`, `text/27-day-outlook.txt` |
| OpenFreeMap | `tiles.openfreemap.org/planet` (vektoritiilet), `tiles.openfreemap.org/fonts` |
| AWS Terrain Tiles | `s3.amazonaws.com/elevation-tiles-prod/terrarium` (maastovarjostus) |
| EUMETSAT | `view.eumetsat.int/geoserver/wms` ja `/ows` (vain verkkoversio ja testikäännös `SAT_DIRECT`, tuotannossa Worker) |
| YouTube | `i.ytimg.com/vi/<id>/hqdefault_live.jpg`, `www.youtube.com/oembed`, `youtube-nocookie.com/embed` (upotussivun kautta) |
| Still-kamerat | omistajien kuvaosoitteet `data/cameras.json`:sta (`image.url`) |
| Kartta-kirjaston vara | `unpkg.com/maplibre-gl`, `cdn.jsdelivr.net/npm/maplibre-gl` (vain jos `lib/` puuttuu) |
| Reittiohjeet | `maps://`, `comgooglemaps://`, `waze://`, `geo:`, `google.com/maps/dir` (ulkoiset sovellukset) |
| FCM | Firebase-lisäosa (natiivi), ei repoon sidottu |

Esrin ilmakuvatiilet poistettu 11.11. (päätös 44). Open-Meteota ei käytetä.

Taustahaut (Actions, eivät sovelluksen ajonaikaisia): ECMWF Open Data (+ AWS-vara), DWD `opendata.dwd.de`,
FMI `opendata.fmi.fi`, NOAA, YouTube `/streams`, METAR, FCM HTTP v1. Nämä toimivat yksityisestäkin reposta.

## 2. Työnkulut ja Actions-minuutit

**Laskutus yksityisessä repossa:** jokainen job pyöristetään ylöspäin täyteen minuuttiin, ohitettu job = 0.
macOS-minuutti kuluttaa kiintiötä 10-kertaisesti. Free 2 000 min/kk (jaettu Karttasovelluksen ja suni-ui:n
kanssa, Karttasovellus vei jo 1 805 min lokakuussa, päätös 33), Pro 3 000 min/kk.

**Mittaus:** ajohistoria GitHubista 15.11. (vain luku). API palautti valmiit ajot vain 14.11. klo 15.25 UTC
alkaen (vanhemmat poistettu), joten ajomäärät ovat yhden todellisen vuorokauden (14.11. 15.26 – 15.11. 15.26 UTC)
mukaan. Kesto = jobien alku- ja loppuaika (ei jonotusaikaa).

| Työnkulku | Käynnistys | Ajoja / vrk | Laskutettava min / ajo (jobit) | Kesto min | min / kk |
|---|---|---|---|---|---|
| camera-status | Worker 10 min + vara 1 h | 144 + 4 | 2 (fetch 1, publish 1) / vara 1 | 0,8 | **8 760** |
| wind-icon_eu | Worker 3 h + vara 6 h | 8 + 3 | ~14,6 (4 fetch × 4–5, publish 1) / 1 | 3,8 | **3 590** |
| pilvidata-icon_eu | Worker 3 h + vara 6 h | 8 + 3 | ~7,2 (fetch 6–11, publish 1) / 1 | 6,3 | 1 820 |
| pilvidata-edited | Worker 1 h + vara 6 h | 24 + 3 | ~2,2 / 1 | 1,3 | 1 680 |
| alert-fcm | Worker 30 min + vara 1 h | 48 + 4 | 1 / 1 | 0,3 | 1 560 (vaihtelee pimeyden mukaan) |
| wind-harmonie | Worker 3 h + vara 6 h | 8 + 3 | ~5,4 (4 fetch × 1–2, publish 1) / 1 | 1,4 | 1 390 |
| ennustevertailu | Worker 1 h + vara 1 h | 24 + 4 | 1 / ~1,5 | 0,4 | 900 (väliaikainen, päättyy 15.12.) |
| pilvidata-harmonie | Worker 3 h + vara 6 h | 8 + 3 | 3 (fetch 2, publish 1) / 1 | 2,1 | 810 |
| wind-ecmwf | Worker 4×/vrk + vara 2× | 4 + 2 | ~3,8 / 1 | 2,4 | 520 |
| pilvidata-ecmwf | Worker 4×/vrk + vara 2× | 4 + 2 | 3 / 1 | 1,9 | 420 |
| ecmwf-7d | Worker 2×/vrk + vara 1× | 2 | ~4,5 (fetch 4, publish 1) | 3,4 | 270 |
| artefaktit-siivous | cron 1 h | 4 toteutunutta (ajastettu 24) | 2 | 1,5 | 240 (24/vrk toteutuessa 1 440) |
| tests | push / PR | ~6 | 1 | 0,5 | 180 |
| sync-pages | push mainiin | ~3 | 1 | 0,3 | 90 |
| palaute, fcm-testi, ntfy-testi, alert-dryrun, deploy-*, esikatselu, camera-probe | käsin / haaran env-tiedosto | ~0 | 1–3 | – | < 50 |
| **Datan ja ajastuksen summa** | | | | | **≈ 22 300** |
| android-aab + android-dev (ubuntu) | käsin | 29 ajoa / 19 vrk | 2–3 | ~2 | ~120 |
| ios-testflight + ios-dev (**macos-26**, ×10) | käsin / haara | 54 ajoa / 19 vrk, ~190 macOS-min | 2–6 | 2–4 | ~300 × 10 = **~3 000** |
| **Summa ilman Pagesia** | | | | | **≈ 25 400** |
| pages-build-deployment (Pagesin oma työnkulku) | jokainen gh-pages-push | 213 | 3 (build, deploy, report 1 + 1 + 1) | 0,8 | 19 200 (?) |
| **Summa, jos Pages-ajot laskutetaan** | | | | | **≈ 44 600** |

**Vertailu:** ilman Pages-ajoja kulutus on ~12,7 × Freen 2 000 min ja ~8,5 × Pron 3 000 min. Pro-kiintiö
loppuisi noin 3,5 päivässä. **Oletuksena GitHubin kulutusraja on 0 $ → työnkulut pysähtyvät kiintiön
loputtua ja data lakkaa päivittymästä** (ellei maksutapaa ja budjettia aseteta).

Huomiot:
- Kalleimmat syyt ovat lyhyiden jobien pyöristys (camera-status 2 jobia × 144 ajoa = 39 % kaikesta) ja
  ICON-EU-tuulen 4 rinnakkaista fetch-jobia, joista jokainen asentaa Python-riippuvuudet (25–60 s per job).
- Päätöksen 33 lukema (revontulivahti 8 738 min, käyttöraportti 6.11.) on pienempi, koska tiheä
  camera-status- ja hälytysajastus tuli Workeriin vasta loka–marraskuussa.
- **Epävarma:** laskutetaanko Pagesin oma `pages-build-deployment` yksityisessä repossa. En löytänyt varmaa
  tietoa; tarkista GitHubin laskutussivulta ennen päätöstä. Jos laskutetaan, se yksin ylittää Pron kiintiön.
- **Tallennus:** Pro 2 Gt (Free 0,5 Gt, jaettu). Data-artefaktit (1 vrk) ja Pagesin julkaisuartefaktit
  (~50 Mt, siivous tunnin välein, §5) lasketaan yksityisessä repossa mukaan. Keskimääräistä tallennusta ei
  mitattu; se voi olla lähellä 2 Gt:ta.
- Säästökeinoja vaihtoehdon A sisällä (ei toteutettu): camera-status yhteen jobiin ja 20 min välein
  (−6 600), ICON-EU-tuuli yhteen jobiin (−2 500), ennustevertailu pois 15.12. (−900), varajastukset pois
  (−700). Kulutus olisi silloin noin 12 000 min/kk, eli yhä 4 × Pron kiintiö.

## 3. gh-pages-data ja Pagesin kaista

**gh-pages nyt (mitattu 15.11. haarasta):** 124,5 Mt, 1 080 tiedostoa (Pagesin sivustoraja 1 Gt).
Suurimmat: ICON-EU-kerrokset 12,8 Mt, HARMONIE-kerrokset 10,5 Mt, tuuli ICON-EU 4 × 6,8 Mt,
tuuli HARMONIE 4 × 6,6 Mt, 7 vrk -ruudut 12 × 1,05 Mt.

**Siirtokoko yhtä tiedostoa kohti (gzip, Pages pakkaa JSONin):**

| Tiedosto | Raaka | gzip |
|---|---|---|
| Pilvet ECMWF, 1 askel | 23 kt | 17 kt |
| Pilvet HARMONIE, 1 askel | 92 kt | 70 kt |
| Pilvet ICON-EU, 1 askel | 157 kt | 119 kt |
| Pilvet IL (editoitu), 1 askel | 46 kt | 35 kt |
| Pilvikerrokset HARMONIE, 1 askel | 346 kt | 262 kt |
| Sumu HARMONIE, 1 askel | 29 kt | 22 kt |
| Tuuli HARMONIE / ICON-EU / ECMWF, 1 askel, 1 taso | 216 / 224 / 113 kt | 62 / 53 / 32 kt |
| 7 vrk -ruutu | 29 kt | 11 kt |
| cameras.json + camera-status.json | 21 kt | 4 kt |

PNG-pakattu base64-data pakkautuu gzipillä vain ~25 %, tuuli ~70 %.

**Käyttöprofiilit (yksi avauskerta):**
- **Kevyt** (avaa, katsoo Nyt ja kartan, ECMWF): meta + 2 askelta + kamerat ≈ **0,1–0,2 Mt**.
- **Tyypillinen** (HARMONIE, Tänä yönä ~14 tuntiaskelta, 7 vrk, pilvikartta ja aikajanaa vähän):
  ≈ 14 × 70 kt + muutama lisäaskel + 7 vrk ≈ **1,5 Mt**.
- **Raskas** (opas: pilvet + tuuli koko 30 h aikajanalta, kerrokset tai sumu): 31 × (70 + 62) kt
  + kerroksia ≈ **5 Mt**.

Oletus: 2 avauskertaa päivässä per käyttäjä, 30 pv/kk. HTTP-välimuisti (Pages `max-age=600`) säästää vain
saman 10 minuutin sisällä, joten sitä ei ole laskettu mukaan.

| Päivittäisiä käyttäjiä | Kevyt (0,2 Mt) | Tyypillinen (1,5 Mt) | Raskas (5 Mt) |
|---|---|---|---|
| 100 | 1,2 GB/kk | 9 GB/kk | 30 GB/kk |
| 1 000 | 12 GB/kk | **90 GB/kk** (raja lähellä) | **300 GB/kk** (3×) |
| 10 000 | **120 GB/kk** (yli) | **900 GB/kk** (9×) | **3 000 GB/kk** (30×) |

100 GB/kk on Pagesin "pehmeä" raja: ylitys ei katkaise heti, mutta GitHub voi ottaa yhteyttä ja rajoittaa.
Lisäksi Pagesin käyttöehdot kieltävät käytön kaupallisen palvelun (SaaS) alustana; maksullisen sovelluksen
datapalvelimena käyttö on harmaata aluetta riippumatta repon näkyvyydestä.

## 4. Vaihtoehdot päätettäväksi

Hinnat ovat arvioita marraskuun 2026 julkisista hinnastoista. Tarkista ne ennen päätöstä. Valuuttana $.

### A) Repo yksityiseksi + GitHub Pro, muu ennallaan
- **Mitä tehdään:** GitHub Pro, repo yksityiseksi, Pages pysyy päällä (sivu on edelleen julkinen),
  maksutapa ja Actions-budjetti asetetaan. Käyttöehdot ja tietosuojaseloste julkiseen osoitteeseen
  (`PRO_LINKS`, tämä on tehtävä joka tapauksessa). Dev-APK:n jakelu muualle kuin Releasesiin (esim.
  Firebase App Distribution tai Pagesin kautta). Varmistetaan, että ajastin-Workerin avain ja Pages-julkaisu
  toimivat yksityisenä.
- **Kuukausikustannus:** Pro 4 $/kk. Lisäksi ylitysminuutit noin 22 400 Linux-min × 0,006–0,008 $
  ≈ **135–180 $/kk**, tai ≈ 250–330 $/kk, jos Pages-ajot laskutetaan. Säästökeinoilla (§2) ≈ 55–75 $/kk.
  Yhteensä **≈ 60–185 $/kk** (pahimmillaan ~335 $/kk).
- **Työmäärä:** 0,5–1 päivää, tai 2–3 päivää säästökeinojen kanssa.
- **Riskit:** kiintiö tai budjetti loppuu ja data pysähtyy hiljaa. Pagesin 100 GB/kk -raja täyttyy noin
  1 000 päivittäisellä käyttäjällä. Pagesin käyttöehdot (ei kaupallisen SaaS:n alusta). Iso kuluerä kasvaa
  ajastuksen tihentyessä, ei käyttäjämäärän mukana.

### B) Data Cloudflareen, ajastus kokonaan Cloudflarelle, Actions vain testeihin
- **Mitä tehdään:**
  1. Haku ja käsittely Cloudflarelle. Pilvi- ja tuulihaut purkavat GRIB2-dataa Pythonilla
     (eccodes/cfgrib, Pillow). Se ei onnistu tavallisessa Workerissa (CPU-raja, ei natiivikirjastoja), joten
     ajetaan **Cloudflare Containers** -konttina (Docker-kuva, jossa riippuvuudet valmiina). Ajastin-Worker
     käynnistää kontin GitHubin sijaan.
  2. camera-status (tiivisteet, YouTube `/streams`) ja alert-fcm (Node, `alerts/fcm.js` toimii jo Workerissa)
     siirretään Workeriksi. Hälytysten tila (`halytys-fcm-tila`) siirretään KV:hen tai R2:een. Riski:
     YouTube voi rajoittaa Cloudflaren osoitteita, kuten se rajoittaa Actionsin `watch`-sivuja.
  3. Data R2-säilöön, jakelu omalla verkkotunnuksella (Cloudflaren välimuisti) tai Workerin kautta.
     Julkaisu atomisesti: askeltiedostot ensin, meta viimeisenä.
  4. Sovellus: `DATA_BASE` uuteen osoitteeseen ja `embed/youtube.html` samalle alkuperälle (natiivimuutos,
     vaatii uuden TestFlight- ja Play-käännöksen). Dev-latain ja esikatselut R2:een tai Cloudflare Pagesiin.
  5. Actions: vain `tests.yml` ja sovelluskäännökset. Sovelluskäännökset vievät silti noin 3 100 min/kk
     (iOS ×10), mikä ylittää Pron kiintiön. Ne joko harvennetaan tai käännetään omalla Macilla tai muulla
     palvelulla (ratkaistava erikseen).
- **Kuukausikustannus:** Workers Paid 5 $/kk (sisältää 10 milj. pyyntöä ja konttien perusmäärän).
  Konttien laskenta noin 3 000–4 500 vCPU-min/kk ylittää sisältyvän määrän noin 1–5 $:lla. R2: tallennus
  ~0,13 Gt (10 Gt ilmaiseksi), kirjoitukset ~200 000/kk (1 milj. ilmaiseksi), lukuja 10 000 käyttäjällä
  ~12 milj./kk (10 milj. ilmaiseksi, ylitys ~0,36 $/milj.), siirto ilmainen. Verkkotunnus ~1 $/kk.
  Lisäksi Pro 4 $/kk, jos repo on yksityinen (testit ja käännökset). Yhteensä **≈ 10–20 $/kk**. Kustannus
  ei juuri kasva käyttäjämäärän mukana (ei kaistarajaa).
- **Työmäärä: noin 11–14 päivää.** Kontti ja kuva 2 pv, 8 datatyönkulun siirto ja R2-julkaisu 3 pv,
  camera-status Workeriksi 1 pv, hälytysajo ja tila Workeriin 1,5–2 pv, jakelu-Worker, verkkotunnus ja
  välimuistiotsakkeet 1 pv, sovelluksen muutokset 1–1,5 pv, rinnakkaisajo, seuranta ja dokumentaatio 2–3 pv.
- **Riskit:** iso siirto juuri ennen kauppajulkaisua. Cloudflare Containers on uusi palvelu (hinnoittelu ja
  rajat voivat muuttua). Lisäksi Cloudflare olisi yksittäinen kriittinen palvelu sekä ajastukselle että datalle.

### Huomio (ei pyydetty, mainitaan vertailuksi)
Halvin välimuoto on jättää datan haku ja julkaisu erilliseen **julkiseen** data-repoon (fetch-skriptit,
datatyönkulut, gh-pages) ja tehdä vain sovelluskoodin repo yksityiseksi. Actions-minuutit ja Pages pysyisivät
ilmaisina (0–4 $/kk, noin 2–3 päivää). Kaistaraja ja Pagesin käyttöehdot jäisivät kuitenkin samoiksi kuin
A:ssa, ja hakuskriptit olisivat edelleen julkisia.
