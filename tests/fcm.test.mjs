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
  assert.equal(m.message.topic, 'al2_fi_310_205_now_v');   // päätös 56: Varma-aihe tavoittaa kaikki Nyt-tilaajat
  assert.deepEqual(m.message.data, {rv: '1', ver: '2', cell: '310_205', view: 'night', kind: 'test'});
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
  assert.equal(JSON.parse(calls[1].o.body).message.topic, 'al2_en_318_200_now_v');
});
test('hälytys: Android data-viesti (otsikko datassa), iOS näkyvä ilmoitus ilman palautekategoriaa (päätös 58)', () => {
  const m = fcm.buildMessage({topic: 'al1_fi_313_205', title: 'Otsikko', body: 'Runko', dataOnlyAndroid: true,
    data: {cell: '313_205', kind: 'now', aid: 'now-313_205-2026-11-10', sentAt: '2026-11-10T20:00:00Z'}}).message;
  assert.equal(m.notification, undefined);
  assert.equal(m.data.title, 'Otsikko'); assert.equal(m.data.kind, 'now');
  assert.equal(m.android.notification, undefined); assert.equal(m.android.priority, 'high');
  assert.deepEqual(m.apns.payload.aps.alert, {title: 'Otsikko', body: 'Runko'});
  assert.equal(m.apns.payload.aps.category, undefined);
  assert.equal(m.apns.payload.aps['thread-id'], 'rv-alerts', 'päätös 60: kaikki hälytykset samaan ryhmään');
});

// 11.11.2026: hälytysviesti yhdestä funktiosta (alertMessages) oikealle ajolle ja testille; palaute kelpaa Workerille.
import texts from '../alert-texts.js';
import alerts from '../alerts/fcm-alerts.js';
import {parseFeedback, expectedSig} from '../workers/palaute/src/feedback.js';
const mkAlert = (type, night = '2026-11-11', lv = 'h') => {
  const c = core.alertCell(64.75, 25.5);
  return {type, trig: type === 'coming' ? 'bz' : 'now', lv, night, pct: 62, ok: 2, avail: 3, models: {}, kp: [3, 3], best: null,
    report: {pct: 62, at: '2026-11-11T19:00:00.000Z', cloud: 20, ok: 2, avail: 3, bz: -6.4, bt: 8.2, kp: 3.7},
    cell: {...c, tz: core.cellTimeZone(c.center.lat, c.center.lon), mlat: core.magLat(c.center.lat, c.center.lon)}};
};
test('alertMessages = oikean ajon entinen rakennus (sama sisältö, kielet fi/en/zh)', async () => {
  const a = mkAlert('now'), sentAt = '2026-11-11T14:05:00.000Z', key = 'testiavain';
  const got = await fcm.alertMessages({core, texts, alerts, alert: a, sentAt, key});
  const aid = alerts.alertId(a), sig = await fcm.signAlert(key, aid, sentAt);
  const legacy = texts.LANGS.map(lang => { const tx = alerts.alertTexts(texts, a, lang);
    return fcm.buildMessage({topic: core.alertTopic(a.cell, lang, a.trig, a.lv), title: tx.title, body: tx.body, dataOnlyAndroid: true,
      data: {ver: a.cell.ver, cell: a.cell.key, view: 'now', kind: a.type, aid, sentAt, sig, ...fcm.reportData(a.report)}}); });
  // apns-expiration riippuu kellosta -> vertaillaan ilman sitä
  const strip = ms => ms.map(m => { const c = JSON.parse(JSON.stringify(m)); delete c.message.apns.headers['apns-expiration']; return c; });
  assert.deepEqual(strip(got), strip(legacy));
  assert.deepEqual(got.map(m => m.message.topic), ['al2_fi_309_205_now_h', 'al2_en_309_205_now_h', 'al2_zh_309_205_now_h']);
  // Päätös 56: tiukin ylittynyt luokka ja laukaisin aiheessa
  const v = await fcm.alertMessages({core, texts, alerts, alert: mkAlert('coming', '2026-11-11', 'v'), sentAt, key, langs: ['fi']});
  assert.equal(v[0].message.topic, 'al2_fi_309_205_bz_v');
});
test('testiviesti: otsikossa merkintä, palautepainikkeiden kentät, vastaus kelpaa Workerille', async () => {
  for(const type of ['now', 'coming']){
    const a = mkAlert(type, '2000-01-01'), sentAt = new Date().toISOString(), key = 'testiavain';
    const [m] = await fcm.alertMessages({core, texts, alerts, alert: a, sentAt, key, langs: ['fi'], titleSuffix: () => '(testi)'});
    const d = m.message.data;
    assert.match(d.title, /\(testi\)$/);   // fi: sitova välilyönti (alert-texts pct)
    assert.equal(m.message.notification, undefined);                      // Android: data-viesti, sovellus näyttää ilmoituksen
    assert.equal(m.message.apns.payload.aps.category, undefined);   // päätös 58: ei painikkeita ilmoituksessa
    assert.equal(m.message.apns.payload.aps.alert.title, d.title);
    for(const k of ['aid', 'kind', 'cell', 'sentAt', 'sig', 'title', 'body']) assert.ok(d[k], k);
    assert.equal(d.kind, type); assert.equal(d.view, 'now');
    // Päätös 42: sääraportin arvot datassa, sama teksti molemmille tyypeille
    assert.deepEqual([d.r_pct, d.r_cloud, d.r_ok, d.r_avail, d.r_bz, d.r_bt, d.r_kp], ['62', '20', '2', '3', '-6.4', '8.2', '3.7']);
    assert.equal(d.r_at, '2026-11-11T19:00:00.000Z');
    // Koko: FCM data ja APNs-kuorma reilusti alle 4 kt
    assert.ok(Buffer.byteLength(JSON.stringify(d)) < 1500);
    assert.ok(Buffer.byteLength(JSON.stringify({aps: m.message.apns.payload.aps, ...d})) < 2000);
    // Androidin AlertActionReceiver / iOS fbAnswer lähettää nämä kentät -> Worker hyväksyy
    const body = {type: d.kind, cell: d.cell, sentAt: d.sentAt, answer: 'seen', channel: 'button', aid: d.aid, sig: d.sig, dev: 'testilaite1'};
    const p = parseFeedback(body);
    assert.ok(p.ok, JSON.stringify(p));
    assert.equal(await expectedSig(key, d.aid, d.sentAt), d.sig);
  }
});

