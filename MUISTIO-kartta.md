# Muistio: taustakartat + OVATION-piirto + aikajana-logiikka

## Lisäys: merkin pilvisyys-% samasta hilasta kuin kartan väritys

Käyttäjä bongasi kuvaparein (esim. merkki "94 %" seisoi silmin nähden
oliivinvärisellä, ei-pilvisellä pohjalla), että edellinen korjaus ei
riittänyt: vaikka merkki näytti nyt "raakaa kokonaispilvisyyttä", se luki
sen edelleen Open-Meteon PISTEKOHTAISESTA API-hausta, joka on eri
sääennustemalli/resoluutio kuin `data/clouds.json`-hila, joka piirtää kartan
värityksen. Kaksi erillistä mallia voivat täysin oikeutetusti antaa eri
luvun samalle pisteelle.

Korjasin niin, että merkki lukee arvon nyt `cloudGridPctAt(lat,lon,date)`
-funktiolla SUORAAN `state.cloudGrid`:stä — täsmälleen samasta hilasta ja
samalla ajallisella sekoituksella (`cloudTimeFloat`) kuin WebGL-pilvitaso
piirtää, bilineaarisella+smoothstep-interpoloinnilla (sama tyyli kuin
olemassa olevassa `renderCloudsCanvas`-varapolussa). Tämä EI ole pikselintäsmällinen
kopio GPU-shaiderin bikuubisesta näytteistyksestä + kohinatekstuurista
(se olisi vaatinut kohinalogiikan kopioinnin JS:ään), mutta käyttää samoja
raakoja hila-arvoja, joten suuret ristiriidat (esim. "94 %" tyhjällä
taivaalla) eivät enää toistu. Pieni visuaalinen poikkeama (muutama %-yksikkö)
kohinatekstuurin takia on mahdollinen ja hyväksyttävä.

Open-Meteon pistehaku (`state.clouds`) ja sen varaan rakentuva
`cloudFactorAt()`/"Pilvetön taivas"-näkyvyysindeksi jätettiin tarkoituksella
ennalleen — se tarvitsee ala-/keski-/yläpilvierittelyn, jota hilatiedostossa
ei ole.

## Lisäys: pilvisyysluvun korjaus + mustat rajat + varjo (uusin kierros)

Käyttäjä huomasi, että klikkausmerkin "%"-luku ja kartalla näkyvä valkoinen
pilvitaso saattoivat näyttää ristiriitaiselta (esim. kartalla täysin peittävä
valkoinen pilvi, merkissä silti "70 %"). Syy: luku tuli `cloudFactorAt()`:sta,
joka laskee korkeuspainotetun NÄKYVYYS-arvon (yläpilvien läpi näkee osittain,
paino 0,30) Open-Meteon pistekohtaisesta hausta — eri luku kuin kartan
pilvitaso, joka piirtää ECMWF-hilan RAA'AN kokonaispilvisyyden
(`data/clouds.json`) ilman korkeuspainotusta.

Lisäsin uuden `cloudTotalPctAt()`-funktion, joka palauttaa raa'an
kokonaispilvisyys-%:n (`state.clouds.total`), ja merkki näyttää nyt tämän —
täsmää kartan pilvitason kanssa. Muuta UI:ta (alapaneelin "Pilvetön taivas"
-chip, näkyvyysindeksin laskenta) EN muuttanut, koska niiden korkeuspainotettu
logiikka on tarkoituksellinen osa näkyvyysindeksiä, eikä pyyntö koskenut niitä.

Samalla: manner- (`coast`) ja valtiorajojen (`borders`) väri vaihdettiin
mustaksi (oli vaaleansininen/valkoinen), ja rantaviivalle lisättiin varjo
MapLibren `line-translate`+`line-blur`-paint-ominaisuuksilla (leveämpi,
sumennettu, 1,5 px siirretty musta kopio rantaviivan alla) — ei valmista
"drop-shadow"-ominaisuutta MapLibren viivatasoille, tämä on sen lähin vastine.

Haara: `feature/kartta-ovation-aikajana` (main koskematta). Kolme committia,
yksi per osa, lisäksi yksi pieni committi puuttuvan CLAUDE.md:n lisäämiseksi.

