# GitHub Actions -artefaktit: ennen ja jälkeen (4.11.2026)

Lähde: `artefaktit-siivous.yml`, ajo 41875627309 (haara `claude/trusting-heisenberg-7ljjgx`). Koko lista nimen,
koon, ajon ja haaran mukaan on ajon Summary-sivulla.

## Yhteenveto

| | Ennen | Jälkeen |
|---|---:|---:|
| Voimassa olevia artefakteja | 335 | 14 |
| Koko | 2071 Mt | 353 Mt |
| Välimuistit | 1 (86 Mt) | 1 (86 Mt) |

Poistettu 321 artefaktia (1719 Mt), virheitä 0. Ohitettiin 14 alle tunnin vanhaa (käynnissä olevien ajojen
siirrot ja tuorein Pages-julkaisu).

## Ennen, työnkuluittain

| Työnkulku | Mt | Kpl | Osuus | Säilytys |
|---|---:|---:|---:|---|
| pages-build-deployment (GitHubin oma Pages-julkaisu, `github-pages` ~50 Mt) | 1505 | 30 | 73 % | 1 vrk (GitHubin oletus) |
| android-aab.yml (AAB + debug-APK) | 207 | 47 | 10 % | 14 vrk |
| pilvidata-icon_eu.yml | 112 | 8 | 5 % | 1 vrk (main) |
| pilvidata-harmonie.yml | 66 | 8 | 3 % | 1 vrk (main) |
| wind-icon_eu.yml | 51 | 32 | 2 % | 1 vrk (main) |
| wind-harmonie.yml | 46 | 32 | 2 % | 1 vrk (main) |
| pilvidata-edited.yml | 33 | 24 | 2 % | 1 vrk (main) |
| wind-ecmwf.yml | 17 | 4 | 1 % | 1 vrk |
| android-dev.yml (Dev-APK) | 16 | 4 | 1 % | 30 vrk |
| ecmwf-7d.yml | 10 | 2 | 1 % | 1 vrk |
| pilvidata-ecmwf.yml | 6 | 4 | 0 % | 1 vrk |
| camera-status.yml | 0,4 | 138 | 0 % | 1 vrk |
| probe-load.yml (työnkulkua ei enää ole) | 0,3 | 2 | 0 % | – |

**Suurin kuluttaja on GitHub Pagesin oma julkaisu** (73 %): jokainen gh-pages-commit (datajulkaisu) tekee
~50 Mt:n `github-pages`-artefaktin, joka elää 1 vrk. Sille ei voi asettaa lyhyempää säilytystä työnkulusta.
Jälkeen-tilan 353 Mt on lähes kokonaan näitä (7 kpl), ja ne kertyvät takaisin noin 30 kappaleeseen
vuorokaudessa. Seuraavaksi suurin oli android-aab.yml (14 vrk säilytys).

## upload-artifact- ja cache-askeleet

| Työnkulku | Artefakti | Mihin tarvitaan | Säilytys ennen -> nyt |
|---|---|---|---|
| pilvidata-ecmwf / -icon_eu / -harmonie / -edited | `clouds-<malli>` | fetch-job -> publish-job saman ajon sisällä (gh-pages-julkaisu serialisoitu) | main 1, haara 7 -> **1** |
| wind-ecmwf / -icon_eu / -harmonie | `wind-<malli>[-<taso>]` | sama (matrix-jobit -> yksi julkaisu) | main 1, haara 7 -> **1** |
| ecmwf-7d | `ecmwf-7d` | sama | main 1, haara 7 -> **1** |
| camera-status | `camera-status` | sama | main 1, haara 7 -> **1** |
| android-aab | `aurora-dev-apk-<code>` | android-dev.yml lataa sen samassa ajossa Releases-sivulle (pysyvä linkki); muuten vain haaran koekäännöksen lataus | 30 -> **3** |
| android-aab | `aurora-android-aab-<n>`, `aurora-android-apk-debug-<n>` | AAB käsin Play Consoleen (ei vielä käytössä), debug-APK testiasennukseen | 14 -> **3** |
| camera-probe | `camera-probe-<id>` | kamerakandidaattien testin tulokset | 3 (ennallaan) |
| tests.yml | `setup-python` `cache: pip` (86 Mt) | nopeuttaa pip-asennusta joka pushissa; yksi mainin välimuisti, GitHub poistaa 7 vrk käyttämättömänä | ennallaan |

Kuvakaappauksia ei tallenneta artefakteiksi (ios-simulaattori.yml kirjoittaa ne orpohaaraan `simulaattori-kuvat`).
`download-artifact`-askeleet (camera-status, ecmwf-7d, android-dev ja datatyönkulkujen publish-jobit) lukevat
vain saman ajon artefakteja -> 1 vrk riittää.

## Muut kohdat

- `android.yml`: ei ole. Android-työnkulut `android-aab.yml` ja `android-dev.yml` käynnistyvät jo nyt vain käsin
  (`workflow_dispatch`), kutsuttuina (`workflow_call`) tai `claude/**`-haaralla, kun `.github/sovellus-koe.env` /
  `.github/sovellus-dev-koe.env` muuttuu - ei jokaisesta pushista. Ei muutettu.
- `tmp-*.yml`: ei ole yhtään. Artefakteissa näkyi `probe-load.yml`, jota ei ole enää
  mainissa; sen 2 artefaktia poistettiin.
- Repon oletussäilytys (Settings -> Actions -> General -> Artifact and log retention) on asetettava käsin
  (GITHUB_TOKEN ei voi muuttaa sitä). Asetus koskee vain askelia, joilla ei ole omaa `retention-days`-arvoa.

## Jos Pages-artefaktit halutaan pois

Vaihtoehdot (ei toteutettu): (1) siivoustyönkulku ajastimeen tunnin välein, poistaa yli tunnin vanhat
`github-pages`-artefaktit (julkaisu on jo tehty) -> tasainen ~1,5 Gt -> ~100 Mt; (2) harvemmat gh-pages-julkaisut.
