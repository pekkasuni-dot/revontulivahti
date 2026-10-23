# Revontulihälytykset

## Vaihe 1: kuivaharjoitus (2026-10-21, haara claude/aurora-halytys-kuiva)

Ei ilmoituksia. GitHub Actions ajaa hälytyslogiikan 15 min välein viidelle
testipaikalle ja kirjaa, mitkä hälytykset **olisivat** lähteneet, jotta niitä
voi verrata havaintoihin ja revontulikameroihin.

**Kesto: 21.10.–4.11.2026 (14 vrk).** Työnkulku tarkistaa päivämäärän
(`END_DATE: '2026-11-04'`, UTC-päivä) ja lopettaa ajot automaattisesti sen
jälkeen; loki jää haaraan `halytys-loki`. Työnkulun voi poistaa sen jälkeen.

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
2. **Tulossa** (`coming`), KAIKKI ehdot:
   - Tulossa-vihje päällä (`bzHint`, sama kuin sovelluksen vihje: tuore
     mag-data alle 15 min, liukuva Bz 10 min <= -5 nT, etelään
     yhtäjaksoisesti >= 20 min, Bt >= 6 nT),
   - Bz (liukuva keskiarvo) <= `ALERT_CFG.coming.bzMax` (BZ_RAJA, oletus
     −5 nT) ja Bt >= `coming.btMin` (BT_RAJA, oletus 6 nT) - omat säätövakiot,
     voi kiristää vihjeestä riippumatta,
   - **paikka ulottuvilla**: Kp nyt (`kpNowInfo`, sama kuin alapalkki) +
     `coming.kpMargin` (oletus 1; oli 2, muutettu 2026-10-21) >= paikan Kp-raja. Kp-raja = `kpRequired(mlat)`
     (aurora-core.js) = Kp, jolla Tänä yönä -välilehden revontulivyöhykkeen
     reuna (`kpVisibility`: arvio 45 %) ulottuu paikan geomagneettiselle
     leveysasteelle (`magLat`, sama dipolimuunnos): (66,5 − mlat) / 2,05.
     Testipaikat: Tromssa −0,5, Kilpisjärvi −0,1, Rovaniemi 1,4, Oulu 2,1,
     Helsinki 4,3,
   - paikassa pimeää (aurinko alle -6°) ja pilvisyys nyt < tason raja.
   - **Lähtee vain siirtymästä**: ehto täyttyy nyt mutta EI edellisellä
     ajolla (`prevOn` tilassa). Pitkään jatkunut tila ei hälytä; ensimmäinen
     ajo (edellinen tuntematon) ei hälytä. Lisäksi `repeatMin`.
   Korjaus 2026-10-21: ensimmäinen versio (pelkkä vihje + pimeys + pilvet)
   hälytti myös Helsinkiin (Kp 3,3, Bz −6,7 nT 436 min).
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

Tulossa: Bz/Bt-rajat ja Kp-marginaali (`ALERT_CFG.coming`) ovat samat kaikilla tasoilla.
Rajat ovat ensimmäinen arvaus - kuivaharjoituksen tarkoitus on säätää niitä.

### Toiston esto

Revontulia nyt (Tulossa: siirtymä, ks. yllä): sama tyyppi + paikka + taso: hälytys vain, jos (1) edellisestä on vähintään
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
- Säilytys 16 vrk (vanhemmat päivätiedostot poistetaan joka ajossa; koko 15 yön jakso mahtuu).
- `YHTEENVETO.md`: kaikki kuivaharjoituksen yöt (klo 12-12 Suomen aikaa): taulukko
  paikka × tunti 18-07 (tunnin suurin näkyvyys, merkit N/T/Y normaali-
  tasolla), luettelo hälytyksistä joita olisi lähetetty (kaikki tasot),
  ajojen määrä ja aukot. GitHub näyttää sen puhelimella haaran etusivulla.

### Loppuraportti ja yöt (2026-10-21)

- **YHTEENVETO.md** näyttää kaikki kuivaharjoituksen yöt (uusin ensin), ei vain
  kolmea viimeistä. Ennen `START_AT` (2026-10-21 20.50 UTC) olleet haaran
  testiajot (vanha Tulossa-logiikka) jätetään pois yhteenvedosta ja raportista
  (lokissa ne ovat yhä). Lokien säilytys 16 vrk, jotta koko jakso on mukana.
