# Muistio: korkeusvalinnat + tuulitaso + hiukkasanimaatio

Haara: `feature/korkeudet-ja-tuuli` (haarautettu `main`:sta OSA 1/2-mallinvalitsin-
ja ECMWF-tyon jalkeen). Main koskematta koko tyon ajan.

## OSA 1: Tuulitaso

### Lähde ja painepinnat — tutkittu oikeilla rajapintakutsuilla

**Ensisijainen (ja ainoa tarvittu) lähde: FMI HARMONIE, `opendata.fmi.fi`.**
DWD/ICON-EU-varapolkua EI tarvittu — kaikki neljä pyydettya korkeutta
saatiin FMI:lta onnistuneesti, testattu jokainen erikseen oikealla haulla:

- **Pinta (10 m):** stored query `fmi::forecast::harmonie::surface::grid`,
  parametrit `WindUMS,WindVMS`, `levels=0`. GRIB-muuttujat `u10`/`v10`
  (GRIB_typeOfLevel=heightAboveGround).
- **850 / 500 / 300 hPa:** stored query `fmi::forecast::harmonie::pressure::grid`,
  samat parametrit, `levels=850`/`500`/`300`. GRIB-muuttujat `u`/`v`
  (GRIB_typeOfLevel=isobaricInhPa) — tarkistettu etta `isobaricInhPa`-
  koordinaatti todella vastaa pyydettya arvoa (ei vain oleteta).
- Rajapinnan `/download`-paatepiste palauttaa suoraan GRIB2-tiedoston
  (ei tarvitse WFS/GML-kaaretta) — paljon yksinkertaisempi kuin DWD:n
  per-tiedosto-per-askel-malli. YKSI HTTP-kutsu palauttaa kaikki
  pyydetyt aika-askeleet.
- `origintime` on valinnainen — rajapinta valitsee itse tuoreimman ajon.
- Käyttöehdot: **CC BY 4.0**, ei API-avainta, kaupallinen kaytto sallittu
  (tarkistettu FMI:n lisenssisivulta).

### Ristiintarkistus: U=itä, V=pohjoinen — EI peilautunut, EI 180° väärin

Haettiin samaan pisteeseen myös FMI:n OMAT valmiiksi lasketut kentät
`WindSpeedMS` ja `WindDirection`, ja verrattiin niita omaan u/v-pohjaiseen
laskentaan samasta pisteesta/hetkesta:

| | Oma lasku (u,v:sta) | FMI:n oma kenttä | Täsmää? |
|---|---|---|---|
| Nopeus | sqrt(u²+v²) = 1,557 m/s | WindSpeedMS = 1,555 m/s | Kyllä |
| Suunta ("mistä tulee") | atan2(u,v)+180° = 48,2° | WindDirection = 47,0° | Kyllä (~1° ero, pyöristys) |

Tämä on paras mahdollinen varmistus ilman Windy-vertailua: FMI:n OMA,
riippumattomasti laskettu suunta/nopeus täsmää lähes tasan meidän
u/v-tulkintaamme. **U/V eivät ole ristissä eivätkä peilautuneet.**

Karttanuolen/hiukkasen kompassisuunta (minne tuuli PUHALTAA, ei mistä
tulee) lasketaan `windBearing(u,v) = atan2(u,v)` (ei +180, koska se on
"tulee"-suunta) — sama kaava, sama todennettu u/v-tulkinta.

### Resoluutio ja alue

- Natiivi: **n. 0,0225° (~2,5 km)**, hila 579×490 pistettä bbox:lla
  19-32 °E, 59-70 °N. Mitattu suoraan GRIB2-vastauksesta.
- Alinäytteistetty **2×2-lohkokeskiarvolla** (ks. aiempi ICON-EU-oppi:
  EI yksittäisen pisteen poiminta) → ~0,045° (~5 km), 245×290 pistetta.
