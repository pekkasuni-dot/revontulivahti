# MUISTIO: Pro-ominaisuudet (suunnitelma 2026-10-28)

> **2026-11-11: ARCHITECTURE.md päätökset 44–46 korvaavat tämän muistion ominaisuustaulukon (osa 1) ja
> hintaehdotuksen (osa 5).** Ilmakuvapohja poistettu (44), jako ja paikkaraja 2 (45), tuotteet ja hinnat (46).
> Taulukko alla päivitetty päätösten mukaan; vanhat ehdotukset jätetty historiaksi. Dev-version ostonäkymä ja
> RevenueCat-selvitys: osa 9.

Tila: SUUNNITELMA. Maksumuuria ei ole käytössä: `features.js` `PAYWALL_ENABLED = false` -> kaikki auki
kaikille. Ominaisuuksien jako on ehdotus, ei päätös. Hinnat ja kilpailijatiedot on tarkistettava
suomalaisesta App Storesta ja Google Playstä puhelimella ennen päätöstä (osa tiedoista vain hakutuloksista).

## 1. Ominaisuusjako

Periaate: ilmainen versio on täysi revontulisovellus (ennuste, pilvet, kamerat, oma sijainti), jolla
saa vastauksen kysymykseen "kannattaako tänä yönä lähteä". Pro on tarkemmille käyttäjille (oppaat,
kuvaajat): tarkemmat mallit ja pilvien rakenne, useat paikat ja niiden hälytykset.

| Ominaisuus | Taso | Tila | Tunniste (`features.js`) | Huom. |
|---|---|---|---|---|
| Revontulikartta (OVATION) | Ilmainen | live | `auroraMap` | |
| Kokonaispilvisyys kartalla (ECMWF) | Ilmainen | live | `cloudsTotal`, `modelDefault` | |
| Ala-, keski- ja yläpilvet | **Pro** | live | `cloudLayers` | |
| Sumu | **Pro** | live | `fog` | |
| Pilvien satelliittikuva | **Pro** | live | `satelliteClouds` | Worker + R2 käytössä 30.10. |
| Tuuli 10 m | Ilmainen | live | `windSurface` | |
| Tuuli 1,5 / 5,5 / 9 km | **Pro** | live | `windLevels` | |
| Kamerat + Kaikki kamerat | Ilmainen | live | `cameras` | |
| Aikajana 24 h | Ilmainen | live | `timeline` | |
| Muut mallit kartan malliksi: HARMONIE, ICON-EU, meteorologien ennuste | **Pro** | live | `modelsAll` | |
| Meteorologien ennuste Tänä yönä -välilehdellä ja 7 vrk:n 1. yöllä | Ilmainen | live | `modelEditedNight`, `nightModel()` | päätös 12; Pro: Tänä yönä seuraa kartan mallia |
| Mallien vertailu | **Pro** | tuleva | `modelCompare` | |
| Nyt, Tänä yönä, 7 vrk, avaruussää + kaaviot | Ilmainen | live | `nowTab`, `tonight`, `week`, `spaceWeather` | |
| Tänä yönä kaikille paikoille | **Pro** | tuleva | `tonightAllPlaces` | |
| Lähin selkeä paikka | **Pro** | tuleva | `nearestClear` | |
| Omat paikat | 2 / Pro 50 | live | `places` + `LIMITS.places` | vain itse tallennetut lasketaan (`canAddPlace`) |
| Reittiohjeet | Ilmainen | live | `directions` | |
| Paikkojen varmuuskopio / tuonti linkistä | Ilmainen | tuleva | `placesBackup`, `placesImport` | tuodut eivät kuulu rajaan |
| Jakolinkin luonti | **Pro** | tuleva | `placesShare` | |
| Revontulihälytykset (sis. sääraportti) | **Pro** | kenttätesti (fieldtest) | `alerts` | Dev-testi (päätös 36); live kauppaversiossa |
| Omat hälytysrajat | **Pro** | tuleva | `alertThresholds` | |
| Hiljaiset tunnit | **Pro** | tuleva | `alertQuiet` | päätös 45 (ennen ilmainen) |
| Kotinäytön widget | **Pro** | tuleva | `widgets` | |

