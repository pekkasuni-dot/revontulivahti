# Muistio: taustakartat + OVATION-piirto + aikajana-logiikka

## Lisäys: pilvisyysluvun korjaus + mustat rajat + varjo (uusin kierros)

Käyttäjä huomasi, että klikkausmerkin "%"-luku ja kartalla näkyvä valkoinen
pilvitaso saattoivat näyttää ristiriitaiselta (esim. kartalla täysin peittävä
valkoinen pilvi, merkissä silti "70 %"). Syy: luku tuli `cloudFactorAt()`:sta,
joka laskee korkeuspainotetun NÄKYVYYS-arvon (yläpilvien läpi näkee osittain,
paino 0,30) Open-Meteon pistekohtaisesta hausta — eri luku kuin kartan
pilvitaso, joka piirtää ECMWF-hilan RAA'AN kokonaispilvisyyden
(`data/clouds.json`) ilman korkeuspainotusta.

Lisäsin uuden `cloudTotalPctAt()`-funktion, joka palauttaa raa'an
kokonaispilvisyys-%:n (`state.clouds.total`), ja merkki näyttää nyt tämän —
täsmää kartan pilvitason kanssa. Muuta UI:ta (alapaneelin "Pilvetön taivas"
-chip, näkyvyysindeksin laskenta) EN muuttanut, koska niiden korkeuspainotettu
logiikka on tarkoituksellinen osa näkyvyysindeksiä, eikä pyyntö koskenut niitä.

Samalla: manner- (`coast`) ja valtiorajojen (`borders`) väri vaihdettiin
mustaksi (oli vaaleansininen/valkoinen), ja rantaviivalle lisättiin varjo
MapLibren `line-translate`+`line-blur`-paint-ominaisuuksilla (leveämpi,
sumennettu, 1,5 px siirretty musta kopio rantaviivan alla) — ei valmista
"drop-shadow"-ominaisuutta MapLibren viivatasoille, tämä on sen lähin vastine.

Haara: `feature/kartta-ovation-aikajana` (main koskematta). Kolme committia,
yksi per osa, lisäksi yksi pieni committi puuttuvan CLAUDE.md:n lisäämiseksi.

## Lisäykset jälkikäteen (sama haara, 4 pientä pyyntöä)

Jatkokierroksella tehtiin neljä lisämuutosta samaan haaraan, kukin omana
committinaan:

1. **Vaalean taustakartan väri `#8f7f44`.** Toteutin tämän vaihtamalla
   "Vaalea"-tyylin pohjan yksiväriseksi MapLibre `background`-tasoksi (ei
   enää Esrin Light_Gray_Base-rasteritiiliä), jolloin väri on täsmälleen
   annettu heksa. Nimitaso (`World_Light_Gray_Reference`, kaupunkien/maiden
   nimet) ja rajat/rantaviiva pysyvät päällä ennallaan. Vesi/maa-erottelu
   katosi tässä tyylissä, koska taustasta ei enää tule mitään rasteridetaljia
   — kerro jos tämä on ongelma, niin etsin vaihtoehdon jossa väri sekoittuu
   oikeaan karttapohjaan eikä korvaa sitä kokonaan.
2. **Klikkausmerkki näyttää pilvisyysprosentin.** Korvasin aiemman violetin
   "nuppineulan" kortilla, jossa pilvi-ikoni, pilvisyys-% (päivittyy
   aikajanan/latauksen mukana), sulkemisnappi (poistaa merkin ja tyhjentää
   valinnan, `clearPoint()`) ja nuoli-nappi (laajentaa/pienentää alapaneelin,
   sama toiminto kuin paneelin oma kahva). Lämpötilaa ei näytetä, koska
   sovellus ei laske/hae lämpötilaa lainkaan — kuvan "1°" jäi siksi pois.
   Oma sijainti (GPS-piste) käyttää edelleen vanhaa sinistä pistemerkkiä.
