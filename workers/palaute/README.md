# Aurora-palaute (Cloudflare Worker)

Revontulihälytysten palautteen vastaanotto (päätös 36). **Julkaistu 10.11.2026**: https://aurora-palaute.pekka-suni.workers.dev (vastaanotto `/v1/palaute`). Uusintajulkaisu ja avaimen kierto käsin luvalla (päätös 37), ohje alla.

**Uusintajulkaisu (koodimuutoksen jälkeen, esim. päätös 41 / ei_katsonut 11.11.2026):** `cd workers/palaute && npx wrangler deploy`.
KV-nimiavaruus ja salaisuus `PALAUTE_AVAIN_FCM` säilyvät Cloudflaressa; niitä ei tarvitse luoda uudelleen. Tarkistus:
tyhjä `POST /v1/palaute` palauttaa 400.

- `POST /v1/palaute` JSON: `type` (now / coming / tonight), `cell` (`<i>_<j>`), `sentAt` (ISO), `answer`
  (seen / notSeen / ei_katsonut, päätös 41; kyselyn X = skipped; vanhat cloudy ja unknown hyväksytään yhä),
  `channel` (button / sheet), `aid`, `sig`, `dev`.
- Tallennetaan vain tyyppi, ruutu, lähetysaika, vastaus ja kanava (KV `p:<päivä>:<uuid>`). Ei koordinaatteja.
- Väärinkäytön esto: allekirjoitettu hälytystunniste, yksi vastaus per hälytys per laite, 60 / vrk per IP.

Käyttöönotto (Pekka, vasta kun Dev-testi alkaa):
1. `cd workers/palaute && npx wrangler kv namespace create PALAUTE` → id `wrangler.toml`:iin.
2. `npx wrangler secret put PALAUTE_AVAIN_FCM` (satunnainen merkkijono; sama arvo GitHubin salaisuuteen
   `PALAUTE_AVAIN_FCM`, jolla hälytysajo allekirjoittaa).
3. `npx wrangler deploy`. Osoite `https://aurora-palaute.<tilin-aliverkkotunnus>.workers.dev/v1/palaute`.
