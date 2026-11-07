# Hälytysten kenttätesti – loppuyhteenveto (7.11.2026)

Vain luku: koodia, konfiguraatiota, ajastimia, salaisuuksia tai haaroja ei muutettu. Lähde: haaran `halytys-loki-2` lopullinen tila (commit 7490d5d, 7.11. klo 02.05): `logs/*.jsonl` (1 376 ajoa), `PALAUTE.md`, `HAVAINNOT.md`, `LOPPURAPORTTI.md`, sekä mainin koodi (6a14abd) ja Actionsin ajohistoria. Ajat Helsingin aikaa. Herkkyyslaskelmat on tehty simuloimalla nykyinen päätöslogiikka (`alerts/aurora-alerts.js`, toiston esto mukana) lokin riveillä; simulaatio tuottaa nykyrajoilla täsmälleen lokin todelliset määrät (Nyt 33/1/0, Tulossa 20/11/9, Tänä yönä 65/58/46 = herkkä/normaali/varma), joten sitä voi käyttää vertailuun.

## Yhteenveto (10 riviä)

1. Jakso 23.10. klo 17.50 – 7.11. klo 01.50, 15 iltaa, 1 376 ajoa, ei yli 1 h aukkoja (pisin 30 min, 7 kertaa); ntfy-ilmoituksia lähti 49 (27.10. alkaen), kaikki onnistuivat.
2. Lähteneistä 38 oli Tänä yönä, 10 Tulossa ja 1 Revontulia nyt; palautetta tuli 7 hälytykseen: 6 × Näkyi (9 painallusta), 1 × Pilvessä (2 painallusta), 0 × Ei näkynyt; 42 jäi ilman vastausta.
3. Suurin ongelma: **Tänä yönä -arvio on järjestelmällisesti liian korkea**. Yön ennuste oli keskimäärin 44 %, mutta saman yön toteutunut nyt-näkyvyys (OVATION + HARMONIE) keskimäärin 10 %. Yön arvio ylitti 40 % 58 paikka-illassa, mutta nyt-näkyvyys ylitti 35 % vain yhdessä.
4. **Revontulia nyt (normaali 35 %) lähti koko jaksolla kerran** (Utsjoki 31.10. klo 20.35, Kp 3,3, palaute Näkyi). Nyt-näkyvyys ylitti 20 % 24 paikka-illassa, joten 35 % on tällä datalla lähes mykkä.
5. 2.11. aamu: kynnys ei ylittynyt. Klo 00.50 Levi 16 % / pilvet 0 % / Kp 2,0 (vastaa kuvakaappausta), alle sekä herkän (20 %) että normaalin (35 %) rajan. Herkän rajan ylitti illalla 1.11. klo 18.20–22.35 seitsemän kertaa (Utsjoki, Kilpisjärvi, Levi), mutta ntfy lähettää vain normaalitason.
6. Mallit erosivat yli 30 pp 27 %:ssa pimeistä paikka-ajoista ja 34 %:ssa ajoista, joissa OVATION oli vähintään 20 %. HARMONIE poikkesi muista useimmin.
7. 2/3-sääntö (vähintään 2 mallia samaa mieltä) puolittaisi Nyt-hälytykset herkällä rajalla (33 → 16) ja vähentäisi Tulossa-hälytyksiä normaalilla 11 → 7. Se olisi estänyt ainoan Pilvessä-palautteen (Oulu 31.10. 00.35), mutta myös yhden Näkyi-palautteen (Utsjoki samana yönä).
8. Tiheys ilman rajaa: normaalitasolla enintään 3 hälytystä per paikka per ilta (4 kertaa, kaikki 30.–31.10.), herkällä tasolla enintään 6 (Utsjoki 31.10.). Ruudun sisäistä pilvisyysvaihtelua ei voitu laskea: koordinaatit eivät ole lokissa.
9. Suositus vaiheeseen 2: Nyt 20–25 % ja 2/3-sääntö. Tulossa: pilviraja 60 % pitää, ja lisäksi 2/3-sääntö. Tänä yönä: kalibroi arvio uudelleen ennen rajan valintaa; jos raja pitää valita heti, 70 % (36 hälytystä, kattaa 21/24 iltaa, joina nyt-näkyvyys ylitti 20 %). Tiheysraja: 2 per ruutu per ilta.
10. Siivous kesken: otsikko ja ajastimen nimi ovat yhä "AuroraAwesome", varajastus on yhä 30 min eikä 1 h, ja ntfy-kanavan vaihtoa ei voi todentaa. Vaihe 1 (FCM) on mainissa, mutta Firebase-salaisuuksia ei ollut viimeisessä käännöksessä (2.11.) eikä testi-ilmoitusta ole lähetetty.

## 1. Kattavuus

| Kohta | Tulos |
|---|---|
| Ensimmäinen ajo | 23.10.2026 klo 17.50 (jakson `START_AT` 23.10. 14.45 UTC) |
| Viimeinen hälytysajo | 7.11.2026 klo 01.50 (6.11. 23.50 UTC); lopullinen raportti 7.11. klo 02.05 |
| Ajoja | 1 376 (15 min välein olisi 1 381, 99,6 %) |
| Logiikkaversio | 2: 86 ajoa (23.–24.10.), 3: 1 290 ajoa (HARMONIE-pilvet + ntfy, 24.10. klo 15.20 alkaen) |
| Ilmoitukset ntfy:llä | 27.10. klo 15.05 alkaen (lokin `sent`-kenttä 24.10. alkaen, tyhjä 27.10. asti) |
| Datavirheet | 2 ajoa: 4.11. klo 13.05 ja 6.11. klo 05.20, virheilmoitus Bz-varalähteestä `mag-1-day.json` (HTTP 404; NOAA poisti tiedoston) |
| Aukot yli 1 h | ei yhtään |
| Pisin aukko | 30 min |
| Vaihtuneet testipaikat | 23.10. klo 23.35: + Lyngen, Levi, Sodankylä, − Tromssa; 24.10. klo 15.20: + Utsjoki, − Helsinki |

Aukot yli 20 min (yksi 15 min ajo puuttuu, syy Actionsin ajohistoriasta):

| Aukko | Kesto | Syy (ajohistoria) |
|---|--:|---|
| 26.10. 16.20 → 16.48 | 28 min | Ajastin käynnisti 16.35 ja 16.50, mutta lokin ajoajoista päätellen ajot alkoivat myöhässä samassa jonossa (`concurrency: alert-dryrun`) |
| 26.10. 16.50 → 17.19 | 29 min | sama |
| 27.10. 20.20 → 20.50 | 30 min | Cloudflare-ajastin ei käynnistänyt 20.35; GitHubin varajastus käynnistyi 20.35, mutta vahti ohitti sen (ajastin oli ajanut alle 30 min sitten) |
| 29.10. 16.35 → 17.05 | 30 min | Cloudflare-ajastin ei käynnistänyt 16.50 (ei ajoa historiassa) |
| 4.11. 11.35 → 12.05 | 30 min | Cloudflare-ajastin ei käynnistänyt 11.50 |
| 4.11. 17.50 → 18.20 | 30 min | Cloudflare-ajastin ei käynnistänyt 18.05 |
| 4.11. 19.35 → 20.05 | 30 min | Cloudflare-ajastin ei käynnistänyt 19.50 (ei ajoa historiassa) |

Ajastimen nykytila (7.11.):

