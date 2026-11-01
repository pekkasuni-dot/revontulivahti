# Aurora Weather / Revontuliennuste – arkkitehtuuri ja päätökset
> Elävä dokumentti. Päivitä aina, kun jokin päätös muuttuu.
> Viimeksi päivitetty: 2026-11-01 (napautusalueiden mittaus, vaihe 1)

## 1. Tarkoitus ja rajaus
- **Mitä sovellus tekee:** Karttasovellus, joka kertoo, missä ja milloin revontulia voi nähdä: revontuliennuste (NOAA OVATION, Kp, avaruussää) yhdistettynä pilvi-, sumu- ja tuuliennusteisiin, satelliittikuvaan ja kameroihin. Näkymät Nyt / Tänä yönä / 7 vrk, omat paikat, reittiohjeet ja hälytykset.
- **Kenelle:** Revontulien katselijat ja harrastajat Pohjois-Suomessa, -Ruotsissa ja -Norjassa; oppaat ja matkailuyrittäjät (Pro).
- **Mitä se EI tee:** oma navigaattori, osoitehaku, käyttäjätilit/palvelinpuolen paikkatallennus, live-päivitykset (OTA), julkinen verkkoversio (verkko vain kehitys- ja testikäyttöön), menneet satelliittikuvat/animaatio.
- **Nimet:** fi "Revontuliennuste", App Store "Aurora Weather – Suni", Google Play "Aurora Weather by Suni", kotivalikko "Aurora", tunniste `fi.suni.auroraweather` (pysyvä). Repo `pekkasuni-dot/revontulivahti`.

## 2. Teknologiat
| Osa | Valinta | Versio | Miksi |
|---|---|---|---|
| Sovelluskehys | Capacitor (iOS + Android) | 8.5.3 | Yksi verkkokoodipohja, natiiviominaisuudet (haptiikka, reittiohjeet, ilmoitukset) |
| Kartta | MapLibre GL (omasta `lib/`) | 3.6.2 | WebGL-pilvishaderi, tuulihiukkaset |
| Karttapohja | OpenFreeMap / OpenStreetMap + ilmakuva | – | Ilmainen, kaupallinen käyttö sallittu, ei avainta |
| Säämallit | HARMONIE, ICON-EU, ECMWF (avoin data), IL:n meteorologien ennuste (`pal_skandinavia`) | – | CC BY 4.0 / avoin, kaupallinen käyttö sallittu |
| Satelliitti | EUMETSAT EUMETView, MTG FCI IR 10,5 µm | – | CC BY 4.0 viiveestä riippumatta (EUMETSAT legal affairs 30.10.2026) |
| Datan haku | GitHub Actions (Python) + Cloudflare Worker -ajastin; satelliitti Worker + R2 | wrangler 3.90.0 | Luotettava ajastus; Pagesin julkaisuraja 10/h |
| Julkaisu | gh-pages (orphan) | – | Data ja verkkoversio |
| Hälytykset (kenttätesti) | ntfy | – | Väliaikainen; korvataan FCM:llä |
| Maksut (suunniteltu) | RevenueCat | – | Ei omaa palvelinta, palautukset ja kokeilu |
| Testit | npm test + Python, Playwright | 1.56.1 | Kuvakaappaukset 360×640 ja 430×932 |
| Python-kirjastot | requirements.txt (lukittu) | epävarma | Ks. `LUOVUTUS-2026-10-30.md` |

## 3. Rakenne
- **Kansiot ja vastuut:** tarkka lista `LUOVUTUS-2026-10-30.md` (repon juuressa). Keskeiset: `index.html` (sovellus), `aurora-core.js` (yhteinen laskenta sovellukselle ja hälytyksille), `features.js` (ainoa Pro/ilmainen-määrittely), `i18n.js`, `scripts/fetch-*.py`, `scripts/model_areas.py`, `workers/ajastin`, `alerts/`, muistiot `MUISTIO-*.md`, `OPIT.md`, `OHJE-*.md`, `CLAUDE.md`.
- **Tietovirta:** lähteet → ajastettu haku (Actions / Worker) → PNG-pakatut askeltiedostot (kokonaispilvisyys erikseen, kerrokset ja sumu omissa tiedostoissaan) gh-pagesiin; satelliitti R2:een → sovellus lataa ensin nykyhetken kokonaispilvisyyden, muut laiskasti vain kun valittu.
- **Tietomalli:** omat paikat versioituna (id, nimi, lat, lon, luontiaika), raja 50; Pro-rajaus `features.js` (`isPro()`, `canUse()`).
- **Periaatteet:** Nyt = aina nykyhetki; aikajana ohjaa vain karttaa; puuttuva data ≠ nolla ("Ei dataa" / "No data"); kellonajat puhelimen ajassa; mobiili edellä, pystyasento.

