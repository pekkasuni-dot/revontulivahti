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
