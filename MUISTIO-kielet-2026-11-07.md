# Kielitilanne hälytyksiä varten – selvitys (7.11.2026)

Vain luku: koodia, tekstejä, konfiguraatiota, ajastimia, salaisuuksia tai haaroja ei muutettu. Lähde: main 6a14abd (rivinumerot siitä). Tekstien leveys on arvioitu laskemalla (CJK-merkki ≈ 1 em, latinalainen ≈ 0,55 em), ei mitattu laitteella.

## Yhteenveto (10 riviä)

1. Sovelluksessa on 5 kieltä: fi, en, zh-Hans (yksinkertaistettu kiina), es, fr. Kaikilla on kaikki 442 avainta (puuttuvia 0; `check-i18n` OK).
2. Kiina on mukana: kirjoitusasu yksinkertaistettu, sovelluksen kielikoodi `zh-Hans` (locale `zh-CN`). Perinteinen kiina (zh-Hant/TW/HK/MO) ei ole tuettu, vaan se ohjautuu englantiin.
3. Kiinan käännös on lähes kokonaan tarkistamaton: 368/442 riviä on merkitty `// TARKISTAMATON`, ja 60 riviä on yhä englanniksi (`KÄÄNTÄMÄTTÄ`).
4. Kielen valinta: tallennettu asetus (`rv-lang`) → laitteen kieli (`navigator.languages`, ensimmäinen tuettu) → englanti. Puuttuva avain näkyy järjestyksessä en → fi → avain.
5. ntfy-kenttätestin ilmoitukset ovat vain suomeksi (`alerts/notify.js`). FCM-vaiheen 1 testiteksti on viidellä kielellä (`alerts/fcm.js`). Varsinaisia hälytysmallipohjia ei ole.
6. Aihe on jo kielistetty: `al1_<kieli>_<i>_<j>`, kieliarvot `fi`, `en`, `zh`, `es`, `fr` (sovelluksen `zh-Hans` → `zh`, tuntematon → `en`).
7. **Ongelma:** koodi tilaa myös `es`- ja `fr`-aiheet. Jos hälytykset lähetetään vain fi/en/zh-aiheisiin, espanjan- ja ranskankieliset käyttäjät eivät saa mitään. Korjaus: `ALERT_CELL.langs` = fi, en, zh, jolloin es/fr ohjautuvat englantiin.
8. Kielen vaihto päivittää tilaukset (vanha kieli pois, uusi päälle), tarkistettu koodista ja simuloidusta testistä. Androidin ilmoituskanavan nimi asetetaan vain käynnistyksessä.
9. Kiinan fontti: Sora ei sisällä kiinaa (unicode-range vain latinalainen). Kiina tulee järjestelmän fontista (`system-ui`/`-apple-system`): iOS:llä todennäköisesti PingFang SC, Androidilla Noto Sans CJK. Laitteella ei ole todennettu. Kiina on keskimäärin noin 40 % kapeampi kuin suomi.
10. Prosentti on kovakoodattu muotoon "62 %" (välilyönti) kaikilla kielillä; kiinan tekstit ovat sekaisin ("{min}%" ja "40 %"). Manner-Kiinan Android-toimitusta (ei Google Play -palveluja → ei FCM:ää) ei ole huomioitu koodissa.

## 1. Kielet `i18n.js`:ssä

Kielet määritellään `LANG_META`-oliossa (`i18n.js` rivit 18–24), varakieli `LANG_FALLBACK = 'en'` (rivi 25).

| Kielikoodi | Nimi | Locale (Intl) | Avaimia | Puuttuu suhteessa fi:hen | Merkitty tarkistamattomaksi | Teksti sama kuin englanniksi |
|---|---|---|--:|--:|--:|--:|
| `fi` | Suomi | fi-FI | 442 | 0 | – | – |
| `en` | English | en-GB | 442 | 0 | – | – |
| `zh-Hans` | 简体中文 | zh-CN | 442 | 0 | 368 `TARKISTAMATON` (lähes kaikki) | 74, joista 60 merkitty `KÄÄNTÄMÄTTÄ` |
| `es` | Español | es-ES | 442 | 0 | `TARKISTA`-merkintöjä (epävarmat) | 85 |
| `fr` | Français | fr-FR | 442 | 0 | `TARKISTA`-merkintöjä | 88 |