| Kohta | Tulos |
|---|---|
| Cloudflare-ajastin | Käynnistää `alert-dryrun.yml`:n yhä 15 min välein (`workers/ajastin/src/schedule.js` rivi 15: `every: 15, offset: 5`); viimeisimmät ajot 7.11. 12.20–13.50 UTC |
| Ajojen sisältö | Tila `done`: hälytysajo, raportti ja tallennus ohitetaan (`skipped`), ajo päättyy heti. Lokiin ei tule rivejä 7.11. klo 02.05 jälkeen |
| GitHubin varajastus | `alert-dryrun.yml` rivi 27: `cron: '4,34 * * * *'` = 30 min (ajettu mm. 7.11. 12.30 UTC) |

## 2. Lähteneet hälytykset (ntfy, taso normaali)

Kaikki 49 lähti tilalla `ok`. Ilmoituspaikat: Oulu, Rovaniemi, Kilpisjärvi, Levi ja Utsjoki (Lyngen ja Sodankylä ilman ilmoituksia). Ruutu = testipaikka (sijaintiruutuja ei ollut kenttätestissä; ks. osio 7). Pilvilähde kaikissa: **HARMONIE** (`ALERT_CFG.cloudModel`). "Mallit < 60 %" = mallit, joiden pilvisyys paikassa oli hälytyshetkellä alle Tulossa-normaalirajan 60 % (H = HARMONIE, E = ECMWF, I = ICON-EU); IL:n editoitu ennuste (M) ei ole lokissa. Tänä yönä -hälytykset tarkistetaan klo 15.05 (valoisaan aikaan), joten niiden nyt-näkyvyys on 0 % ja pilvisyys on tarkistushetken, ei yön. Kp on reaaliaikainen arvio ajohetkellä.

| # | Aika | Paikka | Tyyppi | Näkyvyys nyt % | Yön paras % | Kp | Bz nT | Pilvisyys HARMONIE % | ECMWF / ICON-EU % | Mallit < 60 % | Laukaisu (normaali-taso) | Palaute |
|--:|---|---|---|--:|--:|--:|--:|--:|---|---|---|---|
| 1 | 27.10. 15.05 | Utsjoki | Tänä yönä | 0 | 81 | 1,3 | -1,4 | 99 | 98 / 79 | – | yön paras 81 % >= 40 % | – |
| 2 | 28.10. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 88 | 0 | 1,3 | 93 | 74 / 89 | – | yön paras 88 % >= 40 % | – |
| 3 | 28.10. 15.05 | Levi | Tänä yönä | 0 | 61 | 0 | 1,3 | 100 | 89 / 98 | – | yön paras 61 % >= 40 % | – |
| 4 | 28.10. 15.05 | Utsjoki | Tänä yönä | 0 | 87 | 0 | 1,3 | 100 | 100 / 100 | – | yön paras 87 % >= 40 % | – |
| 5 | 29.10. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 84 | 0 | 2 | 100 | 97 / 98 | – | yön paras 84 % >= 40 % | – |
| 6 | 29.10. 15.05 | Utsjoki | Tänä yönä | 0 | 95 | 0 | 2 | 100 | 92 / 94 | – | yön paras 95 % >= 40 % | – |
| 7 | 30.10. 15.05 | Oulu | Tänä yönä | 0 | 90 | 0 | -5,5 | 100 | 100 / 92 | – | yön paras 90 % >= 40 % | – |
| 8 | 30.10. 15.05 | Rovaniemi | Tänä yönä | 0 | 72 | 0 | -5,5 | 72 | 68 / 97 | – | yön paras 72 % >= 40 % | Näkyi ×1 |
| 9 | 30.10. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 83 | 0 | -5,5 | 78 | 79 / 36 | I | yön paras 83 % >= 40 % | Näkyi ×4 |
| 10 | 30.10. 15.05 | Levi | Tänä yönä | 0 | 88 | 0 | -5,5 | 83 | 14 / 64 | E | yön paras 88 % >= 40 % | – |
| 11 | 30.10. 15.05 | Utsjoki | Tänä yönä | 0 | 97 | 0 | -5,5 | 99 | 81 / 85 | – | yön paras 97 % >= 40 % | Näkyi ×1 |
| 12 | 30.10. 22.20 | Kilpisjärvi | Tulossa | 14 | – | 0,3 | -5,1 | 44 | 89 / 99 | H | Bz -5.1 nT etelään 344 min, Bt 7.85 nT, Kp 0.3 + 1 >= Kp-raja -0.1, pilvisyys 44 % < 60 % | – |
| 13 | 30.10. 22.20 | Levi | Tulossa | 20 | – | 0,3 | -5,1 | 17 | 12 / 66 | H+E | Bz -5.1 nT etelään 344 min, Bt 7.85 nT, Kp 0.3 + 1 >= Kp-raja 0.8, pilvisyys 17 % < 60 % | – |
| 14 | 30.10. 22.20 | Utsjoki | Tulossa | 21 | – | 0,3 | -5,1 | 12 | 39 / 69 | H+E | Bz -5.1 nT etelään 344 min, Bt 7.85 nT, Kp 0.3 + 1 >= Kp-raja 0, pilvisyys 12 % < 60 % | – |
| 15 | 30.10. 22.50 | Rovaniemi | Tulossa | 20 | – | 0,7 | -7,2 | 24 | 2 / 91 | H+E | Bz -7.2 nT etelään 372 min, Bt 6.66 nT, Kp 0.7 + 1 >= Kp-raja 1.4, pilvisyys 24 % < 60 % | – |
| 16 | 30.10. 23.05 | Oulu | Tulossa | 11 | – | 1,3 | -7,7 | 53 | 100 / 81 | H | Bz -7.7 nT etelään 385 min, Bt 9.11 nT, Kp 1.3 + 1 >= Kp-raja 2.1, pilvisyys 53 % < 60 % | – |
| 17 | 31.10. 00.35 | Oulu | Tulossa | 21 | – | 2,7 | -7 | 15 | 93 / 63 | H | Bz -7 nT etelään 20 min, Bt 8.73 nT, Kp 2.7 + 1 >= Kp-raja 2.1, pilvisyys 15 % < 60 % | Pilvessä ×2 |
| 18 | 31.10. 00.35 | Levi | Tulossa | 23 | – | 2,7 | -7 | 16 | 40 / 61 | H+E | Bz -7 nT etelään 20 min, Bt 8.73 nT, Kp 2.7 + 1 >= Kp-raja 0.8, pilvisyys 16 % < 60 % | Näkyi ×1 |
| 19 | 31.10. 00.35 | Utsjoki | Tulossa | 20 | – | 2,7 | -7 | 18 | 65 / 85 | H | Bz -7 nT etelään 20 min, Bt 8.73 nT, Kp 2.7 + 1 >= Kp-raja 0, pilvisyys 18 % < 60 % | Näkyi ×1 |
| 20 | 31.10. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 66 | 2,3 | -6,5 | 99 | 98 / 95 | – | yön paras 66 % >= 40 % | – |
| 21 | 31.10. 15.05 | Utsjoki | Tänä yönä | 0 | 97 | 2,3 | -6,5 | 100 | 100 / 100 | – | yön paras 97 % >= 40 % | – |
| 22 | 31.10. 18.05 | Utsjoki | Tulossa | 29 | – | 2,3 | -6,2 | 10 | 86 / 90 | H | Bz -6.2 nT etelään 38 min, Bt 11.21 nT, Kp 2.3 + 1 >= Kp-raja 0, pilvisyys 10 % < 60 % | – |
| 23 | 31.10. 20.35 | Utsjoki | Revontulia nyt | 38 | – | 3,3 | -10,2 | 61 | 73 / 100 | – | näkyvyys 38 % >= 35 % | Näkyi ×1 |
| 24 | 1.11. 15.05 | Oulu | Tänä yönä | 0 | 60 | 1,3 | 0,6 | 100 | 100 / 100 | – | yön paras 60 % >= 40 % | – |
| 25 | 1.11. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 99 | 1,3 | 0,6 | 41 | 55 / 71 | H+E | yön paras 99 % >= 40 % | – |
| 26 | 1.11. 15.05 | Levi | Tänä yönä | 0 | 100 | 1,3 | 0,6 | 99 | 64 / 93 | – | yön paras 100 % >= 40 % | – |
| 27 | 1.11. 15.05 | Utsjoki | Tänä yönä | 0 | 100 | 1,3 | 0,6 | 1 | 40 / 15 | H+E+I | yön paras 100 % >= 40 % | – |
| 28 | 2.11. 15.05 | Rovaniemi | Tänä yönä | 0 | 54 | 1 | 0,5 | 100 | 43 / 26 | E+I | yön paras 54 % >= 40 % | – |
| 29 | 2.11. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 76 | 1 | 0,5 | 100 | 93 / 100 | – | yön paras 76 % >= 40 % | – |
| 30 | 2.11. 15.05 | Levi | Tänä yönä | 0 | 75 | 1 | 0,5 | 96 | 81 / 96 | – | yön paras 75 % >= 40 % | – |
| 31 | 2.11. 15.05 | Utsjoki | Tänä yönä | 0 | 69 | 1 | 0,5 | 100 | 93 / 100 | – | yön paras 69 % >= 40 % | – |
| 32 | 3.11. 15.05 | Rovaniemi | Tänä yönä | 0 | 51 | 1,3 | -1,9 | 3 | 48 / 42 | H+E+I | yön paras 51 % >= 40 % | – |
| 33 | 3.11. 15.05 | Levi | Tänä yönä | 0 | 60 | 1,3 | -1,9 | 26 | 40 / 64 | H+E | yön paras 60 % >= 40 % | – |
| 34 | 3.11. 15.05 | Utsjoki | Tänä yönä | 0 | 73 | 1,3 | -1,9 | 11 | 28 / 91 | H+E | yön paras 73 % >= 40 % | – |
| 35 | 4.11. 15.05 | Oulu | Tänä yönä | 0 | 67 | 2 | -0,8 | 28 | 11 / 0 | H+E+I | yön paras 67 % >= 40 % | – |
| 36 | 4.11. 15.05 | Rovaniemi | Tänä yönä | 0 | 71 | 2 | -0,8 | 0 | 3 / 10 | H+E+I | yön paras 71 % >= 40 % | – |
| 37 | 4.11. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 85 | 2 | -0,8 | 78 | 95 / 96 | – | yön paras 85 % >= 40 % | – |
| 38 | 4.11. 15.05 | Levi | Tänä yönä | 0 | 99 | 2 | -0,8 | 0 | 4 / 26 | H+E+I | yön paras 99 % >= 40 % | – |
| 39 | 4.11. 15.05 | Utsjoki | Tänä yönä | 0 | 41 | 2 | -0,8 | 1 | 23 / 43 | H+E+I | yön paras 41 % >= 40 % | – |
| 40 | 5.11. 15.05 | Oulu | Tänä yönä | 0 | 84 | 0 | 1,5 | 11 | 11 / 35 | H+E+I | yön paras 84 % >= 40 % | – |
| 41 | 5.11. 15.05 | Rovaniemi | Tänä yönä | 0 | 100 | 0 | 1,5 | 90 | 48 / 0 | E+I | yön paras 100 % >= 40 % | – |
| 42 | 5.11. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 93 | 0 | 1,5 | 43 | 85 / 46 | H+I | yön paras 93 % >= 40 % | – |
| 43 | 5.11. 15.05 | Levi | Tänä yönä | 0 | 98 | 0 | 1,5 | 92 | 16 / 49 | E+I | yön paras 98 % >= 40 % | – |
| 44 | 5.11. 15.05 | Utsjoki | Tänä yönä | 0 | 91 | 0 | 1,5 | 45 | 84 / 62 | H | yön paras 91 % >= 40 % | – |
| 45 | 6.11. 15.05 | Oulu | Tänä yönä | 0 | 96 | 1,7 | 5,2 | 0 | 34 / 3 | H+E+I | yön paras 96 % >= 40 % | – |
| 46 | 6.11. 15.05 | Rovaniemi | Tänä yönä | 0 | 79 | 1,7 | 5,2 | 51 | 69 / 55 | H+I | yön paras 79 % >= 40 % | – |
| 47 | 6.11. 15.05 | Kilpisjärvi | Tänä yönä | 0 | 58 | 1,7 | 5,2 | 100 | 99 / 91 | – | yön paras 58 % >= 40 % | – |
| 48 | 6.11. 15.05 | Levi | Tänä yönä | 0 | 93 | 1,7 | 5,2 | 100 | 91 / 100 | – | yön paras 93 % >= 40 % | – |
| 49 | 6.11. 17.35 | Oulu | Tulossa | 2 | – | 2 | -5,9 | 24 | 69 / 56 | H+I | Bz -5.9 nT etelään 21 min, Bt 9.26 nT, Kp 2.0 + 1 >= Kp-raja 2.1, pilvisyys 24 % < 60 % | – |

