# MUISTIO: testausympäristö ja asetteluhavainnot (2026-10)

Työkalu ja testikoot: CLAUDE.md "Testaus ja kuvakaappaukset".

## Ensimmäinen ajo: main v1.138, 2026-10-17

`npm run screenshots -- --offline --landscape` (Claude-ympäristöstä ei pääse
verkkoon, joten data on synteettistä ja pohjakartta tyhjä). 7 kokoa × 4 tilaa
(kartta, säävalikko, infoikkuna, asetukset) = 28 kuvaa + 4 yhteenvetokuvaa.
Ei JS-virheitä, kaikki tilat avautuivat. Kuvat on liitetty keskusteluun, eivät
ole repossa.

### Asetteluongelmat (EI korjattu tässä tehtävässä)

Vakavuusjärjestyksessä, mobiili ensin:

1. **Attribuutio on avattuna heti käynnistyksessä, kaikissa koissa.**
   MapLibren `compact`-attribuutio alkaa auki (`maplibregl-compact-show`) ja
   sulkeutuu vasta ensimmäisestä kartan vedosta. 360 × 640:ssa se vie neljä
   riviä (~85 px) aikajanan yläpuolelta ja peittää kartan alaosan. Oikealla
   puhelimella sama, kunnes karttaa vedetään.
2. **Attribuution linkki "Mapzen Terrain Tiles" näkyy lähes mustana
   tummalla taustalla.** Teksti on käytännössä lukukelvoton. Muu teksti on
   harmaata, linkki tummaa.
3. **Infoikkuna peittää puhelimella nappisarakkeen alaosan.** 360 × 640:ssa
   alhaalta nouseva paneeli (56 %) peittää kamera-, info- ja
   karttapohjanapin. Myös infonappi, josta ikkuna avattiin, jää piiloon.
   Sulkeminen onnistuu ruksista tai pyyhkäisemällä, mutta muut napit eivät
   ole käytettävissä ikkunan ollessa auki. Isommissa puhelimissa (390-430)
   peittyy alin nappi tai kaksi. Asetusikkuna sen sijaan jättää sarakkeen
   näkyviin (`.info-panel`-sääntö).
4. **Infoikkunan Nyt-välilehdellä on tyhjä tila välilehtien ja indeksin
   välissä**, noin 60 px kaikissa koissa. Kyse on huomautusslotista, joka
   on jo avoimena kysymyksenä MUISTIO-infoikkuna.md:ssä. Pienellä
   puhelimella tila on kallis: indeksin laatikot jäävät puoliksi näkyviin.
5. **360 × 640, asetukset:** ikkunan alareuna ulottuu aikajanan pillerin
   päälle (osittain peitossa). Toimii, mutta tilaa ei ole lainkaan
   ylimääräistä. Uusi asetusrivi pakottaa ikkunan vierittymään tässä
   koossa.
6. **Vaakanäkymä 844 × 390** (vain tarkistus, ei tarvitse olla hiottu):
   - Vasemman ja oikean reunan safe-area-insettejä ei huomioida missään
     (`safe-area-inset-left/right` puuttuu CSS:stä). iPhonen vaakanäkymässä
     lovi peittää logon tai nappisarakkeen.
   - Nappisarake menee attribuution ja aikajanan päälle: kamera-, info- ja
     karttapohjanappi ovat attribuutiolaatikon ja aikajanan pillerin päällä.
   - Info- ja asetusikkuna leikkautuvat alareunasta (sisältö vierittyy,
     ei rikki).
7. **Tabletti 820 × 1180 pystyssä** käyttää tietokoneasettelua.
   Infoikkuna on vasen sivupaneeli, jonka alaosa jää tyhjäksi (~40 %), ja
   aikajana kapenee oikealle. Ei rikki. Avoin kysymys: pitäisikö tabletin
   pystyasennossa käyttää puhelimen alapaneelia?

Kunnossa kaikissa koissa: ylärivi (logo, asetukset, valikko) loven alla
oikein (`--btn-top`), säävalikon rivi, aikajana ja mallimerkintä kotipalkin
yläpuolella, nappipino ei törmää aikajanaan pystynäkymissä.

### Mitä simulaatio ei näytä (tarkistettava oikealla puhelimella)
- Kosketuseleet: infoikkunan veto ja pyyhkäisy, aikajanan veto, kartan
  nipistys. Tarkista myös, ettei sivu zoomaa tai vieritä vahingossa.
