# Revontulihälytykset: käyttöönotto (FCM / APNs)

Hälytysten vaihe 1 (2026-11-02, päätökset 29 ja 30). Tässä ohjeessa on kaikki, mitä Pekan pitää tehdä
käsin, jotta ilmoitukset kulkevat puhelimeen. Koodi on valmiina haarassa `claude/halytykset-fcm`.
Ilman alla olevia salaisuuksia sovellus kääntyy ja toimii normaalisti, mutta hälytyksiä ei voi ottaa
käyttöön (asetuksissa lukee "Ilmoituspalvelu ei ole käytössä tässä versiossa").

**Avaimet ja asetustiedostot vain GitHubin salaisuuksiin. Ei repoon eikä keskusteluun.**

## Miten se toimii

- Puhelin laskee hälytyspaikoilleen (oma sijainti + Omat paikat -kytkimet) sijaintiruudun ja tilaa
  Firebasen **aiheen** (topic), esim. `al1_fi_310_205` = versio 1, kieli fi, ruutu 310_205 (Oulu).
- Palvelin lähettää ilmoituksen aiheeseen. Se ei tiedä laitteita, paikkoja eikä koordinaatteja.
- Ruutu on toistaiseksi 0,5° × 1° (noin 55 × 45 km Lapissa). **Alustava**, lopullinen koko vaiheessa 2.
- Ilmoituksen napautus avaa sovelluksessa paikan ja välilehden (`data.view`: night / now / week).

## 1. Firebase-projekti (kerran)

1. https://console.firebase.google.com -> Add project, nimi esim. `aurora-weather`. Google Analytics: **pois**.
2. Lisää sovellukset (Project settings -> General -> Your apps):
   - **iOS** `fi.suni.auroraweather` -> lataa `GoogleService-Info.plist`.
   - **iOS** `fi.suni.auroraweather.dev` (Aurora Dev) -> lataa sen oma `GoogleService-Info.plist`.
   - **Android** `fi.suni.auroraweather` ja **Android** `fi.suni.auroraweather.dev` -> lataa
     `google-services.json` **viimeisen lisäyksen jälkeen** (sama tiedosto sisältää molemmat paketit).
     Android toimii testikäännöksissä ilman Play-yritystiliä.

## 2. APNs-avain Applelta (kerran, Pekan Apple-tili)

1. https://developer.apple.com/account/resources/authkeys/list -> **+** -> nimi `Aurora APNs`,
   valitse **Apple Push Notifications service (APNs)** -> Continue -> Register -> lataa `AuthKey_XXXX.p8`
   (ladattavissa vain kerran). Kirjaa Key ID ja Team ID.
2. Firebase -> Project settings -> **Cloud Messaging** -> Apple app configuration -> molemmille
   iOS-sovelluksille **APNs Authentication Key**: lataa `.p8`, Key ID, Team ID.
3. Sovellustunnisteen Push Notifications -ominaisuus: käännös lisää sen automaattisesti
   (`-allowProvisioningUpdates`). Jos käännöksen loki varoittaa "puuttuu aps-environment", ota
   Push Notifications päälle käsin: Certificates, Identifiers & Profiles -> Identifiers ->
   `fi.suni.auroraweather` (ja `.dev`) -> Push Notifications.

## 3. Palvelutili lähetystä varten

Firebase -> Project settings -> **Service accounts** -> Generate new private key -> JSON-tiedosto.

## 4. GitHubin salaisuudet

Repo -> Settings -> Secrets and variables -> Actions -> New repository secret:

| Salaisuus | Sisältö |
|---|---|
| `FCM_SERVICE_ACCOUNT` | palvelutilin JSON sellaisenaan |
| `FIREBASE_IOS_PLIST_B64` | tuotannon `GoogleService-Info.plist` base64:nä |
| `FIREBASE_IOS_DEV_PLIST_B64` | Aurora Devin `GoogleService-Info.plist` base64:nä |
| `FIREBASE_ANDROID_JSON_B64` | `google-services.json` base64:nä |

Base64 Macilla: `base64 -i GoogleService-Info.plist | pbcopy` (liitä kenttään).

## 4b. Palaute (päätös 36, vaihe 3)

- Vastaanotto-Worker `workers/palaute` (ks. sen README): KV-nimiavaruus ja salaisuus `PALAUTE_AVAIN_FCM` Cloudflareen.
- Sama `PALAUTE_AVAIN_FCM` GitHubin salaisuudeksi (hälytysajo allekirjoittaa hälytystunnisteen).
- Workerin osoite (`…/v1/palaute`, ei salaisuus) `index.html`:n `ALERT_FB.url`-arvoksi.

## 5. Testaus

1. Uusi TestFlight- tai Dev-käännös (salaisuudet mukana). Lokissa: "Firebase: BUNDLE_ID …" ja
   "Ilmoitusoikeus (aps-environment): production".
2. Puhelimessa Asetukset -> Revontulihälytykset -> Ilmoita revontulista -> Jatka -> Salli.
   Testikäännöksessä rivillä "Tilattuja alueita 1 · al1_fi_…".
3. Actions -> **Hälytysten testi-ilmoitus (FCM)** -> Run workflow, oma lat/lon (tai Omat paikat -paikan).
4. Ilmoitus tulee muutamassa sekunnissa. Napautus avaa Tänä yönä -välilehden oikeaan paikkaan.

## Ei vielä (vaihe 2, 7.11. jälkeen)

Hälytyslogiikka (kynnykset, pilvisyyslähde, mallien yksimielisyys, 2/3-sääntö, ajastus, tiheysraja
per ruutu per ilta, lopullinen ruudun koko) ja automaattinen lähetys. Paikkojen nimet ilmoituksessa
(päätös 30) vaativat laitteessa muokattavan ilmoituksen (iOS Notification Service Extension, Android
oma käsittelijä), koska palvelin ei tiedä nimiä. Tietosuojaselosteeseen: Firebase Cloud Messaging
(Google) käsittelee laitteen ilmoitustunnuksen ja tilatut aiheet.
