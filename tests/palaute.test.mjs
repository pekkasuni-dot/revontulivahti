// Hälytysten palaute (2026-10-24): Workerin /palaute (workers/ajastin/src/palaute.js)
// hyväksyy vain hälytysajon allekirjoittamat tunnisteet; allekirjoitus täsmää
// alerts/notify.js:n kanssa.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {handlePalaute, sign, ID_RE} from '../workers/ajastin/src/palaute.js';
const N = createRequire(import.meta.url)('../alerts/notify.js');

const env = {PALAUTE_AVAIN: 'avain'};
const call = async (q, e = env, method = 'POST') => {
  const calls = [];
  const r = await handlePalaute(new Request('https://w.example/palaute?' + q, {method}), e, async i => { calls.push(i); return {ok: true, msg: 'ok'}; });
  return {status: r.status, body: await r.text(), calls};
};

test('palaute: sama allekirjoitus kuin hälytysajossa, sama tunnistemuoto', async () => {
  assert.equal(await sign('avain', 'x'), await N.sign('avain', 'x'));
  assert.equal(ID_RE.source, N.ID_RE.source);
});

test('palaute: kelvollinen tallennetaan, muut hylätään', async () => {
  const h = '20261024T1915-levi-now', s = await N.sign('avain', h);
  let r = await call(`h=${h}&v=pilvessa&s=${s}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.calls, [{halytys: h, vastaus: 'pilvessa'}]);
  // toisen hälytyksen allekirjoitus, väärä avain, tuntematon tunniste/vastaus
  assert.equal((await call(`h=20261024T1915-levi-coming&v=nakyi&s=${s}`)).status, 403);
  assert.equal((await call(`h=${h}&v=nakyi&s=${s}`, {PALAUTE_AVAIN: 'muu'})).status, 403);
  assert.equal((await call(`h=20261024T1915-levi-now2&v=nakyi&s=${s}`)).status, 400);
  assert.equal((await call(`h=${h}&v=kylla&s=${s}`)).status, 400);
  assert.equal((await call(`h=${h}&v=nakyi&s=${s}`, {})).status, 503);
  assert.equal((await call(`h=${h}&v=nakyi&s=${s}`, env, 'PUT')).status, 405);
  const other = await handlePalaute(new Request('https://w.example/'), env, async () => ({ok: true}));
  assert.equal(other.status, 404);
  // testitunniste kelpaa allekirjoitettuna
  const t = 'testi-123-1', ts = await N.sign('avain', t);
  assert.equal((await call(`h=${t}&v=ei&s=${ts}`)).status, 200);
});
