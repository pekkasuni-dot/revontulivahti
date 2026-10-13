# MUISTIO: revontulikentän kolmiportainen väritys (2026-10)

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
Testattu koko sovelluksella (index.html) headless-Chromiumissa
synteettisellä OVATION-kentällä (Gaussin ovaali, maksimi 28 %): kolme
tasaväristä vyöhykettä, selite näkyy, luokkafunktio 2→ei, 4/9→Heikko,
10/19→Kohtalainen, 20/28→Hyvä, tietoruutu "26% · Hyvä".
