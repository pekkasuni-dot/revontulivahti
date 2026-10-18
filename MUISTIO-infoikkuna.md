# MUISTIO: Infoikkunan uudistus, avaruussää, säävalikko ja aikajana (2026-10)

Haara: `claude/infoikkuna-avaruussaa`. Tehtävänanto: kohdat A–H (käyttäjän
viesti 2026-10-17). Tähän on kirjattu toteutuksen ratkaisut, avoimet
kysymykset ja testitulokset. Kuvakaappaukset: `muistio-liitteet/infoikkuna/`.

## Avoimet kysymykset (päätä nämä)

1. **Karttapohjan nappi puuttui pinon järjestyksestä** (kohta 3 luetteli
   sää · revontulet · kamerat · info · oma sijainti). En poistanut sitä,
   koska ohje oli jättää epäselvä kohta tekemättä. Nappi on nyt pinon
   viimeisenä, oman sijainnin alla. Vaihtoehdot: (a) jätetään näin,
   (b) siirretään asetusikkunaan, (c) poistetaan kokonaan.
2. **Revontulien luku eroaa lipussa ja infoikkunassa.** Lippu näyttää
   OVATION-arvon bilineaarisesti pisteessä (sama kuin kartan väri).
   Infoikkunan laatikko ja indeksi käyttävät lähintä 1°-ruutua ja katsovat
   lisäksi 3° pohjoisemmaksi painolla 0,6 (horisontissa näkyvä ovaali).
   Esimerkki testidatalla: lippu 0 %, infoikkuna 16 %. Ero on ollut
   olemassa jo ennen tätä tehtävää (alapaneeli toimi samoin kuin nyt
   infoikkuna), joten en muuttanut kaavaa. Yhtenäistetäänkö luvut, vai
   pidetäänkö ero, koska ne kertovat eri asioista ("revontulet tässä
   pisteessä" vs. "näkyvätkö revontulet täältä")?
3. **Tyhjä tila Nyt-välilehden yläreunassa nykyhetkellä.** Periaate
   "aikajanan liikuttaminen ei saa siirtää mitään" vaatii, että
   huomautukselle ("Kartta näyttää klo 23.00 …") on tila varattuna aina.
   Nykyhetkellä tila on siis tyhjä, noin kahden rivin korkuinen (ks. kuva 09).
   Vaihtoehto: nykyhetkellä samassa tilassa näytetään esim. "Kartta näyttää
   nykyhetken." Tätä en tehnyt, koska tehtävänanto ei sitä pyytänyt.
4. **Avaruussään osoitteita ei voitu hakea testiympäristöstä**, koska
   NOAA:n palvelin oli estetty. Selvitin osoitteet näin:
   - `products/solar-wind/mag-1-day.json` ja `plasma-1-day.json` on
     **poistettu** NOAA:n Service Change Notice 26-21:n mukaan (n. 30.4.2026).
     Korvaajat ovat `json/rtsw/rtsw_mag_1m.json` ja `rtsw_wind_1m.json`.
     Kenttien nimet (`bz_gsm`, `bt`, `proton_speed`, `proton_density`,
     `active`, puuttuva arvo -9999) perustuvat SCN:ään ja avoimen
     lähdekoodin `solar-mcp`-projektin jäsentimeen, eivät omaan hakuun.
   - Koodi käyttää ensin rtsw-osoitteita ja vanhoja varalla. Jäsennin lukee
     sekä uuden muodon (lista olioita) että vanhan (`[[otsikot],[arvot]]`),
     ja aikaleiman sekä merkkijonona että lukuna.
   - Tiedoston `text/aurora-nowcast-hemi-power.txt` muoto on oletettu
     ("havaintoaika ennusteaika pohjoinen etelä", kommenttirivit `#`).
     Jäsennin etsii aikaleimat säännöllisellä lausekkeella ja ottaa
     pohjoisen arvoksi ensimmäisen niiden jälkeisen luvun.
   - **Tarkista oikealla sivulla:** jos avaruussäässä näkyy "–", konsolissa
     on varoitus "Avaruussää (mag/plasma/GW): …".
5. **Oma sijainti valitun pisteen rinnalla.** Infoikkunan "Oma sijainti"
   -nappi ja pinon paikannusnappi näyttävät oman sijainnin, mutta jättävät
   valitun pisteen lipun kartalle. Ennen paikannus korvasi pisteen. Lipun
   sulkeminen poistaa valinnan kuten kohdassa 15 pyydettiin. Onko tämä oikein?
6. **Infonappi on aina näkyvissä.** Se ei piiloudu valikkonapista eikä
   asetusten "Näkyvät napit" -listasta, koska se on infoikkunan ainoa
   avaustapa. Oma sijainti toimii samoin kuin ennenkin.
7. **Kielet:** tehtävässä luki "kaikilla kolmella kielellä", mutta
   sovelluksessa on viisi kieltä (fi, en, zh, es, fr). Uudet tekstit on
   tehty kaikille viidelle. Kiinankieliset on merkitty `// TARKISTAMATON`,
   espanjan- ja ranskankieliset `// TARKISTA`.
8. **Mallin ajoaika ("Päivitetty") HARMONIElle on likiarvo.** ICON-EU:n
   meta-tiedostossa on `run`-kenttä. ECMWF:n ensimmäinen aika-askel on
   ajon alkuhetki. HARMONIEn ensimmäinen aika-askel on FMI:n /download-
   rajapinnan ensimmäinen saatavilla oleva hetki. Tarkka arvo vaatisi
   `run`-kentän lisäämistä hakuskriptiin. En tehnyt sitä, koska CLAUDE.md
   kieltää muuttamasta datan hakua ilman erillistä pyyntöä.
9. **Bz-vihjeen kynnysarvot** ovat oletuksiani: liukuva Bz ≤ −5 nT,
   etelään vähintään 20 min ja Bt ≥ 6 nT. Ne ovat säädettävissä
   kohdassa `SPACE_WX.hint` (index.html).

## Näkyvyysindeksi (kohta 19): tarkka kaava

Kaava on ennallaan. Muutos on, että sitä lasketaan nyt aina nykyhetkelle
(`new Date()`), ei aikajanan ajankohdalle:

```
indeksi = round( p/100 × pilvikerroin × pimeyskerroin × 100 )   [%]

p (revontulet, %)  = max( OVATION[lähin 1°-ruutu],
                          0,6 × OVATION[3° pohjoisempi ruutu] )
                     (OVATION puuttuu -> karkea arvio Kp:stä, merkitty *)
pilvikerroin       = ICON-EU (korkeuserittely):
                       1 − min(1, 0,95 × alapilvet + 0,65 × keskipilvet + 0,30 × yläpilvet)
                     ECMWF ja HARMONIE (vain kokonaispilvisyys):
                       1 − kokonaispilvisyys
                     (piste mallin alueen ulkopuolella -> 1)
pimeyskerroin      = 0, kun aurinko ≥ −6°
                     1, kun aurinko ≤ −12°
                     lineaarinen välillä
```

**0,95-painotus on mukana vain ICON-EU:lla**, koska vain sillä on
korkeuserittely (`hasLayers`). ECMWF:llä ja HARMONIElla painotusta ei ole.
Pilvisyys-laatikko näyttää kokonaispilvisyyden (sama luku kuin lipussa),
ei painotettua arvoa.

Tulkinta (yksi lause, `info.verdict.*`):

| Ehto (tässä järjestyksessä) | Tulkinta |
|---|---|
| pimeys = 0 | liian valoisaa |
| indeksi ≥ 60 | hyvät mahdollisuudet |
| indeksi ≥ 30 | kohtalaiset |
| p ≥ 30 ja pilvettömyys < 40 % | pilvet peittävät |
| muuten | heikot |

**Pimeys (kohta 21)** käyttää samaa −6°:n rajaa (`SUN_DARK_DEG`).
`darkPeriod()` etsii 36 tunnin sisältä 10 min askelin nykyisen tai
seuraavan pimeän jakson ja tarkentaa rajat minuutin tarkkuuteen. Tekstit:

- "Pimeää klo 18.39–07.29"
- "**Vielä valoisaa** · Pimeää klo …"
- "Vielä valoisaa · ei pimeää seuraavan vuorokauden aikana" (valoisa kesäyö)
- "Pimeää koko vuorokauden" (kaamos)

## Avaruussää: ratkaisut

- **Bz:n väri:** viimeisin 1 min arvo; negatiivinen vihreä (`--aurora`),
  positiivinen harmaa (`--dim`).
- **Trendi:** 10 min liukuva keskiarvo (`smoothMin`). Jakso lasketaan
  viimeisimmästä taaksepäin niin kauan kuin keskiarvo on alle 0 eikä
  mittauksissa ole yli 15 min katkoa. Yksittäinen piikki pohjoiseen ei
  katkaise jaksoa: testidatassa 32 min etelään ja piikki +3 nT 15 min
  sitten -> "etelään 30 min".
- **Vanhentunut data:** yli 15 min vanha mittaus näytetään himmennettynä,
  ja alla lukee "Ei tuoretta dataa (viimeisin mittaus klo …)". Vihjettä
  ei näytetä vanhasta datasta.
- **Haut:** ensimmäinen haku tehdään vasta, kun infoikkuna avataan.
  Sen jälkeen haetaan 1 min välein ikkunan ollessa auki ja 10 min välein
  sen ollessa kiinni. Piilotetulla välilehdellä ei haeta lainkaan.

## Tuulen sarake 360 × 640 (kohta 8)

Mitattu headless-Chromiumilla:

| Kohde | Sijainti |
|---|---|
| säävalikon rivi | y = 63–107 |
| tuulen sarake (4 korkeutta) | y = 112–333 |
| aikajana | y = 576–620 |

Väliin jää 243 px, eli tilaa olisi noin neljälle korkeudelle lisää.
Ongelmaa ei siis ole. Jos korkeuksia joskus on niin monta, ettei sarake
mahdu, `positionWindColumn()` rajaa sarakkeen aikajanan yläpuolelle ja
tekee siitä vieritettävän.

## Muita ratkaisuja

- **Viestit:** lataus- ja virheviestit (`note()`) näkyvät aikajanan
  yläpuolella (`#msg`). Ylhäällä 360 px:n näytöllä viesti peitti säävalikon
  rivin, ja testi löysi tämän.
- **Aikajanan ajankohta:** leveys mitoitetaan pisimmän muodon mukaan
  kaikilla kielillä. Pisin on ranskan "Maintenant · sam. 00:00", noin
  141 px. Tämän takia 360 px:n puhelimella liukusäädin on noin 160 px.
- **Pinon paikannusnappi** ei enää avaa paneelia virheestä; virhe näkyy
  viestirivillä tai infoikkunassa.
- **Asetusikkunan pudotuslistat** (kieli ja säämalli) ovat yhteisessä
  `openPop()`-funktiossa.
- **Tarpeettomat käännösavaimet poistettu:** alapaneeli, toisto, mittari,
  vanhat arviot ja selitysrivit.
- **Commit-jako:** koko käyttöliittymämuutos on yhdessä commitissa
  (index.html + i18n.js). Alapaneelin poisto, aikajana, infoikkuna ja
  napit riippuvat toisistaan samassa tiedostossa, joten välivaiheet eivät
  olisi toimineet erikseen. Dokumentaatio on omissa commiteissaan.

## Testaus (kohta 29)

Testit ajettiin headless-Chromiumissa (Playwright, MapLibre 3.6.2 npm:stä,
SwiftShader-WebGL), synteettisellä datalla:

- ECMWF-pilvihila: liikkuva vaalea pilvimassa Pohjanlahdella
- tuulihila
- OVATION
- Kp
- rtsw mag/wind (aktiivinen + ei-aktiivinen satelliitti, -9999-rivi)
- hemi-power-teksti

Karttatiilet ja NOAA eivät olleet tavoitettavissa. Paikannus oli
emuloitu (65,01 N, 25,47 E). **Tulos 49/49 OK, ei JS-virheitä.**

| Tarkistus | Kuva |
|---|---|
| Pilvet päällä oletuksena, aikajana ja mallimerkintä näkyvät (360 × 640) | 02 |
| Pinon järjestys sää · revontulet · kamerat · info · sijainti · karttapohja | 02 |
| Säävalikko vasemmalle: pilvet lähinnä säänappia, tuuli sen vasemmalla | 03 |
| Tuuli päälle -> korkeussarake tuulinapin alla, valittu korostettu, mahtuu | 03, 14 |
| Kartan napautus sulkee valikon, ei valitse pistettä, aikajana jää | – |
| Toinen toimintonappi sulkee säävalikon | – |
| Pilvet + tuuli pois -> aikajana katoaa, mallimerkintä jää | 04 |
| Pilvet päälle -> aikajana palaa; valikon sulku ei piilota sitä | – |
| +3 h: "la 13.00 (+3 h)", paluukuvake, **ei yhtään elementtiä siirtynyt** | 05 |
| Ajankohdan napautus -> "Nyt · la 10.00" | – |
| Lipun napautus ei avaa infoikkunaa | – |
| Info pisteen kanssa -> "Valittu piste · …"; aikajana ikkunan alla | 06 |
| **Nyt-välilehden teksti identtinen** aikajanan siirron jälkeen; huomautus näkyy, ei siirtymiä | 07 |
| Lipun sulkeminen -> info näyttää oman sijainnin | – |
| Veto ylös -> koko näyttö; ruksi sulkee ja aikajana palaa; suljettuna ei reunaa | 08 |
| Pyyhkäisy alas sulkee | – |
| Info ilman pistettä -> oma sijainti; "Oma sijainti" -nappi pisteen ollessa valittuna | 09 |
| Avaruussää tuore: Bz −6,4 nT vihreä, "etelään 30 min", vihje näkyy | 10 |
| Luvut fi: "512 km/s", "−6,4 nT", "4,3 p/cm³"; en: "512 km/s", "-6.4 nT" | 10 |
| Aikajana luettava vaalean pilven päällä | 11 |
| Avaruussää 40 min vanha: himmennys, "Ei tuoretta dataa", ei vihjettä | 12 |
| Paikannus estetty -> ohje valita piste kartalta | 13 |
| Työpöytä: info vasemmalla, aikajana sen oikealla puolella | 15 |
| Asetuksissa säämalli ja Päivitetty | 16 |
| Kielenvaihto zh/es/fr ilman virheitä | 17 |

**Ei testattu:**
- oikealla iPhonella (safe-area, kotipalkin ele, veto)
- oikeilla NOAA-vastauksilla
- oikeilla OpenFreeMap-tiilillä

Huom: SwiftShader on hidas, joten työpöydän sivupaneelin
liukuanimaatio vei testissä jopa ~2 s. Testi odottaa siirtymän loppuun.
Oikealla GPU:lla siirtymä kestää 0,26 s.

Testiskriptit (`harness.js`, `t3.js`) eivät ole repossa, koska ne
riippuvat paikallisesta MapLibre-paketista. Reititys- ja fixture-
logiikka on kuvattu yllä, joten testit voi kirjoittaa uudelleen samalla
tavalla.

## Jatkokierros (käyttäjän huomiot 2026-10)

1. Infoikkunan avauskorkeus jätetään ennalleen (56 %, veto koko näytölle).
2. Alivalikon napeille sama varjo kuin toimintonapeille (ennen pienempi).
   Koko ja korkeus tarkistettu: kaikki alivalikot (sää, revontulet,
   kamerat, karttapohja) keskikohdat täsmälleen napin kohdalla, koko
   --btn, 390 ja 1280 px. Isompi varjo paljasti rivin vieritysalueen
   leikkauksen (tumma neliö ruudukkonapin ympärillä) -> rivi vieritettävä
   vain kun se ei mahdu.
3. Revontuli-ikoni: takaverho ("laatikko") poistettu, yläosa kirkkaan
   punainen, alaosa vihreä, tähdet ennallaan (pyöreitä pisteitä).
4. i-nappi käyttäjän mallin mukaan: paksumpi varsi, koukku, häntä, piste
   erillään (väli ~1,4 yksikköä 24:n ruudukossa) kaltevan akselin
   jatkeella; koko 24/26 px (oli 0,52 x nappi = 20,8/22,9 px).
5. Pino: oma sijainti ylimpänä, sää toisena.
6. Ruudukkonapin ikoni ei pysynyt keskellä: asettelu oli testissä aina
   tasan keskellä (dx = dy = 0 ennen ja jälkeen klikkauksen), joten vika on
   piirrossa. Todennäköinen syy: kuvakkeen koko 0,435 x 44 = 19,125 px ->
   paikka aliapikselissä, ja napin scale(.92)-animaatio + overflow:hidden
   -leikkaus (oma kompositointitaso) jätti sen pikselin verran sivuun, kun
   rivi suljettiin kesken animaation (ruudukon avaus sulkee rivin heti).
   Sama ilmiö kuin aiemmin Asetukset-rattaassa. Korjaus: kuvakkeet
   kokonaisina pikseleinä (napin keskikohta pikselirajalla) ja
   overflow:hidden vain karttapohjan kuvanapeille. EI pystytty toistamaan
   headless-selaimessa -> varmista puhelimella.
7. Kartan kameramerkit: sama kameramuoto kuin valikon ikonissa (Lucide
   "video"), värit ennallaan, 2x tarkkuus.

## Ikonit, 3. kierros (2026-10)

- Revontuli-ikoni: punainen seuraa verhon aaltoilevaa yläreunaa (ennen
  pystysuuntainen liukuma -> suora raja). Pystysäteet rajattu verhon
  sisään, kirkas alareunan viiva päättyy verhon sivuihin. Kuva 21.
- i-nappi: ympyrä r 9 -> 10. Kirjaimen piirretty alue mitattu pikseleistä
  (480 px:n renderöinti): keskikohta oli (11,95; 11,68), ympyrän keskikohta
  (12; 12) -> kirjainta siirretty (0,05; 0,32). Kuva 22.

## Alapalkki, uusi aikajana ja sijaintikytkin (2026-10, haara `claude/alapalkki-aikajana`)

Toteutus: CLAUDE.md "Aikajana", "Alapalkki" ja "Infoikkuna". Lyhyesti:
avaussivu poistettu (OSM-maininta logon alla 5 s), aikajana koko levyiseksi
ja ajankohta + säämalli säätimen alle, infonappi pois ja tilalle alapalkki
"⌃ 15 % · Kp 2,3 · Bz −4", infoikkunan otsikko + "Oma sijainti" -nappi +
ruksi korvattu kytkimellä "Oma sijainti | Valittu piste".

### Avoimet kysymykset (jätetty tekemättä tai tehty varovaisimmin)
1. **Karttapohjanappi:** tehtävän pinojärjestyksessä (säänappi ·
   revontulet · kamerat · oma sijainti) sitä ei mainittu. Jätin sen pinon
   alimmaksi. Poistetaanko, siirretäänkö muualle vai jääkö näin?
2. **Lämpötila ja tuulen nopeus (kohta 13):** sovelluksessa ei näytetä
   lämpötilaa eikä tuulen nopeutta missään, eikä asetuksissa ole niille
   yksikkövalintaa. Etäisyys (km/mi) ja kellonaika päivittyvät heti
   kaikkialla, myös alapalkissa ja infoikkunassa. Lisätäänkö lämpötilan
   (°C/°F) ja tuulen nopeuden (m/s, km/h, mph, kn) valinnat, kun niitä
   aletaan näyttää?
3. **Oma sijainti käynnistyksessä:** alapalkki näyttää oman sijainnin
   indeksin vain, jos sijainti on tiedossa. Haen sijainnin hiljaa VAIN, jos
   paikannuslupa on jo annettu - en kysy lupaa käynnistyksessä. Ilman lupaa
   indeksin kohdalla on "–", kunnes käyttäjä avaa infoikkunan (silloin lupaa
   kysytään kuten ennenkin) tai painaa paikannusnappia. Kysytäänkö lupa heti
   käynnistyksessä?
4. **Tietokone:** alapalkki pysyy näkyvissä infoikkunan ollessa auki
   (sivupaneeli ei peitä sitä) ja sen napautus sulkee ikkunan. Kahva näkyy
   myös sivupaneelissa (napautus sulkee), koska ruksi poistettiin.
5. **Nyt-välilehden tyhjä tila** välilehtien ja indeksin välissä
   (huomautusslotti, MUISTIO-testaus.md kohta 4) on ennallaan.

## Tänä yönä -välilehti, testiversiot V1-V3 (2026-10, haara `claude/tana-yona`)

Toteutus: CLAUDE.md "Infoikkuna" / `index.html` "TÄNÄ YÖNÄ". Versiokytkin
"V1 | V2 | V3" näkyy, kun `TEST_VERSIONS = true` (poisto yhdellä muutoksella,
silloin käytetään `NIGHT.defaultVer`). Valinta muistetaan `rv-night-ver`.

### Data
- **Ajanjakso:** `darkPeriod()` (raja `SUN_DARK_DEG` = −6°, sama kuin
  näkyvyysindeksissä): nykyhetkestä tai pimeän alusta pimeän loppuun,
  enintään `NIGHT.maxHours` (16 h, kaamos). Ei pimeää -> "Ei pimeää tänä yönä".
- **Pilvet:** valitun mallin hila tunneittain, vain TÄSMÄLLEEN ladatuista
  askelista (ei lähimmän askeleen varapolkua). ICON-EU/HARMONIE lataavat
  askeleet vasta, kun välilehti avataan: HARMONIElla yön ~14 askelta on
  noin 20 Mt (1,45 Mt/askel), ICON-EU:lla noin 7 Mt. Mahdollinen
  mobiilidatan kysymys, ks. avoimet kysymykset.
- **Revontulet:** NOAA `products/noaa-planetary-k-index-forecast.json`
  (sama osoite, jota sovellus jo käytti; jäsennin lukee sekä vanhan
  taulukko- että uuden olio-muodon, SCN 26-21). `time_tag` = 3 h jakson
  alku. Osoitetta EI voitu hakea testiympäristöstä (NOAA estetty), joten
  muoto on tarkistettava julkaistulta sivulta.
- **Kp -> sijainnin arvio (`kpVisibility()`, säätövakio `NIGHT.kp`):**
  1. Geomagneettinen leveysaste dipolimallilla (`magLat()`, napa 80,7° N,
     72,7° W ≈ IGRF:n geomagneettinen pohjoisnapa 2020-luvulla).
  2. Revontuliovaalin eteläraja geomagneettisena leveysasteena:
     raja = 66,5° − 2,05 × Kp. Lähde: NOAA SWPC:n Kp-taulukko ("Kp 0 ≈ 66,5°
     … Kp 9 ≈ 48°", sama jota sovelluksen vanha `auroraEstimateFromKp`
     käytti). Lineaarinen sovitus taulukkoon.
  3. Arvio % = 45 + (maglat − raja) × 12, rajattu 0-90 %. Luokat: alle 30 %
     heikko, alle 60 % riittää, muuten hyvä. Kertoimet 45/12 ovat OMA
     arvio (ei julkaistu kaava): rajalla 45 %, 2° pohjoisempana 69 %.
  Esimerkit (maglat ja arvio % Kp 1-6):

  | Paikka | maglat | Kp1 | Kp2 | Kp3 | Kp4 | Kp5 | Kp6 |
  |---|---|---|---|---|---|---|---|
  | Helsinki | 57,7 | 0 | 0 | 13 | 38 | 62 | 87 |
  | Oulu | 62,2 | 18 | 43 | 67 | 90 | 90 | 90 |
  | Rovaniemi | 63,6 | 35 | 59 | 84 | 90 | 90 | 90 |
  | Tromssa | 67,5 | 82 | 90 | 90 | 90 | 90 | 90 |

  Rajoitus: malli ei laske arviota ovaalin POHJOISPUOLELLA (esim.
  Huippuvuoret matalalla Kp:llä) eikä ota huomioon vuorokaudenaikaa
  (ovaali on yöllä etelämpänä kuin päivällä).
- **Mahdollisuus** = arvio/100 × pilvikerroin (`cloudVisibilityFactorAt`)
  × pimeyskerroin (`darknessFactor`) × 100 - sama periaate kuin
  näkyvyysindeksissä, mutta Kp-arviosta (ei OVATIONista, joka on vain
  nykyhetki). Suuntaa-antava.
- **Paras aika:** yön paras tunti ja sen peräkkäiset naapurit, joiden
  mahdollisuus on vähintään 80 % parhaasta (`NIGHT.bestRel`) ja yli
  kynnyksen `NIGHT.goodMin` 40 % (= alapalkin korostusraja). Perustelu
  vertaa parhaan jakson pilvikerrointa ja revontuliarviota muuhun yöhön.
- **Kuu:** matalan tarkkuuden kaavat (Meeus / Astronomical Almanac):
  korkeus, valaistu osuus, vaihe, nousu ja lasku 10 min haulla
  (tarkkuus muutama minuutti). Tarkistettu vain järkevyyden osalta
  (18.10.2026 ≈ ensimmäinen neljännes, 52 %).
- **Tuuli:** valitun mallin 10 m tuuli, suurin arvo pimeän aikana (m/s).

### Avoimet kysymykset
1. **Lämpötila (kohta 5) jätetty tekemättä:** sovelluksessa ei ole
   lämpötiladataa. Vaihtoehdot: lisätä 2 m lämpötila fetch-skripteihin
   (ECMWF/ICON-EU/HARMONIE tarjoavat sen, tiedostokoko kasvaa) tai hakea
   pistekohtainen ennuste selaimesta (esim. MET Norway / FMI). Kumpi?
2. **Tuulen yksikkö:** asetuksissa ei ole tuulen yksikköä, joten m/s.
   Lisätäänkö valinta (m/s, km/h, mph, kn)?
3. **Datamäärä:** HARMONIE lataa Tänä yönä -välilehdellä ~20 Mt. Riittääkö,
   vai käytetäänkö yön taulukossa aina kevyempää mallia / harvempaa
   askelta?
4. **Luonnoskuva (V3):** tehtävässä mainittu luonnoskuva ei tullut
   viestin mukana. V3 on tehty tekstin mukaan (ylempi palkki pilvisyys
   täytettynä, alempi revontuliarvio vihreällä ääriviivalla, täytetty
   vihreäksi kun arvio on "hyvä").
5. **Pimeän jakson raja** on −6° kuten indeksissä; tunnit −6°…−12° näkyvät
   mukana, mutta pimeyskerroin pienentää niiden mahdollisuutta.

### Testaus (headless, synteettinen data, kellon ohjaus)
Kuvat 360 × 640 ja 430 × 932, kaikki kolme versiota:
- oma sijainti Oulussa ja valittu piste Tromssassa (klo 15 paikallista),
- yö jo alkanut (klo 00.30: taulukko alkaa "nyt"),
- ei hyviä mahdollisuuksia (pilvisyys 96 %, Kp 0,7).
Ei JS-virheitä. Kaavion napautus (V2) näyttää tunnin arvot.

**Tarkistettava oikealla puhelimella:**
- V2: kaavion napautus osuu oikeaan tuntiin sormella (kapeat sarakkeet).
- Pitkän yön (16 riviä) vieritys infoikkunassa, myös puolikkaassa tilassa.
- Luettavuus pimeässä: palkkien ja harmaan tekstin kontrasti, kirkkaus.
- Välilehden avaus HARMONIElla mobiiliverkossa (latausaika, "Ladataan…").
