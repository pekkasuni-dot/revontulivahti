> **LUONNOS, ei voimassa.** Ei julkaistu sovelluksessa eikä verkossa.

# Tietosuojaseloste – LUONNOS (AuroraAwesome)

> Luonnos 2026-10. Ei juridisesti tarkistettu. Täydennetään ennen
> sovelluskauppajulkaisua (rekisterinpitäjän tiedot, yhteystiedot,
> sovelluskauppojen vaatimat kohdat).

## 1. Yleistä
AuroraAwesome on selaimessa (ja myöhemmin natiivisovelluksena) toimiva
revontuli- ja sääkartta. Sovelluksella **ei ole käyttäjätilejä, omaa
palvelinta eikä tietokantaa**. Sovelluksen tekijä ei kerää, tallenna eikä
käsittele käyttäjien henkilötietoja.

## 2. Laitteelle tallennettavat tiedot
Asetukset (kieli, yksiköt, valittu säämalli, karttapohja, näkyvät napit,
värinäpalaute) tallennetaan vain käyttäjän omalle laitteelle (selaimen
localStorage, avaimet `rv-*`). Niitä ei lähetetä minnekään. Sovelluksen
tiedostot tallennetaan laitteen välimuistiin (Service Worker), jotta
sovellus avautuu nopeasti.

## 3. Sijainti
Sijaintia käytetään vain, jos käyttäjä sallii sen (oma sijainti -nappi).
Sijainti käsitellään vain laitteella kartan ja infoikkunan laskentaan,
eikä sitä lähetetä tekijälle tai kolmansille osapuolille.

## 4. Kolmansien osapuolten palvelut
Sovellus hakee karttaa ja dataa suoraan käyttäjän laitteelta seuraavista
palveluista. Pyynnön yhteydessä palvelu näkee tavanomaiset tekniset tiedot
(IP-osoite, selaimen tyyppi, pyydetty osoite) omien käytäntöjensä mukaisesti.
Sijaintia tai muita henkilötietoja ei lähetetä.

| Palvelu | Mitä haetaan |
|---|---|
| GitHub Pages (GitHub Inc.) | sovelluksen tiedostot ja valmiiksi haettu säädata |
| OpenFreeMap | pohjakartan vektoritiilet ja fontit |
| AWS Terrain Tiles (Amazon) | maaston varjostus |
| Esri (ArcGIS Online) | satelliittikuva (vain satelliittipohjalla) ja pohjakarttavalikon kuvake |
| NOAA SWPC | revontuliennuste ja avaruussää |
| YouTube (Google) | revontulikameroiden pikkukuvat (`i.ytimg.com`) ja nimet (oEmbed) |
| cdnjs / unpkg / jsDelivr | karttakirjasto MapLibre GL JS |
| Google Fonts | käyttöliittymän fontit |

**Revontulikamerat:** pikkukuvat ja kameroiden nimet ladataan suoraan
YouTubesta käyttäjän laitteelle. Niitä ei tallenneta eikä kopioida
sovelluksen tekijän palvelimelle. Jos käyttäjä käynnistää kamerakortissa videon (toistonappi), kortti
lataa YouTuben soittimen osoitteesta `www.youtube-nocookie.com` (YouTuben
evästeitä rajoittava upotus); ennen napautusta soitinta ei ladata.
Linkki "Katso YouTubessa" avaa YouTuben,
jossa sovelletaan Googlen tietosuojakäytäntöä:
https://www.google.com/policies/privacy

Sovellus ei käytä YouTube-tiliä, ei pyydä kirjautumista eikä käsittele
käyttäjän YouTube-tietoja.

## 5. Analytiikka, mainonta, evästeet
Ei analytiikkaa, ei mainontaa, ei seurantaevästeitä.

## 6. Avoimet kohdat (täydennettävä)
- Rekisterinpitäjä ja yhteystiedot.
- Google Fontsin käyttö: fonttien lataus Googlen palvelimelta välittää
  IP-osoitteen Googlelle. Harkitaan fonttien sisällyttämistä sovellukseen
  ennen kauppajulkaisua.
- Still-kamerat (2026-10-24): kuvat ladataan suoraan kameroiden omistajien
  palvelimilta, ja palautenapit käyttävät sovelluksen omaa Cloudflare Workeria
  (`/palaute`, vain kenttätesti). Lisättävä kohdan 4 taulukkoon.
- Natiivisovelluksen mahdolliset lisäkohdat (sovelluskauppojen
  tietosuojaselvitykset).
