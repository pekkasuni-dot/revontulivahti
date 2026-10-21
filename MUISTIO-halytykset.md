# Revontulihälytykset

## Vaihe 1: kuivaharjoitus (2026-10-21, haara claude/aurora-halytys-kuiva)

Ei ilmoituksia. GitHub Actions ajaa hälytyslogiikan 15 min välein viidelle
testipaikalle ja kirjaa, mitkä hälytykset **olisivat** lähteneet, jotta niitä
voi verrata havaintoihin ja revontulikameroihin.

### Rakenne

| Tiedosto | Tehtävä | Ympäristö |
|---|---|---|
| `aurora-core.js` | Sovelluksen laskentafunktiot (pimeys, OVATION, pilvisyys, näkyvyysindeksi, Bz-trendi + Tulossa-vihje, Kp nyt, Tänä yönä). **Siirretty index.html:stä sellaisinaan**, sovellus käyttää niitä ohuiden kääreiden kautta. | selain, Node, Worker |
| `alerts/aurora-alerts.js` | Hälytyssäännöt, rajat (`ALERT_CFG`), toiston esto, lähteiden osoitteet (`SOURCES`). Ei Node- eikä selainriippuvuuksia. | Node, Worker |
| `alerts/alert-summary.js` | Lokista yhteenveto (Markdown). | Node, Worker |
| `alerts/test-places.json` | Testipaikat: Oulu, Rovaniemi, Kilpisjärvi, Tromssa, Helsinki (+ aikavyöhyke). | |
| `scripts/alert-dryrun.mjs` | Ajo: hakee datan, ajaa logiikan, kirjoittaa lokin/tilan/yhteenvedon. Testi ilman verkkoa: `--fixtures --now <ISO>`. | Node |
| `scripts/alert-summary.mjs` | Yhteenveto komentorivillä: `node scripts/alert-summary.mjs <lokihakemisto> --nights 7`. | Node |
| `.github/workflows/alert-dryrun.yml` | 15 min välein (`4,19,34,49 * * * *`), loki haaraan `halytys-loki`. | Actions |

**Samat funktiot, ei kopioita:** siirron jälkeen sovellus laskee kaiken
`aurora-core.js`:n kautta. Todennettu headless-selaimessa: vanha ja uusi
versio samalla datalla ja kiinteällä kellolla, 9 pistettä × 8 ajankohtaa
(auringon korkeus, pimeä jakso, OVATION, pilvisyys ja pilvikerroin, Tänä yönä
-tunnit ja paras aika, Kp nyt ja Kp-jaksot, Bz-trendi, Tulossa-vihje,
näkyvyysindeksi ja tulkintateksti, alapalkki): **tulos merkki merkiltä sama**
(30 744 merkkiä). Ainoa ero toisessa ajossa oli testipalvelimen oma
aikaleima (Kp-minuuttidata luodaan pyyntöhetkellä).

Data hälytysajossa: OVATION, Kp (reaaliaikainen, mitattu, ennuste) ja Bz/Bt
NOAA:lta kuten sovelluksessa; pilvisyys valmis ECMWF-hila GitHub Pagesilta
(`data/clouds-ecmwf.json`, sovelluksen oletusmalli, 0-48 h, kattaa kaikki
testipaikat). Jäsennys samoilla funktioilla (`parseOvation`, `kpRows`,
`kpRtRows`, `swRows`, `buildCloudGridFull`).

### Säännöt

1. **Revontulia nyt** (`now`): näkyvyysindeksi >= raja. Indeksi = Nyt-välilehden
   luku: OVATION % × pilvikerroin × pimeyskerroin (`visibilityIndex`).
   Valoisalla indeksi on 0, joten erillistä pimeysehtoa ei tarvita.
2. **Tulossa** (`coming`): Tulossa-vihje päällä (`bzHint`, täsmälleen sama
   kuin sovelluksen vihje: tuore mag-data alle 15 min, liukuva Bz 10 min
   <= -5 nT, etelään yhtäjaksoisesti >= 20 min, Bt >= 6 nT) JA paikassa
   pimeää (aurinko alle -6°, sama raja kuin pimeyskerroin) JA pilvisyys
   nyt < raja.
3. **Tänä yönä** (`tonight`): kerran päivässä ensimmäisessä ajossa klo 15
   jälkeen paikallista aikaa (Tromssa Oslon aikaa): Tänä yönä -välilehden
   paras arvo (`computeNight` → yön suurin näkyvyys) >= raja. Jos yön
   tunneille ei ole dataa, tarkistus yritetään seuraavassa ajossa.

### Rajat (`ALERT_CFG`, alerts/aurora-alerts.js)

| Taso | Nyt: näkyvyys >= | Tulossa: pilvisyys < | Tänä yönä: paras >= |
|---|---|---|---|
| herkkä | 20 % | 80 % | 20 % |
| normaali | 35 % | 60 % | 40 % (= sovelluksen "hyvä" korostus) |
| varma | 55 % | 40 % | 60 % |

Tulossa-vihjeen Bz-rajat ovat samat kaikilla tasoilla (sovelluksen vihje).
Rajat ovat ensimmäinen arvaus - kuivaharjoituksen tarkoitus on säätää niitä.

