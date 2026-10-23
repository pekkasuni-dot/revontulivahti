/* Keogrammilinkit kuivaharjoituksen yhteenvetoon ja loppuraporttiin (2026-10-23).
   Hälytysajo tarkistaa (HEAD) aamulla edellisen yön kuvat ja tallentaa
   löytyneet osoitteet tiedostoon keograms.json; yhteenveto ja raportti
   linkittävät VAIN löytyneet. Kuvia ei tallenneta mihinkään, vain osoitteet.

   Lähteet ja käyttöehdot: MUISTIO-halytykset.md "Keogrammit".
   - FMI MIRACLE (Muonio, Kilpisjärvi, Kevo, Sodankylä): yksi kuva per yö,
     nimetty illan päivällä (UT00 kuvan keskellä). "RAW DATA, not for
     publication" -> vain omaan tarkistukseen.
   - IRF Kiiruna (KAGO): kuva per UTC-vuorokausi -> yö = illan päivän kuva
     (klo 15-24 UTC) + seuraavan päivän kuva (00-06 UTC). Valmis ~05.51 UTC.
     Ilmainen ei-kaupalliseen käyttöön, julkaisu mediassa vaatii luvan.
   - SGO Sodankylä (Sky-I): ei yökohtaista osoitetta (arkisto lomakkeena),
     vain jatkuvasti korvautuva "uusin keogrammi" -> yksi linkki otsikkoon. */
(function(root){
'use strict';

const FMI = 'https://space.fmi.fi/MIRACLE/ASC/ASC_keograms/';
const IRF = 'https://www.irf.se/alis/allsky/krn/';
const SGO_LATEST = 'https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest_keogram.jpg';
const SGO_PAGE = 'https://www.sgo.fi/Data/RealTime/allsky.php';

// night = illan päivä 'VVVV-KK-PP' (sama kuin yhteenvedon yö).
const nextDay = night => new Date(Date.parse(night + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10);
const fmiUrl = code => night => {
  const [y, m, d] = night.split('-'), yymm = y.slice(2) + m;
  return [{url: FMI + code + '.' + yymm + '/' + code + '_' + yymm + d + '.jpg'}];
};
const irfUrl = night => [night, nextDay(night)].map((day, i) => {
  const [y, m, d] = day.split('-');
  return {url: IRF + y + '/' + m + '/' + d + '/keo' + y + m + d + '.gif', part: i ? 'aamu' : 'ilta'};
});

// Järjestys = näyttöjärjestys. code = tunniste keograms.json:issa.
const STATIONS = [
  {code: 'MUO', name: 'Muonio', src: 'FMI', urls: fmiUrl('MUO')},
  {code: 'KIL', name: 'Kilpisjärvi', src: 'FMI', urls: fmiUrl('KIL')},
  {code: 'KEV', name: 'Kevo', src: 'FMI', urls: fmiUrl('KEV')},
  {code: 'SOD', name: 'Sodankylä', src: 'FMI', urls: fmiUrl('SOD')},
  {code: 'KRN', name: 'Kiiruna', src: 'IRF', urls: irfUrl},
];

// Tarkistetaanko yö tällä ajolla. Yö on valmis, kun seuraavan päivän
// AAMU_UTC on ohitettu. Viimeisin valmis yö: joka ajo, kunnes kaikki
// löytyvät; vanhemmat puuttuvat: kerran vuorokaudessa (FMI julkaisee
// osan asemista viikkojen-kuukausien viiveellä).
const CHECK = {morningUtc: 6, dailyUtc: 7};
function nightsToCheck(state, nights, now){
  const out = [];
  const done = night => Date.parse(nextDay(night) + 'T00:00:00Z') + CHECK.morningUtc * 3600e3 <= now.getTime();
  const ready = nights.filter(done).sort();
  const last = ready[ready.length - 1];
  const today = now.toISOString().slice(0, 10);
  const daily = now.getUTCHours() >= CHECK.dailyUtc && (state._dailyCheck || '') < today;
  for(const n of ready){
    const s = state[n];
    const missing = !s || STATIONS.some(st => !(s.found || {})[st.code] || (s.found[st.code].length < st.urls(n).length));
    if(!missing) continue;
    if(n === last || !s || daily) out.push(n);
  }
  return {nights: out, daily};
}

// head(url) -> Promise<boolean> (200 + kuva). Päivittää state:n paikallaan.
async function checkNights(state, nights, head, now){
  const plan = nightsToCheck(state, nights, now);
  for(const n of plan.nights){
    const s = state[n] = state[n] || {found: {}};
    s.found = s.found || {};
    for(const st of STATIONS){
      const urls = st.urls(n), have = s.found[st.code] || [];
      if(have.length === urls.length) continue;
      const ok = [];
      for(const u of urls) if(have.some(h => h.url === u.url) || await head(u.url)) ok.push(u);
      if(ok.length) s.found[st.code] = ok; else delete s.found[st.code];
    }
    s.checked = now.toISOString();
  }
  if(plan.daily) state._dailyCheck = now.toISOString().slice(0, 10);
  return plan.nights;
}

// Markdown-rivi yölle: linkit löytyneisiin + julkaisematta. null = ei vielä tarkistettu.
function keogramLine(state, night){
  const s = state && state[night];
  if(!s || !s.checked) return null;
  const found = s.found || {};
  const links = [], missing = [];
  for(const st of STATIONS){
    const f = found[st.code];
    if(!f || !f.length){ missing.push(st.name); continue; }
    links.push(f.length === 1 && !f[0].part ? '[' + st.name + '](' + f[0].url + ')'
      : st.name + ' ' + f.map(x => '[' + (x.part || 'kuva') + '](' + x.url + ')').join(' + '));
  }
  return (links.length ? links.join(' · ') : '_ei vielä yhtään_')
    + (missing.length ? ' — julkaisematta: ' + missing.join(', ') : '');
}
const SGO_NOTE = 'Sodankylän SGO:n Sky-I-kamerasta vain [uusin keogrammi](' + SGO_LATEST + ') (päivittyy jatkuvasti, ei yökohtaista arkistolinkkiä; [sivu](' + SGO_PAGE + ')).';

const Keograms = {STATIONS, CHECK, nightsToCheck, checkNights, keogramLine, nextDay, SGO_NOTE};
root.Keograms = Keograms;
if(typeof module !== 'undefined' && module.exports) module.exports = Keograms;
})(typeof globalThis !== 'undefined' ? globalThis : this);