## 3. Illat ilman hälytystä ja estäneet ehdot

Ilta = pimeä aika (aurinko alle −6°), päivä = illan alkupäivä. Nykyisessä logiikassa **ei ole 2/3-sääntöä eikä tiheysrajaa**, joten ne eivät estäneet yhtään hälytystä. Estävät ehdot olivat: Nyt = näkyvyys alle rajan; Tulossa = ei Bz-vihjettä, Kp-ulottuvuus, pimeys tai pilvet; Tänä yönä = yön paras alle rajan. Toiston esto ei estänyt yhtään normaalitason hälytystä.

Iltakohtainen yhteenveto (kaikki 7 paikkaa):

| Ilta | Suurin näkyvyys nyt % (paikka, klo) | Pienin pilvisyys pimeällä % | Suurin Kp | Suurin yön paras % | Nyt: matka normaalirajaan 35 % | Tulossa | Lähti ntfy:llä (normaali) |
|---|---|--:|--:|--:|--:|---|---|
| 23.10. | 14 (Oulu 21.05) | 9 | 5,7 | 47 | -21 pp | ei Bz-vihjettä | – |
| 24.10. | 21 (Lyngen 22.50) | 0 | 2,7 | 87 | -14 pp | ei Bz-vihjettä | – |
| 25.10. | 20 (Lyngen 21.50) | 0 | 1,3 | 100 | -15 pp | ei Bz-vihjettä | – |
| 26.10. | 8 (Lyngen 18.20) | 29 | 2 | 43 | -27 pp | vihje 21 paikka-ajossa, ehdot täyttyivät 1:ssa | – |
| 27.10. | 19 (Lyngen 20.50) | 0 | 2,3 | 96 | -16 pp | ei Bz-vihjettä | Utsjoki Y |
| 28.10. | 28 (Kilpisjärvi 22.05) | 0 | 2,7 | 95 | -7 pp | ei Bz-vihjettä | Kilpisjärvi Y, Levi Y, Utsjoki Y |
| 29.10. | 12 (Utsjoki 23.50) | 0 | 1,7 | 95 | -23 pp | ei Bz-vihjettä | Kilpisjärvi Y, Utsjoki Y |
| 30.10. | 27 (Levi 23.20) | 0 | 4,3 | 97 | -8 pp | vihje 56 paikka-ajossa, ehdot täyttyivät 31:ssa | Oulu Y, Rovaniemi Y, Kilpisjärvi Y, Levi Y, Utsjoki Y, Kilpisjärvi T, Levi T, Utsjoki T, Rovaniemi T, Oulu T, Oulu T, Levi T, Utsjoki T |
| 31.10. | 49 (Utsjoki 21.05) | 0 | 6 | 97 | +14 pp | vihje 28 paikka-ajossa, ehdot täyttyivät 1:ssa | Kilpisjärvi Y, Utsjoki Y, Utsjoki T, Utsjoki N |
| 1.11. | 32 (Utsjoki 19.05) | 0 | 3 | 100 | -3 pp | ei Bz-vihjettä | Oulu Y, Kilpisjärvi Y, Levi Y, Utsjoki Y |
| 2.11. | 11 (Kilpisjärvi 22.05) | 0 | 1,7 | 76 | -24 pp | ei Bz-vihjettä | Rovaniemi Y, Kilpisjärvi Y, Levi Y, Utsjoki Y |
| 3.11. | 19 (Sodankylä 20.50) | 0 | 2,3 | 73 | -16 pp | vihje 21 paikka-ajossa, ehdot eivät täyttyneet (Kp-ulottuvuus, pimeys tai pilvet) | Rovaniemi Y, Levi Y, Utsjoki Y |
| 4.11. | 26 (Rovaniemi 23.05) | 0 | 3 | 99 | -9 pp | ei Bz-vihjettä | Oulu Y, Rovaniemi Y, Kilpisjärvi Y, Levi Y, Utsjoki Y |
| 5.11. | 28 (Levi 22.05) | 0 | 2,3 | 100 | -7 pp | ei Bz-vihjettä | Oulu Y, Rovaniemi Y, Kilpisjärvi Y, Levi Y, Utsjoki Y |
| 6.11. | 22 (Sodankylä 23.05) | 6 | 2,7 | 96 | -13 pp | vihje 14 paikka-ajossa, ehdot täyttyivät 1:ssa | Oulu Y, Rovaniemi Y, Kilpisjärvi Y, Levi Y, Oulu T |

