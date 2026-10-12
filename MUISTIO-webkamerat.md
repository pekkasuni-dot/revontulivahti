# Muistio: webkameraselvitys (EI toteutusta)

Haara: `feature/sijainti-ja-kamerat`. Main koskematta. **Tämä on pelkkä
selvitys — ei yhtään koodiriviä kameroita varten on kirjoitettu.**

Tavoite: kartalle pisteinä kamerat, joista opas näkee taivaan tilanteen.

## 1-2. Lähteet ja taulukko

| Lähde | Sijainnit/määrä | Rajapinta vai sivusto | API-avain/rekisteröinti | Lisenssi/kaupallinen käyttö | Päivitysväli | Yöllä hyödyllinen? |
|---|---|---|---|---|---|---|
| **SGO/FMI MIRACLE all-sky-kamerat** | 8 asemaa verkossa: Hankasalmi, Nyrölä, Muonio, Kevo, **Abisko** (Ruotsi), Sodankylä — + Longyearbyen/Ny-Ålesund (Huippuvuoret, ei Lappi). **5 asemaa Suomen Lapissa/lähialueella + 1 Ruotsissa.** | Verkkosivu (kuvagalleria/reaaliaikasivu), EI dokumentoitua julkista REST-API:a löytynyt | Ei avainta kuvien katseluun, mutta ei myöskään virallista ohjelmointirajapintaa | **TODENNETTU:** SGO Data Licence — akateeminen käyttö ilmaista, **kaupallinen käyttö/jälleenjulkaisu vaatii SGO:n KIRJALLISEN ETUKÄTEISLUVAN eikä ole yleensä ilmainen.** Uudelleenjakajan on varmistettava että kolmaskin osapuoli hyväksyy lisenssin. | Ei tarkkaa väliä löytynyt (kuvat uudistuvat usein, joitain sek-minuutteja) | **KYLLÄ — tämä on NIMENOMAAN taivaskamera**, suunniteltu yöhavaintoihin |
| **UiT Tromsø (Skibotn-observatorio)** | 1 kamera, Skibotn (lähellä Tromssaa) | Verkkosivu, ei löytynyt API:a | Ei tiedossa | **EI LÖYTYNYT selkeää lisenssiä verkkosivulta** — oletettavasti samantyyppinen akateeminen-vapaa/kaupallinen-lupaa-vaativa kuin SGO, mutta EI VARMISTETTU | ~1 min (kun aurinko >10° horisontin alla) | **KYLLÄ**, taivaskamera |
| **IRF Kiruna (Ruotsi)** | 1 kamera, Kiruna | Verkkosivu | Ei tiedossa | Ei tutkittu tarkemmin (ei ehditty) | Ei tiedossa | Todennäköisesti kyllä (tieteellinen taivaskamera) |
| **Fintraffic/Digitraffic kelikamerat** | **814 asemaa koko Suomessa (TARKISTETTU oikealla API-kutsulla), joista 78 leveysasteella ≥66°N** (Lappi+lähialue, esim. Kuusamo/Ruka, Kolari/Äkäslompolo, Rovaniemi) | **Dokumentoitu julkinen REST-API** (`tie.digitraffic.fi/api/weathercam/v1/...`), suorat kuvalinkit `weathercam.digitraffic.fi/{presetId}.jpg` | **EI avainta, EI rekisteröintiä.** HUOM tekninen yksityiskohta: rajapinta vaatii `Accept-Encoding: gzip` -otsakkeen, muuten HTTP 406 (todennettu testaamalla — ensimmäinen yritykseni ilman tätä otsaketta epäonnistui) | **TODENNETTU: CC BY 4.0, kaupallinen käyttö NIMENOMAISESTI sallittu**, vain lähdemerkintä vaadittu ("Source: Fintraffic / digitraffic.fi, license CC 4.0 BY") | **~10 min** | **EI SUORAAN** — kamerat kuvaavat TIETÄ, eivät taivasta. Yöllä nakyy vain valaistu tienpätkä; hyoty on EPASUORA proxy (nakeeko selvasti vai lumisadetta/sumua) |
| **Statens vegvesen (Norja) tiekamerat** | Satoja kameroita koko Norjassa, "säälle alttiit paikat, vuoristosolat" — pohjoisimpien (Troms/Finnmark) tarkkaa lukumäärää ei laskettu | DATEX-rajapinta (SOAP/WSDL/WFS/WMS) koko listalle; **TODENNETTU suora kuvahaku toimii ilman erillista lupaa:** `https://kamera.atlas.vegvesen.no/api/images/{id}` (testattu oikealla HTTP-kutsulla, palautti 200 OK + oikean JPEG-kuvan) | Koko asemalistan/DATEX-rajapinnan kaytto vaatii rekisteroitymisen; **yksittaisen kuvan haku EI vaadi** | NLOD (Norwegian Licence for Open Government Data) — vastaava henki kuin CC BY, **kaupallinen kaytto sallittu** | Vaihtelee kameratyypin mukaan | Sama rajoitus kuin Digitraffic - tiekamera, ei taivaskamera |
| **Trafikverket (Ruotsi) tiekamerat** | Koko Ruotsi, pohjoisosan (Norrbotten/Kiruna-alue) maaraa ei laskettu | REST-API JSON/XML-muodossa | **Vaatii rekisteroitymisen + API-avaimen** | **EPASELVA kaupallisen kayton osalta.** Yksi lahde mainitsee CC0 (julkinen domain) koko API:lle, mutta kolmannen osapuolen katsaus kuvailee lisenssikaytannon "epamaaraiseksi" juuri kaupallisen kayton/muokkauksen suhteen. **EI VARMISTETTU onko tama sama lisenssi NIMENOMAAN kamerakuville** (kuvat voidaan kasitella eri tavalla kuin metadata yksityisyyssyista). | Ei tutkittu tarkasti | Sama rajoitus - tiekamera |
| **Hiihtokeskusten/matkailuyritysten kamerat** (Levi, Ylläs, Saariselkä, Pyhä, Ruka, Kilpisjärvi) | Kymmenia yksittaisia kameroita, EI yhtenaista listaa - jokainen operaattori (Ruka.fi, Levi.fi, Kilpissafaris, Starlapland, Santatelevision-aggregaattori jne.) yllapitaa omaansa | **EI yhtenaista rajapintaa.** Vaihtelevasti: still-kuva, video-striimi, tai upotettu soitin (ei varmistettu tarkkaa tekniikkaa jokaiselle) | Ei tiedossa yleisesti, vaihtelee operaattoreittain | **EI LÖYTYNYT muodollisia kayttoehtoja yhdellekaan tarkistetulle operaattorille.** Useat kolmannen osapuolen sivustot (Santatelevision, aurorawebcams.com, webcamtaxi.com) jo nayttavat naita kameroita - EPASELVAA onko tama virallisesti luvitettua vai pelkkaa hotlinkkausta. | Vaihtelee suuresti | **VAIHTELEVA** - osa (esim. Kilpisjärven "revontulikamerat") on NIMENOMAAN yökäyttöön suunniteltu, suurin osa on paiva-/rinnekameroita jotka eivät näytä mitään pimeällä |

