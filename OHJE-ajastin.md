# Cloudflare-ajastin: käyttöönotto

Ajastin (`workers/ajastin`) herää 5 minuutin välein ja käynnistää GitHubin
työnkulut niiden omalla välillä (aikataulu `workers/ajastin/src/schedule.js`).
GitHubin omat ajastukset jäävät harvennettuina varalle.

**Avaimia EI liitetä keskusteluun, repoon eikä mihinkään tiedostoon.** Ne
tallennetaan vain alla mainittuihin salaisuuskenttiin. Tarvitaan kolme asiaa:

| Mikä | Mihin tallennetaan | Mihin käytetään |
|---|---|---|
| Cloudflare API -avain | GitHub: repon salaisuus `CLOUDFLARE_API_TOKEN` | GitHub julkaisee Workerin Cloudflareen |
| Cloudflare Account ID | GitHub: repon salaisuus `CLOUDFLARE_ACCOUNT_ID` | sama (ei salainen, mutta pidetään samassa paikassa) |
| GitHub-avain (fine-grained) | Cloudflare: Workerin salaisuus `GH_DISPATCH_TOKEN` | Worker käynnistää työnkulut |

Tee vaiheet järjestyksessä. Puhelimella onnistuu, mutta tietokoneella on
helpompi (kopioi-liitä).

## 1. Cloudflare-tili

1. Avaa https://dash.cloudflare.com/sign-up ja luo tili sähköpostilla
   (ilmainen, ei maksukorttia).
2. Vahvista sähköposti.
3. Avaa vasemmasta valikosta **Workers & Pages** (Compute-otsikon alla) kerran,
   jotta Workers-palvelu on käytössä tilillä. Jos se pyytää valitsemaan
   workers.dev-aliverkkotunnuksen, valitse mikä tahansa (ajastin ei käytä sitä).
4. **Account ID:** Workers & Pages -sivun oikeassa reunassa (tai tilin
   etusivulla, "Account details") lukee *Account ID*. Kopioi se talteen
   vaihetta 3 varten.

## 2. Cloudflare API -avain (julkaisua varten)

1. Oikeasta yläkulmasta oma profiili -> **My Profile** -> **API Tokens** ->
   **Create Token**.
2. Valitse valmis pohja **Edit Cloudflare Workers** -> *Use template*.
3. *Account Resources*: **Include** -> oma tilisi.
   *Zone Resources*: **All zones** riittää (tilillä ei ole verkkotunnuksia;
   ajastin ei käytä niitä).
4. Voimassaolo (*TTL*): jätä ilman päättymispäivää tai pisin mahdollinen
   (ja muistutus kalenteriin kuten GitHub-avaimelle). -> **Continue to summary** ->
   **Create Token**.
5. Kopioi avain (näkyy vain kerran) suoraan vaiheeseen 3.

## 3. Cloudflare-tiedot GitHubiin (repon salaisuudet)

1. GitHub: https://github.com/pekkasuni-dot/revontulivahti/settings/secrets/actions
   (Settings -> Secrets and variables -> Actions).
2. **New repository secret**: nimi `CLOUDFLARE_API_TOKEN`, arvo = vaiheen 2
   avain -> *Add secret*.
3. **New repository secret**: nimi `CLOUDFLARE_ACCOUNT_ID`, arvo = vaiheen 1
   Account ID -> *Add secret*.
4. Kerro minulle "Cloudflare-salaisuudet lisätty" (ÄLÄ liitä arvoja). Ajan
   julkaisun (`Julkaise Cloudflare-ajastin`) mainista ja tarkistan lokin.
   Voit myös ajaa sen itse: Actions -> *Julkaise Cloudflare-ajastin* ->
   *Run workflow* (main).

## 4. GitHub-avain (fine-grained, vain tämä repo, vain Actions)

1. Avaa https://github.com/settings/personal-access-tokens/new
   (Settings -> Developer settings -> Personal access tokens ->
   **Fine-grained tokens** -> *Generate new token*).
2. **Token name:** `AuroraAwesome-ajastin`.
3. **Resource owner:** `pekkasuni-dot`.
4. **Expiration:** valitse **pisin mahdollinen**: *Custom* ja päivämäärä
   niin kauas kuin GitHub sallii (tyypillisesti vuoden päähän; jos listassa
   on *No expiration*, sekin käy). Lisää **kalenteriin muistutus 2 viikkoa
   ennen päättymispäivää**: "Uusi AuroraAwesome-ajastimen GitHub-avain"
   (ks. "Avaimen uusiminen" alla).
5. **Repository access:** *Only select repositories* -> `revontulivahti`.
6. **Permissions** -> *Repository permissions* -> **Actions: Read and write**.
   Jätä kaikki muut *No access* -tilaan (*Metadata: Read-only* tulee
   automaattisesti, eikä sitä voi poistaa).
7. **Generate token** -> kopioi avain (näkyy vain kerran) suoraan vaiheeseen 5.

