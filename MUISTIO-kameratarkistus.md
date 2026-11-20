# Kameratarkistus ennen kauppajulkaisua (2026-11-20)

Haara `claude/kameratarkistus`. EI koodimuutoksia, EI uusia kameroita. Svalbard KHO: ks. MUISTIO-webkamerat.md osa 18.

## Miten tutkittiin

Claude-ympäristöstä kameroiden sivut eivät aukea, joten tarkistus ajettiin väliaikaisella työnkululla GitHubin
palvelimella (`kameratarkistus.yml` + `scripts/kameratarkistus-probe.py`, poistettu ennen pushia). Tulokset (raportti +
pienennetyt kuvat) tallennettiin väliaikaisiin orpohaaroihin `kameratarkistus-*` (poistettava, ks. lopussa).

| ajo | aika (UTC) 20.11.2026 | sisältö |
|---|---|---|
| 1 | 19.08-20.12 | kaikki 23 kameraa 7 kertaa 10 min välein (SHA-256), oEmbed, upotussivu, kanavan /streams, 20 YouTube-hakua (live-suodatin), liveauroracams + SpaceWeatherLive |
| 2 | 19.20 | 58 ehdokassivua + käyttöehtosivut (teksti, kuvat, iframet, YouTube-ID:t) |
| 3 | 19.25-20.20 | 32 still-ehdokasta 6 kertaa 10 min välein + 11 YouTube-ehdokasta |
| 4 | 20.35 | liveauroracams.comin Pohjoismaiden kamerasivut + koko luettelo |

Kaikilla alueen kameroilla oli pimeää. "Eri kuvia 7/7" = jokainen haku antoi eri tiivisteen. Pelkkä aikaleima (Last-Modified)
EI kelpaa: KHO, FMI Kilpisjärvi ja Muonio päivittävät aikaleimaa, vaikka kuva on sama.

Rajoitukset (rehellisesti):
- **YouTube Data API:a (`status.embeddable`) EI käytetty:** avainta ei ole (päätös 2026-10-25 sallii palvelinpuolen avaimen,
  mutta sitä ei ole luotu). Tilalla oEmbed: **200 = upotus sallittu, 401 = upotus estetty, 403 = yksityinen, 404 = poistettu**
  (vakiintunut käytös, ei virallisesti dokumentoitu). Innertube-pelaajarajapinta vastasi GitHubista kaikille "This video is
  unavailable" (bottiesto) -> ei käyttökelpoinen.
- **Videokameroiden (kansikuva) varsinaista kuvaa ei voitu nähdä:** katselusivu antaa GitHubista 429. Toiminta varmistettiin
  kanavan /streams-sivun LIVE-merkistä. Kuvan sisältö (suunta, huurre) on näille arvioitu otsikosta/kansikuvasta.
- Käyttöehdot luettiin sivuilta, joilla ne olivat. Puuttuva maininta ≠ lupa.

## OSA 1: nykyiset kamerat (data/cameras.json, 23 kpl)

Upotus = oEmbed nykyiselle lähetykselle. "Live-ID" = kanavan /streams-sivun LIVE-lähetys.

### YouTube (14)

