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
