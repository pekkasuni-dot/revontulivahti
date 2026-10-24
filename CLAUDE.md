# Revontulivahti

## Mikä tämä on
PWA (Progressive Web App), joka näyttää kartalla revontulien
todennäköisyyden ja pilviennusteen Suomessa. Kohderyhmä:
revontulioppaat ja -harrastajat. Julkaistaan GitHub Pagesissa.
**Näkyvä nimi (2026-10): AuroraAwesome** (sivun otsikko, yläreuna,
PWA-manifesti). Repon nimi, osoite, sw.js:n välimuistinimi ja
localStorage-avaimet (`rv-*`) pysyvät ennallaan. **Logo (2026-10,
käyttäjän valinta C "A-monogrammi"):** `icons/logo.svg` (välilehtikuvake),
`icons/icon-192/512.png` ja `icon-512-maskable.png` (sisältö 72 %:iin,
koko neliö taustana) renderöity samasta SVG:stä headless-Chromiumilla;
yläreunan logo on sama piirros inline-SVG:nä. Testinäkymä `?logo=1` poistettu.

## Tekninen pino
- Puhdas selainsovellus, ei omaa palvelinta eikä tietokantaa.
- Kartta: MapLibre GL JS (WebGL) 3.6.2, **omalta palvelimelta `lib/`**
  (2026-10; cdnjs palautti 3.6.2:lle 404 text/html -> ORB esti, joka
  käynnistys kulutti aikaa; varalla unpkg -> jsdelivr, `loadMapLib()`).
  `lib/` on SW:n SHELLissä ja `publish-pages`/`sync-pages.yml`:ssä.
  **Latausjärjestys (2026-10):** kirjasto ja ensisijainen data (pilvet,
  OVATION, Kp) haetaan RINNAKKAIN; avaruussää, tuuli ja maastovarjostus
  vasta kun pilvet+OVATION valmiit tai `SECONDARY_LOAD_MAX_MS` (15 s)
  kulunut (`startSecondaryLoads()`, `state.secondaryLoads`). Hidas 3G:
  pilvet 61,5 -> 21,2 s. Ks. MUISTIO-lataus.md.
  **Luotettavuus (2026-10, osa B):** KAIKKI datahaut `fetchJSON()`/`netSWR()`
  -kautta (`NET`: aikakatkaisu 15 s, 3 yritystä, taustayritys 30 s -> 5 min).
  Sivu tallentaa vastaukset Cache API:in `rv-data-v1` (sw.js EI poista
  `rv-data*`-välimuisteja); `netSWR` näyttää tallennetun heti ja uuden
  taustalla -> MUUTETTU 2026-10-20 (kuten Windy): `netSWR` hakee AINA verkosta,
  tallennettu vain kun yhteys toimii mutta lähde ei vastaa; ilman yhteyttä
  (`netLooksOffline()`: onLine TAI oma verkkovirhe - iPhone voi väittää onLine=true
  lentokonetilassa) ei dataa. Laiskat askeleet `?run=`-avaimella. Pilvitaso
  oletuksena pois (`state.cloudsOn:false`).
  Lähteiden tila `NET_SRC` -> latausmerkki tason napissa (`NET_BTNS`) ja
  "Ei yhteyttä, näytetään klo 20.15 tiedot" (`renderNetNotice`, `note()`
  palauttaa sen). Yhteyden palatessa/näkyviin tullessa `netRecover()`:
  uudelleenyritykset + pohjakartta uudelleen (`recoverMap`, diff:false).
  Uusi datalähde -> käytä samoja funktioita, ÄLÄ suoraa `fetch()`:ia.
  **Ilman yhteyttä kuten Windy (käyttäjän päätös 2026-10-20):** `navigator.onLine`
  false -> tallennettua dataa EI näytetä (`netCacheUsable()`), vain pohjakartta
  (sw.js `rv-tiles-v1`: OpenFreeMap, korkeustiilet, Esri, Google Fonts; verkko
  ensin, max 1500 palaa) + yläreunan yhteyspalkki `#netBar` (`renderNetBar`:
  violetti "Ei internet-yhteyttä", vihreä "Yhteys palasi" 4 s; siirtää ylärivin
  alemmas `--netbar-h`:lla). Osittainen katkos -> `#msg` lähteiden nimillä.
- **Yhteiset laskentafunktiot `aurora-core.js` (2026-10-21):** pimeys
  (`sunAltitude`, `darknessFactor`, `darkPeriod`), OVATION (`parseOvation`,
  `ovationProbAt`, `ovationBilinear`), pilvihilan näytteistys (`sampleGridField`,
  `cloudVisibilityFactor`, `hourCloud`, `buildCloudGridFull`), näkyvyysindeksi
  (`visibilityIndex`), Bz (`bzTrend`, `bzHint` = Tulossa-vihje), Kp (`kpNowInfo`,
  `kpBlockAt`, `kpRows`, `kpRtRows`) ja Tänä yönä (`computeNight`, `nightBest`,
  kuu). Puhtaita funktioita (tila argumentteina), ladataan ennen pääskriptiä
  (`<script src="aurora-core.js">`), sovelluksessa ohuet kääreet (`kpData()`,
  `cloudStepGetter`). Säätövakiot `NIGHT_CFG`/`KP_VIS`/`BZ`/`KP_RT` täällä (sovelluksen
  `NIGHT`/`SPACE_WX`/`KP_RT` lukevat ne). SAMA koodi ajaa hälytykset (Node/Worker) -
  ÄLÄ kopioi kaavoja index.html:ään. Juuritason tiedosto: SW SHELL, publish-pages,
  sync-pages ja versiohook sisältävät sen.
- **Revontulihälytykset (2026-10-21, vaihe 1 kuivaharjoitus, ei ilmoituksia):**
  `alerts/aurora-alerts.js` (säännöt, rajat `ALERT_CFG`, toiston esto),
  testipaikat `alerts/test-places.json` kameroiden kohdalla (2026-10-23: Oulu, Rovaniemi,
  Kilpisjärvi, Lyngen, Levi, Sodankylä + Helsinki; vaihdos lokissa `placeSet`),
  keogrammilinkit (FMI Muonio/Kilpisjärvi/Kevo/Sodankylä + IRF Kiiruna) vain julkaistuihin,
  tarkistus aamulla `alerts/keograms.js` -> lokihaaran `keograms.json` (ei kuvia; käyttöehdot muistiossa),
  `scripts/alert-dryrun.mjs`, työnkulku `alert-dryrun.yml` 15 min välein ->
  loki haaraan `halytys-loki-2` (2. jakso 23.10. alkaen Cloudflare-ajastimella; 1. jakso 21.-23.10. haarassa `halytys-loki`) (orpokommitti, 14 vrk, `YHTEENVETO.md`). Tuotannossa
  Cloudflare Workerissa (Actions-viive 5-20 min). Tulossa: Bz/Bt-rajat + paikka
  ulottuvilla (Kp nyt + marginaali >= `kpRequired(magLat)`) + vain siirtymästä.
  **KENTTÄTESTI (2026-10-24, haara claude/halytykset-ntfy):** testipaikat + Utsjoki, − Helsinki;
  pilvisyys HARMONIEsta (`ALERT_CFG.cloudModel`, `cloudMaxAgeH` 9 -> vanha = ei hälytystä,
  `alerts/cloud-models.js`), lokiin kaikkien 3 mallin pilvisyys. Ilmoitukset ntfy.sh:lla
  (`alerts/notify.js`, taso `sendLevel` normaali, vain mainista `--send`), kanavat salaisuuksista
  `NTFY_TOPIC_PEKKA`/`NTFY_TOPIC_OPAS` (EI koodiin, lokiin eikä keskusteluun), vastaanottajat
  test-places.json `notify`. Palautenapit -> Worker `/palaute` (HMAC, `PALAUTE_AVAIN`) ->
  `palaute.yml` -> lokihaaran PALAUTE.md -> loppuraportin osio. Testi `ntfy-testi.yml`.
  Ohje OHJE-ntfy.md, perusteet MUISTIO-halytykset.md "Kenttätesti". Tuotannossa oma Web Push.
  **Päättyy automaattisesti 2026-11-06** (`END_DATE`); viimeisenä päivänä
  väliaikainen ja 7.11. lopullinen LOPPURAPORTTI.md (`alerts/alert-report.js`,
  ehdotukset vain tekstinä). Omat havainnot käsin `halytys-loki-2`-haaran
  HAVAINNOT.md:hen (rivi joka yölle) -> yhteenveto (kaikki yöt) ja raportti.
  Ks. MUISTIO-halytykset.md.
- **Julkaisuarkkitehtuuri (2026-10, korjattu repon kasvu) - LUE TÄMÄ
  ENNEN data-työnkulkujen muokkaamista:** `main`-haara sisältää VAIN
  sovelluskoodin (`index.html`, `sw.js`, `manifest.webmanifest`,
  `icons/`, `scripts/`, `.github/`, dokumentaatio) - EI botin
  generoimaa dataa. `data/`-kansio on `.gitignore`:ssä (paitsi
  käsin ylläpidetty `data/cameras.json`). GitHub Pages palvelee
  ERILLISTÄ `gh-pages`-haaraa, jota EI KOSKAAN pidetä kasvavana -
  jokainen data-työnkulku (`pilvidata-*`/`wind-*`/`camera-status`)
  päivittää sen YHTENÄ orphan-committina (`git checkout --orphan`
  + `--force`-push, ks. `.github/actions/publish-pages`-composite-
  action) joka KORVAA edellisen kokonaan - historia ei kerrosta
  KOSKAAN. Syy: `main` kasvoi suorilla data-commiteilla ~300 Mt:iin
  kuukausissa, ja HARMONIEn aluelaajennus Skandinaviaan (ks. alla)
  olisi moninkertaistanut vauhdin satoihin megatavuihin PÄIVÄSSÄ -
  ks. MUISTIO-korkeudet-tuuli.md "Julkaisuarkkitehtuurin korjaus".
  **KRIITTINEN sääntö kaikille julkaiseville jobeille:** TÄYTYY olla
  `concurrency: {group: gh-pages-publish, cancel-in-progress: false}`
  - MUUTEN kaksi samanaikaista julkaisua voi hiljaa ylikirjoittaa
  toisensa (force-push EI anna git:in normaalia non-fast-forward-
  suojaa/virhettä, toisin kuin tavallinen push `main`:iin). Jokainen
  8 data-työnkulusta (myös `ecmwf-7d`) on jaettu `fetch` (hakee datan, tallentaa
  `actions/upload-artifact`:lla, voi ajaa rinnakkain) + `publish`
  (lataa artifactin, kutsuu `publish-pages`-actionia, SERIALISOITU
  globaalin concurrency-ryhmän kautta) -jobeihin - ÄLÄ yhdistä niitä
  takaisin yhdeksi jobiksi, se palauttaisi juuri sen kilpajuoksun
  joka tässä korjattiin. `sync-pages.yml` synkkaa sovelluskoodin
  `gh-pages`:lle VÄLITTÖMÄSTI kun `main` päivittyy (ei tarvitse
  odottaa seuraavaa data-cronia, pahimmillaan ~3 h).
  **Julkaisu VAIN mainista (2026-10-23, käyttäjän päätös):** haaralta
  käynnistetty datatyönkulku EI julkaise tuotantoon. Jokaisen publish-jobin
  ehto `if: ${{ !cancelled() && github.ref == 'refs/heads/main' }}`
  (myös `sync-pages.yml`), ja `publish-pages`-action keskeyttää virheellä,
  jos sitä kutsutaan muualta kuin mainista (varmistus). Haara-ajossa data jää
  fetch-jobin artefaktiksi (`retention-days` 7, mainissa 1) vertailua varten.
  Uusi julkaiseva työnkulku -> SAMA ehto. Haaran muutoksen julkaisu
  tarkistetaan vasta mainiin yhdistämisen jälkeen (`workflow_dispatch` mainista).
  **Ajastus (2026-10-23): pääajastin on Cloudflare Worker** (`workers/ajastin`,
  cron */5, aikataulu `src/schedule.js` `SCHEDULE`) - GitHubin oma `schedule`
  toteutui vain 3-5 h välein. Worker käynnistää työnkulut `workflow_dispatch`illa
  ja ohittaa, jos edellinen ajo on kesken. GitHubin cronit varalla (ennallaan;
  harvennus erikseen kun ajastin toiminut >= 3 vrk) + `vahti`-job (`.github/actions/ajastin-vahti`), joka ohittaa
  varaajon, jos ajastin ajoi hiljattain. Uusi ajastettu työnkulku -> lisää
  `SCHEDULE`:en, vahti-job + `needs: vahti`, `cancel-in-progress: false`.
  Käyttöönotto ja avaimet: OHJE-ajastin.md (avaimet vain salaisuuskenttiin).
  **Oikeudet ja aikarajat (2026-10-22, KATSELMOINTI):** työnkulun tasolla
  `contents: read`, kirjoitus vain publish-jobeille; fetch `timeout-minutes: 30`,
  publish 15; fetch-checkout `persist-credentials: false` (paitsi camera-status).
  `publish-pages` ottaa sovellustiedostot AINA `origin/main`ista (ei ajon
  commitista) -> datan julkaisu ei palauta vanhaa sovelluskoodia.
  **`check-camera-thumbnails.py`:n pysyvyysseuranta** (firstSeenAt,
  ks. alla) lukee EDELLISEN tilan - koska `main`:issa data/
  camera-status.json on nyt pysyvästi jäätynyt, `camera-status.yml`:n
  `fetch`-job hakee edellisen tilan ERIKSEEN `gh-pages`:sta
  (`git show origin/gh-pages:data/camera-status.json`) ENNEN
  tarkistusta - tämä on ERITYISTAPAUS, muut 6 työnkulkua eivät
  tarvitse tätä (eivät lue omaa aiempaa tiedostoaan).
- **Hilan geometria (2026-10-23, periaate KAIKILLE malleille ja tasoille):**
  hila-arvo k kuvaa PISTETTÄ `lat0 + k*dlat`, `lon0 + k*dlon` (ei ruudun
  kulmaa); `lat0..lat1`/`lon0..lon1` = ensimmäinen ja viimeinen piste =
  datan todelliset rajat. Harvennus (`STRIDE` > 1) AINA
  `scripts/grid_resample.py`:n `Resampler`illa: keskitetty ikkuna (reunoilla
  symmetrisesti kapeneva), hila natiivin päästä päähän -> pilvillä ja
  tuulella samat rajat samasta natiivihilasta. ÄLÄ merkitse lohkon
  keskiarvoa lohkon ensimmäisen pisteen kohdalle (vanha virhe: HARMONIE-tuuli
  ~4 km lounaaseen, pohjoisreuna 73,455 vs. 73,50). Sovellus: väli
  rajoista (`AuroraCore.gridGeom`, ei metan pyöristetystä dlat:sta) ->
  JS-näytteistys, lippu, varjostin (`lat0..lat1`, `texSize-1`) ja aluerajaviiva
  samassa hilassa. Testit `tests/test_grid_resample.py`, `aurora-core.test.mjs`.
  Ks. MUISTIO-mallit.md "Hilan keskitys".
- **Keskeneräinen mallinajo (2026-10-22):** hakuskriptit julkaisevat ajon vasta kun
  KAIKKI askeleet ovat saatavilla (`scripts/run_guard.py`: ICON-EU valitsee uusimman
  täydellisen ajon, HARMONIE/ECMWF askelmäärän tarkistus). Muuten `keep_previous()`:
  ei tiedostoja, `::notice` lokiin, exit 0 -> edellinen ajo säilyy gh-pagesilla.
  Uusi hakuskripti -> käytä samaa. Testi `tests/test_run_guard.py`. Ks. MUISTIO-lataus.md.
