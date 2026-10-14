# MUISTIO: revontulikentän porrastettu väritys (2026-10)

## PÄIVITYS (2026-10, 2. kierros): My Aurora Forecastin arvot
Käyttäjän päätöksellä kynnysarvot vaihdettiin SAMOIKSI kuin My Aurora
Forecast -sovelluksen käyttöohjeessa (kuvakaappaus sovelluksesta):

| Luokka        | OVATION p (%) | Väri         |
|---------------|---------------|--------------|
| (ei mitään)   | 0             | läpinäkyvä   |
| Hyvin heikko  | 1–9           | tummanharmaa |
| Heikko        | 10–29         | vihreä       |
| Kohtalainen   | 30–49         | oranssi      |
| Hyvä          | ≥ 50          | punainen     |

Peittävyys edelleen 0,6 kaikissa luokissa. Alla oleva alkuperäinen
perustelu (rajat 4/10/20) on korvattu tällä - säilytetty historiaksi.
Huom: 1 %:n raja kattaa laajan alueen (koko ovaalin ympäristön), joten
tummanharmaa näkyy isona alueena kuten My Aurora Forecastissa.

---


## Mitä muutettiin
OVATION-kenttä (NOAA SWPC `ovation_aurora_latest.json`) piirrettiin aiemmin
jatkuvana liukumana (vihreä → keltainen → oranssi → punainen, peittävyys
kasvoi arvon mukana). Käyttäjän palaute: kenttä näkyi käytännössä vain eri
vihreän vahvuuksina ja liian haaleana. Uusi tyyli My Aurora Forecastin
tapaan: KOLME selkeää luokkaa tasavärein, EI liukumaa (`AURORA_STYLE` index.html:ssä):

| Luokka       | OVATION p (%) | Väri     | Peittävyys |
|--------------|---------------|----------|------------|
| (ei mitään)  | < 4           | läpinäkyvä | 0        |
| Heikko       | 4–9           | vihreä   | 0,6        |
| Kohtalainen  | 10–19         | oranssi  | 0,6        |
| Hyvä         | ≥ 20          | punainen | 0,6        |

Raakaruudut säilyvät (1° hilasolu, ei interpolointia, ei sumennusta).
Selite kartan vasemmassa yläkulmassa (`#auroraLegend`, `renderAuroraLegend()`),
ja tietoruudun "Revontulet"-kenttä näyttää luokan nimen luokan värillä.

## Kynnysarvojen perustelu
- OVATIONin arvo on todennäköisyys nähdä revontulet SUORAAN YLÄPUOLELLA.
  Rauhallisena yönä (Kp 1–2) ovaalin maksimi on tyypillisesti vain
  10–30 %, kohtalaisen aktiivisena (Kp 3–4) n. 30–50 %, ja vasta
  myrskyssä (Kp 5+) lähestytään 60–100 %:a.
- Jos rajat asetettaisiin tasaisesti (esim. 30/60/90), punainen ja oranssi
  näkyisivät vain harvinaisina myrskyöinä, ja tavallisena revontuliyönä
  kartalla olisi pelkkää vihreää - juuri se ongelma, josta palaute tuli.
- Valitut rajat 4/10/20: rauhallisenakin yönä ovaalin laidat ovat
  vihreitä (4–9 %), ydin oranssi (10–19 %), ja punainen tulee näkyviin
  heti kun maksimi nousee yli 20 %:n (tavallinen revontuliyö). Alle 4 %
  on käytännössä taustaa ja jätetään läpinäkyväksi.
- Huom: tietoruudun "Revontulet"-luku katsoo myös hieman pohjoisemmaksi
  (ovaali voi näkyä horisontissa, ks. `auroraProbAt()`), joten valitun
  pisteen luokka voi olla askeleen korkeampi kuin pisteen oma ruutu
  kartalla. Näkyvyysarvio ("Hyvät/Heikot mahdollisuudet") yhdistää edelleen
  revontulet, pilvet ja pimeyden, joten se voi poiketa pelkästä luokasta.
- Rajat ovat arvio OVATIONin tunnetuista tyypillisistä arvoista - NOAA:n
  dataan ei ollut yhteyttä testiympäristöstä tarkistushetkellä. Jos
  käytännössä jokin luokka jää harvoin näkyviin, säädä `AURORA_STYLE.classes`.