- Sama alue ja resoluutio kuin pilvi-HARMONIE — yhtenäinen, jo
  testattu bbox.
- 13 aika-askelta, 1 h välein (0-12 h) — sama käytäntö kuin ICON-EU:lla.

### Pakkaus ja tiedostokoot

U ja V kvantisoitu tavuiksi (0-255) kiinteälle alueelle **[-80, 80] m/s**
(kattaa myös 300 hPa:n suihkuvirtauksen), koodattu base64-merkkijonoksi
JSON:in sisälle — paljon tiiviimpi kuin lukutaulukko. Mitattu:

| Tiedosto | Koko |
|---|---|
| `data/wind-surface.json` | 2 463 577 tavua (~2,35 Mt) |
| `data/wind-850.json` | 2 463 581 tavua (~2,35 Mt) |
| `data/wind-500.json` | 2 463 581 tavua (~2,35 Mt) |
| `data/wind-300.json` | 2 463 577 tavua (~2,35 Mt) |

Selain lataa **vain valitun korkeuden** tiedoston (OSA 1 -vaatimus) —
`loadWindGrid()` hakee `WIND_LEVELS[state.windLevel].gridFile`:n.

### UI

Uusi riippumaton `#windBtn` (ei kytketty pilvimallivalitsimeen).
Päällä ollessa avautuu `#windLevelPanel`: 4 korkeusvaihtoehtoa tekstina
("850 hPa (~1,5 km)" jne.) + hiukkasanimaatio-kytkin. Valittu korkeus +
lähdeviite näkyy aina-näkyvässä yläpalkin pillerissä
(`#windLevelLabel`, esim. "Tuuli: 500 hPa (~5,5 km) · © Ilmatieteenlaitos
(CC BY 4.0)") — täyttää sekä "korkeus näkyy kartalla" että "lähdeviite"
-vaatimukset yhdellä elementillä.

### VAIHE 1:n yksinkertaiset nuolet

MapLibre GeoJSON-lähde + symbol-taso (ei oma WebGL-kerros) — nuoli-ikoni
piirretään kerran canvasilla, `icon-rotate` asetetaan hilapisteen
kompassisuunnaksi (`icon-rotation-alignment:'map'`). Harvennus: joka
6. hilapiste. Päivittyy aikajanan mukana (`renderWindArrows()` kutsutaan
samoista kohdista kuin `renderClouds()`).

## OSA 2: Hiukkasanimaatio

### Toteutusvalinta: CPU-advektio, ei täysi GPU-ping-pong-simulaatio

Hiukkasten LIIKE lasketaan JavaScriptissa (`wpgStep()`, käyttää samaa
`sampleWindAt()`-funktiota kuin OSA 1:n nuolet ja klikkausmerkki).
**Tietoinen valinta:** täysi GPGPU-advektio (hiukkaspositiot GPU-
tekstuurissa, päivitys fragment-shaiderilla) olisi nopeampi suurilla
hiukkasmäärillä, mutta huomattavasti herkempi hienovaraisille WebGL-
virheille joita en pysty näkemään/debuggaamaan tässä ympäristössä (ei
selainautomaatiota). Muutaman tuhannen hiukkasen CPU-silmukka on
riittävän nopea ja paljon varmempi saada oikein ensi yrittämällä.
"Tuhansia hiukkasia" -vaatimus täyttyy silti (500-4500, näytön koon/
zoomin mukaan).

Haipyvä jälki ON GPU:lla, vakiotekniikalla: kaksi ruudunkokoista
ping-pong-tekstuuria/FBO:ta. Joka kehyksellä: (A) edellinen tekstuuri
piirretään uuteen, alpha × FADE (0,93), (B) uudet hiukkaspisteet päälle
additiivisesti (premultiplied alpha, sama konventio kuin pilvitasolla),
(C) tulos komposiitoidaan kartan pääruudulle.

### Fysiikkasimulaatio: todennettu Pythonilla (ei vain luettu koodia)

Simuloin `wpgStep`:n täsmälleen vastaavan kaavan Pythonilla oikealla
tuulidatalla (5 hiukkasta, 200 kehystä): **ei NaN-arvoja, ei äkillisiä
hyppyjä**, siirtymät järkeviä (koko näkyvä alue ylittyisi muutamassa
minuutissa VISUAL_SCALE=400:lla — ei liian nopea eika liian hidas
silmämääräisesti arvioituna). `VISUAL_SCALE` ON TIETOISESTI EI-
fysikaalinen suurennuskerroin (todellinen 10 m/s tuuli siirtäisi
hiukkasta vain ~0,00009°/s — näkymättömän hidas kartalla) — sama
periaate kuin Windy.comin omassa animaatiossa, ei yritetä esittää
reaaliaikaista nopeutta.

### Suorituskyky ja näkyvyys

- Hiukkasmäärä: `clamp((canvas.width*canvas.height/3500)/zoomFactor, 500, 4500)`,
  missä `zoomFactor = clamp(zoom/5, 1, 2.5)` — pienenee lähempänä
  zoomattaessa (OSA 2 -vaatimus "mukautuu ruudun kokoon JA zoomaukseen").
  Uudelleenlasketaan `resize`- ja `zoomend`-tapahtumissa.
- `document.hidden`-tarkistus `render()`-funktion ALUSSA (ennen mitään
  piirtoa) — koska `render()` lopettaa itse-ylläpitävän silmukkansa
  (ei kutsu `map.triggerRepaint()`) kun se palaa aikaisin, animaatio
  pysähtyy AUTOMAATTISESTI kun sivu piilossa TAI tuuli/hiukkaset pois
  päältä — ei tarvita erillistä pause-lippua.
- Erillinen "Hiukkasanimaatio"-kytkin (`#particlesToggle`), oletus päällä
  kun tuuli päällä. Pois päältä → OSA 1:n nuolet näkyvät sen sijaan
  (`refreshWindLayer()`/`renderWindArrows()` käsittelevät näkyvyyden
  ristiin niin ettei kumpikaan jää turhaan piiloon/päällekkäin).
- **Kartan liike/zoomaus ei jätä haamujälkiä:** `map.on('movestart'/
  'zoomstart', ...)` tyhjentää MOLEMMAT ping-pong-tekstuurit
  (`wpgClearTrails`) heti liikkeen alkaessa — vanhan näkymän jälki ei
  jää näkyviin uuden näkymän päälle. Resize luo tekstuurit uudelleen
  oikeassa koossa (myös tyhjänä).
- Pilvi-/OVATION-tasot EIVÄT PEITY: `wind-particles`/`wind-arrows` ovat
  AINA kerrosjärjestyksen POHJALLA (`reorderAllLayers()`), suoraan
  taustakartan päällä, pilvien ja revontulikentän ALLA.
- WebGL-opit (CLAUDE.md) sovellettu: `UNPACK_ALIGNMENT=1` asetettu
  (vaikka RGBA8-tekstuurit eivät itse asiassa kärsi tästä bugista —
  4 tavua/pikseli on aina 4:lla jaollinen — asetettu silti
  puolustavasti/johdonmukaisesti), `gl.getParameter(ALIASED_POINT_SIZE_RANGE)`
  luetaan ja pisteen koko rajataan siihen (osa mobiiliajureista rajoittaa
  pistekokoa yllättävän pieneksi — en voi testata tätä itse).

## Mitä testattiin MISSÄ (täysi rehellisyys)

**Oikeilla rajapintakutsuilla testattu (data on oikeaa, ei arvattua):**
- Kaikki 4 korkeutta haettu onnistuneesti FMI:lta, GRIB2 parsittu
  cfgribillä, dimensiot/resoluutio/`isobaricInhPa`-taso tarkistettu.
- U/V-suunta ristiintarkistettu FMI:n omiin WindSpeedMS/WindDirection-
  kenttiin (täsmää).
- PNG-renderöinti (matplotlib quiver + rantaviivat) kaikille 4 korkeudelle
  — silmämääräisesti järkevä (300 hPa: länsi-itä-suihkuvirtaus, voimistuu
  etelään n. 55 m/s; pinta: rannikko/meri selvästi tuulisempi kuin maa —
  molemmat fysikaalisesti oikein).

**Simuloitu Pythonilla (ei selaimessa, mutta sama kaava todennettu):**
- Hiukkasten CPU-advektiokaava (`wpgStep`) — ei NaN, järkevät siirtymät.

**EI testattu missään, vain koodikatselmoitu huolellisesti
(suurin riskialue):**
- Koko WebGL-hiukkasanimaatio (OSA 2): shader-kääntyminen, FBO-ping-pong,
  piirtojärjestys, blend-tilat, kerrosjärjestys WebGL-tasolla. Tämä on
  monimutkaisin WebGL-koodi koko projektissa, eikä minulla ole
  selainautomaatiotyökalua tässä ympäristössä sen näkemiseen. Olen
  seurannut TARKASTI samaa, jo toimivaksi todettua kaavaa kuin
  `cloudWebGLLayer` (sama `cwgShader`-apufunktio, sama premultiplied-
  alpha-konventio, sama `u_matrix`-kaytto), mutta en voi taata ettei
  siina ole pieni virhe (esim. attribuutin stride, puskurin koko).
- Nuolten (`icon-rotate`) visuaalinen suunta oikeassa kartassa — looginen
  päättely (bearing-kaava sama kuin ristiintarkistettu hiukkaskaava) on
  vahva, mutta MapLibren `icon-rotation-alignment:'map'`-kaytosta en ole
  nahnyt omin silmin.
- Hiukkasten visuaalinen tiheys/nopeus/väri "oikean nakoisena" - VISUAL_SCALE=400,
  FADE=0.93, MAX_AGE=90 ovat ARVIOITUJA lahtoarvoja, EIVAT silmamaarin
  viritettyja. Todennakoisesti tarvitsevat sinun hienosaatoasi katsottuasi
  oikeassa selaimessa.

**Suositus ennen main-haaraan yhdistamista:** avaa haara paikallisesti,
kokeile tuulitasoa jokaisella 4 korkeudella, vertaa Windyyn samalta
painepinnalta, ja katso nayttaako hiukkasanimaatio jarkevalta (nopeus,
tiheys, haipyminen). Kerro havainnot, niin saadaan nama kolme vakiota
viritettya oikein.

## Mitä EI tehty / avoimet kysymykset

- DWD/ICON-EU-tuulivarapolkua ei toteutettu (ei tarvittu — kaikki 4
  tasoa toimivat FMI:lla). Jos FMI joskus lakkaa tarjoamasta jotain
  tasoa, tama pitaisi lisata silloin.
- Tuulen lahdeviite ei ole MapLibren varsinaisessa attribuutiokontrollissa
  (kuten pilvimallien `cloudAttrSuffix`), vaan omassa nakyvassa
  pillerissa. Toimii, mutta on eri mekanismi kuin pilvilla - tietoinen
  yksinkertaistus ajan saastamiseksi.
- `particlesOn`-kytkimen tilaa ei muisteta localStoragessa (oletus aina
  paalla kun tuuli paalle) - ei pyydetty, jatettu yksinkertaiseksi.
- Hiukkasten "kuoleman" yhteydessa uudelleensyntyminen tapahtuu
  SATUNNAISESTI koko data-bbox:n alueelle, ei vain nykyisen
  karttanakyman sisalle - osa hiukkasista voi siis syntya nakyman
  ulkopuolelle (harmiton, mutta ei taysin optimaalinen suorituskyvyn
  kannalta).
