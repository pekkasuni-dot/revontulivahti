# Muistio: pilviennusteen lähteiden yhtenäistäminen + mallinvalitsin

## Lisäys, kierros 7: ECMWF-varalähde + HARMONIE kolmanneksi malliksi + ECMWF:n reunahäivytys pois

Haara: `feature/ecmwf-alue-resoluutio` (jatkoa kierros 6:lle, samassa haarassa).

### 1. ECMWF: varalähde (ecmwf → azure → aws)

`scripts/fetch-clouds.py`: ensisijainen lähde on edelleen ECMWF:n oma
portaali, mutta nyt LYHYELLÄ uudelleenyrityksellä (`maximum_retries=3,
retry_after=20` kirjaston oman 500×120s-oletuksen sijaan, joka olisi
voinut jumittaa ajon tuntikausiksi edellisen 429-ruuhkan tapaan). Jos
ensisijainen lähde ei vastaa muutaman nopean yrityksen jälkeen,
vaihdetaan automaattisesti Azure-peiliin, sitten AWS-peiliin — ECMWF:n
oma dokumentaatio/virheviesti suosittelee näitä nimenomaan tähän
tarkoitukseen. Käytetty lähde kirjataan sekä lokiin (`print`) että
itse JSON-tiedostoon (`"source": "ecmwf"/"azure"/"aws"`).

**Testattu kahdessa tilanteessa:** (a) oikea ajo, jossa ECMWF:n portaali
oli palautunut — onnistui suoraan ensisijaisesta lähteestä, kesti ~66 s
(hitaampi kuin normaalisti, mutta onnistui). (b) Simuloitu virhe
(olematon osoite ensimmäisenä lähteenä) vahvisti, että fallback-ketju
todella siirtyy seuraavaan lähteeseen poikkeuksen sattuessa — ei vain
koodin lukemisella pääteltynä.

### 2. HARMONIE (FMI) — uusi, tarkin malli

**Tutkittu oikealla rajapintakutsulla, ei arvattu:**
- Rajapinta: `opendata.fmi.fi`, WFS-tallennettu kysely
  `fmi::forecast::harmonie::surface::grid`. GetFeature-vastaus on
  GML-kääre, jonka SISÄLLÄ (`gml:fileReference`) on suora linkki
  oikeaan GRIB2-tiedostoon `opendata.fmi.fi/download?...` — tämän
  linkin rakenteen voi päätellä ja rakentaa itse suoraan, ei tarvita
  WFS/GML-vaihetta ollenkaan käytännön haussa.
- **/download-rajapinta palauttaa YHDELLÄ HTTP-kutsulla kaikki pyydetyt
  aika-askeleet yhtenä GRIB2-tiedostona** — paljon yksinkertaisempi kuin
  DWD:n 52-tiedoston per-ajo-malli.
- `origintime`-parametri on valinnainen — rajapinta valitsee itse
  tuoreimman ajon joka kattaa pyydetyn `starttime`/`endtime`-välin.
- **Natiiviresoluutio mitattu suoraan GRIB2-vastauksesta:** bbox
  19-32 °E, 59-70 °N → hila 579×490 pistettä → noin **0,0225° ≈ 2,5 km**
  — täsmää käyttäjän mainitsemaan lukuun, ei tarvinnut arvata.
- **Kattavuus on Suomi + pieni marginaali** (19-32 °E, 59-70 °N) — EI
  ulotu esim. Tromssaan (18,94 °E, juuri rajan ulkopuolella). Tämä on
  FMI:n oman tuotteen luonnollinen jakelualue tälle kyselylle — isompaa
  bbox:ia kokeiltiin (15-35 °E, 55-72 °N), mutta tiedosto kasvoi
  73+ Mt:aan yhdellä kentällä/osittaisella latauksella, epäkäytännöllinen.
- **Alinäytteistys 2×2-lohkokeskiarvolla** (~0,045° ≈ 5 km) natiivista
  2,5 km:stä — tiedostokoon pitämiseksi mobiilikäytössä kohtuullisena
  (3,8 Mt). Silti selvästi tarkempi kuin ICON-EU (~7 km) tai ECMWF
  (~28 km) — "tarkin Suomessa" pitää paikkansa myös alinäytteistettynä.
- **v1: vain kokonaispilvisyys** (`TotalCloudCover`), EI matala/keski/
  ylä-erittelyä (`hasLayers:false`, sama yksinkertaistus kuin ECMWF:lla)
  — FMI tarjoaa myös `LowCloudCover`/`MediumCloudCover`/`HighCloudCover`,
  mutta nämä jätettiin pois v1:ssä tiedostokoon/pyyntömäärän takia
  (lisäisi 4× datan). **Avoin jatkokysymys:** voidaan lisätä myöhemmin,
  jos korkeuspainotettu näkyvyysindeksi halutaan tarkemmaksi tällä
  mallilla — merkitty koodikommentilla, ei toteutettu.
- Käyttöehdot: CC BY 4.0 (sama kuin ECMWF), ei API-avainta.
- **Testattu oikeasti päästä päähän:** ladattu, parsittu cfgribillä,
  lohkokeskiarvoitu, kirjoitettu JSON, tarkistettu eheys
  (`len(vals)==nlat*nlon*ntimes`) ja pistearvot (Helsinki, Rovaniemi,
  Oulu — järkeviä; Tromssa oikein tunnistettu alueen ulkopuoliseksi).
  Simuloitu selaimen näytteistyslogiikka (sama kuin aiemmin muille
  malleille) — toimii, aikajanan `maxH`=12 h kuten pyydetty.
- **`nlon=290`, ei jaollinen 4:llä** — täsmälleen sama WebGL
  UNPACK_ALIGNMENT-riski kuin ICON-EU:lla (345) ja ECMWF:llä nyt (361).
  Koska korjaus on yleinen (ei mallikohtainen), tämä kolmaskin malli
  hyötyy siitä automaattisesti ilman uutta koodimuutosta — vahva
  jatkovahvistus sille, että yleinen korjaus oli oikea ratkaisu.

### 3. ECMWF:n reunahäivytys poistettu

Samalla periaatteella kuin ICON-EU:lle aiemmin: `CLOUD_MODELS.ecmwf.fadeEdges`
`true` → `false`. Koska reunahäivytysmekanismi (`u_fadeEdges`-uniform) oli
jo rakennettu YLEISEKSI (per-malli-lippu, ei ECMWF-kohtaista koodia),
tämä oli yhden rivin muutos rekisterissä — ei tarvinnut koskea itse
shaideriin. Kaikkien kolmen mallin reunat ovat nyt teräviä.

