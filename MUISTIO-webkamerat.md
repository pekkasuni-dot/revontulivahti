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

**PÄIVITYS — täysi 2 h / 24 kierroksen aineisto valmistui** (taustaprosessi
jäi käyntiin usean myöhemmän tehtävän ajan ja raportoi valmistumisensa
vasta jälkikäteen): **Levi muuttui JOKAISELLA 24/24 kierroksella** (koko
vaihteli 9046:sta aina 7811:een asti koko kahden tunnin ajan — selvästi
jatkuvasti elävä kuva). **Kilpisjärvi, Posio, Lyngen North ja Aurora
Reykjavík EIVÄT muuttuneet KERTAAKAAN koko 2 tunnin aikana (0/24)** —
täsmälleen sama tavukoko joka ikisellä kierroksella. Tämä on huomattavasti
vahvempi näyttö kuin alun perin raportoitu 20 min / 4 kierrosta, ja
vahvistaa täysin sekä alkuperäisen päätelmän että myöhemmin (OSA 2
-tehtävässä) rakennetun automaattisen `isCustomThumbnail`-tunnistuksen
oikeellisuuden — ks. MUISTIO-webkamerat.md osio 6 ja CLAUDE.md.

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

**JÄLKIKÄTEINEN VAHVISTUS (haara `feature/pilvityyli-lippu-ja-kamerat`,
myöhempi tehtävä):** edellä mainittu 1 h / 5 min -seuranta jatkui taustalla
koko ensimmäisen tunnin ajan ja saatiin PÄÄTÖKSEEN (12 kierrosta).
Lopputulos vahvistaa yllä tehdyn päätöksen täysin:
- **Starlapland Sodankylä muuttui JOKAISELLA 12 kierroksella** — täysin
  sama kuvio kuin referenssikamera Levillä (12/12 muuttui). Tämä on nyt
  yhtä vahva näyttö aitoudesta kuin Levillä alun perin oli.
- **Aurora Holidays Utsjoki, Aurora Village Ivalo, Aurora Alert Realtime
  ja Aurora Borealis LIVE Utsjoki EIVÄT muuttuneet KERTAAKAAN koko
  tunnin aikana (0/12).** Tämä vahvistaa erittäin vahvasti (ei enää vain
  yhden tarkistuksen perusteella) että nämä neljä ovat mukautettuja/
  staattisia kuvia — päätös olla lisäämättä niitä oli oikea.

## Kamerakortin korjaukset (haara `feature/pilvityyli-lippu-ja-kamerat`, uusi tehtävä — jatkaa osiosta 6)

### Tiivistetty ulkoasu

Kortin paddingia/marginaaleja pienennetty (16px→12px reunat, rivivälit
10px→6px ym.), ja pikkukuva palautettu TÄYTEEN leveyteen (edellisessä
tehtävässä kavennettu 80%:iin — tämä OLI nimenomainen pyyntö silloin,
mutta aiheutti nyt turhaa tyhjää tilaa reunoilla jota pyydettiin
poistamaan. Myöhempi, tarkempi pyyntö kumoaa aiemman).

### Väärä hälytys: "Kamera ei päivity" vaikka kuva oli tuore

**Raportoitu:** Sodankylän kortti näytti "Kamera ei päivity, kuva
muuttui viimeksi 135 min sitten", vaikka kuvan OMA poltettu aikaleima
oli 21:26:19 (6 min ennen tarkistusta).

**Tutkittiin OIKEASTI, ei oletettu:** tehtävänannon oma hypoteesi
("tunnistus ei huomaa yöllä tummien kuvien eroja, vertailu liian karkea")
osoittautui VÄÄRÄKSI kahdella tavalla:

1. **SHA-256 koko tavusisällöstä EI ole "karkea vertailu"** — se on jo
   maksimaalisen herkkä (mikä tahansa yksikin erilainen tavu muuttaa
   koko tiivisteen). Tätä ei tarvinnut korjata, koska se EI ollut rikki.
2. **TODISTETTIIN OIKEASTI yöllä, oikealla revontulihavainnolla:**
   haettiin Sodankylän `hqdefault_live.jpg` 4 kertaa 4,5 min aikana
   juuri revontulten näkyessä (oikea, ei simuloitu tilanne — kuva
   ladattiin ja KATSOTTIIN). Kaikki 4 hakua palauttivat TÄSMÄLLEEN
   saman tiivisteen, JA kuvaan poltettu kellonaika ("12-10-2026 23:26:24")
   oli joka kerta SAMA — kuva oli siis OIKEASTI jäätynyt tuon ajan,
   ei kyse vertailubugista. YouTuben oma `_live`-pikkukuvamekanismi voi
   siis seisoa paikallaan useita minuutteja kerrallaan, myös aktiivisen
   striimin aikana.

**TODELLINEN syy löytyi:** `data/camera-status.json` oli tarkistettu
VIIMEKSI ~5 TUNTIA aiemmin (vahvistettu suoraan tiedoston `lastChecked`-
kentästä: 1791821612730 ms = 2026-10-12 19:13 — käsin ajettu tarkistus
edellisessä tehtävässä). Tällä yhdistämättömällä haaralla
`.github/workflows/camera-status.yml`:n `schedule:`-ajastin EI OLE
KOSKAAN OIKEASTI LAUENNUT, koska GitHub ajaa ajastetut työnkulut VAIN
oletushaaralle (main), ei feature-haaroille — sama rajoite joka on
dokumentoitu jo aiemmin kameratoteutuksen yhteydessä, mutta ei vielä
tätä nimenomaista seurausta (vanhentunut status-tiedosto antaa väärän
"ei päivity" -viestin, VAIKKA kamera toimii oikein). 135 minuuttia ja
6 minuuttia molemmat olivat siis TOSIA lukuja — vain eri asioista:
135 min = milloin ME viimeksi tarkistimme, 6 min = milloin KUVA
oikeasti päivittyi senhetkiseen tilaansa.

