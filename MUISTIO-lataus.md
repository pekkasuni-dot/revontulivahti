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