## Lisäykset jälkikäteen (sama haara, 4 pientä pyyntöä)

Jatkokierroksella tehtiin neljä lisämuutosta samaan haaraan, kukin omana
committinaan:

1. **Vaalean taustakartan väri `#8f7f44`.** Toteutin tämän vaihtamalla
   "Vaalea"-tyylin pohjan yksiväriseksi MapLibre `background`-tasoksi (ei
   enää Esrin Light_Gray_Base-rasteritiiliä), jolloin väri on täsmälleen
   annettu heksa. Nimitaso (`World_Light_Gray_Reference`, kaupunkien/maiden
   nimet) ja rajat/rantaviiva pysyvät päällä ennallaan. Vesi/maa-erottelu
   katosi tässä tyylissä, koska taustasta ei enää tule mitään rasteridetaljia
   — kerro jos tämä on ongelma, niin etsin vaihtoehdon jossa väri sekoittuu
   oikeaan karttapohjaan eikä korvaa sitä kokonaan.
2. **Klikkausmerkki näyttää pilvisyysprosentin.** Korvasin aiemman violetin
   "nuppineulan" kortilla, jossa pilvi-ikoni, pilvisyys-% (päivittyy
   aikajanan/latauksen mukana), sulkemisnappi (poistaa merkin ja tyhjentää
   valinnan, `clearPoint()`) ja nuoli-nappi (laajentaa/pienentää alapaneelin,
   sama toiminto kuin paneelin oma kahva). Lämpötilaa ei näytetä, koska
   sovellus ei laske/hae lämpötilaa lainkaan — kuvan "1°" jäi siksi pois.
   Oma sijainti (GPS-piste) käyttää edelleen vanhaa sinistä pistemerkkiä.
3. **Aikajana 30 min askelin.** `timeSlider`:n `step` 1 → 0.5 (arvo pysyy
   tunteina, esim. 0.5 = 30 min), play-napin automaattiaskel 1 → 0.5, ja
   aikaleiman muotoilu uudella `formatOffset()`-funktiolla
   ("+1 h 30 min" / "+30 min" eikä enää "+1.5h"). Myös pilviennusteen
   horisontin mukaan asetettava liukusäätimen `max` lasketaan nyt 30 min
   tarkkuudella (aiemmin pyöristi alaspäin täyteen tuntiin).
4. **Pilvitason läpinäkyvyys pilvisyysasteen mukaan, porrastettuna.**
   Muutin WebGL-pilvishaiderin (`CWG_FRAG`) värin aina valkoiseksi ja
   läpinäkyvyyden portaittaiseksi jatkuvan liukuvärin sijaan. Valitsemani
   läpinäkyvyysarvot (ei annettu tehtävässä täsmällisinä, oma valintani):
   - 0–5 % → 0 (täysin läpinäkyvä)
   - 6–10 % → 0.12, 11–20 % → 0.24, 21–30 % → 0.36, 31–40 % → 0.48,
     41–50 % → 0.60 (nouseva porras per kymmenys, kuten pyydettiin)
   - 51–90 % → 0.75 ("hieman läpinäkyvyyttä")
   - 91–100 % → 1.0 (täysin peittävä, valkoinen)

   Itse pilvikentän MUOTO (bikuubinen näytteistys naapurisolujen välillä +
   fraktaalikohinatekstuuri) jätin koskematta, koska pyyntö koski nimenomaan
   läpinäkyvyyttä, ei pilvikentän paikkatarkkuutta — tämä poikkeaa
   tietoisesti OSA 2:n OVATION-vaatimuksesta ("ei interpolointia"), koska
   pyyntö koski eri kerrosta (pilvet, ei revontulet). Mantereet/rajat näkyvät
   pilvien läpi edelleen, koska `borders`/`coast`-tasot piirretään
   kerrosjärjestyksessä pilvikerroksen YLÄPUOLELLE (ei siis itse
   pilvishaiderin alfa-arvosta riippuvaista — tätä ei tarvinnut muuttaa).

Poistin samalla käyttämättömäksi jääneen `u_dark_bg`-uniformin (tarpeeton,
kun väri on aina valkoinen) ja vanhat `.rv-pin`-CSS-säännöt (korvautuivat
pilvikortilla).