Havainnot:
- **Revontulia nyt (35 %)** jäi joka illalla rajan alle 31.10. Utsjokia lukuun ottamatta. Lähimmäs päästiin 1.11. (−3 pp, Utsjoki 32 %), 28.10. ja 5.11. (−7 pp) sekä 30.10. (−8 pp).
- **Tänä yönä** lähti joka illalla vähintään yhteen paikkaan (yön paras 41–100 %). Yhtään iltaa ei jäänyt hälytyksettä tämän tyypin takia, mutta arvio on liian korkea (osio 5).
- **Tulossa** esti Bz-vihjeen puuttuminen 10 illassa; 3.11. vihje oli päällä 21 paikka-ajossa, mutta Kp-ulottuvuus, pimeys tai pilvet eivät täyttyneet samaan aikaan.

Paikkakohtaisesti (solu: suurin nyt-näkyvyys % · pienin pilvisyys pimeällä % · yön paras %, lihavoitu = normaalitason hälytys N/T/Y; Tromssa ja Helsinki eivät ole mukana; Utsjoki 24.10. alkaen):

| Ilta | Oulu | Rovaniemi | Kilpisjärvi | Lyngen | Levi | Sodankylä | Utsjoki |
|---|---|---|---|---|---|---|---|
| 23.10. | 14 · 22 · 41 **Y** | 10 · 30 · 47 **Y** | 0 · 100 · 0 | 3 · 73 · 35 | 2 · 74 · 6 | 5 · 9 · 23 | – |
| 24.10. | 1 · 73 · 0 | 0 · 99 · 0 | 2 · 90 · 0 | 21 · 0 · 87 **Y** | 0 · 100 · 0 | 0 · 100 · 0 | 0 · 100 · 0 |
| 25.10. | 0 · 100 · 4 | 0 · 100 · 0 | 0 · 100 · 0 | 20 · 0 · 100 **Y** | 1 · 94 · 0 | 0 · 100 · 0 | 0 · 97 · 13 |
| 26.10. | 1 · 89 · 8 | 0 · 100 · 1 | 0 · 100 · 1 | 8 · 29 · 43 **TY** | 0 · 100 · 0 | 0 · 99 · 0 | 4 · 57 · 5 |
| 27.10. | 0 · 100 · 0 | 0 · 100 · 0 | 2 · 44 · 24 | 19 · 0 · 96 **Y** | 0 · 100 · 0 | 0 · 100 · 0 | 14 · 15 · 81 **Y** |
| 28.10. | 2 · 14 · 32 | 0 · 100 · 0 | 28 · 0 · 88 **Y** | 26 · 0 · 95 **Y** | 6 · 17 · 61 **Y** | 0 · 100 · 0 | 27 · 2 · 87 **Y** |
| 29.10. | 0 · 97 · 0 | 0 · 100 · 0 | 9 · 1 · 84 **Y** | 6 · 50 · 91 **Y** | 0 · 98 · 0 | 0 · 100 · 0 | 12 · 0 · 95 **Y** |
| 30.10. | 25 · 3 · 90 **TY** | 20 · 0 · 72 **TY** | 15 · 34 · 83 **TY** | 8 · 53 · 34 | 27 · 10 · 88 **TY** | 11 · 20 · 62 **Y** | 24 · 12 · 97 **TY** |
| 31.10. | 0 · 100 · 0 | 0 · 100 · 0 | 22 · 66 · 66 **Y** | 29 · 0 · 87 **Y** | 8 · 75 · 8 | 0 · 100 · 0 | 49 · 10 · 97 **NTY** |
| 1.11. | 15 · 0 · 60 **Y** | 0 · 98 · 0 | 22 · 3 · 99 **Y** | 8 · 43 · 42 **Y** | 27 · 0 · 100 **Y** | 4 · 2 · 65 **Y** | 32 · 0 · 100 **Y** |
| 2.11. | 8 · 0 · 21 | 3 · 1 · 54 **Y** | 11 · 30 · 76 **Y** | 2 · 83 · 42 **Y** | 4 · 0 · 75 **Y** | 11 · 2 · 66 **Y** | 1 · 36 · 69 **Y** |
| 3.11. | 15 · 0 · 35 | 18 · 1 · 51 **Y** | 2 · 39 · 7 | 0 · 97 · 1 | 18 · 7 · 60 **Y** | 19 · 0 · 60 **Y** | 17 · 14 · 73 **Y** |
| 4.11. | 21 · 0 · 67 **Y** | 26 · 0 · 71 **Y** | 20 · 13 · 85 **Y** | 2 · 84 · 5 | 24 · 0 · 99 **Y** | 15 · 0 · 76 **Y** | 8 · 23 · 41 **Y** |
| 5.11. | 22 · 0 · 84 **Y** | 27 · 0 · 100 **Y** | 19 · 5 · 93 **Y** | 3 · 39 · 42 **Y** | 28 · 0 · 98 **Y** | 26 · 2 · 99 **Y** | 18 · 10 · 91 **Y** |
| 6.11. | 3 · 6 · 96 **TY** | 4 · 36 · 79 **Y** | 11 · 60 · 58 **Y** | 0 · 100 · 0 | 18 · 32 · 93 **Y** | 22 · 14 · 48 **Y** | 0 · 100 · 7 |

### 2.11. aamu (yö 1.–2.11.)

