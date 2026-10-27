# OPIT: mitä Revontulivahdista (Revontuliennuste / Aurora Weather, ent. AuroraAwesome) kannattaa viedä seuraavaan karttasovellukseen

Koottu 2026-10-25 repon muistioista (MUISTIO-*.md), CLAUDE.md:stä ja KATSELMOINTI.md:stä.
Yksityiskohdat ja mittaukset löytyvät niistä. Tässä on vain se, mikä pätee myös muualla.
Dokumentissa ei ole avaimia, kanavien nimiä eikä muita salaisuuksia.

---

## 1. Käyttöliittymä: periaatteet ja perustelut

**Mobiili edellä**
- Suunnittelu ja testaus tehdään ensin 360–430 px:n pystynäkymälle. Leveällä näytöllä riittää, ettei mikään ole rikki.
- Kohteena on lopulta natiivisovellus (Capacitor), joten selaimen osoitepalkkia ei huomioida.
- Lovi ja kotipalkki: `viewport-fit=cover` + `env(safe-area-inset-*)` kaikille kiinteille elementeille.
- Sivu ei saa koskaan zoomautua, vain kartta. Keinot:
  - `user-scalable=no`;
  - `touch-action:manipulation` käyttöliittymälle (ei kartalle);
  - iOS:n `gesture*`-tapahtumille `preventDefault`;
  - tekstikentät vähintään 16 px (muuten iPhone zoomaa kenttään).
- Kartta ei käänny eikä kallistu. Käyttäjät eivät kaivanneet sitä, ja kääntyminen sotki suunnan hahmottamisen.

**Tasovalikko ja pikapalkki (3. versio, monen kierroksen jälkeen)**
- ☰ avaa oikealta liukuvan lasipaneelin.
  - Rivi = ikoni + nimi + kytkin oikealla, vaihtoehdot pillereinä rivin alla.
  - Nimi on aina samanvärinen: tila näkyy vain kytkimestä ja valitusta pilleristä.
- Pois kytketty ryhmä näyttää pillerinsä himmeinä, ja valinta säilyy. Pillerin napautus kytkee ryhmän päälle, joten kahta napautusta ei tarvita.
- Asetukset, tietoja ja selitteet ovat paneelin sisäisiä näkymiä ("‹ Tasot"), eivät päällekkäisiä ikkunoita.
  - Tasokohtaiset i-napit ja ponnahdusikkunat poistettiin: yksi i-nappi otsikon vieressä riittää.
- Sulkeminen: ☰ muuttuu ruksiksi, kartan napautus ja pyyhkäisy oikealle sulkevat. Esc sulkee kerroksittain sisältä ulos.
- Pikapalkki on kiinteä lista (ei käyttäjän järjesteltävä, ei nastoja) ja näyttää saman tilan kuin valikon kytkin.
  - Koko palkin voi piilottaa yhdellä asetuksella. Yksittäisten nappien piilotus poistettiin, koska se monimutkaisti asettelua.
- Oma sijainti on aina näkyvissä, erillään muista napeista.
- Napit, jotka avaavat näkymän (ei tasoa), saavat korostuksen vain näkymän ollessa auki.

**Poissulkevat tasot**
- Pilvet, ala-, keski- ja yläpilvet sekä sumu ovat yksi valinta kerrallaan, koska päällekkäin ne olisivat lukukelvottomia.
- Jos valitulta mallilta puuttuu valitun tason data, valinta **säilyy** himmeänä ja kartalle ei piirretä mitään. Lippuun tulee "ei saatavilla tällä mallilla".
  - Kun vaihdetaan malliin, jolla data on, taso näkyy heti.
  - Automaattinen paluu oletukseen hämmensi käyttäjää.

**Aika ja luvut**
- Aikajana ohjaa vain ennustetasoja. Nowcast-data (revontulet, avaruussää) on aina nykyhetkeä, eikä sitä ekstrapoloida.
- Indeksi ei koskaan yhdistä eri ajankohtien dataa.
- "Nyt"-näkymä lasketaan aina `new Date()`:llä aikajanasta riippumatta.
- Aikajanan liikuttaminen ei saa siirtää mitään muuta elementtiä (kiinteät paikat, tasaukset).
- Kaikki kellonajat näytetään puhelimen aikavyöhykkeellä. "Yö" rajataan kuitenkin pisteen pimeän jakson ja aurinkoajan mukaan, ei kalenteripäivästä.
- Puuttuva arvo on "–", ei keksitty oletus. Esimerkki: Kp 2 puuttuvan tilalla antoi vääriä prosentteja.
- Kartan väri ja klikkauksen lukuarvo lasketaan **samalla kaavalla samasta hilasta**. Muuten käyttäjä näkee "28 %" kohdassa, jossa ei ole pilveä.