"Sama kuin englanniksi" sisältää myös luonnostaan samoja (mallien nimet, yksiköt), mutta `KÄÄNTÄMÄTTÄ`-rivit (esim. Omat paikat -osio) ovat oikeasti kääntämättä.

**Kiina:**
- Kirjoitusasu: yksinkertaistettu.
- Kielikoodi `zh-Hans`, `htmlLang` `zh-Hans`, locale `zh-CN`. Karttanimet: `name:zh-Hans` → `name:zh` → `name:en` → paikallinen (`index.html` `labelTextField`).
- Täydellisyys: avaimet ovat täydet, mutta sisältöä ei ole tarkistettu ihmisen toimesta (368 riviä tarkistamatta), ja 60 riviä on englanniksi.

**Kielen valinta** (`detectLang`, `i18n.js` rivit 2330–2346):
1. Tallennettu valinta `localStorage` `rv-lang` (asetuksista).
2. Muuten `navigator.languages` järjestyksessä, ensimmäinen tuettu. fi-*, en-*, es-*, fr-*; kiina vain `zh`, `zh-Hans*`, `zh-CN`, `zh-SG`. `zh-Hant`, `zh-TW`, `zh-HK` ja `zh-MO` ohitetaan.
3. Muuten englanti.

Ei tuettu kieli (esim. ruotsi tai perinteinen kiina) → englanti. Yksittäinen puuttuva avain → en → fi → avaimen nimi (`t()`, rivi 2352). Sovelluksessa kieli tallentuu WebView'n localStorageen, ei Capacitor Preferencesiin.

## 2. Hälytysten nykyiset tekstit

| Kanava | Tiedosto ja rivit | Kielet nyt | Sisältö |
|---|---|---|---|
| ntfy-kenttätesti, otsikko | `alerts/notify.js:98` | vain suomi | `'AuroraAwesome · kenttätesti'` |
| ntfy, viestirunko | `alerts/notify.js:22` (`TYPE_TITLES`), `:44–58` (`messageText`) | vain suomi | "Paikka: Revontulia nyt · näkyvyys 38 % · HARMONIE · klo 20.35" ym. |
| ntfy, palautenapit | `alerts/notify.js:20` (`ANSWERS`) | vain suomi | Näkyi / Ei näkynyt / Pilvessä |
| ntfy, luku- ja aikamuoto | `alerts/notify.js:24–25` | kiinteä `fi-FI` | |
| ntfy-testi | `scripts/ntfy-test.mjs:24` | vain suomi | |
| FCM vaihe 1, testiteksti | `alerts/fcm.js:18–23` (`TEST_TEXT`) | fi, en, zh, es, fr | otsikko + runko; ei lukuja |
| FCM, Android-kanavan nimi | `index.html:8159–8160` → `i18n.js` `alerts.title` (fi 154, en 613, zh 1075, es 1535, fr 1995) | 5 kieltä | sovelluksen kielellä luontihetkellä |
| Sovelluksen hälytysosio | `i18n.js` `alerts.*`, `pro.f.alerts.*` | 5 kieltä | (zh `TARKISTAMATON`, es/fr `TARKISTA`) |
| Varsinaiset FCM-hälytysmallipohjat (Nyt / Tulossa / Tänä yönä) | – | **ei olemassa** | vaihe 2 |

