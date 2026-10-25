# Selvitykset: pilvet korkeuksittain, sumu, satelliittikuva (2026-10-24)

Oppaan palautteen pohjalta. Mitään ei ole vielä toteutettu. Ulkoiset rajapinnat
eivät vastaa Claude-ympäristöstä, joten tiedot perustuvat repon omiin
hakuskripteihin, verkkohakuun ja yleistietoon. **"Tarkistettava"** = varmistetaan
koehaun työnkululla ennen toteutusta (ks. CLAUDE.md "Ulkoiset rajapinnat").

## a) Pilvet korkeuksittain (matala / keski / ylä)

**Mitä malleilla on**

| Malli | Kokonaispilvisyys | Matala/keski/ylä | Nyt meillä |
|---|---|---|---|
| ICON-EU (DWD) | CLCT | CLCL / CLCM / CLCH, todennettu | **Haetaan jo** (`fetch-clouds-icon_eu.py`, `valsLow/Mid/High`, `hasLayers:true`) |
| HARMONIE (FMI) | TotalCloudCover | LowCloudCover / MediumCloudCover / HighCloudCover samassa `/download`-tuotteessa (FMI:n parametrilista) | Vain kokonaispilvisyys (v1-yksinkertaistus) |
| ECMWF IFS | tcc | lcc / mcc / hcc ovat IFS:n vakioparametreja. ECMWF siirtyi 1.10.2025 täysin avoimeen dataan (CC BY 4.0), mutta ilmaisen latausportaalin parametrijoukko on **tarkistettava** (`param=["lcc","mcc","hcc"]` koehaulla) | Vain tcc |

Kerrosten rajat (WMO/mallien käytäntö, suunnilleen): matala pinta–2 km
(alle ~800 hPa), keski 2–6 km (~800–450 hPa), ylä yli 6 km (yli ~450 hPa).

**Datamäärä (arvio nykyisistä mitatuista koista)**
- ICON-EU: ei muutosta, kerrokset ovat jo tiedostoissa (~481 kt/askel PNG:nä).
- HARMONIE: nyt ~1,45 Mt/askel (plain JSON, yksi kenttä). Jos samalla siirrytään
  PNG-pakkaukseen kuten ICON-EU:lla (~120 kt/kenttä vastaavalla pistemäärällä),
  4 kenttää olisi noin **0,5 Mt/askel, eli vähemmän kuin nyt**. Pelkät kerrokset
  JSONina olisivat ~5,8 Mt/askel (liikaa puhelimelle).
- ECMWF: ~120 kt/askel nyt (tcc, JSON). 4 kenttää JSONina ~0,5 Mt/askel, PNG:nä
  arviolta ~0,1 Mt.

**Kytkentä tuulen korkeuteen**

| Tuulen taso | Korkeus noin | Pilvikerros |
|---|---|---|
| Pinta 10 m | maanpinta | kaikki pilvet (tai matalat) |
| 850 hPa | 1,5 km | matalat |
| 500 hPa | 5,5 km | keskikorkeat |
| 300 hPa | 9 km | ylä (cirrus) |

Ehdotus: säävalikon 3. tasolle (nyt tuulen korkeudet) pilvikerroksen valinta
"Kaikki / Matalat / Keski / Ylä". Lisäksi "seuraa tuulen korkeutta": kun
molemmat tasot ovat päällä, valittu tuulen korkeus valitsee yllä olevan
taulukon mukaisen pilvikerroksen, jolloin pilvien liike ja tuulihiukkaset
kuuluvat samaan kerrokseen. Pilvien varjostin ei muutu, vaihtuu vain
tekstuurin kenttä. Näkyvyys ja Tänä yönä käyttävät aina kokonaispilvisyyttä,
mutta kerrokset tarkentavat pilvikerrointa (`cloudVisibilityFactor`): ohut
yläpilvi peittää revontulia vähemmän kuin matala. ICON-EU tekee näin jo.

**Toteutettavuus:** hyvä. **Työmäärä:**
- HARMONIE-kerrokset ja PNG-pakkaus: 1–2 päivää. Sisältää hakuskriptin, työnkulun ajon ja vertailun.
- ECMWF, jos koehaku onnistuu: noin 1 päivä.
- Käyttöliittymä (valinta ja kytkentä): 1–2 päivää.

Hälytysajo (`alerts/cloud-models.js`) lukee PNG-kentät jo.

**Suositus:** tee ensin HARMONIE (tarkin malli Lapissa, jo hälytysten
pilvilähde) PNG:ksi kerroksineen. Samalla pienenee nykyinen latausmäärä.
ECMWF vasta, kun koehaku vahvistaa parametrit. Käyttöliittymän kytkentä
kolmanneksi.

## b) Sumu ja näkyvyys

**Mitä malleilla on**
- **HARMONIE (FMI):** `Visibility` (m) on FMI:n HARMONIE Scandinavia
  -pintatuotteen parametrilistalla samassa `/download`-rajapinnassa kuin
  pilvet. Erillistä sumuparametria ei löytynyt. (Tanskan DMI:n HARMONIE antaa
  "2 m pilvisyyden" eli sumun, mutta se on eri malli.) Lisäksi
  `LowCloudCover`/alimman mallipinnan pilvi toimii sumun lähestymisenä.
- **ICON-EU:** avoimessa datassa ei tiettävästi suoraa näkyvyyttä. Tarkistettava
  DWD:n hakemistolistauksesta (esim. `vis`), ei varmuutta.
- **ECMWF IFS:** `vis` (näkyvyys) on IFS-parametri, avoimen portaalin osalta tarkistettava.

**Ennusteen tarkkuus:** heikko, ja se on alan yleinen tieto. Säteilysumu
syntyy paikallisesti: jokilaaksot, järvien ja soiden yllä, tuntureiden
juurella. Tällaiset alueet ovat usein pienempiä kuin mallin 2,5 km
hilaruutu. Mallit osuvat sumun aikaan ja paikkaan selvästi huonommin kuin
pilvisyyteen. HARMONIE (2,5 km natiivi) on näistä paras, ECMWF 9 km
heikoin. Lapin pakkasyön jääsumu ja ohut sumu tunturin juurella voivat
silti olla oppaalle olennaisia: taivas voi olla kirkas mäen päällä mutta
sumuinen laaksossa.

**Toteutettavuus:** tekninen haku on helppo, sama HARMONIE-pyyntö ja yksi
parametri lisää (~0,1 Mt/askel PNG:nä). Vaikea osa on luotettavuus.
**Työmäärä:**
- Lokivertailu: noin 1 päivä.
- Kartta- tai infoikkunamerkintä: 1–2 päivää.