## 5. GitHub-avain Workerin salaisuudeksi (Cloudflare)

Tee tämä vasta, kun vaihe 3 on tehty ja Worker on julkaistu (Workers &
Pages -listassa näkyy `auroraawesome-ajastin`).

1. Cloudflare: **Workers & Pages** -> `auroraawesome-ajastin` ->
   **Settings** -> **Variables and Secrets** -> **Add**.
2. *Type*: **Secret**, *Variable name*: `GH_DISPATCH_TOKEN`, *Value*: vaiheen 4
   avain -> **Deploy** (tai *Save*).
3. Kerro minulle "ajastimen avain lisätty". Tarkistan 15-30 min kuluttua,
   että työnkulkuja käynnistyy (`workflow_dispatch`, käynnistäjä sinä) ja
   ettei tuplia synny. Sen jälkeen kuivaharjoitus aloitetaan alusta.

Julkaisu (`wrangler deploy`) ei poista Workerin salaisuuksia, joten avainta
ei tarvitse lisätä uudelleen koodimuutosten jälkeen.

## Toiminnan seuranta

- **Cloudflare:** `auroraawesome-ajastin` -> **Logs**: joka herätyksellä rivi,
  esim. `alert-dryrun.yml: käynnistetty | camera-status.yml: edellinen ajo
  kesken, ohitetaan`. Virheet (esim. `401` = avain vanhentunut tai väärä).
- **GitHub Actions:** ajot, joiden tapahtuma on `workflow_dispatch`. Jos
  varaajon vahti ajaa (`Ajastin myöhässä` -varoitus), ajastin ei ole
  käynnistänyt työnkulkua sen omalla välillä.

## Avaimen uusiminen

**Merkit:** Cloudflaren lokissa (`auroraawesome-ajastin` -> Logs) virherivi
`GITHUB-AVAIN EI KELPAA (401)` tai `(403)`; GitHub Actionsissa vahti alkaa
ajaa varaajoja varoituksella `Ajastin myöhässä`. Työnkulut eivät pysähdy
kokonaan (GitHubin omat ajastukset jatkuvat), mutta ajot harvenevat 3-5
tuntiin. (`GITHUB KÄYTTÖRAJA (403)` on eri asia: tilapäinen raja, menee
itsestään ohi - ei toimenpiteitä.)

**Uusiminen (5 min, mieluiten ennen päättymispäivää):**
1. https://github.com/settings/personal-access-tokens -> `AuroraAwesome-ajastin`
   -> **Regenerate token** -> pisin voimassaolo -> kopioi uusi avain.
   (Jos avain on jo poistettu: luo uusi vaiheen 4 mukaan.)
2. Cloudflare: Workers & Pages -> `auroraawesome-ajastin` -> Settings ->
   Variables and Secrets -> `GH_DISPATCH_TOKEN` -> **Edit** -> liitä uusi
   avain -> *Deploy* / *Save*.
3. Tarkista 15 min kuluttua lokista rivi `käynnistetty` (tai pyydä minua
   tarkistamaan; älä liitä avainta keskusteluun).
4. Päivitä kalenterimuistutus uuden päättymispäivän mukaan.

## Jos avain vuotaa

GitHub: https://github.com/settings/personal-access-tokens -> avain ->
**Delete**. Cloudflare: My Profile -> API Tokens -> **Roll** / **Delete**.
Vuotaneella GitHub-avaimella voi käynnistää, perua ja ajaa uudelleen tämän
repon työnkulkuja sekä poistaa ajolokeja ja kytkeä työnkulkuja pois päältä;
koodia, haaroja ja salaisuuksia sillä EI voi muuttaa.

## Toimintavarmuus ja varajastusten harvennus (2026-10-26)

**Tulos 23.10. 13.30 - 26.10. 14.15 UTC:** hälytykset 291/291 ajoa, kamerat 434/436, pilvidata ja
7 vrk tasaisesti ilman puutteita; ei tuplia. GitHubin varajastus ajoi vain 4 kertaa 23.10. (ennen kuin
ajastin oli käynnistänyt kyseisen työnkulun ensimmäisen kerran).

**Kameroiden kolme väliin jäänyttä ajoa** (tarkistettu Workerin lokeista Cloudflaren Workers Logs
-rajapinnalla, väliaikainen työnkulku ja olemassa olevat salaisuudet `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`): ajastin laukesi joka kerta, syy oli GitHubin päässä.

| Aika (UTC) | Workerin loki | Syy |
|---|---|---|
| 23.10. 16.30 | `camera-status.yml: käynnistys epäonnistui 500` | GitHubin API vastasi käynnistykseen virheellä 500 |
| 24.10. 01.10 | `camera-status.yml: edellinen ajo kesken, ohitetaan` | GitHub ilmoitti 01.00-ajon vielä keskeneräiseksi (tarkoituksellinen ohitus) |
| 24.10. 20.00 | `camera-status.yml: tilan haku epäonnistui 522` | GitHubin API ei vastannut ajon tilan kyselyyn (522) |