**Kosketusalueet ja eleet**
- Kosketusalue on vähintään 44 px myös silloin, kun piirros on pienempi (esim. `::after`-alue tekstinapin yläpuolelle).
- Vetopaneeli:
  - koko yläosa on vetoalue;
  - alle 10 px liike = napautus, pystyliike = veto, vaakaliike = ei vetoa.
- Kaavioiden tarkastelussa käytetään touch-tapahtumia, ei pointer-tapahtumia: iOS katkaisee pointerit vierityksen alkaessa.
- Pitkä painallus kartalla:
  - 550 ms ja liike alle 10 px;
  - seuraava klikkaus ohitetaan;
  - `-webkit-touch-callout:none`;
  - hiirellä myös `contextmenu`.
- Takaisin-ele sulkee vain päällimmäisen ikkunan: jokainen ikkuna tarkistaa oman `history.state`-merkintänsä.

**Esikatselu ennen yhdistämistä**
- Haara julkaistaan omaan kansioonsa (`esikatselu/<haara>/`), joka lukee tuotannon datan eikä rekisteröi service workeria.
- Käyttäjä testaa puhelimella, ja vasta sitten yhdistetään. Tämä paljasti useita ongelmia, joita kuvakaappaukset eivät näyttäneet.

**Lähdemaininnat käyttöliittymässä**
- Yksi "Tietoja ja lähteet" -näkymä luettelosta (`ABOUT_SOURCES`).
- Kartan kulmassa leveällä näytöllä pysyvä OSM-maininta.
- Puhelimella OSM-maininta 5 s käynnistyksessä tai kunnes karttaa kosketaan (OSM:n ohje).
- Ilmakuvapohjalla sen maininta näkyy aina.

---

## 2. Datalähteet

**Mallit**

| Malli | Tarkkuus | Alue | Horisontti | Haku |
|---|---|---|---|---|
| ECMWF IFS Open Data | 0,25° | 55–85 °N, 30 °W–60 °E | 48 h / 3 h (7 vrk -ruudut 216 h) | `ecmwf-opendata`, varalla AWS |
| ICON-EU (DWD) | ~7 km natiivi | 55–70,5 °N | 30 h / 1 h (DWD tarjoaa 78 h) | GRIB2 suoraan opendata.dwd.de |
| HARMONIE (FMI) | ~5 km (natiivi 2,5) | 55–73,5 °N, 1 °W–35 °E | 30 h / 1 h | FMI `/download`, kaikki askeleet yhdellä kutsulla |

- Avaruussää: NOAA SWPC.
  - OVATION päivittyy 5 min välein.
  - Kp: minuuttiarvio ja 3 h jaksot.
  - Aurinkotuuli rtsw 1 min.
- Kp nyt -arvo ei koskaan tule ennustetiedostosta.
- **Tarkista rajapinnan todellinen horisontti ja kattavuus koehaulla, älä oleta.** Kaksi esimerkkiä:
  - 12 h horisontti oli oma varovaisuus, ei rajapinnan raja.
  - HARMONIEn suorakulmaisen latauksen kulmat ovat NaN, koska mallin alue on vino.

**Kattavuus: tiukka linja**
- Arvo näytetään vain valitun mallin alueella, ei varamallia.
- Ulkopuolella "ei dataa" + yhden rivin ehdotus mallista, jonka alueella piste on.
- Alueen raja piirretään kartalle.
- Pilvien ja tuulen alue tulee yhdestä jaetusta vakiosta per malli (`model_areas.py`), jotta ne eivät erkane.