**Suositus:** ei vielä käyttöliittymään. Ensin kuivaharjoitus kuten
hälytyksissä: kirjataan HARMONIEn näkyvyysennuste testipaikoille lokiin ja
verrataan FMI:n havaintoasemien mitattuun näkyvyyteen. Havainnot ovat FMI:n
avointa dataa, esim. Sodankylä, Kittilä, Rovaniemi ja Utsjoki. Vertailuun
riittää 2–4 viikkoa. Jos osumat ovat järkeviä, näytetään varovainen merkintä
"sumun riski" Tänä yönä -välilehdellä, ei karttatasoa.

## c) Satelliittikuva yöllä (infrapuna)

Lapissa yöllä vain infrapuna (IR, ~10,8 µm) ja erotuskuvat (3,9–10,8 µm,
"night microphysics": matala pilvi ja sumu) toimivat. Lisäksi VIIRS:n
Day/Night Band näkee kuunvalossa pilvet (ja revontulet).

**Geostationaariset (Meteosat, 0°: MSG ja MTG-I1 / Meteosat-12, FCI)**
- Päivitys: MTG FCI 10 min, MSG 15 min. Koko pallo, sama kuva jatkuvasti.
- Kattavuus Lapissa: huono kulma. Satelliitti on päiväntasaajan yllä, joten
  66–70 °N katsotaan hyvin loivasti. Pikselit venyvät pohjois-etelä-suunnassa
  moninkertaisiksi ja pilvien paikat siirtyvät (parallaksi, korkea pilvi
  näkyy etelämpänä kuin on). Käyttökelpoinen arviolta noin 70 °N:iin,
  Jäämeren rannikolla ja Huippuvuorilla heikko.
- Lisenssi: EUMETSATin datapolitiikka (uudistettu, versio 2026-01). Tunneittaiset
  kuvat ovat vapaita ja rajoituksettomia ("Essential"). Täysi resoluutio 15 min
  välein ilmaiseksi 3 h viiveellä. **Reaaliaikainen alle tunnin kuva
  kaupalliseen käyttöön vaatii lisenssin** (maksullinen). Tarkka ehto
  tarkistettava nykyisestä Data Policy -asiakirjasta ennen toteutusta.
- Valmiit jakelukanavat: EUMETSATin EUMETView (WMS-karttapalvelu, käyttöehdot
  tarkistettava) ja MET Norjan `api.met.no/geosatellite` (Euroopan IR-kuvat,
  MET-datan lisenssi yleensä CC BY 4.0, tarkistettava). Kumpaakaan ei voitu
  avata tästä ympäristöstä.

**Napaa kiertävät (NOAA-20/21, Suomi NPP: VIIRS; Metop-B/C: AVHRR)**
- Kattavuus Lapissa: erinomainen. Radat kohtaavat napa-alueella, joten
  68 °N:ssa ylilentoja on kaikista satelliiteista yhteensä noin 1–2 h välein.
  Resoluutio IR:ssä 375 m (VIIRS I5) ja 1 km (AVHRR), ja kulma on hyvä.
- Päivitys: ei jatkuva. Kuva syntyy ylilennon kohdalta, eli kartta on
  "tilkkutäkki" eri-ikäisiä kaistaleita.
- Viive:
  - Maailmanlaajuinen NRT-jakelu (NASA LANCE / GIBS) noin 3 h, joten ei reaaliaikainen.
  - Lähes reaaliaikainen (minuutteja) vain suoravastaanottoasemilta. FMI:n
    Sodankylän asema vastaanottaa näitä, mutta avoimena tuotteena saatavuus
    on tarkistettava.
- Lisenssi:
  - NOAA/NASA-data on julkista (public domain), myös kaupalliseen käyttöön;
    lähdemaininta pyydetään. NASA GIBS tarjoaa valmiit karttatiilet
    (WMTS), esim. VIIRS IR ja Day/Night Band.
  - Metop: EUMETSATin politiikka kuten yllä.

**Toteutettavuus ja työmäärä**
- GIBS-tiilitaso (VIIRS IR / DNB): helppo, rasteritaso kuten satelliittipohja.
  1–2 päivää. Haittana 3 h viive ja kaistaleet.
- Meteosat tunneittain (vapaa) WMS:stä tai MET Norjasta: 2–3 päivää, jos
  rajapinta sallii tiilet ja CORSin. Muuten oma esikäsittely
  (Worker/Actions): 1–2 viikkoa.
- Reaaliaikainen (10–15 min) Meteosat kaupallisesti: lisenssineuvottelu.
  Ei sovi "ei maksullisia palveluita" -reunaehtoon.

**Suositus:** ei nyt. Hyöty oppaalle on "näkyykö pilvi juuri nyt", mutta
kumpikaan vapaa vaihtoehto ei ole yhtä aikaa tuore ja tarkka Lapissa:
- tunneittainen Meteosat on tuore mutta vino;
- VIIRS on tarkka mutta noin 3 h vanha.

Jos halutaan kokeilla, ensin EUMETSATin tai MET Norjan tunneittainen IR-kuva
`?debug`-tasona ja vertailu kameroihin muutaman yön ajan. Lisenssiehdot
tarkistetaan kirjallisesti ennen julkaisua. VIIRS Day/Night Band on
kiinnostava erikoistapaus (kuunvalo ja revontulet), mutta viiveen takia
se sopii lähinnä jälkikäteiseen tarkasteluun.

## Yhteenveto (suositeltu järjestys)

1. HARMONIE kerroksineen PNG:ksi (a). Hyöty selvä, latausmäärä jopa pienenee.
2. Pilvikerroksen valinta ja kytkentä tuulen korkeuteen käyttöliittymään (a).
3. Sumu: HARMONIEn näkyvyys lokiin ja vertailu havaintoihin (b), käyttöliittymä vasta tulosten jälkeen.
4. ECMWF-kerrokset, jos koehaku onnistuu (a).
5. Satelliittikuva vasta kokeiluna, lisenssit ensin (c).

Lähteet (verkkohaku 2026-10-24): ECMWF open data (CC BY 4.0, täysin avoin
1.10.2025), EUMETSAT Data Policy (2026-01), FMI:n WFS/`/download`-
parametrilistat (fmiopendata), NASA Earthdata LANCE -viivetilastot.

## Toteutus: HARMONIEn pilvikerrokset (2026-10-24, haara claude/harmonie-kerrokset)

