# Revontulihälytykset

## Vaihe 1: kuivaharjoitus (2026-10-21, haara claude/aurora-halytys-kuiva)

Ei ilmoituksia. GitHub Actions ajaa hälytyslogiikan 15 min välein viidelle
testipaikalle ja kirjaa, mitkä hälytykset **olisivat** lähteneet, jotta niitä
voi verrata havaintoihin ja revontulikameroihin.

**Kesto (2. jakso): 23.10.–6.11.2026 (14 vrk), haara `halytys-loki-2`.**
1. jakso 21.–23.10. (`halytys-loki`) keskeytettiin, koska GitHubin ajastus
toteutui vain 3–5 h välein; jakso aloitettiin alusta Cloudflare-ajastimen
käyttöönoton jälkeen (ks. "Cloudflare-ajastin"). Työnkulku tarkistaa
päivämäärän (`END_DATE: '2026-11-06'`, UTC-päivä): 6.11. väliaikainen ja
7.11. lopullinen LOPPURAPORTTI.md, sen jälkeen ei ajoja. Työnkulun voi
poistaa sen jälkeen.

### Rakenne

| Tiedosto | Tehtävä | Ympäristö |
|---|---|---|
| `aurora-core.js` | Sovelluksen laskentafunktiot (pimeys, OVATION, pilvisyys, näkyvyysindeksi, Bz-trendi + Tulossa-vihje, Kp nyt, Tänä yönä). **Siirretty index.html:stä sellaisinaan**, sovellus käyttää niitä ohuiden kääreiden kautta. | selain, Node, Worker |
| `alerts/aurora-alerts.js` | Hälytyssäännöt, rajat (`ALERT_CFG`), toiston esto, lähteiden osoitteet (`SOURCES`). Ei Node- eikä selainriippuvuuksia. | Node, Worker |
| `alerts/alert-summary.js` | Lokista yhteenveto (Markdown). | Node, Worker |
| `alerts/test-places.json` | Testipaikat revontulikameroiden kohdalla (2026-10-23): Oulu (Nallikari), Rovaniemi (Apukka), Kilpisjärvi, Lyngen, Levi, Sodankylä + vertailuna Helsinki (+ aikavyöhyke, `camera` = cameras.json-id). Ennen: Oulu ja Rovaniemi keskustassa, Tromssa. | |
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
     Testipaikat (23.10. alkaen): Lyngen −0,4, Kilpisjärvi −0,1, Levi 0,8,
     Sodankylä 1,1, Rovaniemi 1,4, Oulu 2,1, Helsinki 4,3 (ennen myös Tromssa −0,5),
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

**Varajastus:** GitHubin cronit ENNALLAAN (käyttäjän päätös 2026-10-23:
harvennus erillisenä muutoksena, kun Worker on toiminut vähintään 3 vrk;
ehdotus silloin: hälytykset ja kamerat 1 h, ECMWF 2x vrk, 7 vrk 1x vrk,
ICON-EU/HARMONIE 6 h). Jokaisessa työnkulussa uusi `vahti`-job (vain schedule-tapahtumassa, `.github/actions/ajastin-vahti`):
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
| varaajojen vahti (nykyisillä croneilla GitHubin toteutunut tahti ~70 / vrk) | 70 | 1,0 | 70 | 2 100 |
| **Yhteensä** | | | **~795** | **~23 800 (~400 h)** |

Vertailu: toteutunut tahti 20.-23.10. oli noin 15 % tästä. Cloudflaren
puolella ~288 herätystä / vrk, ~1 ms CPU, enintään ~10 alipyyntöä /
herätys -> ilmaistason rajat (100 000 pyyntöä / vrk, 50 alipyyntöä, 10 ms)
riittävät. GitHub API: ~600 kutsua / vrk (raja 5 000 / h).

