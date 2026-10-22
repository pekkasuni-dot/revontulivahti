# Koodikatselmointi – Revontulivahti / AuroraAwesome

- **Kohde:** `main` @ `b3df3c9` (Merge PR #79), 2026-10-22
- **Tapa:** ulkopuolinen arvio. Koodi on luettu ja kutsupolut jäljitetty. Laskentafunktioita on ajettu Nodella synteettisillä syötteillä (myös `TZ=Europe/Helsinki`), Python-apufunktioita simuloitu, ja Actions-ajohistoria sekä julkaistut meta-tiedostot on tarkistettu GitHubista.
- **Rajaukset:** selaimessa tai puhelimessa ei ole ajettu mitään. Ulkoiset rajapinnat (NOAA, ECMWF, DWD, FMI, YouTube) eivät olleet tavoitettavissa. CLAUDE.md:n ja MUISTIO-tiedostojen väitteisiin ei ole luotettu.
- **Merkinnät:**
  - **VARMISTETTU** = koodipolku jäljitetty tai ajettu.
  - **EPÄVARMA** = mekanismi on uskottava, mutta sitä ei ole voitu todentaa. Syy kerrotaan kohdassa.
  - Vakavuus: **kriittinen / merkittävä / pieni**.

---

## Yhteenveto

Koodi on huolellisempaa kuin koko antaisi odottaa:
- Laskennan ydin (`aurora-core.js`) on puhdasta ja enimmäkseen oikein. Aurinko, pimeä jakso ääritapauksineen, kuu, geomagneettinen leveys, UTC-tulkinta, Kp-jaksot ja kesäaikasiirtymä testattiin, ja kaikki toimivat.
- WebGL-resurssit vapautetaan, ja animaatiot pysähtyvät piilotetulla välilehdellä.
- Selaimesta ei löytynyt hyödynnettävää XSS:ää.

Suurimmat ongelmat ovat:
1. **Akku ja suoritin mobiilissa.** Tuulitaso piirtää koko kartan 60 fps:llä, myös silloin kun hiukkasia ei ole. Lisäksi kaksi tyhjäkäyntisilmukkaa on helppo laukaista.
2. **Väärän ajon data voi näkyä oikean ajan kohdalla.** Askeltiedostoissa ei ole ajon tunnistetta, eikä tuulta päivitetä istunnon aikana.
3. **GitHub Actions -putken toimintavarmuus ja oikeudet.** Aikarajoja ei ole, fetch-jobeilla on kirjoitusoikeus, ja julkaisu voi palauttaa vanhan sovelluskoodin.
4. **Kauppajulkaisun perusasiat puuttuvat.** Data haetaan suhteellisilla poluilla, Esri-ilmakuvan lisenssi on epäselvä, natiiviprojektia ja julkista tietosuojaselostetta ei ole, ja testikytkin on tuotannossa.
5. **Automaattisia testejä ei ole.** Lisäksi 482 kt:n `index.html` on yksi tiedosto.

Kriittisiksi luokittelin vain kauppajulkaisun esteet. Sovellus toimii verkkoversiona, mutta osa löydöksistä näyttää käyttäjälle väärää tietoa (kohdat 2.1, 2.2, 1.2, 1.3).

---

## 1. Oikeellisuus (laskenta ja data)

### 1.1 Merkittävä – Hälytysten toistonesto nollautuu yhdestä datakatkosta (VARMISTETTU, simuloitu)
- **Missä:** `alerts/aurora-alerts.js:155–157` (coming) ja `:167–168` (now).
- **Vika:** kun data puuttuu, ehto palauttaa `on:false`.
  - "Nyt"-tyypillä tämä asettaa `s.armed = true`, vaikka arvo ei ole käynyt rajan alla.
  - "Tulossa"-tyypillä se asettaa `prevOn = false`, ja seuraava onnistunut ajo tulkitaan siirtymäksi.
- **Esimerkki:** Oulu, idx 50 ja Bz-vihje päällä 18.04–18.49. Klo 19.04 OVATION ja mag puuttuvat yhdeltä ajolta. Klo 19.19 molemmat hälytykset lähtevät uudelleen, vaikka tila jatkui koko ajan. NOAA-katkot ja `staleMin` 15 min ovat tavallisia.
- **Korjaus:** kolme tilaa (päällä / pois / tuntematon). Kun tila on tuntematon, `armed` ja `prevOn` säilyvät ennallaan.

### 1.2 Merkittävä (kausittainen) – 7 vrk -lista ohittaa yön, jos pimeä alkaa keskiyön jälkeen (VARMISTETTU, ajettu)
- **Missä:** `index.html:6976` (`day0 = p0.from`) ja `:6982` (`localNoon(day0 + k)`).
- **Vika:** jos yö 1 alkaa klo 00.xx, `day0` on jo seuraava päivä. Yö 2 haetaan silloin vasta sitä seuraavan päivän puolilta päivin.
- **Esimerkki:** Kilpisjärvi 25.4.2026 klo 20: listassa ovat 26.4 klo 00.04 ja 28.4 klo 00.25. Yö, joka alkaa 27.4 klo 00.14, puuttuu. Sama tapahtuu Kilpisjärvellä 15.8. Koskee Kilpisjärveä ja Tromssaa huhti–toukokuussa ja elokuun puolivälissä. Lisäksi päivämäärä näyttää yön alkupäivän sijaan seuraavan päivän.
- **Korjaus:** `day0 = p0.from − 12 h` (yöt klo 12–12 -säännöllä) ja yö k haetaan kohdasta `localNoon(day0) + k vrk`.

### 1.3 Merkittävä – Laiska askel voi tulla eri mallinajosta kuin meta, ja virhe jää välimuistiin (VARMISTETTU logiikka, esiintymistiheys EPÄVARMA)
- **Missä:** `index.html:3329–3355` (`ensureLazyStepLoaded`). Tuottajapuolella `scripts/fetch-clouds-harmonie.py:158` ja muut fetch-skriptit: askeltiedostossa ei ole ajon tunnistetta, ja nimi `*-stepNN.json` on sama ajosta toiseen.
- **Vika:** meta ladataan kerran, askeleet myöhemmin. Jos gh-pages päivittyy välissä, uuden ajon askel N näytetään vanhan metan ajalla `times[N]`. Askel tallentuu avaimella `?run=<vanha times[0]>` ja `cacheFirst`-tilassa, joten virhe pysyy niin kauan kuin vanha meta on käytössä. Interpoloinnin kaksi askelta voivat lisäksi olla eri ajoista.
- **Esimerkki:** HARMONIE, ajoväli noin 3 h. Pilvikenttä näkyy 3 h väärässä kohdassa. ECMWF-tuulella siirtymä on 6–12 h, koska tuulimetaa ei päivitetä lainkaan (ks. 1.4).
- **Korjaus:** fetch-skriptit kirjoittavat jokaiseen askeleeseen `run`/`t0`. Purussa askel hylätään, jos tunniste ei vastaa `g.times[0]`:aa, ja meta ladataan uudelleen. Vaihtoehto: ajokohtaiset tiedostonimet.

### 1.4 Merkittävä – Tuulidataa ei päivitetä istunnon aikana (VARMISTETTU)
- **Missä:** `loadWindGrid` kutsutaan vain kytkimestä, mallin vaihdosta ja korkeuden vaihdosta (`index.html:4242–4246`). Tunnin ajastin (`:8079`) päivittää vain pilvet.
- **Esimerkki:** PWA jatkaa taustalta seuraavana päivänä. Pilvet ovat uudesta ajosta, tuuli vanhasta. Kun ennuste on mennyt ohi, `timeFloatInArray` rajaa ajan viimeiseen askeleeseen, ja vanhentunut tuuli näytetään nykyhetkenä.
- **Korjaus:** lataa tuuli samassa ajastimessa, kun `windOn` on päällä, tai aina kun pilvimeta vaihtuu.

### 1.5 Pieni – Nyt-välilehden ja hälytysten pilvisyys ei tarkista aikaväliä (VARMISTETTU)
- **Missä:** `aurora-core.js:159–162`, `:215–219` (`sampleGridField`/`cloudPct`). Kutsujat: `index.html:6299–6300` ja `aurora-alerts.js:76–77`.
- **Vika:** jos hila on vanhentunut, käytetään hiljaa viimeistä askelta nykyhetkenä. `hourCloud` (`:272`) tekee tarkistuksen oikein.
- **Esimerkki:** ECMWF-julkaisu jumittuu yli 48 h. Indeksi lasketaan 48 h vanhan ennusteen viimeisestä arvosta.
- **Korjaus:** sama aikarajan tarkistus kuin `hourCloud`issa, palautetaan `null`.

### 1.6 Pieni – Keksitty Kp 2, kun Kp-dataa ei ole (VARMISTETTU)
- **Missä:** `index.html:5356` (`v != null ? v : 2`).
- **Vika:** kun sekä OVATION että Kp puuttuvat, revontuliprosentti ja indeksi lasketaan Kp 2:sta eikä näytetä "–".
- **Korjaus:** palautetaan `null` ja näytetään "–".

### 1.7 Pieni – Kp nyt -varapolulla ei ole ikärajaa (VARMISTETTU, ajettu)
- **Missä:** `aurora-core.js:497–498`, `:506–508`.
- **Vika:** kun reaaliaikainen arvio on yli 20 min vanha, palautetaan viimeisin mitattu jakso iästä riippumatta. `kpBlockAt` käyttää sitä kuluvan jakson arvona.
- **Esimerkki:** testissä 6 h vanha Kp 2 kelpasi. Teksti "mitattu 12–15" on rehellinen, mutta laskenta käyttää vanhaa arvoa.
- **Korjaus:** varapolku kelpaa enintään edelliselle jaksolle. Muuten käytetään ennustetta tai `null`.

### 1.8 Pieni – OVATIONin ikää ei tarkisteta (VARMISTETTU)
- **Missä:** `aurora-core.js:527`, `aurora-alerts.js:75`.
- **Vika:** `Observation Time` tallennetaan, mutta indeksi ja "Revontulia nyt" käyttävät myös tunteja vanhaa tiedostoa.
- **Korjaus:** raja esim. 30–60 min, jonka ylittyessä arvo on `null`.

### 1.9 Pieni – Valittu piste maailmankopiolla jää pilvialueen ulkopuolelle (VARMISTETTU koodista, selaimessa EPÄVARMA)
- **Missä:** `index.html:2458` → `setPoint` (`:5640`) → `cloudCovers`.
- **Vika:** `renderWorldCopies` on päällä. Kun kartta panoroidaan maailman ympäri, Suomi saa pituusasteen noin 385°. Tuloksena "Alueella ei pilvidataa", ja 7 vrk -ruutu on tyhjä.
- **Korjaus:** `e.lngLat.wrap()` ennen `setPoint`ia.

### 1.10 Pieni – Kaamoksessa Tänä yönä ja 7 vrk:n yö 1 ovat eri ikkunat (VARMISTETTU, ajettu)
- **Missä:** `aurora-core.js:344–346` (nyt + 16 h) ja `index.html:6971–6975` (klo 16–08).
- **Esimerkki:** Huippuvuoret 1.12 klo 12: Tänä yönä näyttää klo 12–04, 7 vrk näyttää klo 16–08. `maxHours` 16 katkaisee aamun myös Kilpisjärvellä 21.12.
- **Korjaus:** sama kaamosikkuna molempiin.

### 1.11 Pieni – Tulossa-hälytys voi aaltoilla pilvirajalla (VARMISTETTU logiikasta)
- **Missä:** `aurora-alerts.js:125`.
- **Vika:** siirtymäehtoon kuuluvat pilvisyys ja pimeys. Pilvisyys 59/61 % rajan ympärillä tuottaa uuden siirtymän joka kerta, ja ainoa jarru on `repeatMin` 30 min.
- **Korjaus:** hystereesi pilvirajaan, tai siirtymä lasketaan vain avaruussääehdoista.

### 1.12 Pieni – Hälytysten loppuraportista puuttuu viimeisen yön loppu (VARMISTETTU)
- **Missä:** `alert-dryrun.yml`, `END_DATE`.
- **Vika:** viimeinen ajo on 4.11 klo 23.49 UTC, ja lopullinen raportti tehdään 5.11 klo 00.04 UTC. Yöstä 4.–5.11 puuttuu klo 02 jälkeinen osa.
- **Korjaus:** `END_DATE` 5.11, tai loppuraportti vasta klo 10 UTC jälkeen.

### 1.13 Merkittävä – ICON-EU:n osittain julkaistu ajo kaataa haun (VARMISTETTU lokista)
- **Missä:** `scripts/fetch-clouds-icon_eu.py:112–139`, `fetch-wind-icon_eu.py:308–337`.
- **Vika:** `pick_latest_run()` tarkistaa vain CLCT-askeleen 000.
- **Esimerkki:** ajo 39695349135 (21.10. klo 23.44). Tiedosto `..._2026102121_016_CLCT` palautti 404, ja molemmat ICON-EU-työnkulut epäonnistuivat.
- **Korjaus:** tarkista viimeinen askel (030) kaikille kentille ja tasoille. Jos jokin puuttuu, käytä edellistä ajoa.

### 1.14 Merkittävä – Kameran yksi hakuvirhe aiheuttaa väärän "kuva muuttui" -tapahtuman (VARMISTETTU)
- **Missä:** `scripts/check-camera-thumbnails.py:174–181`, `:211–212`.
- **Vika:** kun haku epäonnistuu, julkaistaan `hash: null` ja `live: false`. Seuraavalla ajolla kelvollinen tiiviste on eri kuin `null`, joten `changed = True` ja `lastChanged = nyt`, vaikka kuva olisi jäätynyt. Samalla staattisuuden tunnistus nollautuu.
- **Lisäksi:** CLAUDE.md väittää, että muutokseksi lasketaan vain ennen näkemätön kuva ja että käytössä on harmaasävyvertailu. Kumpaakaan ei ole koodissa, vaan vertailu tehdään vain edelliseen tiivisteeseen.
- **Korjaus:** jos `sha is None`, säilytä edellinen tila ja merkitse `checkFailed`.

### 1.15 Pieni – Datan muunnoksen tarkkuus (VARMISTETTU laskemalla tai simuloimalla)
- **Tuulen kvantisointi:** `fetch-wind-*.py`, `quantize`. 255 askelta välillä [−80, 80] → 0 m/s purkautuu arvoksi +0,31 m/s molemmille komponenteille. Tyynellä säällä hiukkaset ajelehtivat noin 0,44 m/s koilliseen. 300 hPa:n suihkuvirtaus voi talvella ylittää 80 m/s, jolloin arvo leikkautuu. **Korjaus:** 254 tasoa, jolloin nolla = 127.
- **Lohkokeskiarvon koordinaatti:** `fetch-clouds-harmonie.py:130`, `fetch-wind-harmonie.py:168`, `fetch-wind-icon_eu.py:391`. Koordinaatiksi kirjataan lohkon ensimmäinen piste eikä keskipiste. Siirtymä pohjoiseen ja itään: HARMONIE-tuuli noin 3,75 km, ICON-EU-tuuli noin 3,5 km, HARMONIE-pilvi noin 1,25 km.
- **HARMONIE-pilvistä puuttuu NaN-tarkistus:** `fetch-clouds-harmonie.py:400–407`. NaN muuttuu 0 %:ksi. Tuulessa tarkistus on.
- **HARMONIE-metasta puuttuu `run`:** "Päivitetty" näyttää hakutunnin eikä mallin ajoaikaa (`index.html:3273`).
- **ECMWF:** `fetch-clouds.py:108` olettaa `tcc`-asteikon 0–1, kun taas `fetch-ecmwf-7d.py` tunnistaa myös prosentit. Nykyinen data on oikein.
- **EPÄVARMA:** pilvet ja tuulet haetaan erillisillä `retrieve`-kutsuilla, jotka voivat poimia eri ajot. Tämä riippuu `ecmwf-opendata`n `latest()`-logiikasta.

### Tarkistettu ja kunnossa
- `sunAltitude` täsmää (Helsinki kesäkuu 53,26°, joulukuu 6,39°).
- `darkPeriod`: kesäkuu 69 °N → ei pimeää; joulukuu 69 °N → 19 h; 78 °N → koko vuorokausi. 10 min haku ei ohita lyhyitä jaksoja.
- Kuun vaiheet, `magLat`, `kpRequired`.
- OVATIONin kierto 0°/360°.
- NOAA-aikaleimat ilman vyöhykettä tulkitaan UTC:ksi; Kp:n UTC-jaksot ja edellisen jakson arvo jakson alussa toimivat.
- `visibilityIndex` välittää `null`-arvon eteenpäin; kesäaikasiirtymä 25.10. ei riko mitään.
- Rivijärjestys etelästä pohjoiseen on sama tuottajalla ja kuluttajalla.
- Epäonnistunut haku ei ylikirjoita hyvää dataa gh-pagesilla.

---

## 2. Bugit, kilpailutilanteet, välimuisti ja SW

### 2.1 Merkittävä – Puuttuva askel haetaan uudelleen joka ruudunpäivityksellä (VARMISTETTU)
- **Missä:** `index.html:3329–3355`. Epäonnistumisen jälkeen ajetaan vain `g.pending.delete(idx)`. Kutsujat ovat pilvitason `render` (`:3932`) ja `sampleWindAt` (`:4054`), jota hiukkasanimaatio kutsuu joka ruudulla.
- **Esimerkki:** tuuli on päällä ja yhteys katkeaa, tai askel antaa 404. Uusi `fetchJSON`-ketju (Cache API, `netFail`, `renderNetNotice`) käynnistyy jatkuvasti, koska 4xx katkaisee yrityssilmukan heti.
- **Korjaus:** `g.failed`: idx → seuraava sallittu yritysaika (30 s → 5 min). Tyhjennetään `netRecover()`:ssa.

### 2.2 Merkittävä – Avaruussään ajastus jää setTimeout(0)-silmukkaan (VARMISTETTU)
- **Missä:** `index.html:7461` (`if(swx.busy) return;`) ja `:7486–7495`.
- **Vika:** kun haku on kesken, `loadSpaceWx()` palaa heti, `.finally(scheduleSpaceWx)` laskee `due = 0` (`fetchedAt` on 0 tai vanha), ja kierros toistuu noin 4 ms:n välein, kunnes haku valmistuu.
- **Esimerkki:** ensimmäinen haku on kesken hitaalla verkolla (enintään noin 64 s), ja käyttäjä avaa infoikkunan (`:7279`).
- **Korjaus:** älä ajasta, kun `swx.busy` on tosi (valmistuva haku ajastaa itse), tai palauta kesken oleva lupaus.

### 2.3 Merkittävä – SW lataa sivun uudelleen ensimmäisellä käynnillä (VARMISTETTU speksin perusteella, selaimessa ei ajettu)
- **Missä:** `sw.js:28` (`clients.claim()`) ja `index.html:8116–8119` (`controllerchange` → `location.reload()` ehdoitta).
- **Vika:** ensikäynnillä `claim()` laukaisee `controllerchange`-tapahtuman, ja sivu latautuu uudelleen kesken käynnistyksen. Asennus hakee lisäksi koko SHELLin (myös MapLibren noin 800 kt) toiseen kertaan `cache:'reload'`-asetuksella. Tämä osuu juuri hitaan 3G:n tilanteeseen, jota on optimoitu.
- **Korjaus:** `const had = !!navigator.serviceWorker.controller` ennen rekisteröintiä; uudelleenlataus vain jos `had`, tai vain päivityspillerin painalluksesta.

### 2.4 Pieni/merkittävä – Sovelluskuoren taustapäivitys ohittaa versioinnin (clone-bugi VARMISTETTU, versiosekoitus EPÄVARMA)
- **Missä:** `sw.js:69–76`.
- **Vika:** cache-first-haku ja `fetch()` ilman `cache:'reload'`-asetusta kirjoittavat uudet tiedostot vanhan version välimuistiin yksi kerrallaan. Seurauksena voi olla uusi `index.html` vanhan `aurora-core.js`:n tai `i18n.js`:n kanssa ilman päivityspillerin painallusta. Asennuksessa korjattu ongelma palaa tätä kautta.
- **Lisäksi:** `res.clone()` kutsutaan asynkronisesti. Kun välimuistissa ei ole osumaa, vastaus on jo palautettu ja luettu, joten kloonaus heittää virheen eikä tallennusta tapahdu.
- **Korjaus:** poista kuoren taustapäivitys, koska versioitu asennus riittää. Jos päivitys säilytetään, kloonaa synkronisesti ennen `return`ia.

### 2.5 Pieni – Muut tilanhallinnan viat (VARMISTETTU)
- **Kamerakortin ajastinvuoto** (`index.html:4689–4717`): `setInterval` luodaan oEmbed-`await`in jälkeen ehdoitta. Jos kortti suljetaan tai toinen avataan odotuksen aikana, ajastin jää käyntiin. **Korjaus:** tarkista `state.openCameraId === camId` ennen ajastinta.
- **Vanhan avaimen uusinta elää ikuisesti** (`:2843`, `:2884–2888`): vaihdon jälkeen epäonnistunut vanha haku ajastaa uusinnan 5 min välein ja näyttää virhetilan, vaikka näkyvä data on kunnossa. **Korjaus:** ohita `netFail`, jos avain ei ole enää lähteen nykyinen.
- **`netLooksOffline` on liian herkkä** (`:2696`, `:2742–2746`): yksikin `TypeError` mistä tahansa (esim. mainoseston estämä oEmbed) estää tallennetun datan käytön kaikilta lähteiltä. EPÄVARMA, koska NOAA:n virhevastausten CORS-otsakkeita ei voitu tarkistaa. **Korjaus:** heuristiikka vain omista datahauista tai lähdekohtaisesti.
- **7 vrk -ruudut ja 27 vrk -ennuste** (`:6878–6889`, `:6939–6950`): virhe tallennetaan pysyvästi, eikä hakua yritetä uudelleen. 27 vrk -haku käyttää suoraa `fetch()`:ia ilman aikakatkaisua, vastoin projektin omaa sääntöä.
- **`loadMapLib`-virheestä ei toivu** (`:8063–8067`): `netRecover` ei yritä latausta uudelleen.
- **`mouseenter`/`mouseleave`-kuuntelijat** (`:4465–4468`) lisätään uudelleen jokaisella tyylinvaihdolla.
- **Tiilivälimuistin karsinta** (`sw.js:39–43`): `tilePuts` nollautuu, kun SW käynnistyy uudelleen. Jos tallennuksia tulee alle 50 elinkaarta kohden, välimuistia ei karsita koskaan.

### 2.6 Merkittävä – WebGL-kontekstin menetystä ei käsitellä (koodipolku VARMISTETTU, toistuvuus iOS:llä EPÄVARMA)
- **Missä:** `webglcontextlost`/`restored` ei esiinny koodissa (0 osumaa).
- **Vika:** MapLibre 3.6.2 luo piirtäjän uudelleen, mutta ei kutsu omien tasojen `onAdd`-funktiota. `CWG.ready` ja `WPG.ready` jäävät tilaan `true`, ja ne viittaavat kuolleen kontekstin resursseihin. Pilvet ja tuuli lakkaavat piirtymästä.
- **Esimerkki:** iOS-kotivalikkosovellus palaa taustalta muistipaineen jälkeen.
- **Korjaus:** `map.on('webglcontextrestored', …)`, jossa valmiustilat nollataan ja tyyli rakennetaan uudelleen.

### Tarkistettu ja kunnossa
- Mallin vaihto: `seq`- ja `curModel()`-vartijat estävät vanhaa vastausta ylikirjoittamasta uutta tilaa.
- localStorage on kaikkialla `try/catch`issa.
- PNG-purku rajaa arvot välille 0–100.
- `onRemove` vapauttaa ohjelmat, puskurit ja tekstuurit.

---

## 3. Tietoturva ja tietosuoja

Kriittisiä löydöksiä ei ole, eikä selaimesta löytynyt hyödynnettävää XSS:ää. Kaikki DOM-kirjoitukset ulkoisesta datasta kulkevat `textContent`in kautta tai muunnetaan ensin numeroiksi.

### 3.1 Merkittävä – Fetch-jobeilla on kirjoitusoikeus repoon (VARMISTETTU konfiguraatiosta)
- **Missä:** kaikki data-työnkulut. Työnkulun tason `permissions: contents: write` periytyy myös fetch-jobeille, ja `actions/checkout@v4` jättää tokenin `.git/config`:iin.
- **Riski:** fetch-jobi asentaa versioon lukitsemattomia `pip`-paketteja (ecmwf-opendata, cfgrib, xarray, numpy, Pillow). Kaapattu paketti voisi pushata mainiin. Mainin haarasuojausta ei voitu tarkistaa.
- **Korjaus:**
  - Työnkulun tasolle `contents: read`; `write` vain publish-jobeille.
  - Fetch-jobien checkoutiin `persist-credentials: false`.
  - `requirements.txt` lukituin versioin ja tiivistein.

### 3.2 Pieni – YouTube-videotunnusta ei validoida (VARMISTETTU)
- **Missä:** `index.html:4591` (`camVideoId`) ja `scripts/youtube_live.py:222`.
- **Vika:** raavittu `videoId` tarkistetaan vain pituuden osalta, ja se menee iframe-, img- ja href-osoitteisiin koodaamatta. Kiinteä `https://`-alku estää `javascript:`-osoitteet, joten vaikutus rajoittuu polun tai kyselyparametrin muuttumiseen.
- **Korjaus:** `/^[\w-]{11}$/` molemmissa päissä.

### 3.3 Pieni – `escHtml` ei suojaa lainausmerkkejä (VARMISTETTU, ei nykyistä hyödynnettävää polkua)
- **Missä:** `index.html:6275`. Funktio korvaa vain `&` ja `<`, mutta sitä käytetään attribuuteissa (`:5389`, `:6695`, `:7075`, `:7507`).
- **Lisäksi:** `t()` lisää `{muuttujat}` sellaisenaan, ja tulos menee `innerHTML`:ään (esim. `:3161`).
- **Korjaus:** lisää `"` → `&quot;` ja `>` → `&gt;`. Muuttujat escapoidaan ennen `innerHTML`:ää.

### 3.4 Pieni – CSP puuttuu, eikä CDN-varapolulla ole SRI-tarkistusta (VARMISTETTU)
- **Missä:** `index.html:1976–1977`. unpkg- ja jsdelivr-varapolut ladataan ilman `integrity`-attribuuttia, eikä sivulla ole CSP-meta-tagia.
- **Korjaus:** SRI-tiiviste tai varapolun poisto, sekä perus-CSP.

### 3.5 Pieni – Tietosuojaseloste ei vastaa koodia (VARMISTETTU)
- **Vika:** luonnos (§3) sanoo, että sijaintia käytetään vain oma sijainti -napista. `ensureOwnLocation()` (`:5708`, `:6248`, `:7272`) pyytää lupaa kuitenkin myös infoikkunaa avattaessa. Seloste mainitsee lisäksi cdnjs:n, jota ei enää käytetä.
- **Hyvää:**
  - Sijaintia ei tallenneta eikä lähetetä minnekään URL:ssa.
  - Käynnistyksessä paikannetaan vain, jos lupa on jo annettu.
- **Epäsuora vuoto:** `flyTo` omaan sijaintiin paljastaa karkean alueen tiilipyynnöissä OpenFreeMapille, AWS:lle ja Esrille. Lisäksi Google Fonts ja oEmbed haetaan jo kortin avauksessa.

### 3.6 Pieni – Muut Actions-huomiot (VARMISTETTU)
- Actionit on lukittu tagiin, ei SHA:han.
- Push on `--force` ilman leasea.
- `${{ }}`-arvot `run:`-askeleissa ovat staattisia, eikä `pull_request_target`-laukaisimia ole, joten injektioriskiä ei nyt ole.
- Repossa tai historiassa ei ole salaisuuksia.
- `.gitignore` on kunnossa.

---

## 4. Suorituskyky ja akku mobiilissa

### 4.1 Merkittävä – Tuuli päällä = koko kartta piirretään 60 fps:llä, myös ilman hiukkasia (VARMISTETTU, GPU-kuormaa ei mitattu)
- **Missä:** `index.html:5324`. `map.triggerRepaint()` kutsutaan aina, kun kartta ei ole peitossa. Ehdossa ei ole hiukkasmäärää.
- **Esimerkki:** näkymä on mallin alueen ulkopuolella, esim. HARMONIE ja Islanti. Hiukkasia on 0, mutta silmukka pyörii.
- **Normaalitilanteessakin** jokainen ruutu piirtää kaikki tasot. Pilvivarjostin tekee 2 × 16 tekstuurihakua pikseliä kohden, eikä `pixelRatio`-asetusta rajata. Puhelimessa, jonka pikselisuhde on 3, se tarkoittaa noin 3 Mpx × 32 ≈ 95 milj. hakua ruudussa, eli noin 5,7 mrd. sekunnissa.
- **Korjaus:**
  - Pysäytä silmukka, kun `WPG.count === 0`.
  - Rajaa animaatio 30 fps:iin.
  - `pixelRatio: Math.min(devicePixelRatio, 2)`.
  - Pitkällä aikavälillä hiukkaset omalle canvasilleen, jolloin karttaa ei tarvitse piirtää joka ruudussa.

### 4.2 Merkittävä – Hiukkasmäärä skaalautuu pikselisuhteen neliössä (VARMISTETTU aritmetiikalla; tiheys voi olla tarkoituksella viritetty puhelimella)
- **Missä:** `index.html:4991`, `:5164–5297`. Määrä lasketaan laitepikseleistä, mutta hiukkasen koko on CSS-pikseleinä.
- **Esimerkki:** puhelimessa noin 2000 hiukkasta ja työpöydällä noin 875. CSS-pinta-alaa kohden puhelimessa on siis 9× tiheämpi kenttä. Jokainen hiukkanen tekee ruudussa binäärihaun, kaksi `resolveStep`-kutsua ja yhden olion varauksen. `bufferSubData` siirtää noin 65 Mt/s.
- **Korjaus:** laske määrä CSS-pikseleistä. Aikaindeksi ja askeleet lasketaan kerran ruutua kohden, ja tulosolio käytetään uudelleen.

### 4.3 Merkittävä – Laiskojen askelten muisti kasvaa rajatta (mekanismi VARMISTETTU, kaatumista ei testattu)
- **Missä:** `index.html:3350` (`g.steps.set`). `steps.delete` ei esiinny koodissa.
- **Vika:** ICON-EU:lla 4 Float32-kenttää × noin 343 000 pistettä ≈ 5,5 Mt askelta kohden. Aikajanan selaus tai Tänä yönä -välilehti voi viedä 137–170 Mt. Myös `rv-data-v1` säilyttää kerran kokeillun mallin askeleet pysyvästi.
- **Korjaus:**
  - LRU-välimuisti (±3 askelta).
  - Arvot `Uint8`:na Float32:n sijaan (4× pienempi).
  - Kerrokset puretaan vasta tarvittaessa.
  - Valitsemattomien mallien Cache API -perheet siivotaan.

### 4.4 Pieni – Muut (VARMISTETTU, ellei toisin mainita)
- **Tasojen uudelleenjärjestys joka tuntiaskeleella** (`:4094–4107`): `renderClouds()` kutsuu `reorderAllLayers` (yli 30 `moveLayer`-kutsua), mikä käynnistää symbolien täyden uudelleensijoittelun. `setData` kutsutaan rajadatalle joka kerta. Nimiöt voivat välkkyä aikajanaa vedettäessä.
- **Revontulikuva** (`:3210–3218`): kuva suurennetaan 8× (1440×1392), ja `toDataURL` ajetaan pääsäikeessä 5 min välein. `raster-resampling:'nearest'` antaa saman tuloksen suoraan pienestä kuvasta.
- **Pilvitekstuurin välimuistin avain** (`:3941–3949`) ei tunnista uutta hilaa, jos indeksi ja `nlat` sattuvat olemaan samat. Harvinaista.
- **Rantaviiva** (`:2356–2385`) rakennetaan vain `moveend`- ja `sourcedata`-tapahtumista. Panoroinnin aikana paljastuvalla alueella ei ole rantaa, ennen kuin liike pysähtyy. Visuaalinen vaikutus EPÄVARMA.
- **Taustalta palatessa koko tyyli voi latautua uudelleen** (`recoverMap`, `:2797`): iOS:n keskeyttämä tiilihaku riittää asettamaan `mapNetFailed = true`. EPÄVARMA.

### Tarkistettu ja kunnossa
- Hiukkaset pysähtyvät, kun välilehti on piilossa, tuuli on pois päältä tai infoikkuna on koko näytöllä.
- Kyselyt pysähtyvät piilossa.
- NPOT-tekstuurit: `CLAMP_TO_EDGE` + `NEAREST`, ja `UNPACK_ALIGNMENT` asetetaan ennen jokaista latausta.
- Varjostimet ovat `highp`.
- Hiukkasten matriisi lasketaan näkymän keskipisteen suhteen 64-bittisenä.

---

## 5. Saavutettavuus ja mobiilikäytettävyys

`node scripts/check-i18n.mjs` meni läpi: viisi kieltä, 296 avainta.

### 5.1 Merkittävä – Dialogeissa ei ole fokuksenhallintaa eikä Esc-sulkemista (VARMISTETTU)
- **Missä:**
  - Kamerakortti ja "Kaikki kamerat" (`index.html:1212`, `:1232`, `:4690`) ovat `aria-modal="true"`, mutta fokus ei siirry dialogiin.
  - Sama koskee Asetuksia sekä revontuli- ja tuuli-infoa (`:1119–1191`).
  - Globaali Esc-käsittelijä (`:7289–7294`) ei sulje näitä.
- **Esimerkki:** VoiceOver-käyttäjä avaa kameran, mutta lukija jää karttaan.
- **Korjaus:** sama malli kuin `openSwChart`/`closeSwChart`issa (`:7945`, `:7958`): fokus siirtyy ruksiin, Esc sulkee, ja fokus palaa avaajaan.

### 5.2 Merkittävä – Zoomaus on estetty, ja kaikki fontit ovat px-yksiköissä (VARMISTETTU)
- **Missä:** `:37` `user-scalable=no` ja noin 100 `font-size`-määritystä px:nä. Pienimmät ovat 9–10,5 px.
- **Vika:** zoomauksen esto on tarkoituksellinen, mutta mikään ei korvaa sitä. Natiivissa iOS:n Dynamic Type ei vaikuta WKWebView-tekstiin, joten heikkonäköinen ei saa tekstiä suuremmaksi millään tavalla.
- **Korjaus:** rem-asteikko ja tekstikokoasetus (tai järjestelmän tekstikoko natiivissa), pienin koko vähintään 11–12 px.

### 5.3 Pieni (VARMISTETTU)
- **`prefers-reduced-motion`** kattaa vain CSS-siirtymät (`:960`). Keyframe-animaatiot, tuulihiukkaset ja `flyTo` jatkuvat.
- **Infoikkunan sulkeminen** ei palauta fokusta `#infoBar`:iin (`:7264–7281`).
- **Segmenttivalitsimet** (radiogroup) eivät liiku nuolinäppäimillä.
- **`#timeSlider`:** ei `aria-valuetext`:iä, joten lukija sanoo "3".
- **`#timeLbl`:** aria-label korvaa näkyvän ajan (WCAG 2.5.3).
- **`#toast`** ei ole live-alue.
- **Kontrasti:** `.ver` noin 2,3:1. Vanhentuneen arvon himmennys (`.ib-stale`, opacity .45) on noin 4,1:1 ja kertoo tilan pelkällä himmennyksellä. Päävärit ovat kunnossa (teksti 16,4:1, `--dim` 6,8:1).

---

## 6. Ylläpidettävyys

- **Merkittävä – automaattisia testejä ei ole** (VARMISTETTU). `package.json` sisältää vain `screenshots` ja `check-i18n`. `aurora-core.js` on puhtaita funktioita, joten yksikkötestit (`node --test`) olisivat halpoja, ja ne olisivat estäneet esim. kohdat 1.1, 1.2 ja 1.5. **Korjaus:** testit ja CI-työnkulku pull requesteille.
- **Merkittävä – `index.html` on 482 kt, 8451 riviä ja noin 330 funktiota yhdessä tiedostossa** (VARMISTETTU). Koodia ei voi testata yksikkötesteillä, ja rinnakkaiset haarat tuottavat konflikteja. **Korjaus:** ES-moduulit (kartta, pilvet, tuuli, info, kamerat, verkko). `aurora-core.js` on hyvä malli.
- **Merkittävä – testikytkin on tuotannossa** (VARMISTETTU). `TEST_VERSIONS = true` (`:6545`) näyttää kaikille käyttäjille "Testiversio V1/V2/V3" -valitsimen.
- **Pieni:**
  - `?debug`-, `?griddebug`- ja `?paletti`-näkymät ovat tuotantokoodissa.
  - Kuolleet funktiot: `fmtCoords` (`:6209`) ja `nightRangeText` (`:6583`).
  - Väliaikainen `camera-probe.yml` ja `.github/camera-probe.env` ovat mainissa, vaikka oma ohje käskee poistaa ne.
  - `TARKISTA` ×399 ja `TARKISTAMATON` ×286 i18n.js:ssä: es-, fr- ja zh-käännökset ovat suurelta osin tarkistamatta.
- **Kopioitu logiikka:** väite "ei kopioita" pitää paikkansa. index.html käyttää AuroraCorea ohuin kääröin. Ainoa rinnakkaistoteutus on Catmull-Rom GLSL-varjostimessa, mikä on väistämätöntä.
- **Dokumentaation ja koodin ristiriita:** kameroiden "ennen näkemätön kuva + harmaasävyvertailu" (kohta 1.14).

### GitHub Actions -putken toimintavarmuus
- **Merkittävä – fetch-jobeilla ei ole `timeout-minutes`-rajaa** (VARMISTETTU ajohistoriasta). Raja on vain `ecmwf-7d`:ssä ja `alert-dryrun`issa.
  - **Esimerkki:** ajo 39792119443 (wind-harmonie, 22.10.). Asennusaskel jumittui 4 h 43 min. Seuraava ajo peruutti sen, jolloin myös publish peruuntui, ja jo haetut kolme tasoa jäivät julkaisematta. Tuulidata vanheni noin 5 tunniksi.
  - **Korjaus:** `timeout-minutes: 20–30` jokaiseen fetch-jobiin. Silloin aikakatkaisu on `failure` eikä `cancelled`, ja `publish` (`if: !cancelled()`) julkaisee onnistuneet tasot.
- **Merkittävä – julkaisu voi palauttaa vanhan sovelluskoodin** (VARMISTETTU GitHubin toimintatavasta; esiintymistä ei todennettu lokeista).
  - **Missä:** `publish-pages/action.yml` kopioi `index.html`:n, `sw.js`:n ja `lib/`:n työhakemistosta, ja publish-jobin checkout hakee ajon käynnistyshetken commitin.
  - **Esimerkki:** main päivittyy fetchin aikana. `sync-pages` julkaisee uuden koodin, ja datan publish ylikirjoittaa sen vanhalla.
  - **Korjaus:** checkoutiin `ref: main`, tai sovellustiedostot haetaan actionissa `origin/main`:sta.
- **Merkittävä – ajastukset eivät toteudu suunnitellusti** (VARMISTETTU ajohistoriasta 19.–22.10.).
  - camera-status (`*/10`) ajoi 3–5 h välein. ICON-EU ja HARMONIE (8×/vrk) ajoivat 4–5×/vrk.
  - Kameroiden 20 min pysyvyyslogiikka ja ICON-EU:n ":55 julkaisun jälkeen" -ajoitus perustuvat oletuksiin, jotka eivät toteudu.
  - **Korjaus:** ulkoinen herätin (esim. Cloudflare Cron → `workflow_dispatch`) ja suunnittelu olettaen ajon vain 3–5 h välein.
- **Pieni/EPÄVARMA – jonossa odottava publish voi peruuntua.** GitHub pitää concurrency-ryhmässä vain yhden odottavan jobin, ja `cancel-in-progress: false` ei estä tätä. Viimeisissä 100 ajossa tapausta ei näkynyt.
- **Pieni – vanhoja tiedostoja ei poisteta gh-pagesilta.** Poistetut tai uudelleennimetyt tiedostot jäävät pysyviksi. Hyvä puoli: yksi työnkulku ei poista toisen dataa.

---

## 7. Kauppajulkaisun esteet (Capacitor, App Store, Google Play)

### 7.1 Kriittinen – Data haetaan suhteellisilla poluilla (VARMISTETTU)
- **Missä:** `data/...` on kovakoodattu: `CLOUD_MODELS` `:1828–1850`, tuuli `:1903`, kamerat `:4488`/`:4492`, e7d `:6882`.
- **Vika:** Capacitor-paketissa polut osoittavat `capacitor://localhost/data/`, missä dataa ei ole. Pilvet, tuuli, kamerat ja 7 vrk eivät toimi.
- **Korjaus:** `DATA_BASE`-vakio, joka natiivissa osoittaa absoluuttiseen URL:iin. GitHub Pagesin CORS-otsakkeet ja käyttöehdot kaupalliselle liikenteelle pitää tarkistaa (EPÄVARMA). Todennäköisesti tarvitaan oma CDN, esim. Cloudflare, joka on jo suunnitelmissa.

### 7.2 Kriittinen (EPÄVARMA lisenssitulkinta) – Esri World Imagery ilman avainta
- **Missä:** `:2042`, `:2588`, `SAT_THUMB`.
- **Vika:** Esrin ehdot edellyttävät tuotantokäytössä ArcGIS-tiliä tai -avainta. Kaupallinen sovellus avaimettomana on todennäköisesti ehtojen vastainen.
- **Korjaus:** lisenssi, avain tai satelliittipohjan poisto ennen julkaisua.

### 7.3 Merkittävä (VARMISTETTU)
- **Natiiviprojektia ei ole.** `capacitor.config`, `ios/` ja `android/` puuttuvat. Siksi puuttuvat myös `NSLocationWhenInUseUsageDescription`, Android-sijaintioikeudet ja target API -taso.
  - `navigator.geolocation` WKWebViewissä aiheuttaa kaksoislupakyselyn ("localhost haluaa sijaintisi").
  - Suositus: `@capacitor/geolocation` ja `@capacitor/haptics`. iOS:ssä `navigator.vibrate` puuttuu kokonaan.
- **Service Worker natiivissa.** Androidin `https://localhost`:lla SW rekisteröityy, ja päivityspilleri sekä cache-first voivat jättää vanhan koodin voimaan pakettipäivityksen jälkeen. **Korjaus:** ohita SW natiivissa (`Capacitor.isNativePlatform()`).
- **Tietosuojaseloste on vain luonnos.** Julkinen URL ja rekisterinpitäjä puuttuvat, ja sisältö on osin väärä (kohta 3.5). Molemmat kaupat vaativat julkisen URL:n.
- **Ulkoiset riippuvuudet ajonaikana.** Google Fonts ja CDN-varapolut haetaan verkosta. **Korjaus:** fontit pakettiin.
- **Testikytkin** `TEST_VERSIONS` on näkyvissä (kohta 6).

### 7.4 Merkittävä (EPÄVARMA)
- **YouTube:** pikkukuvien hotlinkkaus ja oEmbed kaupallisessa sovelluksessa sekä kameroiden omistajien luvat. `youtube-nocookie`-upotus voi epäonnistua `capacitor://`-originilta (virhe 152/153). **Korjaus:** testaa laitteella, tai avaa videot YouTube-sovellukseen.
- **Apple 4.2 (minimitoiminnallisuus):** kaikki data tulee verkosta. Ilman yhteyttä näkyy vain pohjakartta, mikä vaatii selkeän tyhjätilan. Push-hälytykset ja natiivi paikannus pienentäisivät riskiä.

### 7.5 Pieni (VARMISTETTU)
- **Kuvakkeet:** 1024×1024-kuvake ilman alfakanavaa puuttuu (kuvakkeet ovat RGBA). `apple-touch-icon` on 192 px (suositus 180).
- **Manifesti:** `id` puuttuu.
- **Attribuutio:** maininta datan muokkaamisesta (CC BY 4.0, GeoNutzV) ja ECMWF:n vastuuvapauslauseke puuttuvat `ABOUT_SOURCES`ista.
- **`target=_blank`-linkit (6 kpl):** käsittely Capacitorissa on varmistettava.
- **OSM-maininta** näkyy puhelimella vain 5 s. Tulkinta EPÄVARMA.

---

## Viisi tärkeintä korjausta järjestyksessä

1. **Akku: tuulen jatkuva piirto ja tyhjäkäyntisilmukat** (4.1, 2.1, 2.2, 4.2).
   - `triggerRepaint` vain kun hiukkasia on, 30 fps ja `pixelRatio` enintään 2.
   - Epäonnistuneelle askeleelle uusintaviive.
   - `scheduleSpaceWx` ei ajasta, kun `busy`.
   - Pieniä muutoksia, joilla on suuri vaikutus puhelimen akkuun ja lämpenemiseen.
2. **Väärän ajon data oikean ajan kohdalla** (1.3, 1.4, 1.5).
   - Ajon tunniste jokaiseen askeltiedostoon ja tarkistus purussa.
   - Tuulen päivitys tunnin ajastimessa.
   - Nyt-arvon aikarajan tarkistus.
3. **Actions-putki** (6: timeout, vanhan koodin julkaisu; 3.1: oikeudet; 1.13: ICON-EU-ajon valinta).
   - `timeout-minutes` kaikkiin fetch-jobeihin.
   - `contents: read` ja `persist-credentials: false` fetch-jobeille.
   - `ref: main` publish-checkoutiin.
   - ICON-EU:lle viimeisen askeleen tarkistus.
4. **Hälytysten toistonesto ja 7 vrk:n puuttuva yö** (1.1, 1.2).
   - Tuntematon tila ei saa muuttaa `armed`/`prevOn`-tilaa.
   - Yöt lasketaan klo 12–12 -säännöllä.
   - Hälytykset ovat kuivaharjoituksessa: korjaus ennen loppuraporttia 5.11. parantaa sen luotettavuutta.
5. **Yksikkötestit `aurora-core.js`:lle ja `alerts/`:lle sekä CI pull requesteille** (6). Estää 1.1–1.2-tyyppisten virheiden paluun. Samalla `TEST_VERSIONS = false` ja muisti-LRU (4.3).

Kauppajulkaisua varten (ennen sitä, ei nyt kiireellisiä): `DATA_BASE` ja oma CDN, Esrin lisenssi, natiiviprojekti ja natiivit lisäosat, julkinen tietosuojaseloste, fokuksenhallinta dialogeihin ja tekstikoon skaalaus.

---

## Mitä en pystynyt arvioimaan

- **Oikea selain ja laite:** ruutuajat, GPU-kuorma, lämpeneminen, iOS:n muistiraja, WebGL-kontekstin menetyksen toistuvuus, SW:n `controllerchange`-käytös ja kosketuseleet.
- **Ruudunlukijat:** VoiceOver- ja TalkBack-käytös. Kontrastia lasipaneeleissa karttaa vasten ei mitattu.
- **Ulkoiset rajapinnat:** NOAA:n virhevastausten CORS, `ecmwf-opendata`n ajonvalinta, FMI:n todellinen NaN-alue ja DWD:n pressure-level-julkaisuviive.
- **Actions:** jumittuneen apt-askeleen loki (estetty välityspalvelimella) ja mainin haarasuojaus, joka vaikuttaa kohdan 3.1 vakavuuteen.
- **Lisenssiehdot:** Esri, YouTube, GitHub Pages, OSMF. Tarkistettu vain koodin mainintojen tasolla, ei verkosta.
- **Capacitor:** käyttäytymistä ei testattu (SW, Cache API, iframe, `target=_blank`).
- **Mallin kalibrointi:** `KP_VIS`-mallin fysikaalinen kalibrointi. Koodi käyttää dipolileveyttä, kun NOAA:n rajat on annettu korjatussa geomagneettisessa leveydessä. Ero on Suomessa arviolta muutamia kymmenyksiä asteesta.
- **Visuaalinen tarkistus:** ei kuvakaappauksia, koska tämä oli koodikatselmointi.
