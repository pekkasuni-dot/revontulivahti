# Muistio: korkeusvalinnat + tuulitaso + hiukkasanimaatio

Haara: `feature/korkeudet-ja-tuuli` (haarautettu `main`:sta OSA 1/2-mallinvalitsin-
ja ECMWF-tyon jalkeen). Main koskematta koko tyon ajan.

## Mallinvalitsin koskemaan myos tuulta (2026-10, haara `feature/mallit-kaikille-tasoille`)

**Taustasyy:** mallinvalitsin vaihtoi aiemmin VAIN pilvitasoa - tuuli tuli
aina HARMONIEsta riippumatta valitusta pilvimallista. Harhaanjohtavaa:
jos ECMWF ja HARMONIE sijoittavat matalapaineen eri kohtiin, tuulen
pyörre (HARMONIE) ja pilvikuvio (vaikka ECMWF) eivät osu yhteen. Tavoite
(Windyn tapaan): valittu malli koskee KAIKKIA sаätasoja.

### 1. Mallit valitsimessa

- **HARMONIE pilvimalliksi:** TARKISTETTU - oli jo olemassa edellisesta
  tehtavasta (`CLOUD_MODELS.harmonie`), toimii, ei vaatinut uutta tyota.
- **ECMWF-tuuli (UUSI):** `scripts/fetch-wind-ecmwf.py`. Vahvistettu
  OIKEALLA hakupyynnolla (ei oletettu): pinta `param=["10u","10v"]` ->
  `u10`/`v10`; painepinnat `param=["u","v"], levtype="pl",
  levelist=[850,500,300]` -> `isobaricInhPa=[850,500,300]` YHDESSA
  haussa (ei 3 erillista). 17 askelta (0-48h, 3h valein), sama kuin
  pilvi-ECMWF.
- **ICON-EU-tuuli (UUSI):** `scripts/fetch-wind-icon_eu.py`. Vahvistettu
  DWD:n hakemistolistauksella: pinta `u_10m`/`v_10m`-hakemistot
  (`U_10M`/`V_10M`); painepinnat `u`/`v`-hakemistot sisaltavat SEKA
  model-level (hybridi, ei haluttu) etta pressure-level (hPa, haluttu)
  -tiedostoja - 850/500/300 hPa kaikki todennetusti saatavilla,
  tunneittain 0-78h asti. 31 askelta (0-30h), sama kuin pilvi-ICON-EU.
  **Havaittu operatiivinen riski testatessa:** step 28 palautti 404:n
  ensimmaisella yrityksella (DWD oli viela julkaisemassa sita juuri
  silla hetkella) - uudelleenyritys 1 min myohemmin onnistui. Sama
  riski on OLEMASSA pilvi-ICON-EU:ssakin (ei uusi tasta tehtavasta),
  ei korjattu erikseen (ei pyydetty, dokumentoitu tahan).

### 2. Kattavuus: YKSI jaettu aluevakio per malli

Uusi `scripts/model_areas.py` - `ECMWF_LON0/LAT0/LON1/LAT1`,
`ICON_EU_LAT0/LAT1`, `HARMONIE_BBOX`. KAIKKI 6 fetch-skriptia (3 pilvi +
3 tuuli) tuovat nama samat vakiot - alue ei voi enaa erkaantua pilven ja
tuulen valilla samalle mallille, koska molemmat lukevat SAMAA lahdetta.

**HARMONIE: MUUTOS/PERUUTUS.** Edellisessa tehtavassa ("tuulialue")
tuulelle etsittiin HARMONIEn OMAN natiivialueen suurin NaN-vapaa
suorakulmio (-1-35 °E, 55-73,5 °N) - paljon LAAJEMPI kuin pilvi-
HARMONIEn alue (19-32 °E, 59-70 °N). Tama tehtava PERUU sen: koska
vaatimus on nyt "tuuli ja pilvet TASMALLEEN samalta mallilta samalta
alueelta", tuuli KAVENNETTIIN takaisin pilvien alueeseen. Pienempi alue
on reilusti NaN-vapaan alueen SISALLA (ei uutta NaN-riskia, sama
natiivihila kuin ennen).

Kaikkien mallien tuulihorisontti nostettu 31 askeleeseen (0-30h) samaksi
kuin pilvet - vaatimus "tuuli seuraa valitun mallin omia aika-askeleita".

### 3. Käyttöliittymä

`WIND_SOURCES`-rekisteri (index.html) korvaa vanhan itsenaisen
`WIND_LEVELS`:in - per malli: `lazy`-lippu (sama periaate kuin
`CLOUD_MODELS`: ECMWF ei-laiska/1 tdsto, ICON-EU/HARMONIE laiska/
meta+per-askel) + `levels`-lista (mitka korkeudet ovat oikeasti
saatavilla). `windFilePaths(malli,taso)` on YKSI paikka joka muodostaa
tiedostopolut - fetch-skriptien TAYTYY kirjoittaa tasmalleen samat nimet.

- **Lähdeviite näyttää mallin:** `updateWindLevelLabel()` käyttää
  `CLOUD_MODELS[state.cloudModel].attr` - esim. "Tuuli: 500 hPa ·
  © DWD (ICON-EU)".
- **Harmaa korkeus jos puuttuu:** `populateWindLevelPanel()` tarkistaa
  `windLevelAvailable(malli,taso)`, lisaa `.unavailable`-CSS-luokan +
  `disabled`+`title`-selitys. EI TALLA HETKELLA LAUKEA KENELLEKAAN
  (kaikki 3 mallia tarjoavat kaikki 4 korkeutta, todennettu) - puhtaasti
  tulevaisuuden varalle, kuten pyydettiin.
- **Mallinvaihto vaihtaa MYOS tuulen:** `switchCloudModel()` kutsuu
  `reloadWindForNewModel()` onnistuneen pilvilatauksen jalkeen (VAIN jos
  `state.windOn`) - lataa uuden mallin tuulidatan, nollaa vanhan.
- **Aikajana:** tuuli kayttaa `timeFloatInArray(windGrid.times, ...)`:ia
  - koska `windGrid.times` nyt tulee VALITUN mallin omasta tiedostosta,
  "tuuli seuraa mallin omia aika-askeleita" toteutuu automaattisesti,
  ei vaatinut erillista koodia (sama yleinen funktio kuin pilvilla).

**Arkkitehtuuri (laiska lataus yleistettiin):** `ensureLazyStepLoaded(g,
idx, kind, decode, onReady)` on nyt YKSI yleinen funktio jota SEKA
`ensureCloudStepLoaded` etta uusi `ensureWindStepLoaded` kayttavat ohuina
kaareina (decode-funktio tulkitsee JSON:in oikeaan muotoon: pilvelle
toUnitFloat32-taulukot, tuulelle base64-dekoodatut Float32Array u/v).
`resolveStep`/`g.steps`-Map-rajapinta oli jo entuudestaan geneerinen -
ei muutoksia. Windin piirtokoodi (`sampleWindAt`, jota seka nuolet etta
hiukkasanimaatio kayttavat) oli JO rakennettu mallikohtaisten
`lat0/lon0/nlat/...`-kenttien varaan - VAIN sisainen tallennusmuoto
(flat array -> steps-Map) muuttui, nuolten/hiukkasten OMA koodi (OSA 1/2)
EI vaatinut muutoksia.

### 4. Versioautomaatio

`.githooks/pre-commit` (ks. CLAUDE.md "Versioautomaatio") bumppaa
`APP_VERSION`+`sw.js`:n `CACHE`:n automaattisesti samaan commitiin kun
`index.html` muuttuu. Testattu OIKEASTI (ei vain koodikatselmoitu)
kolmessa skenaariossa eristetyssa git-klonissa: (1) index.html muuttuu ->
versio nousee oikein molemmissa tiedostoissa samassa commitissa,
(2) kayttaja jo kasin muuttanut version -> hook ei tuplaa, (3) index.html
EI muutu -> hook ei tee mitaan. Vaatii kertaluonteisen
`git config core.hooksPath .githooks` per paikallinen klooni (ei
automaattista - Git ei suorita hookkeja oletuspolun ulkopuolelta).
`.gitattributes` pakottaa `.githooks/*`:n LF-rivinvaihtoihin (CRLF
rikkoisi shebang-rivin Windows-Git-Bashinkin sh.exe:lla).

### Tiedostokoot

| Malli | Taso | Koko (yhteensa, kaikki askeleet) |
|---|---|---|
| ECMWF | kukin 4 tasoa | ~1,3 Mt/taso (1 tdsto, ei-laiska) |
| ICON-EU | kukin 4 tasoa | ~1,8 Mt/taso (meta+31 step-tdstoa) |
| HARMONIE | kukin 4 tasoa | ~5,7 Mt/taso (meta+31 step-tdstoa, suurempi hila) |

Selain lataa VAIN valitun mallin+korkeuden, ja laiskoilla malleilla vain
1-2 askelta kerrallaan (~50-300 KB/askel riippuen mallista) - ei koskaan
koko ~1,3-5,7 Mt:n tiedostoa kerralla paitsi ECMWF:lla (joka on jo
alunperin pieni, sama periaate kuin pilvi-ECMWF).

### Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeilla rajapintakutsuilla/ajoilla testattu:**
- ECMWF Open Data: todellinen testihaku vahvisti `10u/10v` ja
  `u/v+isobaricInhPa=[850,500,300]` -parametrit ennen koodin
  kirjoittamista.
- DWD:n hakemistolistaus: todellinen HTTP-kysely vahvisti `u_10m/v_10m`
  ja `u/v`-hakemistojen sisallon (model-level vs. pressure-level
  -tiedostojen erottelu).
- KAIKKI 3 fetch-skriptia AJETTU KOKONAAN, kaikki 4 korkeutta kutakin -
  12 oikeaa hakua yhteensa, ei vain koodikatselmoitu.
- PNG-renderointi (quiver+pcolormesh+rantaviivat) jokaiselle mallille
  300 hPa:lla (suihkuvirtaus, helpoin tunnistaa visuaalisesti) ja
  pinnalla - kaikki kolme mallia nayttavat SAMANKALTAISEN
  suurenmittakaavaisen virtauskuvion (matalapaineen kierto n. 15-20°E
  kohdalla nakyy KAIKISSA kolmessa mallissa samankaltaisena) - vahva
  RISTIINVARMISTUS mallien kesken, ei vain yhden mallin sisainen
  jarkevyystarkistus.

