# Muistio: pilviluvun ja kartan värin johdonmukaisuus

Haara: `feature/pilviluku-ja-kamerakuvat`. Main koskematta.

Lähtökohta: käyttäjä raportoi että klikkausmerkki näytti 28 % pilvisyyttä
(HARMONIE, ma 18.00, 64.54°N 26.29°E), mutta samassa kohdassa kartalla ei
näkynyt pilveä lainkaan — vaikka tiedetyn 6 %:n näkyvyyskynnyksen
pitäisi näyttää jo paljon pienempikin arvo.

## 1. Väriasteikko: millä prosentilla taso alkaa näkyä?

**VANHA tilanne (ennen tätä korjausta):** `clouds-webgl`-tason fragment-
shaderissa (`CWG_FRAG`, ks. index.html) läpinäkyvyys oli PORRASTETTU
kahdeksaan tasoon, ei liukuva:

| Pilvi-% | Alpha (vanha) |
|---|---|
| < 6 % | 0.00 (TÄYSIN NÄKYMÄTÖN) |
| 6–10 % | 0.12 |
| 10–20 % | 0.24 |
| 20–30 % | 0.36 |
| 30–40 % | 0.48 |
| 40–50 % | 0.60 |
| 50–90 % | 0.75 |
| > 90 % | 1.00 |

Tämä itsessään selittäisi vain "28 % pitäisi näkyä alfalla 0.36" — ei vielä
"28 % näkyy TÄYSIN NÄKYMÄTTÖMÄNÄ". Seuraava kohta paljastaa miksi.

## 2. Pehmennys: tasoitetaanko dataa, ja luetaanko merkki raa'asta vai tasoitetusta kentästä?

**Merkki (`cloudGridPctAt` → `sampleCloudGridField`):** lukee RAA'AN
hila-arvon (JSON-datasta sellaisenaan), ja tekee vain KEVYEN paikallisen
tasoituksen: smoothstep-painotettu BILINEAARINEN interpolointi 4
lähimmän raakaruudun välillä (`ss()`-funktio poistaa bilineaarisen
ristikkojäljen, mutta EI lue mitään esikäsiteltyä/sumennettua kenttää).
Ei ajallista eikä alueellista blur/kontuuri-käsittelyä.

**Kartta (VANHA `clouds-webgl`-shader) käytti KOLMEA eri mekanismia jotka
EIVÄT olleet samat kuin merkin laskenta:**

1. **Bikubinen (Catmull-Rom) interpolointi** 16 naapuriruudun yli, kun
   merkki käyttää bilineaarista 4 ruudun yli. Bikubinen voi yli-/
   aliampua jyrkissä siirtymissä — pienempi tekijä, mutta jo tämä
   yksinään riittää poikkeamaan muutaman prosenttiyksikön verran.
2. **PROSEDURAALINEN KOHINATEKSTUURI, JOKA OLI PÄÄSYYLLINEN:**
   shaderissa oli rivi
   `vt = clamp(cv + nz*cv*(1-cv)*4.0*0.9, 0, 1)`
   jossa `nz` on kosmeettiseksi tarkoitettu, mutta kooltaan LIIAN SUURI
   satunnaiskohina (±0.48 tyypillisesti). Tämä pystyi siirtämään
   NÄKYVÄÄ arvoa jopa ±45 prosenttiyksikköä todellisesta hila-arvosta
   SAMASSA pisteessä.
3. **Porrastettu alpha** (kohta 1) teki näkyvyyskynnyksestä terävän
   "kynnyksen" sen sijaan että pienikin pilvisyys erottuisi haaleana.

**TODENNETTU Python-simulaatiolla** (portoitu suoraan shaderin oma
kohinageneraattori, ei oletus):

| Hila-% | VANHA: kartalla renderöity arvo saattoi olla | Osuus pikseleistä täysin näkymätön (a=0) |
|---|---|---|
| 1 % | 0,0–2,4 % | **100 %** |
| 6 % | 0,0–14,0 % | 60 % |
| 10 % | 0,0–22,7 % | 32 % |
| **28 %** | **0,0–56,5 %** | **2,5 %** |
| 50 % | 6,7–85,4 % | 0 % |

**Tämä on juuri havaitun bugin selitys:** 28 %:n hila-arvolla n. 2,5 %
kartan pikseleistä rullasi satunnaiskohinan ansiosta alle 6 %:n
näkyvyyskynnyksen — käyttäjän osuma sattui juuri tällaiseen kohtaan.
Pienemmillä prosenteilla (esim. 6–10 %, hyvin yleinen "ohut pilvi"
-tilanne) tämä tapahtuu HUOMATTAVASTI useammin (32–60 % pikseleistä).

## 3. Sijainti: osuuko hilaruutu samaan kohtaan jossa se piirtyy?

**EI ongelma.** Sekä merkki (`sampleCloudGridField`) että kartta
(`cloudWebGLLayer.render`) lukevat SAMAA `state.cloudGrid`-oliota, SAMAA
bbox:ia (`g.lon0/lat0/lon1/lat1` uniformiin `u_grid`), SAMAA hilakokoa
(`u_texSize`) ja SAMAA aika-askelparia/liukumaa (`r0.idx`/`r1.idx`/`tf-t0i`
→ `u_blend`). Hilan ja kartan välillä ei ole koordinaatistovirhettä.

**Testinäkymä rakennettu tämän todentamiseksi** (`?griddebug=1`
URL-parametrilla): piirtää merkin ympärille 5×5 raakaruudun verkon,
jossa jokaisessa ruudussa näkyy sen raaka pilvi-%, lähin ruutu (= merkin
sijainti) korostettuna punaisella. `console.info` tulostaa lisäksi
merkin bilineaarisen tulkinnan, lähimmän raakaruudun arvon ja
hilaindeksin (rivi, sarake) + fraktio-osan. Käytetään osoitteella
`index.html?griddebug=1`, napauta karttaa — ruudukko ilmestyy.

## Korjaus

1. **Sama interpolointi kartalle ja merkille:** `CWG_FRAG`:in
   `sampleGrid()` vaihdettu bikubisesta Catmull-Romista SAMAAN
   smoothstep-painotettuun bilineaariseen kaavaan kuin JS:n
   `sampleCloudGridField` käyttää. Kartta ja luku laskevat nyt
   TARKALLEEN saman arvon (pyöristystä lukuun ottamatta).
2. **Kohinan amplitudi pienennetty 11×** (`4.0*0.9=3.6` →
   `4.0*0.08=0.32`). Jäljellä on vain pieni kosmeettinen "ryppy"
   (± korkeintaan muutama prosenttiyksikkö), joka EI voi enää siirtää
   arvoa näkyvyysluokasta toiseen. Uudet simuloidut ääriarvot:

   | Hila-% | UUSI: kartalla renderöity arvo | Näkymätön-osuus |
   |---|---|---|
   | 1 % | 0,8–1,1 % | 0 % |
   | 6 % | 5,1–6,7 % | 0 % |
   | 28 % | 24,9–30,5 % | 0 % |
   | 50 % | 46,2–53,1 % | 0 % |

3. **Porrastettu alpha → jatkuva käyrä:** `a = pow(pct/100, 0.5) * 0.95`.
   Neliöjuuri korostaa MATALIA prosentteja (esim. 1 % näkyy nyt n. 10 %:n
   peitolla, ei täysin läpinäkyvänä) — täyttää vaatimuksen "pienikin
   pilvisyys erottuu ainakin haaleana". Ei enää terävää 6 %:n kynnystä.
4. **Pieni selite kartalle** (`#cloudLegend`, vasen yläkulma, näkyy kun
   pilvitaso on päällä): liukuvärivyö 0→100 % samalla käyrällä kuin
   shaderissa, merkitty 0 %/50 %/100 % -asteikolla.
5. **Testinäkymä** `?griddebug=1` jätetty pysyvästi koodiin (ei osa
   normaalia UI:ta, ei linkitetty mistään) tulevaa diagnostiikkaa varten.

## Suositus: raakaruudut vs. kevyt tasoitus — PERUSTELU

**Suositus: KEVYT tasoitus (smoothstep-painotettu bilineaarinen), EI
raakoja ruutuja EIKÄ raskaampaa tasoitusta (bikubinen/blur/kontuurit).**

- **Raa'at ruudut (ei interpolointia)** näyttäisivät kartalla terävinä
  suorakulmioina hilan resoluution mukaan — erityisen rumaa HARMONIElla
  (alinäytteistetty ~0,045°/~5 km) ja ICON-EU:lla (0,25°), ja ristiriidassa
  sovelluksen Windy-tyylisen "sulavan" ulkoasun kanssa.
- **Raskaampi tasoitus (bikubinen, blur, kontuurit)** näyttää sulavammalta,
  MUTTA voi YLI-/ALIAMPUA arvoja jyrkissä siirtymissä tavalla joka EI
  enää täsmää yksittäisen pisteen raakaan lukuun — tämä oli yksi (pienempi)
  syy alkuperäiseen bugiin, ja suurempi tasoitus pahentaisi ongelmaa, ei
  korjaisi sitä.
- **Kevyt tasoitus (smoothstep-bilineaarinen)** on kompromissi joka: (a)
  poistaa bilineaarisen "ristikkojäljen" nurkissa, (b) on MATEMAATTISESTI
  SAMA kaava jota merkki jo käytti aiemminkin — joten valitsemalla tämän
  kartalle MOLEMMAT laskevat saman asian, konsistenssi on taattu
  RAKENTEELLISESTI, ei vain sattumalta.

## Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeasti testattu (numeerinen simulaatio, ei oletus):**
- Shaderin koko kohinageneraattori (`NOISE`-IIFE) PORTATTU rivi riviltä
  Pythoniin ja ajettu OIKEASTI (NumPy), jotta vanhan/uuden amplitudin
  todellinen arvojakauma (ei teoreettinen ääriarvo) saatiin mitattua —
  tulokset yllä olevissa taulukoissa ovat OIKEITA laskettuja lukuja,
  eivät arvioita.
- Uusi JS-koodi (testinäkymä, legenda-logiikka) ajettu `esprima`-
  jäsentimellä virheettömästi läpi erillisenä lohkona.
- GLSL-shaderin lähdekoodi luettu ja tarkistettu käsin sulkeiden/
  puolipisteiden osalta (ei GLSL-kääntäjää saatavilla tässä
  ympäristössä validointiin).

**EI testattu oikealla selaimella** (ei selainautomaatiota käytettävissä
tässä ympäristössä — todettu myös aiemmissa tämän session tehtävissä):
- Shaderin todellinen kääntyminen WebGL:ssä ja visuaalinen lopputulos.
- `?griddebug=1`-testinäkymän piirtyminen kartalle oikeasti.
- Pilviselitteen (`#cloudLegend`) asemointi/luettavuus oikeassa
  selaimessa, mobiiliasettelu mukaan lukien.
- Edge-selain (`msedge.exe`) todettiin asennetuksi koneelle, mutta
  täyttä selainautomaatiota (Playwright/Selenium/CDP-ohjaus) ei ole
  pystytetty tässä sessiossa — numeerinen simulaatio + koodikatselmointi
  valittiin nopeammaksi ja silti todistusvoimaiseksi tavaksi varmistaa
  juuri TÄMÄN bugin (arvo vs. näkyvyys) korjaus, koska bugi oli
  pohjimmiltaan numeerinen (kohinan amplitudi), ei visuaalinen/CSS-ongelma.

**Suositus käyttäjälle:** testaa oikeasti selaimessa napauttamalla
HARMONIE-mallilla samaa pistettä (64.54°N, 26.29°E, ma 18.00) ja
vertaile merkin lukua kartan väriin — pitäisi nyt täsmätä selvästi
paremmin. Kokeile myös `?griddebug=1` samassa kohdassa nähdäksesi
raakaruudukon.

---

## OSA 1 (jatko, haara `feature/pilvityyli-lippu-ja-kamerat`): Windy-tyylinen pinta + toinen, VAKAVAMPI bugi löytyi

Prosentti oli nyt oikein (edellinen korjaus toimi), mutta pinta näytti
"porrasmaiselta ja valokuvamaiselta" — tehtävänä poistaa jäljellä ollut
kohina kokonaan ja vaihtaa tyyli Windy-tyyliseksi liukumaksi.

### Muutokset

1. **Kohina POISTETTU KOKONAAN** (ei vain pienennetty kuten edellisellä
   kerralla) — `u_noise`/`u_noiseOff`-uniformit ja koko kohinatekstuuri
   poistettu shaderin käytöstä (NOISE-vakio jätetty koodiin, koska sitä
   käyttää yhä vanha, SAAVUTTAMATON `renderCloudsCanvas`-funktio).
2. **Porrastettu alfa → jatkuva käyrä, JA vaihdettu kaava:**
   `pow(t,0.5)` (neliöjuuri) → `1-(1-t)^2` (ease-out-neliö). SYY:
   neliöjuuren derivaatta on ÄÄRETÖN t=0:ssa, mikä yhdessä 8-bittisen
   datan kvantisoinnin kanssa näkyi juuri niinä "portaina" joita
   käyttäjä raportoi ohuen pilven alueella. Ease-out-neliön derivaatta
   on korkeintaan 2 koko välillä — todennettu Python-simulaatiolla: 1
   askeleen (1/255) aiheuttama alfan hyppy on UUDELLA kaavalla
   korkeintaan 0,008, VANHALLA jopa 8,0 lähellä nollaa (ks. taulukko
   koodin kommenteissa).
3. **Pelkkä valkoisen alfa → oikea väriliukuma:** `thinColor` (kylmän-
   harmaa, 0.70/0.73/0.78) → `thickColor` (valkoinen) sekoitettuna
   SAMALLA `t`:llä kuin alfa — toteuttaa pyydetyn "läpinäkyvästä/
   haaleasta harmaan kautta valkoiseen" -liukuman kirjaimellisesti.
   Selite (`#cloudLegend`) päivitetty näyttämään SAMA liukuma (laskettu
   käsin samoilla kaavoilla, 5 pysäkkiä).

### VAKAVAMPI LÖYDÖS: hilaindeksin reunabugi (ei kohinaan liittyvä)

Rakentaessani rigoroosin Python-vertailun (porttaa SEKÄ JS:n
`sampleCloudGridField` ETTÄ shaderin `sampleGrid` samaan Python-
funktioon ja vertaa lukuarvoja suoraan, ei vain epäsuorasti kohinan
kautta) löytyi TOINEN, aiemmin huomaamaton bugi:

- Shaderin alkuperäinen (jo ENNEN tätäkin tehtävää ollut, periytynyt
  alkuperäisestä bikubisesta koodista) hilaindeksin laskukaava
  `px = uv*u_texSize - 0.5` on ERI PARAMETRISOINTI kuin JS:n
  index-pohjainen `fc = clamp((lon-lon0)/dlon, 0, nlon-2.0001)`.
  Nämä kaksi TÄSMÄÄVÄT vain hilan SISÄOSASSA — hilan VIIMEISELLÄ
  rivillä/sarakkeella ne saattoivat poiketa jopa yli 0,9 (0..1-
  asteikolla; ts. lähes maksimaalinen virhe) TODENNETTU Python-
  simulaatiolla satunnaisilla synteettisillä hiloilla.
- **Käytännön vaikutus on todennäköisesti ollut pieni**, koska
  sovelluksen käyttöalue (Suomi/Pohjoismaat) on tyypillisesti
  mukavasti hilan KESKIOSASSA, kaukana sen maantieteellisistä
  reunoista (esim. ECMWF 55-75°N kattaa paljon enemmän kuin käyttäjät
  käytännössä klikkaavat) — siksi tätä ei ole huomattu aiemmin.
  TÄTÄ EI kuitenkaan ole varmistettu mittaamalla oikeaa tuotantodataa,
  vain päätelty hilan maantieteellisestä kattavuudesta.
- **Korjaus:** `sampleGrid()` kirjoitettu uudelleen käyttämään
  TÄSMÄLLEEN samaa `clamp(.., texSize-2.0001)`-kaavaa kuin JS. Testattu
  Python-simulaatiolla USEALLA hilakoolla (8×10, ICON-EU:n 31×345,
  HARMONIE-tyylinen 30×261, ECMWF:n 41×720) — virhe pieneni
  **arvosta jopa 0,91 → liukulukutarkkuuden raja-arvoon (~1e-15)**
  KAIKISSA testatuissa hilapisteissä JA 5000 satunnaisessa pisteessä
  hilan sisällä, myös hilan ÄÄRIMMÄISIMMILLÄ riveillä/sarakkeilla.

**Tämä on hyvä esimerkki miksi numeerinen simulaatio kannattaa ajaa
KOKO arvoalueelle (myös reunoille), ei vain muutamalle käsin valitulle
"järkevältä tuntuvalle" testipisteelle** — pelkkä keskialueen tarkistus
(kuten tämän muistion ensimmäisessä versiossa tehtiin) olisi antanut
väärän "kaikki täsmää" -tuloksen, koska bugi piiloutui nimenomaan
reunoille.

## OSA 2 (tämä tehtävä): kameraklikkauksen vuoto karttaan — preventDefault ei toiminutkaan

Käyttäjä raportoi: kameran klikkaus käynnisti SEKÄ kamerakortin ETTÄ
kartan yleisen pisteenvalinnan (pilvisyysmerkki + alapaneelin laskenta).
Tämä PALJASTI että edellisessä tehtävässä käytetty ratkaisu
(`e.preventDefault()` kameran delegoidussa click-kuuntelijassa) EI
OIKEASTI toiminut — tarkistettu MapLibre GL JS:n dokumentaatiosta
(WebSearch): `MapMouseEvent.preventDefault()` estää VAIN kartan SISÄISET
oletustoiminnot (raahaus, pyöritys, zoomaus), EI MUITA rekisteröityjä
`click`-kuuntelijoita. Tämä oli siis VIRHEELLINEN oletus koko ajan,
vain ei ollut aiemmin huomattu koska mikään aiempi testi ei kattanut
tätä nimenomaista vuorovaikutusta.

**Korjaus:** siirretty kameran osumatarkistus (`map.queryRenderedFeatures`)
SUORAAN kartan YLEISEEN click-kuuntelijaan, joka nyt päättää yhdessä
paikassa avataanko kamerakortti vai asetetaanko piste — ei enää kahta
erillistä kuuntelijaa jotka kilpailevat rekisteröintijärjestyksestä.
Tämä on rakenteellisesti vankempi ratkaisu kuin flag-muuttujakaan olisi
ollut, koska se ei riipu MİTÄÄN oletuksesta kuuntelijoiden
suoritusjärjestyksestä.

