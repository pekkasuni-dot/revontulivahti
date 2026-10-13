# Revontulivahti

## Mikä tämä on
PWA (Progressive Web App), joka näyttää kartalla revontulien
todennäköisyyden ja pilviennusteen Suomessa. Kohderyhmä:
revontulioppaat ja -harrastajat. Julkaistaan GitHub Pagesissa.

## Tekninen pino
- Puhdas selainsovellus, ei omaa palvelinta eikä tietokantaa.
- Kartta: MapLibre GL JS (WebGL).
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
  7 data-työnkulusta on jaettu `fetch` (hakee datan, tallentaa
  `actions/upload-artifact`:lla, voi ajaa rinnakkain) + `publish`
  (lataa artifactin, kutsuu `publish-pages`-actionia, SERIALISOITU
  globaalin concurrency-ryhmän kautta) -jobeihin - ÄLÄ yhdistä niitä
  takaisin yhdeksi jobiksi, se palauttaisi juuri sen kilpajuoksun
  joka tässä korjattiin. `sync-pages.yml` synkkaa sovelluskoodin
  `gh-pages`:lle VÄLITTÖMÄSTI kun `main` päivittyy (ei tarvitse
  odottaa seuraavaa data-cronia, pahimmillaan ~3 h).
  **`check-camera-thumbnails.py`:n pysyvyysseuranta** (firstSeenAt,
  ks. alla) lukee EDELLISEN tilan - koska `main`:issa data/
  camera-status.json on nyt pysyvästi jäätynyt, `camera-status.yml`:n
  `fetch`-job hakee edellisen tilan ERIKSEEN `gh-pages`:sta
  (`git show origin/gh-pages:data/camera-status.json`) ENNEN
  tarkistusta - tämä on ERITYISTAPAUS, muut 6 työnkulkua eivät
  tarvitse tätä (eivät lue omaa aiempaa tiedostoaan).
