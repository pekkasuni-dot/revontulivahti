// FCM-toimitus (2026-11-02, hälytykset vaihe 1): JWT-allekirjoitus, viestin rakenne ja aiheet. Ei verkkoa.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, createVerify} from 'node:crypto';
import core from '../aurora-core.js';
import fcm from '../alerts/fcm.js';

const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
const sa = {project_id: 'testi', client_email: 'x@testi.iam.gserviceaccount.com',
  private_key: privateKey.export({type: 'pkcs8', format: 'pem'})};

test('palvelutili: puuttuva kenttä ja viallinen JSON', () => {
  assert.throws(() => fcm.parseServiceAccount('{'), /JSON/);
  assert.throws(() => fcm.parseServiceAccount({project_id: 'a', client_email: 'b'}), /private_key/);
  assert.equal(fcm.parseServiceAccount(JSON.stringify(sa)).project_id, 'testi');
});
test('JWT: RS256-allekirjoitus tarkistuu julkisella avaimella, oikeat väitteet', async () => {
  const jwt = await fcm.signJwt(sa, 1000);
  const [h, c, s] = jwt.split('.');
  const dec = x => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.deepEqual(dec(h), {alg: 'RS256', typ: 'JWT'});
  assert.deepEqual(dec(c), {iss: sa.client_email, scope: fcm.SCOPE, aud: fcm.OAUTH_URL, iat: 1000, exp: 4600});
  const v = createVerify('RSA-SHA256'); v.update(h + '.' + c);
  assert.ok(v.verify(publicKey, Buffer.from(s, 'base64url')));
});
test('viesti: aihe, data merkkijonoina, Android-kanava ja iOS-ääni', () => {
  const [m] = fcm.testMessages(core, 65.01, 25.47, {langs: ['fi']});
  assert.equal(m.message.topic, 'al1_fi_310_205');
  assert.deepEqual(m.message.data, {rv: '1', ver: '1', cell: '310_205', view: 'night', kind: 'test'});
  assert.equal(m.message.android.notification.channel_id, 'aurora');
  assert.equal(m.message.apns.payload.aps.sound, 'default');
  assert.equal(fcm.testMessages(core, 65, 25).length, 3);   // fi, en, zh (päätös 36)
  assert.throws(() => fcm.buildMessage({topic: 'ei sallittu', title: 'a', body: 'b'}), /aihe/);
});
test('lähetys: OAuth2-tunnus ja FCM-kutsu (simuloitu verkko)', async () => {
  const calls = [];
  const fetchFn = async (url, o) => { calls.push({url, o});
    if(url === fcm.OAUTH_URL) return {ok: true, status: 200, json: async () => ({access_token: 'tok'})};
    return {ok: true, status: 200, json: async () => ({name: 'projects/testi/messages/123'})}; };
  const [m] = fcm.testMessages(core, 69.05, 20.79, {langs: ['en']});
  assert.equal(await fcm.send(sa, m, {fetchFn}), 'projects/testi/messages/123');
  assert.match(calls[0].o.body, /grant_type=urn%3Aietf/);
  assert.equal(calls[1].url, 'https://fcm.googleapis.com/v1/projects/testi/messages:send');
  assert.equal(calls[1].o.headers.Authorization, 'Bearer tok');
  assert.equal(JSON.parse(calls[1].o.body).message.topic, 'al1_en_318_200');
});
test('hälytys: Android data-viesti (otsikko datassa), iOS näkyvä ilmoitus + palautekategoria', () => {
  const m = fcm.buildMessage({topic: 'al1_fi_313_205', title: 'Otsikko', body: 'Runko', dataOnlyAndroid: true,
    data: {cell: '313_205', kind: 'now', aid: 'now-313_205-2026-11-10', sentAt: '2026-11-10T20:00:00Z'}}).message;
  assert.equal(m.notification, undefined);
  assert.equal(m.data.title, 'Otsikko'); assert.equal(m.data.kind, 'now');
  assert.equal(m.android.notification, undefined); assert.equal(m.android.priority, 'high');
  assert.deepEqual(m.apns.payload.aps.alert, {title: 'Otsikko', body: 'Runko'});
  assert.equal(m.apns.payload.aps.category, fcm.FEEDBACK_CATEGORY);
});

