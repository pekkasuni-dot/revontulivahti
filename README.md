# Ennustevertailun loki

Tämän haaran tekee työnkulku `.github/workflows/ennustevertailu.yml` (main), kerran tunnissa.
Jokainen ajo korvaa haaran yhdellä commitilla (historia ei kasva).

- **RAPORTTI.md** – osumatarkkuus ennusteittain ja pituuksittain, selkeät ja pilviset yöt erikseen
- **status.json** – keräyksen tila (öitä, selkeitä/puolipilvisiä öitä, päättynyt)
- **logs/VVVV-KK-PP.jsonl** – rivi per ajo (UTC-päivä): ennusteet kohdetunneille ja havainnot
- **kpcal/VVVV-KK-PP.jsonl** – näkyvyys-%:n kalibrointi (päätös 47): OVATION, Kp nyt ja Kp-ennuste; taulukko `node scripts/kpcal-table.mjs kpcal`

Komentorivillä: `node scripts/forecast-report.mjs <tämän haaran hakemisto>`
