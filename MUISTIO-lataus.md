# Latausnopeus ja heikko yhteys

## Vaihe 1: mittaus (2026-10-20)

**Miten mitattu:** Playwright (Chromium, 390 × 844, mobiili) julkaistua
sivua `https://pekkasuni-dot.github.io/revontulivahti/` vasten GitHub
Actionsista (tilapäinen työnkulku `probe-load.yml` + `.github/probe-load/
measure.mjs`, haarassa `claude/latausnopeus`; poistetaan ennen yhdistämistä).
Verkko rajoitettu CDP:llä:

| Profiili | Lataus | Viive |
|---|---|---|
| normaali | rajoittamaton (Azure-palvelin, USA) | - |
| nopea 3G | 1,6 Mbit/s | 150 ms |
| hidas 3G | 0,4 Mbit/s | 400 ms |

Kylmä = tyhjä välimuisti, lämmin = sama selain heti uudelleen (Service
Worker + HTTP-välimuisti). Oletusasetukset: ECMWF, pilvet päällä, tuuli
pois, ei sijaintilupaa. Yksi ajo per profiili; palvelin USA:ssa -> viiveet
Suomesta eri, mutta 3G-rajoitus hallitsee.

### Virstanpylväät (ms käynnistyksestä)

| | normaali kylmä | nopea 3G | hidas 3G kylmä | hidas 3G lämmin |
|---|---|---|---|---|
| HTML jäsennetty | 938 | 1 759 | 5 493 | 98 |
| MapLibre ladattu | 1 751 | 3 333 | 10 843 | 638 |
| Kp | 2 104 | 3 604 | 11 403 | 2 377 |
| OVATION (revontulet) | 2 104 | 13 440 | 51 739 | 1 372 |
| Pilvet + latausilmoitus pois | 3 118 | 16 707 | **61 884** | 2 377 |
| Kartta valmis (kaikki tiilet) | 7 175 | 18 742 | 64 795 | 4 779 |

### Resurssit, hidas 3G kylmä (siirretty koko, gzip)

| Luokka | Pyyntöjä | kt | Alkaa ms | Valmis ms |
|---|---|---|---|---|
| sovellus (index.html 144 kt gzip / 440 kt raaka, i18n.js 25 kt) | 4 | 173 | 0 | 5 708 |
| fontit: Google (Sora, IBM Plex) | 6 | 71 | 510 | 5 720 |
| kirjasto: MapLibre 3.6.2 (js 198 kt + css 9 kt) | 4 | 207 | 5 428 | 12 630 |
| kartta: satelliittikuvakkeen tiili (Esri) | 2 | 11 | 5 433 | 6 419 |
| NOAA: OVATION | 1 | 155 | 10 774 | 51 359 |
| NOAA: muut (rtsw mag 151 kt + wind 89 kt, Kp ×3, teho) | 6 | 247 | 10 775 | 51 119 |
| data: pilvet (clouds-ecmwf.json, 17 askelta kerralla) | 1 | 295 | 10 775 | 60 930 |
| kartta: tyyli/tilejson | 5 | 2 | 10 793 | 11 971 |
| kartta: maastovarjostus (AWS Terrarium, 15 tiiltä) | 15 | **835** | 10 847 | 54 090 |
| kartta: vektoritiilet + nimien glyyfit (Noto 84 + 70 kt) | 7 | 376 | 22 604 | 61 439 |
| muu (revontulikentän kuva, data:-URL) | 3 | 46 | 10 754 | 51 736 |
| **Yhteensä** | 54 | **2 419** | | |

Lämmin käynnistys siirtää vain ~300 kt: NOAA rtsw-tiedostot (mag 145 +
wind 100 kt) haetaan joka kerta uudelleen (`cache:'no-store'`); muu tulee
SW:stä tai HTTP-välimuistista (pilvidata vain `max-age 600` ajan, sen
jälkeen 304-tarkistus). Ilman verkkoa pilvidata EI tule välimuistista
(SW ohittaa `/data/`).

### Latausjärjestys (hidas 3G kylmä)

1. 0-5,5 s: index.html (yksin, 144 kt).
2. 0,5-5,7 s: i18n.js + Google-fontit.
3. 5,4 s: MapLibre cdnjs:stä -> **epäonnistuu** (`ERR_BLOCKED_BY_ORB`, myös
   normaalilla yhteydellä joka kerta) -> varapolku unpkg 6,2-10,7 s.
4. **10,8 s: vasta nyt alkavat KAIKKI datahaut ja karttatiilet** -
   käynnistyskoodi odottaa (`await loadMapLib()`) kirjastoa ennen kuin
   pilvi-, OVATION-, Kp- ja avaruussäähaut edes alkavat.
5. 10,8-61 s: ~2 Mt kilpailee samasta 0,4 Mbit/s kaistasta yhtä aikaa:
   maastovarjostus 835 kt, pilvet 295 kt, avaruussää 240 kt, OVATION 155 kt,
   vektoritiilet 376 kt. Pilvet valmistuvat viimeisten joukossa (61 s).

### Kolme suurinta hidastajaa

1. **Sarjamainen käynnistys + MapLibren epäonnistuva ensimmäinen CDN.**
   Mikään data ei ala ennen kuin 198 kt:n kirjasto on ladattu (hidas 3G:
   10,8 s), ja ensimmäinen CDN (cdnjs) epäonnistuu joka kerta (ORB-esto
   -> väärä tiedostopolku tai MIME-tyyppi), mikä lisää yhden turhan
   kierroksen. Tämä viivästyttää kaikkea ~5 s hitaalla yhteydellä.
2. **Maastovarjostus 835 kt = 35 % koko latauksesta**, ja se ladataan
   samaan aikaan kuin pilvet ja revontulet. Koristeellinen kerros vie
   kaistan tärkeimmältä datalta.
3. **Kaikki data yhtä aikaa ilman tärkeysjärjestystä + suuret tiedostot,
   joita ei tarvita heti:** avaruussään 24 h rtsw-tiedostot (240 kt,
   joka käynnistyksellä uudelleen) vain alapalkin yhtä Bz-lukua varten,
   ja ECMWF:n kaikki 17 aika-askelta yhdessä 295 kt:n tiedostossa, vaikka
   käynnistyksessä tarvitaan vain nykyhetki.

## Ehdotukset tärkeysjärjestyksessä (vaihe 2, ei vielä toteutettu)

| # | Muutos | Arvioitu vaikutus (hidas 3G kylmä) |
|---|---|---|
| 1 | **Datahaut heti, ei kirjaston jälkeen:** aloita pilvi-, OVATION- ja Kp-haut rinnakkain MapLibren kanssa (data tallennetaan, piirretään kun kartta valmis). Korjaa cdnjs-polku tai vaihda järjestys (unpkg ensin) / tarjoa MapLibre omalta palvelimelta (SW välimuistiin). | Datan alku 10,8 s -> ~5,7 s; turha CDN-kierros pois (-0,5-1 s). Lämmin: ei ulkoista kirjastohakua. |
| 2 | **Latausjärjestys (pyyntösi kohta 4):** maastovarjostus vasta kun kartta, nykyhetken pilvet ja revontulet ovat valmiit (tai karkeampi `sourceMaxZoom`); avaruussää (rtsw) ja tuuli viimeisenä. | Pilvet + revontulet: ~61 s -> arviolta 25-30 s (835 + 240 kt pois kriittiseltä polulta). |
| 3 | **SW stale-while-revalidate datalle (kohta 3):** viimeisin pilvi-/OVATION-/Kp-data heti välimuistista + aikaleima näkyviin, uusi taustalla. | Toistuva käynnistys: kartta + data heti (myös ilman verkkoa); nyt pilvidata vaatii verkon. |
| 4 | **Itsenäiset lähteet + aikakatkaisu + uudelleenyritys (kohdat 5-6):** nyt latausilmoitus odottaa `Promise.all` -> hitain lähde määrää. Tasokohtainen latausmerkki, "Ei yhteyttä, näytetään klo 20.15 tiedot". | Ensimmäinen näkyvä tulos heti kun oma data on saapunut; ei jumia yhden lähteen takia. |
| 5 | **Alapalkin Bz pienemmästä tiedostosta:** 24 h rtsw-tiedostot vasta infoikkunan/kaavion avautuessa; alapalkille viimeisin arvo (esim. NOAA:n tiivistelmätiedosto, tarkistettava tutkimustyönkululla). | -240 kt käynnistyksestä, myös lämpimästä (nyt 6 s hitaalla 3G:llä joka kerta). |
| 6 | **ECMWF-pilvet askelittain (kuten ICON-EU/HARMONIE) + binääri/PNG (kohta 7):** nykyhetken askel ensin. **TOTEUTETTU 2026-10-22 (askelittain, plain JSON; ks. MUISTIO-mallit.md "Toteutus: ECMWF askel kerrallaan").** | Ensimmäinen pilvikuva ~295 kt -> ~12-15 kt. |
| 7 | index.html:n pienennys (minifiointi/kommentit pois julkaisussa), glyyfien rajaus | ~144 -> ~90 kt (arvio); pienempi vaikutus. |