**Korjaus:** `cameraStatusText()` (index.html) tarkistaa NYT ensin onko
OMA `lastChecked`-aikaleimamme itse liian vanha (`MONITORING_STALE_
THRESHOLD_MS`, 20 min — n. 2× tuotannon suunniteltu 10 min -ajoväli).
Jos on, näytetään REHELLINEN "Tuoreustietoa ei ole päivitetty äskettäin
(seuranta ei ole käynyt X sitten) — kuva näytetään silti suoraan, mutta
emme voi juuri nyt vahvistaa onko se tuore" EIKÄ väitetä varmasti että
"Kamera ei päivity" — tämä ero (meidän oma seurantamme on vanhentunut
vs. kamera on oikeasti jumissa) on juuri se mikä aiheutti väärän
hälytyksen, ja nyt järjestelmä REHELLISESTI myöntää kumman tilanteen
on kyse.

**Sivulöydös (EI korjattu tässä tehtävässä, sama perimmäinen syy):**
samasta harvasta tarkistusvälistä johtuen myös Levi (tunnetusti aidosti
live, 24/24 vahvistettu pitkällä seurannalla) näkyi hetkellisesti
`isCustomThumbnail:true`:na kahden harvan, ~5 h välein tehdyn
tarkistuksen takia (molemmat sattumalta `live==nonlive`-tosia, ja
pysyvyys-signaali ei pysty erottamaan "oikeasti pysyvä" ja "vain kaksi
harvaa havaintoa jotka sattuivat olemaan samanlaisia" toisistaan). Tätä
EI korjattu erikseen, koska perimmäinen syy on SAMA (ei toimivaa
ajastettua ajoa tällä haaralla) — molemmat korjaantuvat itsestään kun
haara yhdistetään mainiin ja oikea 10 min -sykli alkaa.

### Mitä testattiin MISSÄ (tämä osio, täysi rehellisyys)

**Oikeasti testattu:**
- `check-camera-thumbnails.py` ajettu OIKEASTI kahdesti tämän tehtävän
  aikana, tulokset luettu suoraan `data/camera-status.json`:ista.
- Sodankylän live-pikkukuva ladattu OIKEASTI 4 kertaa 4,5 minuutin
  aikana YÖLLÄ revontulten näkyessä (ei simuloitu) — kuva KATSOTTU
  (ei vain hajautettu), poltettu aikaleima luettu silmämääräisesti
  kuvasta kahdesti vahvistaen jäätymisen.
- `lastChecked`-kentän todellinen ikä laskettu suoraan tiedostosta.

**EI testattu oikealla selaimella:**
- Uuden `MONITORING_STALE_THRESHOLD_MS`-logiikan todellinen näkyminen
  kortissa selaimessa — pelkkä koodikatselmointi + esprima-tarkistus.
- Tiivistetyn ulkoasun visuaalinen lopputulos.

## 7. Lisäkamerat: My Aurora Forecastin esiintymät joita meillä ei ollut

Selvitettiin My Aurora Forecast -sovelluksessa nimetyt sijainnit (Tampere,
Utsjoki, Kuusamo, Kilpisjärvi, Luosto, Abisko, Porjus, Rotsund, Kiruna,
Setermoen) — kenen ylläpitämä, tekninen lähde, päivitysväli, aito live-kuva
vai ei, ja käyttöehdot (myös maksullista sovellusta varten).

| Sijainti | Ylläpitäjä | Tekninen lähde | Testattu OIKEASTI | Aito live-kuva? | Käyttöehdot |
|---|---|---|---|---|---|
| **Tampere** | Tampereen Ursa ry (tähtitieteellinen yhdistys) | Suora kuva, 4 suuntaa | KYLLÄ — HTTP 200, 491 kt, `Last-Modified` tuore (sama päivä), "Kelikamerat-60s" (~60 s väli) | Todennäköisesti (jatkuva taivaskamera, pohjoissuunta auroralle relevantein) | **KYSYTTÄVÄ LUVALLA** — sivusto: "joissakin tapauksissa mahdollista tietyin edellytyksin", yhteys tampereenursa@tampereenursa.fi. © Tampereen ursa ry. |
| **Kuusamo (Ruka, Pessari "Revontulikamera")** | Ruka-Kuusamo-matkailu / Panocloud (WMS WebMediaSolutions, tekninen alusta) | Suora kuva (panoraama) `ruka3.panocloud.webcam/panorama1.jpg` | KYLLÄ — HTTP 200, 636 kt, `Cache-Control: max-age=1`, **CORS `Access-Control-Allow-Origin: *`** (poikkeuksellisen avoin) | Todennäköisesti (nimetty nimenomaan revontulikameraksi, tuore joka pyynnöllä) | **KYSYTTÄVÄ LUVALLA** — CORS-avoimuus ON vain TEKNINEN helppous, EI lisenssi: ei löytynyt julkista käyttöehtoa kummaltakaan (Panocloud/WMS tai Ruka). Yhteys Ruka-Kuusamo-matkailuun. |
| **Kilpisjärvi (FMI/MIRACLE, "KIL")** | FMI/SGO-yhteistyö (MIRACLE-verkko) | Suora kuva `aurorasnow.fmi.fi/public_service/images/latest_KIL.jpg` | KYLLÄ — HTTP 200, 15 165 tavua (todettu toimivaksi) | KYLLÄ (all-sky-kamera, osa samaa MIRACLE-verkkoa kuin jo dokumentoidut Hankasalmi/Nyrölä ym.) | **KYSYTTÄVÄ LUVALLA** — SAMA SGO Data Licence kuin muilla MIRACLE-asemilla (ks. kohta 3) — **yksi yhteydenotto SGO:lle/FMI:lle kattaisi myös tämän**, ei erillistä kyselyä. |
| **Utsjoki (Kevo-tutkimusasema, FMI/MIRACLE "KEV")** | Turun yliopisto (Kevo-asema) linkittää FMI:n aurora-kameraan | Suora kuva `aurorasnow.fmi.fi/public_service/images/latest_KEV.jpg` | **TESTATTU — PALAUTTAA TYHJÄN KUVAN (0 tavua, HTTP 200)** | **EI TÄLLÄ HETKELLÄ** — osoite on olemassa mutta kamera ei tuota kuvaa (rikki/pois käytöstä). Kevon oma "pihakamera" (`apps.utu.fi/kevo/geavvu.jpg`) toimii mutta on yleismaisemakamera, ei taivaalle suunnattu. | Ei relevantti juuri nyt (kamera ei toiminnassa) — MIRACLE-osalta sama SGO-lisenssi kuin yllä. |
| **Luosto ("Aurora Magic", Visit Pyhä-Luosto)** | Visit Pyhä-Luosto | YouTube-striimi, `dyRSvHGGvA8`, `hqdefault_live.jpg` | KYLLÄ sisältö oikea (oEmbed: "Visit Pyhä-Luosto Aurora Live" / "Aurora Magic – live from Pyhä-Luosto") | **EPÄVARMA** — yksi välitön tarkistus: live==nonlive sama (ei vielä pitkäaikaisseurantaa, ks. Osa 6:n opetus: yksi tarkistus EI riitä kumpaankaan suuntaan) | YouTuben yleiset ehdot (sama malli kuin muut YouTube-kameramme) — **EI lisätty, koska aitoutta ei ole vielä pitkäaikaisesti vahvistettu** (vrt. Sodankylä, joka lisättiin VASTA kun muutos nähtiin oikeasti). |
| **Rotsund** | **Lyngen North AS — SAMA operaattori/yritys kuin jo listalla oleva "Lyngen North, Norja"** | Sama striimi (Spåkenesveien 281, Rotsund) | — | — | **EI UUSI KAMERA** — My Aurora Forecastin "Rotsund"-merkintä ja meidän "Lyngen North" -kameramme ovat sama fyysinen kamera/yritys eri nimellä. Ei toimenpiteitä. |
| **Abisko** | Lights Over Lapland AB / Fabian Wimmer | Ks. aiempi selvitys (osa C, kohta 1) | Ei uudelleentestattu tässä tehtävässä | Ei vahvistettu | **KYSYTTÄVÄ LUVALLA** (jo dokumentoitu kohdassa 3, ei muuttunut) |
| **Kiruna** | IRF (Institutet för rymdfysik) | `irf.se/alis/allsky/krn/latest_medium.jpeg` (jo dokumentoitu) | Ei uudelleentestattu tässä tehtävässä | Oletettavasti (all-sky) | **KYSYTTÄVÄ LUVALLA** (jo dokumentoitu kohdassa 3, CORS rajattu `irf.se`-perheeseen) |
| **Setermoen** | EPÄSELVÄ — moniportainen ketju: "Live Aurora Cams" (kolmannen osapuolen koontipalvelu) re-hostaa yr.non (Norjan ilmatieteenlaitos) kuvaa, ja yr.no ITSE käyttää "Webcams.travel"-koontipalvelua alkuperäisenä lähteenä | `images.liveauroracams.com/cams/setermoen-norway/latest_lg.jpg` (KOLMANNEN KÄDEN kopio, EI alkuperäinen lähde) | Ei testattu teknisesti (alkuperäistä lähdettä ei tunnistettu luotettavasti) | **EPÄVARMA/TODENNÄKÖISESTI EI** — sama kategoria kuin aiemmin hylätyt Panomax/yr.no-kamerat (yleinen maisema-/sääkamera, ei erikseen taivaalle suunnattu) | **HYLÄTTY** — alkuperäistä omistajaa/lupaa ei voida edes kysyä luotettavasti kun lähdeketju on näin epäselvä; kolmannen käden kopion hotlinkkaus ilman tietoa alkuperäisten oikeuksien haltijasta ei täytä "ei tallennusta, lupa kysytty oikealta taholta" -periaatetta. |

**Kilpissafaris (Kilpisjärvi, yrityksen oma kamera)** — löydetty haussa
mutta EI tutkittu teknisesti tässä tehtävässä (aikarajaus) — merkitty
avoimeksi jatkoselvitykseen jos FMI/MIRACLE-Kilpisjärvi osoittautuu
syystä tai toisesta käyttökelvottomaksi.

### Johtopäätös ja toteutus

**YHTÄÄN uutta kameraa EI otettu käyttöön tässä tehtävässä.** Tämä on
tietoinen, tehtävänannon oman ehdon ("joiden ehdot SALLIVAT JA jotka
antavat AIDON live-kuvan" — molemmat ehdot, ei jompikumpi) mukainen
lopputulos:
- Kaikki toimivat still-kuvalähteet (Tampere, Kuusamo, Kilpisjärvi)
  vaativat ensin luvan — yksikään ei ole vielä saanut sitä.
- Ainoa uusi YouTube-kandidaatti (Luosto) ei ole vielä pitkäaikaisesti
  vahvistettu aidoksi.
- Yksi löydetty osoite (Kevo/KEV) on teknisesti rikki juuri nyt.
- Yksi (Rotsund) osoittautui jo olemassa olevaksi kameraksi eri nimellä.
- Yksi (Setermoen) hylättiin epäselvän lähdeketjun takia.

**Valmiina seuraavaa kertaa varten:** kolme yhteydenottoa kattaisi
suurimman osan avoimista: (1) SGO/FMI MIRACLE-verkko (kattaa nyt myös
Kilpisjärvi/KIL, ei vain aiemmin listatut asemat), (2) Tampereen Ursa ry,
(3) Ruka-Kuusamo-matkailu (Pessari-kamera). Luosto kannattaa lisätä
automaattiseen seurantaan (`check-camera-thumbnails.py`-tyylinen
tarkistus) vähintään tunniksi ennen lisäämistä, Sodankylän mallin
mukaisesti.

### Mitä testattiin MISSÄ (osa 4, täysi rehellisyys)

**Oikeasti testattu (oikeilla HTTP-kutsuilla):**
- Tampere, Kuusamo/Panocloud, Kilpisjärvi/KIL, Utsjoki/KEV: HTTP-status,
  koko, `Last-Modified`/`Cache-Control`, CORS-otsake — kaikki luettu
  oikeista vastauksista, EI oletettu. KEV:in tyhjä vastaus (0 tavua)
  löytyi juuri tällä tavalla, ei olisi huomattu pelkällä URL-listauksella.
- Luosto: oEmbed + yksi live/ei-live-pikkukuvavertailu, oikealla HTTP-kutsulla.
- Aiempi (edellisen tehtävän) 1 h / 5 min -seuranta katsottu loppuun asti
  tätä muistiota varten (12/12 kierrosta valmiina).

**Vain verkkohaku, ei teknistä testausta:**
- Abisko, Kiruna (uudelleenkäytetty aiempi, jo dokumentoitu testaus —
  ei toistettu).
- Kilpissafaris-kamera (löydetty, ei tutkittu).
- Setermoen-lähdeketjun jokainen välikäsi (yr.no, Webcams.travel) — ei
  teknisesti testattu, koska alkuperäistä kuva-URL:ia ei tunnistettu.

**EI testattu oikealla selaimella:** mikään tämän osion löydöksistä —
kaikki Python-HTTP-kutsuin tai verkkohaulla, ei selainta käytettävissä.

---

## OSA 2 (UUSI TEHTÄVÄ, sama haara): kamerakuva ei näkynyt — "sivulöydös" osiosta 6 OLIKIN todellinen bugi

Yllä (osio 6) kirjattiin "sivulöydös, EI korjattu": Levi näkyi hetkellisesti
`isCustomThumbnail:true`:na harvan tarkistusvälin takia, mutta päätettiin
olla korjaamatta koska "perimmäinen syy on sama (ei cronia) ja korjaantuu
itsestään kun haara yhdistetään mainiin." **Tämä päätös oli väärä** -
käyttäjä raportoi juuri tämän oireen: "Levi ja Sodankylä eivät näytä
kuvaa lainkaan, vaikka kortissa lukee 'kuva näytetään silti suoraan'."

### 1. Syy selvitetty: koodi piilotti kuvan TILATIEDON perusteella, ei latausvirheen

Tarkistettiin OIKEASTI `data/camera-status.json`:ista: `levi` JA
`sodankyla` olivat MOLEMMAT tällä hetkellä `isCustomThumbnail:true`
(väärä positiivinen, sama harvan tarkistuksen bugi kuin osiossa 6).
`applyCameraThumbVisibility()`-funktio (vanha nimi) PIILOTTI koko
`.rv-cam-thumb-wrap`:in (kuva mukaan lukien) AINA kun tämä lippu oli
tosi — EI koskaan edes YRITTÄNYT ladata kuvaa. Samaan aikaan
`cameraStatusText()` saattoi näyttää tekstin "kuva näytetään silti
suoraan" (MONITORING_STALE_THRESHOLD_MS-haarassa) — teksti JA toiminta
olivat siis RISTIRIIDASSA keskenään, koska ne lukivat osittain samaa
dataa mutta päättivät asioista erikseen/epäjohdonmukaisesti.

**Vahvistettu OIKEASTI että kuvat OLISIVAT ladattavissa:** haettiin
`hqdefault_live.jpg` suoraan Leville ja Sodankylälle - molemmat
palauttivat HTTP 200 + kelvollisen JPEG-kuvan (6807 ja 8668 tavua).
Kyse ei siis ollut latausongelmasta YouTuben puolella - koodi vain ei
koskaan edes YRITTÄNYT, koska piilotti kuvan etukäteen tilalipun takia.

### 2. Korjaus: kuvan näyttäminen riippuu NYT YKSINOMAAN latauksen onnistumisesta

`isCustomThumbnail`-lippu EI enää vaikuta kuvan näkymiseen MISSÄÄN
(ei kortissa, ei "kaikki kamerat" -ruudukossa). Uusi `loadCameraThumb()`
yrittää AINA ladata ensin `hqdefault_live.jpg`:n, ja jos se epäonnistuu
(`onerror`), varapolun `hqdefault.jpg`:n - VASTA jos MOLEMMAT epäonnistuvat,
näytetään "Esikatselu ei saatavilla juuri nyt — käytä yllä olevaa
YouTube-linkkiä" -viesti kuvan paikalla (uusi `.rv-cam-thumb-fail`-
elementti). Ruudukossa sama periaate: jokainen kamera yritetään AINA,
ja vasta jos lataus epäonnistuu kokonaan, kamera siirretään "Esikatselu
ei saatavilla" -linkkilistaan (dynaamisesti, latauksen epäonnistuttua -
ei enää etukäteen suodatettuna). `isCustomThumbnailCamera()`-funktio
poistettiin kokonaan kuolleena koodina (ei enää yhtään kutsupaikkaa).