**Pakkaus**
- 0–100-arvoinen hila harmaasävy-PNG:nä + base64, ei JSON-lukutaulukkona: ICON-EU 5,2 Mt → 0,48 Mt per askel.
- Tuuli U/V tavuiksi [−80, 80] m/s. Huomaa, että 0 purkautuu arvoksi +0,31: kvantisointi kannattaa keskittää.
- Näkyvyys tallennetaan muodossa näkyvyys/50 m (0–100).
- Selain purkaa PNG:n itse (`DecompressionStream`), ei canvasin kautta (ks. kohta 4).

**Latausjärjestys ja laiska lataus**
- Kirjasto ja ensisijainen data haetaan rinnakkain. Toissijainen data haetaan, kun ensisijainen on valmis tai 15 s on kulunut.
  - Hidas 3G: pilvet 61,5 s → 21,2 s.
- Malli = pieni meta-tiedosto + tiedosto per aika-askel. Selain hakee vain tarvitsemansa askeleet ja näyttää sillä välin lähimmän ladatun.
- Kerrokset ja sumu ovat omissa tiedostoissaan, ja ne haetaan vasta valittaessa.
- Askeltiedostoon kirjoitetaan ajon tunniste. Askel hylätään, jos se on eri ajosta kuin meta.

**Julkaisu ja varalähteet**
- Data haetaan Actionsilla valmiiksi staattisiksi tiedostoiksi `gh-pages`-haaralle. Haara on yksi orpokommitti, joka korvaa edellisen, joten se ei kasva.
  - `main` sisältää vain koodin. Aiemmin data-commitit kasvattivat repon noin 300 Mt:iin.
- Julkaisevat jobit kuuluvat yhteen concurrency-ryhmään, koska force-push ei varoita ylikirjoituksesta.
  - Haku (rinnakkain) ja julkaisu (sarjassa) ovat eri jobeja.
- Julkaisu tapahtuu vain mainista. Haara-ajot jättävät datan artefaktiksi.
- GitHubin `schedule` toteutui vain 3–5 h välein. Pääajastimeksi tuli Cloudflare Worker (`workflow_dispatch`), ja GitHubin cron jäi varalle vahtijobin kanssa.
- Keskeneräinen mallinajo ei julkaise mitään: edellinen ajo jää voimaan (`run_guard.py`).
- ECMWF: pääportaali ja lyhyen yrityksen jälkeen AWS. Käytetty lähde kirjataan dataan.

**Verkko ja puuttuva data**
- Kaikki haut yhden funktion kautta:
  - aikakatkaisu 15 s;
  - 3 yritystä;
  - taustayritys 30 s → 5 min;
  - epäonnistunut askel muistetaan, ettei sitä haeta joka ruudunpäivityksellä.
- Ilman yhteyttä toimitaan kuten Windy: tallennettua säädataa ei näytetä, vain pohjakartta ja yhteyspalkki.
  - iPhone voi väittää `onLine=true` lentokonetilassa, joten myös oma verkkovirhe tulkitaan katkokseksi.
- Vanhentunut data on `null`, ei hiljaa "viimeisin arvo". Ikäraja asetetaan joka lähteelle: OVATION, Kp, pilvihilan aikaväli.

---

## 3. Lisenssit ja lähdemaininnat

| Lähde | Ehto | Huomio |
|---|---|---|
| OpenStreetMap | ODbL 1.0, "© OpenStreetMap contributors" | Kulmamaininta tai 5 s käynnistyksessä + Tietoja-näkymä |
| OpenFreeMap (tiilet) | MIT, ei avainta | Kaupallinen käyttö sallittu |
| OpenMapTiles-skeema | BSD-3 / CC BY 4.0 | |
| Natural Earth | Public domain | |
| AWS Terrain Tiles (Terrarium) | Attribuutio pakollinen (Kartverket, Copernicus EU-DEM, ArcticDEM, USGS, NOAA) | Maastovarjostus |
| Esri World Imagery | "Powered by Esri" + lähteet aina näkyvissä | **Kaupallinen käyttö avaimettomalla palvelulla ei todennäköisesti sallittu.** Vaihda tai sovi kirjallisesti ennen kauppaversiota |
| ECMWF Open Data | CC BY 4.0 (täysin avoin 1.10.2025 alkaen) | |
| DWD | © DWD, GeoNutzV | Kaupallinen käyttö sallittu |
| FMI | CC BY 4.0 | |
| NOAA SWPC | Public domain | |
| EUMETSAT | Core-tuotteet CC BY 4.0 "© EUMETSAT" | Tuoreet Level 1 -kuvat kaupallisesti lisenssillä. Data Store vaatii avaimen. Varmista kirjallisesti |
| Kamerat: YouTube | YouTuben ehdot | Pikkukuva suoraan YouTubesta, ei kopioita. Soitin upotetaan vasta napautuksesta (nocookie) |
| Kamerat: still-kuvat | Omistajan lupa, kirjataan dataan (`lupa`) | Kauppaversioon vain "public domain" tai "myönnetty" |
| MapLibre GL JS | BSD-3 | Lisenssi kirjaston mukana `lib/` |
| Lucide / Feather | ISC / MIT | Ilmoitus "kaikissa kopioissa": `index.html`:n alussa + `THIRD_PARTY_LICENSES.md` |
| Fontit | SIL OFL 1.1 | |