| kamera | toimii nyt | sisältö päivittyy (7 hakua) | mitä kuvaa | upotus | live-ID | nimi/sijainti | suositus |
|---|---|---|---|---|---|---|---|
| Levi | kyllä, LIVE | kyllä 7/7 | pohjoinen, rinne + taivas (Starlapland) | sallittu | sama (rKfecmmzzw0) | ok | **pidä** |
| Kilpisjärvi | kyllä, LIVE | pikkukuva kansikuva (30.9.2025), videokamera | pohjoinen, Saana-maisema | sallittu | sama | ok | **pidä** |
| Rovaniemi, Apukka | kyllä, LIVE | kansikuva | lasi-iglukylä; lähetyksen otsikko "by Aurora Alert Realtime" | sallittu | sama | ok | **pidä** (kuva tarkistettava puhelimella) |
| Posio | kyllä, LIVE | kansikuva | "LIVE 24/7 Northern Lights & Sky Cam", kanava **Hotel Lapin Satu** | sallittu | sama | hotellin sijainti Posiossa varmistamatta | **pidä**, tarkista sijainti |
| Lyngen North | kyllä, LIVE | kansikuva | Spåkenes, Lyngenfjord (pohjoiseen) | sallittu | **UUSI: O4B67z7Vovc** (cameras.json SwXtDFC9Bro) | ok | **korjaa ID** |
| Aurora Reykjavík | kyllä, LIVE | kansikuva | Reykjavík (keskus, kaupunkivalot) | sallittu | sama | ok | **pidä** |
| Sodankylä | kyllä, LIVE | kyllä 7/7 | pohjoinen, järvi + taivas | sallittu | sama | ok | **pidä** |
| Luosto | kyllä, LIVE | kyllä 7/7 | taivas; 20.11. kuva sumea/vaaleanpunainen (huurre tai sumu linssissä) | sallittu | sama | ok | **pidä**, seuraa |
| Kalajoki | kyllä, LIVE | kyllä 7/7 | Adventure Park Pakka, taajaman valot; 64,3° N | sallittu | sama | ok | **pidä** (heikko revontulipaikka) |
| Oulu, Nallikari | kyllä, LIVE | kyllä 7/7 | meri pohjoiseen (Samimaka / oulunzipline.fi) | sallittu | **UUSI: JMQ7QM9mg5U** (cameras.json q1Kj2rZyyT8) | ok | **korjaa ID** |
| Utsjoki | kyllä, LIVE | kansikuva | Aurora Holidays, Utsjoki | sallittu | **UUSI: Y2e1F-e9JyA** (cameras.json jHfZ4ZYsaOA) | ok | **korjaa ID** |
| Nuuk (GL) | kyllä, LIVE | kyllä 7/7 | **lentokentän kiitotie** (sääkamera), vähän taivasta | sallittu | sama | ok | **vain Dev** (ei alueella, ei taivaskamera) |
| Upernavik (GL) | kyllä, LIVE | kyllä 7/7 | lentokentän kiitotie | sallittu | sama | ok | **vain Dev** |
| Ilulissat (GL) | LIVE-merkki | **ei 1/7, musta kuva** | lentokenttä | sallittu | sama | ok | **poista** |

Vanhat ID:t (SwXtDFC9Bro, q1Kj2rZyyT8, jHfZ4ZYsaOA) antavat yhä oEmbed 200 ilman otsikkoa, eli lähetys on päättynyt. Sovellus
toimii silti, koska `check-camera-thumbnails.py` ratkaisee uuden ID:n tunnin välein (camera-status.json `videoId`). Korjaus
cameras.json:iin poistaa riippuvuuden ratkaisijasta (esim. jos /streams-sivu muuttuu).

### Still-kuvat (9)

| kamera | toimii nyt | päivittyy (7 hakua) | mitä kuvaa | käyttöehdot | nimi/sijainti | suositus |
|---|---|---|---|---|---|---|
| Hankasalmi (Sirius) | kyllä | kyllä 7/7 (1 min) | koko taivas (all-sky), 20.11. huurteinen kupu | ei lisenssiä, "© Jyväskylän Sirius ry"; kuva näkyy myös FMI:n Auroras Now -palvelussa (`latest_SIR_AllSky.jpg`) | ok | **lupa** (yhdistys) |
| Longyearbyen KHO | jäätynyt (SuperDARN-turvakamera) | ei 1/7 | tutkan antennikenttä | CC BY-NC 4.0, sopimus vaaditaan | ks. osa 18 | **korvaa** `kho_sony.jpg` + sopimus |
| Porjus NR1 | kyllä | kyllä 7/7 | pohjoinen, metsä + taivas; vain 320x180 | ei mainintaa (Arctic Colors / jokkmokk.jp) | ok | **lupa**; samalla isommat `nr3`/`nr4` (720x480, ks. osa 2) |
| Aikhal (RU) | **ei, Starvisorin "WAITING FOR DATA"** | ei | – | "© STARVISOR" | Venäjä | **poista** |
| Fort Smith TREx (CA) | päiväkuva (kuvaa vasta auringonlaskun jälkeen) | ei (päivä) | all-sky | UCalgary, ehdot (acknowledgements.pdf) jäi lukematta | ok | **vain Dev** tai lupa |
| Gillam TREx (CA) | sama | ei (päivä) | all-sky | sama | ok | **vain Dev** tai lupa |
| Yellowknife AuroraMAX (CA) | **kamera pois: "The camera is currently off", laskuri** | 7/7 (**laskuri muuttuu -> tuoreustarkistus luulee toimivaksi**) | all-sky | CSA: vain "personal, educational or informational non-commercial use"; kaupallinen -> info@asc-csa.gc.ca; lisäksi UCalgary + Astronomy North | ok | **poista kauppaversiosta** (tai lupa) |
| Isle Royale (US) | kyllä | kyllä 7/7 | metsämaisema pohjoisrannalle, 48° N | NPS = public domain | ok | **vain Dev** (heikko revontulipaikka) |
| Abisko (Twitch-esikatselu) | kyllä | kyllä 7/7 | Aurora Sky Station, taivas | Lights Over Lapland, ei lisenssiä; Twitchin esikatselukuva | ok | **lupa** (Chad Blakley / Lights Over Lapland) |