Poistettu 11.11.: `basemapSatellite` (ilmakuvapohja, päätös 44) ja `history` (menneet yöt, hylätty päätöksessä 45).
Ostoikkunan etuluettelo (`Features.proBenefits()`): Pro + tila live tai fieldtest, hälytykset ensimmäisenä, lisäksi
paikkaraja LIMITSistä; planned-ominaisuudet eivät näy. Pilvikerrokset ja sumu yhdellä rivillä ("Ala-, keski- ja yläpilvet sekä sumu",
`pro.b.cloudsFog`, 11.11.).

<details><summary>Vanha taulukko (2026-10-28, korvattu)</summary>

Ilmakuva ilmaisena, 3 paikkaa, hiljaiset tunnit ilmaisena, satelliittikuva tulevana, historia Pro. Ks. git-historia.
</details>

Rajaamatta (aina kaikille, ei rekisterissä): kielet, yksiköt, haptiikka, selitykset, Tietoja ja lähteet,
karttapohjan vaihto Yleiskartta, kameroiden kortit.

**Päätökset (Pekka 2026-10-28):** pintatuuli ilmainen; 3 paikkaa ilmaiseksi; Pro-malleja EI voi kokeilla
ilmaisversiossa (vain Pron oma kokeilujakso); Pron päättyessä paikat SÄILYVÄT (kaikki näkyvät, uutta ei voi
lisätä ennen kuin alle 3); EI perheen jakamista (Family Sharing pois); jakolinkin luonti = Pro
(`placesShare`), paikkojen tuonti linkistä = ilmainen (`placesImport`), molemmat tulevia.

Alkuperäiset kysymykset:
1. Pintatuuli ilmaiseksi vai Pro? (ehdotus: ilmainen)
2. Montako paikkaa ilmaiseksi: 2 vai 3? (ehdotus: 3; Astrosphericilla 5 suosikkia ilmaiseksi)
3. Saako ilmainen käyttäjä kokeilla Pro-mallia rajatusti (esim. HARMONIE vain Tänä yönä)?
4. Mitä tapahtuu, kun Pro päättyy: ylimääräiset paikat jäävät näkyviin vain luku -tilaan (ehdotus:
   paikkoja ei poisteta, uusia ei voi lisätä ennen kuin alle rajan; valittu Pro-malli -> ECMWF).

## 2. Toteutus koodissa (2026-10-28)

- `features.js` (juuritaso, ladataan aurora-core.js:n jälkeen): rekisteri `FEATURES` (taso, tila, ryhmä),
  määrärajat `LIMITS`, funktiot `isPro()`, `canUse(id)`, `canUseModel(malli)`, `modelFeature(malli)`,
  `limit(id)`, `setEntitlement({pro})`, `list()`. Tuntematon tunniste = auki (virhe ei lukitse ketään).
- index.html: `proGate(id)` ennen mallinvaihtoa (`switchCloudModel`), pilvikerrosta/sumua
  (`setCloudLayer`), tuulikorkeutta (`setWindLevel`); paikkaraja `placesMax()` = `Features.limit('places')`
  (lisäys, `placesAdd(..., {max})`, laskuri, "täynnä"-ilmoitus). Nyt aina sallittu -> ei muutosta.
- Tiedosto mukana: SW SHELL, build-app.mjs FILES, publish-pages, sync-pages, esikatselu, versiohook.
- Testit `tests/features.test.mjs` (maksut pois: kaikki auki; maksut päällä: ilmainen/Pro; tuntematon).

Puuttuu käyttöönotosta (tehdään maksujen yhteydessä):
- Käynnistyksessä tallennettu Pro-malli/kerros/tuulikorkeus -> ilmaiseen, jos ei Pro (lataus ohittaa
  `proGate`:n: `loadCloudModel`, `state.cloudLayer`, tallennettu tuulikorkeus).
- Mallin pikavalikko ja 7 vrk / Tänä yönä -mallipilleri: Pro-merkki lukituille malleille.
- Lukitun valinnan napautus -> Pro-ikkuna (alla) `proGate`:ssa.
- Hälytykset: rajaus Workerissa (palvelin tietää tilauksen vain RevenueCatin webhookista tai
  sovelluksen lähettämästä tunnisteesta).