## 4. Päätökset
| # | Päätös | Perustelu | Hylätyt vaihtoehdot | Pvm |
|---|---|---|---|---|
| 1 | Julkaistaan vain iOS ja Android | Kauppaversio on tuote | Julkinen PWA/verkkoversio | 30.10. |
| 2 | Apple henkilötili; Android yritystili (PRH-kaupparekisteri → D-U-N-S → Play) | D-U-N-S hylättiin, koska toiminimi ei julkisesti YTJ:ssä | Android henkilötilinä (12 testaajaa/14 pv), perhejako | 26.–28.10. |
| 3 | Näkyvyys % ja hälytykset kokonaispilvisyydestä kaikilla malleilla | Johdonmukaisuus, ei kalibroimattomia painoja | Kerrospainotus 0,95/0,65/0,30 (myös ICON-EU:n peritty) | 24.10. |
| 4 | Pilvikerrokset ja sumu vain näytettäviä, laiska lataus | Käynnistys nopea (HARMONIE 2,85 s hidas 4G) | Kerrokset samassa tiedostossa, karkeampi hila | 24.10. |
| 5 | "Pilvet ja sumu" -ryhmä: Pilvet, Alapilvet, Keskipilvet, Yläpilvet, Sumu, Satelliitti; ikoni + teksti; L/M/H kaikilla kielillä | Windyn malli, selkeä | Pelkät ikonit, "Kaikki", suomalaiset kirjaimet, kielineutraali korkeusmerkki, sumu omana tasona | 25.10. |
| 6 | Sumu yksi luokka "Sumu" (näkyvyys < 5 km, portaaton valkoinen), lippu "Sumu"/"Ei sumua" | Ennuste epävarma (myös sade heikentää) | Sumu+utu, metrit lipussa, sana "näkyvyys", okra, oma kaava ECMWF:lle | 25.10. |
| 7 | Tasovalikko ☰:sta; ryhmän kytkin + pillerit; valitun pillerin napautus kytkee pois; yksi i-nappi otsikossa | Skaalautuu, johdonmukainen | Sarakkeet säänapin alla, Pois-rivit, tasokohtaiset i-napit, Windy-kuvaruudut | 24.–30.10. |
| 8 | Ikkunat HTML-alaikkunoina kaikilla puhelimilla, lasi tummansinisellä sävyllä, sama kiinteä kulmasäde ja sama X. Ikkunakohtainen logiikka (31.10.): **infoikkuna** avautuu täyteen kokoon, kahva tai veto alas → puolikas, puolikkaasta veto alas → kiinni, X → kiinni; **tasovalikko, Kaikki kamerat ja Omat paikat** aina täysi tai kiinni (veto alas, kahva tai X sulkee); **kamerakortti** sisällön korkuinen, ei kahvaa eikä vetoa, vain X; **päälle tulevat näkymät** (kaaviot, yön tuntinäkymä, Selitykset) saman ikkunan sisällä taaksepäin-napilla ja X:llä (X sulkee kaiken), kuten Asetukset tasovalikossa. Osittain auki: sivuraot 9 px, ei alarakoa, yläkulmat 35 px; täysi: reunasta reunaan turva-alueen alta, 28 px. Infoikkunan raahaus: leveys, raot ja säde yhden muuttujan funktio, napsahdus irrotessa; varakeino `SHEET.liveWidth = false` | Puhelinsovellusten vakiotapa, yksi toteutus | Oikean reunan paneeli, natiivi SwiftUI oletuksena (vertailukytkimenä), Liquid Glass -välilehtiefekti, laitekohtainen kulmasäde ja mallitaulukko, reunasta reunaan -arkki myös osittain auki -tilassa, raot alhaalla, tasovalikko puolikkaana, kamerakortin vieritys, kelluvat kaavioikkunat | 29.–31.10. |
| 9 | Pikapalkki kiinteä: Pilvet, Kamerat, Omat paikat, väli, Oma sijainti; asetus "Näytä pikapalkki" | Vain usein käytetyt | Muokattava pikapalkki (nastat, pitkä painallus), Revontulet ja Tuuli pikapalkissa | 25.–28.10. |
| 10 | Tuulen korkeusvalitsin pois kartalta, korkeus lipussa | Siisti kartta | Valitsin kartalla | 25.10. |
| 11 | Säämallin valinta: aikajanan pikavalinta + napautettava lähdeteksti; poistettu asetuksista; puuttuva data → valinta säilyy himmennettynä | Yksi asetus, kaksi paikkaa | Valinta asetuksissa, automaattinen vaihto kokonaispilvisyyteen | 24.–27.10. |
| 12 | IL:n meteorologien ennuste (merkki M) Tänä yönä -välilehdelle ja 7 vrk:n 1. yölle sekä valittavaksi malliksi | Tuoreempi (0,5–2,5 h) | MNWC (ei avoimessa datassa), MET Nordic (= malli, ei havainto) | 26.–27.10. |
| 13 | Satelliitti: MTG IR EUMETViewistä, Worker + R2, vain uusin kuva; satelliittitilassa ei aikajanaa eikä mallia | CC BY viiveestä riippumatta; havainto ei ennuste | MSG/MTG-pilvimaskit (eivät kata Lappia), 8 000 €/v lisenssi, napasatelliitit, menneet kuvat/animaatio | 25.–30.10. |
| 14 | Kauppaversion hälytykset natiiveina (FCM) oman sijainnin mukaan, sijaintiruudut aiheina, ei sijaintien tallennusta palvelimelle | Ei erillisiä sovelluksia, tietosuoja | ntfy kauppaversiossa, paikkakunta-aiheet | 24.10. |
| 15 | Omat paikat puhelimeen (Capacitorin tallennus), ei tiliä, max 50 | Ei palvelinta | Tili, Safari-vihjeet | 25.10. |
| 16 | Reittiohjeet ulkoiseen sovellukseen (Apple/Google/Waze) | Valmiit navigaattorit | Oma navigaattori, oma osoitehaku (toistaiseksi), Mapy.com | 28.10. |
| 17 | Tiekartta tulee näkyviin zoomattaessa (OSM) | Ilmainen, ei avainta | Erillinen tiekarttapohja | 28.10. |
| 18 | API-avaimet sallittu vain palvelinpuolella salaisuuksissa | Turvallinen | Ei avaimia lainkaan (vanha periaate) | 25.10. |
| 19 | Pro: jako `features.js`:ssä; 3 paikkaa ilmaiseksi; paikat säilyvät Pron päättyessä; jakolinkki Pro, tuonti ilmainen; ei perhejakoa; maksumuuri pois kunnes julkaisu | Ilmaisversio aidosti hyödyllinen | Pro-mallin kokeilu ilmaisversiossa, perhejako | 28.10. |
| 20 | Live-päivitykset ei nyt; Aurora Dev -kehitysversio hautumassa | Riski > hyöty ennen julkaisua | OTA tuotantoon | 30.10. |
| 21 | Revontuli-ikoni nykyinen; kuvakkeet lähdekuvasta skriptillä. Pilvet (31.10., käyttäjän mallikuva) = kaksi ääriviivapilveä: iso takana vasemmalla, pieni edessä oikealla, ison viiva katkeaa pienen kohdalta (VAIN Pilvet-valinta: Pilvet ja sumu -otsikossa yksi pilvi, `cloudLayerIcon('group')`); Sumu (31.10.) = viisi vaakatasoa, tasot 1, 3, 5 lyhyempiä keskellä, tasot 2 ja 4 leveämpiä ja katkeavat, mittasuhde mallin mukaan (korkeus/leveys ~0,78); omat piirrokset mallien muodoista, tiedostoja tai värejä ei kopioida; värit nykyisistä nappitokeneista (aktiivinen vihreä, passiivinen harmaa); L/M/H ennallaan (pilvi + kirjain; kirjain pystysuunnassa pilven sisäalueen keskellä 31.10.) | Lisenssit selvät | Omat luonnokset A–D5, Flaticon-ikoni, yksi ääriviivapilvi (30.10.), neljä porrastettua sumuviivaa, mallikuvien värit | 25.–31.10. |
| 22 | Logo yläpalkissa ilman nimeä ja ilman toimintoa | Siistimpi | Logo avaa lähteet/Tietoja | 30.10. |
| 23 | Kaavioiden selitteet nollatason alapuolelle (kuu ennallaan), halo; "Ei dataa"/"No data" | Luettavuus | Selitteet yläpuolelle, värinvaihto | 30.10. |
| 24 | YouTube-upotus oman verkkosivun kautta (iOS virhe 153) | Toimii sovelluksessa | Suora upotus | 28.10. |
| 25 | Haptiikka (vain sovelluksessa): tunnin vaihtuessa aikajanassa ja kaavioissa; 31.10. laajennettu: X-napit (kevyt isku sormen noustessa), kaikki kytkimet (valinta muuttui, yksi yhteinen käsittelijä), välilehtien vaihto ja ikkunan napsahdus (täysi / puolikas / kiinni). Ei pikapalkkia, pillereitä eikä Oma sijainti / Valittu piste -kytkintä. Asetus "haptiikka pois" koskee kaikkea | Natiivi tuntuma | Jatkuva värinä, haptiikka kaikissa napeissa | 28.–31.10. |
| 27 | Nappien ilme: yhteinen lasinappityyli (tokenit `--gbtn-*`, `--press-*`, `--spring`): hento heijastus yläosassa, ohut vaalea reuna, painallus pienentää ~10 % ja palautuu jousella ~0,4 s, vain `:active`, ei hoveria, ei sumennusta pienissä napeissa. Käytössä X-napeissa; pikapalkissa, ☰:ssa ja pikapalkin alivalikon napeissa (esim. Kaikki kamerat) vain hillitty heijastus (tausta lähes peittävä, aktiivinen vihreä rengas ennallaan); välilehdissä liukuva alleviivaus jousella; kytkimet iOS-tyylisiä (51 × 31, valkoinen 27 px nuppi venyy painettaessa) | iOS-tuntuma ilman suorituskykyriskiä; yksi muutospaikka | Aito Liquid Glass -taittuminen (päätös 8), sumennus pienissä napeissa, kapseli välilehdille, hover-tyylit, läpikuultavammat pikapalkin napit, Oma sijainti / Valittu piste -kytkimen ja pillerien uudistus | 31.10. |
| 26 | X-nappi ikkunan kiinteän otsikkorivin (56 px, kahva keskellä ylhäällä) sisällä oikealla: 44 px kosketusalue, 12 px ylä- ja oikeasta reunasta kaikissa ikkunoissa; tasovalikossa otsikko vasemmalla. Täydessä koossa rivi alkaa turva-alueen alta. Paikka ei riipu kulmasäteestä eikä koosta. ☰ on pelkkä avausnappi (ei muutu X:ksi). Ikkuna suljetaan X:stä, vetämällä alas tai (tasovalikko, Kaikki kamerat) kahvasta, ikkunakohtaisesti päätöksen 8 mukaan; kartan napautus ei sulje, ei himmennystä ikkunan takana; ikkunan sisällä alkanut kosketus ei liikuta karttaa | X ei saa liikkua eikä peittää sisältöä | X ikkunan kulmassa tai reunan yli, ☰ → X, kartan napautus sulkee | 30.10. |