### Lisähavainnot (bugeja, ei korjattu tässä tehtävässä)

1. **"Ei muutu (kiinteä kuva?)" näkyy VÄÄRIN kaikissa YouTube-kameroissa.** Tuotannon camera-status.json (19.00 UTC):
   `isCustomThumbnail: true` kaikilla 14:llä, `liveEqualsNonLive: true` kaikilla. YouTube palauttaa nykyään saman kuvan
   `hqdefault.jpg`:lle ja `hqdefault_live.jpg`:lle myös oikeasti eläville lähetyksille (Levi, Sodankylä, Luosto, Kalajoki,
   Nallikari, Nuuk, Upernavik: kuva muuttui 7/7). Signaali "live == ei-live pysyvästi" (`equal_persisted`) on siis
   rikki -> kortti näyttää `cam.static`-tekstin (index.html `cameraStatusText`). Korjausehdotus: poista `equal_persisted`, käytä vain
   pitkittäistä signaalia, ja älä näytä tekstiä videokameroille (`liveImage: false`), joiden pikkukuva on aina kansikuva.
2. **AuroraMAX:n "camera is currently off" -kuva läpäisee tuoreustarkistuksen**, koska kuvaan piirretty laskuri muuttuu joka
   kerta. Korjausehdotus: kamera harmaaksi, kun aurinko on Yellowknifessa yli horisontin (sama aurinkolaskenta kuin
   `cameraAreaDark`) tai kun kuva on placeholder-kokoinen.
3. **Aikhal** on Starvisorin offline-kuvassa (tunnistus toimii: `placeholder: true`), mutta kamera on alueen ulkopuolella.

### Lukeeko 15 min kameratarkistus upotuksen eston?

**Ei.** `check-camera-thumbnails.py` hakee vain pikkukuvat; `youtube_live.oembed()` kutsutaan tunnin välein kanavan
/streams-ratkaisussa, mutta se palauttaa vain otsikon ja **hylkää HTTP-tilan**.

Lisäys ilman kiintiötä (oEmbed on julkinen, ei avainta, ei Data API -kiintiötä):
- `youtube_live.oembed()` palauttamaan myös `status` (sama `get()` antaa sen jo).
- `check-camera-thumbnails.py`: ratkaisuvaiheessa (tunnin välein, `RESOLVE_INTERVAL_MS`) yksi `oembed(vid)` per kamera ->
  camera-status.json `embeddable`: `true` (200) / `false` (401) / `null` (muu), `embedCheckedAt`. Lisäkuorma 14 kevyttä
  pyyntöä tunnissa.
- Sovellus: `embeddable === false` -> kortissa ei soitinta, vain "Katso YouTubessa" -linkki.
- Vaihtoehto: Data API `videos.list?part=status&id=<50 ID:tä>` = 1 yksikkö/kutsu (kiintiö 10 000/vrk) -> 96 yks./vrk 15 min
  välein; vaatii palvelinpuolen avaimen salaisuuksiin (sallittu 25.10. päätöksellä). oEmbed riittää.

## OSA 2: kartoitus uusista kameroista

Lähteet: liveauroracams.com (sivukartta 66 kameraa, luettelosivu, Pohjoismaiden sivut), SpaceWeatherLiven webcam-sivu (58
kameraa, kuvaosoitteet luettu sivun HTML:stä), 20 YouTube-hakua (fi, sv, no, en, is; live-suodatin), matkailu- ja
tutkimussivut (58 sivua), kilpailijat. Islanninkielinen "norðurljós beint" ja "revontulet live" antoivat 0 live-tulosta.

