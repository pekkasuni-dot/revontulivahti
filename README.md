# Revontulihälytysten kuivaharjoituksen loki

Tämän haaran tekee työnkulku `.github/workflows/alert-dryrun.yml` (main).
Jokainen ajo korvaa haaran yhdellä commitilla (historia ei kasva).

- **YHTEENVETO.md** – kaikki yöt aikajanana paikoittain
- **HAVAINNOT.md** – omat havainnot (muokkaa käsin), näkyvät yhteenvedossa ja raportissa
- **LOPPURAPORTTI.md** – koko jakson tilastot ja ehdotukset (viimeisenä päivänä, lopullinen sen jälkeen)
- **logs/VVVV-KK-PP.jsonl** – yksi rivi per ajo (UTC-päivä)
- **state.json** – toiston eston tila

Komentorivillä: `node scripts/alert-summary.mjs <tämän haaran hakemisto>`