- **LOPPURAPORTTI.md** (`alerts/alert-report.js`): jakso ja ajojen kattavuus,
  aktiivisuus (Kp, Bz-vihje) ja pilvisyys, yöt (näkyvyys, pilvet, hälytykset,
  havainnot), hälytysmäärät paikka × tyyppi × taso, vertailu havaintoihin
  (osuma / turha / ohi / hiljaa) ja **ehdotukset rajoihin vain tekstinä**
  (koodia ei muuteta): hiljainen (paikkakohtaisesti: yön suurin Kp ei
  yltänyt paikan Kp-rajaan `kpRequired(magLat)`, sama kuin hälytyksissä, ei
  kiinteää Kp 4 -rajaa) tai pilvinen jakso -> harkitse jatkoa,
  havaittujen öiden näkyvyys vs. nyt-raja, Tulossa-määrä per paikka-yö,
  Helsingin Tulossa-hälytykset, Tänä yönä -arvot.
- Työnkulun tilat: `run` (jakso käynnissä; END_DATE-päivänä myös
  **väliaikainen** raportti, päivittyy joka ajossa), `final` (ensimmäinen ajo
  END_DATE:n jälkeen eli 5.11. noin klo 02 Suomen aikaa: **lopullinen** raportti,
  merkintä `<!-- lopullinen -->`, ei hälytysajoa), `done` (ei mitään).
  Testattu GitHubissa erillisellä haaralla `halytys-loki-testi` (2026-10-21):
  kaikki kolme tilaa onnistuivat. Testihaaran poisto estyi Claude-ympäristöstä
  (403) - voi poistaa käsin.
- Raportin voi tehdä uudelleen myöhemmin (esim. havaintojen täydennyksen
  jälkeen): `node scripts/alert-dryrun.mjs --out <loki> --start 2026-10-21T20:50:00Z --end 2026-11-04 --final`.

### Omat havainnot

Haarassa `halytys-loki` tiedosto **HAVAINNOT.md**: valmis rivi joka yölle
21.10.–4.11. (`| Päivä | Paikka | Näkyikö | Pilvisyys | Kommentti |`, päivä =
yön alkupäivä muodossa 21.10.2026). Näkyikö: kyllä / ei (tyhjä = ei tietoa).
Useampi paikka samana yönä: rivi kopioidaan. Tyhjät rivit ohitetaan. Vanhan
muodon (3 saraketta) tiedosto muutetaan uuteen pohjaan, vanhat rivit
säilyvät. Muokataan käsin GitHubissa (puhelimella:
tiedosto → kynä → Commit changes). Yhteenvedon yötaulukossa sarake **Oma
havainto** (testipaikan nimi tai tunniste), muut paikat rivinä "Muut
havainnot". Ajo säilyttää tiedoston. Kilpajuoksu: jos tiedostoa muokataan ajon
aikana, force-push epäonnistuu (`--force-with-lease`), ajo hakee uuden
HAVAINNOT.md:n, tekee yhteenvedon uudelleen (`--summary-only`) ja yrittää
uudestaan -> muokkaus ei katoa.

### Testiajot GitHubissa (2026-10-21)

Kolme ajoa haaran push-liipaisimella, oikea data (OVATION 20.15 UTC, Kp
reaaliaikainen 3,3, Bz −6,7 nT etelään 436 min, ECMWF 06 UTC). Ei datavirheitä.
1. ajo: 31 tasokohtaista hälytystä (Oulu ja Rovaniemi Revontulia nyt 39 %,
   Tulossa kaikilla paikoilla pilvisyysrajan mukaan, Tänä yönä ensimmäisenä
   ajona klo 15 jälkeen); 2. ja 3. ajo: 0 (toiston esto: arvot eivät ole
   käyneet rajan alla). Loki ja yhteenveto haarassa halytys-loki.

