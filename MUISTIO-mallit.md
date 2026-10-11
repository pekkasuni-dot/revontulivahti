# Muistio: pilviennusteen lähteiden yhtenäistäminen + mallinvalitsin

Haara: `feature/mallinvalitsin` (haarautettu `feature/kartta-ovation-aikajana`-haarasta,
jossa aiemmat kartta/OVATION/aikajana-muutokset olivat vielä mergeamatta mainiin —
main koskematta koko ajan). Neljä committia: OSA 1 (yhtenäistäminen), OSA 2a
(ICON-EU-hakuputki), OSA 2b (mallinvalitsin-UI), tämä muistio.

## Lähtötilanne

Sovelluksessa oli kaksi erillistä, keskenään ristiriitaista pilvilähdettä
(käyttäjä löysi tämän aiemmassa kierroksessa kuvapareilla): kartan pilvitaso
luki ECMWF-hilaa, alapaneelin näkyvyysindeksi luki erillistä Open-Meteon
"Best Match" -pistehakua. Tavoite: yksi yhteinen valittu malli, jota KAIKKI
pilvisyysnäytöt käyttävät.

## OSA 1: Yhtenäistäminen

- `data/clouds.json` → `data/clouds-ecmwf.json` (git mv, säilyttää historian),
  samoin `.github/workflows/pilvidata.yml` → `pilvidata-ecmwf.yml`. Syy: kun
  malleja on useampi, tiedostonimen pitää kertoa kumman mallin data se on.
- Uusi `CLOUD_MODELS`-rekisteri (index.html): per malli `id`, `label`,
  `gridFile`, `hasLayers` (onko matala/keski/ylä-erittely saatavilla).
  Uuden mallin lisäys = yksi rekisteriin lisättävä määrittely + oma
  fetch-skripti + oma workflow-tiedosto.
- `state.cloudModel` (oletus `'ecmwf'`) ohjaa mistä tiedostosta
  `loadCloudGrid()` hakee. Muistetaan `localStorage`:ssa avaimella
  `rv-cloud-model` (try/catch, virheellinen/puuttuva arvo → oletukseen).
- `applyStaticGrid()` lukee nyt valinnaiset `valsLow/valsMid/valsHigh`-kentät
  JSON:sta, jos malli ne tarjoaa.
- Yleistin aiemman klikkausmerkin hilanäytteistyksen (`cloudGridPctAt`)
  funktioksi `sampleCloudGridField(field,lat,lon,date)`, jota käyttävät
  nyt KAIKKI pilvisyysluvut:
  - Kartan pilvitaso (WebGL-shaider) — **ei koskettu**, lukee edelleen
    suoraan `state.cloudGrid.vals`-taulukkoa GPU:ssa, malli-agnostinen
    rakenteeltaan alusta asti.
  - Klikkausmerkin raaka pilvisyys-% — `cloudGridPctAt()`, ennallaan.
  - **UUSI:** `cloudVisibilityFactorAt(lat,lon,date)` korvaa vanhan
    `cloudFactorAt(date)`:n. Jos `hasLayers` on tosi (esim. ICON-EU),
    käyttää samaa korkeuspainotettua kaavaa kuin ennen
    (alapilvi 0,95 / keski 0,65 / yli 0,30). Jos EI (ECMWF:n avoin data —
    siinä on vain kokonaispilvisyys, ei korkeuserittelyä), käytetään
    yksinkertaistettua `1 - kokonaispilvisyys`. Tämä on **tietoinen
    yksinkertaistus ECMWF:lle**, ei virhe — avoimessa ECMWF-datassa ei ole
    matala/keski/ylä-kenttiä, eikä tehtävä pyytänyt laajentamaan ECMWF:n
    GRIB2-hakua (se olisi ollut oma, isompi, testaamaton muutos tuotannossa
    jo olevaan putkeen). Merkitty koodikommentilla.
  - Poistettu kokonaan: `loadClouds()` (Open-Meteon pistekohtainen
    Best Match -haku), `state.clouds`, vanha `cloudFactorAt()`.
    `setPoint()` ei enää tee verkkohakua pistettä valittaessa — kaikki data
    on jo ladattu etukäteen mallin hilaan, joten `update()` voi lukea sen
    synkronisesti.