### 3. Tuoreusteksti lyhennetty yhdeksi riviksi (vaatimus 4)

`cameraStatusText()` palauttaa nyt lyhyitä, yksiriviä: "Tuoreus
tarkistamatta (25 min)", "Muuttui 6 min sitten", "Ei päivity (35 min)",
"Lähetys ei käynnissä", "Ei muutu (kiinteä kuva?)" - ei enää pitkiä
selittäviä lauseita. `relativeMinutes()` palauttaa nyt pelkän
"N min" / "alle 1 min" (ei "sitten"-sanaa, lisätty erikseen tarvittaessa
kutsupaikassa jotta eri lauseet voivat muotoilla sen luontevasti).

**HUOM mitä EI muutettu:** itse `MONITORING_STALE_THRESHOLD_MS`-logiikka
(osio 6:n korjaus - erotus "oma seurantamme vanhentunut" vs. "kamera
oikeasti jumissa") pysyy ennallaan JA on edelleen hyödyllinen tieto -
se vain ei enää vaikuta kuvan näyttämiseen, on PELKKÄ pieni lisäteksti
kuvan alla, kuten tehtävänanto pyysi.

### Mitä testattiin MISSÄ (tämä osio, täysi rehellisyys)

**Oikeasti testattu:**
- `data/camera-status.json` luettu suoraan, vahvistettu että levi JA
  sodankyla olivat tällä hetkellä `isCustomThumbnail:true` - sama
  väärä positiivinen bugi jonka osio 6 jo ennusti mutta ei korjannut.
- Levi ja Sodankylä -kameroiden `hqdefault_live.jpg` haettu OIKEASTI
  juuri ennen korjausta - molemmat palauttivat HTTP 200 + kelvollisen
  kuvan - vahvistaen että korjaus TODELLA ratkaisee oireen (kuvat OVAT
  saatavilla, koodi vain ei yrittänyt hakea niitä).
- Uusi/muutettu JS (loadCameraThumb, cameraStatusText, openCameraGrid,
  moveGridItemToOthers) ajettu esprima-jäsentimellä virheettömästi läpi.

**EI testattu oikealla selaimella:**
- Kuvan todellinen näkyminen kortissa/ruudukossa selaimessa (pelkkä
  koodikatselmointi + HTTP-vahvistus että kuva OLISI ladattavissa).
- "Esikatselu ei saatavilla" -viestin ulkoasu/asettelu kuvan päällä.
- Lyhennetyn tuoreustekstin visuaalinen mahtuminen korttiin.

## 9. Uusien kameroiden pikkukuvatesti ja vanhentuneet video-ID:t (2026-10-15, haara `claude/amazing-fermat-wqln1q`)

### Miten testattiin
- Claude-kehitysympäristöstä YouTube ei ole tavoitettavissa (välityspalvelin
  estää `youtube.com`/`i.ytimg.com`), joten testi ajettiin **GitHub
  Actionsilla**: `.github/workflows/camera-probe.yml` +
  `scripts/probe-camera-candidates.py`. Käynnistyy kun
  `.github/camera-probe.env` muuttuu `claude/**`-haaralla; ei julkaise mitään.
- **Yöajo** 15.10. klo 17.00-19.00 UTC (20-22 Suomen aikaa, taivas pimeä):
  9 tarkistusta 15 min välein -> 8 vertailua per kamera. Ajo
  [38773569524](https://github.com/pekkasuni-dot/revontulivahti/actions/runs/38773569524).
- **Herkkä vertailu yökuville:** "muuttui" = (1) SHA-256 on ENNEN NÄKEMÄTÖN
  tässä ajossa JA (2) harmaasävyvertailussa (letterbox-palkit rajattu pois)
  >= 0,05 % pikseleistä muuttui >= 3 tasoa. Kohta (1) lisättiin, koska
  päivällä Levin `_live`-kuva vaihteli kahden VANHAN version välillä (CDN:n
  eri solmut, 7715 <-> 7779 tavua) - pelkkä "eri kuin edellinen" laski
  tämän muutokseksi. Kohta (2) erottaa uuden kehyksen pelkästä
  uudelleenpakkauksesta (testattu synteettisillä tummilla kohinakuvilla).
- **Kriteeri lisäykselle:** muuttui JOKAISESSA vertailussa (8/8).

### Havainnot matkan varrella
- YouTube vastaa katselusivuihin (`watch?v=`) GitHub Actionsista **HTTP 429**
  -> `isLiveNow`-tietoa ei saa. Kanavan `/channel/<ID>/live` palauttaa 200
  ilman ohjausta tunnistettavaan videoon (ei voi todentaa palvelimelta).
  Toimivat: kanavan `/streams`-sivu (videoID:t, käynnissä oleva ensin),
  oEmbed (otsikko, kanava), `i.ytimg.com`.
- `_live`-pikkukuva palauttaa 200 myös vuosien takaisille tallenteille
  (Starlapland 2024) -> 200 EI todista käynnissä olevaa lähetystä; 404 =
  lähetys päättynyt (Apukka `bOEvPL206Hc`).
- **Vanhentuneet ID:t (käyttäjän havainto: Posio osoitti päättyneeseen
  lähetykseen):** Posio, Lyngen North ja Aurora Reykjavík vaihdettu kanavan
  uusimpaan saman otsikon lähetykseen. **Yöajon tulos: uusikin ID 0/8** -
  pikkukuva on tavu tavulta sama kuin vanhan ID:n (Posio 26930, Lyngen
  25627, Reykjavík 10168 tavua). Eli kyse EI ollut (vain) päättyneestä
  lähetyksestä, vaan kanavan kiinteästä kansikuvasta, joka on asetettu
  kaikille lähetyksille. Kamerat jäävät sovellukseen (linkki striimiin
  toimii), mutta pikkukuva ei kerro taivaan tilaa.
- Video-ID päivittyy nyt automaattisesti (`scripts/youtube_live.py`,
  `check-camera-thumbnails.py` kerran tunnissa, ks. CLAUDE.md).

### Tulokset (yöajo, muutoksia / vertailuja)

| Kamera | ID | Muutoksia | Päätös |
|---|---|---|---|
| Levi, North view (Starlapland) - nykyinen | `rKfecmmzzw0` | 8/8 | ennallaan (toimii) |
| Sodankylä, North View (Starlapland) - nykyinen | `dnlQtDad6Dk` | 8/8 | ennallaan (toimii) |
| **Kalajoki, Adventure Park Pakka (Starlapland)** | `vsJBqHwnK9w` | **8/8** | **LISÄTTY** |
| **Oulu, Nallikari North (Samimaka)** | `KrINK7wDiY8` | **8/8** | **LISÄTTY** |
| Kilpisjärvi, North view (Starlapland) - vanha | `ccTVAhJU5lg` | 0/8 | korvattu |
| **Kilpisjärvi, wide angle (Starlapland)** | `UmDqwDl-oyw` | **5/8** (6 eri kuvaa) | **nykyisen Kilpisjärven uusi ID** (ei täytä 8/8-kriteeriä uutena kamerana, mutta selvästi elävä; North view ei muuttunut koskaan) |
| Oulu, "livestream Finland Oulu" (Samimaka) | `ZbRPgCffcqs` | 7/8 | ei lisätty (1 vertailu ilman muutosta) - hyvä ehdokas uusintatestiin |
| River Live Sodankylä 180° (Starlapland) | `mCFu45dOVy8` | 2/8 | ei lisätty |
| Posio (Hotel Lapin Satu) - uusi ID | `HuCjMGI8fKg` | 0/8 | kansikuva, ei muutu (jää sovellukseen) |
| Lyngen North - uusi ID | `yXJtBJDEzJo` | 0/8 | kansikuva, ei muutu (jää sovellukseen) |
| Aurora Reykjavík - uusi ID | `exshoGpNXZk` | 0/8 | kansikuva, ei muutu (jää sovellukseen) |
| Aurora Reykjavík, Golden Circle | `jEfK9AMiA5g`, `1fD0RJyftwA` | 0/8 | kansikuva, ei lisätty |
| Levi Sky Cam North (Starlapland) | `9xWw6r1p1BQ` | 0/8 | kansikuva, ei lisätty |
| Saariselkä (Starlapland) | `p09lM65L7po` | 0/8 | kansikuva, ei lisätty |
| Rovaniemi, Apukka Resort | `bOEvPL206Hc` | - (404, päättynyt) | ei lisätty |
| Rovaniemi, Apukka Resort - kanavan uusin | `wT8Zhh9MBEE` | 0/8 | kansikuva, ei lisätty |
| Inari | `P5Txi7u6tBs` | 0/8 | ei lisätty (oEmbed 401 = yksityinen/poistettu, 3185 tavun paikkakuva) |
| Utsjoki, Aurora Holidays | `jHfZ4ZYsaOA` | 0/8 | kansikuva, ei lisätty |
| Utsjoki, Aurora Service Tours | `pmIynxHd7D0`, `wIUIH_U72ac`, `cYgbaCtLLHM` | 0/8 | kansikuva, ei lisätty |
| Kilpisjärvi, Kilpissafarit | (vain 2014-2016 tallenteita) | 0/8 | ei livelähetystä, ei lisätty |
| Oulu, Samimaka muut (Nallikari West ym.) | `05lUDBm2b5Q`, `7R1q0zLEJV4`, `5Ey0i-Vff4w` | 0/8 | ei lisätty |

**Levi (tehtävän kohta 2):** sovelluksen Levi-kamera ON Starlaplandin
`rKfecmmzzw0` ("Northern Light Live Levi, Finland. North view"). Toista
Levi-kameraa (Sky Cam North) ei lisätty, joten nimi pysyy "Levi".

**Samimakan "Oulu Cam 1 & 2":** kanavalla (`@Samimaka`) ei ole näin
nimettyjä videoita; Oulun kamerat ovat "Seaside Nallikari ... North",
"... Ouluzipline.fi Nallikari West" ja "... livestream Finland Oulu".

### Mitä testattiin MISSÄ (täysi rehellisyys)
- **Oikeasti ajettu GitHub Actionsissa:** savutestit (3 kpl), nykyisten
  kameroiden diagnoosi, tuotannon `check-camera-thumbnails.py`:n
  kuivaharjoitus (kaikki kanavat ratkesivat), yöajo, sekä
  `camera-status.yml` mainissa yhdistämisen jälkeen (PR #28).
- **Paikallisesti:** vertailulogiikka synteettisillä kuvilla, ID-ratkaisijan
  logiikka mockatulla verkolla (uudempi lähetys valitaan, tila säilyy
  tunnin, ID:n vaihto nollaa seurannan), index.html:n JS-jäsennys.
- **EI testattu:** kuvien näkyminen oikeassa selaimessa; `/channel/<ID>/live`
  -linkin ohjaus selaimessa (Posio, Lyngen North).

## 10. Utsjoki (Aurora Holidays) - lisätty ilman live-kuvaa (2026-10-17, haara `claude/utsjoki-kamera`)

**Testi:** `camera-probe.yml`, ajo 39051096822, 16.50-19.20 UTC (pimeällä),
11 kierrosta 15 min välein, `--only-existing --keep-channel
utsjoki-aurora-holidays` (vertailuna nykyiset kamerat).

**Tulos:**
- Utsjoki (`jHfZ4ZYsaOA`, kanavan ainoa lähetys "LIVE northern lights camera
  from Utsjoki in Finnish Lapland", tekijä Aurora Holidays): **0/10
  muutosta**, kirkkaus 153 koko ajan, `hqdefault_live` == `hqdefault` 11/11.
  Pikkukuva on siis kiinteä kansikuva.
- Vertailukamerat Levi, Sodankylä, Kalajoki ja Kilpisjärvi: 10/10 muutosta
  -> testi itse toimi.

**Päätös (käyttäjän ohje: jos kuva ei päivity, vain linkki):** lisätty
`cameras.json`:iin `"liveImage": false`. Kortissa nimi, "Katso YouTubessa" ja
"Ei live-kuvaa"; ei kuvaa eikä "Kuva: ..."-riviä (tekijärivi piilotetaan nyt
aina, kun live-kuvaa ei ole). Ruudukossa suoraan linkkilistassa.
Todennettu headless-kuvakaappauksilla 360 ja 430 px (ei JS-virheitä).

**Tarkistettava puhelimella:** linkki avaa YouTube-sovelluksen oikeaan
lähetykseen.

**Muutos samana päivänä (käyttäjä: "en pidä tästä toteutuksesta"):** pelkkä
linkki korvattu upotetulla videolla. Kortissa kansikuva (`hqdefault.jpg`) +
toistonappi; napautus lataa `youtube-nocookie.com/embed/<videoId>`-soittimen
(autoplay mykistettynä, playsinline), sulku poistaa soittimen. Tekijärivi
näkyy taas. Ruudukossa kansikuva + toistomerkki. Upotus sallittu: oEmbed
vastasi probe-ajossa (YouTube palauttaa 401, jos upotus on estetty).
Hylätyt vaihtoehdot: kehyksen kaappaus GH Actionsilla (YouTube 429 +
kuvaa ei saa kopioida omalle palvelimelle); muu kuvalähde (ei tiedossa).
Testattu headless (soitin korvattu testisivulla, ei verkkoa): iframe
oikealla osoitteella, poistuu kortin sulkiessa, ei JS-virheitä, live-kuvalliset
kamerat ennallaan. **Puhelimella tarkistettava:** video käynnistyy kortissa
(iPhone playsinline), koko näyttö toimii, ääni saadaan päälle.

## 11. Grönlanti (Nuuk, Upernavik, Ilulissat) ja Lyngen Northin korjaus (2026-10-17, haara `claude/kamerat-video`)

**Testi:** `camera-probe.yml`, ajo 39069438487, 21.06-22.06 UTC, 7 kierrosta
10 min välein, `--only-existing` (kaikki cameras.json-kamerat + kanavien
muut lähetykset).

**Grönlanti** (käyttäjän tiedot: lentoasemat, kamerat pohjoiseen):

| Kamera | Video | Kanava | Muutoksia |
|---|---|---|---|
| Nuuk Airport North | Z80BrlmJ_2o | @GreenlandAirportsLiveWest (UCQzo9669uzsWC3I7UZYAA1Q) | 6/6 |
| Upernavik Airport North | wXEXB5NElxI | @GreenlandAirportsLiveNorth (UCCDXX7QowpaqEBl2EzXlrXA) | 6/6 |
| Ilulissat Airport North | XbGeRD37MFM | @GreenlandAirportsLiveNorth | 6/6 |

Pikkukuva päivittyy -> lisätty live-kuvallisina, `titleMatch` = lähetyksen
nimi, `liveUrl:false` (kanavilla useita kameroita: myös South-suunnat,
Sisimiut ja Qaarsut - ei lisätty, eivät osoita pohjoiseen tai eivät ole
pyydettyjä). Huom: `live==ei-live` oli tosi KAIKILLA kierroksilla, vaikka
kuva muuttui - vahvistaa, ettei tavuvertailu yksin kerro kiinteästä kuvasta.

**Lyngen North -virhe löytyi:** tuotannon video-ID:n päivitys oli valinnut
kanavalta otsikolla "Lyngen North" vanhan TALLENTEEN (OnqR_rHn2T4, "End of
season aurora at Lyngen North - 4th of April 2024"). Varsinainen lähetys on
SwXtDFC9Bro "Live northern lights camera at Lyngen North in Northern Norway"
(pikkukuva kiinteä 0/6 -> video). `titleMatch` tarkennettu.

**Muut havainnot samasta ajosta (yöllä, Suomen aikaa 00-01):** Levi,
Sodankylä, Kalajoki 6/6; Kilpisjärvi wide angle 0/6 (oli päivittynyt illalla
camera-statuksen mukaan - todennäköisesti kamera tai lähetys pysähdyksissä,
seurataan), Oulu Nallikari, Posio, Reykjavík, Utsjoki 0/6 (videokameroita).

## 12. Kolme uutta lähdettä, tunnusten tarkistus ja "Ei lähetystä" (2026-10-21, haara `claude/kamerat-uudet`)

**Uudet kamerat:**

| Kamera | Video | Kanava | Päätös |
|---|---|---|---|
| Luosto (Visit Pyhä-Luosto) | `dyRSvHGGvA8` "Visit Pyhä-Luosto Aurora Live" | UCOMxO-CYSd74rR-XQrgRR6w | **LISÄTTY live-kuvana** (pikkukuva päivittyy, käyttäjän havainto). Sijainti Luoston huippu (Ukko-Luosto 67,139 / 26,896, OSM): videon kuvaus "live broadcast from the top of Luosto Fell". Huom: Pyhän rinnekeskuksen sivulla mainittu revontulikamera Pyhän huipulla on eri kamera. |
| Rovaniemi, Apukka (Apukka Resort) | `wT8Zhh9MBEE` "Apukka Resort Live Cam Rovaniemi ..." | UC41lTeDc5XoWjVVfyZW7shA | **LISÄTTY videona** (`liveImage:false`): pikkukuva ei päivity (käyttäjä; 2026-10-15 0/8). Sijainti Tutkijantie 28 (66,578 / 26,015, OSM Nominatim). |
| Inari (käyttäjä: päivittyvä live-kuva) | `ePFfaAgZS-Y` | ei selvinnyt | **EI lisätty.** oEmbed 401 (sekä watch- että youtu.be-osoite), upotussivu (youtube.com ja -nocookie) palauttaa virheen, katselusivu UNPLAYABLE/LOGIN_REQUIRED. Pikkukuvat (_live ja tavallinen) 200. Sama oire kuin Kilpisjärven maksullisella wide angle -lähetyksellä -> todennäköisesti jäsenille rajattu tai upotus estetty. Ilman upotusta ja kanavaa ei toistoa kortissa eikä tunnusten seurantaa. Avoin: toimiiko linkki kirjautumatta (yksityinen ikkuna)? |

Alun perin pyydetty "Utsjoki, Aurora Holidays `ePFfaAgZS-Y`" osoittautui käyttäjän mukaan Inarin kameraksi. **Utsjoen vanha tunnus `jHfZ4ZYsaOA` toimii** (kanava Aurora Holidays UC7sG1cQ5TFIJarNQa2SSfGw, lähetys käynnissä 2026-10-21) -> ennallaan.

**Kilpisjärvi:** wide angle (`UmDqwDl-oyw`) oli maksullisen jäsenyyden takana (käyttäjä) eikä ole enää kanavan /streams-listalla -> vaihdettu ilmaiseen North view -lähetykseen `ccTVAhJU5lg` VIDEONA (pikkukuva ei päivity, käyttäjä; 2026-10-15 0/8). `titleMatch` "Kilpisjärvi, Finland\. North view".

**Nykyisten kameroiden tunnukset (GitHub Actions 2026-10-21 21.26 UTC, kanavien /streams-sivut):**

| Kamera | Tunnus | Tila |
|---|---|---|
| Levi | rKfecmmzzw0 | käynnissä |
| Kilpisjärvi | UmDqwDl-oyw | **ei listalla (maksullinen)** -> ccTVAhJU5lg |
| Posio | HuCjMGI8fKg | käynnissä |
| Lyngen North | SwXtDFC9Bro | käynnissä |
| Aurora Reykjavík | exshoGpNXZk | käynnissä |
| Sodankylä | dnlQtDad6Dk | käynnissä |
| Kalajoki | vsJBqHwnK9w | käynnissä |
| Oulu, Nallikari | FtzbzIvNJMg (cameras.json) | päättynyt; automaattinen seuranta oli jo vaihtanut `q1Kj2rZyyT8`:ään (käynnissä) -> cameras.json päivitetty |
| Utsjoki | jHfZ4ZYsaOA | käynnissä |
| Nuuk | Z80BrlmJ_2o | käynnissä |
| Upernavik | wXEXB5NElxI | käynnissä |
| Ilulissat | XbGeRD37MFM | käynnissä |

Tuotannon `check-camera-thumbnails.py` ajettu GitHubissa (ilman julkaisua) uusilla tiedoilla: kaikki 14 kameraa `broadcast: live`, tunnukset kuten yllä.

**Tunnusten seuranta:** kanavan tunnus (`youtube.channelId`) on kaikilla kameroilla, myös uusilla. Tunnus päivittyy automaattisesti `camera-status.yml`:ssä (ks. osa 9): kerran tunnissa kanavan /streams-sivulta uusin otsikkoon (`titleMatch`) osuva lähetys. Erillistä vuorokausityönkulkua ei tehty, koska tämä kattaa sen (ja GitHubin ajastus toteutuu käytännössä 4-5 h välein, ks. alla).

**"Ei lähetystä" (uusi):** /streams-sivun `ytInitialData`ssa käynnissä olevalla lähetyksellä on merkki `THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE` (+ "N watching"), päättyneellä teksti "Streamed 2h ago" (todennettu 11 kanavalla). `youtube_live.channel_streams()` + `resolve_camera_live()`: otsikkoon osuva käynnissä oleva lähetys -> `broadcast: 'live'` (ja tunnus siihen); merkit tunnistettu mutta ei käynnissä olevaa -> `'none'` (tunnus pidetään); merkkejä ei tunnistettu -> `null` ja vanha päättely. Sovellus (`camNoBroadcast()`, tieto voimassa 26 h): karttamerkki himmeä (0,4), ruudukossa himmeänä listan lopussa + "Ei lähetystä", kortissa "Ei lähetystä". Testattu headless synteettisellä tilalla (360/430 px, ei JS-virheitä). `'none'`-polkua ei ole nähty oikealla datalla (kaikki kanavat olivat käynnissä) - testattu vain mallidatalla.

**Huom - GitHubin ajastus:** `camera-status.yml` (*/10) ajettiin 2026-10-21 vain klo 00.01, 04.37, 09.37, 14.40 ja 18.59 UTC. Kameran tila voi siis olla tunteja vanha. Sama koskee kaikkia ajastettuja työnkulkuja (ks. MUISTIO-halytykset.md).

**Puhelimella tarkistettava:** Luoston ja Apukan merkit kartalla oikeissa paikoissa; Apukan ja Kilpisjärven video käynnistyy kortissa.
