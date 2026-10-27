# Ohje: sovelluskauppaversio (Capacitor)

Päätetyt nimet ja tunnisteet (käyttäjän päätös 2026-10-27). Käytä näitä, kun
Capacitor-projekti luodaan ja kauppasivut tehdään.

| Kohta | Arvo |
|---|---|
| Suomenkielinen nimi (sovelluksen sisällä, fi) | Revontuliennuste |
| Englanninkielinen nimi (sovelluksen sisällä, muut kielet) | Aurora Weather |
| App Store -nimi | Aurora Weather – Suni |
| Google Play -nimi | Aurora Weather by Suni |
| Kotivalikon lyhyt nimi | Aurora |
| Sovelluksen tunniste (iOS bundle id / Android applicationId) | `fi.suni.auroraweather` |

## Capacitor-vaihe
- `capacitor.config.*`: `appId: 'fi.suni.auroraweather'`, `appName: 'Aurora'`
  (appName = kotivalikon nimi alkuasennuksessa).
- iOS: `Info.plist` `CFBundleDisplayName` = `Aurora`; App Store Connectissa nimi
  "Aurora Weather – Suni". Lokalisoitu kotivalikon nimi tarvittaessa `InfoPlist.strings`.
- Android: `strings.xml` `app_name` = `Aurora`; Google Play Consolessa nimi
  "Aurora Weather by Suni".
- Tunnistetta EI voi vaihtaa julkaisun jälkeen (uusi tunniste = uusi sovellus).

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