### Yhteenveto: kolme mallia, kaikki testattu päästä päähän

| Malli | Resoluutio (käytössä) | Natiivi | Alue | Tiedostokoko |
|---|---|---|---|---|
| ECMWF IFS | 0,25° (~28 km) | 0,25° | 55-75°N, 30°W-60°E | ~2,05 Mt |
| ICON-EU (DWD) | 0,25° (lohkokeskiarvo) | ~0,0625° (~7 km) | 55-70,5°N, -23,5-62,5°E | ~4,1 Mt |
| HARMONIE (FMI) | ~0,045° (~5 km) | ~0,0225° (~2,5 km) | 59-70°N, 19-32°E | ~3,8 Mt |

---

## Lisäys, kierros 6: ECMWF-haun alue ja resoluutio

Haara: `feature/ecmwf-alue-resoluutio` (haarautettu `main`:sta sen jälkeen
kun mallinvalitsin-työ oli yhdistetty). Main koskematta.

### Muutos

`scripts/fetch-clouds.py`:
- **Alue rajattu** koko maailmasta → **30 °W - 60 E** (leveysaste 55-75 °N
  ennallaan). Kattaa reilusti koko Euroopan/Skandinavian, sovelluksen
  käyttötarkoitus ei tarvitse laajempaa.
- **Pituusasteen alinäytteistys (`[::2]`, 0,5°) poistettu** — käytetään nyt
  TÄYTTÄ natiiviresoluutiota 0,25° molemmilla akseleilla. ECMWF Open Data
  ei tarjoa tätä tarkempaa ilmaiseksi (tarkistettu ECMWF:n virallisesta
  dokumentaatiosta: 0,25° on paras ilmainen resoluutio, tarkempi vaatii
  maksullisen "Real-time Dissemination Service Agreement" -sopimuksen).

### Tiedostokoko ennen/jälkeen (mitattu, ei arvioitu)

| | Ennen | Jälkeen |
|---|---|---|
| Alue | 55-75°N, koko maailma (360°) | 55-75°N, 30°W-60°E (90°) |
| Resoluutio | 0,25° × 0,5° | 0,25° × 0,25° |
| Hila | 81 × 720 | 81 × 361 |
| Tiedostokoko | 4 322 528 tavua (~4,12 Mt) | **2 153 902 tavua (~2,05 Mt)** |

Tiedosto **puolittui**, vaikka pituusasteen pisteväli tarkentui kaksin­
kertaiseksi — koska alueen leveys supistui neljäsosaan (360°→90°).

### Sivuhavainto: ECMWF Open Data -portaali ruuhkautui testin aikana (429)

Suora `Client(source="ecmwf")` -haku palautti toistuvasti
"429 Too Many Requests" testin aikana (kirjaston oma uudelleenyritys
120 s välein, enintään 500 kertaa — olisi voinut kestää tuntikausia).
ECMWF:n omasta virheviestistä: data on peilattu AWS/Azure/Google Cloudiin,
ja näitä suositellaan vaihtoehtona. **Testasin `source="azure"` tätä
tehtävää varten** (toimi, ~10-18 s), mutta **palautin tuotantoskriptin
takaisin `source="ecmwf"`:ään** — rajoitus vaikutti tilapäiseltä
yleiseltä kuormahuipulta, eikä tehtävä pyytänyt muuttamaan lähdettä.
**Avoin kysymys:** jos GitHub Actions -ajo alkaa kaatua samaan 429-virheeseen
toistuvasti, harkitse `source="azure"` (tai `aws`) oletukseksi, tai
vaihtoehtoisten lähteiden kokeilujärjestystä (`ecmwf` → `azure` → `aws`).
En tehnyt tätä nyt, koska en halunnut vaihtaa lähdettä pyytämättä.

### Löytyi ja korjattu: pituusasteen rajauslogiikan bugi (ei liity edelliseen)

Ensimmäinen rajausyritys (`lons_all>=330 | lons_all<=60`, vanha koodi
olettaa natiivikonvention olevan 0..359,75) tuotti VÄÄRÄN tuloksen
(nlon=961, alue -180..60 — ei -30..60!) kun data tulikin -180..179,75
-konvention mukaisena GRIB2-vastauksena. **Vanha globaalia aluetta
käyttävä koodi ei koskaan paljastanut tätä**, koska globaalissa
tapauksessa kumpi tahansa konventio tuottaa saman lopputuloksen
(kaikki pisteet valitaan joka tapauksessa). Korjattu normalisoimalla
pituusasteet `((lon+180)%360)-180`-kaavalla ENNEN suodatusta, mikä
toimii oikein riippumatta GRIB-vastauksen native-konventiosta. **Tämä on
yleinen, kaikkiin tuleviin alue-rajauksiin pätevä opetus — kirjattu
CLAUDE.md:hen.**

### Toiminnallisuuden varmistus (simuloitu, ei selaimessa)

Samaan tapaan kuin ICON-EU:n kohdalla, simuloin selaimen tarkan
näytteistyslogiikan (`sampleCloudGridField`: bilineaarinen+smoothstep,
aikasekoitus) Pythonilla uudella datalla:

- Helsinki, Rovaniemi, Oulu: järkevät, vaihtuvat arvot niin "nyt"- kuin
  "+3h"-ajanhetkillä.
- Piste kaukana alueen ulkopuolella (Tokio): palautti `null` siististi,
  ei kaatunut — sama rajatarkistus kuin ICON-EU:lla.
- Aikajanan `maxH`-laskenta ennallaan (ei riipu alueesta), toimii.
- **`nlon=361` ei ole jaollinen 4:llä** — täsmälleen sama UNPACK_ALIGNMENT-
  riski kuin ICON-EU:lla (345) aiemmin. Koska korjasin sen jo YLEISESTI
  (joka tekstuurilatauksella, ei mallikohtaisesti), ECMWF hyötyy samasta
  korjauksesta automaattisesti — ei vaatinut uutta muutosta. Hyvä
  vahvistus sille, että yleinen korjaus oli oikea ratkaisu eikä
  ICON-EU-kohtainen laastari.
- `hasLayers`-tunnistus ennallaan (false, ei valsLow/Mid/High-kenttiä
  tässä tiedostossa) — alapaneelin yksinkertaistettu kaava pysyy samana.

En voinut klikkitestata oikeassa selaimessa (ei selainautomaatiotyökalua),
mutta yllä olevat tarkistukset kattavat kaikki neljä pyydettyä kohtaa
(kartta, merkki, alapaneeli, aikajana) arkkitehtuurin tasolla.

