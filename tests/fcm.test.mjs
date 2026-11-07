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