| Klo | Oulu | Rovaniemi | Kilpisjärvi | Lyngen | Levi | Sodankylä | Utsjoki | Kp | Bz nT |
|---|---|---|---|---|---|---|---|--:|--:|
| 1.11. 21.35 | 3 / 83 | 0 / 100 | 20 / 21 | 0 / 100 | **24 / 0** | 0 / 100 | 20 / 21 | 2,0 | −0,5 |
| 1.11. 23.05 | 13 / 6 | 0 / 100 | 20 / 3 | 2 / 91 | 20 / 0 | 0 / 100 | 10 / 50 | 3,0 | −0,6 |
| 2.11. 00.05 | 15 / 0 | 0 / 100 | 17 / 13 | 0 / 99 | 20 / 0 | 0 / 100 | 11 / 40 | 1,7 | 0,8 |
| 2.11. 00.50 | 13 / 0 | 0 / 100 | 16 / 5 | 2 / 87 | **16 / 0** | 0 / 100 | 12 / 23 | 2,0 | 0,3 |
| 2.11. 01.05 | 12 / 0 | 0 / 100 | 15 / 8 | 2 / 86 | 16 / 0 | 0 / 100 | 12 / 18 | 1,7 | 1,5 |
| 2.11. 02.05 | 4 / 44 | 0 / 100 | 6 / 46 | 0 / 100 | 10 / 0 | 0 / 100 | 6 / 43 | 2,0 | 1,8 |

Solu: näkyvyys nyt % / pilvisyys HARMONIE %.

- Kuvakaappauksen arvot klo 00.56 (16 %, pilvet 0 %, Kp 2,0, HARMONIE) vastaavat Levin ajoa klo 00.50 (16 %, 0 %, Kp 2,0). Paikkaa ei kuvassa kerrota, joten tämä on päätelmä.
- **Yksikään kynnys ei ylittynyt** klo 00.56 ympärillä: Revontulia nyt -raja on normaalilla 35 % ja herkällä 20 % (16 < 20). Tulossa ei voinut lähteä: Bz oli klo 00–01 pohjoiseen (+0,3…+1,5 nT), eikä Tulossa-vihjettä ollut koko yönä. Tänä yönä -tarkistus tehdään vain kerran päivässä klo 15.05.
- Illalla 1.11. herkkä raja (20 %) ylittyi: Utsjoki 18.20, Kilpisjärvi 19.05, 19.50, 21.35 ja 22.35, Levi 19.05 ja 20.35. Kenttätesti lähettää vain normaalitason (`sendLevel: 'normaali'`), joten ilmoituksia ei tullut.
- Samana päivänä klo 15.05 lähti Tänä yönä -ilmoitus Ouluun, Kilpisjärvelle, Leville ja Utsjoelle (yön paras 60–100 %). Toteutunut nyt-näkyvyys jäi kuitenkin 15–32 %:iin.

## 4. Osuvuus

`HAVAINNOT.md`: **0 täytettyä riviä**. Ainoat havainnot ovat ntfy-palautteet (`PALAUTE.md`, vastaajaa ei tallennettu). Keogrammeja (IRF Kiiruna) ei katsottu tässä yhteenvedossa, eikä FMI:n keogrammeja ollut julkaistu. Siksi iltoja ei luokitella; vain palautetut hälytykset luokitellaan.

| Ilta | Paikka | Hälytys | Palaute | Luokka |
|---|---|---|---|---|
| 30.10. | Rovaniemi | Tänä yönä 15.05 | Näkyi ×1 | oikea hälytys |
| 30.10. | Kilpisjärvi | Tänä yönä 15.05 | Näkyi ×4 | oikea hälytys |
| 30.10. | Utsjoki | Tänä yönä 15.05 | Näkyi ×1 | oikea hälytys |
| 30.10. | Levi | Tulossa 31.10. 00.35 | Näkyi ×1 | oikea hälytys |
| 30.10. | Utsjoki | Tulossa 31.10. 00.35 | Näkyi ×1 | oikea hälytys |
| 30.10. | Oulu | Tulossa 31.10. 00.35 | Pilvessä ×2 | turha hälytys (pilvessä, HARMONIE 15 % vs. ECMWF 93 % / ICON-EU 63 %) |
| 31.10. | Utsjoki | Revontulia nyt 20.35 | Näkyi ×1 | oikea hälytys |

| Luokka | Illat |
|---|---|
| Oikea hälytys | 30.10., 31.10. (vain yllä olevat paikat) |
| Turha hälytys | 30.10. Oulu (Tulossa) |
| Ohi (näkyi, ei hälytystä) | ei saatavilla: "Ei näkynyt"- ja "näkyi ilman hälytystä" -havaintoja ei ole |
| Oikea hiljaisuus | ei saatavilla |
| Muut 42 lähetettyä hälytystä | ei saatavilla (ei vastausta) |

Kp-toteuma lokissa (reaaliaikainen arvio): suurin Kp 6,0 (31.10. klo 23.50); illan suurin Kp on osion 3 taulukossa. Kp ei ole havainto näkyvyydestä paikalla.

## 5. Kynnysherkkyys

Nykyiset `ALERT_CFG`-arvot (`alerts/aurora-alerts.js` rivit 29–48, main 6a14abd):

| Taso | Nyt: näkyvyys ≥ | Tulossa: pilvisyys < | Tänä yönä: yön paras ≥ |
|---|--:|--:|--:|
| herkkä | 20 % | 80 % | 20 % |
| normaali (lähetetty) | 35 % | 60 % | 40 % |
| varma | 55 % | 40 % | 60 % |

Yhteiset: Tulossa Bz ≤ −5 nT, Bt ≥ 6 nT, Kp-marginaali 1. Toisto aikaisintaan 30 min (`repeatMin`). `cloudModel` 'harmonie', `cloudMaxAgeH` 9, `sendLevel` 'normaali', `tonightHour` 15.

Hälytykset koko jaksolla, kaikki 7 paikkaa (ilmoituspaikkoja on 5, joten lähetettyjä on vähemmän). Simuloitu nykyisellä logiikalla, joka tuottaa nykyrajoilla lokin luvut täsmälleen.

| Näkyvyysraja | Revontulia nyt | Tänä yönä |
|--:|--:|--:|
| 10 % | 58 | 66 |
| 20 % | 33 | 65 |
| 30 % | 2 | 62 |
| 35 % (nyk. Nyt) | 1 | – |
| 40 % (nyk. Tänä yönä) | 1 | 58 |
| 50 % | 0 | 49 |
| 60 % | – | 46 |
| 70 % | – | 36 |
| 80 % | – | 29 |
| 90 % | – | 19 |

Pilvisyysraja ±10 pp. Pilvisyysraja on vain Tulossa-tyypissä; Nyt ja Tänä yönä käyttävät pilvikerrointa näkyvyyslaskussa, eikä niillä ole erillistä rajaa.

| Tulossa | −10 pp | nykyinen | +10 pp |
|---|--:|--:|--:|
| herkkä (80 %) | 16 (70 %) | 20 | 23 (90 %) |
| normaali (60 %) | 11 (50 %) | 11 | 16 (70 %) |
| varma (40 %) | 8 (30 %) | 9 | 11 (50 %) |

Tänä yönä -arvion kalibrointi. Vertailtu yön ennustetta (klo 15.05) saman illan toteutuneeseen suurimpaan nyt-näkyvyyteen (OVATION + HARMONIE). Tämä on mallien välinen vertailu, ei havainto:

