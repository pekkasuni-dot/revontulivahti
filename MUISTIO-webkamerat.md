# Muistio: webkameraselvitys — revontulikamerat

**PÄIVITYS (vaihe 1 TOTEUTETTU):** Osien 1-4 alla kuvattu selvitys ja
suositus on nyt osittain TOTEUTETTU haarassa `feature/revontulikamerat-kartta`
(haarautuu tästä `feature/revontulikamerat`-haarasta — main yhä koskematta).
Toteutuksen kuvaus ja seurannan oikeat tulokset: ks. osio "5. Toteutus
(vaihe 1: YouTube)" tiedoston LOPUSSA. Alkuperäinen selvitysosio (1-4) on
jätetty muuttumattomana historiatiedoksi.

---

Haara: `feature/revontulikamerat`. Main koskematta. **Pelkkä selvitys — ei
yhtään koodiriviä kameroita varten on kirjoitettu.**

**TÄMÄ VERSIO KORVAA aiemman Digitraffic-suosituksen.** Digitraffic-
kelikamerat hylätty: ne kuvaavat TIETÄ, eivät taivasta (vahvistettiin
edellisessä selvityksessä) — eivät vastaa tavoitetta "kamerat joista opas
näkee taivaan tilanteen", kuten My Aurora Forecast -sovelluksessa.

## 1. Kartoitus Pohjoiskalotilta

Lähtökohtana SpaceWeatherLiven webkameralista
(spaceweatherlive.com/en/auroral-activity/webcams.html) — **haettu
OIKEASTI** (WebFetch) ja täydennetty hakutuloksilla tehtävänannon
nimeämille esimerkeille (Northern Lights Alert, Lyngen North, Aurora
Reykjavík).

| Nimi | Ylläpitäjä | Koordinaatit (likim.) | Tyyppi | Kuvaako taivasta? | Talvikaudella päällä? | Linkki |
|---|---|---|---|---|---|---|
| **Levi, Suomi** | Starlapland / Samuli Korvanen | 67.80°N, 24.80°E | YouTube (24/7-striimi) | KYLLÄ, pohjoisnäkymä | KYLLÄ (todettu toiminnassa) | youtube.com/watch?v=rKfecmmzzw0 |
| **Kilpisjärvi, Suomi** | Starlapland / Samuli Korvanen | 69.05°N, 20.79°E | YouTube (24/7-striimi) | KYLLÄ, pohjoisnäkymä | KYLLÄ (todettu toiminnassa) | youtube.com/watch?v=ccTVAhJU5lg |
| **Posio, Suomi** | Hotel Lapin Satu | 66.08°N, 28.17°E | YouTube ("LIVE 24/7 Northern Lights & Sky Cam") | KYLLÄ | KYLLÄ (todettu toiminnassa) | youtube.com/watch?v=iOmco6eIa-0 |
| **Lyngen North, Norja** | Lyngen North (iglumajoitus) | ~69.75°N, 20.6°E (Rotsund/Spåkenes) | YouTube | KYLLÄ, suunnattu Lyngenin vuorille | KYLLÄ (todettu toiminnassa) | youtube.com/watch?v=eYUL0ctwYtM |
| **Aurora Reykjavík, Islanti** | Aurora Reykjavík – The Northern Lights Center | ~64.14°N, -21.9°E | YouTube (virallinen, 24/7) | KYLLÄ | KYLLÄ (todettu toiminnassa) | youtube.com/watch?v=6xOnr8Ukeb0 |
| **Sodankylä (UCL), Suomi** | SGO/University College London -yhteistyö | 67.42°N, 26.39°E | Suora kuva (.jpg) | KYLLÄ, all-sky | Oletettavasti (talven revontulikamera) | sgo.fi/Data/RealTime/Kuvat/UCL.jpg |
| **Skibotn, Norja** | UiT / Tromsø Geophysical Observatory | 69.35°N, 20.37°E | Suora kuva (.png) | KYLLÄ, all-sky | KYLLÄ (päivittyy n. 1 min välein pimeän aikaan) | fox.phys.uit.no/ASC/Latest_ASC01.png |
| **Kiruna, Ruotsi** | IRF (Institutet för rymdfysik) | 67.84°N, 20.41°E | Suora kuva (.jpeg) | KYLLÄ, all-sky | Oletettavasti | irf.se/alis/allsky/krn/latest_medium.jpeg |
| **Hankasalmi, Suomi** | FMI/MIRACLE-verkko | 62.30°N, 26.65°E | Suora kuva (.jpg) | KYLLÄ, all-sky | KYLLÄ (tuore, todettu) | aurorasnow.fmi.fi/public_service/images/latest_SIR_AllSky.jpg |
| **Nyrölä, Suomi** | FMI/MIRACLE-verkko | 62.34°N, 25.51°E | Suora kuva (.jpg) | KYLLÄ, all-sky | Oletettavasti | aurorasnow.fmi.fi/public_service/images/latest_SIR.jpg |
| **Kirkkonummi, Suomi** | FMI/MIRACLE-verkko | ~60.1°N, 24.4°E | Suora kuva (.jpg) | KYLLÄ, all-sky | Ei tarkistettu | aurorasnow.fmi.fi/public_service/images/latest_HOV.jpg |
| **Helsinki, Suomi** | FMI/MIRACLE-verkko | 60.17°N, 24.94°E | Suora kuva (.jpg) | KYLLÄ, all-sky | **EI — TODETTU VANHENTUNUT** (Last-Modified 29.5.2026, ei siis päivity enää) | space.fmi.fi/MIRACLE/RWC/latest_HEL.jpg |
| **Syrjävaara Dark Sky Park, Suomi** | Syrjävaara | ~63.0°N, 28.5°E | Suora kuva (.jpg) | KYLLÄ | KYLLÄ (tuore, todettu) | syrjavaara.fi/img/syrjavaara_latest_img.jpg |
| **Abisko, Ruotsi** | Lights Over Lapland AB | 68.36°N, 18.82°E | JS-soitin (ei suoraa kuva-URL:ia löydetty) | KYLLÄ (markkinoitu nimenomaan revontulikamerana) | KYLLÄ (yritys toimii talvikaudella) | lightsoverlapland.com/aurora-webcam/ |
| **Abisko, Ruotsi (2.)** | Fabian Wimmer | 68.36°N, 18.82°E | Ei tarkistettu teknisesti | KYLLÄ (all-sky, markkinoitu) | Ei tarkistettu | fabianwimmer.com/abisko-allsky-webcam... |
| **Porjus (2 kameraa), Ruotsi** | Jokkmokk-palvelu | ~66.96°N, 19.78°E | Suora kuva (.jpg) | EPÄVARMA — nimistä ("North"/"West") ei selviä onko taivassuunnattu vai maisema | Ei tarkistettu | uk.jokkmokk.jp/photo/nr3-4/latest.jpg |
| **Kjell Henriksen Observatory, Huippuvuoret** | UNIS (ei Pohjoiskalotti sanan tarkassa mielessä, mutta sama tieteellinen verkko) | 78.15°N, 16.04°E | Suora kuva (.jpg) | KYLLÄ, all-sky | KYLLÄ (tuore, todettu) | kho.unis.no/Quicklooks/kho_sony.jpg |
| **Nordkapp / Setermoen / Brekke-Loen, Norja** | Panomax / yr.no -verkko | Eri puolilla Norjaa | Suora kuva (Panomax/yr.no-iframe) | **EPÄVARMA/TODENNÄKÖISESTI EI** — nämä ovat yleisiä maisema-/matkailukameroita, ei erikseen taivaalle suunnattuja | Ei tarkistettu | ks. taulukon URL:t yllä olevassa raakadatassa |
| **Hrauneyjar / Hella / Aðaldalshraun, Islanti** | Highland Center / Landhotel / yksityinen | Eri puolilla Islantia | Verkkosivulinkki, ei resoloitu suoraa osoitetta | Markkinoitu "northern lights" -kameroina | Ei tarkistettu | ks. taulukko yllä |