**EI testattu suoraan, perustuu aiempaan + yleiseen standardiin:**
- U/V-suunnan oikeellisuus (ei peilautunut/180° vaarin) ECMWF:lle ja
  ICON-EU:lle EI ristiintarkistettu lahteen OMAAN WindDirection-kenttaan
  (kuten HARMONIElle tehtiin aiemmin FMI:n kanssa), koska ECMWF/DWD-GRIB2
  ei tarjoa valmista suuntakenttaa yhta helposti - nojaa siihen etta
  u/v="ita"/"pohjoinen" on WMO:n GRIB2-standardin maarittelema
  UNIVERSAALI konventio KAIKILLE keskuksille (ei keskuskohtainen valinta),
  jo kertaalleen empiirisesti vahvistettu HARMONIElle. PNG-renderointien
  fysikaalinen jarkevyys (jet stream oikeassa paikassa/suunnassa,
  matalapaineen pyorteen SAMA muoto 3 riippumattomassa mallissa) tukee
  tata vahvasti, mutta ei ole yhta suora todiste kuin suoraan lahteen
  omaan kenttaan vertaaminen.
- **"Vertaa Windyyn" EI pystytty tekemaan kirjaimellisesti** - tassa
  ymparistossa ei ole selainta/nayttoa Windy.com:in avaamiseen. Paras
  saatavilla ollut korvaava todennus: PNG-renderointi + ristiintarkistus
  3 RIIPPUMATTOMAN mallin kesken (jos kaikki 3 nayttavat saman
  suurpiirteisen kuvion, peilautumisvirhe olisi hyvin epatodennakoinen
  satunnaisesti kaikissa kolmessa samalla tavalla).
- **Koko selainpuolen UI (mallinvaihto vaihtaa seka pilven etta tuulen,
  harmaa-painike-mekanismi, lahdeviitteen paivitys) on koodikatselmoitu
  huolella mutta EI nahty oikeassa selaimessa** (ei selainautomaatiota
  tassa ymparistossa). Versioautomaatio-hook SEN SIJAAN testattiin
  oikeasti (ks. kohta 4) koska se on puhdasta komentorivi-/git-logiikkaa
  joka ei vaadi selainta.

**Suositus ennen main-haaraan yhdistamista:** testaa selaimessa: (1)
vaihda pilvimallia tuulen ollessa paalla, varmista etta MOLEMMAT pilvi-
JA tuulitaso vaihtuvat (ei vain pilvi), (2) tarkista lahdeviitteen
teksti vaihtuu oikein, (3) vieritä aikajanaa jokaisella mallilla ja
varmista tuulihiukkaset/-nuolet pysyvat jarkevina koko matkan, (4)
tee oikea commit index.html:ään ja varmista etta pre-commit-hook
todella laukeaa (vaatii `git config core.hooksPath .githooks`
paikallisesti, ks. CLAUDE.md).

## OSA 1: Tuulitaso

### Lähde ja painepinnat — tutkittu oikeilla rajapintakutsuilla

**Ensisijainen (ja ainoa tarvittu) lähde: FMI HARMONIE, `opendata.fmi.fi`.**
DWD/ICON-EU-varapolkua EI tarvittu — kaikki neljä pyydettya korkeutta
saatiin FMI:lta onnistuneesti, testattu jokainen erikseen oikealla haulla:

- **Pinta (10 m):** stored query `fmi::forecast::harmonie::surface::grid`,
  parametrit `WindUMS,WindVMS`, `levels=0`. GRIB-muuttujat `u10`/`v10`
  (GRIB_typeOfLevel=heightAboveGround).
- **850 / 500 / 300 hPa:** stored query `fmi::forecast::harmonie::pressure::grid`,
  samat parametrit, `levels=850`/`500`/`300`. GRIB-muuttujat `u`/`v`
  (GRIB_typeOfLevel=isobaricInhPa) — tarkistettu etta `isobaricInhPa`-
  koordinaatti todella vastaa pyydettya arvoa (ei vain oleteta).
- Rajapinnan `/download`-paatepiste palauttaa suoraan GRIB2-tiedoston
  (ei tarvitse WFS/GML-kaaretta) — paljon yksinkertaisempi kuin DWD:n
  per-tiedosto-per-askel-malli. YKSI HTTP-kutsu palauttaa kaikki
  pyydetyt aika-askeleet.
- `origintime` on valinnainen — rajapinta valitsee itse tuoreimman ajon.
- Käyttöehdot: **CC BY 4.0**, ei API-avainta, kaupallinen kaytto sallittu
  (tarkistettu FMI:n lisenssisivulta).

### Ristiintarkistus: U=itä, V=pohjoinen — EI peilautunut, EI 180° väärin

Haettiin samaan pisteeseen myös FMI:n OMAT valmiiksi lasketut kentät
`WindSpeedMS` ja `WindDirection`, ja verrattiin niita omaan u/v-pohjaiseen
laskentaan samasta pisteesta/hetkesta:

| | Oma lasku (u,v:sta) | FMI:n oma kenttä | Täsmää? |
|---|---|---|---|
| Nopeus | sqrt(u²+v²) = 1,557 m/s | WindSpeedMS = 1,555 m/s | Kyllä |
| Suunta ("mistä tulee") | atan2(u,v)+180° = 48,2° | WindDirection = 47,0° | Kyllä (~1° ero, pyöristys) |

Tämä on paras mahdollinen varmistus ilman Windy-vertailua: FMI:n OMA,
riippumattomasti laskettu suunta/nopeus täsmää lähes tasan meidän
u/v-tulkintaamme. **U/V eivät ole ristissä eivätkä peilautuneet.**

Karttanuolen/hiukkasen kompassisuunta (minne tuuli PUHALTAA, ei mistä
tulee) lasketaan `windBearing(u,v) = atan2(u,v)` (ei +180, koska se on
"tulee"-suunta) — sama kaava, sama todennettu u/v-tulkinta.

### Resoluutio ja alue

- Natiivi: **n. 0,0225° (~2,5 km)**, hila 579×490 pistettä bbox:lla
  19-32 °E, 59-70 °N. Mitattu suoraan GRIB2-vastauksesta.
- Alinäytteistetty **2×2-lohkokeskiarvolla** (ks. aiempi ICON-EU-oppi:
  EI yksittäisen pisteen poiminta) → ~0,045° (~5 km), 245×290 pistetta.
- Sama alue ja resoluutio kuin pilvi-HARMONIE — yhtenäinen, jo
  testattu bbox.
- 13 aika-askelta, 1 h välein (0-12 h) — sama käytäntö kuin ICON-EU:lla.

### Pakkaus ja tiedostokoot

U ja V kvantisoitu tavuiksi (0-255) kiinteälle alueelle **[-80, 80] m/s**
(kattaa myös 300 hPa:n suihkuvirtauksen), koodattu base64-merkkijonoksi
JSON:in sisälle — paljon tiiviimpi kuin lukutaulukko. Mitattu
ALKUPERÄISELLÄ Suomi-rajauksella (19-32 °E, 59-70 °N):

| Tiedosto | Koko (alkuperäinen Suomi-rajaus) |
|---|---|
| `data/wind-surface.json` | 2 463 577 tavua (~2,35 Mt) |
| `data/wind-850.json` | 2 463 581 tavua (~2,35 Mt) |
| `data/wind-500.json` | 2 463 581 tavua (~2,35 Mt) |
| `data/wind-300.json` | 2 463 577 tavua (~2,35 Mt) |

Selain lataa **vain valitun korkeuden** tiedoston (OSA 1 -vaatimus) —
`loadWindGrid()` hakee `WIND_LEVELS[state.windLevel].gridFile`:n.

**PÄIVITYS (2026-10, haara `feature/tuulialue`): alue laajennettu —
ks. "Tuulialueen laajennus" -osio alla uusista tiedostokoista ja alueesta.**

### UI