- Data haetaan valmiiksi tiedostoiksi GitHub Actionsilla, selain
  lukee ne staattisina tiedostoina (URL:t/polut `data/...` pysyvät
  samoina - `gh-pages`:n juuri palvelee saman polkurakenteen kuin
  `main` aiemmin):
  - Pilvidata, useita malleja (ks. `CLOUD_MODELS`-rekisteri index.html:ssä,
    käyttäjä valitsee mallinvalitsimesta, kaikki pilvisyysnäytöt — kartta,
    klikkausmerkki, infoikkuna — lukevat AINA valitun mallin samasta hilasta):
    - **ECMWF IFS** (oletus): `scripts/fetch-clouds.py` → `data/clouds-ecmwf-meta.json`
      + `-step00..16.json` (sovellus lataa askel kerrallaan, 2026-10-22) sekä koko
      `data/clouds-ecmwf.json` (hälytysajo + sovelluksen vara, jos metaa ei ole).
      Alue 55-85 °N (nostettu 75:stä 2026-10-22), 30 °W-60 °E, 0,25° resoluutio molemmilla akseleilla
      (ECMWF Open Data -ilmaisdatan paras saatavilla oleva tarkkuus),
      17 aika-askelta 3 h välein (0-48 h). ~2,05 Mt. Lähde: ensisijaisesti
      ECMWF:n oma portaali, lyhyellä uudelleenyrityksellä automaattinen
      varalähde (Azure → AWS) jos paaportaali ei vastaa — kaytetty lähde
      kirjataan JSON:iin (`source`-kentta) ja lokiin.
      **Catmull-Rom-ylilyönti (2026-10, tarkistettu Python-simulaatiolla
      200 000 satunnaispisteella + kohdennetuilla reunatapauksilla):**
      bikubinen interpolointi VOI ylittaa [0,1]-valin (toisin kuin
      bilineaarinen), mutta tasaisella pohjalla olevalle jyrkalle
      reunalle (yleisin tapaus: `fadeEdges:false`-datan oma aluereuna)
      ylilyontia EI synny LAINKAAN (tangentti = puolet sekantista =
      Hermite-splinin monotonisuusrajalla). Yksittaisen hilaruudun
      poikkeamat (aukko/piikki) tuottavat vain ~0,04-0,16 prosenttiyks.
      ylilyonnin. Pahin löydetty käytännön tapaus (arvo 8 % juuri 6 %:n
      vyohykerajalla + 100 %:n hyppy vierella) voi hetkellisesti painaa
      arvon 1,19 %:iin (ali 6 %:n rajan) ALLE yhden hilaruudun levyisella
      alueella - mitaton, EI korjattu/sumennettu (lopullinen
      `clamp(cv,0,1)` jo estaa varsinaisen renderointivirheen).
    - **ICON-EU (DWD)**: `scripts/fetch-clouds-icon_eu.py` →
      `data/clouds-icon_eu-meta.json` + `data/clouds-icon_eu-step00..30.json`,
      suoraan `opendata.dwd.de`:n GRIB2-tiedostoista (EI Open-Meteon kautta —
      kokeiltu, vaihdettu pois kaupallisen käytön rajoituksen ja kattavuus-
      ongelmien takia). Alue 55-70,5 °N (ICON-EU:n oma pohjoisraja, ei pääse
      75 °N:ään), koko natiivi pituusastealue. **Resoluutio NOSTETTU 2026-10
      NATIIVIIN ~7 km:iin (0,0625°, STRIDE=1 - oli 0,25°/~28 km, STRIDE=4) -
      "mallin 7 km tarkkuudesta ei ollut hyötyä" aiemmin kun se keskiarvotettiin
      pois.** Jotta tämä ei kasvattaisi tiedostokokoa 16-kertaiseksi (4x
      pistemäärä per akseli), kukin kenttä (vals/valsLow/valsMid/valsHigh)
      pakataan nyt HARMAASÄVY-PNG:nä + base64:na plain JSON-lukutaulukon
      sijaan (PIL/Pillow haku-skriptissä, Canvas-API selaimessa - ks.
      `decodePngField()`) - PNG:n DEFLATE-pakkaus hyödyntää sääkenttien
      laajoja tasaisia alueita paljon tehokkaammin kuin JSON. Mitattu
      OIKEASTI: plain JSON natiivilla olisi ollut ~5,2 Mt/askel (162 Mt
      koko ennuste) - PNG:llä **~481 KB/askel (~14,6 Mt koko ennuste, vain
      +44 % tiedostokoossa 16-kertaiseen pistemäärään nähden)**. ECMWF/
      HARMONIE EIVÄT muuttuneet (edelleen plain JSON) - selain tunnistaa
      kentän tyypistä (merkkijono=PNG, taulukko=plain) kummankin muodon.
      **31 askelta 1 h välein (0-30 h, laajennettu 12h:sta 2026-10 — DWD
      julkaisee tuntiaskeleita todistetusti 78 h:hen asti, ei rajoite)**,
      selain lataa yhä vain 1-2 askelta kerrallaan (ks. "Laiska pilvilataus"
      alla). Ks. MUISTIO-mallit.md "ICON-EU:n resoluution nosto".
    - **HARMONIE (FMI)**: `scripts/fetch-clouds-harmonie.py` →
      `data/clouds-harmonie-meta.json` + `data/clouds-harmonie-step00..30.json`,
      suoraan `opendata.fmi.fi`:n `/download`-rajapinnasta (yksi HTTP-kutsu
      palauttaa kaikki aika-askeleet kerralla). Tarkin malli: natiivi
      ~0,0225° (~2,5 km), alinäytteistetty 2×2-lohkokeskiarvolla ~0,045°:een
      (~5 km) tiedostokoon takia. **Alue LAAJENNETTU 2026-10: koko
      Skandinavia (`-1,55,35,73.5`, `model_areas.py HARMONIE_BBOX`) —
      oli aiemmin vahingossa kavennettu Suomeen (19-32 °E, 59-70 °N),
      ks. "Opitut sudenkuopat" alla "Tuulen/pilvien alue erkani".**
      412×801 pistettä (oli 92×123). **31 askelta 1 h välein (0-30 h,
      laajennettu 12h:sta 2026-10 — todistettu 60h+ testihaulla ettei
      12h ollut rajapinnan rajoite vaan alkuperäisen toteutuksen oma
      varovaisuus)**. **~43,8 Mt yhteensä (oli ~9,2 Mt Suomen alueella,
      kasvu 4,77×)**, selain lataa vain 1-2 askelta kerrallaan
      (~1,45 Mt/askel, oli ~0,30 Mt/askel). HUOM: tämä ei enää committoidu
      `main`:iin — ks. yllä "Julkaisuarkkitehtuuri".
    - Lisää malli = yksi määrittely `CLOUD_MODELS`-rekisteriin + oma
      fetch-skripti + oma GH Actions -workflow.
    - **Kattavuus, tiukka linja (2026-10-22):** pilvisyys ja näkyvyys VAIN valitun
      mallin alueella (`AuroraCore.cloudCovers`), EI varamallia; `visibilityIndex()`
      palauttaa `null` kun pilvikerroin puuttuu (ennen = 1 -> väärä 56 %). Alueen
      ulkopuolella "ei dataa"/"–" + `cloudOutsideNote(lat, lon)` (ECMWF-ehdotus vain jos ei jo
      valittu JA `ecmwfCovers()`); Tänä yönä/7 vrk/yön tuntinäkymä yhdellä rivillä
      `cloudOutsideSumHTML()` ("Alueella ei pilvidataa" + "ECMWF ›" -nappi, taulukot eivät siirry); 7 vrk: valittu malli, sitten ECMWF-ruudut, yön
      mallimerkki `CLOUD_MARK` (H/I/E) + selite, tuntinäkymässä `weekSrcSegments()`;
      rajaviiva kartalla `CLOUD_BOUNDS` (2026-10-23: näkyy myös pelkällä tuulella; yksi viiva, pilvi- ja tuulialue samat - HARMONIE-tuulen pohjoisreuna 5 km pilviä etelämpänä; lipun tuulirivi m/s + suuntanuoli, ulkopuolella "ei dataa", ks. MUISTIO-korkeudet-tuuli.md "Tuulen alueen raja"). Alueet: ECMWF 55-75 N /
      30 W-60 E -> 55-85 N 2026-10-22 (myös tuuli ja e7d, `WEEK.tile`), ICON-EU 55-70,5 N / 23,5 W-62,5 E, HARMONIE 55-73,5 N / 1 W-35 E.
      Ks. MUISTIO-mallit.md "Pilvidatan kattavuus".
    - **Laiska pilvilataus (2026-10, ECMWF mukana 2026-10-22):** kaikki kolme mallia jaettu pieneen
      META-tiedostoon (hila+aika-akseli) + yhteen tiedostoon PER aika-askel
      (`model.lazy:true`, `stepFile(i)` `CLOUD_MODELS`-rekisterissä).
      Selain lataa heti vain META:n, ja hakee yksittäisen askeleen vasta
      kun aikajana osuu sen kohdalle (`ensureCloudStepLoaded()`), näyttäen
      sillä välin lähintä jo ladattua askelta (`resolveStep()`) tyhjän
      ruudun sijaan. Kaikki kolme mallia (myös ei-laiska ECMWF) käyttävät
      SAMAA `state.cloudGrid.steps`-Map-rajapintaa piirto-/näytteistys-
      koodissa — ECMWF:lle Map täytetään kerralla ladatun yhden tiedoston
      pohjalta (ei lisäverkkokutsuja), ICON-EU/HARMONIE:lle Mapiin
      kertyy askeleita sitä mukaa kun niitä käytetään.
    - **Pilvitason väri ↔ klikkausmerkin/lipun luku TÄYTYY laskea
      SAMALLA kaavalla (2026-10, palautettu "piirrosmainen" tyyli):**
      `clouds-webgl`-tason fragment-shader (`CWG_FRAG`, `sampleGrid()`)
      käyttää TARKALLEEN samaa **bikubista Catmull-Rom**-interpolointia
      ja SAMAA hilaindeksin reunarajaa (`clamp(uv*(texSize-1), 0,
      texSize-1)` — HUOM: `texSize-1`, EI `texSize-2.0001`, ks. "Opitut
      sudenkuopat" alla, bikubinen reunabugi) kuin klikkauslipun
      `sampleCloudGridField()`/`catmullRom()` (JS) — todennettu Python-
      simulaatiolla koneen tarkkuuden rajalle (~1e-13…1e-15) KAIKKIALLA
      hilassa, myös reunoilla, NELJÄLLÄ eri hilakoolla. Interpolointi
      lasketaan KOKONAAN shaderissa 16:sta `NEAREST`-tekstuurihausta
      (4×4, Catmull-Rom-painot), EI luoteta laitteiston `LINEAR`-
      suodatukseen — pilvitekstuurit ovat ei-kahden-potenssi-kokoisia
      (nlon 361/345/290), ja WebGL1 kieltää `LINEAR`+`REPEAT`-
      yhdistelmän niille (ks. sudenkuopat, NPOT-bugi). EI MITÄÄN
      kohinaa/keksittyä pintayksityiskohtaa (pysyvästi poistettu) - PYÖ-
      REÄT/PEHMEÄT reunat tulevat YKSINOMAAN tästä bikubisesta inter-
      poloinnista, EI mistään sumennuksesta (shaderissa ei ole blur-
      vaihetta lainkaan - todennettu lukemalla koko shaderin lähdekoodi,
      ei arvattu). Väri on jatkuva liukuma läpinäkyvästä/haaleasta
      kylmänharmaan (`thinColor`) kautta valkoiseen (`thickColor`) - EI
      kytketty alfaan. **LÄPINÄKYVYYS (alfa) = S-käyrä (2026-10, korvasi
      8-portaisen `alphaSteps`-taulukon, käyttäjän päätös):** `CLOUD_ALPHA`
      (oletukset `CLOUD_ALPHA_DEFAULTS` = kynnys 0,1 / nousun alku 0,4 /
      nousun loppu 0,9 / katto 1,0 - käyttäjän ?debug-virittämät 2026-10,
      ennen 0,12/0,35/0,85/0,88) -> pysäytyspisteet `cloudAlphaStops()`
      [0,0] [kynnys,0] [alku,0,25] [keskikohta,0,60] [loppu,0,80] [1,katto]
      (nousun alfat katon osuuksina `CLOUD_ALPHA_RISE`), välit smoothstep.
      Alfa on LOPULLINEN peittävyys (`u_opacity` = 1,0). Varjostin lukee
      käyrän 256x1-hakutaulusta (`CWG.lut`, tekstuuriyksikkö 2, LINEAR) -
      käyrän muutos = `setCloudAlpha()` -> `CWG.lutDirty` + `triggerRepaint`,
      EI varjostinmuutosta. Sama käyrä kaikille malleille; JS-vastine
      `cloudAlphaAt()`/`cloudAlphaForPct()` (`?griddebug`). Mitattu headless-
      testissä tasaisella hilalla: kartan alfa = käyrä ±0,005.
      **Viritys: `?debug`-kehittäjäpaneeli** (vasen ylänurkka, pienennettävä):
      liukusäätimet kynnys/nousun alku/nousun loppu/katto, käyräesikatselu
      (25 % ja 70 % merkitty), arvot `rv-debug-cloud-alpha` (VAIN ?debug-
      tilassa - tavallinen käyttäjä näkee aina koodin oletukset), "Palauta
      oletukset", "Kopioi arvot" (valmis `CLOUD_ALPHA_DEFAULTS`-rivi + pisteet
      -> liitä koodiin). Samassa paneelissa revontulien alfa (ks. Revontulet).
      HUOM: paneeli näkyy julkaistulla sivulla vasta kun haara on yhdistetty
      mainiin (todettu 2026-10: "?debug ei näy" = v1.117 oli vain haarassa). **Kartan testitiedot
      (`?debug`, 2026-10-20):** vasemmassa alakulmassa aikajanan yläpuolella
      `#dbgMap`: mittakaavajana (MapLibren ScaleControl, km/mi asetuksista),
      zoom yhdellä desimaalilla, käytössä olevien tiilten taso, maaston-
      varjostuksen voimakkuus (%) ja rantaviivan tarkkuustaso (`coastActiveSource`);
      piilossa infoikkunan ollessa auki. **ENNEN KAUPPAJULKAISUA: `?debug`-
      testinäkymä (paneeli + `#dbgMap`) POISTETAAN tai piilotetaan pysyvästi**
      (samoin `?griddebug`, `?paletti`). **Värit ovat KESKITETTY `CLOUD_STYLE`-vakioon** -
      shaderin lähdekoodi (`CWG_FRAG`) lukee ne `${...}`-template-
      interpolaatiolla MÄÄRITTELYHETKELLÄ.
      **HUOM (2026-10): vasemman yläkulman `#cloudLegend`-selite
      POISTETTU kokonaan** (käyttäjän pyyntö) - `cloudColorAt()`/
      `updateCloudLegendGradient()` poistettu mukana (olivat olemassa
      VAIN selitettä varten); `cloudAlphaForPct()` SÄILYTETTY (lukee nyt
      S-käyrää), koska `?griddebug=1`-diagnostiikka käyttää sitä yhä. Klikkauksen tulos
      näytetään Windy-tyylisenä "lippuna" (`rv-cloudflag`/`cf-*`: tanko
      + vaakasuora lippu, `anchor:'bottom-left'`), ei pyöreänä korttina
      - 2026-10 uusittu käyttäjän esimerkkikuvan mukaan: sulkemisnappi
      PYÖREÄ, halkaisija = lipun korkeus (28px), lipun oikeassa päässä;
      ei vaaleaa reunaviivaa; lipun vasen reuna tasan tangon vasemmassa
      reunassa; tanko 64px, sama väri kuin lippu. **Napautukset (2026-10-22):** `.rv-cloudflag`
      `pointer-events:none`, vain `.cf-flag` (lippu + ruksi) `auto` -> tangon oikea
      puoli ja lipun alus valitsevat uuden pisteen. Kaikki mitat/värit
      `.rv-cloudflag`-säännön CSS-muuttujissa (`--cf-h`, `--cf-bg`, ...).
      **Karttapohjat (uudistettu 2026-10): VAIN kaksi jäljellä**
      (`MAP_STYLES` = `general` + `satellite` - tumma/vaalea/lämmin
      POISTETTU kokonaan). `general` ("Yleiskartta", OLETUS) on
      avaimeton OSM-vektoripohja **OpenFreeMap:ista**
      (`tiles.openfreemap.org/planet`, OpenMapTiles-skeema, MIT-
      lisenssi, EI API-avainta, kaupallisesti käytettävä - käyttöehdot/
      skeema todennettu suoraan heidän sivuiltaan, ks. MUISTIO-kartta.md
      "Karttapohjat uusiksi"). Windy-henkinen tyyli: maa JA meri SAMAA
      väriä (`vt-water`-taso suodattaa `class='ocean'` pois, jättäen
      taustan `background-color`:in näkyviin merenä; `landcover`/
      `landuse`/`park`-tasot JÄTETTY POIS kokonaan ettei maa pilkkoudu
      metsä-/puisto-väreihin), järvet/joet hieman tummempina
      (`class != 'ocean'`-suodatus jättää ne omaksi `vt-water`-
      täytökseen). **KAIKKI värit yhdessä `BASEMAP_GENERAL`-oliossa**
      (hienosäätö yhdestä paikasta). **Rantaviiva + rajat (2026-10, uusittu):
      OpenFreeMapin OMISTA tasoista, EI enää Natural Earth -GeoJSONia**
      (`buildCoastBorderLayers()`): rantaviiva = `water`-tason meri-
      polygonin (`class='ocean'`) reuna (sama OSM-data kuin järvet/joet ->
      osuu jokisuihin, tarkentuu zoomatessa; pienillä zoomeilla skeema
      käyttää itse NE-merta), rajat = `boundary`-taso admin_level 2 ilman
      merirajoja. Mukana MYÖS Satelliitissa (pelkkä openfreemap-lähde
      lisätty). **Rantaviiva ilman tiilisaumoja (2026-10, "musta pysty-
      viiva Kokkolan länsipuolella"):** rantaviiva ja sen varjo EIVÄT
      enää piirry suoraan vektorilähteestä vaan GeoJSON-lähteestä
      `coastline` (`COAST_SRC`), jonka `rebuildCoastLines()` kokoaa
      ladatuista meritiilistä (`map.querySourceFeatures` + MapLibren
      sisäinen `_vectorTileFeature`/`_z/_x/_y`): tiilen rajalla tai sen
      ulkopuolella olevat reunat pudotetaan, muut leikataan tiilen
      alueelle, molempiin suuntiin kulkevat samat janat (kaksi polygonia
      koskettaa) pudotetaan, kulkusuunta säilyy (varjon line-offset).
      Juurisyy: OpenFreeMapin tiilessä meri on paikoin kahtena polygonina,
      jotka koskettavat TÄSMÄLLEEN tiilen rajalla (todettu 22,5° E, z6-rivi
      17: kaksinkertainen viiva, tummuus 67 vs. laskettu 70) - rajalla
      oleva reuna ei jää MapLibren tiilileikkauksen alle kuten puskurissa
      oleva. Tyylikeinoin (meritäyttö viivan päälle) ei voi korjata, koska
      rantaviiva on pilvien päällä. Näkymätön `coast-src`-taso pitää
      meritiilet ladattuina kaikilla tarkkuustasoilla. ÄLÄ palauta rantaa
      `source-layer:'water'`-viivaksi. Ks. MUISTIO-kartta.md "Musta
      pystyviiva Pohjanlahdella". **Satelliitissa (2026-10) TÄSMÄLLEEN samat tiet, joet, järvet
      (täytettyinä) ja paikannimet kuin Yleiskartalla** (käyttäjän päätös:
      samat värit, leveydet, halo, kaikki; vesialueet kokeiluna samoin):
      `buildSatelliteVectorLayers()` = Yleiskartan tasot ilman taustaa,
      maastovarjostusta, meren peittoa ja rantavarjoa (`SAT_SKIP`).
      Ranta ja rajat samat molemmilla, rantavarjo ja maastovarjostus VAIN
      Yleiskartalla. ÄLÄ lisää satelliitille omia värejä/reunuksia. AINOA
      poikkeus (käyttäjän valinta 2026-10): järvet ja joet tummina ilmakuvan
      veden sävyssä `#1f2d36`, peittävyys 0,78 (`satelliteWater`); pilvien
      päällä oleva järvikopio samalla värillä. **Kevyt Windy-ilme (2026-10):** rantaviiva tummanharmaa
      läpikuultava (ei musta), 0,9-1,6 px zoomin mukaan (n. 1,5 px lähellä, Windyn taso); varjo YKSI pehmeä taso. **Varjo EI
      summaudu (2026-10):** piirretään TÄYSIN PEITTÄVÄLLÄ valmiiksi
      lasketulla värillä (`coastShadowColorAt()` = tausta + musta *
      peittävyys) PILVIEN ALLA heti taustan jälkeen (ei Satelliitissa) -
      päällekkäiset varjot eivät voi olla tummempia kuin huippuväri.
      **Häivytys (2026-10):** tummin heti rannassa, hiipuu Gaussin
      käyrää pitkin nollaan (`coastShadowCurve`/`SigmaFrac`/`FadePxByZoom`/
      `PeakByZoom`) - koottu `coastShadowBands` täysin peittävästä
      kaistasta (leveä+vaalea alla, kapea+tumma päällä), koska MapLibren
      viivaprofiili on aina symmetrinen; mitattu profiili z9,5: 19/24/22/
      18/13/9/6/2/0 per px, ei ulkoreunaa (vanha: rako + tasavahva kaista).
      Mitattu headless-testissä: avoin ranta / kapea salmi / tiheä saaristo
      = 22,7 / 22,7 / 22,7 (vanha läpikuultava: 19 / 33 / 70) luminanssi-
      yksikköä taustaa tummempi. EI käytetty FBO+gl.MAX:ia: MapLibren
      tiilien stencil-leikkaus ja viivageometria eivät ole custom-tason
      käytettävissä; rajat vaaleammat/ohuemmat kuin
      ranta, `borderDashFromZoom` (7,5) alkaen viiva-piste-viiva vakio-
      levyisellä tasolla (kuvio sama näytöllä kaikilla zoomeilla, mitattu
      z8/z12). KAIKKI arvot `BASEMAP_GENERAL`:issa (`*ByZoom`-parit).
      Testattu headless-Chromiumissa OSM-pohjaisella 100 m meripolygonilla
      (+ NE 50m/10m pienillä zoomeilla, kuten OpenMapTiles) Pohjois-
      kalotilla, Perämerellä ja Lofooteilla - EI oikeilla OFM-tiilillä.
      Varjo merenpuolella `line-offset`:illa, merkki +1 perustuu
      MVT-spesifikaation rengassuuntaan (ulkorengas myötäpäivään, reiät
      vastapäivään -> meri aina oikealla). **Varjon leveys TÄYTYY pysyä
      tiilipuskurin (8 px) sisällä** (`tileBufferPx`, rajattu koodissa) -
      meri-polygonin leikkausreuna on tiilen puskurissa ja MapLibre leikkaa
      sen pois vain jos varjo ei ulotu puskuria pidemmälle; todennettu
      headless-Chromiumilla oikealla MapLibre 3.6.2:lla ja synteettisillä
      MVT-tiilillä (10 px varjo -> 5013 virhepikseliä tiilirajoilla, 6,5 px
      -> 0), EI oikeilla OpenFreeMap-tiilillä (ei verkkoa testiympäristöstä).
      **Maaston varjostus (2026-10):** AWS Terrain Tiles (Terrarium,
      avoin, ei avainta, attribuutio pakollinen - ks. MUISTIO-kartta.md)
      `hillshade`-tasona heti taustan päällä; merenpohjan muodot peitetään
      taustavärisellä meripolygonilla (`vt-ocean-mask`). Säädöt
      `BASEMAP_GENERAL.hillshade`. Vain Yleiskartta. Näkyy zoomista
      `startZoom` 4 (voimakkuus 0) ja täysvoimaisena `fullZoom` 5:stä
      (Windyn mukaan, käyttäjän valinta); häivytetään esiin latautuessa
      (`fadeInHillshade()`, `HILLSHADE_FADE_MS`). Tarkkuutta EI muutettu.
      **Tarkkuustasot (2026-10, 3. kierros):** sama OpenFreeMap-lähde
      määritelty useaan kertaan pienemmällä `maxzoom`:illa (`detailLevels`,
      `detailSources()`, `perDetailLevel()`): zoom < 6 tiilitaso 5 (NE 10m
      -meri - Planetilerin OSM-ranta alkaa vasta tasolta 6!), 6-8 taso 6,
      8-9 taso 7, 9-10 taso 8, täysi OSM zoomista 10. Sääntö: enintään 2
      tasoa natiivia karkeampi -> yleistys <= 0,8 px (ranta seuraa
      maastoa), luodot alle 4-8 px pois (ei Lofootien rykelmiä). 2. kierros
      käytti NE 10m:ä zoomiin 8,5 asti -> Harstadissa kulmikas ranta.
      Ranta, varjo, rajat, järvet ja joet käyttävät samaa tasoa. Lähizoomilla
      rannan/rajojen väri ja leveys liukuvat teiden arvoihin
      (`lineNearZoom`). Ks. MUISTIO-kartta.md "Rantaviivan tarkkuustasot,
      3. kierros" (myös testitapa: synteettiset Planetiler-sääntöiset
      tiilet korkeusaineiston rantaviivasta).
      Nimitasot (`vt-label-country`/`vt-label-city`) pilvien PÄÄLLÄ
      `reorderAllLayers()`:in kautta. **Maanosat ja valtameret (2026-10):**
      kaukaisimmilla zoomeilla `vt-label-continent` (isoin kirjaimin,
      harvennettu) ja `vt-label-ocean` (kursiivi, merien väri) OMASTA
      GeoJSON-aineistosta (`WORLD_LABEL_POINTS`, 7 maanosaa + 5 valtamerta,
      nimet i18n.js `geo.*`, `worldLabelsGeoJSON()`, päivittyy kielenvaihdossa
      `applyMapLabelLanguage()`:ssa). Siirtymä PERÄKKÄINEN (`WORLD_LABELS`:
      häivytys fadeStart 2,5 -> switchZoom 2,8 = tasojen maxzoom; maiden nimet
      minzoom 2,8, opacity 0 -> 1 zoomiin countryFull 3,2) -> ei koskaan
      molempia yhtä aikaa (näkymätönkin nimi varaisi tilaa törmäyksessä).
      Tiilien `water_name` class 'ocean' pois `vt-label-sea`:sta (ei tuplia).
      Miksi oma aineisto: OpenFreeMapissa on place/continent (z0-3) ja
      water_name/ocean, mutta nimiä kaikilla kielillä ja OSM-pisteiden
      sijaintia ei voitu tarkistaa (tiilet estetty testiympäristöstä). **Tiet/joet/järvet pilvien läpi
      (2026-10):** `VT_OVER_CLOUD_IDS` (joet `vt-waterway~*`, tiet
      `vt-road-*`) nostetaan heti `clouds-webgl`:n päälle samassa
      keskinäisessä järjestyksessä ja samoilla zoomrajoilla; järvet
      piirretään pilvien alle normaalisti JA läpikuultavana kopiona
      (`vt-water-over`, `lakeOverCloudOpacity` 0,5) pilvien päälle -
      pilvettömässä kohdassa sama väri saman päällä, ei muutosta.
      Maastovarjostus/meren peitto/rantavarjo jäävät pilvien alle
      (peittäviä pintoja). Testattu headless-Chromiumissa synteettisellä
      järvellä/joella/tiellä + 100 %:n pilvialueella. **Lähdemaininnat
      (2026-10, uusittu): MapLibren attribuutionappi (i) ja dynaaminen
      `cloud-attr`-lähde POISTETTU.** Tilalla: (1) asetusikkunan otsikon
      vieressä i-nappi (`#aboutBtn`, `.panel-info`) -> "Tietoja ja lähteet"
      -ikkuna `#aboutPanel` (OSM-linkki openstreetmap.org/copyright, säädatan
      lähteet `settings.weatherSources`, versio + `ABOUT_SOURCES`: nimi,
      kuvauksen i18n-avain `about.*`, lisenssi, linkki; `renderAbout()`) -
      lähdetiedot VAIN tässä yhdessä paikassa. **Lasimainen (käyttäjän toive
      2026-10):** aukeaa asetusikkunan PÄÄLLE (asetukset jäävät auki ja näkyvät
      sumeina, `backdrop-filter: blur`), sisennetty `--about-inset`, korkeus
      rajattu asetusikkunan sisään (`setAboutOpen()`), oma ruksi palaa
      asetuksiin, `closeMenu()`/muu valikko sulkee molemmat; (2) `#mapCredit`
      kartan vasemmassa alakulmassa: leveällä näytöllä (>= 700 px)
      "© OpenStreetMap contributors" pysyvästi, satelliittipohjalla
      (`body.sat`, `renderMapCredit()`) Esrin maininta AINA (puhelimella
      aikajanan yläpuolella); (3) puhelimella käynnistyessä `#osmIntro`
      (linkki openstreetmap.org/copyright) vasemmassa yläkulmassa logon alla
      `OSM_INTRO.ms` (5 s) tai ensimmäiseen KÄYTTÄJÄN kartan liikutukseen/
      zoomaukseen (movestart/zoomstart + originalEvent), sitten häivytys
      (`body.osm-intro`/`osm-fade`, `startOsmIntro()`); vain käynnistyksessä,
      ei taustalta palatessa (avaussivu poistettu 2026-10). Tyylien `attribution`-kentät ovat enää dokumentaatiota.
      Uusi lähde -> lisää `ABOUT_SOURCES`:iin + `about.*` kaikille kielille.
      Perusteet ja avoimet kysymykset (OSM:n 5 s -sääntö, Esrin kaupallinen
      käyttö): MUISTIO-kartta.md "Lähdemaininnat". `switchMapStyle()` tekee nyt
      AINA täyden `map.setStyle()`-uudelleenlatauksen (ei enää kevyttä
      yhden-tason-vaihto-oikotietä, joka ei riitä monitasoiselle
      vektorityylille). Ks. MUISTIO-kartta.md ja MUISTIO-pilviluku.md.
  - **Karttanapit (2026-10):** KAIKKI pyöreät napit (myös alivalikkojen)
    CSS-muuttujista `--btn`/`--btn-gap`: tietokoneella 40/10 px, puhelimella
    44/11 px (ennen 46/12), kuvakkeet skaalautuvat (`calc(var(--btn)*...)`);
    JS lukee samat arvot (`btnMetrics()`). YLÄRIVI (`--btn-top`): vasemmalla
    logo + nimi omalla tummalla pyöristetyllä taustalla (`header`, korkeus
    `--btn` -> logon ja nappien keskikohdat samalla korkeudella; yläreunan
    tummennusliukuma POISTETTU), oikealla valikkonappi (`#menuBtn`, kolme
    viivaa) ja sen vasemmalla Asetukset (`#settingsBtn`, hammasratas). Valikko-
    nappi näyttää/piilottaa toimintonapit JA Asetukset-napin
    (`body.settings-hidden`, tila localStoragessa `rv-settings-hidden`,
    try/catch - nimet säilytetty yhteensopivuuden vuoksi). Pino ylärivin
    alla ylhäältä alas `BTN_STACK`-järjestyksessä (2026-10: oma sijainti,
    säänappi, revontulet, kamerat, oma sijainti, karttapohja - infonappi
    POISTETTU 2026-10, infoikkuna avataan alapalkista; karttapohjan paikka
    avoin kysymys, ks. MUISTIO-infoikkuna.md "Alapalkki") SEKÄ tietokoneella
    (CSS, `--i`) että puhelimella (`placeLocate()`, toinen sarake kun tila loppuu
    aikajanaan); paikannus AINA näkyvissä (`fixed:true`, ei
    piiloudu valikkonapista eikä ole asetuksissa piilotettavissa). Kaikki
    pinon napit = luokka `.fab` (yksi CSS-sääntö). Alivalikon napit
    (`.menu-opt`) = SAMA koko, reunus ja varjo kuin `.fab`, ja samalla
    korkeudella kuin oma toimintonappinsa (mitattu: keskikohdat täsmälleen
    samat, 390 ja 1280 px). Rivi on vieritettävä (`.menu-row.scroll`) VAIN
    kun se ei mahdu - vieritysalue leikkasi varjon näkyväksi neliöksi.
    **Kuvakkeet kokonaisina pikseleinä** (`--ico` 18/20 px, `--ico-lg`
    24/26 px revontuli- ja i-napille): murtolukukoko (19,125 px) + napin
    scale-animaatio jätti ruudukkoikonin ajoittain sivuun keskeltä. Asetukset (kiertyy auki ollessa)
    avaa `#settingsPanel`-ikkunan
    (kielivalinta) - ikkunat (`.info-panel`) ovat `state.openMenu`-arvoja
    kuten asetusrivit, ja puhelimella ne jättävät nappisarakkeen näkyviin
    (`right: 30px + --btn`), jotta toisen napin napautus sulkee ne. Zoom-napit POISTETTU (2026-10): rulla, tuplaklikkaus,
    +/- ja nipistys riittävät. Kartta EI käänny eikä kallistu millään
    tavalla (`dragRotate:false`, `touchPitch:false`, `maxPitch:0`,
    `touchZoomRotate/keyboard.disableRotation()`). Piilossa + jokin toiminto päällä -> piste
    hammasrattaassa (`body.any-on`). **Näkyvät napit (2026-10):** Asetuksissa
    kytkin jokaiselle `BTN_STACK`-napille (`renderButtonSwitches()`), oletus
    kaikki näkyvissä, `rv-hidden-btns` (try/catch). Piilotettu nappi saa
    `.btn-off`-luokan, sen taso sammutetaan (`turnOffHiddenLayer()`; myös
    käynnistyksessä), ja pino tiivistyy: `placeLocate()` asettaa
    tietokoneella `--i`:n vain näkyville napeille ja ohittaa puhelimella
    piilotetut. Asetukset- ja valikkonappi eivät ole piilotettavissa.
  - **Toimintonapit ja asetusrivit (2026-10):** YKSI rekisteri `ACTIONS`.
    Tyyppi a (`toggle`): revontulet, kamerat - napautus päälle/pois. Tyyppi b (`menu` ilman togglea): sää, karttapohja
    - napautus avaa/sulkee asetusrivin. **Säänappi (2026-10)** (`#weatherBtn`,
    pilvi+aurinko) korvasi pilvi- ja tuulinapin: rivi `#weatherMenu`
    säänapista poispäin pilvet (`#cloudOptBtn`) · tuuli (`#windOptBtn`,
    kolmen tuuliviivan Lucide "wind" -ikoni käyttäjän mallin mukaan),
    kumpikin kytkee oman tasonsa; säänappi `.on` kun jompikumpi päällä.
    3. taso: tuulen korkeudet + i-nappi `#windInfoBtn` (-> `#windInfo`, `renderWindInfo()`, 2026-10-22) `#windLevelPanel` (`.menu-col`) sarakkeena
    tuulinapin ALLE (`positionWindColumn()`), vain kun säävalikko auki JA
    tuuli päällä; valittu korkeus `.active`. Karttapohjassa valitun
    napautus ei tee mitään. Kamerat ja revontulet = a + `menuOnActivate` (päälle
    kytkettäessä aukeaa rivi: "Kaikki kamerat" -ruudukkonappi / i-nappi,
    joka avaa revontulien infoikkunan `#auroraInfo` - ikkuna on
    `state.openMenu`-arvo kuten rivit, ks. MUISTIO-revontulet.md). Rivit omassa
    `#menus`-säiliössä (fixed, inset 0, z 35 = nappien+paneelin päällä,
    modaalien alla, pointer-events vain riveillä), `positionMenu()`
    asemoi napin vasemmalle samalle korkeudelle (toisen sarakkeen napit
    huomioiden; hyvin matalalla näytöllä varasijoitus napin alle), liian
    pitkä rivi vierittyy. Vain yksi rivi auki (`state.openMenu`); sulkeu-
    tuu napista, toisesta napista tai kartan napautuksesta (joka EI
    silloin valitse pistettä). Päällä = `.on` (2 px reunus + ikoni
    `--aurora`), aktiivinen asetus `.menu-opt.active` samalla tyylillä.
    Siirto a -> b: poista `toggle`, lisää `menu` + rivin napit.
    Oma sijainti on kertatoiminto (ei rekisterissä, ei reunusta).
    Kuvakkeet: Satelliitti = OIKEA ilmakuva (`STYLE_SVG.satellite`: yksi
    Esri World Imagery -tiili `SAT_THUMB` = 16/37331/18920 (Kehä III ×
    Lahdenväylä, käyttäjän valinta, kierretty 90° myötäpäivään `rot`;
    valintanäkymä `?ilmakuva=1` poistettu), varalla piirretty
    `SAT_THUMB_FALLBACK`; mainittu `ABOUT_SOURCES`:ssa). Esikatselut täyttävät
    koko pyöreän napin (`#mapStylePanel .style-opt > svg/img`, id-taso: muuten
    kuvakkeiden kokosääntö `:is(...,.menu-opt) > svg` kutistaa Yleiskartan
    piirroksen neliöksi - todettu 2026-10, commit cbc2757), revontulet =
    piirrostyylinen verho (2026-10: haalea takaverho poistettu - näytti
    pienenä punertavalta laatikolta), vihreä alaosa liukuu ylöspäin
    kirkkaaseen punaiseen (#FF2D55), tähdet valkoisia pisteitä. 3. versio
    (2026-10): punainen SEURAA verhon aaltoilevaa yläreunaa (yläreunaa
    pitkin pehmennetty leveä punainen viiva, rajattu verhoon - suodattimen
    alue koko ikoni, muuten tuli suora raja), pystysäteet rajattu verhon
    sisään, kirkas alareuna päättyy verhon sivuihin (sivurajaus) -
    YKSI yhteinen kuvake `auroraIconSVG()` toimintonapissa JA lipussa
    (omat gradientti-id:t per kopio). Revontulien i-nappi (2026-10,
    käyttäjän malliliite): kursiivi-i (koukku, kalteva varsi, häntä), piste
    varren KALTEVAN akselin jatkeella (ei samalla pystyviivalla - kursiivissa
    oikein), kuvio ympyrän keskellä; 2. versio (2026-10, käyttäjän uusi
    malliliite): paksumpi varsi (2,3), piste selvästi erillään varresta,
    kuvake `--ico-lg` (~0,6 x --btn). Ympyrä r 10 (oli 9); kirjain
    keskitetty ympyrään pikselimittauksella (translate .05/.32). i-napin
    paikka napin vasemmalla samalla korkeudella on TARKOITUKSELLINEN (sama
    kuin kaikilla asetusriveillä, `positionMenu()`; mitattu keskikohdat
    samat).
  - **Ikkunoiden otsikkorivi ja ruksi (2026-10): YKSI yhteinen rakenne**
    `.panel-head` > `.panel-title` + `.panel-close` (Asetukset, revontulien
    info, kamerakortti, Kaikki kamerat). Infoikkunassa `#info` EI otsikkoa
    eikä ruksia (2026-10): kahva + sijaintikytkin, ks. Infoikkuna. Ikkunan sisämarginaali ylhäällä 14 px ja oikealla
    16 px -> ruksi (44x44, X 14 px) aina 6 px kulmasta, otsikon rivi ruksin
    keskikohdalla (mitattu: otsikko 28,5 / ruksi 29 px yläreunasta, kaikki 5
    paneelia, 390 ja 1200 px). Uusi ikkuna -> käytä samoja luokkia, ÄLÄ tee
    omaa ruksia. Ilman otsikkoa/ruksia tarkoituksella: asetusrivit
    (`.menu-row`) ja asetusikkunan pudotuslistat (`#langList`, `#modelList`,
    `openPop()`) - sulkeutuvat napista/ulkoklikkauksesta.
  - **Aikajana (2026-10, 3. versio 2026-10-22):** alhaalta ylös: turvallinen alue ->
    alapalkki `#infoBar` (`--bar-h` 40) -> väli `--tl-gap` 8 px -> liukusäädin
    `#timeline` (`--tl-h` 44 = vetopallon kosketusalue, ei osu alapalkkiin; pallo
    18 px, pehmeä varjo) -> tekstirivi `#tlRow` (`--src-h` 22) SÄÄTIMEN YLÄPUOLELLA
    (peukalo ei peitä ajankohtaa vedettäessä), `--row-overlap` 6 px säätimen
    kosketusalueen tyhjään yläosaan; pinon yläreuna `--tl-stack-top` (#msg,
    #mapCredit, #dbgMap sen yläpuolella). Tekstien halo = kartan paikannimien
    (`--tl-halo` = `labelHaloColor`, ~1,2 px). Koko ruudun levyinen, sivumarginaalit 16 px
    (tietokoneella infoikkunan ollessa auki sen oikealla, `--tl-left`).
    Tekstirivi: vasemmalla ajankohta `#timeLbl` (`#timeTxt` + `.tl-back`),
    oikealla säämalli `#modelSrc` (`CLOUD_MODELS.srcLabel`) - SAMA fontti,
    koko (11 px) ja varjo (`#tlRow`:n text-shadow, napille `text-shadow:
    inherit` koska napin oletustyyli poistaisi sen - käyttäjän muistutus
    2026-10), ajankohta lihavampi. Muoto "Nyt · la 10.00" / "la 13.00 (+3 h) ↺"
    (`timeLabelText()`); siirrettynä (`body.tl-moved`) napautus palauttaa
    nykyhetkeen (`setHour(0)`), kosketusalue 44 px YLÖSPÄIN (`::after`,
    alareuna = säätimen kosketusalueen yläreuna); nykyhetkessä nappi ei ota kosketuksia (vetopallo saa ne).
    Pilleri POISTETTU. 24 h katto ennallaan (`applyTimelineBounds`).
    **Näkyvyys sidottu TASOJEN tilaan** (`updateTimelineVisibility()`,
    `body.tl-off` kun pilvet JA tuuli pois): säädin ja ajankohta piiloon,
    säämalli jää samaan kohtaan. **Aikajanan liikuttaminen EI SAA siirtää
    MITÄÄN elementtiä:** ajankohta vasemmalle ja malli oikealle tasattu,
    infoikkunan huomautuksella slot-pino (`renderFixedSlots()`).
    Viestit (lataus/virhe) `note()` -> `#msg` aikajanan yläpuolella.
  - **Näkyvyys (nimi 2026-10-21):** "näkyvyysindeksi" -nimi POISTETTU käyttöliittymästä
    - kaikkialla "Näkyvyys" (%), myös Nyt-välilehdellä (`info.index`); selitys `gl.idx`
    kertoo lähde-eron (Nyt: OVATION, Tänä yönä/7 vrk: Kp-ennuste). Avoin (hautumassa):
    lasketaanko Tänä yönä -välilehden kuluva tunti OVATIONista, jotta luvut täsmäävät.
    Koodin sisäiset nimet (`nowIdx`, `idxNum`) ennallaan.
  - **Alapalkki (2026-10):** `#infoBar`, aina näkyvä tumma pilleri alareunan
    keskellä: "⌃ 15 % · Kp 2,3 · Bz −4" = näkyvyysindeksi (`state.nowIdx`,
    sama kuin Nyt-välilehdellä), Kp, Bz NYKYHETKELTÄ infoikkunan sijainnilta
    (`renderInfoBar()`, aikajana ei vaikuta). Värit: VAIN korostus
    (`--aurora`) kynnysten `INFO_BAR` mukaan (`idxHiMin` 40, `bzHiMax` 0 =
    etelään), Kp aina neutraali; sama logiikka infoikkunassa (`idxNum`,
    Bz-solu `bz-s`/`bz-n`). Puuttuva arvo "–", vanha Bz (> `staleMin`)
    himmeä. Napautus tai veto ylös avaa infoikkunan (`infoDragDown/Move/End`,
    yhteinen otsikon vedon kanssa); puhelimella pillerin arvot häivytetään
    samassa .26 s:ssa kuin ikkuna nousee (`body.info-open .ib-pill`), ikkuna
    peittää aikajanan. `renderInfo()` piirtää AINA myös alapalkin - kutsu
    sitä (EI enää `if(state.infoOpen) renderInfo()`) kun data/sijainti/kieli/
    yksiköt muuttuvat. Oma sijainti haetaan käynnistyksessä hiljaa VAIN jos
    paikannuslupa on jo annettu (Permissions API), ei lupakyselyä.
  - **Infoikkuna (2026-10):** `#info`, avataan alapalkista (`#infoBar`,
    `setInfoOpen()`; avaus JA veto (`infoDragMove`, esim. puolikkaasta koko
    näytölle) sulkevat avoimen alivalikon/ikkunan `closeMenu()`:lla, tasot pysyvät päällä - 2026-10). Puhelimella alhaalta nouseva paneeli (`--is-half`
    56 %, `.full` = koko näyttö), veto kahvasta/otsikosta (`#infoHead`)
    seuraa sormea, veto alas sulkee (2026-10-22: KOKO yläosa `#infoHead` on vetoalue,
    myös kytkin ja välilehdet; `INFO_DRAG_START` 10 px: alle = napautus, pysty =
    veto, vaaka = ei vetoa); kahvan (`#infoGrip`) napautus sulkee
    (ruksi POISTETTU; osoitinkaappauksen takia napautus käsitellään
    `infoDragEnd`:ssä `onGrip`-lipulla). Tietokoneella vasen sivupaneeli
    ylärivin alla (kahva näkyy, napautus sulkee; myös Esc ja alapalkki).
    **Sijaintikytkin** `#infoLocSeg` (`.seg`, kuten asetusten 24 h / 12 h):
    "Oma sijainti | Valittu piste", koko levyinen, puoliskot yhtä leveät;
    alla koordinaatit `#infoCoords` ("64,40° N 24,10° E", `fmtCoordsShort`)
    yhdellä kiinteän korkuisella rivillä -> ulkoasu ei hypi. Ei pistettä ->
    Valittu piste himmeä (`.dim`, aria-disabled), napautus näyttää 2,5 s
    vihjeen `info.pickHint` koordinaattirivillä. Pisteen valinta kartalta
    (`setPoint`) -> Valittu piste; lipun sulku (`clearPoint`) -> Oma
    sijainti. `state.infoMode` säilyy ikkunan sulkemisen yli. Kytkin päivittää
    kaikki välilehdet ja alapalkin (`renderInfo()`). Oma sijainti ilman
    sijaintia: "Paikannetaan…" / `info.locOff` / "–". Oma sijainti on
    ERILLINEN pisteestä (sininen piste `state.ownMarker`,
    `requestOwnLocation()`). Välilehdet Nyt / Tänä yönä / 7 vrk. **Tänä yönä (2026-10, testivaihe):** `computeNight()`:
    tunnit pimeän ajalta (`darkPeriod`, `NIGHT.maxHours`), pilvet
    TÄSMÄLLEEN ladatuista askelista (`nightCloud`), revontulet NOAA:n
    Kp-ennusteen 3 h jaksoista geomagneettisella leveysasteella
    (`kpBlockAt`, `kpVisibility`, `NIGHT.kp`), näkyvyys (ennen "mahdollisuus",
    sama nimi kuin Nyt-välilehden näkyvyysindeksillä) = arvio × pilvikerroin ×
    pimeys, paras aika = yön SUURIN näkyvyys ±1 h ILMAN kynnystä (`nightBest()`,
    5. kierros; toistuva huippuarvo -> kaikki ±1 h, päällekkäiset yhdistetään,
    rajataan yön tunteihin; 0 % koko yön -> ei parasta aikaa); vihreä korostus
    vain kun huippu >= `NIGHT.goodMin` (40 %, `best.good`), muuten neutraali
    (`.weak`), tiivistelmä aina "Paras aika klo 20–22" ilman %; sama V1-V3 ja 7 vrk; kaikissa versioissa tunnin arvot selaamalla ja kuu
    (`moonPos`/`moonEvents`). Kolme
    esitystä (2. kierros): V1 taulukko (Klo | Pilvisyys | Revontulet
    "Kp 2,3" 3 h jaksoittain | Näkyvyys) / V2 SVG-kaavio (murtoviiva pisteestä pisteeseen, ei pyöristystä, Kp-porrasviiva,
    x-akseli AJASTA (`nightChartGeom` x(t): pisteet tasatunneilla, Kp-rajat NOAA:n
    UTC-jaksoista, korostus tasan from-to; ennen solun keskikohta -> 30 min virhe),
    pilvisyys pehmeänä (`chartSeriesPath` smooth = monotoninen Fritsch-Carlson,
    oletus pois, käytössä vain V2:n pilvisyydellä), asteikko 0-100, värit
    `--night-cloud`/`--night-aur` (V1-V3), parhaat `--aurora`,
    paina 0,5 s ja liu'uta -> pystyviiva + arvoikkuna, `bindNightChart`,
    `nightHaptic`) / V3 kaksoispalkit; tuuli poistettu; kytkin vain
    kun `TEST_VERSIONS` (valinta `rv-night-ver`; LOPULLINEN VERSIO V1/V2/V3
    VIELÄ VALITSEMATTA - käyttäjän päätös). Revontulet merkitään pelkkänä
    "Kp 2,3" (luokkasanat heikko/hyvä/erinomainen POISTETTU 2026-10, `NIGHT.kp`-
    luokat `cls` jäävät sisäisesti, i18n-avaimet `night.cls.*` käyttämättä). Pimeän rajat `darkPeriod()`: sekunnin tarkkuus,
    pyöristys minuuttiin (sama arvo kaikkialla). Lämpötila: Tänä yönä ei näytä
    (valitun mallin datassa ei lämpötilaa); 7 vrk:n tuntinäkymä näyttää alimman
    lämpötilan ja suurimman tuulen ECMWF 7 vrk -ruuduista (°C ja m/s - °F-asetusta
    ei ole, avoin kysymys).
    Perusteet ja avoimet kysymykset: MUISTIO-infoikkuna.md "Tänä yönä".
    **7 vrk (2026-10):** `renderWeek()` (lista, `#tab7d`) + `#nightDetail`
    (yön tuntinäkymä, `openNightDetail`, sama V2-kaavio `nightChartHTML(n, ND_IDS)`).
    Yöt `weekWindows()` (yö 1 = Tänä yönä, sitten pimeä jakso keskipäivästä),
    tunnit `weekNight()`: pilvet valitusta mallista, sen jälkeen ECMWF 7 vrk
    -ruuduista (`data/e7d-<r>-<c>.json`, `scripts/fetch-ecmwf-7d.py`,
    työnkulku `ecmwf-7d.yml`, 2,5° ruudut, 0-216 h, myös lämpötila ja tuuli),
    Kp yöt 1-3 NOAA 3 vrk, yöt 4-7 `text/27-day-outlook.txt` (vuorokauden
    suurin Kp, "~"). Paras yö = öiden 1-3 suurin näkyvyys (aina, ei kynnystä),
    listan pilvisyys = parhaan ajan (±1 h) keskiarvo. Ks. MUISTIO-infoikkuna.md "7 vrk".
    **Selitykset (2026-10):** yksi i-nappi (`#glossaryBtn`) välilehtien rivillä +
    i-napit kaavioikkunassa (`#scInfo`, avaa kyseisen suureen kohdan) ja yön
    tuntinäkymässä (`#ndInfo`) -> `#glossary` (`GLOSSARY`, `openGlossary(id)`,
    teksteinä `swc.desc.*` + `gl.*`). Uusi suure -> lisää `GLOSSARY`:yn.
    Lasimainen (2026-10, sama lasi kuin `#aboutPanel`, ei tummennusta); vain
    `#glBody` vierii (otsikkorivin alle vierivää tekstiä ei voi sumentaa).
    Päällekkäiset ikkunat ja takaisin-ele: jokainen popstate-kuuntelija sulkee
    ikkunansa VAIN jos sen oma `history.state`-merkintä (rvGloss/rvChart/rvNight)
    ei ole enää voimassa -> takaisin-ele sulkee vain päällimmäisen.
    **Nyt-välilehti (`renderNow()`) AINA `new Date()`:llä** - `update()`
    (aikajana) EI koske sen arvoihin; ainoa aikajanasta riippuva osa on
    yläreunan huomautus (`renderNowNotice()`). Sisältö: näkyvyysindeksi +
    yhden lauseen tulkinta (`info.verdict.*`), Revontulet + Pilvisyys
    -laatikot, pimeä jakso (`darkPeriod()`, raja `SUN_DARK_DEG` = -6° =
    sama kuin indeksin `darknessFactor`), avaruussää. Indeksin kaava:
    MUISTIO-infoikkuna.md.
  - **Avaruussää (2026-10):** NOAA SWPC selaimesta, `SPACE_WX`-säätövakio
    (osoitteet, päivitysvälit, `staleMin` 15, `smoothMin` 10, Bz-vihjeen
    kynnykset `hint`). HUOM: `products/solar-wind/mag-1-day.json` ja
    `plasma-1-day.json` POISTETTU NOAA:lta (SCN 26-21) -> käytössä
    `json/rtsw/rtsw_mag_1m.json` / `rtsw_wind_1m.json` (olioita, `active`-
    satelliitti, -9999 = puuttuu), vanhat varalla. Haku käynnistyksestä
    alkaen (alapalkki näyttää Bz:n): infoikkuna auki 1 min, kiinni 10 min,
    piilotetulla välilehdellä ei lainkaan. Yli 15 min vanha -> himmennys + "ei tuoretta dataa", EI
    vihjettä. Bz:n trendi liukuvasta keskiarvosta (`bzTrend()`).
    **Historiakaaviot (2026-10):** laatikot Kp, Bz, Bt, nopeus, tiheys, teho
    (kuvake oikeassa yläkulmassa, `data-chart`) avaavat `#swChart`-ikkunan
    infoikkunan päälle (`openSwChart()`/`renderSwChart()`, rekisteri
    `SW_CHARTS`, säädöt `SWC`). Ruksi, Esc ja takaisin-ele (history.pushState +
    popstate) sulkevat. Pilvisyys-laatikko avaa pilvisyyskaavion (`clouds`, ks.
    "Korjaukset 2" alla; ennen vei Tänä yönä -välilehdelle).
    Data: Bz/Bt/nopeus/tiheys = sama 24 h rtsw-tiedosto kuin yllä (ei
    lisähakua); "Saapunut Maahan" = NOAA:n `propagated-solar-wind-1-hour.json`,
    varalla 1,5 milj. km / nopeus; Kp = k-index + forecast (observed/estimated/
    predicted) vasta avattaessa; GW = hemi-power-tiedoston rivit (vain kuluva
    UTC-vrk, istunnossa kertyneet säilyvät). Päivitys 1 min vain auki ollessa.
    **YHTEINEN KAAVIOKOMPONENTTI** (`bindChartScrub()`, `.ch-*`, `CHART`):
    sama ulkoasu ja vuorovaikutus Tänä yönä V2:ssa ja näissä - uusi kaavio
    käyttää samaa, ÄLÄ tee omaa painallus-/liu'utuslogiikkaa. Tarkastelun
    aikana piirto lykätään (`chartScrubbing`, `chartPending`). Kosketus
    touch-tapahtumilla (EI pointer: iOS katkaisee ne vierityksen alkaessa):
    kaaviot (`axis:'x'`) sivuttainen liu'utus heti tai pitkä painallus,
    taulukot V1/V3 (`axis:'y'`, `bindNightTable`) pitkä painallus + liu'utus;
    pystyveto ilman painallusta vierittää. SVG:llä ei ole offsetTop:ia ->
    sijainnit `getBoundingClientRect`-erotuksena (`chartSvgPick`).
    OP-tyyli (V2 + avaruussään kaaviot): `ch-bg` yhtenäinen tausta, `ch-vgrid`
    pystyviivat, `ch-grid dash` katkoviivat, arvot tekstinä `.ch-readout`-tilaan
    (ei täyttöä käyrän alla).
    Arvoikkuna (3. kierros, `chartReadout(aika, arvo, tila)`): keskitetty
    pystyviivan yläpuolelle, alareuna `CHART.readoutGap` (8 px) piirtoalueen
    yläpuolella, tila varattu `SWC.top`/`NIGHT_CHART.top` (58); `.ch-marklab`-
    merkinnät piiloutuvat päällekkäin osuessa. Kp: tilat observed/estimated/
    predicted (arvio keltainen katkoviiva), tarkastelu tasatunneittain + Nyt.
    "Saapunut Maahan" -viiva (himmennetyllä alueella ei tekstiä); data alkaa myöhemmin ->
    viivoitus + "Tiedot alkaen" (GW: NOAA:lla vain kuluva UTC-vrk).
    Perusteet: MUISTIO-infoikkuna.md "Avaruussään historiakaaviot".
    **Korjaukset 2 (2026-10):** ei lähdetekstejä kaavioissa eikä Nyt-välilehdellä
    (vain asetusten Tietoja-ikkuna) - kaavion alarivi "Päivitetty HH.MM";
    piste `.ch-dot` = `--aurora` + musta 2 px reunus; arvoikkunan rivit 12 px
    (arvo vain lihava + `--ink`). Kp-otsikko = KULUVAN jakson arvo
    (`kpCurrent()`, sama Nyt-välilehdellä ja alapalkissa) + "arvio · jakso
    15–18"; `kpKind()`: tulevat jaksot AINA "ennuste" (NOAA:n `estimated`
    tulevalle = ennuste). Pilvisyys-laatikko avaa kaavion `clouds`
    (`swcClouds()`): 24 h = ajon alku +24 h, 12 h = 3 h ennen nyt +12 h,
    tasatunnit. Ks. MUISTIO-infoikkuna.md "Kaavioiden korjaukset 2".
  - **Säämalli asetuksissa (2026-10, 2. versio):** vasemmalla pelkkä
    "Säämalli"; valitsinnapissa (`#modelPickBtn`) oikealla kaksi oikeaan
    tasattua riviä (`.mp-lines`): "HARMONIE 5 km" (`#modelName` + `#modelRes`)
    ja "Päivitetty la 15.00" (`#modelRun`, `settings.updatedAt`, ajoaika
    `modelRunTime()`: meta.run tai 1. aika-askel) samalla koolla/värillä kuin
    "5 km" (`.mp-res`/`.mp-run`), ei rivitystä (`nowrap`). Pudotuslistat `openPop()`.
  - **Uloin zoom vähintään 2 (2026-10, `minZoomFor()`):** tiilitasoilla 0-1
    mantereet ovat Natural Earth 1:110 milj. (hyvin karkea); puhelimella
    (korkeus ~750 px -> 1,87) se näkyi uloimmassa näkymässä. Tarkempaa
    aineistoa EI voi pakottaa pienemmälle zoomille: MapLibre 3.6 hyväksyy
    vektorilähteelle vain tileSize 512 (256 kokeiltu -> kartta kaatui).
  - **Värinäpalaute (2026-10):** aikajanaa KÄSIN vedettäessä `HAPTIC_MS` (25 ms;
    10 ms oli liian heikko - voimakkuutta ei voi säätää, vain kestoa)
    `navigator.vibrate` aina kun tuntipykälä ylittyy (vertailu edelliseen
    `state.hour`:iin 'input'-tapahtumassa). Asetuksissa kytkin "Värinäpalaute"
    (`#hapticsSwitch`, role=switch), oletus päällä, `rv-haptics` (try/catch),
    piilotetaan jos `navigator.vibrate` puuttuu (iOS).
  - **Asetusikkuna ja yksiköt (2026-10):** tiivis, yksi 44 px rivi per
    asetus, valinnat segmenttinappeina (`renderSeg()`, role=radiogroup):
    Kieli, Kellonaika 24 h/12 h, Etäisyydet km/mi, Värinäpalaute-kytkin.
    `UNITS` {clock, dist} (oletus laitteen kielestä: 12 h jos sen oma muoto
    on 12 h, mailit -US/-GB/-LR/-MM; muistetaan `rv-clock`/`rv-dist`).
    KAIKKI kellonajat `timeOpts()`:n kautta, KAIKKI etäisyydet/korkeudet
    `fmtDist()`/`windLevelHeight()`:n kautta (mallin tarkkuus, tuulen
    tasonapit ja niiden aria/nimet `{h}`-muuttujalla) - ÄLÄ kirjoita uutta
    "km"- tai kellonaikamuotoilua suoraan. Yksikön vaihto ajaa saman
    päivitysketjun kuin kielenvaihto (`setUnit()` -> `setLanguage(LANG)`).
    Tuulen nopeus (m/s) ei kuulu km/mi-valintaan.
  - **Kielet (2026-10): suomi, englanti, yksinkertaistettu kiina, espanja,
    ranska** (es/fr lisätty 2026-10; epävarmat käännökset merkitty
    `// TARKISTA`, lista MUISTIO-kielet.md:ssä). Kielivalinta asetuksissa
    = PUDOTUSVALIKKO samalla ilmeellä kuin säämallin valitsin (`#langPickBtn`
    .model-pick + `#langList` .opt-pop/.opt-item); lista on asetusikkunan
    SISÄLLÄ eikä `state.openMenu`-arvo (muuten asetusikkuna sulkeutuisi),
    `openLangList()`/`closeLangList()`, sulkeutuu myös `closeMenu()`:ssa. KAIKKI
    käyttöliittymätekstit `i18n.js`:ssä (`I18N[kieli][avain]`, `t(avain,
    {muuttujat})`, HTML:ssä `data-i18n` / `data-i18n-aria` / `data-i18n-title`,
    `applyI18n()`). ÄLÄ kirjoita uusia UI-tekstejä suoraan index.html:ään -
    lisää avain KAIKILLE kielille (`node scripts/check-i18n.mjs` tarkistaa
    avaimet ja paikkamerkit). Kiinankieliset on merkitty
    `// TARKISTAMATON` (tarkistetaan erikseen). Oletus: tallennettu valinta
    (`rv-lang`) -> `navigator.languages`:n ensimmäinen tuettu (zh-Hant/TW/HK
    EI ole tuettu) -> englanti. Päivämäärät/ajat/desimaalit Intl:llä
    (`langLocale()`: fi-FI, en-GB, zh-CN). **Paikannimet (sääntö
    uusittu 2026-10, korvaa "kaikki valitulla kielellä"):** kiina = KAIKKI
    nimet kiinaksi (name:zh-Hans -> name:zh), varalla name:en -> paikallinen
    `name` (2026-10; ilman kiinankielistä OSM-nimeä ei korjata, ks.
    MUISTIO-kielet.md); kameroiden maa `Intl.DisplayNames`:llä (`camName()`,
    `country`-koodi cameras.json:ssa);
    suomi/englanti/espanja/ranska = maat (`vt-label-country`) ja meret (`vt-label-sea`,
    water_name: ocean/sea/bay/strait, kursiivi) valitulla kielellä (varalla
    name:en -> name), kaikki muut (kaupungit ym.) paikallisella nimellä.
    `labelTextField(kind)` + `LABEL_KIND`, molemmilla pohjilla. Kiinan merkit piirtää MapLibren
    `localIdeographFontFamily` (laitteen fontti). `setLanguage()` päivittää
    kaiken lennossa. Kääntämättä tarkoituksella: brändinimi, mallien nimet,
    kameroiden nimet (data), konsoliviestit ja `?griddebug`/`?paletti`/`?debug`-
    testinäkymät. `i18n.js` on Service Workerin SHELL-listassa ja
    versiohook bumppaa myös sen muutoksista. **Avaintarkistus:** `node
    scripts/check-i18n.mjs` (samat avaimet kaikilla kielillä + jokainen
    index.html:n kiinteä avain määritelty) - aja ennen committia, kun
    lisäät tekstejä. **Raakoja avaimia näkyvissä ("settings.clock")** =
    vanha i18n.js välimuistissa, EI puuttuva käännös: SW:n asennus haki
    SHELLin selaimen HTTP-välimuistin kautta (Pages max-age 600) -> uusi
    index.html + vanha i18n.js. Korjattu 2026-10: `cache:'reload'` asennuksessa. **Uusi juuritason
    sovellustiedosto TÄYTYY lisätä myös `publish-pages`-actionin
    `cp`-riviin ja `sync-pages.yml`:n `paths`-listaan** - muuten se ei
    päädy gh-pagesille (todettu: i18n.js puuttui ensimmäisestä julkaisusta).
  - **Paletti (2026-10, hyväksytty ja käytössä):** KAIKKI käyttöliittymän
    värit viidestä `--pal-*`-roolista `:root`:issa (pohja, pääkorostus,
    teksti, toissijainen tausta, tehoste). Vanhat muuttujat (`--night`,
    `--panel`, `--ink`, `--aurora`, `--violet`) ovat aliaksia, `--line`/
    `--dim`/`--accent-dim` lasketaan `color-mix()`:llä - ÄLÄ lisää uusia
    kovakoodattuja UI-värejä. Napit/aktiiviset = pääkorostus, tehoste
    (violetti) VAIN varoituksiin/virheisiin ja "Revontulet: nyt" -merkkiin.
    Paletin ULKOPUOLELLA tarkoituksella: kartan datavärit (pohjakartta,
    revontuliluokat, pilvet, tuuli), karttamerkit (oma sijainti, kamerat),
    Windy-tyylinen pilvilippu, valkoiset zoom-napit ja revontuli-/
    satelliittikuvakkeiden piirrokset. Kokeilu: `?paletti=1`.
  - **Aikajanan askel (OSA 3, 2026-10): `#timeSlider`:in `step` 1 h**
    (ennen 0,5 h) — PELKKÄ käyttöliittymän vetoaskel/nuolinäppäin-
    granulariteetti (`index.html`:n `<input id="timeSlider">`; toistonappi
    poistettu 2026-10). EI
    vaikuta/liity: ennustehorisonttiin (`applyTimelineBounds()`:in
    `slider.max`, lasketaan datan viimeisestä aika-askeleesta,
    koskematon), mallikohtaisiin aika-askeliin (`resolveStep()`/
    `state.cloudGrid.steps`, datan OMA ajallinen resoluutio — 3 h
    ECMWF, 1 h ICON-EU/HARMONIE — pysyy ennallaan, slider-arvo on
    jatkuva liukuluku jota näytteistetään/interpoloidaan riippumatta
    vetoaskeleesta), OVATIONin "aina nykyhetki" -jäädytykseen (ei lue
    slider-askelta mitenkään) eikä "Revontulet: nyt" -merkintään
    (`auroraNowBadge`, togglataan `state.hour !== 0`:lla, ei askel-
    kokoon sidottu). `formatOffset()` (tuntien/minuuttien tekstimuoto)
    toimi jo ennestään kokonaisluvuille, ei muutosta.
  - Revontulet: NOAA SWPC OVATION, ovation_aurora_latest.json
    (lyhyt ennuste ~30-90 min, päivittyy ~5 min välein). **Tuleva (käyttäjän päätös
    2026-10-21):** esikäsittely (pakkaus ~155 kt -> ~6 kt) tehdään Cloudflare-siirron
    yhteydessä Cloudflare Workerilla (haku NOAA:lta pyynnöstä, välimuisti 1-2 min),
    EI GitHub Actionsilla (viive). Siihen asti haku suoraan NOAA:lta. Ks. MUISTIO-lataus.md. **Aikaleimat
    (2026-10):** `Observation Time` = päivitetty (`state.ovation.time`),
    `Forecast Time` = ennusteen raja (`state.ovation.forecast`); teksti
    "Ennuste klo HH:MM asti, päivitetty HH:MM" (`ovationTimesText()`,
    infoikkuna + selitysrivi). Ennen Forecast Time näytettiin "päivitettynä"
    -> kello näytti tulevaisuutta. **Kenttä (2026-10, vertailukuvan mukainen
    ilme - korvasi luokituksen, liukuvan värityksen ja 1°-solut):** tasainen
    suorakulmioruudukko MERCATOR-koordinaateissa (`auroraGridGeometry()`):
    kaikki ruudut näytöllä samankokoisia leveysasteesta riippumatta (mitattu
    z4: 45,5 x 46,6 px sekä 60, 70 että 75 °N:ssa), ruudukko alkaa 180°:sta
    ja päiväntasaajalta (0° ja 180° aina ruutujen rajoja). Arvo ruudun
    keskipisteessä BILINEAARISESTI (`ovationBilinear()`, pituusaste kiertää ->
    ei saumaa 0°/180°), yksi ruutu = yksi tasaväri (kuva 8 px/ruutu ilman
    pehmennystä + `raster-resampling:'nearest'`). Säätövakio
    `AURORA_FIELD_DEFAULTS`: `cellLonDeg` 2, `cellLatDegAt70` 0,7, `alpha`
    0,7, `steps` = 12 x [alaraja %, väri] (10-92,5 % / 7,5 %, #2eb013 ...
    #b70b09); alle steps[0] (10 %) täysin läpinäkyvä. Porrastaulukon voi
    tihentää alapäähän muuttamalla `steps`-alarajoja - kartta ja selite
    lukevat saman taulukon. Selite = vaakapalkki 0-100 % infoikkunassa
    (`auroraLegendBar()`). `?debug`: Kynnys %, Porrasväli % (alarajat
    tasavälein), Alfa, ruudun leveys/korkeus + 12 värivalitsinta
    (`rv-debug-aurora-field`, "Kopioi arvot" antaa `AURORA_FIELD_DEFAULTS`-
    rivin). Tasojärjestys (`reorderAllLayers()`): pilvet -> järvikopio ->
    REVONTULET -> joet, tiet, tuuli, rajat, ranta, nimet (paikannimet ja
    tiet revontulien päällä; tuuli nyt revontulien yläpuolella, ennen alla).
    Lippu: `ovationAt()` = sama bilineaarinen arvo pisteessä. Alapaneelin
    Revontulet-laatikon luokan nimi (`AURORA_STYLE.classes`, 1/10/30/50 %)
    ennallaan. Perustelu: MUISTIO-revontulet.md.
    **Kp (2026-10):** NOAA:n products-JSON on nyt `[{time_tag, Kp}]`
    (SCN 26-21) - `kpRows()` lukee uuden ja vanhan muodon.
    **Kp NYT (2026-10-19, bugikorjaus): nyt-arvo EI KOSKAAN ennustetiedostosta.**
    `kpNowInfo()` = reaaliaikainen `json/planetary_k_index_1m.json` (VAIN `estimated_kp`,
    ei kp_index; VIIMEISIN minuuttiarvo kuten My Aurora Forecast - jakson suurin
    poistettu 2026-10-20; <= `KP_RT.staleMin` 20 min vanha, otsikossa "arvio ·
    päivitetty 09.53", arvoikkunassa "Arvio (ennuste 1,3)") -> varalla viimeisin mitattu
    3 h jakso ("0,3 · mitattu 18–21"). Alapalkki, Nyt, Kp-kaavion otsikko ja
    `kpBlockAt()`:n kuluva jakso (Tänä yönä / 7 vrk) käyttävät sitä; ennuste vain
    tuleville jaksoille + kuluvan jakson arvoikkunassa (himmeä viiva poistettu).
    Jakson vaihde (2026-10-20): minuuttiarvio nollautuu jakson alussa -> ensimmäiset
    `KP_RT.carryMin` 60 min nyt-arvo = max(edellinen jakso [mitattu tai sen viimeisin
    minuutti], kuluvan uusin), alarivi "arvio · edellinen jakso 18–21". NOAA:n
    time_tag ilman vyöhykettä = UTC (`kpRowFrom`/`swTime` lisäävät Z:n).
    Kp-kaavio 24 h = 18 h taakse + 6 h eteen (`SWC.kpPastH24`).
    Ks. MUISTIO-infoikkuna.md "Kp nyt -korjaus" ja "Kp nyt: jakson arvio".
  - **Still-kamerat (2026-10-24, vaihe 1):** `data/cameras.json` `type: "still"`: `owner`, `page`
    (omistajan sivu), `image.url` (kuva suoraan omistajalta, EI omaa kopiota), `image.sizeKB`
    (raskas > `STILL.autoMaxKB` 600 -> "Näytä kuva (koko)" -nappi, ruudukossa ei ladata),
    `lupa` ("public domain" | "pyydetty" | "myönnetty" | "ei pyydetty") + `lupaPyydetty` (päivä).
    Poisto = rivin poisto. Haku enintään 5 min välein (`STILL.refreshMs`) ja vain kortin /
    ruudukon ollessa auki. Kortti: tyyppimerkki (Still-kuva / YouTube-kuva / Video, `camType()`),
    omistajan nimi + linkki, "Kuva haettu hh.mm" (selain ei voi lukea kuvan aikaleimaa, ei CORSia).
    Tietoja-ikkunassa omistajat (ei poistopyyntötekstiä - käyttäjän päätös: ylimääräiset kamerat poistetaan ennen julkaisua). SGO:n kamerat odottavat
    lupaa. **Tuoreus palvelimelta (2026-10-24):** `check-camera-thumbnails.py` hakee still-kuvan
    alun (Range 64 kt) 10 min välein -> camera-status.json `imageChangedAt` (tiiviste), `placeholder`
    (`image.offlineBytes` / `image.offlineUrlMatch`), `offline`; sovellus `stillServer()` -> harmaa,
    jos offline tai ei muuttunut 30 min. Abisko = Twitchin esikatselukuva (`jtvnw.net`). Ei aktiivinen = HARMAA (ei piiloon): GeoJSON `status` 'live'|'offline', feature-state
    `g` häivytys (`CAM_LAYERS`, `updateCameraStatusStyle`). Ks. MUISTIO-webkamerat.md osat 15-17.
  - **Revontulikamerat (2026-10, vaihe 1: YouTube):** `data/cameras.json`
    (käsin ylläpidetty, pieni kuratoitu lista — ei hakuskriptiä, EI
    automaattihaku koska lista muuttuu harvoin; rakenne laajennettavissa
    tulevalle `"type":"image"`-tyylisille tiedekameroille, ks.
    MUISTIO-webkamerat.md osio 5). Kartalla oma `cameras`-symbolitaso,
    päälle/pois `#camerasBtn`. **Kamerakortti (2026-10) ylhäältä alas:** nimi
    ja ruksi, "Katso YouTubessa", kuva, tekijä ("Kuva: <tekijä> · YouTube",
    `cam.photoBy`; oEmbedin author_name, varalla `operator`), tilarivi.
    Tallennusmaininta README:ssä ja TIETOSUOJASELOSTE-luonnos.md:ssä, ei
    kortissa. `"liveImage": false` cameras.json:issa = VIDEOKAMERA (pikkukuva
    todistetusti kiinteä kansikuva, esim. Utsjoki): kortissa kansikuva +
    toistonappi (`#cameraCardPlay`), napautus upottaa YouTube-soittimen
    (`youtube-nocookie.com/embed/<id>?autoplay=1&mute=1&playsinline=1`,
    `playCameraVideo()`); iframe ladataan VASTA napautuksesta ja poistetaan
    kortin sulkiessa (`stopCameraVideo()`); ei tuoreustekstiä; ruudukossa
    kansikuva + toistomerkki (2026-10, käyttäjä hylkäsi "vain linkki").
    KAIKISSA korteissa toistonappi (live-pikkukuvan päällä pienempi 48 px,
    kansikuvan päällä 64 px); ruudukossa merkki vain videokameroilla.
    Videokamerat 2026-10-17: Utsjoki, Posio, Aurora Reykjavík, Lyngen North,
    Oulu Nallikari (camera-status: kuva ei muuttunut vuorokausiin).
    Kortti/ruudukko näyttää pikkukuvan AINA
    suoraan `i.ytimg.com/vi/{id}/hqdefault_live.jpg`:sta `<img src>`:llä
    (EI kaapata/tallenneta — kuvaa ei koskaan kopioida omalle
    palvelimelle). Nimi/tekijä kortissa: YouTuben `oembed`-rajapinta
    (CORS sallittu, ei avainta). "Kuva muuttui X min sitten" -teksti EI
    perustu hakuhetkeen eikä `Cache-Control`-oletukseen, vaan
    `data/camera-status.json`:iin, jonka `scripts/check-camera-thumbnails.py`
    päivittää SHA-256-tiivisteillä GH Actionsilla
    (`.github/workflows/camera-status.yml`, 10 min välein) — ks. "Opitut
    sudenkuopat" alla, miksi tämä EI voi tapahtua selaimessa.
    **Mukautetun (ei-live) mainoskuvan tunnistus (2026-10):** osa
    kanavista näyttää kiinteää mainoskuvaa `_live`-osoitteessa striimin
    todellisen kuvan sijaan (yöajo 2026-10-15, 8 vertailua: kiinteä
    kansikuva Posio, Lyngen North, Aurora Reykjavík - myös kanavan
    UUSIMMALLA lähetys-ID:llä; elävä kuva Levi, Sodankylä, Kalajoki,
    Oulu Nallikari 8/8 ja Kilpisjärvi wide angle 5/8 - ks.
    MUISTIO-webkamerat.md osio 9). `check-camera-thumbnails.py` laskee
    `data/camera-status.json`:iin `isCustomThumbnail`-kentän kahdesta
    signaalista, MOLEMMAT vaativat PYSYVYYTTÄ ≥20 min (ei yhtä
    tarkistushetkeä, ks. "Opitut sudenkuopat" — yhden hetken vertailu
    antoi väärän positiivisen): (1) `hqdefault_live.jpg`==`hqdefault.jpg`
    tavu tavulta YHTÄJAKSOISESTI, (2) kuva ei ole muuttunut
    YHTÄJAKSOISESTI siitä kun kameraa alettiin seurata (`firstSeenAt`).
    **HUOM (korjattu 2026-10): `isCustomThumbnail` EI enää vaikuta kuvan
    näkymiseen** — lippu voi olla väärä positiivinen harvalla tarkistus-
    välillä (todettu: Levi/Sodankylä saivat sen virheellisesti), joten
    kuva näytetään AINA kun `loadCameraThumb()`:in oma lataus (`<img
    onerror>`-ketju: live → ei-live-varapolku) onnistuu. Lippu näkyy
    VAIN lyhyenä lisätekstinä (`cameraStatusText()`, yksi rivi, esim.
    "Ei muutu (kiinteä kuva?)"). **HUOM 2 (korjattu 2026-10): EI tekstiä
    lainkaan kun tuoreudesta ei ole VARMAA tietoa** (seuranta itse
    vanhentunut `MONITORING_STALE_THRESHOLD_MS`:in verran, tai
    `lastChanged` puuttuu) — epävarma teksti ("Tuoreustieto puuttuu")
    luettiin aiemmin virheellisesti varoitukseksi. Merkintä näkyy VAIN
    kun on varmaa tietoa että kuva EI päivity (`live:false`, tai
    todistetusti muuttumaton TUOREELLA seurannalla) — `renderCameraCard
    Status()` piilottaa `#cameraCardStatus`-elementin kokonaan
    (`display:none`) kun teksti on tyhjä, ei jätä tyhjää riviä näkyviin.
    "Kaikki kamerat" -ruudukko yrittää
    AINA kaikkia kameroita, ja siirtää vasta latausvirheen jälkeen
    linkkilistaan (`moveGridItemToOthers()`). Lisäkameroita (My Aurora
    Forecastin Tampere/Kuusamo/Kilpisjärvi/jne.) selvitetty — EI lisätty,
    kaikki vaativat luvan tai pidempää seurantaa. Ks. MUISTIO-
    webkamerat.md osiot 6-8.
    **Video-ID päivittyy automaattisesti (2026-10):** kanavat aloittavat
    ajoittain UUDEN lähetyksen uudella ID:llä (Posio iOmco6eIa-0 ->
    HuCjMGI8fKg) - vanhaan ID:hen jäänyt kamera näytti "kiinteältä
    kansikuvalta". `cameras.json`: `youtube.channelId` + `titleMatch`
    (+ `liveUrl:false` kanaville, joilla useita kameroita yhtä aikaa:
    Starlapland, Aurora Reykjavík). `check-camera-thumbnails.py` hakee
    kerran tunnissa kanavan `/streams`-sivulta uusimman otsikkoon osuvan
    lähetyksen (`scripts/youtube_live.py`, jaettu moduuli) ja kirjoittaa
    sen `camera-status.json`:iin (`videoId`, `resolveNote`); uusi ID nollaa
    pysyvyysseurannan; käsin muutettu `cameras.json`-ID voittaa
    (`configVideoId`). Selain: `camVideoId(cam)` pikkukuvaan,
    `camWatchUrl(cam)` = `youtube.com/channel/<ID>/live` (monikamerakanavilla
    nykyinen video-ID). **YouTube vastaa katselusivuihin (`watch?v=`)
    GitHub Actionsista HTTP 429** -> `isLiveNow`-tietoa EI saa; älä rakenna
    mitään sen varaan. `/streams`, oEmbed ja `i.ytimg.com` toimivat.
    Kamerakandidaattien testi: `.github/workflows/camera-probe.yml` +
    `scripts/probe-camera-candidates.py` (käynnistyy kun
    `.github/camera-probe.env` muuttuu `claude/**`-haaralla, ei julkaise
    mitään; Claude-kehitysympäristöstä YouTube ei ole tavoitettavissa).
    Muutokseksi lasketaan vain ENNEN NÄKEMÄTÖN kuva (CDN tarjoaa välillä
    vuorotellen kahta vanhaa versiota) + herkkä harmaasävyvertailu.
    **Ei lähetystä (2026-10-21):** kanavan /streams-sivun LIVE-merkki
    (`THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE`; päättynyt = "Streamed ... ago") ->
    `camera-status.json` `broadcast` 'live'/'none'/null (`youtube_live.channel_streams`,
    `resolve_camera_live`). 'none' -> kamera himmeä kartalla ja ruudukossa,
    kortissa "Ei lähetystä" (`camNoBroadcast()`, voimassa 26 h). Kamerat 2026-10-21:
    + Luosto (live-kuva), + Rovaniemi Apukka (video), Kilpisjärvi -> North view
    ccTVAhJU5lg videona (wide angle oli maksullinen). Inari ePFfaAgZS-Y EI lisätty
    (oEmbed 401, upotus estetty). Ks. MUISTIO-webkamerat.md osa 12.
    **Karttamerkit (2026-10-21, muutettu 2026-10-22):** `cameras-dot` (circle,
    aina näkyvissä, `CAM_DOT`) + `cameras` (symbol). Kaikki kamerat samanarvoisia
    (järjestys = tunnisteen aakkosjärjestys `camOrder`). Iso kuvake EI SAA vaihtua
    pieneksi lähemmäs zoomatessa -> raja-zoom lasketaan etukäteen (`camBigZoom()`,
    `CAM_BIG`), näkyvyys feature-state `op` + oma 300 ms häivytys
    (`updateCameraIcons()`); MapLibren oma törmäystarkistus antoi ketjureaktion
    takia vaihtoja. Napautus `cameraAtPoint()` (näkyvä kuvake, sitten piste
    44 px alueella). `queryRenderedFeatures` vaatii
    `[x, y]`-taulukon tai Pointin - tavallinen `{x, y}` antoi väärän kohteen.
    Ks. MUISTIO-webkamerat.md osat 13-14.
  - **Tuuli (2026-10, MUUTOS: seuraa pilvimallia, ei enää itsenäinen):**
    U/V-komponentit, 4 korkeutta (Pinta 10 m, 850/500/300 hPa) — mutta
    nyt JOKA kolmelle pilvimallille OMA tuulidatansa samasta lähteestä
    ja samasta bboxista kuin kyseisen mallin pilvidata (ks.
    `scripts/model_areas.py` — YKSI jaettu aluevakio per malli, jota
    sekä pilvi- että tuulihaku käyttävät, jottei bbox pääse erkanemaan).
    Käyttäjä valitsee mallin `CLOUD_MODELS`-valitsimesta kuten ennenkin,
    ja SAMA valinta ohjaa nyt myös tuulta (`WIND_SOURCES`-rekisteri
    index.html:ssä, `state.cloudModel` on ainoa mallivalinta — ei
    erillistä tuulimallin valitsinta). Windyn tapaan: jos matalapaine
    sijaitsee eri mallien mukaan eri kohdassa, tuulen pyörre ja
    pilvikuvio osuvat silti aina yhteen, koska molemmat tulevat
    SAMASTA mallista.
    - **ECMWF**: `scripts/fetch-wind-ecmwf.py` → `data/wind-ecmwf-<taso>-meta.json`
      + `-step00..16.json` (laiska 2026-10-22; koko `wind-ecmwf-<taso>.json` varalla). U/V haettu 2 pyynnöllä
      (pinta 10u/10v erikseen, painepinnat 850/500/300 hPa YHDESSÄ
      haussa — `isobaricInhPa`-ulottuvuus palauttaa kaikki 3 tasoa
      kerralla). Sama alue/horisontti kuin pilvi-ECMWF (17 askelta,
      0-48 h). ~1,3 Mt/taso.
    - **ICON-EU (DWD)**: `scripts/fetch-wind-icon_eu.py` →
      `data/wind-icon_eu-<taso>-meta.json` + `-step00..30.json` (laiska,
      kuten pilvi-ICON-EU). Pinta: hakemistot `u_10m`/`v_10m`. Painepinnat:
      hakemistot `u`/`v` sisältävät SEKÄ model-level (hybridi, EI haluttu)
      että pressure-level (hPa, HALUTTU) -tiedostoja samassa hakemistossa -
      tiedostonimi sisältää tyypin ja hPa-arvon. Sama alue/horisontti kuin
      pilvi-ICON-EU (31 askelta, 0-30 h). **Resoluutio (2026-10): ~13,9 km
      (0,125°, STRIDE=2) - TARKOITUKSELLA karkeampi kuin pilvien natiivi
      ~7 km (STRIDE=1, ks. yllä) - "mobiilisujuvuus tärkeämpi tuulelle kuin
      pilville" (käyttäjän priorisointi). EI PNG-pakkausta (sama base64-
      raakatavu-muoto kuin ennen, riittävä tälle resoluutiolle).** Mitattu
      OIKEASTI: ~224 KB/askel (~6,8 Mt/taso, oli ~58 KB/askel / ~1,8 Mt/taso
      28 km:llä).
    - **HARMONIE (FMI)**: `scripts/fetch-wind-harmonie.py` →
      `data/wind-harmonie-<taso>-meta.json` + `-step00..30.json` (laiska).
      **Alue LAAJENNETTU TAKAISIN 2026-10: koko Skandinavia
      (`-1,55,35,73.5`, SAMA `HARMONIE_BBOX` kuin pilvi-HARMONIE) —
      välissä ollut Suomi-kavennus (19-32 °E, 59-70 °N) oli VIRHE, ei
      tarkoituksellinen päätös: "tuuli ja pilvet samalta alueelta" on
      oikea vaatimus, mutta se olisi pitänyt toteuttaa laajentamalla
      pilvet tuulen alueeseen, ei päinvastoin, ks. MUISTIO-korkeudet-
      tuuli.md "HARMONIE-alueen laajennus takaisin Skandinaviaan".**
      Sama horisontti kuin pilvi-HARMONIE (31 askelta, 0-30 h).
      **Resoluutio HARVENNETTU samassa yhteydessä STRIDE=2:sta
      STRIDE=4:ään (~10 km, oli ~5 km)** — pilville 5 km riittää, mutta
      tuulelle karkeampi resoluutio kumoaa suurin piirtein alueen-
      laajennuksen tiedostokoon kannalta (mitattu: 5,60 Mt/taso Suomen
      alueella → 6,51 Mt/taso koko Skandinavialla 10 km:llä, +16 %
      — ilman harvennusta olisi ollut 26 Mt/taso, +365 %).
      HUOM: ei committoidu `main`:iin — ks. yllä "Julkaisuarkkitehtuuri".
    - Kaikki 3 mallia tarjoavat TODENNETUSTI (ei oletettu) kaikki 4
      korkeutta - `WIND_SOURCES[malli].levels`-lista on silti olemassa
      jottei tulevan, suppeamman mallin tarvitse muuttaa UI-koodia
      (ks. `populateWindLevelPanel()`, harmaa+disabloitu painike jos
      korkeus puuttuu valitulta malilta).
    - U/V kvantisoitu tavuiksi [-80,80] m/s, base64-koodattu. Selain
      lataa aina vain valitun mallin+korkeuden tiedoston, ja laiskoilla
      malleilla vain 1-2 aika-askelta kerrallaan (sama `ensureLazyStepLoaded`-
      mekanismi kuin pilvillä, ks. "Laiska pilvilataus" yllä - YKSI
      yleinen funktio, jota sekä `ensureCloudStepLoaded` että
      `ensureWindStepLoaded` käyttävät ohuina kääreinä).
    - Esitys: VAIN WebGL-hiukkasanimaatio (tuulinuolet ja hiukkasten
      päälle/pois-nappi POISTETTU 2026-10, käyttäjän päätös; `windRedraw()`
      datan latauksen/aikajanan jälkeen):
      WebGL-hiukkasanimaatio (`windParticleLayer`, CPU-advektio;
      2026-10: jokainen hiukkanen piirretään pyöreäpäisenä lyhyenä
      "pilkkuna" kolmioina + kapseli-SDF - gl.LINES + ping-pong-jälki
      POISTETTU, koska gl.lineWidth on käytännössä aina 1 px. Säädöt
      `WIND_PARTICLE`-oliossa. **Tiheys (2026-10):** hiukkaset syntyvät
      AINA näkyvälle, tuulidataa sisältävälle alueelle; määrä = tiheys *
      näkyvän data-alueen pinta-ala -> sama tiheys kaikilla zoomeilla;
      siirrossa/zoomauksessa `wpgUpdateView()` siirtää heti paljastuneelle
      alueelle sen osuuden hiukkasista (ensin näkymästä poistuneet) -
      mitattu headless-testissä tasaiseksi heti siirron/zoomauksen jälkeen.
      **Määrä ja zoom (2026-10, 2. kierros):** `DENSITY_PER_MEGAPIXEL` 675
      (puolitettu), lähizoomilla portaat `ZOOM_STEPS` (z >= 13,5 60 %,
      z >= 14,5 30 %), peittävyys 0,215/0,44 (-17,5 %). Lähin zoom
      `MAP_MAX_ZOOM` = 15 (Oulussa 1,01 m/px, 390 px ~ 394 m). Sijainnit
      ja häntä `Float64Array`, kärjet GPU:lle paikallisina pikseleinä
      näkymän keskipisteen suhteen (`WPG.origin`, matriisi 64-bittisenä JS:ssä)
      - ks. sudenkuoppa "Float32-sijainnit lähizoomilla".
      **Taipuisa häntä (2026-10):** jokaiselle hiukkaselle TAIL_POINTS
      edellistä sijaintia (rengaspuskuri, Mercator) TAIL_SECONDS-ikkunalta;
      häntä on yksi kolmionauha (TRIANGLE_STRIP, degeneroituneet liitokset)
      niiden kautta, kapenee (TAIL_END_WIDTH) ja häipyy; pituus = kuljettu
      matka ikkunassa, rajattu TAIL_MIN_PX..TAIL_MAX_PX; movestart/
      zoomstart nollaa historiat) — ks. alla. Molemmat lukevat
      `sampleWindAt()`:in kautta, joka on malli-agnostinen (ei
      muutoksia tarvittu OSA 1/2:n piirtokoodiin tämän tehtävän takia,
      vain datan LATAUS/SAILYTYS muuttui).

## Opitut sudenkuopat (pilvihilan rakentaminen/piirto)
- **Float32-sijainnit lähizoomilla = hiukkaset riveihin (2026-10):**
  tuulihiukkasten lon/lat oli `Float32Array`:ssa (leveysasteen askel
  65 °N:ssa 0,85 m) ja kärjet vietiin GPU:lle Mercator-koordinaatteina
  0..1 (Float32 -> zoomilla 18 n. 4-8 px:n ruudukko) -> lähizoomilla
  liike pyöristyi ja hiukkaset napsahtivat vaakariveihin. Ei näy
  kaukaa, eikä koodikatselmoinnissa. Korjaus: Float64 + "relative to
  center" -piirto (pienet paikalliset luvut GPU:lle, iso siirto
  matriisiin JS:ssä 64-bittisenä). Sama koskee KAIKKIA omia WebGL-
  tasoja, joissa kärjet ovat Mercator-koordinaatteja. Mittaa:
  erillisten pikselirivien määrä vs. satunnaisjakauman odotusarvo.
- **`Math.round((lon+360)%360)` voi antaa 360 - ja litteässä taulukossa
  indeksi 360 on SEURAAVAN rivin ensimmäinen solu (2026-10, revontulien
  pystysauma 0°:ssa):** lon -0,5...0 -> 359,5...360 -> round = 360 ->
  `grid[lat*360+360]` = solu (lat+1, 0). Kartalla 0,5° levyinen kaista
  0-meridiaanin länsipuolella (Grönlanti-Huippuvuoret), jossa ovaali oli
  asteen etelämpänä: palkki ulkoni alhaalla, rako ylhäällä. Ei virhettä
  konsolissa (indeksi on taulukon sisällä). Korjaus: kierrä indeksi aina
  `% 360` vasta pyöristyksen JÄLKEEN ja laske arvot pikselin
  keskipisteessä ((x+0,5)/W). Sama pätee mihin tahansa kiertyvään
  akseliin litteässä taulukossa.
- **Polygonin reunasta piirretty viiva piirtää KAIKKI reunat, myös ne
  jotka eivät ole rantaa (2026-10):** MapLibren `line`-taso polygoni-
  lähteellä piirtää jokaisen renkaan jokaisen janan. Tiilen
  leikkausreunat ovat normaalisti puskurissa ja jäävät tiilileikkauksen
  (stencil) alle, mutta jos data sisältää reunan TÄSMÄLLEEN tiilen
  rajalla (OpenFreeMap: meri kahtena koskettavana polygonina), puolet
  viivasta näkyy kummallakin puolella. Tunnistus: viiva osuu tiiligridin
  koordinaattiin (tässä 22,50° E = z4-raja, yläpää 64,168° N = z6-rivin
  raja) ja on tummempi kuin yksi viiva (kaksi läpikuultavaa päällekkäin).
  Pelkkä koodikatselmointi tai oma synteettinen data (yksi polygoni per
  tiili) ei paljasta tätä - toista vika testidatassa ennen korjausta.
- **Plain JSON-lukutaulukko on HUONO muoto 0-100-arvoiselle hilalle,
  kun resoluutio nousee - PNG voitti 11,5x (2026-10, käyttäjän oma
  oivallus):** ICON-EU:n natiivin ~7 km:n pilvihilan JSON-koko oli
  mitattu 5348 KB/askel - käyttäjä huomautti etta "pilvisyys 0-100 %
  mahtuu yhteen tavuun" ja ehdotti harmaasävy-PNG:tä JSONin sijaan.
  Mitattu OIKEASTI samalla datalla: raaka tavu+base64 = 1786 KB (33 %),
  PNG+base64 = VAIN 464 KB (8,7 %) - PNG:n DEFLATE-pakkaus hyödyntää
  sääkenttien laajoja tasaisia alueita (iso pilveton/pilvinen vyöhyke)
  paljon tehokkaammin kuin JSONin pilkulla erotetut desimaaliluvut.
  OPPI: jos data on KOKONAISLUKUJA pienellä arvoalueella (tässä 0-100)
  JA spatiaalisesti korreloitunutta (naapuriarvot usein samankaltaisia),
  harkitse KUVAPAKKAUSTA (PNG) ennen plain JSONia - ero voi olla
  suurempi kuin pelkkä base64-tavupakkaus yksinään antaisi olettaa.
  Selaimen puolella PNG puretaan Canvas-API:lla (`<img>` + `drawImage`
  + `getImageData()`) - TÄYSIN selainnatiivia, ei tarvitse JS-kirjastoa.
- **"Tuulen/pilvien alue erkani" - kun jaetaan vakio, LAAJENNA
  suppeampaan arvoon ERIKOISTUNUT osa, EI kavenna laajempaa (2026-10):**
  `HARMONIE_BBOX` yhdistettiin yhteen paikkaan (`model_areas.py`) jotta
  pilvi ja tuuli eivat voisi erkaantua - OIKEA tavoite. Mutta toteutus
  VALITSI VAARAN suunnan: tuuli (jolla oli jo laajempi, todennettu
  NaN-vapaa alue) KAVENNETTIIN pilvien suppeampaan Suomi-rajaukseen,
  sen sijaan etta pilvet olisi LAAJENNETTU tuulen alueeseen. Lopputulos
  oli TEKNISESTI oikein (molemmat samalla alueella) mutta kayttajan
  kannalta regressio (molemmat nayttivat nyt vain Suomen, vaikka
  toinen oli aiemmin nayttanyt koko Skandinavian). OPPI: kun kaksi
  aiemmin ERILLISTA arvoa yhdistetaan yhdeksi jaetuksi vakioksi,
  TARKISTA kumpi arvo oli OIKEASTI parempi/laajempi/tarkempi ENNEN
  valintaa - ala oleta etta "jompikumpi kayttaa toisen arvoa" on
  neutraali valinta, koska se EI ole jos toinen arvo oli tarkoituksella
  parempi (tassa: laajempi, Python-testihaulla validoitu NaN-vapaa
  alue, ks. MUISTIO-korkeudet-tuuli.md).
- **(HISTORIA 2026-10: MapLibren attribuutionappi poistettu kokonaan, ks.
  "Lähdemaininnat" - oppi pätee yhä muihin lähteen kenttiin.)**
  **MapLibre-lahteen `attribution`-teksti on STAATTINEN merkkijono
  lahteen LUONTIHETKELLA - ei sidota dynaamisesti mihinkaan funktioon
  jalkikasin (2026-10, todettu oikea bugi):** `cloudAttrSuffix()` laskee
  AINA tuoreen tekstin valitusta pilvimallista, mutta se upotettiin
  `base`/`base-labels`-lahteen `attribution`-kenttaan VAIN kartan/
  pohjakartan ALUSTUS- tai VAIHTOHETKELLA (`buildMapStyle`/
  `switchMapStyle`) - jos kayttaja vaihtoi VAIN pilvimallia
  (`switchCloudModel`) koskematta pohjakarttaan, oikean alakulman
  teksti jai jumiin oletusmalliin (ECMWF) koko istunnon ajaksi. Korjaus:
  AINA kun arvo joka vaikuttaa attribuutioon voi muuttua MUUALTA kuin
  lahteen omasta luontikohdasta, tarvitaan ERILLINEN "paivita
  attribuutio nyt" -funktio (`refreshBaseAttribution()`) jota kutsutaan
  JOKAISESTA paikasta joka voi muuttaa sen sisaltoa - ei riita etta
  lahteen RAKENTAVA funktio itse laskee sen oikein, jos lahdetta ei
  rakenneta uudelleen jokaisella muutoksella.
  **KORJAUS ITSE SISALSI UUDEN, PAHEMMAN BUGIN (2026-10, loydetty
  kayttajan raportista "attribuutio katoaa JA kartta muuttuu liian
  tummaksi"):** `refreshBaseAttribution()` luki `firstId = map.getStyle
  ().layers[0].id` ENNEN `map.removeLayer('base')`-kutsua - koska
  'base' ON layers[0] (pohjimmainen taso), `firstId` oli SIIS 'base'
  ITSE. Kun sen jalkeen `map.addLayer({id:'base',...}, firstId='base')`
  yritti lisata UUDEN 'base'-tason VANHAN 'base':n (joka oli JUURI
  poistettu) edelle, MapLibre ei loytanyt viitattua tasoa -> lahetti
  error-eventin eika lisannyt tasoa LAINKAAN. Lopputulos: EI base-
  tasoa ollenkaan (-> musta WebGL-kangas nakyi lapi, "liian tumma
  kartta") JA EI attribuutiota (-> "katoaa"). OIKEA jarjestys (SAMA
  kuin `switchMapStyle()`:ssa, joka EI karsinyt tasta): lue `firstId`
  VASTA `removeLayer`:in JALKEEN, jolloin se viittaa SEURAAVAAN yha
  olemassa olevaan tasoon, ei juuri poistettuun. OPPI: kun capturoit
  "edellisen tilan" (indeksin/id:n) ENNEN mutaatiota jota aiot tehda
  SAMALLE kohteelle, tarkista ETTA capturoitu arvo EI viittaa juuri
  siihen mika mutatoidaan - muuten "palauta entiselleen"-logiikka
  viittaa haamuun.
- **Canvas-takaisinluku (getImageData) EI ole luotettava datakanava -
  ja Uint8Array KIERTÄÄ ylivuodon (2026-10, "ICON-EU:n aukot
  puhelimella"):** iOS Safari 26 (Advanced Fingerprinting Protection,
  oletuksena päällä) ja Brave lisäävät canvas-takaisinlukuun pientä
  kohinaa (+-1..3). Data-PNG:n arvo 100 muuttui esim. 102:ksi ->
  /100*255 = 260 -> `Uint8Array` tallensi 260&255 = 4 -> täysin
  pilviseen kohtaan läpinäkyvä hilaruutu. Näkyi VAIN iPhonella.
  Korjaus: PNG puretaan itse (`decodePngGray()`, DecompressionStream),
  tekstuuri `Uint8ClampedArray`:lla. Todennettu: oma purku tavu tavulta
  sama kuin PIL oikealla ICON-EU-datalla; vanha polku + simuloitu
  +1..3-kohina -> 145185/145185 täyspilvistä pikseliä aukoiksi, uusi 0.
  EI testattu oikealla iPhonella. OPPI: älä lue dataa canvasin kautta,
  ja rajaa AINA ennen tavutaulukkoon kirjoittamista.
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
- **HARMONIE Scandinavia -mallin natiivihila EI ole suorakulmainen
  EPSG:4326:ssa:** FMI:n `/download`-rajapinta reprojisoi mallin omaan
  (todennakoisesti Lambert-) projektioon tallennetun hilan regulariksi
  lat/lon-ruudukoksi, mutta malli-DOMAIN itse on vino/kierretty suhteessa
  tahan ruudukkoon → bbox-laatikon KULMAT (ja pohjoisessa >~74 °N laaja
  alue) ovat NaN. Todennettu lataamalla data KOKONAAN ilman bbox-rajoitusta
  (~30 Mt/taso) ja tarkistamalla NaN-maski suoraan (~37 % koko laatikosta
  NaN, kaikki 4 kulmaa). ÄLÄ OLETA etta natiivialueen min/max-lat/lon
  kertoisi kayttokelpoisen SUORAKULMAISEN alueen — etsi suurin NaN-vapaa
  suorakulmio tarkistamalla jokaisen rivin ensimmaisen/viimeisen
  kelvollisen sarakkeen leikkaus koko halutulla lat-valilla (ei riita
  tarkistaa yhta riviä/pistetta). Lisaa aina eksplisiittinen NaN-tarkistus
  heti GRIB2-parsinnan jalkeen (selkea virheviesti), ei vasta
  kvantisointivaiheessa (jossa NaN->int-muunnos kaatuu sekavasti).
- **Tuulen U/V-suunta:** meteorologinen standardikonventio, U=itä,
  V=pohjoinen. Kompassisuunta (minne tuuli PUHALTAA) = `atan2(u,v)` asteina,
  EI `atan2(v,u)` eika +180 (se olisi "mista tulee"-suunta). Ristiintarkista
  AINA lahteen omaan WindSpeedMS/WindDirection-kenttaan ennen luottamista,
  jos sellainen on tarjolla — paljastaa peilautumis-/kiertovirheet
  luotettavammin kuin pelkka visuaalinen Windy-vertailu.
- **WebGL-hiukkasanimaatio (OSA 2, tuuli):** taysi GPU-ping-pong-advektio
  on herkka pienille virheille eika sita voi debugata ilman
  selainautomaatiota. CPU-puolen hiukkasadvektio (JS-silmukka, muutama
  tuhat hiukkasta) on paljon varmempi, riittavan nopea mobiilillekin,
  ja silti "tuhansia hiukkasia" -vaatimus tayttyy. GPU:ta kaytetaan vain
  haipyvaan jalkeen (2 ping-pong-tekstuuria/FBO:ta, vakiotekniikka).
  Kartan liike/zoomaus TAYTYY tyhjentaa molemmat ping-pong-tekstuurit
  (`movestart`/`zoomstart`), muuten vanhan nakyman jalki "haamuilee"
  uuden paalla.
- **Kartta-animaation nopeus EI SAA riippua zoomista:** jos hiukkasten/
  kohteiden siirtyma lasketaan maantiet. asteina * kiintea kerroin,
  nayttopikselinopeus muuttuu zoomin mukaan (kaukana zoomattuna sama
  astemaara = muutama pikseli -> "liike ei erotu"). Oikea tapa: maarita
  tavoitenopeus NAYTTOPIKSELEINA/s, muunna vasta sen jalkeen maantiet.
  siirtymaksi Web Mercator -kaavalla `metersPerPixel = 78271,5170 *
  cos(lat) / 2^zoom` TALLA leveysasteella/zoomilla. HUOM vakio: MapLibre
  maarittelee zoomin **512 px:n** laatoilla (`transform.tileSize=512`),
  joten oikea vakio on ympärysmitta/512 = 78271,5170 - EI yleisemmin
  lainattu ympärysmitta/256 = 156543,03392 (Leaflet/Google-konventio),
  joka antaisi tarkalleen 2x liian hitaan nopeuden. Tama 2x-virhe
  loydettiin VASTA Python-simulaatiolla (vertaamalla laskettua
  pikselisiirtymaa tavoitearvoon useilla zoom-tasoilla) - pelkka
  koodikatselmointi ei olisi paljastanut sita, koska kaava "nayttaa"
  oikealta ilman tarkkaa yksikkolaskentaa.
- **Ennustehorisontti vs. hakuvali - "kutistuva aikajana":** jos mallin
  koko ladattu ennustehorisontti (esim. 12 h) on lahella hakuvalia
  (esim. 6 h), aikajanan "jaljella oleva tulevaisuus" (datan viimeinen
  aika-askel miinus nykyhetki) kutistuu systemaattisesti lahelle nollaa
  juuri ennen jokaista paivitysta - EI riko mitaan, mutta nayttaa
  kayttajalle silta etta aikajana "ei toimi". Korjaus: PIDENNA horisontti
  reilusti yli nayttokaton + hakuvalin summan (tassa: 30h horisontti =
  24h nayttokatto + 6h pahin hakuvali). ALA OLETA rajapinnan todellista
  horisonttia - DWD:n ICON-EU tarjosi tunteja 78h:hen asti vaikka
  alkuperainen koodi haki vain 12h ("varovaisuus", ei rajapintarajoite);
  testaa oikealla hakemistolistauksella/pitkalla testihaulla.
- **SAMA "kutistuva aikajana" -oire voi johtua DATASTA, ei koodista -
  tarkista GitHub Actionsin ajohistoria + oikea data/-tiedosto mainissa
  ENNEN kuin epailet koodin laskukaavaa (2026-10):** ICON-EU/HARMONIEn
  aikajana jai alle 24h:n VAIKKA 30h-laajennus oli jo koodissa ja
  mainissa - syy loytyi `git fetch origin main` + GitHub Actions REST-
  API:sta (`/actions/workflows/.../runs`, `/actions/runs/{id}/jobs`):
  `pilvidata-icon_eu/harmonie/ecmwf.yml`:n "committaa jos data muuttui"
  -askelilta puuttui `git pull --rebase origin main || true` ENNEN
  pushia, toisin kuin kaikista `wind-*.yml`:ista (ja `camera-status.
  yml`:sta) jotka ajavat lahes samaan aikaan (esim. `wind-icon_eu` klo
  :58 vs. `pilvidata-icon_eu` klo :55) - plain `git push` hylkaantyi
  non-fast-forward-virheella (exit 1, EI retrya) aina kun toinen
  tyonkulku ehti pushata ensin, jattaen datan vanhaksi paivien ajaksi.
  OPPI: jos YKSI cron-tyonkulku commitoi `data/`-hakemistoon ja TOINEN
  cron-tyonkulku (eri tiedosto, SAMA main-haara) voi ajaa paallekkain,
  KAIKKIEN pitaa pullata --rebase ennen pushia, EI riita etta JOTKUT
  niista tekevat - tarkista UUSI fetch-workflow aina vertaamalla
  olemassa olevaan "sisarworkflow'hun" (tassa: wind vs. pilvidata samalle
  mallille), ei vain siihen etta se "nayttaa oikealta" yksinaan ajettuna.
  **KORJAUS OSOITTAUTUI VIRHEELLISEKSI (todettu 2026-10, kun kayttaja
  AJOI wind-harmonie.yml:n oikeasti ja se epaonnistui):** kopioitu
  `git pull --rebase origin main || true` ENNEN `git add`/commitia
  (sama jarjestys kuin "sisarworkflow'ssa" wind-*.yml:ssa) ON ITSESSAAN
  VIRHEELLINEN jarjestys - fetch-skripti on juuri muuttanut tiedostoja
  LIKAISEKSI tyohakemistoksi, ja "pull --rebase" likaisella puulla
  epaonnistuu heti ("cannot pull with rebase: you have unstaged
  changes"), nielaistuna `|| true`:lla, jonka jalkeen push yritetaan
  SILTI vanhentuneen paikallisen haaran paalta ja hylkaantyy non-fast-
  forward-virheella. OIKEA JARJESTYS: `git add` → tarkista `git diff
  --cached --quiet` → `git commit` (VASTA TASSA tyohakemisto on puhdas)
  → `git pull --rebase origin main` → `git push`, + uudelleenyrityslooppi
  (muutama kierros + lyhyt satunnainen viive) ristikkaisen tyonkulun
  varalta. LISAKSI: jos SAMA workflow-tiedosto ajaa useita matrix-jobeja
  RINNAKKAIN ja JOKAINEN niista committoi/pushaa itse (wind-icon_eu.yml,
  wind-harmonie.yml: 4 tasoa), ne kilpailevat KESKENAAN TOISTENSA KANSSA
  SAMASSA ajossa, ei vain sisarworkflow'ta vastaan - paras korjaus on
  poistaa committointi matrix-jobeista kokonaan (`actions/upload-
  artifact`), ja koota kaikki YHTEEN erilliseen jatkojobiin (`needs:
  fetch`, `actions/download-artifact` + `pattern`/`merge-multiple`) joka
  tekee YHDEN commitin/pushin koko ajolle.
- **GH Actions -cronin ajoitus julkaisuviiveen mukaan:** jos lahteella
  on MITATTAVISSA oleva julkaisuviive ajon jalkeen (esim. DWD:n
  hakemistolistauksen aikaleimat), ajasta haku ajon-hetki + viive +
  pieni marginaali - EI heti ajon alkaessa (silloin `pick_latest_run()`
  -tyylinen "etsi uusin julkaistu"-logiikka palautuu systemaattisesti
  EDELLISEEN, tarpeettoman vanhaan ajoon). HUOM rehellisesti: jos
  julkaisuviive on lahella hakuvalia, tama ajoituskorjaus tuo vain
  PIENEN (ei kokonaisen hakusyklin) parannuksen - laske tarkasti, ala
  oleta etta "oikea ajoitus" ratkaisisi koko tuoreusongelman yksinaan.
  Jos lahteella EI ole origintime-parametria/ajohakemistolistausta
  (esim. FMI:n `/download`), tarkkaa viivetta ei voi mitata samalla
  tavalla - ala arvaa ajoitusta, vaan nosta hakutiheytta: rajapinta
  joka palauttaa aina "tuoreimman saatavilla olevan" automaattisesti
  hyotyy useammasta kysymisesta riippumatta todellisesta ajo-/
  julkaisusyklista.
- **Service Worker + APP_VERSION TAYTYY bumpata JOKA index.html-muutoksella
  (2026-10: NYT AUTOMATISOITU, ks. "Versioautomaatio" alla):**
  `sw.js` tallentaa sovelluskuoren (`index.html` mukaan lukien) cache-first-
  strategialla. Selain havaitsee SW-paivityksen VERTAAMALLA `sw.js`:n TAVUJA
  - jos VAIN `index.html` muuttuu eika `sw.js`:aa (`CACHE`-vakio) kosketa,
  selain EI KOSKAAN havaitse etta sovellus on paivittynyt, eika nayta
  paivitysilmoitusta - palaava kayttaja jaa jumiin VANHAAN JS-koodiin
  loputtomiin (HTTPS:n yli, missa SW rekisteröityy). Tama havaittiin
  todellisena bugina: monta isoa index.html-muutoskierrosta tehtiin
  bumppaamatta `APP_VERSION`/`sw.js`:n `CACHE`-vakiota kertaakaan. Koska
  "muista aina kasin" osoittautui epaluotettavaksi, tama on nyt
  AUTOMATISOITU `.githooks/pre-commit`-hookilla (ks. "Versioautomaatio"
  alla) - ei enaa manuaalista muistamista.
- **Pisteet vs. janat liikkeen visualisoinnissa:** `gl.POINTS` nakyy
  irrallisina pisteina vaikka haipyva jalki (ping-pong-fade) olisi
  oikein toteutettu, koska yksittainen piste ei itsessaan kerro
  liikesuuntaa/-pituutta ennen kuin useita kehyksia on kertynyt.
  `gl.LINES` edellisesta sijainnista nykyiseen piirtaa heti "streak"-
  viivan jokaisella kehyksella - selvasti parempi virtauksen
  hahmottamiseen (Windy-tyyli). Elinika/haipyminen kannattaa laskea
  AJASSA (sekunteina, `Math.pow(fadePerSecond, dt)`) ei kehyksina,
  jotta efekti on riippumaton ruudunpaivitysnopeudesta (fps).
- **Kosmeettinen shader-kohina voi vaarantaa datan luotettavuuden, jos
  amplitudi ei ole mitattu:** pilvitason WebGL-shaderissa (`CWG_FRAG`)
  oli pintakuvion "rypytykseen" tarkoitettu satunnaiskohinatermi
  (`nz*cv*(1-cv)*4.0*0.9`), jonka KOMMENTTI kuvasi "kosmeettiseksi",
  mutta amplitudi oli NIIN SUURI (todennettu Python-simulaatiolla
  porttaamalla shaderin oma kohinageneraattori) etta se pystyi
  siirtamaan nakyvaa arvoa jopa +-45 prosenttiyksikkoa todellisesta
  hila-arvosta - esim. 28 %:n pilvisyys saattoi nayttaa kartalla 0 %:lta
  (nakymaton) tiettyyn satunnaiseen kohinavaiheeseen osuessaan.
  Havaittiin kayttajan raportoimana todellisena bugina ("merkki nayttaa
  28 %, kartalla ei pilvea"), EI koodikatselmoinnilla - amplitudin
  suuruus ei ollut ilmeinen pelkasta kaavasta. KORJAUS: pienenna
  amplitudi mitattuna tasolle joka EI voi muuttaa nakyvyysluokkaa
  (tassa 11x pienennys), ja jos jokin arvo esitetaan SEKA numerona
  etta varina/kuvana, kayta NIILLE SAMAA interpolointikaavaa (tassa:
  vaihdettiin kartan bikubinen Catmull-Rom sama smoothstep-bilineaarinen
  kuin klikkausmerkin JS-laskenta) - ala luota siihen etta "suunnilleen
  sama" riittaa, jos vaatimuksena on etta luku ja vari TASMAAVAT. Ks.
  MUISTIO-pilviluku.md.
- **CORS on selaimen oma rajoitus, ei palvelimen - siirra tiivisteiden
  laskenta palvelinpuolelle jos lahde ei lahetä Access-Control-Allow-
  Origin-otsaketta:** `i.ytimg.com`:in pikkukuvat EIVÄT lähetä CORS-
  otsaketta (todennettu oikealla HTTP-kutsulla Origin-otsakkeen kanssa),
  joten selaimen JS ei voi lukea kuvan tavuja `fetch()`:lla eika
  `<canvas>`:lla hajonta-tahraantumisen (tainting) takia - vaikka plain
  `<img src>`-NAYTTAMINEN toimii normaalisti ilman CORS:ia (NAYTTAMINEN
  ja DATAN LUKEMINEN ovat eri asioita selaimen turvamallissa). Jos
  "onko kuva oikeasti muuttunut" -tieto tarvitaan selaimessa, laske
  tiiviste PALVELINPUOLELLA (GH Actions, ei selain - CORS ei koske
  ei-selainpyyntöjä) ja tallenna vain pieni hash+aikaleima JSON-
  tiedostoon, jonka selain lukee SAMALTA ORIGINILTA (ei CORS-ongelmaa
  omalle staattiselle tiedostolle). Ks. `data/camera-status.json` /
  `scripts/check-camera-thumbnails.py` esimerkkina. YouTuben `oembed`-
  rajapinta on tastä poikkeus - se LÄHETTÄÄ CORS-otsakkeen (todennettu),
  joten se voidaan kutsua suoraan selaimesta.
- **Python ei salli tavuviivallisia (`-`) tiedostonimia moduulina
  importattavaksi:** `import`-lause vaatii kelvollisen Python-
  identifikaattorin, ja `check-camera-thumbnails.py` ei kelpaa
  (`check_camera_thumbnails` kelpaisi, mutta tiedosto on nimetty
  tavuviivalla projektin yleisen skriptinimikäytännön mukaan). Jos
  logiikkaa pitää jakaa toisen skriptin kanssa, kopioi pieni
  itsenäinen funktio (ks. `monitor-camera-freshness.py`:n kommentti)
  tai nimeä moduuli alaviivalla - ala yrita importata tavuviivaista
  tiedostonimea.
- **"Live"-merkitty ulkoinen kuva ei takaa etta kuva on oikeasti live -
  tarkista, ala luota nimeen/merkintaan:** YouTube-kanavat voivat asettaa
  KIINTEAN mainoskuvan striiminsa `_live`-pikkukuva-osoitteeseen (todettu
  4/5 alkuperaisesta kamerasta - AINOA varmistettu poikkeus on Levi).
  Kuvan koko/muoto ("LIVE from Lapland" -teksti ym.) EI ole luotettava
  signaali koodista kasin - tarvitaan OIKEA testi, ja se testi itse
  vaatii huolellisuutta (ks. seuraava kohta).
- **YHDEN HETKEN tavuvertailu voi antaa VAARAN POSITIIVISEN myos
  tunnetusti oikealle datalle - vaadi PYSYVYYTTA ajan yli, ei yhta
  tarkistuskertaa:** alkuperainen mukautetun pikkukuvan tunnistus
  ("`hqdefault_live`==`hqdefault` -> mukautettu") toimi oikein 5
  ensimmaiselle kameralle, mutta antoi VAARAN POSITIIVISEN uudelle
  Sodankyla-kandidaatille JA (eri tarkistuskerralla) jopa tunnetusti
  aidolle Levi-kameralle - YouTube voi ajoittain generoida live- ja
  ei-live-pikkukuvan samasta tuoreesta kehyksesta ilman kiinteaa
  ohituskuvaakaan, joten yhden hetken "samat tavut" ei todista
  staattisuutta. Havaittiin OIKEASTI pitkaaikaisseurannalla (ei
  koodikatselmoinnilla) - korjaus: vaadi etta signaali (joko "ei
  muutu" TAI "live==nonlive") on pysynyt totena YHTAJAKSOISESTI
  vahintaan N minuuttia, nollaa laskuri heti kun signaali poikkeaa
  edes kerran. Yleisempi opetus: jos automaattinen luokittelu perustuu
  ulkoisen, ei-hallitun jarjestelman kahden tilannekuvan vertailuun,
  epailee yhden vertailun riittavyytta ja testaa OIKEASTI ajan yli
  ennen kuin luottaa tulokseen. Ks. MUISTIO-webkamerat.md osio 6.
- **"Vertailu ei huomaa muutosta" -oire voi johtua VANHENTUNEESTA OMASTA
  DATASTA, ei vertailualgoritmin herkkyydesta - tarkista AINA milloin
  OMA seurantasi viimeksi ajettiin ennen kuin epailet itse vertailu-
  kaavaa:** kamerakortti vaitti "ei paivity, muuttui 135 min sitten"
  vaikka kameran OMA kuvaan poltettu aikaleima oli 6 min vanha - houkutti
  epailemaan SHA-256-tiivisteen herkkyytta (jo valmiiksi maksimaalinen -
  mika tahansa tavuero muuttaa koko tiivisteen). TODELLINEN syy: oma
  `data/camera-status.json` oli tarkistettu VIIMEKSI 5 TUNTIA aiemmin,
  koska talla yhdistamattomalla haaralla ajastettu GH Actions -tyonkulku
  EI OLE KOSKAAN OIKEASTI LAUENNUT (schedule-liipaisin toimii vain
  oletushaaralle). TODISTETTIIN OIKEASTI yolla: haettiin saman kameran
  live-kuva 4 kertaa 4,5 min valein revontulten aikana, tiiviste JA
  kuvaan poltettu kellonaika pysyivat identtisina - kuva oli siis
  OIKEASTI jaatynyt sen ajan, ei vertailubugi. KORJAUS: lisattiin
  erillinen tarkistus OMAN datan ("lastChecked") vanhentumiselle -
  jos se on vanhempi kuin odotettu ajovali, nayta rehellisesti "emme
  tieda" sen sijaan etta vaitetaan varmasti "kamera ei paivity". Ks.
  MUISTIO-webkamerat.md ("Kamerakortin korjaukset").
- **Epaluotettavaksi TIEDETTY tilalippu EI SAA paattaa nakyyko sisalto -
  korjaa VAIN teksti, muista korjata myos TOIMINTA:** edellinen korjaus
  (yllaoleva kohta) totesi etta `isCustomThumbnail`-lippu voi olla
  VAARA POSITIIVINEN harvan seurannan takia, ja korjasi SEN PERUSTEELLA
  nayttavan TEKSTIN rehellisemmaksi - mutta jatti KUVAN PIILOTUS-
  logiikan koskematta, koska "perimmainen syy korjaantuu itsestaan
  mainiin yhdistettaessa". Tama oli virhearvio: kayttaja raportoi
  pian etta kuva EI NAY OLLENKAAN juuri niille kameroille (Levi,
  Sodankyla) jotka sama vaara lippu koski - koodi PIILOTTI koko kuva-
  alueen lipun perusteella, EIKA EDES YRITTANYT ladata kuvaa, vaikka
  YouTube olisi palauttanut sen (todennettu: haettiin kuvat suoraan,
  molemmat palauttivat kelvollisen JPEG:in). KORJAUS: kuvan nakyminen
  riippuu NYT YKSINOMAAN sen OMAN latauksen (`<img onerror>`) onnistu-
  misesta - tilalippu nakyy VAIN pienena lisatekstina, ei koskaan
  paata nayteanko paasisaltoa. YLEISEMPI OPETUS: kun huomaat etta jokin
  LIPPU/SIGNAALI voi olla epaluotettava, tarkista KAIKKI paikat jotka
  lukevat sita - pelkka tekstin korjaaminen "rehellisemmaksi" ei riita
  jos jokin TOINEN koodinpatka yha tekee peruuttamattoman paatoksen
  (esim. piilottaa sisallon) SAMAN epaluotettavan lipun perusteella.
  Ks. MUISTIO-webkamerat.md OSA 2.
- **WebGL1: ei-kahden-potenssi (NPOT) -tekstuuri + REPEAT-kierratys =
  "epataydellinen" tekstuuri, näyttää väärin RIIPPUMATTA shader-koodin
  oikeellisuudesta:** OpenGL ES 2.0 -spesifikaatio (3.8.2, johon WebGL1
  perustuu) vaatii etta NPOT-tekstuurin MOLEMMAT kierratystilat ovat
  `CLAMP_TO_EDGE` (ei `REPEAT`) jotta tekstuuri on "taydellinen" -
  rikkomus tekee tekstuurista maarittelemattoman (spesifikaation mukaan
  musta, kaytannossa ajurikohtaista - esim. hiljainen NEAREST-kaltainen
  rappeutuminen). Pilvitekstuurien leveys (nlon=361/345/290 kaikilla
  kolmella mallilla) EI OLE kahden potenssi, ja koodi asetti silti
  `WRAP_S=REPEAT` (periytyi alkuperaisesta kierratys-tarpeesta joka
  poistui kun hilaindeksi alettiin rajata itse). SEURAUS: taysin oikea,
  Python-simulaatiolla todistettu bilineaarinen shader-kaava (ks. alla)
  EI RIITTANYT korjaamaan nakyvaa "ruudukko"-ongelmaa, koska vika oli
  TEKSTUURIN TILASSA (asetukset), ei laskukaavassa - mikaan maara
  shader-koodin siistimista ei olisi auttanut. KORJAUS: `CLAMP_TO_EDGE`
  molemmille akseleille (poistaa rikkomuksen spesifikaation mukaan
  taysin) + `NEAREST`-suodatus (ei edes NPOT-rajoituksen piirissa,
  poistaa riippuvuuden laitteiston LINEAR-suodatuksesta kokonaan - koko
  interpolointi lasketaan itse shaderissa 4 NEAREST-hausta). YLEISEMPI
  OPETUS: jos custom WebGL-tason data-tekstuuri EI ole kahden potenssi
  kokoinen (yleista datahiloilla, harvoin tasmalleen 256/512/1024),
  tarkista AINA etta kierratys on `CLAMP_TO_EDGE` eika `REPEAT` -talla
  ei ole mitaan tekemista sen kanssa onko laskukaava "oikein", bugi on
  nakymaton koodikatselmoinnissa ja vaatii oikean WebGL-kontekstin
  tarkistaakseen (Python-simulaatio ei riita, tama on GPU/ajuri-
  kohtaista maarittelematonta kayttaytymista). Ks. MUISTIO-pilviluku.md.
- **Simuloi KOKO arvoalue, myos reunat - ei vain "jarkevia" keskipisteita:**
  pilvihilan kartan ja klikkauslipun laskentakaavat nayttivat taysin
  samoilta koodikatselmoinnissa, mutta Python-vertailu PALJASTI etta
  ne kayttivat ERI parametrisointia hilaindeksille (`uv*texSize-0.5`
  vs. JS:n `clamp((lon-lon0)/dlon, 0, nlon-2.0001)`) - nama tasmaavat
  VAIN hilan sisaosassa, erosivat jopa 0,91 (0..1-asteikolla) hilan
  viimeisella rivilla/sarakkeella. Ei huomattu aiemmin koska Suomi/
  Pohjoismaat ovat mukavasti hilan keskiosassa. KORJAUS: kayta samaa
  clamp-kaavaa molemmissa, testaa Python-simulaatiolla LAAJALLA
  pisteotannalla (myos hilan AARIRIVIT/-SARAKKEET), ei vain muutamalla
  kasin valitulla "tyypillisella" pisteella. Ks. MUISTIO-pilviluku.md.
- **Bilineaarisen ja bikubisen (Catmull-Rom) interpoloinnin reunaraja EI
  OLE sama kaava - tarkista erikseen kummallekin:** `texSize-2.0001`-
  reunaraja toimi oikein bilineaariselle (koska p2=rf≈1 osuu lahelle
  viimeista pistetta riittavan tarkasti), mutta SAMA raja antoi bikubi-
  selle Catmull-Romille jopa 0,98 virheen (0..1-asteikolla) viimeisella
  hilarivilla/-sarakkeella. Syy: Catmull-Rom palauttaa tarkan arvon
  VAIN t=0 (p1) tai t=1 (p2) -kohdassa, EI KOSKAAN p0:ssa tai p3:ssa -
  `-2.0001`-raja pakotti perustan (row0) yhden liian pieneksi, jolloin
  viimeista pistetta yritettiin tavoittaa p3:na (ei koskaan tasmaa) sen
  sijaan etta se tavoitettaisiin p1:na. KORJAUS bikubiselle: reunaraja
  `texSize-1` (tasan suurin kelvollinen indeksi), "haamupisteet" (p0/p3
  reunan ulkopuolella) leikataan ERIKSEEN kelvollisiin taulukko-
  indekseihin. ALA OLETA etta toimiva reunakaava siirtyy sellaisenaan
  interpolointimenetelmasta toiseen - testaa PYTHON-SIMULAATIOLLA aina
  uudelleen kun interpoloinnin ASTE (lineaarinen/kuutiollinen) muuttuu.
  Ks. MUISTIO-pilviluku.md.
- **Literaalit takaisinheittomerkit (`` ` ``) JS-kommentissa KESKELLA
  template-literal-merkkijonoa katkaisevat sen ennenaikaisesti:** koko
  WebGL-shaderin lahdekoodi (`CWG_FRAG`) on YKSI iso JS-template-
  literal (backtick-merkkien valissa) - jos SHADERIN OMASSA GLSL-
  kommentissa kaytetaan markdown-tyylista koodimuotoilua (esim.
  `` `texSize-1` ``), JS-tulkki nakee taman TAVALLISENA template-
  literal-lopetusmerkkina ja katkaisee koko merkkijonon siihen - loppu
  shaderista (ja seuraava koodi) tulkitaan vaarin, aiheuttaen
  "Unexpected identifier" tms. -virheen usein KAUKANA todellisesta
  virhekohdasta. Loytyi esprima-jasentimella ENNEN selainta - balance-
  check/jasennys kannattaa AINA ajaa template-literal-raskaan koodin
  (shaderit, pitkat SQL/HTML-merkkijonot) muokkauksen jalkeen, ja jos
  kommenttiin HALUAA koodimuotoilua, kayta jotain muuta merkkia (esim.
  lainausmerkkeja) backtickin sijaan.
- **Neliojuurikayra (`pow(t,0.5)`) aarettomalla derivaatalla nollan
  lahella + 8-bittinen kvantisointi = nakyva bannaus/"portaat":** jos
  jokin arvo esitetaan jatkuvana visuaalisena liukumana TALLENNETUSTA
  8-bittisesta datasta, ala kayta kayraa jonka derivaatta kasvaa
  rajatta jossain kohdassa valia - yksittainen kvantisointiaskel (1/255)
  vahvistuu silloin nakyvaksi hypyksi. Kayta sen sijaan AARELLISEN
  derivaatan kayraa (esim. ease-out-nelio `1-(1-t)^2`, derivaatta
  korkeintaan 2 koko valilla) jos tarvitaan "pieni arvo nakyy jo
  selvasti" -vaikutelma ilman bannausriskia. Todennettu Python-
  simulaatiolla laskemalla kayran derivaatta eri t-arvoilla, ei
  silmamaaraisesti. Ks. MUISTIO-pilviluku.md.
- **MapLibre GL JS:n `MapMouseEvent.preventDefault()` EI estä muita
  `click`-kuuntelijoita - vain kartan SISAISIA oletustoimintoja
  (raahaus/pyoritys/zoomaus):** oletettiin virheellisesti etta
  `e.preventDefault()` kerroskohtaisessa (`map.on('click','layer',fn)`)
  kuuntelijassa estaisi kartan YLEISEN `map.on('click',fn)`-kuuntelijan
  laukeamisen samalla klikkauksella - EI PIDA PAIKKAANSA (vahvistettu
  MapLibren dokumentaatiosta). Molemmat kuuntelijat ovat samassa
  tapahtumalistassa ja suoritetaan rekisterointijarjestyksessa
  riippumatta preventDefault-kutsuista. Jos kerroskohtaisen klikkauksen
  PITAA estaa yleisen kasittelijan toiminta, tee paatos YHDESSA
  paikassa (esim. yleinen kasittelija kutsuu itse
  `map.queryRenderedFeatures()`:ia tarkistaakseen osuiko klikkaus
  tiettyyn tasoon) sen sijaan etta luotat kahden erillisen kuuntelijan
  suoritusjarjestykseen tai preventDefault:iin. Havaittu todellisena
  bugina (kameran klikkaus avasi kortin JA asetti pisteen), ei
  koodikatselmoinnilla. Ks. MUISTIO-pilviluku.md osa 2.

## Versioautomaatio (2026-10)

`.githooks/pre-commit` bumppaa `index.html`:n `APP_VERSION`:in JA `sw.js`:n
`CACHE`-vakion AUTOMAATTISESTI samaan commitiin, aina kun `index.html`,
`i18n.js`, `sw.js`, `manifest.webmanifest` tai `icons/*` (sovelluskuori, sw.js
SHELL; laajennettu 2026-10 - pelkkä sw.js-muutos jätti ennen version
nostamatta, testattu erillisessä kloonissa) on osa committia (paitsi jos kayttaja on JO kasin muuttanut APP_VERSION-rivia
taman commitin diffissa - talloin hook ei tuplaa bumppausta).

**Asennus (KERRAN per paikallinen klooni, ei automaattista oletuksena -
Git ei suorita hookkeja oletuspolun ulkopuolelta ilman tata asetusta):**
```
git config core.hooksPath .githooks
```

**Tekninen toteutus:** POSIX shell -skripti (`#!/bin/sh`), kayttaa
`grep`/`sed`:ia - toimii Git for Windowsin mukana tulevalla `sh.exe`:lla
(MSYS-tyokalut) ilman erillisasennuksia. `.gitattributes` pakottaa
`.githooks/*`-tiedostot LF-rivinvaihtoihin riippumatta paikallisesta
`core.autocrlf`-asetuksesta - CRLF rikkoisi shebang-rivin/sh-tulkinnan.
Testattu OIKEASTI (ei vain koodikatselmoitu) eristetyssa git-klonissa:
index.html-muutos -> versio nousi oikein (v1.45->v1.46, molemmat
tiedostot samassa commitissa); kasin jo muutettu versio -> hook ei
koskenut siihen; tiedosto joka EI ole index.html -> hook ei tehnyt mitaan.
Vahvistettu kaytannossa myos oikeassa merge-commitissa (2026-10): kun
APP_VERSION-rivi oli JO osa yhdistetyn haaran diffia, hook ei tuplannut
bumppausta (jai oikein v1.46:een).

**Ohitus hatatilanteessa:** `git commit --no-verify` (ei suositella
rutiinikaytossa).

## Käyttöliittymän periaatteet (2026-10, infoikkunan uudistus)
- Infoikkunan Nyt-välilehti näyttää AINA nykyhetken, myös pilvisyyden.
  Aikajana ei vaikuta siihen.
- Aikajana ohjaa vain karttaa (pilvet, tuuli). Revontulet ja avaruussää
  ovat aina nykyhetkeä.
- Näkyvyysindeksi ei koskaan yhdistä eri ajankohtien dataa.
- Aikajanan liikuttaminen ei saa siirtää mitään muuta elementtiä.
- Kaikki alivalikot avautuvat vasemmalle riviin. Kolmas taso (alivalikon
  napin asetukset) avautuu alaspäin.
- **Aikavyöhykkeet (2026-10-22, käyttäjän päätös):** KAIKKI kellonajat ja
  päivämäärät näytetään PUHELIMEN aikavyöhykkeellä, myös valitulle pisteelle
  toisella aikavyöhykkeellä (Intl ilman `timeZone`-asetusta, `fmtDate`/
  `fmtClock`/`timeOpts`). Yö määritetään kuitenkin PISTEEN pimeän jakson mukaan:
  Tänä yönä = `darkPeriod` (hetkiä, ei kalenteria), 7 vrk = `weekWindows`
  (aurora-core.js): yö k = pimeä jakso pisteen aurinkokeskipäivien välissä
  (UTC + lon/15 h), kaamoksessa klo 16-08 pisteen aurinkoaikaa; yön nimi =
  illan päivä pisteessä (`day`). ÄLÄ käytä puhelimen kalenteripäivää
  (`getDate()`, `new Date(y,m,d,12)`) yön rajaamiseen. Testit:
  `tests/week.test.mjs` (Kilpisjärvi, Oulu, Tromssa, Reykjavík, Siperia,
  puhelin Helsingissä / New Yorkissa / Tokiossa).

## Suunnitteluperiaatteet (2026-10)
- **Mobiili edellä:** suunnittele ja testaa ensin puhelimen leveydellä
  (360-400 px). Leveällä näytöllä riittää, että asettelu toimii eikä mikään
  ole rikki. ÄLÄ tee tietokonekohtaisia ominaisuuksia ilman erillistä pyyntöä.
- **Näytön suunta:** puhelimella sovellus toimii vain pystyasennossa
  (lukitaan myöhemmin kauppaversiossa). Manifestissa `"orientation":
  "portrait"` (toimii Androidilla kotivalikkoon asennettuna; iPhonen
  selaimessa suuntaa ei voi lukita). Verkkoversion vaakanäkymän ei tarvitse
  olla hiottu, kunhan mikään ei ole rikki. Tabletilla molemmat suunnat
  sallittu.
- **Lopullinen kohde on natiivisovellus** (Android + iPhone, sovelluskaupat);
  verkkoversiota käytetään kotivalikkoon asennettuna. Selaimen osoitepalkkia
  EI huomioida. Värinäpalaute toteutetaan natiivivaiheessa (myös iPhone) -
  verkkoversion nykyistä toteutusta ei kehitetä/testata nyt.
- **Sivu ei saa KOSKAAN zoomautua, vain kartta (2026-10).** Toteutus:
  viewport `maximum-scale=1, user-scalable=no`; `touch-action:manipulation`
  kaikelle käyttöliittymälle (`:where(body > :not(#map), .maplibregl-ctrl,
  .maplibregl-marker, .maplibregl-popup)` - uusi bodyn lapsi saa sen
  automaattisesti; kartta-alueen touch-actioniin EI kosketa, MapLibre
  hoitaa nipistyksen/tuplanapautuksen); iOS:n `gesturestart/change/end`
  -> `preventDefault` skriptin alussa (Safari ohittaa user-scalable=no:n).
  Tekstikentät vähintään 16 px (muuten iPhone zoomaa kenttään). HUOM:
  headless-Chromium ei zoomaa sivua edes ilman estoa -> esto todennetaan
  VAIN oikealla puhelimella; headless todentaa vain, että kartta zoomautuu.
- **Lovi / Dynamic Island ja kotipalkki:** huomioi `env(safe-area-inset-*)`
  kaikissa puhelinkoissa (`viewport-fit=cover` on käytössä, joten kartta ja
  kaikki kiinteät elementit ulottuvat muuten loven/kotipalkin alle).

## Yksikkötestit (2026-10-22)
`npm test` (= `node --test "tests/*.test.mjs"`, ei riippuvuuksia): aurora-core.js
(näkyvyys, pimeys, Kp-jaksot, kesäaikasiirtymä, kuu, Bz), hälytysten toiston esto
ja 7 vrk:n yöt. Työnkulku `tests.yml` ajaa ne + `check-i18n` jokaiselle haaralle
ja PR:lle. Uusi laskentafunktio -> aurora-core.js:ään ja testi tests/-kansioon
(index.html:ää ei voi yksikkötestata).

## Testaus ja kuvakaappaukset (2026-10)
`npm run screenshots` (`scripts/screenshots.mjs`, Playwright kehitys-
riippuvuutena - EI julkaisuun) avaa sovelluksen paikallisesti ja tallentaa
kuvat `docs/kuvakaappaukset/<päivämäärä>/` (ei repossa, `.gitignore`):
`<leveys>x<korkeus>-<koko>-<tila>.png`, tilat `kartta`, `saa` (säävalikko),
`info` (infoikkuna), `asetukset`, sekä `yhteenveto-<tila>.png` (kaikki koot
rinnakkain). Valinnat: `--quick` (vähimmäissetti), `--landscape`,
`--sizes=360x640,...`, `--states=kartta,info`, `--lang=en`, `--offline`,
`--no-safe-area`. Ensimmäisellä kerralla omalla koneella: `npm install &&
npx playwright install chromium`.
- **Oletustila** käyttää oikeaa verkkoa; botin data (vain gh-pagesilla)
  haetaan julkaistulta sivulta. **`--offline`** (Claude-ympäristö, ei
  verkkoa): synteettinen data (`scripts/screenshots/offline-fixtures.mjs`),
  pohjakartta = tyhjä tausta + maiden nimet -> vain ASETTELUN tarkistukseen.
- **Lovi ja kotipalkki simuloidaan** CDP:n `Emulation.setSafeAreaInsetsOverride`
  -komennolla (`SIZES[].insets`: oletetut arvot asennettuna sovelluksena,
  pahin tapaus). Service Worker estetään kuvauksessa.

TESTIKOOT (pystynäkymä)
- pieni puhelin: 360 × 640 (pienet Androidit, iPhone SE 375 × 667)
- tavallinen iPhone: 390 × 844
- iso iPhone: 430 × 932
- tavallinen Android: 412 × 915
- tabletti: 820 × 1180
- työpöytä: 1440 × 900

Jokaisen käyttöliittymämuutoksen jälkeen kuvakaappaukset vähintään kokoista
360 × 640 ja 430 × 932 sekä yksi työpöydältä (`--quick`). Muut koot, kun
muutos koskee asettelua laajemmin. Tila `kaynnistys` kuvaa sivun 1,5 s
latauksen alusta (OSM-maininta logon alla). Vaakanäkymä (844 × 390, `--landscape`)
vain tarkistukseksi, ettei mikään ole rikki, kun asettelua muutetaan
merkittävästi.

**Kuvakaappaukset ovat simulaatioita.** Kirjaa jokaisen tehtävän loppuun
(muistioon / loppuraporttiin), mitkä asiat pitää tarkistaa oikealla
puhelimella (kotivalikkoon asennettuna): kosketuseleet (veto, nipistys,
pyyhkäisy), paikannus, kotipalkki ja lovi.
Asetteluhavainnot ja avoimet kysymykset: MUISTIO-testaus.md.

## Kauppajulkaisun tarkistuslista (App Store / Google Play)
Ennen kauppaversion julkaisua TÄYTYY tarkistaa:
- **Still-kamerat (2026-10-24, käyttäjän päätös):** kauppaversioon VAIN still-kamerat, joiden
  `data/cameras.json`:in `lupa` on `"public domain"` tai `"myönnetty"`. Muut (`"pyydetty"`,
  `"ei pyydetty"`) poistetaan kauppaversion datasta (verkkoversiossa saavat olla).
- `?debug`-, `?griddebug`- ja `?paletti`-testinäkymät poistettu tai piilotettu pysyvästi.

## Reunaehdot
- **Kolmannen osapuolen kuvakkeet (2026-10):** Lucide (ISC) / Feather (MIT).
  Lisenssiehto vaatii ilmoituksen "kaikissa kopioissa" -> teksti on
  `index.html`:n alussa kommenttina (kulkee julkaistun sivun mukana) ja
  `THIRD_PARTY_LICENSES.md`:ssä. Uusi ulkopuolinen kuvake -> lisää se
  THIRD_PARTY_LICENSES.md:n taulukkoon (ja uusi lisenssi molempiin).
- EI käyttäjätilejä eikä tietokantaa tässä vaiheessa. Pidetään
  kevyenä.
- EI maksullisia / API-avainta vaativia palveluita. Kaikki
  avoimista, avaimettomista lähteistä.
- OVATION-data on nowcast (vain nykyhetki) — sitä EI ekstrapoloida
  tulevaisuuteen.
- OVATION-kenttä näytteistetään bilineaarisesti tasaisen Mercator-ruudukon
  ruutujen keskipisteisiin (käyttäjän päätös 2026-10, ks. Revontulet).

## Työtavat
- Älä koske main-haaraan suoraan. Tee muutokset omaan haaraan.
- Pieniä, selkeitä committeja per looginen muutos.
- Jos jokin on epäselvä, jätä se tekemättä ja merkitse
  koodikommentilla — älä arvaa.
- Älä muuta datan hakua (fetch-skriptit, Actions), ellei
  tehtävä sitä nimenomaan vaadi.
- Uusi klooni/työympäristö: aja `git config core.hooksPath .githooks`
  kerran (ks. "Versioautomaatio" yllä) - muuten APP_VERSION/sw.js-bumppaus
  jää taas muistin varaan.
- Pilvi- tai tuulimallin alue (bbox): muuta AINA `scripts/model_areas.py`:ssä,
  ei kummankaan fetch-skriptin sisällä erikseen - muuten pilvi- ja
  tuulitaso voivat erkaantua samalta mallilta (ks. "Mallinvalitsin
  koskee kaikkia tasoja" -tehtävä, 2026-10).
- **Jokaisen tehtävän lopuksi pushaa haara GitHubiin, VAIKKA sitä ei
  yhdistettäisi mainiin.** Syy: pelkkä paikallinen commit on näkymätön
  ja katoamisriskissä (vain yhdellä koneella), eikä käyttäjä voi tarkistaa
  diffiä tai jatkaa työtä toiselta koneelta ennen yhdistämispäätöstä.
  Haarapuut kuten `feature/tuulianimaatio → tuulialue → ennustehorisontti
  → mallit-kaikille-tasoille` (2026-10) olivat pitkään olemassa VAIN
  paikallisesti - huomattiin vasta erikseen kysyttäessä etteivät ne
  olleet GitHubissa lainkaan. `git push -u origin <haara>` heti haaran
  ensimmäisen committin jälkeen (tai viimeistään tehtävän lopuksi),
  riippumatta siitä yhdistetäänkö mainiin samalla kertaa.
- **Yhteistyökäytäntö (sovittu 2026-10):** käyttäjä kirjoittaa suomeksi ja lukee
  vastaukset puhelimelta -> vastaa suomeksi, lyhyesti, tulos ensin. Jokainen
  tehtävä omaan haaraan `origin/main`:ista (`claude/<aihe>`), pienet commitit,
  pushaa aina. PR tehdään ja yhdistetään mainiin VAIN kun käyttäjä pyytää
  ("Tee PR ja yhdistä mainiin") - muuten raportin lopuksi kysytään. PR:n
  yhdistys `merge`-tavalla. Kun käyttäjä kysyy mielipidettä ("Mitä mieltä?",
  "Älä tee vielä, vain vastaa"), VASTAA eikä toteuta. Epäselvät kohdat:
  tee järkevä tulkinta vain jos se on pieni ja kirjaa se muistioon,
  isommissa kysy ennen toteutusta.
- **Kuvakaappaukset käyttäjälle:** lähetä tehtävän tärkeimmät kuvat
  (360 x 640, tarvittaessa 430 x 932) suoraan keskusteluun. Claude-ympäristön
  oma Playwright-testiympäristö (synteettinen data, simuloitu kello
  `page.clock.install`) on vain kehitysaikainen eikä repossa;
  repossa sama `scripts/screenshots.mjs --offline` (tilat mm. `viikko*`,
  `pilvi-nyt`, `bz-saapunut`).
- **Ulkoiset rajapinnat (NOAA, ECMWF, DWD, FMI, YouTube) EIVÄT ole
  tavoitettavissa Claude-ympäristöstä.** Tarkista muoto/CORS/ennustepituus
  väliaikaisella tutkimustyönkululla: `on: push` `claude/**`-haaralle +
  `paths: ['.github/<nimi>.env']` (env-tiedoston muutos käynnistää), EI
  julkaisua eikä schedulea, lokit GitHub MCP:llä (`get_job_logs`). Poista
  työnkulku ja env-tiedosto ennen yhdistämistä (esimerkki: 7 vrk -tutkimus
  2026-10, MUISTIO-infoikkuna.md "7 vrk").
- **Uusi ajastettu datatyönkulku: aja se käsin (`workflow_dispatch`) heti
  mainiin yhdistämisen jälkeen** - GitHub ei välttämättä käynnistä uuden
  työnkulun ensimmäistä ajastettua ajoa (todettu 2026-10: `ecmwf-7d.yml`:n
  08.25 UTC -ajo jäi tulematta, 7 vrk -välilehti näytti vain yhden yön).
  Tarkista sen jälkeen `gh-pages`:ilta, että tiedostot julkaistiin
  (`git ls-tree origin/gh-pages data/`).
- **Uusi tai muutettu GitHub Actions -työnkulku EI OLE valmis ennen kuin
  se on ajettu ONNISTUNEESTI oikeassa GitHubissa (2026-10, oppi
  tuulidata-HARMONIEn kilpajuoksubugista)** (haaralta: haku + artefakti,
  julkaisu ohitetaan; julkaisu tarkistetaan mainista yhdistämisen jälkeen,
  ks. "Julkaisu VAIN mainista") - YAML-syntaksin/bash-
  skriptin validointi paikallisesti (esprima/`bash -n`/`yaml.safe_load`)
  todistaa VAIN että tiedosto on jäsenneltävissä, EI että sen LOGIIKKA
  (git-kilpajuoksut, matrix-jobien rinnakkaisuus, oikeiden rajapintojen
  todellinen vastaus) toimii oikeasti. Tämän session aiempi "korjaus"
  (lisätty `git pull --rebase` kolmeen pilvidata-*.yml:ään) NÄYTTI
  oikealta koodikatselmoinnissa, mutta kopioi samalla TOISEN, piilevän
  bugin (väärä järjestys: rebase ennen committia/likaisella työhakemistolla)
  olemassa olevista wind-*.yml-työnkuluista - bugi paljastui vasta kun
  käyttäjä AJOI työnkulun oikeasti ja sai virhelokin. Pyydä AINA
  käyttäjää ajamaan `workflow_dispatch` käsin ja liittämään loki ennen
  kuin merkitset CI-muutoksen valmiiksi - älä luota pelkkään "näyttää
  oikealta" -lukemiseen git-skripteissä, joiden virheet (kilpajuoksut,
  ajoitusriippuvuudet) eivät näy paikallisessa syntaksintarkistuksessa.