---

## Lisäys, kierros 5: ensimmäinen korjaus ei riittänyt — vahvistus per lataus — **VAHVISTETTU TOIMIVAKSI käyttäjän selaimessa**

Käyttäjä vahvisti ("Toimii!") kovan uudelleenlatauksen jälkeen, että
ICON-EU-taso ja aikajana toimivat nyt oikein. Juurisyy oli siis
lopullisesti: `gl.pixelStorei(gl.UNPACK_ALIGNMENT,1)` pitää asettaa
JOKA kerta juuri ennen `texImage2D`-kutsua (`cwgUploadSlice`), ei
riitä asettaa sitä kertaalleen tason `onAdd`-vaiheessa, koska MapLibre
nollaa GL-tilan muiden tasojen piirron yhteydessä. ECMWF-tasoa ei
kosketettu missään vaiheessa, main-haaraan ei koskettu.

Käyttäjä raportoi kierros 4:n korjauksen jälkeen, että samat viat olivat
yhä voimassa. Mahdollinen syy: `gl.pixelStorei(gl.UNPACK_ALIGNMENT,1)`
asetettiin vain KERRAN tason `onAdd`-vaiheessa. MapLibre piirtää muita
tasoja (taustakartta, OVATION, rajat) SAMALLA WebGL-kontekstilla joka
ruudunpäivityksen välissä ja voi nollata tämän GL-tilan omia
latauksiaan varten ennen kuin `cwgUploadSlice` ajetaan seuraavan kerran
(esim. aikajanaa kelattaessa). Siirsin/toistin `pixelStorei`-kutsun
**joka ikinen kerta juuri ennen** `texImage2D`-kutsua `cwgUploadSlice`:ssa,
ei vain kerran. Tämä on varmempi korjaus, mutta **en ole 100% varma
että tämä oli koko ongelma** — jos virhe toistuu identtisenä
uudestaankin, pyydän konkreettista todistusaineistoa (konsolin
`[pilvihila]`-rivi + tarkka kuvaus/kuva siitä mitä näkyy nyt) ennen
seuraavaa korjausyritystä, sen sijaan että arvaisin lisää.

## Lisäys, kierros 4 — OIKEA VIKA LÖYTYI (WebGL UNPACK_ALIGNMENT)

