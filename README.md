# Hälytysajon tila (FCM)

Tämän haaran tekee työnkulku `.github/workflows/alert-fcm.yml` (main). Jokainen ajo korvaa haaran
yhdellä commitilla (historia ei kasva). Ei käyttäjä- eikä sijaintitietoja: vain ruututunnisteet.

- **state.json** - ruutujen yö- ja Tulossa-tila (kerran yössä per tyyppi per ruutu)
- **logs/VVVV-KK-PP.jsonl** - yksi rivi per ajo (UTC-päivä), 14 vrk
