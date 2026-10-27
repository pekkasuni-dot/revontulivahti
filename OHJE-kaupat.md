# Ohje: sovelluskauppaversio (Capacitor)

Päätetyt nimet ja tunnisteet (käyttäjän päätös 2026-10-27; kauppanimet kielittäin tarkennettu samana päivänä:
molemmissa kaupoissa sama nimi kieliversion mukaan, ensisijainen kieli englanti). Käytä näitä, kun
Capacitor-projekti luodaan ja kauppasivut tehdään.

| Kohta | Arvo |
|---|---|
| Suomenkielinen nimi (sovelluksen sisällä, fi) | Revontuliennuste |
| Englanninkielinen nimi (sovelluksen sisällä, muut kielet) | Aurora Weather |
| Kauppanimi, englanninkielinen kauppasivu (App Store + Google Play) | Aurora Weather by Suni |
| Kauppanimi, suomenkielinen kauppasivu (App Store + Google Play) | Aurora Weather – Suni |
| Kotivalikon lyhyt nimi | Aurora |
| Sovelluksen tunniste (iOS bundle id / Android applicationId) | `fi.suni.auroraweather` |

## Capacitor-sovellus (vaihe 1, 2026-10-27)
Mitä on tehty (haara `claude/capacitor`):
- Capacitor 8.5.3, `capacitor.config.json`: `appId` `fi.suni.auroraweather`, `appName` `Aurora`
  (kotivalikon nimi), `webDir` `www`. Natiiviprojektit `ios/` (Swift Package Manager, ei CocoaPodsia)
  ja `android/` ovat repossa.
- **Sovelluksen tiedostot ovat paketissa**, sivua ei ladata verkosta: `node scripts/build-app.mjs`
  kopioi `index.html`, `i18n.js`, `aurora-core.js`, `manifest.webmanifest`, `icons/`, `lib/` (MapLibre)
  ja `fonts/` kansioon `www/` (ei repossa), sitten `npx cap sync` vie ne sovellukseen.
  Lyhyesti: `npm run cap:sync`.
- **Data haetaan kuten nyt**, mutta julkaistulta sivulta: `<html data-data-base="https://pekkasuni-dot.github.io/revontulivahti/" data-native="1">`
  (sama `dataUrl()`-mekanismi kuin haaran esikatselussa). NOAA, OpenFreeMap, YouTube jne. suoraan kuten verkossa.
  Service workeria ei rekisteröidä sovelluksessa (`data-native`). Päivitys = uusi versio kaupasta.
- iOS: `Info.plist` `CFBundleDisplayName` = `Aurora`, sijaintiluvan teksti (`NSLocationWhenInUseUsageDescription`,
  englanniksi; suomenkielinen `InfoPlist.strings` myöhemmin), `ITSAppUsesNonExemptEncryption` = false
  (ei vientivalvontakysymystä joka lähetyksessä), iPhone vain pystyasento, iPad kaikki.
  Tilarivi vaalea (`@capacitor/status-bar`, tyyli DARK).
- Android: `strings.xml` `app_name` = `Aurora`, sijaintiluvat manifestissa, versio työnkulusta.
- Versio: `MARKETING_VERSION` / `versionName` = APP_VERSION ilman v:tä (esim. 1.265), koontinumero
  (`CURRENT_PROJECT_VERSION` / `versionCode`) = työnkulun ajonumero (kasvaa aina).
- **Omat paikat** (`rv-places`): sovelluksessa `@capacitor/preferences` (iOS UserDefaults, Android
  SharedPreferences) = sovelluksen oma tallennus, joka kuuluu laitteen iCloud-/Android-varmuuskopioon
  (`allowBackup` true). Verkkoversiossa localStorage kuten ennen. WebView'n localStorageen jääneet
  paikat siirtyvät ensimmäisellä käynnistyksellä. Testi `screenshots.mjs --states=paikat-natiivi`
  (simuloitu Capacitor) ja `paikat-toiminta` (verkko).
- Tunnistetta EI voi vaihtaa julkaisun jälkeen (uusi tunniste = uusi sovellus).

## Kuvakkeen vaihto
Kaikki kuvakkeet tehdään YHDESTÄ lähdekuvasta: **`assets/kuvake.png`, 1024 × 1024 PNG, ei
läpinäkyvyyttä** (nykyinen on väliaikainen, A-logo).
1. Korvaa `assets/kuvake.png` uudella kuvalla (sama nimi). Tärkeä sisältö keskelle: Android rajaa
   kuvakkeen ympyräksi, jonka halkaisija on n. 60-66 % kuvan leveydestä. iOS pyöristää kulmat itse.
   Älä tee kuvaan omia pyöristettyjä kulmia tai läpinäkyvää reunaa.
