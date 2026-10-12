# Muistio: korkeusvalinnat + tuulitaso + hiukkasanimaatio

Haara: `feature/korkeudet-ja-tuuli` (haarautettu `main`:sta OSA 1/2-mallinvalitsin-
ja ECMWF-tyon jalkeen). Main koskematta koko tyon ajan.

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

| Muuttuja | Arvo | Merkitys |
|---|---|---|
| `TRAIL_SECONDS` | 1,4 s | jäljen näkyvyysaika |
| `MIN_LIFETIME_S` / `MAX_LIFETIME_S` | 2,0 / 5,0 s | hiukkasen elinikä |
| `BASE_SPEED_PX` | 18 px/s | nopeus tyynessä säässä |
| `SPEED_PX_PER_MS` | 3,2 px/s per m/s | nopeuden kasvu tuulen mukaan |
| `MAX_SPEED_PX` | 260 px/s | nopeuden yläkatto |
| `SPEED_COLOR_REF_MS` | 18 m/s | tuulennopeus täydelle kirkkaudelle |
| `DENSITY_PER_MEGAPIXEL` | 900 | hiukkasia / 1 000 000 px² |
| `MIN_COUNT` / `MAX_COUNT` | 1200 / 7000 | hiukkasmäärän rajat |
| `LINE_WIDTH_PX` | 1,3 px | tavoiteviivanleveys (ks. yllä ajurirajoitus) |
| `OPACITY_BASE` / `OPACITY_MAX` | 0,30 / 0,70 | läpinäkyvyys heikko→voimakas tuuli |

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