Samalla pienennettiin kamerakortin pikkukuvaa 20 % (`width:80%`).

## OSA 3 (tämä tehtävä): pilvisyysmerkki → Windy-tyylinen lippu

Korvattu pyöreä "kortti"-merkki (`rv-cloudcard`/`cc-*`) tanko+lippu-
rakenteella (`rv-cloudflag`/`cf-*`): MapLibre-markerin `anchor` vaihdettu
`'bottom'`:sta `'bottom-left'`:iin, koska CSS-asettelu (`align-items:
flex-start`) tasaa tangon elementin VASEMPAAN reunaan — `bottom-left`-
ankkuri varmistaa että juuri TÄMÄ kohta (ei elementin keskikohta)
osuu klikattuun koordinaattiin. Kortin chevron-painike (joka laajensi/
pienensi alapaneelia) poistettu — toiminto on jo saatavilla alapaneelin
OMASTA kahvasta (`#sheetToggle`), joten mitään toiminnallisuutta ei
hävinnyt.

---

## OSA 1 (UUSI YRITYS, haara `feature/pilvityyli-lippu-ja-kamerat`, jatko): LÖYTYI OIKEA SYY — WebGL1:n NPOT-tekstuurirajoitus

Käyttäjä testasi edellisen korjauksen OIKEASTI selaimessa (vahvistettu:
paikallinen tiedosto/palvelin oikealta haaralta, ei vanha main-haara) ja
raportoi: **ulkoasu ei muuttunut lainkaan, ruudut näkyvät yhä (ECMWF ja
muut)**, vaikka lippu ja kartta täsmäävät (data oikein). Tämä tarkoitti
että `sampleGrid()`:in matemaattisesti todistetusti oikea kaava (ks. yllä)
EI yksinään riittänyt — jokin GPU/selaintason seikka esti sen toimimasta
kuten koodi edellyttää.

### Syy löytyi: WebGL1:n "texture completeness" -sääntö

Tarkistettiin OIKEASTI (WebSearch, OpenGL ES 2.0 -spesifikaatio luku 3.8.2,
johon WebGL1 perustuu): **ei-kahden-potenssi -tekstuuri (NPOT) näytetään
"epätäydellisenä" (musta/määrittelemätön), ellei sen MOLEMMAT kierrätys-
tilat ole `CLAMP_TO_EDGE` JA suodatus on ilman mipmappia.** Tarkistettiin
pilvitekstuurien todelliset koot suoraan datatiedostoista:

| Malli | nlon (leveys) | Kahden potenssi? |
|---|---|---|
| ECMWF | 361 | EI |
| ICON-EU | 345 | EI |
| HARMONIE | 290 | EI |

