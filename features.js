/* ══════════════════════════════════════════════════════════════
   FEATURES (2026-10-28): ilmaisen ja Pro-version rajaus YHDESSÄ paikassa
   ──────────────────────────────────────────────────────────────
   Jokainen rajattava ominaisuus on rekisterissä FEATURES (taso free|pro,
   tila live|planned|fieldtest) ja määrärajat LIMITS (free/pro).
   Sovellus kysyy VAIN näiltä funktioilta: isPro(), canUse(id),
   canUseModel(malli), limit(id). ÄLÄ kirjoita "if pro" -ehtoja muualle.

   MAKSUT EIVÄT OLE KÄYTÖSSÄ: PAYWALL_ENABLED = false -> isPro() = true ja
   kaikki ominaisuudet ovat auki kaikille. Käyttäjä ei näe muutosta.
   Käyttöönotto (myöhemmin, ks. MUISTIO-pro.md): PAYWALL_ENABLED = true ja
   ostokirjasto kutsuu setEntitlement({pro: true|false, ...}) käynnistyksessä
   ja oston/palautuksen jälkeen.

   Lataus: selain <script src="features.js"> (globalThis.Features),
   Node require() (module.exports). Ei riippuvuuksia.
   ══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const PAYWALL_ENABLED = false;

// Ilmaisversion oletusmalli (sama kuin index.html DEFAULT_CLOUD_MODEL).
const FREE_MODELS = ['ecmwf'];

/* Rekisteri. group = näkymä/osa (vain dokumentaatioksi ja Pro-ikkunan
   ryhmittelyyn), status: live = sovelluksessa nyt, planned = tuleva,
   fieldtest = kokeilussa (hälytysten kenttätesti). Perustelut MUISTIO-pro.md. */
const FEATURES = {
  // Kartta
  auroraMap:       {tier: 'free', status: 'live',    group: 'map'},   // OVATION-kenttä
  cloudsTotal:     {tier: 'free', status: 'live',    group: 'map'},   // kokonaispilvisyys
  cloudLayers:     {tier: 'pro',  status: 'live',    group: 'map'},   // ala-/keski-/yläpilvet
  fog:             {tier: 'pro',  status: 'live',    group: 'map'},   // sumu
  windSurface:     {tier: 'free', status: 'live',    group: 'map'},   // tuuli 10 m
  windLevels:      {tier: 'pro',  status: 'live',    group: 'map'},   // tuuli 1,5 / 5,5 / 9 km
  cameras:         {tier: 'free', status: 'live',    group: 'map'},   // kamerat + kaikki kamerat
  basemapSatellite:{tier: 'free', status: 'live',    group: 'map'},   // ilmakuvapohja
  timeline:        {tier: 'free', status: 'live',    group: 'map'},   // aikajana 24 h
  satelliteClouds: {tier: 'pro',  status: 'fieldtest', group: 'map'},   // satelliittikuva (2026-10-30: esikatselu + TestFlight, Worker/R2 tulossa)
  // Säämallit
  modelDefault:    {tier: 'free', status: 'live',    group: 'models'},   // ECMWF
  modelsAll:       {tier: 'pro',  status: 'live',    group: 'models'},   // HARMONIE, ICON-EU, IL (editoitu)
  modelCompare:    {tier: 'pro',  status: 'planned', group: 'models'},   // mallit rinnakkain
  // Infoikkuna
  nowTab:          {tier: 'free', status: 'live',    group: 'info'},
  tonight:         {tier: 'free', status: 'live',    group: 'info'},
  week:            {tier: 'free', status: 'live',    group: 'info'},
  spaceWeather:    {tier: 'free', status: 'live',    group: 'info'},   // Kp, Bz, aurinkotuuli + kaaviot
  tonightAllPlaces:{tier: 'pro',  status: 'planned', group: 'info'},   // Tänä yönä kaikille paikoille
  nearestClear:    {tier: 'pro',  status: 'planned', group: 'info'},   // lähin selkeä paikka
  // Paikat ja reitit
  places:          {tier: 'free', status: 'live',    group: 'places'},   // määrä: LIMITS.places
  directions:      {tier: 'free', status: 'live',    group: 'places'},
  placesBackup:    {tier: 'free', status: 'planned', group: 'places'},   // iCloud/Android-varmuuskopio
  placesShare:     {tier: 'pro',  status: 'planned', group: 'places'},   // jakolinkin LUONTI (esim. yritys -> työntekijät)
  placesImport:    {tier: 'free', status: 'planned', group: 'places'},   // paikkojen TUONTI linkistä (vastaanottaja ei tarvitse Prota; tuodut EIVÄT kuulu LIMITS.places-rajaan)
  // Hälytykset
  alertOwn:        {tier: 'free', status: 'fieldtest', group: 'alerts'},   // oma sijainti, kiinteät rajat
  alertPlaces:     {tier: 'pro',  status: 'planned', group: 'alerts'},   // omat paikat, määrä LIMITS.alertPlaces
  alertThresholds: {tier: 'pro',  status: 'planned', group: 'alerts'},   // omat rajat (Kp, Bz, pilvisyys)
  alertQuiet:      {tier: 'free', status: 'planned', group: 'alerts'},   // hiljaiset tunnit
  // Muut tulevat
  widgets:         {tier: 'pro',  status: 'planned', group: 'other'},   // kotinäytön widget
  history:         {tier: 'pro',  status: 'planned', group: 'other'},   // menneet yöt / toisto
};