**Huom koordinaattien tarkkuudesta:** kaikki ovat LIKIMÄÄRÄISIÄ (paikkakunnan
keskipiste), ei kameran tarkkaa GPS-sijaintia — tarkat koordinaatit
vaatisivat yhteydenoton jokaiseen operaattoriin tai tarkempaa paikkatieto-
tutkimusta per kamera.

## 2. Tekninen toteutus

### YouTube-striimit

**Testattu OIKEASTI** viidelle edellä mainitulle striimille:

1. **oEmbed-rajapinta EI VAADI API-avainta:**
   `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={ID}&format=json`
   palauttaa luotettavasti videon otsikon JA kanavan/tekijän nimen jokaiselle
   testatulle videolle. Tämä riittää "Katso YouTubessa" -linkin ja
   lähdeattribuution rakentamiseen ilman API-avainta.
2. **Pysyvä still-kuva ilman API-avainta:**
   `https://i.ytimg.com/vi/{VIDEO_ID}/hqdefault_live.jpg` toimii kaikille
   testatuille, palauttaa `Cache-Control: public, max-age=300` (=5 min) —
   TÄSMÄÄ pyydettyyn päivitysväliin.
3. **TÄRKEÄ AVOIN HAVAINTO testauksessa:** Posion striimin
   `hqdefault_live.jpg` oli TÄYSIN SAMA tavu tavulta (sama MD5-tiiviste)
   kolmessa peräkkäisessä haussa n. 15-20 minuutin aikajaksolla, VAIKKA
   `Cache-Control`-otsake lupaa 5 min. **En pysty selittämään varmasti
   miksi** — mahdollisia syitä: (a) YouTuben live-pikkukuvan generointi on
   harvempaa kuin otsake antaa ymmärtää, (b) pikkukuva päivittyy vain kun
   joku oikeasti katsoo striimiä, (c) tämä yksittäinen striimi oli juuri
   sillä hetkellä jostain syystä jumissa. **EI YLEISTETTÄVISSÄ yhdestä
   testistä** — ennen toteutusta pitäisi seurata useampaa striimiä
   pidempään (esim. 1-2 h) varmistaakseen todellisen päivitystiheyden.
4. **Pysyvä KANAVATASON linkki muuttuvalle video-ID:lle:** jos operaattori
   joskus käynnistää striiminsä uudelleen (uusi video-ID), kiinteä
   `watch?v=...`-linkki EI enää osoita oikeaan striimiin. YouTube tarjoaa
   `youtube.com/@kanava/live` tai `youtube.com/channel/{id}/live` -osoitteet
   jotka ohjautuvat AINA senhetkiseen live-lähetykseen — **EI testattu
   tässä selvityksessä** (ei tiedetä jokaisen operaattorin kanavatunnusta
   ilman tarkempaa kaivamista), merkitty avoimeksi jatkoselvitykseen.
5. **YouTuben käyttöehdot (API Services Terms of Service) —
   TARKISTETTU:**
   - Pikkukuva JA otsikko on näytettävä SELLAISENAAN (ei muokattuna).
   - Täytyy käydä SELVÄKSI katsojalle että YouTube on sisällön lähde
     (brändielementit/maininta).
   - Napautuksen TÄYTYY johtaa oikeaan toistoon (linkki YouTubeen) — EI
     saa näyttää PELKKÄÄ pikkukuvaa ilman linkkiä takaisin.
   - **Kaupallinen käyttö:** oman SOVELLUKSEN myyminen/veloittaminen ON
     SALLITTUA. Se mikä VAATISI YouTuben erillisen kirjallisen luvan on
     YouTuben SISÄLLÖN/API:n JÄLLEENMYYNTI itsessään, tai omien
     mainosten/sponsoroinnin liittäminen suoraan YouTube-soittimen
     päälle/sisään. **Suunniteltu käyttötapa (kortti + linkki + pikkukuva,
     osana laajempaa revontulisovellusta) näyttää sallitulta**, mutta
     tätä EI ole vahvistettu YouTubelta/Googlelta suoraan — vain luettu
     julkisesta kehittäjäpolitiikkadokumentista.
   - **Epävarmuus:** raaka `i.ytimg.com`-pikkukuvan hotlinkkaus (kuten
     testattiin) EI käy virallisen "API Client" -määritelmän kautta
     (ei kutsuta Data API:a eikä upoteta virallista Player-iframeä) —
     EPÄSELVÄÄ sitooko YouTuben API-ehdot tätä tapaa muodollisesti, vai
     riittääkö YouTuben YLEINEN käyttöehto. **Turvallisin toteutustapa:
     käytä oEmbediä (virallinen, dokumentoitu julkinen rajapinta tähän
     tarkoitukseen) otsikolle/tekijälle, ja linkitä AINA oikeaan
     watch-sivuun — vältä esittämästä pelkkää irrallista kuvaa ilman
     YouTube-brändäystä/linkkiä.**

