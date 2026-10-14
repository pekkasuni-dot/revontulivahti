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

## Espanja ja ranska (2026-10)
- `LANG_META`: es (`es-ES`, name:es), fr (`fr-FR`, name:fr); tunnistus
  `navigator.languages`: es-* -> es, fr-* -> fr. Päivämäärät ja kellonajat
  Intl:llä kuten muillakin kielillä.
- Kaikki 119 avainta molemmilla; `node scripts/check-i18n.mjs` -> OK kaikilla
  viidellä kielellä (skripti tarkistaa nyt myös, että paikkamerkit {h},
  {model} ym. ovat samat kuin englanniksi).
- Kielivalinta asetuksissa pudotusvalikkona (käyttäjän pyyntö 2026-10, sama
  ilme kuin säämallin valitsimessa); ensin kokeiltu rivittyvä segmenttivalitsin.
- Ajonaikainen skannaus (es, fr): ei suomen- tai englanninkielisiä tekstejä
  (paitsi tarkoituksella kääntämättömät nimet, ks. yllä).

**Kartan paikannimet - avoin kysymys.** Toteutettu samalla säännöllä kuin
suomi/englanti: maat ja meret `name:es`/`name:fr` -> `name:en` -> `name`,
kaupungit ja muut paikallisella nimellä (`labelTextField`). Tehtävässä
sanottiin "paikannimet vastaavalla varajärjestyksellä" - jos myös
kaupunkien pitää näkyä espanjaksi/ranskaksi (kuten kiinassa kaikki), se on
yhden rivin muutos `labelTextField()`:iin. En laajentanut ilman vahvistusta.

**Epävarmat käännökset (merkitty i18n.js:ssä "// TARKISTA").**
Espanja:
- `settings.haptics` "Vibración" - "Respuesta háptica" on teknisempi; valitsin
  arkikielisen.
- `locate.err1` - iOS-asetusten polku ("Privacidad y seguridad → Localización
  → Sitios web de Safari", "Cuando se use la app") kirjoitettu muistin
  varassa, ei tarkistettu oikeasta espanjankielisestä iPhonesta.
- `aurora.times` "Previsión hasta las {until}, actualizada a las {time}" -
  "las" sopii 24 h -aikaan; 12 h -muodossa Intl tuottaa "11:00 p. m." -> "a
  las 11:00 p. m." on luonteva, mutta kellonaika "1:00" vaatisi "a la".
- Yleisesti: sinuttelu (tú: "Toca", "Elige") kuten mobiilisovelluksissa
  yleensä; jos halutaan teitittely (usted), muutettava useaan avaimeen.
- "Auroras" (yleisnimi) vs. "aurora boreal" - käytin lyhyttä "Auroras"
  napeissa ja otsikoissa.
Ranska:
- `settings.haptics` "Retour haptique" - Applen ranskankielinen termi; voisi
  olla myös "Vibrations".
- `cam.notLive` "Le direct est interrompu" - voi kuulostaa siltä, että lähetys
  katkesi juuri; vaihtoehto "Pas de direct en ce moment".
- `play.start`/`play.stop` "Lire/Arrêter la chronologie" - "chronologie" on
  aikajanalle tavallinen, mutta "frise temporelle" tai "curseur temporel"
  voi olla selkeämpi.
- `verdict.cloudy.title` "Nuages gênants" - lyhyt otsikko; vaihtoehto "Ciel
  couvert".
- `locate.err1` - iOS-asetusten polku kirjoitettu muistin varassa.
- Yleisesti: teitittely (vous: "Touchez", "Choisissez"), kuten ranskassa
  sovelluksissa tavallista.