**Uusi Tulossa-logiikka, kolme ajoa (2026-10-21 20.44-20.45 UTC):** Bz oli
heikentynyt (−3,9 nT, Bt 9,0, Kp 3,3) -> Tulossa-ehto ei täyttynyt missään,
hälytyksiä 0. Ei datavirheitä, HAVAINNOT.md luotiin, lease-push toimi.
**Takautuva tarkistus** (uudet ehdot klo 20.25 lokiriveille, Bz −6,7 nT, Bt
9,4, Kp 3,3): ehto täyttyy Oulussa, Rovaniemellä, Kilpisjärvellä ja
**Helsingissä** (Kp 3,3 + 2 = 5,3 >= Helsingin Kp-raja 4,3); Tromssassa ei
(pilvisyys 64 %). Siirtymäehto estää pitkään jatkuneen tilan hälytyksen, mutta
marginaalilla 2 Helsinki on "ulottuvilla" jo Kp 2,3:lla. Helsinki jäisi pois
tällä Kp:llä vasta, kun `kpMargin` < 1,0 (esim. 0,5 -> Helsinki vaatii Kp 3,8,
Oulu 1,6). **Päätös 2026-10-21: `kpMargin` = 1** -> Helsinki vaatii Kp 3,3, Oulu 1,1, Rovaniemi 0,4 (Kilpisjärvi ja Tromssa aina ulottuvilla). Säädetään kuivaharjoituksen perusteella.

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
- Testaus haarassa tehtiin tilapäisellä `push`-liipaisimella (poistettu
  ennen yhdistämistä). Ajastus toimii vain mainissa.

## Toiston esto ja datakatkot (2026-10-22, KATSELMOINTI.md 1.1)

**Vika (todennettu simuloimalla vanhalla koodilla):** puuttuva data palautti
saman tuloksen kuin "ehto ei täyty". Nyt-tyyppi virittyi uudelleen (`armed`),
Tulossa-tyyppi tulkitsi seuraavan ajon siirtymäksi (`prevOn = false`).
Esimerkki (Oulu, näkyvyys 50 %, Bz-vihje päällä, yksi katko klo 19.04):
vanha koodi hälytti klo 18.04 JA uudelleen klo 19.19 (Nyt herkkä/normaali +
Tulossa kaikki tasot), uusi vain klo 18.04.

**Korjaus (`alerts/aurora-alerts.js`):** `condition()` palauttaa
`unknown: true`, kun data puuttuu tai on vanhaa: OVATION/pilvet (Nyt), Bz,
Bz vanhaa, Bt puuttuu tai vanhaa (`btFresh`), Kp, pilvet (Tulossa).
`decide()` ei tällöin muuta `armed`/`prevOn`-tilaa (syy "tila tuntematon,
toiston esto ennallaan"). Tänä yönä ennallaan (hälyttää vain kun ehto
täyttyy). Aito lasku rajan alle hälyttää yhä uudelleen (testattu).

**Voimassa:** ajosta **22.10.2026 klo 23.46** (Suomen aikaa, 20:46 UTC) alkaen
(PR #81 yhdistetty, ajo käynnistetty käsin; lokissa ensimmäinen `logic: 2`). Lokirivillä uusi kenttä `logic: 2` (`LOGIC_VERSION`) ja datakatkon
tasoilla `u: true`. Loppuraportti (`alert-report.js`,
`possibleDuplicates()`) näyttää kohdan "Mahdolliset tuplahälytykset ennen
toiston eston korjausta" ja ajon, josta korjaus on voimassa (ensimmäinen
`logic >= 2`). Tunnistus vanhoista riveistä syytekstin perusteella.

**Todennus:** synteettinen ajosarja vanhalla ja uudella koodilla (yllä) +
`possibleDuplicates` vanhan koodin lokista: löytää 19.19:n Nyt- ja
Tulossa-hälytykset, uudesta ei mitään. Oikea loki `halytys-loki` 21.10. 20.25
– 22.10. 20.55: 14 ajoa, ei datakatkoja -> ei tuplahälytyksiä tähän mennessä.

## Ajastusten harvuus (2026-10-23, haara `claude/ajastusten-kattavuus`)

