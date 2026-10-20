# Kolmannen osapuolen lisenssit

Tämä tiedosto kattaa sovellukseen (`index.html`) upotetut kolmannen
osapuolen kuvakkeet. Samat tekijänoikeus- ja lisenssitekstit ovat myös
`index.html`:n alussa kommenttina, joten ne kulkevat julkaistun sivun
mukana (lisenssiehto: "appear in all copies").

Karttojen, säädatan ja avaruussään lähteet ja niiden ehdot: ks.
README.md "Datalähteet ja niiden ehdot".

## Lucide-kuvakkeet (ISC) ja Feather-kuvakkeet (MIT)

Lähde: https://lucide.dev, https://github.com/lucide-icons/lucide
(lisenssi tarkistettu 2026-10 repon LICENSE-tiedostosta).

Käytössä (SVG-polut upotettu `index.html`:ään):

| Kuvake | Käyttö |
|---|---|
| `cloud-sun` | säänappi |
| `wind` | säävalikon tuulinappi |
| `layers` | karttapohjan nappi |
| `info` | infonappi |
| `layout-grid` | "Kaikki kamerat" |
| `video` | kameranappi ja kartan kameramerkit |
| `settings` | Asetukset |
| `chevron-down`, `check` | pudotusvalikot |

Lucide on Feather-kuvakkeiden jatkokehitys; Featherista periytyvät
kuvakkeet (mm. `video`, `settings`) ovat MIT-lisenssillä, muut
ISC-lisenssillä. Molemmat sallivat käytön, muokkauksen ja levityksen
(myös kaupallisesti), kunhan alla olevat ilmoitukset säilyvät.

### ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### The MIT License (MIT) (Featherista periytyvät kuvakkeet)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## MapLibre GL JS 3.6.2 (BSD-3-Clause)

Lähde: https://github.com/maplibre/maplibre-gl-js (npm `maplibre-gl@3.6.2`,
`dist/maplibre-gl.js` ja `dist/maplibre-gl.css` sellaisenaan).
Tarjoillaan 2026-10 alkaen sovelluksen omista tiedostoista (`lib/`) CDN:n
sijaan (latausnopeus, ks. MUISTIO-lataus.md). Lisenssiteksti:
`lib/maplibre-gl-LICENSE.txt` (julkaistaan kirjaston mukana); tiedoston
`maplibre-gl.js` alussa on lisäksi kirjaston oma tekijänoikeusilmoitus.