## 5. Nykytila
- **Valmiit ja toimivat (main v1.302):** kartta, pilvet 4 mallilla + kerrokset + sumu, satelliittitaso (Worker + R2, todennettu 30.10.), tuulianimaatio, revontulet + avaruussää + kaaviot, Tänä yönä / 7 vrk, kamerat, omat paikat, reittiohjeet, kelluvat lasi-alaikkunat, uudet kuvakkeet, Pro-rajaus + testikytkin, TestFlight- ja AAB-käännökset, versioautomaatio, testit, WebGL-palautus, ennustevertailuloki käynnissä.
- **Keskeneräiset:**
  - Puhelintarkistus puuttuu v1.302:sta: satelliittikuva Workerilta.
  - Aurora Dev -kehitysversio (App Store Connect -tietue puuttuu).
  - Nappien ilme, välilehtien alleviivaus, kytkimet ja laajennettu haptiikka (päätökset 25 ja 27): toteutettu, puhelintarkistus puuttuu; alivalikon napit samaan ilmeeseen 31.10.
  - Napautusalueet 44 px (tuleva päätös 28): mittaus tehty 1.11. (`screenshots.mjs --states=napautus`, `tapAudit`, näkymä `?debug=44` tai Asetukset > Testaus), korjaukset odottavat päätöstä. Alle 44 px (360 ja 430 px): kahvat (info, tasovalikko, kaaviot, Kaikki kamerat) 96×26, Oma sijainti / Valittu piste 151–196×30, mallipilleri (Tänä yönä, 7 vrk) 92×42, lipun reittiohjeet 28×44 ja tähti 22×44, km/mi 36–39×44, kaavion 2 h / 6 h 39×44, Oma sijainti -nappi puolikkaan infoikkunan reunalla 44×30, tekstilinkit (Tietoja ja lähteet, Katso YouTubessa, OSM-maininta) 16 px korkeat.
  - Hälytysten kenttätesti 6.11. asti; ennustevertailuloki 15.12. asti.
  - Pro-maksut toteuttamatta; natiivi-ilmoitukset (FCM) toteuttamatta.
  - Androidin yritystili: PRH-ilmoitus ja D-U-N-S kesken.
