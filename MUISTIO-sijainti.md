# Muistio: oman sijainnin paikannuskorjaus (iPhone)

Haara: `feature/sijainti-ja-kamerat`. Main koskematta.

## Diagnoosi

Käytiin läpi tehtävänannon tarkistuslista `$('locateBtn')`-klikkauskäsittelijää
vasten (`index.html`, ennen korjausta n. rivi 746):

```js
$('locateBtn').addEventListener('click', ()=>{
  if(!navigator.geolocation){ note('Paikannus ei ole käytettävissä tässä selaimessa.', true); return; }
  navigator.geolocation.getCurrentPosition(
    p=>{ setPoint(...); map.flyTo(...); },
    ()=>note('Paikannus epäonnistui — tarkista sijaintilupa.', true)
  );
});
```

| Tarkistuskohta | Tulos |
|---|---|
| Kutsutaanko suoraan napautuksesta (iOS vaatii)? | **KYLLÄ, kunnossa.** `getCurrentPosition` on ensimmäinen rivi `click`-kuuntelijassa, ei `await`/`setTimeout`-väliä ennen. |
| `timeout`-asetus? | **PUUTTUI KOKONAAN — TÄMÄ ON PÄÄSYY.** Kolmas parametri (asetusolio) puuttui kokonaan, joten selaimen OLETUS on `timeout: Infinity`. Jos iOS ei koskaan ratkaise pyyntöä (heikko signaali, rajatapaus erityisesti standalone-PWA:ssa), KUMPIKAAN callback ei koskaan laukea. Käyttäjä näkee napin jäävän "painetuksi" ikuisesti ilman mitään ilmoitusta — täsmälleen "paikannus ei toimi" -oire ilman virhettä. |
| `maximumAge`? | Puuttui (oletus 0 = aina tuore haku). Ei suoranainen bugi, mutta hidastaa toistuvia napautuksia tarpeettomasti. |
| `enableHighAccuracy`? | Puuttui (oletus false). Ei kriittinen tälle käyttötarkoitukselle (kartta lentää zoomiin 5 = maa/mannertaso), mutta nostettu `true`:ksi tarkemman merkin sijainnin vuoksi. |
| Virheenkäsittely | **PUUTTEELLINEN.** Yksi geneerinen viesti KAIKILLE virhekoodeille (`PERMISSION_DENIED`/`POSITION_UNAVAILABLE`/`TIMEOUT`) — tehtävänanto vaati erilliset, selkeät viestit. |
| Safari vs. Koti-valikon PWA | **EI koodiero — API on identtinen.** MUTTA iOS:n KÄYTTÖJÄRJESTELMÄTASON lupakäyttäytyminen eroaa: standalone-tilassa (Koti-valikkoon lisätty, `display:"standalone"` manifest.webmanifestissa) iOS saattaa (versiosta riippuen) näyttää sijaintiluvan ERI kohteena Asetuksissa kuin tavallinen Safari-selailu — ks. "Avoimet kysymykset" alla, EI testattavissa tässä ympäristössä. |
| Service Worker / vanha välimuisti | **EI suoraan tätä koodia, mutta EPÄSUORASTI MERKITTÄVÄ RISKI.** Geolocation-API-kutsu itse ei kulje verkon kautta eikä SW:n `fetch`-käsittelijän läpi. MUTTA: `sw.js` tarjoaa `index.html`:n cache-first-strategialla (ks. CLAUDE.md "Service Worker + APP_VERSION"). Jos käyttäjän puhelin on jo kerran avannut sovelluksen ja SW on asentanut vanhan version välimuistiin, TÄMÄ KORJAUS EI NÄY käyttäjälle ennenkuin SW havaitsee uuden version (vertaa `sw.js`:n tavuja) JA käyttäjä hyväksyy "Uusi versio saatavilla" -ilmoituksen. Tämä SAMA bugiluokka löytyi ja korjattiin aiemmassa tehtävässä (versioautomaatio, `.githooks/pre-commit`) — tämän committin pitäisi laueta automaattisesti, mutta käyttäjän on silti FYYSISESTI avattava sovellus uudelleen (tai hyväksyttävä päivitysilmoitus) nähdäkseen korjauksen. |

**Johtopäätös:** pääsyy on lähes varmasti puuttuva `timeout`-asetus yhdistettynä
geneeriseen virheenkäsittelyyn — käyttäjä ei nähnyt MITÄÄN palautetta kun
pyyntö jäi roikkumaan, mikä selittää "ei toimi" (ei "toimii väärin" tai
"näyttää virheen").

## Korjaus

1. Lisätty asetusolio `getCurrentPosition`-kutsuun:
   `{ enableHighAccuracy:true, timeout:15000, maximumAge:60000 }` — 15 s on
   riittävä aika iOS:lle ulkona, mutta ei jätä käyttäjää odottamaan loputtomiin.
2. `geolocationErrorMessage(err)`-funktio erottelee kolme virhekoodia
   (`PERMISSION_DENIED`/`POSITION_UNAVAILABLE`/`TIMEOUT`) + varapolku
   tuntemattomalle virheelle — EI yhtä geneeristä viestiä.
3. "Haetaan sijaintia…" -ilmoitus heti napautuksesta (`note()`), jotta
   käyttäjä näkee HETI jotain tapahtuvan odotuksen ajan — ei hiljainen tila.