Sarakkeet: **Päivittyy** = mitattu tänä yönä (still: eri kuvia / hakuja; YouTube: pikkukuva muuttui tunnissa tai kansikuva).
**Ilman lupaa?** = kyllä vain, jos lisenssi sallii kaupallisen käytön tai kyse on YouTube-upotuksesta (YouTuben ehdot sallivat
upotuksen, kun omistaja ei ole estänyt sitä).

### Still-kuvat (alue FI/SE/NO/IS/Svalbard)

| nimi | ylläpitäjä | koord. (noin) | päivittyy | kuvaa | kuvaosoite | käyttöehdot | ilman lupaa? |
|---|---|---|---|---|---|---|---|
| **Kiruna all-sky** | IRF (KAGO) | 67,84 N 20,41 E | 6/6, Last-Modified 1 min välein | koko taivas, 20.11. pilvi + kuu | `https://www.irf.se/alis/allsky/krn/latest_medium.jpeg` (924², 540 kt) | **CC BY 4.0** (irf.se KAGO data license); maininta "Data from Kiruna allsky camera provided by Kiruna Atmospheric and Geophysical Observatory at Swedish Institute of Space Physics" | **KYLLÄ** (varmista sähköpostilla, kattaako lisenssi reaaliaikakuvan) |
| Skibotn TGO ASC01 | UiT Tromsø Geophysical Observatory | 69,35 N 20,36 E | 6/6, 1 min (aurinko < −2°) | koko taivas | `https://fox.phys.uit.no/ASC/Latest_ASC01.png` (338 kt) | ei mainintaa sivulla; vastaava Magnar Gullikstad Johnsen | ei, lupa |
| Skibotn BACC #5 (väri) | UiT + UNIS | 69,35 N 20,36 E | 6/6, 1 min (aurinko < −10°) | koko taivas | `https://fox.phys.uit.no/ASC/BACC5.jpg` (200 kt) | ei mainintaa; UNIS-yhteistyö (KHO CC BY-NC) | ei, lupa |
| Sodankylä SKY-i | SGO (Oulun yliopisto) | 67,42 N 26,39 E | 6/6, 1 min | koko taivas | `https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest.jpg` | SGO Data Licence: "commercial purpose requires prior written permission ... generally not free of charge" | ei |
| Oulu SKY-i | SGO | 65,08 N 25,9 E | 6/6 | koko taivas | `.../skyi_test/skyi_OUL_latest.jpg` | sama | ei |
| Aakenus SKY-i | SGO | 67,73 N 24,42 E | **ei (8.10.2026 kuva)** | – | `.../skyi_AAK_latest.jpg` | sama | ei, ei toimi |
| Sodankylä UCL | University College London | 67,42 N 26,39 E | 6/6 | koko taivas | `https://www.sgo.fi/Data/RealTime/Kuvat/UCL.jpg` | kuvaan kirjoitettu "Commercial use and public presentation prohibited without permission" | ei |
| Metsähovi (Kirkkonummi) | Aalto-yliopisto / FMI Auroras Now | 60,22 N 24,39 E | 5/6 | koko taivas | `https://aurorasnow.fmi.fi/public_service/images/latest_HOV.jpg` | FMI ASC Rules of the Road: vain opetus ja ei-kaupallinen tutkimus | ei |
| Nyrölä | Jyväskylän Sirius / FMI | 62,34 N 25,51 E | 6/6 | koko taivas (huurre) | `.../latest_SIR.jpg` | sama + yhdistys | ei |
| Kilpisjärvi FMI | FMI | 69,02 N 20,86 E | **ei (19.4.2026)** | – | `.../latest_KIL.jpg` | FMI: ei-kaupallinen | ei, ei toimi |
| Kevo FMI / Muonio BACC | FMI | – | **ei (Kevo tyhjä vastaus, Muonio 20.4.2026)** | – | `.../latest_KEV.jpg`, `.../Allsky_MUONIO.jpg` | FMI: ei-kaupallinen | ei, ei toimi |
| FMI Helsinki (Dynamicum) | FMI | 60,2 N | ei (sama kuva 1 h) | pohjoinen kaupunki | `.../latest_pieni_DYN.jpg` | FMI | ei |
| Kevo, pihakamera | Turun yliopisto, Kevon tutkimusasema | 69,76 N 27,01 E | 6/6, 1 min | pohjoiseen Kevojärvelle, kohinainen | `https://apps.utu.fi/kevo/geavvu.jpg` (940 kt) | ei mainintaa | ei, lupa |
| Tampereen Ursa, pohjoinen | Tampereen Ursa ry | 61,5 N | 6/6, 1 min | pohjoinen horisontti (myös E/S/W) | `https://www.ursa.fi/yhd/tampereenursa/ys-images/north-snapshot.jpg` (4K, 490 kt) | ei mainintaa | ei, lupa |
| Hankasalmi, pohjoinen | Jyväskylän Sirius | 62,25 N 26,6 E | 6/6 | pohjoinen (vesipisaroita linssissä) | `https://www.ursa.fi/yhd/sirius/allsky/ImageLastFTP_AllSKY_north.jpg` | © Sirius | ei, lupa |
| Syrjävaara Dark Sky Park | syrjavaara.fi | 62,9 N 28,3 E (Kaavi, arvio) | 6/6 | koko taivas (huurre) | `https://www.syrjavaara.fi/img/syrjavaara_latest_img.jpg` | ei mainintaa | ei, lupa |
| Porjus NR3 / NR4 | Arctic Colors / jokkmokk.jp | 66,96 N 19,81 E | 6/6 | pohjoinen ja länsi (SWL:n mukaan) | `https://uk.jokkmokk.jp/photo/nr3/latest.jpg`, `.../nr4/latest.jpg` (720x480) | ei mainintaa | ei, lupa |
| Setermoen (Bardu) | yr.no (omistaja ei tiedossa) | 68,86 N 18,35 E | 5/6, 1 h välein? (LM tasatunnein) | vuori + taivas; **20.11. revontulia kuvassa** | `https://www.yr.no/webcams/1/2000/setermoen/3.jpg` | yr.no välittää omistajien kameroita | ei, lupa |
| Ortneset | yr.no | NO (sijainti varmistamatta) | 5/6 | vuono, pilvinen | `https://www.yr.no/webcams/1/2000/ortneset/1.jpg` | sama | ei |
| Abisko, 2. kamera | Lights Over Lapland | 68,36 N 18,72 E | 6/6 | taivas | Twitch `lightsoverlaplandlive` (esikatselu `.../live_user_lightsoverlaplandlive-640x360.jpg`) | ei lisenssiä | ei, lupa |
| Dreamcatcher Retreat | visitdreamcatcherretreat.com | Tromssan seutu? (varmistamatta) | 6/6 | maisema, katuvalot | `https://webcam.visitdreamcatcherretreat.com/webcamera.jpg` (4K, 960 kt) | ei mainintaa | ei |
| Hornsund all-sky | IGF PAN (Puolan napa-asema) | 77,0 N 15,55 E | (osoite vaihtuu: `wp-content/uploads/2026/11/allsky-<aika>.jpg`, poimittava sivulta) | koko taivas | `hornsund.igf.edu.pl/index.php/en/cameras-2/` | ei mainintaa | ei, lupa |
| Landhotel, Hella (IS) | Landhótel | 63,98 N 20,26 W | ipcamlive-soitin (2 kameraa) | – | iframe `g0.ipcamlive.com/player/player.php?alias=...` | "© Landhotel. All Rights Reserved" | ei |
| Gällivare, Dundret | Dundret | 67,08 N 20,7 E | liveauroracams: "Online" | – | ei saatu (liveauroracams-rajapinta) | – | ei, selvitä |
| Espoo | Karhunvartijat ry | 60,2 N (sivulla 61,43 N?) | liveauroracams: "Online" | – | ei saatu | – | ei, selvitä |

