/* ══════════════════════════════════════════════════════════════
   Hälytysten tekstit ja kielet (päätös 36, 7.11.2026) – YKSI paikka
   ──────────────────────────────────────────────────────────────
   Lukevat: hälytysajo (scripts/alert-fcm.mjs, alerts/fcm-alerts.js; Node/Worker) ja sovellus (i18n.js liittää
   avaimet muotoon 'alert.<avain>' kaikille sovelluksen kielille; es/fr saavat englannin).
   - Kielet LANGS = fi, en, zh (= sovelluksen zh-Hans). Sama lista kuin aurora-core.js ALERT_CELL.langs (testi).
   - Puuttuva käännös -> englanti. Paikkamerkit {nimi} samat kaikilla kielillä (tests/alert-texts.test.mjs).
   - Ilmoituksessa vain sana "hyvä" (ei vahvempia). Ensimmäinen rivi = tulos + näkyvyys-%.
   - Prosentti: fi "62 %" (sitova välilyönti), en ja zh "62%".
   - zh: natiivilukijan tarkistus ennen kauppaversiota (päätös 36).
   Lataus: selain <script src="alert-texts.js"> ENNEN i18n.js:ää (globalThis.AlertTexts), Node require().
   ══════════════════════════════════════════════════════════════ */
(function(root){
'use strict';

const LANGS = ['fi', 'en', 'zh'];
const DEF_LANG = 'en';

const TEXTS = {
  fi: {
    'type.now': 'Revontulia nyt',
    'type.coming': 'Revontulia pian',
    'type.tonight': 'Tänä yönä',
    'now.title': 'Hyvä tilaisuus nähdä revontulia nyt, näkyvyys {pct}',
    'now.body': 'Alueellasi on nyt hyvä näkyvyys revontulille. {models} {kp}',
    'coming.title': 'Revontulia todennäköisesti pian, näkyvyys {pct}',
    'coming.body': 'Bz kääntyi etelään. Revontulia todennäköisesti pian, näkyvyys {pct}. {models} {kp}',
    'tonight.title': 'Tänä yönä hyvä mahdollisuus nähdä revontulia, näkyvyys {pct}',
    'tonight.body': 'Paras aika alueellasi klo {from}–{to}. {models} {kp}',
    'models.all': 'Kaikki säämallit ennustavat riittävän selkeää.',
    'models.most': 'Useimmat säämallit ennustavat riittävän selkeää.',
    'models.half': 'Säämallit ovat eri mieltä pilvisyydestä.',
    'kp': 'Kp {range}.',
    'survey.now': 'Näkyikö revontulet?',
    'survey.tonight': 'Näkyikö revontulet viime yönä?',
    'answer.seen': 'Näkyi',
    'answer.notSeen': 'Ei näkynyt',
    'answer.cloudy': 'Pilvessä',
    'answer.unknown': 'En tiedä',
    'channel': 'Revontulihälytykset',
    'settings.survey': 'Kysy hälytyksen jälkeen, näkyikö revontulia',
  },
  en: {
    'type.now': 'Aurora now',
    'type.coming': 'Aurora soon',
    'type.tonight': 'Tonight',
    'now.title': 'Good chance to see the aurora now, visibility {pct}',
    'now.body': 'Aurora visibility is good in your area right now. {models} {kp}',
    'coming.title': 'Aurora likely soon, visibility {pct}',
    'coming.body': 'Bz turned south. Aurora likely soon, visibility {pct}. {models} {kp}',
    'tonight.title': 'Good chance of aurora tonight, visibility {pct}',
    'tonight.body': 'Best time in your area {from}–{to}. {models} {kp}',
    'models.all': 'All weather models expect clear enough skies.',
    'models.most': 'Most weather models expect clear enough skies.',
    'models.half': 'Weather models disagree on cloud cover.',
    'kp': 'Kp {range}.',
    'survey.now': 'Did you see the aurora?',
    'survey.tonight': 'Did you see the aurora last night?',
    'answer.seen': 'Seen',
    'answer.notSeen': 'Not seen',
    'answer.cloudy': 'Cloudy',
    'answer.unknown': "Don't know",
    'channel': 'Aurora alerts',
    'settings.survey': 'Ask after an alert whether you saw the aurora',
  },
  zh: {   // TARKISTAMATON (natiivilukija ennen kauppaversiota)
    'type.now': '现在有极光',
    'type.coming': '极光即将出现',
    'type.tonight': '今晚',
    'now.title': '现在看到极光的机会良好，可见度 {pct}',
    'now.body': '你所在区域现在的极光可见度良好。{models}{kp}',
    'coming.title': '极光可能即将出现，可见度 {pct}',
    'coming.body': 'Bz 转为向南。极光可能即将出现，可见度 {pct}。{models}{kp}',
    'tonight.title': '今晚看到极光的机会良好，可见度 {pct}',
    'tonight.body': '你所在区域的最佳时间：{from}–{to}。{models}{kp}',
    'models.all': '所有天气模型都预报天空足够晴朗。',
    'models.most': '多数天气模型预报天空足够晴朗。',
    'models.half': '各天气模型对云量的预报不一致。',
    'kp': 'Kp 指数 {range}。',
    'survey.now': '你看到极光了吗？',
    'survey.tonight': '昨晚你看到极光了吗？',
    'answer.seen': '看到了',
    'answer.notSeen': '没看到',
    'answer.cloudy': '多云',
    'answer.unknown': '不知道',
    'channel': '极光提醒',
    'settings.survey': '提醒后询问是否看到极光',
  },
};

// Sovelluksen kielikoodi (i18n.js: fi, en, zh-Hans, es, fr) -> hälytyskieli. Tuntematon -> en.
function alertLangOf(appLang){
  const l = String(appLang || '').toLowerCase().split(/[-_]/)[0];
  return LANGS.includes(l) ? l : DEF_LANG;
}
function text(lang, key, vars){
  const L = TEXTS[alertLangOf(lang)] || TEXTS[DEF_LANG];
  let s = L[key] != null ? L[key] : (TEXTS[DEF_LANG][key] != null ? TEXTS[DEF_LANG][key] : key);
  if(vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? String(vars[k]) : '');
  return s.replace(/ {2,}/g, ' ').trim();
}
// Prosentti kielen mukaan: fi "62 %" (sitova välilyönti U+00A0), en/zh "62%".
function pct(lang, n){
  const v = Math.round(n);
  return alertLangOf(lang) === 'fi' ? v + ' %' : v + '%';
}
// Kp haarukkana (päätös 36): kokonaisluvut, alaraja alas ja yläraja ylös pyöristettynä ("2–3"); sama -> yksi luku.
function kpRange(lo, hi){
  if(lo == null || hi == null) return null;
  const a = Math.floor(Math.min(lo, hi)), b = Math.ceil(Math.max(lo, hi));
  return a === b ? String(a) : a + '–' + b;
}
// Mallien yksimielisyys sanallisena (ei "2/4"): kaikki / useimmat / puolet.
function modelsKey(ok, avail){
  if(!avail) return null;
  return ok >= avail ? 'models.all' : ok * 2 > avail ? 'models.most' : 'models.half';
}
// Sovellus: liitä avaimet 'alert.<avain>' I18N-olioon kaikille sovelluksen kielille.
function mergeInto(I18N){
  for(const appLang of Object.keys(I18N)){
    const src = TEXTS[alertLangOf(appLang)] || TEXTS[DEF_LANG];
    for(const k of Object.keys(TEXTS[DEF_LANG])) I18N[appLang]['alert.' + k] = src[k] != null ? src[k] : TEXTS[DEF_LANG][k];
  }
  return I18N;
}

root.AlertTexts = {LANGS, DEF_LANG, TEXTS, alertLangOf, text, pct, kpRange, modelsKey, mergeInto};
if(typeof module !== 'undefined' && module.exports) module.exports = root.AlertTexts;
})(typeof globalThis !== 'undefined' ? globalThis : this);