**Havainto:** GitHub Actionsin ajastetut ajot (`schedule`) toteutuvat vain
3-5 tunnin välein, ryppäinä (kaikki työnkulut samoihin aikoihin). 15 min
kuivaharjoitus ei tavoita lyhyitä revontulijaksoja, ja myös kameroiden tila
ja ICON-EU/HARMONIE-data vanhenevat.

**Toteutuneet ajovälit 20.10. 07.30 - 23.10. 07.30 UTC (72 h, vain
`schedule`-ajot, GitHub REST API).** Kuivaharjoitus vasta 21.10. 20.50
alkaen (START_AT). Pisin väli sisältää jakson lopun (viimeinen ajo -> 07.30).
Viive = ajon alku - edellinen pyydetty ajankohta (mediaani; tiheillä
ajastuksilla merkityksetön).

| Työnkulku | Cron (UTC) | Pyydetty väli | Pyydettyjä | Toteutui | Mediaaniväli | Pisin väli | Viive |
|---|---|---|--:|--:|--:|--:|--:|
| alert-dryrun | `4,19,34,49` | 15 min | 138 | 8 (6 %) | 4,8 h | 5,7 h | 5 min |
| camera-status | `*/10` | 10 min | 433 | 18 (4 %) | 4,6 h | 5,3 h | 5 min |
| ecmwf-7d | `25 8,20` | 12,0 h | 6 | 6 (100 %) | 9,6 h | 14,7 h | 4,2 h |
| pilvidata-ecmwf | `12 1,7,13,19` | 6,0 h | 12 | 12 (100 %) | 5,3 h | 7,8 h | 4,8 h |
| pilvidata-harmonie | `25 2,5,8,11,14,17,20,23` | 3,0 h | 24 | 13 (54 %) | 4,8 h | 8,3 h | 2,3 h |
| pilvidata-icon_eu | `55 2,5,8,11,14,17,20,23` | 3,0 h | 24 | 15 (62 %) | 4,8 h | 6,1 h | 2,1 h |
| wind-ecmwf | `17 1,7,13,19` | 6,0 h | 12 | 12 (100 %) | 5,2 h | 7,8 h | 4,8 h |
| wind-harmonie | `35 2,5,8,11,14,17,20,23` | 3,0 h | 24 | 15 (62 %) | 4,8 h | 6,1 h | 2,3 h |
| wind-icon_eu | `58 2,5,8,11,14,17,20,23` | 3,0 h | 24 | 15 (62 %) | 4,8 h | 6,2 h | 2,1 h |

Esim. kuivaharjoituksen ajot: 21.10. 23.43, 22.10. 01.53, 07.17, 13.01,
17.55, 21.19, 23.10. 00.04, 04.52 UTC. Kaikki ajot onnistuivat - vika on
ajastuksessa, ei työnkuluissa. ECMWF-työnkulut ajetaan kyllä joka kerta, mutta
keskimäärin 4,8 h myöhässä.

Loppuraporttiin lisätty "Ajojen kattavuus tunneittain" (`alerts/alert-report.js`
`coverageByHour`): ajoja per tunti Suomen aikaa, tunnit ilman ajoa (myös
yöllä 18-06) ja ajojen ulkopuolelle jääneet jaksot. Oikealla lokilla
23.10. klo 10: tunneista 66 % ja yötunneista 58 % ilman yhtään ajoa.

### Korjausvaihtoehdot (ei toteutettu, käyttäjän päätös)

Molemmissa työnkulku käynnistetään `workflow_dispatch`-kutsulla
(`POST /repos/pekkasuni-dot/revontulivahti/actions/workflows/<tiedosto>/dispatches`,
runko `{"ref":"main"}`). Dispatch-ajot alkavat yleensä alle minuutissa
(julkinen repo: ei minuuttikustannusta). `schedule` voi jäädä varalle;
päällekkäiset ajot eivät haittaa (`concurrency: alert-dryrun` jonottaa,
toiston esto tilassa).