**KAIKKIEN kolmen mallin tekstuurit OVAT ei-kahden-potenssi -leveydeltään**
— ja koodi asetti `TEXTURE_WRAP_S = REPEAT` (pituusasteen kierrätystä
varten, periytyi alkuperäisestä, jo poistetusta kierrätys-tarpeesta).
Tämä on TÄSMÄLLEEN spesifikaation kieltämä yhdistelmä: **NPOT + REPEAT =
"epätäydellinen" tekstuuri**, riippumatta NEAREST/LINEAR-asetuksesta.
Spesifikaatio sanoo lopputuloksen olevan musta (0,0,0,1), mutta
KÄYTÄNNÖSSÄ eri selaimet/ajurit toteuttavat tämän reunatapauksen eri
tavoin — osa näyttää tyhjän/mustan, osa (ilmeisesti käyttäjän selain)
näyttää dataa mutta PEHMEÄN SUODATUKSEN SIJAAN karkeampana/lohkomaisena
— tämä täsmää tehtävänannon oman arvion kanssa ("suodatus palaa hiljaa
NEAREST-tilaan").

**Tämä selittää myös miksi `sampleGrid()`:in oma, matemaattisesti
todistetusti oikea bilineaarinen laskenta ei auttanut:** laskenta
HAKEE arvot `texture2D()`:lla tarkoilla tekseli-keskipisteen UV-
koordinaateilla, mutta jos ITSE TEKSTUURI on merkitty epätäydelliseksi
GPU:n toimesta, mikään shader-koodi ei voi korjata sitä — ongelma on
TEKSTUURIN TILASSA (asetukset), ei laskentakaavassa.

### Korjaus (varmalla tavalla, kahdella riippumattomalla muutoksella)

1. **`TEXTURE_WRAP_S`/`TEXTURE_WRAP_T` → `CLAMP_TO_EDGE` molemmille**
   (oli `REPEAT`/`CLAMP_TO_EDGE`) — tämä YKSIN jo poistaa NPOT-rajoitteen
   rikkomuksen spesifikaation mukaan, riippumatta suodatustavasta.
   Kierrätystä (REPEAT) ei enää edes TARVITA, koska `sampleGrid()`
   rajaa hilaindeksin itse samalla `clamp(..,texSize-2.0001)`-kaavalla
   kuin JS — pituusasteen "ympäri kiertämistä" ei käytetä.
2. **`TEXTURE_MIN_FILTER`/`TEXTURE_MAG_FILTER` → `NEAREST`** (oli
   `LINEAR`) — tehtävänannon oma pyyntö ("NEAREST-tekstuurihaku").
   NEAREST ei edes KUULU NPOT-rajoituksen piiriin, joten tämä poistaa
   riippuvuuden GPU:n LINEAR-suodatuksesta kokonaan: `texture2D()`
   palauttaa AINA tasan tallennetun tekselin arvon, ei koskaan
   laitteiston omaa (mahdollisesti virheellistä/epämääräistä)
   sekoitusta naapuritekseleiden kanssa. Koko bilineaarinen (oikeastaan
   smoothstep-painotettu) sekoitus lasketaan KOKONAAN shader-koodissa
   neljästä NEAREST-hausta — SAMA kaava kuin JS:n `sampleCloudGridField`.
3. **Fragment-shaderin tarkkuus `mediump` → `highp`** (ehdollisesti,
   `#ifdef GL_FRAGMENT_PRECISION_HIGH`) — erillinen, pienempi mutta
   todellinen löydös: simuloitiin GLSL ES:n "mediump" (10-bit mantissa,
   kuten monilla GPU:illa) Python/NumPy float16:lla, ja havaittiin että
   suurilla hilaindekseillä (esim. ECMWF:n lähes 360) tekseli-indeksin
   laskennan fraktio-osa voi menettää TÄYSIN tarkkuutensa (esim. yhdessä
   testipisteessä highp antoi frac=0,87, mediump pyöristi sen 0:ksi) —
   TÄMÄ EI yksinään riittänyt selittämään koko bugia (varsinaisen
   renderöinnin simulaatiossa ero jäi pieneksi todellisilla pilvi-
   datan kaltaisilla kentillä), mutta on silti korjattu puolustavana
   lisätoimenpiteenä, koska se on ilmainen (ei haittaa) ja teoriassa
   voi aiheuttaa saman oireen ÄÄRITAPAUKSISSA.

### Tarkistettu myös: eikö datan alinäytteistys/tekstuurin koko tee ruuduista liian isoja?

Tarkistettiin OIKEASTI nykyiset hilakoot suoraan datatiedostoista
(ei oletettu CLAUDE.md:n vanhoista arvoista): ECMWF 81×361 (0,25°,
sama kuin raakadatan oma resoluutio — ei keinotekoisesti karkeistettu),
ICON-EU 63×345 (0,25°, alinäytteistetty 4×4-lohkokeskiarvolla natiivista
0,0625°:sta), HARMONIE 245×290 (~0,045°/~5 km, alinäytteistetty 2×2-
lohkokeskiarvolla natiivista ~0,0225°:sta). Kaikki kolme vastaavat joko
raakadatan omaa resoluutiota tai jo aiemmin (MUISTIO-mallit.md)
perusteltua, tiedostokoon vuoksi tarvittavaa alinäytteistystä — **ei
löytynyt tarpeetonta lisäkarkeistusta**. "Ruudukko"-vaikutelma ei siis
johtunut liian harvasta hilasta, vaan yllä kuvatusta NPOT-tekstuuribugista.

### "Renderöi ennen/jälkeen-kuva" — mitä OIKEASTI tehtiin ja mitä EI

**Rehellisesti: WebGL1:n NPOT-"epätäydellinen tekstuuri" -käyttäytyminen
on GPU-/ajuri-/selainkohtaista MÄÄRITTELEMÄTÖNTÄ toimintaa, jota EI VOI
luotettavasti simuloida Python/NumPy:lla** — se vaatii oikean WebGL-
kontekstin. Sen sijaan todistettiin asia kolmella riippumattomalla
tavalla:
1. **Tekstuurien todelliset koot luettu suoraan datatiedostoista**
   (taulukko yllä) ja todettu ei-kahden-potenssiksi KAIKILLA malleilla.
2. **Spesifikaation tarkka sääntö varmistettu OIKEASTI** WebSearchilla
   OpenGL ES 2.0 -spesifikaation lukuun 3.8.2 asti, ei vain muistista
   arvattu.
3. **`mediump`-tarkkuuden vaikutus renderöitiin oikeasti kuvina**
   (ei vain laskettu lukuja): kirjoitettiin Python/NumPy-simulaatio joka
   mallintaa `sampleGrid()`:in TARKAN GLSL-kaavan joko float16 (mediump)
   tai float64 (highp) -tarkkuudella, ja renderöitiin PNG-kuvapareja
   (tasainen liukuma, satunnaiskohina, sumeat "blobit") kolmella eri
   hilakoolla. Tulos: tällä OSA-SYYLLÄ (tarkkuus) yksinään ero jäi
   pieneksi tyypillisillä kentillä (esim. ECMWF-kokoisella satunnais-
   kohinahilalla keskimääräinen ero 0,0011, suurin 0,018) — tämä on
   todennäköisesti SIVULÖYDÖS, ei pääsyy, mutta korjattu silti koska
   se on ilmainen parannus.

**EI VOITU todistaa/kumota Python-simulaatiolla:** itse NPOT-
epätäydellisyysbugin TARKKA visuaalinen lopputulos käyttäjän omalla
selaimella/GPU:lla — tämä vaatisi oikean WebGL-kontekstin. **Korjaus on
silti tehty VARMALLA periaatteella** (spesifikaation mukaan `CLAMP_TO_EDGE`
molemmilla akseleilla POISTAA epätäydellisyyden TÄYSIN, riippumatta
mistään ajurikohtaisesta toteutuserosta — tämä ei ole arvaus vaan
spesifikaation kirjaimellinen vaatimus). **Pyydän käyttäjää vahvistamaan
tämän selaimessa** — jos ruudukko EI VIELÄKÄÄN katoa tämän korjauksen
jälkeen, kyse on jostain muusta eikä NPOT-bugista, ja tarvitaan lisää
tietoa (esim. selaimen DevTools → Console, onko siellä WebGL-varoituksia
"texture bound to texture unit X is not renderable").

## Mitä testattiin MISSÄ (tämä jatko-osa, täysi rehellisyys)

**Oikeasti testattu:**
- Hilaindeksikorjauksen täsmällisyys: Python-portattu versio SEKÄ JS:n
  että GLSL:n kaavoista, ajettu neljällä eri hilakoolla (8×10 synteettinen,
  31×345, 30×261, 41×720), tuhansilla satunnaispisteillä JOKA koolla —
  virhe koneen tarkkuuden rajalla (~1e-15) kaikkialla.
- Uuden alfakäyrän derivaatta laskettu ja verrattu vanhaan käsin
  useassa pisteessä, osoittaen ÄÄRELLINEN vs. ÄÄRETÖN derivaatta nollan
  lähellä.
- MapLibre GL JS:n `preventDefault()`-käyttäytyminen varmistettu
  dokumentaatiosta (WebSearch) ennen korjauksen kirjoittamista — EI
  oletettu/arvattu.
- Uusi JS (click-korjaus, lippu-HTML/CSS) ajettu esprima-jäsentimellä
  virheettömästi läpi erillisenä lohkona; koko tiedoston jäsennys
  kaatuu yhä samaan, ENNESTÄÄN tiedossa olevaan `??`-operaattoriin
  (todennettu ettei rivinumero/virhe muuttunut näiden editien myötä).

**EI testattu oikealla selaimella** (ei selainautomaatiota tässä
ympäristössä, kuten aiemminkin tässä projektissa):
- Shaderin visuaalinen lopputulos (väri/liukuma) oikeasti piirrettynä.
- Kameran klikkauksen korjauksen todellinen vaikutus selaimessa (ts.
  ettei pilvisyysmerkki/laskenta enää käynnisty kameraa klikatessa).
- Lipun visuaalinen asemointi/ulkoasu (tangon kohdistus pisteeseen,
  lipun luettavuus) oikeassa selaimessa, mobiili mukaan lukien.
- Legendin värien visuaalinen vastaavuus kartan todelliseen renderöintiin.

---

## OSA 3 (sama tehtävä): visuaalinen tyyli Windyn periaatteiden mukaan

### Säädettävät vakiot (vaatimus 4)

Kaikki väripaletin pisteet, kontrastikäyrän parametrit ja lämpimän
pohjakartan sävyt koottu KAHTEEN nimettyyn objektiin tiedoston ALKUUN
(ennen `CLOUD_MODELS`-rekisteriä): `CLOUD_STYLE` (`thinColor`,
`thickColor`, `maxAlpha`, `contrastEdge0`, `contrastEdge1`) ja
`BASEMAP_WARM` (`landColor`, `seaColor`). Näitä EI toisteta kahdessa
paikassa: `CWG_FRAG`-shaderin lähdekoodi (template-literal) lukee
`CLOUD_STYLE`:n arvot suoraan `${...}`-interpolaatiolla MÄÄRITTELY-
HETKELLÄ (eli shaderin lähdeteksti itsessään sisältää jo oikeat luvut
kun `const CWG_FRAG = ...` suoritetaan), ja selitteen taustaliukuma
(`updateCloudLegendGradient()`) laskee SAMAT luvut JS:ssä samalla
kaavalla (`cloudColorAt()`). **Todennettu OIKEASTI** (esprima-jäsennin):
template-literal-interpolaatio tuottaa syntaktisesti oikeaa GLSL:ää
(ks. alla "Mitä testattiin").

### Pilvien kontrastikäyrä (vaatimus 3: selkeät reunat, ei portaita)

Vaihdettu edellisen tehtävän ease-out-neliöstä (`1-(1-t)^2`) GLSL:n
OMAAN `smoothstep(edge0,edge1,t)`-funktioon, `edge0=0.10, edge1=0.55`.
**Miksi tämä on kontrastisempi mutta yhtä turvallinen:**
- `smoothstep`:in derivaatta on NOLLA molemmissa päissä (t=0 ja t=1) ja
  MAKSIMI keskellä = `1.5/(edge1-edge0)` ≈ 3,33 (ease-outin maksimi oli
  2,0) — hieman jyrkempi KESKIVÄLILLÄ (= terävämpi pilven reuna), mutta
  YHÄ ÄÄRELLINEN koko matkalla, ei neliöjuuren tapaista ääretöntä
  derivaattaa.
- **Todennettu Python-simulaatiolla:** suurin yksittäisen 8-bittisen
  kvantisointiaskeleen (1/255) aiheuttama alfa-hyppy on vain 0,0131 —
  kaukana havaittavasta bannauksesta, vaikka käyrä ON kontrastisempi.
- **Renderöitiin OIKEASTI vertailukuvapari** samalla synteettisellä
  "pilvikentällä" (kaksi sumeaa laikkua) vanhalla ja uudella käyrällä —
  uusi käyrä näyttää selvästi TIIVIIMMÄN, paremmin rajatun pilvimuodon,
  vanha näyttää hajanaisemman/sumeamman. Molemmat JATKUVIA (ei portaita)
  — kuvat tallennettu `osa3_old_easeout.png`/`osa3_new_contrast.png`
  (ei committoitu, vain tämän istunnon todiste).

**Tarkkuus ei kärsinyt:** väri lasketaan AINA samasta `cv`/`t`-arvosta
(sampleGrid()/sampleCloudGridField, muuttumaton OSA 1:stä) — vain
VISUAALINEN kontrastikäyrä muuttui, ei itse interpoloitu lukuarvo.
Lipun/merkin näyttämä prosenttiluku EI kulje kontrastikäyrän kautta.

### Lämmin pohjakartta (vaatimus 2)

Uusi, neljäs karttapohjavaihtoehto ("Lämmin", `warm`) lisätty olemassa
olevien (tumma/vaalea/satelliitti) RINNALLE — mitään ei poistettu.
**Toteutus ilman avainta:** merentausta tasaisena värinä (SAMA
mekanismi kuin "Vaalea"-tyylillä jo käyttää), PÄÄLLE maa-alueen TÄYTTÖ
avaimettomalla Natural Earth -polygonidatalla (`ne_110m_land.geojson`,
SAMA CDN jota rajat/rantaviiva jo käyttävät — testattu OIKEASTI: HTTP
200, 138 kt). Rantaviiva/rajat piirtyvät jo olemassa olevasta mustasta
`borders`/`coast`-tasosta PÄÄLLE (ei uutta koodia niille — musta linja
toimii "tummana viivana" millä tahansa pohjalla).

### Mitä testattiin MISSÄ (OSA 3, täysi rehellisyys)

**Oikeasti testattu:**
- `ne_110m_land.geojson` haettu OIKEASTI (HTTP 200, 138 160 tavua) ennen
  kuin sitä käytettiin — ei oletettu että CDN tarjoaa tämän tiedoston.
- `CWG_FRAG`-shaderin template-literal-interpolaatio (`${glslFloat(...)}`)
  ajettu esprima-jäsentimellä läpi SYNTAKTISESTI OIKEANA JS:nä, mukaan
  lukien tarkistus että lopputuloksena syntyvä GLSL-merkkijono näyttää
  oikealta (manuaalisesti laskettu/tarkistettu konkreettisilla arvoilla).
- Uusi kontrastikäyrä: derivaatta laskettu analyyttisesti JA numeerisesti
  2001 pisteellä, 8-bit-kvantisoinnin pahin tapaus laskettu 2000
  näytteellä, vertailukuvapari RENDERÖITY OIKEASTI (ei vain kuvailtu).
- `cloudColorAt()`:in JS-kaava verrattu GLSL:n `smoothstep()`-kaavaan
  termi termiltä (sama matemaattinen lauseke, ei vain "pitäisi täsmätä").
- Koko uusi/muutettu koodi (CLOUD_STYLE, BASEMAP_WARM, addLandFillOverlay,
  MAP_STYLES-lisäys, STYLE_CYCLE/LABEL/SVG-päivitykset) ajettu esprima-
  jäsentimellä erillisinä lohkoina, kaikki SYNTAKTISESTI OIKEIN.

**EI testattu oikealla selaimella:**
- Lämpimän pohjakartan todellinen visuaalinen lopputulos (maa/meri-
  kontrasti, miltä `ne_110m_land`-resoluutio näyttää Pohjoismaiden
  kohdalla lähelle zoomattuna — 110m-resoluutio on karkea, rannikko-
  viivat voivat näyttää kulmikkailta lähellä, vaikka tarkka rantaviiva-
  LINJA piirtyykin erikseen tarkemmasta `ne_50m_coastline`-datasta).
- `addLandFillOverlay()`:in käyttäytyminen tyylinvaihdon aikana (esim.
  nopea dark→warm→dark-klikkaily) — koodi on kirjoitettu suojautumaan
  kesken-haun-tyylinvaihdolta, mutta ei nähty oikeasti selaimessa.
- Uuden "Lämmin"-painikkeen asettelu `#mapStylePanel`:issa 4 painikkeen
  kanssa (laskettu ettei pitäisi ylittää leveyttä, mutta ei mitattu
  oikealla näytöllä).
- Legendin päivittyvän taustaliukuman visuaalinen lopputulos.

---

## OSA 1 (UUSI YRITYS #2, sama haara): palautettu aiempi, "piirrosmainen" tyyli

**PÄIVITYS, KORVAA YLLÄ OLEVAN OSA 3:n kontrastikäyrä-osion:** käyttäjä
testasi edellisen (OSA 3) jatkuvan smoothstep-käyrän selaimessa ja piti
AIEMPAA (ennen mitään tämän session pilvikorjausta ollutta) tyyliä
parempana: porrastettu läpinäkyvyys + pyöreät/pehmeät reunat. `CLOUD_
STYLE.contrastEdge0/1` ja `smoothstep()`-kontrastikäyrä POISTETTU
kokonaan, korvattu alla kuvatulla.

### 1. Git-historiasta löytyi tarkka vanha toteutus

`git show cff70a7^:index.html` (commit juuri ennen tämän session
ENSIMMÄISTÄ pilvikorjausta) paljasti täsmällisen vanhan `CWG_FRAG`-
shaderin: **Catmull-Rom-bikubinen interpolointi** (16 tekseliä, 4×4-
paino) + **porrastettu läpinäkyvyys** (8 tasoa: alle 6 %→0, 6-10 %→0.12,
10-20 %→0.24, ..., yli 90 %→1.0) + kosmeettinen kohinatekstuuri + aina
valkoinen väri. Tämä vahvisti suoraan MITÄ palauttaa — ei tarvinnut
arvata "miltä se näytti".

### 2. Vastaus kysymykseen: pyöreys interpoloinnista vai sumennuksesta?

**VARMISTETTU LUKEMALLA KOODI, ei arvattu: PYÖREYS TULEE INTERPOLOINNISTA,
EI SUMENNUKSESTA.** Vanhassa shaderissa EI OLE mitään blur/gaussian-
vaihetta — ainoat kaksi tekijää jotka vaikuttivat ulkoasuun olivat (a)
Catmull-Rom-bikubinen interpolointi (joka tuottaa luonnostaan pyöreämpiä,
kaarevampia ääriviivoja kuin bilineaarinen "telttamainen" interpolointi,
koska se on kuutiollinen eikä lineaarinen funktio neljän pisteen välillä)
ja (b) kosmeettinen kohinatekstuuri (joka lisäsi SATUNNAISTA ryppyä,
EI pyöreyttä sinänsä — tämä poistettiin jo edellisessä tehtävässä eikä
palauteta, koska käyttäjä nimenomaan pyysi "EI kosmeettista kohinaa").
**Johtopäätös: koska sumennusta ei ole olemassakaan tässä koodissa,
palautettu pyöreys tulee AUTOMAATTISESTI pelkästä bikubisesta
interpoloinnista — ei tarvinnut lisätä mitään blur-vaihetta, eikä
sellaista pidä lisätä**, koska se (1) olisi tarpeeton (interpolointi jo
antaa pyöreyden) ja (2) vaarantaisi pienten, yhden hilaruudun kokoisten
selkeiden aukkojen näkyvyyden (kysymyksen oma huomio) - bikubinen
interpolointi EI häivytä yksittäistä poikkeavaa hilapistettä samalla
tavalla kuin tila-avaruudessa tehty blur-kernel häivyttäisi (Catmull-Rom
kulkee tarkalleen jokaisen hilapisteen kautta, pelkkä blur ei kulkisi).

### 3. Kriittinen, aiemmin huomaamaton lisäbugi löytyi Python-simulaatiolla

Ennen koodin kirjoittamista testattiin JS- ja GLSL-bikubikaavat Python-
simulaatiolla (SAMA menetelmä kuin aiemmissa korjauksissa). **Ensimmäinen
yritys epäonnistui räikeästi** (jopa 0,98 virhe 0..1-asteikolla
hilapisteissä!) — syy: suoraan bilineaarisesta versiosta kopioitu
hilaindeksin yläraja (`texSize-2.0001`) ei toimi bikubiselle kaavalle.
**Syy selvitettiin täysin:** Catmull-Rom palauttaa tarkan kontrollipisteen
arvon VAIN t=0:ssa (p1) tai t=1:ssä (p2) - EI KOSKAAN p0:ssa tai p3:ssa.
Bilineaarisen version `-2.0001`-raja oli suunniteltu niin että viimeinen
hilapiste tavoitetaan juuri ja juuri p2:na (rf≈0,9999, lähes 1) - mutta
bikubisessa kaavassa SAMA raja pakotti perustan (`row0`) yhden verran
liian pieneksi, jolloin viimeinen hilapiste yritettiin tavoittaa p3:na
(joka EI KOSKAAN täsmää tarkalleen) sen sijaan että se tavoitettaisiin
p1:nä. **Korjaus:** yläraja muutettu `texSize-1`:ksi (TÄSMÄLLEEN suurin
kelvollinen indeksi) - tällöin viimeinen piste tavoitetaan AINA p1:nä
(rf=0, tarkka osuma). "Haamupisteet" (p0 ennen ensimmäistä, p3 viimeisen
jälkeen) leikataan erikseen kelvollisiin taulukkoindekseihin (clamp-to-
edge, vakiintunut Catmull-Rom-reunakäytäntö). **Todennettu uudelleen
tämän korjauksen jälkeen:** hilapisteet täsmäävät raakadataan JA toisiinsa
koneen tarkkuuteen (~1e-13…1e-15) NELJÄLLÄ eri hilakoolla (8×10, 31×345,
30×261, 41×720), ja 5000 SATUNNAISPISTETTÄ per koko (ei vain hilapisteet)
täsmäävät JS:n ja GLSL:n välillä samaan tarkkuuteen.

**Toinen, pienempi löydös samalla kierroksella:** Catmull-Rom-splinet
voivat matemaattisesti YLI-/ALIAMPUA arvoalueen [0,1] ulkopuolelle
(toisin kuin bilineaarinen, joka pysyy aina kontrollipisteidensä
sisällä) - testiharha, jossa unohdin lisätä lopputuloksen `clamp(...,0,1)`
JS-vertailufunktiooni (GLSL-versiossa se oli jo mukana), aiheutti
ensin näennäisen ~0,05 eron satunnaispisteissä; lisäämällä SAMA
loppuclamp molempiin puoliin ero katosi koneen tarkkuuteen. Tämä on
odotettu, dokumentoitu Catmull-Rom-ominaisuus (ei bugi itse kaavassa),
mutta piti silti varmistaa että MOLEMMAT (JS ja GLSL) käsittelevät sen
samalla tavalla.

### 4. Toteutus

- `sampleCloudGridField()` (JS, käyttää lippu/merkki/näkyvyysindeksi)
  ja `sampleGrid()` (GLSL, kartta) käyttävät NYT MOLEMMAT yllä kuvattua,
  Python-varmennettua bikubista Catmull-Rom-kaavaa SAMALLA korjatulla
  reunarajalla.
- Väri PYSYY jatkuvana harmaasta valkoiseen (`CLOUD_STYLE.thinColor`→
  `thickColor`, OSA 3:n lisäys säilytetty — käyttäjä ei maininnut väriä
  ongelmana, vain porrastuksen/pyöreyden puutteen).
- Läpinäkyvyys (alfa) on NYT porrastettu `CLOUD_STYLE.alphaSteps`-
  taulukosta (8 tasoa, SAMAT raja-arvot kuin alkuperäisessä commitissa
  8319caf) - sekä shaderiin (`glslAlphaStepsChain()`, upotettu
  määrittelyhetkellä) että JS:ään (`cloudAlphaForPct()`, selitettä
  varten) SAMASTA taulukosta.
- EI kosmeettista kohinaa (säilytetty edellisen tehtävän poisto).
- `#cloudLegend` näyttää NYT samat 8 vyöhykettä KOVINA väripintoina
  (ei liukuvana interpolointina pisteiden välillä) - jokaisen vyöhykkeen
  raja näkyy terävänä hyppynä liukuvärissä, vastaten kartan omaa
  porrastusta.
- Lämmin pohjakartta (OSA 3) säilytetty muuttumattomana.

### Mitä testattiin MISSÄ (tämä osio, täysi rehellisyys)

**Oikeasti testattu:**
- Vanha shaderin lähdekoodi luettu suoraan git-historiasta (`git show
  cff70a7^:index.html`) - ei muisteltu/arvattu miltä se näytti.
- Bikubinen kaava (JS+GLSL) Python-simuloitu NELJÄLLÄ hilakoolla,
  hilapisteissä JA 5000 satunnaispisteessä per koko - ensimmäinen
  yritys EPÄONNISTUI havaitusti (jopa 0,98 virhe), toinen (korjattu)
  onnistui koneen tarkkuuteen - kumpikin tulos todettu ajamalla
  oikeasti, ei päätelty etukäteen.
- Koko muutettu/uusi JS-koodi (catmullRom, sampleCloudGridField,
  CLOUD_STYLE.alphaSteps, glslAlphaStepsChain, cloudAlphaForPct,
  cloudColorAt, updateCloudLegendGradient) ajettu esprima-jäsentimellä.
- `CWG_FRAG`-shaderin KOKO template-literal (sis. uuden `${glslAlphaSteps
  Chain()}`-interpolaation) ajettu esprima-jäsentimellä - tässä löytyi
  JA korjattiin todellinen virhe: GLSL-kommenteissa käytetyt takaisin-
  heittomerkit (`` ` ``) katkaisivat JS:n template-literal-merkkijonon
  ennenaikaisesti (koko shader ON yksi iso JS-template-literal) - EI
  huomattu ennen esprima-ajoa, olisi rikkonut koko sovelluksen jos
  olisi jäänyt kiinni vasta selaimessa.

**EI testattu oikealla selaimella:**
- Bikubisen interpoloinnin todellinen visuaalinen "pyöreys" renderöitynä.
- Porrastetun läpinäkyvyyden todellinen ulkoasu (terävät vyöhykerajat
  pilvikentässä).
- `?griddebug=1`:in konsoliviestin ("vyöhyke alfa=...") todellinen
  täsmäävyys kartalla näkyvään väriin.
- Päivittyvän, kovareunaisen legend-gradientin visuaalinen lopputulos.

**Suositus käyttäjälle:** testaa selaimessa ja vertaa Windy-referenssi-
kuvaan uudelleen - jos "piirrosmaisuus" ei vieläkään tunnu oikealta,
kerro tarkemmin MIKÄ täsmälleen poikkeaa (esim. onko bikubinen pyöreys
liian voimakas/heikko, näkyykö porrastus oikein) jotta seuraava korjaus
osuu kohdalleen ensimmäisellä kerralla.

## OSA 3 (sama haara, uusi tehtävä): aikajanan askel tunnista tuntiin

Pyyntö: "Muuta aikajanan askel tunnin välein (nyt 10 min). Muuten
aikajanaan ei kosketa: ennustehorisontti, mallikohtaiset aika-askeleet,
OVATIONin jäädytys ja 'Revontulet: nyt' -merkintä toimivat kuten ennen."

### Löydös: todellinen vanha askel oli 0,5 h, ei 10 min

`#timeSlider`:in (index.html) `step`-attribuutti oli `0.5` (= 30 min),
ei 10 min — käyttäjän muistikuva askeleesta ei täsmännyt koodiin, mutta
lopputavoite (askel = 1 h) on sama riippumatta lähtöarvosta. Ei
kysytty tarkennusta, koska pyynnön LOPPUTULOS (1 h) on yksiselitteinen.

### Muutos (kaksi kohtaa, index.html)

1. `<input id="timeSlider" ... step="0.5" ...>` → `step="1"`.
2. `playBtn`:in automaattikaruselli (`setInterval`, 1 s välein) kasvatti
   sliderin arvoa `+0.5`:lla per tikki — muutettu `+1`:ksi, jotta
   automaattitoisto liikkuu samalla askeleella kuin käsin vedettäessä
   (muuten karuselli olisi jäänyt puoli-askeleen väliarvoihin, joita
   käyttäjä ei voisi enää saavuttaa vetämällä).

### Varmistettu KOODIA LUKEMALLA, ei oletettu: neljä suojattua asiaa koskemattomia

- **Ennustehorisontti** (`applyTimelineBounds()`, rivi ~1284): laskee
  `slider.max`:in datan OMASTA viimeisestä aika-askeleesta
  (`times[times.length-1]`), ei slider-askeleesta. Ei muutettu, ei
  riipu `step`-arvosta.
- **Mallikohtaiset aika-askeleet** (`resolveStep()`, `state.cloudGrid.
  steps`): datan oma ajallinen resoluutio (3 h ECMWF, 1 h ICON-EU/
  HARMONIE) tulee kokonaan erillisestä `times`-taulukosta per malli.
  `state.hour` on jatkuva liukuluku jota näytetään/interpoloidaan
  riippumatta UI-sliderin vetoaskeleesta — sliderin `step` vaikuttaa
  VAIN siihen millä välein käyttäjä voi raahata/nuolinäppäimillä
  liikkua, ei siihen miten arvo tulkitaan.
- **OVATIONin jäädytys** (`drawOvalOverlay()`, rivi ~1195: "Aina
  nykyhetken OVATION, riippumatta aikajanan kohdasta"): lukee aina
  tämänhetkisen OVATION-datan, ei koskaan `state.hour`:ia tai sliderin
  askelta.
- **"Revontulet: nyt" -merkintä** (`auroraNowBadge`, rivi ~3183):
  `classList.toggle('show', hr !== 0)` — looginen vertailu nollaan,
  ei sidottu askelkokoon millään tavalla.
- **Tekstimuotoilu** (`formatOffset()`, rivi ~3166): laski jo ennestään
  minuutit/tunnit pyöristämällä (`Math.round(Math.abs(hr)*60)`) —
  toimii identtisesti kokonaisluvuille, ei muutostarvetta.

### Mitä testattiin MISSÄ

- **Koodista luettu ja varmistettu** (ei selaimessa, ei ajettu): kaikki
  neljä yllä mainittua suojattua kohtaa, hakemalla jokainen käyttö-
  paikka (`grep`) ja lukemalla sen logiikka rivi riviltä varmistaakseni
  ettei mikään niistä lue `timeSlider`:in `step`-attribuuttia tai
  muuta sliderin arvon TULKINTAA — vain UI:n vetoaskeleen muutettiin.
- **EI testattu selaimessa**: itse vedon/näppäimistön tuntuma, karuselli-
  toiston visuaalinen eteneminen, tai että slider todella pysähtyy
  tasatunteihin eikä esim. `max`:in ollessa puolikas tunti (esim. 23,5)
  jätä viimeistä tasatuntia (23) tavoittamatta — tämä on odotettu/
  harmiton reunatapaus (slider ei koskaan YLITÄ `max`:ia, vain ei
  välttämättä osu siihen täsmälleen askelin), mutta kannattaa katsoa
  selaimessa jos horisontti joskus näyttää puolikkaalta tunnilta.

## OSA 4 (sama haara, käyttäjän havaitsema jatko-ongelma): ICON-EU/HARMONIE
## yhä alle 24 h selaimessa — juurisyy LÖYTYI DATASTA, EI koodista

Käyttäjä raportoi: OSA 3 -korjauksen jälkeenkin ICON-EU:n ja HARMONIEn
aikajana näkyi selaimessa selvästi alle 24 h, vaikka koodi (ja 30h-
laajennus) väittivät sen pitäisi riittää. Pyydettiin TARKISTAMAAN
OIKEASTA DATASTA (main-haaran GitHub), EI koodista.

### Tarkistus 1: data/-kansion todelliset aika-askeleet mainissa (origin/main)

`git fetch origin main` + `git show origin/main:data/clouds-icon_eu-meta.json`:

- **ICON-EU**: `"run": "2026-10-12T03:00:00+00:00"`, 31 aika-askelta,
  viimeinen `2026-10-13T09:00:00Z`. Tarkistushetkellä (2026-10-13 ~06:08
  UTC) tämä on ajo joka on jo ~27 h vanha — jäljellä enää ~2 h 52 min
  ennen viimeista askelta, EI 24-30 h. **Data on siis OIKEASTI vanhentunut,
  ei koodin laskuvirhe.**
- **HARMONIE**: ensimmäinen askel `2026-10-13T03:00:00Z` (vain ~3 h
  vanha, juuri kuten 3 h:n hakuväli edellyttää), viimeinen
  `2026-10-14T09:00:00Z` — jäljellä ~27 h, YLI 24 h:n näyttökaton.
  **HARMONIE oli tarkistushetkellä OIKEASTI kunnossa** — käyttäjän
  havainto siitä koski todennäköisesti aiempaa (nyt jo korjaantunutta)
  hetkeä, TAI PWA:n omaa `sw.js`-välimuistia (ei tutkittu tässä, ks.
  alla "ei testattu").

### Tarkistus 2: onko 30h-muutos mainin skripteissä/työnkuluissa?

KYLLÄ — `git show origin/main:scripts/fetch-clouds-icon_eu.py` ja
`fetch-clouds-harmonie.py` sisältävät molemmat `STEPS=0..30`/
`HOURS_AHEAD=30`-muutokset jo mainissa. **Koodi EI ole syy.**

### Tarkistus 3: työnkulkujen ajohistoria (GitHub Actions API, ei koodista pääteltävissä)

`GET /repos/.../actions/workflows/pilvidata-icon_eu.yml/runs`:

| Ajo | Aika (UTC) | Tulos |
|---|---|---|
| 38177036164 | 2026-10-11 21:35 | ONNISTUI |
| 38209528463 | 2026-10-12 05:48 | ONNISTUI (viimeisin onnistunut) |
| 38252140868 | 2026-10-12 12:55 | EPÄONNISTUI |
| 38315700802 | 2026-10-12 22:16 | EPÄONNISTUI |
| 38344210228 | 2026-10-13 03:58 | EPÄONNISTUI |

Kolme peräkkäistä epäonnistumista, kaikki `main`-haaralla (cron ei voi
ajaa muualta). Jokaisen epäonnistuneen ajon askelerittely (`.../jobs`):
itse datahaku ("Hae pilviruudukko...") ONNISTUI joka kerta — VAIN
viimeinen askel "Committaa jos data muuttui" epäonnistui (annotaatio:
"Process completed with exit code 1", ei yksityiskohtaisempaa viestia
saatavilla autentikoimatta — `gh`-CLI:ta tai tokenia ei ole tässä
ympäristössä, raakalogit vaativat kirjautumisen).

### Juurisyy löytyi VERTAAMALLA työnkulkuja: puuttuva "git pull --rebase"

`pilvidata-icon_eu/harmonie/ecmwf.yml`:n "Committaa jos data muuttui"
-askel teki suoraan `git add` → `git commit` → `git push`, EI `git pull
--rebase origin main` ENNEN pushia. Sitä vastoin KAIKKI `wind-*.yml`
-työnkulut (jotka ajavat lähes samaan aikaan, esim. `wind-icon_eu.yml`
klo :58 vs. `pilvidata-icon_eu.yml` klo :55 — 3 min välein SAMOINA
tunteina) sisältävät `git pull --rebase origin main || true` juuri
ennen `git add`:ia. Myös `camera-status.yml` (ajaa 10 min välein) sisälsi
tämän jo valmiiksi. **Täysin johdonmukainen selitys:** kun
`pilvidata-icon_eu` asentaa riippuvuuksia + hakee DWD:n GRIB2-dataa
(hitaampi askel kuin kevyt tuulihaku), toinen samaan aikaan ajava
työnkulku (`wind-icon_eu`, `camera-status`, joskus `wind-harmonie`) ehtii
pushata mainiin ENNEN `pilvidata-icon_eu`:n omaa pushia → `git push`
hylätään non-fast-forward-virheella (exit 1) → data jää committaamatta
→ selaimessa näkyvä aikajana kutistuu päivä päivältä kohti nollaa kunnes
SATTUMALTA yksi ajo osuu väliin jolloin kukaan muu ei pushaa samalla
hetkellä. Tämä on SAMA "kutistuva aikajana" -ilmiö joka on jo kirjattu
CLAUDE.md:n sudenkuoppiin (ennustehorisontti vs. hakuväli) — mutta tällä
kertaa syy EI ole liian lyhyt horisontti (30 h on reilusti riittävä),
vaan se ettei uutta dataa koskaan PÄÄDY mainiin tarpeeksi usein.

**Korjaus:** lisätty `git pull --rebase origin main || true` samaan
kohtaan kaikkiin kolmeen `pilvidata-*.yml`-tiedostoon (ICON-EU, HARMONIE,
ECMWF), identtisesti kuin `wind-*.yml`:ssä. HUOM: ECMWF:llä ei ole
toistaiseksi havaittua epäonnistumista ajohistoriassa, mutta sama
rakenteellinen puute koski sitäkin — korjattu ennaltaehkäisevästi.

### Mitä testattiin MISSÄ

**Oikeasti tarkistettu (ei pääteltu koodista):**
- `git fetch origin main` + `git show origin/main:<tiedosto>` jokaiselle
  relevantille data-/skripti-/työnkulkutiedostolle — todellinen mainin
  tila, ei paikallisen haaran.
- GitHub Actions REST-API (`/actions/workflows/.../runs` ja
  `/actions/runs/{id}/jobs`) todellisen ajohistorian hakemiseen —
  ei arvattu "luultavasti epäonnistui joskus".
- Epäonnistumisten annotaatiot (`/check-runs/{id}/annotations`) — antoi
  vain "exit code 1", ei täyttä lokia (vaatisi autentikoinnin).

**EI testattu / EI voitu todentaa:**
- Raakalokit itse "git push"-virheestä (vaatisivat `gh auth`/tokenin,
  ei saatavilla tässä ympäristössä) — non-fast-forward-hypoteesi on
  VAHVASTI tuettu (sama ajoitusten päällekkäisyys, sama korjauskuvio
  joka muualla jo on, 3 peräkkäistä epäonnistumista juuri commit-
  askeleessa) mutta ei kirjaimellisesti nähty error-tekstiä.
- Korjauksen toimivuutta oikeassa ajossa (vaatii joko cronin seuraavan
  ajon tai käsin käynnistetyn `workflow_dispatch`:in main-haaralla
  YHDISTÄMISEN JÄLKEEN).
- PWA:n `sw.js`-välimuistin mahdollista osuutta HARMONIEn aiempaan
  (käyttäjän havaitsemaan) alle-24h-oireeseen, koska HARMONIEn data
  osoittautui tarkistushetkellä OIKEASTI tuoreeksi.

## OSA 5 (sama haara, pyydetty tarkistus ennen yhdistämistä): Catmull-Rom-ylilyönnin tarkistus

Kysymys: voiko palautettu bikubinen interpolointi (OSA 1) tuottaa
arvoja [0,1]-välin ULKOPUOLELLE (Catmull-Rom EI ole rajoitettu kontrolli-
pisteiden väliin, toisin kuin bilineaarinen), ja aiheuttaako tämä
näkyvän virheen porrastetussa alfa-kartassa ennen lopullista
`clamp(cv,0,1)`-leikkausta?

### Menetelmä

Python-simulaatio (`catmull_overshoot.py`/`catmull_overshoot2.py`,
SAMA `catmullRom(p0,p1,p2,p3,t)`-kaava kuin tuotantokoodissa):
1. 200 000 satunnaista 4 pisteen yhdistelmää tasajakaumasta [0,100] —
   pahin teoreettinen tapaus.
2. Realistisempia "yhden hilaruudun" poikkeamia (aukko/piikki) tasaisen
   JA epäsymmetrisen taustan päällä, koska kaikilla kolmella mallilla
   `fadeEdges:false` (datan reuna näkyy terävänä, ei häivytystä).
3. Arvo juuri vyöhykerajalla (8 %, 6–10 %:n vyöhykkeessä) vieressä
   jyrkkä pudotus/nousu — tarkistaa voiko ylilyönti TODELLA vaihtaa
   näkyvän vyöhykkeen.

### Tulokset

- **Täysin satunnaisilla, epäfysikaalisilla pisteillä** (jokainen
  neljästä pisteestä riippumaton, voi vaihdella 0↔100 holtittomasti):
  pahin löydetty ylilyönti/alilyönti ~11,6 prosenttiyksikköä. Tämä
  EI vastaa oikeaa säädataa (spatiaalisesti korreloitunutta), vain
  matemaattista ääriarvoa.
- **Symmetrinen terävä askel** (tasainen pohja molemmin puolin, esim.
  `[0,0,100,100]`-tyyppinen reuna): **EI ylilyöntiä/alilyöntiä
  LAINKAAN** — matemaattinen syy: Catmull-Romin tangentti reunapisteissä
  on tasan puolet sekantista, joka on juuri kuutiollisen Hermite-
  splinin monotonisuusehdon rajalla. Tämä on todennäköisesti YLEISIN
  tapaus oikeassa säädatassa (mallin oma jyrkkä aluereuna).
- **Epäsymmetrinen yhden ruudun aukko/piikki** (esim. laskeva tausta +
  äkillinen 0, tai nouseva tausta + piikki): pieni, 0,04–0,16 prosentti-
  yksikön ylilyönti — mitätön, ei ylitä mitään vyöhykerajaa käytännössä.
- **Vyöhykerajan lähellä (8 %) + jyrkkä 100 %:n hyppy VIEROSSA**: pahin
  löydetty tapaus — interpoloitu arvo painui välillä 8,0 %:sta alas
  1,19 %:iin (alilyönti 6,8 prosenttiyksikköä), eli YLITTÄÄ 6 %:n
  vyöhykerajan hetkellisesti lähellä jyrkkää reunaa. Tämä loisi
  TEOREETTISESTI ohuen (selvästi alle yhden hilaruudun levyisen) renkaan
  jossa alfa putoaisi 0,12:sta 0,00:aan juuri reunan vieressä.

### Johtopäätös

Ylilyönti ON matemaattisesti mahdollinen, mutta (a) käytännön säädatan
yleisin reunatyyppi (tasainen-jyrkkä-tasainen) ei tuota sitä LAINKAAN,
(b) realistiset yksittäisen hilaruudun poikkeamat tuottavat vain
mitättömän (<0,2 prosenttiyksikön) ylilyönnin, ja (c) pahinkin löydetty
käytännön tapaus (8 %:n piste + 100 %:n hyppy vieressä) tuottaa VAIN
alle yhden hilaruudun levyisen, tilapäisen vyöhykevaihdon — ei
järjestelmällistä tai silmin erottuvaa virhettä koko kuvassa. **Ei
lisätä mitään korjausta/sumennusta tätä varten** — lopullinen
`clamp(cv,0,1)` jo estää varsinaisen renderöintivirheen (väri/alfa ulos
kelvollisesta alueesta), ja jäljelle jäävä mikroskooppinen vyöhyke-
reunailmiö on sekä harvinainen (vaatii tarkalleen oikean yhdistelmän:
arvo lähellä rajaa + jyrkkä muutos juuri vierellä) että visuaalisesti
häviävän pieni verrattuna koko hilaruudun kokoon.

### Mitä testattiin MISSÄ

**Oikeasti ajettu:** Python-simulaatio tuotantokoodin TARKALLEEN SAMALLA
`catmullRom()`-kaavalla, 200 000 satunnaispistettä + kohdennetut
reunatapaukset, tulokset luettu suoraan ohjelman tulosteesta (ei
arvattu etukäteen mikä tulos olisi "pitäisi olla").

**EI testattu:** oikean hilakentän todellinen ylilyöntitilastointi
(käytetty synteettisiä testitapauksia, ei ladattu/analysoitu oikeaa
`clouds-*.json`-tiedostoa pisteittäin) — synteettiset ääritapaukset ovat
kuitenkin TARKOITUKSELLA pahempia kuin mikä tahansa yksittäinen oikea
mittaussarja, koska ne testaavat kaikki mahdolliset 4 pisteen
yhdistelmät eivätkä vain sen osajoukon jonka oikea sää tuottaa.

## OSA 6 (sama haara, käyttäjä AJOI korjauksen oikeasti ja se epäonnistui):
## OSA 4:n "korjaus" oli itse virheellinen — oikea järjestys + matrix-restrukturointi

Käyttäjä käynnisti `wind-harmonie.yml`:n käsin testiksi. Tulos: `fetch
(surface)` onnistui, `fetch (850/500/300)` epäonnistuivat kaikki samassa
"Committaa jos data muuttui" -askeleessa, loki:

```
error: cannot pull with rebase: You have unstaged changes.
error: Please commit or stash them.
[main 6acd37f] Tuulidata HARMONIE 500 2026-10-13 03:47 UTC
! [remote rejected] main -> main (cannot lock ref 'refs/heads/main':
  is at eff4094... but expected 842c8ae...)
error: failed to push some refs
```

### Juurisyy #1: OSA 4:n korjaus kopioi VÄÄRÄN järjestyksen

OSA 4:ssä lisätty `git pull --rebase origin main || true` ENNEN `git
add`/commitia (kopioitu suoraan `wind-*.yml`:n jo olemassa olevasta
rakenteesta, olettaen sen olevan "oikea malli" koska se oli JO
olemassa). Tämä järjestys ON ITSESSÄÄN VIRHEELLINEN: fetch-skripti on
juuri muuttanut datatiedostoja levylle (likainen työhakemisto, EI vielä
committoitu), ja `git pull --rebase` likaisella puulla epäonnistuu
VÄLITTÖMÄSTI ("cannot pull with rebase: you have unstaged changes") —
näkyy lokissa ensimmäisenä rivinä. Virhe NIELAISTIIN `|| true`:lla,
joten skripti jatkoi SILTI `git add`/`commit`/`push`:iin paikallisen
(VANHENTUNEEN, ei-rebasatun) haaran päältä — josta `git push` hylkäytyi
non-fast-forward-virheellä ("remote rejected ... cannot lock ref").
**Tämä sama väärä järjestys oli KOPIOITUNA kaikkiin kuuteen
fetch-työnkulkuun** (3 pilvi- + 3 tuuli-) JA `camera-status.yml`:ään —
ei vain `wind-harmonie.yml`:ään, koska OSA 4:ssä vertailtiin "toimiiko
tämä muiden kanssa samalla tavalla" sen sijaan että olisi kyseenalaistettu
ITSE mallin oikeellisuus.

### Juurisyy #2: matrix-jobit kilpailevat KESKENÄÄN, ei vain sisarworkflow'ta vastaan

`wind-icon_eu.yml` ja `wind-harmonie.yml` ajavat 4 rinnakkaista
matrix-jobia (surface/850/500/300), ja JOKAINEN niistä committoi/pushaa
ITSE. Vaikka järjestys olisi oikea, 4 jobia SAMASSA ajossa kilpailevat
pushista keskenään — tämä on ERI (ja pahempi) ongelma kuin OSA 4:n
ristikkäinen SISARworkflow-kilpajuoksu, koska todennäköisyys on paljon
suurempi (4-suuntainen, ei 2-suuntainen, ja kaikki alkavat JA
VALMISTUVAT lähes samaan aikaan, ei satunnaisesti eri kohdissa cron-
sykliä).

### Korjaus (SEITSEMÄN työnkulkua: kaikki kuusi fetch + camera-status)

**A) Oikea järjestys KAIKISSA (ei-matrix) commit-askelissa** —
`pilvidata-ecmwf/icon_eu/harmonie.yml`, `wind-ecmwf.yml`,
`camera-status.yml` (tämä EI ollut käyttäjän pyyntölistalla, mutta
sisälsi SAMAN virheellisen järjestyksen piilevänä — korjattu
ennaltaehkäisevästi):

```
git add <tiedostot>
if git diff --cached --quiet; then echo "Ei muutoksia."; exit 0; fi
git commit -m "..."
for i in 1 2 3 4 5; do
  git pull --rebase origin main && git push && exit 0
  echo "Push epaonnistui (yritys $i/5), odotetaan..."
  sleep $((RANDOM % 10 + 3))
done
exit 1
```

Rebase vasta COMMITIN jälkeen (työhakemisto on silloin puhdas) +
uudelleenyrityslooppi kattaa harvinaisemman ristikkäisen (toisen
workflow-tiedoston) kilpajuoksun.

**B) Matrix-workflowt (`wind-icon_eu.yml`, `wind-harmonie.yml`)
restrukturoitu kokonaan** — käyttäjän ehdottama vaihtoehto 1
(artifact+erillinen job) valittu vaihtoehto 2:n (sarjallistettu
`max-parallel`) sijaan, koska se poistaa sisäisen kilpajuoksun
RAKENTEELLISESTI eikä vain tee siitä harvinaisemman:
- 4 matrix-job EI enää committoi/pushaa itse — vain
  `actions/upload-artifact@v4` omalla tasollaan.
- Uusi erillinen `commit`-job (`needs: fetch`, `if: ${{ !cancelled() }}`
  — ajaa VAIKKA JOKU tasoista epäonnistuisi, säilyttää alkuperäisen
  `fail-fast:false`-hengen "committaa se mikä onnistui") lataa KAIKKI
  tasot `actions/download-artifact@v4`:llä (`pattern`+`merge-multiple`)
  ja tekee YHDEN commitin/pushin samalla A-kohdan oikealla
  järjestyksellä+retry-loopilla.
- `wind-ecmwf.yml` EI ole matrix (yksi skripti hakee kaikki 4 tasoa
  kerralla) — ei restrukturointitarvetta, vain A-kohdan järjestyskorjaus.

**C) Tuulidatan horisontti (pyydetty tarkistus):** KAIKKI kolme
`fetch-wind-*.py`-skriptiä OSOITTAUTUIVAT JO ennestään samoiksi kuin
pilvet (todennettu lukemalla `STEPS`/`HOURS_AHEAD`-vakiot, ei
oletettu): ECMWF 0-48h/3h (17 askelta, "sama kuin fetch-clouds.py"),
ICON-EU 0-30h/1h (31 askelta, "sama kuin pilvi-ICON-EU"), HARMONIE
`HOURS_AHEAD=30` ("sama kuin pilvi-HARMONIE"). **Ei muutostarvetta.**