- Data haetaan valmiiksi tiedostoiksi GitHub Actionsilla, selain
  lukee ne staattisina tiedostoina (URL:t/polut `data/...` pysyvät
  samoina - `gh-pages`:n juuri palvelee saman polkurakenteen kuin
  `main` aiemmin):
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
    - **Laiska pilvilataus (2026-10):** ICON-EU/HARMONIE jaettu pieneen
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
      kylmänharmaan (`thinColor`) kautta valkoiseen (`thickColor`),
      mutta LÄPINÄKYVYYS (alfa) on PORRASTETTU `CLOUD_STYLE.alphaSteps`-
      taulukosta (8 tasoa, palautettu alkuperäisestä commitista
      8319caf/f97ddd3) - lipun % kuuluu AINA samaan vyöhykkeeseen kuin
      kartalla näkyvä, koska molemmat (`glslAlphaStepsChain()` shaderiin
      upotettuna, `cloudAlphaForPct()` JS:ssä) lukevat SAMAN taulukon.
      **KAIKKI värit/vyöhykerajat ovat KESKITETTY `CLOUD_STYLE`-vakioon
      tiedoston alussa** - shaderin lähdekoodi (`CWG_FRAG`) lukee ne
      suoraan `${...}`-template-interpolaatiolla MÄÄRITTELYHETKELLÄ.
      **HUOM (2026-10): vasemman yläkulman `#cloudLegend`-selite
      POISTETTU kokonaan** (käyttäjän pyyntö) - `cloudColorAt()`/
      `updateCloudLegendGradient()` poistettu mukana (olivat olemassa
      VAIN selitettä varten); `cloudAlphaForPct()` SÄILYTETTY, koska
      `?griddebug=1`-diagnostiikka käyttää sitä yhä. Klikkauksen tulos
      näytetään Windy-tyylisenä "lippuna" (`rv-cloudflag`/`cf-*`: tanko
      + vaakasuora lippu, `anchor:'bottom-left'`), ei pyöreänä korttina
      - tangon väri (`cf-pole`) on SAMA kuin lipun tausta
      (`rgba(10,16,26,.85)`, ei enää erillinen valkoinen), tangon
      korkeus 40px (oli 30px), arvon fontikoko 12px (oli 15px).
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
      lisätty). Varjo merenpuolella `line-offset`:illa, merkki +1 perustuu
      MVT-spesifikaation rengassuuntaan (ulkorengas myötäpäivään, reiät
      vastapäivään -> meri aina oikealla). **Varjon leveys TÄYTYY pysyä
      tiilipuskurin (8 px) sisällä** (`tileBufferPx`, rajattu koodissa) -
      meri-polygonin leikkausreuna on tiilen puskurissa ja MapLibre leikkaa
      sen pois vain jos varjo ei ulotu puskuria pidemmälle; todennettu
      headless-Chromiumilla oikealla MapLibre 3.6.2:lla ja synteettisillä
      MVT-tiilillä (10 px varjo -> 5013 virhepikseliä tiilirajoilla, 6,5 px
      -> 0), EI oikeilla OpenFreeMap-tiilillä (ei verkkoa testiympäristöstä).
      Nimitasot (`vt-label-country`/`vt-label-city`) pilvien PÄÄLLÄ
      `reorderAllLayers()`:in kautta. Pilvimallin dynaaminen attribuutio
      ("Pilvet & tuuli: X") EI enää kiinnity pohjakartan lähteeseen
      (olisi pakottanut koko vektorityylin uudelleenlataamaan jokaisella
      mallinvaihdolla) - oma pieni pysyvä tyhjä GeoJSON-lähde
      (`cloud-attr`) kantaa sitä erikseen. `switchMapStyle()` tekee nyt
      AINA täyden `map.setStyle()`-uudelleenlatauksen (ei enää kevyttä
      yhden-tason-vaihto-oikotietä, joka ei riitä monitasoiselle
      vektorityylille). Ks. MUISTIO-kartta.md ja MUISTIO-pilviluku.md.
  - **Aikajanan askel (OSA 3, 2026-10): `#timeSlider`:in `step` 1 h**
    (ennen 0,5 h) — PELKKÄ käyttöliittymän vetoaskel/nuolinäppäin-
    granulariteetti (`index.html`:n `<input id="timeSlider">`, sekä
    `playBtn`:in automaattikaruselli-inkrementti samaksi 1 h:ksi). EI
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
    (nowcast, päivittyy ~5 min välein)
  - **Revontulikamerat (2026-10, vaihe 1: YouTube):** `data/cameras.json`
    (käsin ylläpidetty, pieni kuratoitu lista — ei hakuskriptiä, EI
    automaattihaku koska lista muuttuu harvoin; rakenne laajennettavissa
    tulevalle `"type":"image"`-tyylisille tiedekameroille, ks.
    MUISTIO-webkamerat.md osio 5). Kartalla oma `cameras`-symbolitaso,
    päälle/pois `#camerasBtn`. Kortti/ruudukko näyttää pikkukuvan AINA
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
    todellisen kuvan sijaan (todettu OIKEASTI 4/6 nykyisestä kamerasta —
    Kilpisjärvi, Posio, Lyngen North, Aurora Reykjavík; varmistetut aidot
    live-kuvat: Levi ja Sodankylä). `check-camera-thumbnails.py` laskee
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
    - **ECMWF**: `scripts/fetch-wind-ecmwf.py` → `data/wind-ecmwf-<taso>.json`
      (ei-laiska, 1 tdsto/taso, kuten pilvi-ECMWF). U/V haettu 2 pyynnöllä
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
    - Yksinkertainen esitys: harvat MapLibre-symbolinuolet. Täysi esitys:
      WebGL-hiukkasanimaatio (`windParticleLayer`, CPU-advektio;
      2026-10: jokainen hiukkanen piirretään pyöreäpäisenä lyhyenä
      "pilkkuna" kolmioina + kapseli-SDF - gl.LINES + ping-pong-jälki
      POISTETTU, koska gl.lineWidth on käytännössä aina 1 px. Säädöt
      `WIND_PARTICLE`-oliossa) — ks. alla. Molemmat lukevat
      `sampleWindAt()`:in kautta, joka on malli-agnostinen (ei
      muutoksia tarvittu OSA 1/2:n piirtokoodiin tämän tehtävän takia,
      vain datan LATAUS/SAILYTYS muuttui).

## Opitut sudenkuopat (pilvihilan rakentaminen/piirto)
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
- **MapLibre-lahteen `attribution`-teksti on STAATTINEN merkkijono
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
`CACHE`-vakion AUTOMAATTISESTI samaan commitiin, aina kun `index.html` on
osa committia (paitsi jos kayttaja on JO kasin muuttanut APP_VERSION-rivia
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
- **Uusi tai muutettu GitHub Actions -työnkulku EI OLE valmis ennen kuin
  se on ajettu ONNISTUNEESTI oikeassa GitHubissa (2026-10, oppi
  tuulidata-HARMONIEn kilpajuoksubugista)** - YAML-syntaksin/bash-
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