### Muut kuin YouTube (suorat kuvaosoitteet)

**Testattu OIKEASTI** 7 suoralle kuva-URL:lle (SGO, UiT, IRF, 3× FMI,
Syrjävaara):

- **Kaikki palauttivat HTTP 200 + oikean kuvan** suoralla haulla.
- **`Last-Modified`-otsake OLI MUKANA JOKAISESSA** — tämä olisi täydellinen
  "Kuva: X min sitten" -laskennan lähde... **MUTTA:**
- **`Access-Control-Allow-Origin` (CORS) PUUTTUI KUUDESTA SEITSEMÄSTÄ.**
  Tämä tarkoittaa: selaimen JavaScript EI VOI lukea `fetch()`-kutsulla
  näiden vastausten otsakkeita (CORS-esto) — `Last-Modified` JÄÄ SIIS
  SAAVUTTAMATTOMIIN JS:stä näille lähteille, VAIKKA palvelin sen lähettää.
  **Kuva ITSE näkyy silti normaalisti `<img src="...">`-elementillä**
  (kuvan NÄYTTÄMINEN ei vaadi CORS:ia, vain DATAN/OTSAKKEIDEN LUKEMINEN
  JS:ssä vaatii).
  - **Käytännön seuraus:** näille lähteille EI voida luotettavasti näyttää
    "Kuva: X min sitten" -tekstiä laskettuna palvelimen omasta
    aikaleimasta — vain kuva itse voidaan näyttää. Vaihtoehto: näytä
    "Kuva ladattu juuri nyt" (= milloin ME haimme sen), EI väitetä
    tietävämme milloin LÄHDE sen otti (näiden kahden sekoittaminen olisi
    harhaanjohtavaa — täsmälleen sellaista "vanha data esitetään tuoreena"
    -ongelmaa jota tässä projektissa on vältetty muuallakin, ks. CLAUDE.md).
  - **AINOA poikkeus: IRF Kiruna** palautti CORS-otsakkeen, mutta se on
    RAJATTU vain IRF:n OMIIN aliverkkotunnuksiin (`irf.se`-perheen
    osoitteet) — meidän sovelluksemme domain EI ole listalla, joten
    CORS EI auta meitä tässäkään tapauksessa.