Uusi riippumaton `#windBtn` (ei kytketty pilvimallivalitsimeen).
Päällä ollessa avautuu `#windLevelPanel`: 4 korkeusvaihtoehtoa tekstina
("850 hPa (~1,5 km)" jne.) + hiukkasanimaatio-kytkin. Valittu korkeus +
lähdeviite näkyy aina-näkyvässä yläpalkin pillerissä
(`#windLevelLabel`, esim. "Tuuli: 500 hPa (~5,5 km) · © Ilmatieteenlaitos
(CC BY 4.0)") — täyttää sekä "korkeus näkyy kartalla" että "lähdeviite"
-vaatimukset yhdellä elementillä.

### VAIHE 1:n yksinkertaiset nuolet

MapLibre GeoJSON-lähde + symbol-taso (ei oma WebGL-kerros) — nuoli-ikoni
piirretään kerran canvasilla, `icon-rotate` asetetaan hilapisteen
kompassisuunnaksi (`icon-rotation-alignment:'map'`). Harvennus: joka
6. hilapiste. Päivittyy aikajanan mukana (`renderWindArrows()` kutsutaan
samoista kohdista kuin `renderClouds()`).

## Tuulialueen laajennus (2026-10, haara `feature/tuulialue`)

**Käyttäjän havainto:** tuulianimaatio näkyi vain Suomen kohdalla.

### 1. Mikä bbox oli käytössä, ja mistä se tuli?

Rajaus **tuli haun parametrista** (`BBOX = "19,59,32,70"` -vakio
`fetch-wind.py`:ssa), EI HARMONIE-mallin omasta rajoituksesta. Tämä
bbox oli alun perin kopioitu suoraan `fetch-clouds-harmonie.py`:n
bbox:sta ("sama alue kuin pilvi-HARMONIE") OSA 1:ta tehtäessä — ei
koskaan selvitetty erikseen, onko se HARMONIEn todellinen kattavuus
vai vain silloisen pilvitehtävän rajaus.

### 2. HARMONIEn todellinen kattavuus FMI:n avoimessa datassa

Testattu LATAAMALLA GRIB2 KOKONAAN ilman bbox-rajoitusta (surface-taso,
1 h, ~29,6 Mt) ja lukemalla lat/lon-arvot suoraan:

- **Natiivi (bounding box) kattavuus: lat 49,77-75,23 °N, lon -18,12
  - 54,24 °E.** Paljon laajempi kuin Suomi-rajaus antoi ymmärtää.
- **MUTTA tämä EI ole käyttökelpoinen suorakulmio sellaisenaan.**
  HARMONIE Scandinavia -malli on tallennettu omaan (todennäköisesti
  Lambert-konforminen) projektioon, ja FMI:n `/download`-rajapinta
  reprojisoi sen regulariksi lat/lon-hilaksi `projection=EPSG:4326`
  -parametrilla. Malli-domain itse on VINO suhteessa tähän
  lat/lon-ruudukkoon → bbox-"laatikon" ULKOPUOLELLE jäävät nurkat
  täyttyvät NaN:lla. Mitattu: **~37 % koko laatikon soluista NaN,
  kaikki 4 kulmaa NaN**, keskialue (esim. koko Suomen alue) 100 % täynnä.
- Kartoitettu NaN-rajan muoto rivi riviltä (jokaisen lat-rivin
  ensimmäinen/viimeinen kelvollinen lon-sarake): kelvollinen lon-alue
  on rivikohtaisesti YHTENÄINEN (ei reikiä sisällä), mutta sen
  leveys/keskikohta siirtyy leveysasteen mukaan — tyypillinen vinon
  suorakulmion poikkileikkaus. Kapenee nopeasti pohjoisessa:
  74,64 °N: lon [-1,9; 31,9] → 75,09 °N: lon [6,8; 23,2] (vain 16,4°
  leveä enää).

### 3. Laajennus pilvitason alueeseen asti (mahdollisuuksien mukaan)

Koska natiivialueen min/max EI anna käyttökelpoista suorakulmiota,
etsittiin suurin NaN-VAPAA suorakulmio leikkaamalla pilvitason
(ECMWF) alueeseen 30 °W-60 °E, 55-75 °N:

| Lat-yläraja | Kelvollinen lon-alue (koko lat 55..yläraja) | Leveys |
|---|---|---|
| 75 °N (koko pilvitason alue) | [3,94; 26,06] | 22,1° |
| 74 °N | [-1,64; 35,69] | **37,3°** |
| 73,5-65 °N | [-1,64; 35,69] (ei muutu) | 37,3° |

75 °N:n vaatiminen kaventaisi lon-alueen lähes takaisin Suomen
kokoiseksi (pohjoisin kapea kaistale rajoittaa koko aluetta). Pudottamalla
yläraja 73,5 °N:ään lon-alue LEVENEE 37,3 asteeseen eikä kapene enää
sen alapuolella — paljon parempi kompromissi.

**Valittu lopullinen BBOX: `-1,55,35,73.5`** (lon0,lat0,lon1,lat1).
Todennettu **0 NaN-solua** koko laatikossa, molemmilla testatuilla
aika-askeleilla. Lisätty `fetch-wind.py`:hen eksplisiittinen
NaN-tarkistus heti GRIB2-parsinnan jälkeen (selkeä virheviesti, jos
HARMONIEn domain joskus muuttuu) — aiemmin tämä olisi kaatunut
sekavasti `quantize()`-funktion `NaN -> int` -muunnoksessa.

**Tiedostokoko ennen/jälkeen** (kaikki 4 korkeutta, mitattu oikeasti
ajamalla `fetch-wind.py` uudelleen jokaiselle tasolle):

| Taso | Ennen | Jälkeen | Kasvu |
|---|---|---|---|
| surface | 2 463 577 t (2,35 Mt) | 11 440 921 t (10,91 Mt) | 4,64× |
| 850 | 2 463 581 t (2,35 Mt) | 11 440 925 t (10,91 Mt) | 4,64× |
| 500 | 2 463 581 t (2,35 Mt) | 11 440 925 t (10,91 Mt) | 4,64× |
| 300 | 2 463 577 t (2,35 Mt) | 11 440 921 t (10,91 Mt) | 4,64× |
| **Yhteensä (4 tasoa, repo-koko)** | 9,4 Mt | 43,64 Mt | 4,64× |

Selain lataa edelleen vain YHDEN valitun korkeuden kerrallaan
(~10,9 Mt sen sijaan että ~2,35 Mt) — merkittävä kasvu, mutta
yhteneväinen alue pilvitason kanssa oli nimenomainen tavoite. Hila
pysyi samana (412×801 pistettä, ~0,045°/~5 km) kaikilla 4 tasolla —
sama horisontaalihila riippumatta korkeudesta, kuten odotettua.

**Koodimuutokset:** VAIN `scripts/fetch-wind.py` (BBOX-vakio + NaN-
tarkistus) ja `data/wind-*.json`-tiedostot. `index.html` EI vaatinut
muutoksia — kartan piirto (`sampleWindAt`, `wpgRandomLonLat`,
`windArrowGeoJSON`, hiukkasanimaatio) lukee alueen AINA dynaamisesti
`state.windGrid.lat0/lat1/lon0/lon1`:stä, ei mitään kovakoodattua
Suomi-rajausta — arkkitehtuuri kesti laajennuksen ilman koodimuutoksia.

**PNG-todennus** (matplotlib quiver + rantaviivat, uusi laajennettu alue):
- `surface`: näyttää Norjan rannikolla selvän pyörteen/matalapaineen
  rakenteen (~65 °N, 5 °E) — juuri tällaista virtauskuviota Windy-tyylinen
  animaatio on tarkoitettu paljastamaan. Fysikaalisesti järkevä.
- `300 hPa`: länsi-itä-suuntainen virtauskaista + nopea suihkuvirtaus
  kaakkoiskulmassa (~30 °E, 57 °N, >50 m/s) — järkevä korkean ilmakehän
  kuvio.
- Ei näkyviä NaN-artefakteja (valkoisia/vääristyneitä alueita) kummassakaan.

### 4. Jos HARMONIE ei riitä koko pilvitason alueelle: ICON-EU-täydennys?

**EI TOTEUTETTU — odottaa lupaa.** Lopputulos jättää katvealueet (jotka
JÄÄVÄT pilvitason ulkopuolelle ilman tuulidataa):
- Pohjoinen: 73,5-75 °N (napa-alue/Huippuvuoret).
- Länsi: lon < -1° (Islanti, Iso-Britannia, osa Atlanttia).
- Itä: lon > 35° (Länsi-Venäjä, osa Mustanmeren pohjoispuolta).

Vaihtoehdot näiden täydentämiseksi DWD:n ICON-EU-tuulidatalla:
- **Puolesta:** ICON-EU:n tuuliparametrit (U/V, `WindUMS`-vastaavat)
  ovat samalla `opendata.dwd.de`-rajapinnalla kuin pilvi-ICON-EU jo
  käyttää, samat lisenssiehdot (GeoNutzV, kaupallinen käyttö sallittu).
- **Vastaan / riski:** ICON-EU:n OMA pohjoisraja todettiin jo pilvi-
  ICON-EU:n yhteydessä olevan ~70,5 °N (ks. "Lähde ja painepinnat"
  -osio yllä, CLAUDE.md) — EI todennäköisesti kata edes 73,5-75 °N
  -aukkoa sen itse. Islanti/Iso-Britannia-puolella (länsireuna)
  ICON-EU:n kattavuutta EI ole vielä selvitetty tässä tehtävässä.
  Kahden eri mallin DATAN SAUMATON yhdistäminen yhdeksi hilaksi
  (reuna-alueilla eri lähde kuin keskellä) on myös selvästi
  monimutkaisempi muutos kuin pelkkä bbox-laajennus - vaatisi joko
  (a) kahden erillisen hilan lataamisen selaimeen ja sulavan rajan
  piirtämisen, tai (b) yhden yhdistetyn JSON-tiedoston rakentamisen
  fetch-vaiheessa (reuna-alueiden paikkaus toisesta lähteestä).
- **Suositukseni:** ÄLÄ toteuta vielä. Selvitä ensin ERIKSEEN ICON-EU:n
  tuulidatan todellinen kattavuus (sama NaN-analyysi kuin yllä), ja
  päätä sen jälkeen onko yhdistäminen tarpeeksi arvokas lisäys
  monimutkaisuuteen nähden. Katvealueet (napa-alue, kaukainen länsi/itä)
  ovat todennäköisesti harvoin kiinnostavia revontulien seurannan
  kannalta (Suomi/Skandinavia-keskeinen sovellus), joten nykyinen
  37,3° leveä alue saattaa jo riittää käytännössä.

## ICON-EU:n aikajana lakkasi toimimasta (2026-10, haara `feature/tuulialue`)

**Käyttäjän havainto:** ICON-EU:n aikajana ei enää toiminut (toimi aiemmin).

### 1. Toimiiko main-haarassa? Entä tässä haarassa? Onko haara ennen korjausta?

- Itse KOODIKORJAUS (WebGL `UNPACK_ALIGNMENT` + "ei 90° kiertoa" -tutkimus,
  commit `a175350`) ON tämän haaran esivanhempi (`git merge-base --is-ancestor`
  vahvistaa: kyllä, sekä `main`:lle että tälle haaralle) — haara EI ole tehty
  ennen tuota korjausta.
- **main-haarassa aikajana TOIMII juuri nyt** — `data/clouds-icon_eu.json`
  main:lla ulottuu 2026-10-12 15:00 UTC:hen asti (tuoretta, bot paivittaa
  ~3-6 h valein).
- **Tällä haaralla aikajana EI toiminut** — syy EI ollut koodi vaan
  **vanhentunut paikallinen datatiedosto**: tämä haara on haarautettu/
  tarkistettu ulos main:sta jossain aiemmassa vaiheessa eika se saa
  main:n automaattisia data-bot-committeja jälkikäteen. Tiedoston
  viimeinen aika-askel (06:00 UTC) oli jo MENNEISYYDESSÄ nykyhetkeen
  (~07:15 UTC) nähden.

### 2. Onko tuulitaso muuttanut yhteistä aikajanalogiikkaa?

**Ei.** Koodikatselmointi vahvisti: `timeFloatInArray(ts, date)` on puhdas,
käyttäytymistä säilyttävä yleistys `cloudTimeFloat`:sta, ja aikajana-
liu'un (`#timeSlider`) ylaraja asetetaan YKSINOMAAN `applyStaticGrid()`:ssa
AKTIIVISEN PILVIMALLIN omasta `times`-taulukosta — ei viittausta
`state.windGrid`:iin missaan tassa laskussa. Tuulen oma aikanaytteistys
(`sampleWindAt`) on taysin erillinen eika vaadi paallekkaisuutta pilven
kanssa. **Tuulitason lisays ei siis ole syy.**

### 3. Montako aika-askelta, ovatko tulevaisuudessa, milloin viimeksi ajettu?

- Tällä haaralla (ENNEN korjausta): 13 aika-askelta, 2026-10-11 18:00 -
  2026-10-12 06:00 UTC — **viimeinen askel jo ~1 h 15 min menneisyydessä**
  nykyhetkeen nähden → `maxH` laskeutui nollaan → `#timeSlider.max = 0`
  → liukusäädin täysin jaatynyt (vain yksi mahdollinen arvo).
- GitHubissa (origin/main, tarkistettu `git fetch` + `git log`):
  **viimeisin VARMISTETTU onnistunut ICON-EU-ajo on commit `04a93ed`,
  "Pilvidata ICON-EU 2026-10-12 05:49 UTC".** En pysty tarkistamaan
  GitHub Actionsin ajolokia suoraan tassa ymparistossa (ei `gh`-CLI:ta/
  tunnuksia) — vain committien aikaleimat ovat nakyvissa. `pilvidata-
  icon_eu.yml`:n cron (`10 3,6,9,12,15,18,21,0 * * *`) olisi pitänyt
  laukaista myos 06:10 UTC:n ajo, mutta sille EI nay uutta committia
  tarkistushetkella (~07:15 UTC) — joko ajo on viivastynyt (GitHub
  Actionsin ilmainen taso ajoittaa cronit joskus myohassa), epaonnistui,
  tai ei vielä valmistunut. **Suosittelen tarkistamaan Actions-valilehdelta
  suoraan** jos tama kiinnostaa - en voi vahvistaa sita tasta.

### Korjaus

**A) Datan paivitys (valitön syy tälle haaralle):** ajettiin
`scripts/fetch-clouds-icon_eu.py` uudelleen (EI muutettu, vain ajettu) -
haki tuoreen DWD-ajon (03:00 UTC, koska 06:00-ajo ei ollut vielä
saatavilla DWD:llä haun hetkella), uusi data 2026-10-12 03:00-15:00 UTC,
nyt reilusti tulevaisuudessa.