- `fetch-clouds-harmonie.py` hakee kokonaispilvisyyden lisäksi kolme kerrosta: `LowCloudCover`, `MediumCloudCover` ja `HighCloudCover`.
  - Jokainen kenttä haetaan omalla pyynnöllään (127,7 Mt GRIB2 per kenttä).
  - Kerrokset tallennetaan askeltiedostoon kenttinä `valsLow`/`valsMid`/`valsHigh` (PNG, `cloud_png.py`), ja metaan merkitään `hasLayers: true`.
  - Jos jokin kerros puuttuu tai sen hila tai aika-akseli eroaa kokonaispilvisyydestä, julkaistaan vain kokonaispilvisyys (`::warning`).
- **Yksikkö (todettu oikeasta ajosta):** FMI antaa kerrokset osuutena 0–1 (GRIB-yksikkö `(0 - 1)`), mutta kokonaispilvisyyden prosentteina. Ensimmäinen koeajo pyöristi kerrokset siksi arvoihin 0/1 %. Korjattu: skaalaus GRIB-yksikön mukaan (`layer_scale`), varalla arvoalue.
- GRIB-muuttujien nimet ovat `lcc`, `mcc` ja `hcc`. Arvot 0–1, ei NaN-arvoja. Hila ja 31 askelta ovat samat kuin kokonaispilvisyydellä.
- **Koko:** 387 kt per askel raakana (ennen 75 kt), arviolta noin 290 kt gzipattuna. Ennen kerroksia gzipattuna 57 kt ja ennen PNG-muunnosta 103 kt.
  - Hitaalla 4G:llä (1,6 Mbit/s) yksi askel kestää noin 1,5 s, ennen noin 0,3 s.
  - Käynnistys lataa 1–2 askelta.
- **Sovellus:** näkyvyys (`cloudVisibilityFactor`) painottaa kerroksia (0,95 · matala + 0,65 · keski + 0,30 · ylä), kun HARMONIE on valittuna. Kartan pilvikuva ei muutu, koska se piirretään kokonaispilvisyydestä.
- **Hälytykset:** kenttätesti jatkuu kokonaispilvisyydellä (`ALERT_CFG.cloudLayers: false`, `loadLazyGrid(..., {layers: false})`), jotta laskenta pysyy samana koko testin ajan (päättyy 6.11.). Vaihdetaan päälle testin jälkeen.
- **Avoin päätös:** kerrokset voisi tallentaa karkeammalla hilalla (esim. 10 km). Askeleen koko putoaisi noin 160 kt:hen (gzip noin 120 kt), ja näkyvyyden painotukseen tarkkuus riittäisi. Se vaatisi kuitenkin näytteistykseen tuen eri hilalle kenttää kohden.
- **KORVATTU 2026-10-24 (käyttäjän päätös "Pilvikerrokset vain näytettäväksi"):** kerrospainotus ja `ALERT_CFG.cloudLayers` poistettu, näkyvyys aina kokonaispilvisyydestä. Kerrokset omissa tiedostoissaan (`clouds-<malli>-layers-stepNN.json`, myös ICON-EU), haetaan vasta kun käyttäjä valitsee kerroksen kartalle. Ks. MUISTIO-lataus.md "Pilvikerrokset omiin tiedostoihin".

## Koehaku: ECMWF:n pilvikerrokset (2026-10-24, haara claude/ecmwf-kerrokset-koe)

**Tulos: löytyvät.** ECMWF Open Data (sama lähde ja lisenssi CC BY 4.0 kuin nykyinen haku) tarjoaa `lcc`, `mcc` ja `hcc`.
- Koehaku: ajo 24.10. klo 06 UTC, askeleet 0 ja 24 h, `ecmwf.opendata`-kirjasto, lähde `ecmwf`. Tarkistettu myös AWS-peilin indeksistä.
- Askeltiedoston indeksissä on 55 parametria, ja kaikki neljä pilviparametria (`tcc`, `lcc`, `mcc`, `hcc`) ovat mukana.
- Yksikkö on osuus 0–1 kuten `tcc`:llä, ei NaN-arvoja. Hila 0,25° on sama kuin nykyisellä kokonaispilvisyydellä (alueella 121 × 361 pistettä).

**Koko askelta kohden** (PNG, alue 55–85 °N, 30 °W–60 °E):

| | Askel 0 h | Askel 24 h |
|---|---|---|
| lcc | 20,9 kt | 20,1 kt |
| mcc | 24,0 kt | 23,4 kt |
| hcc | 24,6 kt | 23,7 kt |
| Kerrostiedosto raakana | 69,6 kt | 67,2 kt |
| Kerrostiedosto gzip (siirretty) | 52,7 kt | 50,9 kt |
| Vertailu: tcc | 15,3 kt | 15,7 kt |

- Koko ennuste (17 askelta) on noin 1,2 Mt raakana, ja käyttäjä lataa vain valitun kerroksen tunnin askeleen (~51 kt gzip).
- Käynnistykseen ei tule muutosta, koska kerrokset ovat omissa tiedostoissaan.
- GRIB-haku kasvaa noin nelinkertaiseksi: 2 askelta × 4 parametria = 3,4 Mt, joten 17 askelta on noin 29 Mt. Se mahtuu Actionsin aikarajaan.

**Työmäärä-arvio: noin 1–2 tuntia + työnkulun koeajo.**
- `scripts/fetch-clouds.py`:
  - `param=["tcc","lcc","mcc","hcc"]` samalla pyynnöllä.
  - Kerrokset tiedostoon `clouds-ecmwf-layers-stepNN.json` (`{t0, valsLow, valsMid, valsHigh}`).
  - Metaan `hasLayers`/`layerFiles: true`. Jos kerros puuttuu, julkaistaan vain kokonaispilvisyys (kuten HARMONIE).
  - Koko tiedosto `clouds-ecmwf.json` (hälytykset) pysyy ennallaan.
- Työnkulku: artefaktipolku `data/clouds-ecmwf*.json` kattaa jo uudet tiedostot.
- Sovellus:
  - `CLOUD_MODELS.ecmwf`: `layerFile` + `hasLayers: true`. Säävalikko, lippu ja laiska lataus toimivat sellaisinaan.
  - Huomautus "Ei tällä mallilla" jää käyttämättä, kun mikään malli ei ole kerroksiton.
- Näkyvyyslaskentaan ei vaikutusta (`cloudVisibilityFactor` lukee vain `vals`).

**Sivuhavainto:** Azure-peili vastasi `HTTP 409: Public access is not permitted on this storage account`. Nykyisen haun varalähdejärjestys on ecmwf → azure → aws, joten Azure ei toimi varana. AWS toimi. Kannattaa korjata järjestykseksi ecmwf → aws (erillinen pieni muutos).

## Koehaku: sumutaso (2026-10-25, haara claude/sumu-selvitys)

