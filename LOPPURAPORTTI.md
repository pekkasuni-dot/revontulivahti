# Revontulihälytysten kuivaharjoitus – loppuraportti

<!-- lopullinen -->
**Lopullinen.** Laadittu 22.10.2026 klo 00.12 (Suomen aikaa).

Ilmoituksia ei lähetetty. **Rajojen säätö alla on vain ehdotuksia – koodia ei ole muutettu.**

## Jakso

- 21.10. klo 23.56 – 22.10.2026 klo 00.11, öitä 1
- Ajoja 2 (15 min välein olisi 2, 100 %)
- Datavirheitä 0 ajossa
- Omia havaintoja 0 (näkyi / ei: 0 / 0)

## Tilanne jaksolla

- Suurin Kp 4,0; öitä, joina Kp >= 4: 1 / 1
- Tulossa-vihje (Bz etelään) päällä 1 yönä
- Pilvisyys pimeällä (öiden keskiarvo): Oulu 0 %, Rovaniemi 5 %, Kilpisjärvi 17 %, Tromssa 59 %, Helsinki 0 %

## Yöt

Solu: suurin näkyvyys % · pilvisyys pimeällä % · hälytykset normaalitasolla (N = nyt, T = tulossa, Y = tänä yönä). Havainnot HAVAINNOT.md:stä.

| Yö | Kp | Bz | Oulu | Rovaniemi | Kilpisjärvi | Tromssa | Helsinki | Havainnot |
|---|--:|--:|---|---|---|---|---|---|
| ke 21.10. | 4,0 | -5,3 | 43 · ☁0 **T** | 44 · ☁5 **T** | 37 · ☁17 **T** | 17 · ☁59 | 19 · ☁0 **T** |   |

## Hälytykset, jotka olisivat lähteneet

Määrä koko jaksolla: herkkä / normaali / varma.

| Paikka | Revontulia nyt | Tulossa | Tänä yönä |
|---|--:|--:|--:|
| Oulu | 0 / 0 / 0 | 1 / 1 / 1 | 0 / 0 / 0 |
| Rovaniemi | 0 / 0 / 0 | 1 / 1 / 1 | 0 / 0 / 0 |
| Kilpisjärvi | 0 / 0 / 0 | 1 / 1 / 1 | 0 / 0 / 0 |
| Tromssa | 0 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 |
| Helsinki | 0 / 0 / 0 | 1 / 1 / 1 | 0 / 0 / 0 |
| **Yhteensä** | 0 / 0 / 0 | 5 / 4 / 4 | 0 / 0 / 0 |

## Vertailu havaintoihin

_Ei vertailukelpoisia havaintoja (näkyikö kyllä/ei + testipaikan nimi). Osumatarkkuutta ei voi arvioida._

## Ehdotukset rajoihin (ei toteutettu)

- **Tulossa:** 4 hälytystä normaalilla (0,80 per paikka-yö). Määrä kohtuullinen.
- **Tulossa / Helsinki:** 1 hälytystä. Vertaa havaintoihin; jos ei näkynyt, pienennä Kp-marginaalia (nyt 1).
- Ilman kyllä/ei-havaintoja ehdotukset perustuvat vain hälytysmääriin. Täytä HAVAINNOT.md, raportti päivittyy (myös lopullisen jälkeen voi ajaa: `node scripts/alert-dryrun.mjs --out <loki> --final`).

<sub>Nykyiset rajat: herkkä nyt 20 % / tulossa pilvet < 80 % / tänä yönä 20 %; normaali nyt 35 % / tulossa pilvet < 60 % / tänä yönä 40 %; varma nyt 55 % / tulossa pilvet < 40 % / tänä yönä 60 %; Tulossa Bz <= -5 nT, Bt >= 6 nT, Kp-marginaali 1.</sub>
