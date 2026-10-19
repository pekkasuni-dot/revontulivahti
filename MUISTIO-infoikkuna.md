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
- **Paras aika (3. kierros, käyttäjän päätös):** VAIN yön paras enintään
  3 tunnin jakso (`NIGHT.bestHours`, `nightBestWindow()`): korkein
  keskimääräinen mahdollisuus; tasapelissä korkeampi Kp, sitten pimeämpi
  (aurinko alempana). Päistä pudotetaan tunnit alle `NIGHT.goodMin` 40 %
  (= alapalkin korostusraja); ei yhtään -> ei korostusta. Ennen korostettiin
  kaikki tunnit >= 80 % parhaasta -> kirkkaana yönä koko yö (Oulu 21-07),
  nyt 00-03. Perustelu
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

## Tänä yönä, 2. kierros: revontuliarvion kalibrointi (2026-10, haara `claude/tana-yona-2`)

### Mistä arvio koostuu
1. **Revontulivyön eteläreuna Kp:n funktiona (JULKAISTU, likimääräinen):**
   NOAA SWPC:n Kp-taulukko "revontulet näkyvät pään yläpuolella
   geomagneettisella leveysasteella": Kp 0 = 66,5°, 1 = 64,5°, 2 = 62,4°,
   3 = 60,4°, 4 = 58,3°, 5 = 56,3°, 6 = 54,2°, 7 = 52,2°, 8 = 50,1°,
   9 = 48,1° (SWPC "Tips on Viewing the Aurora", sama taulukko kuin
   NOAA:n vanhassa Kp-karttaohjeessa). Koodissa lineaarinen sovitus
   `raja = 66,5° − 2,05 × Kp` (poikkeama taulukosta alle 0,1°). Taulukkoa
   EI voitu tarkistaa verkosta tässä istunnossa (NOAA estetty
   testiympäristöstä) - arvot muistinvaraisia, tarkistettava.
   Taulukko on yön keskiarvo; se ei ota huomioon vuorokaudenaikaa (vyö
   on keskiyöllä etelämpänä kuin illalla) eikä vyön pohjoisreunaa.
2. **Geomagneettinen leveysaste (JULKAISTU MALLI):** keskitetty dipoli-
   malli, `magLat()`: maglat = asin(sin φ sin φP + cos φ cos φP cos(λ − λP)),
   geomagneettinen pohjoisnapa φP = 80,7° N, λP = 72,7° W (IGRF-13:n
   dipolinapa 2020: 80,65° N 72,68° W). Ei korjattuja (CGM) koordinaatteja;
   Fennoskandiassa ero CGM:ään on noin 1-2° (CGM suurempi).
3. **Etäisyys -> prosentti (OMA ARVIO, ei julkaistu malli):**
   arvio % = 45 + (maglat − raja) × 12, rajattu 0-100 % (erillinen katto poistettu 2026-10 käyttäjän pyynnöstä;
   ennen 90 %, sitten 95 %). Eli eteläreunalla
   45 %, 2° pohjoisempana 69 %, 2° etelämpänä 21 %, yli 3,75° etelämpänä 0 %.
   Kertoimet valittu niin, että reunan eteläpuolella (horisontissa)
   näkyvät revontulet saavat pienen arvon. Säätövakio `NIGHT.kp`
   (boundary0, perKp, base, perDeg, max).
4. **Luokat (OMA ARVIO, säätövakio `NIGHT.kp.okMin` / `goodMin`):**
   alle 30 % heikko, 30-59 % hyvä, vähintään 60 % erinomainen
   (rajat ennallaan, vain nimet vaihdettu: heikko · hyvä · erinomainen).

### Taulukko oppaan arvioitavaksi (rajat ennallaan)

| Paikka | maglat | Kp 1 | Kp 2 | Kp 3 | Kp 4 | Kp 5 | Kp 6 | Kp 7 |
|---|---|---|---|---|---|---|---|---|
| Helsinki | 57,7° | 0 % heikko | 0 % heikko | 13 % heikko | 38 % hyvä | 62 % erinomainen | 87 % erinomainen | 100 % erinomainen |
| Oulu | 62,2° | 18 % heikko | 43 % hyvä | 67 % erinomainen | 92 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen |
| Rovaniemi | 63,6° | 35 % hyvä | 59 % hyvä | 84 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen |
| Kilpisjärvi | 66,6° | 71 % erinomainen | 95 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen |
| Tromssa | 67,5° | 82 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen | 100 % erinomainen |

Huomioita valmiiksi: Kilpisjärvi ja Tromssa ovat jo Kp 1:llä
"erinomainen", koska malli ei vähennä arviota vyön pohjoispuolella eikä
matalalla aktiivisuudella. Oulussa luokka vaihtuu jyrkästi (Kp 2 hyvä,
Kp 3 erinomainen).

### Luokkien käännökset (2. kierros)
Luokka näytetään muodossa "Kp 2,3 · hyvä" (pieni alkukirjain, ilman
prosenttia). Käännökset valittu luontevaksi revontulten näkymisestä
puhuttaessa, ei sanatarkasti:

| Kieli | heikko | hyvä | erinomainen | Huomio |
|---|---|---|---|---|
| suomi | heikko | hyvä | erinomainen | |
| englanti | low | good | excellent | "low" luontevampi kuin "weak" (low chance) |
| kiina | 较低 | 良好 | 极佳 | TARKISTAMATON |
| espanja | baja | buena | excelente | feminiini (probabilidad/previsión), TARKISTA |
| ranska | faible | bonne | excellente | feminiini (prévision), TARKISTA |

