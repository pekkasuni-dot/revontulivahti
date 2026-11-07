# Aurora-palaute (Cloudflare Worker)

Revontulihälytysten palautteen vastaanotto (päätös 36). **Ei julkaistu**; julkaisu käsin luvalla (päätös 37).

- `POST /v1/palaute` JSON: `type` (now / coming / tonight), `cell` (`<i>_<j>`), `sentAt` (ISO), `answer`
  (seen / notSeen / cloudy; kyselyssä myös unknown ja skipped), `channel` (button / sheet), `aid`, `sig`, `dev`.
- Tallennetaan vain tyyppi, ruutu, lähetysaika, vastaus ja kanava (KV `p:<päivä>:<uuid>`). Ei koordinaatteja.
- Väärinkäytön esto: allekirjoitettu hälytystunniste, yksi vastaus per hälytys per laite, 60 / vrk per IP.

Käyttöönotto (Pekka, vasta kun Dev-testi alkaa):
1. `cd workers/palaute && npx wrangler kv namespace create PALAUTE` → id `wrangler.toml`:iin.
2. `npx wrangler secret put PALAUTE_AVAIN_FCM` (satunnainen merkkijono; sama arvo GitHubin salaisuuteen
   `PALAUTE_AVAIN_FCM`, jolla hälytysajo allekirjoittaa).
3. `npx wrangler deploy`. Osoite `https://aurora-palaute.<tilin-aliverkkotunnus>.workers.dev/v1/palaute`.