Ei korjattu (ei tarvetta; seuraava ajo 10 min päästä). Mahdollinen parannus myöhemmin: yksi uusinta
muutaman sekunnin päästä, jos GitHub vastaa 5xx.

**Lokien katsominen itse:** Cloudflaren hallintapaneeli -> Workers & Pages -> `auroraawesome-ajastin`
-> **Logs** (tai Observability). Jokaisesta herätyksestä rivi `<aika> <työnkulku>: käynnistetty |
...`. Lokit säilyvät noin 3 vrk (ilmainen taso). Analytiikka-API (`workersInvocationsScheduled`) ei
palauttanut herätyksiä tällä avaimella - lokit riittävät.

**Varajastukset harvennettu 2026-10-26** (GitHubin oma `schedule`, ajaa vain jos ajastin ei ole
ajanut vahdin raja-ajan sisällä):

| Työnkulku | Ajastin (Cloudflare) | Varajastus ennen | Varajastus nyt | Vahdin raja |
|---|---|---|---|---|
| alert-dryrun | 15 min | 15 min | **30 min** (6.11. jälkeen 1 h) | 30 min |
| camera-status | 10 min | 10 min | **1 h** | 20 min |
| pilvidata-ecmwf, wind-ecmwf | 6 h | 6 h | **2x vrk** (07, 19 UTC) | 540 min |
| ecmwf-7d | 12 h | 12 h | **1x vrk** (08 UTC) | 1080 min |
| pilvidata-/wind-harmonie, -icon_eu | 3 h | 3 h | **6 h** (02, 08, 14, 20 UTC) | 270 min |
| pilvidata-edited (2026-10-27) | 1 h | - (uusi) | **6 h** (xx.25: 00, 06, 12, 18 UTC) | 90 min |
| ennustevertailu (2026-10-27, väliaikainen) | 1 h (xx.30) | - (uusi) | **1 h** (xx.45) | 50 min |

**Vahdin raja-ajat ennallaan (tarkistettu):** raja kertoo, kuinka tuore AJASTIMEN ajo riittää
(1,5-2 x ajastimen väli), eikä riipu varajastuksen tiheydestä. Jos ajastin pysähtyy, ensimmäinen
varajastus raja-ajan jälkeen ajaa työnkulun. Raja-ajan pidentäminen viivästyttäisi varalle siirtymistä
ja lyhentäminen aiheuttaisi tuplia; GitHubin cron on itsessään 0-6 h myöhässä.


## Satelliittikuvat (R2), Worker auroraawesome-satelliitti (2026-10-30)
Erillinen Worker `workers/satelliitti` hakee 10 min välein tuoreimman MTG-infrapunakuvan EUMETViewistä R2-säilöön
ja palvelee sen sovellukselle (ks. MUISTIO-selvitykset.md "Satelliittitaso: tuore kuva"). Ei salaisuuksia.
1. **R2-säilö:** Cloudflare -> R2 Object Storage -> Create bucket -> nimi `auroraawesome-sat` (sijainti automaattinen).
   R2 vaatii maksutavan tilillä; ilmaiskiintiö riittää (yksi ~1 Mt kuva, ~144 kirjoitusta/vrk).
2. **API-token:** sama `CLOUDFLARE_API_TOKEN` kuin ajastimella, mutta siihen pitää lisätä oikeus
   **Workers R2 Storage: Edit** (My Profile -> API Tokens -> muokkaa). Ilman sitä `wrangler deploy` epäonnistuu
   R2-sidokseen.
3. **Julkaisu:** Actions -> "Julkaise satelliitti-Worker" -> Run workflow (main). Työnkulku luo R2-säilön itse
   (2026-10-31, `wrangler r2 bucket create`; vaatii tokenilta Workers R2 Storage: Edit, muuten luo se käsin kohdan 2 mukaan). Vain käsin (ei automaattista
   julkaisua pushista), jotta puuttuva säilö ei kaada mitään.
4. **Osoite sovellukseen:** Workers & Pages -> auroraawesome-satelliitti -> osoite
   `https://auroraawesome-satelliitti.<aliverkkotunnus>.workers.dev`. Kirjoita se `index.html`:n vakioon `SAT_API`
   (ilman loppukauttaviivaa) -> yhdistä mainiin -> sync-pages julkaisee. Tarkistus: `<osoite>/sat/ir105/latest.json`
   antaa ajan ja koon; ennen ensimmäistä cron-ajoa (enintään 5 min) vastaus on 404 "Ei kuvaa vielä".
5. **Seuranta:** Workers -> auroraawesome-satelliitti -> Logs: "satelliitti: haettu 2026-10-30T07:50:00.000Z (980 kt)" /
   "ennallaan". Virhe "GetCapabilities 5xx" = EUMETView ei vastaa (edellinen kuva jää R2:een; sovellus näyttää sen ja
   ajan himmeänä yli 60 min vanhana).