## 3. Tekninen toteutus: vaihtoehtojen vertailu

### Suora kuvalinkki selaimessa vs. GitHub Actions -haku data/-kansioon

**Suora linkki (selain hakee kuvan vasta napautuksesta) on OIKEA valinta
avoimen lisenssin lähteille** (Digitraffic, Vegvesen):
- Täyttää vaatimuksen "kuvat ladataan vasta napautuksesta" luonnostaan.
- EI ole "jälleenjulkaisua/tallennusta" lisenssimielessä — sovellus vain
  NÄYTTÄÄ linkin, selain hakee kuvan suoraan lähteeltä. Tämä on
  merkityksellinen ero erityisesti SGO:n kaltaisille lähteille joiden
  lisenssi erottelee "käytön" ja "jälleenjulkaisun/tallennuksen".
- Aina tuore (ei välimuistiviivettä).
- **HAITTA:** jos lähde on alhaalla/hidas, käyttäjä näkee sen suoraan;
  CORS-asetukset lähteen palvelimella voivat estää `fetch()`-kutsun
  selaimessa (EI TESTATTU oikealla selaimella — vain Python-skriptillä,
  joka ei kunnioita CORS:ia samalla tavalla). Jos CORS estää, `<img
  src="...">`-elementti toimii silti (kuvat eivät ole CORS-rajoitettuja
  samalla tavalla kuin `fetch()`-data), joten tämä on todennäköisesti
  turvallinen reitti joka tapauksessa.

**GitHub Actions -haku data/-kansioon SOPISI VAIN** tilanteisiin joissa
tarvitaan vain ASEMALISTA (koordinaatit, nimet, id:t — ei itse kuvia) —
tämä metadata on pientä, muuttuu harvoin, ja sen kerääminen säännöllisesti
(esim. 1x/vrk) pitää kartan pisteet ajan tasalla ilman jatkuvaa
rajapintakutsua selaimesta joka kerta kun kartta avataan. **EI itse
kuvia** — niiden tallentaminen omaan repoon olisi:
1. Selkeä jälleenjulkaisu (ongelma SGO:n kaltaisille rajoitetun
   lisenssin lähteille).