**Avain (molemmat):** fine-grained personal access token
- Repository access: vain `pekkasuni-dot/revontulivahti`
- Repository permissions: **Actions: Read and write** (dispatch vaatii
  kirjoitusoikeuden; Metadata: read tulee automaattisesti). EI Contents-,
  Secrets- tai muita oikeuksia. (Tarkista GitHubin REST-ohjeesta "Create a
  workflow dispatch event" ennen käyttöönottoa.)
- Voimassaolo esim. 90 vrk - 1 v, uusitaan.
- Mitä vuotanut avain mahdollistaa: minkä tahansa työnkulun käynnistyksen
  (myös datan julkaisun mainista - mutta vain mainin koodilla, koodia ei voi
  muuttaa), ajojen perumisen/uudelleenajon ja lokien poiston, työnkulkujen
  kytkemisen pois. Ei koodin, haarojen eikä salaisuuksien muutosta.
  Haitta: roskaajot ja ajohistorian sotkeminen; korjaus = avaimen mitätöinti.

**a) Ulkoinen ajastin (esim. cron-job.org, ilmainen)**
- Teet: tili cron-job.orgiin, PAT (yllä), ajastus `*/15` (ja tarvittaessa
  `*/10` kameroille) -> POST GitHubin dispatch-osoitteeseen, otsakkeet
  `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`.
- Työ: 15-30 min, ei koodimuutoksia (työnkulut tukevat jo dispatchia).
- Riskit: avain kolmannen osapuolen palvelussa (luottamus, tietomurto);
  palvelun oma luotettavuus ja ehdot (ilmaispalvelu, ei SLA:ta);
  yksi ajastus per työnkulku tai per kutsu.

**b) Cloudflare Worker -ajastin**
- Ilmaistaso (Cloudflaren limits-sivu 2026-10): 5 Cron Triggeriä / tili,
  **10 ms CPU-aikaa / ajo**, 100 000 pyyntöä / vrk, 50 alipyyntöä / ajo.
  Maksullinen (5 $/kk): CPU 30 s / ajo, 250 triggeriä.
- **b1) Worker vain ajastimena (suositus nyt):** yksi Worker, cron
  `*/5 * * * *`, joka päättää minuutin perusteella mitkä työnkulut
  dispatchataan (hälytykset 15 min, kamerat 10 min, data niiden omin välein).
  CPU-aika ~1 ms -> ilmaistaso riittää.
  - Teet: Cloudflare-tili (ilmainen, sähköposti), PAT (yllä) Workerin
    salaisuudeksi (`GITHUB_TOKEN`, Workers > Settings > Variables, tai
    `wrangler secret put`). Jos julkaisu GitHub Actionsista: Cloudflare API
    -avain (oikeus "Workers Scripts: Edit" vain tälle tilille) + tilin ID
    GitHubin repo-salaisuuksiksi; muuten koodi liitetään kerran käsin
    dashboardiin.
  - Työ: ~1-2 h (Worker ~40 riviä + `wrangler.toml`, testi, ohje).
  - Avain pysyy Cloudflaressa (ei uutta kolmatta osapuolta, sama tili
    tarvitaan myöhemmin OVATION-esikäsittelyyn ja tuotantohälytyksiin).
- **b2) Hälytyslogiikka kokonaan Workeriin (tuotannon suunnitelma):**
  `aurora-core.js` + `alerts/*.js` sellaisinaan, data `fetch`illä, tila
  ja loki KV:hen/D1:een (yhteenveto/raportti erillisellä ajolla tai GitHubiin
  contents-API:lla -> laajempi avain Contents: write vain lokihaaralle ei ole
  mahdollinen, koskisi koko repoa). Ongelma: 10 ms CPU ei riitä
  ECMWF-pilvihilan (~2 Mt JSON) jäsentämiseen -> joko maksullinen taso tai
  hakutyönkulku tuottaa pienen pistetiedoston (pilvisyys testipaikoille).
  Työ: 1-2 pv + testaus; kuivaharjoitus päättyy 4.11., joten ei ehdi
  tuottaa vertailukelpoista dataa tälle jaksolle.

Suositus: b1 heti (myös kamerat ja data hyötyvät), b2 tuotantohälytysten
yhteydessä. a on nopein, jos Cloudflare-tiliä ei haluta vielä.

## Cloudflare-ajastin (2026-10-23, haara `claude/cloudflare-ajastin`, käyttäjän valinta b)