- Paikannus: lupakysely, sininen piste, toiminta jos lupa evätään.
- Kotipalkki (iPhonen alareunan vaakaviiva / Androidin eleviiva) ja
  lovi/Dynamic Island: **testattu oikealla puhelimella 2026-10, OK** -
  aikajana ja mallin nimi eivät jää viivan alle, eikä kotiin pyyhkäisy
  liikuta aikajanaa (kotivalikkoon asennettuna).
- Pystylukitus Androidilla kotivalikkoon asennettuna: **testaamatta**,
  testataan myöhemmin. iPhone ei noudata manifestin `orientation`-arvoa,
  joten kääntyminen vaakaan siellä on odotettua (todettu 2026-10).

### Päätökset (käyttäjä 2026-10)
- **Lopullinen käyttötapa on natiivisovellus** Androidille ja iPhonelle
  (sovelluskaupat). Verkkoversiota käytetään kotivalikkoon asennettuna.
- **Selaimen osoitepalkkia ei huomioida** suunnittelussa eikä testauksessa
  (ei osoitepalkkia asennettuna eikä natiivisovelluksessa).
- **Värinäpalaute otetaan käyttöön natiivisovellusvaiheessa** (myös
  iPhonelle). Verkkoversion nykyistä Android-toteutusta ei testata eikä
  kehitetä nyt.

### Oletukset ja huomiot
- **Simuloidut safe-area-arvot** (`SIZES[].insets` skriptissä) vastaavat
  asennettua sovellusta, pahinta tapausta:

  | Laite | Ylä (px) | Ala (px) | Huomio |
  |---|---|---|---|
  | iPhone | 47 | 34 | |
  | Dynamic Island | 59 | 34 | |
  | Android | 24 | 16 | Pieni Android: ala 0 |
  | iPad | 24 | 20 | |
  | Vaaka | – | 21 | Sivut 47 |

  Arvot ovat yleisiä laitearvoja, eikä niitä ole mitattu oikeilta
  laitteilta.
- **Tehtävän kohta B4 oli jo tehty:** manifestissa on ollut
  `"orientation": "portrait"` jo ennestään (commit fc10606, 2026-10-12).
  Manifestia ei muutettu, joten service workerin versiota ei nostettu.
  Bumppaus olisi vain pakottanut käyttäjille turhan päivityksen.
- `apple-mobile-web-app-status-bar-style`-metaa ei ole. iOS:n asennetussa
  tilassa tilapalkki on silloin oletustyylinen, eikä kartta ulotu sen alle.
  Tätä ei muutettu. Avoin kysymys, halutaanko kartta tilapalkin alle
  (`black-translucent`).

## Sivun zoomauksen esto (2026-10, v1.139)

Toteutus: CLAUDE.md "Suunnitteluperiaatteet". Headless-testi (390 × 844,
mobiiliemulointi): kartan nipistys (4,6 -> 5,8) ja tuplanapautus (+1) toimivat,
ei JS-virheitä, asettelu ennallaan (`--quick`). Sivun zoomausta testi EI
pysty todistamaan: sama testi ILMAN estoa ei myöskään zoomannut sivua
(Chromiumin simulointi ei skaalaa sivua), joten esto on todennettava
puhelimella.

**Tarkistettava oikealla iPhonella ja Androidilla (kotivalikkoon asennettuna):**
- Nipistys ja tuplanapautus napin, säävalikon rivin, aikajanan, infoikkunan
  ja asetusikkunan päällä EIVÄT zoomaa sivua.
- Kartan nipistys ja tuplanapautus zoomaavat karttaa kuten ennen.
- Infoikkunan veto kahvasta ja sisällön vieritys toimivat yhä.
- Aikajanan pallon veto toimii yhä.

## Kamerat, lähdemaininnat, säämallirivi ja avaussivu (2026-10, v1.145)

Kuvat: `npm run screenshots -- --offline --sizes=360x640,430x932
--states=avaussivu,kamera,asetukset,lahteet,karttapohja,satelliitti`
(uudet tilat: kamera, lahteet, karttapohja, satelliitti, avaussivu).
Liitetty keskusteluun.
- **Säämallirivi:** mitattu headless-testissä 360 × 640 kaikilla 5 kielellä,
  24 h ja 12 h.
  - Otsikko on yhdellä rivillä ilman lyhennystä.
  - Oikean puolen kaksi riviä eivät rivity, ja nappi pysyy paneelin sisällä.
  - Tämän vuoksi en/es/fr-otsikko lyhennettiin: "Model" / "Modelo" /
    "Modèle". Ennen otsikossa puuttui tilaa jopa 89 px (es, 12 h).