| Tänä yönä -raja | Hälytyksiä | Joista illan nyt-näkyvyys ≥ 20 % | ≥ 10 % |
|--:|--:|--:|--:|
| 40 % (nyk.) | 58 | 24 (41 %) | 44 |
| 60 % | 46 | 23 (50 %) | 38 |
| 70 % | 36 | 21 (58 %) | 31 |
| 80 % | 29 | 19 (66 %) | 26 |
| 90 % | 19 | 12 (63 %) | 17 |

106 paikka-illasta 24:ssä nyt-näkyvyys ylitti 20 %, ja jokaisessa niistä yön ennuste oli ≥ 40 %. Mikään ilta ei siis jäänyt ilman Tänä yönä -hälytystä, mutta 34 hälytystä lähti iltoina, joina nyt-näkyvyys jäi alle 20 %.

## 6. Pilvisyyslähde ja mallit

Lokissa on kolmen mallin pilvisyys joka ajossa (`clouds`: ECMWF, ICON-EU, HARMONIE). **IL:n editoitu ennuste (M) ei ole lokissa: ei saatavilla.**

| Mittari | Määrä |
|---|--:|
| Pimeät paikka-ajot, joissa kaikki 3 mallia | 5 552 |
| – joissa mallien ero (suurin − pienin) > 30 pp | 1 519 (27 %) |
| Hälytyksen kannalta oleelliset (pimeä ja OVATION ≥ 20 %) | 1 082 |
| – joissa ero > 30 pp | 373 (34 %) |

| Malliparin ero > 30 pp | Kaikki pimeät | Oleelliset |
|---|--:|--:|
| HARMONIE – ECMWF | 1 106 | 276 |
| HARMONIE – ICON-EU | 918 | 232 |
| ECMWF – ICON-EU | 787 | 155 |

Palautetuissa hälytyksissä HARMONIE oli keskimäärin pilvettömin (Näkyi: E 68 %, I 77 %, H 57 %; Pilvessä: E 93 %, I 63 %, H 15 %; `LOPPURAPORTTI.md`).

2/3-säännön vaikutus (hälytys vain, jos vähintään 2 mallia täyttää ehdon; Nyt-näkyvyys laskettu kunkin mallin pilvisyydellä, joka vastaa lokin näkyvyyttä HARMONIElla ±1 pp kaikissa 9 586 ajossa):

| Tyyppi / raja | Nyt (HARMONIE) | 2/3-sääntö | Mediaani | Pelkkä ECMWF | Pelkkä ICON-EU |
|---|--:|--:|--:|--:|--:|
| Nyt ≥ 20 % | 33 | 16 | 16 | 20 | 11 |
| Nyt ≥ 35 % | 1 | 0 | 0 | 1 | 0 |
| Tulossa pilvet < 80 % | 20 | 15 | – | – | – |
| Tulossa pilvet < 60 % | 11 | 7 | – | – | – |
| Tulossa pilvet < 40 % | 9 | 3 | – | – | – |
| Tänä yönä | ei saatavilla (yön tuntipilvet vain HARMONIElta) | | | | |

Lähetetyistä 10 Tulossa-hälytyksestä 2/3-sääntö olisi pudottanut 5: Kilpisjärvi 30.10. 22.20, Oulu 30.10. 23.05, Oulu 31.10. 00.35 (palaute Pilvessä), Utsjoki 31.10. 00.35 (palaute Näkyi) ja Utsjoki 31.10. 18.05. Niissä vain HARMONIE oli alle 60 %.

## 7. Ruudun koko ja tiheysraja

- **Koordinaatit eivät ole lokissa** (vain paikan tunniste ja magneettinen leveysaste), joten 0,5° × 1° ruudun sisäistä pilvisyyden vaihtelua **ei voitu laskea**: ei saatavilla. Lokissa on vain pistearvot paikoissa, ei hilaa. Laskentaan tarvitaan pilvihila (HARMONIE/ICON-EU-askeleet) testijaksolta, mutta artefaktit säilyvät vain 1 vrk (päätös 32) ja gh-pages korvataan joka julkaisussa.
- Järkevää ruutukokoa ei siksi voi perustella tällä datalla. Mallien välinen ero (osio 6) ei ole alueellista vaihtelua.

Hälytykset per paikka per ilta ilman tiheysrajaa (nykyisessä logiikassa ei ole tiheysrajaa, vain 30 min toisto ja viritys). Jokainen testipaikka on oletettu omaksi ruudukseen; koordinaateilla tätä ei voitu tarkistaa. 7 paikkaa × 15 iltaa = 105 paikka-iltaa:

| Hälytyksiä illassa | Normaali (lähetetty taso) | Herkkä |
|--:|--:|--:|
| 0 | 48 | 40 |
| 1 | 49 | 36 |
| 2 | 4 | 16 |
| 3 | 4 | 7 |
| 4 | 0 | 3 |
| 5 | 0 | 2 |
| 6 | 0 | 1 |
| **Maksimi** | 3 (Oulu, Levi, Utsjoki 30.10.; Utsjoki 31.10.) | 6 (Utsjoki 31.10.) |

Normaalilla tasolla 3 hälytystä illassa syntyi Tänä yönä + Tulossa + Tulossa- tai Nyt-yhdistelmistä aktiivisina öinä. Raja 2 per ruutu per ilta olisi poistanut 4 hälytystä normaalilla ja 23 herkällä tasolla.

## 8. Siivousasiat (vain tarkistus)

| Kohta | Tila | Tiedostot ja rivit (main 6a14abd) |
|---|---|---|
| Ilmoitusotsikko "AuroraAwesome" | **kyllä, yhä** | `alerts/notify.js:98` (`title: 'AuroraAwesome · kenttätesti'`), kommentti rivi 96; `scripts/ntfy-test.mjs:24` |
| Ajastimen nimi "AuroraAwesome" | **kyllä, yhä** | `workers/ajastin/wrangler.toml:1, 6, 11, 22` (`name = "auroraawesome-ajastin"`); `workers/ajastin/package.json:2`; `workers/ajastin/src/index.js:1, 22`; `.github/actions/palaute-url/action.yml:4, 22`; myös `workers/satelliitti` (`wrangler.toml:1`, `src/index.js:1`) |
| ntfy-kanavan nimen vaihto | **ei voitu todentaa** | Kanavan nimi on salaisuudessa [piilotettu]; salaisuuksien listaus (nimet ja päivitysajat) on estetty tästä ympäristöstä. ARCHITECTURE.md rivi 122 on yhä avoin kysymys |
| Hälytysten varajastus 1 h:iin | **ei tehty** | `.github/workflows/alert-dryrun.yml:27` `cron: '4,34 * * * *'` (30 min); Cloudflare-ajastin 15 min (`schedule.js:15`) |

## 9. Vaiheen 1 tila (FCM)

| Kohta | Tila |
|---|---|
| Vaiheen 1 koodi (`claude/halytykset-fcm`) | **Mainissa**: PR #176 yhdistetty 2.11. klo 16.57 |
| Haara `claude/halytykset-tila` (Aurora Dev -testin kirjaus ARCHITECTURE.md:hen) | **Ei mainissa** (ei PR:ää) |
| "Lisäosa puuttuu" -viestin korjaus (`isPluginAvailable`) | Ei tehty (ehdotettu 2.11., ei hyväksyntää) |
| Firebase-projekti | Ei näy repossa; ei voitu todentaa |
| APNs-avain | Ei näy repossa; ei voitu todentaa |
| Salaisuudet `FCM_SERVICE_ACCOUNT`, `FIREBASE_IOS_PLIST_B64`, `FIREBASE_IOS_DEV_PLIST_B64`, `FIREBASE_ANDROID_JSON_B64` | Salaisuuksien nimilista on estetty tästä ympäristöstä. Viimeisimmän iOS-käännöksen (`ios-testflight.yml` 2.11. 16.18 UTC) loki: "Firebase-salaisuus puuttuu", joten salaisuuksia ei ollut 2.11. Sen jälkeen ei ole iOS-, Dev- eikä Android-käännöksiä |
| Testi-ilmoitus (`fcm-testi.yml`) | 0 ajoa |
| Puhelintesti | Aurora Dev 2.11.: osio näkyy, kytkin ei tee mitään (käännöksessä ei lisäosaa). FCM-puhelintestiä ei ole tehty |