**Kuivaharjoituksen uudelleenaloitus** (kun ajastin on todennettu): uusi
14 vrk jakso uuteen lokihaaraan `halytys-loki-2` (`LOKI`, `START_AT` =
aloitushetki, `END_DATE` = +14 vrk). Vanha `halytys-loki` (21.10. alkaen,
harvat ajot) jää koskematta erilleen, myös sen HAVAINNOT.md.
**Toteutettu 2026-10-23:** `START_AT` 2026-10-23T14:45Z, `END_DATE`
2026-11-06, ajastimen 1. tunti todennettu (hälytykset 15 min, kamerat
10 min, ei tuplia). Vanhan haaran HAVAINNOT.md oli tyhjä (ei siirrettävää);
uuden haaran pohja (rivit 23.10.–6.11.) syntyy ensimmäisellä ajolla. 1. jakson
lopullista raporttia ei kirjoiteta (haaraa ei enää päivitetä).

**GitHub-avaimen vanheneminen (2026-10-23):** fine-grained-avaimelle pisin
mahdollinen voimassaolo ja kalenterimuistutus 2 viikkoa ennen. Worker kirjaa
401/403-vastaukset selvästi (`GITHUB-AVAIN EI KELPAA (401)`; käyttöraja
erikseen `GITHUB KÄYTTÖRAJA (403)`, x-ratelimit-remaining 0). Ajastimen
pettäessä GitHubin omat cronit + vahti jatkavat (3-5 h tahti). Uusiminen:
OHJE-ajastin.md "Avaimen uusiminen" (Regenerate token -> Cloudflaressa
`GH_DISPATCH_TOKEN` -> Edit; tarkistus lokista).

## Testipaikat kameroiden kohdalle (2026-10-23)

Käyttäjän pyyntö: hälytyksiä verrataan revontulikameroihin, joten paikat
ovat kameroiden kohdalla (`test-places.json`, kenttä `camera`): Oulu
(Nallikari 65,03/25,41), Rovaniemi (Apukka 66,578/26,015, ~15 km keskustasta
koilliseen), Kilpisjärvi (sama), **Lyngen** (Lyngen North 69,75/20,6,
Tromssan tilalle), **Levi** ja **Sodankylä** (uudet); Helsinki vertailuna.
Id:t oulu/rovaniemi/kilpisjarvi pysyivät, joten niiden yöt jatkuvat samalla
rivillä (sijainti siirtyi vähän; Kp-rajat ennallaan).

- **Merkintä lokissa:** jokaisessa lokirivissä `placeSet` (paikkojen id:t
  pilkuin). `placeChange()` (alert-summary.js) etsii ensimmäisen ajon
  nykyisillä paikoilla -> YHTEENVETO.md:n ja LOPPURAPORTTI.md:n alussa
  "Testipaikat vaihtuivat ajosta ... alkaen; uudet ...; pois Tromssa".
  Uusien paikkojen solut ovat ennen sitä –, raportin "Aktiivisia öitä"
  kertoo paikan öiden määrän ("(n yöstä)"), jos se on muita pienempi.
- **HAVAINNOT.md:** valmis rivi joka yölle JOKAISELLE paikalle (15 yötä x 7
  = 105 riviä, `obsTable`); ohjeteksti paikoista (`obsIntro`). Jokainen ajo
  muodostaa pohjan uudelleen: käyttäjän täyttämät rivit säilyvät sellaisinaan
  (saman yön ja paikan rivi korvaa pohjarivin, muut täytetyt jäävät yön
  perään), tyhjät rivit luodaan uudelleen (testi `tests/alerts.test.mjs`).
- Jakso ennallaan: `END_DATE` 2026-11-06.


## FMI:n keogrammit (selvitetty 2026-10-23)

Tavoite: linkit Kilpisjärven, Muonion, Sodankylän ja Kevon keogrammeihin
yhteenvedon ja loppuraportin jokaiselle yölle. Selvitetty tutkimusajolla
GitHub Actionsista (space.fmi.fi ei ole tavoitettavissa Claude-ympäristöstä).

- Osoitteet: `https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/<AS>.<VVKK>/<AS>_<VVKKPP>.jpg`
  (AS = KIL/MUO/SOD/KEV, päivä = illan päivä, UT00 keskellä kuvaa),
  pikkukuva `<AS>_s.<VVKK>/<AS>_<VVKKPP>_s.jpg`, kuukausisivu
  `keograms_<kk><vv>.shtml` (esim. keograms_oct25.shtml).