**Aihe** (`aurora-core.js`):
- `ALERT_CELL` rivi 857: `langs: ['fi','en','zh','es','fr']`, `defLang: 'en'`.
- `alertLang` (rivi 867): ottaa koodin alkuosan ennen viivaa pienaakkosina: `zh-Hans` → `zh`, `fi-FI` → `fi`, ei listassa → `en`.
- `alertTopic` (rivi 872) → `al1_<fi|en|zh|es|fr>_<i>_<j>`.
- Sovellus kutsuu `alertTopicsFor(alertPoints(), LANG)` (`index.html:8039`), joten aiheen kieli = sovelluksen kieli.
- **Huomio:** koodi tuottaa myös `es`- ja `fr`-aiheet. Jos palvelin lähettää vain fi/en/zh, es/fr-käyttäjät jäävät ilman ilmoituksia. Pienin korjaus: poista `es` ja `fr` `ALERT_CELL.langs`-listasta, jolloin ne ohjautuvat `en`-aiheeseen. Versiota (`ver`) ei tarvitse nostaa, koska tilausten synkronointi vaihtaa aiheen itse.

**Kielen vaihto** (tarkistettu koodista):
- `setLanguage` (`index.html:7508`) kutsuu rivillä 7524 `renderAlerts(); alertsSync()`.
- `alertsSync` (rivi 8042) laskee halutut aiheet uudella `LANG`-arvolla ja kutsuu `AuroraCore.alertTopicDiff(alerts.topics, haluttu)`. **Vanhat aiheet perutaan** (`unsubscribeFromTopic`) ja **uudet tilataan** (`subscribeToTopic`). Tilatut aiheet tallennetaan avaimeen `rv-alert-topics`.
- Epäonnistunut peruminen jää listaan ja yritetään uudelleen seuraavassa synkronoinnissa (sovellus näkyviin, paikka- tai Pro-muutos).
- Simuloitu testi `screenshots.mjs --states=halytykset` todentaa vaihdon `al1_fi_310_205` → `al1_en_310_205` (2.11.).
- Laitteen kielen muutos ilman tallennettua valintaa näkyy vasta, kun sovellus käynnistetään uudelleen; silloin synkronointi tehdään käynnistyksessä.
- Androidin kanava `aurora` luodaan vain käynnistyksessä nykyisellä kielellä (`alertsInitNative`). Kielen vaihto ei nimeä kanavaa uudelleen ennen seuraavaa käynnistystä.

## 3. Kiinan tuki käyttöliittymässä ja ilmoituksissa

**Fontti:**
- `--font-sans: 'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif` (`vendor/suni-ui/suni-ui.css:31`).
- Soran `@font-face`-määrittelyissä on `unicode-range` vain latinalaiselle ja latin-ext-alueelle (rivit 6–9), joten kiinan merkit haetaan merkki kerrallaan seuraavasta fontista.
- **iOS** (WKWebView): `system-ui`/`-apple-system` → todennäköisesti PingFang SC, kun `<html lang="zh-Hans">` (asetetaan `applyI18n`issa). **Android** (WebView): järjestelmän sans-serif → Noto Sans CJK (SC, kun kieli on zh-Hans). **Ei todennettu laitteilla.**
- Kartta: MapLibren `localIdeographFontFamily`-asetusta ei ole asetettu erikseen (vain kommentti `index.html:2467`). MapLibre 3.x piirtää kiinan oletuksena laitteen `sans-serif`-fontilla, koska OpenFreeMapin Noto Sans ei sisällä kiinaa.
- Kuvakkeiden kirjaimet (L/M/H) käyttävät `system-ui` (rivi 5016); kiina ei koske niitä.