// Määrärajat. pro = tekninen yläraja (ei myyntirajaa).
const LIMITS = {
  places:      {free: 3, pro: 50},   // vain itse tallennetut; linkistä tuodut eivät kuulu rajaan (2026-10-28)
  alertPlaces: {free: 0, pro: 50},   // ilmaisella vain oma sijainti (alertOwn)
};

let entitlement = {pro: false, source: null, expires: null};
let paywall = PAYWALL_ENABLED;

/* Testitila (2026-10-28, VAIN testaukseen: ?debug tai TestFlight-käännös, ks. index.html PRO_TEST_UI):
   'open' = normaali (maksut pois -> kaikki auki), 'free' = ilmaisversio lukituksineen,
   'pro' = Pro. Ei vaikuta tavallisiin käyttäjiin: index.html asettaa tilan vain testinäkymässä. */
const TEST_MODES = ['open', 'free', 'pro'];
let testMode = 'open';
function setTestMode(m){ testMode = TEST_MODES.includes(m) ? m : 'open'; return testMode; }
function getTestMode(){ return testMode; }

function isPro(){
  if(testMode === 'free') return false;
  if(testMode === 'pro') return true;
  return !paywall || entitlement.pro === true;
}
// VAIN testeille: maksumuurin tila ilman tiedoston muokkausta.
function _setPaywallForTest(on){ paywall = !!on; }
// Onko käyttäjällä Pro-TILAUS (ei pelkkä "kaikki auki" maksujen ollessa pois): yläreunan Pro-kyltti.
function hasProSubscription(){
  if(testMode === 'pro') return true;
  if(testMode === 'free') return false;
  return paywall && entitlement.pro === true;
}
function tierOf(id){
  const f = FEATURES[id];
  return f ? f.tier : null;
}
// Tuntematon tunniste = auki (virhe ei saa lukita käyttäjää ulos), varoitus konsoliin.
function canUse(id){
  const f = FEATURES[id];
  if(!f){
    if(typeof console !== 'undefined') console.warn('Features: tuntematon ominaisuus', id);
    return true;
  }
  return f.tier === 'free' || isPro();
}
function modelFeature(modelId){
  return FREE_MODELS.includes(modelId) ? 'modelDefault' : 'modelsAll';
}
function canUseModel(modelId){ return canUse(modelFeature(modelId)); }
function limit(id){
  const l = LIMITS[id];
  if(!l) return Infinity;
  return isPro() ? l.pro : l.free;
}
// Ostokirjasto (tuleva) asettaa tilan; ilman PAYWALL_ENABLED ei vaikutusta.
function setEntitlement(e){
  entitlement = {pro: !!(e && e.pro), source: (e && e.source) || null, expires: (e && e.expires) || null};
  return isPro();
}
function list(filter = {}){
  return Object.entries(FEATURES)
    .filter(([, f]) => (!filter.tier || f.tier === filter.tier) && (!filter.status || f.status === filter.status))
    .map(([id, f]) => ({id, ...f}));
}

root.Features = {
  PAYWALL_ENABLED, FREE_MODELS, FEATURES, LIMITS, TEST_MODES, setTestMode, getTestMode,
  isPro, hasProSubscription, tierOf, canUse, modelFeature, canUseModel, limit, setEntitlement, list, _setPaywallForTest,
};
if(typeof module !== 'undefined' && module.exports) module.exports = root.Features;
})(typeof globalThis !== 'undefined' ? globalThis : this);