## Mitä ei voitu todentaa

| Asia | Syy |
|---|---|
| Osuvuus iltatasolla (ohi / oikea hiljaisuus) | `HAVAINNOT.md` tyhjä; palautetta 7/49 hälytykseen, ei yhtään "Ei näkynyt" |
| Keogrammit | Ei katsottu (vain linkit lokissa; FMI:n keogrammit julkaisematta) |
| Ruudun sisäinen pilvisyysvaihtelu ja ruutukoko | Koordinaatit eivät ole lokissa; testijakson pilvihilat eivät ole tallessa (artefaktit 1 vrk, päätös 32; gh-pages korvataan) |
| IL:n editoitu ennuste (M) hälytysten pilvilähteenä | Ei kirjattu hälytyslokiin; ennustevertailuloki (`ennuste-loki`) alkaa vasta 17.11. |
| 2/3-säännön vaikutus Tänä yönä -hälytyksiin | Yön tuntikohtainen pilvisyys lasketaan vain HARMONIElla |
| Kuvakaappauksen paikka 2.11. klo 00.56 | Kuvassa ei paikkaa; Levi vastaa arvoja |
| ntfy-kanavan vaihto, Firebase-salaisuudet nykyhetkellä | Salaisuuksien listaus estetty tästä ympäristöstä (HTTP 403) |
| Aukkojen syyt tarkemmin | Cloudflare-ajastimen lokit eivät ole repossa; syyt päätelty Actionsin ajohistoriasta |

## 10. Lisäkysymykset (7.11.)

### 10.1 Näkyvyys-%:n kaava (`aurora-core.js`)

Sama funktio kaikkialla: `visibilityIndex(p, cf, df)` (rivi 560) = `round(p/100 × cf × df × 100)`. Jos jokin syöte puuttuu, tulos on null ("Ei dataa").

| Syöte | Revontulia nyt (Nyt-välilehti, alapalkki, Nyt-hälytys) | Tänä yönä (välilehti ja hälytys) |
|---|---|---|
| Revontulien todennäköisyys `p` | **OVATION**: `ovationProbAt` = NOAA:n ovaali pisteessä (bilineaarinen), 0–100 % | **Kp-ennuste**: `kpVisibility(Kp, maglat)` (rivi 121): reuna = 66,5° − 2,05 × Kp, p = 45 + 12 × (maglat − reuna), rajattu 0–100 %. Kp tunnin 3 h jaksolta (`kpBlockAt`: kuluva jakso = reaaliaikainen Kp, tulevat = NOAA:n ennuste) |
| Pilvikerroin `cf` | `cloudVisibilityFactor` (rivi 262) = 1 − kokonaispilvisyys valitusta mallista (hälytyksissä HARMONIE) | sama, kunkin yön tunnin pilvisyys (`hourCloud`) |
| Pimeyskerroin `df` | `darknessFactor` (rivi 80): aurinko yli −6° → 0, alle −12° → 1, välissä lineaarinen | sama, kunkin tunnin auringon korkeus |
| Kp | **ei** (OVATION sisältää aktiivisuuden) | **kyllä**, `p`:n kautta |
| Bz | **ei** | **ei** |

Bz (ja Bt) vaikuttaa vain Tulossa-hälytykseen (`bzHint`: liukuva Bz ≤ −5 nT vähintään 20 min ja Bt ≥ 6 nT), ei näkyvyys-%:iin. Tänä yönä -arvo on yön suurin tuntikohtainen näkyvyys (`nightBest`).

### 10.2 Nyt-hälytykset kynnyksellä 25 % ja monimalliehdot

**M (IL:n editoitu ennuste) ei ole hälytyslokissa kertaakaan.** Lokin `clouds`-kentässä on vain `ecmwf`, `icon_eu` ja `harmonie` (9 030 paikka-ajoa, 24.10. klo 15.20 alkaen; sitä ennen kenttää ei ollut). Saatavilla oli siis enintään 3 mallia: pimeistä paikka-ajoista 5 552:ssa kaikki kolme ja 339:ssä ei yhtään (23.–24.10.). 2/4- ja 3/4-sääntö on siksi laskettu "vähintään 2 / vähintään 3 saatavilla olevista", eli 3 mallilla 2/3 ja 3/3. Kunkin mallin näkyvyys = OVATION × (1 − mallin pilvisyys) × pimeys; tämä vastaa lokin HARMONIE-näkyvyyttä ±1 pp kaikissa 9 586 ajossa. Toiston esto (viritys + 30 min) sama kuin nyt. Kaikki 7 paikkaa koko jaksolta.

| Ehto (Nyt ≥ 25 %) | Hälytyksiä |
|---|--:|
| Ilman monimalliehtoa (HARMONIE, nykyinen) | **15** |
| "2/4" = vähintään 2 saatavilla olevaa mallia (käytännössä 2/3) | **9** |
| "3/4" = vähintään 3 saatavilla olevaa mallia (käytännössä 3/3) | **2** |

Hälytykset (Helsingin aikaa):
- HARMONIE: 28.10. 21.50 Kilpisjärvi ja Lyngen, 22.05 Utsjoki; 30.10. 23.05 Levi; 31.10. 01.05 Oulu, 18.05 Utsjoki, 20.20 Lyngen ja Utsjoki; 1.11. 04.05 Lyngen, 18.50 Utsjoki, 19.35 Levi; 4.11. 22.50 Rovaniemi; 5.11. 21.05 Levi, 21.35 Rovaniemi, 22.05 Sodankylä.
- 2/3: 28.10. 21.50 Kilpisjärvi, 22.05 Utsjoki, 22.20 Lyngen; 30.10. 23.05 Levi; 31.10. 20.20 Utsjoki; 1.11. 19.05 Utsjoki, 19.35 Levi; 5.11. 21.50 Rovaniemi, 23.05 Sodankylä.
- 3/3: 28.10. 21.50 Kilpisjärvi; 5.11. 22.20 Rovaniemi.

Palautteella (Näkyi) vahvistettu Utsjoki 31.10. 20.35 (normaali 35 %) sisältyisi HARMONIElla ja 2/3:lla (20.20), muttei 3/3:lla.

### 10.3 Tänä yönä -ennuste vs. toteutunut yön maksimi

Ennuste = yön paras (`night.max`) tarkistushetkellä klo 15.05. Toteutunut = saman illan pimeän ajan suurin nyt-näkyvyys (OVATION + HARMONIE, 15 min ajot). **Toteutunut ei ole havainto**, vaan mallin nowcast. Solu: ennuste % / toteutunut %. Mukana kaikki 7 nykyistä paikkaa; Tromssa (23.10.) ja Helsinki (23.–24.10.) eivät ole taulukossa, mutta ovat mukana luvuissa.