// Päätös 56 (lisäys 2): ylikuormitus (429) yritetään uudelleen Retry-Afterin mukaan; pysyvä virhe ei.
test('lähetyksen uudelleenyritys: 429 ja 503 uudelleen, 400 ei; epäonnistuminen kertoo yritykset', async () => {
  const [m] = fcm.testMessages(core, 69.05, 20.79, {langs: ['en']});
  const mk = codes => { let n = 0; const waits = [];
    const fetchFn = async () => { const c = codes[Math.min(n++, codes.length - 1)];
      return c === 200 ? {ok: true, status: 200, json: async () => ({name: 'ok'})}
        : {ok: false, status: c, headers: {get: h => h === 'retry-after' && c === 429 ? '2' : null}, json: async () => ({error: {status: 'X', message: 'y'}})}; };
    return {fetchFn, waits, sleep: async ms => { waits.push(ms); }, calls: () => n}; };
  let t = mk([429, 503, 200]);
  assert.equal(await fcm.sendWithRetry(sa, m, {token: 'tok', fetchFn: t.fetchFn, sleep: t.sleep}), 'ok');
  assert.equal(t.calls(), 3); assert.equal(t.waits[0], 2000);   // Retry-After 2 s
  t = mk([400]);
  await assert.rejects(fcm.sendWithRetry(sa, m, {token: 'tok', fetchFn: t.fetchFn, sleep: t.sleep}), e => e.status === 400);
  assert.equal(t.calls(), 1);
  t = mk([429]);
  await assert.rejects(fcm.sendWithRetry(sa, m, {token: 'tok', fetchFn: t.fetchFn, sleep: t.sleep}), e => e.status === 429 && e.attempts === fcm.SEND_RETRY.attempts);
  assert.equal(t.calls(), fcm.SEND_RETRY.attempts);
});
test('päätös 56: viestikoko uusilla kentillä (lv, south) alle 4 kt', async () => {
  const a = mkAlert('coming', '2026-11-11', 'n'); a.report = {...a.report, trig: 'bz', lv: 'n', south: 41};
  const [m] = await fcm.alertMessages({core, texts, alerts, alert: a, sentAt: '2026-11-11T14:05:00.000Z', key: 'k', langs: ['fi']});
  const d = m.message.data;
  assert.equal(d.r_lv, 'n'); assert.equal(d.r_south, '41');
  const fcmBytes = Buffer.byteLength(JSON.stringify(d)), iosBytes = Buffer.byteLength(JSON.stringify({aps: m.message.apns.payload.aps, ...d}));
  assert.ok(fcmBytes < 4096 && iosBytes < 4096, fcmBytes + ' / ' + iosBytes);
  console.log('viestikoko FCM-data', fcmBytes, 't, iOS-kuorma', iosBytes, 't');
});

// Päätös 61 (18.11.2026): mutable-content iOS:lle, viestissä vain ruutu (ei nimiä, käyttäjä- eikä sijaintitietoja).
test('päätös 61: hälytysviestissä mutable-content 1 ja cell, ei nimiä', async () => {
  const texts2 = (await import('../alert-texts.js')).default;
  const alerts2 = (await import('../alerts/fcm-alerts.js')).default;
  const cell = core.alertCell(68.2, 14.5);
  const a = {type: 'now', trig: 'now', lv: 'h', cell: {...cell, tz: 'Europe/Oslo'}, night: '2026-11-17', pct: 20, ok: 2, avail: 4, kp: null, best: null,
    report: {pct: 20, at: '2026-11-17T20:00:00Z', trig: 'now', cloud: 10, ok: 2, avail: 4, bz: -2, bt: 4, kp: 2, lv: 'h'}};
  const ms = await fcm.alertMessages({core, texts: texts2, alerts: alerts2, alert: a, sentAt: '2026-11-17T20:05:00Z', key: 'k', langs: ['fi']});
  const m = ms[0].message;
  assert.equal(m.apns.payload.aps['mutable-content'], 1);
  assert.equal(m.data.cell, cell.key);
  const allowed = new Set(['rv', 'ver', 'cell', 'view', 'kind', 'aid', 'sentAt', 'sig', 'title', 'body']);
  for(const k of Object.keys(m.data)) assert.ok(allowed.has(k) || /^r_/.test(k), 'odottamaton kenttä ' + k);
  assert.ok(!/Lofoot|Oma sijainti|lat|lon/i.test(JSON.stringify(m.data).replace(/"cell":"[^"]*"/, '')), 'ei nimiä eikä koordinaatteja');
  // Muu kuin hälytys (ei aid) ennallaan
  const t = fcm.buildMessage({topic: 'x', title: 'a', body: 'b', data: {cell: '1_1'}}).message;
  assert.equal(t.apns.payload.aps['mutable-content'], undefined);
});