Ei toimivaa tai ei kelpaa: KHO BACC ja Ny-Ålesund (UNIS 30.9.: "not yet active"), UiO `tid.uio.no lyr_latest.png` (404),
IRF:n vanha `rtasc.php` (2020), ALOMAR BACC (sivu on, kuvaosoitetta ei löytynyt), Hotel Rangá (ei kameraa), Highland Center
Hrauneyjar (404), Ylläksen Yöpuu "Northern Lights Camera" (maksullinen, 2,99 €/vrk), SkylineWebcams (kaupallinen
välittäjä), Svinøya Rorbuer ja LAVA Centre (soitin JavaScriptillä, osoitetta ei saatu; ehdot "All rights reserved").

### YouTube (alue), oEmbed 200 = upotus sallittu

Pikkukuva: "elävä" = muuttui tunnissa, "kansi" = kansikuva (videon sisältöä ei voitu nähdä).

| nimi | kanava | sijainti | pikkukuva | ID | huom. | ilman lupaa? |
|---|---|---|---|---|---|---|
| Levin Iglut (Golden Crown) | Northern Lights Alert | Levi 67,8 N | kansi | `3UMZ2AFhYnc` | "Live aurora webcam" | kyllä (upotus) |
| Aurora Alert Realtime | Aurora Alert Realtime | Rovaniemi? (Skyline-sivun upotus) | kansi | `AvKdtZIb-6c` | sama tekijä kuin Apukka-lähetys | kyllä |
| Utsjoki (2. kanava) | "Aurora Borealis (LIVE!)" | Utsjoki | kansi | `Iw5VhekzbxE` | eri kanava kuin Aurora Holidays | kyllä |
| Rattosjärvi | Kaira Racing | Pello, 66,8 N 23,9 E (arvio) | kansi | `8BRH85e_byQ` | "Lapland Wilderness & Weather" | kyllä |
| Oulu Nallikari länsi | Samimaka | 65,03 N 25,4 E | elävä | `DdBaoU4xr4Y` | toinen Nallikari-kamera | kyllä |
| Överkalix | Alex Correia | 66,3 N 22,8 E | kansi | `E6U2YtS_dJY` | "Aurora Live • Överkalix" | kyllä |
| Tromsø | Arctic Campers | 69,65 N 18,96 E | kansi | `jnOzc1or-oE` | "24/7 aurora borealis webcam" | kyllä |
| Skarsvåg (Nordkapp) | Skarsvåg bygdelag | 71,11 N 25,8 E | elävä | `iMqrD-HBDGo` | kylä + satama, ei suoraan pohjoiseen | kyllä |
| Nordkapp Havfiske | NorthCape Seafishing | Nordkapp | elävä | `iXLaEkB3J0I` | satama, valot | kyllä, heikko |
| Aðaldalshraun (IS) | Geimfarinn | 65,8 N 17,4 W | kansi | `Pp91BS43KZ8` | "4K Aurora Real-Time Sky Camera", observatorio | kyllä |
| Golden Circle (IS) | Aurora Reykjavík | Þingvellir 64,26 N 21,1 W | kansi (Kp/Bz-palkki) | `4V29BHYRYtY` | sama ylläpitäjä kuin nykyinen | kyllä |
| Hólar (IS) | TokAir Iceland | 65,73 N 19,1 W | kansi | `CZpXxi9Vlxo` | "Northern Lights/Midnight Sun" | kyllä |
| Norway Live (Narvikfjellet, Lofoten, Tromsø Alpinpark, Fyr til Fyr, Utsikt) | Norway Live Kanal 2/3 | Pohjois-Norja | kansi | `XnIafbSvsA0`, `UJmcvisHsfQ`, `1ftSSTI9JFA`, `wwLLFholWn4`, `SY-Z3O9oYkU` | maisemakameroita, ei revontulikameroita | kyllä, heikko |
| Vervet Tromsø | Vervet | Tromsø | elävä | `3y7_fkAzzps` | "Utsikt Sør" = etelään, kaupunki | ei sovi |
| Arjeplog | ▶▶ Planet Fast Forward | 66,05 N | kansi | `5A7JI6saAp4` | musiikkikanava, todennäköisesti uudelleenlähetys | ei sovi |
| Inari | – | Inari | – | `ePFfaAgZS-Y` | **oEmbed 401 = upotus estetty** (todettu jo 21.10.) | ei |
| Zero Point Levi, Elves Village, Santa Claus Village, Saariselkä hiihtolatu | – | – | elävä | `LwihxyJ4V20`, `EmoTKMm5sDI`, `Cp4RRAEgpeU`, `dmGI0CZqD_c` | rinne/kylä, ei taivas | ei sovi |