- Vältettiin Open-Meteo: kaupallinen käyttö maksullista ja kattavuusongelmia.
- Vältettiin CARTO: alkoi vaatia avaimen.
- Sääntö: ei avaimia koodissa, selaimessa eikä repossa.
  - Palvelinpuolen avain on sallittu salaisuuksissa, jos ehdot sallivat käytön.
  - Avaimen puuttuminen näkyy debugissa eikä kaada sovellusta.

---

## 4. Virheet ja umpikujat

**WebGL ja kartta**
1. **`UNPACK_ALIGNMENT`**
   - Mitä tapahtui: hilan leveys ei ollut jaollinen 4:llä, ja kuva vinoutui rivi riviltä.
   - Mitä tehtiin: `pixelStorei(UNPACK_ALIGNMENT,1)` joka kerta ennen `texImage2D`:tä, koska MapLibre nollaa tilan.
2. **NPOT-tekstuuri + REPEAT (WebGL1)**
   - Mitä tapahtui: tekstuuri oli "epätäydellinen" ja piirtyi ruudukkona. Shaderin korjailu ei auttanut.
   - Mitä tehtiin: `CLAMP_TO_EDGE` + `NEAREST`, ja interpolointi itse shaderissa.
3. **Bikubisen interpoloinnin reunaraja eri kuin bilineaarisen**
   - Mitä tapahtui: `texSize-2.0001` antoi Catmull-Romilla 0,98:n virheen hilan reunalla.
   - Mitä tehtiin: raja `texSize-1`. Opittiin simuloimaan koko arvoalue, myös reunat.
4. **Shaderin "kosmeettinen" kohina**
   - Mitä tapahtui: kohina heilutti näkyvää arvoa ±45 prosenttiyksikköä, ja käyttäjä huomasi ristiriidan.
   - Mitä tehtiin: kohina poistettiin. Pehmeät reunat tulevat pelkästä interpoloinnista.
5. **Float32-sijainnit lähizoomilla**
   - Mitä tapahtui: hiukkaset napsahtivat riveihin.
   - Mitä tehtiin: Float64 + piirto näkymän keskipisteen suhteen.
6. **Nopeus zoomin mukaan**
   - Mitä tapahtui: MapLibren zoom perustuu 512 px:n tiileen, joten 256-vakio antoi 2x virheen. Löytyi vasta simuloimalla.
7. **Kiertyvä indeksi**
   - Mitä tapahtui: `Math.round(lon)` voi antaa 360, joka on litteässä taulukossa seuraavan rivin solu. Tuloksena pystysauma 0°:ssa.
   - Mitä tehtiin: `% 360` pyöristyksen jälkeen.
8. **Polygonin reunaviiva piirtää myös tiilirajan**
   - Mitä tapahtui: meri oli kahtena polygonina tiilirajalla, ja kartalle tuli musta pystyviiva.
   - Mitä tehtiin: rantaviiva koottiin itse GeoJSONiksi ja tiilirajan reunat pudotettiin.
9. **`preventDefault` MapLibren tasoklikkauksessa ei estä yleistä click-kuuntelijaa**
   - Mitä tehtiin: päätös tehdään yhdessä käsittelijässä (`queryRenderedFeatures`).
10. **`queryRenderedFeatures({x,y})` antoi väärän kohteen**
    - Mitä tehtiin: syötteeksi `[x,y]` tai Point.