Tavoite: sumu omaksi näytettäväksi tasoksi tasovalikkoon (kuten Windyssä), aikajana
toimii. EI vaikutusta näkyvyysprosenttiin eikä hälytyksiin. Ei vielä toteutettu.
Koehaku: `scripts/probe-fog.py` + väliaikainen työnkulku `.github/workflows/fog-probe.yml`
(käynnistyy `.github/fog-probe.env`-muutoksesta, ei julkaise). Ajot 40175591136 ja
40175812923 (25.10. klo 08 UTC, yksi ajo / askel +6 h). **Poistettava ennen mainiin
yhdistämistä.** Päivittää kohdan "b) Sumu ja näkyvyys" tiedot.

**1. Saatavuus (sama lähde ja lisenssi kuin nykyinen pilvihaku)**

| Malli | Parametri | Tulos |
|---|---|---|
| HARMONIE (FMI, CC BY 4.0) | `Visibility` (m) samasta `/download`-rajapinnasta | **On.** 57 m - 75 km, ei NaN-arvoja. Lisäksi `FogIntensity` (GRIB "fog", arvot 0-2, luokittelu, merkitys dokumentoimatta) |
| ICON-EU (DWD, avoin data) | hakemisto `vis` (m) samassa paikassa kuin `clct` | **On.** 41 m - 44,5 km, kaikki askeleet 0-30 h julkaistu (tarkistettu HEAD-pyynnöillä) |
| ECMWF (Open Data, CC BY 4.0) | `vis` | **Ei.** Avoimessa 0,25° datassa 55 parametria, ei näkyvyyttä. Koko luettelo on avattu 1.10.2025, mutta muut kuin ilmaiset parametrit voivat olla maksullisia (= reunaehdon vastaisia) |

ECMWF valittuna -> sumutaso "Ei saatavilla" (sama käytös kuin puuttuvilla pilvikerroksilla).
Korviketta (esim. kastepisteen vajaus 2t-2d + matala pilvi) EI suositella: olisi oma
keksitty kaava, ei mallin ennuste.

**2. Esitystapa (ehdotus)**
- Luokat: **sumu alle 1 km**, **utu 1-5 km**, yli 5 km ei mitään (läpinäkyvä).
  Säilytetään jatkuva arvo, jotta reunat saadaan pehmeiksi samalla bikubisella
  interpoloinnilla kuin pilvissä; luokat tehdään vasta värikäyrässä (hakutaulu kuten `CLOUD_ALPHA`).
- Värit erottuvat pilvistä (harmaa-valkoinen), revontulista (vihreä-punainen) ja
  tuulesta (valkoiset hiukkaset): lämmin hiekan/okran sävy. Utu vaalea `#E9DCA8`
  alfa ~0,30, sumu tiheämpi `#F0C060` alfa ~0,60, alle 200 m voimakkain (alfa ~0,75).
  Säädettävä `?debug`-paneelissa kuten pilvien käyrä.
- Lippuun rivi "Näkyvyys 800 m" (km/mi-asetus `fmtDist`), selite infoikkunaan.
- **Windy:** virallista kuvausta selitteestä ei löytynyt. Windyn yhteisöfoorumin
  mukaan (käyttäjien ja moderaattorien viestit): globaalin ICON-mallin sumutaso on
  Windyn itse johtama (ICON-EU ja ICON-D2 antavat näkyvyyden suoraan), sumutaso
  ja näkyvyysluku tulevat eri malleista, ja moderaattorin mukaan sumu-overlay kertoo
  vain suhteellisesta mahdollisuudesta, koska sumua ei voi ennustaa luotettavasti.
  Lähteet: community.windy.com/topic/8455, /topic/44193, /topic/7045.

**3. Tiedostokoko askelta kohden** (mitattu yhdeltä askeleelta, sama alue ja hila kuin pilvissä)

| Koodaus (1 tavu/piste, PNG) | HARMONIE 412 x 801 | ICON-EU 249 x 1377 |
|---|---|---|
| Luokat 0/1/2 | 8,2 kt gzip | 13,7 kt gzip |
| **Näkyvyys 0-5 km 50 m portain (suositus)** | **26,5 kt** gzip | **47,8 kt** gzip |
| Näkyvyys 0-10 km 100 m portain | 48,1 kt gzip | 55,1 kt gzip |

Sumua/utua tällä askeleella: HARMONIE 3,5 % / 4,8 %, ICON-EU 7,1 % / 8,9 % alueesta.
Sumuinen tilanne kasvattaa kokoa jonkin verran. Vertailu: pilviaskel HARMONIE ~57 kt,
kerrostiedosto ~51 kt (ECMWF). Lataus vain tason ollessa päällä: yksi askel kerrallaan
(laiska), hitaalla 4G:llä ~1-2 s/askel kuten pilvikerroksissa. Käynnistykseen ei vaikutusta.
Datatyönkulku: HARMONIE-haku on yksi parametri lisää (`Visibility`, ~4 Mt GRIB per
aika-askel koko Skandinavialta, sama kuin TotalCloudCover), ICON-EU 31 tiedostoa lisää per ajo.

**4. Työmäärä (toteutusmalli kuten pilvikerroksissa)**
- Data (HARMONIE + ICON-EU hakuskriptit, omat tiedostot `clouds-<malli>-fog-stepNN.json`,
  meta `fogFiles: true`, run_guard, testit): ~0,5 päivää + työnkulkujen ajo mainista.
- Sovellus (tasovalikon Sumu-ryhmä kytkimellä ja i-napilla, laiska lataus samalla
  `ensureLazyStepLoaded`-mekanismilla, oma WebGL-taso pilvivarjostimen pohjalta omalla
  värikäyrällä, lippurivi, "Ei saatavilla" ECMWF:llä tai jos tiedosto puuttuu, i18n 5 kielelle):
  ~1 päivä.
- Kuvakaappaukset, puhelintesti, muistio: ~0,5 päivää. **Yhteensä ~2 päivää.**
- Avoin: tasojärjestys (sumu pilvien alla vai päällä?) ja voiko pilvet + sumu olla yhtä aikaa.

**5. Infotekstiluonnos (suomi)**
> **Sumu kartalla.** Kartalla näkyy valitun säämallin näkyvyysennuste aikajanan
> ajankohdalta: tiheämpi sävy = sumu (näkyvyys alle 1 km), vaaleampi = utu (1–5 km).
> Ennuste näyttää laajat sumualueet. Pienet laakso-, järvi- ja jokisumut voivat
> puuttua, koska ne ovat mallin hilaruutua pienempiä. Sumu ei vaikuta
> näkyvyysprosenttiin. ECMWF-mallissa sumuennustetta ei ole saatavilla.

