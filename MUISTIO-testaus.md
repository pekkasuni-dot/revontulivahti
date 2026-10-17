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
- Kotipalkki (iPhonen alareunan vaakaviiva, josta pyyhkäistään kotinäyttöön;
  Androidin eleviiva) ja lovi/Dynamic Island: aikajana ja mallimerkintä eivät
  saa jäädä viivan alle, eikä kotiin pyyhkäisy saa osua aikajanaan.
  Simuloidut arvot ovat oletuksia (ks. alla), ja Safarin välilehdessä ne ovat
  eri kuin kotivalikkoon asennettuna.
- Selaimen osoitepalkki (Safarin alareunan osoite-/välilehtipalkki, Chromen
  yläpalkki): se kutistuu ja kasvaa, jolloin näkyvä korkeus muuttuu -
  alareunan elementit eivät saa jäädä sen alle tai hyppiä.
- Värinäpalaute aikajanassa: VAIN Android (iPhone ei tue `navigator.vibrate`,
  asetus on siellä piilotettu).
- Pystylukitus: toimii VAIN Androidilla kotivalikkoon asennettuna ja
  kuvakkeesta avattuna. iPhone ei noudata manifestin `orientation`-arvoa
  selaimessa eikä asennettuna, joten kääntyminen vaakaan on odotettua
  (käyttäjä todennut 2026-10). iPhonella lukitus vasta kauppaversiossa tai
  Ohjauskeskuksen kiertolukolla.

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