**B) Oikea koodibugi (riippumaton datan tuoreudesta, löytyi koodi-
katselmoinnilla kun jäljitettiin miksi liukusäädin "jumittaa"):**
`applyStaticGrid()` asetti `#timeSlider.max`:n AINA kun malli vaihtuu,
mutta EI KOSKAAN synkronoinut `state.hour`-JS-muuttujaa eika liu'un
`.value`-ominaisuutta tahan. Jos edellisen mallin `state.hour` oli
suurempi kuin uuden mallin `maxH` (esim. ECMWF:lla `state.hour=5`,
vaihto ICON-EU:hun jonka `maxH` oli tilapaisesti 0 — mutta sama voisi
tapahtua tuoreellakin datalla, esim. ECMWF `maxH=10` -> HARMONIE
`maxH=3`), selain rajaa liu'un NAKYVAN `.value`:n automaattisesti
uuteen `.max`:iin, mutta `state.hour` jai VANHAAN (liian suureen)
lukuun — aikaleima/offset-teksti ja liukusaatimen osoitin nayttivat
siis RISTIRIITAISTA tietoa toisiinsa nahden. Korjattu: `applyStaticGrid()`
synkronoi nyt `state.hour`:n liu'un uuteen `.max`:iin (jos tarpeen) JA
asettaa liu'un `.value`:n vastaamaan `state.hour`:a — molemmat aina
samassa tilassa, riippumatta siita missa jarjestyksessa tai kuinka monta
kertaa malleja vaihdetaan.

**Tuulen "lahimman saatavilla olevan ajanhetken" -vaatimus:** koodi-
katselmoitu ja vahvistettu laskennallisesti - jo ENNESTAAN oikein.
`timeFloatInArray` palauttaa rajatapauksissa `ts.length-1.0001` (ei
koskaan tasan `ts.length-1` eika yli), mika aikajana+blend-laskussa
(`t0i=floor(tf)`, `ta=tf-t0i`) painottaa lopputuloksen ~99,99 %
viimeiseen saatavilla olevaan aika-askeleeseen asti - eli nain lahelle
"nayttaa viimeisimman/lahimman saatavilla olevan ajanhetken" kuin
sulavan blendin kanssa on jarkevaa. Ei vaatinut koodimuutosta.

**Mitä testattiin:** datan tuoreus ja slider-max-laskenta TARKISTETTU
oikeilla python-simulaatioilla (aikaleimat luettu suoraan JSON-
tiedostoista, laskettu `maxH` kasin samalla kaavalla kuin index.html).
State/slider-desync-korjaus on koodikatselmoitu ja loogisesti
suoraviivainen, mutta EI testattu oikeassa selaimessa (ei
selainautomaatiota tassa ymparistossa).

## "Pilvitaso ei näytä muuttuvan mallia vaihdettaessa" - diagnoosi (2026-10, haara `feature/ennustehorisontti`)

Käyttäjän raportti edellisen ennustehorisontti-tyon jalkeen: ECMWF/
ICON-EU-mallinvaihto ei vaikuttanut pilvitasoon. Kavin lapi 4 epailtya
syyta pyydetyssa jarjestyksessa:

### 1. DATA: ovatko tiedostot aidosti eri dataa?

**KYLLA, todennettu.** Python-simulaatio joka toistaa index.html:n
tarkan bilineaarinen+smoothstep+aika-blend-kaavan oikealla datalla
samalle kohdeajalle (2026-10-12 09:00 UTC, tasmalleen sama hetki
molemmissa - ECMWF step7, ICON-EU step6):

| Piste | ECMWF | ICON-EU | Ero |
|---|---|---|---|
| Oulu | 31,6 % | 2,1 % | 29,5 pp |
| Rovaniemi | 53,2 % | 14,3 % | 39,0 pp |
| Helsinki | 100,0 % | 100,0 % | 0,0 pp (molemmat taysin pilvessa - uskottava yhteensattuma) |

PNG-renderöinti molemmista SAMALTA hetkeltä (ks. `muistio-liitteet/`
ei viela kopioitu, kuvat scratchpadissa tallaisen istunnon ajan)
näyttää SELVÄSTI eri pilvikuvion - ECMWF:n kirkas kaista Oulu/
Rovaniemi-alueella on leveämpi ja hieman eri paikassa kuin ICON-EU:n.
**Data ei ole bugin syy.**

### 2. LATAUS: haetaanko oikea tiedosto, onko mallin nimi avaimessa?

Koodikatselmointi: `loadCloudGrid()` hakee `model.metaFile`/`model.gridFile`
- nama ovat ERI merkkijonoja per malli jo TIEDOSTONIMEN tasolla
(`data/clouds-ecmwf.json` vs. `data/clouds-icon_eu-meta.json`), joten
mallin "avain" on aina mukana itse URL:ssa, ei pelkassa aikaleima-
parametrissa (`?v=...`, joka vaihtuu 10 min valein JOKAISELLE mallille
erikseen, ei sekoita malleja keskenaan). `fetchJSON()` on pelkka
`fetch()`-kaarin, EI omaa valimuistikerrosta. **Ei loydetty bugia.**
Lisätty VÄLIAIKAINEN `console.log('[mallinvaihto-debug] ...')` -lokitus
`loadCloudGrid()`:iin (malli+URL+hila-metatiedot), `ensureCloudStepLoaded()`:
iin (malli+idx+URL seka haulle etta vastaukselle) - kayttaja voi nama
nahda selaimen konsolissa ja liittaa tahan jos ongelma jatkuu, nama
rivit on merkitty poistettavaksi kun ongelma on vahvistetusti ratkaistu.

### 3. PIIRTO: päivittyykö tekstuuri, piirtyykö taso uudelleen?

Koodikatselmointi + kasin jaljitetty tilasimulaatio `cloudWebGLLayer.
render()`:n `CWG.lastT0/lastT1/lastNlat`-tilakoneesta: ECMWF (nlat=81)
ja ICON-EU (nlat=63) ovat ERI KOKOISIA hiloja, joten `nlatChanged`
(`CWG.lastNlat !== g.nlat`) on AINA tosi mallinvaihdon jalkeen - tama
PAKOTTAA molempien tekstuurien uudelleenlatauksen riippumatta siita
sattuuko aika-askeleen indeksi olemaan sama. `renderClouds()` kutsuu
`map.triggerRepaint()`:ia AINA (ei ehdollisesti) WebGL-polulla. Lisätty
VÄLIAIKAINEN loki tekstuurin uudelleenlatauksen kohdalle (laukeaa vain
kun nlat muuttuu, ei joka ruudulla - ei tulvi konsolia). **Ei loydetty
bugia koodikatselmoinnilla+simulaatiolla - mutta tata EI nahty
suorituksessa oikeassa selaimessa, ks. "Mita testattiin" alla.**

### 4. SERVICE WORKER: tarjoaako PWA:n valimuisti vanhaa tiedostoa?

**Osittain KYLLA - LOYTYI TODELLINEN BUGI, mutta ei datalle vaan koko
sovelluskuorelle.** `sw.js`:n `fetch`-kasittelija jattaa `/data/`-polun
AINA tietoisesti ohi omasta valimuististaan (`if (url.pathname.includes
('/data/')) return;`) - pilvidata EI siis koskaan ole SW:n vanhentuneen
valimuistin syyta sellaisenaan.

**MUTTA:** `index.html`:n `APP_VERSION`-vakio ('v1.44') ja `sw.js`:n
`CACHE`-vakio ('revontulivahti-v44') EIVAT OLE MUUTTUNEET kertaakaan
tämän koko istunnon aikana (monta isoa index.html-muutoskierrosta:
tuulianimaatio, tuulialue, ennustehorisontti) - vaikka index.html:n
kommentti itse sanoo "päivitä joka julkaisun yhteydessä". Selaimen
Service Worker -päivitysmekanismi (`reg.update()`) vertaa `sw.js`:n
TAVUJA havaitakseen uuden version - koska `sw.js` ei ole muuttunut,
selain EI KOSKAAN havaitse etta sovellus on päivittynyt, eika
"päivitys saatavilla" -ilmoitus (`#updatePill`) koskaan näy. Sovellus-
kuori (`index.html` itse SHELL-listalla, cache-first-strategia) jaa
siis JUMIIN vanhaan, SW:n ensimmäisellä käynnillä tallentamaansa
versioon - KAIKKI tämän istunnon JS-muutokset (mukaan lukien koko
mallinvalitsin/aikajana-logiikka) olisivat olleet NÄKYMÄTTÖMIÄ
selaimelle joka oli aiemmin käynyt sovelluksessa HTTPS:n yli, KUNNES
käyttäjä olisi manuaalisesti tyhjentänyt selaimen välimuistin/SW:n.

**HUOM rajaus:** tämä vaikuttaa VAIN HTTPS:n yli (SW rekisteröityy
vain kun `location.protocol==='https:'`) - paikallinen testaus
`file://`- tai `http://localhost`-protokollalla EI rekisteröi SW:tä
lainkaan, joten jos käyttäjä testasi NIMENOMAAN paikallisesti eika
julkaistua GitHub Pages -versiota vasten, tämä EI selitä havaittua
oiretta sellaisenaan - mutta on silti todellinen, korjattava bugi joka
olisi iskenyt heti kun haara joskus julkaistaan.

**KORJAUS:** `APP_VERSION` 'v1.44'->'v1.45', `sw.js`:n `CACHE`
'revontulivahti-v44'->'revontulivahti-v45', molemmat samalla kertaa
(pidettava synkronissa - lisätty muistutus kommenttiin). Tämä pakottaa
selaimen havaitsemaan uuden SW:n, näyttämään päivitysilmoituksen, ja
lataamaan tuoreen sovelluskuoren hyväksynnän jälkeen.

### Mitä testattiin MISSÄ

**Oikeasti ajettu/todennettu:**
- PNG-renderöinti + pistevertailu molemmista pilvimalleista samalta
  hetkeltä (Python, oikea data levyltä).
- `sw.js`:n ja `index.html`:n versionumerot luettu suoraan tiedostoista,
  vahvistettu etta ne OVAT olleet muuttumattomia koko istunnon ajan
  (git-historian commit-viestit eivat mainitse versionpaivitysta
  kertaakaan, tiedoston sisalto tarkistettu suoraan).

