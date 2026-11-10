// Palautteen vastaanotto-Worker (päätös 36): tarkistus, allekirjoitus, kaksoisvastaus, IP-raja, tallennettavat kentät.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {parseFeedback, LIMITS} from '../workers/palaute/src/feedback.js';
import {handle} from '../workers/palaute/src/index.js';
const require = createRequire(import.meta.url);
const fcm = require('../alerts/fcm.js');

const KEY = 'testiavain-ei-oikea';
const kv = () => { const m = new Map(); return {m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }}; };
const now = Date.parse('2026-11-10T21:00:00Z'), sentAt = '2026-11-10T20:30:00.000Z', aid = 'now-313_205-2026-11-10';
const body = async (o = {}) => JSON.stringify({type: 'now', cell: '313_205', sentAt, answer: 'seen', channel: 'button', aid,
  sig: await fcm.signAlert(KEY, aid, sentAt), dev: 'laite123456', ...o});
const req = (b, ip = '1.2.3.4') => new Request('https://x/v1/palaute', {method: 'POST', body: b, headers: {'cf-connecting-ip': ip}});

test('tarkistus: kentät, En tiedä ja ohitettu vain kyselyssä, vanha hälytys hylätään', async () => {
  assert.equal(parseFeedback(await body(), now).ok, true);
  assert.equal(parseFeedback(await body({answer: 'unknown'}), now).error, 'answer');
  assert.equal(parseFeedback(await body({answer: 'unknown', channel: 'sheet'}), now).ok, true);
  assert.equal(parseFeedback(await body({cell: '313_206'}), now).error, 'aid');
  assert.equal(parseFeedback(await body(), Date.parse(sentAt) + 40 * 3600e3).error, 'sentAt');
  assert.equal(parseFeedback('{', now).error, 'json');
  assert.deepEqual(Object.keys(parseFeedback(await body({lat: 66.5, lon: 25.7}), now).record).sort(), ['answer', 'cell', 'channel', 'sentAt', 'type']);
});
test('Worker: tallentaa vain sallitut kentät, hylkää väärän allekirjoituksen, ei tuplia, IP-raja', async () => {
  const env = {PALAUTE_AVAIN_FCM: KEY, PALAUTE: kv()};
  let r = await handle(req(await body()), env, now);
  assert.equal(r.status, 200);
  const rec = [...env.PALAUTE.m].filter(([k]) => k.startsWith('p:'));
  assert.equal(rec.length, 1);
  assert.deepEqual(JSON.parse(rec[0][1]), {type: 'now', cell: '313_205', sentAt, answer: 'seen', channel: 'button'});
  r = await handle(req(await body()), env, now);
  assert.equal((await r.json()).duplicate, true);
  r = await handle(req(await body({sig: 'AAAAAAAAAAAAAAAAAAAAAA'})), env, now);
  assert.equal(r.status, 403);
  for(let k = 0; k < LIMITS.ipPerDay; k++) await handle(req(await body({dev: 'laite' + String(k).padStart(6, '0')}), '9.9.9.9'), env, now);
  r = await handle(req(await body({dev: 'laiteXYZ1234'}), '9.9.9.9'), env, now);
  assert.equal(r.status, 429);
  assert.equal((await handle(new Request('https://x/muu'), env, now)).status, 404);
  assert.equal((await handle(req(await body()), {PALAUTE: kv()}, now)).status, 503);
});