**Tekstin pituus** (arvio, 442 avainta):
- Kiina on mediaanina 0,61 × suomen leveys (90. persentiili 1,00). Leveämpi kuin suomi 39 avaimessa, lyhyistä (≤ 20 merkkiä) 32:ssa. Suurin osa niistä on englanniksi jääneitä (esim. "Restore purchases", "Development build") tai lisättyjä yksiköitä ("850 百帕（约 {h}）").
- Hälytysosion esimerkit (em): Revontulihälytykset 10,5 → 极光提醒 4,0; Ilmoita revontulista 11,0 → 极光出现时通知我 8,0; Salli ilmoitukset 9,3 → 允许通知 4,0; Jatka 2,8 → 继续 2,0. Välilehdet: Tänä yönä 4,9 → 今晚 2,0; 7 vrk 2,8 → 7 天 2,1.
- 44 px napautusalueet ja ikkunat: kiina mahtuu, koska suomi on mitoituksen pahin tapaus. Kiinan merkit tarvitsevat kuitenkin suuremman rivikorkeuden; pienet koot (10,5–12 px) ovat lukukelpoisuuden raja. Laitteella ei ole tarkistettu.
- Push-ilmoituksen ensimmäinen rivi (otsikko) on noin 30–35 latinalaista tai noin 15–18 kiinan merkkiä. Arvio, ei mitattu. Kenttätestin suomenkielinen rivi ("Utsjoki: Revontulia nyt · näkyvyys 38 % · HARMONIE · klo 20.35", ~65 merkkiä) ei mahdu yhdelle riville millään kielellä. Suositus: otsikko "Paikka: tyyppi", luvut runkoon. FCM-testiotsikko 极光提醒（测试）on 8 merkkiä ja mahtuu.

**Numerot ja ajat:**
- Prosentti: kovakoodattu `' %'` (välilyönti) `index.html`:ssä 14 kohdassa (esim. rivit 8643, 8651, 8655, 8927) ja `alerts/notify.js:46–53`, kaikilla kielillä. Suomi "62 %" on oikein; englanti ja kiina kirjoittavat yleensä "62%". `i18n.js`:n kiinassa molempia ("低于 {min}% …" rivi 1174 vs. "超过 40 % …" rivi 1321). Prosentille ei ole `Intl.NumberFormat`-funktiota.
- Desimaalit (Kp, Bz): `fmtNum` Intl `langLocale()`:lla (fi "2,3", zh/en "2.3").
- Kellonajat ja päivät: `timeOpts`/`fmtDate` Intl-locale + asetus 24 h / 12 h (`UNITS.clock`, oletus laitteen mukaan). zh-CN: "20:00". ntfy-teksti on kiinteästi `fi-FI` "klo 20.35".

## 4. Jaettu tekstitiedosto

**Nykytila:**
- `i18n.js` on selainskripti: globaalit `const`-muuttujat, ei `module.exports`. `detectLang` ajetaan latautuessa (lukee `localStorage`- ja `navigator`-olioita).
- Node voi lukea sen vain kiertotiellä (selvityksessä luettu lisäämällä vientirivi lennossa). Python ei voi.
- Hälytysajo on Node (`scripts/alert-dryrun.mjs`, `alerts/*.js`) ja tuotannossa Cloudflare Worker; Pythonia ei tarvita.

**Pienin muutos (ehdotus, ei toteutettu):**
1. Uusi juuritason UMD-tiedosto `alert-texts.js` samaan tapaan kuin `aurora-core.js` ja `features.js` (`root.AlertTexts` + `module.exports`). Sisältö:
   - kielilista `LANGS = ['fi','en','zh']`, varakieli `en`, kartoitus sovelluskoodista aiheen koodiin (`zh-Hans` → `zh`)
   - mallipohjat kielittäin (Nyt / Tulossa / Tänä yönä: otsikko + runko, paikkamerkit `{place}`, `{pct}`, `{time}`)
   - muotoilijat: prosentti kielen mukaan ("62 %" fi, "62%" en/zh), kellonaika `Intl`illä.
2. `aurora-core.js` `ALERT_CELL.langs` luetaan tästä (tai siirretään tänne), jolloin sovellus ja palvelin käyttävät samaa listaa.
3. `alerts/fcm.js` ja Worker `require`/`import`. Sovellus lataa sen `<script>`-tagilla. Lisäys `build-app.mjs`:n `FILES`-listaan, SW SHELLiin, `publish-pages`-, `sync-pages`- ja esikatselulistoihin sekä versiohookiin (CLAUDE.md:n juuritason tiedostosääntö).
4. Sovelluksen omat käyttöliittymätekstit (`alerts.*`) jäävät `i18n.js`:ään. Uuteen tiedostoon tulevat vain palvelimen lähettämät tekstit.
5. Testi: `tests/` tarkistaa, että jokaisella kielellä on jokainen mallipohja ja samat paikkamerkit, kuten `check-i18n`.