11. **WebGL-kontekstin menetys (iOS taustalta)**
    - Mitä tapahtui: omat tasot eivät palaudu itsestään.
    - Mitä tehtiin (2026-10-25): `webglcontextrestored` → omien tasojen valmiustilat ja GPU-oliot unohdetaan ja tyyli rakennetaan uudelleen (`recoverGLContext`). Ilman tätä koko kartta jäi mustaksi, ei vain omat tasot: MapLibre 3.6.2 ei lataa tiiliä uudelleen palautuksessa.
    - Testaus: `WEBGL_lose_context` (`loseContext()` → `restoreContext()`) headless-Chromiumissa; vertailuajo ilman korjausta.

**Data ja selain**
12. **Canvas-takaisinluku ei ole datakanava**
    - Mitä tapahtui: iOS Safari ja Brave lisäävät kohinaa, ja `Uint8Array` kiersi ylivuodon (260 → 4). Täyspilvisiin kohtiin tuli reikiä vain iPhonella.
    - Mitä tehtiin: PNG puretaan itse ja arvot rajataan aina.
13. **GRIB2:n pituusastekonventio vaihtelee**
    - Mitä tehtiin: normalisoidaan ensin.
14. **Harvennus**
    - Mitä tehtiin: aina lohkokeskiarvo ja keskitetty koordinaatti. Lohkon kulmaan merkitty arvo siirsi kenttää 4 km.
15. **Jaetun vakion yhdistäminen väärään suuntaan**
    - Mitä tapahtui: tuulen alue kavennettiin pilvien kapeampaan alueeseen.
    - Mitä tehtiin: ennen yhdistämistä tarkistetaan, kumpi arvo oli parempi.
16. **"Kutistuva aikajana"**
    - Mitä tapahtui: horisontti oli liian lähellä hakuväliä. Toisella kerralla syy olikin data: työnkulun push epäonnistui hiljaa.
    - Mitä tehtiin: Actions-historia ja julkaistu tiedosto tarkistetaan ennen kuin epäillään koodia.
17. **Git-kilpajuoksut Actionsissa**
    - Mitä tapahtui: `pull --rebase` likaisella työpuulla nieltiin `|| true`:lla, ja matrix-jobit kilpailivat keskenään.
    - Mitä tehtiin: lopulta orpokommitti-julkaisu ja yksi sarjallistettu julkaisujobi.
18. **Service worker**
    - Mitä tapahtui:
      - Ilman version nostoa käyttäjä jäi vanhaan koodiin.
      - Asennus haki tiedostot HTTP-välimuistin kautta, ja uusi `index.html` sai vanhan `i18n.js`:n.
      - Ensikäynnillä `clients.claim()` latasi sivun uudelleen.
    - Mitä tehtiin: version nosto automatisoitiin pre-commit-hookilla ja asennus käyttää `cache:'reload'`.
    - Mitä tehtiin (2026-10-25): uudelleenlataus vain, jos sivua jo ohjasi service worker tai käyttäjä painoi päivitysilmoitusta. Pelkkä "oliko ohjaaja" -ehto ei riitä: ensimmäisen käynnin aikana tuleva päivitys jäisi lataamatta.
19. **Ulkoinen "live"-kuva ei ole live**
    - Mitä tapahtui:
      - Kanava voi pitää live-osoitteessa kiinteää kansikuvaa.
      - Yhden hetken tavuvertailu antoi vääriä positiivisia.
      - Vanha oma seurantadata näytti kameran jäätyneen.
    - Mitä tehtiin:
      - Signaalin pitää pysyä ajan yli.
      - Myös oman datan ikä tarkistetaan.
      - Epäluotettava lippu ei saa koskaan piilottaa sisältöä.
20. **CORS**
    - Mitä tapahtui: kuvan saa näyttää, mutta sen tavuja ei voi lukea.
    - Mitä tehtiin: tiivisteet lasketaan palvelinpuolella, ja selain lukee pienen JSONin samalta originilta.
21. **Julkaisu ei näkynyt**
    - Mitä tapahtui: GitHub Pages jätti joskus julkaisuajon käynnistämättä.
    - Mitä tehtiin: tarkistetaan, onko viimeisimmälle gh-pages-commitille ajo, ja tehdään tarvittaessa uusi commit.