**Koodikatselmoitu + kasin jaljitetty simulaatio, EI nahty selaimessa:**
- Koko mallinvaihto-polku (`switchCloudModel` -> `loadCloudGrid` ->
  `applyStaticGridFull`/`applyStaticGridMeta` -> `renderClouds` ->
  `cloudWebGLLayer.render`) - looginen jaljitys + `nlatChanged`-
  tilakoneen kasinlaskettu simulaatio ECMWF<->ICON-EU-vaihdolle
  (81x361 vs 63x345, aina eri -> aina pakotettu uudelleenlataus),
  mutta EI nahty oikean selaimen DevTools-konsolissa/Networkissa.
- Service Workerin TODELLINEN selainkaytos (cache-first-strategian
  tarkka ajoitus, "milloin uusi SW otetaan kayttoon") - perustuu
  standardiin, dokumentoituun SW-spesifikaation kayttaytymiseen, ei
  omaan mittaukseen tassa ymparistossa (ei selainta).

**EI pystytty sulkemaan pois:** jokin VIELA TOISTAISEKSI havaitsematon
bugi, jos käyttäjä edelleen näkee saman oireen TÄMÄN SW-korjauksen JA
pakotetun uudelleenlatauksen (Ctrl+Shift+R / "tyhjennä sivuston data")
jälkeen. **Jos oire jatkuu:** avaa DevTools-konsoli, vaihda mallia, ja
etsi `[mallinvaihto-debug]`-alkuiset rivit - ne kertovat suoraan
haettiinko oikea tiedosto, saapuiko data, ja paivittyiko tekstuuri.
Liitä nama rivit seuraavaan viestiin niin jatketaan siita.

## Ennustehorisontin pidennys 12h->30h + laiska lataus (2026-10, haara `feature/ennustehorisontti`)

**Taustasyy:** edellisen kysymyksen vastauksena selvisi etta HARMONIEn/
ICON-EU:n 12h kokonaishorisontti + 3-6h hakuvali johtaa siihen etta
aikajanan nayttama "jaljella oleva tulevaisuus" kutistuu systemaattisesti
lahelle nollaa juuri ennen jokaista paivitysta. Tama tehtava pidentaa
horisonttia niin etta kutistuma ei enaa ulotu nayttokaton alle.

### 1. Todellinen horisontti per malli - TARKISTETTU, ei oletettu

- **ICON-EU (DWD):** hakemistolistaus (`opendata.dwd.de/.../icon-eu/grib/00/clct/`)
  paljasti TUNNEITTAISIA askeleita 0-78 h asti, vasta sen jalkeen 3h
  valein 120 h:hen. 30 h on siis reilusti tuntitiheyden sisalla - ei
  tarvinnut harventaa.
- **HARMONIE (FMI):** testihaku 60 h:n ikkunalla palautti 61 tasavalista
  tunnin askelta ilman aukkoja (ei virhetta, ei typistysta) - todistaa
  etta natiivi horisontti on VAHINTAAN 60 h, luultavasti enemman.
  Aiempi 12h-rajoitus OSA 1:ssa oli siis mielivaltainen varovaisuusvalinta,
  ei todellinen rajapintarajoitus.
- **Valittu: 31 tunnin askelta (0-30 h) molemmille.** 30 h = 24 h
  nayttokatto + 6 h turvamarginaali (ks. kohta 2) - kattaa HARMONIEn
  pahimman tapauksen (3h hakuvali, ks. kohta 3) reilusti.
- ECMWF: ei muutettu ("jo 48h, ok" - tehtavanannon oma toteamus).

### 2. Nayttokatto 10h -> 24h

`#timeSlider`:n `max`-attribuutti (HTML-oletus + JS-laskettu, ks.
`applyTimelineBounds()`) nostettu `Math.min(maxH,10)` ->
`Math.min(maxH,24)`. Koska data ulottuu nyt 30 h:n paahan, `maxH` pysyy
kaytannossa aina 24:n ylapuolella (paitsi juuri ennen seuraavaa hakua -
ks. alla).

### 3. GitHub Actions -ajoitus julkaisuaikataulun mukaan

**ICON-EU: TARKASTI mitattu.** Hakemistolistauksen aikaleimoista
viidelle eri ajolle (00, 03, 06, 18, 21 UTC eri vuorokausina):
julkaisuviive oli johdonmukaisesti **2 h 39-44 min** ajon jalkeen
(step000-CLCT valmis; step048 n. 11 min myohemmin). Vanha ajoitus
(`:10` minuutin kohdalla, heti 3h-rajan jalkeen) osui AINA liian
aikaisin - `pick_latest_run()` ei loytanyt viela julkaisematonta
uusinta ajoa (10 min < 164 min viive) ja palautui systemaattisesti
EDELLISEEN (3h vanhempaan) ajoon. Uusi ajoitus `:55` (2h 55 min rajan
jalkeen) osuu aina juuri julkaistun ajon jalkeen.

**Rehellinen huomio vaikutuksen suuruudesta:** koska julkaisuviive
(164 min) on lahella 3h hakuvalia, todellinen parannus pahimmassa
tapauksessa (juuri ennen seuraavaa hakua) on vain ~20 min (370 min ->
350 min palvellun datan ika) - EI kokonaista hakusykliä kuten
ensivaikutelma antaisi olettaa. Suurin hyoty aikajanan toimivuudelle
tulee horisontin PIDENNYKSESTA (kohta 1), ei ajoituksen hienosaadosta.
Ajoitus silti korjattu koska se on periaatteellisesti oikein ja
ilmainen (pelkka cron-merkkijonon muutos).

**HARMONIE: EI pystytty mittaamaan yhta tarkasti.** FMI:n
`/download`-rajapinnassa ei ole `origintime`-parametria eika julkista
ajohakemistolistausta DWD:n tapaan (todennettu `DescribeStoredQueries`-
vastauksesta: ainoat parametrit `starttime/endtime/bbox/parameters/
format`) - ajon tarkkaa julkaisuhetkea ei voinut pinnata tai mitata
ilman usean tunnin reaaliaikaista seurantaa (ei mahdollista tassa
istunnossa). Yksi havainto: klo 07:33 UTC kyselyssa palautunut ajo oli
peraisin klo 03:00 UTC:sta (4h33min vanha, ei merkkeja ongelmista).
**Paatos: arvailun sijaan nostettiin hakutiheys 6h->3h.** Rajapinta
palauttaa AINA automaattisesti senhetkisen tuoreimman ajon, joten
useampi kysymys pienentaa pahimman tapauksen ikaa riippumatta siita
mika todellinen julkaisusykli on - ei vaadi ajon ajoituksen tuntemista.

### 4. Tiedostokoko: laiska per-askel-lataus ("ei koko tiedostoa kerralla")

Pelkka horisontin pidennys (13->31 askelta) olisi yksinaan nelin-
kertaistanut yhdella kertaa ladattavan tiedoston:

| Malli | Askeleet ennen | Koko ennen (1 tdsto) | Askeleet jalkeen | Koko jalkeen (yhteensa) |
|---|---|---|---|---|
| ICON-EU | 13 | 4 411 707 t (4,21 Mt) | 31 | 10 581 225 t (10,09 Mt) |
| HARMONIE | 13 | 3 875 753 t (3,70 Mt) | 31 | 8 738 386 t (8,33 Mt) |

**Mutta selain EI enaa lataa koko tiedostoa kerralla.** Data jaettiin:
- `data/clouds-<malli>-meta.json` (hila + aika-akseli, EI arvoja; ~0,7 KB) -
  ladataan AINA heti.
- `data/clouds-<malli>-step<NN>.json` (00-30, yksi per aika-askel; ICON-EU
  ~335 KB/askel, HARMONIE ~280 KB/askel) - ladataan VASTA KUN tarvitaan
  (`ensureCloudStepLoaded()`), 1-2 askelta kerrallaan (nykyinen + seuraava
  blend-interpolointia varten).

**Kaytannon lataus yhdelle katselukerralle ("nyt"):** ennen muutosta AINA
koko 4,2-3,7 Mt riippumatta katsotusta hetkesta; nyt ~0,7 KB (meta) +
~2 × 280-335 KB (2 askelta) = **~0,6-0,7 Mt** - noin **6× pienempi**
TYYPILLINEN latausmaara, vaikka KOKONAISTIEDOSTOKOKO (levylla/repossa)
kasvoi ~2,3-2,4×. Aikajanaa selatessa lisaaskeleita ladataan sita mukaa
kun niita tarvitaan (jokainen ladataan vain KERRAN, valimuistiin jaa
Mapiin istunnon ajaksi).

**Arkkitehtuuri:** `state.cloudGrid.steps` on Map<indeksi,{vals,valsLow,
valsMid,valsHigh}> KAIKILLE malleille (myos ECMWF:lle, jonka 48h-tiedosto
jaetaan heti kokonaan valmiiksi tahan samaan Map-rakenteeseen latauksen
yhteydessa - ei lisaverkkokutsuja koskaan ECMWF:lle, mutta YHTEINEN
piirto-/naytteistyskoodi kaikille kolmelle mallille). `resolveStep(g,idx)`
palauttaa lahimman JO LADATUN askeleen jos tarkkaa ei viela ole (ei
tyhjaa/mustaa ruutua latauksen ajaksi); `ensureCloudStepLoaded(g,idx)`
kaynnistaa tausta-haun ja piirtaa uudelleen kun data saapuu (VAIN jos
`state.cloudGrid` on edelleen sama olio - jos kayttaja ehti vaihtaa
mallia kesken haun, vanha olio jaa vaarattomasti orvoksi).

### 5. Rajauksia / ei koskettu

- **Tuuli (WIND_LEVELS/fetch-wind.py) EI ollut osa tata tehtavaa** -
  tehtavananto puhui nimenomaan pilvien aikajanasta/malleista. Tuulen
  oma horisontti (12h) ja HARMONIE-hakutiheys (6h) ovat EDELLEEN samat
  kuin ennen - sama kutistumisilmio voi siis periaatteessa koskea
  tuultakin, mutta sille ei ole aikajanaa/nayttokattoa samalla tavalla
  (tuuli naytetaan aina lahimmalla saatavilla olevalla ajanhetkella,
  ks. edellinen muistion osio). Jos tama halutaan yhdenmukaistaa, se on
  oma erillinen tehtavansa.
- `renderCloudsCanvas()` (ei-WebGL-varapolku, saavuttamaton kun
  `USE_WEBGL_CLOUDS=true`) paivitettiin kayttamaan `resolveStep`:ia
  mutta EI testattu edes simulaatiolla (ei koskaan suorituksessa).