2. Valtava tietomäärä jos tehdään kaikille 814+ Digitraffic-asemalle
   usein (vaikka Digitrafficin lisenssi sallisi sen).
3. Tarpeeton — Digitraffic/Vegvesen päivittävät joka tapauksessa
   useammin kuin GH Actions -cronit järkevästi voisivat (10 min vs.
   esim. tunti), joten suora linkki on sekä juridisesti turvallisempi
   että teknisesti tuoreempi.

**Pelkkä linkki kameran omalle sivulle** on OIKEA oletusvalinta
lähteille joiden lisenssi on EPÄSELVÄ tai rajoittava (SGO kaupallisessa
käytössä, Trafikverket, hiihtokeskusten yksittäiset kamerat) KUNNES
lupa on erikseen varmistettu — tämä EI vaadi mitään lisenssiä (linkki
johonkin ei ole "käyttöä" samalla tavalla kuin kuvan upottaminen).

### CORS ja hotlinkkaus

- **Digitraffic:** suunniteltu nimenomaan julkiseen käyttöön, kuvat
  todennäköisesti CORS-sallittuja — EI VARMISTETTU oikealla
  selainkutsulla tässä ympäristössä (ei selainta).
- **Vegvesen:** uusi `kamera.atlas.vegvesen.no/api/images/{id}` toimi
  suoralla HTTP-haulla (Python), mutta CORS-otsakkeita ei tarkistettu
  erikseen (Python ei testaa CORS:ia, se on selainkohtainen rajoitus).
- **Hiihtokeskukset/SGO:** todennäköisesti EI suunniteltu kolmansien
  osapuolten upottamiseen — `<img src>` toimisi todennäköisesti teknisesti
  (kuvat eivät yleensä ole CORS-suojattuja `<img>`-tagilla ladattaessa),
  mutta se EI poista lisenssikysymystä.

### Tietomäärä puhelimella

Kaikki tarkistetut still-kuvalähteet ovat tavallisia JPEG-kuvia
(Digitraffic-esimerkki: tyypillinesti kymmeniä-pari sataa KB per kuva,
Vegvesen-testikuva 114 KB). Jos kartalla näytetään VAIN pisteet
(koordinaatit) ja kuva ladataan vasta pisteen napautuksesta, tietomäärä
on olematon kunnes käyttäjä itse valitsee katsoa kuvan - tämä täyttää
vaatimuksen "pikkukuvat/lataus vasta napautuksesta" suoraan.
Digitraffic tarjoaa valmiiksi pienemmän `thumbnail=true`-vaihtoehdon.

### Karttaesitys

- **Klusterointi:** MapLibre GL JS:n sisäänrakennettu
  `cluster:true`-GeoJSON-lähdeominaisuus (jo käytössä muualla projektissa
  samantyyppisiin tarpeisiin?  EI vielä, mutta sama tekniikka joka
  toimisi suoraan tähän) hoitaisi 814+ Digitraffic-pisteen ryhmittelyn
  zoomattaessa ulos — tämä on vakiotoiminnallisuus, ei vaadi omaa logiikkaa.
- **Kameratyypin erottelu:** eri ikoni/väri per tyyppi (esim. tähti-ikoni
  = taivaskamera, tie-ikoni = kelikamera) - yksinkertainen
  `icon-image`-tyylimäärittely tyypin mukaan, sama malli kuin tuulinuolet.
- **Aikaleima:** Digitrafficin oma `dataUpdatedTime`-kenttä on suoraan
  käytettävissä "Kuva: 3 min sitten" -laskentaan. Muille lähteille
  (SGO, Vegvesen) ei löytynyt yhtä suoraviivaista metadataa - saattaisi
  joutua päättelemään kuvan tiedostonimestä/HTTP-headerista
  (`Last-Modified`) jos saatavilla, EI VARMISTETTU.

## 4. Suositus

**Vaihe 1 — aloita Digitraffic-kelikameroista (Suomi):**
Täysin avoin (CC BY 4.0, kaupallinen sallittu), ei avainta, dokumentoitu
API, 78 asemaa jo pelkästään ≥66°N. Tällä voi rakentaa ja TESTATA koko
tekninen infrastruktuuri (kartan pisteet, klusterointi, napautus→kuva,
aikaleima) täysin riskittömästi lisenssin suhteen, VAIKKA nämä eivät
suoraan näytä taivasta — ne toimivat hyödyllisenä "näkyykö tänä iltana
lunta/sumua tällä alueella" -lisätietona pilvimallien rinnalla, ja
infrastruktuuri on helppo laajentaa muihin lähteisiin myöhemmin.

