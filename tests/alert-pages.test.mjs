// Päätös 62 (19.11.2026): revontuliraportin sivut ilmoituskeskuksen hälytysilmoituksista (AuroraCore.alertPages).
import test from 'node:test';
import assert from 'node:assert/strict';
import AuroraCore from '../aurora-core.js';

const T0 = Date.parse('2026-11-19T04:05:00Z');
const d = (cell, minAgo, kind = 'coming', extra = {}) => ({aid: kind + '-' + cell + '-2026-11-18', kind, cell,
  sentAt: new Date(T0 - minAgo * 60e3).toISOString(), r_pct: '20', ...extra});
const n = (id, data, tag = '') => ({id, tag, data});

test('kaksi hälytystä eri ruutuihin samassa ajossa -> kaksi sivua', () => {
  const a = d('303_189', 0), b = d('304_183', 0);
  const p = AuroraCore.alertPages(a, [n('1', b)]);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(x => x.data.cell), ['303_189', '304_183']);
  assert.equal(p[0].tapped, true); assert.equal(p[1].tapped, false);
});

test('sama ruutu eri aikoina (sama aid) -> kaksi sivua, uusin ensin', () => {
  const old = d('304_183', 120), neu = d('304_183', 0);
  assert.equal(old.aid, neu.aid);
  const p = AuroraCore.alertPages(null, [n('1', old), n('2', neu)]);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map(x => x.notifs[0].id), ['2', '1']);
});

test('napautettu ensin, muut uusin ensin; napautetun kopio ilmoituskeskuksessa yhdistyy', () => {
  const tap = d('300_180', 300), x = d('301_181', 60), y = d('302_182', 10), z = d('303_183', 200);
  const p = AuroraCore.alertPages(tap, [n('a', x), n('t', tap), n('b', y), n('c', z)]);
  assert.deepEqual(p.map(q => q.data.cell), ['300_180', '302_182', '301_181', '303_183']);
  assert.deepEqual(p[0].notifs, [{id: 't', tag: ''}]);
});

test('yksi hälytys -> yksi sivu; pyyhitty (ei listassa) ei ole sivu', () => {
  assert.equal(AuroraCore.alertPages(d('300_180', 0), []).length, 1);
  assert.equal(AuroraCore.alertPages(null, []).length, 0);
});

test('muut ilmoitukset (Androidin yhteenveto, testiviesti ilman aid, tonight) ohitetaan', () => {
  const p = AuroraCore.alertPages(null, [n('1381302273', {'android.title': 'Revontulihälytykset'}, 'rv-alerts'),
    n('2', {kind: 'now', cell: '300_180'}), n('3', d('300_180', 0, 'tonight')), n('4', d('bad', 0)), n('5', d('300_181', 0, 'now'))]);
  assert.deepEqual(p.map(x => x.notifs[0].id), ['5']);
});

test('Androidin tunniste (tag) säilyy poistoa varten, kaksoiskappale kerran', () => {
  const a = d('300_180', 0);
  const p = AuroraCore.alertPages(null, [n(7, a, 'rv-alert:x'), n(7, a, 'rv-alert:x')]);
  assert.deepEqual(p[0].notifs, [{id: '7', tag: 'rv-alert:x'}]);
});

test('alertNotifKey ja isAlertData', () => {
  assert.equal(AuroraCore.alertNotifKey({aid: 'a', sentAt: 's'}), 'a|s');
  assert.equal(AuroraCore.alertNotifKey({aid: 'a'}), null);
  assert.equal(AuroraCore.isAlertData(d('300_180', 0)), true);
  assert.equal(AuroraCore.isAlertData({...d('300_180', 0), sentAt: 'x'}), false);
});