// 11.11.2026: hälytysviesti yhdestä funktiosta (alertMessages) oikealle ajolle ja testille; palaute kelpaa Workerille.
import texts from '../alert-texts.js';
import alerts from '../alerts/fcm-alerts.js';
import {parseFeedback, expectedSig} from '../workers/palaute/src/feedback.js';
const mkAlert = (type, night = '2026-11-11') => {
  const c = core.alertCell(64.75, 25.5);
  return {type, night, pct: 62, ok: 3, avail: 4, models: {}, kp: [3, 4], best: [Date.UTC(2026, 10, 11, 19), Date.UTC(2026, 10, 11, 21)],
    cell: {...c, tz: core.cellTimeZone(c.center.lat, c.center.lon), mlat: core.magLat(c.center.lat, c.center.lon)}};
};
test('alertMessages = oikean ajon entinen rakennus (sama sisältö, kielet fi/en/zh)', async () => {
  const a = mkAlert('tonight'), sentAt = '2026-11-11T14:05:00.000Z', key = 'testiavain';
  const got = await fcm.alertMessages({core, texts, alerts, alert: a, sentAt, key});
  const aid = alerts.alertId(a), sig = await fcm.signAlert(key, aid, sentAt);
  const legacy = texts.LANGS.map(lang => { const tx = alerts.alertTexts(texts, a, lang);
    return fcm.buildMessage({topic: core.alertTopic(a.cell, lang), title: tx.title, body: tx.body, dataOnlyAndroid: true,
      data: {ver: a.cell.ver, cell: a.cell.key, view: 'night', kind: a.type, aid, sentAt, sig}}); });
  // apns-expiration riippuu kellosta -> vertaillaan ilman sitä
  const strip = ms => ms.map(m => { const c = JSON.parse(JSON.stringify(m)); delete c.message.apns.headers['apns-expiration']; return c; });
  assert.deepEqual(strip(got), strip(legacy));
  assert.deepEqual(got.map(m => m.message.topic), ['al1_fi_309_205', 'al1_en_309_205', 'al1_zh_309_205']);
});
test('testiviesti: otsikossa merkintä, palautepainikkeiden kentät, vastaus kelpaa Workerille', async () => {
  for(const type of ['tonight', 'now', 'coming']){
    const a = mkAlert(type, '2000-01-01'), sentAt = new Date().toISOString(), key = 'testiavain';
    const [m] = await fcm.alertMessages({core, texts, alerts, alert: a, sentAt, key, langs: ['fi'], titleSuffix: () => '(testi)'});
    const d = m.message.data;
    assert.match(d.title, /62\u00a0%.*\(testi\)$/);   // fi: sitova välilyönti (alert-texts pct)
    assert.equal(m.message.notification, undefined);                      // Android: data-viesti, sovellus näyttää painikkeet
    assert.equal(m.message.apns.payload.aps.category, fcm.FEEDBACK_CATEGORY);   // iOS: palautekategoria
    assert.equal(m.message.apns.payload.aps.alert.title, d.title);
    for(const k of ['aid', 'kind', 'cell', 'sentAt', 'sig', 'title', 'body']) assert.ok(d[k], k);
    assert.equal(d.kind, type); assert.equal(d.view, type === 'tonight' ? 'night' : 'now');
    // Androidin AlertActionReceiver / iOS fbAnswer lähettää nämä kentät -> Worker hyväksyy
    const body = {type: d.kind, cell: d.cell, sentAt: d.sentAt, answer: 'seen', channel: 'button', aid: d.aid, sig: d.sig, dev: 'testilaite1'};
    const p = parseFeedback(body);
    assert.ok(p.ok, JSON.stringify(p));
    assert.equal(await expectedSig(key, d.aid, d.sentAt), d.sig);
  }
});
