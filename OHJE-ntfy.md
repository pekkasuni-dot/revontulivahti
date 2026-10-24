# Hälytysilmoitukset puhelimeen (ntfy) – kenttätesti

Kenttätestissä revontulihälytykset tulevat puhelimeen **ntfy**-sovelluksella
(ntfy.sh, ilmainen, ei käyttäjätiliä). Kanavia on **yksi yhteinen**
(salaisuus `NTFY_TOPIC_YHTEINEN`) kaikille paikoille: Oulu, Rovaniemi, Levi,
Kilpisjärvi ja Utsjoki. Jokainen hälytys lähetetään kerran; kaikki kanavan
tilanneet (Pekka ja opas) saavat sen.

**Kanavan nimi on kuin salasana:** kuka tahansa, joka tietää nimen, voi lukea
ilmoitukset ja lähettää kanavalle. Älä liitä nimeä keskusteluun, repoon,
kuvakaappauksiin tai viesteihin. Se tallennetaan vain GitHubin salaisuuteen
ja puhelinten ntfy-sovellukseen (oppaalle nimen voi antaa kasvotusten tai
salasanojen hallinnan jakotoiminnolla).

## 1. Valitse kanavan nimi

Tee yksi pitkä satunnainen nimi, esimerkiksi salasanojen hallinnan
generaattorilla:

- vähintään 24 merkkiä, vain kirjaimia a–z, A–Z, numeroita, `-` ja `_`
- ei nimeä, sanaa tai sovelluksen nimeä (ei esim. "aurora-pekka")
- muoto esim. `k7Qx…` (24–40 satunnaista merkkiä)

Tee samalla kolmas satunnainen merkkijono (vähintään 32 merkkiä):
**palauteavain**, jolla palautenappien osoitteet allekirjoitetaan.

## 2. Tallenna salaisuudet GitHubiin

GitHub → repo **revontulivahti** → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**. Lisää kaksi salaisuutta:

| Name | Secret |
|---|---|
| `NTFY_TOPIC_YHTEINEN` | kanavan nimi |
| `PALAUTE_AVAIN` | palauteavain |

Jos olet jo lisännyt `NTFY_TOPIC_PEKKA` tai `NTFY_TOPIC_OPAS`, poista ne
(niitä ei enää käytetä).

Puhelimella: avaa github.com selaimessa ja valitse "Desktop site", jos
Settings-välilehti ei näy.

Palautteen vastaanottaja on olemassa oleva Cloudflare-ajastin (Worker).
Sen osoite haetaan automaattisesti Cloudflaresta (salaisuudet
`CLOUDFLARE_API_TOKEN` ja `CLOUDFLARE_ACCOUNT_ID` ovat jo olemassa). Jos se
ei onnistu, lisää myös `PALAUTE_URL` = `https://auroraawesome-ajastin.<tilisi
aliverkkotunnus>.workers.dev` (Cloudflare → Workers & Pages → oikealla
"Subdomain").

Kun `PALAUTE_AVAIN` on lisätty (ja muutos on mainissa): Actions →
**Julkaise Cloudflare-ajastin** → **Run workflow**. Julkaisu vie avaimen
Workerille. Ilman sitä palautenapit vastaavat "Palautetta ei voi nyt tallentaa".

## 3. ntfy-sovellus puhelimeen

### iPhone

1. App Store → hae **ntfy** (tekijä Philipp Heckel) → Asenna.
2. Avaa sovellus. Kun se kysyy lupaa ilmoituksiin, valitse **Salli**.
3. Paina **+** (oikea yläkulma) → kirjoita kanavan nimi (Topic name) →
   palvelin jää oletukseksi (ntfy.sh) → **Subscribe**.
4. Tarkista: Asetukset → Ilmoitukset → **ntfy** → Salli ilmoitukset päällä,
   Lukitusnäyttö, Ilmoituskeskus ja Bannerit valittuina. Halutessasi
   **Aikaherkät ilmoitukset** päälle (tulevat läpi myös Keskittyminen-tilassa).

### Android

1. Google Play (tai F-Droid) → hae **ntfy** → Asenna.
2. Avaa sovellus ja salli ilmoitukset, kun se kysyy (Android 13 ja uudemmat).
3. Paina **+** → kanavan nimi → **Use another server** jää pois päältä
   (ntfy.sh) → valitse **Instant delivery** (ilmoitukset viiveettä) →
   **Subscribe**.
4. Tarkista: Asetukset → Sovellukset → ntfy → Ilmoitukset sallittu ja
   Akku → **Ei rajoituksia** (muuten Android voi viivästyttää ilmoituksia yöllä).

Pekka ja opas tilaavat saman yhteisen kanavan.

## 4. Palautenapit

Ilmoituksessa on kolme nappia: **Näkyi**, **Ei näkynyt** ja **Pilvessä**.
iPhonella napit näkyvät, kun painat ilmoitusta pitkään (tai vedät sen auki).
Androidilla laajenna ilmoitus.

Napin painallus lähettää palautteen Workerille, joka kirjaa sen lokihaaran
`halytys-loki-2` tiedostoon **PALAUTE.md** (aika, hälytys, paikka, tyyppi ja
vastaus – vastaajaa ei tallenneta). Jos samaan hälytykseen vastataan useammin
(esim. molemmat painavat), kaikki vastaukset säilyvät. Palaute näkyy
loppuraportissa.

Ilmoituksen napautus avaa kamerapaikoilla (Levi, Kilpisjärvi, Utsjoki) paikan
kameran, muuten AuroraAwesomen.

## 5. Testi-ilmoitus

Actions → **Hälytysten testi-ilmoitus (ntfy)** → **Run workflow**.
Yhteiseen kanavaan tulee ilmoitus "Testi: AuroraAwesome-kenttätesti" napit
mukaan lukien. Paina yhtä nappia: rivi (tunniste `testi-…`) ilmestyy
PALAUTE.md:hen noin minuutissa. Testirivit eivät ole mukana loppuraportissa.

Valinta **simuloi** painaa työnkulussa kaikki kolme nappia automaattisesti ja
tarkistaa, että kolme riviä tallentui.

## Jos ilmoituksia ei tule

- Testi-ilmoituksen ajon loki: "Salaisuus puuttuu" → kohta 2.
- Lokissa `ok`, mutta puhelimeen ei tule → tarkista kanavan nimi sovelluksessa
  (kirjainkoko merkitsee) ja ilmoitusluvat (kohta 3).
- Napin painallus antaa virheen → `PALAUTE_AVAIN` puuttuu Workerilta (aja
  "Julkaise Cloudflare-ajastin") tai osoite on väärä (`PALAUTE_URL`).
- Kanavan nimi paljastui → keksi uusi, vaihda GitHubin salaisuus ja tilaa
  uusi kanava molempiin puhelimiin (vanhan voi poistaa).
