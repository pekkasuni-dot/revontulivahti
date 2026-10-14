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