- **Tunnetut bugit ja rajoitukset:**
  - Claude-ympäristöstä ei pääse ulkoisiin rajapintoihin eikä workers.dev-osoitteeseen; todennus Actions-lokeista tai puhelimella.
  - Satelliittikuva normaalisti 25–45 min vanha. Kuvan purku canvasin kautta; iPhone-kohinaa ei testattu.
  - Talviyönä kylmä lumipinta voi näkyä satelliittikuvassa pilvenä (kerrottu infotekstissä).
  - Still-kamerat vaativat luvat ennen kauppaa; debug-näkymät poistettava ennen julkaisua.
  - Kenttätestin ilmoitusotsikko ja Cloudflare-ajastimen nimi yhä "AuroraAwesome" (vaihto 7.11. jälkeen).

## 6. Avoimet kysymykset
- [x] **Ikkunoiden kulmat:** TEHTY 30.10. Kiinteä säde (päätös 8): 35 px osittain auki, 28 px täysi, mitattu natiivista iOS-arkista.
- [x] **Natiivi SwiftUI-tasovalikko:** ON OLEMASSA (tarkistettu koodista 30.10., v1.302). HTML-alaikkuna on oletus kaikilla puhelimilla (`lmSheetOn()` palauttaa aina true). Natiivi on vertailukytkimenä Asetukset > Testaus "Natiivi tasovalikko (kokeilu)" (`#lmSheetSwitch`, `rv-lm-native`, oletus pois). Kytkin näkyy vain testinäkymässä (`PRO_TEST_UI`: `?debug` tai testikäännös) iPhone-sovelluksessa (`NATIVE_LM`). Natiivi koodi on tallessa: `ios/App/App/LayerSheetPlugin.swift`.
- [x] **Lasin tummansininen sävy:** TOTEUTETTU (v1.302). `--glass-tint` #0B1630; `--glass-bg` on 84 % sävystä, `--glass-blur` blur(14px) saturate(.9), varalla `--glass-bg-solid` 96 %. Kontrasti on laskettu, ei mitattu puhelimella: teksti ≥ 9,8:1, toissijainen teksti 5,3:1 myös valkoisen pilven päällä (`--dim` 72 %). Avoinna: nykiikö sumennus karttaa oikealla puhelimella.
- [x] **Pikapalkin kevennys (Revontulet ja Tuuli pois):** TEHTY 28.10. `BTN_STACK` = Pilvet, Kamerat, Omat paikat, Oma sijainti; revontulet ja tuuli vain tasovalikossa. HUOM päätökseen 9: ylimääräinen väli Oma sijainti -napin edellä poistettiin 28.10. (käyttäjän päätös), joten napit ovat nyt tasavälein.
- [x] **Alareunan suojakaista:** TEHTY 28.10. `#edgeGuard` kartan päällä alareunassa (korkeus max(20 px, turva-alue + 16 px), `touch-action:none`), joten sovellusten vaihtoele ei liikuta karttaa. Näkyviin `?debug`/`?kaista` -osoitteella. Sivureunoilla ei ole kaistaa. Puhelimella tarkistamatta.
- [ ] **Satelliitti verkkoversiossa suoraan EUMETViewistä:** sallittu, koska verkkoa ei julkaista – vahvistetaan.
- [x] **Kamerakortit kelluviksi:** hyväksytty 30.10., samat säännöt kuin muilla ikkunoilla (päätökset 8 ja 26).
- [x] **Infoikkuna ja kartan napautus:** jo toteutettu – napautus vaihtaa infoikkunan Valittu piste -tilaan (regressiotesti `screenshots.mjs --states=ikkuna-karttanapautus`).
- [x] **Raahausanimaatio sumennetun lasin kanssa:** testattu puhelimella 31.10. (TestFlight v1.304), toimii hyvin; varakeinoa `SHEET.liveWidth = false` ei tarvittu.
- [ ] **Nappien animaatioiden sujuvuus oikealla puhelimella:** painallusjousi, välilehtien alleviivaus ja kytkimet; tarkistamatta.
- [x] **Kytkimien haptiikan puute: syy selvitettävä:** SELVITETTY 31.10. Haptiikka oli lisätty yksittäin vain Pilvet- ja Tuuli-toimintoihin (myös pillereihin); Revontulet, Kamerat ja Asetusten kytkimet eivät kutsuneet sitä. Korjattu yhdellä yhteisellä `[role=switch]`-käsittelijällä; puhelimella tarkistamatta.
- [ ] **Aikajanan napautusalue (selviää mittauksesta):** Chromiumissa koko 44 px korkea kaista on raahattava (mitattu 328×44 / 398×44); iPhonen WebKitissä mukautettu liukusäädin tarttuu todennäköisesti vain palloon (18 px) – ei voitu mitata (ei WebKitiä ympäristössä), tarkistettava puhelimella.
- [ ] **Suni-ilme:** katsauksessa mainittu vaihtoehto, ei päätöstä.
- [ ] **i-nappien huomioväri:** violetti vs. PRO-merkin väri – onko eroteltu?
- [ ] **Hälytysten pilvisyyslähde, mallien yksimielisyys, 2/3-sääntö:** päätös 7.11.
- [ ] **Meteorologien ennuste koko 7 vrk:lle / kartan oletusmalliksi:** päätös vertailuraportin (17.11.) jälkeen.
- [ ] **ntfy-kanavan vaihto** (vanha nimi näkyi kuvakaappauksessa): tehty?