- **Testisivu (revontulikaari, kohta 7):**
  - Heti katsottavissa: https://claude.ai/artifact/81GR2Ln66fMwCoDLfhutQG
  - Mainiin yhdistämisen jälkeen:
    https://pekkasuni-dot.github.io/revontulivahti/avaussivu-testi.html
    (`?v=a`, `?v=b`, `?v=c`)
  - Piirto headless-Chromiumissa 16,5 ms/kehys = 60 fps kaikilla
    versioilla. Kuormaa: canvas 2D puolella resoluutiolla, ~110 kuvan
    piirtoa/kehys, ei suodattimia. EI mitattu oikealla vanhalla puhelimella.

**Tarkistettava oikealla puhelimella (kotivalikkoon asennettuna):**
- **Avaussivu:**
  - Ei välähdä ennen avaussivua eikä sen jälkeen.
  - Häivytys karttaan on pehmeä.
  - Taustalta palatessa avaussivua EI näytetä.
  - OSM-maininta ehtii näkyä (vähintään ~1 s).
- **Kamerakortti:** järjestys ja "Katso YouTubessa" -linkki, joka avautuu
  YouTube-sovellukseen.
- **Asetukset:**
  - "Tietoja ja lähteet" aukeaa ja linkit avautuvat.
  - Ikkuna vierittyy sormella loppuun asti.
- **Satelliittipohja:** Esrin maininta näkyy aikajanan yläpuolella eikä
  peitä mitään.
- **Revontulikaaren testisivu:** sujuvuus omalla (ja mahdollisimman
  vanhalla) puhelimella, kaikki kolme versiota.

## Avaussivun poisto, uusi aikajana ja alapalkki (2026-10, v1.152)

Headless-testit 360 × 640 ja 430 × 932 (synteettinen data, ei verkkoa):
- **Käynnistys:** OSM-maininta näkyy logon alla 1,5 s kohdalla ja häviää
  ensimmäisestä kartan vedosta (`osm-intro` pois), viimeistään 5 s.
- **Aikajana:** nykyhetkessä ("Nyt · su 00.00") ja siirrettynä ("su 03.00
  (+3 h) ↺"); molemmat tekstit ja säämalli luettavia vaalean pilven päällä.
- **Alapalkki:** neutraali (16 %, Kp 3,7) ja vihreä testiarvoilla (52 %,
  Bz −4); Bz vihreä etelään.
- **Infoikkuna:** kytkin oma sijainti / valittu piste, vihje kun pistettä ei
  ole, pisteen valinta vaihtaa kytkimen, koordinaattirivi päivittyy;
  kahvan napautus sulkee; alapalkin arvot häivytetty ikkunan ollessa auki.
- **Kytkin ilman valittua pistettä** (tila `infovihje`): "Valittu piste"
  himmeä, napautus näyttää vihjeen "Valitse piste napauttamalla karttaa."
  koordinaattirivillä 2,5 s, kytkimen ja rivin koko ei muutu.
- **Kytkin mahtuu 360 px:n leveydelle kaikilla 5 kielellä** (mitattu: ei
  katkeamista, puoliskot 164 px).
- **Yksikön vaihto** (24 h -> 12 h) ikkunan ollessa auki päivittää
  pimeän jakson ajat heti.
- Tietokone 1440 × 900: sivupaneeli, koko levyinen aikajana ja alapalkki
  toimivat. Ei JS-virheitä missään testissä.

**Tarkistettava oikealla puhelimella (kotivalikkoon asennettuna):**
- Alapalkin veto ylös avaa ikkunan sormen mukana; napautus avaa.
- Kahvan napautus ja veto alas sulkevat; pillerin arvot palaavat näkyviin.
- Alapalkki ja tekstirivi kotipalkin yläpuolella, kotiin pyyhkäisy ei avaa
  ikkunaa vahingossa.
- Ajankohdan napautus palauttaa nykyhetkeen, eikä se vie vetopalloa
  säätimen vasemmasta reunasta (pieni siirto, 1-2 h).
- OSM-maininta häviää ensimmäisestä kartan liikutuksesta.