## 3. Lukittu ominaisuus (suunnitelma, EI käytössä)

Mallikuvat 2026-10-28 (360 x 640, ei repossa): `pro-tasot` ja `pro-ikkuna`.

- **Merkki:** pieni "PRO" (8,5 px, lihava, tumma teksti pääkorostuksella `--aurora`, kulma 4 px)
  lukitun pillerin oikeassa yläkulmassa. Pilleri EI himmene (himmeä = "Ei saatavilla" tällä mallilla,
  eri asia). Mallivalikossa sama merkki mallin nimen perässä.
- **Napautus:** valinta ei vaihdu; alareunaan lasi-ikkuna: PRO-merkki, ominaisuuden nimi, yhden
  lauseen hyöty (esim. "Näe, ovatko pilvet ala-, keski- vai yläpilviä. Ohut yläpilvi ei aina estä
  revontulia."), 3 Pron tärkeintä etua, pääpainike "Katso Pro-vaihtoehdot" (KORJATTU 11.11., päätös 46: ei ilmaista kokeilua, ei mainintaa missään tekstissä; ennen "Kokeile Pro 7 päivää ilmaiseksi"), "Ei nyt" ja
  "Palauta ostot". Pääpainike avaa varsinaisen ostonäkymän (paywall), jossa Applen vaatimat tiedot.
- **Paikkaraja:** "3/3 paikkaa. Pro: rajaton määrä" + sama ikkuna.
- Ei mainoksia, ei toistuvia kehotuksia (kerran istunnossa enintään, vain käyttäjän napautuksesta).

## 4. Maksujen toteutus Capacitorissa (selvitys, ei toteutusta)

**Suositus: RevenueCat** (`@revenuecat/purchases-capacitor`, valinnaisesti `-ui`).
- Capacitor 8 tuettu versiosta 12.0.0 (2025-12-29). Uusin 14.0.0 julkaistu 2026-10-28 (Play Billing 9.1);
  13.8.x käyttää Billing 8.3:a (kelpaa 2027-08-31 asti). Aloitetaan 13.8.x:llä tai 14.0.x:llä muutaman viikon
  kuluttua. 14.0.0:n CocoaPods-rajoitus ei koske meitä (SPM).
- Ei omaa palvelinta: RevenueCat tarkistaa ostot, pitää tilauksen tilan (entitlement "pro"), hoitaa
  palautuksen (`restorePurchases()`), kokeilun kelpoisuuden, tarjouskoodit. Anonyymi käyttäjätunnus riittää
  (ei käyttäjätilejä). Webhookit tarvittaessa Cloudflare Workeriin (Pro-hälytykset).
- `-ui`: valmis natiivi ostonäkymä ja tilauksen hallinta (iOS 15+, Android 7+), muokattavissa hallintapaneelista.
- Hinta: ilmainen kuukausituloon $2 500 asti, sitten 1 % (RevenueCatin oma ohje; osa lähteistä väittää 1 %
  vain ylimenevästä osasta - tarkistettava). Mitkä ominaisuudet (paywall-editori, webhookit) kuuluvat
  ilmaistasoon: EI VARMISTETTU.
- Kytkentä: käynnistyksessä `Purchases.configure` + `getCustomerInfo` -> `Features.setEntitlement({pro})`,
  kuuntelija päivittää. Selaimessa (kehitys) ei ostoja: `isPro()` true kehitystilassa.

Vaihtoehdot:
| Kirjasto | Hinta | Plussat | Miinukset |
|---|---|---|---|
| Capgo `@capgo/native-purchases` 8.9.6 | ilmainen | ei välikättä, StoreKit 2, Billing 9.1 | oma ostojen tarkistus (Worker + App Store Server API / Play Developer API) |
| Fovea `capacitor-plugin-cdv-purchase` 13.20 | plugin ilmainen, tarkistus maksullinen (iaptic) | kypsä | tarkistus erikseen, hinta ei varmistettu |
| Adapty `@adapty/capacitor` 4.1 | ilmainen $5 000/kk asti, sitten 1 % | ostonäkymäeditori, A/B | sidonnaisuus, hinnat muuttuneet 2026 |
| Qonversion 1.10 | ilmainen $10 000/kk asti (ehkä laskenut) | iso ilmaisraja | pienempi, hinnoittelu muuttuu |

**Kauppojen säännöt:**
- Apple 3.1.1: ominaisuuksien avaus vain sovelluksen sisäisellä ostolla; palautus-toiminto pakollinen.
- 3.1.2: tilauksen on tuotettava jatkuvaa arvoa (päivittyvä ennustedata käy), jakso vähintään 7 päivää,
  toimii kaikilla käyttäjän laitteilla. Yksi tilausryhmä ("Pro": kuukausi + vuosi).
- Ostonäkymässä: tilauksen nimi, kesto ja sisältö, laskutettava hinta näkyvimpänä (kk-hinta vuodelle vain
  toissijaisena), kokeilun pituus ja hinta sen jälkeen, "Palauta ostot", käyttöehdot (EULA) ja
  tietosuojaseloste linkkeinä (myös kaupan tiedoissa). Ei kokeilu-kytkintä (hylätty 3.1.2:n perusteella).
- Kokeilu: Apple yksi esittelytarjous per henkilö per tilausryhmä (3 pv - 1 v); Google tarjous
  "new customer acquisition" automaattisesti uusiutuvaan perussuunnitelmaan.
- Perheen jakaminen (Apple): EI käytetä (päätös 2026-10-28; ei voi perua jälkikäteen). Google ei jaa tilauksia perheelle.
- Provisio: Apple Small Business Program 15 % heti (alle 1 M$/v). Google tilaukset 15 % (EU:ssa
  2026-06-30 alkaen esitetty 10 % + 5 %). EU:n DMA-ehdot 2026-10-01: Applen IAP pienyritysohjelmassa 15 %;
  vaihtoehtoiset maksutavat eivät kannata tässä koossa.
- Google Play Billing Library: 8 tai uudempi pakollinen (7 loppuu 2026-11-01).

**TEHTÄVÄ ENNEN ENSIMMÄISTÄ MAKSULLISTA JULKAISUA:** hae Applen App Store Small Business Programiin
(provisio 15 % 30 %:n sijaan; haku App Store Connectissa, vaatii hyväksytyn Paid Apps Agreementin).
Googlen vastaava (tilauksissa jo 15 %, muissa ostoissa ensimmäisestä 1 M$:sta 15 %) tarkistetaan Play
Consolesta ja otetaan käyttöön, jos vaatii erillisen ilmoittautumisen.

**Käyttöönoton vaiheet:**
1. Apple: Paid Apps Agreement (App Store Connect -> Business) + pankki- ja verotiedot (tarvitaan jo
   hiekkalaatikkotestiin), Small Business Program, tilausryhmä ja tuotteet (kk, vuosi, kokeilu),
   In-App Purchase -avain (.p8) RevenueCatiin (vain salaisuuksiin, ei keskusteluun eikä repoon).
2. Google: maksuprofiili (Play Console -> Monetization setup), käännös BILLING-oikeudella sisäiselle
   radalle, tilaus -> perussuunnitelmat -> kokeilutarjous, lisenssitestaajat, palvelutili RevenueCatille.
3. Käyttöehdot ja tietosuojaseloste julkaistaan (luonnokset `docs/luonnokset/`).
4. Testaus: TestFlight käyttää aina hiekkalaatikkoa (ostot ilmaisia, tilaus uusiutuu päivittäin 6 kertaa);
   Androidilla lisenssitestaajat + Play Billing Lab.
5. Ensimmäinen tilaus lähetetään tarkastukseen sovellusversion mukana.
Suomen verotus (ALV:n hoitavat kaupat; W-8BEN, y-tunnus jos yritys): EI VARMISTETTU.

## 5. Kilpailijat (hakutuloksista 2026-10, tarkistettava kaupoista)

| Sovellus | Ilmainen | Maksullinen | Pro-ominaisuudet |
|---|---|---|---|
| My Aurora Forecast & Alerts (Jrustonapps) | koko sovellus mainoksin | erillinen Pro-sovellus ~3,99 $ kertaosto | mainokseton |
| Aurora Forecast. (TINAC) | perusennuste | Pro 2,99 $/kk tai 12,99 $/v; Ultimate 4,99 $/kk tai 24,99 $/v (DE 5,99 € / 29,99 €) | hälytykset, Ultimate kaikki; 7 pv kokeilu vuositilaukseen |
| Hello Aurora | kartta, yhteisö, perushälytykset | Pro 2,99-46,90 $ (jaksot epäselviä) | säädettävät hälytykset (säde, voimakkuus, Bz), tilastot |
| AuroraWatch | perus | 2,99 $/vko, 4,99 $/kk, 29,99 $/v | offline, Live Activities, widgetit |
| Aurora Alerts & Forecast | perus | 6,99 $/vko, 14,99 $/kk, 44,99 $/v | ei eritelty |
| Northern Light Aurora Forecast | perus | hälytykset 1,99 $/kk ... 9,99 $ elinikäinen | hälytykset, 27 vrk ennuste |
| SpaceWeatherLive | kaikki mainoksin | 0,99 $/kk, 9,99 $/v | mainokseton |
| Astrospheric | 5 suosikkia, peruspilviennuste | 2,99 $/kk, 29,99 $/v | parviennuste pilvistä tunneittain, Kp-hälytykset, rajaton suosikit |
| Clear Outside | kaikki | - | - |
| Ilmatieteen laitos (revontulet ja avaruussää) | kaikki | - | - |
| Northern Lights Alert (nlalert.fi) | sovellus | kamerahälytykset koodilla; Northern Lights Camera 2,99 €/pv, 9,90 €/vko, 49,90 €/v | kameroilla varmistetut hälytykset |
| Windy (vertailukohta) | kaikki mallit, 3 h askel | n. 19-26 €/v | 1 h askel, 4 päivitystä/vrk, tarkempi kartta, vertailu |

Havainnot: vakiintuneet sovellukset pyytävät 1-3 $/kk tai 10-30 $/v tai 4-10 $ kertamaksun. Uudet
mainosvetoiset kloonit käyttävät viikkotilauksia (3-7 $/vko) - leimaa halpatuotteeksi. Yleisimmät
Pro-ominaisuudet: hälytykset, useat paikat, widgetit, mainoksettomuus. Tarkat pilvimallit ja sumu ovat
meidän erottuva etumme; lähin vastine Astrospheric.

**Hintaehdotus (KORVATTU päätöksellä 46: passi 7 pv 3,99 €, 6 kk 9,99 €, 1 v 17,99 €, ei kokeilua):** 2,99 €/kk ja 14,99-19,99 €/v, 7 päivän kokeilu vuositilaukseen. Harkittava
kertaosto "elinikäinen" 39-49 € oppaille. Ei viikkotilausta.

## Lähteet

Luettu suoraan: npm (@revenuecat/purchases-capacitor, -ui, @capgo/native-purchases,
capacitor-plugin-cdv-purchase, @adapty/capacitor, @qonversion/capacitor-plugin);
https://github.com/RevenueCat/purchases-capacitor (README, CHANGELOG);
https://developer.apple.com/app-store/review/guidelines/ ;
https://developer.apple.com/app-store/subscriptions/ ;
https://developer.apple.com/app-store/small-business-program/ ;
https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions ;
https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox ;
https://developer.apple.com/help/app-store-connect/test-a-beta-version/subscription-renewal-rate-in-testflight ;
https://developer.android.com/google/play/billing/deprecation-faq ;
https://developer.android.com/google/play/billing/subscriptions ;
https://developer.android.com/google/play/billing/test

Vain hakutuloksista (tarkistettava): https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management ;
https://adapty.io/blog/adapty-new-pricing-2026/ ; https://qonversion.io/pricing ;
https://support.google.com/googleplay/android-developer/answer/112622 ;
https://www.cnbc.com/2026/08/18/apple-eu-app-store-fees-iphone.html ;
https://www.revenuecat.com/blog/growth/rip-toggle-paywall.md ;
https://www.jrustonapps.com/faqs/apps/overview.php?app=9 ; https://www.apppricinglab.com/app/apple/539875792 ;
https://apps.apple.com/us/app/hello-aurora-alerts-forecast/id1457810302 ; https://apps.apple.com/app/id6745201637 ;
https://apps.apple.com/rs/app/aurora-alerts-forecast/id6553985245 ; https://apps.apple.com/na/app/id1092949787 ;
https://www.spaceweatherlive.com/en/app ; https://www.astrospheric.com/parts/Feature_Table.html ;
https://apppricinglab.com/app/apple/6755946435 ; https://adapty.io/paywall-library/windy-com/ ;
https://aurorasnow.fmi.fi/public_service/suomi/start_page.html ;
https://www.visitfinland.com/en/product/dc77cd51-89ee-4bc0-bf92-301a786ff5d1/northern-lights-camera/

## 6. Perheen jakaminen ja paikkojen jakaminen (2026-10-28, keskustelussa)

- **Perheen jakaminen (Apple Family Sharing):** yksi ostettu tilaus toimii enintään 5 muulla saman
  Apple-perheryhmän jäsenellä. Kytketään tilauskohtaisesti App Store Connectissa, EI voi perua. Google Play
  ei jaa tilauksia perheelle. Tarkoitettu perheille, ei yrityksille.
- **Yrityksen paikat työntekijöille** on eri asia: jaettava paikkalista. Kevyin tapa ilman tilejä ja
  palvelinta: paikkojen jako linkkinä tai tiedostona (vienti/tuonti), jonka vastaanottaja tuo omiin
  paikkoihinsa. PÄÄTÖS: linkin luonti `placesShare` = Pro, tuonti linkistä `placesImport` = ilmainen (työntekijä tai
  asiakas ei tarvitse Prota). PÄÄTÖS 2026-10-28: tuodut paikat EIVÄT kuulu
  ilmaisen 3 paikan rajaan. Toteutus: paikkaan merkintä alkuperästä (esim. `source: 'import'` + jakolistan
  tunniste), raja laskee vain itse tallennetut. Tuodun listan voi poistaa kerralla. Yrityslisenssit (useita tilauksia kerralla)
  eivät onnistu kauppojen omilla tilauksilla suoraan - Apple: Volume Purchase / Apple Business Manager.

## 7. Pro-testikytkin (2026-10-28, toteutettu, ei maksuja)

- Asetuksissa "Testaus" -> "Pro-tila: Auki / Ilmainen / Pro". Oletus Auki (kaikki käytössä, kuten tavallisilla
  käyttäjillä). Valinta muistetaan uudelleenkäynnistyksessä (`rv-pro-test`).
- Näkyy vain `?debug`-osoitteella tai testikäännöksessä (TestFlight ja Android-AAB käännetään `APP_TEST_BUILD=1`:llä,
  `<html data-testbuild="1">`). Tavallisessa versiossa tila on aina Auki eikä tallennettua valintaa lueta.
  Toteutettu asetuksiin eikä `?debug`-paneeliin, koska sovelluksessa ei ole osoiteriviä (`?debug` ei toimi).
- Ilmainen: PRO-merkit pilvikerroksissa, sumussa, tuulikorkeuksissa ja mallivalikon muissa malleissa; napautus
  avaa alaikkunan (ominaisuus, hyöty, Pron edut, "Kokeile Pro" -> "Ostot eivät ole vielä käytössä", "Ei nyt" (11.11.: pääpainike "Katso Pro-vaihtoehdot", X korvaa "Ei nyt"),
  "Palauta ostot"). 4. oma paikka avaa saman ikkunan. Pro-valinnat palaavat ilmaisiin (ECMWF, Pilvet, tuuli 10 m).
- Pro: kaikki auki kuten nyt.
- Puuttuu (tehdään myöhemmin): Tänä yönä / 7 vrk -mallipilleri näyttää valitun mallin ilman merkkiä (malli on aina
  ilmainen ECMWF Ilmainen-tilassa); hälytykset (ei vielä sovelluksessa).
- Tarkistettava puhelimella: kytkin näkyy TestFlightissa, valinta säilyy sovelluksen uudelleenkäynnistyksessä,
  alaikkuna ja merkit iPhonen lasipinnalla, kotipalkin tila alaikkunan alla.

## 8. Pro-kyltti (2026-10-28)

Kun Pro-tilaus on voimassa, yläreunan nimen perässä on "PRO"-kyltti. Väri: paletin tehosteväri (`--pal-highlight`
#A893F2, pehmeä violetti; "vain harvat huippukohdat") tummalla tekstillä ja kevyellä hehkulla. Tarkoituksella eri väri
kuin vihreät lukitusmerkit (vihreä = "vaatii Pron", violetti = "sinulla on Pro"). Näkyy testitilassa Pro ja myöhemmin
oikealla tilauksella (`hasProSubscription()`), EI tilassa Auki (maksut pois, ei tilausta).

## 9. Ostonäkymä ja testiosto Dev-versiossa (2026-11-11, päätös 46)

- Lukitun ominaisuuden napautus -> Pro-ikkuna (`openProSheet`, matala alaikkuna, X, päätös 8); pääpainike "Katso
  Pro-vaihtoehdot" -> ostonäkymä samassa ikkunassa takaisin-napilla (`openProBuy`, `#psBuy`, päätös 26).
- Tuotteet `Features.PRODUCTS` (yksi paikka; oikeat paikalliset hinnat myöhemmin kaupasta): `pro_pass_7d` 3,99 €
  ("7 päivää, ei jatku itsestään", kertamaksu), `pro_6m` 9,99 € / 6 kk, `pro_1y` 17,99 € / vuosi. Hinta isoimpana
  (Intl-valuuttamuoto kielen mukaan). Lisäksi Palauta ostot, Käyttöehdot ja Tietosuojaseloste (`PRO_LINKS`: nyt
  luonnokset GitHubissa, vaihdettava julkaistuihin ennen maksuja).
- Ostonäkymä aukeaa vain `DEV_UI` (testikäännös / ?debug / Aurora Dev) tai kun `PAYWALL_ENABLED`; kauppaversiossa
  pääpainike näyttää "Ostot eivät ole vielä käytössä".
- Testiosto (`proPurchase`, DEV_UI ja maksut pois): Pro-tila = Pro + "Testiosto, ei veloitusta". Palautus:
  Asetukset > Kehittäjä > Pro-tila > Ilmainen. Ei RevenueCatia, ei veloitusta, ei kauppayhteyttä.
- Testit: `screenshots.mjs --states=pro-osto,pro-testiosto,pro-toiminta,paikat-raja,pro-yo-ilmainen`.

### RevenueCat: uusiutumaton passi (selvitys 11.11.2026)

Lähteet: RevenueCatin dokumentit ja yhteisöpalsta, haettu 11.11. (Pekka; revenuecat.com ei ollut tavoitettavissa
Clauden työympäristöstä).

- **iOS (Apple non-renewing subscription):** uusiutumattomalla ostolla ei ole päättymispäivää. Passia EI liitetä
  pro-oikeuteen (entitlement) RevenueCatissa, koska oikeus jäisi voimaan pysyvästi. Sovellus lukee ostoajan
  (`CustomerInfo.nonSubscriptions`, tuote `pro_pass_7d`) ja laskee päättymisen: ostoaika + 7 vrk.
- **Android (Google prepaid plan):** kauppa vanhentaa prepaid-tilauksen itse, `willRenew` = false. Liitetään
  pro-oikeuteen kuten uusiutuvat tilaukset.
- **`features.js` (ei toteuteta vielä):** `setEntitlement` saa myöhemmin myös passin päättymisajan; `isPro()` on tosi,
  jos tilaus on voimassa tai passi ei ole päättynyt.
- **Varmistamatta:** passin palautus laitteen vaihdossa iOS:llä (testataan hiekkalaatikossa).
- Passi + tilaus samaan aikaan: Pro voimassa pidemmän mukaan (seuraa yllä olevasta `isPro()`-säännöstä).