## OSA 2: Mallinvalitsin + ICON-EU

### Miksi ICON-EU ja mikä tunniste

Open-Meteon dokumentaatiosta ja oikealla rajapintakutsulla tarkistettu
(ei arvattu):

- Malli ladataan `&models=icon_eu` (toimii myös `&models=dwd_icon_eu` —
  Open-Meteon dokumentaation mukaan jälkimmäinen on "virallinen" nimi,
  molemmat tuottivat identtisen vastauksen testissä; käytin lyhyempää).
- **Resoluutio:** 0,0625° (~7 km). **Päivitysväli:** Open-Meteon
  dokumentaation mukaan "every 3 hours", **ennustepituus** 5 vrk.
- **Kattavuus Lapissa — testattu oikeilla hauilla, ei pääteltynä:**
  Rovaniemi (66,5°N), Inari (68,9°N), Utsjoki (69,9°N, Suomen
  pohjoisin piste) ja Kilpisjärvi (69,05°N) palauttivat kaikki oikeaa,
  ei-null-dataa kaikille neljälle kentälle (`cloud_cover`,
  `cloud_cover_low/mid/high`). ICON-EU:n kattavuus riittää koko Suomeen.
- ICON-EU tarjoaa (toisin kuin ECMWF:n avoin data) myös matala/keski/ylä-
  erittelyn → `hasLayers:true`, näkyvyysindeksi täyttä tarkkuutta.

### Hilan rakentaminen (ei valmista bulkkihakua Open-Meteolla)

Open-Meteo on pistekohtainen rajapinta, ei tarjoa ECMWF:n tapaan valmista
globaalia/aluekohtaista hilatiedostoa. Ratkaisu: `scripts/fetch-clouds-icon_eu.py`
(pelkkä Python-standardikirjasto, ei pip-riippuvuuksia) hakee hilan
**Open-Meteon monipistekyselyllä** (pilkuin erotetut lat/lon-listat palauttavat
kaikki pisteet yhdellä HTTP-kutsulla — tätä EI ole dokumentoitu rajana
missään, mutta testattu toimivaksi 100 pisteeseen asti).

- **Alue:** Suomi + marginaali, 59,0–70,5 °N, 18,0–32,0 °E (ei globaali —
  ICON-EU:n kattavuus loppuu joka tapauksessa n. 70,5 °N:aan, ja sovelluksen
  käyttötarkoitus on nimenomaan Suomi).
- **Resoluutio hilatiedostossa:** 0,5° × 0,5° (24 × 29 = 696 pistettä).
  Karkeampi kuin ICON-EU:n natiivi 0,0625°, koska 696 pistettä per ajo on
  jo kohtuullinen Open-Meteon ilmaiskiintiöön nähden — ks. alla.
- **Aikaresoluutio:** tunneittain, 48 h (`forecast_days=2`) — tarkempi kuin
  ECMWF:n 3 h, reilusti yli aikajanan 10 h -maksimin.
- **TÄRKEÄ HAVAINTO, löytyi oikeasti ajamalla skriptiä (ei pääteltynä):**
  Open-Meteon ilmainen kiintiö ("600 kutsua/min" pricing-sivun mukaan)
  lasketaan monipistekyselyssä **per PISTE, ei per HTTP-kutsu** — 6×100
  pisteen erää peräkkäin sai 429-virheen tasan 600. pisteen kohdalla.
  Korjattu: 12 s tauko erien välissä (pitää tahdin reilusti alle 600/min),
  ja 429-virheelle 65 s palautumisaika ennen uudelleenyritystä.
  **Koko skripti on ajettu oikeasti tässä ympäristössä onnistuneesti**
  (ei vain luettu/arvioitu), tulos tarkistettu pistokokein suoraan
  rajapintaa vasten (täsmäsi, ks. git-historia/komentoloki) ja alustava
  `data/clouds-icon_eu.json` on committoitu mukaan (~490 kt, 48×24×29×4 kenttää).
- GH Actions -työnkulku `pilvidata-icon_eu.yml`: 4× vrk (`40 1,7,13,19 * * *`,
  28 min ECMWF:n jälkeen ajastuksen hajauttamiseksi), oma `concurrency`-ryhmä
  (ei estä/peru ECMWF:n ajoa), ei tarvitse apt/pip-asennuksia (pelkkä
  `python3 scripts/fetch-clouds-icon_eu.py`).

