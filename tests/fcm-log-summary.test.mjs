// Hälytysehtojen lokiyhteenveto (2026-11-13).
import test from 'node:test';
import assert from 'node:assert/strict';
import S from '../alerts/fcm-log-summary.js';

const L = {bzMax: -5, southMin: 20, btMin: 6};
const rec = (run, o = {}) => ({run, errors: o.err || [], alerts: o.alerts || [],
  diag: o.nodiag ? undefined : {kp: o.kp ?? 0, bz: false, bzv: o.bzv === null ? null : {mean: -2, southMin: 5, bt: 4, fresh: true, limits: L, ...(o.bzv || {})},
    nowMax: o.now == null ? null : {value: o.now, cell: o.cell || '318_200', count: 0, avail: 4, ovation: 10}}});

test('yö = Suomen aikaa klo 12-12', () => {
  assert.equal(S.nightOf('2026-11-13T17:35:00Z'), '2026-11-13');
  assert.equal(S.nightOf('2026-11-14T03:05:00Z'), '2026-11-13', 'aamuyö kuuluu edelliseen iltaan');
  assert.equal(S.nightOf('2026-11-14T10:30:00Z'), '2026-11-14');
});

test('parhaat lukemat ja rajojen täyttymiset ehto kerrallaan', () => {
  const rows = S.summarize([
    rec('2026-11-13T17:35:00Z', {kp: 0.33, now: 8, bzv: {mean: -6, southMin: 12, bt: 7}}),       // Bz ja Bt, ei aikaa
    rec('2026-11-13T18:05:00Z', {kp: 2.67, now: 33, cell: '319_207', bzv: {mean: -5.5, southMin: 25, bt: 6.5}}),   // kaikki kolme
    rec('2026-11-13T18:35:00Z', {kp: 1, now: 41, bzv: {fresh: false, mean: -20}}),             // ei tuore -> ei lasketa
    rec('2026-11-13T19:05:00Z', {nodiag: true, err: ['x']}),
    rec('2026-11-13T19:35:00Z', {alerts: [{trig: 'kp'}, {trig: 'now'}]}),
  ]);
  assert.equal(rows.length, 1);
  const n = rows[0];
  assert.equal(n.runs, 5); assert.equal(n.errors, 1); assert.equal(n.diagRuns, 4);
  assert.equal(n.bzRuns, 3); assert.equal(n.bzMean, -6); assert.equal(n.southMax, 25); assert.equal(n.btMax, 7);
  assert.deepEqual([n.bzOk, n.southOk, n.btOk, n.bzAll], [2, 1, 2, 1]);
  assert.equal(n.kpMax, 2.67); assert.equal(n.kpOk, 1);
  assert.equal(n.nowMax.value, 41); assert.equal(n.nowOk, 1); assert.equal(n.nowNear, 2);
  assert.deepEqual(n.sent, {now: 1, bz: 0, kp: 1});
  const md = S.toMarkdown(rows);
  assert.match(md, /\| 2026-11-13 \| 5 \| -6 nT \| 25 min \| 7 nT \| 2\/1\/2\/1 \(3\) \| 2,7 \(1\) \| 41 % \(318_200\) \| 1 \/ 2 \| 1\/0\/1 \| 1 \|/);
});

test('vanhat rivit ilman Bz-osia ja Nyt-maksimia: "–"', () => {
  const md = S.toMarkdown(S.summarize([{run: '2026-11-11T17:05:00Z', errors: [], alerts: [], diag: {kp: 0}}]));
  assert.match(md, /\| 2026-11-11 \| 1 \| – \| – \| – \| – \| 0 \(0\) \| – \| – \| 0\/0\/0 \| 0 \|/);
});