**Edellisen kierroksen johtopäätös ("ei löytynyt 90° kiertoa, epäilen
selaimen välimuistia") oli VÄÄRÄ johtopäätös oikeista havainnoista.**
Kaikki aiemmat tarkistukseni (GRIB-metadata, 5 pisteen vertailu,
matplotlib-renderöinti) testasivat DATAA ja PYTHON-PUOLEN logiikkaa —
eivät koskaan kulkeneet sen koodin läpi, joka todella piirtää kartan
selaimessa (WebGL-kerros). Data oli ja on edelleen oikein; vika oli
nimenomaan WebGL-tekstuurin latauksessa, jota mikään aiempi testini ei
kattanut.

### VAIHE 1: Synteettiset testikuviot — tulos

Loin kolme testitiedostoa täsmälleen ICON-EU:n muodossa (63×345,
samat lat0/lon0/dlat/dlon): (1) leveysasteramppi (pitäisi näyttää
vaakaraitoja), (2) pituusasteramppi (pitäisi näyttää pystyraitoja),
(3) yksittäinen piste Rovaniemellä.

**En voinut avata selainta itse (ei selainautomaatiotyökalua tässä
ympäristössä).** Sen sijaan rakensin WebGL:n `texImage2D`-tavunpurun
TÄSMÄLLEEN speksin mukaisesti Pythonilla (`UNPACK_ALIGNMENT`-rivitäytteen
simulointi) ja ajoin testitiedostot sen läpi — tämä on matemaattisesti
sama laskenta jonka selaimen GPU-ajuri tekisi, vain Python-puolella
suoritettuna, jotta näin tuloksen itse. *(Jos haluat silti tarkistaa myös
oikeassa selaimessa: voin lisätä testimallit väliaikaisesti takaisin
mallinvalitsimeen — kerro ja teen sen.)*

Tulos (`muistio-liitteet/sim_test_lat.png`, `sim_test_lon.png`,
`sim_test_point.png` — kummassakin rinnakkain "nykyinen (vika)" vs.
"korjattu"):

- **Testi 1 (leveysasteramppi):** nykyinen versio lähes oikein (vaakaraidat
  näkyvät), pieni virheviiva yläreunassa.
- **Testi 2 (pituusasteramppi) — SELVÄ LÖYDÖS:** nykyinen versio näyttää
  **diagonaalisen repeämän/sahalaitakuvion** suorien pystyraitojen sijaan —
  kuvio repeytyy vinoon kulmasta toiseen. Korjattu versio: täydelliset,
  suorat pystyraidat.
- **Testi 3 (piste Rovaniemellä):** nykyinen versio näyttää pisteen
  **siirtyneenä ja hajonneena** useamman sarakkeen levyiseksi tahraksi
  väärässä kohdassa. Korjattu versio: yksi selkeä piste täsmälleen
  oikeassa kohdassa.

→ Tulos osoittaa juuri sen kuvion ("muodot venyneet/vinossa"), jonka
raportoit näkeväsi oikeassa sovelluksessa.

### VAIHE 2: Juurisyy ja korjaus

WebGL:n `texImage2D`-lataus LUMINANCE-tekstuurille (1 tavu/pikseli)
olettaa oletuksena (`UNPACK_ALIGNMENT=4`), että joka rivi vie
`ceil(leveys/4)*4` tavua lähdepuskurista — mutta koodimme
`cwgUploadSlice`-funktio täyttää puskurin TIIVIISTI (rivi = täsmälleen
`nlon` tavua, ei täytettä). Kun `nlon` ei ole jaollinen 4:llä, WebGL lukee
jokaisen rivin väärästä tavukohdasta, ja virhe KASAANTUU rivi riviltä.

- **ECMWF: nlon=720 → 720/4=180, TASAN jaollinen → bugi ei koskaan näkynyt.**
- **ICON-EU: nlon=345 → 345/4=86,25, EI jaollinen → bugi näkyy aina.**

Tämä selittää myös, miksi ECMWF on koko ajan näyttänyt oikein samalla
koodilla — ei ollut sattumaa, vaan juuri tämä nlon-arvojen ero.

**Korjaus** ([index.html](index.html), `cloudWebGLLayer.onAdd`):
lisätty `gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);` ennen tekstuurien
luontia — pakottaa WebGL:n lukemaan puskurin tiiviisti pakattuna aina,
riippumatta hilan leveydestä. **ECMWF:ää ei kosketettu** eikä sen
käytös muutu (720 oli jo valmiiksi oikein tasattu, muutos on
no-op sille).

### VAIHE 3: Aikajana

- **ICON-EU-tiedostossa on 13 aika-askelta, 1 h välein (0-12 h).**
  (ECMWF:ssä 17 askelta, 3 h välein, 0-48 h — ennallaan, ei koskettu.)
- Aikajanan askeleenvalinta (`cloudTimeFloat`/`targetTime`,
  [index.html:1364-1380](index.html#L1364-L1380)) käyttää
  `state.cloudGrid.times`-taulukon ABSOLUUTTISIA aikaleimoja binäärihaulla
  — **se EI oleta ECMWF:n aika-askelvälia eikä mitään muuta mallikohtaista**,
  vaan toimii identtisesti kummalla mallilla tahansa. Simuloin kelauksen
  koko aikajanan ylitse Rovaniemen pisteessä nykyisellä datalla: arvo
  vaihteli selvästi joka askelmalla (57→67→77→84→91→...→75), eli
  KAIKKI 13 aika-askelta todella käytiin läpi — tämä osa toimi jo oikein.
- **Todellinen syy "vain kahden tilan vuorottelu" -vaikutelmaan on
  todennäköisesti VAIHE 2:n UNPACK_ALIGNMENT-bugi itse:** koska
  vääristymä on sama rakenteellinen kuvio JOKAISELLA aika-askeleella
  (se riippuu vain hilan LEVEYDESTÄ, ei sisällöstä), se dominoi näkymää
  niin voimakkaasti, että todelliset, pienemmät erot askelten välillä
  hukkuvat sen alle — näyttää "vain pieneltä liikkeeltä kahden tilan
  välillä", vaikka data oikeasti vaihtuu joka askelmalla. Ei vaadi
  erillistä korjausta VAIHE 2:n lisäksi — tarkista uudelleen korjauksen
  jälkeen.

### Testitiedostojen siivous

`data/clouds-test_lat.json`, `clouds-test_lon.json`, `clouds-test_point.json`
poistettu. Ei jätetty pysyviä muutoksia mallinvalitsimen rekisteriin
(testit ajettiin simulaationa, ei lisätty UI:hin).

---

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

## ICON-EU:n resoluution nosto natiiviin ~7 km:iin + PNG-pakkaus (2026-10)

Käyttäjä huomautti: ICON-EU:n pilvet ja tuuli keskiarvotettiin 0,25
asteeseen (~28 km), jolloin mallin OMAN 7 km tarkkuuden hyöty hukkui
kokonaan. Nyt kun data julkaistaan gh-pages-haaraan ilman kasvavaa git-
historiaa (ks. CLAUDE.md "Julkaisuarkkitehtuuri"), tiedostokoko ei ole
enää yhtä kriittinen kuin suoran main-committoinnin aikana.

### Ensimmäinen yritys: plain JSON natiivilla resoluutiolla - LIIKAA

STRIDE 4→1 (natiivi 0,0625°) nelinkertaistaa pistemäärän sekä lat- että
lon-suunnassa = 16x enemmän pisteitä. **Mitattu OIKEASTI** (haettu yksi
oikea askel DWD:lta, ei arvattu): 249×1377 pistettä, 4 kenttää (vals/
valsLow/valsMid/valsHigh) plain JSON-lukutaulukkoina = **5348 KB/askel**
(koko 31 askeleen ennuste ~162 Mt). Selvästi liikaa "puhelimella
sujuvalle" lataukselle (selain lataa 1-2 askelta kerralla = 10+ Mt heti
avatessa).

### Käyttäjän ehdotus: tiiviimpi binäärimuoto, PNG - TOIMI ERINOMAISESTI

Käyttäjä ehdotti: pilvisyys 0-100 mahtuu yhteen tavuun, ja PNG pakkaa
tasaiset alueet (laajat pilvettömät/pilviset vyöhykkeet ovat
tyypillisiä sääkentissä) paljon tehokkaammin kuin JSON-numerosarjat.
**Testattu OIKEASTI jo ladatulla testidatalla** (ei pääteltynä):

| Muoto | Koko (4 kenttää, 1 askel) | Suhde plain JSON:iin |
|---|---|---|
| Plain JSON (ennen) | 5355 KB | 100 % |
| Raaka tavu + base64 | 1786 KB | 33 % |
| **Harmaasävy-PNG + base64** | **464 KB** | **8,7 % (11,5x pienempi)** |

PNG-pakkaus riitti YKSIN tuomaan natiivin resoluution alle käyttäjän
asettaman ~1 Mt/askel -rajan. Toteutettu `fetch-clouds-icon_eu.py`:ssä
(PIL/Pillow, `Image.fromarray(uint8_array, mode="L")`, pikseliarvo ON
suoraan pilvi-% 0-100, ei venytetty 0-255:een) ja puretaan selaimessa
Canvas-API:lla (`index.html`: `decodePngField()` - `<img>` lataa data-URI:n,
piirretään canvasille, `getImageData()` palauttaa pikseliarvot takaisin
muuttumattomina, koska PNG:ssä ei ole ICC-profiilia/gammakorjausta jota
selain soveltaisi). **Mitattu OIKEASTI tuotantokoodilla** (ei vain
erillisellä vertailuskriptillä): 481 KB/askel natiivilla 249×1377-
hilalla - lähes täsmää etukäteisarvioon.

JS-puolen `ensureCloudStepLoaded()` tunnistaa kentän TYYPISTÄ (merkkijono
= PNG/ICON-EU, taulukko = plain JSON/ECMWF+HARMONIE) - ECMWF/HARMONIE
EIVÄT muuttuneet, vain ICON-EU käyttää uutta muotoa. `ensureLazyStepLoaded()`
tukee nyt myös ASYNKRONISTA decode-funktiota (Promise-ketju tasoittaa
sekä suorat arvot että Promiset automaattisesti) - tarpeen koska
PNG-purku Canvas-API:lla on luonnostaan asynkronista.

### Lopulliset resoluutiot ja mitatut koot (31 askelta)

| | Ennen | Jälkeen | Per askel (mitattu) |
|---|---|---|---|
| Pilvi-ICON-EU (STRIDE 4→1, ~28→7 km) | ~10,1 Mt | **~14,6 Mt** | 481 KB (oli ~335 KB) |
| Tuuli-ICON-EU/taso (STRIDE 4→2, ~28→13,9 km) | ~1,8 Mt | **~6,8 Mt** | 224 KB (oli ~58 KB) |
| Tuuli-ICON-EU yhteensä (4 tasoa) | ~7,2 Mt | **~27,2 Mt** | — |

Pilvi kasvoi vain **+44 %** tiedostokoossa 16-KERTAISELLA pistemäärällä -
PNG-pakkauksen ansiosta. Tuuli jätettiin TARKOITUKSELLA karkeammaksi
(~13,9 km, STRIDE=2, ei PNG - sama base64-raakatavu-muoto kuin ennen) -
"mobiilisujuvuus tärkeämpi tuulelle kuin pilville" oli käyttäjän oma
priorisointi, pilvien visuaalinen tarkkuus (rantaviivat, pienet
pilviaukot) hyötyy enemmän korkeasta resoluutiosta kuin tuulinuolten/
-hiukkasten suunta-arvio.

### Mitä testattiin MISSÄ

**Oikeasti testattu/mitattu (ei arvattu):**
- Natiivi plain-JSON-koko (5348 KB/askel): haettu 2 oikeaa askelta
  DWD:lta tuotantoskriptin (väliaikaisesti 2 askeleeseen rajatulla
  kopiolla) kautta, ei laskettu teoreettisesti.
- PNG/base64/raakatavu-vertailu: käytetty SAMAA äsken haettua oikeaa
  dataa, PIL:n oikea PNG-enkooderi, ei simuloitu pakkaussuhdetta.
- PNG-muodon toiminta TUOTANTOSKRIPTISSÄ (481 KB/askel): ajettu uudelleen
  päivitetyllä skriptillä, ei vain erillisellä vertailulla.
- Tuuli-ICON-EU STRIDE=2: haettu 2 oikeaa askelta, 224 KB/askel mitattu.
- `py_compile` molemmille muutetuille Python-skripteille, `esprima`
  koko `index.html`:lle.

**EI testattu selaimessa (ei selainautomaatiota tässä ympäristössä) -
SUURIN JÄLJELLÄ OLEVA RISKI:**
- `decodePngField()`:in todellinen toiminta oikeassa selaimessa - onko
  Canvas-API:n palauttama pikseliarvo TÄSMÄLLEEN sama kuin PNG:hen
  kirjoitettu (oletus: KYLLÄ, koska PNG:ssä ei ole ICC-profiilia, mutta
  EI nähty silmin). Jos arvot olisivat pyöristyneet/venyneet, kartan
  pilvisyys/klikkauslippu näyttäisivät vääriä prosentteja - helposti
  havaittavissa `?griddebug=1`-parametrilla kun testataan oikeasti.
- Asynkronisen decode-ketjun ajoitus (`ensureLazyStepLoaded`) - toimiiko
  `pending`-lippu oikein kun kaksi askelta ladataan peräkkäin nopeasti
  (esim. aikajanaa raahatessa).
- Koko ennusteen (31 askelta x 481 KB) todellinen latausnopeus/
  "sujuvuus" oikealla mobiiliyhteydellä.

## Pilvidatan kattavuus: tiukka linja (2026-10-22, haara `claude/pilvi-kattavuus`)

**Päätös (käyttäjä):** pilvisyys ja näkyvyys näytetään VAIN, jos piste / oma
sijainti on asetuksissa valitun mallin alueella. Ei varamallia.

**Mallien pilvidatan rajat ja mistä ne määräytyvät** (gh-pagesin `data/*`-tiedostot
2026-10-22; rajat koskevat myös saman mallin tuulta, sama `model_areas.py`):

| Malli | Pohjoisin | Eteläisin | Läntisin | Itäisin | Hila |
|---|---|---|---|---|---|
| ECMWF | 85 °N (ennen 75, nostettu 2026-10-22) | 55 °N | 30 °W | 60 °E | 0,25° (121 x 361) |
| ICON-EU | 70,5 °N | 55 °N | 23,5 °W | 62,5 °E | 0,0625° (249 x 1377) |
| HARMONIE | 73,5 °N | 55 °N | 1 °W | 35 °E (data 34,98) | ~0,045° (412 x 801) |

- **ECMWF: kaikki neljä rajaa hakuskriptistä.** ECMWF IFS on globaali malli;
  rajaus `scripts/model_areas.py` rivi 21
  (`ECMWF_LON0, ECMWF_LAT0, ECMWF_LON1, ECMWF_LAT1 = -30.0, 55.0, 60.0, 85.0`).
  Sovelluksessa sama alue `WEEK.tile` (lat1 85, rows 12) - muutettava yhdessä.
  Käytetään: `fetch-clouds.py` rivit 77 (leveys) ja 88 (pituus),
  `fetch-wind-ecmwf.py` rivit 74 ja 78, `fetch-ecmwf-7d.py` rivi 51 (+ pituus
  samassa `crop()`-funktiossa).
- **ICON-EU: eteläraja skriptistä, muut mallin omasta alueesta.** Leveys
  `scripts/model_areas.py` rivi 25 (`ICON_EU_LAT0, ICON_EU_LAT1 = 55.0, 70.5`),
  käytössä `fetch-clouds-icon_eu.py` rivit 76 ja 187-188. 70,5 °N on ICON-EU:n
  OMA pohjoisraja (natiivialue 29,5-70,5 °N), joten skriptin arvo vain toistaa
  sen - pohjoisemmaksi ei pääse. Pituusastetta ei rajata lainkaan: 23,5 °W -
  62,5 °E on DWD:n natiivi alue sellaisenaan (`fetch-clouds-icon_eu.py` rivi 191,
  `n_lon_native = len(lon_native)`).
- **HARMONIE: kaikki neljä rajaa hakuskriptistä, mutta mallin alueen
  sisältä.** `scripts/model_areas.py` rivi 39 (`HARMONIE_BBOX = "-1,55,35,73.5"`),
  välitetään FMI:n rajapinnalle `fetch-clouds-harmonie.py` rivit 57 ja 80
  (`&bbox=`). Arvot on valittu HARMONIE Scandinavian vinon natiivialueen
  suurimmaksi NaN-vapaaksi suorakulmioksi (MUISTIO-korkeudet-tuuli.md), eli
  pohjoisemmaksi/läntisemmäksi ei pääse ilman NaN-kulmia. Itäraja 34,98 = hilan
  viimeinen piste ennen 35 °E.

ECMWF 7 vrk -ruudut (`e7d-*`) kattavat saman alueen kuin ECMWF (sama rivi 21; 12 x 36 ruutua).

**Ennusteen pituus sovelluksessa** (ajon alusta; julkaisuviiveen ja ajon iän
takia nykyhetkestä eteenpäin jää tyypillisesti 4-10 h vähemmän):

| Data | Askeleet | Pituus | Asetettu |
|---|---|---|---|
| ECMWF pilvet + tuuli | 17 x 3 h | 0-48 h | `fetch-clouds.py` rivi 15, `fetch-wind-ecmwf.py` rivi 36 |
| ICON-EU pilvet + tuuli | 31 x 1 h | 0-30 h | `fetch-clouds-icon_eu.py` rivi 69, `fetch-wind-icon_eu.py` rivi 44 |
| HARMONIE pilvet + tuuli | 31 x 1 h | 0-30 h | `fetch-clouds-harmonie.py` rivi 58, `fetch-wind-harmonie.py` rivi 63 |
| ECMWF 7 vrk (`e7d-*`) | 49 x 3 h + 12 x 6 h | 0-216 h (9 vrk) | `fetch-ecmwf-7d.py` rivi 34 |

Aikajana näyttää enintään 24 h. 7 vrk: HARMONIE/ICON-EU riittävät yleensä
yöhön 1 (osin yöhön 2), ECMWF-pilvihila yöhön 2, sen jälkeen e7d-ruudut.

**Toteutus:**
- `aurora-core.js`: `cloudCovers(g, lat, lon)` (yksi alueen tarkistus;
  `sampleGridField`/`hourCloud` käyttävät sitä) ja `visibilityIndex(p, cf, df)`
  palauttaa `null` ("ei dataa"), kun pilvikerroin puuttuu. Ennen `null` = 1
  (pilvetöntä) -> **alapalkki näytti alueen ulkopuolella esim. 56 %**. Sama
  funktio nyt kaikkialla: Nyt, alapalkki, Tänä yönä (`computeNight`), 7 vrk
  (`weekNight`) ja hälytykset (syy "ei pilvidataa").
- Lippu: pilvisyys "ei dataa". Alapalkki ja Nyt: näkyvyys "–", tulkinnan
  tilalla ilmoitus `cloudOutsideNote()`: "Pilviennuste ei kata tätä aluetta."
  + "Valitse ECMWF asetuksista nähdäksesi koko pohjoisen alueen." (jälkimmäinen
  VAIN jos ECMWF ei ole valittuna JA kattaa pisteen, `ecmwfCovers()`; esim.
  Huippuvuorilla pelkkä ensimmäinen lause). Revontulet, Kp ja pimeys normaalisti.
- Tänä yönä ja 7 vrk: tiivistelmänä sama ilmoitus; V2-kaaviossa ei
  näkyvyyskäyrää, pilvisyyskaistassa "ei dataa" (`.nt-nodata`).
- 7 vrk: alueen ulkopuolella EI ECMWF-varaa (`weekCloud`): tiivistelmänä ilmoitus,
  kaikkien öiden näkyvyys ja pilvisyys "–" (Kp ja kuu näkyvät). Alueella valittu
  malli niin pitkälle kuin se ulottuu, sen jälkeen ECMWF 7 vrk -ruudut
  (käyttäjä hyväksyi 2026-10-22). Jokaisen yön pilvisyyden alla mallin merkki
  (`CLOUD_MARK`: H = HARMONIE, I = ICON-EU, E = ECMWF, yhdistelmä "H+E"), listan
  alla selite (vain käytetyt mallit, valittu ensin), yön tuntinäkymässä
  tiivistelmän alla jaksot "Pilvisyys: HARMONIE 18.23–01.00, ECMWF 01.00–07.44"
  (`weekSrcSegments()`). Korvasi tähtimerkinnän ja `week.otherModel`/`srcModel`.
- Kartta: valitun mallin alueen raja hennona katkoviivana pilvitason ollessa
  päällä (`renderCloudBounds()`, säätövakio `CLOUD_BOUNDS`), revontulikentän
  päällä (muuten 0,7-alfainen kenttä peitti sen).

**Löytyi samalla (korjattu): HARMONIE-pilvet rikki tuotannossa.** Tavallisen
JSON-taulukon purku (`decodeCloudField`) kutsui `toUnitFloat32`:a, joka siirtyi
aurora-core.js:ään 2026-10-21 eikä ollut sovelluksen tuontilistassa ->
"ReferenceError: toUnitFloat32 is not defined", askeleet eivät latautuneet.
ICON-EU (PNG) ja ECMWF eivät käytä polkua. Tarkistettu skriptillä: muita
puuttuvia aurora-core-nimiä ei ole.

**Testi (headless 360 x 640, testihilat mallien oikeilla rajoilla):** Oulu,
Nordkapp, Huippuvuoret ja Siperia (72 °N 140 °E) x ECMWF / ICON-EU / HARMONIE.
Alueen ulkopuolella (ECMWF: Huippuvuoret, Siperia; ICON-EU: Nordkapp,
Huippuvuoret, Siperia; HARMONIE: Huippuvuoret, Siperia) lippu "ei dataa",
alapalkki ja Nyt "–", Tänä yönä ja 7 vrk ilmoitus, kaaviossa ei käyrää ja "ei
dataa"; ECMWF-ehdotus vain ICON-EU:lla ja HARMONIE:lla. Alueella luvut kuten
ennen. Ei JS-virheitä.

### Selvitys: ECMWF-alueen laajennus pohjoisnavalle (2026-10-22; toteutettu 85 °N:iin, ks. seuraava kohta)

Muutos olisi yksi rivi (`model_areas.py` rivi 21, `ECMWF_LAT1 = 90.0`) + sovelluksen
`WEEK.tile.lat1` (ja `rows`). Globaali malli -> data on olemassa, haettava tiedosto
ei kasva (koko maailma ladataan nytkin ja rajataan).

| | Nyt 55-75 °N | 55-90 °N | 55-85 °N |
|---|---|---|---|
| Rivejä (0,25°) | 81 | 141 (x 1,74) | 121 (x 1,49) |
| clouds-ecmwf.json raaka / gzip-siirto | 2 075 / 248 kt | ~3 610 / ~430 kt | ~3 100 / ~370 kt |
| wind-ecmwf-<taso> gzip (vain tuuli päällä) | 377 kt | ~660 kt | ~560 kt |
| e7d-ruutuja (yksi ladataan per piste) | 8 x 36 = 288 | 14 x 36 = 504 | 12 x 36 = 432 |

gzip-koot arvioitu suhteessa (napa-alueen kenttä pakkautunee hieman paremmin,
koska 0,25°:n hila on siellä hyvin tiheä itä-länsisuunnassa). Pilvien
latausajan lisäys (+182 kt / +122 kt):

| Yhteys | 55-90 °N | 55-85 °N |
|---|---|---|
| hidas 3G 0,4 Mbit/s | +3,6 s | +2,4 s |
| nopea 3G 1,6 Mbit/s | +0,9 s | +0,6 s |
| 4G 9 Mbit/s | +0,2 s | +0,1 s |

7 vrk ei hidastu (yksi ruutu per piste). gh-pagesin koko kasvaa ECMWF:n osalta
~1,5-1,7-kertaiseksi (pilvet + 4 tuulitasoa ~7,3 -> ~12,7 Mt).

Huomiot:
- **Kartta näyttää vain 85,05 °N asti** (Web Mercator) -> 85-90 °N olisi
  kartalla näkymätöntä; Huippuvuoret (76,5-80,8 °N) ja Frans Joosefin maa
  (~82 °N) mahtuvat 85 °N:iin. Suositus, jos laajennetaan: 85 °N.
- Pienempi lisä hitaalla 3G:llä kuin ensimmäiset kuvat: MUISTIO-lataus.md
  kohta 6 (ECMWF askelittain kuten ICON-EU/HARMONIE) pienentäisi
  ensimmäisen pilvikuvan ~250 kt:sta ~15-25 kt:iin laajennuksesta riippumatta.
- Hälytykset (`alerts/`) lukevat saman tiedoston -> laajennus koskisi niitä
  automaattisesti.

### Toteutus: ECMWF askel kerrallaan + 85 °N (2026-10-22, haara `claude/ecmwf-askeleet`)

**Muutokset:**
- `scripts/fetch-clouds.py` kirjoittaa koko tiedoston lisäksi
  `clouds-ecmwf-meta.json` (hila, aika-akseli, `run`) ja
  `clouds-ecmwf-step00..16.json` (`{"vals": [...]}`, kuten HARMONIE).
  Työnkulun artifact `data/clouds-ecmwf*.json`.
- Sovellus: `CLOUD_MODELS.ecmwf.lazy = true` (sama laiska lataus kuin
  ICON-EU/HARMONIE). Koko tiedosto (`gridFile`) jää hälytysajolle ja
  varalle: jos metaa ei ole (uusi sovellus ennen ensimmäistä uutta hakuajoa),
  `loadCloudGrid()` lukee koko tiedoston kuten ennen.
- `model_areas.py` ECMWF_LAT1 75 -> 85: pilvet, tuuli ja 7 vrk -ruudut
  (12 x 36). Sovelluksen `WEEK.tile` lat1 85, rows 12.

**Mitattu oikealla datalla** (väliaikainen tutkimustyönkulku GitHubissa, ajo
2026-10-22 00 UTC; gzip -6 = Pagesin siirtokoko):

| Tiedosto | Raaka | gzip |
|---|---|---|
| clouds-ecmwf-meta.json | 0,5 kt | 0,3 kt |
| clouds-ecmwf-stepNN.json (askel 0 / 8 / 16) | 190-200 kt | 18,3 / 21,1 / 18,2 kt |
| clouds-ecmwf.json (koko, 85 °N; ei enää käynnistyksessä) | 3 276 kt | 342 kt |
| wind-ecmwf-<taso>.json (85 °N) | 1 981 kt | 514-586 kt (oli ~377) |
| e7d-ruudut | 432 kpl, 13,2 Mt | ~30 kt/ruutu (yksi per piste) |

85 °N:n rivillä on dataa (askel 0: 100 % pilvistä koko rivillä, ei NaN-arvoja).

**Käynnistys (hidas 3G 0,4 Mbit/s = 50 kt/s):** ennen koko tiedosto
276 kt ≈ 5,5 s; nyt meta + 1-2 askelta ≈ 19-40 kt ≈ 0,4-0,8 s (+ yksi
pyyntö). Laajennuksen osuus askeleesta ≈ +6 kt ≈ +0,1-0,2 s (alle 1 s
-rajan). Selaintesti (synteettinen data): käynnistys hakee `meta, step00,
step02`; Tänä yönä -välilehti hakee lisää askelia vasta avattaessa.
Tuuli ladataan vasta kytkettäessä: ~+150-200 kt/taso hitaalla 3G:llä +3-4 s
(ei muuttunut askelittaiseksi - mahdollinen jatkotyö).

**Käyttöönotto mainiin yhdistämisen jälkeen:** aja käsin `pilvidata-ecmwf`,
`wind-ecmwf` ja `ecmwf-7d` (workflow_dispatch). Siihen asti: pilvet koko
tiedostosta (75 °N), tuuli 75 °N, 7 vrk -ruudut 75-85 °N "–".

### ECMWF-tuuli askel kerrallaan (2026-10-22, haara `claude/tuuli-askeleet`)

- `fetch-wind-ecmwf.py` kirjoittaa koko tason tiedoston lisäksi
  `wind-ecmwf-<taso>-meta.json` + `-step00..16.json` (`{"u","v"}` base64, sama
  muoto kuin ICON-EU/HARMONIE). Työnkulun artifact `data/wind-ecmwf-*.json`.
- Sovellus: `WIND_SOURCES.ecmwf.lazy = true`, `fallbackFull`: jos metaa ei ole,
  `loadWindGrid()` lukee koko tiedoston kuten ennen.
- Tuulen kytkentä hitaalla 3G:llä: ennen koko taso 514-586 kt (~10-12 s), nyt
  meta + 2-3 askelta ~60-100 kt (~1,2-2 s; askel ≈ koko / 17 ≈ 30-35 kt gzip,
  arvio mitatusta koko tiedostosta). Selaintesti: kytkentä hakee `meta, step00-02`;
  ilman metaa koko tiedosto.
- Käyttöönotto: aja `wind-ecmwf` käsin mainiin yhdistämisen jälkeen.

### Ilmoitus alueen ulkopuolella yhdelle riville (2026-10-22)

Ongelma: HARMONIE/ICON-EU valittuna ja piste ECMWF:n alueella -> "Pilviennuste
ei kata tätä aluetta. Valitse ECMWF asetuksista nähdäksesi koko pohjoisen
alueen." vei 66 px (ranska 88 px) normaalin 22 px (Tänä yönä) / 40 px (7 vrk)
sijaan -> taulukot siirtyivät 26-66 px alemmas.

Ratkaisu (`cloudOutsideSumHTML()`): Tänä yönä, 7 vrk ja yön tuntinäkymä
näyttävät yhden rivin: lyhyt teksti `note.noCloudData` ("Alueella ei
pilvidataa") + "ECMWF ›" -nappi (`.nt-ecmwf`, vaihtaa mallin suoraan,
`switchCloudModel('ecmwf')`; vain jos ECMWF kattaa pisteen). `#weekSum`
min-height 40 px. Mitattu 360 px kaikilla viidellä kielellä: tiivistelmä
22 / 40 px kuten normaalisti, teksti ei katkea (zh normaali 7 vrk 42 px, ilmoitus
40 px - 2 px ero). Nyt-välilehti käyttää edelleen lausetta (`cloudOutsideNote`),
ehdotus lyhennetty: "Valitse ECMWF asetuksista."


## Hilan keskitys (2026-10-23, haara `claude/hilan-keskitys`)

**Virhe:** harvennetuissa hiloissa (`STRIDE` > 1) STRIDE x STRIDE -lohkon
keskiarvo merkittiin lohkon ENSIMMÄISEN natiivipisteen (lounaiskulman)
kohdalle. Arvo kuvaa kuitenkin lohkon keskikohtaa -> jokainen arvo
näkyi (STRIDE-1)/2 natiiviaskelta liian etelässä ja lännessä. Lisäksi
viimeinen (osittainen) lohko merkittiin lohkon alkuun -> HARMONIE-tuulen
pohjoisreuna 73,455 vs. pilvien 73,50 N, ja HARMONIE-pilvien ja -tuulen
itäreuna 34,978 vs. natiivi 35,0 E.

**Tarkistetut skriptit:**
| skripti | harvennus | ennen | nyt |
|---|---|---|---|
| fetch-clouds.py (ECMWF) | ei (0,25° natiivi) | oikein | ennallaan |
| fetch-wind-ecmwf.py | ei | oikein | ennallaan |
| fetch-ecmwf-7d.py | ei (ruudut natiivihilasta) | oikein | ennallaan |
| fetch-clouds-icon_eu.py | ei (STRIDE=1) | oikein | ennallaan |
| fetch-wind-icon_eu.py | 2 x 2 | kulmassa | keskitetty |
| fetch-clouds-harmonie.py | 2 x 2 | kulmassa | keskitetty |
| fetch-wind-harmonie.py | 4 x 4 | kulmassa | keskitetty |

**Korjaus:** `scripts/grid_resample.py` (`Resampler`): harvennettu hila
natiivin ensimmäisestä viimeiseen pisteeseen tasavälein (askel <= STRIDE
natiiviaskelta), arvo = natiivisolujen keskiarvo +-puoli askelta pisteen
ympärillä (päällekkäisyyden mukaan painotettu), reunoilla ikkuna kapenee
symmetrisesti. Meta: `dlat = (lat1-lat0)/(nlat-1)` täydellä tarkkuudella.
Sovellus laskee välin rajoista (`AuroraCore.gridGeom`), joten JS-näytteistys
(lippu, infoikkuna, tuulihiukkaset) ja pilvivarjostin (`lat0..lat1`,
`texSize-1`) käyttävät samaa hilaa; `?griddebug`-ruudut piirretään pisteen
ympärille. Aluerajaviiva = `lat0..lat1` = datan todelliset rajat.

**Julkaistu data ennen / jälkeen (gh-pages 2026-10-23, ajot haaralta):**
| malli | ennen | jälkeen |
|---|---|---|
| HARMONIE pilvet | 412 x 801, lat 55-73,50, lon -1-34,978 | 412 x 802, lat 55-73,50, lon -1-35,00 |
| HARMONIE tuuli | 206 x 401, lat 55-73,455, lon -1-34,978 | 207 x 402, lat 55-73,50, lon -1-35,00 |
| ICON-EU tuuli | 125 x 689, 55-70,5 / -23,5-62,5 | sama (rajat jo oikein, vain arvot siirtyivät) |

Pilvien ja tuulen rajat ovat nyt samat kaikilla malleilla.

**Siirtymän suuruus malleittain** (arvon todellinen paikka verrattuna
vanhaan merkintään; korjaus siirtää arvoa koilliseen):
| malli | natiiviaskel | siirto (natiiviaskelta) | km (65 °N) |
|---|---|---|---|
| ECMWF pilvet/tuuli/7 vrk | 0,25° | 0 | 0 |
| ICON-EU pilvet | 0,0625° | 0 | 0 |
| ICON-EU tuuli | 0,0625° | 0,5 + 0,5 | 3,5 pohjoiseen + 1,5 itään = 3,8 |
| HARMONIE pilvet | 0,0225° | 0,5 + 0,5 | 1,25 pohjoiseen + 0,5 itään = 1,4 |
| HARMONIE tuuli | 0,0225° | 1,5 + 1,5 | 3,8 pohjoiseen + 1,6 itään = 4,1 |
Reunoilla lisäksi: HARMONIE-tuulen pohjoisreuna +0,045° (5 km), HARMONIE
pilvien ja tuulen itäreuna +0,022° (~1 km).

**Mitattu julkaistusta datasta:** pintatuulen nopeuden pienipiirteinen osa
(maasto/rannikko, 9 x 9 liukuva keskiarvo poistettu) korreloitiin vanhan
ja uuden datan välillä siirtämällä vanhaa merkintää 0,25 natiiviaskeleen
välein. HARMONIE-tuuli: paras osuma lat +1,50, lon +1,75 natiiviaskelta
(odotettu 1,5 / 1,5; korrelaatio 0,644 -> 0,718). ICON-EU-tuuli: lat +0,25,
lon +0,75 (odotettu 0,5 / 0,5; korrelaatio 0,571 -> 0,583, heikompi
signaali, ajot 6 h eri aikaan). Eri ajojen vertailu -> suuntaa antava,
laskennallinen siirto on tarkka. Pilvistä ei mitattu (ei pysyvää
maastosignaalia).

**Testit:** `tests/test_grid_resample.py` (lineaarinen kenttä säilyy myös
reunoilla, tunnettu huippu lähimmässä pisteessä, tunnetun alueen arvo ja
raja oikeassa kohdassa sovelluksen näytteistyksellä, pilvien ja tuulen
rajat samat, STRIDE=1 ennallaan), `tests/aurora-core.test.mjs`
(`gridGeom`, tunnettu arvo tunnetussa hilapisteessä myös viimeisellä
rivillä). `tests.yml` asentaa nyt Python-paketit (`requirements.txt`).

Tarkistettava oikealla puhelimella: HARMONIE-tuuli ja -pilvet näkyvät
Huippuvuorten etelärannalle (73,5 N) asti, ja lipun tuulirivi ja aluerajaviiva
täsmäävät reunalla.