4. `locating`-lippu + `#locateBtn.locating`-CSS-luokka (himmennys, ei
   klikattavissa) estää kaksoisnapautuksen kesken odottavan haun.
5. `console.warn` virheistä (debug-apu, ei näy käyttäjälle).

**EI muutettu:** itse napautuksen suora kutsu (oli jo oikein), `setPoint`/
`map.flyTo`-logiikka (toimi jo oikein onnistuessaan).

## Mitä testattiin MISSÄ (täysi rehellisyys)

**EI testattu oikealla iPhonella/Safarilla** — ei ole fyysistä laitetta eikä
selainautomaatiota tässä ympäristössä. Korjaus perustuu:
- MDN:n/W3C:n Geolocation API -spesifikaation dokumentoituun oletuskäytökseen
  (`timeout: Infinity` oletuksena, `PositionError`-koodit 1/2/3) — ei
  oletettu, tarkistettu spesifikaatiosta.
- Yleisesti dokumentoituun, laajalti raportoituun iOS Safari -käytökseen
  (puuttuva timeout jättää pyynnön roikkumaan erityisesti PWA-/standalone-
  tilassa) - tunnettu, usein mainittu iOS-sudenkuoppa webkehityspiireissä,
  ei tämän session omaa löytöä laitteella.
- Koodikatselmointi + syntaksin tasapainotarkistus (ei JS-ajoympäristöä
  tässä, ks. CLAUDE.md "Opitut sudenkuopat" -käytäntö muualla projektissa).

**Suositus:** testaa OIKEASTI iPhonella ennen main-haaraan yhdistämistä
(ks. testiohjeet alla) — tämä on nimenomaan sellainen laitekohtainen bugi
jota ei voi lopullisesti vahvistaa korjatuksi pelkällä koodikatselmoinnilla.

## Miten testaat itse iPhonella

### Safari (selaimessa, ei asennettu)

1. Avaa sovelluksen osoite Safarissa.
2. Napauta paikannuspainiketta (tähtäinkuvake).
3. iOS kysyy "Salli sivuston [...] käyttää sijaintiasi?" — valitse
   "Salli kerran" tai "Salli aina selatessa".
4. **Onnistuessa:** kartta lentää omaan sijaintiin n. 1–5 s sisällä,
   "Haetaan sijaintia…" -teksti katoaa.
5. **Testaa lupa evätty -viesti:** valitse "Älä salli" kysyttäessä (tai jos
   olet jo kertaalleen evännyt, Asetukset → Tietosuoja ja turvallisuus →
   Sijaintipalvelut → Safari-sivustot → Estä) ja napauta uudelleen — pitäisi
   näkyä "Sijaintilupa on estetty…" -viesti heti (ei 15 s viivettä, selain
   tietää jo luvan olevan evätty).
6. **Testaa timeout-viesti (vaikea pakottaa luotettavasti):** kokeile esim.
   lentotila päälle mutta WiFi päälle (ei GPS-kiinnitystä mahdollinen) tai
   syvällä sisätiloissa ilman WiFi-paikannustakin — pitäisi näkyä 15 s
   kuluttua "Sijainnin haku kesti liian kauan…" -viesti, EI ikuista
   "Haetaan sijaintia…" -tilaa.

### Koti-valikkoon lisätty PWA (standalone)

1. Safarissa: Jaa-painike → "Lisää Koti-valikkoon".
2. Avaa sovellus Koti-valikon kuvakkeesta (pitäisi avautua ilman
   Safari-selainpalkkia, täysiruutuisena).
3. **TÄRKEÄÄ ENNEN TESTAUSTA:** jos sovellus oli jo kertaalleen avattu
   ennen tätä korjausta, sulje se kokonaan (pyyhkäise pois sovellusten-
   vaihtajasta) ja avaa uudelleen — service worker saattaa tarjota
   VANHAA, välimuistissa olevaa versiota ensimmäisellä avauskerralla.
   Jos näet "Uusi versio saatavilla" -ilmoituksen, napauta sitä.
4. Napauta paikannuspainiketta samalla tavalla kuin Safarissa.
5. **Tarkista erikseen:** onko lupa sama kuin Safarissa, vai kysytäänkö
   uudelleen? Jos kysytään erikseen, se on iOS:n oma käytös (ei bugi tässä
   koodissa) — ks. "Avoimet kysymykset" alla.

## Avoimet kysymykset / rajaukset

- iOS:n TARKKA käytös standalone-PWA:n sijaintiluvan suhteen (näkyykö se
  Asetuksissa omana rivinään sovelluksen nimellä, vai Safari-sivustojen
  alla, ja säilyykö lupa Safarista PWA:han) VAIHTELEE iOS-version mukaan
  eikä sitä pystytty varmistamaan tässä ympäristössä (ei laitetta). Tämä
  EI ole korjattavissa JS-koodilla — kyseessä on käyttöjärjestelmätason
  käytös. Jos käyttäjä raportoi PWA:ssa eri lupatilan kuin Safarissa,
  kyseessä on todennäköisesti tämä, ei ohjelmistovirhe.
- `maximumAge:60000` tarkoittaa että jos käyttäjä on liikkeessä (esim.
  autossa), näytetty sijainti voi olla jopa 60 s vanha ensimmäisellä
  nopealla uudelleennapautuksella. Ei merkittävää tälle sovellukselle
  (revontulien katselupiste ei yleensä muutu sekunneissa), mutta jätetty
  kommentiksi jos tämä joskus halutaan säätää.