- **KONKREETTINEN TODETTU ESIMERKKI VANHENTUNEESTA KUVASTA:** FMI:n
  Helsinki-kamera (`space.fmi.fi/MIRACLE/RWC/latest_HEL.jpg`) palautti
  `Last-Modified: Fri, 29 May 2026` — **YLI 4 KUUKAUTTA VANHA**, vaikka
  kuva on nimeltään "latest". Tämä on JUURI se tilanne jota tehtävänanto
  pyysi merkitsemään selvästi ("jos kuva on vanhentunut... merkitse se
  selvästi") — ja osoittaa ettei lähteen omaan "latest"-nimeen voi
  luottaa sokeasti.

### Yhteenveto tekninen vertailu

| | YouTube-striimit | Suorat kuva-URL:t (ei-YouTube) |
|---|---|---|
| Aikaleima JS:stä luettavissa? | Ei suoraan (Cache-Control antaa vain VIHJEEN, ei tarkkaa aikaa) | Palvelin lähettää `Last-Modified`, MUTTA CORS estää JS:n lukemasta sitä useimmilla |
| Avain/rekisteröinti | Ei (oEmbed + i.ytimg.com) | Ei (suorat kuvat) |
| Kuvan näyttäminen ilman CORS:ia | Toimii (`<img>`) | Toimii (`<img>`) |
| Käyttöehdot | YouTuben API Services ToS — melko selkeät, linkki+brändäys pakollinen | Vaihtelee TÄYSIN lähteittäin, ks. kohta 3 |

## 3. Käyttöehdot (muut kuin YouTube) — "kysyttävä luvalla" -merkinnät

| Lähde | Käyttöehtojen tila | Yhteystieto jos kysyttävä |
|---|---|---|
| SGO (Sodankylä) | **TODENNETTU AIEMMIN** (ks. git-historia, edellinen selvitys): akateeminen vapaa, **kaupallinen käyttö vaatii kirjallisen luvan SGO:lta** — EI ilmainen | SGO:n yhteystiedot, ks. sgo.fi |
| UiT Skibotn | **KYSYTTÄVÄ LUVALLA** — ei löytynyt selkeää lisenssiä verkkosivulta | Tromsø Geophysical Observatory, site.uit.no/spaceweather |
| IRF Kiruna | **KYSYTTÄVÄ LUVALLA** — ei tutkittu tarkemmin, CORS-rajaus viittaa siihen että ulkopuolista käyttöä ei ole suunniteltu | IRF, irf.se |
| FMI/MIRACLE-verkko (Hankasalmi, Nyrölä, Kirkkonummi, Helsinki) | **KYSYTTÄVÄ LUVALLA** — sama MIRACLE-verkko jolle SGO:n lisenssi ilmeisesti pätee (FMI+SGO yhteistyö), EI erikseen vahvistettu kattaako sama lisenssi myös nämä FMI:n omat asemat | Ilmatieteen laitos / FMI-SPACE |
| Syrjävaara Dark Sky Park | **KYSYTTÄVÄ LUVALLA** — ei löytynyt käyttöehtoja | syrjavaara.fi:n yhteystiedot |
| Lights Over Lapland (Abisko) | **KYSYTTÄVÄ LUVALLA** — tarkistettu yrityksen omat käytännöt/tietosuojasivut, EI mainintaa webkameran uudelleenkäytöstä | Lights Over Lapland AB, Abisko Turiststation 1, Ruotsi (sähköposti JS-suojattu sivulla) |
| Fabian Wimmer (Abisko) | **KYSYTTÄVÄ LUVALLA** — ei tutkittu | fabianwimmer.com:n yhteystiedot |
| Jokkmokk (Porjus) | **KYSYTTÄVÄ LUVALLA** — ei tutkittu | uk.jokkmokk.jp |
| Kjell Henriksen Observatory | **KYSYTTÄVÄ LUVALLA** — ei tutkittu (UNIS, tieteellinen laitos, todennäköisesti samantyyppinen kuin SGO) | UNIS, kho.unis.no |
| Panomax/yr.no-verkko | **KYSYTTÄVÄ LUVALLA / EPÄVARMA SOVELTUVUUS** — nämä eivät todennäköisesti ole taivaalle suunnattuja, pienempi prioriteetti | yr.no (MET Norway) / Panomax-palvelu |
| Islannin kamerat | **KYSYTTÄVÄ LUVALLA** — ei resoloitu edes teknistä osoitetta | Highland Center / ko. hotellit suoraan |

## 4. Suositus: toteutus My Aurora Forecast -mallin mukaan

Tehtävänannon kuvaama malli (pisteet kartalla → napautus avaa kortin
[nimi + linkki alkuperäiseen + pikkukuva + aikaleima] → "kaikki kamerat"
-ruudukko) on **teknisesti toteutettavissa** alla olevalla priorisoinnilla:

**Vaihe 1 — YouTube-striimit (5 kpl valmiiksi tunnistettu, laajennettavissa):**
Teknisesti valmis periaate: oEmbed nimelle/tekijälle, `hqdefault_live.jpg`
pikkukuvaksi, aina linkki watch-sivulle, YouTube-brändäys näkyvissä kortissa.
**ENNEN toteutusta:** seuraa 2-3 striimin pikkukuvaa pidempään (esim. 1 h)
jotta todellinen päivitystiheys varmistuu (tässä selvityksessä havaittu
yksi tapaus jossa kuva EI muuttunut 15-20 min aikana).

**Vaihe 2 — SGO/FMI/UiT/IRF -tieteelliset all-sky-kamerat:**
Nämä ovat TEKNISESTI valmiita (suorat kuva-URL:t toimivat), mutta
**oikeudellisesti kaikki vaativat luvan** kaupalliseen käyttöön (tai
ainakin asia on vahvistamatta). **Suosittelen lähettämään yhden
yhteydenoton SGO:lle/FMI:lle joka kattaa koko MIRACLE-verkon** (Sodankylä,
Hankasalmi, Nyrölä, Kirkkonummi, Helsinki — todennäköisesti saman
organisaation ylläpitämiä) sen sijaan että kysytään erikseen jokaista
asemaa, plus erillinen kysely UiT:lle (Skibotn) ja IRF:lle (Kiruna) jos
Norja/Ruotsi-kattavuus halutaan. **Ennen lupaa: käytä VAIN linkkiä
kameran omalle sivulle, ÄLÄ upota kuvaa.**

**Vaihe 3 — loput yrityskamerat (Lights Over Lapland, Jokkmokk, jne.):**
Alin prioriteetti — vaatisi erillisen yhteydenoton JOKAISEEN operaattoriin
yksitellen, ei yhtenäistä sopimusta mahdollinen. Toteuta vain jos jokin
NIMETTY kamera on erityisen haluttu ja lupa saadaan.

**Yleinen tekninen huomio KAIKILLE ei-CORS-lähteille:** koska
`Last-Modified` ei ole luettavissa JS:llä useimmille suorille kuville,
"Kuva: X min sitten" -näyttö voi perustua VAIN siihen milloin SOVELLUS itse
haki kuvan viimeksi (ei lähteen todelliseen päivityshetkeen) — tämä on
kerrottava käyttäjälle rehellisesti UI:ssa (esim. "Haettu juuri" eikä
"Kuva otettu juuri"), paitsi YouTube-lähteille joilla edes epäsuora
Cache-Control-vihje on olemassa.

## Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeasti testattu (oikeilla HTTP-kutsuilla, toistettuna ajan yli):**
- SpaceWeatherLiven koko webkameralista haettu WebFetchillä (ei oletettu
  sisältöä).
- 7 suoraa kuva-URL:ia (SGO, UiT, IRF, FMI×3, Syrjävaara): HTTP-status,
  Content-Type, koko, `Last-Modified`, `Access-Control-Allow-Origin` —
  KAIKKI luettu oikeista HTTP-vastauksista.
- 5 YouTube-videota: oEmbed-vastaus (otsikko+tekijä) ja
  `hqdefault_live.jpg`-pikkukuva, mukaan lukien **3 peräkkäistä hakua
  15-20 min aikajaksolla samalle videolle** MD5-tiivisteen vertailuun
  (todisti ettei kuva muuttunut — ei vain oletettu päivittyvän).
- FMI Helsinki -kameran vanhentuneisuus (Last-Modified toukokuulta)
  TODETTU suoraan HTTP-vastauksesta, ei oletettu.

**Vain verkkohaku/sivujen lukeminen (ei suoraa tekninen testaus):**
- Lights Over Lapland, Fabian Wimmer, Jokkmokk, Panomax/yr.no,
  islantilaiset kamerat — ei yritetty löytää/testata suoria kuva-URL:eja
  (osa käyttää JS-pohjaista soitinta jonka tekninen toteutus ei näy
  pelkästä HTML:stä).
- YouTuben käyttöehdot — luettu Googlen kehittäjädokumentaatiosta, EI
  vahvistettu YouTubelta/Googlelta suoraan tätä NIMENOMAISTA
  käyttötapaa varten.
- CORS-käyttäytyminen SELAIMESSA — otsakkeet luettu Pythonilla (näkee
  otsakkeen OLEMASSAOLON), mutta todellista selaimen `fetch()`-estoa EI
  testattu oikealla selaimella (ei selainta tässä ympäristössä). Tämä
  on looginen päättely CORS-spesifikaatiosta, ei suora havainto.
- Kanavatason pysyvä `/live`-linkki (jos operaattori käynnistää striimin
  uudelleen) — EI testattu.

**Ei toteutettu eikä testattu koodina:** mitään tämän selvityksen
pohjalta — tehtävänannon mukaisesti vain selvitys, ei toteutusta.

## 5. Toteutus (vaihe 1: YouTube) — haara `feature/revontulikamerat-kartta`

Yllä kuvatun suosituksen (kohta 4, "Vaihe 1") mukainen toteutus: 5
YouTube-kameraa (Levi, Kilpisjärvi, Posio, Lyngen North, Aurora
Reykjavík) pisteinä kartalla, omalla päälle/pois-kytkettävällä tasolla.

### Datamalli: `data/cameras.json`

Käsin ylläpidetty, pieni kuratoitu tiedosto (ei hakuskriptiä — ei tarvetta
automaattihaulle, kameralista muuttuu harvoin). Rakenne on tehty
laajennettavaksi: tuleva tiedekamera (SGO/FMI/UiT, vaihe 2) lisätään
samaan listaan `"type":"image"` ja `"image":{"url":"..."}` -kentillä
(JSON ei tue kommentteja, joten tämä on dokumentoitu tässä, ei
tiedostossa itsessään).

### Arkkitehtuuripäätös: aito "muuttui X min sitten" EI selaimen omana vertailuna

Tehtävänanto edellytti REHELLISTÄ aikaleimaa (milloin kuva OIKEASTI
muuttui, ei pelkkää hakuhetkeä). Kohdassa 2 todettu CORS-puute
(`i.ytimg.com` ei lähetä `Access-Control-Allow-Origin`-otsaketta) estää
tämän laskemisen SELAIMESSA — JS ei pääse kuvan tavuihin `fetch()`:llä
eikä `<canvas>`:lla CORS-tahraantumisen takia ilman virhettä/opaque-
vastausta.

**Ratkaisu:** siirrä tiivistevertailu PALVELINPUOLELLE, missä CORS ei ole
rajoite (se on puhtaasti selaimen oma turvamekanismi):

1. `scripts/check-camera-thumbnails.py` hakee kunkin kameran
   `hqdefault_live.jpg`:n, laskee SHA-256-tiivisteen, vertaa edelliseen
   tunnettuun tiivisteeseen (`data/camera-status.json`), ja kirjaa
   `lastChecked`/`lastChanged`/`live`/`hash`/`sizeBytes` per kamera.
   **Ei koskaan tallenna kuvan tavuja itseään** — vain pieni tiiviste +
   aikaleimat, täyttäen vaatimuksen "kuvia ei saa kopioida palvelimelle".
2. `.github/workflows/camera-status.yml` ajaa tämän 10 min välein
   (samaa suuruusluokkaa kuin YouTuben oma `Cache-Control: max-age=300`),
   committaa `data/camera-status.json`:in jos tila muuttui.
3. Selain hakee `data/camera-status.json`:in SAMALTA ORIGINILTA (ei
   CORS-ongelmaa, oma staattinen tiedosto) ja näyttää tekstin sen
   pohjalta — EI väitä kuvan olevan "tuore" vain koska se haettiin juuri.
4. Itse NÄYTETTÄVÄ pikkukuva ladataan silti SUORAAN `<img src>`:llä
   `i.ytimg.com`:sta (tämä EI vaadi CORS:ia, vain DATAN lukeminen
   vaatisi) — kuvaa ei siis koskaan kaapata/tallenneta, pelkkä hash
   lasketaan palvelinpuolella erillisellä HTTP-pyynnöllä.

Nimi/ylläpitäjä kortissa haetaan client-puolella YouTuben oEmbed-
rajapinnasta (CORS sallittu, todennettu — ks. alla), täydentäen
`cameras.json`:in kiinteää `operator`-kenttää jos oEmbed onnistuu.

### UI (index.html)

- `#camerasBtn`: taso päälle/pois, oranssi kuvake-aktivointi (`.on`),
  erottuu muista painikkeista omalla värillään (#FF9F6F).
- MapLibre-symbolitaso `cameras`, kuvake piirretty canvasilla
  (`ensureCameraIcon()`, samaa periaatetta kuin `ensureWindArrowIcon()`).
  Klikkaus kutsuu `e.preventDefault()`:iä estääkseen kartan yleisen
  `click`-käsittelijän (joka asettaisi "Valitun pisteen") laukeamisen.
- Kortti (`#cameraCardBackdrop`): nimi, "Katso YouTubessa" -linkki
  (aina watch-sivulle), pikkukuva, YouTube-maininta, tila-teksti
  `cameraStatusText()`:stä. Pikkukuva + status päivittyy 5 min välein
  `setInterval`:lla VAIN kun kortti on auki (`stopCameraRefresh()`
  kutsutaan suljettaessa — ei jää ajastimia roikkumaan taustalle).
- "Kaikki kamerat" -ruudukko (`#cameraGridBackdrop`, avautuu
  `#cameraGridOpenBtn`:stä kun taso on päällä): kaikkien kameroiden
  pikkukuvat + nimet samaan aikaan, napautus avaa kortin.
- Rehellinen tila-logiikka (`cameraStatusText()`): "Lähetys ei
  käynnissä" jos `live:false`; "Kamera ei päivity" jos
  `camera-status.json`:in `lastChanged` on vanhempi kuin
  `staleThresholdMs` (30 min); muuten "Kuva muuttui X min sitten" —
  AINA `camera-status.json`:in todelliseen havaintoon perustuen, ei
  pelkkään hakuhetkeen.

### Seuranta: TODELLISET tulokset (ei oletus)

Tehtävänanto pyysi esimerkkinä 15 min / 24 h seurantaa
(`scripts/monitor-camera-freshness.py`). **Tietoinen poikkeama
esimerkistä:** ajettiin 5 min välein / 2 h ajan sen sijaan, jotta
tässä istunnossa saataisiin TÄYSI, todennettu aineisto sen sijaan että
väitettäisiin 24 h ajoa joka ei ehtisi valmistua. Skripti käynnistettiin
taustalle istunnon aikana ja oli käynnissä tätä muistiota kirjoitettaessa.

**Tulokset ensimmäisten 4 kierroksen (20 min) ajalta, todennettu oikeilla
HTTP-kutsuilla (SHA-256-tiivisteiden vertailu, ei oletus):**

| Kamera | live | Muuttui kierroksilla 2,3,4 (à 5 min)? |
|---|---|---|
| Levi | True | KYLLÄ joka kierroksella (koko vaihteli 9046→9053→9033→9017) |
| Kilpisjärvi | True | EI kertaakaan (koko pysyi 16029 tavussa) |
| Posio | True | EI kertaakaan (koko pysyi 26930 tavussa) |
| Lyngen North | True | EI kertaakaan (koko pysyi 25627 tavussa) |
| Aurora Reykjavík | True | EI kertaakaan (koko pysyi 10168 tavussa) |

**Tämä VAHVISTAA kohdassa 2 kuvatun yksittäisen Posio-havainnon:**
4/5 striimiä EI tuottanut uutta pikkukuvaa 20 minuutin aikana, VAIKKA
`Cache-Control`-otsake lupaa 5 min ja `live`-tila pysyi totuudenmukaisena
koko ajan. Vain Levi päivittyi joka kerta. **Tämä on nimenomaan SE syy
miksi "muuttui X min sitten" -teksti EI SAA perustua olettamukseen
5 min -välistä** — se perustuu nyt oikeasti mitattuun muutokseen, joten
UI näyttää näille 4 kameralle rehellisesti pidemmän "muuttui ... sitten"
-ajan sen sijaan että väittäisi kuvan olevan 5 min tuore.

**Rehellinen tila kirjoitushetkellä:** seurantaskripti jäi käyntiin
taustaprosessina (tavoite 2 h / 24 kierrosta), ja tätä kirjoitettaessa
siitä on vahvistettu 4 kierrosta (20 min). Täyttä 2 h -aineistoa EI ole
odotettu valmiiksi tässä istunnossa — loki kertyy
`%TEMP%\camera-freshness-log.jsonl`:iin, ja jos istunto jatkuu pidempään,
loki sisältää lisää kierroksia tarkasteltavaksi. Johtopäätös (4/5
kameraa ei päivity 5 min välein) ei todennäköisesti muutu lisäkierroksilla,
koska 20 min on jo 4× luvattu päivitysväli, mutta tätä EI väitetä
varmaksi ennen pidempää aineistoa.

### Mitä testattiin MISSÄ (toteutusosio, täysi rehellisyys)

**Oikeasti testattu (oikeilla HTTP-kutsuilla):**
- `check-camera-thumbnails.py` ajettu OIKEASTI kolme kertaa (kahdesti
  kehitysaikana + kerran juuri ennen committia) — ensimmäisellä kerralla
  kaikki 5 "muuttui" (ei aiempaa tilaa), toisella/kolmannella kerralla
  oikein havaittu 4/5 "ei muuttunut" samalla tiivisteellä.
- `monitor-camera-freshness.py` käynnissä taustalla, 4 kierrosta
  vahvistettu (ks. taulukko yllä).
- oEmbed- ja `hqdefault_live.jpg`-haut (osio 2) — kuten aiemmin.
- JS-syntaksi: koko uusi kamerakoodi-lohko (CSS+HTML+JS) erotettu
  tiedostosta ja ajettu Python `esprima`-jäsentimellä (`esprima.parseScript`)
  virheettömästi läpi. (HUOM: koko `index.html`:n kaikkien `<script>`-
  lohkojen jäsennys epäonnistuu esprimalla jo ENNESTÄÄN olemassa olevan
  `??`-operaattorin takia — tämä EI liity tähän muutokseen, todennettu
  vertaamalla samaa virhettä `git show HEAD`-version alkuperäiseen
  tiedostoon. Vain UUSI koodi jäsennettiin erikseen virheettä.)

**EI testattu oikealla selaimella (ei selainautomaatiota tässä
ympäristössä) — pelkkä koodikatselmointi/looginen päättely:**
- Painikkeen/tason päälle-pois-kytkin, kuvakkeen piirtyminen kartalle.
- Kortin avautuminen/sulkeutuminen, 5 min -ajastimen käynnistys/pysäytys.
- "Kaikki kamerat" -ruudukko.
- `e.preventDefault()`:in todellinen vaikutus kartan yleiseen
  klikkauskäsittelijään selaimessa (tämä on dokumentoitu MapLibre-käytäntö
  projektissa muualla, mutta EI testattu juuri tälle uudelle tasolle).
- iOS/mobiili-asettelu (painikkeiden pino, kortin `safe-area-inset`).

### Avoimet kysymykset / jatkoa varten

- Täysi 2 h / 24 kierroksen seuranta-aineisto (ks. yllä) kannattaisi
  tarkistaa myöhemmin lokista, jos halutaan vahvistaa päivitysvälin
  tarkka jakauma pidemmällä aikavälillä.
- `data/camera-status.json` tuotetaan tuotannossa GH Actions -cronilla
  VASTA kun tämä haara yhdistetään mainiin (cron-ajastus laukeaa
  GitHubissa aina oletushaaralle, ei feature-haaroille) — committiin
  sisällytetty tiedosto on tämän istunnon oikean manuaaliajon tulos,
  toimii testidatana kunnes ensimmäinen tuotantoajo korvaa sen.
- Vaihe 2 (SGO/FMI/UiT/IRF) ja vaihe 3 (yrityskamerat) odottavat yhä
  lupaa/yhteydenottoa — ks. kohta 3, ei muuttunut tässä toteutuksessa.

## 6. Mainoskuvien tunnistus ja korjaus (haara `feature/pilviluku-ja-kamerakuvat`)

Käyttäjä raportoi: osa YouTube-kameroista näyttää kanavan MUKAUTETUN
mainoskuvan (esim. Posio: teksti "LIVE from Lapland"), ei striimin
todellista senhetkistä kuvaa — tällainen kuva on oppaalle hyödytön ja
harhaanjohtava taivaan tilan arviointiin.

### 6.1 Jokaisen nykyisen kameran tarkistus — eri pikkukuvavariantit

Testattiin OIKEASTI jokaiselle 5 kameralle 10 eri pikkukuvavarianttia
(`default/mqdefault/hqdefault/sddefault/maxresdefault/hq720`, sekä
`_live`-päätteellä että ilman):

| Kamera | `hqdefault_live` == `hqdefault` (ei-live)? | Johtopäätös |
|---|---|---|
| **Levi** | **EI** (eri tavuja, eri koko) | **AITO LIVE-KUVA** |
| Kilpisjärvi | KYLLÄ (identtiset tavut) | Mukautettu/kiinteä kuva |
| Posio | KYLLÄ | Mukautettu/kiinteä kuva |
| Lyngen North | KYLLÄ | Mukautettu/kiinteä kuva |
| Aurora Reykjavík | KYLLÄ | Mukautettu/kiinteä kuva |

**Saako mistään variantista live-kuvaa mukautetun ohi?** EI. Kaikki
testatut koot (`default`...`maxresdefault`, `_live`-päätteellä tai ilman)
palauttivat TÄSMÄLLEEN saman kuvan per kamera niille neljälle jotka
käyttävät mukautettua kuvaa — YouTube ei tarjoa mitään vaihtoehtoista
osoitetta jolla todellisen videokehyksen saisi näiden ohi, koska
operaattori on itse asettanut kiinteän pikkukuvan koko striimille.
Lisäksi `maxresdefault_live`/`hq720_live` palauttivat KAIKILLA viidellä
kameralla (myös Leville) saman kuin ei-live-versio — nämä kaksi
resoluutiota eivät siis ole luotettava tunnistussignaali keneltäkään,
vain `default`/`mqdefault`/`hqdefault`/`sddefault`-tasoilla on eroa.

Tämä vahvistaa myös aiemman (osa C) havainnon Posiosta 15-20 min
muuttumattomana pysyneestä kuvasta — nyt tiedetään MIKSI: se ei ole
satunnainen päivitysviive, vaan kiinteä mainoskuva joka EI KOSKAAN muutu.

### 6.2 Automaattinen tunnistus

`scripts/check-camera-thumbnails.py` päivitetty laskemaan KAKSI
toisiaan tukevaa signaalia jokaiselle kameralle:

1. **Välitön:** `hqdefault_live.jpg` vs. `hqdefault.jpg` — jos tavu
   tavulta sama (SHA-256-vertailu), merkitään heti mukautetuksi.
2. **Pitkittäinen:** kuva ei ole muuttunut vähintään 20 minuuttiin SIITÄ
   kun kameraa alettiin seurata (`firstSeenAt`-kenttä) — varmistaa ettei
   uutta, vasta lisättyä kameraa leimata mukautetuksi liian aikaisin.

`data/camera-status.json`:iin lisätty kentät `liveEqualsNonLive` ja
`isCustomThumbnail` per kamera. **Ajettu OIKEASTI ennen committia** —
tulos täsmäsi odotukseen täydellisesti: Levi `isCustomThumbnail=false`,
muut neljä `true`.

### 6.3 Käyttöliittymän muutokset

- **Kortti:** jos `isCustomThumbnail=true`, pikkukuva PIILOTETAAN
  kokonaan (`rv-cam-thumb-wrap` saa `display:none`), eikä harhaanjohtavaa
  "Kuva muuttui X min sitten" -tekstiä näytetä — tilalla lukee "Ei
  live-esikatselua — kanava näyttää kiinteää mainoskuvaa, ei taivaan
  tilaa." Nimi + "Katso YouTubessa" -linkki näkyvät silti normaalisti.
  Tarkistus tehdään UUDELLEEN jokaisella 5 min -päivityksellä (ei vain
  kortin avatessa) — jos seuranta joskus huomaa kameran alkavan oikeasti
  päivittyä, kortti vaihtuu automaattisesti kuvalliseen näkymään.
- **"Kaikki kamerat" -ruudukko:** näyttää VAIN kamerat joilla
  `isCustomThumbnail` ei ole tosi. Mukautetun kuvan kamerat listataan
  ruudukon alla omana otsikoituna linkkilistanaan (pelkkä nimi, napautus
  avaa silti kortin linkkiä/tietoja varten — EI kuvaa).
- Karttataso (pisteet) näyttää EDELLEEN kaikki 5 kameraa samalla
  kuvakkeella — mukautetun kuvan kamerat ovat silti oikeita, hyödyllisiä
  SIJAINTEJA (linkki striimiin), vaikka esikatselukuva puuttuukin.
  Tätä ei rajattu pois, koska tehtävänanto rajasi vain ruudukko- ja
  korttinäkymän kuvan, ei karttapisteitä.

### 6.4 Korvaavien kameroiden etsintä — TULOS: ei vielä yhtään varmistettua lisäystä

Etsittiin lisää revontulistriimejä hakemalla (WebSearch/WebFetch, OIKEASTI
haettu) sivuilta theauroraguy.com, aurorago.app, virmalised.ee,
portofcams.com ja suorilla hauilla. Löydetyt JA TESTATUT 7 uutta
kandidaattia + 1 löytynyt mutta väärä sisältö:

| Kandidaatti | Video-ID | Sijainti/operaattori | `live==nonlive` heti? | Huomio |
|---|---|---|---|---|
| Starlapland Sodankylä | `dnlQtDad6Dk` | Sodankylä, FI (sama operaattori kuin Levi/Kilpisjärvi) | KYLLÄ (sama kuva) | Todennäköisesti mukautettu |
| Aurora Holidays Utsjoki | `jHfZ4ZYsaOA` | Utsjoki, FI | KYLLÄ | Todennäköisesti mukautettu |
| Samimaka Oulu | `TfUjL4GRzcU` | Oulu, FI | — | **HYLÄTTY: oEmbed-otsikko "ice fishing live360°" — ei revontulikamera tällä hetkellä** |
| Hotel Lapin Satu (vaihtoehtoinen video-ID) | `_WtUWtodDVA` | Posio, FI | KYLLÄ | Sama operaattori/sama ongelma kuin nykyinen Posio-kamera |
| Aurora Village Ivalo (All About Lapland) | `h4Ln4uAWix8` | Ivalo, FI | KYLLÄ | Todennäköisesti mukautettu |
| Aurora Alert Realtime | `AvKdtZIb-6c` | ei tarkkaa sijaintia selvillä | KYLLÄ | Todennäköisesti mukautettu |
| Aurora Borealis (LIVE!) | `pmIynxHd7D0` | Utsjoki, FI | KYLLÄ | Todennäköisesti mukautettu — sama sijainti kuin Aurora Holidays |

**ALKUPERÄINEN johtopäätös (välittömän testin perusteella) oli: kaikki
7 näyttivät staattiselta.** Pitkäaikaisseuranta (1 h / 5 min välein,
tilapäinen tutkimusskripti, EI committoitu) PALJASTI tämän johtopäätöksen
OSIN VIRHEELLISEKSI jo 10-15 minuutin kuluttua:

**KRIITTINEN LÖYDÖS — välitön live==nonlive-vertailu antaa VÄÄRIÄ
POSITIIVISIA, myös tunnetusti aidolle live-kameralle:**
- Kierros 1 (t=0): `starlapland-sodankyla` live==nonlive OLI sama (koko 9272) → näytti staattiselta.
- Kierros 2 (t=5 min): koko muuttui 9272→9145 — live-pikkukuva PÄIVITTYI OIKEASTI.
- Erillinen tarkistus vahvisti: live (9145) ja nonlive (9222) EIVÄT enää olleet samat.
- **Sama ilmiö toistui myös REFERENSSIKAMERALLA Levi** (tunnetusti aito live,
  todennettu 20+ min seurannalla edellisessä tehtävässä): yhdellä
  tarkistuskerralla `live==nonlive` oli YHTÄ LAILLA sama (koko 9298),
  vaikka Levi on VARMASTI aito live-kamera. YouTube voi siis ajoittain
  generoida live- ja ei-live-pikkukuvan samasta tuoreesta kehyksestä
  ILMAN että kanavalla on kiinteää ohituskuvaa — yhden hetken tavu-
  vertailu ei siis ole riittävä todiste staattisuudesta.

**KORJAUS TEHTY `check-camera-thumbnails.py`:hen** (oma commit, ks.
git-historia): `isCustomThumbnail` perustuu nyt VAIN signaaleihin jotka
ovat PYSYNEET totena vähintään 20 minuuttia YHTÄJAKSOISESTI (sekä
pitkittäinen "kuva ei muutu" -signaali ETTÄ live==nonlive-signaali
vaativat nyt pysyvyyttä, ei yhtä tarkistushetkeä). Tämä EI vaikuttanut
alkuperäisten 5 kameran luokitteluun (Levi=aito, muut 4=mukautettu —
sama tulos kuin ennenkin, koska niiden pitkittäinen signaali oli joka
tapauksessa jo selvä), mutta estää vastaavan väärän positiivisen
jatkossa.

**Starlapland Sodankylä (`dnlQtDad6Dk`) LISÄTTY `cameras.json`:iin**
kuudentena kamerana, VAIKKA sen live-status ei ole 100 % varmistettu —
tämä on tietoinen, perusteltu päätös: yksi vahvistettu muutos (9272→9145)
on jo enemmän näyttöä kuin yhdelläkään muulla kandidaatilla, kamera on
oikean, tunnetun operaattorin (Starlapland, sama kuin Levi/Kilpisjärvi)
ylläpitämä aito revontulistriimi, ja korjattu automaattinen tunnistus
mukautuu OIKEIN kumpaan tahansa suuntaan ajan myötä — jos kuva osoittautuu
lopulta staattiseksi, UI piilottaa sen automaattisesti ilman erillistä
koodimuutosta. Muita 6 kandidaattia (Aurora Holidays Utsjoki, Aurora
Village Ivalo, Aurora Alert Realtime, Aurora Borealis LIVE Utsjoki,
Hotel Lapin Satu -vaihtoehto, Samimaka) EI lisätty — niiden näyttö pysyi
muuttumattomana koko seurannan ajan, eikä yhtä vahvaa näyttöä aidosta
live-päivityksestä löytynyt.

### Mitä testattiin MISSÄ (osa 2, täysi rehellisyys)

**Oikeasti testattu:**
- Kaikki 10 pikkukuvavarianttia × 5 nykyistä kameraa, oikeilla HTTP-
  kutsuilla, SHA-256-vertailuin.
- `check-camera-thumbnails.py`:n uusi tunnistuslogiikka ajettu OIKEASTI
  — tulos (Levi=false, muut=true) täsmäsi täydellisesti käsin
  tarkistettuun dataan.
- 8 uutta kandidaattia löydetty OIKEALLA verkkohaulla (WebSearch/
  WebFetch) ja testattu OIKEILLA HTTP-kutsuilla (oEmbed + pikkukuva-
  vertailu) — ei oletettu mitään kanavan sisällöstä (Samimaka-löydös,
  "ice fishing", olisi jäänyt huomaamatta ilman oEmbed-otsikon lukemista).
- Pitkäaikaisseuranta käynnistetty oikeasti taustaprosessina.

**EI testattu oikealla selaimella:**
- Kortin/ruudukon uusi käyttäytyminen (kuvan piilotus, "muut"-lista) —
  pelkkä koodikatselmointi + esprima-syntaksitarkistus, ei selainajoa.
- `isCustomThumbnailCamera()`:in reagointi "live" muuttuessa kesken
  kortin auki olon (koodi kirjoitettu tukemaan tätä, mutta ei nähty
  oikeasti tapahtuvan selaimessa).