- **Ei ajantasainen tällä kaudella:** 23.10.2026 kauden 2026-27 sivuja ja
  hakemistoja ei ole lainkaan (sep26/oct26 ja KIL/MUO/SOD/KEV.2610 = 404).
  Viimeisin julkaistu kuukausi toukokuu 2026.
- Viime kauden viive (Last-Modified, lokakuu 2025): Muonio ja Kevo samana
  yönä (~23.56 UTC), Kilpisjärvi 9.12.2025 (~2 kk), Sodankylä 16.3.2026 (~5 kk;
  SGO:n kamera). Kevo vasta 31.10. alkaen.
- Sivujen ehto: "RAW DATA ... NOT SUITABLE for publication" -> omaan
  tarkistukseen linkkeinä käy, sovellukseen ei ilman FMI:n lupaa.
- Toteutus (käyttäjän vaihtoehto 2): linkit vain julkaistuihin, ks. alla.

## Keogrammit yhteenvedossa ja raportissa (2026-10-23)

`alerts/keograms.js`: asemat `STATIONS` (FMI Muonio, Kilpisjärvi, Kevo,
Sodankylä + IRF Kiiruna). Hälytysajo (`alert-dryrun.mjs`, ei `--fixtures`)
tarkistaa kuvan olemassaolon (GET `Range: bytes=0-0`, 200/206 + `image/*`;
FMI:n puuttuva = 404 text/html) ja tallentaa löytyneet osoitteet lokihaaran
`keograms.json`:iin. Kuvia ei tallenneta mihinkään.

- **Milloin:** yö (illan päivä) on valmis seuraavana päivänä klo 06 UTC
  (`CHECK.morningUtc`; IRF:n koko yön kuva valmis ~05.51 UTC). Viimeisin
  valmis yö tarkistetaan jokaisella ajolla, kunnes kaikki löytyvät;
  vanhemmat puuttuvat kerran vuorokaudessa klo 07 UTC jälkeen
  (`CHECK.dailyUtc`), koska FMI julkaisee osan asemista viikkojen-kuukausien
  viiveellä. Löydettyjä ei kysytä uudelleen.
- **Esitys:** YHTEENVETO.md:ssä jokaisen yön otsikon alla rivi
  "Keogrammit: [Muonio] · Kiiruna [ilta] + [aamu] — julkaisematta: ...";
  ennen tarkistusta "tarkistetaan yön jälkeen aamulla". LOPPURAPORTTI.md:ssä
  oma osio "Keogrammit". IRF:llä kuva per UTC-vuorokausi -> yöhön kaksi
  linkkiä (ilta = illan päivä 15-24 UTC, aamu = seuraava päivä 00-06 UTC).
- **Testattu oikeilla palvelimilla** (GitHub Actions 23.10.): yö 22.10.
  Kiiruna ilta + aamu löytyivät, FMI 404 -> julkaisematta; arkistoyöt
  20.10.2025 ja 2.3.2026 löytyivät oikein. Yksikkötestit `tests/keograms.test.mjs`.

### IRF Kiiruna (KAGO)

- Ajantasainen: hakemistolistaus `https://www.irf.se/alis/allsky/krn/VVVV/KK/PP/`,
  `keoVVVVMMDD.gif` (UTC-vuorokausi, päivittyy tunneittain kuvauksen aikana),
  myös `nkeo`, `dark_keo`, `movieVVVVMMDD.mp4`; viikkokeogrammi
  `krn/VVVV/KK/keoVVVV_<viikko>.gif`. Kausi elo-huhtikuu.