- Vanha `localStorage`-valimuisti (`saveCloudCache`/`loadCloudCache`,
  `rv-cloudgrid-v3`) on esiintyvaa, jo ENNEN tata tehtavaa kaytannossa
  kuollutta koodia (`saveCloudCache` ei ole yhdenkaan kutsupaikan
  kutsuma, joten `localStorage`-avain ei koskaan taytyisi oikeasti) -
  ei koskettu, ei liity tahan tehtavaan.

### Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeilla rajapintakutsuilla/ajoilla testattu:**
- DWD:n ICON-EU-hakemistolistaus (tuntiaskelten maara, 5 ajon
  julkaisuviive) - oikeita HTTP-kutsuja, ei oletuksia.
- FMI:n HARMONIE-rajapinnan 60h-testihaku (todistaa todellisen
  horisontin) ja `DescribeStoredQueries`-vastaus (todistaa ettei
  `origintime`-parametria ole).
- `scripts/fetch-clouds-icon_eu.py` ja `fetch-clouds-harmonie.py` AJETTU
  KOKONAAN UUDELLEEN oikealla datalla (ei vain koodikatselmoitu) - 31
  askelta kumpikin, tiedostokoot mitattu oikeista levylla olevista
  tiedostoista, ei arvioitu.
- Python-simulaatio joka toistaa index.html:n `sampleCloudGridField`-
  kaavan TASMALLEEN (bilineaarinen+smoothstep, aika-blend) oikeilla
  luoduilla step-tiedostoilla Helsingin pisteessa - arvot jarkevassa
  0-100%-alueessa, kasvaa/vahenee johdonmukaisesti ajan myota.

**EI testattu missaan, vain koodikatselmoitu (suurin riskialue):**
- Koko selainpuolen laiskalataus KAYTANNOSSA: `ensureCloudStepLoaded`:n
  async fetch + `renderClouds()`-uudelleenpiirto kun data saapuu,
  `resolveStep`:n paikkaajalogiikka latauksen aikana, mallinvaihdon
  "orpo-olio"-turvamekanismi (`state.cloudGrid === g`). Logiikka on
  suoraviivainen ja seuraa samaa periaatetta kuin jo toimivaksi todettu
  tuulihila, mutta EI nahty oikeassa selaimessa (ei selainautomaatiota
  tassa ymparistossa).
- `cloudWebGLLayer.render()`:n paivitetty resolveStep-integraatio WebGL-
  tasolla (tekstuurien lataus oikeilla step-olioilla pelkan indeksin
  sijaan) - koodikatselmoitu huolella, mutta ei nahty piirtyvan.

**Suositus ennen main-haaraan yhdistamista:** avaa haara paikallisesti,
testaa KAIKKI 3 pilvimallia (erityisesti ICON-EU/HARMONIE, uusi
laiskalatauspolku), vieritä aikajanaa koko 24h matkalta ja varmista etta
pilvitaso paivittyy oikein ilman virheita konsolissa, ja etta mallin-
vaihto toimii molempiin suuntiin useita kertoja peräkkäin.

## OSA 2: Hiukkasanimaatio

### Toteutusvalinta: CPU-advektio, ei täysi GPU-ping-pong-simulaatio

Hiukkasten LIIKE lasketaan JavaScriptissa (`wpgStep()`, käyttää samaa
`sampleWindAt()`-funktiota kuin OSA 1:n nuolet ja klikkausmerkki).
**Tietoinen valinta:** täysi GPGPU-advektio (hiukkaspositiot GPU-
tekstuurissa, päivitys fragment-shaiderilla) olisi nopeampi suurilla
hiukkasmäärillä, mutta huomattavasti herkempi hienovaraisille WebGL-
virheille joita en pysty näkemään/debuggaamaan tässä ympäristössä (ei
selainautomaatiota). Muutaman tuhannen hiukkasen CPU-silmukka on
riittävän nopea ja paljon varmempi saada oikein ensi yrittämällä.
"Tuhansia hiukkasia" -vaatimus täyttyy silti (nykyiset rajat 1200-7000,
ks. "OSA 2 päivitys" alla — näytön koon/zoomin mukaan).

Haipyvä jälki ON GPU:lla, vakiotekniikalla: kaksi ruudunkokoista
ping-pong-tekstuuria/FBO:ta. Joka kehyksellä: (A) edellinen tekstuuri
piirretään uuteen, alpha × aikaperustainen fade-kerroin (ks. alla),
(B) uudet hiukkasJANAT päälle additiivisesti (premultiplied alpha,
sama konventio kuin pilvitasolla), (C) tulos komposiitoidaan kartan
pääruudulle.

### Fysiikkasimulaatio: todennettu Pythonilla (ei vain luettu koodia)

Alkuperäinen (ennen Windy-tyylistä päivitystä) simulaatio: `wpgStep`:n
silloinen kaava Pythonilla oikealla tuulidatalla (5 hiukkasta, 200
kehystä): ei NaN-arvoja, ei äkillisiä hyppyjä, mutta nopeus oli
TIETOISESTI EI-fysikaalinen suurennuskerroin (`VISUAL_SCALE=400`,
koska todellinen 10 m/s tuuli siirtäisi hiukkasta vain ~0,00009°/s —
näkymättömän hidas kartalla) — sama periaate kuin Windy.comin omassa
animaatiossa. Tämä lähestymistapa korvattiin myöhemmin pikselinopeus-
pohjaisella kaavalla (ks. "OSA 2 päivitys: Windy-tyylinen parannus"
alla), joka poistaa zoomriippuvuuden kokonaan.

### Suorituskyky ja näkyvyys