3. **Aikajana 30 min askelin.** `timeSlider`:n `step` 1 → 0.5 (arvo pysyy
   tunteina, esim. 0.5 = 30 min), play-napin automaattiaskel 1 → 0.5, ja
   aikaleiman muotoilu uudella `formatOffset()`-funktiolla
   ("+1 h 30 min" / "+30 min" eikä enää "+1.5h"). Myös pilviennusteen
   horisontin mukaan asetettava liukusäätimen `max` lasketaan nyt 30 min
   tarkkuudella (aiemmin pyöristi alaspäin täyteen tuntiin).
4. **Pilvitason läpinäkyvyys pilvisyysasteen mukaan, porrastettuna.**
   Muutin WebGL-pilvishaiderin (`CWG_FRAG`) värin aina valkoiseksi ja
   läpinäkyvyyden portaittaiseksi jatkuvan liukuvärin sijaan. Valitsemani
   läpinäkyvyysarvot (ei annettu tehtävässä täsmällisinä, oma valintani):
   - 0–5 % → 0 (täysin läpinäkyvä)
   - 6–10 % → 0.12, 11–20 % → 0.24, 21–30 % → 0.36, 31–40 % → 0.48,
     41–50 % → 0.60 (nouseva porras per kymmenys, kuten pyydettiin)
   - 51–90 % → 0.75 ("hieman läpinäkyvyyttä")
   - 91–100 % → 1.0 (täysin peittävä, valkoinen)

   Itse pilvikentän MUOTO (bikuubinen näytteistys naapurisolujen välillä +
   fraktaalikohinatekstuuri) jätin koskematta, koska pyyntö koski nimenomaan
   läpinäkyvyyttä, ei pilvikentän paikkatarkkuutta — tämä poikkeaa
   tietoisesti OSA 2:n OVATION-vaatimuksesta ("ei interpolointia"), koska
   pyyntö koski eri kerrosta (pilvet, ei revontulet). Mantereet/rajat näkyvät
   pilvien läpi edelleen, koska `borders`/`coast`-tasot piirretään
   kerrosjärjestyksessä pilvikerroksen YLÄPUOLELLE (ei siis itse
   pilvishaiderin alfa-arvosta riippuvaista — tätä ei tarvinnut muuttaa).

Poistin samalla käyttämättömäksi jääneen `u_dark_bg`-uniformin (tarpeeton,
kun väri on aina valkoinen) ja vanhat `.rv-pin`-CSS-säännöt (korvautuivat
pilvikortilla).

## Lähtötilanne: CLAUDE.md puuttui repositoriosta

