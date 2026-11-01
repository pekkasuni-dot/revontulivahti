// Napautusalueiden poikkeukset (päätös 28, käyttäjän päätös 2026-11-01). Muut napautettavat elementit vähintään
// 44 x 44 px (karttamerkit rajattu pois jo mittauksessa). Perustelut myös ARCHITECTURE.md:ssä.
// test(rivi) -> true, jos alle 44 px:n mittaus on hyväksytty poikkeus.
export const POIKKEUKSET = [
  {nimi: 'Tekstilinkit (Tietoja ja lähteet, Katso YouTubessa, OSM-maininta)',
   peruste: 'Lukuteksti; 44 px:n rivit venyttäisivät lähdeluettelon ja kortin. Linkit eivät ole päätoimintoja.',
   test: r => /^a[ .]/.test(r.label) || /^#(cameraCardYtLink|osmIntro)\b/.test(r.label)},
  {nimi: 'Oma sijainti -nappi puolikkaan infoikkunan reunalla',
   peruste: 'Ikkuna peittää napin alaosan vain puolikkaassa tilassa; nappi on kokonaan napautettavissa ikkunan ollessa kiinni.',
   test: r => /^#locateBtn\b/.test(r.label) && /^info-.*-puoli$/.test(r.view)},
];
export const onPoikkeus = r => POIKKEUKSET.some(p => p.test(r));