### Kohta 7: siirtomuodon vaihtoehdot (mitattu gh-pages-datasta)

| Tiedosto | Nyt raaka | Nyt gzip (siirto) | Vaihtoehto | Arvio |
|---|---|---|---|---|
| clouds-ecmwf.json (17 askelta) | 2 075 kt | 248 kt | tavut + gzip / PNG per askel | 186 kt / 195 kt (yksi askel ~12 kt) |
| clouds-harmonie-step (1 askel) | 1 414 kt | 82 kt | PNG | 53 kt |
| clouds-icon_eu-step (1 askel, 4 kenttää PNG+base64) | 470 kt | 355 kt | erillinen binääri-PNG ilman base64:ää | ~350 kt raaka (base64 -25 %; PNG ei pakkaudu gzipillä) |
| wind-ecmwf-850 (17 askelta) | 1 295 kt | 377 kt | askelittain + PNG/tavut | arvioitava erikseen |

Huom: GitHub Pages pakkaa JSONin gzipillä, joten raakakoko ei ole
siirtokoko. Isoin säästö tulee ECMWF:n askelittaisesta lataamisesta, ei
pelkästä muodosta. ICON-EU:n PNG+base64 on jo tiivis, mutta base64 ja
neljä kenttää per askel (alapilvet jne.) maksavat - tarvitaanko kerrokset
käynnistyksessä, tarkistettava.

### Avoimet kysymykset / tarkistettavaa
- cdnjs:n ORB-esto: syy (polku vai MIME) selvitettävä ennen korjausta.
- Mittaus vain kerran per profiili ja USA:n palvelimelta; uusinta
  korjausten jälkeen samalla skriptillä.
- Oikealla puhelimella: hidas yhteys (esim. Lapin 3G/EDGE), offline-tila
  kotivalikosta avattuna.

## Osa A - nopeus (2026-10-20, haara `claude/nopeus-a`)

**cdnjs:n syy (todennettu curlilla Actionsista):** cdnjs palauttaa polulle
`ajax/libs/maplibre-gl/3.6.2/maplibre-gl.min.js` (ja `maplibre-gl.js`)
**HTTP 404 + text/html** -> selain estää sen skriptinä (`ERR_BLOCKED_BY_ORB`).
cdnjs:ssä ei siis ole tätä versiota tällä polulla. unpkg:n tiedosto on tavu
tavulta sama kuin `lib/maplibre-gl.js` (sha256 c46084df...).

**Muutokset:**
1. MapLibre 3.6.2 omista tiedostoista (`lib/maplibre-gl.js`, `.css`,
   lisenssi `lib/maplibre-gl-LICENSE.txt`), SW:n SHELL-listassa; unpkg ja
   jsdelivr varalla. `publish-pages` kopioi `lib/`:n, `sync-pages` reagoi
   siihen. `<link rel=preload>` kokeiltu ja POISTETTU: hitaalla yhteydellä
   se kilpaili HTML:n kanssa (HTML 5,7 s -> 23 s pakkaamattomassa testissä).
2. Pilvet, OVATION ja Kp haetaan HETI kirjaston rinnalla (ennen vasta
   kirjaston jälkeen). Avaruussää (rtsw ~240 kt) ja maaston varjostus vasta,
   kun pilvet ja revontulet ovat valmiit, viimeistään 15 s
   (`SECONDARY_LOAD_MAX_MS`, `startSecondaryLoads()`). Tuuli ladataan kuten
   ennenkin vasta kytkettäessä (oletus pois).
3. Maaston varjostus (käyttäjän ohje 2026-10-20, korvasi tarkkuustestit):
   tarkkuus ennallaan (`sourceMaxZoom` 11), rantavarjo ennallaan.
   Häivytys esiin `HILLSHADE_FADE_MS` 1,2 s kun korkeustiilet ovat valmiit
   (`fadeInHillshade()`). Näkyvyys zoomin mukaan Windyn tapaan:
   `BASEMAP_GENERAL.hillshade.startZoom` 4 (alkaa haaleana, alle tämän ei
   ladata korkeustiiliä) -> `fullZoom` 5 (täysi; käyttäjän valinta 2026-10-20, ensin 4,5/6). Windyn vertailukuva
   (Pohjois-Skandinavia) arvioitiin Leaflet-zoomiksi ~6 = MapLibre ~5
   (kaupunkien pikselietäisyydestä; näytön skaalauksesta riippuen 4,7-5,3).
   Tarkkuusvertailu (11/10/8) ehdittiin tehdä ennen ohjeen muutosta: z5 ja
   z7 identtiset, z10:llä tarkkuus 8 selvästi sumeampi, 10 lähes sama kuin
   11 - EI otettu käyttöön.

**Mittaus (sama skripti, haara gzip-palvelimella kuten Pages, ms):**

| | julkaistu normaali | haara normaali | julkaistu hidas 3G | haara hidas 3G |
|---|---|---|---|---|
| Kp | 1 535 | 1 094 | 11 226 | 6 216 |
| OVATION (revontulet) | 1 535 | 1 094 | 50 339 | **15 516** |
| MapLibre valmis | 828 | 348 | 10 682 | 17 614 |
| Pilvet + latausilmoitus pois | 1 535 | 1 094 | 61 468 | **21 244** |
| Avaruussää alkaa | 629 | (toissijainen) | 10 512 | ~21 000 |
| Varjostus alkaa | 699 | 614 | 10 580 | 20 767 |