| Ilta | Oulu | Rovaniemi | Kilpisjärvi | Lyngen | Levi | Sodankylä | Utsjoki | Ilta ka. ennuste / toteutunut |
|---|---|---|---|---|---|---|---|---|
| 23.10. | 41 / 14 | 47 / 10 | 0 / 0 | 35 / 3 | 6 / 2 | 23 / 5 | – | 25 / 6 |
| 24.10. | 0 / 1 | 0 / 0 | 0 / 2 | 87 / 21 | 0 / 0 | 0 / 0 | 0 / 0 | 12 / 3 |
| 25.10. | 4 / 0 | 0 / 0 | 0 / 0 | 100 / 20 | 0 / 1 | 0 / 0 | 13 / 0 | 17 / 3 |
| 26.10. | 8 / 1 | 1 / 0 | 1 / 0 | 43 / 8 | 0 / 0 | 0 / 0 | 5 / 4 | 8 / 2 |
| 27.10. | 0 / 0 | 0 / 0 | 24 / 2 | 96 / 19 | 0 / 0 | 0 / 0 | 81 / 14 | 29 / 5 |
| 28.10. | 32 / 2 | 0 / 0 | 88 / 28 | 95 / 26 | 61 / 6 | 0 / 0 | 87 / 27 | 52 / 13 |
| 29.10. | 0 / 0 | 0 / 0 | 84 / 9 | 91 / 6 | 0 / 0 | 0 / 0 | 95 / 12 | 39 / 4 |
| 30.10. | 90 / 25 | 72 / 20 | 83 / 15 | 34 / 8 | 88 / 27 | 62 / 11 | 97 / 24 | 75 / 19 |
| 31.10. | 0 / 0 | 0 / 0 | 66 / 22 | 87 / 29 | 8 / 8 | 0 / 0 | 97 / 49 | 37 / 15 |
| 1.11. | 60 / 15 | 0 / 0 | 99 / 22 | 42 / 8 | 100 / 27 | 65 / 4 | 100 / 32 | 67 / 15 |
| 2.11. | 21 / 8 | 54 / 3 | 76 / 11 | 42 / 2 | 75 / 4 | 66 / 11 | 69 / 1 | 58 / 6 |
| 3.11. | 35 / 15 | 51 / 18 | 7 / 2 | 1 / 0 | 60 / 18 | 60 / 19 | 73 / 17 | 41 / 13 |
| 4.11. | 67 / 21 | 71 / 26 | 85 / 20 | 5 / 2 | 99 / 24 | 76 / 15 | 41 / 8 | 63 / 17 |
| 5.11. | 84 / 22 | 100 / 27 | 93 / 19 | 42 / 3 | 98 / 28 | 99 / 26 | 91 / 18 | 87 / 20 |
| 6.11. | 96 / 3 | 79 / 4 | 58 / 11 | 0 / 0 | 93 / 18 | 48 / 22 | 7 / 0 | 54 / 8 |

| Mittari (106 paikka-iltaa) | Arvo |
|---|--:|
| Ennusteen keskiarvo | 44 % |
| Toteutuneen keskiarvo | 10 % |
| Ero (ennuste − toteutunut), keskiarvo / mediaani | 34 / 34,5 pp |
| Illat, joina toteutunut > ennuste | 3 |
| Korrelaatio | 0,83 |
| Sovite: toteutunut ≈ 0,23 × ennuste − 0,2 | |

Ennuste seuraa toteutunutta hyvin (korrelaatio 0,83), mutta asteikko on noin 4–5 kertaa liian suuri. Syy kaavassa: `kpVisibility` antaa revontulivyöhykkeellä 45–100 %, OVATION samoilla paikoilla tyypillisesti 10–30 %. Kalibrointi (esim. kerroin noin 0,23 tai Kp-käyrän lasku) korjaisi tasoeron. Rajan nosto ei korjaa sitä (osio 5).

### 10.4 Pilvisyyden vaihtelu ruudun sisällä mallien hilasta

**Testijakson hilat eivät ole tallessa** (artefaktit 1 vrk, gh-pages korvataan joka ajossa). Laskettu siksi gh-pagesin nykyisistä ajoista 7.11. (HARMONIE ajo 09 UTC, ICON-EU 09 UTC, IL editoitu, ECMWF 06 UTC), 6 aika-askelta 7.–8.11. Alue 60–71 °N, 15–31 °E (Pohjois-Suomi, -Ruotsi ja -Norja). **Yksi sääjakso, ei edustava.** Ruutu = hilapisteet ruudun sisällä.

| Malli (hilaväli) | Ruutu | Pisteitä / ruutu | Vaihteluväli (max − min), mediaani | Ruutuja, joissa vaihtelu > 30 pp | Osittain pilviset ruudut (ka. 20–80 %): vaihteluväli, mediaani | – keskihajonta, mediaani |
|---|---|--:|--:|--:|--:|--:|
| HARMONIE (~5 km) | 0,25° × 0,5° | 66 | 1 pp | 20 % | 61 pp | 16,7 pp |
| HARMONIE | **0,5° × 1° (nyk.)** | 242 | 7 pp | 34 % | 89 pp | 25,3 pp |
| HARMONIE | 1° × 2° | 990 | 36 pp | 53 % | 99 pp | 32,8 pp |
| ICON-EU (~7 km) | 0,25° × 0,5° | 32 | 12 pp | 18 % | 26 pp | 7,0 pp |
| ICON-EU | **0,5° × 1°** | 128 | 26 pp | 44 % | 48 pp | 11,7 pp |
| ICON-EU | 1° × 2° | 512 | 48 pp | 69 % | 78 pp | 18,7 pp |
| IL editoitu (~7 km) | 0,25° × 0,5° | 28 | 6 pp | 15 % | 22 pp | 6,0 pp |
| IL editoitu | **0,5° × 1°** | 116 | 15 pp | 34 % | 45 pp | 11,3 pp |
| IL editoitu | 1° × 2° | 450 | 39 pp | 55 % | 70 pp | 18,1 pp |
| ECMWF (0,25°) | 0,25° × 0,5° | 2 | 2 pp | 1 % | 6 pp | 3,0 pp |
| ECMWF | **0,5° × 1°** | 8 | 11 pp | 19 % | 30 pp | 10,1 pp |
| ECMWF | 1° × 2° | 32 | 31 pp | 50 % | 62 pp | 17,1 pp |

Tulkinta:
- Nykyisessä 0,5° × 1° ruudussa (noin 55 × 40–55 km Lapissa) HARMONIElla puolessa ruuduista vaihtelu on enintään 7 pp (kokonaan pilvessä tai selkeää), ICON-EU:lla mediaani on 26 pp. Kolmasosassa (HARMONIE 34 %, ICON-EU 44 %) pilvisyys vaihtelee ruudun sisällä yli 30 pp. Osittain pilvisissä ruuduissa HARMONIE-vaihtelu on lähes koko asteikko (89 pp, keskihajonta 25 pp).
- 1° × 2° on liian suuri: yli puolessa ruuduista vaihtelu on yli 30 pp. 0,25° × 0,5° puolittaa vaihtelun (HARMONIE 34 % → 20 %), mutta ruutuja on nelinkertaisesti.
- Suositus vaiheeseen 2 (alustava, yhden sääjakson perusteella): **pidä 0,5° × 1°**, ja laske hälytyksen pilvisyys ruudun **parhaasta osasta** (esim. ruudun 25. persentiili tai paras 10 × 10 km), ei keskipisteestä. Silloin ilmoitus kertoo "alueellasi on selkeää". Varmista vaihtelu pidemmältä jaksolta tallentamalla ruututilastot hälytysajon lokiin.