### Kanada ja Alaska (erikseen)

| nimi | ylläpitäjä | tyyppi | linkki / ID | ehdot |
|---|---|---|---|---|
| Churchill Northern Lights | explore.org + Polar Bears International | YouTube | `a0i1Kg6fROg`, Cape East `Bq0jBJ4GPQQ` | upotus sallittu |
| Fairbanks Aurora Camera | explore.org | YouTube | `O52zDyxg5QI` | upotus sallittu |
| Fairbanks Aurora Camp | Aurora Camp | YouTube | `zSHHC6ozNDk` | upotus sallittu |
| Kaleido Lodge, Yukon | Kaleido Lodge | YouTube | `7zNTF4iyWag` | upotus sallittu |
| Québec | AuroraQC | YouTube | `vM-VEhQ15CU` | upotus sallittu (48 N) |
| Poker Flat, Toolik, Gakona | UAF Geophysical Institute | still (allsky.gi.alaska.edu) | 20.11. "offline-notdark" (päivä) | ei mainintaa; dhampton@alaska.edu, mjahrns@alaska.edu |
| TREx Pinawa, Lucky Lake, Rabbit Lake, RAO Calgary, Resolute Bay | UCalgary | still | aurora.phys.ucalgary.ca/ucimage/live.html | UCalgary, selvittämättä |

