# Kameroiden välipalvelin (Cloudflare Worker)

Hakee revontulikameroiden tilan YouTube Data API:sta ja palauttaa sen
selaimelle (`GET /cameras`). API-avain on vain Workerin secretinä.
Perustelut ja kiintiölaskelma: `MUISTIO-webkamerat.md` osa 12.

**Avainta EI koskaan kirjoiteta tähän repoon** (ei `wrangler.toml`:iin, ei
`.dev.vars`-tiedostoon joka committoidaan, ei commit-viestiin).

## Käyttöönotto (kerran)

1. **YouTube API -avain** (Google Cloud Console, ilmainen):
   - Luo projekti → *APIs & Services → Library* → ota käyttöön
     **YouTube Data API v3**.
   - *Credentials → Create credentials → API key*.
   - Rajaa avain: *API restrictions → YouTube Data API v3*. (Sovellus-
     rajausta ei voi käyttää, koska kutsut tulevat Cloudflaresta.)
2. **Cloudflare-tili** (ilmainen Workers Free riittää: cron + KV).
3. Omalla koneella tässä kansiossa:
   ```
   npx wrangler login
   npx wrangler kv namespace create CAM_KV     # kopioi id wrangler.toml:iin
   npx wrangler secret put YOUTUBE_API_KEY     # liitä avain kehotteeseen
   npx wrangler deploy
   ```
   Tulostettu osoite on muotoa `https://auroraawesome-cams.<tili>.workers.dev`.
4. Kokeile: `https://…workers.dev/cameras` (ensimmäinen pyyntö tekee
   ensimmäisen haun). Sovelluksessa voi kokeilla ennen koodimuutosta:
   `https://pekkasuni-dot.github.io/revontulivahti/?camapi=https://…workers.dev/cameras`
5. Kirjaa osoite `index.html`:n `CAMERA_API.url`-vakioon.
6. Testiskriptiä varten sama avain GitHubiin: *Settings → Secrets and
   variables → Actions → New repository secret* `YOUTUBE_API_KEY`.

## Testit

```
cd worker && npm test
```
Simuloitu YouTube (ei verkkoa): live → sammuu → piilotus 2. hudilla →
uusi ID uploads-listasta, päivä/yö, upcoming, search-varahaku, exclude ja
vuorokauden kiintiö oikealla `data/cameras.json`:lla.

## Vastaus

```json
{
  "generatedAt": 1760900000000,
  "quota": {"day": "2026-10-19", "used": 312, "budget": 5000},
  "excludeChannels": [],
  "cameras": {
    "levi": {
      "live": true, "liveBroadcastContent": "live", "videoId": "rKfecmmzzw0",
      "title": "…", "channelTitle": "Starlapland",
      "thumbnail": {"url": "https://i.ytimg.com/vi/…/maxresdefault_live.jpg", "width": 1280, "height": 720, "size": "maxres"},
      "thumbnails": {"default": {…}, "medium": {…}, "high": {…}},
      "checkedAt": 1760900000000, "updatedAt": 1760900000000, "liveSince": "2026-…"
    }
  }
}
```
`live:false` -> ei kuvaa (`thumbnail:null`), kartalla ei ikonia.
