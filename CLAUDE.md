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
    - **ICON-EU (DWD)**: `scripts/fetch-clouds-icon_eu.py` →
      `data/clouds-icon_eu-meta.json` + `data/clouds-icon_eu-step00..30.json`,
      suoraan `opendata.dwd.de`:n GRIB2-tiedostoista (EI Open-Meteon kautta —
      kokeiltu, vaihdettu pois kaupallisen käytön rajoituksen ja kattavuus-
      ongelmien takia). Alue 55-70,5 °N (ICON-EU:n oma pohjoisraja, ei pääse
      75 °N:ään), koko natiivi pituusastealue, 0,25° (lohkokeskiarvo natiivista
      0,0625°:sta — EI yksittäisen pisteen poiminta, ks. alla), **31 askelta
      1 h välein (0-30 h, laajennettu 12h:sta 2026-10 — DWD julkaisee tunti-
      askeleita todistetusti 78 h:hen asti, ei rajoite)**. ~10,1 Mt yhteensä,
      mutta selain lataa vain 1-2 askelta kerrallaan (ks. "Laiska pilvilataus" alla).
    - **HARMONIE (FMI)**: `scripts/fetch-clouds-harmonie.py` →
      `data/clouds-harmonie-meta.json` + `data/clouds-harmonie-step00..30.json`,
      suoraan `opendata.fmi.fi`:n `/download`-rajapinnasta (yksi HTTP-kutsu
      palauttaa kaikki aika-askeleet kerralla). Tarkin malli: natiivi
      ~0,0225° (~2,5 km), alinäytteistetty 2×2-lohkokeskiarvolla ~0,045°:een
      (~5 km) tiedostokoon takia. Alue 59-70 °N, 19-32 °E (Suomi + pieni
      marginaali — FMI:n tuotteen luonnollinen jakelualue, ei ulotu esim.
      Tromssaan). **31 askelta 1 h välein (0-30 h, laajennettu 12h:sta
      2026-10 — todistettu 60h+ testihaulla ettei 12h ollut rajapinnan
      rajoite vaan alkuperäisen toteutuksen oma varovaisuus)**. ~8,3 Mt
      yhteensä, selain lataa vain 1-2 askelta kerrallaan.
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
      SAMALLA kaavalla (2026-10, Windy-tyylinen pinta):** `clouds-webgl`-
      tason fragment-shader (`CWG_FRAG`, `sampleGrid()`) käyttää TARKALLEEN
      samaa hilaindeksi- JA reunarajoituskaavaa (`clamp(uv*(texSize-1),
      0, texSize-2.0001)`) kuin klikkauslipun `sampleCloudGridField()`
      (JS) — todennettu Python-simulaatiolla koneen tarkkuuden rajalle
      (~1e-15) KAIKKIALLA hilassa, myös reunoilla (ks. "Opitut
      sudenkuopat" alla, hilaindeksin reunabugi). Interpolointi lasketaan
      KOKONAAN shaderissa 4:stä `NEAREST`-tekstuurihausta, EI luoteta
      laitteiston `LINEAR`-suodatukseen — pilvitekstuurit ovat ei-kahden-
      potenssi-kokoisia (nlon 361/345/290), ja WebGL1 kieltää
      `LINEAR`+`REPEAT`-yhdistelmän niille (ks. sudenkuopat, NPOT-bugi).
      EI MITÄÄN kohinaa/
      keksittyä pintayksityiskohtaa (poistettu kokonaan) - pinta on
      sileä. Väri on jatkuva liukuma läpinäkyvästä/haaleasta kylmän-
      harmaan (`thinColor`) kautta valkoiseen (`thickColor`), alfakäyrä
      `1-(1-t)^2` (ÄÄRELLINEN derivaatta, EI neliöjuuri - ks. sudenkuopat).
      `#cloudLegend` (vasen yläkulma) näyttää tämän saman käyrän värinä,
      ja `?griddebug=1`-URL-parametri piirtää klikatun pisteen ympärille
      raakaruudukon arvoineen diagnostiikkaa varten. Klikkauksen tulos
      näytetään Windy-tyylisenä "lippuna" (`rv-cloudflag`/`cf-*`: tanko +
      vaakasuora lippu, `anchor:'bottom-left'`), ei pyöreänä korttina.
      Ks. MUISTIO-pilviluku.md.
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
    Jos `isCustomThumbnail:true`: kortti piilottaa kuvan kokonaan ja
    näyttää "Ei live-esikatselua" -tekstin, ja "Kaikki kamerat" -ruudukko
    siirtää kameran erilliseen linkkilistaan kuvallisen ruudukon
    alapuolelle. Lisäkameroita (My Aurora Forecastin Tampere/Kuusamo/
    Kilpisjärvi/jne.) selvitetty — EI lisätty, kaikki vaativat luvan tai
    pidempää seurantaa. Ks. MUISTIO-webkamerat.md osiot 6-7.
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
      pilvi-ICON-EU (31 askelta, 0-30 h). ~1,8 Mt/taso yhteensä.
    - **HARMONIE (FMI)**: `scripts/fetch-wind-harmonie.py` →
      `data/wind-harmonie-<taso>-meta.json` + `-step00..30.json` (laiska).
      Alue KAVENNETTU tässä tehtävässä takaisin SAMAKSI kuin pilvi-
      HARMONIE (19-32 °E, 59-70 °N) - aiempi, laajempi NaN-vapaa alue
      (-1-35 °E, 55-73,5 °N, ks. git-historia) PERUTTIIN, koska "tuuli
      ja pilvet samalta alueelta" on tärkeämpi vaatimus kuin "mahdollisimman
      laaja tuulialue". Sama horisontti kuin pilvi-HARMONIE (31 askelta,
      0-30 h). ~5,7 Mt/taso.
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
      WebGL-hiukkasanimaatio (`windParticleLayer`, CPU-advektio +
      GPU-ping-pong-haipyva jälki) — ks. alla. Molemmat lukevat
      `sampleWindAt()`:in kautta, joka on malli-agnostinen (ei
      muutoksia tarvittu OSA 1/2:n piirtokoodiin tämän tehtävän takia,
      vain datan LATAUS/SAILYTYS muuttui).

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