- **Käyttöehdot** (https://www.irf.se/en/forskning/kago/license/): ei-
  yksinomainen lisenssi; maksuton tieteelliseen ja muuhun ei-kaupalliseen
  käyttöön; kaupallinen käyttö tai jäljentäminen vaatii etukäteen kirjallisen
  luvan; julkaisu missä tahansa mediassa vaatii KAGO:n johtajan luvan;
  edelleen jaettaessa vastaanottajan on hyväksyttävä sopimus; aikaa ja päivää
  ei saa muuttaa ja esittää virallisena aineistona (ajat UTC).
  -> Omaan tarkistukseen linkkeinä sallittu. Sovellukseen (kaupallinen
  natiivisovellus) VAIN kirjallisella luvalla.

### SGO Sodankylä (Oulun yliopisto)

- Ajantasainen vain "uusin": `https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest_keogram.jpg`
  (Sky-I, päivittyy minuuteittain, korvautuu). Yökohtainen arkisto
  (`Data/Optical/Skyi/skyiDataMain.php`) on POST-lomake eikä anna kuvan
  osoitetta, "REVOT SKY-i-camera keograms available with delay" -> ei
  yökohtaisia linkkejä; yhteenvedon ja raportin alussa yksi linkki uusimpaan.
  Abiskon EMCCD-keogrammi päivittyy seuraavana päivänä ~07.30 UTC.
  FMI:n arkiston SOD-kuvat ovat SGO:n kamerasta (viive ~5 kk).
- **Käyttöehdot** (https://www.sgo.fi/Data/licence.php): ei-yksinomainen
  lisenssi; lataus ja käyttö maksutonta akateemiseen tutkimukseen; kaupallinen
  käyttö tai jäljentäminen vaatii etukäteen kirjallisen luvan (yleensä
  maksullinen); julkaisu mediassa edellyttää yleensä yhteistekijyyttä ja
  sopimista SGO:n kanssa; palvelun tiedot ovat muuten julkisia ja vapaasti
  käytettävissä, ellei toisin merkitty; aikaa ei saa muuttaa.
  -> Linkki omaan tarkistukseen sallittu (ei latausta eikä jakelua).
  Sovellukseen vain luvalla.

## Kenttätesti: ilmoitukset ntfy:llä ja palaute (2026-10-24, haara `claude/halytykset-ntfy`)

**Yksi yhteinen kanava (käyttäjän päätös 2026-10-24, korvasi Pekan ja oppaan erilliset kanavat):**
salaisuus `NTFY_TOPIC_YHTEINEN`, paikat Oulu, Rovaniemi, Levi, Kilpisjärvi, Utsjoki
(test-places.json `notify: true`), jokainen hälytys lähetetään kerran, palautteessa vastaajaa
ei eroteta (ei `k`-parametria, allekirjoitus vain tunnisteesta, PALAUTE.md ilman vastaajaa).

**Aloitus:** kenttätesti alkaa, kun haara on mainissa JA salaisuudet `NTFY_TOPIC_YHTEINEN`
ja `PALAUTE_AVAIN` on asetettu (OHJE-ntfy.md). Ensimmäisen lähetetyn
ilmoituksen aika kirjautuu automaattisesti loppuraportin alkuun ("ilmoitukset lähetettiin ...
alkaen"). **Kenttätesti alkoi 24.10.2026 klo 15.15 (Suomen aikaa)**: PR #95 yhdistettiin mainiin klo 15.14, Worker julkaistiin palauteavaimen kanssa klo 15.15. Testi-ilmoitus vahvistettiin puhelimella (napit näkyvät pitkällä painalluksella), ja simuloitu palaute tallentui kaikilla kolmella napilla PALAUTE.md:hen klo 15.16 (ntfy-testi.yml, testi-40093245767-1).

**Mitä muuttui (olemassa oleva logiikka, ajastin ja loki ennallaan):**
- Testipaikat: + Utsjoki (kameran kohta 69,908 N 27,027 E, kameran tunnus jHfZ4ZYsaOA toimi
  24.10.: lähetys käynnissä, tarkistettu 4 min aiemmin), − Helsinki. Muut ennallaan; kaikkien
  koordinaatit = cameras.json-kameroiden kohdat (tarkistettu). Vaihto näkyy lokissa (`placeSet`)
  ja yhteenvedossa/raportissa (`placeChanges`, kaikki vaihdot listana). HAVAINNOT.md:n pohja
  luo Utsjoelle rivit, Helsingin tyhjät rivit poistuvat (täytetyt säilyvät).
- Pilvisyys HARMONIEsta (`ALERT_CFG.cloudModel`, `alerts/cloud-models.js`): vain tarvittavat
  aika-askeleet (nyt 2 askelta ~3 Mt; Tänä yönä -tarkistuksessa 20 h ~30 Mt kerran päivässä).
  Ajo yli `cloudMaxAgeH` (9 h) vanha tai ennuste loppunut -> pilvet "ei dataa" -> tila tuntematon,
  EI hälytystä (virhe lokiin). Jokaisessa lokirivissä paikoittain `clouds: {ecmwf, icon_eu,
  harmonie}` (nykyhetki) ja `data.models` (ajojen ajat). `LOGIC_VERSION` 3.
- **Pilvikerrokset (2026-10-24):** hälytysten näkyvyys lasketaan kokonaispilvisyydestä koko kenttätestin ajan ja myös sen jälkeen (käyttäjän päätös "Pilvikerrokset vain näytettäväksi"). `ALERT_CFG.cloudLayers` on poistettu. Kerrokset ovat omissa tiedostoissaan (`clouds-<malli>-layers-stepNN.json`), joita hälytysajo ei lue. Laskenta ei muuttunut testin aikana, eikä `LOGIC_VERSION` noussut.
- **Sovelluksen ja hälytysten näkyvyyden ero testin alussa (tarkennus 2026-10-24):** sovelluksen näkyvyysprosentti painotti pilvikerroksia (0,95 · matala + 0,65 · keski + 0,30 · ylä) joillakin malleilla:
  - ICON-EU: kerrospainotus testin alusta v1.234:ään asti (yhdistetty mainiin 24.10. klo 21.23).
  - HARMONIE: kerrospainotus vain v1.232:ssa (24.10. klo 20.29–21.23). v1.233 oli vain kehityshaarassa, ei tuotannossa. Ennen v1.232:ta HARMONIE-datassa ei ollut kerroksia, joten laskenta käytti kokonaispilvisyyttä.
  - ECMWF ja hälytykset: kokonaispilvisyys koko ajan.
  - Jos sovelluksen ja hälytyksen näkyvyys erosivat ICON-EU:lla tai HARMONIElla tänä aikana, syy voi olla tämä. Puhelimessa vanha versio voi olla käytössä vielä jonkin aikaa yhdistämisen jälkeen, kunnes päivitys ladataan.
- Ilmoitukset (`alerts/notify.js`): vain lähteneet (`fire`) tasolla normaali (`sendLevel`),
  kaikki kolme tyyppiä, yhteiselle kanavalle paikoilta `notify: true`. Viesti suomeksi,
  paikkakunta ensin: "Levi: Revontulia nyt · näkyvyys 48 % · HARMONIE · klo 22.15";
  Tulossa: "Bz −7,2 nT etelään 25 min · pilvisyys 20 %"; Tänä yönä: "paras näkyvyys 52 % klo 21–23".
  Kamerapaikoilla (`cameraLink`: Levi, Kilpisjärvi, Utsjoki) rivi "Kamera: <YouTube>" ja
  napautus avaa kameran (sama osoite kuin sovelluksen "Katso YouTubessa").
  Lähetys vain mainista (`--send`, työnkulku) - haara-ajot ja paikalliset ajot eivät lähetä.
- Palaute: napit Näkyi / Ei näkynyt / Pilvessä (ntfy http-toiminto, POST) -> Worker `/palaute`
  (`workers/ajastin/src/palaute.js`) tarkistaa allekirjoituksen HMAC-SHA256(PALAUTE_AVAIN,
  tunniste) -> käynnistää `palaute.yml` (sama GitHub-avain, Actions write riittää)
  -> `scripts/alert-feedback.mjs` hyväksyy vain lokissa lähetetyt (`record.sent`) tai `testi-`
  tunnisteet -> rivi `PALAUTE.md`:hen lokihaarassa. Kaikki vastaukset säilyvät. Hälytysajon
  orpokommitti ottaa PALAUTE.md:n mukaan (myös lease-uudelleenyrityksessä uusimman).
- Loppuraportti: osio "Kenttäpalaute (ntfy)" paikoittain ja tyypeittäin (lähetetty / näkyi /
  ei näkynyt / pilvessä / ei vastausta) + mallien pilvisyys vastatuissa hälytyksissä ja
  keskiarvot vastauksittain.
- Testi: `ntfy-testi.yml` (käsin; "simuloi" painaa napit ja odottaa PALAUTE.md-rivit).

**Tietosuoja ja palvelu:** ntfy.sh on ulkoinen palvelu (Saksa, avoin lähdekoodi). Kanavan nimi
on ainoa suoja -> pitkä satunnainen, vain GitHubin salaisuuksissa ja puhelimessa, ei lokeissa
(GitHub peittää salaisuudet; `sendAll` ei palauta kanavaa, virhetekstistä poistetaan).
Ilmoitukset eivät sisällä henkilötietoja: paikka, hälytystyyppi, luvut, kellonaika. Palautteessa
vain vastaus (vastaajaa ei tallenneta). **Tuotannossa siirrytään omaan Web Push -toteutukseen** (ei ulkoista
välittäjää, tilaus sovelluksesta).

**Avoimet kysymykset / tekemättä jätetyt:**
1. **Palautteen koko ketjua ei voi testata ennen mainiin yhdistämistä:** GitHub käynnistää
   `workflow_dispatch`-työnkulun (palaute.yml) vain, jos se on oletushaarassa, ja Worker
   julkaistaan vain mainista (deploy-ajastin.yml, käyttäjän sääntö "julkaisu vain mainista").
   Ennen yhdistämistä voi testata: ilmoituksen perillemeno ja napit näkyvissä (ntfy-testi.yml
   haaralta). Napin tallennus testataan heti yhdistämisen jälkeen (ntfy-testi.yml, "simuloi" +
   oma painallus). Käyttäjän ohje "yhdistä vasta kun testi-ilmoitus on vahvistettu puhelimella"
   tulkittu: ilmoitus + napit näkyvät puhelimessa -> yhdistetään -> palaute testataan.
2. Rovaniemen (Apukka) ja Oulun (Nallikari) ilmoituksiin EI kameralinkkiä (tehtävässä vain
   Levi, Kilpisjärvi, Utsjoki). Lisäys = `"cameraLink": true` test-places.json:iin.
3. Jos hälytysajon tallennus (push) epäonnistuu 4 kertaa lähetyksen jälkeen, lähetetty
   hälytys puuttuu lokista ja sen palaute hylätään "tuntemattomana". Harvinainen; ei korjattu.
4. Tulossa- ja Revontulia nyt -ilmoitukset prioriteetilla 4 (korkea), Tänä yönä 3. Ei
   hiljaisia tunteja - ilmoitus voi tulla yöllä (revontulet ovat yöllä).

## Varajastus kenttätestin jälkeen (TEHTÄVÄ loppuraportin läpikäynnin yhteydessä, 7.11. alkaen)
`alert-dryrun.yml`:n GitHub-varajastus on kenttätestin ajan 30 min (`cron: '4,34 * * * *'`,
harvennettu 2026-10-26). Kun loppuraportti on käyty läpi, vaihdetaan 1 h:iin (`'4 * * * *'`) tai
poistetaan työnkulku kokonaan, jos kuivaharjoitus lopetetaan (`END_DATE` 2026-11-06). Vahdin raja
(`max-age-min: '30'`) pysyy, jos ajastimen väli on 15 min. Ks. OHJE-ajastin.md "Toimintavarmuus".


## Päätettäväksi 7.11. (loppuraportin yhteydessä): hälytysten pilvisyyslähde (kirjattu 2026-10-27)

**Taustaongelma:** sovelluksen säämalli on nyt valittavissa myös "Meteorologit (IL)" (FMI:n editoitu
ennuste, merkki M), ja kaikki näkymät seuraavat valittua mallia. Hälytykset käyttävät kenttätestin ajan
kiinteästi HARMONIEta (`ALERT_CFG.cloudModel`) -> hälytys voi olla ristiriidassa sen kanssa, mitä käyttäjä
näkee Tänä yönä -välilehdellä. Hälytyksiin EI muutoksia ennen 6.11. (kenttätesti).

**Päätettävät kysymykset:**
1. **Pilvisyyslähde:** (a) käyttäjän valitsema malli (vaatii mallivalinnan tallennuksen palvelimelle /
   tilaukseen), (b) aina meteorologien ennuste (päivittyy tunnin välein, ihmisen tarkistama, mutta ei
   kata koko Pohjolaa: 4-36 °E, 58-72,6 °N), (c) aina HARMONIE (nykyinen).
2. **Mallien yksimielisyys ilmoitukseen:** lisäteksti "Mallit samaa mieltä" / "Mallit eri mieltä:
   tarkista sovelluksesta" (vertailu esim. M, H ja E samalle tunnille, raja esim. ±25 %-yks. pilvisyys).
3. **Vaihtoehto: enemmistösääntö** - hälytys vain, kun vähintään 2/3 mallista (M, H, E) ennustaa hyvää
   näkyvyyttä. Vähentää vääriä hälytyksiä, mutta voi myöhästyttää/estää aiheellisia (yksi malli usein
   oikeassa rikkonaisessa pilvessä, ks. MUISTIO-selvitykset.md MNWC-vertailu, Lyngen).
4. Tukena: ennustevertailuloki (`ennuste-loki`, raportti 17.11.) kertoo, mikä lähde osuu Lapissa yöllä
   parhaiten, myös selkeinä öinä.

**Esimerkkitapaus 27.10. Utsjoki:** hälytys `20261027T1305-utsjoki-tonight` (lähetetty 27.10. klo 13.05
UTC) HARMONIEn mukaan näkyvyys 81 % klo 0-2 (yö 27.-28.10.), samaan aikaan meteorologien ennuste
100 % pilvessä. Vertailukohtana edellinen yö 26.-27.10.: Kevo 7-8/8 (88-100 %) koko yön.
**Havaittu (kirjattu 28.10.):** pilvessä - **meteorologien ennuste osui, HARMONIE ei.**
- Utsjoki Kevo n_man (ennuste-loki, Suomen aikaa): klo 0 7/8 (88 %), klo 1 8/8, klo 2 8/8; myös
  klo 3-6 7-8/8. Ainoa rako illalla klo 21 (5/8, 63 %), klo 20 7/8.
- Ennusteet samoille tunneille (klo 0-2) 1 h etukäteen: meteorologit 87-92 %, HARMONIE 63-98 %,
  ECMWF 88-100 %. HARMONIEn uudemmat ajot korjasivat siis pilviseksi, mutta hälytyshetken (13.05 UTC)
  ajo oli antanut klo 0-2 selkeää (yön paras 81 %).
- Hälytysloki (HARMONIE, tämänhetkinen pilvisyys Utsjoella): klo 19-21 Suomen aikaa 15-20 % (selkeä
  rako, jota Kevo ei kokonaan nähnyt: 7/8 ja 5/8), klo 22.35 jälkeen 98-100 %, klo 0-2 80-94 %.
  ICON-EU 57-89 %, ECMWF 100 % koko yön. Näkyvyys enimmillään 14 % (klo 20-21, OVATION 20 %, Kp 0-1)
  -> revontuliakaan ei olisi ollut paljon näkyvissä.
- Palaute: PALAUTE.md:ssä ei vastausta tähän hälytykseen (vain 24.10. testirivit). Kameratietoa
  hälytyslokissa ei ole (loki ei tallenna kameran tilaa) -> kameraa ei voitu käyttää jälkikäteen.
- Johtopäätös 7.11. päätöksiin: yksi tapaus lisää siihen, että pelkkä HARMONIE yön hälytyksen
  pilvisyytenä antaa vääriä hälytyksiä; meteorologien ennuste tai mallien yhteinen ehto (esim. ei
  hälytystä, jos meteorologit >= 90 %) olisi estänyt tämän. Lopullinen arvio vertailuraportista (17.11.).

## Tehtävä 7.11. alkaen: ilmoitusten nimi (kirjattu 2026-10-27)
Sovelluksen nimi vaihtui 27.10. (fi Revontuliennuste, en Aurora Weather; ks. OHJE-kaupat.md), mutta
kenttätestin ntfy-ilmoitusten otsikko pysyy "AuroraAwesome · kenttätesti" testin loppuun 6.11., jotta
palaute- ja lokiketju ei katkea. Testin jälkeen: `alerts/notify.js` otsikko -> "Aurora Weather" (tai
tuotantoversion oma), `scripts/ntfy-test.mjs`:n testiviesti ja OHJE-ntfy.md:n esimerkit samoin.
Cloudflare Worker `auroraawesome-ajastin` voidaan nimetä samalla uudelleen (uusi osoite -> PALAUTE_URL).