- Hiukkasmäärä (päivitetty kaava, ks. "OSA 2 päivitys" alla):
  `clamp((canvas.width*canvas.height/1e6)*DENSITY_PER_MEGAPIXEL/zoomFactor,
  MIN_COUNT, MAX_COUNT)`, missä `zoomFactor = clamp(zoom/5, 1, 2.5)` —
  pienenee lähempänä zoomattaessa (OSA 2 -vaatimus "mukautuu ruudun
  kokoon JA zoomaukseen"). Uudelleenlasketaan `resize`- ja
  `zoomend`-tapahtumissa.
- `document.hidden`-tarkistus `render()`-funktion ALUSSA (ennen mitään
  piirtoa) — koska `render()` lopettaa itse-ylläpitävän silmukkansa
  (ei kutsu `map.triggerRepaint()`) kun se palaa aikaisin, animaatio
  pysähtyy AUTOMAATTISESTI kun sivu piilossa TAI tuuli/hiukkaset pois
  päältä — ei tarvita erillistä pause-lippua.
- Erillinen "Hiukkasanimaatio"-kytkin (`#particlesToggle`), oletus päällä
  kun tuuli päällä. Pois päältä → OSA 1:n nuolet näkyvät sen sijaan
  (`refreshWindLayer()`/`renderWindArrows()` käsittelevät näkyvyyden
  ristiin niin ettei kumpikaan jää turhaan piiloon/päällekkäin).
- **Kartan liike/zoomaus ei jätä haamujälkiä:** `map.on('movestart'/
  'zoomstart', ...)` tyhjentää MOLEMMAT ping-pong-tekstuurit
  (`wpgClearTrails`) heti liikkeen alkaessa — vanhan näkymän jälki ei
  jää näkyviin uuden näkymän päälle. Resize luo tekstuurit uudelleen
  oikeassa koossa (myös tyhjänä).
- Pilvi-/OVATION-tasot EIVÄT PEITY: `wind-particles`/`wind-arrows` ovat
  AINA kerrosjärjestyksen POHJALLA (`reorderAllLayers()`), suoraan
  taustakartan päällä, pilvien ja revontulikentän ALLA.
- WebGL-opit (CLAUDE.md) sovellettu: `UNPACK_ALIGNMENT=1` asetettu
  (vaikka RGBA8-tekstuurit eivät itse asiassa kärsi tästä bugista —
  4 tavua/pikseli on aina 4:lla jaollinen — asetettu silti
  puolustavasti/johdonmukaisesti). Pisteet korvattu janoilla, joten
  `gl.getParameter(ALIASED_LINE_WIDTH_RANGE)` luetaan ja viivanleveys
  rajataan siihen `gl.lineWidth()`-kutsussa JUURI ENNEN piirtoa (osa
  ajureista rajoittaa viivanleveyden 1 px:ään — en voi testata tätä
  itse, ks. "OSA 2 päivitys" alla).

## OSA 2 päivitys: Windy-tyylinen parannus (virtausviivat, 2026-10)

**Lähtötilanne (käyttäjän raportti):** "Animaatio toimii, mutta hiukkaset
näkyvät pieninä pisteinä, jotka liikkuvat vain lyhyen matkan. Tuulen
virtausta ei hahmota."

### Juurisyyt (2 kpl, molemmat korjattu)

1. **Nopeus oli zoomiriippuvainen.** Vanha kaava siirsi hiukkasia
   maantieteellisinä ASTEINA (`u/mPerDegLon * dt * VISUAL_SCALE`).
   Kaukana zoomattuna sama astemäärä näkyy vain muutamana pikselinä —
   tästä "liikkuu vain lyhyen matkan". **Korjaus:** nopeus lasketaan
   nyt NÄYTTÖPIKSELEINÄ sekunnissa (`BASE_SPEED_PX + SPEED_PX_PER_MS *
   tuulennopeus`, katettuna `MAX_SPEED_PX`:llä) ja muunnetaan vasta
   SEN JÄLKEEN maantieteelliseksi siirtymäksi Web Mercator -kaavalla
   `metersPerPixel = 78271.5170 * cos(lat) / 2^zoom` TÄLLÄ zoomilla —
   jolloin pikselinopeus pysyy vakiona zoomauksesta riippumatta.
   - **Tärkeä yksityiskohta:** vakio on **78271,5170** (= maapallon
     ympärysmitta / **512**), EI yleisemmin lainattu 156543,03392
     (= ympärysmitta / 256). MapLibre GL määrittelee zoomin 512 px:n
     laatoilla (`transform.tileSize = 512`), joten 256-pohjainen
     vakio olisi antanut tarkalleen 2× liian HIDASTA näyttönopeutta.
     **Tämä löytyi juuri Python-simulaation ansiosta** — ensimmäinen
     yritys käytti virheellisesti 156543,03392:ta, ja simulaatio
     paljasti tarkan 2× poikkeaman tavoitearvosta välittömästi
     (ks. "Fysiikkasimulaatio" alla).
2. **Piirrettiin pyöreitä `gl.POINTS`-pisteitä.** Korjaus: joka
   hiukkanen muistaa edellisen sijaintinsa (`prevLon/prevLat`) ja
   piirretään `gl.LINES`-janana edellisestä nykyiseen sijaintiin →
   syntyy lyhyitä "streak"-viivoja jokaisella kehyksellä, ei irrallisia
   pisteitä. Yhdistettynä olemassa olevaan GPU-haipymiseen (ping-pong-
   FBO) tämä luo yhtenäisen, pidemmän virtausviivan vaikutelman.

### Muut muutokset

- **Elinikä sekunteina, ei kehyksinä:** `ageSec`/`lifetimeSec`,
  satunnainen `MIN_LIFETIME_S..MAX_LIFETIME_S` (2,0–5,0 s) per
  hiukkanen. Uudelleensynnyssä `prevLon/prevLat` asetetaan UUTEEN
  sijaintiin (ei vanhaan) — estää harha-janan koko kartan yli.
- **Haipyminen ajassa, ei kehyksissä:** `fade = fadePerSecond^dt`,
  missä `fadePerSecond = 0,05^(1/TRAIL_SECONDS)` (jälki ~5 % jäljellä
  `TRAIL_SECONDS`:n [1,4 s] kuluttua). Riippumaton ruudunpäivitys-
  nopeudesta (fps).
- **Tiheys nostettu:** `DENSITY_PER_MEGAPIXEL` 900 (laskennallinen
  vastine vanhalle `area/3500`:lle olisi ~286/megapikseli) — siis
  noin 3× tiheämpi, `MIN_COUNT`/`MAX_COUNT` nostettu 500–4500:sta
  1200–7000:aan. Edelleen `zoomFactor`-mukautus näytön kokoon/zoomiin.
- **Värin/peittävyyden sijaan opasiteetti vaihtelee:** lanka on AINA
  valkoinen, `OPACITY_BASE` (0,30) → `OPACITY_MAX` (0,70) tuulen
  voimakkuuden mukaan (`SPEED_COLOR_REF_MS`=18 m/s = täysi kirkkaus).
  Ei enää sinertävä→keltainen-liukuvärjäystä — pyydetty "valkoinen,
  läpikuultava, voimakkaampi tuuli hieman kirkkaampana".
- **Viivanleveys:** `gl.lineWidth()` asetetaan JUURI ENNEN piirtoa
  (sama opittu sudenkuoppa kuin `UNPACK_ALIGNMENT`:ssa — MapLibren
  muu piirto voi nollata GL-tilan välissä), rajattuna ajurin
  `ALIASED_LINE_WIDTH_RANGE`:een. **HUOM:** useimmat WebGL1-ajurit
  (etenkin Direct3D/ANGLE-pohjaiset, eli valtaosa Windows-Chromesta)
  tukevat käytännössä VAIN 1 px:n leveyttä riippumatta `lineWidth()`-
  arvosta — tavoiteltu 1,3 px saattaa siis näkyä 1 px:nä. Tätä ei voi
  todentaa tässä ympäristössä; jos käyttäjä haluaa aidosti paksumman
  linjan, se vaatisi kolmioiden piirtämistä janan ympärille (ei
  toteutettu, jätetty yksinkertaiseksi kunnes tarvetta osoitettu).

### Kaikki säädettävät arvot (koottu `WIND_PARTICLE`-olioon, index.html)

**PÄIVITETTY 2026-10 ("enemmän Windyn kaltaiseksi" -pyyntö) — taulukko
näyttää UUDET arvot, suluissa edelliset:**

| Muuttuja | Arvo (oli) | Merkitys |
|---|---|---|
| `TRAIL_SECONDS` | 0,8 s (1,4 s) | jäljen näkyvyysaika - lyhyempi |
| `MIN_LIFETIME_S` / `MAX_LIFETIME_S` | 0,8 / 1,2 s (2,0 / 5,0 s) | hiukkasen elinikä - n. 1 s pyydetty |
| `BASE_SPEED_PX` | 8 px/s (18 px/s) | nopeus tyynessä säällä - puolitettu+ |
| `SPEED_PX_PER_MS` | 1,6 px/s per m/s (3,2 px/s) | nopeuden kasvu tuulen mukaan - puolitettu |
| `MAX_SPEED_PX` | 120 px/s (260 px/s) | nopeuden yläkatto - puolitettu+ |
| `SPEED_COLOR_REF_MS` | 18 m/s (ennallaan) | tuulennopeus täydelle kirkkaudelle |
| `DENSITY_PER_MEGAPIXEL` | 900 (ennallaan) | hiukkasia / 1 000 000 px² - **zoom-kerroin POISTETTU
  `wpgComputeCount()`:sta, tiheys nyt aidosti sama kaikilla zoomeilla** |
| `MIN_COUNT` / `MAX_COUNT` | 1200 / 7000 (ennallaan) | hiukkasmäärän rajat |
| `LINE_WIDTH_PX` | 2,0 px (1,3 px) | tavoiteviivanleveys, hieman isompi (ks. yllä ajurirajoitus) |
| `OPACITY_BASE` / `OPACITY_MAX` | 0,22 / 0,55 (0,30 / 0,70) | läpinäkyvyys heikko→voimakas tuuli - läpinäkyvämpi |

Kaikki arvot ovat lähtöpisteitä — käyttäjä voi säätää niitä suoraan
index.html:n `WIND_PARTICLE`-oliosta (yksi paikka, selkeät nimet).

### Fysiikkasimulaatio: todennettu Pythonilla nyt UUDELLEEN uudella kaavalla

Toistin `wpgStep`:n uuden pikselinopeuskaavan Pythonilla oikealla
tuulidatalla kolmessa pisteessä (tuulet 7,2 / 4,7 / 0,4 m/s) ja
neljällä eri zoom-tasolla (3, 5, 7, 9):
- **Näyttöpikselinopeus on TARKALLEEN vakio kaikilla zoom-tasoilla**
  samalla pisteellä (esim. 41,11 px/s tuulessa 7,2 m/s — identtinen
  zoomilla 3/5/7/9 desimaalin tarkkuudella). Tämä todistaa
  zoomriippumattomuuden, ei vain väitä sitä.
- Tyynessä tuulessa (u=v=0) liike on tarkalleen `BASE_SPEED_PX`
  (18,00 px/s) kaikilla zoomeilla — "liike erottuu myös heikossa
  tuulessa" -vaatimus toteutuu mitattuna, ei vain visuaalisesti
  arvioituna.
- Ensimmäinen simulaatioajo paljasti 2× poikkeaman (ks. "Juurisyyt"
  kohta 1 yllä) — korjattu vakio 78271,5170 ja ajo toistettu, täsmää
  tarkalleen.
- Respawnin harha-janan puuttuminen tarkistettu koodikatselmoinnilla
  (prevLon/prevLat asetetaan uuteen sijaintiin respawnissa) — tätä ei
  voi suoraan simuloida Pythonilla koska se on puhtaasti WebGL-puolen
  piirtologiikkaa, mutta logiikka on yksinkertainen ja suoraviivainen.

## Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeilla rajapintakutsuilla testattu (data on oikeaa, ei arvattua):**
- Kaikki 4 korkeutta haettu onnistuneesti FMI:lta, GRIB2 parsittu
  cfgribillä, dimensiot/resoluutio/`isobaricInhPa`-taso tarkistettu.
- U/V-suunta ristiintarkistettu FMI:n omiin WindSpeedMS/WindDirection-
  kenttiin (täsmää).
- PNG-renderöinti (matplotlib quiver + rantaviivat) kaikille 4 korkeudelle
  — silmämääräisesti järkevä (300 hPa: länsi-itä-suihkuvirtaus, voimistuu
  etelään n. 55 m/s; pinta: rannikko/meri selvästi tuulisempi kuin maa —
  molemmat fysikaalisesti oikein).

**Simuloitu Pythonilla (ei selaimessa, mutta sama kaava todennettu):**
- Hiukkasten CPU-advektiokaava (`wpgStep`) — ei NaN, järkevät siirtymät.

**EI testattu missään, vain koodikatselmoitu huolellisesti
(suurin riskialue):**
- Koko WebGL-hiukkasanimaatio (OSA 2): shader-kääntyminen, FBO-ping-pong,
  piirtojärjestys, blend-tilat, kerrosjärjestys WebGL-tasolla. Tämä on
  monimutkaisin WebGL-koodi koko projektissa, eikä minulla ole
  selainautomaatiotyökalua tässä ympäristössä sen näkemiseen. Olen
  seurannut TARKASTI samaa, jo toimivaksi todettua kaavaa kuin
  `cloudWebGLLayer` (sama `cwgShader`-apufunktio, sama premultiplied-
  alpha-konventio, sama `u_matrix`-kaytto), mutta en voi taata ettei
  siina ole pieni virhe (esim. attribuutin stride, puskurin koko).
  **Paivitys (Windy-tyylinen korjaus):** piirtotapa vaihdettiin
  `gl.POINTS`:sta `gl.LINES`:iin (2 karkea/hiukkanen, edellinen->
  nykyinen sijainti). Logiikka (puskurin tayttö, stride, attribuutit)
  on koodikatselmoitu huolellisesti, mutta EI nahty oikeassa
  selaimessa — tama on edelleen suurin jaljella oleva riski.
- Nuolten (`icon-rotate`) visuaalinen suunta oikeassa kartassa — looginen
  päättely (bearing-kaava sama kuin ristiintarkistettu hiukkaskaava) on
  vahva, mutta MapLibren `icon-rotation-alignment:'map'`-kaytosta en ole
  nahnyt omin silmin.
- Hiukkasten visuaalinen tiheys/nopeus/väri/viivanleveys "oikean
  nakoisena" oikeassa selaimessa — uuden `WIND_PARTICLE`-taulukon
  arvot (ks. "OSA 2 päivitys" yllä) on PERUSTELTU pikselinopeus-
  matematiikalla ja Python-simulaatiolla, mutta EI katsottu silmin
  oikeassa selaimessa. Nama ovat edelleen jarkevia lahtoarvoja, eivat
  silmamaarin viritettyja. `gl.lineWidth()`:n todellinen vaikutus
  (moni WebGL1-ajuri tukee vain 1px:aa) on erityisen epavarma.

**Suositus ennen main-haaraan yhdistamista:** avaa haara paikallisesti,
kokeile tuulitasoa jokaisella 4 korkeudella, vertaa Windyyn samalta
painepinnalta, ja katso nayttaako hiukkasanimaatio nyt virtausviivoilta
(ei pisteilta) ja liikkuuko se riittavan nopeasti/laajalti myos kaukana
zoomattuna. Kerro havainnot, niin saadaan `WIND_PARTICLE`-taulukon
arvot hienosaadettya tarkemmin.

## Mitä EI tehty / avoimet kysymykset

- DWD/ICON-EU-tuulivarapolkua ei toteutettu (ei tarvittu — kaikki 4
  tasoa toimivat FMI:lla). Jos FMI joskus lakkaa tarjoamasta jotain
  tasoa, tama pitaisi lisata silloin.
- Tuulen lahdeviite ei ole MapLibren varsinaisessa attribuutiokontrollissa
  (kuten pilvimallien `cloudAttrSuffix`), vaan omassa nakyvassa
  pillerissa. Toimii, mutta on eri mekanismi kuin pilvilla - tietoinen
  yksinkertaistus ajan saastamiseksi.
- `particlesOn`-kytkimen tilaa ei muisteta localStoragessa (oletus aina
  paalla kun tuuli paalle) - ei pyydetty, jatettu yksinkertaiseksi.
- Hiukkasten "kuoleman" yhteydessa uudelleensyntyminen tapahtuu
  SATUNNAISESTI koko data-bbox:n alueelle, ei vain nykyisen
  karttanakyman sisalle - osa hiukkasista voi siis syntya nakyman
  ulkopuolelle (harmiton, mutta ei taysin optimaalinen suorituskyvyn
  kannalta).

## HARMONIE-alueen laajennus takaisin Skandinaviaan + julkaisuarkkitehtuurin korjaus (2026-10)

Käyttäjä raportoi: pilvi- JA tuulitaso näyttivät HARMONIElla vain
Suomen ympäristön, vaikka "Tuulialueen laajennus" -osio (yllä) kuvaa
tuulelle aiemmin haetun paljon laajemman, NaN-vapaan Skandinavia-alueen.

### Juurisyy: alueet YHDISTETTIIN väärään suuntaan

`model_areas.py`:n `HARMONIE_BBOX` oli `"19,59,32,70"` (Suomi) - koodi-
kommentti paljasti suoraan että tuulen laaja alue (`-1,55,35,73.5`)
PERUTTIIN tarkoituksella kun vakio keskitettiin yhteen paikkaan
("vaatimus 'sama alue kuin pilvilla' tarkeampi"), VAIKKA oikea
ratkaisu olisi ollut toisin päin: laajentaa PILVET tuulen laajaan
alueeseen, ei kaventaa tuuli pilvien kapeaan alueeseen. Korjaus:
`HARMONIE_BBOX = "-1,55,35,73.5"` - SAMA alue jo aiemmin tässä
tiedostossa todennetulle 0 NaN-solua -laatikolle (ks. yllä).

### Tiedostokoot (mitattu OIKEASTI ajamalla fetch-skriptit, ei arvattu)

| | Ennen (Suomi) | Jälkeen, 5 km (mitattu) | Jälkeen, 10 km (mitattu/arvioitu) |
|---|---|---|---|
| Pilvi-HARMONIE (koko) | 9,19 Mt | **43,83 Mt** (mitattu) | - (pilville ei harvennettu) |
| Pilvi-HARMONIE/askel | ~304 KB | **~1448 KB** (mitattu) | - |
| Tuuli-HARMONIE/taso (koko) | 5,60 Mt | 26,02 Mt (mitattu, STRIDE=2) | **6,51 Mt (mitattu, surface-taso)** |
| Tuuli-HARMONIE/taso/askel | ~185 KB | ~840 KB (mitattu) | **~215 KB (mitattu)** |

Pilville 5 km (STRIDE=2) säilytettiin ("riittää hyvin" - käyttäjän
oma arvio). Tuulelle STRIDE nostettiin 2:sta 4:ään (~10 km) - tämä
NELJÄNTÄÄ pistemäärän (412×801 → ~206×401), eli KUMOAA suurin piirtein
alueen laajennuksen (4,65× × 0,25× ≈ 1,16×) - tuuli-HARMONIE päätyy
lähelle ALKUPERÄISTÄ (Suomi-alueen) kokoaan, vaikka alue on nyt
koko Skandinavia.

### Juurisyy #2 (käyttäjän havaitsema, VAKAVAMPI): repon kasvu ilman rajaa

Ennen ratkaisua yllä olisi otettu käyttöön, käyttäjä pysäytti
yhdistämisen huomauttaen: main-haaran suora data-committointi
(8×/vrk per malli) olisi HARMONIEn laajennuksen myötä kasvattanut
repon kokoa moninkertaisesti - GitHubin oma API ilmoitti repon koon
jo ENNEN tätä muutosta **297,3 Mt:ksi**. Raaka (pakkaamaton)
päiväkasvuarvio HARMONIElle yksistään:
- Ennen: 8×9,19 (pilvet) + 8×22,4 (tuuli, 4×5,6 Mt) ≈ **253 Mt/vrk**
- Laajennettuna SELLAISENAAN (ei resoluutiokorjausta): 8×43,83 +
  8×104 (4×26 Mt) ≈ **~1180 Mt/vrk** - repo olisi tayttynyt paivissa,
  kuten kayttaja epaili.

**Ratkaisu (kaksiosainen, molemmat toteutettu):**
1. Resoluution harventaminen yllä (vahentaa kasvua ~4x tuulelle).
2. **Julkaisuarkkitehtuurin korjaus** (tarkeampi, ratkaisee ongelman
   RAKENTEELLISESTI riippumatta tiedostokoosta): KAIKKI 7 data-
   tyonkulkua (pilvidata-ecmwf/icon_eu/harmonie, wind-ecmwf/icon_eu/
   harmonie, camera-status) muutettu julkaisemaan `gh-pages`-haaraan
   YHTENA tiivistettyna orphan-committina per paivitys (`git checkout
   --orphan` + `--force`-push, ks. uusi `.github/actions/publish-pages`
   -composite-action) SEN SIJAAN etta committoisivat `main`:iin. `main`
   EI enaa kasva LAINKAAN datan takia - `gh-pages` ei MYOSKAAN kasva,
   koska se EI SAILYTA historiaa, vain korvaa itsensa jokaisella
   paivityksella. Tama poistaa koko ongelman alkuperaisesta syysta,
   ei vain hidasta sita - RESOLUUTIO yksinaan olisi jattanyt ongelman
   ennallaan main:in kasvaessa silti rajatta (vain hitaammin).

   Yksityiskohdat: 6 fetch-tyota (voivat ajaa rinnakkain, apt/pip-
   asennukset + ulkoinen GRIB-haku) + 7 publish-tyota (SERIALISOITU
   yhteisella `concurrency: {group: gh-pages-publish, cancel-in-
   progress: false}` -lukolla, jotta kaksi samanaikaista force-pushia
   ei ylikirjoita toisiaan HILJAA - force-push ei anna git:in normaalia
   non-fast-forward-virhetta kuten tavallinen push, joten ilman lukkoa
   ei olisi mitaan merkkia kadonneesta paivityksesta). Uusi
   `sync-pages.yml` synkkaa sovelluskoodin VALITTOMASTI kun main
   paivittyy (ei tarvitse odottaa seuraavaa data-cronia).

   `data/`-kansio poistettu `main`:in seurannasta (`.gitignore`,
   paitsi kasin yllapidetty `data/cameras.json`) - botin generoima
   data elaa VAIN `gh-pages`:lla jatkossa.

   **Erityistapaus:** `check-camera-thumbnails.py`:n pysyvyysseuranta
   (firstSeenAt) vaatii EDELLISEN tilan - koska main:in data/camera-
   status.json on nyt pysyvasti jaatynyt, `camera-status.yml`:n
   fetch-job hakee edellisen tilan erikseen gh-pages:sta
   (`git show origin/gh-pages:data/camera-status.json`) ENNEN
   tarkistusta.

### Mitä testattiin MISSÄ

**Oikeasti ajettu/mitattu:**
- Kaikki tiedostokoot yllä (paitsi merkityt "arvio/mittaus kesken")
  AJAMALLA fetch-skriptit oikeasti tassa ymparistossa (cfgrib/eccodes
  toimivat paikallisesti), ei arvattu kaavasta.
- Repon todellinen koko haettu GitHubin REST-API:sta
  (`/repos/.../{owner}/{repo}`, `size`-kentta), ei paateltya `.git`-
  hakemiston koosta (joka sisalsi myos ~460 Mt irrallisia/keskeneraisia
  pakettitiedostoja taman session omista operaatioista - EI osa
  oikeaa repoa).
- **Koko `publish-pages`-mekanismi testattu PAIKALLISESTI oikealla
  gitilla** ennen CI:hin luottamista: rakennettu kertakayttoinen
  bare-repo + tyokopio, simuloitu (1) ensimmainen julkaisu kun
  gh-pages ei ole olemassa (orphan-worktree-bootstrap), (2) toinen
  julkaisu eri datatiedostolla (varmistettu etta ensimmaisen julkaisun
  tiedosto SAILYY, uusi LISATAAN), (3) kolmas julkaisu EI muutoksia
  (oikein ohitettu, ei turhaa pushia) - kaikki kolme tapausta
  toimivat odotetusti ENNEN kuin logiikka vietiin tuotantoon.
- Kaikki 8 muokattua/uutta YAML-tiedostoa (`yaml.safe_load`) ja
  niiden `run:`-lohkot (`bash -n`) - sama menetelma kuin aiemmin
  tassa sessiossa.

**EI testattu / avoin:**
- Itse GitHub Actionsin `concurrency`-lukon todellinen toiminta
  tuotannossa seitseman itsenaisen tyonkulun valilla (paikallinen
  simulaatio ei voi testata GH:n omaa jonotusmekanismia, vain git-
  logiikkaa jota se suojaa).
- Loput kolme tuuli-HARMONIE-tasoa (850/500/300) STRIDE=4:lla eivat
  olleet vielä valmiina tata kirjoitettaessa (surface mitattu: 6,51 Mt) -
  kaikki 4 tasoa odotetaan identtisen kokoisiksi, kuten STRIDE=2-mittaus
  jo osoitti kaikkien 4 tason tuottavan TASAN saman koon (26 643 KB
  joka taso).
- GitHub Pages -asetuksen vaihto `gh-pages`-haaraan - VAATII
  kayttajan oman manuaalisen toimenpiteen (Settings → Pages →
  Source), ei tehtavissa API:n kautta ilman autentikointia tassa
  ymparistossa.

## Tuulinuolet poistettu (2026-10)
Käyttäjän päätös: tuuli näytetään vain hiukkasanimaationa. Poistettu
`renderWindArrows`/`windArrowGeoJSON`/`ensureWindArrowIcon`/`windBearing`,
`WIND_ARROW_SPACING_DEG`, `wind-arrows`-taso, `state.particlesOn` sekä
tuulirivin hiukkasnappi `#particlesToggle` ja sen käännösavain
`wind.particles`. Nappi vaihtoi hiukkasten ja nuolten välillä - ilman nuolia
sen sammuttaminen olisi jättänyt tuulen päälle näkymättömänä, joten se
poistettiin osana nuolikoodia (tuulirivissä nyt vain 4 korkeutta). Datan
latauksen ja aikajanan jälkeen kutsutaan `windRedraw()` (varmistaa
hiukkastason + uusi piirto). HUOM testaukseen: `map.getStyle().layers` EI
listaa custom-tasoja - tarkista hiukkastaso `map.getLayer('wind-particles')`.