22. **Template literal ja backtick kommentissa katkaisi shaderin**
    - Mitä tehtiin: jäsennin ajetaan aina muokkauksen jälkeen.

**Umpikujat (selvitetty, ei toteutettu)**
- MNWC ei ole avointa.
- MET Nordic -analyysi ei tuonut lisäarvoa.
- Satelliitti-IR: lisenssit ja viive (≥ 1 h) rajoittavat. Jätettiin esikatseluun.
- Täysi GPU-ping-pong-advektio tuulelle: CPU-advektio on varmempi ja riittää.

---

## 5. Työtapa

**Toimeksiannot**
- Tehtävä = oma haara `claude/<aihe>` mainista, pienet commitit, push aina (myös keskeneräisenä).
- PR ja yhdistäminen vain pyynnöstä, merge-tavalla.
- "Mitä mieltä?" tarkoittaa, että vastataan eikä toteuteta.
- Pieni epäselvyys: järkevä tulkinta kirjataan muistioon. Iso epäselvyys: kysytään ensin.
- Vastaukset lyhyesti, tulos ensin, puhelimella luettavaksi.
- Päätökset kirjataan heti aihemuistioon ja tiiviisti CLAUDE.md:hen, aina päiväys ja "käyttäjän päätös" -merkintä.
- Raportissa kerrotaan "mitä testattiin missä": headless, synteettinen vai oikea data, ja mikä jäi testaamatta.

**Testit**
- Laskenta on puhtaina funktioina yhdessä tiedostossa (`aurora-core.js`), sama koodi selaimessa ja Node-hälytyksissä. Yksikkötestit: `node --test`, ei riippuvuuksia.
- `check-i18n.mjs`: samat avaimet kaikilla kielillä ja jokainen HTML:n avain määritelty.
- Pythonin hakulogiikalle testit (`run_guard`, `grid_resample`). CI ajaa testit joka haaralle.
- Väitteet todennetaan mittaamalla tai simuloimalla, ei lukemalla. Useampi vakava bugi löytyi vasta Python-simulaatiolla tai pikselimittauksella.
- Ulkoiset rajapinnat eivät näy kehitysympäristöön. Muoto, CORS ja horisontti tarkistetaan väliaikaisella koehakutyönkululla:
  - käynnistyy, kun `.github/<nimi>.env` muuttuu `claude/**`-haaralla;
  - ei julkaise eikä ajastu;
  - poistetaan lopuksi.
- Työnkulku on valmis vasta, kun se on ajettu onnistuneesti oikeassa GitHubissa. Syntaksitarkistus ei todista logiikkaa.

**Kuvakaappaukset**
- `scripts/screenshots.mjs` (Playwright).
- Koot: 360x640, 390x844, 430x932, 412x915, tabletti ja työpöytä.
- Lovi ja kotipalkki simuloidaan CDP:n `setSafeAreaInsetsOverride`-komennolla.
- `--offline`: synteettinen data asettelun tarkistukseen.
- Tilakohtaiset näkymät, ja toimintatestit omina tiloinaan (esim. tallennus → uudelleenlataus → muutos → poisto).
- Jokaisen käyttöliittymämuutoksen jälkeen vähintään 360x640, 430x932 ja työpöytä. Tärkeimmät kuvat lähetetään keskusteluun.
- Kuvat ovat simulaatioita. Loppuun kirjataan aina, mitä pitää tarkistaa oikealla puhelimella: eleet, paikannus, näppäimistö, lovi.

**Salaisuudet**
- Avaimet vain GitHubin tai Cloudflaren salaisuuskenttiin, ei koodiin, lokeihin, muistioihin eikä keskusteluun.
- Ilmoituskanavien nimiäkään ei kirjoiteta mihinkään.
- Ohjeet (OHJE-*.md) kertovat, mihin kenttään avain laitetaan, eivät avainta.
- Actions:
  - työnkulun tasolla `contents: read`, kirjoitus vain julkaisujobille;
  - `persist-credentials: false`;
  - Python-paketit lukittuina versioina ja tiivisteinä;
  - julkaisu vain mainista.
- Palautelinkit allekirjoitetaan (HMAC) Workerissa.