## Toteutus: sumutaso (2026-10-25, haara claude/sumutaso)

Käyttäjän päätökset: sumu on "Pilvet ja sumu" -ryhmän valinta (yksi kerrallaan, ei omaa riviä eikä
pikanappia), valinnat ruudukkona ikoni tekstin yläpuolella, valkoinen sävy (ei koehaun ehdottamaa
hiekan sävyä), lipussa luokka eikä metrejä, ei sanaa "näkyvyys".
**2. kierros (2026-10-25): yksi luokka "Sumu"** - utu poistettu kaikkialta (koehaun "utu 1-5 km"
yllä on historiaa). Kartalla sumu näkyy alle 5 km näkyvyydellä portaattomana: lähes läpinäkyvä
5 km:ssä, lähes peittävä valkoinen alle 1 km:ssä (`FOG_ALPHA_STOPS` [0,0] [0,01;0,04] [0,8;0,85] [1;0,9]).
Infoteksti mainitsee, että näkyvyys voi heiketä myös sateen tai lumisateen vuoksi (sateen erottelua ei
selvitetä nyt, käyttäjän päätös).

- Data: `fetch-clouds-harmonie.py` (+ `Visibility`, sama hila/askeleet tarkistettu) ja
  `fetch-clouds-icon_eu.py` (+ VIS joka askeleelle, ei kuulu ajon valintaan) -> `clouds-<malli>-fog-stepNN.json`.
  Puuttuva tai virheellinen sumu ei estä pilvien julkaisua (`fogFiles:false`, `::warning`).
  Haara-ajo HARMONIE 25.10.: 31 sumutiedostoa, näkyvyys 37 m - 75 km, yksi NaN (-> yli 5 km).
- Selain: `fogGrid` kuten kerroksilla, `ensureFogStepLoaded` muuntaa tiheydeksi, pilvitason varjostin
  piirtää valkoisena omalla läpinäkyvyyskäyrällä (`FOG_ALPHA_STOPS`, sama hakutaulu vaihdetaan).
- Lippu (käyttäjän päätös 2026-10-25): sumuikoni + pelkkä luokka "Sumu" (näkyvyys alle 5 km) /
  "Ei sumua" (ECMWF "Ei saatavilla"), ei otsikkoa luokan edessä (`.cf-row.fog`).
- Esikatselu lukee tuotannon datan -> sumu näkyy oikealla datalla vasta, kun haut on ajettu mainista
  yhdistämisen jälkeen (siihen asti valinta "Ei saatavilla"). Kuvakaappaukset synteettisellä datalla.
- Tarkistettava puhelimella: ruudukon napautus, sumun erottuvuus molemmilla pohjilla oikealla datalla,
  latausaika (HARMONIE ~27 kt, ICON-EU ~48 kt/askel gzip).

## Selvitys: satelliittikuva revontulien metsästykseen (2026-10-25, ei toteutettu)

Käyttötarkoitus: yöllä nähdä, missä on pilvetöntä nyt ja mihin pilvet liikkuvat. Vaatimukset: toimii
yöllä (IR), päivitys enintään 15-30 min, viive enintään ~30 min, kattaa Suomen + Pohjois-Ruotsin ja
-Norjan, ilmainen ja kauppasovellukseen sallittu lisenssi, tiilinä/WMS:nä tai muunnettavissa.
**Koehaku GitHubissa** (väliaikainen työnkulku `sat-probe.yml`, ajot 40182779316 ja 40182981777,
25.10. klo 10 UTC, poistettu): MET Norja, EUMETView WMS, NASA GIBS, EUMETSATin datapolitiikan PDF,
NOAA nowCOAST. Muut tiedot verkkohausta (merkitty ❓ jos ei todennettu).

**1. Lisenssi (EUMETSAT Data Policy, versio 2026-01, luettu PDF:stä koehaussa)**
- Artikla 4, "Core" (artikla 5: kaikille, Free and Unrestricted, **CC BY 4.0**, myös kaupallinen,
  uudelleenjako sallittu artikla 6): *All Level 1 Hourly SEVIRI, FCI and IRS data* (= tasatuntien
  kuvat), *All Derived Products* (tasoa 2, mm. pilvimaski/-tyyppi), *All Advanced Image Products*.
- "Recommended" (vaatii EUMETSATin lisenssin): Level 1 -data, jonka viive >= 1 h (maksuton), tai
  viive < 1 h (voi olla maksullinen). Eli **10/15 min välein otetut kuvat alle tunnin viiveellä EIVÄT
  ole automaattisesti vapaita**, tasatuntien kuvat ovat viiveestä riippumatta.