Vaihtoehto: JSON-tiedosto. Selain joutuisi hakemaan sen erikseen, ja sovelluksessa se pitäisi paketoida. UMD-JS on pienempi muutos.

## 5. Toimituskerros

- **Ilmoituksen kieli = aiheen kieli, ei laitteen kieli.** `alerts/fcm.js` `buildMessage` (rivit 60–71) lähettää valmiin `notification.title`/`body`-tekstin aiheeseen. Laitteen kielellä ei ole vaikutusta. Sovelluksen kieliasetus vaikuttaa vain siihen, mikä aihe tilataan.
- Lokalisointiavaimia (APNs `title-loc-key`/`loc-key`, Android `title_loc_key`/`body_loc_key`) ei käytetä. Natiiviprojekteissa ei ole lokalisaatioita: iOS:ssä vain `Base.lproj`, `CFBundleDevelopmentRegion` = `en`, ei `*.strings`-tiedostoja; Androidissa vain `values/` (ei `values-zh` tms.). Jos laitteen kieli halutaan käyttöön, tarvitaan nämä tiedostot ja uusi natiivikäännös.
- iOS:n sijaintiluvan selite `NSLocationWhenInUseUsageDescription` on vain englanniksi (`Info.plist`). Ilmoitusluvalle iOS ei vaadi omaa selitettä, ja järjestelmän kysely on laitteen kielellä. Sovelluksen oma selitys (`alerts.permText`) on 5 kielellä.
- Android: `channel_id` `aurora` (`alerts/fcm.js:68`); kanavan nimi sovelluksen kielellä luontihetkellä (osio 2).
- APNs: `apns-priority` 10, `sound: default`, `thread-id` ruudun mukaan; ei kieleen liittyviä asetuksia.
- **Manner-Kiinan Android-toimitus: ei.** Koodissa ei ole Huawei Push Kitiä (HMS), JPushia, Getuita tai muuta vaihtoehtoista kanavaa, eikä FCM:n puuttumisen tunnistusta. Manner-Kiinassa myytävissä Android-laitteissa ei yleensä ole Google Play -palveluja, joten FCM-ilmoitukset eivät tule perille. Sovellus näyttäisi silloin todennäköisesti tekstin "Hälytysten tilaus epäonnistui", koska `getToken` epäonnistuu. iOS:n APNs toimii myös Kiinassa.

## Mitä ei voitu todentaa

| Asia | Syy |
|---|---|
| Kiinan fontti, rivikorkeus ja leveydet oikeassa iPhonessa ja Androidissa | Ei laitetta; leveydet laskettu arviona (CJK 1 em, latina 0,55 em) |
| Push-ilmoituksen rivin todellinen pituus iOS:n ja Androidin lukitusnäytöllä | Riippuu laitteesta ja fonttikoosta; FCM-puhelintestiä ei ole tehty (salaisuudet puuttuvat) |
| Kiinan käännösten laatu | 368 riviä merkitty tarkistamattomiksi; ei äidinkielistä tarkistusta |
| `es`/`fr`-aiheiden käyttäjämäärät | Ei käyttäjiä; FCM ei käytössä |
| Kielen vaihdon tilausmuutos oikealla FCM:llä | Todennettu vain koodista ja simuloidusta testistä |
| Manner-Kiinan laitteiden käyttäytyminen | Ei testilaitetta |

Huomio dokumentaatiosta: mainin ARCHITECTURE.md:ssä päätökset päättyvät numeroon 33. Päätöksiä 34–38 ei ole (tarkistettu 6a14abd).