---

## 6. Uudelleenkäytettävät osat

| Tiedosto / funktio | Mitä tekee | Muutettava yleiskäyttöiseksi |
|---|---|---|
| `aurora-core.js`: `sampleGridField`, `catmullRom`, `gridGeom`, `cloudCovers` | Hilan näytteistys ja kattavuus | Nimet pois pilvisidonnaisuudesta. Hilan kuvaus (`lat0..lat1`, n) yhdeksi tyypiksi |
| `aurora-core.js`: `sunAltitude`, `darkPeriod`, `weekWindows`, kuu | Aurinko, pimeys, yöt pisteen aurinkoajassa | Sellaisenaan, raja-arvot parametreiksi |
| `aurora-core.js`: `mvtLayerPoints`, `nearestPlaceName`, `tilesAround` | Oma MVT-purku ja lähin paikannimi OpenMapTiles-tiilistä ilman geokoodauspalvelua | Luokkalista ja kenttänimet parametreiksi |
| `aurora-core.js`: `places*` | Versioitu tallennusmuoto, raja, migraatio, viallisen datan talteenotto | Tallennus abstraktiksi (localStorage ↔ natiivitallennus) |
| `index.html`: `fetchJSON`, `netSWR`, `NET_SRC`, `netRecover`, `ensureLazyStepLoaded` | Aikakatkaisu, uusinta, lähteiden tila, laiska askel-lataus, epäonnistumisten muisti | Irrotetaan omaksi moduuliksi. `index.html` on liian iso (yksi tiedosto) |
| `index.html`: `CWG_FRAG` + pilvitaso (custom layer), `decodePngGray` | Bikubinen data-tekstuuri WebGL:ssä, alfa hakutaulusta, PNG-purku ilman canvasia | Värit ja käyrä parametreiksi. Kontekstin palautus mukaan |
| `index.html`: `windParticleLayer`, `WIND_PARTICLE` | Tuulihiukkaset (CPU-advektio, Float64, tiheys näkyvän alan mukaan) | U/V-lähde rajapinnan taakse |
| `index.html`: `bindChartScrub`, `chartReadout`, `.ch-*` | Kosketusystävällinen kaavio ja arvoikkuna | Omaksi komponentiksi |
| `index.html`: `renderLayerMenu`, `lmGroup`, `lmPills`, `ACTIONS`, `BTN_STACK` | Tasovalikko, pikapalkki ja tilan synkronointi | Tasomäärittelyt dataksi. Nyt osin kovakoodattu |
| `index.html`: `buildCoastBorderLayers`, `rebuildCoastLines`, `detailLevels`, `BASEMAP_GENERAL` | Windy-tyylinen OpenFreeMap-pohja, saumaton rantaviiva, tarkkuustasot | MapLibren sisäiset kentät (`_vectorTileFeature`) ovat versioriippuvaisia. Testaa uudella versiolla |
| `i18n.js` + `scripts/check-i18n.mjs` | Kevyt `t(avain,{muuttujat})` + tarkistus | Escapoi muuttujat ennen `innerHTML`:ää (katselmoinnin löydös) |
| `scripts/grid_resample.py`, `cloud_png.py`, `run_guard.py`, `model_areas.py` | Harvennus, PNG-pakkaus, keskeneräisen ajon esto, jaetut alueet | Sellaisenaan |
| `.github/actions/publish-pages`, `esikatselu.yml`, `ajastin-vahti`, `workers/ajastin` | Orpokommitti-julkaisu, haaraesikatselu, ulkoinen ajastin | Polut, tiedostolista ja haaran nimi parametreiksi |
| `.githooks/pre-commit` | Version ja SW-välimuistin automaattinen nosto | Tiedostolista ja versiorivin malli parametreiksi |
| `scripts/screenshots.mjs` + `offline-fixtures.mjs` | Kokoruudukko, lovi-simulaatio, offline-data, toimintatestit | Tilat ja fixturet sovelluskohtaisiksi tiedostoiksi |

**Seuraavalle projektille rakenteeksi**
- Jaa sovellus moduuleihin alusta asti, älä yhteen `index.html`:ään.
- Hila- ja verkko-osat omiksi paketeikseen.
- Tasot rekisteristä (data), ei koodista.