2. Aja `node scripts/app-icons.mjs` (skripti tarkistaa koon ja läpinäkyvyyden). Se luo:
   - iOS-kuvakkeen (`ios/App/App/Assets.xcassets/AppIcon.appiconset/`) ja käynnistyskuvan
     (kuvake pyöristetyin kulmin tummalla taustalla #0A1224),
   - Android-kuvakkeet kaikkiin kokoihin (myös adaptiivinen ja pyöreä) ja käynnistyskuvat,
   - PWA-kuvakkeet `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png`.
3. Commit (versio nousee automaattisesti, koska `icons/` muuttui) ja aja käännökset uudelleen.
- Erikseen (ei skriptin piirissä): välilehden kuvake `icons/logo.svg` ja yläreunan logo (sama piirros
  inline-SVG:nä `index.html`:ssä). Vaihda ne käsin, jos brändimerkki muuttuu.
- Claude-ympäristössä kuvan voi myös piirtää skriptillä; omalla koneella riittää kuvan korvaaminen
  ja `npm install` + `node scripts/app-icons.mjs`.

## iOS: avaimet ja TestFlight (henkilötili)
Käännös tehdään GitHubin Mac-palvelimella (`.github/workflows/ios-testflight.yml`, `macos-26`,
Xcode 26). Allekirjoitus on Xcoden automaattinen allekirjoitus App Store Connect -API-avaimella:
Apple luo jakeluvarmenteen ja profiilin itse ("cloud managed"), joten **erillistä .p12-varmennetta
tai provisiointiprofiilia ei tarvita**. Avaimia ei liitetä keskusteluun eikä repoon.

1. **Bundle ID** - https://developer.apple.com/account -> Certificates, IDs & Profiles ->
   Identifiers -> **+** -> App IDs -> App -> Description `Aurora Weather Suni` (vain kirjaimia, numeroita ja välilyöntejä: ajatusviiva "–" antaa "Invalid description"), Bundle ID **Explicit**
   `fi.suni.auroraweather`. Ei lisäominaisuuksia (Capabilities) nyt -> Register.
2. **Sovellus App Store Connectiin** - https://appstoreconnect.apple.com -> Apps -> **+** -> New App:
   iOS, ensisijainen kieli **English**, nimi **Aurora Weather by Suni** (nimen pitää olla vapaa koko
   App Storessa); suomenkielinen kieliversio (Finnish) nimellä **Aurora Weather – Suni** lisätään
   kauppasivua tehtäessä (App Information -> kielivalikko), Bundle ID `fi.suni.auroraweather`, SKU esim. `auroraweather`,
   User Access: Full Access.
3. **API-avain** - App Store Connect -> Users and Access -> **Integrations** -> App Store Connect API
   -> **Team Keys** -> (ensimmäisellä kerralla Request Access / hyväksy ehdot) -> **+** Generate API Key:
   nimi `GitHub Actions`, Access **Admin** (tarvitaan, jotta Xcode voi luoda jakeluvarmenteen).
   - Lataa **.p8-tiedosto** (vain kerran!) ja säilytä se turvassa (esim. salasanojenhallinta).
   - Kirjoita ylös **Key ID** (avaimen rivillä) ja **Issuer ID** (sivun yläosassa).
4. **Team ID** - https://developer.apple.com/account -> Membership details -> Team ID (10 merkkiä).
5. **GitHubin salaisuudet** - repo -> Settings -> Secrets and variables -> **Actions** ->
   New repository secret (yksi kerrallaan):

   | Nimi | Arvo |
   |---|---|
   | `APP_STORE_CONNECT_KEY_ID` | Key ID |
   | `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
   | `APP_STORE_CONNECT_KEY_P8` | .p8-tiedoston koko sisältö: avaa Muistiolla (Notepad), kopioi kaikki rivit `-----BEGIN PRIVATE KEY-----` ... `-----END PRIVATE KEY-----` mukaan lukien |
   | `APPLE_TEAM_ID` | Team ID |

6. **Käännös ja lähetys** - GitHub -> Actions -> **iOS-sovellus (TestFlight)** -> Run workflow
   (Branch: main, "Lähetä TestFlightiin" päällä). Kesto n. 5-10 min. Lähetys tehdään vain mainista.
7. **TestFlight, sisäinen testi** - App Store Connect -> sovellus -> **TestFlight**. Käännös näkyy
   käsittelyn jälkeen (5-30 min, sähköposti). Internal Testing -> **+** uusi ryhmä (esim. "Oma"),
   lisää itsesi (Apple ID:n sähköposti; käyttäjän pitää olla App Store Connectin käyttäjä, tilin
   haltija on). Ota "Automatic Distribution" päälle -> uudet käännökset tulevat automaattisesti.
   iPhoneen **TestFlight**-sovellus App Storesta -> kutsu sähköpostista -> asenna "Aurora".
   Sisäinen testi ei vaadi Applen tarkastusta.

Toteutus (korjattu 2026-10-27): arkisto tehdään allekirjoittamattomana ja allekirjoitus vasta
viennissä App Store -jakelulle. Arkiston automaattinen allekirjoitus yritti luoda kehitysprofiilin,
joka vaatii rekisteröidyn laitteen ("Your team has no devices"). Testattu haaralla: ARCHIVE + EXPORT SUCCEEDED.
Vianetsintä: jos arkistointi epäonnistuu viestillä "No Accounts" tai "Cloud signing permission
error", API-avaimen Access ei ole Admin. Jos "No profiles for 'fi.suni.auroraweather'", tarkista
vaihe 1. Avaimen voi perua (Revoke) ja tehdä uuden milloin tahansa; vaihda silloin salaisuudet.
Ilman salaisuuksia työnkulku tekee allekirjoittamattoman koekäännöksen (tarkistaa vain kääntymisen).

## Android: AAB (ei vielä Play Consoleen)
`.github/workflows/android-aab.yml` (Ubuntu, Java 21) tekee release-AAB:n työnkulun artefaktiksi
(Actions -> ajo -> Artifacts, säilyy 14 vrk). Play Consoleen ei lähetetä ennen kuin yritystilin
D-U-N-S-numero on saatu.
- **Latausavain (upload key)** tehdään kerran omalla koneella (Windows; `keytool` tulee Javan mukana,
  esim. Android Studio tai Eclipse Temurin 21). Komentokehotteessa:
  `keytool -genkeypair -v -keystore aurora-upload.jks -alias aurora -keyalg RSA -keysize 4096 -validity 10000`
  (kysyy salasanan ja nimitiedot). Säilytä `aurora-upload.jks` ja salasana turvassa (varmuuskopio!).
- Tiedosto base64-muotoon PowerShellissä:
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("aurora-upload.jks")) | Set-Clipboard`
- GitHubin salaisuudet: `ANDROID_UPLOAD_KEYSTORE_BASE64` (leikepöydän sisältö),
  `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS` (`aurora`), `ANDROID_UPLOAD_KEY_PASSWORD`
  (sama kuin keystoren salasana, jos keytool ei kysynyt erikseen).
- Play App Signing: Google allekirjoittaa julkaistavan sovelluksen omalla avaimellaan; latausavaimen
  voi katoamisen jälkeen vaihtaa Play Consolen kautta.
- Ilman salaisuuksia työnkulku tekee allekirjoittamattoman AAB:n (koekäännös).
- Avoinna: tabletin vaaka-asento (nyt sallittu kaikilla Android-laitteilla, myös puhelimilla).

## Koekäännös haaralta
`.github/sovellus-koe.env`:n muutos `claude/**`-haaralla käynnistää molemmat käännökset ilman
lähetystä (iOS allekirjoittamatta). Testattu 2026-10-27: iOS (Xcode 26.6, iOS 26.5 SDK) BUILD SUCCEEDED.

## Natiiviominaisuudet ja Applen ohje 4.2 (Minimum Functionality)
Apple hylkää sovelluksen, joka on "verkkosivu kääreessä" (4.2, myös 4.2.2). Arvio, ei toteutusta vielä:

| Ominaisuus | Tila | Huom |
|---|---|---|
| Tiedostot paketissa, toimii ilman sivuston latausta | ✅ tehty | Ei kauko-URL:ia (`server.url`) |
| Interaktiivinen WebGL-kartta, aikajana, kaaviot, kamerat | ✅ olemassa | Oma toiminnallisuus, ei sivuston kopio |
| Omat paikat laitteen omassa tallennuksessa | ✅ tehty | Preferences + varmuuskopio |
| Oma sijainti | ✅ olemassa (WebView) | Natiivi `@capacitor/geolocation` parempi luvan ja tarkkuuden takia |
| Ei yhteyttä -tila (selkeä ilmoitus, ei tyhjää sivua) | ✅ olemassa | Tarkistettava sovelluksessa |
| **Revontulihälytykset push-ilmoituksina** | ❌ puuttuu | Tärkein: aito natiivi hyöty. APNs/FCM + oma palvelin (Cloudflare Worker), korvaa ntfy:n |
| Haptinen palaute (kaaviot, aikajana, pitkä painallus) | ✅ tehty 2026-10-27 | `@capacitor/haptics`, vain sovelluksessa |
| Kotinäytön widget (näkyvyys / Kp nyt) | ❌ puuttuu | Vahva 4.2-peruste, vaatii Swift-koodia (WidgetKit) |
| Jakaminen (paikka, yön ennuste) | ❌ puuttuu | `@capacitor/share` |
| Kielen ja sijaintiluvan tekstit suomeksi (InfoPlist.strings) | ❌ puuttuu | Pieni |
| Tietosuojaseloste-URL, tietosuojatiedot (App Privacy) | ❌ puuttuu | Pakollinen kauppaan, ei TestFlightin sisäiseen testiin |
| Ulkoiset linkit (OSM, kamerat) | ✅ | Avautuvat selaimeen; ei maksulinkkejä |

Suositus ennen App Store -tarkastusta: push-hälytykset + haptiikka + natiivi sijainti; widget
myöhemmin. Sisäinen TestFlight-testi ei käy Applen tarkastuksessa, joten 4.2 koskee vasta
ulkoista testiä (TestFlight External) ja julkaisua.

## Verkkoversio (PWA, 2026-10-27)
- `manifest.webmanifest`: `name` "Aurora Weather by Suni", `short_name` "Aurora".
- Sivun otsikko ja yläreuna i18n.js `app.name`: fi "Revontuliennuste", muut "Aurora Weather".
- iPhonen kotivalikko: `<meta name="apple-mobile-web-app-title" content="Aurora">`.

## Ennallaan tarkoituksella
- Repon nimi `revontulivahti`, osoite, sw.js:n välimuistinimi ja localStorage-avaimet `rv-*`.
- Cloudflare Worker `auroraawesome-ajastin` (osoite on palaute-URL:ssa ja salaisuuksissa; nimen
  vaihto = uusi Worker + uudet salaisuudet). Vaihdetaan tarvittaessa kenttätestin jälkeen.
- Kenttätestin ntfy-ilmoitusten otsikko "AuroraAwesome · kenttätesti" 6.11.2026 asti
  (`alerts/notify.js`, `scripts/ntfy-test.mjs`); vaihto "Aurora Weather" 7.11. alkaen.

## Muut kauppajulkaisun tarkistukset
Ks. CLAUDE.md "Kauppajulkaisun tarkistuslista".

## Havainnot puhelimella (TestFlight 1.266 (5), 2026-10-27)
- Sovellus käynnistyy, kartta, revontulikenttä ja Kp/Bz latautuvat paketoidusta sovelluksesta.
- Korjattu (1.267): pikapalkin ensimmäinen nappi (revontulet) jäi ☰-napin alle. Syy: napit asemoitiin
  pikseleinä käynnistyksessä, ja iOS asettaa loven turva-alueen (`env(safe-area-inset-top)`) vasta sen jälkeen
  ilman resize-tapahtumaa. Nyt paikka on CSS-lauseke samasta `--btn-top`-muuttujasta kuin ☰ (`placeLocate`).

## YouTube-videot sovelluksessa (2026-10-27)
- Ongelma: iOS-sovelluksessa YouTube-soitin näytti virheen 153 (puuttuva/hylätty viittaustieto), koska
  sovellus toimii osoitteessa `capacitor://localhost`.
- Ratkaisu: oma upotussivu `embed/youtube.html?id=<tunnus>` GitHub Pagesissa. Se hyväksyy vain 11 merkin
  YouTube-tunnuksen (A-Z a-z 0-9 _ -), upottaa `youtube-nocookie.com`-soittimen ja lähettää viittauksena
  Pagesin alkuperän (`referrerpolicy` strict-origin-when-cross-origin). Sovellus ja verkkoversio käyttävät
  samaa sivua. "Katso YouTubessa" -linkki ennallaan (avaa YouTube-sovelluksen tai selaimen).
- Testit: `screenshots.mjs --states=kamera-upotus` (iframe -> upotussivu -> nocookie-soitin; väärä tunnus
  hylätään). Toisto itse testattava puhelimella: TestFlight (iOS) ja Android-debug-APK
  (`android-aab.yml`:n artefakti `aurora-android-apk-debug-N`).
- Android: Capacitorin WebView voi avata alikehyksen navigoinnin ulkoisessa sovelluksessa; tarkista,
  että video soi kortissa eikä avaudu YouTube-sovellukseen.