**Vaihe 2 — ota yhteyttä SGO:hon/FMI:hin ennen taivaskameroiden
käyttöä:** tämä on se lähde joka OIKEASTI vastaa tehtävän tavoitetta
("kamerat joista opas näkee taivaan tilanteen"), mutta heidän oma
lisenssinsä VAATII kirjallisen luvan kaupalliseen käyttöön — ja koska
ammattiversio on tulossa, tämä kannattaa selvittää AIKAISIN (vastausaika
ihmiseltä, ei teknistä estettä). Sama koskisi UiT:tä (Tromssa) ja IRF:ää
(Kiruna) jos halutaan laajentaa Norjaan/Ruotsiin. **Esitän tätä
ensimmäiseksi konkreettiseksi askeleeksi: lähetä SGO:lle/FMI:lle
sähköposti kysyen lupaa näyttää heidän all-sky-kuviansa sovelluksessa
(myös tulevassa kaupallisessa versiossa), ennen kuin mitään koodia
kirjoitetaan tätä varten.**

**Vaihe 3 (valinnainen, matalampi prioriteetti) — Vegvesen (Norja):**
tekninen kuvahaku toimii jo ilman erillistä lupaa, lisenssi (NLOD)
sallii kaupallisen käytön — mutta nämä ovat tiekameroita, eivät
taivaskameroita, joten hyöty on sama epäsuora proxy kuin Digitrafficilla.
Lisää arvoa ensisijaisesti jos halutaan kattavuutta Norjan puolelle
(esim. Tromssan alue) ennen kuin UiT:n taivaskameraa saadaan käyttöön.

**EI toistaiseksi — Trafikverket (Ruotsi):** lisenssi kaupallisen
käytön osalta on epäselvä kolmannen osapuolen arvion mukaan eikä sitä
pystytty varmistamaan suoraan virallisesta lähteestä tässä selvityksessä.
Selvitä lisenssi suoraan Trafikverketiltä ENNEN teknistä työtä.

**EI toistaiseksi — hiihtokeskusten/matkailuyritysten kamerat:**
ei yhtenäistä teknistä mallia eikä löydettyjä käyttöehtoja yhdeltäkään
tarkistetulta operaattorilta. Jos joku NIMENOMAINEN kamera halutaan
mukaan (esim. Kilpisjärven tunnettu revontulikamera), se vaatisi
erillisen yhteydenoton KYSEISEEN operaattoriin - ei systemaattinen
lähde.

## Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeasti testattu (oikeilla HTTP-kutsuilla):**
- Digitraffic weathercam-API: haettu oikea asemalista (814 kpl),
  laskettu Lapin alueen asemat (78 kpl ≥66°N) suoraan datasta — EI
  oletettu lukumäärää mistään dokumentaatiosta.
- Vegvesen `kamera.atlas.vegvesen.no/api/images/{id}`: haettu oikea
  kuva, vahvistettu HTTP 200 + `image/jpeg`.
- Digitrafficin `Accept-Encoding: gzip` -vaatimus löytyi KÄYTÄNNÖSSÄ
  (ensimmäinen yritys ilman sitä epäonnistui HTTP 406:lla) - ei luettu
  dokumentaatiosta etukäteen.

**Vain verkkohaku/sivujen lukeminen (ei suoraa API-testausta):**
- SGO:n, UiT:n, IRF:n lisenssit ja kamerakuvaus — luettu heidän omilta
  verkkosivuiltaan (WebFetch), EI yritetty löytää/kutsua mahdollista
  kuvarajapintaa suoraan.
- Trafikverketin lisenssi — ristiriitainen tieto (CC0-maininta vs.
  "epämääräinen"-arvio), EI pystytty ratkaisemaan lopullisesti.
- Hiihtokeskusten kamerat — ei testattu teknisesti ollenkaan, vain
  kuvailtu hakutulosten perusteella.
- CORS-käyttäytyminen (selaimen `fetch()`/`<img>`-rajoitukset) EI
  testattu kertaakaan oikealla selaimella — kaikki HTTP-testit tehtiin
  Pythonilla, joka ei sovella CORS-sääntöjä. Tämä on merkittävä
  avoin kysymys ennen Vaihe 1:n toteutusta.

**Ei toteutettu eikä testattu koodina:** mitään tämän selvityksen
pohjalta — tehtävänannon mukaisesti vain selvitys, ei toteutusta.