### Toiston esto

Sama tyyppi + paikka + taso: hälytys vain, jos (1) edellisestä on vähintään
`repeatMin` 30 min JA (2) arvo on käynyt rajan alla edellisen hälytyksen
jälkeen (uudelleenviritys). Testattu aikasarjalla: ylitys → hälytys; yhä yli
15 min myöhemmin → estetty (ei käynyt alla); alle → viritys; yli 10 min
myöhemmin (40 min ensimmäisestä) → hälytys; alle ja heti yli → estetty
(alle 30 min). Tänä yönä: yksi tarkistus vuorokaudessa, joten toistoa ei tule.
Tila tallennetaan `state.json`:iin (haara halytys-loki).

### Loki

Haara `halytys-loki` (ei main, ei gh-pages), yksi orpokommitti joka korvaa
edellisen (historia ei kasva, kuten gh-pages). Sisältö:
- `logs/VVVV-KK-PP.jsonl`: rivi per ajo: ajon aika, datan aikaleimat (OVATION
  havainto/ennuste, Kp reaaliaikainen/mitattu/ennusteen loppu, Bz viimeisin,
  pilvimallin ajo ja loppu), datavirheet, jokaiselle paikalle näkyvyys,
  OVATION %, pilvisyys %, pilvikerroin, pimeyskerroin, auringon korkeus,
  Bz-trendi (keskiarvo, kesto etelään, Bt, tuoreus, vihje), Kp, Tänä yönä
  (tarkistusajona) ja hälytykset: rajan ylittäneet tasot, olisiko lähtenyt
  ja syy (myös esto). Noin 4 kt/ajo → noin 5 Mt / 14 vrk.
- Säilytys 14 vrk (vanhemmat päivätiedostot poistetaan joka ajossa).
- `YHTEENVETO.md`: kolme viimeistä yötä (klo 12-12 Suomen aikaa): taulukko
  paikka × tunti 18-07 (tunnin suurin näkyvyys, merkit N/T/Y normaali-
  tasolla), luettelo hälytyksistä joita olisi lähetetty (kaikki tasot),
  ajojen määrä ja aukot. GitHub näyttää sen puhelimella haaran etusivulla.

### Testiajot GitHubissa (2026-10-21)

Kolme ajoa haaran push-liipaisimella, oikea data (OVATION 20.15 UTC, Kp
reaaliaikainen 3,3, Bz −6,7 nT etelään 436 min, ECMWF 06 UTC). Ei datavirheitä.
1. ajo: 31 tasokohtaista hälytystä (Oulu ja Rovaniemi Revontulia nyt 39 %,
   Tulossa kaikilla paikoilla pilvisyysrajan mukaan, Tänä yönä ensimmäisenä
   ajona klo 15 jälkeen); 2. ja 3. ajo: 0 (toiston esto: arvot eivät ole
   käyneet rajan alla). Loki ja yhteenveto haarassa halytys-loki.

**Sudenkuoppa (korjattu):** orpohaaran indeksin tyhjennys `git rm -r --cached .`
kieltäytyy koko poistosta, jos jokin tiedosto on muuttunut sekä indeksiin että
työhakemistoon nähden (lokit muuttuvat joka ajossa) - virhe meni hiljaa
`|| true`:n taakse ja haaraan jäi koko main. Nyt `git read-tree --empty` +
vain nimetyt lokipolut.

### Tuotanto: Cloudflare Worker (ei Actions)

**Tuotannossa hälytykset ajetaan Cloudflare Workerissa**, ei GitHub
Actionsissa: Actionsin ajastus myöhästyy tyypillisesti 5-20 min (ja voi
jäädä väliin ruuhkassa), mikä ei sovellu "revontulia nyt" -hälytykseen.
Worker voi ajaa minuutin välein (Cron Trigger) ja hakea NOAA:lta suoraan.
Siirto: `aurora-core.js` + `alerts/*.js` sellaisinaan (ei riippuvuuksia),
datan haku `fetch`illä (`SOURCES`), tila KV:hen/D1:een `state.json`:n sijaan,
pilvihila Pagesilta tai Workerin omasta välimuistista. Sama Worker voi tehdä
OVATION-esikäsittelyn (ks. MUISTIO-lataus.md).

### Avoimet kysymykset / myöhemmin

- Rajat ja herkkyystasot säädetään kuivaharjoituksen tulosten perusteella.
- Tulossa-hälytyksessä pilvisyys on nykyhetken arvo; voisi käyttää seuraavan
  tunnin ennustetta (Bz:n vaikutus näkyy ~30-60 min viiveellä).
- Pilvet vain ECMWF:stä (sovelluksessa valittava malli, HARMONIE tarkempi
  Suomessa) - ICON-EU/HARMONIE vaatisivat laiskan askelten haun.
- Tänä yönä -arvo käyttää Kp-ennustetta (kuten sovellus); kuluva tunti ei
  OVATIONista (avoin kysymys myös sovelluksessa, ks. CLAUDE.md "Näkyvyys").
- Testaus: työnkulun `push`-liipaisin on tilapäinen (haaran testaukseen);
  poistetaan ennen mainiin yhdistämistä. Ajastus alkaa vasta mainissa.