## Testaus
Testattu koko sovelluksella (index.html) headless-Chromiumissa (1. kierros, rajat 4/10/20;
2. kierros: synteettinen ovaali maksimi 60 %, luokat 0→ei, 1/9→Hyvin heikko,
10/29→Heikko, 30/49→Kohtalainen, 50/60→Hyvä, tietoruutu "58% · Hyvä")
synteettisellä OVATION-kentällä (Gaussin ovaali, maksimi 28 %): kolme
tasaväristä vyöhykettä, selite näkyy, luokkafunktio 2→ei, 4/9→Heikko,
10/19→Kohtalainen, 20/28→Hyvä, tietoruutu "26% · Hyvä".

## Lippu, Kp ja infoikkuna (2026-10)

**Lipun revontulirivi:** klikkauslippuun rivi "Revontulet NN%" pilvirivin
alle. Arvo on OVATION-todennäköisyys TÄSMÄLLEEN siitä 1°-raakaruudusta,
jonka väri kartalla näkyy (`ovationCellAt()`, sama indeksointi kuin
`drawOvalOverlay()`) - EI `auroraProbAt()`:n pohjoiseen katsovaa korjausta,
jota näkyvyysindeksi käyttää. Rivit näkyvät vain kun kyseinen taso on
päällä. Kun aikajana ei ole nykyhetkessä: "Revontulet (nyt) NN%", koska
OVATION on nowcast. Alapaneelin "Revontulet: nyt" -merkki poistettiin
(tieto on nyt lipussa, paneeliin ei lisätä tekstejä).

**Kp näytti "–" (bugi):** NOAA SWPC muutti 2026 products-JSONit
(Service Change Notice 26-21, weather.gov/media/notification/pdf_2026/
scn26-21_Data_Format_Changes_Impacting_SWPC_Products.pdf): ennen
`[[otsikot],[arvot]...]`, nyt `[{time_tag, Kp, ...}]`, arvot numeroina.
Vanha koodi luki `rows[i][1]` -> aina NaN -> ei arvoa (myöskään ennuste
ei toiminut). `kpRows()` lukee nyt molemmat muodot (avain `Kp`/`kp`/
`estimated_kp`, aikaleima `time_tag`). Testiympäristöstä EI ole yhteyttä
NOAA:han: muoto varmistettu SCN-ilmoituksesta ja kahdesta muusta
projektista, jotka korjasivat saman muutoksen; jäsennin testattu
selaimessa uuden muodon mukaisella testivastauksella (Kp 3,33 -> "3.3").
Kp-nappi poistettiin ylälaidasta, arvo näkyy laajennetussa alapaneelissa
("Kp nyt").

**Infoikkuna korvaa selitteen:** vasemman yläkulman `#auroraLegend`
poistettu. Revontulinappi on päälle/pois-toiminto, joka päälle kytkettäessä
avaa asetusrivin (kuten kamerat), jossa i-nappi (oma SVG: ympyrä + i).
Ikkuna (`#auroraInfo`, `renderAuroraInfo()`) lukee luokat, värit ja
kynnykset `AURORA_STYLE`:sta - samat kuin kartalla - ja kertoo mitä
OVATION-todennäköisyys tarkoittaa ja että data on nykyhetkeltä. Ikkuna on
`#menus`-säiliössä "auki olevana valikkona" (`state.openMenu='auroraInfo'`),
joten se sulkeutuu ruksista, kartan klikkauksesta (joka ei silloin siirrä
lippua) tai toisesta toimintonapista - sama logiikka kuin asetusriveillä.

## Yhteinen revontulikuvake ja i-nappi (2026-10)
- Toimintonapin ja lipun revontulikuvake on SAMA piirros
  (`auroraIconSVG(koko)`): aiempi napin kuvake, jonka verhojen yläosa liukuu
  vihreästä punaiseen (revontulten punainen yläosa, korkeat happiemissiot).
  Jokaisella kopiolla omat gradientti-id:t, koska saman id:n gradientti
  katoaa jos ensimmäinen määrittely on piilossa olevassa SVG:ssä.
- i-napin kirjain on kursiivi, oma SVG-polku (kalteva varsi, alussa
  pieni koukku, alaosa kaartuu oikealle); ympyrä ja väri ennallaan.
- PÄIVITYS 2026-10: hetken pystysuora i, sitten käyttäjän malliliitteen
  mukainen kursiivi-i: piste (13,1;7,2) varren kaltevan akselin jatkeella,
  koukku ja häntä, kuvio ympyrän keskellä; kuvake 20 % muita suurempi.