- ❓ Avoin: lasketaanko EUMETViewin / MET Norjan valmiit kuvat ja RGB-yhdistelmät (Night Microphysics)
  "Advanced Image Products" -luokkaan (jolloin myös 10/15 min kuvat olisivat Core). MET Norja tulkitsee
  näin omista kuvistaan (dokumentaatio lainaa "Hourly Meteosat Data, all Derived Products and Advance
  Image Products ... free and unrestricted", jakaa 15 min välein, CC BY 4.0). **Varmistettava
  EUMETSATilta kirjallisesti ennen kauppajulkaisua.**

**2. Koehaun tulokset**

| Lähde | Päivitys | Viive (mitattu) | Tarkkuus Lapissa | Yö | Muoto, koko | CORS / avain |
|---|---|---|---|---|---|---|
| **EUMETView WMS, `mtg_fd:ir105_hrfi`** (Meteosat-12 FCI, IR 10,5 µm 1 km) | 10 min | 09:30-kuva saatavilla 09:57 -> **~27 min** | ~1,2 x 6-7 km (vino kulma), data 100 % 60-71 °N:ssa | ✅ IR | WMS 1.3.0, EPSG:3857, TIME (myös tasatunti toimii), PNG 512² ~90 kt / 1024² ~280 kt; vastaus 4-10 s | `Access-Control-Allow-Origin: *`, ei avainta, AccessConstraints "none" |
| EUMETView `msg_fes:ir108` (Meteosat SEVIRI 3 km) | 15 min | ~27 min | ~3,4 x 17-21 km | ✅ | PNG 512² ~230 kt, 2-27 s | sama |
| EUMETView `mtg_fd:rgb_fog` (Night Microphysics RGB, MTG) | 10 min | ~27 min | kuten FCI 2 km | ✅ yöllä | PNG 512² ~630 kt, **31 s** | sama |
| EUMETView `msg_fes:rgb_microphysics` | - | - | - | ❌ päivätuote (VIS0.8), 60-65 °N tyhjä | | |
| **MET Norja geosatellite 1.4, `area=europe&type=infrared`** | **15 min** (lista: :00 :15 :30 :45) | 09:30-kuva Last-Modified 09:46 -> **~16 min** | Meteosat, koko Eurooppa yhdessä kuvassa 1280 x 720 -> karkea ❓ | ✅ IR | Valmis PNG ~1 Mt, projektio/kulmat EI ilmoitettu (georeferointi itse) | `*`, ei avainta, User-Agent pakollinen; CC BY 4.0 "free and unrestricted" (dokumentaatio) |
| MET Norja `area=global` IR | 10 min (2026-03 alkaen) | ~22 min | 2300 x 1150 koko maapallo -> liian karkea | ✅ | PNG 3,5 Mt | sama |
| NASA GIBS `VIIRS_NOAA20/21/SNPP_Brightness_Temp_BandI5_Night` | 1 kuva / päivä (useita ylilentoja tilkkuna) | ~3-5 h ❓ | 250 m tiilet (I5 375 m), hyvä kulma | ✅ IR, myös DayNightBand (kuunvalo) | WMTS GoogleMapsCompatible_Level9, WMS PNG 1024² ~660 kt | `*`, ei avainta, julkinen data |
| NOAA nowCOAST / GMGSI | 1 h | 2-3 h ❓ | 3-8 km, Lappi alueen reunalla | ✅ | WMS | `*`; ei sovi (viive) |
| RainViewer | - | - | - | - | satelliitti-IR lopetettu 1.1.2026, API vain ei-kaupalliseen ❓ | ei sovi |
| Ilmatieteen laitos, SMHI, DWD | - | - | - | - | avointa satelliittikuvaa ei löytynyt ❓ | ei sovi |

Geostationaarisen kuvan geometria (oma laskelma, Meteosat 0° E): katselukulma 68 °N:ssa ~79°, pikseli
venyy pohjois-eteläsuunnassa ~6x; parallaksi siirtää pilven kuvassa etelään: matala pilvi 2 km ~10 km,
cirrus 8 km ~40 km (70 °N ~12 / ~48 km). Käyttökelpoinen ~70 °N asti, Jäämeren rannikolla heikko.

**3. Matala pilvi ja sumu yöllä**
- Pelkkä IR 10,5/10,8 µm ei erota sumua ja matalaa stratusta luotettavasti (pieni lämpötilaero; Lapin
  talven inversiossa pilvi voi olla lumipintaa lämpimämpi -> kontrasti kääntyy).
- Night Microphysics RGB (3,8-10,5 µm erotus) on paras yöllinen sumutuote ja on saatavilla
  (`mtg_fd:rgb_fog`, 10 min), mutta: heikkenee korkeilla leveyksillä talvella (3,8 µm kohina kylmässä),
  vino kulma heikentää lisää, ja RGB-värien tulkinta vaatii opettelua. Lisenssiluokka ❓ (ks. 1).
- Johtopäätös: sumu jatkossakin malleista (HARMONIE/ICON-EU, toteutettu). Satelliitti sopii
  "pilvetön / pilvinen nyt" -tilannekuvaan ja pilvien liikkeen seurantaan.

**4. Suositus**
1. **Ensisijainen: EUMETView WMS, MTG FCI IR 10,5 µm (`mtg_fd:ir105_hrfi`), tasatuntien kuvat
   (Core, CC BY 4.0, maininta "© EUMETSAT").** Paras tarkkuus (1 km), suora WMS EPSG:3857, CORS
   sallittu, ei avainta, kattaa Lapin. Rajoitus: Core = vain tasatunnit -> uusin kuva 30-90 min vanha;
   animaatio viime 3 h = 3-4 kuvaa.
   - Jos EUMETSAT vahvistaa, että EUMETViewin kuvat ovat "Advanced Image Products" (Core), samalla
     toteutuksella 10 min tiheys (~27 min viive) -> vaatimukset täyttyvät. **Kysy EUMETSATilta.**
   - Haku: WMS-kuva on hidas (4-30 s) -> välimuisti tarvitaan. Vaihtoehdot: (a) GitHub Actions /
     Cloudflare-ajastin hakee 1-6 kuvaa PNG:nä gh-pagesille alueelle 5-32 °E, 58-72 °N (512-1024 px,
     ~0,1-0,3 Mt/kuva); (b) Cloudflare Worker -välityspalvelin välimuistilla. (a) sopii nykyiseen
     arkkitehtuuriin.
2. **Vaihtoehto 15 min tiheydelle: MET Norja `europe` IR** (15 min, ~16 min viive, CC BY 4.0
   MET:n tulkinnalla). Haittana karkea koko Euroopan kuva ilman projektiotietoa -> kulmat ja projektio
   pitää selvittää ja kuva vääntää itse; tarkkuus Lapissa huono. Ei suositella ensisijaiseksi.
3. **Lisätaso myöhemmin: NASA GIBS VIIRS I5 Night** (250 m, vapaa, valmiit tiilet) "viime yön tarkka
   kuva" -tasona, ei nowcastiksi (viive tunteja).
4. Ei kelpaa: RainViewer, NOAA GMGSI, FMI/SMHI/DWD (ei avointa satelliittikuvaa).

**5. Työmäärä (karkea)**
- Haku (Python, EUMETView GetMap tasatunneittain, 3-4 viimeisintä kuvaa, PNG gh-pagesille,
  run_guard-tyyppinen tarkistus, Cloudflare-ajastimeen): ~1 pv.
- Sovellus: MapLibre `image`-lähde (EPSG:3857-kuva suoraan, ei uudelleenprojisointia), väritys
  (kylmä = valkoinen, lämmin läpinäkyvä; harmaasävy -> läpinäkyvyys), tasovalikkoon oma rivi tai
  "Pilvet ja sumu" -ryhmään valinta, oma "satelliittiaika" + animaatio viime 3 h (ei mallin
  aikajanaan), lippuun ei arvoa: ~2 pv.
- Kuvakaappaukset, puhelintesti, muistio: ~0,5 pv. **Yhteensä ~3-4 pv.**
- 10 min tiheys EUMETSATin vahvistuksen jälkeen: +0,5 pv. Night Microphysics -taso: +1 pv (ja
  käyttäjäohje väreille).
- Puhelimella myöhemmin: vertaa IR-kuvaa kameroihin muutamana yönä (osuuko pilvetön alue,
  parallaksi).

**6. Täydennys 1: kylmä maa talviyönä (marras-maaliskuu, Lappi)**
- Selkeänä, tyynenä talviyönä lumipinta jäähtyy säteilemällä voimakkaasti (Lapissa usein -25...-40 °C)
  ja syntyy vahva pintainversio: matalan pilven yläosa voi olla JOPA MAANPINTAA LÄMPIMÄMPI
  (esim. stratus -15 °C kylmän maan -30 °C päällä). Infrapunakuvassa (kylmä = valkoinen) selkeä
  lumimaa näyttää silloin pilveltä, ja matala pilvi tummalta "aukolta" -> kontrasti kääntyy.
- Haitta on suurin juuri revontulille tärkeinä öinä: selkeä + tyyni + kova pakkanen. Arvio (yleinen
  meteorologinen tieto + NWC SAF / SMHI PPS -raportit, ei omaa mittausta): marras-maaliskuun selkeinä
  öinä pelkästä IR-kuvasta ei voi luotettavasti erottaa selkeää ja matalapilvistä aluetta suuressa osassa
  Lappia; keski- ja yläpilvet (kylmemmät kuin maa) erottuvat yleensä edelleen. SMHI:n Arktisen
  napayön raportin mukaan "talven ilmakehän olot haittaavat pilvien tunnistusta vakavasti" ja NWC
  SAF:n pilvityyppidokumentaation mukaan lunta ei tunnisteta yöllä ja se voidaan sekoittaa matalaksi
  pilveksi; voimakkaassa inversiossa hyvin matala pilvi voi luokittua keskipilveksi.
  Lähteet: https://smhi.se/publikationer/prototyping-an-improved-pps-cloud-detection-for-the-arctic-polar-night-1.1772 ,
  https://eumetrain.org/node/89 , https://cwg.eumetsat.int/?p=1026
- Johtopäätös: **raakaa IR-kuvaa ei kannata näyttää käyttäjälle "pilvet"-tasona Lapissa talvella.**
  Jos satelliittitaso tehdään, käytetään pilvimaskia (alla), jossa nämä ongelmat on yritetty huomioida
  (useita kanavia + NWP-pintalämpötila), ja kerrotaan infotekstissä, että matala pilvi kovalla
  pakkasella voi puuttua tai näkyä väärin. Varmistettava oikeilla öillä kameroita vasten.

**7. Täydennys 2: pilvimaski- ja pilvityyppituotteet (koehaku 25.10. klo 10.10 UTC, ajo 40183636749)**
- **EUMETView WMS: `msg_fes:clm` "Cloud Mask - MSG - 0 degree"** (EUMETSATin oma keskusprosessointi,
  SEVIRI). Luokat: selkeä vesi / selkeä maa / pilvi / ei käsitelty. **15 min välein, 09:45-tuote saatavilla
  10:10 -> viive ~25 min.** Sama rajapinta, CORS ja ehdot kuin IR-tasolla (ei avainta, AccessConstraints none).
  **Lisenssi: "Derived Product" -> Core (CC BY 4.0) viiveestä riippumatta** (datapolitiikan artikla 4:
  "All SEVIRI, FCI, IRS and LI Derived Products") -> 15 min tiheys sallittu ilman EUMETSATin lupaa.
  Tarkkuus: SEVIRI 3 km nadirissa, Lapissa ~3,4 x 17-21 km (karkeampi kuin MTG:n IR).
- `msg_fes:cth` "Cloud Top Height - MSG" (15 min, Derived Product, Core): pilven yläosan korkeus ->
  matala / keski / ylä -erottelu mahdollinen; sama kulmaongelma.
- **MTG (FCI) pilvimaski** FCI-2-CLM on olemassa (10 min, GRIB2), mutta **ei EUMETViewissä** (ei WMS-tasoa
  koehaussa) -> vain EUMETSAT Data Storesta, joka vaatii (ilmaisen) API-avaimen = reunaehdon vastainen.
  Viive ❓ (julkaistua lukua ei löytynyt). Lisenssi: Derived Product -> Core.
- `mtg_fd:rgb_cloudtype`/`rgb_cloudphase` ovat PÄIVÄTUOTTEITA (näkyvät kanavat), eivät toimi yöllä.
- NWC SAF:n GEO-pilvituotteita (CMa/CT) ei jaeta valmiina karttatiilinä; ne ajetaan omalla NWC SAF
  -ohjelmistolla (rekisteröityminen) -> ei sovi.
- Luotettavuus talvella: myös pilvimaski kärsii kohdan 6 ongelmasta (validointeja napayölle ei löytynyt;
  lauhkean vyöhykkeen yöarvot POD ~93-96 %).

**Suositus päivitetty:** ensisijaisesti **EUMETView `msg_fes:clm` (pilvimaski, 15 min, Core)** näytettynä
yksinkertaisena "pilvinen / selkeä" -kerroksena (pilvi valkoinen läpikuultava, selkeä läpinäkyvä), ja
lisäksi IR-kuva vasta tarvittaessa asiantuntijatilaan. Animaatio viime 1-2 h (4-8 kuvaa). Infoteksti
kertoo kulman ja talven rajoitukset.

**8. Toteutus vasta R2-siirron jälkeen (käyttäjän päätös 2026-10-25)**
Satelliittitaso toteutetaan vasta, kun data on siirretty Cloudflare R2:een. Kuvat haetaan Cloudflare
Worker -ajastimella (`workers/ajastin`-tyyppinen cron, esim. 15 min välein, uusin + viime 1-2 h) ja
tallennetaan **R2:een, EI gh-pagesiin** (gh-pagesin orphan-commit-julkaisu ei sovi 15 min välein
vaihtuville kuville). Sovellus lukee kuvat R2:sta (julkinen osoite / Worker), lähdemaininta
"© EUMETSAT" `ABOUT_SOURCES`:iin.

## Koehaku: MET Nordic -analyysin pilvisyys "pilvitilanne nyt" -tasoksi (2026-10-25, haara claude/met-nordic-koehaku, ei toteutettu)

Koehaku GitHub Actionsilla 25.10. klo 12.48 UTC (työnkulku poistettu). Lähde: MET Norwayn thredds,
`metpplatest/met_analysis_1_0km_nordic_<YYYYMMDDTHH>Z.nc` + `_latest.nc`, muuttuja `cloud_area_fraction` (0-1).

**Tulokset:**
- **Päivitysväli ja viive:** analyysi joka tunti, myös yöllä; katalogin muokkausaika aina tasan **15 min**
  analyysitunnin jälkeen (22.-25.10., kaikki ~64 tuntia, esim. 25.10. 03Z -> 03.15). Katalogissa ~2,5 vrk.
- **Kattavuus:** Lambert-hila 1 km, 1796 x 2321, lat 52,3-73,9 / lon -11,8-41,8. Koko Lappi ja Pohjois-Norja
  (Nordkapp, Kirkenes, Tromssa, Utsjoki, Kilpisjärvi lähin piste <= 0,5 km), myös Murmansk; ei Huippuvuoria.
  Laatikossa 65-71,5 N / 14-32 E arvo 100 %:lla pisteistä, ei aukkoja. Jatkuva arvo (~1000 eri arvoa).
- **Miten pilvisyys lasketaan (MET Nordic -dokumentaatio, metno/NWPdocs wiki "MET-Nordic-dataset"):**
  "Fraction of sky covered by cloud. Bias corrected using webcameras from Luftambulansen. Correction to
  forecast 3 hours into the future. Bilinear interpolation from 2.5 km NWP." Tiedoston `summary`: "Based on
  model data from MEPS (MetCoOp-Ensemble Prediction System) and observations", `source: meps`.
  -> Pilvisyys on **MEPS-mallin (2,5 km, sama MetCoOp-HARMONIE-AROME-malliperhe kuin FMI:n HARMONIE)
  lyhyt ennuste**, jota korjataan Norjan ilmaambulanssin (Luftambulansen) webkameroilla. **Ei satelliittia
  eikä sääasemien pilvihavaintoja.** Suomen Lapissa korjaus on todennäköisesti vähäinen (kamerat Norjassa).
- **Tiedostokoko:** NetCDF ~114 Mt/tunti (kaikki muuttujat; OPeNDAP-haulla vain pilvisyys ~17 Mt float32).
  PNG (harmaa 0-100): koko hila **421 kt**, Lapin rajaus 806 x 837 **82 kt** (vrt. HARMONIE-askel ~75 kt).
- **Lisenssi:** tiedoston `license` = https://www.met.no/en/free-meteorological-data/Licensing-and-crediting
  (thredds: NLOD / CC BY 4.0). Lähdemaininta esim. "Data from MET Norway (MET Nordic)". Thredds on jaettu
  palvelu: lataus kohtuullisesti, WMS vain esittelyyn -> haku palvelimella kerran tunnissa, ei selaimesta.

**Vertailu samalta tunnilta (kuvat docs/kuvakaappaukset/2026-10-25/vertailu-25-12.png ja -03.png, ei repossa):**
- 25.10. 12 UTC: MET Nordic ja HARMONIE (ajo 09 UTC) ovat **lähes identtiset** (sama pilvetön kaista
  Norjan rannikolla, sama pilvinen sisämaa) - odotettavaa, koska molemmat ovat MetCoOp-mallia. MTG IR näyttää
  samaan aikaan pilvikentässä rakennetta (tummempia, lämpimämpiä alueita esim. 20-24 E / 66-68 N), jota malleissa
  ei ole; IR:stä ei kuitenkaan erota matalaa pilveä lämpimästä selkeästä maasta, joten "kumpi on oikeassa"
  jää auki.
- 25.10. 03 UTC (yö): MET Nordic näyttää Lapin lähes täysin pilviseksi (Lapin keskiarvo 95 %), IR:ssä vaihtelevaa.
  HARMONIEta ei saa menneelle tunnille (FMI:n `/download` antaa vain uusimman ajon -> HTTP 400).

**Arvio:** MET Nordic -analyysi ei ole havaittu "pilvitilanne nyt" vaan käytännössä sama malli kuin HARMONIE
(tuntiväli, 15 min viive, 1 km, Norjassa kamerakorjaus). Omana "Pilvitilanne nyt" -valintana se antaisi
käyttäjälle väärän käsityksen havainnosta, ja Suomessa se tuskin poikkeaa HARMONIEn nykyhetkestä. **Ei suositella
"Pilvitilanne nyt" -valinnaksi.** Mahdollinen käyttö myöhemmin: Norjan rannikolla (webkamerakorjaus) tai
HARMONIEn varamallina; tarkempi vertailu vaatisi havaintoja (esim. FMI:n sääasemien pilvisyys `n_man`/
`TotalCloudCover` havaintoasemilta tai keilaimet). Työmäärä, jos toteutetaan silti: ~1 pv (tuntihaku
OPeNDAP:lla Actionsissa/R2:een, Lambert -> lat/lon -näytteistys `Resampler`illa, PNG, uusi lähde
`CLOUD_MODELS`:iin tai oma valinta "Pilvet ja sumu" -ryhmään).

## Selvitys: MNWC-lähiennuste Tänä yönä -välilehdelle (2026-10-25, haara claude/mnwc-selvitys, kesken)

Koehaut GitHub Actionsilla 25.10. klo 16.05-16.07 UTC (väliaikainen työnkulku `mnwc-probe.yml`).

**1. MNWC EI ole FMI:n avoimessa datassa:**
- WFS `listStoredQueries`: ennustekyselyt vain `ecmwf::forecast::*`, `fmi::forecast::harmonie::*`,
  `fmi::forecast::meps::*`, `fmi::forecast::edited::weather::scandinavia::*` sekä ilmanlaatu, meri, aallot,
  hydrologia ja ilmastoskenaario. Ei yhtään kyselyä, jonka nimessä tai kuvauksessa olisi mnwc/nowcast.
- `/download`: tuottajat `mnwc`, `mnwc_scandinavia(_surface)`, `mnwc_surface`, `nowcast*`, `meps_*` -> HTTP 400
  (`harmonie_scandinavia_surface` toimii). `/timeseries?producer=mnwc` -> "Unknown producer name 'mnwc'".
- MET Norwayn thredds (sääennusteet): MEPS, AROME Arctic, MET Nordic, MET Radar Nowcasting - ei MNWC:tä.

**Löydetty vaihtoehto: FMI:n editoitu ennuste (meteorologien ennuste) `pal_skandinavia`:**
- WFS `fmi::forecast::edited::weather::scandinavia::grid` (GRIB1/GRIB2/NetCDF) ja point-kyselyt,
  `/download?producer=pal_skandinavia&param=TotalCloudCover&...`, `/timeseries?producer=pal_skandinavia`.
- Sisältää `TotalCloudCover` (%). Alue -9,1-45,3 E / 52,7-72,6 N (koko Lappi ja Pohjois-Norja).
- Päivittyy noin tunnin välein (origintime 14.41 ja 15.40 UTC; haku klo 16.07). Ulottuu 10 vrk eteen.
- `/timeseries` palauttaa ajat Suomen ajassa (vyöhyke huomioitava).
- Avoin: tuottaako editoitu ennuste ensimmäiset tunnit MNWC:n tai muun lähiennusteen pohjalta (FMI:n
  dokumentaatio tarkistettava), tarkka viive, hilaväli ja aika-askel.