### Kilpailijat ja kokoajat

- **SpaceWeatherLive** (Parsec vzw): 58 kameraa, kuvat suoraan omistajilta. Pohjoismaat: KHO Sony, Nordkapp (yr.no Ortneset?),
  Skibotn (TGO), Setermoen (yr.no), Abisko (Lights Over Lapland + Fabian Wimmer), Kiruna (IRF), Porjus N + W, Kilpisjärvi, Levi,
  Sodankylä, Posio (YouTube), Hankasalmi, Nyrölä, Kirkkonummi (Metsähovi), Helsinki, Syrjävaara, Islanti: Highland Center
  Hrauneyjar, Hella Landhotel, Aðaldalshraun.
- **liveauroracams.com**: 66 kameraa omalla rajapinnalla; Pohjoismaat: Abisko, Espoo (Karhunvartijat), Gällivare (Dundret),
  Hankasalmi, Kiruna, Porjus, Setermoen, Skibotn, Sodankylä (SGO), Svalbard (KHO) + YouTube-kamerat (Starlapland, Lyngen North,
  Aurora Holidays, Samimaka, Hotel Lapin Satu; kaikki merkitty "Offline" 29.3.2026 alkaen).
- **My Aurora Forecast, Aurora Now, Hello Aurora**: kameralähteitä ei saatu näkyviin (sovelluksen sisäisiä). Arvostelun mukaan
  My Aurora Forecastissa mm. Kuusamo (lähde varmistamatta).
- Aurora Service Europe: ennustesivu "down for maintenance"; northernlightsalert.com on pysäköity verkkotunnus (YouTube-kanava toimii).

## SUOSITUS

### Kauppaversioon heti ilman lupaa

YouTube-upotukset (omistaja sallinut upotuksen, oEmbed 200), kaikki LIVE 20.11.:
- Nykyiset: **Levi, Kilpisjärvi, Apukka, Posio, Lyngen North (uusi ID), Aurora Reykjavík, Sodankylä, Luosto, Kalajoki,
  Oulu Nallikari (uusi ID), Utsjoki (uusi ID)** = 11.
- Uudet ehdokkaat: **Levin Iglut** (`3UMZ2AFhYnc`), **Tromsø Arctic Campers** (`jnOzc1or-oE`), **Överkalix** (`E6U2YtS_dJY`),
  **Aðaldalshraun** (`Pp91BS43KZ8`), **Hólar** (`CZpXxi9Vlxo`), **Golden Circle** (`4V29BHYRYtY`), **Skarsvåg** (`iMqrD-HBDGo`),
  **Nallikari länsi** (`DdBaoU4xr4Y`). Kansikuvallisten varsinainen kuva tarkistettava puhelimella ennen lisäystä.

Still: **IRF Kiruna all-sky** (CC BY 4.0, maininta pakollinen). Suositus: lyhyt sähköposti IRF:lle silti (urban.brandstrom@irf.se),
että lisenssi kattaa reaaliaikakuvan.

Poistetaan kauppaversiosta: Aikhal, Ilulissat, AuroraMAX (CSA: ei-kaupallinen), Fort Smith ja Gillam (ehdot selvittämättä),
Isle Royale (public domain, mutta 48 N) -> Nuuk, Upernavik, Fort Smith, Gillam, Isle Royale **vain Dev**.

### Lupaa vaativat (yhteystiedot)

