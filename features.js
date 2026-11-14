/* ══════════════════════════════════════════════════════════════
   FEATURES (2026-10-28): ilmaisen ja Pro-version rajaus YHDESSÄ paikassa
   ──────────────────────────────────────────────────────────────
   Jokainen rajattava ominaisuus on rekisterissä FEATURES (taso free|pro,
   tila live|planned|fieldtest) ja määrärajat LIMITS (free/pro).
   Sovellus kysyy VAIN näiltä funktioilta: isPro(), canUse(id),
   canUseModel(malli), nightModel(malli), limit(id), canAddPlace(lista).
   ÄLÄ kirjoita "if pro" -ehtoja muualle.
   Jako: ARCHITECTURE.md päätös 45 (2026-11-11), tuotteet ja hinnat päätös 46 (PRODUCTS).

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
// Meteorologien ennuste (IL editoitu, 'edited') Tänä yönä -välilehdellä ja 7 vrk:n 1. yöllä myös ilmaisversiossa
// (päätökset 12 ja 45). Kartan malliksi se on Pro (modelsAll). Ks. nightModel().
const NIGHT_FREE_MODEL = 'edited';

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
  timeline:        {tier: 'free', status: 'live',    group: 'map'},   // aikajana 24 h
  satelliteClouds: {tier: 'pro',  status: 'live',    group: 'map'},   // pilvien satelliittikuva (Worker + R2 käytössä 30.10.)
  // Säämallit
  modelDefault:    {tier: 'free', status: 'live',    group: 'models'},   // ECMWF
  modelsAll:       {tier: 'pro',  status: 'live',    group: 'models'},   // kartan malliksi HARMONIE, ICON-EU, IL (editoitu)
  modelEditedNight:{tier: 'free', status: 'live',    group: 'models'},   // Tänä yönä + 7 vrk 1. yö meteorologien ennusteella (päätös 12)
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
  // Revontulihälytykset (2026-11-02, päätös 30): Pro. Hälytyspaikat = oma sijainti + Omat paikat kytkimellä,
  // yläraja = LIMITS.places (ei omaa rajaa). Korvasi alertOwn (ilmainen) ja alertPlaces.
  alerts:          {tier: 'pro',  status: 'fieldtest', group: 'alerts'},   // Dev-testi käynnissä (päätös 36); live, kun FCM-hälytykset menevät kauppaversioon
  alertThresholds: {tier: 'pro',  status: 'planned', group: 'alerts'},   // omat rajat (Kp, Bz, pilvisyys)
  alertQuiet:      {tier: 'pro',  status: 'planned', group: 'alerts'},   // hiljaiset tunnit (päätös 45: Pro, ilmaista hälytystä ei ole)
  // Muut tulevat
  widgets:         {tier: 'pro',  status: 'planned', group: 'other'},   // kotinäytön widget
};

// Määrärajat. pro = tekninen yläraja (ei myyntirajaa).
const LIMITS = {
  places:      {free: 2, pro: 50},   // vain itse tallennetut; linkistä tuodut eivät kuulu rajaan (päätös 45)
};

/* Pro-tuotteet (päätös 46, 2026-11-11). Kaikki avaavat saman Pro-oikeuden. Hinnat YHDESSÄ paikassa; oikeat
   (paikalliset) hinnat tulevat myöhemmin kaupasta (RevenueCat), nämä ovat oletuksia ostonäkymään.
   renews false = 7 päivän passi (Apple non-renewing subscription, Google prepaid plan). */
const PRODUCTS = [
  {id: 'pro_pass_7d',  period: 'pass7d', price: 3.99,  currency: 'EUR', renews: false},
  {id: 'pro_6m',       period: 'm6',     price: 9.99,  currency: 'EUR', renews: true},
  {id: 'pro_1y',       period: 'y1',     price: 17.99, currency: 'EUR', renews: true},
];

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
// Tänä yönä -välilehden ja 7 vrk:n 1. yön pilvimalli. Pro (ja maksut pois): sama kuin kartan malli.
// Ilmainen: meteorologien ennuste (päätös 12), vaikka kartan malli on ECMWF. Sovellus käyttää kartan mallia
// varana, jos meteorologien ennuste ei kata pistettä tai tuntia.
function nightModel(mapModel){
  if(isPro() || !canUse('modelEditedNight')) return mapModel;
  return NIGHT_FREE_MODEL;
}
// Omat paikat: rajaan lasketaan vain itse tallennetut (tuodut, source 'import', eivät kuulu rajaan).
// Yli rajan olevat säilyvät (Pron päättyessä); uutta ei voi lisätä ennen kuin laskettuja on alle rajan.
function placesCounted(list){
  return (list || []).filter(p => !(p && p.source === 'import')).length;
}
function canAddPlace(list){ return placesCounted(list) < limit('places'); }
// Ostonäkymän etuluettelo: Pro-ominaisuudet, jotka ovat sovelluksessa nyt (status live tai fieldtest);
// hälytykset ensimmäisenä. planned (esim. alertQuiet, alertThresholds) ei näy.
const BENEFITS_FIRST = ['alerts'];
function proBenefits(){
  const ids = list({tier: 'pro'}).filter(f => f.status === 'live' || f.status === 'fieldtest').map(f => f.id);
  return [...BENEFITS_FIRST.filter(id => ids.includes(id)), ...ids.filter(id => !BENEFITS_FIRST.includes(id))];
}
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
  PAYWALL_ENABLED, FREE_MODELS, NIGHT_FREE_MODEL, FEATURES, LIMITS, PRODUCTS, TEST_MODES, setTestMode, getTestMode,
  isPro, hasProSubscription, tierOf, canUse, modelFeature, canUseModel, nightModel, limit, placesCounted, canAddPlace,
  proBenefits, setEntitlement, list, _setPaywallForTest,
};
if(typeof module !== 'undefined' && module.exports) module.exports = root.Features;
})(typeof globalThis !== 'undefined' ? globalThis : this);