## Pystysauma 0°:ssa, harmaa peitto ja liukuva väritys (2026-10)

**Sauma - diagnoosi.** `drawOvalOverlay()` laski pikselille
`lon = x/W*360-180` ja `lonIdx = Math.round((lon+360)%360)`. Välillä
lon -0,5...0 tämä antaa 360, ja `grid[latIdx*360 + 360]` on litteässä
taulukossa SEURAAVAN rivin (1° pohjoisempi) solu 0. Kartalla 0,5° levyinen
pystykaista heti 0-meridiaanin länsipuolella (Grönlannin ja Huippusaarten
välissä), jossa koko ovaali on asteen etelämpänä: alhaalla kaistan väri
ulkonee ovaalin alle ("palkki"), ylhäällä puuttuu ("rako"). Näkyi kaikilla
zoomeilla, selvimmin z3-5 (kaista 0,5° = ~23 px z5:llä). 180°:ssa vikaa ei
ollut (lon 179,5...180 -> 180), mutta tarkistettu uudella koodilla:
arvo jatkuu 179,5 -> 180,5 tasaisesti (headless-testi ja numeerinen
vertailu 62-78 °N). Toistettu ennen korjausta testidatalla (sama kuva
kuin käyttäjällä), korjauksen jälkeen ei kaistaa.

**Harmaa porraskuvio Kp 2,3:lla - selitys.** Luokka "Hyvin heikko" (1-9 %)
väritettiin tummanharmaalla `rgb(50,56,68)` peittävyydellä 0,6 - SAMALLA
peittävyydellä kuin vihreä/oranssi/punainen. Hiljaisella Kp:llä OVATION
antaa 1-9 % lähes koko arktiselle alueelle, joten kartta peittyi tasaiseen
harmaaseen, ja 1°-solujen raakaväritys (ei interpolointia, nearest) teki
rajoista portaita.

**Korjaus.**
- Kenttä interpoloidaan bikubisesti (Catmull-Rom, kuten pilvet),
  pituusaste kiertää (359 -> 0), leveysaste rajataan. Solun keskipisteessä
  arvo = raaka-arvo (mitattu max ero 0). Lippu (`ovationAt`) ja kartta
  käyttävät samaa kaavaa.
- Väri: vihreä 10-22 %, liukuu oranssiin 22-30 %, oranssi 30-42 %, liukuu
  punaiseen 42-50 %. Alle 10 % vihreä (ei harmaa). Suora vihreä->oranssi
  10->30 kokeiltiin: 20 % näytti kellertävältä -> hylätty.
- Alfa (käyttäjän päätös, 2. versio): 0-10 % täysin läpinäkyvä (1. versio
  näytti 3-10 % haaleana, alfa <= 0,12 - hylätty). Yli 10 %: ease-out
  0 -> 0,6 välillä 10-30 % (15 % = 0,26, 20 % = 0,45), ei porrasta
  kynnyksellä. Säädettävissä `?debug`-paneelissa (Kynnys %, Täysi %,
  Alfa max).
- 3. versio (käyttäjä, julkaisun jälkeen): liukuva 10->30 % näkyi kartalla
  liian heikosti -> peittävyys 0,6 kaikille väreille yli 10 % (kuten ennen
  liukuvaa väritystä), 1 %-yksikön ramppi 10->11 % pehmentää reunan.
- Selitteen luokat ja rajat (My Aurora Forecast 1/10/30/50 %) säilyvät;
  värinäyte = kartan väri luokan keskeltä.

**Aikaleima.** NOAA:n JSONissa `Observation Time` (mittaus) ja
`Forecast Time` (~30-90 min myöhemmin). Koodi luki ensisijaisesti
Forecast Timea ja näytti sen "viimeksi päivitettynä" - siksi selite
näytti 20:08 kellon ollessa 19:29. Nyt: "Ennuste klo 20:08 asti,
päivitetty 19:29" paikallisessa ajassa (infoikkuna ja selitysrivi).
HUOM: testiympäristöstä ei ole pääsyä NOAA:han - kenttien merkitys
NOAA:n dokumentaation mukaan, ei tarkistettu oikeasta tuoreesta tiedostosta
tässä istunnossa (vanha mock-tiedosto: molemmat kentät samat).