## 7. Seuraavat askeleet
1. Testaa TestFlight puhelimella (satelliitti, ikkunauudistus testattu 31.10.) ja ratkaise avoimet kysymykset.
2. PRH-kaupparekisteri-ilmoitus → D-U-N-S → Play Console -yritystili.
3. 7.11.: kenttätestin loppuraportti ja hälytyspäätökset; ilmoitusotsikon ja ajastimen nimen vaihto; hälytysten varajastus 1 h:iin.
4. Natiivi-ilmoitukset oman sijainnin mukaan (FCM-sijaintiruudut) – kauppajulkaisun suurin puuttuva osa.
5. 17.11.: ennustevertailun raportti → M-mallin laajempi käyttö.
6. Ennen julkaisua: tietosuojaseloste julkiseksi, lopullinen kuvake, kauppasivut, opastus, hinnat (ehdotus 2,99 €/kk, 14,99–19,99 €/v, 7 pv kokeilu), RevenueCat, Applen Small Business Program, still-kameroiden luvat, debug pois.

## 8. Säännöt Claudelle
- **Koodityyli ja nimeämiskäytännöt:** suomenkieliset muistiot ja haarat (`claude/<aihe>`); tekstit fi/en `i18n.js`:ään; Pro-rajaus vain `features.js`:ssä; laskenta `aurora-core.js`:ssä testeineen; kuvakaappaukset 360×640 ja 430×932; esikatselu/TestFlight ennen yhdistämistä.
- **Asiat, joihin ei saa koskea kysymättä:** hälytyslogiikka ja `ALERT_CFG` kenttätestin aikana (6.11. asti); salaisuudet (avaimia, ntfy-kanavan nimeä tai palauteavainta ei koskaan keskusteluun eikä repoon); sovelluksen tunniste; tallennusavaimet ja tietomuodot; ajastimet ja varajastukset; maksumuuri päälle.
- Päivitä tämä dokumentti, kun päätös tai rakenne muuttuu. Sääntö on myös `CLAUDE.md`:n alussa, jonka Claude lukee automaattisesti jokaisen keskustelun alussa.