## Lähtötilanne: CLAUDE.md puuttui repositoriosta

`Documents\revontulivahti`-kansiossa (aktiivinen git-repo) ei ollut
CLAUDE.md-tiedostoa, vaikka tehtävässä mainittiin sen löytyvän reposta.
Se löytyi vanhasta, git-seurannan ulkopuolisesta zip-purkukopiosta
(`Downloads\revontulivahti\revontulivahti\`). Lisäsin sen nyt itse
git-repoon feature-haaraan (committi "Lisää puuttuva CLAUDE.md…").
Main-haaraan ei koskettu — tiedosto on toistaiseksi vain feature-haarassa,
kannattaa harkita sen viemistä mainiin erikseen, koska se ei liity
tähän karttatehtävään.

## OSA 1: Taustakartat

**Mitä löytyi:** Testasin kaikki kolme taustakarttatyyliä suoraan
rajapintapyynnöillä (ei vain luettu koodia). CARTOn `basemaps.cartocdn.com`
-tiilet (`dark_nolabels`, `dark_only_labels`, `rastertiles/voyager_nolabels`,
`rastertiles/voyager_only_labels` — eli koko "Tumma"- ja "Vaalea"-tyylin
pohja + nimitasot) palauttavat HTTP 200:n, mutta itse kuva on vesileima
"API KEY REQUIRED — carto.com/basemaps/apikey". CARTO on siis lukinnut
tämän aiemmin ilmaisen rasteripalvelun avaimen taakse. "Satelliitti"-tyyli
(Esri World_Imagery, `server.arcgisonline.com`) toimi oikein, ei avainta.

Koodissa oli jo valmiiksi virhekäsittelijä, joka yritti paeta CARTOn
`dark`-tyylin virhettä vaihtamalla OSM:n vakiotiiliin — tämä viittaa siihen,
että ongelma on havaittu aiemminkin, mutta korjaus oli osittainen (koski
vain "Tumma"-tyyliä, ei "Vaalea"-tyyliä eikä nimitasoja, ja tyylinvaihtonapin
kautta tehty vaihto ei käyttänyt samaa fallbackia).

**Muutos:** Vaihdoin "Tumma"- ja "Vaalea"-tyylin pohjan Esrin avaimettomiin
Canvas-tiiliin, joilla on sama base+labels-rakenne kuin CARTOlla:

- Tumma: `Canvas/World_Dark_Gray_Base` + `Canvas/World_Dark_Gray_Reference`
- Vaalea: `Canvas/World_Light_Gray_Base` + `Canvas/World_Light_Gray_Reference`
- Satelliitti: ennallaan (`World_Imagery`, toimi jo)

Kaikki kolme testattu suoraan rajapinnasta ja visuaalisesti ennen committia
— oikeita karttakuvia, ei virheilmoituksia. Poistin samalla vanhan,
nyt tarpeettoman CARTO-spesifisen virhekäsittelijän (`tileFallbackDone`),
koska juurisyy on korjattu lähteessä.

**Huom (pieni poikkeama alkuperäisestä rakenteesta):** CARTOlla "nolabels"-taso
oli täysin nimetön ja kaikki nimet olivat "only_labels"-tasolla. Esrin
"Base"-taso sisältää valmiiksi maa-/suurpiirteiset nimet (esim. maiden nimet),
"Reference"-taso lisää tarkemmat nimet (kaupungit). Tämä tarkoittaa, että osa
nimistä (maiden nimet) on nyt pilvi-/revontulikerroksen ALLA, ei kokonaan
päällä niin kuin ennen. Visuaalisesti ero on pieni, mutta mainitsen sen,
koska tehtävä korosti tasojärjestyksen säilyttämistä.

**Attribuutio:** `Esri, HERE, Garmin, © OpenStreetMap contributors, and the
GIS user community` (vakiomuotoinen Esri Canvas -attribuutio). Lisätty myös
README.md:n datalähdeosioon.

## OSA 2: OVATION-kentän piirto

**Havainto koodikatselmuksessa:** `drawOvalOverlay()`-funktio toteutti jo
ennen muutoksia kaiken pyydetyn: Mercator-korjauksen (`merc()`/`imerc()`
pystyakselilla, canvas esivääristetty Mercator-Y:ssä niin että MapLibren
`image`-lähteen nelikulmiovenytys tuottaa geometrisesti oikean tuloksen),
yhden pikselin per OVATION-hilasolu (1° resoluutio, ei interpolointia,
ei naapurien sekoittamista) ja liikennevaloasteikon (vihreä → keltainen
→ oranssi → punainen) alfakynnyksellä niin että karttapohja näkyy läpi
matalilla todennäköisyyksillä.

**Mitä muutin:** En löytänyt varsinaista virhettä logiikasta, mutta koska
en pysty ajamaan sovellusta oikeassa selaimessa tässä ympäristössä
(ei selainautomaatiotyökalua käytössä), varmistin soluterävyyden riippumatta
siitä, kunnioittaako MapLibren WebGL-rasterikerros `raster-resampling:
'nearest'`-asetusta täydellisesti `image`-tyyppisille lähteille (tästä on
ollut epävarmuutta eri MapLibre-versioissa). Nostin piirtocanvaksen
resoluutiota 4-kertaiseksi (360×181 → 1440×721) niin, että jokainen
hilasolu koostuu useista identtisistä pikseleistä yhden sijaan — tämä tekee
solujen reunoista terävät myös siinä tapauksessa, että GPU tekisi lievää
bilineaarista suodatusta zoomatessa. Itse väri-/alfalogiikkaa en muuttanut.

**Parametrit (ennallaan, ei muutettu):**
- Väriasteikko: vihreä (20,200,80) → keltainen (220,220,0) → oranssi
  (235,100,0) → punainen (215,0,0), käännepisteet t=0,0.35,0.65,1
  (t = (p-1)/99, p = todennäköisyys-%).
- Alfa: `clamp((p-3)*4, 0, 230)` — kynnys 3 %, jyrkkä nousu, maksimi 230/255
  (~90 %).
- `raster-opacity: 0.85`, `raster-resampling: 'nearest'`.

## OSA 3: Aikajana-logiikka

**Havainto:** Myös tämä oli jo pääosin kunnossa: aikajana (`timeSlider`)
liikuttaa vain pilvitasoa (`cloudTimeFloat`/`renderClouds`), ja OVATION-kenttä
sekä pistekohtainen revontulitodennäköisyys (`auroraProbAt`) käyttävät aina
viimeisintä ladattua OVATION-hilaa `state.hour`-arvosta riippumatta — dataa ei
ekstrapoloida. Tämä täsmää koodin omien kommenttien kanssa
("Aina nykyhetken OVATION, riippumatta aikajanan kohdasta (jäädytetty)").

## Karttapohjat uusiksi: Yleiskartta (OpenFreeMap) + Satelliitti (2026-10)

Käyttäjä pyysi karsimaan pohjakartat kahteen (Yleiskartta + Satelliitti,
poistaen tumman/vaalean/"lämpimän" rasteri-/väripohjan) ja rakentamaan
uuden, Windy-henkisen "Yleiskartan" avaimettomasta OSM-vektoridatasta.

### 1. Käyttöehdot ja skeema - todennettu, ei oletettu

**OpenFreeMap** (`tiles.openfreemap.org`), haettu/luettu suoraan
palvelun omilta sivuilta (openfreemap.org, quick_start-ohje):
- **Ei API-avainta, ei rekisteröintiä** ("no registration, no user
  database, no API keys, and no cookies").
- **MIT-lisenssi, kaupallinen käyttö sallittu.** Vaadittu attribuutio on
  tavallinen OSM-attribuutio ("© OpenStreetMap contributors") - OpenFreeMapin
  omaa mainintaa EI vaadita ("You do not need to display the OpenFreeMap
  part, but it is nice if you do").
- **Skeema: "unmodified OpenMapTiles"** (tyylit on forkattu/muokattu,
  mutta itse laattaskeema on standardi OpenMapTiles) - vahvistettu
  myös suoraan lataamalla oikea tyyli-JSON
  (`https://tiles.openfreemap.org/styles/liberty`) ja tarkistamalla
  lähde-/tasorakenne (`source: openfreemap, type: vector, url:
  https://tiles.openfreemap.org/planet`, 111 tasoa OpenMapTiles-
  source-layer-nimillä: water/waterway/boundary/transportation/place/jne).
- **Laattaosoite käytössä:** `https://tiles.openfreemap.org/planet`
  (vektorilaatat), `https://tiles.openfreemap.org/fonts/{fontstack}/
  {range}.pbf` (glyfit, tarvitaan tekstitasoille).
- **"water"-tason `class`-arvot todennettu OpenMapTiles-skeeman omasta
  dokumentaatiosta** (openmaptiles.org/schema): `ocean` = kaikki isot
  merialueet OpenStreetMapDatan vesipolygoneista (Itämeri MUKAAN LUKIEN),
  `lake` = "kaikki muut" nimetyt vesialueet, lisäksi `river`/`pond`/`dock`/
  `swimming_pool`. Tämä mahdollisti suoran `class != 'ocean'` -suodatuksen
  "meri pysyy maan värisenä, järvet/joet omaa tummempaa väriään" -vaatimusta
  varten, ilman arvailua.

### 2. Yksi säätövakio kaikille väreille

`BASEMAP_GENERAL` (index.html) kokoaa KAIKKI "Yleiskartan" värit yhteen
olioon (`landSeaColor`, `waterColor`, `roadColor`, `boundaryColor`,
`labelColor`, `labelHaloColor` + rantavarjon säätimet) - hienosäätö
yhdestä paikasta, kuten pyydettiin. Alkuarvot ovat SILMÄMÄÄRÄISIÄ
likiarvoja käyttäjän toimittamasta Windy-vertailukuvasta (lämmin
oliivinruskea, ~`#a69660`) - EI tarkkaa pikselinäytteistystä (ei
kuvankäsittelytyökalua tässä ympäristössä), joten tarkka sävy on
odotetusti hienosäädettävä.

### 3. Maa-alueet POISTETTU vektoritasoista, vain yhtenäinen tausta

`landcover`/`landuse`/`park`-OpenMapTiles-tasot JÄTETTY KOKONAAN POIS
tyylistä - jos ne olisi piirretty (kuten esim. "liberty"-referenssityyli
tekee), maa näkyisi pilkottuna metsän/puiston/asutuksen omiin väreihin,
mikä olisi ristiriidassa "maa- ja merialueet samaa väriä" -vaatimuksen
kanssa. Sen sijaan koko maa-ala tulee YHDESTÄ `background`-tasosta
(`landSeaColor`), ja meri saa SAMAN värin koska `water`-taso suodattaa
`class='ocean'`:n pois (ei siis mitään erillistä "meri"-täyttöä edes
ole - tausta näkyy suoraan läpi siellä missä mikään muu taso ei peitä).

### 4. Rantaviivan "pehmeä varjo merenpuolella" - rengassuunta todennettu

Nykyinen tarkka `ne_50m_coastline.geojson`-pohjainen rantaviiva
(`addBordersOverlay()`) säilytetty SELLAISENAAN. Varjo (`coast-shadow`
-taso) vaihdettu `line-translate`-ruutupikselivääntämisestä (mielivaltainen
suunta, ei tiennyt kumpi puoli on meri) `line-offset`-arvoon (kohtisuora
viivan OMAAN kulkusuuntaan, geometrisesti merkityksellinen - JOS datan
rengassuunta on johdonmukainen):

- **Todennettu Python-simulaatiolla (shoelace-kaava)**, ei arvattu:
  ladattiin oikea `ne_50m_coastline.geojson` ja laskettiin signeerattu
  pinta-ala KAIKILLE 12:lle Suomen-alueen saarilenkille - **12/12 olivat
  vastapäivään (CCW)**, eli maa VASEMMALLA kuljettaessa pisteluetteloa
  eteenpäin, meri OIKEALLA. Laajempi haku (14 piirrettä, koko Suomen
  bbox) osoitti ETTÄ KAIKKI ko. alueen piirteet ovat SULJETTUJA lenkkejä
  (0 avointa "mannerjuovaa"), mikä viittaa siihen että koko aineisto on
  johdonmukaisesti polygonin-reunasta-johdettua (RFC7946-tyylinen
  ulkoreunasuunta).
- **MapLibren tyylispesifikaatio** (maplibre.org/maplibre-style-spec,
  luettu suoraan): "line-offset: positiivinen arvo siirtää viivan
  OIKEALLE suhteessa viivan suuntaan, negatiivinen VASEMMALLE."
- Näistä kahdesta seuraa: **positiivinen `line-offset` osuu merelle**
  TÄLLÄ datalla (CCW-rengas + "oikealle=positiivinen" -sääntö yhdessä).
  `BASEMAP_GENERAL.coastShadowOffsetSign = 1` on asetettu tämän
  perusteella.
- **EI VOITU VAHVISTAA SILMÄMÄÄRÄISESTI OIKEASSA SELAIMESSA** tässä
  ympäristössä (ei selainautomaatiota) - jos varjo silti näkyy
  käytännössä väärällä (maan) puolella, AINOA tarvittava korjaus on
  kääntää `coastShadowOffsetSign` arvoon `-1` (yksi rivi).

### 5. Tasojärjestys ja kerrosarkkitehtuuri

- `addLandFillOverlay()`/`addLabelsOverlay()`/`_landGeoJSON` POISTETTU
  kokonaan (olivat olemassa VAIN tumma/vaalea/lämmin-pohjia varten,
  kaikki poistettu) - kuollut koodi siivottu pois, ei jätetty paikalleen.
- "Yleiskartan" omat nimitasot (`vt-label-country`, `vt-label-city`)
  MÄÄRITELLÄÄN OSANA vektorityyliä (ladataan `style.load`:ssa), mutta
  niiden PAIKKA kerrosjärjestyksessä tulee `reorderAllLayers()`:sta -
  sijoitettu TÄSMÄLLEEN siihen kohtaan missä vanha, nyt poistettu
  `labels`-raster-taso oli (heti `coast`:in jälkeen, ENNEN `cameras`:ia)
  - tämä kohta oli JO `clouds-webgl`:n JÄLKEEN ennen tätäkin muutosta,
    joten "paikannimet pilvitason päällä" -vaatimus täyttyy ilman
    erillistä uutta järjestyspäätöstä.
- Pilvet/tuuli/OVATION/kamerat: EI koskettu, sama `reorderAllLayers()`-
  lista samassa suhteellisessa järjestyksessä kuin ennen (vain
  `land-fill` poistettu listasta, `labels`-nimi korvattu kahdella
  uudella id:llä samassa kohdassa).
- `switchMapStyle()` yksinkertaistettu: AINA täysi `map.setStyle()`-
  uudelleenlataus (ei enää kevyttä "vaihda vain base-taso" -oikotietä,
  joka toimi vain kun jokainen pohja oli TASAN yksi taso/lähde -
  "Yleiskartta" on nyt monitasoinen, oikotie ei enää riitä).
- Pilvimallin vaihdon dynaaminen attribuutioteksti ("Pilvet & tuuli: X")
  EI ENÄÄ ole kiinnitetty mihinkään pohjakartan lähteeseen (olisi
  pakottanut koko vektorityylin uudelleenlataamaan JOKA mallinvaihdolla)
  - oma pieni, pysyvä TYHJÄ GeoJSON-lähde (`cloud-attr`) kantaa sitä
    erikseen, halvalla poistettavissa/lisättävissä uudelleen.

### Mitä testattiin MISSÄ

**Oikeasti testattu/todennettu:**
- OpenFreeMap:in käyttöehdot/hinnoittelu/skeema luettu suoraan heidän
  omilta sivuiltaan (openfreemap.org, quick_start).
- Oikea "liberty"-tyyli-JSON ladattu ja jäsennetty Pythonilla - lähde-/
  tasorakenne, source-layer-nimet, esimerkkitäytöt/suodattimet KAIKKI
  poimittu OIKEASTA tiedostosta, ei muistista/oletuksesta.
- "water"-tason `class`-arvot (`ocean`/`lake`/`river`/jne.) luettu
  suoraan OpenMapTiles-skeeman omasta dokumentaatiosta
  (openmaptiles.org/schema).
- Rantaviivan rengassuunta (CCW/CW) laskettu Pythonilla OIKEASTA
  `ne_50m_coastline.geojson`-tiedostosta (shoelace-kaava, 12 piirrettä).
- `line-offset`:in merkkikonventio luettu suoraan MapLibren tyyli-
  spesifikaatiosta.
- `parse_check.py` (esprima) koko muutetulle `index.html`:lle.

**EI testattu selaimessa (ei selainautomaatiota tässä ympäristössä) -
SUURIN JÄLJELLÄ OLEVA RISKI:**
- Koko vektorityylin todellinen renderöinti (lataako OpenFreeMap:in
  laatat oikein, näkyvätkö `source-layer`-suodattimet/värit kuten
  suunniteltu, toimiiko `glyphs`-osoite tekstin piirtoon).
- `coastShadowOffsetSign`:in todellinen suunta (ks. kohta 4 - matemaattisesti
  perusteltu, mutta EI silmin nähty).
- Väripaletin visuaalinen osuvuus Windy-vertailukuvaan (alkuarvot ovat
  likiarvoja, odotetusti hienosäädettäviä).
- `switchMapStyle()`:n täyden uudelleenlatauksen käyttäytyminen käytännössä
  (välkkyykö näkymä, säilyvätkö pilvet/tuuli/kamerat oikein latauksen
  yli - koodi KUTSUU `addOverlays()`:in `style.load`-tapahtumasta kuten
  ennenkin, mutta ei nähty toimimassa).

**Mitä lisäsin:** Erillisen "Revontulet: nyt" -merkinnän (pieni violetti
pilli), joka tulee näkyviin aina kun aikajana on siirretty pois nykyhetkestä
(`state.hour !== 0`) ja piiloutuu kun aikajana palautetaan nykyhetkeen.
Sijoitin sen aikajanan "Ajankohta"-rivin yhteyteen (`.timectl .lbl`), EN
"Revontulet"-faktorikorttiin — faktorikortit (`.factors`) piilotetaan kun
infopaneeli pienennetään ("sheet.min"), mutta aikajanarivi (`.timectl`)
pysyy aina näkyvissä. Tämä varmistaa, että merkintä on todella näkyvissä
"aina kun aikajana ei ole nykyhetkessä", niin kuin tehtävässä pyydettiin,
myös pienennetyssä tilassa.

Olemassa oleva, pidempi infoteksti ("Revontulet: nykyhetki (NOAA OVATION,
päivitetty HH:MM UTC)…") jätettiin paikoilleen — se kertoo tarkan OVATION-
datan aikaleiman, jota uusi lyhyt merkintä ei toista.

## Mitä EI muutettu

- OVATION- tai pilvidatan hakulogiikka (`loadOvation`, `loadCloudGrid`,
  `scripts/fetch-clouds.py`, `.github/workflows/pilvidata.yml`) — koskematta.
- Rajat/rantaviiva-GeoJSON-lähde (jsdelivr) — koskematta, ei tarvinnut avainta.

## Avoimet kysymykset / epävarmuudet sinulle

1. **En voinut testata muutoksia oikeassa selaimessa** (ei selain­automaatio­
   työkalua tässä ympäristössä) — kaikki tarkistukset tehtiin koodi­
   katselmuksella ja suorilla rajapintatesteillä (ladattujen tiilikuvien
   visuaalinen tarkistus). Suosittelen avaamasta haaran paikallisesti
   (`python -m http.server 8080`) ja silmäilemästä kaikki kolme
   karttatyyliä + aikajanan ennen main-haaraan yhdistämistä.
2. **Esri Canvas -tiilien nimitaso on osittain pohjassa** (ks. OSA 1 -huomio
   yllä) — jos tämä häiritsee visuaalisesti, vaihtoehto olisi etsiä toinen
   avaimeton base+labels-pari, mutta en löytänyt parempaa ehdokasta
   rajallisessa ajassa.
3. **"Revontulet: nyt" -merkinnän sijainti** on oma tulkintani tehtävän
   tekstistä ("revontulikentän yhteyteen") — valitsin aikajanarivin sen
   pysyvän näkyvyyden takia. Jos tarkoitit jotain tarkempaa sijaintia
   (esim. suoraan kartan päälle, ei infopaneeliin), kerro ja säädän.
