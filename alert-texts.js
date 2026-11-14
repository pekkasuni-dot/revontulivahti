/* ══════════════════════════════════════════════════════════════
   Hälytysten tekstit ja kielet (päätös 36, 7.11.2026) – YKSI paikka
   ──────────────────────────────────────────────────────────────
   Lukevat: hälytysajo (scripts/alert-fcm.mjs, alerts/fcm-alerts.js; Node/Worker) ja sovellus (i18n.js liittää
   avaimet muotoon 'alert.<avain>' kaikille sovelluksen kielille; es/fr saavat englannin).
   - Kielet LANGS = fi, en, zh (= sovelluksen zh-Hans). Sama lista kuin aurora-core.js ALERT_CELL.langs (testi).
   - Puuttuva käännös -> englanti. Paikkamerkit {nimi} samat kaikilla kielillä (tests/alert-texts.test.mjs).
   - Ilmoituksessa vain sana "hyvä" (ei vahvempia). Ensimmäinen rivi = tulos + näkyvyys-%.
   - Päätös 42 (11.11.2026): yksi ilmoitusteksti (title/body) Nyt ja Tulossa; Tänä yönä -tekstit poistettu;
     report.* = sovelluksen sääraporttiikkuna.
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
    // Päätös 42: sama ilmoitus Nyt ja Tulossa (tyyppi vain datassa). Tänä yönä -hälytys poistettu.
    'title': 'Hyvä tilaisuus nähdä revontulia, mahdollisuus {pct}',
    'body': 'Revontulia voi näkyä alueellasi nyt tai pian. Avaa sääraportti napauttamalla.',
    'models.all': 'Kaikki säämallit ennustavat riittävän selkeää.',
    'models.most': 'Useimmat säämallit ennustavat riittävän selkeää.',
    'models.half': 'Säämallit ovat eri mieltä pilvisyydestä.',
    'kp': 'Kp {range}.',
    'survey.now': 'Näkyikö revontulet?',
    'answer.seen': 'Näkyi',
    'answer.notSeen': 'Ei näkynyt',
    'answer.notLooked': 'En katsonut',
    'survey.hint': 'Vastaa vain, jos katsoit taivasta; muuten valitse En katsonut.',
    'channel': 'Revontulihälytykset',
    'settings.survey': 'Kysy hälytyksen jälkeen, näkyikö revontulia',
    'thanks': 'Kiitos palautteesta!',
    'report.title': 'Sääraportti',
    'report.sent': 'Lähetetty klo {time}',
    'report.vis': 'Mahdollisuus',
    'report.at': 'Arvioitu aika',
    'report.cloud': 'Pilvisyys',
    'report.models': 'Säämallit',
    'report.modelsVal': '{ok}/{avail} ennustaa riittävän selkeää',
  },
  en: {
    'type.now': 'Aurora now',
    'type.coming': 'Aurora soon',
    'title': 'Good chance to see the aurora, chance {pct}',
    'body': 'The aurora may be visible in your area now or soon. Tap to open the weather report.',
    'models.all': 'All weather models expect clear enough skies.',
    'models.most': 'Most weather models expect clear enough skies.',
    'models.half': 'Weather models disagree on cloud cover.',
    'kp': 'Kp {range}.',
    'survey.now': 'Did you see the aurora?',
    'answer.seen': 'Seen',
    'answer.notSeen': 'Not seen',
    'answer.notLooked': "Didn't look",
    'survey.hint': "Answer only if you looked at the sky; otherwise choose Didn't look.",
    'channel': 'Aurora alerts',
    'settings.survey': 'Ask after an alert whether you saw the aurora',
    'thanks': 'Thanks for the feedback!',
    'report.title': 'Weather report',
    'report.sent': 'Sent at {time}',
    'report.vis': 'Chance',
    'report.at': 'Estimated time',
    'report.cloud': 'Cloud cover',
    'report.models': 'Weather models',
    'report.modelsVal': '{ok}/{avail} expect clear enough skies',
  },
  zh: {   // TARKISTAMATON (natiivilukija ennen kauppaversiota)
    'type.now': '现在有极光',
    'type.coming': '极光即将出现',
    'title': '看到极光的机会良好，机会 {pct}',
    'body': '你所在区域现在或稍后可能看到极光。点按打开天气报告。',
    'models.all': '所有天气模型都预报天空足够晴朗。',
    'models.most': '多数天气模型预报天空足够晴朗。',
    'models.half': '各天气模型对云量的预报不一致。',
    'kp': 'Kp 指数 {range}。',
    'survey.now': '你看到极光了吗？',
    'answer.seen': '看到了',
    'answer.notSeen': '没看到',
    'answer.notLooked': '没看天空',
    'survey.hint': '仅在你看过天空时回答；否则请选择“没看天空”。',
    'channel': '极光提醒',
    'settings.survey': '提醒后询问是否看到极光',
    'thanks': '感谢你的反馈！',
    'report.title': '天气报告',
    'report.sent': '发送时间 {time}',
    'report.vis': '机会',
    'report.at': '预计时间',
    'report.cloud': '云量',
    'report.models': '天气模型',
    'report.modelsVal': '{ok}/{avail} 预报天空足够晴朗',
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