| kamera(t) | kenelle | yhteys |
|---|---|---|
| KHO Sony A7s (+ BACC-verkko) | UNIS, Dag Lorentzen / Fred Sigernes | dag.lorentzen@unis.no, fred.sigernes@unis.no |
| Skibotn ASC01 + BACC #5 | UiT Tromsø Geophysical Observatory, Magnar Gullikstad Johnsen | fox.phys.uit.no (vastaava toimittaja) |
| Sodankylä, Oulu SKY-i | SGO (Oulun yliopisto), Tero Raita | sgo.fi/Contact; kaupallinen käyttö "generally not free of charge" |
| Sodankylä UCL | UCL Atmospheric Physics Laboratory | (kuvassa kielto ilman lupaa) |
| FMI (Metsähovi, Nyrölä, Kilpisjärvi, Kevo) | FMI, Kirsti Kauristie | etunimi.sukunimi@fmi.fi (sivun ohje) |
| Hankasalmi + Nyrölä | Jyväskylän Sirius ry | jklsirius.fi |
| Porjus NR1/NR3/NR4 | Arctic Colors / jokkmokk.jp | sivun mailto |
| Abisko (2 kameraa) | Lights Over Lapland (Chad Blakley) | lightsoverlapland.com/contact |
| Kevo pihakamera | Turun yliopisto, Kevon tutkimusasema | sites.utu.fi/kevo |
| Tampereen Ursa | Tampereen Ursa ry | ursa.fi/yhd/tampereenursa |
| Syrjävaara | Syrjävaara Dark Sky Park | syrjavaara.fi |
| Setermoen, Ortneset | yr.no / kameran omistaja | yr.no |
| Hornsund | IGF PAN, Hornsund-asema | hornsund.igf.edu.pl |
| Svinøya Rorbuer (Lofoten), LAVA Centre (IS), Landhotel (IS) | hotellit | sivujen yhteystiedot (reception@lavacentre.is, booking@landhotel.is) |
| Gällivare Dundret, Espoo Karhunvartijat | omistajat | kuvaosoite selvitettävä |

### Maantieteelliset aukot

- **Pohjois-Norja Finnmark** (Alta, Hammerfest, Kirkenes, Vadsø): vain Nordkappin satamakamerat; ei taivaskameraa.
- **Lofoten / Vesterålen / Senja**: ei upotettavaa revontulikameraa (Svinøya vaatii luvan, Norway Live vain maisema).
- **Itä-Lappi (Salla, Kuusamo, Ruka, Savukoski)**: ei yhtään toimivaa kameraa (Kuusamo mainittu My Aurora Forecastissa, ei löytynyt).
- **Inari–Saariselkä**: Inarin kameran upotus estetty, Saariselän kamerat hiihtolatuja.
- **Ruotsin Norrbotten etelä / Västerbotten (Luleå, Arvidsjaur, Hemavan)**: ei löytynyt; Arjeplog-ehdokas epäilyttävä.
- **Islannin itä ja länsivuonot**: vain etelä (Reykjavík, Golden Circle, Hella) ja pohjoinen (Hólar, Aðaldalshraun).
- **Svalbard**: vain KHO (lupa) ja Hornsund (lupa); ei upotettavaa YouTube-kameraa.

## Jäi kesken / ei tehty

- YouTube Data API `status.embeddable`: ei avainta -> korvattu oEmbedilla (ks. yllä).
- Kansikuvallisten YouTube-kameroiden todellinen kuva (suunta, huurre): katselusivu estetty GitHubista -> tarkistettava puhelimella.
- Kilpailijasovellusten kameralistat: vain verkkosivut (SpaceWeatherLive, liveauroracams); sovellusten sisältöä ei voi lukea.
- UCalgaryn acknowledgements.pdf (pakattu PDF, ei luettu), Svinøyan ja LAVA Centren soitinosoitteet (JavaScript).
- Väliaikaiset orpohaarat `kameratarkistus-tulos`, `kameratarkistus-35e8...`, `kameratarkistus-b766...`, `kameratarkistus-<ajo 4>`
  ja `kho-tutkimus` sisältävät raportit ja pienennetyt kuvat (ajo 1:ssä myös kolmansien osapuolten HTML-sivuja). Poista ne GitHubissa
  (Claude-ympäristön push --delete katkesi aiemmin).
