# MUISTIO: kielet ja käännökset

## Kiinankieliset puutteet - selvitys (2026-10, ennen korjausta)

**Menetelmä.** a) `node scripts/check-i18n.mjs` (avainvertailu) + ajonaikainen
skannaus headless-Chromiumissa: kieli zh-Hans, kaikki ikkunat, asetusrivit,
mallilista, kamerakortti ja -ruudukko, alapaneeli laajennettuna, piste
mallin alueen sisällä ja ulkopuolella, aikajana siirrettynä. Kerättiin
kaikki näkyvät tekstit sekä aria-label/title-arvot ja listattiin ne, joissa
on latinalaisia kirjaimia.

**a) Käyttöliittymä - löydökset.**
- Avaimia ei puuttunut (112 avainta, kaikki kolmella kielellä).
- Kovakoodattu: kameroiden nimissä maa suomeksi (`data/cameras.json`:
  "Levi, Suomi", "Kilpisjärvi, Suomi", "Posio, Suomi", "Sodankylä, Suomi",
  "Lyngen North, Norja", "Aurora Reykjavík, Islanti") - näkyi suomeksi
  kaikilla kielillä kamerakortissa ja Kaikki kamerat -ruudukossa.
- Tarkoituksella kääntämättä (ei virhe): AuroraAwesome, mallien nimet
  (ECMWF, ICON-EU, HARMONIE, DWD, FMI), NOAA OVATION / SWPC, Kp, YouTube,
  yksiköt (km/mi/ft), kielivalitsimen kielten omat nimet (Suomi, English),
  kameroiden paikkojen ja ylläpitäjien nimet (data), `?debug`/`?paletti`.

**b) Kartan paikannimet - löydös.** Kiinalla nimet haettiin
`name:zh-Hans -> name:zh -> name`: jos kohteella ei ole kiinankielistä
nimeä OSM:ssä, näkyi paikallinen nimi (esim. Raahe, Svolvær), ei
englanninkielistä.

## Korjaus (2026-10)
- a) `data/cameras.json`: nimi ilman maata + `country` (ISO 3166 -koodi:
  FI/NO/IS). Maan nimi käännetään selaimen omalla
  `Intl.DisplayNames(locale, {type:'region'})`:llä (`camName()`), joten se ei
  tarvitse käännösavaimia ja toimii kaikilla kielillä. Ilman Intl-tukea
  näytetään pelkkä paikan nimi.
- b) Kiinalla `name:zh-Hans -> name:zh -> name:en -> name`. name:zh-Hans
  pidetään ensimmäisenä (OpenMapTiles-skeeman kielilistassa, ks.
  MUISTIO-kartta.md), koska pelkkä name:zh voi olla perinteisin merkein.
  Kohteita, joilla ei ole kiinankielistä nimeä OSM:ssä, EI korjata
  (ei omia käännöksiä) - niille näytetään varanimi (englanti, sitten
  paikallinen). Kattavuutta ei voitu mitata oikeilla OpenFreeMap-tiilillä
  (ei verkkoa testiympäristöstä).
- Avainvertailu: `node scripts/check-i18n.mjs` listaa kielittäin puuttuvat
  avaimet ja index.html:n määrittelemättömät avaimet (virhekoodi 1 jos
  jotain puuttuu).
