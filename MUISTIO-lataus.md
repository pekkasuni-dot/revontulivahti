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
| 6 | **ECMWF-pilvet askelittain (kuten ICON-EU/HARMONIE) + binääri/PNG (kohta 7):** nykyhetken askel ensin. | Ensimmäinen pilvikuva ~295 kt -> ~12-15 kt. |
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