Muut tekstimuutokset: "Paras aika" -> "Parhaat mahdollisuudet klo 03–05"
(en "Best chances", zh "最佳时机", es "Mejores opciones", fr "Meilleures
chances"); "Revontuliarvio (3 h)" -> "Revontuliarvio"; "Pilvet" ->
"Pilvisyys" (taulukko, kaavio, arvoikkuna, lähdehuomautus JA kartan lippu
`flag.clouds`; säävalikon pilvikerroksen nappi "Pilvet" jätettiin, koska
se on tason nimi eikä arvon otsikko - kerro, jos sekin muutetaan);
selittävät lauseet (`night.why.*`) poistettu.

### V2:n revontuliporras (2026-10)
Porras kaksi kertaa korkeampi (`NIGHT_CHART.aurH` 32 -> 72) ja korkeus = Kp
yön omalla asteikolla (alin Kp alas, ylin ylös kokonaisluvuiksi pyöristettynä,
vähintään 2 Kp-yksikköä, `kpMinSpan`) kuten OP:n kaaviossa. Ennen korkeus oli
revontuliarvio %, jolloin Helsingissä Kp 3,7 ja 4,3 erosivat ~3 px; nyt ~11 px.
Huom: asteikko vaihtelee öittäin, joten portaan korkeutta ei voi verrata eri
öiden välillä - Kp-luku portaan päällä kertoo arvon.

### V3:n palkkipari (2026-10)
Käyttäjän mallikuvan (Excel-tyyppinen ryhmitelty vaakapalkkikaavio) mukaan:
saman tunnin pilvi- ja revontulipalkki kiinni toisissaan (ei väliä), ei
harmaata taustaraitaa, suorat alkupäät, revontulipalkki vahvempi vihreä.
Tunnit erottuvat rivivälillä ja ohuella viivalla. 0 % näkyy 1 px merkkinä.

### Muut 2. kierroksen muutokset
- Tuuli-laatikko poistettu (myös yön tuulidatan lataus -> ei turhaa
  datansiirtoa).
- **V1 palautettu (käyttäjän korjaus):** V1 poistettiin ensin vahingossa;
  palautettu 2. kierroksen yhteisin muutoksin: sarakkeet Klo | Pilvisyys
  (palkki + %) | Revontulet ("Kp 2,3 · hyvä" ilman prosenttia, yksi solu per
  3 h Kp-jakso) | Mahd.; parhaat tunnit korostettu, otsikkona sama
  tiivistelmä kuin muissa. Kytkin "V1 | V2 | V3", oletus V1,
  `TEST_VERSIONS` ennallaan.
- **Pimeän alku/loppu:** `darkPeriod()` hakee rajan sekunnin tarkkuudella ja
  pyöristää minuuttiin. Ennen minuutin puolitus riippui kutsuhetkestä, joten
  sama raja näkyi eri paikoissa minuutin erolla (18.42/18.43). Nyt sama
  arvo Nyt-välilehdellä, tiivistelmässä ja laatikossa (testattu).
- **Kuu-laatikko:** vaihe omalla rivillään (rivittyy tarvittaessa, ei
  katkea), alla "52 % · laskee 20.54". Mitattu 360 px kaikilla kielillä ja
  kaikilla 8 vaiheella: ei katkeamista; ranskan "Gibbeuse décroissante"
  rivittyy kahdelle riville.
- **V2:** kaavio ~1,5 x korkeampi, mahdollisuus vihreänä murtoviivana (suorat viivat pisteestä pisteeseen, käyttäjän toive OP:n kaavion mallin mukaan; ennen pehmeä käyrä)
  liukuvärjäyksellä, valkoiset pallot vain parhaille tunneille, hennot
  apuviivat 0/25/50/75/100 arvoineen vasemmalla, kynnysviiva poistettu.
  Revontulet porrasviivana (himmeä vihreä) omalla kaistallaan, Kp portaan
  kohdalla (jos jakso on kaaviossa vähintään 30 px leveä). OP-sovelluksen
  kuva EI tullut viestin mukana - tyyli tehty kuvauksen perusteella.
- **V2 vuorovaikutus:** 0,5 s painallus (`NIGHT.pressMs`) -> pystyviiva
  tasatunnin keskelle, arvoikkuna yläpuolelle (kellonaika, mahdollisuus %,
  pilvisyys %, "Kp 4,3 · erinomainen") ja värinä (`nightHaptic()`:
  Androidilla `navigator.vibrate` värinäpalauteasetuksen mukaan, iPhonella
  tyhjä `nativeHaptic()`, korvataan kauppaversiossa). Liike ennen
  aktivointia (> 8 px, `pressSlop`) = tavallinen vieritys. Tarkastelun
  aikana infoikkunan vieritys estetty (touchmove preventDefault +
  overflow hidden) ja datan uudelleenpiirto odottaa. Sormen noustessa
  viiva ja ikkuna katoavat. Napautus näyttää lähimmän tunnin 2,5 s.
- **V3:** palkit täytettyjä, yhtä korkeita, ilman reunuksia (pilvisyys
  vaaleanharmaa, revontuliarvio himmeä vihreä); kirkas vihreä vain
  parhaiden tuntien rivikorostuksessa.

### Testaus (headless, synteettinen data, 360 × 640 ja 430 × 932)
V2 ja V3: oma sijainti Oulu, valittu piste Helsinki ja Kilpisjärvi samana
yönä (Kp-ennuste sama), "Ei hyviä mahdollisuuksia" (pilvisyys 96 %,
Kp 0,7) ja V2:n arvoikkuna tarkastelun aikana (hiiren painallus 650 ms +
siirto: viiva ja ikkuna seuraavat, katoavat vapautettaessa, vieritys
estetty tarkastelun ajan). Ei JS-virheitä.

**Tarkistettava oikealla puhelimella:**
- Painallus ja liu'utus V2:ssa: aktivoituuko 0,5 s:ssa, seuraako viiva
  sormea, napsahtaako tasatunteihin, katoaako sormen noustessa.
- Vierityksen esto: infoikkuna ei vieri tarkastelun aikana, mutta vierii
  normaalisti, kun sormea liikuttaa heti (ennen 0,5 s).
- Haptinen palaute Androidilla aktivoinnin hetkellä (ja ettei se tule,
  jos värinäpalaute on asetuksissa pois).
- Pitkän painalluksen järjestelmävalikko (tekstin valinta / kuvan
  tallennus) ei saa aueta - estetty, mutta iOS:n käytös tarkistettava.
- Napautus: arvot näkyvät hetken ja katoavat.

## Avaruussään historiakaaviot (2026-10, haara `claude/avaruussaa-kaaviot`)

Nyt-välilehden avaruussäälaatikot Kp, Bz, Bt, nopeus, tiheys ja teho avaavat
kaavion infoikkunan päälle (`#swChart`). Laatikoissa pieni kaaviokuvake
oikeassa yläkulmassa. Revontulet % ja näkyvyysindeksi eivät avaa kaaviota;
Pilvisyys-laatikko vie Tänä yönä -välilehdelle.

### Yhteinen kaaviokomponentti
Tänä yönä V2:n vuorovaikutus erotettiin omaksi osakseen: `bindChartScrub()`
(painallus 0,5 s -> pystyviiva + haptinen palaute + arvoikkuna, liu'utus,
napautus = lähin arvo 2,5 s, vieritys estetty tarkastelun ajan) ja `.ch-*`-
tyylit (käyrä paletin vihreällä, hennot vaakasuorat apuviivat, arvot
vasemmalla). V2 käyttää nyt samaa komponenttia; testattu: tarkastelu, arvo-
ikkuna ja vierityksen esto toimivat kuten ennen. Historiakaavioissa lisäksi
piste käyrällä sormen kohdalla.

### Data - mitä NOAA oikeasti tarjoaa (tarkistettu Actionsista 2026-10-18)
Tehtävässä mainitut `products/solar-wind/mag-1-day.json`, `plasma-1-day.json`
ja 7-day-versiot palauttavat **HTTP 404** (NOAA poisti ne, SCN 26-21).
Käytössä:
- **Bz, Bt, nopeus, tiheys:** `json/rtsw/rtsw_mag_1m.json` ja
  `rtsw_wind_1m.json` sisältävät **24 h** minuuttidataa (useita satelliitteja,
  `active` valitaan). Sovellus hakee nämä jo ennestään (Nyt-välilehden arvot),
  joten historia on valmiina muistissa - ei lisähakuja. 24 h on siksi pisin
  aikaväli.
- **"Saapunut Maahan":** NOAA julkaisee valmiiksi Maahan siirrettyä dataa:
  `products/geospace/propagated-solar-wind-1-hour.json` (6,5 kt, viimeinen
  tunti, kenttä `propagated_time_tag` = arvioitu saapumisaika Maahan; myös 7 vrk
  versio `propagated-solar-wind.json`, 1,2 Mt). **Käytin NOAA:n siirrettyä
  dataa**: viiva = viimeisin L1-mittaus, jonka saapumisaika on jo ohi.
  Varapolku (tiedosto puuttuu, yli 15 min vanha tai viive yli tunnin, jolloin
  1 h tiedosto ei riitä): 1,5 milj. km / nykyinen nopeus. Lähderivillä kerrotaan,
  kumpaa käytettiin. Mittaushetkellä viive oli 52 min (434 km/s). Viivan
  oikealla puolella oleva alue on hennosti varjostettu.
- **Kp:** `noaa-planetary-k-index.json` (mitattu, 7 vrk, `{time_tag, Kp}`) +
  `noaa-planetary-k-index-forecast.json` (`observed` = observed / estimated /
  predicted, 3 vrk eteenpäin). Haetaan vasta kaavion avautuessa.
- **Teho (GW):** `text/aurora-nowcast-hemi-power.txt`, 5 min välein. **Tiedosto
  sisältää vain kuluvan UTC-vuorokauden** ("This file contains data for
  2026-10-18") -> 24 h näkymä alkaa UTC-keskiyöstä (Suomessa klo 2/3), ellei
  istunnon aikana ole kertynyt vanhempaa (sovellus säilyttää haetut rivit).
  Aikaleimana havaintoaika (tiedoston 1. sarake).
- Kaikki NOAA-osoitteet lähettävät `Access-Control-Allow-Origin: *` (todettu).

### Valinnat
- **Bt samassa kaaviossa ±-kehyksenä** (himmeä harmaa, +Bt ja -Bt). Ei tehnyt
  kaaviosta sekavaa: Bz pysyy kehyksen sisällä, ja kehys kertoo suoraan, kuinka
  paljon Bz voisi enimmillään kääntyä etelään. Bt-laatikko avaa lisäksi oman
  Bt-kaavionsa (pelkkä Bt-käyrä), jotta Bt:n napautus näyttää Bt:n.
- **Bz:** nollaviiva korostettu, negatiivinen alue hennolla vihreällä.
- **Kp 3 vrk** = 24 h mitattua + 48 h ennustetta (tehtävä ei sanonut jakoa;
  kerro, jos haluat esim. 1,5 + 1,5 vrk). Kp porraskäyränä, mitattu kirkkaana,
  arvio (kuluva jakso) ja ennuste himmeänä, "Nyt"-viiva erottaa. 24 h -näkymä
  päättyy nykyhetkeen.
- **Asteikot:** Kp 0:sta ylöspäin (vähintään 0-4, kokonaisluvut); muut
  automaattisesti datan mukaan "siistein" välein (kuten OP:n kaaviossa).
- **Katkot:** yli 3 min väli minuuttidatassa (GW: yli 12 min) katkaisee käyrän.
- **Vanha data:** yli 15 min (`SPACE_WX.staleMin`) -> "Ei tuoretta dataa ·
  viimeisin mittaus klo X" (ei Kp:lle, 3 h jaksot).
- **Päivitys:** kaavion ollessa auki 1 min välein (Kp ja siirretty aurinkotuuli
  omalla ajastimella, rtsw/GW infoikkunan normaalilla 1 min haulla), ei hakuja
  kaavion ollessa kiinni tai sivun ollessa piilossa.
- **Sulkeminen:** ruksi, Esc, kaavion ulkopuolen napautus ja takaisin-ele
  (`history.pushState` avattaessa, `popstate` sulkee). Infoikkunan vieritys
  ei muutu (testattu: sama scrollTop ennen ja jälkeen).
- Kellonajat paikallista aikaa `fmtClock()`:lla (24 h / 12 h -asetus), luvut
  `fmtNum()`:lla (lokalisoitu desimaalierotin), yksiköt aina samat.

### Avoimet kysymykset
- **Datan määrä:** rtsw-tiedostot ovat 1,4 Mt + 2,2 Mt (pakkaamattomana) ja
  ne haetaan minuutin välein infoikkunan ollessa auki - tämä oli jo ennen
  tätä tehtävää. Pakattuna arviolta muutama sata kt/min. Kevyempi vaihtoehto
  nykyarvoille olisi `propagated-solar-wind-1-hour.json` (6,5 kt), mutta siinä
  ei ole 24 h historiaa. Kerro, pidetäänkö näin.
- **Kp 3 vrk -jako** (24 h + 48 h), ks. yllä.
- Selitystekstit (`swc.desc.*`) ovat omia muotoiluja; "yli 500 km/s" ja "yli
  50 GW" ovat yleisiä nyrkkisääntöjä, tarkista sopivatko oppaille.

### Testaus (headless, synteettinen data)
`npm run screenshots -- --offline --states=nyt,kaavio-bz,kaavio-kp,kaavio-vanha`
(uudet tilat; fixtuurit: 24 h minuuttidata, mittauskatko 2 h 40 min - 2 h 15 min
sitten, Kp 7 vrk + ennuste, siirretty aurinkotuuli). Kuvattu 360 × 640,
430 × 932 ja 1440 × 900. Lisäksi automaattitesti: Kp-kaavio hakee vain Kp-
tiedostot (rtsw ei uudelleen), napautus näyttää arvon ja piilottaa sen 2,5 s
jälkeen, takaisin-ele / ruksi / Esc sulkevat ja palauttavat Nyt-välilehdelle
samaan kohtaan, ajastin pysähtyy, Pilvisyys vie Tänä yönä -välilehdelle,
kaikki 5 kieltä ilman virheitä. Tänä yönä V2 toimii samalla komponentilla.

### Tarkistettava oikealla puhelimella
- Painallus 0,5 s ja liu'utus kaaviossa (viiva ja arvot seuraavat sormea,
  sivu ei vieritä tarkastelun aikana, sormen noustessa katoaa).
- Haptinen palaute Androidilla tarkastelun alkaessa.
- Androidin takaisin-ele sulkee kaavion (eikä koko sovellusta / infoikkunaa).
- Sulkeminen ruksista, ja että Nyt-välilehti on samassa vierityskohdassa.
- Kaavion ikkuna loven ja kotipalkin kanssa (safe area).
- Pikkulaatikoiden kuvakkeet: erottuvatko napautettaviksi.

## Selaus kaikissa taulukoissa ja paras aika, 3. kierros (2026-10)

### Selaus ei toiminut puhelimella (V2)
Käyttäjä: "V2 taulukon selaus ei toimi, kun vien sormen päälle." Syy (ei voitu
toistaa oikealla puhelimella, todennäköisin): 1. versio vaati 0,5 s paikallaan
pitämisen ennen liikettä, ja se käytti pointer-tapahtumia, jotka iOS katkaisee
(pointercancel) heti kun selain alkaa vierittää - sormen vienti kaavion yli
ilman odotusta ei siis tehnyt mitään. Lisäksi samassa haarassa (avaruussään
kaaviot) yhteinen komponentti laski pystyviivan paikan SVG:n `offsetTop`:sta,
jota SVG-elementillä ei ole -> viiva puuttui (korjattu, ks. CLAUDE.md).

Uusi toteutus (`bindChartScrub`, 2. versio): touch-tapahtumat suoraan.
- **Kaaviot** (V2 ja avaruussään kaaviot): sivuttainen liu'utus aloittaa
  selauksen HETI (yli 6 px, selvästi vaakasuuntaan); pitkä painallus (0,5 s)
  myös. Pystysuora veto vierittää sivua normaalisti.
- **Taulukot V1 ja V3**: pitkä painallus riville, sitten liu'utus ylös/alas;
  rivi korostuu ja sen yläpuolella näkyvät tunnin tarkat arvot (sama
  arvoikkuna kuin V2:ssa: kello, mahdollisuus, pilvisyys, Kp · luokka).
  Pelkkä pystyveto vierittää. Napautus näyttää rivin arvot 2,5 s.
- Selauksen aikana `touchmove.preventDefault` -> mikään ei vieritä.
- Testattu Chromen kosketussyötteellä (CDP Input.dispatchTouchEvent, jolla
  selain myös vierittää kuten puhelimessa): sivuttainen veto, pitkä painallus
  + liike, napautus, pystyveto (vierittää, ei selausta) - V1, V2, V3 ja
  avaruussään kaaviot.

### Paras aika: vain paras
Käyttäjän esimerkki: 01-03 korostettu, vaikka 03:00 (72 %) oli selvästi paras.
Nyt korostetaan VAIN tunnit, joilla on yön korkein mahdollisuus; jos useilla
on sama arvo, kaikki ne (myös erillään olevat, otsikko "Paras aika klo 21–22
ja 01–03", kielen luettelomuoto `Intl.ListFormat`). Alle 40 % ei korostusta.
Mahdollisuus-% vihreänä vain parhailla tunneilla (ennen kaikilla >= 40 %).
V1:n Revontulet-solu kattaa 3 h (rowspan), joten korostus piirretään sen
taustaan liukuvärinä täsmälleen parhaiden (ja selattavan) tunnin rivien
kohdalle (`paintNightAur`, rivien todelliset korkeudet) - rivin korostus ulottuu
näin koko leveydelle.

**Sulkeeko pystysuora selaus infoikkunan?** Ei: veto alas sulkee ikkunan vain
kahvasta, otsikkoalueesta (sijaintikytkin, välilehdet) tai alapalkista;
sisältöalueella pystyveto vierittää, ja selauksen aikana vieritys on estetty.
Testattu kosketussyötteellä V1:ssä ja V3:ssa (selaus alas ja tavallinen veto
alas sisällön yläreunassa) - ikkuna pysyy auki.
Testattu: esimerkkikuvan arvot -> vain 03–04; tasapeli -> kaikki samat.

**Avoin kysymys:** pohjoisessa (Kilpisjärvi, Tromssa) revontuliarvio on
kirkkaana yönä usein katossa 95 %, jolloin monta tuntia on tasan sama ja koko
yö korostuu ("Paras aika klo 20–07"). Jos halutaan erottelua, katto voisi
poistaa tai arvio voisi jatkaa kasvuaan Kp:n mukana (esim. 99 %:iin). Kerro.

### Tarkistettava oikealla puhelimella
- V2 ja avaruussään kaaviot: sormen vienti sivuttain kaavion yli näyttää
  arvot heti; pystyveto vierittää sivua.
- V1 ja V3: pitkä painallus riville + liu'utus, sivu ei vieritä selatessa.
- iPhone: ei tekstin valintaa / suurennuslasia pitkässä painalluksessa.

## V2:n ulkoasu OP-sovelluksen mukaan (2026-10, vain V2)
- Mahdollisuuskäyrän alla ollut vihreä hohde (liukuväritäyttö) poistettu.
- Taustalle yhtenäiset pystyviivat aika-akselin kohdille (joka 2. tunti,
  `nt-vgrid`), vaakasuorat apuviivat katkoviivoina (`ch-grid dash`).
- Selattavan tunnin arvot pelkkänä tekstinä kaavion yläpuolelle varatussa
  tilassa (34 px, kaksi riviä, keskitetty pystyviivan kohdalle, reunoilla
  rajattu): "02.00 · Mahdollisuus 95 %" / "Pilvisyys 0 % · Kp 4,3 ·
  erinomainen" (`nightReadoutHTML`). Ei ikkunaa. Tila on varattu aina, jottei
  mikään hypi. Avaruussään kaaviot sekä V1/V3 ennallaan (ikkuna).
- Tausta yhtenäinen (ennen tunnin sarake tummeni pimeyden mukaan -> reunat
  vaalenivat; pimeys on jo mahdollisuusprosentissa).
- Pisin rivi 360 px:llä mahtuu (mitattu suomeksi); ranska/espanja tarkistettava.

## Revontuliarvion katto poistettu (2026-10)
Käyttäjän pyynnöstä erillinen 95 %:n katto poistettu (`NIGHT.kp.max` 100).
Arvio ei silti voi ylittää 100 %:a, joten pohjoisessa (Kilpisjärvi Kp >= 3,
Rovaniemi ja Oulu Kp >= 5) arvio on 100 % ja kirkkaana yönä useat tunnit ovat
yhä tasan samat -> korostuvat kaikki. Jos tasatilanteita halutaan vähemmän,
vaihtoehto on pehmeä käyrä, joka lähestyy 100 %:a mutta ei saavuta sitä
(erot pienenevät ylhäällä mutta säilyvät desimaaleissa) - avoin kysymys.

## OP-tyyli myös avaruussään kaavioihin (2026-10)
V2:n visuaaliset muutokset tehty myös Nyt-välilehden historiakaavioihin
(Kp, Bz, Bt, nopeus, tiheys, GW): yhtenäinen tausta (`ch-bg`), yhtenäiset
pystyviivat aika-akselin merkintöjen kohdilla (`ch-vgrid`), katkoviivaiset
vaakaviivat ja arvot tekstinä kaavion yläpuolella (`.ch-readout`, kaksi riviä:
"19.16 · Bz +1,7 nT" / "Bt 7,4 nT", Kp: "ma 06.00–09.00 · Kp 0,7" / "mitattu").
Tyylit ovat nyt yhteisiä `.ch-*`-luokkia.

## Kaavioiden korjaukset (2026-10, haara `claude/kaaviokorjaukset`)

### 1. Kp:n kolme tilaa
Mitattu (kirkas vihreä), arvio (oma sävy: keltainen katkoviiva) ja ennuste
(himmeä vihreä). Tila tulee NOAA:n `noaa-planetary-k-index-forecast.json`:n
`observed`-kentästä (observed / estimated / predicted); `estimated` kattaa
sekä päättyneet jaksot, joiden lopullista arvoa ei ole julkaistu, että
kuluvan jakson. Selitteessä kaikki kolme. "Nyt"-viiva kellonajan kohdalla.

### 2. Kp:n tarkastelu tunneittain + hyppybugi
Pystyviiva napsahtaa jokaiseen tasatuntiin ja "Nyt"-hetkeen; arvoikkunassa
koko 3 h jakso. **Bugin syy:** viiva napsahti aina 3 h jakson KESKIKOHTAAN
(`x = (jakson alku + loppu) / 2`), joten jakson sisäisiin tunteihin ei päässyt
ja viiva hyppäsi 3 h kerrallaan; nykyjakso oli 24 h -näkymässä rajattu
nykyhetkeen, jolloin sen keskikohta oli eri paikassa kuin muiden jaksojen ja
siirtymä näytti hyppäävän jakson yli. Nyt valinta tehdään tasatunneista
(+ "Nyt"), ja jakso haetaan valitun hetken mukaan.

### 3. Arvoikkuna OP-mallin mukaan (kaikki kaaviot)
Yhteinen komponentti (`bindChartScrub`, `chartReadout`): ikkuna keskitetty
pystyviivan yläpuolelle, liikkuu sormen mukana, pysähtyy kaavion reunoihin.
Rivit: aika (pieni, himmeä) / arvo (lihava, yksikkö) / tila (pieni, himmeä,
vain tarvittaessa). Alareuna 8 px piirtoalueen yläpuolella (`CHART.readoutGap`),
pystyviiva ikkunan alareunasta piirtoalueen alareunaan. Ikkunalle varattu tila
kaavion yläreunassa (`SWC.top` / `NIGHT_CHART.top` 58 px). Yläreunan merkinnät
("Nyt", "Nyt Maassa") piiloutuvat tarkastelun ajaksi vain, jos ikkuna osuisi
niihin; niiden pystyviivat jäävät.
- Kp: "su 21.00–00.00" / "Kp 1,7" / "Mitattu|Arvio|Ennuste".
- Bz, Bt, nopeus, tiheys: mittaushetki / arvo / "Matkalla Maahan" vain
  himmennetyllä alueella. Bz-kaavion arvoikkunassa ei enää Bt:tä (mittarin
  nimeä tai toista suuretta ei toisteta; Bt näkyy kehyksenä).
- GW: aika / arvo.
- Tänä yönä V2: aika / "Mahdollisuus 95 %" / "Pilvisyys 0 % · Kp 4,3 ·
  erinomainen". V2:ssa on kolme suuretta, joten arvoriville jäi nimi
  (muuten luku ei kerro mikä se on); muut kolmannelle riville.
- V1/V3-taulukot: ennallaan (ikkuna rivin yläpuolella).
- **Mahtuvuus mitattu** automaattitestillä: 6 testikokoa (360-1440 px) ×
  5 kieltä × Bz/tiheys/Kp/GW kaikilla aikaväleillä + V2, tarkastelu vasen
  reuna / keskellä / oikea reuna ("Nyt"-viiva mukana): **1080 tarkistusta, 0
  ongelmaa** - ikkuna ei mene kaavion reunojen yli eikä yläreunan yli, eikä
  mikään rivi rivity millään kielellä. Kolmas rivi toteutettu siksi kaikkialle.

### 4. "Nyt Maassa" ja "Matkalla"
Viivan nimi "Nyt Maassa"; piirtoalueen yläreunaan himmennetyn alueen kohdalle
"Matkalla · saapuu ~N min" (uusimman mittauksen matka-aika = sen L1-aika −
juuri nyt saapuva L1-aika, pyöristetty 5 min, alle 10 min minuutteina; jos
teksti ei mahdu kapeaan himmennettyyn alueeseen, se tasataan oikeaan
reunaan). Selitteeseen "Himmennetty osa on mitattu avaruudessa ja saapuu
Maahan lähiminuutteina." Huom: viive on yleensä 30-60 min, joten
"lähiminuutteina" voi olla lievä ilmaus - kerro jos muutetaan.

### 5. Bt-selite
Bz-kaavion selitteeseen "±Bt: kentän kokonaisvoimakkuus. Bz liikkuu aina
tämän rajan sisällä." (kaikki kielet).

### 6. GW:n historia - edellistä vuorokautta EI saa NOAA:lta
Tarkistettu Actionsista 2026-10-18 (hakemistolistaukset `text/`, `json/`,
`products/`, `products/animations/`): pallonpuoliskon tehosta on vain
`text/aurora-nowcast-hemi-power.txt` ("This file contains data for
<tämä päivä>", alkaa 00.00 UTC = klo 03.00 Suomen kesäaikaa / 02.00
talviaikaa). Edellisen vuorokauden tiedostoa tai arkistoa ei ole julkisena.
**Toteutettu:** kaaviossa tyhjä osa viivoitettu ja datan alku merkitty
("Tiedot alkaen 03.00"); istunnon aikana haetut rivit säilyvät (24 h).
**Vaihtoehdot täydelle 24 h:lle (päätettäväksi):**
1. Oma GitHub Actions -työnkulku tallentaa tiedoston 30-60 min välein
   gh-pagesille (esim. `data/hemi-power.json`, rullaava 48 h) - selain lukisi
   oman tiedoston + NOAA:n tuoreimman. Uusi datahaku -> vaatii hyväksynnän ja
   koeajon mainissa (ajastus toimii vain oletushaaralla).
2. Pidetään nykyinen (selkeä merkintä).
3. Lyhyempi oletusaikaväli GW:lle (esim. 6 h), jolloin aukko näkyy harvoin.
**Muut kaaviot:** Bz/Bt/nopeus/tiheys: NOAA:n rtsw-tiedosto on rullaava 24 h
-> 24 h näkymä aina täysi (yksittäiset mittauskatkot näkyvät katkoina). Kp:
7 vrk mitattua + 3 vrk ennustetta -> täysi. Sama "Tiedot alkaen" -merkintä
on käytössä kaikissa aikasarjakaavioissa, jos data alkaa myöhemmin.

### Muut korjaukset
- Bugi: ruksilla suljettu kaavio jätti viivästyneen takaisin-tapahtuman
  (history.back), joka sulki heti perään avatun uuden kaavion. Korjattu
  (`swc.skipPop`). Löytyi automaattitestistä.

### Testaus
`npm run screenshots -- --offline --states=tiheys-keski,tiheys-oikea,tiheys-vasen,
bz-matkalla,kp24-nyt,kp3-nyt,kp3-arvio,kp3-ennuste,gw-24h` (uudet tilat) ja
`--time=2026-10-19T03:30+03:00` (simuloitu kello, fixtuurit samasta hetkestä;
GW-fixtuuri alkaa NOAA:n tapaan 00.00 UTC). Kuvattu 360 × 640 ja 430 × 932.

### Tarkistettava oikealla puhelimella
- Arvoikkunan luettavuus kartan päällä ilman taustaa (pelkkä teksti).
- Sormen alla: ikkuna on sormen yläpuolella, ei peity.
- Kp:n tunneittainen napsahdus (tuntuuko tarkalta, värinä tarkastelun alussa).
- Takaisin-ele ja ruksi: kaavion vaihto nopeasti toiseen (korjattu bugi).

## Tänä yönä: aikakorjaus, pilvisyyden pehmennys ja värit (2026-10, haara `claude/tana-yona-3`)

### A. Aikakorjaus (bugi)
**Syy:** V2 piirsi jokaisen tunnin solun, jonka KESKELLE (tasatunti + 30 min)
tulivat datapiste ja kellonaika, mutta Kp-portaat ja parhaan ajan korostus
solun REUNAAN (tasatunti). Kellonajan merkintä oli siis 30 min myöhemmässä
kohdassa kuin sama hetki portaissa -> portaat näyttivät olevan 02.30/05.30 ja
korostus 02.30-04.30. **Korjaus:** V2:n x-akseli lasketaan suoraan ajasta
(`nightChartGeom`: `x(t)`): datapisteet ja kellonajat täsmälleen tasatunneilla,
Kp-jaksojen rajat NOAA:n UTC-alkuajoista (`aur.block`) ja korostus tasan
`from`-`to`. Paikallinen aika tulee Date-olioista, joten kesäajan päättyminen
(25.10.2026) siirtää rajat automaattisesti klo 02/05/08:aan.
**Testattu** (simuloitu kello): 18.10.2026 portaat 18/21/00/03/06, korostus
02.00-03.00 = otsikko "Paras aika klo 02–03"; 26.10.2026 portaat 17/20/23/02/05,
korostus 01.00-02.00 = otsikko.
**Muut:** V1 ja V3 ovat taulukoita (rivi per tunti, Kp-jakso haetaan tunnin
ajanhetkestä `kpBlockAt`) -> ei siirtymää. Nyt-välilehden Kp-kaavio laski jo
ennestään x:n ajasta (`swcGeom`) -> ei siirtymää.

### B. V2
- Pilvisyys pehmeänä alueena: monotoninen kuutiollinen (Fritsch-Carlson,
  `monotonePath`) - käyrä pysyy aina kahden naapuripisteen välissä, joten ei
  alle 0 % / yli 100 % eikä keksittyjä huippuja. Todennettu 20 000
  satunnaisella sarjalla (myös 0/100 %-ääriarvot): ylitys 0,000.
- Pehmennys on yhteisessä komponentissa sarjakohtainen valinta
  (`chartSeriesPath(pts, {smooth})`, oletus pois); käytössä vain V2:n
  pilvisyydellä (`NIGHT_CHART.cloudSmooth`). Muut kaaviot ennallaan.
- Mahdollisuuskäyrä ennallaan (suorat viivat), valkoiset pallot poistettu.
- Kp porrasviivana; tarkastelu napsahtaa lähimpään tasatuntiin, jolla on dataa.
- Pilvisyyskaistalle asteikko 0 / 50 / 100 (katkoviivat), yläreuna = 100 %,
  nimi "Pilvisyys %".

### C. Värit
`:root`-paletin yhteydessä `--night-cloud` #5f6b85 ja `--night-aur` #3f7f6e.
V1: pilvisyyspylväät + Revontulet-solujen tausta; V2: pilvisyysalue +
Kp-porras; V3: palkit (parhailla tunneilla revontulipalkki `--aurora`).
Parhaat tunnit kaikissa versioissa korostusvihreällä (`--aurora`); V1:n
Revontulet-solussa parhaan tunnin kohta sekoitus korostusvihreästä.
**Havainto:** V1:n täysvärinen Revontulet-solu on pintana selvästi raskaampi
kuin ohuet pilvipylväät, vaikka sävyt ovat yhtä tummia. Jos solu tuntuu liian
hallitsevalta, sitä voi himmentää (esim. 50 %) - kerro.

### Testaus
Testiympäristö: pilvisyys vaihtelee yön aikana (88 % -> 0 % -> 27 %),
simuloitu kello. Kuvat V1/V2/V3 360 × 640 ja 430 × 932. Kosketustesti
(V2 selaus, pitkä painallus, napautus) toimii.

### Tarkistettava oikealla puhelimella
- Kp-portaat ja korostus kellonaikojen kohdalla (kesäajan päättymisen jälkeen
  25.10. klo 02/05/08).
- Värien erottuvuus puhelimen näytöllä (pilvisyys vs. revontulet).


## Kaavioiden korjaukset 2 (2026-10, haara `claude/kaaviokorjaukset-2`)

### 1. "Saapunut Maahan"
Himmennetyn alueen teksti "Matkalla · saapuu ~X min" poistettu, pystyviivan
nimi "Nyt Maassa" -> "Saapunut Maahan" (`swc.arrived`, kaikki kielet; avain
`swc.transit` poistettu). Selite "Himmennetty osa on mitattu avaruudessa..."
säilyy. Arvoikkunan tila "Matkalla Maahan" himmennetyllä alueella säilyy.

### 2-4. Ulkoasu
- Tarkastelupiste (`.ch-dot`) kaikissa kaavioissa (V2:ssa nyt Mahdollisuus-
  käyrällä, ennen ei pistettä): täyttö `--aurora`, 2 px
  musta reunus (OP-malli).
- Arvoikkunan rivit samalla koolla (12 px); arvorivi eroaa vain lihavuudella
  ja kirkkaammalla värillä (`--ink`), muut `--dim`.
- Lähteet pois kaavioikkunoista ja Nyt-välilehdeltä (lähteet ovat
  asetusten "Tietoja ja lähteet" -ikkunassa). Kaavioikkunan alarivillä
  `scSrc` = "Päivitetty HH.MM" (`settings.updatedAt`): Bz/Bt/nopeus/tiheys/
  GW = viimeisin mittaus, Kp = haun hetki, pilvisyys = mallin ajoaika.
  Nyt-välilehden tuoreusrivi (OVATION "päivitetty") säilyy.

### 5-6. Kp:n otsikkoarvo ja tilat
Otsikkoarvo = KULUVAN 3 h jakson arvo (`kpCurrent()`), alla pieni teksti
"arvio · jakso 15–18" (`swc.kpPeriod`). Sama arvo Nyt-välilehdellä ja
alapalkissa (`state.kpNow`/`state.kpCur`, `loadKp()`).

**NOAA:n merkintöjen tulkinta (`kpKind()`):**
- `observed` = lopullinen mitattu arvo -> "mitattu".
- `estimated` = NOAA:n laskema arvio. NOAA käyttää sitä sekä kuluvalle ja
  juuri päättyneelle jaksolle (ennen lopullista arvoa) ETTÄ osin tuleville
  jaksoille. Tulkinta: "arvio" VAIN jaksoille, joiden alku on jo mennyt
  (kuluva ja päättyneet ilman lopullista arvoa).
- `predicted` TAI mikä tahansa jakso, joka alkaa nykyhetken jälkeen ->
  "ennuste", vaikka NOAA merkitsisi sen `estimated`.

### 7. Pilvisyyskaavio
Nyt-välilehden Pilvisyys-laatikko (kaaviokuvake) avaa oman kaavioikkunan
(`openSwChart('clouds')`, sama komponentti; ennen vei Tänä yönä -välilehdelle).
- Data: valitun mallin tunnittainen pilvisyys infoikkunan sijainnilla
  (`cloudGridPctAt`, sama kuin Nyt-laatikko). Laiskoilla malleilla
  (ICON-EU/HARMONIE) avaus lataa ikkunan aika-askeleet (24 h = ~25 askelta;
  HARMONIE ~1,45 Mt/askel -> ~35 Mt ensimmäisellä avauksella, ICON-EU
  ~0,5 Mt/askel). Askeleet jäävät muistiin ja ovat samat, joita aikajana
  käyttää. ECMWF: 3 h askeleet, tunnit interpoloitu.
- 24 h = mallin ajon alku -> +24 h. 12 h = 3 h ennen nykyhetkeä (tasatuntiin,
  ei ennen ajon alkua) -> +12 h. Nämä ovat oma tulkinta (pyyntö: "mallin
  ajon alusta 24 h").
- "Nyt"-viiva, pehmeä alue (monotoninen, 0-100 %) pilvivärillä
  (`--night-cloud`), yli 1,5 h aukko katkaisee alueen.
- Tarkastelu napsahtaa tasatunteihin; arvoikkuna: kellonaika / "N %" / mallin nimi.
- Otsikkoarvo = pilvisyys nyt; kuvaus `swc.desc.clouds`.
- Sijainti alueen ulkopuolella / ei sijaintia -> tyhjä kaavio.

### Testaus
Headless-Chromium 360 x 640: simuloitu kello + synteettinen data; Kp-otsikko
"2,7 / arvio · jakso 15–18", ennustejakson arvoikkuna "Ennuste", pilvikaavio
12/24 h, arvoikkunan fontit 12 px (400/700/400), piste rgb(92,201,160) +
musta 2 px reunus, ei lähderiviä. Kuvaustilat `bz-saapunut`, `pilvi-nyt`
(scripts/screenshots.mjs).

### Tarkistettava oikealla puhelimella
- Pilvisyyskaavion avausnopeus HARMONIElla (latausmäärä, ks. yllä).
- Tarkastelu sormella pilvikaaviossa ja Kp-kaaviossa.
- Pallon reunus näkyy selvästi kirkkaalla näytöllä.

## Paras aika ja nimitys "Näkyvyys" (2026-10, haara `claude/paras-aika`)

### Paras aika (4. kierros, korvaa "vain paras")
`nightBest()`: yön huipputunti (tasatilanteessa aikaisin) ja sen ympärillä
PERÄKKÄISET tunnit, joiden näkyvyys on vähintään `NIGHT.goodMin` (40 %,
sama kuin alapalkin korostusraja). Puuttuva arvo katkaisee jakson. Yksi
jakso (ei enää useita erillisiä).
- Korostus täsmälleen ensimmäisen ja viimeisen tunnin välille (pisteet ovat
  tasatunneilla): 20.00–22.00, tiivistelmä "Paras aika klo 20–22".
- Vain yksi tunti -> korostus +-30 min, "Paras aika klo 21".
- Mikään ei yllä kynnykseen -> "Ei hyviä mahdollisuuksia tänä yönä".
- Sama sääntö V1, V2, V3 (taulukoissa korostetut rivit = jakson tunnit).
- Tulkinta: "ylittää kynnyksen" = vähintään 40 % (sama vertailu kuin
  aiemmin ja alapalkissa). Toinen yhtä korkea huippu muualla yössä ei tule
  mukaan (vain huipun ympäröivä jakso) - kysy, jos pitäisi.

### "Mahdollisuus" -> "Näkyvyys"
Tänä yönä -välilehden otsikot, sarakkeet, kaavion selite, arvoikkuna ja
ruudunlukijateksti (`night.tip/col/chart.chance`, `night.chartAria`):
fi Näkyvyys, en Visibility, zh 可见度, es Visibilidad (sarake "Visib."), fr
Visibilité (sarake "Visib.") - samat sanat kuin Nyt-välilehden
näkyvyysindeksissä. "Ei hyviä mahdollisuuksia tänä yönä" säilyi (tehtävän
oma sanamuoto). Sarakeotsikot mahtuvat 360 px:iin kaikilla kielillä
(V1, V3, mitattu).

### Testaus
Headless 360 x 640, synteettinen yö (Kp 4,3-4,7 klo 00-06): "Paras aika klo
00–06", V2:n kaista 00.00–06.00. Yksikkötestit: kaksi huippua -> vain
korkeimman jakso; yksi tunti -> 18.30–19.30 ja "22"; alle kynnyksen -> null;
puuttuva arvo katkaisee jakson.

### Tarkistettava oikealla puhelimella
- Korostuksen ja tiivistelmän kellonajat oikealla datalla.

## 7 vrk -välilehti (2026-10, haara `claude/7vrk`)

### Data
- **Uusi datatyönkulku `ecmwf-7d.yml`** + `scripts/fetch-ecmwf-7d.py`:
  ECMWF HRES 00/12 UTC -ajo, askeleet 0-144 h / 3 h ja 150-216 h / 6 h,
  parametrit tcc, 2t, 10u/10v. Tallennus 2,5° x 2,5° ruutuina
  `data/e7d-<rivi>-<sarake>.json` (8 x 36 = 288 tiedostoa, 11 x 11 pistettä,
  tavu per arvo base64:nä, ~30 kt/ruutu). Selain hakee vain infoikkunan
  sijainnin ruudun. Miksi ruudut: 7 vrk tarvitsee yhden pisteen aikasarjan;
  koko alueen hila 61 askeleella olisi useita megatavuja. Ajastus 08.25 ja
  20.25 UTC (00/12-ajot julkaistaan ~7-8 h ajon jälkeen). Client.retrieve
  ilman päivää valitsee uusimman ajon, jossa KAIKKI askeleet ovat - 06/18-ajot
  ulottuvat vain 90 h:iin, joten aina 00/12.
- **Pilvisyys:** valittu malli (sama `nightCloud` kuin Tänä yönä) niin kauan
  kuin sen ladattu ennuste ja alue riittävät, sen jälkeen ECMWF-ruutu.
  Valittu ECMWF: 0-48 h pilvihilasta, sen jälkeen ruudusta (sama ajo).
- **Mallien todelliset ennustepituudet (tarkistettu 2026-10-19 GitHub
  Actionsista):**
  - ECMWF HRES: 00/12-ajot 360 h (3 h välein 144 h:iin), 06/18-ajot 90 h.
    Sovellus: 48 h pilvihila + 216 h 7 vrk -ruudut.
  - ICON-EU: 00/06/12/18-ajot 120 h (tunneittain 78 h:iin, sitten 3 h),
    03/09/15/21-ajot 48 h (DWD:n hakemistolistaus, clct).
  - HARMONIE (FMI): ~66 h (pistehaku 07 UTC alkaen: arvoja 62 h, sitten NaN).
  - **Sovelluksen omat tiedostot ulottuvat ICON-EU:lla ja HARMONIElla vain
    30 h:iin** (fetch-skriptien HOURS/STEPS). Siksi valitun mallin ennuste
    "loppuu" jo 30 h:n kohdalla (yö 2 osittain, yöt 3-7 ECMWF:stä).
    **Avoin kysymys:** pidennetäänkö ICON-EU/HARMONIE-hakua koko pituuteen?
    Haitta: lisää dataa gh-pagesiin (HARMONIE ~1,45 Mt/askel -> 66 h ~96 Mt)
    ja puhelimen lataukset (7 vrk -lista lataa kaikki pimeän tuntien askeleet).
    Kevyempi vaihtoehto: pisteaikasarjaruudut myös näille malleille.
- **Revontulet:** yöt 1-3 NOAA:n 3 vrk Kp-ennuste (3 h jaksot, kuten Tänä
  yönä). Jos tunnille ei ole jaksoa (yön 3 loppu: 3 vrk:n ennuste päättyy
  3. päivän 24 UTC), 27 vrk:n ennusteen vuorokausiarvo (merkitään "~" ja
  lähdehuomautukseen "Kp 27 vrk:n ennusteesta"). Yöt 4-7: NOAA
  `text/27-day-outlook.txt` (tarkistettu 2026-10-19: tekstitaulukko, CORS
  sallittu, JSON-versiota ei ole), sarake **"Largest Kp Index" =
  vuorokauden suurin Kp (kokonaisluku)**, yön keskikohdan UTC-päivältä,
  koko yölle yksi tasainen arvo. Huom: vuorokauden SUURIN arvo koko yön
  arvona yliarvioi tyypillisesti - siksi "suuntaa-antava".
- Muunnos sijaintikohtaiseksi: sama `kpVisibility()` (geomagneettinen lev.).
- Lämpötila ja tuuli: aina ECMWF-ruudusta (muissa malleissa ei lämpötilaa
  sovelluksen datassa; tuuli 10 m). Lähdehuomautuksessa "Lämpötila ja
  tuuli: ECMWF".
- Haku vasta välilehteä avattaessa, välimuistissa istunnon ajan (ruutu ja
  27 vrk:n ennuste; epäonnistunut haku muistetaan istunnon ajan).

### Yöt
- Yö 1 = sama jakso kuin Tänä yönä (käynnissä oleva nykyhetkestä tai
  seuraava). Yö k = ensimmäinen pimeä jakso yön 1 päivämäärän + k
  keskipäivästä (`darkPeriod`, raja SUN_DARK_DEG), enintään NIGHT.maxHours.
- Kaamos (pimeää koko vrk): yö klo 16-08 (`WEEK.polarFrom/To`). Yötön yö:
  rivi "Ei pimeää".
- Päivämäärä = pimeän alun päivä (illan päivä).

### Näkymä
- Tiivistelmä vain öistä 1-3 (suurin näkyvyys, tasan -> aikaisin).
- Yöt 4-7: erotin, peittävyys 0,6, "~", ei parasta aikaa; tuntinäkymän
  otsikossa "Näkyvyys enintään ~N % (suuntaa-antava)" (oma tulkinta, koska
  parasta aikaa ei näytetä).
- Pilvien merkki "*" kun yksikin tunti on ECMWF:stä ja valittu malli on muu.
- Kuu: 8 vaiheen SVG (`moonIconSVG`), valaistu puoli oikealla kasvavassa
  (pohjoinen pallonpuolisko).
- Tuntinäkymä `#nightDetail` (`openNightDetail`/`closeNightDetail`): sama
  kaavio kuin Tänä yönä V2 (`nightChartHTML(n, ND_IDS)`), takaisin-ele
  (`history.pushState`), Esc, ruksi, taustan napautus. Lista jää DOMiin,
  joten vierityskohta säilyy (testattu).

### Avoimet kysymykset
- Lämpötilan yksikkö: asetuksissa ei ole °C/°F-valintaa -> aina °C, tuuli m/s
  (korkeus "10 m"/"33 ft" etäisyysasetuksen mukaan). Lisätäänkö °F?
- ICON-EU/HARMONIE-haun pidennys (ks. yllä).

### Testaus
Headless 360 x 640 ja 430 x 932, synteettinen data: hyvä lista (paras yö
korostettuna, yöt 4-7 himmeinä), ei hyviä öitä, yön 2 ja yön 5 tuntinäkymä
(tarkastelu toimii, "Kp ~2 · suuntaa-antava"), HARMONIE valittuna (yö 2
osittain ja yöt 3-7 ECMWF:stä, merkki ja selite). Takaisin-ele sulkee,
vierityskohta säilyy. Kielet fi/en/zh/es/fr: ei ylivuotoja 360 px:ssä.
fetch-ecmwf-7d.py: ruutujako ja koodaus testattu synteettisellä hilalla;
oikea haku ajettu GitHub Actionsissa (ks. raportti).

### Tarkistettava oikealla puhelimella
- Rivin napautus avaa tuntinäkymän (ei vahingossa vierityksen aikana).
- Androidin takaisin-ele sulkee tuntinäkymän eikä infoikkunaa.
- Listan vierityskohta säilyy tuntinäkymän sulkemisen jälkeen.
- Latausaika HARMONIElla/ICON-EU:lla (lista lataa pimeän tuntien askeleet).