Hitaalla 3G:llä pilvet + revontulet ~3x nopeammin (61 s -> 21 s). Kirjasto
valmistuu nyt myöhemmin (17,6 s), koska se jakaa kaistan datan kanssa, mutta
kokonaisuus on nopeampi: kaikki ensisijainen valmis ~21 s. Haaran lämmin
käynnistys mitattiin ilman SW:tä (http://localhost -> SW ei rekisteröidy),
joten se ei ole vertailukelpoinen; julkaistulla sivulla SW tarjoaa myös
`lib/`:n välimuistista.

**Tarkistettava puhelimella:** varjostuksen häivytys ja voimakkuus eri
zoomeilla (Windyn tuntuma), käynnistys heikolla yhteydellä.

## Osa B – luotettavuus (2026-10-20, haara claude/luotettavuus-b)

**Toteutus (index.html, "datahaut: verkko, välimuisti ja lähteiden tila"):**
- `NET`-säätövakio: aikakatkaisu 15 s/yritys, 3 yritystä (välit 2 s, 6 s),
  4xx (paitsi 408/429) ei uudelleen. Epäonnistunut lähde yrittää taustalla
  30 s -> 1 min -> ... enintään 5 min välein, ja heti `online`-tapahtumasta.
- Välimuisti: sivu tallentaa jokaisen onnistuneen vastauksen Cache API:in
  (`rv-data-v1`, hakuaika otsakkeessa `x-rv-at`). sw.js säilyttää
  `rv-data`-alkuiset välimuistit päivityksen yli. SW ei itse käsittele dataa:
  sivulla on tarkempi tieto, mitä näytetään ja milloin (mallin vaihto,
  laiskat askeleet), joten SWR tehtiin sivulle.
- `netSWR()` (pilvet, tuuli, OVATION, Kp-tiedostot): tallennettu näytetään
  heti, uusi haetaan taustalla ja näytetään saapuessaan (ei uudelleenpiirtoa,
  jos sisältö sama). Avaruussää: tallennettu heti käynnistyksessä
  (`loadSpaceWx(true)`), haku verkko ensin -> tallennettu varalla (`swFetch`).
- Laiskat aika-askeleet tallennetaan ajon tunnisteella (`?run=` = 1. aika-
  askel): askeltiedoston nimi on sama joka ajossa, joten ilman tunnistetta
  vanha askel sekoittuisi uuteen metaan. Saman ajon askel kelpaa suoraan
  välimuistista; uuden ajon askel poistaa vanhojen ajojen askeleet.
- Latausmerkki: pyörivä kaari tason napissa (`NET_BTNS`: pilvet -> sää- ja
  pilvinappi, tuuli -> sää- ja tuulinappi, revontulet -> revontulinappi),
  vain kun taso on päällä, 400 ms viiveellä.
- Ilmoitus (`renderNetNotice`): "Ei yhteyttä, näytetään klo 20.15 tiedot"
  (kaikki lähteet ilman yhteyttä tai `navigator.onLine` false), muuten
  "Revontulet, Kp: ei yhteyttä, näytetään klo 20.15 tiedot". Aika = vanhimman
  näkyvän datan hakuaika, eri päivältä viikonpäivän kanssa. Ilman tallennettua
  ja ilman yhteyttä: "Ei yhteyttä. Tiedot haetaan, kun yhteys palaa."
  Lähteen oma virheilmoitus (`netErr`) poistuu, kun lähde vastaa taas.
  Napautus kuittaa ilmoituksen; muut viestit eivät peitä sitä pysyvästi.

- Pohjakartta (lisätty käyttäjän puhelintestin jälkeen 2026-10-20: osa A
  lentokonetilassa -> kartta tyhjä myös yhteyden palattua): MapLibre ei hae
  epäonnistunutta tiiltä tai TileJSONia uudelleen. Verkkovirheet merkitään
  (`mapNetError`), ja kun yhteys palaa tai sovellus tulee näkyviin
  (`netRecover`: `online` + `visibilitychange`), tyyli rakennetaan kokonaan
  uudelleen (`switchMapStyle(key, true)` -> `setStyle(..., {diff:false})`).
  Samalla ajetaan kaikkien lähteiden odottavat uudelleenyritykset.
  Osan A julkaisussa uudelleenyritys oli vain ajastettu (OVATION/Kp 5 min,
  avaruussää 10 min, pilvet 2 min -> 30 min) eikä kartalle lainkaan.

**Testattu (Playwright, synteettinen data, 360 x 640):**
| Tilanne | Tulos |
|---|---|
| Normaali lataus | data 2,0 s, 8 tiedostoa tallennettu |
| Lentokonetila (kaikki datahaut katki, onLine=false) | data näkyy 0,4 s:ssa, "Ei yhteyttä, näytetään klo 23.24 tiedot" |
| Yhteys palaa (`online`) | kaikki lähteet haettu uudelleen, ilmoitus poistui; pohjakartta (myös tiilet katki) ladattiin uudelleen, 42 tiilipyyntöä, pilvitaso tallella |
| NOAA ei vastaa lainkaan (muut ok) | tallennettu näkyy 0,5 s:ssa, latausmerkki revontulinapissa, ~55 s:n kuluttua "Revontulet, Kp, Avaruussää: ei yhteyttä, näytetään klo 23.25 tiedot" |
| Ei tallennettua + lentokonetila | "Ei yhteyttä. Tiedot haetaan, kun yhteys palaa." |

**Tarkistettava oikealla puhelimella (kotivalikkoon asennettuna):**
lentokonetila (sovelluskuori SW:stä + tallennettu data), yhteyden palautus,
latausmerkin näkyvyys. **Pohjakartan tiilet EIVÄT ole tallennettuja**
(vain selaimen oma HTTP-välimuisti) -> ilman yhteyttä kartta voi olla tyhjä,
vaikka pilvet ja revontulet näkyvät. Avoin kysymys: tallennetaanko myös
tiilet (tilaa vievää).

## Ilman yhteyttä kuten Windy (2026-10-20, haara claude/offline-kamerat)

Käyttäjän puhelintesti (v1.187 lentokonetilassa): revontulet ja pilvet näkyivät
tallennettuina (klo 23.40), mutta tuuli, taustakartat, kamerat ja aikajana eivät.
**Käyttäjän päätös:** kuten Windy - lentokonetilassa käynnistettäessä VAIN
pohjakartta + ilmoitus "Ei internet-yhteyttä", ei pilviä tai muuta dataa.

- `netCacheUsable()` = `navigator.onLine !== false`: ilman yhteyttä tallennettua
  dataa ei näytetä (netSWR, fetchJSON-varapolku, avaruussää). Tallennettua
  käytetään yhä, kun yhteys on mutta hidas tai yksi lähde ei vastaa.
- Yhteyspalkki (Windyn mallin mukaan, käyttäjän kuvat 2026-10-20): ruudun
  yläreuna koko leveydeltä (`#netBar`, `renderNetBar`). Ei yhteyttä ->
  tehosteväri (violetti, paletin varoitusväri) "Ei internet-yhteyttä" (+ "–
  näytetään klo 20.15 tiedot", jos istunnossa näytettyä dataa on); yhteys
  palaa -> korostusväri "Yhteys palasi – tiedot päivitetään" 4 s. Ruksi
  sulkee. Ylärivi ja napit siirtyvät alemmas (`:root.net-bar` -> `--netbar-h`
  -> `--btn-top`). Vain osa lähteistä ei vastaa -> viestirivi kuten ennen.
  Windy pyytää lataamaan sovelluksen uudelleen; meillä tiedot latautuvat itse.
- sw.js tallentaa pohjakartan (`rv-tiles-v1`, verkko ensin, ilman yhteyttä
  tallennettu, enintään 1500 palaa ~50 Mt, vanhimmat pois): OpenFreeMapin
  TileJSON, vektoripalat ja kirjasimet, maastovarjostuksen korkeustiilet,
  Esrin ilmakuvat ja Google Fonts. Vain katsotut alueet/zoomit.
- Kamerat: `cameras.json` haetaan aina toissijaisena (ennen vain kytkettäessä),
  epäonnistunut haku yritetään uudelleen (ennen `[]` pysyvästi).

**Testattu (Playwright, oikea service worker https:llä, karttapalvelin
paikallisesti tiles.openfreemap.org-nimellä, synteettiset palat):**
verkossa 4/4 vektoripalaa + 12 korkeustiiltä tallentui; palvelin suljettu +
onLine=false -> uudelleenkäynnistys: 4/4 palaa ja 12 korkeustiiltä
välimuistista, ei pilviä/revontulia/Kp:tä, ilmoitus näkyy; yhteys palaa ->
data ja kartta latautuvat. Havainto: vektoripala, jossa on nimiä, epäonnistuu
ilman yhteyttä, jos sen kirjasinväliä ei ole tallennettu (tavalliset välit
tallentuvat ensimmäisellä käytöllä).

**Tarkistettava puhelimella:** lentokonetila asennettuna sovelluksena
(iPhonen `navigator.onLine` lentokonetilassa), pohjakartta näkyy aiemmin
katsotulta alueelta, Satelliitti vain katsotuilta alueilta.

### iOS: vihreä tilarivi jäi (2026-10-20)
Käyttäjän iPhone: yhteyden palattua tilarivin alue jäi vihreäksi, vaikka palkki
katosi. Todennäköinen syy: iOS 26 värjää tilarivin yläreunaan kiinnitetyn
elementin värillä eikä päivitä väriä, kun elementti poistuu. Korjaus
(`showNetBar`): `theme-color` seuraa palkin väriä (palautuu #0A1224:ään), ja
ennen piilotusta palkki on `NET_BAR.leaveMs` (400 ms) pohjavärinen
(`.leaving`), jotta iOS ehtii lukea sen. Headless-testissä theme-color
vaihtuu oikein; itse iOS-käytös todennettavissa VAIN puhelimella.

### Lentokonetila iPhonella, 2. kierros (2026-10-20)
1. Palkin teksti ei mahtunut (yksi rivi + "…") -> rivittyy 1-2 riville,
   ylärivi siirtyy palkin mitatun korkeuden verran (`sizeNetBar`, `--netbar-h`).
2. Pilvet ja revontulet näkyivät tallennettuina lentokonetilassa: iPhone voi
   ilmoittaa `navigator.onLine = true` lentokonetilassa. Nyt yhteys päätellään
   myös omista hauista (`netLooksOffline`: verkkovirhe uudempi kuin viimeisin
   palvelimen vastaus). `netSWR` hakee verkosta ENSIN; tallennettu näytetään
   vain, jos ensimmäinen yritys ei valmistu `NET.cacheAfterMs` (2,5 s) kuluessa
   tai lähde vastaa virheellä - ei, jos verkko on katki. Verkkovirheen jälkeen
   ei uusintoja, jos mikään palvelin ei ole vastannut 10 s:iin (tila näkyy heti).
   Testattu (Playwright, onLine = true, kaikki haut katki): ei dataa, palkki
   "Ei internet-yhteyttä"; NOAA roikkuu: tallennettu näkyy 2,8 s:ssa.
   Hinta: hitaalla yhteydellä tallennettu näkyy 2,5 s myöhemmin kuin ennen.

### Kuten Windy, 3. kierros (2026-10-20, käyttäjän päätös)
Windy-arvio (ei näkyvää sisäistä toteutusta): käynnistyksessä ilman yhteyttä vain
pohjakartta + palkki, hitaalla yhteydellä latausmerkki eikä vanhaa säädataa,
yhteyden palattua "lataa uudelleen". Muutokset:
- `netSWR`: AINA verkko, ei tallennetun näyttämistä odotellessa eikä 2,5 s
  odotusta (`cacheAfterMs` poistettu). Tallennettu näytetään VAIN, jos yhteys
  toimii mutta lähde ei vastaa / vastaa virheellä (`#msg`: "Revontulet: ei
  yhteyttä, näytetään klo 20.15 tiedot"). Avaruussään tallennettu käynnistyksessä
  (`loadSpaceWx(true)`/`swCached`) poistettu.
- Pilvitaso oletuksena POIS käynnistyksessä (`state.cloudsOn:false`, kuten Windy);
  pilvidata haetaan silti (infoikkunan pilvisyys). Aikajana piilossa, kunnes
  pilvet tai tuuli kytketään (`updateTimelineVisibility()` käynnistyksessä).
Testattu (Playwright): lentokonetila (onLine true) -> ei dataa + palkki; NOAA ei
vastaa -> latausmerkki, ~55 s jälkeen tallennettu + ilmoitus; yhteys palaa -> kaikki.

### Korjaus: tuuli/pilvet katosivat (2026-10-21)
Oire (käyttäjä): tuulikorkeuksia vaihdellessa tuuli lakkasi näkymästä; pilvet ja tuuli
katosivat säämallia vaihdettaessa eivätkä palanneet. Syy: `netRevalidate` ohitti
`apply`:n, jos sama tiedosto oli jo kerran näytetty (sama teksti) - tarkoitettu
ajastettuihin päivityksiin, mutta mallin/korkeuden vaihto nollaa hilan ennen hakua,
joten palatessa aiempaan malliin/korkeuteen hila jäi tyhjäksi. Korjaus: `netSWR`-
optio `isEmpty` (pilvet `!state.cloudGrid`, tuuli `!state.windGrid`) -> tyhjään
näkymään piirretään aina. Toistettu ja todennettu Playwrightilla (korkeudet
surface->850->500->surface->850->surface, mallinvaihto takaisin).

## Toisen käynnistyksen aika (2026-10-21)

Käyttäjän päätös: Windy-tyylinen toiminta pysyy (ei vanhaa dataa käynnistyksessä).
Osan B uudelleenlähetetystä ohjeesta toteutettiin VAIN tämä mittaus; aikaleimaa
lippuun, pilvien himmennystä ja uusia uudelleenyritysvälejä EI tehty (päätös).

**Mittaustapa:** Playwright + headless-Chromium, 360 x 640, OIKEA service worker
(https, paikalliset palvelimet nimillä rv.test / tiles.openfreemap.org /
services.swpc.noaa.gov). Hidastus palvelimessa: viive + gzip-koko / kaista
(4G: 85 ms + 9 Mbit/s, hidas 3G: 400 ms + 0,4 Mbit/s). 1. käynnistys = tyhjä
selain; 2. käynnistys = sama selain uudelleen (SW asennettu, karttapalat
tallessa). Ajat ms sivun avauksesta. "Valmis" = latausilmoitus pois
(revontulet + Kp + pilvet ladattu). Synteettinen data.

| Yhteys | Käynnistys | Kirjasto | Kp | Pilvet | Revontulet = valmis | Kartta piirretty |
|---|---|---|---|---|---|---|
| 4G | 1. | 470 | 608 | 584 | 935 | 2 336 |
| 4G | 2. | 180 | 247 | 270 | 463 | 1 847 |
| hidas 3G | 1. | 3 915 | 4 363 | 5 087 | 7 655 | 6 830 |
| hidas 3G | 2. | 186 | 512 | 1 288 | 3 864 | 3 095 |

(Data aina verkosta, ei selaimen HTTP-välimuistia = uudelleenkäynnistys yli
10 min myöhemmin. Saman 10 min sisällä Pages-välimuisti nopeuttaa vielä vähän:
4G valmis 642 ms, 3G 3 861 ms.)

**Tulkinta:**
- 2. käynnistys on 4G:llä noin 2x nopeampi (0,9 -> 0,5 s valmis) ja hitaalla
  3G:llä noin 2x (7,7 -> 3,9 s). Säästö tulee sovelluskuoresta ja kirjastosta
  (index.html 159 kt + i18n + MapLibre 203 kt gzip, SW:stä heti: kirjasto 3,9 s
  -> 0,2 s) ja tallennetuista karttapaloista (kartta 6,8 -> 3,1 s).
- Data haetaan joka kerta verkosta (Windy-tyyli): revontulet (OVATION ~160 kt)
  ovat hitaalla yhteydellä 2. käynnistyksen hitain osa.
- Synteettiset pilvet pakkautuvat paljon paremmin (38 kt) kuin oikea ECMWF
  (248 kt gzip, ks. vaihe 1) -> oikealla datalla pilvet hitaalla 3G:llä
  arviolta ~5 s myöhemmin kuin taulukossa. Malli antaa jokaiselle pyynnölle
  koko kaistan (ei kilpailua) -> todelliset ajat hitaalla yhteydellä pidempiä,
  suhde 1. vs 2. pätee suuntaa-antavasti.

**Tarkista omalla puhelimella (kotivalikkoon asennettuna):**
- Sulje sovellus kokonaan ja avaa uudelleen: kartta ja napit heti, latausmerkki
  revontulinapissa, kunnes revontulet tulevat.
- Sama huonolla mobiiliyhteydellä (esim. sisätiloissa): 2. käynnistys selvästi
  nopeampi kuin ensimmäinen asennuksen jälkeen.

## Ehdotus myöhemmäksi: OVATION-datan esikäsittely GitHub Actionsissa (2026-10-21)

Ei toteutettu - käyttäjän pyytämä arvio. Ajatus: Actions hakee NOAA:n
`ovation_aurora_latest.json`:n ja julkaisee sen gh-pagesille tiiviissä muodossa:
sama 360 x 181 -ruudukko (1°) ja sama tarkkuus (kokonaisluku 0-100 %), joten
kartta ja luvut eivät muutu lainkaan. Selain lukee `data/ovation.json`:n
(aikaleimat + kenttä harmaasävy-PNG:nä base64:nä, sama purku kuin ICON-EU:ssa,
`decodePngGray()`) tai raakatavuina (65 160 tavua, 1 tavu/ruutu).

**Koko (arvio):** NOAA:n JSON on [lon, lat, arvo] -kolmikkoja joka ruudulle.
Mitattu oikea tiedosto vaiheessa 1: 155 kt gzip. Simuloitu realistinen kenttä
(kaksi ovaalia, kohinaa, ~8 800 nollasta poikkeavaa ruutua):

| Muoto | Raaka | Siirto (gzip) | Hidas 3G (0,4 Mbit/s + 400 ms) |
|---|---|---|---|
| NOAA JSON (nyt) | ~920 kt | ~155-160 kt | ~3,5 s |
| tavut 1/ruutu + gzip | 65 kt | ~6 kt | ~0,5 s |
| harmaasävy-PNG (+ base64 JSONissa) | ~4,5 kt (~6 kt) | ~6 kt | ~0,5 s |

Säästö ~96 % (~150 kt per haku). Haku toistuu 5 min välein -> tunnissa ~1,8 Mt
vähemmän mobiilidataa. Käynnistyksessä hitaalla 3G:llä revontulet ~3 s
aiemmin (ne olivat 2. käynnistyksen hitain osa, ks. yllä).

**Huomioitavaa ennen toteutusta (siksi vasta ehdotus):**
- **Tuoreus:** NOAA päivittää ~5 min välein. GitHub Actionsin ajastus on vähintään
  5 min ja käytännössä usein 5-20 min myöhässä + gh-pages-julkaisu (~1 min) ->
  esikäsitelty data olisi tyypillisesti 5-25 min vanhempaa kuin suoraan NOAA:lta.
  Revontulille (nowcast, ~30-90 min ennuste) tämä on merkittävä haitta.
  Ratkaisuvaihtoehto: selain käyttää esikäsiteltyä vain, jos se on alle X min
  vanha (`Observation Time`), muuten NOAA suoraan.
- **Julkaisujono:** 288 julkaisua/vrk samaan `gh-pages-publish`-jonoon muiden
  datatyönkulkujen kanssa (orphan-commit joka kerta) - lisää kuormaa ja voi
  viivästyttää muita julkaisuja.
- **Lähteen saatavuus:** jos Actions jumittuu, sovellus näyttäisi vanhaa dataa ->
  tarvitaan varapolku NOAA:lle (nykyinen koodi).
- Vaihtoehto ilman Actionsia: ei ole - NOAA ei tarjoa pakattua muotoa, ja
  selain saa jo gzipin (155 kt on gzipattu koko).

**PÄÄTÖS (käyttäjä 2026-10-21):** EI GitHub Actionsilla (viive). OVATION-esikäsittely
tehdään **Cloudflare-siirron yhteydessä Cloudflare Workerilla**: Worker hakee
NOAA:lta pyynnöstä, pakkaa (sama 360 x 181 -ruudukko ja tarkkuus, esim. PNG/tavut)
ja pitää tuloksen välimuistissa 1-2 min. Siihen asti selain hakee suoraan
NOAA:lta (nykyinen `loadOvation()`), ei muutoksia.

## Sujuvuus (2026-10-21, haara claude/sujuvuus, vain mittaus - koodia ei muutettu)

**Mittausympäristö:** Playwright + Chromium (headless), 390 x 844, DPR 2,
CDP `Emulation.setCPUThrottlingRate` 4 (keskitason puhelin), oikeat paikalliset
https-palvelimet (sovellus, synteettinen data `offline-fixtures`, synteettiset
tiilet) - EI Playwrightin `route.fulfill`ia (sen sarjallistus vääristi profiilin).
Mittarit: rAF-kehysvälit, MapLibren `render`-tapahtumat, PerformanceObserver
`longtask`, CDP Profiler (self-time), `Performance.getMetrics`, mikrovertailut
`page.evaluate`-silmukoilla. **WebGL = SwiftShader (ohjelmallinen, ei GPU:ta).**

### A. Tulokset, jotka EIVÄT vastaa oikeaa puhelinta (GPU-riippuvaiset)

Kaikki piirtoon (WebGL, kompositointi, `backdrop-filter`) sidotut luvut ovat
SwiftShaderilla moninkertaisesti hitaampia kuin puhelimen GPU:lla. Pääsäie oli
näissä mittauksissa suurimman osan ajasta jouten (~3,2-3,5 s / 4 s) -> pullonkaula
oli ohjelmallinen piirto, ei JavaScript. Näitä EI voi käyttää päätöksiin:

| Tilanne | fps (SwiftShader, CPU 4x) |
|---|---|
| Lepo, ei tasoja / pilvet | 60 / 56 (ei piirtoa levossa) |
| Panorointi, ei tasoja | 11,7 |
| Panorointi, pilvet | 7,6 |
| Zoomaus, pilvet | 2,4 |
| Pilvet + tuuli: lepo / panorointi / zoomaus | 2,9 / 2,0 / 2,7 |

- Aikajanan siirrosta näkyvään kuvaan: mediaani ~800 ms (piirto).
- Infoikkunan avaus 190-660 ms, josta JS 8 ms, layout 12 ms, tyylit 20 ms -
  loppu piirtoa/kompositointia (lasisumennus + kartta alla).
- Tänä yönä -välilehti 0,9-2,0 s, josta JS ~1 ms, layout 4 ms - loppu SVG-kaavion
  ja sumennuksen piirtoa. 7 vrk 3-520 ms (vaihteli).
- Johtopäätös: näistä EI voi päätellä puhelimen sujuvuutta - ks. kohta D.

### B. Tulokset, jotka ovat luotettavia (JavaScript / pääsäie, CPU 4x)

| Mitattu | Aika |
|---|---|
| Aikajanan `input`-käsittelijä (update + renderClouds + windRedraw) | mediaani 3,8 ms, max 17 ms |
| `update()` | 0,78 ms |
| `renderClouds()` / `reorderAllLayers()` | 0,02 / 0,03 ms |
| `timeLabelText()` / `fmtClock()` (Intl-muotoilu joka kutsulla) | 0,49 / 0,28 ms |
| `renderInfo()` | 6,7 ms |
| Tuuli: `wpgStep(1/60)` + `wpgBuildBuffer()` (889 hiukkasta) | 1,3 + 4,3 = ~5,6 ms / kehys |
| Kaavion avaus: Kp / Bz / pilvisyys (JS) | 91-113 / 58 / 63-70 ms (Kp: `swcGeom` ~20 ms) |
| Nyt-välilehti | 11-20 ms |

- **Pitkät tehtävät (> 50 ms):** vähän, 0-4 per skenaario, suurin ~77 ms.
  Aiheuttajat: tiilien haku/jäsennys ja MapLibren sisäinen työ zoomatessa
  (`fetch`, `Request`, `_calcMatrices`). Oma koodi ei tuottanut pitkiä tehtäviä,
  paitsi kaavioikkunan avaus (Kp ~100 ms CPU 4x:llä on rajalla).
- Aikajanaa vedettäessä suurin oma JS-kustannus = kellonaikojen Intl-muotoilu.
- Tuuli vie ~5,6 ms JS:ää per kehys CPU 4x:llä -> 60 fps:n budjetista (16,7 ms)
  kolmannes jo ennen kuin MapLibre piirtää mitään.

### C. Taustalla ja kartan ollessa peitossa

- **Sovellus taustalla (välilehti piilossa):** piirto pysähtyy (1 render, sitten
  ei mitään). Tuulen `WPG.render` tarkistaa `document.hidden`, ja selain pysäyttää
  rAF:n. OK.
- **Kartta peitossa (infoikkuna koko näytöllä):** tuulianimaatio JATKUU -
  2-4 renderiä / 3 s ja `wpgBuildBuffer` ajossa, koska peittoa ei tarkisteta ja
  `map.triggerRepaint()` kutsutaan joka kehys. Turhaa CPU/GPU-työtä ja akkua.
- Avaruussään haku pysähtyy piilossa. OVATIONin/Kp:n 5 min `setInterval` jatkuu
  taustalla (verkkohaku, ei piirtoa).

### Korjausehdotukset tärkeysjärjestyksessä (eivät muuta ulkoasua eivätkä toimintoja)

1. **Tuulianimaation tauko, kun kartta on peitossa** (infoikkuna `.full`,
   puhelimella infoikkuna auki, koko näytön ikkunat). Ei `triggerRepaint`ia eikä
   hiukkaslaskentaa; jatkuu suljettaessa. Hyöty: **suuri** akulle ja lämmölle
   infoa luettaessa (~5,6 ms JS + koko kartan GPU-piirto 60 kertaa/s pois);
   ikkunan avaus/vieritys sujuvampi, koska GPU ei kilpaile. Kartta ei näy, joten
   ulkoasu ei muutu.
2. **Intl.DateTimeFormat-olioiden välimuisti** `fmtClock`/`timeLabelText`-
   funktioihin (avain: kieli + yksiköt + valinnat, tyhjennys `setLanguage`ssa).
   Hyöty: **keskisuuri** - ~0,5-0,7 ms pois jokaisesta aikajanan askeleesta ja
   satoja kutsuja kaavioiden piirrosta (osa Kp-kaavion ~100 ms:sta).
3. **Tuulen puskurin rakennus kevyemmäksi** (`wpgBuildBuffer` 4,3 ms/kehys):
   uudelleenkäytä tyypitettyä taulukkoa (ei uutta allokointia), `bufferSubData`
   koko puskurin sijaan, ja hännän laskenta ilman olioita. Hiukkasmäärä ja
   ulkoasu ennallaan. Hyöty: **keskisuuri** hitailla puhelimilla (arvio 1-2 ms/
   kehys, vähemmän roskienkeruuta -> vähemmän nykäyksiä).
4. **Kaavioikkunan avaus:** laske geometria (`swcGeom`) kerran per data ja
   käytä samaa piirrossa ja tarkastelussa. Hyöty: **pieni-keskisuuri** -
   Kp-kaavion avaus ~100 -> ~70 ms (CPU 4x), ei pitkää tehtävää.
5. **`renderInfo()` vain näkyvälle välilehdelle** (muut piirretään vasta
   vaihdettaessa; alapalkki aina). Hyöty: **pieni** - osa 6,7 ms:sta pois
   jokaisesta datapäivityksestä.
6. **OVATION/Kp-ajastus taustalla tauolle**, haku heti kun sovellus tulee
   näkyviin (kuten avaruussää). Hyöty: **pieni** - mobiilidataa ja akkua
   taustalla (~155 kt / 5 min OVATION).
7. **`reorderAllLayers()` vain kun tasot muuttuvat** (ei aikajanan joka
   askeleella). Hyöty: **hyvin pieni** (0,03 ms) - tehdään vain muun korjauksen
   ohessa.
8. `#dbgMap` päivitys harvemmin - vain `?debug`-tila, poistuu ennen
   kauppajulkaisua. Hyöty: ei käyttäjille.

Lasisumennuksen (`backdrop-filter`) hinta päätetään vasta puhelinmittauksen
jälkeen (kohta D) - sen poistaminen muuttaisi ulkoasua.

### D. Mitattava omalla puhelimella

**Miten:** Android: Chrome + USB-kaapeli, tietokoneella `chrome://inspect` ->
Inspect -> Performance-välilehti (Record, tee toiminto, Stop). iPhone: Asetukset
-> Safari -> Lisäasetukset -> Web Inspector päälle, Macin Safari -> Kehitä ->
puhelin -> sivu -> Timelines (valitse "Rendering Frames" ja "JavaScript").
Kotivalikkoon asennettu versio näkyy samoin listassa.

Mitattavat (kustakin ~5 s nauhoitus):
1. Kartan panorointi ja nipistyszoomaus: ei tasoja / pilvet / pilvet + tuuli -
   kehysnopeus (fps) ja punaiset (pudotetut) kehykset.
2. Aikajanan veto pilvet päällä: viive vedosta kuvan muuttumiseen.
3. Infoikkunan avaus (alapalkista) ja Tänä yönä -välilehti: aika napautuksesta
   valmiiseen kuvaan; näkyykö "Composite/Paint" pitkänä palkkina (sumennus).
4. Kp-kaavion avaus.
5. Infoikkuna koko näytöllä tuuli päällä: jatkuuko kehysten piirto (kohta C,
   vahvistaa korjauksen 1 tarpeen).
6. Lämpeneekö puhelin / akun kulutus 10 min tuulianimaatiolla (subjektiivinen).

Luvut voi lähettää kuvakaappauksena; niiden perusteella päätetään, onko GPU-
puolella (pilvivarjostin, sumennus) tarvetta jatkotoimille.

### Korjaukset 1-5 toteutettu (2026-10-21, haara claude/sujuvuus-korjaukset, v1.197-v1.200)

Toteutettu käyttäjän numeroinnilla (keskusteluraportin lista): 1 tuulen tauko
peitossa, 2 Intl-välimuisti, 3 tuulen piirtopuskuri, 4 kaavion leveys, 5 revontulien
ja Kp:n haku ei taustalla. Muistion listan kohdat 5 (renderInfo vain näkyvälle
välilehdelle) ja 7 (`reorderAllLayers`) jätettiin tekemättä - tulkinta: käyttäjän
"kohta 5" tarkoitti taustahakua.

1. **Tuuli tauolle kartan ollessa peitossa** (`wpgMapCovered()`): puhelimella
   (`max-width:699px`) `#info.open.full`, ei vedettävänä. Ei hiukkaslaskentaa, ei
   uutta kehystä; jos kartta piirtyy muusta syystä, edellinen kehys piirretään
   sellaisenaan. `MutationObserver` #infon luokille herättää animaation, kun
   ikkuna pienenee/sulkeutuu/vedetään. Puolikas infoikkuna ja tietokone: ennallaan
   (kartta näkyy). Koko näytön infoikkunan tausta ulottuu myös tilapalkin alle
   (`#info.full`: height 100 %, padding-top safe-area, suorat kulmat; sisältö
   ennallaan tilapalkin alla) -> karttaa ei jää näkyviin, tauko kattaa koko näkyvän
   alueen (käyttäjän päätös 2026-10-21; ennen ~50 px kaistale karttaa iPhonessa).
2. **Intl-muotoilijat välimuistiin** (`intlFmt()`, `fmtDate()`, `fmtNum()`):
   `fmtClock`, `timeLabelText`, `swcTime`, `nightClockShort`, `weekDay/Date`,
   kaavion akselin viikonpäivät. Avain = kieli + valinnat (kielen/yksikön vaihto
   toimii ilman tyhjennystä).
3. **Tuulen piirtopuskuri:** `MercatorCoordinate.fromLngLat`-oliot korvattu samalla
   kaavalla (`wpgMercX/Y`, kopioitu MapLibre 3.6.2:sta, sama laskujärjestys),
   väliaikaistaulukot uudelleenkäyttöön, GPU-puskuri `bufferSubData` (varaus vain
   kasvaessa).
4. **Kaavion leveys** (`swcWidth()`): luetaan kerran avattaessa ja ikkunan koon
   muuttuessa, ei jokaisella piirrolla.
5. **Revontulet + Kp:** 5 min ajastin ei hae piilossa; näkyviin palatessa haku heti,
   jos edellisestä yli 1 min (muuten ajastin jatkuu jäljellä olevalla ajalla).

**Ulkoasu ja toiminta ennallaan - todennettu:**
- Tuuli: vanha ja uusi `wpgStep`+`wpgBuildBuffer` samasta alkutilasta (sama
  siemen, 120 askelta): piirtopuskuri 384 580 lukua, historia ja hiukkaset
  **bitilleen samat**; kuvakaappaus samasta näkymästä vanhalla ja uudella
  funktiolla: **0 eroavaa pikseliä**. (Kahden erillisen latauksen kuvat eroavat jo
  saman koodin kesken latauksen ajoituksen takia, siksi vertailu samalla sivulla.)
- Muotoilut: 3230 vertailua (5 kieltä x 24/12 h, päivät myös kesäaikasiirtymissä,
  luvut ml. -0, NaN, etumerkki) uusi = vanha `toLocale*`: 0 eroa.
- Peitto: tuuli piirsi 2 s:ssa näkyvissä 22 / puolikas ikkuna 10 / **koko näyttö 0** /
  takaisin puolikkaaksi 32 kehystä (animaatio jatkuu).
- Tausta: piilossa 0 hakua; palatessa (> 1 min) heti 4 hakua (OVATION, Kp, ennuste,
  minuutti-Kp); uudelleen < 1 min sisällä 0.

**Laskennan osuus ennen -> jälkeen** (CPU 4x, sama skripti, 2 ajoa kummastakin;
kuvataajuuksia ei raportoida - ohjelmallinen WebGL ei vastaa puhelinta):

| Mitattu (JS) | Ennen | Jälkeen |
|---|---|---|
| `fmtClock` / `timeLabelText` | 0,37-0,41 / 0,33-0,56 ms | 0,01-0,02 / 0,03 ms |
| Aikajanan käsittelijä, mediaani (max) | 3,9-4,0 (12,5-16,9) ms | 2,4-3,0 (4,9-8,4) ms |
| `renderInfo()` | 6,0-7,9 ms | 3,1-4,3 ms |
| Tuulen puskuri, sama tila A/B (CPU 1x / 4x) | 1,47 / ~2,97 ms | 1,06 / ~2,71 ms |
| Tuuli kartan ollessa peitossa | 1-3 kehystä / 3 s + laskenta | 0 |
| Kaavion uudelleenpiirto Kp / Bz (aikaväli, minuuttipäivitys) | 9,9 / 15,2 ms | 4,3 / 10,9 ms |
| Kaavion avaus Kp / Bz (JS + piirto) | 82-109 / 70-130 ms | 75-133 / 51-52 ms |

- Kaavion **avauksessa** leveyden lukeminen pakottaa asettelun edelleen kerran
  (ikkuna juuri tullut näkyviin) - hyöty tulee vain Intl-osuudesta, ja ajot
  vaihtelevat paljon (Kp:n jälkeen-ajossa mukana verkkohaun jäsennys).
  Uudelleenpiirroissa leveyden välimuisti säästää 4-6 ms.
- Tuulen puskurin säästö jäi pieneksi (~10 %): suurin osa ajasta on nauhan
  geometriaa (miter-laskenta), jota ei muutettu, jotta tulos pysyy bitilleen samana.
  Lisäksi roskienkeruu vähenee (ei olioita/taulukoita joka kehys).
- Mikromittaukset vaihtelevat ajosta toiseen ±30 % (animaatio ja ohjelmallinen
  piirto kilpailevat samasta prosessorista), siksi tuuli mitattiin A/B samassa tilassa.

**Tarkista puhelimella:** tuuli päällä, infoikkuna koko näytölle ja takaisin -
animaatio jatkuu heti; koko näytön infoikkunan yläreuna tilapalkin alla ja veto alas (ei nykäisyä);
sovellus taustalle > 1 min ja takaisin - revontulet päivittyvät heti.

## Katselmoinnin korjaukset, osa 1 (2026-10-22, KATSELMOINTI.md)

Hälytysten toiston esto: ks. MUISTIO-halytykset.md "Toiston esto ja datakatkot".

### GitHub Actions (KATSELMOINTI 3.1 ja "Actions-putken toimintavarmuus")

- **Aikaraja:** jokaisen 8 datatyönkulun fetch-jobille `timeout-minutes: 30`
  (ecmwf-7d 60 ennallaan), publish-jobeille ja sync-pagesille 15. Mitattu
  ajohistoriasta (5 viimeisintä onnistunutta / työnkulku): pisin haku 4 min,
  julkaisu alle 1 min. Aikakatkaisu = `failure` -> publish (`if: !cancelled()`)
  julkaisee onnistuneet osat (ennen jumi 4 h 43 min, ajo 39792119443).
- **Oikeudet:** työnkulun tasolla `contents: read`, kirjoitus vain
  publish-jobin omassa `permissions`-lohkossa. Fetch-jobien checkout
  `persist-credentials: false` (paitsi camera-status: hakee edellisen tilan
  gh-pagesista lukutokenilla). `requirements.txt` lukituin versioin EI vielä
  tehty (katselmoinnin lisäehdotus).
- **Vanha sovelluskoodi:** `publish-pages` hakee sovellustiedostot
  (index.html, i18n.js, aurora-core.js, sw.js, manifest, icons, lib,
  data/cameras.json) aina `origin/main`in uusimmasta commitista
  (`git fetch --depth=1 origin main` + `git checkout FETCH_HEAD -- ...`), ei
  ajon käynnistyshetken commitista. Lokiin rivi "Sovelluskoodi: main X (ajon
  commit Y)".
- **Todennus oikeassa GitHubissa:** `pilvidata-ecmwf` ja `camera-status`
  ajettiin `workflow_dispatch`illa haaralta `claude/katselmointi-1`
  (ajot 39850436114, 39850440169): fetch onnistui lukuoikeudella, publish
  onnistui, ja gh-pagesin index.html, sw.js, aurora-core.js, i18n.js olivat
  tavu tavulta samat kuin mainissa (ei haaran versio). Tilannetta "main
  päivittyy haun aikana" ei toistettu, mutta mekanismi on sama.

### Akku (KATSELMOINTI 4.1, 2.1, 2.2)

- **Tuulen piirto vain hiukkasten kanssa:** `triggerRepaint()` vain kun
  `WPG.count > 0`; hiukkasmäärä päivittyy nyt aina tasan nollaan (ennen alle
  20 hiukkasen ero ei päivittänyt). `windRedraw()` nollaa `WPV.coverageAt`,
  jotta uusi data käynnistää pysähtyneen animaation. Headless (swiftshader,
  ECMWF, tuuli päällä), ruutuja 2 s aikana: alueella 66 / 62, alueen
  ulkopuolella (Tyynimeri) **main 64, uusi 0**, takaisin alueelle 60 / 67.
  (30 fps:n rajaus ja `pixelRatio` eivät kuuluneet tähän osaan.)
- **Epäonnistunut aika-askel:** `g.failed` (idx -> yritys, seuraava aika);
  ei uutta yritystä ennen 30 s, väli tuplaantuu enintään 5 min (`NET`),
  ajastin piirtää uudelleen odotuksen jälkeen, `netRecover()` tyhjentää.
  Headless, tuuliaskeleet 404: 8 s aikana **main 16 pyyntöä, uusi 0**;
  uudelleenyritys 30 s kohdalla (pyyntöjä 3 -> 5).
- **Avaruussään ajastus:** kesken oleva haku palauttaa saman lupauksen
  (`swx.inflight`). Headless, NOAA rtsw viivästetty 8 s, `loadSpaceWx`-kutsuja
  3 s aikana: **main 719, uusi 1**.

Puhelimella tarkistettava: akunkulutus tuuli päällä (erityisesti näkymä mallin
alueen ulkopuolella) ja että tuuli käynnistyy, kun alueelle palataan.

## Katselmoinnin korjaukset, osa 2 (2026-10-22, haara `claude/katselmointi-2`)

### Ajon tunniste askeltiedostoihin (KATSELMOINTI 1.3, 1.4)

- **Tuottaja:** kaikki 6 hakuskriptiä (pilvet ja tuuli: ECMWF, ICON-EU,
  HARMONIE) kirjoittavat jokaiseen askeltiedostoon `"t0"` = metan `times[0]` (ms).
- **Sovellus:** `ensureLazyStepLoaded()` antaa `fetchJSON`ille `check`-funktion:
  askel kelpaa vain, jos `t0` puuttuu (vanha tiedosto) tai = `g.times[0]`.
  Hylättyä askelta ei tallenneta välimuistiin eikä käytetä varadatana
  (`e.mismatch`). Uudempi ajo -> `reloadModelGrid()` lataa metan uudelleen
  välimuistin ohi (`?v=Date.now()`, enintään 30 s välein), jolloin uusi hila
  korvaa vanhan kokonaan (eri ajojen askelia ei yhdistetä). Vanhempi ajo ->
  ei käytetä, uusi yritys 30 s -> 5 min (osan 1 logiikka).
- **Tuuli istunnon aikana:** `refreshModelData()` lataa pilvet ja (jos päällä)
  tuulen tunnin välein ja kun sovellus palaa näkyviin yli 30 min tauon jälkeen.
  Tuulen kytkentä hakee uudelleen, jos tuulidata on yli 30 min vanha
  (`state.windLoadedAt`).
- **Todennus (headless, synteettinen palvelin):** sama ajo -> askeleet
  käyttöön; uudempi ajo (askel t0 + 6 h) -> pilvi- ja tuulimeta ladattiin
  uudelleen, hilan t0 +6 h ja uudet askeleet käytössä; vanhempi ajo (t0 - 6 h)
  -> 0 askelta käytössä, ei metan uudelleenlatausta, lippu "–". Paluu taustalta
  (31 min) -> pilvi- ja tuulimeta haettiin.
- **Oikea GitHub:** haaralta ajetut pilvidata-ecmwf/harmonie ja wind-ecmwf/
  harmonie julkaisivat askeleet, joiden `t0` = metan `times[0]` (tarkistettu
  gh-pagesilta). ICON-EU kaatui 22.10. 20.55 UTC askeleeseen 21 (DWD:n 18 UTC
  -ajo vasta osittain julkaistu, HTTP 404) = KATSELMOINTI 1.13, ei tämän
  muutoksen vika. Uusintana 21.30 UTC molemmat ICON-EU-työnkulut onnistuivat
  ja `t0` = metan `times[0]`. Kaikki 7 datatyönkulkua ajettu onnistuneesti
  `--require-hashes`-asennuksella (haara, 22.10.).

### Python-paketit lukittuina (KATSELMOINTI 3.1)

- `requirements.in` (suorat riippuvuudet, versiot viimeisimmästä onnistuneesta
  ajosta) -> `requirements.txt` (26 pakettia, versiot + SHA-256-tiivisteet):
  `uv pip compile requirements.in --python-version 3.12 --python-platform
  x86_64-manylinux_2_28 --generate-hashes -o requirements.txt`.
- Datatyönkulut: `pip install --require-hashes -r requirements.txt`
  (camera-probe ennallaan, väliaikainen).
- Todennus: asennus Python 3.12 -virtuaaliympäristöön `--require-hashes`
  onnistui ja importit toimivat; oikeat työnkulut ajettu haaralta (ks. alla).

## Keskeneräinen mallinajo (2026-10-22, KATSELMOINTI 1.13, haara `claude/keskenerainen-ajo`)

**Ongelma:** DWD julkaisee ICON-EU-ajon askel kerrallaan. Jos haku osui
julkaisun keskelle, skripti valitsi uusimman ajon ja kaatui puuttuvaan askeleeseen
(todettu 22.10.: ensimmäinen ICON-EU-ajo epäonnistui, uudelleenajo onnistui).
FMI:n `/download` voi samoin palauttaa vajaan ajon.

**Toteutus (`scripts/run_guard.py`, vain stdlib):**
- ICON-EU pilvet ja tuuli: `pick_complete_run()` tarkistaa HEAD-pyynnöillä
  (16 rinnakkain) KAIKKI ajon tiedostot (kentät x askeleet) ja valitsee uusimman
  täydellisen ajon. Ohitettu keskeneräinen ajo -> `::notice` "Uusin ajo
  keskeneräinen ... -> käytetään edellistä täydellistä ajoa".
- HARMONIE (ei ajonvalintaa) ja varmistuksena ECMWF (pilvet, tuuli, 7 vrk):
  askelmäärä tarkistetaan purun jälkeen (`require_steps()`).
- Jos täydellistä ajoa ei ole: `keep_previous()` poistaa jo kirjoitetut
  tiedostot, kirjaa `::notice` "Keskeneräinen ajo ... Edellinen täydellinen ajo
  säilyy julkaistuna; yritetään uudelleen seuraavalla ajokerralla" ja lopettaa
  koodilla 0 -> ei virhettä työnkulussa.
- ECMWF: `ecmwf-opendata`-kirjaston `latest()` tarkistaa jo kaikki pyydetyt
  askeleet ja valitsee täydellisen ajon; oma tarkistus on vain varmistus.
- Työnkulut: fetch `if-no-files-found: ignore`, publishin artifactin lataus
  `continue-on-error: true`, `publish-pages` ohittaa julkaisun ilman JSON-
  tiedostoja ("Ei uutta dataa (keskeneräinen mallinajo) - gh-pages ennallaan").

**Todennus:**
- `tests/test_run_guard.py` (7 testiä, ajetaan `tests.yml`:ssä): simuloitu DWD,
  jossa 18 UTC -ajosta julkaistu vain askeleet 0-20 -> valitaan 15 UTC -ajo ja
  merkintä "40/124 puuttuu"; vain viimeisen askeleen yksi kenttä puuttuu;
  täydellinen uusin ajo; vain osittaisia ajoja (-> keep_previous); ei mitään
  (-> virhe); HARMONIE 20/31 askelta; keep_previous poistaa vain mallin omat
  tiedostot ja palauttaa exit 0.
- GitHubissa haarasta: kaikki 7 datatyönkulkua onnistuivat (ICON-EU haki
  täydellisen ajon, 31 askelta). Väliaikainen testityönkulku tyhjällä
  artifactilla: publish-job onnistui, lokissa merkintä "Ei uutta dataa ...",
  gh-pages ennallaan (ajo 39856326327, poistettu ennen yhdistämistä).
- Ei testattu oikeaa keskeneräistä DWD-ajoa GitHubissa (ajoitus satunnainen);
  logiikka testattu simuloidulla datalla.