`Documents\revontulivahti`-kansiossa (aktiivinen git-repo) ei ollut
CLAUDE.md-tiedostoa, vaikka tehtävässä mainittiin sen löytyvän reposta.
Se löytyi vanhasta, git-seurannan ulkopuolisesta zip-purkukopiosta
(`Downloads\revontulivahti\revontulivahti\`). Lisäsin sen nyt itse
git-repoon feature-haaraan (committi "Lisää puuttuva CLAUDE.md…").
Main-haaraan ei koskettu — tiedosto on toistaiseksi vain feature-haarassa,
kannattaa harkita sen viemistä mainiin erikseen, koska se ei liity
tähän karttatehtävään.

## OSA 1: Taustakartat

**Mitä löytyi:** Testasin kaikki kolme taustakarttatyyliä suoraan
rajapintapyynnöillä (ei vain luettu koodia). CARTOn `basemaps.cartocdn.com`
-tiilet (`dark_nolabels`, `dark_only_labels`, `rastertiles/voyager_nolabels`,
`rastertiles/voyager_only_labels` — eli koko "Tumma"- ja "Vaalea"-tyylin
pohja + nimitasot) palauttavat HTTP 200:n, mutta itse kuva on vesileima
"API KEY REQUIRED — carto.com/basemaps/apikey". CARTO on siis lukinnut
tämän aiemmin ilmaisen rasteripalvelun avaimen taakse. "Satelliitti"-tyyli
(Esri World_Imagery, `server.arcgisonline.com`) toimi oikein, ei avainta.

Koodissa oli jo valmiiksi virhekäsittelijä, joka yritti paeta CARTOn
`dark`-tyylin virhettä vaihtamalla OSM:n vakiotiiliin — tämä viittaa siihen,
että ongelma on havaittu aiemminkin, mutta korjaus oli osittainen (koski
vain "Tumma"-tyyliä, ei "Vaalea"-tyyliä eikä nimitasoja, ja tyylinvaihtonapin
kautta tehty vaihto ei käyttänyt samaa fallbackia).

**Muutos:** Vaihdoin "Tumma"- ja "Vaalea"-tyylin pohjan Esrin avaimettomiin
Canvas-tiiliin, joilla on sama base+labels-rakenne kuin CARTOlla:

- Tumma: `Canvas/World_Dark_Gray_Base` + `Canvas/World_Dark_Gray_Reference`
- Vaalea: `Canvas/World_Light_Gray_Base` + `Canvas/World_Light_Gray_Reference`
- Satelliitti: ennallaan (`World_Imagery`, toimi jo)

Kaikki kolme testattu suoraan rajapinnasta ja visuaalisesti ennen committia
— oikeita karttakuvia, ei virheilmoituksia. Poistin samalla vanhan,
nyt tarpeettoman CARTO-spesifisen virhekäsittelijän (`tileFallbackDone`),
koska juurisyy on korjattu lähteessä.

**Huom (pieni poikkeama alkuperäisestä rakenteesta):** CARTOlla "nolabels"-taso
oli täysin nimetön ja kaikki nimet olivat "only_labels"-tasolla. Esrin
"Base"-taso sisältää valmiiksi maa-/suurpiirteiset nimet (esim. maiden nimet),
"Reference"-taso lisää tarkemmat nimet (kaupungit). Tämä tarkoittaa, että osa
nimistä (maiden nimet) on nyt pilvi-/revontulikerroksen ALLA, ei kokonaan
päällä niin kuin ennen. Visuaalisesti ero on pieni, mutta mainitsen sen,
koska tehtävä korosti tasojärjestyksen säilyttämistä.

**Attribuutio:** `Esri, HERE, Garmin, © OpenStreetMap contributors, and the
GIS user community` (vakiomuotoinen Esri Canvas -attribuutio). Lisätty myös
README.md:n datalähdeosioon.

## OSA 2: OVATION-kentän piirto

**Havainto koodikatselmuksessa:** `drawOvalOverlay()`-funktio toteutti jo
ennen muutoksia kaiken pyydetyn: Mercator-korjauksen (`merc()`/`imerc()`
pystyakselilla, canvas esivääristetty Mercator-Y:ssä niin että MapLibren
`image`-lähteen nelikulmiovenytys tuottaa geometrisesti oikean tuloksen),
yhden pikselin per OVATION-hilasolu (1° resoluutio, ei interpolointia,
ei naapurien sekoittamista) ja liikennevaloasteikon (vihreä → keltainen
→ oranssi → punainen) alfakynnyksellä niin että karttapohja näkyy läpi
matalilla todennäköisyyksillä.

**Mitä muutin:** En löytänyt varsinaista virhettä logiikasta, mutta koska
en pysty ajamaan sovellusta oikeassa selaimessa tässä ympäristössä
(ei selainautomaatiotyökalua käytössä), varmistin soluterävyyden riippumatta
siitä, kunnioittaako MapLibren WebGL-rasterikerros `raster-resampling:
'nearest'`-asetusta täydellisesti `image`-tyyppisille lähteille (tästä on
ollut epävarmuutta eri MapLibre-versioissa). Nostin piirtocanvaksen
resoluutiota 4-kertaiseksi (360×181 → 1440×721) niin, että jokainen
hilasolu koostuu useista identtisistä pikseleistä yhden sijaan — tämä tekee
solujen reunoista terävät myös siinä tapauksessa, että GPU tekisi lievää
bilineaarista suodatusta zoomatessa. Itse väri-/alfalogiikkaa en muuttanut.

**Parametrit (ennallaan, ei muutettu):**
- Väriasteikko: vihreä (20,200,80) → keltainen (220,220,0) → oranssi
  (235,100,0) → punainen (215,0,0), käännepisteet t=0,0.35,0.65,1
  (t = (p-1)/99, p = todennäköisyys-%).
- Alfa: `clamp((p-3)*4, 0, 230)` — kynnys 3 %, jyrkkä nousu, maksimi 230/255
  (~90 %).
- `raster-opacity: 0.85`, `raster-resampling: 'nearest'`.

## OSA 3: Aikajana-logiikka

**Havainto:** Myös tämä oli jo pääosin kunnossa: aikajana (`timeSlider`)
liikuttaa vain pilvitasoa (`cloudTimeFloat`/`renderClouds`), ja OVATION-kenttä
sekä pistekohtainen revontulitodennäköisyys (`auroraProbAt`) käyttävät aina
viimeisintä ladattua OVATION-hilaa `state.hour`-arvosta riippumatta — dataa ei
ekstrapoloida. Tämä täsmää koodin omien kommenttien kanssa
("Aina nykyhetken OVATION, riippumatta aikajanan kohdasta (jäädytetty)").

**Mitä lisäsin:** Erillisen "Revontulet: nyt" -merkinnän (pieni violetti
pilli), joka tulee näkyviin aina kun aikajana on siirretty pois nykyhetkestä
(`state.hour !== 0`) ja piiloutuu kun aikajana palautetaan nykyhetkeen.
Sijoitin sen aikajanan "Ajankohta"-rivin yhteyteen (`.timectl .lbl`), EN
"Revontulet"-faktorikorttiin — faktorikortit (`.factors`) piilotetaan kun
infopaneeli pienennetään ("sheet.min"), mutta aikajanarivi (`.timectl`)
pysyy aina näkyvissä. Tämä varmistaa, että merkintä on todella näkyvissä
"aina kun aikajana ei ole nykyhetkessä", niin kuin tehtävässä pyydettiin,
myös pienennetyssä tilassa.

Olemassa oleva, pidempi infoteksti ("Revontulet: nykyhetki (NOAA OVATION,
päivitetty HH:MM UTC)…") jätettiin paikoilleen — se kertoo tarkan OVATION-
datan aikaleiman, jota uusi lyhyt merkintä ei toista.

## Mitä EI muutettu

- OVATION- tai pilvidatan hakulogiikka (`loadOvation`, `loadCloudGrid`,
  `scripts/fetch-clouds.py`, `.github/workflows/pilvidata.yml`) — koskematta.
- Rajat/rantaviiva-GeoJSON-lähde (jsdelivr) — koskematta, ei tarvinnut avainta.

## Avoimet kysymykset / epävarmuudet sinulle

1. **En voinut testata muutoksia oikeassa selaimessa** (ei selain­automaatio­
   työkalua tässä ympäristössä) — kaikki tarkistukset tehtiin koodi­
   katselmuksella ja suorilla rajapintatesteillä (ladattujen tiilikuvien
   visuaalinen tarkistus). Suosittelen avaamasta haaran paikallisesti
   (`python -m http.server 8080`) ja silmäilemästä kaikki kolme
   karttatyyliä + aikajanan ennen main-haaraan yhdistämistä.
2. **Esri Canvas -tiilien nimitaso on osittain pohjassa** (ks. OSA 1 -huomio
   yllä) — jos tämä häiritsee visuaalisesti, vaihtoehto olisi etsiä toinen
   avaimeton base+labels-pari, mutta en löytänyt parempaa ehdokasta
   rajallisessa ajassa.
3. **"Revontulet: nyt" -merkinnän sijainti** on oma tulkintani tehtävän
   tekstistä ("revontulikentän yhteyteen") — valitsin aikajanarivin sen
   pysyvän näkyvyyden takia. Jos tarkoitit jotain tarkempaa sijaintia
   (esim. suoraan kartan päälle, ei infopaneeliin), kerro ja säädän.