### Sivuhuomio: löytyi ja korjattu samalla

WebGL-pilvitason tekstuuri-uudelleenlataus (`cloudWebGLLayer.render()`)
tarkisti hilan koon muutoksen (`nlat`) vain `tex0`:lle, ei `tex1`:lle — jos
kahden mallin aikaindeksit sattuisivat osumaan samaan arvoon mallia
vaihdettaessa, `tex1` olisi jäänyt vanhan mallin kokoiseksi/sisältöiseksi.
Harmiton niin kauan kuin hilakoko ei koskaan muuttunut ajonaikaisesti (ennen
mallinvalitsinta se ei muuttunut) — mallinvalitsin tekee tästä oikean bugin,
joten korjattu samalla commitissa.

### UI

`.timectl`-lohkoon lisätty `<select id="cloudModelSelect">`, täytetään
dynaamisesti `CLOUD_MODELS`-rekisteristä (uusi malli ilmestyy valikkoon
automaattisesti). Sijainti valittu samalla perusteella kuin "Revontulet: nyt"
-merkki aiemmin: `.timectl` pysyy näkyvissä myös infopaneelin pienennetyssä
tilassa, joten valitun mallin nimi on "aina näkyvissä" kuten pyydettiin.
Vaihto: tallettaa valinnan, tyhjentää vanhan hilan, hakee uuden
(`loadCloudGrid()`), näyttää virheen `note()`-tekstillä epäonnistuessa, ja
suojaa nopeaa peräkkäistä mallinvaihtoa sekvenssinumerolla (ettei vanhempi
kesken jäänyt haku pääse ylikirjoittamaan uudempaa valintaa).

## Mitä EI tehty (tehtävän rajauksen mukaisesti)

- FMI HARMONIE — ei toteutettu, vain mainittu rekisterin kommentissa
  tulevana laajennuksena.
- OVATION-kenttä, taustakartat, aikajana-logiikan mekaniikka — koskematta.
  Aikajana TOIMII uudella mallilla automaattisesti, koska pilvitason
  piirto on alusta asti malli-agnostinen (lukee aina `state.cloudGrid`:stä).
- ECMWF:n GRIB2-hakua ei laajennettu matala/keski/ylä-kentillä — ks. OSA 1
  perustelu yllä.

## Avoimet kysymykset sinulle

1. **En voinut klikkitestata selaimessa** (ei selainautomaatiotyökalua
   tässä ympäristössä) — sen sijaan ajoin ICON-EU-hakuskriptin OIKEASTI,
   vertasin sen tuottamaa hilaa suoraan rajapintaan pistokokeella (täsmäsi),
   ja tarkistin palvelimelta että molemmat JSON-tiedostot ja uudet
   HTML-elementit latautuvat oikein. Suosittelen silti pikaista silmäilyä
   selaimessa (malli vaihtuu, luvut päivittyvät, aikajana toimii molemmilla)
   ennen main-haaraan yhdistämistä.
2. **ICON-EU-hilan resoluutio (0,5°) on karkeampi** kuin ECMWF:n
   pohjois-etelä-suunnassa (0,25°) — valinta tehtiin Open-Meteon
   kutsumäärien/kiintiön takia. Jos tarkempi hila on tärkeämpää kuin
   kiintiövarmuus, resoluutiota voi nostaa (esim. 0,25°) hinnalla että
   hakuskripti kestää pidempään (enemmän 12 s taukoja) — kerro jos haluat
   tämän.
3. **ECMWF:n näkyvyysindeksi on yksinkertaistettu** (ei korkeuserittelyä,
   ks. OSA 1) — jos tämä on ongelma, vaihtoehto olisi laajentaa
   `scripts/fetch-clouds.py`:n ECMWF-hakua `param=["tcc","lcc","mcc","hcc"]`:lla,
   mutta en tehnyt tätä nyt, koska en voinut testata ECMWF Open Data
   -pakettia tässä ympäristössä (vaatii `ecmwf-opendata`+`cfgrib`+GRIB2,
   toimii vain CI:ssä) ja tehtävä ei nimenomaan pyytänyt koskemaan ECMWF-putkeen.
