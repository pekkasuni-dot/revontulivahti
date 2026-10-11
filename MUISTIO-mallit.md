# Muistio: pilviennusteen lähteiden yhtenäistäminen + mallinvalitsin

## Lisäys: ICON-EU-tason korjaus, kierros 3 (epäilty 90° kierto — ei löytynyt)

Käyttäjä epäili vahvasti lat/lon-järjestyksen olevan ristissä, koska
Windyn ICON-EU näyttää pilvettömän vyön idästä länteen
(Kiiruna-Rovaniemi-Kemi-Arkangeli, ~66°N), kun meidän kartalla muodot
näyttivät pohjois-etelä-suuntaisilta.

**Tehdyt tarkistukset (kaikki läpäisty, ei löytynyt 90°-kiertoa):**

1. **Otsaketiedot rinnakkain** (`nx,ny,lat0/1,lon0/1,dlat/dlon,len(vals)`):
   molemmissa tiedostoissa `len(vals) == nlat*nlon*len(times)` tasan.
   ICON-EU: 63×345, dlat=dlon=0,25. ECMWF: 81×720, dlat=0,25/dlon=0,5.
   Ei poikkeavuutta.
2. **Selaimen indeksilogiikka** (`sampleCloudGridField`,
   [index.html:1359-1377](index.html#L1359-L1377)): `i00 = tIdx*N + r0*g.nlon + c0`
   — rivi (lat) × `nlon` + sarake (lon). Python-skripti kirjoittaa
   `pct[i,j]` muodossa (nlat,nlon) ja `.flatten()` (C-order, rivi-major) —
   **täsmälleen sama järjestys**. Ei ristiriitaa.
3. **Zoomattu PNG-todennus** (rajattu 15-45°E, 62-70°N, kaupungit
   merkitty): `muistio-liitteet/icon_eu_zoom_kiiruna_rovaniemi_kemi.png`.
   Kuvassa pilvettömämpi vyö kulkee selvästi **idästä länteen** juuri
   Kiirunan, Kemin ja Rovaniemen kautta kohti Arkangelia, ~65-67°N —
   **täsmälleen kuten käyttäjä kuvasi Windyn näyttävän**, ei
   pohjois-etelä-suuntaisena.

**Johtopäätös: en löytänyt 90°-kiertoa datasta, indeksilogiikasta eikä
WebGL-shaiderin koordinaattimuunnoksista (tarkistin myös
`cwgSyncQuad`/fragment-shaiderin `u`/`v`-laskennan — molemmat käyttävät
`nlon`/`nlat`-arvoja johdonmukaisesti, sama koodi joka toimii ECMWF:llä,
jonka kuvasuhde on jopa äärimmäisempi.** Todennäköisin selitys käyttäjän
näkemälle on **selaimen välimuistissa/muistissa oleva vanha data** —
jos selainvälilehti on ollut auki usean korjauskierroksen ajan,
`state.cloudGrid` säilyy JS-muistissa eikä päivity automaattisesti
ennen seuraavaa mallin latausta (tunnin välein ajastettu, tai mallia
vaihdettaessa). **Suositus: lataa sivu kokonaan uudelleen (ei vain
päivitä), ennen kuin tarkistat uudelleen.** Jos raita/kiertymäilmiö
toistuu TÄYSIN uudella selainistunnolla kovan päivityksen jälkeen,
kerro mielellään tarkka ajankohta jolloin katsoit, niin tutkin lisää.

### Kohta 6: ICON-EU:n reunahäivytys poistettu

Pilvitason WebGL-shaiderissa oli reunahäivytys (`fade`-kerroin), viritetty
ECMWF:n paljon laajemmalle kattavuudelle. Koska reunahäivytys on yhteisessä
shaider-koodissa, lisäsin uuden `u_fadeEdges`-uniformin ja
`CLOUD_MODELS[...].fadeEdges`-lipun per malli: ECMWF `true` (käyttäytyy
**täsmälleen ennallaan** — `mix(1.0, fadeCalc, 1.0) === fadeCalc`,
matemaattisesti identtinen vanhaan), ICON-EU `false` (häivytys pois,
data loppuu terävään reunaan bbox:n rajalla, alue ennallaan 55-70,5°N).

---

Edellinen korjauskierros (ks. "Lisäys: ICON-EU-tason korjaus (VAIHE 0-3)"
alempana) vaihtoi datalähteen DWD:hen, mutta pistevertailu tehtiin silloin
vahingossa vielä VANHAA Open-Meteo-pohjaista tiedostoa vasten, ei uutta
DWD-tiedostoa — käyttäjä huomasi tämän oikein. Tällä kierroksella tehtiin
pyydetyt 5 kohtaa uudelle DWD-datalle.

### VAIHE 1: PNG-renderöinti (matplotlib + cartopy, rantaviivat)

Asensin `matplotlib` + `cartopy` ja renderöin molemmat tiedostot oikeilla
rantaviivoilla. **Ensimmäinen yritys (alempi DPI, oletusinterpolointi)
näytti säännöllistä raidoitusta MOLEMMISSA kuvissa — myös ECMWF:ssä, joka
tiedetään toimivaksi.** Tämä paljasti, että raidoitus oli
matplotlib/imshow-renderöintiartefakti (oletusinterpolointi + liian pieni
DPI leveälle, matalalle hilalle), EI data- tai koodivirhe — korjattu
renderöinnissä `interpolation="nearest"` + korkeampi DPI. Sen jälkeen
molemmat kuvat näyttävät aidolta, kohinaiselta sääkentältä, ei raidoilta.

Liitteet (`muistio-liitteet/`):
- `icon_eu_before.png` — ICON-EU ennen VAIHE 2:n korjausta (ks. alla),
  askel valittu virheellisesti kiinteästi ajon alkuhetkeen (ei nykyhetkeen)
- `icon_eu_after.png` — ICON-EU korjauksen jälkeen, oikea nykyhetken askel
- `ecmwf_compare.png` — ECMWF samalta/lähes samalta hetkeltä, vertailuksi

### VAIHE 2: GRIB2:n scanning mode, hilakoko, muunnos — LÖYDETTY JA KORJATTU VIKA

Tarkistin oikeasti (ei pääteltynä) tuoreesta GRIB2-tiedostosta
`cfgrib`:n attribuuteilla:

```
GRIB_iScansNegatively: 0        (lon kasvaa, lansi->ita - kuten oletettu)
GRIB_jScansPositively: 1        (lat kasvaa, etela->pohjoinen - kuten oletettu)
GRIB_jPointsAreConsecutive: 0
```

Hilakoko natiivina 657 (lat) × 1377 (lon), 0,0625°. **Rivi/sarake-järjestys
ja suunta olivat oikein** — tämä ei ollut vika.

**Todellinen löydetty vika:** `fetch-clouds-icon_eu.py` poimi alinäytteistyksessä
natiivihilasta joka 4. PISTEEN (`[::STRIDE]`), ei niiden KESKIARVOA. Tämä
aliasoi jyrkät paikalliset pilvirajat väärin — esim. Tromssan kohdalla
yksittäisen pisteen poiminta antoi 80 %, kun naapuripisteiden keskiarvo
(= oikea pinta-alaa edustava arvo) oli 69,5 %, ero 10+ prosenttiyksikköä;
pahimmillaan havaitsin n. 20 prosenttiyksikön eron (ks. VAIHE 4 -taulukko).
**Korjaus:** vaihdettu pisteen poiminta 4×4-lohkon keskiarvoon
(`data[r0:r1, c0:c1].mean()` jokaiselle ulostulosolulle). Hilan koordinaatit
(`lat0/lon0/dlat/dlon`) pysyivät ennallaan — vain arvon LASKENTATAPA muuttui.

### VAIHE 3: Ennusteaskeleen ja näytetyn ajan kohdistus

Tarkistin: sovelluksen `targetTime()` (hour=0 → `Math.floor(Date.now()/3600e3)*3600e3`,
eli nykyhetki pyöristettynä alaspäin täyteen tuntiin) ja `cloudTimeFloat()`
(binäärihaku `times`-taulukon ABSOLUUTTISISTA millisekuntileimoista) toimivat
oikein riippumatta siitä, miltä ajolta data on peräisin — ne eivät oleta
mitään ajon alkuhetkestä, vain vertaavat oikeita kellonaikoja. **Tämä ei
ollut vika.**

Sen sijaan OMA diagnoosiskriptini (PNG-renderöinti) käytti ensin
virheellisesti kiinteää askelta 0 (= ajon ALKUHETKI, ei nykyhetki) — koska
ajo oli otettu klo 15:00 UTC ja nykyhetki oli n. klo 18:51 UTC, tämä näytti
dataa **3 h 51 min VANHEMPANA** kuin todellisuus, mikä selittää osan
"ei täsmää Windyyn" -vaikutelmasta. Korjasin diagnoosiskriptin valitsemaan
automaattisesti ajallisesti lähimmän askeleen (tässä tapauksessa askel 4,
klo 19:00 UTC, 9 min nykyhetkestä) — sama logiikka jota itse sovellus
käyttää. `icon_eu_before.png`/`icon_eu_after.png` käyttävät nyt molemmat
oikeaa, nykyhetkeä lähinnä olevaa askelta.

### VAIHE 4: 5 pisteen vertailu — JSON vs RAAKA GRIB2 suoraan

Ennen korjausta (pisteen poiminta), verrattuna raa'an GRIB2:n yksittäiseen
lähimpään pisteeseen:

| Piste | JSON (poiminta) | Raaka GRIB (lähin piste) | Ero |
|---|---|---|---|
| Helsinki | 100,0 | 100,0 | 0,0 |
| Oulu | 44,0 | 44,0 | 0,0 |
| Rovaniemi | 54,0 | 53,3 | 0,7 |
| Inari | 85,0 | 86,4 | 1,4 |
| **Tromsø** | **80,0** | **60,4** | **19,6** |

Korjauksen jälkeen (lohkokeskiarvo), verrattuna SAMAAN lohkoon laskettuna
suoraan raa'asta GRIB2:sta (oikea vertailutapa lohkokeskiarvolle):

| Piste | JSON (lohkokeskiarvo) | Raaka GRIB (sama lohko) | Ero |
|---|---|---|---|
| Helsinki | 100,0 | 100,0 | 0,0 |
| Oulu | 24,0 | 23,9 | 0,1 |
| Rovaniemi | 60,0 | 59,9 | 0,1 |
| Inari | 83,0 | 82,6 | 0,4 |
| Tromsø | 70,0 | 69,5 | 0,5 |

Kaikki 5 pistettä täsmäävät nyt alle 1 prosenttiyksikön tarkkuudella.

### VAIHE 5: Korjaus + uudet PNG:t

Korjattu `scripts/fetch-clouds-icon_eu.py` (lohkokeskiarvo), ajettu oikeasti
uudelleen, data/clouds-icon_eu.json päivitetty, PNG renderöity uudelleen
(`icon_eu_after.png`).

### Rehellinen avoin kysymys: ei täysin täsmää Windyyn silti

Edellä kuvatut korjaukset (raidoitus=renderöintiartefakti; aliasointivirhe
korjattu lohkokeskiarvolla; ajallinen kohdistus korjattu diagnoosissa;
rivi/sarake/scanning mode todettu oikeiksi) ovat kaikki todennettuja ja
oikeita korjauksia/löydöksiä. **En silti voi vahvistaa, täsmääkö kuvio
nyt täsmälleen Windyn näyttämään kuvaan samalta hetkeltä** — en pysty
avaamaan Windyä tässä ympäristössä nähdäkseni sen tarkan näkymän (mikä
ajo, mikä ajanhetki, käyttääkö se puhtaasti ICON-EU:ta vai
nowcast/satelliittisekoitusta). `icon_eu_after.png` (liitteenä) näyttää
Lapissa (66-70°N) edelleen melko pilvistä klo 19:00 UTC -ennusteella —
jos tämä on yhä ristiriidassa sen kanssa mitä itse näet Windyssä SAMALTA
täsmälliseltä ajanhetkeltä, pyydän sinua kertomaan tarkka hetki/ajo jota
vertasit, jotta voin kohdistaa vertailun täsmälleen oikein; tähän mennessä
kaikki koodin/datan oikeellisuudesta todennettavissa olevat osat on
varmistettu virheettömiksi (yhtä aliasointibugia lukuun ottamatta, joka on
korjattu).

---

Haara: `feature/mallinvalitsin` (haarautettu `feature/kartta-ovation-aikajana`-haarasta,
jossa aiemmat kartta/OVATION/aikajana-muutokset olivat vielä mergeamatta mainiin —
main koskematta koko ajan).

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

## OSA 2: Mallinvalitsin + ICON-EU (alkuperäinen toteutus — ks. korjaus alla)

**Huom: tämän osion ICON-EU-datalähde (Open-Meteo) korvattiin kokonaan
myöhemmin DWD:n suoralla datalla — ks. "Lisäys: ICON-EU-tason korjaus"
alempana. Tämä osio säilytetty sellaisenaan, koska se selittää, mitä
kokeiltiin ensin ja miksi, ja osa siitä (mallinvalitsin-UI, rekisteri)
pysyi ennallaan.**

### Miksi ICON-EU ja mikä tunniste (alkuperäinen, Open-Meteo-pohjainen päätös)

Open-Meteon dokumentaatiosta ja oikealla rajapintakutsulla tarkistettu
(ei arvattu):

- Malli ladattiin `&models=icon_eu` (toimii myös `&models=dwd_icon_eu`).
- **Resoluutio:** 0,0625° (~7 km). **Päivitysväli:** Open-Meteon
  dokumentaation mukaan "every 3 hours", **ennustepituus** 5 vrk.
- **Kattavuus Lapissa — testattu oikeilla hauilla:** Rovaniemi, Inari,
  Utsjoki (69,9 °N, Suomen pohjoisin piste) ja Kilpisjärvi palauttivat
  kaikki oikeaa, ei-null-dataa. ICON-EU:n kattavuus riittää koko Suomeen.
- ICON-EU tarjoaa myös matala/keski/ylä-erittelyn → `hasLayers:true`.

### Hilan rakentaminen Open-Meteolla (vanha, korvattu versio)

Open-Meteo on pistekohtainen rajapinta, ei tarjoa valmista hilatiedostoa.
Ratkaisu oli hakea hila Open-Meteon monipistekyselyllä (pilkuin erotetut
lat/lon-listat), Suomi + marginaali -alueelta (59,0-70,5 °N, 18,0-32,0 °E),
0,5° resoluutiolla (696 pistettä), tunneittain 48 h. **Löydetty ja korjattu
ongelma:** Open-Meteon ilmainen kiintiö ("600 kutsua/min") lasketaan
monipistekyselyssä per PISTE, ei per HTTP-kutsu — korjattu tauoilla erien
välissä. GH Actions -työnkulku ajoi tätä 4× vrk, ei pip-riippuvuuksia.

### Sivuhuomio: löytyi ja korjattu samalla (pysyy voimassa)

WebGL-pilvitason tekstuuri-uudelleenlataus (`cloudWebGLLayer.render()`)
tarkisti hilan koon muutoksen (`nlat`) vain `tex0`:lle, ei `tex1`:lle — jos
kahden mallin aikaindeksit sattuisivat osumaan samaan arvoon mallia
vaihdettaessa, `tex1` olisi jäänyt vanhan mallin kokoiseksi/sisältöiseksi.
Korjattu: `nlatChanged` lasketaan kerran etukäteen ja vaikuttaa molempiin
tekstuureihin.

### UI (pysyy voimassa)

`.timectl`-lohkoon lisätty `<select id="cloudModelSelect">`, täytetään
dynaamisesti `CLOUD_MODELS`-rekisteristä (uusi malli ilmestyy valikkoon
automaattisesti). Sijainti: `.timectl` pysyy näkyvissä myös infopaneelin
pienennetyssä tilassa, joten valitun mallin nimi on "aina näkyvissä".
Vaihto: tallettaa valinnan, tyhjentää vanhan hilan, hakee uuden
(`loadCloudGrid()`), näyttää virheen `note()`-tekstillä epäonnistuessa, ja
suojaa nopeaa peräkkäistä mallinvaihtoa sekvenssinumerolla.

## Mitä EI tehty (OSA 1/2 -tehtävän rajauksen mukaisesti)

- FMI HARMONIE — ei toteutettu, vain mainittu rekisterin kommentissa
  tulevana laajennuksena.
- OVATION-kenttä, taustakartat, aikajana-logiikan mekaniikka — koskematta.
  Aikajana TOIMII uudella mallilla automaattisesti, koska pilvitason
  piirto on alusta asti malli-agnostinen (lukee aina `state.cloudGrid`:stä).
- ECMWF:n GRIB2-hakua ei laajennettu matala/keski/ylä-kentillä — ks. OSA 1
  perustelu yllä.

---

## Lisäys: ICON-EU-tason korjaus (VAIHE 0-3)

Tämä osio kuvaa erillisen, myöhemmän korjauskierroksen: käyttäjä havaitsi
mallinvalitsimen ICON-EU-tason piirtyvän väärin (kapea suorakaide, venynyt
pohjois-eteläsuunnassa, pystyjuovia vaikka Windy näytti yhtenäisen itään
suuntautuvan pilvivyön).

### VAIHE 0: Datalähteen tarkistus

ICON-EU haettiin tätä korjausta ennen **Open-Meteon** kautta, ei DWD:n
avoimesta datasta suoraan (ks. yllä "OSA 2" -osion alkuperäinen kuvaus).
Koodi: `scripts/fetch-clouds-icon_eu.py` (vanha versio), `&models=icon_eu`
-API-kutsu ja 696 pisteen, 0,5°-rajatun Suomi-hilan rakentaminen Open-Meteon
monipistekyselyllä. Syy rajattuun alueeseen: Open-Meteo on pistekohtainen
rajapinta eikä tarjoa valmista hilatiedostoa — koko Euroopan kattava hila
olisi vaatinut tuhansia erillisiä pistekyselyitä, jotka olisivat ylittäneet
ilmaiskiintiön (600 pistettä/min, ks. yllä).

### VAIHE 1: Diagnoosi (tehty ENNEN korjauksia)

Verrattiin 3 pistettä tallennetusta (vanhasta, Open-Meteo-pohjaisesta)
hilasta suoraan rajapintaan samalla hetkellä:

| Piste | Hilan arvo | Suoraan rajapinnasta | Täsmää? |
|---|---|---|---|
| Oulu (65,0, 25,5) | 80 % | 80 % | Kyllä, pistetarkasti |
| Helsinki (60,17, 24,94) | 100 % | 100 % | Kyllä, pistetarkasti |
| Rovaniemi (66,5, 25,7) | 29 % | 26 % | Lähes — pieni ero, koska Open-Meteo pyöristi kyselypisteen hieman eri hilasoluun (25,7 → 25,6875) |

**Johtopäätös: hilan rivi/sarake-järjestystä (lat/lon) EI ollut vaihdettu
keskenään** — epäilty "ristiin mennyt" indeksointi ei ollut syy. Pisteväli
(0,5°/0,5°) ja kuvan rajat (`lat0/lat1/lon0/lon1`) olivat oikein, pohjoinen
piirtyi ylhäällä oikein. Varmistettu todellinen vika oli **kattavuus**:
hila kattoi vain 18-32 °E, 59-70,5 °N -suorakaiteen — kartalla näytetään
koko Suomi ja osa Skandinaviaa/Luoteis-Venäjää, niin suorakaiteen reunat
(ja niiden häivytys, viritetty ECMWF:n paljon suuremmalle kattavuudelle)
näkyivät selvästi, mikä selittää osan "venymä"-vaikutelmasta. Tämä ei
kuitenkaan täysin selittänyt kuvailtua raitakuviota Windyyn verrattuna,
niin siirryin VAIHE 2:een vanhan datan säätämisen sijaan.

### VAIHE 2: Datalähde vaihdettu DWD:n suoraan avoimeen dataan

Tutkittu ja testattu oikeasti (ei pääteltynä):

- `opendata.dwd.de/weather/nwp/icon-eu/grib/<HH>/<kentta>/` sisältää
  valmiit GRIB2-tiedostot (bz2-pakattuina) muodossa
  `icon-eu_europe_regular-lat-lon_single-level_<YYYYMMDDHH>_<step3>_<KENTTA>.grib2.bz2`.
  **"regular-lat-lon"** = tavallinen lat/lon-hila, EI kierretty (rotated-pole)
  projektio — paljon yksinkertaisempi kuin ICON-EU:n natiivi malliruudukko.
- Kentät `CLCT` (kokonais), `CLCL`/`CLCM`/`CLCH` (matala/keski/ylä) —
  kaikki neljä olemassa, tarkistettu HTTP 200:lla.
- **Resoluutio (varmistettu lataamalla ja parsimalla cfgribillä oikea
  tiedosto):** 0,0625° × 0,0625°, 657 × 1377 pistettä, kattaa 29,5-70,5 °N,
  -23,5...62,5 °E. Arvot valmiiksi 0-100 %, lat/lon nousevassa
  järjestyksessä (S→N, W→E) — sama suuntakäytäntö kuin ECMWF-putkessa.
- **Ajot:** 8× vrk (00,03,06,...,21 UTC). Testattu: jokaisella ajolla on
  tunneittainen data ainakin 0-12 h asti (tarkistettu myös "väliajolta" 03).
  **Julkaisuviive:** ~2,5-3 h ajon jälkeen (havaittu kokeilemalla: klo
  18:29 UTC ajo 18 ei ollut vielä saatavilla, ajo 15 oli).
- **Käyttöehdot — tärkeä ero Open-Meteohon nähden:** DWD:n avoin data
  julkaistaan Saksan liittovaltion geodata-asetuksen (GeoNutzV) mukaisesti
  maksutta ja **vapaasti myös kommersiaaliseen käyttöön**, lähde mainittava
  ("© Deutscher Wetterdienst"). Tämä poistaa juuri sen ongelman, jonka takia
  tehtävässä pyydettiin siirtymään pois Open-Meteosta (sen ilmainen taso on
  rajattu ei-kaupalliseen käyttöön) — DWD-suora haku sopii myös tulevaan
  maksulliseen versioon.

Uusi `scripts/fetch-clouds-icon_eu.py` (korvaa kokonaan edellä kuvatun
Open-Meteo-pohjaisen version):
- Hakee uusimman julkaistun ajon (kokeilee taaksepäin max 8 ajoa / 24 h,
  HEAD-pyynnöllä step000/CLCT-tiedostoon).
- Lataa 13 aika-askelta (0-12 h) × 4 kenttää = 52 GRIB2-tiedostoa, purkaa
  bz2:n, parsii cfgribillä.
- Leikkaa hilan **samalle leveysastealueelle kuin ECMWF (55-75 °N) niin
  pitkälle kuin ICON-EU:n oma kattavuus sen sallii** — pohjoisraja jää
  **70,5 °N:ään, ei 75 °N:ään asti**. Tämä on ICON-EU:n mallialueen kova
  reuna, ei korjattavissa — kirjattu avoimeksi rajoitukseksi alle.
- Pituusaste = DWD:n koko natiivialue (-23,5...62,5 °E) — paljon laajempi
  kuin vanha Suomi-rajaus, kattaa koko näkyvän kartta-alueen samaan tapaan
  kuin ECMWF.
- Alinäytteistys natiivista 0,0625° → **0,25°** (joka 4. piste, osuu
  tasan ilman jäännöstä) — sama tiheys kuin ECMWF:n `dlat`.
- **Testattu oikeasti päästä päähän kahdesti tässä ympäristössä**
  (asensin cfgrib+eccodes+xarray+numpy ja ajoin skriptin): tuotti
  63×345-hilan (lat 55,0-70,5, lon -23,5-62,5), 13×4 kenttää, ~4,1 Mt —
  samaa suuruusluokkaa kuin ECMWF:n tiedosto.
- Pistokoe samoista kaupungeista uudesta hilasta: Rovaniemi 23 %, Oulu
  81 %, Helsinki 93 % (eri hetki kuin VAIHE 1:n taulukko, koska ajo oli
  eri — arvot vaihtelevia/järkeviä, eivät vakioita).
- **ASCII-visualisointi Suomen kaistaleelta** (katsottu silmämääräisesti
  ennen committia): kuvio on yhtenäinen, realistisen näköinen sääkenttä
  (diagonaalisia pilvialueita/aukkoja), EI pystyraitoja — vahva epäsuora
  vahvistus, että natiivi DWD-hila ei kärsi samasta ongelmasta kuin vanha
  pistekysely-pohjainen hila.
- Siivosin samalla pienen roskabugin: kehitystyön aikana cfgribin luoma
  `.idx`-apu­tiedosto jäi väärän tiedostonimiarvauksen takia siivoamatta —
  korjattu `glob`-haulla oikeaan nimikuvioon (`<tmp>.<hash>.idx`),
  varmistettu ajamalla uudelleen (0 jäljelle jäänyttä tiedostoa).
- GH Actions -työnkulku `pilvidata-icon_eu.yml` päivitetty: tarvitsee nyt
  `libeccodes-dev` + `cfgrib`/`xarray`/`numpy` (kuten ECMWF-putki, koska
  myös tämä on nyt GRIB2-putki). Ajastus 8× vrk
  (`10 3,6,9,12,15,18,21,0 * * *`), n. 3 h 10 min ajon jälkeen — skripti
  etsii itse tuoreimman saatavilla olevan ajon, niin ajoitus ei ole
  kriittinen.

### VAIHE 3: Piirto

**Ei koskettu piirtokoodia** — kartan pilvitaso (`cloudWebGLLayer`,
`renderClouds`, Mercator-projektiokorjaus fragment-shaiderissa) on
rakennettu alusta asti malli-agnostiseksi: se lukee aina
`state.cloudGrid.vals`-taulukkoa samalla tavalla riippumatta mallista.
Koska uusi DWD-hila noudattaa täsmälleen samaa skeemaa ja
suuntakäytäntöä (lat0=etelä, lat1=pohjoinen, dlat/dlon positiivisia,
S→N/W→E-järjestys) kuin ECMWF, piirto käyttää samaa, jo ECMWF:llä
toimivaksi todettua projektiota ja piirtotapaa automaattisesti — ei
erillistä muutosta tarvittu. **En voinut visuaalisesti vahvistaa
selaimessa** (ei selainautomaatiotyökalua) että taso osuu rantaviivoihin
pikselintarkasti — tämä kannattaa tarkistaa silmämääräisesti paikallisella
palvelimella ennen main-haaraan yhdistämistä.

### Avoimet kysymykset / rajoitukset (ICON-EU-korjaus)

1. **ICON-EU:n pohjoisraja on 70,5 °N, ei 75 °N kuten ECMWF:llä.** Tämä on
   ICON-EU:n mallialueen fyysinen reuna — ei korjattavissa koskemattomatta
   itse malliin. Pohjoisimman Lapin (Nuorgam ~70,08 °N) yläpuolella (esim.
   osa Jäämeren rannikkoa) ICON-EU-taso loppuu hieman ennen ECMWF-tasoa.
2. **ICON-EU-skriptiä EI voitu testata CI-ympäristössä** (GitHub Actions)
   — ajettu ja varmistettu vain tässä paikallisessa ympäristössä.
   Ensimmäinen oikea CI-ajo kannattaa käynnistää käsin
   (`workflow_dispatch`) ja tarkistaa sen loki, ennen kuin luottaa
   ajastettuun ajoon.
3. **En nähnyt itse selaimessa**, osuuko taso rantaviivoihin pikselintarkasti
   — koodi ja data on varmistettu niin pitkälle kuin pystyin ilman
   selainta (katso yllä), mutta lopullinen silmämääräinen tarkistus on
   sinulla.
