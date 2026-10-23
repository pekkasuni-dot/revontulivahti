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
4. Voimassaolo (*TTL*): esim. vuosi. -> **Continue to summary** ->
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
4. **Expiration:** esim. 90 päivää tai *Custom* vuoden päähän. Kirjaa
   päättymispäivä kalenteriin (ks. "Avaimen uusiminen" alla).
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

Kun GitHub-avain vanhenee, ajastin saa virheen 401 ja vain harvennetut
varaajastukset (GitHubin cron, käytännössä 3-5 h välein) jäävät. Uusi avain:
vaihe 4 uudelleen (tai *Regenerate token* samassa avaimessa) ja vaihe 5
(sama nimi `GH_DISPATCH_TOKEN`, korvaa vanhan).

## Jos avain vuotaa

GitHub: https://github.com/settings/personal-access-tokens -> avain ->
**Delete**. Cloudflare: My Profile -> API Tokens -> **Roll** / **Delete**.
Vuotaneella GitHub-avaimella voi käynnistää, perua ja ajaa uudelleen tämän
repon työnkulkuja sekä poistaa ajolokeja ja kytkeä työnkulkuja pois päältä;
koodia, haaroja ja salaisuuksia sillä EI voi muuttaa.