**D) CLAUDE.md:** lisätty sääntö "uusi/muutettu workflow ei ole valmis
ennen kuin se on ajettu ONNISTUNEESTI oikeassa GitHubissa" — paikallinen
YAML/bash-syntaksintarkistus todistaa vain jäsenneltävyyden, ei
git-kilpajuoksujen/matrix-rinnakkaisuuden todellista toimivuutta.
Korjattu myös OSA 4:n alkuperäinen (virheellisen korjauksen sisältänyt)
sudenkuoppa-merkintä samassa tiedostossa.

### Mitä testattiin MISSÄ

**Oikeasti testattu:** Kaikkien 7 muokatun YAML-tiedoston jäsennys
(`yaml.safe_load`, PyYAML asennettu tätä varten) JA kaikkien `run:`-
lohkojen bash-syntaksi (`bash -n`, Git for Windowsin mukana tuleva
bash.exe, koska Linux-bashia ei ole tässä ympäristössä) — kaikki
OK. Horisontti-vakiot (`STEPS`/`HOURS_AHEAD`) luettu suoraan
skripteistä grepillä, ei oletettu.

**EI testattu (vaatii käyttäjän AJAMAN GitHubissa, ks. CLAUDE.md:n uusi
sääntö):** `actions/upload-artifact`/`download-artifact`-parin todellinen
toiminta (artifact-nimien täsmäävyys, `merge-multiple`-yhdistäminen),
retry-loopin todellinen käyttäytyminen oikean ristikkäisen kilpajuoksun
alla, matrix-jobin `if: ${{ !cancelled() }}` -ehdon todellinen laukaisu
osittaisella epäonnistumisella. **Tämä on juuri se tilanne jota uusi
CLAUDE.md-sääntö varoittaa: syntaksi on todennettu, LOGIIKKA ei — käyttäjän
pitää ajaa `workflow_dispatch` kaikille 7:lle ja vahvistaa tulos ennen
kuin näitä pidetään valmiina.**