**Toteutus:** `workers/ajastin` (Cloudflare Worker, cron `*/5`): käynnistää
työnkulut `workflow_dispatch`-kutsulla aikataulun `src/schedule.js` mukaan
(säätövakio `SCHEDULE`): hälytykset 15 min (:05/:20/:35/:50), kamerat 10 min,
ECMWF pilvet/tuuli 01/07/13/19 :15/:20, ECMWF 7 vrk 08/20 :25, HARMONIE
pilvet/tuuli 3 h välein :25/:35, ICON-EU pilvet/tuuli 3 h välein :55 (entiset
cronit pyöristettynä seuraavaan 5 minuuttiin). Ennen käynnistystä Worker
katsoo työnkulun mainin viimeiset 5 ajoa: jos jokin on jonossa/käynnissä,
ohitetaan (ei päällekkäisiä ajoja). Julkaisu `.github/workflows/deploy-ajastin.yml`
(wrangler-action, vain mainista, ohitetaan ilman Cloudflare-salaisuuksia).
Käyttöönotto: OHJE-ajastin.md. Testit `tests/ajastin.test.mjs`.

**Varajastus:** GitHubin cronit harvennettu (hälytykset ja kamerat 1 h,
ECMWF 2x vrk, 7 vrk 1x vrk, ICON-EU/HARMONIE 6 h) ja jokaisessa työnkulussa
uusi `vahti`-job (vain schedule-tapahtumassa, `.github/actions/ajastin-vahti`):
jos työnkulku on käynnistetty `workflow_dispatch`illa mainilla viimeisen
max-age-min aikana (1,5-2 x ajastimen väli: 30 / 20 / 540 / 1080 / 270 min),
varaajo ohitetaan; muuten ajetaan ja lokiin varoitus "Ajastin myöhässä".
Datatyönkulkujen `cancel-in-progress` true -> false: varaajo ei saa
keskeyttää ajastimen käynnissä olevaa ajoa (jää jonoon, vahti ohittaa).

**Repo julkinen** (GitHub API: `private: false`) -> GitHubin tavalliset
Linux-ajot ovat ilmaisia ilman minuuttikattoa (yksityisellä Free-tilillä
2 000 min/kk). Kulutus uusilla väleillä (laskutettava minuutti = jokainen job
pyöristettynä ylös; keskiarvo mainin 5 viimeisestä onnistuneesta ajosta 23.10.):

| Työnkulku | Ajoja / vrk | min / ajo | min / vrk | min / kk (30 vrk) |
|---|--:|--:|--:|--:|
| alert-dryrun | 96 | 1,0 | 96 | 2 880 |
| camera-status | 144 | 2,0 | 288 | 8 640 |
| pilvidata-ecmwf | 4 | 3,2 | 13 | 384 |
| wind-ecmwf | 4 | 3,8 | 15 | 456 |
| ecmwf-7d | 2 | 5,0 | 10 | 300 |
| pilvidata-harmonie | 8 | 3,2 | 26 | 768 |
| wind-harmonie | 8 | 11,4 | 91 | 2 736 |
| pilvidata-icon_eu | 8 | 5,8 | 46 | 1 392 |
| wind-icon_eu | 8 | 17,4 | 139 | 4 176 |
| varaajojen vahti (~70 / vrk) | 70 | 1,0 | 70 | 2 100 |
| **Yhteensä** | | | **~795** | **~23 800 (~400 h)** |

Vertailu: toteutunut tahti 20.-23.10. oli noin 15 % tästä. Cloudflaren
puolella ~288 herätystä / vrk, ~1 ms CPU, enintään ~10 alipyyntöä /
herätys -> ilmaistason rajat (100 000 pyyntöä / vrk, 50 alipyyntöä, 10 ms)
riittävät. GitHub API: ~600 kutsua / vrk (raja 5 000 / h).

**Kuivaharjoituksen uudelleenaloitus** (kun ajastin on todennettu): uusi
14 vrk jakso uuteen lokihaaraan `halytys-loki-2` (`LOKI`, `START_AT` =
aloitushetki, `END_DATE` = +14 vrk). Vanha `halytys-loki` (21.10. alkaen,
harvat ajot) jää koskematta erilleen, myös sen HAVAINNOT.md.
